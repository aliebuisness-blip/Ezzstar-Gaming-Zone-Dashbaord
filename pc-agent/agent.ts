import dgram from "node:dgram";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { WebSocket } from "ws";
import { DISCOVERY_PORT, DISCOVERY_QUERY, DiscoveryManifest } from "../lib/local-network";

type PcConfig = {
  wsUrl: string;
  pcId: string;
  zoneId: string;
  authToken: string;
};

type SessionPayload = {
  sessionId: string;
  playerName: string;
  playerBalance: number;
  zoneName: string;
  pcName: string;
  startTime: string;
  durationSeconds: number;
  remainingSeconds?: number;
  serverTime?: string;
};

type IncomingCommand = {
  type?: string;
  session?: SessionPayload;
  reason?: string;
  durationSeconds?: number;
  startTime?: string;
  message?: string;
};

const configPath = path.join(__dirname, ".spica-pc-config.json");
const machineName = process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? "gaming-pc";
const installedVersion = process.env.SPICA_PC_VERSION ?? "dev-agent";
const fingerprint = process.env.SPICA_PC_FINGERPRINT ?? `${machineName}-${process.env.USERNAME ?? "local"}`.toLowerCase();
let locked = true;
let currentSession: SessionPayload | null = null;
let socket: WebSocket | null = null;

function envConfig(): PcConfig | null {
  const wsUrl = process.env.VITE_SERVER_WS_URL ?? process.env.SPICA_HOST_WS_URL;
  const pcId = process.env.VITE_PC_ID ?? process.env.PC_ID;
  const zoneId = process.env.VITE_ZONE_ID ?? process.env.ZONE_ID;
  const authToken = process.env.VITE_PC_AUTH_TOKEN ?? process.env.PC_AGENT_TOKEN;

  return wsUrl && pcId && zoneId && authToken ? { wsUrl, pcId, zoneId, authToken } : null;
}

function readSavedConfig(): PcConfig | null {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as PcConfig;
  } catch {
    return null;
  }
}

function saveConfig(config: PcConfig) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function renderLockedScreen(message = "Locked") {
  locked = true;
  currentSession = null;
  console.clear();
  console.log("============================================================");
  console.log(` ${message.toUpperCase()}`);
  console.log(" This PC is protected by SPICA ARENA OS.");
  console.log(" Waiting for a session from the zone dashboard.");
  console.log("============================================================");
}

function renderActiveSession(payload: SessionPayload) {
  locked = false;
  currentSession = payload;
  console.clear();
  console.log("============================================================");
  console.log(" ACTIVE SESSION");
  console.log(` Player: ${payload.playerName}`);
  console.log(` Zone: ${payload.zoneName}`);
  console.log(` PC: ${payload.pcName}`);
  console.log(` Balance: ${payload.playerBalance} SPICA`);
  console.log(` Duration: ${payload.durationSeconds}s`);
  console.log("============================================================");
}

function discoverHost(timeoutMs = 5000): Promise<DiscoveryManifest> {
  return new Promise((resolve, reject) => {
    const udp = dgram.createSocket("udp4");
    const timer = setTimeout(() => {
      udp.close();
      reject(new Error("No SPICA Zone Host found on LAN"));
    }, timeoutMs);

    udp.on("message", (message) => {
      try {
        const manifest = JSON.parse(message.toString()) as DiscoveryManifest;

        if (manifest.type === "SPICA_HOST_V1") {
          clearTimeout(timer);
          udp.close();
          resolve(manifest);
        }
      } catch {
        // Ignore unrelated LAN traffic.
      }
    });

    udp.bind(() => {
      udp.setBroadcast(true);
      const payload = Buffer.from(DISCOVERY_QUERY);
      udp.send(payload, DISCOVERY_PORT, "255.255.255.255");
      udp.send(payload, DISCOVERY_PORT, "127.0.0.1");
      console.log("Scanning LAN for SPICA Zone Host...");
    });
  });
}

async function requestPairing(manifest: DiscoveryManifest): Promise<PcConfig> {
  const response = await fetch(manifest.pairingUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      machineName,
      fingerprint,
      installedVersion,
      requestedPcName: machineName.toUpperCase().startsWith("PC") ? machineName : undefined
    })
  });
  const request = await response.json();

  if (!response.ok) {
    throw new Error(request.error ?? "Pairing request failed");
  }

  console.log("SPICA Host Found");
  console.log("Pairing request sent. Approve this PC from Zone Dashboard > PCs.");

  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const statusResponse = await fetch(`${manifest.statusUrl}?id=${request.id}&pairingCode=${request.pairingCode}`);
    const status = await statusResponse.json();

    if (status.status === "approved" && status.config?.pcId && status.config?.authToken && status.config?.zoneId) {
      const config: PcConfig = {
        wsUrl: status.config.wsUrl ?? manifest.wsUrl,
        pcId: status.config.pcId,
        zoneId: status.config.zoneId,
        authToken: status.config.authToken
      };
      saveConfig(config);
      console.log(`Pairing approved as ${config.pcId}. Trusted config saved.`);
      return config;
    }

    if (status.status === "rejected") {
      throw new Error(status.rejectedReason ?? "Pairing rejected by Zone Host");
    }

    console.log("Waiting for dashboard approval...");
  }
}

