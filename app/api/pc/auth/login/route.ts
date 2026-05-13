import { PCStatus, SessionStatus, UserRole, ZoneStatus } from "@prisma/client";
import { z, ZodError } from "zod";
import { jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/server-auth";

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

    const rentPerHour = Number(pc.ratePerHour);
    if (!Number.isFinite(rentPerHour) || rentPerHour <= 0) {
      return pcLoginError("This PC does not have a valid hourly rate configured.", 409);
    }

    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() }
    });

    if (!user || !(await verifyPassword(input.password, user.password))) {
      return pcLoginError("Invalid player email or password.", 401);
    }

    if (user.role !== UserRole.player) {
      return pcLoginError("Only player accounts can sign in on a gaming PC.", 403);
    }

    const activeSession = await prisma.session.findFirst({
      where: {
        playerId: user.id,
        status: SessionStatus.active
      },
      select: { id: true }
    });

    if (activeSession) {
      return pcLoginError("This player already has an active session.", 409);
    }

    const playableSeconds = Math.floor((user.spica_balance / rentPerHour) * 3600);
    if (playableSeconds <= 0) {
      return pcLoginError("Insufficient SPICA balance for this PC.", 402);
    }

    return jsonOk({
      ok: true,
      player: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatar,
        spicaBalance: user.spica_balance
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
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return pcLoginError("Invalid request.", 400);
    }

    console.error("PC player login failed", error);
    return pcLoginError("PC login failed. Please try again.", 500);
  }
}
