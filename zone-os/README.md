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

## Local Runtime

For the current repo phase, run the compatibility Zone OS routes from the repo root:

```powershell
npm run zone-os:setup
npm run zone-os:setup:db
npm run realtime
npm run zone-os:dev
```

Open:

```txt
http://localhost:3000/zone
```

Use `/zone-os` to see detected LAN URLs and realtime connection details.

Full setup notes live in:

```txt
docs/ZONE_OS_LOCAL_RUNTIME.md
```

## Desktop Wrapper

The Windows operator software scaffold lives in:

```txt
zone-os/desktop/
```

Commands:

```powershell
npm run zone-os:desktop:dev
npm run zone-os:desktop:build
npm run zone-os:installer
```

On launch, the desktop wrapper:

- prepares the local runtime environment
- checks PostgreSQL/local database health
- creates the `spica_arena_os` database when PostgreSQL is reachable
- runs Prisma generate, migrations, and local baseline seed
- starts realtime automatically
- starts the local Zone OS web runtime automatically
- opens `/zone` in a desktop window
- shows local and LAN URLs for PC clients during startup

Packaging dependencies for the build machine:

```powershell
npm install --save-dev electron electron-builder
```

Database helper commands:

```powershell
npm run zone-os:db:check
npm run zone-os:db:setup
npm run zone-os:repair
```

If PostgreSQL is missing or unreachable, the desktop wrapper shows a clean setup-required screen with a PostgreSQL download link and retry action.

## Current Dependency Model

For now, Zone OS continues to depend on the shared local backend/API layer in the main repository:

- local Prisma/Postgres operational data
- Supabase web identity/profile validation
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
