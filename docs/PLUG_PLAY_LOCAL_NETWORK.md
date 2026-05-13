# SPICA ARENA OS Plug & Play LAN Architecture

## Production Model

SPICA uses a local-first model for gaming zones:

- **Zone Host**: the main counter/dashboard PC runs Next.js, PostgreSQL, the realtime server, LAN discovery, and session authority.
- **PC Client**: every gaming PC runs the kiosk client. It discovers the Zone Host on the LAN, requests pairing, then reconnects automatically using trusted credentials.
- **Cloud later**: global accounts, analytics, tournaments, updates, and SPICA economy can sync upward without slowing local gameplay control.

## LAN Discovery

The realtime server starts a dependency-free UDP discovery service.

- Discovery port: `41234` by default
- Query packet: `SPICA_DISCOVER_V1`
- Response: JSON manifest with:
  - `hostName`: `spica-host.local`
  - `hostIp`
  - `wsUrl`
  - `socketIoUrl`
  - `pairingUrl`
  - `statusUrl`

Manual IP editing is no longer required for the PC agent flow.

## First-Time Pairing

1. Start the Zone Host:
   ```powershell
   npm run dev
   npm run realtime
   ```

2. Start a PC client/agent on the same LAN:
   ```powershell
   npm run pc-agent
   ```

3. The client scans the LAN and sends a pairing request.

4. Zone owner opens:
   ```text
   /zone/pcs
   ```

5. In **Plug & Play Pairing**, approve the request and assign a PC name.

6. The PC receives trusted config and saves it locally:
   ```text
   pc-agent/.spica-pc-config.json
   ```

7. Future restarts reconnect automatically without IP, token, or env edits.

The client should stay on **Waiting for owner approval** until the request is approved or rejected. After two minutes it may show a soft reminder, but it should not return to the request screen by itself.

## QA Checklist

Use this checklist before installing in a real zone:

- Start Zone Host with `npm run dev` and `npm run realtime`.
- Start a clean PC client with `npm run pc-agent`.
- Confirm the client prints `Scanning LAN for SPICA Zone Host...`.
- Confirm the realtime terminal prints `Discovery response sent`.
- Confirm `/zone/pcs` shows a pending pairing request.
- Approve the request and assign a friendly PC name.
- Confirm the PC client saves trusted config and connects as that PC.
- Close the PC client and start it again. It should reconnect without pairing again.
- Restart `npm run realtime`. The PC client should rediscover and reconnect.
- Start a session, close the PC client, restart it, and confirm the active session is restored.
- Trigger emergency override and confirm dashboard activity says `PC manually unlocked`.

## Pairing APIs

Dashboard:

- `GET /api/pc-pairing`
- `PATCH /api/pc-pairing/:id`

Realtime host:

- `GET /discovery/manifest`
- `POST /pairing/request`
- `GET /pairing/status?id=...&pairingCode=...`

## Unpair / Removed PC Behavior

If a zone owner removes a paired PC while the kiosk client is still running:

- dashboard deletes `PCClient`
- dashboard sends realtime command:

```json
{
  "type": "command:unpaired",
  "reason": "PC removed by zone owner"
}
```

- realtime closes the PC socket safely
- later heartbeats from the deleted `pcId` are ignored without crashing
- the PC client should clear trusted local config and return to pairing

The CLI test agent already supports `command:unpaired`. The Electron client should mirror this behavior.

## Emergency Override

The production Electron client should implement:

```text
CTRL + SHIFT + ALT + K
```

Expected behavior:

- show admin unlock modal
- require PIN/password
- allow maintenance/desktop access
- send raw WebSocket event:

```json
{
  "type": "pc:manual-override",
  "reason": "Emergency desktop access"
}
```

The realtime server then:

- logs the override
- creates an audit entry
- emits dashboard warning
- marks the PC with `PC manually unlocked`

The CLI test agent supports `Ctrl + K` as a terminal fallback.

## Troubleshooting

### PC client cannot find Zone Host

- Confirm both machines are on the same local network.
- Confirm the Zone Host realtime server is running.
- Confirm Windows Firewall allows Node.js on private networks.
- Confirm UDP port `41234` is not blocked.
- Confirm TCP port `4001` is not blocked.
- If the router blocks broadcast discovery, open:
  ```text
  http://HOST_IP:4001/discovery/manifest
  ```
  from the client machine to verify the realtime host is reachable.

### Pairing request does not appear

- Refresh `/zone/pcs`.
- Check the realtime terminal for `PC pairing request received`.
- Check for `Pairing request received`, `Request body`, `Pairing zoneId resolved`, and `Pairing request created id`.
- Open the debug API while signed in as admin/owner:
  ```text
  /api/pc-pairing/debug
  ```
- Open Prisma Studio and inspect:
  ```text
  PCPairingRequest
  ```
- Restart the PC client so it sends a fresh pairing request.
- Make sure the PC client has a valid device fingerprint. The server rejects missing or very short fingerprints.
- If the client did not send a `zoneId`, development mode assigns `zone-a` by default.

### PC was approved but will not connect

- Delete the local saved test-agent config:
  ```text
  pc-agent/.spica-pc-config.json
  ```
- Restart the PC client.
- Regenerate the PC token from the owner dashboard if needed.
- Old tokens stop working after regeneration because WebSocket auth validates against `PCClient.authToken`.

### Host IP changes after router restart

The client re-runs LAN discovery after socket close and updates the saved `wsUrl`. No manual `.env` change should be needed.

## Offline + Recovery Behavior

If a PC client closes or loses network:

- realtime marks the PC offline immediately
- dashboard receives `pc:offline`
- active session remains server-side
- when the PC reconnects, it sends recovery request
- server restores the active session if one exists

## Local Network Requirements

- Same subnet is recommended.
- Private network firewall profile should allow:
  - TCP `4001` for realtime WebSocket and pairing HTTP
  - UDP `41234` for discovery
- Network isolation/client isolation must be disabled on WiFi.
- VPN adapters can confuse LAN discovery. Use wired LAN or the primary private WiFi network for production.

## Production Notes

For Windows installer packaging:

- run PC client on boot
- store pairing config in app data, not project folder
- keep env overrides only for support/debug
- add kiosk-mode OS hardening
- keep the emergency override audited

## Current Production Limitations

- Discovery is UDP broadcast, not cloud relay.
- `spica-host.local` is used as a friendly host label, but the implemented discovery source of truth is the UDP manifest.
- Admin override PIN UI belongs in the Electron kiosk client; the CLI agent only simulates the event.
- Pairing approval is local to the operational Postgres database. Cloud sync can be added later.
