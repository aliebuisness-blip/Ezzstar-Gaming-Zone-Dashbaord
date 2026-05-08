# Phase 5 Admin Dashboard Pro

## Added

- Admin overview metrics:
  - total zones
  - active/pending zones
  - total players
  - online PCs
  - active sessions
  - SPICA bought/spent
  - commission earned
  - zone net earnings
- Zone management table:
  - status controls for approve/reactivate, suspend, reject
  - online PC count
  - active sessions
  - gross SPICA and commission
- Settlement control:
  - `pending`, `approved`, `paid`
  - payout method placeholder: `PKR`, `SPICA`, `hybrid`
  - approve and mark-paid actions
- Live monitoring:
  - active sessions
  - timer
  - player, zone, PC
  - force end session
  - send message to PC
- Fraud/safety panels:
  - offline PC with active session
  - long sessions
  - stale heartbeat
  - duplicate reconnect log signals
- Admin notifications:
  - pending zones
  - PC offline
  - pending settlements
  - long sessions
- Analytics payload:
  - daily SPICA volume
  - daily commission
  - session volume graph-ready fields

## APIs

- `PATCH /api/zones/:id`
  - admin can set `active`, `pending`, `rejected`, `suspended`
- `PATCH /api/settlements/:id`
  - admin can set `approved` or `paid`
  - accepts payout method

## Validation

- `npx prisma generate`
- `npx prisma migrate deploy`
- `npx tsc --noEmit`
- `npm run build`
- Admin smoke:
  - login as admin
  - `/api/dashboard`
  - `/api/zones`
  - analytics payload includes `onlinePcs`

## Notes

- Realtime PC handshake/session recovery was not changed.
- Port 4001 was left free after validation.
