import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { patchRows, requireWebUser } from "@/lib/supabase/web";
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const purposeValue = formData.get("purpose");

    if (!isUploadPurpose(purposeValue)) {
      return Response.json({ error: "Invalid upload purpose." }, { status: 400 });
    }

    const config = purposeConfig[purposeValue];
    const file = validateFile(formData.get("file"), config);
    const zoneId = typeof formData.get("zoneId") === "string" ? String(formData.get("zoneId")) : undefined;

    if (purposeValue.startsWith("player-")) {
      const { profile } = await requireWebUser(["player", "zone_owner", "manager", "admin"]);
      const result = await uploadToSupabaseStorage({ bucket: config.bucket, file, folder: `players/${profile.id}` });
      await patchRows("profiles", `id=eq.${encodeURIComponent(profile.id)}`, purposeValue === "player-avatar" ? { avatar_url: result.publicUrl } : { banner_url: result.publicUrl });
      return jsonOk({ ...result, storedOn: "profile" });
    }

    if (purposeValue === "zone-logo" || purposeValue === "zone-banner") {
      const { profile } = await requireWebUser(["zone_owner", "manager", "admin"]);

      if (!zoneId) {
        return Response.json({ error: "zoneId is required for zone media uploads." }, { status: 400 });
      }

      const result = await uploadToSupabaseStorage({ bucket: config.bucket, file, folder: `zones/${zoneId}` });
      await patchRows("zones", `id=eq.${encodeURIComponent(zoneId)}`, purposeValue === "zone-logo" ? { logo_url: result.publicUrl, updated_by: profile.id } : { banner_url: result.publicUrl, updated_by: profile.id });
      return jsonOk({ ...result, storedOn: "zone" });
    }

    if (purposeValue === "announcement-media") {
      await requireWebUser(zoneId ? ["zone_owner", "manager", "admin"] : ["admin"]);
      const result = await uploadToSupabaseStorage({ bucket: config.bucket, file, folder: zoneId ? `zones/${zoneId}/announcements` : "admin/announcements" });
      return jsonOk({ ...result, storedOn: "announcement" });
    }

    const result = await uploadToSupabaseStorage({ bucket: config.bucket, file, folder: "incoming" });
    return jsonOk({ ...result, storedOn: "listing-request" });
  } catch (error) {
    return jsonError(error);
  }
}
