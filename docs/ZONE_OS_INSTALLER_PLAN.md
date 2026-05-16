# SPICA Zone OS Windows Installer Plan

## Goal

Turn SPICA Zone OS into installable operator software for gaming zone owners. The owner should not need terminal commands, manual IP editing, or developer knowledge.

## Installer Responsibilities

The Windows installer should:

- install or verify the Zone OS runtime
- create/check the local PostgreSQL database
- run Prisma migrations
- generate local runtime secrets
- configure `.env` safely
- install/start the realtime service
- open Zone OS in browser or embedded shell
- expose the LAN URL for PC clients
- support repair/reset setup

## Packaging Approach

Recommended staged path:

1. Wrap the current Zone OS surface in Electron.
2. On launch, run the local runtime setup check.
3. Start `server/realtime.ts` automatically.
4. Start the local Next.js Zone OS runtime automatically.
5. Open `/zone` in a desktop operator window.
6. Package the wrapper with Electron Builder for Windows.

Current scaffold:

- Desktop entry: `zone-os/desktop/main.js`
- Desktop launcher: `zone-os/desktop/launch.js`
- Builder config: `zone-os/electron-builder.json`
- Dev command: `npm run zone-os:desktop:dev`
- Installer command: `npm run zone-os:installer`

Packaging dependencies are intentionally not bundled into source control. Install them in the packaging environment:

```powershell
npm install --save-dev electron electron-builder
```

## PostgreSQL Options

Option A: guided PostgreSQL setup

- safest first production path
- desktop runtime detects PostgreSQL and explains what is missing
- runtime creates `spica_arena_os` if PostgreSQL is reachable
- runtime runs Prisma generate, migrations, and local baseline seed
- smaller installer and easier support

Option B: bundled PostgreSQL

- best final owner experience
- installer ships or downloads PostgreSQL
- installer creates a private local database cluster
- larger installer and more Windows service complexity

Option C: embedded local database alternative

- technically simpler install flow for single-machine local apps
- not compatible with current Prisma/Postgres operational architecture without a data-layer change
- not recommended for this phase

Recommended: use Option A now for pilot zones, then move to Option B for public release. Option A keeps the current Prisma/Postgres architecture intact while removing manual database commands for owners when PostgreSQL is already installed/running.

Current automated database setup:

- command: `npm run zone-os:db:setup`
- check: `npm run zone-os:db:check`
- repair: `npm run zone-os:repair`
- startup integration: Electron desktop wrapper runs database setup before realtime/web startup
- if PostgreSQL is missing/unreachable, Zone OS shows a clean setup-required screen with retry and PostgreSQL download link

## Local Secrets

Installer generates:

- `JWT_SECRET`
- `REALTIME_INTERNAL_SECRET`
- local pairing/runtime tokens

Secrets are stored only on the operator PC and must not be committed or uploaded to Supabase.

## Realtime Service

Current desktop wrapper starts realtime as a child process. Production installer should eventually promote it to a background Windows service:

- starts on boot
- restarts on crash
- listens on configured LAN port, default `4001`
- exposes raw WebSocket for PC clients
- exposes Socket.IO for Zone OS dashboard

## Firewall / LAN Setup

Installer should:

- detect reachable LAN IPv4
- request Windows Firewall allow rules for ports `3000` and `4001`
- warn if only virtual adapters are detected
- show the final PC client LAN URL

Current desktop startup screen shows a firewall note:

- allow port `3000` for the Zone OS operator web UI
- allow port `4001` for PC Client WebSocket/realtime pairing

## First Login / Ownership Verification

Zone OS should require internet on first setup to verify:

- Ezzstar Supabase account
- role is `zone_owner` or `manager`
- linked zone status is `active`

After verification, local operations should continue LAN-first where possible.

## Auto Update

Future options:

- Electron auto-updater
- signed installer updates
- operator prompt before update
- safe rollback on failed migration

## Repair / Reset

Installer should include:

- repair local services
- regenerate local secrets
- reset PC pairing
- backup database
- reset local database after explicit confirmation

## Current Startup Flow

When the Electron desktop wrapper opens:

1. Show a local startup screen.
2. Run `scripts/setup-zone-os-runtime.js`.
3. Run `scripts/zone-os-db.js setup`.
4. Create the local database if PostgreSQL is reachable and the database is missing.
5. Run Prisma generate and migrations.
6. Seed local non-destructive Zone OS baseline records.
7. Detect LAN IPv4.
8. Start realtime on `REALTIME_PORT`, default `4001`.
9. Start Zone OS web runtime on port `3000`.
10. Show local and LAN URLs.
11. Load `http://localhost:3000/zone`.

Secrets are redacted from startup logs before they are displayed.

## Not In Scope

- migrating local PCs/sessions/pairing to Supabase
- changing Electron PC Client repository
- replacing local realtime architecture
