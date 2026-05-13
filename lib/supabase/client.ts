export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
  configured: boolean;
};

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey)
  };
}

export const SUPABASE_STORAGE_BUCKETS = ["avatars", "zone-media", "announcements", "listing-requests"] as const;

