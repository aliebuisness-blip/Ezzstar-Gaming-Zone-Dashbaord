# SPICA Arena OS Product Split Plan

## Products

### Ezzstar Web App

Deployable web surface for Vercel.

Owns:

- public landing page at `/`
- login, signup, forgot password
- list-your-zone onboarding
- SPICA Player App routes at `/player/*`
- Ezzstar Control Center routes at `/admin/*`
- shared backend/API routes for the current phase

Does not own the long-term Zone OS operator UI. The existing `/zone/*` routes remain only as temporary compatibility routes while the Zone OS app is staged.

### SPICA Zone OS

Operator software surface for gaming zone owners and managers.

Owns:

- zone dashboard
- PC management and pairing
- player verification/search
- session start, add time, and end controls
- settlements and earnings
- zone settings
- operator activity

Staging folder:

```txt
zone-os/
  app/zone/
  components/
```

### SPICA PC Client

Electron runtime for gaming PCs.

This is already a separate repository and is not part of this dashboard split.

## Shared Backend/API Dependency

For Phase 1, backend logic remains in the main Next.js app:

- Prisma/Postgres auth and operational data
- JWT/cookie auth
- player, zone, admin dashboard API data
- PC pairing APIs
- PC/session APIs
- realtime server bridge
- Supabase media storage helpers

Zone OS will consume these APIs instead of duplicating Prisma/business logic.

## Shared Code Candidates

Future shared packages should include:

- dashboard/session types
- formatting helpers
- timer helpers
- API contract types
- auth client helpers
- reusable UI primitives

Suggested future structure:

```txt
apps/
  web/
  zone-os/
packages/
  shared/
  ui/
```

## Migration Path

1. Keep the current main app working.
2. Mirror Zone OS frontend files into `zone-os/`.
3. Add `components/dashboard/zone/ZoneOSWorkspace.tsx` as the Zone OS boundary.
4. Keep `/zone/*` routes active as compatibility routes for testing.
5. Update account menu to open Zone OS using `NEXT_PUBLIC_ZONE_OS_URL` when available.
6. Create a standalone Zone OS package/app around the staged files.
7. Move shared helpers into `packages/shared` or `lib/shared`.
8. Point Zone OS to the shared backend APIs.
9. Disable or redirect `/zone/*` in the Ezzstar Web App after standalone Zone OS is deployed.

## Deployment Direction

- Ezzstar Web App: Vercel.
- SPICA Zone OS: local/operator app, packaged web shell, or separate LAN-hosted Next app.
- PC Client: separate Electron app.

## Production Safety Rules

- Do not reintroduce demo/fallback data.
- Do not duplicate Prisma business logic in Zone OS.
- Do not expose Zone OS operator controls in player/public navigation.
- Keep auth, role protection, and API contracts unchanged during the staged split.
