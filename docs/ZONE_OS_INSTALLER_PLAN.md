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

1. Package current Next.js Zone OS compatibility surface with a Node runtime.
2. Add a Windows service for `server/realtime.ts`.
3. Add a setup wizard for database/runtime checks.
4. Later wrap the operator UI in Electron or Tauri for a desktop app feel.

## PostgreSQL Options

Option A: bundled PostgreSQL

- best for non-technical owners
- installer creates `spica_arena_os`
- installer stores credentials locally
- bigger installer size

Option B: external PostgreSQL prerequisite

- easier initial engineering
- owner/support must install PostgreSQL first
- acceptable for beta/internal deployments

Recommended: begin with Option B for pilot zones, then move to bundled PostgreSQL for public release.

## Local Secrets

Installer generates:

- `JWT_SECRET`
- `REALTIME_INTERNAL_SECRET`
- local pairing/runtime tokens

Secrets are stored only on the operator PC and must not be committed or uploaded to Supabase.

## Realtime Service

Realtime server should run as a background Windows service:

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

## Not In Scope

- migrating local PCs/sessions/pairing to Supabase
- changing Electron PC Client repository
- replacing local realtime architecture