async function resolveConfig(forceDiscovery = false): Promise<PcConfig> {
  const configured = envConfig() ?? readSavedConfig();

  if (configured && !forceDiscovery) {
    return configured;
  }

  if (configured && forceDiscovery) {
    const manifest = await discoverHost();
    const rediscovered = { ...configured, wsUrl: manifest.wsUrl };
    saveConfig(rediscovered);
    console.log(`Zone Host rediscovered at ${manifest.wsUrl}. Saved trusted config updated.`);
    return rediscovered;
  }

  const manifest = await discoverHost();
  return requestPairing(manifest);
}

function remainingSeconds() {
  if (!currentSession) {
    return undefined;
  }

  return Math.max(0, Math.ceil((new Date(currentSession.startTime).getTime() + currentSession.durationSeconds * 1000 - Date.now()) / 1000));
}

function send(message: object) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function handleCommand(command: IncomingCommand) {
  console.log("WS MESSAGE:", command);

  if (command.type === "command:start-session" && command.session) {
    console.log("Received start-session");
    console.log("Switching to active screen");
    renderActiveSession(command.session);
    return;
  }

  if (command.type === "command:add-time" && currentSession) {
    currentSession = {
      ...currentSession,
      durationSeconds: command.durationSeconds ?? currentSession.durationSeconds,
      startTime: command.startTime ?? currentSession.startTime
    };
    renderActiveSession(currentSession);
    return;
  }

  if (command.type === "command:end-session" || command.type === "command:lock") {
    renderLockedScreen(command.reason ?? "Session ended");
    return;
  }

  if (command.type === "command:show-message") {
    console.log(`SPICA MESSAGE: ${command.message ?? ""}`);
  }
}

function connect(config: PcConfig) {
  const url = `${config.wsUrl.replace(/\/$/, "")}/?pcId=${encodeURIComponent(config.pcId)}&zoneId=${encodeURIComponent(config.zoneId)}&authToken=${encodeURIComponent(config.authToken)}`;
  socket = new WebSocket(url);

  socket.on("open", () => {
    console.log(`PC connected to ${config.wsUrl} as ${config.pcId}`);
    send({ type: "pc:recover-session", pcId: config.pcId, zoneId: config.zoneId, machineName, installedVersion, fingerprint });
  });

  socket.on("message", (message) => {
    try {
      handleCommand(JSON.parse(message.toString()) as IncomingCommand);
    } catch {
      console.log("WS MESSAGE:", message.toString());
    }
  });

  socket.on("close", () => {
    console.log("PC socket closed. Reconnecting after LAN rediscovery...");
    setTimeout(() => run(true).catch((error) => console.error(error.message)), 2500);
  });

  socket.on("error", (error) => {
    console.error(`PC socket error: ${error.message}`);
  });

  const heartbeat = setInterval(() => {
    if (socket?.readyState !== WebSocket.OPEN) {
      clearInterval(heartbeat);
      return;
    }

    send({
      type: "pc:heartbeat",
      pcId: config.pcId,
      zoneId: config.zoneId,
      status: locked ? "available" : "in_use",
      activeSessionId: currentSession?.sessionId,
      remainingSeconds: remainingSeconds(),
      machineName,
      installedVersion,
      timestamp: new Date().toISOString()
    });
  }, 5000);
}

function installEmergencyOverrideShortcut() {
  if (!process.stdin.isTTY) {
    return;
  }

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on("keypress", (_str, key) => {
    if (key.ctrl && key.name === "k") {
      console.log("Emergency override shortcut detected. Reporting to dashboard.");
      send({ type: "pc:manual-override", reason: "CLI emergency override shortcut", machineName, timestamp: new Date().toISOString() });
      renderLockedScreen("Emergency Desktop Access");
    }

    if (key.ctrl && key.name === "c") {
      process.exit(0);
    }
  });
}

async function run(forceDiscovery = false) {
  const config = await resolveConfig(forceDiscovery);
  connect(config);
}

renderLockedScreen("Locked");
installEmergencyOverrideShortcut();
run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
