# SPICA Zone OS

This folder is the staged product boundary for the future standalone SPICA Zone OS operator software.

The current production app still keeps `/zone/*` routes in the main Next.js app for compatibility while testing. Files in this folder mirror the Zone OS frontend surface so it can be separated into its own app/package without touching the Electron PC Client or backend APIs.

## Product Scope

SPICA Zone OS owns:

- zone dashboard
- PC management and pairing
- player verification/search
- session start, add time, and end controls
- settlements and earnings views
- zone settings
- local operator activity

## Current Dependency Model

For now, Zone OS continues to depend on the shared backend/API layer in the main repository:

- Prisma/Postgres operational data
- auth/session cookies
- `/api/dashboard`
- `/api/pcs`
- `/api/pc-pairing`
- `/api/players/search`
- `/api/start-session`
- `/api/add-time`
- `/api/end-session`
- Socket.IO dashboard realtime

## Next Migration Step

Turn this folder into a standalone app by adding its own package manifest, Next config, and shared package imports. Until then, this folder is intentionally a mirror/staging area and should not be treated as the source of truth.
