# SPICA ARENA OS Dashboard UX QA

Use this checklist after visual or interaction changes. The goal is a polished premium gaming ecosystem product without role leakage or debug clutter.

## Global Polish

- [ ] Cards feel compact and consistent across laptop and desktop.
- [ ] Page headings, section headings, and table text have clear hierarchy.
- [ ] Buttons align with icons and do not wrap awkwardly.
- [ ] Hover states are subtle and do not shift layouts aggressively.
- [ ] Tables remain readable at 1366x768.
- [ ] Mobile bottom navigation remains usable for each role.
- [ ] No oversized placeholder gradients dominate normal dashboard pages.

## Loading and Empty States

- [ ] Loading states use skeleton/shimmer treatment where appropriate.
- [ ] Loading labels are professional: no “Working” copy.
- [ ] Empty states include an icon, human message, and useful next action where relevant.
- [ ] Error states avoid raw JSON, stack traces, Prisma messages, or undefined values.
- [ ] Retry/reconnect guidance is clear when realtime is unavailable.

## Realtime Experience

- [ ] PC status badges clearly show Online, Offline, In Use, Recovering, and Maintenance.
- [ ] Active sessions show a smooth countdown and progress bar.
- [ ] Sessions near expiry show warning tone without flicker.
- [ ] Reconnecting/recovering states use subtle pulse indicators.
- [ ] Dashboard refresh does not reset active timers incorrectly.
- [ ] Realtime disconnection does not expose raw socket/debug text in normal dashboards.

## Action Menus and Confirmations

- [ ] PC cards use compact contextual action menus where appropriate.
- [ ] Risky actions still use confirmation overlays.
- [ ] Delete/regenerate/suspend/approve/mark-paid actions show toast feedback.
- [ ] No browser `alert()` or `confirm()` appears.
- [ ] Disabled actions have clear disabled styling.

## Notification Center

- [ ] Notifications are grouped by category.
- [ ] Unread/new indicator is visible but not distracting.
- [ ] Timestamps show relative time.
- [ ] Empty notification state is polished.
- [ ] Clickable notification rows have a hover state.
- [ ] Categories cover system, session, earnings, tournaments, moderation, and updates.

## Player Experience

- [ ] Player pages feel like a gaming ecosystem, not an admin console.
- [ ] Profile card has clear identity, level, XP, and favorite games.
- [ ] Achievements have progression/locked/unlocked visual treatment.
- [ ] Wallet page shows balance, top-up, transactions, and spending by zone.
- [ ] Zones page shows approved zones only and avoids operational PC controls.
- [ ] Updates page separates Ezzstar updates from followed zone updates.

## Zone Operations

- [ ] Zone pages feel like a live operations center.
- [ ] PC availability and active sessions are easy to scan.
- [ ] Session cards show player, timer, spend, rate, and actions.
- [ ] PC pairing panel remains clear for non-technical owners.
- [ ] Earnings page shows gross, commission, net, and daily breakdown.
- [ ] Updates page supports create/edit/delete with confirmation.

## Admin Ecosystem

- [ ] Admin overview shows ecosystem/business metrics only.
- [ ] Admin does not show raw PC grids, LAN internals, heartbeat logs, or local timers.
- [ ] Zone table shows business summaries and status controls.
- [ ] Requests page supports detail, approve, contact, reject flows.
- [ ] Settlements show approve/paid workflows with confirmation.
- [ ] System health is high-level and suitable for executives/operators.

## Validation

- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] Smoke test `/player`, `/zone`, `/admin`.
- [ ] Smoke test `/zone/pcs` with realtime server running.
- [ ] Smoke test logout/switch-account menu.
