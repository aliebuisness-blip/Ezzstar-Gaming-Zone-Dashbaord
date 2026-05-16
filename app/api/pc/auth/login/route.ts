import { PCStatus, SessionStatus, TransactionType, UserRole, ZoneStatus } from "@prisma/client";
import { z, ZodError } from "zod";
import { jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { sendPcCommand } from "@/lib/realtime-client";
import { audit } from "@/lib/server-auth";
import { getProfile, normalizeWebRole, signInWithPassword, upsertProfile } from "@/lib/supabase/web";

const PcLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  pcId: z.string().min(1),
  zoneId: z.string().min(1),
  authToken: z.string().min(1).optional(),
  pcAuthToken: z.string().min(1).optional()
});

function pcLoginError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

function formatPlayableTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (safeSeconds > 0 && totalMinutes === 0) {
    return "<1m";
  }

  return `${minutes}m`;
}

function localRuntimePasswordMarker(supabaseUserId: string) {
  return `supabase-runtime-user:${supabaseUserId}`;
}

export async function POST(request: Request) {
  try {
    await ensureDatabaseConnection();
    const input = PcLoginSchema.parse(await request.json());

    // TODO: Add per-PC/email rate limiting before public kiosk rollout.
    const pcAuthToken = input.authToken ?? input.pcAuthToken;
    if (!pcAuthToken) {
      return pcLoginError("Missing PC pairing credentials.", 400);
    }

    const pc = await prisma.pC.findUnique({
      where: { id: input.pcId },
      include: {
        client: true,
        zone: true
      }
    });

    if (!pc || !pc.client) {
      return pcLoginError("This PC is not paired. Please pair it from the zone dashboard.", 403);
    }

    if (pc.zoneId !== input.zoneId) {
      return pcLoginError("This PC is not registered to the selected zone.", 403);
    }

    if (pc.client.authToken !== pcAuthToken) {
      return pcLoginError("Invalid PC pairing credentials.", 403);
    }

    if (pc.zone.status !== ZoneStatus.active) {
      return pcLoginError("This zone is not active yet.", 403);
    }

    if (pc.maintenanceMode) {
      return pcLoginError("This PC is currently in maintenance mode.", 409);
    }

    if (pc.status !== PCStatus.available) {
      return pcLoginError("This PC is not available right now.", 409);
    }

    if (!pc.lastHeartbeat || pc.lastHeartbeat.getTime() < Date.now() - 30_000) {
      return pcLoginError("This PC is offline or has a stale heartbeat.", 409);
    }

    const rentPerHour = Number(pc.ratePerHour);
    if (!Number.isFinite(rentPerHour) || rentPerHour <= 0) {
      return pcLoginError("This PC does not have a valid hourly rate configured.", 409);
    }

    const email = input.email.toLowerCase().trim();
    const supabaseSession = await signInWithPassword(email, input.password);
    const metadataRole = normalizeWebRole(
      supabaseSession.user.app_metadata?.role ?? supabaseSession.user.user_metadata?.role
    );
    const profile =
      (await getProfile(supabaseSession.user.id)) ??
      (await upsertProfile({
        id: supabaseSession.user.id,
        email: supabaseSession.user.email ?? email,
        name: String(supabaseSession.user.user_metadata?.name ?? supabaseSession.user.email ?? email),
        username: String(supabaseSession.user.user_metadata?.username ?? email.split("@")[0]),
        role: metadataRole
      }));
    const role = normalizeWebRole(profile.role ?? metadataRole);

    if (role !== "player") {
      return pcLoginError("Only player accounts can sign in on a gaming PC.", 403);
    }

    if (!supabaseSession.user.email) {
      return pcLoginError("Invalid player email or password.", 401);
    }

    const spicaBalance = Math.max(0, Math.floor(Number(profile.spica_balance ?? 0)));
    const playableSeconds = Math.floor((spicaBalance / rentPerHour) * 3600);

    if (playableSeconds <= 0) {
      return pcLoginError("Insufficient SPICA balance for this PC.", 402);
    }

    const existingLocalPlayer = await prisma.user.findUnique({
      where: { email: supabaseSession.user.email.toLowerCase() }
    });
    const localPlayer = existingLocalPlayer
      ? await prisma.user.update({
          where: { id: existingLocalPlayer.id },
          data: {
            name: profile.name ?? supabaseSession.user.email ?? email,
            username: profile.username ?? email.split("@")[0],
            avatar: profile.avatar_url,
            role: UserRole.player,
            spica_balance: spicaBalance,
            onlineStatus: "online"
          }
        })
      : await prisma.user.create({
          data: {
            id: supabaseSession.user.id,
            name: profile.name ?? supabaseSession.user.email ?? email,
            email: supabaseSession.user.email.toLowerCase(),
            username: profile.username ?? email.split("@")[0],
            avatar: profile.avatar_url,
            password: localRuntimePasswordMarker(supabaseSession.user.id),
            role: UserRole.player,
            spica_balance: spicaBalance,
            emailVerified: true,
            membership: profile.membership ?? "Player",
            onlineStatus: "online"
          }
        });

    const activeSession = await prisma.session.findFirst({
      where: {
        playerId: localPlayer.id,
        status: SessionStatus.active
      },
      select: { id: true }
    });

    if (activeSession) {
      return pcLoginError("This player already has an active session.", 409);
    }

    const session = await prisma.$transaction(async (tx) => {
      const freshPc = await tx.pC.findUnique({
        where: { id: pc.id },
        include: { zone: true }
      });
      const freshPlayer = await tx.user.findUnique({
        where: { id: localPlayer.id }
      });

      if (!freshPc || freshPc.zoneId !== input.zoneId) {
        throw new Error("PC not found in selected zone.");
      }

      if (freshPc.status !== PCStatus.available) {
        throw new Error("This PC is not available right now.");
      }

      if (!freshPlayer || freshPlayer.spica_balance < spicaBalance) {
        throw new Error("Insufficient SPICA balance for this PC.");
      }

      const activeSessionGuard = await tx.session.findFirst({
        where: {
          status: SessionStatus.active,
          OR: [{ pcId: freshPc.id }, { playerId: freshPlayer.id }]
        },
        select: { id: true }
      });

      if (activeSessionGuard) {
        throw new Error("This player or PC already has an active session.");
      }

      const createdSession = await tx.session.create({
        data: {
          playerId: freshPlayer.id,
          zoneId: freshPc.zoneId,
          pcId: freshPc.id,
          durationSeconds: playableSeconds,
          gross: spicaBalance
        }
      });

      await tx.user.update({
        where: { id: freshPlayer.id },
        data: { spica_balance: { decrement: spicaBalance } }
      });

      await tx.pC.update({
        where: { id: freshPc.id },
        data: { status: PCStatus.in_use }
      });

      await tx.transaction.create({
        data: {
          userId: freshPlayer.id,
          type: TransactionType.spend,
          amount: spicaBalance
        }
      });

      return createdSession;
    });
    await audit("start_session", localPlayer.id, {
      sessionId: session.id,
      pcId: pc.id,
      zoneId: pc.zoneId,
      gross: spicaBalance,
      source: "pc_auto_login"
    });

    const commandSent = await sendPcCommand(pc.id, "command:start-session", {
      sessionId: session.id,
      playerName: localPlayer.name,
      playerBalance: 0,
      zoneName: pc.zone.name,
      pcName: pc.name,
      startTime: session.startTime.toISOString(),
      durationSeconds: session.durationSeconds,
      remainingSeconds: Math.max(
        0,
        Math.ceil((session.startTime.getTime() + session.durationSeconds * 1000 - Date.now()) / 1000)
      ),
      serverTime: new Date().toISOString()
    });

    if (!commandSent) {
      console.warn(`PC auto-session created but start command dispatch failed for ${pc.id}`);
      await prisma.$transaction([
        prisma.session.update({
          where: { id: session.id },
          data: {
            status: SessionStatus.completed,
            completedAt: new Date()
          }
        }),
        prisma.user.update({
          where: { id: localPlayer.id },
          data: { spica_balance: { increment: spicaBalance } }
        }),
        prisma.pC.update({
          where: { id: pc.id },
          data: { status: PCStatus.available }
        }),
        prisma.transaction.create({
          data: {
            userId: localPlayer.id,
            type: TransactionType.reward,
            amount: spicaBalance
          }
        })
      ]);
      return pcLoginError("Unable to start session on this PC. Please try again.", 409);
    }

    return jsonOk({
      ok: true,
      player: {
        id: localPlayer.id,
        name: localPlayer.name,
        email: localPlayer.email,
        username: localPlayer.username,
        avatarUrl: localPlayer.avatar,
        spicaBalance
      },
      zone: {
        id: pc.zone.id,
        name: pc.zone.name,
        rentPerHour
      },
      pc: {
        id: pc.id,
        name: pc.name,
        status: pc.status
      },
      sessionPreview: {
        playableSeconds,
        playableLabel: formatPlayableTime(playableSeconds),
        estimatedCostPerHour: rentPerHour
      },
      session: {
        id: session.id,
        status: session.status,
        durationSeconds: session.durationSeconds,
        startedAt: session.startTime.toISOString()
      },
      commandSent
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return pcLoginError("Invalid request.", 400);
    }

    const message = error instanceof Error ? error.message : "PC login failed. Please try again.";
    const lower = message.toLowerCase();

    if (lower.includes("invalid") || lower.includes("credentials")) {
      return pcLoginError("Invalid player email or password.", 401);
    }

    if (lower.includes("supabase web auth is not configured")) {
      return pcLoginError("Supabase player authentication is not configured.", 503);
    }

    if (lower.includes("insufficient")) {
      return pcLoginError(message, 402);
    }

    if (lower.includes("not available") || lower.includes("not found")) {
      return pcLoginError(message, 409);
    }

    console.error("PC player login failed", message);
    return pcLoginError("PC login failed. Please try again.", 500);
  }
}
