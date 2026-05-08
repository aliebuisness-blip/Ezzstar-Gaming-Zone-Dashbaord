# SPICA PC Agent

The PC agent is a lightweight Node client for connected gaming PCs.

## Run

```bash
set PC_ID=<pc id from database>
set ZONE_ID=zone-a
set PC_AGENT_TOKEN=pc-token-zone-a-pc-01
npm run pc-agent
```

For full dashboard-to-kiosk testing, see [realtime-test-flow.md](./realtime-test-flow.md).

## Behavior

- Connects to the WebSocket server.
- Authenticates using `PCClient.authToken`.
- Sends `pc:heartbeat` every 5 seconds.
- Receives `command:start`, `command:end`, and `command:lock`.
- Receives `command:start-session`, `command:add-time`, `command:end-session`, and `command:lock`.
- Shows a terminal fullscreen-style lock message for the MVP.

For a production Windows cafe deployment, replace the terminal overlay with a native kiosk/fullscreen app that disables shell escape paths and input at the OS policy level.
