# SPICA Zone OS Local Runtime

SPICA Zone OS is the LAN-first operator surface for an approved gaming zone. It remains separate from the Ezzstar Web App.

## Responsibilities

Local Zone OS owns:

- paired PCs
- PC heartbeat and pairing requests
- local sessions, timers, and realtime PC commands
- local settlements and operator activity
- local Prisma/Postgres operational state

Ezzstar Web App owns:

- public portal
- Supabase auth
- player profiles and online app
- admin approvals
- public tournaments and announcements

## First-Run Setup

Run these commands on the zone owner/operator PC:

```powershell
npm install
npm run zone-os:setup
npm run zone-os:setup:db
npm run realtime
npm run zone-os:dev
```

`npm run zone-os:setup` prepares `.env` with local runtime defaults and generated secrets.

`npm run zone-os:setup:db` runs:

- `prisma generate`
- `prisma migrate deploy`
- `npm run db:seed:dev`

The local PostgreSQL database must exist before running the database setup.

Default local database URL:

```txt
postgresql://postgres:postgres@localhost:5432/spica_arena_os?schema=public
```

## Local URLs

Zone OS runs at:

```txt
http://localhost:3000/zone
```

For PCs on the LAN, use the detected LAN URL:

```txt
http://192.168.x.x:3000/zone
```

Realtime PC clients connect to:

```txt
ws://192.168.x.x:4001
```

The `/zone-os` route shows the currently detected local URL, LAN URL, realtime URL, and database readiness.

## Approved Owner Flow

1. Zone owner applies on the Ezzstar Web App.
2. Ezzstar admin approves the zone in Supabase.
3. Zone owner logs into the Ezzstar Web App.
4. If `NEXT_PUBLIC_ZONE_OS_URL` is configured, the web app opens that Zone OS URL.
5. If no URL is configured, production routes the owner to `/zone-os`, which explains local setup and shows detected runtime URLs.
6. Zone OS validates Supabase identity and approved zone ownership through the existing web auth guard while local operational APIs continue using Prisma/Postgres.

## PC Pairing Flow

1. Start local web server with `npm run zone-os:dev`.
2. Start realtime server with `npm run realtime`.
3. PC client discovers or is pointed to the LAN realtime URL.
4. PC sends pairing request.
5. Operator approves pairing in `/zone/pcs`.
6. Zone OS creates local `PC` and `PCClient` records in Prisma/Postgres.
7. PC reconnects with stable `pcId`, `zoneId`, and `authToken`.

## Packaging Direction

The current `/zone` routes are compatibility routes inside the repo. The staged `zone-os/` folder mirrors the future standalone operator app structure.

Later packaging options:

- standalone Next.js app
- Electron operator shell
- Tauri operator shell

The backend contract should remain stable: local Zone OS uses local Prisma/Postgres and local realtime; Ezzstar Web App uses Supabase.

## Remaining Production Work

- installer for PostgreSQL/runtime prerequisites
- background service for realtime server
- automatic startup on boot
- signed operator app package
- stronger Supabase-to-local Zone OS ownership handshake
- production LAN discovery and firewall onboarding screens
