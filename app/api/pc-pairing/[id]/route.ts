import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { PCCategory, PCStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { audit, requireApiUser } from "@/lib/server-auth";

const PairingActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  zoneId: z.string().optional(),
  pcName: z.string().min(2).max(32).optional(),
  category: z.nativeEnum(PCCategory).default(PCCategory.standard),
  ratePerHour: z.number().int().positive().max(5000).default(100),
  reason: z.string().max(300).optional()
});

function slugPcId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function uniquePcId(baseId: string) {
  let pcId = baseId || `pc-${crypto.randomBytes(3).toString("hex")}`;
  let suffix = 2;

  while (await prisma.pC.findUnique({ where: { id: pcId } })) {
    pcId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return pcId;
}

async function resolveZone(auth: { id: string; role: UserRole }, requestedZoneId?: string | null) {
  if (auth.role === UserRole.admin && requestedZoneId) {
    const zone = await prisma.zone.findUnique({ where: { id: requestedZoneId } });
    if (zone) return zone;
  }

  const user = await prisma.user.findUnique({ where: { id: auth.id }, select: { staffZoneId: true } });

  const zone = await prisma.zone.findFirst({
    where:
      auth.role === UserRole.manager
        ? { id: requestedZoneId ?? user?.staffZoneId ?? "__none__" }
        : requestedZoneId
          ? { id: requestedZoneId, ownerId: auth.id }
          : { ownerId: auth.id },
    orderBy: { createdAt: "asc" }
  });

  if (!zone) {
    throw new Error("Zone not found for pairing approval");
  }

  return zone;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseConnection();
    const params = await context.params;
    const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.admin]);
    const input = PairingActionSchema.parse(await request.json());
    const pairingRequest = await prisma.pCPairingRequest.findUnique({ where: { id: params.id } });

    if (!pairingRequest) {
      throw new Error("Pairing request not found");
    }

    if (pairingRequest.status !== "pending") {
      throw new Error(`Pairing request is already ${pairingRequest.status}`);
    }

    if (pairingRequest.fingerprint.length < 8 || pairingRequest.fingerprint.length > 200) {
      throw new Error("Device identity is invalid. Ask the client PC to restart pairing.");
    }

    if (input.action === "reject") {
      const rejected = await prisma.pCPairingRequest.update({
        where: { id: pairingRequest.id },
        data: { status: "rejected", rejectedReason: input.reason ?? "Rejected by zone operator" }
      });
      await audit("pc_pairing_rejected", auth.id, { pairingRequestId: rejected.id });
      return jsonOk({ pairingRequest: rejected });
    }

    if (pairingRequest.zoneId && input.zoneId && pairingRequest.zoneId !== input.zoneId) {
      throw new Error("This pairing request belongs to another zone");
    }

    const zone = await resolveZone(auth, pairingRequest.zoneId ?? input.zoneId);
    const pcName = input.pcName ?? pairingRequest.requestedPcName ?? pairingRequest.machineName;
    const pcId = await uniquePcId(slugPcId(pcName));
    const authToken = `pc-token-${zone.id}-${pcId}-${crypto.randomBytes(12).toString("hex")}`;

    const result = await prisma.$transaction(async (tx) => {
      const pc = await tx.pC.create({
        data: {
          id: pcId,
          name: pcName,
          zoneId: zone.id,
          authToken,
          status: PCStatus.offline,
          category: input.category,
          ratePerHour: input.ratePerHour,
          machineName: pairingRequest.machineName,
          ipAddress: pairingRequest.ipAddress,
          client: {
            create: {
              authToken,
              installedVersion: pairingRequest.installedVersion,
              trustedFingerprint: pairingRequest.fingerprint,
              pairedAt: new Date()
            }
          }
        },
        include: { client: true, zone: true }
      });

      const approved = await tx.pCPairingRequest.update({
        where: { id: pairingRequest.id },
        data: {
          status: "approved",
          zoneId: zone.id,
          assignedPcName: pc.name,
          assignedPcId: pc.id,
          assignedToken: authToken,
          category: input.category,
          ratePerHour: input.ratePerHour
        }
      });

      return { pc, pairingRequest: approved };
    });

    await audit("pc_pairing_approved", auth.id, {
      pairingRequestId: result.pairingRequest.id,
      pcId: result.pc.id,
      zoneId: zone.id
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
