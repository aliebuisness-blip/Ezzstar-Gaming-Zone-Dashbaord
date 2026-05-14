import { NextRequest, NextResponse } from "next/server";

const rolePath = {
  player: "/player",
  zone_owner: "/zone",
  manager: "/zone",
  admin: "/admin"
} as const;

const protectedPages = [
  { prefix: "/player", role: "player" },
  { prefix: "/zone", role: "zone_owner" },
  { prefix: "/admin", role: "admin" }
] as const;

function decodeJwtPayload(token?: string): { app_metadata?: { role?: keyof typeof rolePath }; user_metadata?: { role?: keyof typeof rolePath }; role?: keyof typeof rolePath } | null {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const match = protectedPages.find((item) => request.nextUrl.pathname.startsWith(item.prefix));

  if (!match) {
    return NextResponse.next();
  }

  const payload = decodeJwtPayload(request.cookies.get("sb_access_token")?.value);
  const role = payload?.app_metadata?.role ?? payload?.user_metadata?.role ?? payload?.role;

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (role === "admin") {
    return NextResponse.next();
  }

  if (match.prefix === "/zone" && role === "manager") {
    return NextResponse.next();
  }

  if (role !== match.role) {
    return NextResponse.redirect(new URL(rolePath[role] ?? "/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/player/:path*", "/zone/:path*", "/admin/:path*"]
};
