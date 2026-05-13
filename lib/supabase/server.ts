import { randomUUID } from "node:crypto";
import { SUPABASE_STORAGE_BUCKETS } from "@/lib/supabase/client";

export type SupabaseBucket = (typeof SUPABASE_STORAGE_BUCKETS)[number];

type UploadToSupabaseStorageInput = {
  bucket: SupabaseBucket;
  file: File;
  folder: string;
};

type SupabaseServerConfig = {
  url: string;
  serviceRoleKey: string;
  configured: boolean;
};

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return {
    url,
    serviceRoleKey,
    configured: Boolean(url && serviceRoleKey)
  };
}

export function assertSupabaseStorageConfigured() {
  const config = getSupabaseServerConfig();

  if (!config.configured) {
    throw new Response(
      JSON.stringify({
        error: "Supabase Storage is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env to enable media uploads."
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  return config;
}

export function buildStoragePath(folder: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, "") || "bin";
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/\/+/g, "/");
  return `${safeFolder}/${Date.now()}-${randomUUID()}.${extension}`;
}

export function getPublicStorageUrl(supabaseUrl: string, bucket: SupabaseBucket, path: string) {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadToSupabaseStorage({ bucket, file, folder }: UploadToSupabaseStorageInput) {
  const config = assertSupabaseStorageConfigured();
  const path = buildStoragePath(folder, file);
  const uploadUrl = `${config.url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${path}`;
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "cache-control": "3600",
      "content-type": file.type || "application/octet-stream",
      "x-upsert": "false"
    },
    body: await file.arrayBuffer()
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Supabase upload failed: ${errorText || response.statusText}`);
  }

  return {
    bucket,
    path,
    publicUrl: getPublicStorageUrl(config.url, bucket, path)
  };
}

