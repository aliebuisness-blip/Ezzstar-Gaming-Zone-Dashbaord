# Production Data Cleanup QA

Use this checklist before release when changing dashboard data hydration, auth, or seed behavior.

## Automated checks

```bash
npm run check:prod-data
npx tsc --noEmit
npm run build
```

`check:prod-data` scans `app/`, `components/`, `context/`, and `lib/` for production-risk demo identity values such as `Ayan Malik`, `zone-a`, `player-1`, and demo profile factories.

## Manual checks

- Create a new player account and confirm `/player` shows that player's username, email, avatar/banner, SPICA balance, sessions, and transactions.
- Refresh `/player` and confirm the same user remains visible.
- Log out, sign in as another player, and confirm the previous profile does not appear.
- Sign in as a zone owner with no linked zone and confirm the dashboard shows the pending approval empty state.
- Sign in as a zone owner with a linked zone and confirm only that owner zone appears.
- Sign in as admin and confirm admin sees real platform users/zones/requests only.
- Temporarily stop/fail `/api/dashboard` and confirm the UI shows loading/error/empty states, never another user's profile.
- Confirm production seed creates only the admin baseline.
- Confirm demo seed is only run through `npm run db:seed:dev` or `npm run db:reset-demo`.

