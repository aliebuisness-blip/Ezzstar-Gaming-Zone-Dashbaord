import { NextRequest } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureDatabaseConnection, prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/server-auth";
import { SupabaseBucket, uploadToSupabaseStorage } from "@/lib/supabase/server";

type UploadPurpose = "player-avatar" | "player-banner" | "zone-logo" | "zone-banner" | "announcement-media" | "listing-request-attachment";

const purposeConfig: Record<UploadPurpose, { bucket: SupabaseBucket; maxBytes: number; mimeTypes: string[] }> = {
  "player-avatar": { bucket: "avatars", maxBytes: 2 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  "player-banner": { bucket: "avatars", maxBytes: 3 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  "zone-logo": { bucket: "zone-media", maxBytes: 3 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  "zone-banner": { bucket: "zone-media", maxBytes: 5 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  "announcement-media": { bucket: "announcements", maxBytes: 8 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"] },
  "listing-request-attachment": { bucket: "listing-requests", maxBytes: 8 * 1024 * 1024, mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"] }
};

function isUploadPurpose(value: FormDataEntryValue | null): value is UploadPurpose {
  return typeof value === "string" && value in purposeConfig;
}

function validateFile(file: FormDataEntryValue | null, config: { maxBytes: number; mimeTypes: string[] }): File {
  if (!(file instanceof File)) {
    throw new Response(JSON.stringify({ error: "Choose a file to upload." }), { status: 400 });
  }

  if (!config.mimeTypes.includes(file.type)) {
    throw new Response(JSON.stringify({ error: "Unsupported file type." }), { status: 400 });
  }

  if (file.size > config.maxBytes) {
    throw new Response(JSON.stringify({ error: `File is too large. Maximum size is ${Math.round(config.maxBytes / 1024 / 1024)}MB.` }), { status: 400 });
  }

  return file;
}

async function requireZoneAccess(request: NextRequest, zoneId: string) {
  const auth = await requireApiUser(request, [UserRole.zone_owner, UserRole.admin]);
  const zone = await prisma.zone.findUnique({ where: { id: zoneId } });

  if (!zone) {
    throw new Response(JSON.stringify({ error: "Zone not found." }), { status: 404 });
  }

  if (auth.role !== UserRole.admin && zone.ownerId !== auth.id) {
    throw new Response(JSON.stringify({ error: "Forbidden." }), { status: 403 });
  }

  return { auth, zone };
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabaseConnection();
    const formData = await request.formData();
    const purposeValue = formData.get("purpose");

    if (!isUploadPurpose(purposeValue)) {
      return Response.json({ error: "Invalid upload purpose." }, { status: 400 });
    }

    const config = purposeConfig[purposeValue];
    const file = validateFile(formData.get("file"), config);
    const zoneId = typeof formData.get("zoneId") === "string" ? String(formData.get("zoneId")) : undefined;

    if (purposeValue.startsWith("player-")) {
      const auth = await requireApiUser(request, [UserRole.player, UserRole.zone_owner, UserRole.manager, UserRole.admin]);
      const result = await uploadToSupabaseStorage({ bucket: config.bucket, file, folder: `players/${auth.id}` });
      const data = purposeValue === "player-avatar" ? { avatar: result.publicUrl } : { banner: result.publicUrl };
      await prisma.user.update({ where: { id: auth.id }, data });
      return jsonOk({ ...result, storedOn: "user" });
    }

    if (purposeValue === "zone-logo" || purposeValue === "zone-banner") {
      if (!zoneId) {
        return Response.json({ error: "zoneId is required for zone media uploads." }, { status: 400 });
      }

      const { zone } = await requireZoneAccess(request, zoneId);
      const result = await uploadToSupabaseStorage({ bucket: config.bucket, file, folder: `zones/${zone.id}` });
      const branding = { ...((zone.branding as Record<string, unknown>) ?? {}) };
      branding[purposeValue === "zone-logo" ? "logoUrl" : "bannerUrl"] = result.publicUrl;
      await prisma.zone.update({ where: { id: zone.id }, data: { branding: branding as Prisma.InputJsonObject } });
      return jsonOk({ ...result, storedOn: "zone" });
    }

    if (purposeValue === "announcement-media") {
      if (zoneId) {
        await requireZoneAccess(request, zoneId);
      } else {
        await requireApiUser(request, [UserRole.admin]);
      }

      const result = await uploadToSupabaseStorage({ bucket: config.bucket, file, folder: zoneId ? `zones/${zoneId}/announcements` : "admin/announcements" });
      return jsonOk({ ...result, storedOn: "announcement" });
    }

    const result = await uploadToSupabaseStorage({ bucket: config.bucket, file, folder: "incoming" });
    return jsonOk({ ...result, storedOn: "listing-request" });
  } catch (error) {
    return jsonError(error);
  }
}

