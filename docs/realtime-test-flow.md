# SPICA Realtime PC Kiosk Test Flow

This flow verifies that a dashboard session command reaches the exact connected PC kiosk client.

## 1. Start PostgreSQL

Make sure `.env` points to a running database:

```bash
npm run check:env
npm run check:db
```

Required realtime bridge secret:

```env
REALTIME_INTERNAL_SECRET="dev-realtime-secret"
```

If the database is empty:

```bash
npm run prisma:migrate
npm run prisma:seed
```

## 2. Start Backend

```bash
npm run dev
```

Open:

```text
http://localhost:3000/login
```

## 3. Start Realtime Server

In a second terminal:

```bash
npm run realtime
```

Expected log:

```text
Connected to PostgreSQL successfully
WebSocket server running on port 4001
```

## 4. Start PC Client

Find a PC id and token from the database. For seeded data, the token format is:

```text
pc-token-zone-a-pc-01
```

Set environment variables:

```bash
set PC_ID=<database pc id for PC-01>
set ZONE_ID=zone-a
set PC_AGENT_TOKEN=pc-token-zone-a-pc-01
npm run pc-agent
```

Expected realtime server log:

```text
PC connected: PC-01 (<pcId>) zone=zone-a
Heartbeat received: PC-01 (<pcId>)
```

Expected PC client screen:

```text
LOCKED
This PC is locked by SPICA ARENA OS.
```

## 5. Login As Player

Login with:

```text
player@spica.local
password123
```

## 6. Buy SPICA

Use the Player dashboard wallet or call:

```bash
curl -X POST http://localhost:3000/api/buy-spica ^
  -H "Content-Type: application/json" ^
  --cookie "spica_token=<jwt cookie>" ^
  -d "{\"amount\":1000}"
```

## 7. Start Session On PC-01

From the dashboard, start a session for PC-01, or call:

```bash
curl -X POST http://localhost:3000/api/start-session ^
  -H "Content-Type: application/json" ^
  --cookie "spica_token=<jwt cookie>" ^
  -d "{\"zoneId\":\"zone-a\",\"pcId\":\"<pc id>\",\"durationMinutes\":60}"
```

Expected backend/realtime logs:

```text
Session started: <sessionId> on PC <pcId>
Internal command authorized
Internal command received for pc-01
Attempting start command to pc-01
Start command sent to pc-01
```

Expected PC client:

```text
ACTIVE SESSION
Player: Ayan Malik
Zone: Galaxy Gaming Arena
PC: PC-01
```

## 8. Add Time

```bash
curl -X POST http://localhost:3000/api/add-time ^
  -H "Content-Type: application/json" ^
  --cookie "spica_token=<jwt cookie>" ^
  -d "{\"sessionId\":\"<session id>\",\"extraMinutes\":15}"
```

Expected log:

```text
Internal command received for pc-01
Add time command sent to pc-01
```

## 9. End Session

```bash
curl -X POST http://localhost:3000/api/end-session ^
  -H "Content-Type: application/json" ^
  --cookie "spica_token=<jwt cookie>" ^
  -d "{\"sessionId\":\"<session id>\"}"
```

Expected logs:

```text
Session ended: <sessionId>
Internal command received for pc-01
End command sent to pc-01
```

Expected PC client:

```text
SESSION ENDED
This PC is locked by SPICA ARENA OS.
```

## Notes

- Invalid PC clients are rejected if `pcId`, `zoneId`, or `authToken` do not match `PCClient`.
- If heartbeats stop for more than 15 seconds, the realtime server marks the PC `offline`.
- Dashboard clients receive `pc:status`, `pc:heartbeat`, and `session:update` events for live UI sync.

## Direct Internal Command Test

With `npm run realtime` running and PC-01 connected, this should return `200 OK`:

```powershell
Invoke-WebRequest `
  -UseBasicParsing `
  -Uri "http://192.168.1.105:4001/internal/pc-command" `
  -Method POST `
  -Headers @{ "x-internal-secret" = "dev-realtime-secret"; "Content-Type" = "application/json" } `
  -Body '{"pcId":"pc-01","command":{"type":"command:show-message","message":"FINAL TEST"}}'
```

Expected PC client console:

```text
WS MESSAGE: { type: "command:show-message", message: "FINAL TEST" }
```

If the secret is wrong, realtime logs:

```text
Internal command unauthorized
```
