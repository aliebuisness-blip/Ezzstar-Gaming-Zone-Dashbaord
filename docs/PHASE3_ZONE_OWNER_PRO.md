# Phase 3 Zone Owner Pro

## Operator Workflows Added

- PC add, rename, remove.
- PC category: `standard`, `premium`, `vip`.
- Per-PC hourly SPICA rate.
- Maintenance mode.
- Auth token regeneration with fresh `.env` config.
- Downloadable PC client `.env` file from the dashboard.
- Copy-paste Windows setup command.
- Popup message command to a selected PC.
- Manager staff accounts tied to one zone.
- Manager access:
  - Can manage PCs, sessions, and analytics.
  - Cannot delete PCs through the manager role.
  - Cannot access withdrawal/admin-only controls.

## Zone Analytics Added

- SPICA earned.
- Estimated Ezzstar commission.
- Projected net settlement.
- Active sessions.
- Total hours played.
- Online/offline PC presence.
- Most used PCs.
- Top players.

## Session History

- Search by player, PC, zone, or status.
- Compact session cards reuse live timer logic.
- CSV export placeholder is documented for a later export pass.

## Manual QA

1. Sign in as `owner@spica.local`.
2. Open `/zone`.
3. Confirm the home dashboard shows:
   - analytics
   - Connected PC Test Panel
   - PC Operations table
   - Staff Access panel
   - PC onboarding panel
4. Add a new PC:
   - choose name, category, and rate
   - confirm `.env` config appears
   - use Copy and Download `.env`
5. Rename a PC from the operations table.
6. Change category and rate.
7. Toggle maintenance mode.
8. Confirm Start Session is blocked for maintenance PCs.
9. Regenerate token and confirm a new setup config appears.
10. Send popup message to an online PC.
11. Create a manager account.
12. Sign in as manager and confirm `/zone` works.
13. Confirm manager can list/manage PCs.
14. Confirm manager cannot delete PCs.
15. Start, add time, end, and expire a session to ensure realtime still works.

## Smoke Test Result

Automated local API smoke passed:

- create manager
- list owner PCs
- update PC category/rate/maintenance
- regenerate PC token
- manager can list PCs
- manager cannot delete PC
- clear maintenance

## Notes

- Realtime architecture remains unchanged:
  - raw WebSocket for PCs
  - Socket.IO for dashboards
  - internal command bridge for PC commands
- Settlement logic and session recovery were not rewritten.
