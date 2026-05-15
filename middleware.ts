import { NextRequest, NextResponse } from "next/server";

const protectedPages = [
  { prefix: "/player" },
  { prefix: "/zone" },
  { prefix: "/admin" }
] as const;

function loginRedirectUrl(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    loginUrl.searchParams.set("next", nextPath);
  }

  return loginUrl;
}

export function middleware(request: NextRequest) {
  const match = protectedPages.find((item) => request.nextUrl.pathname.startsWith(item.prefix));

  if (!match) {
    return NextResponse.next();
  }

  if (!request.cookies.get("sb_access_token")?.value) {
    return NextResponse.redirect(loginRedirectUrl(request));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/player/:path*", "/zone/:path*", "/admin/:path*"]
};
