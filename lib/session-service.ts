import { PCStatus, Prisma, Session, SessionStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluatePlayerAchievements } from "@/lib/achievements";
import { audit } from "@/lib/server-auth";

const COMMISSION_RATE = 0.1;

export function getRemainingTime(startTime: Date, durationSeconds: number): number {
  return Math.max(0, startTime.getTime() + durationSeconds * 1000 - Date.now());
}

export function calculateCommission(gross: number) {
  const commission = Math.round(gross * COMMISSION_RATE);
  return {
    commission,
    net: gross - commission
  };
}

export function calculateSessionCost(ratePerHour: number, durationMinutes: number): number {
  return Math.ceil((ratePerHour / 60) * durationMinutes);
}

export async function createSettlement(session: Session, tx: Prisma.TransactionClient = prisma) {
  const { commission, net } = calculateCommission(session.gross);

  const settlement = await tx.settlement.upsert({
    where: { sessionId: session.id },
    create: {
      zoneId: session.zoneId,
      sessionId: session.id,
      gross: session.gross,
      commission,
      net
    },
    update: {
      gross: session.gross,
      commission,
      net
    }
  });

  await audit("create_settlement", session.playerId, { sessionId: session.id, settlementId: settlement.id });
  return settlement;
}

async function completeExpiredSession(session: Session, tx: Prisma.TransactionClient = prisma) {
  const completed = await tx.session.update({
    where: { id: session.id },
    data: {
      status: SessionStatus.completed,
      completedAt: new Date()
    }
  });

  await tx.pC.update({
    where: { id: session.pcId },
    data: { status: PCStatus.available }
  });

  await createSettlement(completed, tx);
  console.log(`Expired stale session completed: ${session.id}`);
  return completed;
}

export async function endSession(sessionId: string) {
  const session = await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status === SessionStatus.completed) {
      return session;
    }

    const completed = await tx.session.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.completed,
        completedAt: new Date()
      }
    });

    await tx.pC.update({
      where: { id: session.pcId },
      data: { status: PCStatus.available }
    });

    await createSettlement(completed, tx);
    await evaluatePlayerAchievements(session.playerId, tx);
    await audit("end_session", session.playerId, { sessionId });
    console.log(`Session ended: ${sessionId}`);
    return completed;
  });

  return prisma.session.findUniqueOrThrow({
    where: { id: session.id },
    include: {
      player: { select: { id: true, name: true, spica_balance: true } },
      zone: { select: { id: true, name: true } },
      pc: { select: { id: true, name: true } },
      settlement: true
    }
  });
}

export async function expireSessions() {
  return cleanupExpiredSessions();
}

export async function cleanupExpiredSessionsForPc(pcId: string, tx: Prisma.TransactionClient = prisma) {
  const activeSessions = await tx.session.findMany({
    where: { pcId, status: SessionStatus.active }
  });
  const expired = activeSessions.filter((session) => getRemainingTime(session.startTime, session.durationSeconds) === 0);

  for (const session of expired) {
    await completeExpiredSession(session, tx);
  }

  return expired.length;
}

export async function cleanupExpiredSessions() {
  return prisma.$transaction(async (tx) => {
    const activeSessions = await tx.session.findMany({
      where: { status: SessionStatus.active }
    });
    const expired = activeSessions.filter((session) => getRemainingTime(session.startTime, session.durationSeconds) === 0);

    for (const session of expired) {
      await completeExpiredSession(session, tx);
    }

    return expired.length;
  });
}

export async function startSession(playerId: string, zoneId: string, pcId: string, durationMinutes: number) {
  const session = await prisma.$transaction(async (tx) => {
    const [player, pc, zone] = await Promise.all([
      tx.user.findUnique({ where: { id: playerId } }),
      tx.pC.findUnique({ where: { id: pcId } }),
      tx.zone.findUnique({ where: { id: zoneId } })
    ]);

    if (!player) {
      throw new Error("Player not found");
    }

    if (!zone || zone.status !== "active") {
      throw new Response(
        JSON.stringify({ error: `Zone is not approved for sessions. Current status: ${zone?.status ?? "missing"}` }),
        { status: 403 }
      );
    }

    if (!pc || pc.zoneId !== zoneId) {
      throw new Error("PC not found in selected zone");
    }

    if (pc.maintenanceMode) {
      throw new Response(JSON.stringify({ error: "PC is in maintenance mode" }), { status: 409 });
    }

    await cleanupExpiredSessionsForPc(pcId, tx);
    const freshPc = await tx.pC.findUnique({ where: { id: pcId } });

    if (!freshPc) {
      throw new Error("PC not found after cleanup");
    }

    const activeSession = await tx.session.findFirst({
      where: { pcId, status: SessionStatus.active },
      select: { id: true, startTime: true, durationSeconds: true }
    });

    if (activeSession && getRemainingTime(activeSession.startTime, activeSession.durationSeconds) > 0) {
      throw new Error(`PC already has an active session: ${activeSession.id}`);
    }

    if (freshPc.status !== PCStatus.available) {
      throw new Error(`PC is not available. Current status: ${freshPc.status}`);
    }

    if (!freshPc.lastHeartbeat || freshPc.lastHeartbeat.getTime() < Date.now() - 30_000) {
      throw new Error("PC is offline or heartbeat is stale");
    }

    const ratePerHour = freshPc.ratePerHour;
    const gross = calculateSessionCost(ratePerHour, durationMinutes);

    if (player.spica_balance < gross) {
      throw new Error("Insufficient SPICA balance");
    }

    const session = await tx.session.create({
      data: {
        playerId,
        zoneId,
        pcId,
        durationSeconds: durationMinutes * 60,
        gross
      }
    });

    await tx.user.update({
      where: { id: playerId },
      data: { spica_balance: { decrement: gross } }
    });

    await tx.pC.update({
      where: { id: pcId },
      data: { status: PCStatus.in_use }
    });

    await tx.transaction.create({
      data: {
        userId: playerId,
        type: TransactionType.spend,
        amount: gross
      }
    });

    await audit("start_session", playerId, { sessionId: session.id, pcId, zoneId, gross });
    console.log(`Session started: ${session.id} on PC database id ${freshPc.id} (${freshPc.name})`);
    return session;
  });

  return prisma.session.findUniqueOrThrow({
    where: { id: session.id },
    include: {
      player: { select: { id: true, name: true, spica_balance: true } },
      zone: { select: { id: true, name: true } },
      pc: { select: { id: true, name: true } }
    }
  });
}

export async function addTime(sessionId: string, extraMinutes: number) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { player: true }
    });

    if (!session || session.status !== SessionStatus.active) {
      throw new Error("Active session not found");
    }

    const ratePerHour = session.gross / Math.max(1, session.durationSeconds / 3600);
    const extraCost = calculateSessionCost(ratePerHour, extraMinutes);

    if (session.player.spica_balance < extraCost) {
      throw new Error("Insufficient SPICA balance");
    }

    const updated = await tx.session.update({
      where: { id: sessionId },
      data: {
        durationSeconds: { increment: extraMinutes * 60 },
        gross: { increment: extraCost }
      },
      include: {
        player: { select: { id: true, name: true, spica_balance: true } },
        zone: { select: { id: true, name: true } },
        pc: { select: { id: true, name: true } }
      }
    });

    await tx.user.update({
      where: { id: session.playerId },
      data: { spica_balance: { decrement: extraCost } }
    });

    await tx.transaction.create({
      data: {
        userId: session.playerId,
        type: TransactionType.spend,
        amount: extraCost
      }
    });

    console.log(`Session time added: ${sessionId} +${extraMinutes} minutes`);
    return updated;
  });
}
