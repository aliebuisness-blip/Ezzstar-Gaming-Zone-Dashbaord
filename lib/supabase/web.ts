import { cookies } from "next/headers";

export type WebRole = "player" | "zone_owner" | "manager" | "admin";

export type WebProfile = {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  role: WebRole;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  spica_balance: number;
  xp: number;
  level: number;
  membership: string | null;
  created_at?: string;
};

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  user: SupabaseAuthUser;
};

const ACCESS_COOKIE = "sb_access_token";
const REFRESH_COOKIE = "sb_refresh_token";
const VALID_WEB_ROLES: WebRole[] = ["player", "zone_owner", "manager", "admin"];

export function normalizeWebRole(role: unknown): WebRole {
  if (role === "zone_manager") {
    return "manager";
  }

  return VALID_WEB_ROLES.includes(role as WebRole) ? (role as WebRole) : "player";
}

export function getWebRedirectForRole(role: unknown) {
  const normalizedRole = normalizeWebRole(role);

  if (normalizedRole === "player") {
    return "/player";
  }

  if (normalizedRole === "admin") {
    return "/admin";
  }

  const zoneOsUrl = process.env.NEXT_PUBLIC_ZONE_OS_URL;

  if (zoneOsUrl) {
    return zoneOsUrl;
  }

  return process.env.NODE_ENV === "development" ? "/zone" : "/list-your-zone";
}

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function getSupabaseWebConfig() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return {
    url,
    anonKey,
    serviceRoleKey,
    configured: Boolean(url && anonKey),
    serviceConfigured: Boolean(url && serviceRoleKey)
  };
}

function assertConfigured(service = false) {
  const config = getSupabaseWebConfig();

  if (!config.configured || (service && !config.serviceConfigured)) {
    throw new Error("Supabase web auth is not configured.");
  }

  return config;
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}, options: { service?: boolean; token?: string } = {}) {
  const config = assertConfigured(options.service);
  const authToken = options.token ?? (options.service ? config.serviceRoleKey : config.anonKey);
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      apikey: options.service ? config.serviceRoleKey : config.anonKey,
      authorization: `Bearer ${authToken}`,
      "content-type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || response.statusText;
    throw new Error(String(message));
  }

  return data as T;
}

export function publicProfile(profile: Partial<WebProfile> & { id: string; email?: string | null }) {
  const role = normalizeWebRole(profile.role);
  return {
    id: profile.id,
    name: profile.name ?? profile.username ?? profile.email ?? "Player",
    username: profile.username ?? "",
    email: profile.email ?? "",
    role,
    avatar: profile.avatar_url ?? "",
    banner: profile.banner_url ?? "",
    bio: profile.bio ?? "",
    spica_balance: Number(profile.spica_balance ?? 0),
    xp: Number(profile.xp ?? 0),
    level: Number(profile.level ?? 1),
    membership: profile.membership ?? (role === "player" ? "Starter" : "Operator"),
    emailVerified: true,
    onlineStatus: "online",
    favoriteGames: [],
    favoriteZones: [],
    createdAt: profile.created_at ?? new Date().toISOString()
  };
}

export async function createSupabaseAuthUser(input: {
  email: string;
  password: string;
  name: string;
  username?: string;
  role: WebRole;
}) {
  return supabaseFetch<SupabaseAuthUser>(
    "/auth/v1/admin/users",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          name: input.name,
          username: input.username,
          role: input.role
        },
        app_metadata: {
          role: input.role
        }
      })
    },
    { service: true }
  );
}

export async function signInWithPassword(email: string, password: string) {
  return supabaseFetch<SupabaseSession>(
    "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      body: JSON.stringify({ email, password })
    }
  );
}

export async function getSupabaseUser(accessToken: string) {
  return supabaseFetch<SupabaseAuthUser>("/auth/v1/user", { method: "GET" }, { token: accessToken });
}

export async function getCurrentWebSession() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const user = await getSupabaseUser(accessToken);
  return { accessToken, user };
}

export async function setSupabaseSessionCookies(session: SupabaseSession, requestUrl: string) {
  const cookieStore = await cookies();
  const isHttps = new URL(requestUrl).protocol === "https:";
  const secure = process.env.NODE_ENV === "production" && isHttps;

  cookieStore.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: 60 * 60 * 24 * 7
  });

  if (session.refresh_token) {
    cookieStore.set(REFRESH_COOKIE, session.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge: 60 * 60 * 24 * 30
    });
  }
}

export async function clearSupabaseSessionCookies() {
  const cookieStore = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, "spica_token"]) {
    cookieStore.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(0)
    });
  }
}

export async function getProfile(userId: string) {
  const rows = await supabaseFetch<WebProfile[]>(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*`, {}, { service: true });
  return rows[0] ?? null;
}

export async function upsertProfile(profile: Partial<WebProfile> & { id: string; email: string; role: WebRole }) {
  const rows = await supabaseFetch<WebProfile[]>(
    "/rest/v1/profiles?on_conflict=id&select=*",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        id: profile.id,
        email: profile.email.toLowerCase(),
        name: profile.name ?? profile.email,
        username: profile.username ?? profile.email.split("@")[0],
        role: profile.role,
        avatar_url: profile.avatar_url ?? null,
        banner_url: profile.banner_url ?? null,
        bio: profile.bio ?? null,
        spica_balance: profile.spica_balance ?? (profile.role === "player" ? 1000 : 0),
        xp: profile.xp ?? 0,
        level: profile.level ?? 1,
        membership: profile.membership ?? (profile.role === "player" ? "Starter" : "Zone Operator")
      })
    },
    { service: true }
  );
  return rows[0];
}

export async function requireWebUser(roles?: WebRole[]) {
  const session = await getCurrentWebSession();

  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const metadataRole = (session.user.app_metadata?.role ?? session.user.user_metadata?.role ?? "player") as WebRole;
  const profile = await getProfile(session.user.id) ?? await upsertProfile({
    id: session.user.id,
    email: session.user.email ?? "",
    name: String(session.user.user_metadata?.name ?? session.user.email ?? "Player"),
    username: String(session.user.user_metadata?.username ?? session.user.email?.split("@")[0] ?? "player"),
    role: metadataRole
  });

  if (roles?.length && !roles.includes(profile.role)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  return { session, profile };
}

export async function selectRows<T>(table: string, query = "select=*") {
  return supabaseFetch<T[]>(`/rest/v1/${table}?${query}`, {}, { service: true });
}

export async function insertRow<T>(table: string, row: Record<string, unknown>) {
  const rows = await supabaseFetch<T[]>(
    `/rest/v1/${table}?select=*`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row)
    },
    { service: true }
  );
  return rows[0];
}

export async function patchRows<T>(table: string, query: string, patch: Record<string, unknown>) {
  const rows = await supabaseFetch<T[]>(
    `/rest/v1/${table}?${query}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch)
    },
    { service: true }
  );
  return rows;
}
