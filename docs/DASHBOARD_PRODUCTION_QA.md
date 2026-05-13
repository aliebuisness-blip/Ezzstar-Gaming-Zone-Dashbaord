# SPICA ARENA OS Dashboard Production QA

Use this checklist before adding new dashboard features. The goal is to keep player, zone owner, and admin workflows separate, polished, and safe.

## Auth and Role Routing

- [ ] Player login redirects to `/player`.
- [ ] Zone owner login redirects to `/zone`.
- [ ] Admin login redirects to `/admin`.
- [ ] Player cannot access `/zone` or `/admin`.
- [ ] Zone owner and manager cannot access `/admin`.
- [ ] Manager can access zone operations only.
- [ ] Account menu shows role label, profile link, switch account, and logout.
- [ ] Logout clears the session and redirects to `/login`.

## Player Dashboard

- [ ] `/player` shows only player wallet, activity, achievements, zones, updates, and profile content.
- [ ] `/player/wallet` supports mock SPICA top-up and shows balance/top-up state.
- [ ] `/player/activity` shows session history or a clean empty state.
- [ ] `/player/zones` shows approved zones only, with availability summaries rather than raw PC controls.
- [ ] `/player/tournaments` has a professional coming-soon/waitlist style state.
- [ ] `/player/updates` shows ecosystem and followed-zone updates only.
- [ ] `/player/profile` shows profile, stats, achievements, and favorite-zone information.
- [ ] Player pages never show PC pairing, raw PC IDs, heartbeats, admin controls, or debug panels.

## Zone Owner Dashboard

- [ ] `/zone` shows zone-level operations, latest sessions, earnings, and alerts only.
- [ ] `/zone/pcs` shows pairing requests, add PC, PC management, status, and session controls.
- [ ] Pairing approve/reject uses the professional confirmation overlay.
- [ ] Delete PC uses the professional confirmation overlay and shows success/error toast.
- [ ] Regenerate token uses the professional confirmation overlay.
- [ ] Maintenance mode uses the professional confirmation overlay.
- [ ] `/zone/customers` shows customers who used this zone, visits, spend, and last visit.
- [ ] `/zone/sessions` supports active/history views, add time, end session, and filters.
- [ ] End session uses confirmation and shows toast feedback.
- [ ] `/zone/earnings` shows gross SPICA, commission, net, and settlement-ready summaries.
- [ ] `/zone/updates` has clean announcement/update placeholders or editor.
- [ ] Zone pages never show global Ezzstar admin revenue, all-platform player controls, or admin-only approvals.

## Ezzstar Admin Dashboard

- [ ] `/admin` shows ecosystem/business metrics only.
- [ ] Admin overview does not show raw PC grids, heartbeats, LAN pairing internals, local timers, or PC command logs.
- [ ] `/admin/zones` shows zone, owner/city/status/capacity/revenue summary and status controls.
- [ ] Approve/suspend/reject/reactivate zone uses confirmation.
- [ ] `/admin/players` shows player list, SPICA summary, and moderation-ready status.
- [ ] `/admin/requests` shows zone listing requests with approve/reject/contact workflow.
- [ ] `/admin/settlements` supports approve and mark paid with confirmation.
- [ ] `/admin/tournaments` has professional event-management placeholder state.
- [ ] `/admin/announcements` has professional platform announcement placeholder state.
- [ ] `/admin/moderation` has professional trust/safety queue placeholder state.
- [ ] `/admin/support` has professional support queue placeholder state.
- [ ] `/admin/system-health` shows high-level health summaries only.
- [ ] Dev tools, raw logs, sockets, and heartbeats are hidden from normal admin pages.

## Feedback and Confirmations

- [ ] No user-facing `alert()` or `confirm()` dialogs appear.
- [ ] Risky actions use the shared confirmation overlay.
- [ ] Success, error, warning, and info toasts render consistently.
- [ ] API failures show professional messages, not stack traces, Prisma errors, raw JSON, or `undefined`.
- [ ] Loading labels use polished copy such as “Syncing your profile...” or “Checking pairing requests...”.

## Empty States

- [ ] Player empty states include no activity, no favorite zones, no tournaments, and no updates.
- [ ] Zone empty states include no PCs, no pairing requests, no active sessions, no customers, no earnings, and no updates.
- [ ] Admin empty states include no pending requests, no settlements, no moderation items, no support tickets, and no announcements.
- [ ] Empty states include clear next actions where useful.

## Realtime and PC Operations

- [ ] Pairing request appears in `/zone/pcs` within 3 seconds.
- [ ] Approving a pairing request creates matching `PC` and `PCClient` records.
- [ ] PC auth succeeds after approval.
- [ ] PC heartbeat updates zone dashboard status.
- [ ] Starting a session sends `command:start-session`.
- [ ] Adding time sends `command:add-time`.
- [ ] Ending a session sends `command:end-session`.
- [ ] Deleted/unregistered PC heartbeat does not crash realtime server.
- [ ] Dashboard refresh preserves current role and state.

## Responsive QA

- [ ] 1366x768 laptop layout has no horizontal overflow.
- [ ] 1440p layout uses compact cards and tables.
- [ ] Ultrawide layout does not stretch tables into unreadable widths.
- [ ] Mobile fallback navigation works for each role.
- [ ] Modals and toasts fit mobile width.

## Build and Validation

- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] Login smoke test for player, zone owner, and admin.
- [ ] Role route protection smoke test.
- [ ] Session start/add/end smoke test with realtime server running.
