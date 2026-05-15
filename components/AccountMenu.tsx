"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import clsx from "clsx";

type AuthUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "player" | "zone_owner" | "manager" | "admin";
};

const roleLabel: Record<AuthUser["role"], string> = {
  player: "Player",
  zone_owner: "Zone Owner",
  manager: "Manager",
  admin: "Ezzstar Admin"
};

const profileRoute: Record<AuthUser["role"], string> = {
  player: "/player/profile",
  zone_owner: "/zone/settings",
  manager: "/zone/settings",
  admin: "/admin/settings"
};

function getZoneOsUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_ZONE_OS_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return "/zone";
  }

  return null;
}

function dashboardLinks(role: AuthUser["role"]) {
  if (role === "admin") {
    return [{ label: "Ezzstar Control Center", href: "/admin" }];
  }

  if (role === "zone_owner" || role === "manager") {
    return [];
  }

  return [{ label: "SPICA Player App", href: "/player" }];
}

function initials(user?: AuthUser | null) {
  const name = user?.name || user?.username || user?.email || "SP";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDevelopment = process.env.NODE_ENV === "development";

  useEffect(() => {
    async function loadUser() {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      const payload = await response.json().catch(() => ({}));
      setLoading(false);

      if (response.ok) {
        setUser(payload.user);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function logout(redirectTo = "/login") {
    setSigningOut(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      window.location.assign(redirectTo);
    } catch (logoutError) {
      setSigningOut(false);
      setError(logoutError instanceof Error ? logoutError.message : "Could not sign out");
    }
  }

  const displayName = user?.username || user?.name || user?.email || "Account";
  const links = user ? dashboardLinks(user.role) : [];
  const zoneOsUrl = user && (user.role === "zone_owner" || user.role === "manager" || user.role === "admin") ? getZoneOsUrl() : null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-2 py-2 text-left transition hover:border-cyan-200/30 hover:bg-white/[0.075]"
        disabled={loading}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-xs font-bold text-cyan-100">
          {initials(user)}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm font-semibold text-white">{loading ? "Loading account..." : displayName}</span>
          <span className="block truncate text-xs text-slate-500">{user ? roleLabel[user.role] : "Signed in"}</span>
        </span>
        <ChevronDown className={clsx("h-4 w-4 shrink-0 text-slate-500 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-72 animate-notification-in rounded-2xl border border-white/10 bg-[#08090d]/95 p-2 shadow-nebula backdrop-blur-2xl" role="menu">
          <div className="rounded-xl bg-white/[0.045] px-3 py-3">
            <p className="truncate text-sm font-semibold text-white">{user?.name ?? displayName}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{user?.email ?? "Authenticated account"}</p>
            <p className="mt-2 inline-flex rounded-full border border-purple-300/20 bg-purple-300/10 px-2 py-1 text-xs font-semibold text-purple-100">
              {user ? roleLabel[user.role] : "Role"}
            </p>
          </div>

          <div className="mt-2 space-y-1">
            <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.065] hover:text-white" href={user ? profileRoute[user.role] : "/login"} role="menuitem">
              <UserRound className="h-4 w-4 text-cyan-200" />
              My Profile
            </Link>

            <div className="px-3 pt-3 text-xs uppercase tracking-[0.18em] text-slate-600">Switch Surface</div>
            {links.map((item) => (
              <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.065] hover:text-white" href={item.href} key={item.href} role="menuitem">
                <LayoutDashboard className="h-4 w-4 text-purple-200" />
                {item.label}
              </Link>
            ))}
            {zoneOsUrl ? (
              <Link className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.065] hover:text-white" href={zoneOsUrl} role="menuitem">
                <LayoutDashboard className="h-4 w-4 text-cyan-200" />
                Open SPICA Zone OS
              </Link>
            ) : null}

            {isDevelopment ? (
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/[0.065] hover:text-white disabled:opacity-50"
                disabled={signingOut}
                onClick={() => logout("/login")}
                role="menuitem"
                type="button"
              >
                <UserRound className="h-4 w-4 text-amber-200" />
                Switch account
              </button>
            ) : null}

            <button
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-100 transition hover:bg-red-400/10 disabled:opacity-50"
              disabled={signingOut}
              onClick={() => logout()}
              role="menuitem"
              type="button"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing out..." : "Logout"}
            </button>
          </div>

          {error ? <p className="mt-2 rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs text-red-100">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
