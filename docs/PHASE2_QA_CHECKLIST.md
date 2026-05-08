# Phase 2 QA Checklist

Use this checklist before starting Phase 3 Zone Owner Management polish.

## 0. Setup

- Run `npx prisma migrate deploy`.
- Run `npx prisma generate`.
- Start dashboard: `npm run dev`.
- Start realtime server: `npm run realtime`.
- Start Electron PC client with:
  - `VITE_PC_ID="pc-01"`
  - `VITE_ZONE_ID="zone-a"`
  - `VITE_PC_AUTH_TOKEN="pc-token-zone-a-pc-01"`

## 1. Seeded Account Login

- Sign in with `player@spica.local` / `password123`.
  - Expected: redirects to `/player`.
- Sign in with `owner@spica.local` / `password123`.
  - Expected: redirects to `/zone`.
- Sign in with `admin@spica.local` / `password123`.
  - Expected: redirects to `/admin`.

## 2. Signup QA

- Create a player account with a unique email and password at least 8 characters.
  - Expected: account is created, JWT cookie is set, user redirects to `/player`.
- Create a zone owner account with zone name and city.
  - Expected: account is created, zone is created with `pending` status, user redirects to `/zone`.
- Try signing up with an existing email.
  - Expected: `409` with `Email or username is already registered`.
- Try a weak password shorter than 8 characters.
  - Expected: `400` validation error.
- Try an invalid email.
  - Expected: `400` validation error.
- Open the returned `/api/auth/verify-email?token=...`.
  - Expected: `emailVerified` becomes `true`.
- Call `/api/auth/forgot-password`.
  - Expected: mock reset token is returned in development.

## 3. Zone Approval Flow

- Sign up as a new `zone_owner`.
  - Expected: new zone status is `pending`.
- Attempt to start a session in a pending zone.
  - Expected: API rejects with `Zone is not approved for sessions`.
- Sign in as admin.
- Approve a zone:
  - `PATCH /api/zones/:id`
  - Body: `{ "status": "active" }`
  - Expected: zone status becomes `active`.
- Reject a zone:
  - Body: `{ "status": "rejected" }`
  - Expected: zone no longer appears in player zone list.
- Suspend a zone:
  - Body: `{ "status": "suspended" }`
  - Expected: sessions cannot start.

## 4. Player Global Account

- Sign in as player.
- Confirm wallet shows username, email, membership, favorite zones, and SPICA balance.
- Buy mock SPICA.
  - Expected: balance increases and persists after refresh.
- Start a session at an active zone.
  - Expected: balance decreases by session cost.
- Refresh `/player`.
  - Expected: account state, balance, and session history persist from database.
- Verify play history shows zone, PC, timer/duration, and cost.

## 5. PC Client Login API

- Valid player login:
  - `POST /api/pc/auth/login`
  - Body: `{ "email": "player@spica.local", "password": "password123", "pcId": "pc-01", "zoneId": "zone-a" }`
  - Expected: returns token, player profile, balance, `canStartSession`.
- Invalid password.
  - Expected: `401`.
- Insufficient balance:
  - Body includes `"estimatedCost": 999999999`
  - Expected: `402` with `Insufficient SPICA balance`.

## 6. Session Regression

- Confirm realtime terminal logs `PC connected: pc-01`.
- Confirm heartbeat logs `Heartbeat received: pc-01`.
- Start 5 minute session from Zone test panel.
  - Expected: Next.js API returns `200`.
  - Expected realtime logs command dispatch.
  - Expected PC client switches to active session screen.
- Add 2 minutes.
  - Expected PC and dashboard timers update.
- End session.
  - Expected PC locks/ends, DB session completes, settlement is created once.
- Start a short session and let it expire.
  - Expected server auto-completes session, marks PC available, sends `command:end-session`.
- Run cleanup.
  - Expected expired active session count is returned, no duplicate settlements.

## 7. Role Security

- Player opens `/zone`.
  - Expected redirect to `/player`.
- Player opens `/admin`.
  - Expected redirect to `/player`.
- Zone owner opens `/admin`.
  - Expected redirect to `/zone`.
- Admin opens `/player` or `/zone`.
  - Expected redirect to `/admin`.
- API checks:
  - Player cannot call PC registration endpoints.
  - Zone owner cannot approve withdrawals or access admin-only zone status for other owners.
  - Admin can patch zone status.

## 8. UI QA

- Login, signup, and forgot password tabs are visually consistent.
- Mobile login form fits without horizontal scroll.
- Dashboard PC cards remain compact.
- Errors show readable text, not HTML blobs.
- Buttons show loading or disabled state where needed.
- Pending/rejected/suspended zones do not appear in player zone cards.

## 9. Known Non-Blocking Warning

- On this Windows machine, Next may log:
  - `@next/swc-win32-x64-msvc ... is not a valid Win32 application`
- Current status: build still passes. Track separately if it starts blocking dev/build.
