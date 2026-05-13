import http from "node:http";
import crypto from "node:crypto";
import { Server } from "socket.io";
import { RawData, WebSocket, WebSocketServer } from "ws";
import { PCStatus, SessionStatus } from "@prisma/client";
import { getRealtimePort, validateRuntimeEnv } from "../lib/env";
import { createDiscoveryManifest, selectReachableHostIp } from "../lib/local-network";
import { ensureDatabaseConnection, prisma } from "../lib/prisma";
import { audit } from "../lib/server-auth";
import { startDiscoveryService } from "./discovery";

type PcCommand =
  | "command:start-session"
  | "command:end-session"
  | "command:add-time"
  | "command:lock"
  | "command:show-message"
  | "command:unpaired";

type CommandPayload =
  | { type: PcCommand; session?: unknown; reason?: string; durationSeconds?: number; startTime?: string; serverTime?: string; message?: string; payload?: unknown }
  | Record<string, unknown>;

type InternalCommandBody = {
  pcId: string;
  command?: PcCommand | CommandPayload;
  payload?: unknown;
  commandPayload?: CommandPayload;
};

type HeartbeatPayload = {
  event?: string;
  type?: string;
  pcId?: string;
  zoneId?: string;
  status?: PCStatus;
  activeSessionId?: string;
  remainingSeconds?: number;
  ipAddress?: string;
  machineName?: string;
  installedVersion?: string;
  timestamp?: string;
};

type PairingRequestBody = {
  zoneId?: string;
  machineName?: string;
  deviceName?: string;
  ipAddress?: string;
  localIp?: string;
  fingerprint?: string;
  machineFingerprint?: string;
  installedVersion?: string;
  clientVersion?: string;
  requestedPcName?: string;
};

type ActiveSessionPayload = {
  sessionId: string;
  playerName: string;
  playerBalance: number;
  zoneName: string;
  pcName: string;
  startTime: string;
  durationSeconds: number;
  remainingSeconds: number;
  serverTime: string;
};

const port = getRealtimePort();
const { REALTIME_INTERNAL_SECRET } = validateRuntimeEnv();
const pcClients = new Map<string, WebSocket>();
const pcZones = new Map<string, string>();
const pcStatuses = new Map<string, PCStatus>();
const reconnectEvents = new Map<string, number>();
const pcLastSyncAt = new Map<string, number>();
const pcHeartbeats = new Map<string, string>();
const activeSessionIds = new Map<string, string>();
const commandLogs: string[] = [];
let dashboardSocketCount = 0;
let stopDiscoveryService: (() => void) | null = null;

function redactSensitiveUrl(url: URL) {
  const safeUrl = new URL(url.toString());
  safeUrl.searchParams.forEach((_value, key) => {
    if (/token|auth/i.test(key)) {
      safeUrl.searchParams.set(key, "[redacted]");
    }
  });
  return `${safeUrl.pathname}${safeUrl.search}`;
}

function rememberLog(message: string) {
  const line = `${new Date().toISOString()} ${message}`;
  commandLogs.unshift(line);
  commandLogs.splice(25);
}

function readJsonBody<T>(request: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
    });

    request.on("end", () => {
      try {
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function getRequestIp(request: http.IncomingMessage) {
  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim();
  }

  return request.socket.remoteAddress?.replace(/^::ffff:/, "");
}

async function resolvePairingZoneId(requestedZoneId?: string) {
  if (requestedZoneId) {
    const requestedZone = await prisma.zone.findUnique({ where: { id: requestedZoneId }, select: { id: true } });

    if (requestedZone) {
      return requestedZone.id;
    }

    console.warn(`Pairing request supplied unknown zoneId: ${requestedZoneId}`);
  }

  const devZone = await prisma.zone.findUnique({ where: { id: "zone-a" }, select: { id: true, status: true } });

  if (devZone) {
    return devZone.id;
  }

  const activeZone = await prisma.zone.findFirst({
    where: { status: "active" },
    select: { id: true },
    orderBy: { createdAt: "asc" }
  });

  return activeZone?.id;
}

async function handlePairingRequest(body: PairingRequestBody, request: http.IncomingMessage, response: http.ServerResponse) {
  await ensureDatabaseConnection();

  console.log("Pairing request received");
  console.log("Request body:", {
    zoneId: body.zoneId,
    machineName: body.machineName ?? body.deviceName,
    ipAddress: body.ipAddress ?? body.localIp,
    fingerprintPresent: Boolean(body.fingerprint ?? body.machineFingerprint),
    installedVersion: body.installedVersion ?? body.clientVersion,
    requestedPcName: body.requestedPcName
  });

  const fingerprint = (body.fingerprint ?? body.machineFingerprint)?.trim();

  if (!fingerprint || fingerprint.length < 8 || fingerprint.length > 200) {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Device identity is invalid. Restart the PC client and try pairing again." }));
    return;
  }

  const machineName = (body.machineName ?? body.deviceName)?.trim() || "Unidentified PC";
  const pairingCode = crypto.randomBytes(18).toString("hex");
  const ipAddress = body.ipAddress ?? body.localIp ?? getRequestIp(request);
  const installedVersion = body.installedVersion ?? body.clientVersion;
  const zoneId = await resolvePairingZoneId(body.zoneId);

  console.log(`Pairing zoneId resolved: ${zoneId ?? "unassigned"}`);

  const existingRequest = await prisma.pCPairingRequest.findFirst({
    where: { fingerprint, status: { in: ["pending", "approved"] } },
    orderBy: { createdAt: "desc" }
  });

  const pairingRequest = existingRequest
    ? await prisma.pCPairingRequest.update({
        where: { id: existingRequest.id },
        data: {
          machineName,
          ipAddress,
          installedVersion,
          requestedPcName: body.requestedPcName,
          zoneId: zoneId ?? existingRequest.zoneId,
          status: existingRequest.status
        }
      })
    : await prisma.pCPairingRequest.create({
        data: {
          zoneId,
          machineName,
          ipAddress,
          fingerprint,
          installedVersion,
          requestedPcName: body.requestedPcName,
          pairingCode
        }
      });

  if (existingRequest) {
    console.log(`Pairing request already exists id: ${pairingRequest.id} status: ${pairingRequest.status}`);
  } else {
    console.log(`Pairing request created id: ${pairingRequest.id}`);
  }
  console.log(`PC pairing request received: ${pairingRequest.id} (${machineName})`);
  rememberLog(`Pairing request from ${machineName}`);
  await audit("pc_pairing_request", undefined, {
    pairingRequestId: pairingRequest.id,
    machineName,
    ipAddress,
    fingerprint
  });
  emitDashboardEvent("pc:pairing-request", {
    id: pairingRequest.id,
    zoneId: pairingRequest.zoneId,
    machineName: pairingRequest.machineName,
    ipAddress: pairingRequest.ipAddress,
    fingerprint: pairingRequest.fingerprint,
    installedVersion: pairingRequest.installedVersion,
    requestedPcName: pairingRequest.requestedPcName,
    status: pairingRequest.status,
    createdAt: pairingRequest.createdAt.toISOString()
  });
  emitDebugSnapshot();

  response.writeHead(202, { "Content-Type": "application/json" });
  response.end(JSON.stringify({
    ok: true,
    id: pairingRequest.id,
    pairingCode: pairingRequest.pairingCode,
    status: pairingRequest.status,
    message: "Pairing request sent to Zone Host dashboard."
  }));
}

async function handlePairingStatus(url: URL, requestMessage: http.IncomingMessage, response: http.ServerResponse) {
  await ensureDatabaseConnection();

  const id = url.searchParams.get("id");
  const pairingCode = url.searchParams.get("pairingCode");
  console.log(`Pairing status checked: id=${id ?? "missing"} pairingCodePresent=${Boolean(pairingCode)}`);

  if (!id || !pairingCode) {
    throw new Error("Missing id or pairingCode");
  }

  const request = await prisma.pCPairingRequest.findFirst({ where: { id, pairingCode } });

  if (!request) {
    console.warn(`Pairing status checked but not found: ${id}`);
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Pairing request not found" }));
    return;
  }

  console.log(`Pairing status result: ${request.id} ${request.status}`);
  const selection = selectReachableHostIp(getRequestIp(requestMessage));
  const manifest = createDiscoveryManifest(port, selection.hostIp);
  console.log(`Selected reachable host IP: ${selection.hostIp} (${selection.source})`);
  console.log("Ignored adapters:", selection.ignoredAdapters);

  let approvedConfig: null | {
    hostUrl: string;
    apiBaseUrl: string;
    pcId: string;
    zoneId: string;
    authToken: string;
    trustedFingerprint: string;
    wsUrl: string;
  } = null;

  if (request.status === "approved") {
    const pc = request.assignedPcId
      ? await prisma.pC.findUnique({
          where: { id: request.assignedPcId },
          include: { client: true }
        })
      : null;

    if (!pc || !pc.client || !request.assignedToken || pc.client.authToken !== request.assignedToken || pc.zoneId !== request.zoneId) {
      console.warn("Approved pairing is stale or inconsistent; returning to pending", {
        pairingRequestId: request.id,
        assignedPcId: request.assignedPcId,
        pcFound: Boolean(pc),
        clientFound: Boolean(pc?.client),
        tokenMatches: pc?.client?.authToken === request.assignedToken,
        zoneMatches: pc?.zoneId === request.zoneId
      });
      await prisma.pCPairingRequest.update({
        where: { id: request.id },
        data: {
          status: "pending",
          assignedPcId: null,
          assignedPcName: null,
          assignedToken: null
        }
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ id: request.id, status: "pending", reason: "Pairing approval needs to be confirmed again.", rejectedReason: null, config: null }));
      return;
    }

    approvedConfig = {
      hostUrl: manifest.hostUrl,
      apiBaseUrl: manifest.apiBaseUrl,
      pcId: pc.id,
      zoneId: pc.zoneId,
      authToken: pc.client.authToken,
      trustedFingerprint: pc.client.trustedFingerprint ?? request.fingerprint,
      wsUrl: manifest.wsUrl
    };
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({
    id: request.id,
    status: request.status,
    reason: request.rejectedReason,
    rejectedReason: request.rejectedReason,
    config: approvedConfig
  }));
}

function isExpiredSession(startTime: Date, durationSeconds: number) {
  return startTime.getTime() + durationSeconds * 1000 <= Date.now();
}

function getRemainingSeconds(startTime: Date, durationSeconds: number) {
  return Math.max(0, Math.ceil((startTime.getTime() + durationSeconds * 1000 - Date.now()) / 1000));
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host ?? "localhost"}`);

  if (request.method === "GET" && url.pathname === "/discovery/manifest") {
    const selection = selectReachableHostIp(getRequestIp(request));
    const manifest = createDiscoveryManifest(port, selection.hostIp);
    console.log(`Client discovery request from: ${getRequestIp(request) ?? "unknown"}`);
    console.log(`Selected reachable host IP: ${selection.hostIp} (${selection.source})`);
    console.log("Ignored adapters:", selection.ignoredAdapters);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(manifest));
    return;
  }

  if (request.method === "POST" && url.pathname === "/pairing/request") {
    readJsonBody<PairingRequestBody>(request)
      .then((body) => handlePairingRequest(body, request, response))
      .catch((error) => {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid pairing request" }));
      });
    return;
  }

  if (request.method === "GET" && url.pathname === "/pairing/status") {
    handlePairingStatus(url, request, response).catch((error) => {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid pairing status request" }));
    });
    return;
  }

  if (request.method !== "POST" || url.pathname !== "/internal/pc-command") {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  if (request.headers["x-internal-secret"] !== REALTIME_INTERNAL_SECRET) {
    console.warn("Internal command unauthorized");
    response.writeHead(401);
    response.end("Unauthorized");
    return;
  }

  console.log("Internal command authorized");

  readJsonBody<InternalCommandBody>(request)
    .then((body) => {
    try {
      console.log(`Internal command received for ${body.pcId}`);

      const commandPayload = resolveCommandPayload(body);

      if (typeof commandPayload.type === "string" && commandPayload.type === "command:unpaired") {
        unpairConnectedPc(body.pcId, typeof commandPayload.reason === "string" ? commandPayload.reason : "PC removed by zone owner");
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true }));
        return;
      }

      const sent = sendCommandToPc(body.pcId, commandPayload);

      if (!sent) {
        console.warn(`Command failed: ${body.pcId} not connected`);
        response.writeHead(409, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "PC is not connected" }));
        return;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
    } catch (error) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }));
    }
  })
    .catch((error) => {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }));
    });
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Realtime server could not start: port ${port} is already in use.`);
    console.error(`Run: node scripts/free-port.js ${port}`);
    process.exit(1);
  }

  throw error;
});

const io = new Server(server, {
  cors: { origin: "*" }
});
const rawWss = new WebSocketServer({ noServer: true });

function isPcStatus(value: unknown): value is PCStatus {
  return value === PCStatus.available || value === PCStatus.in_use || value === PCStatus.offline;
}

function emitDashboardEvent(event: string, payload: unknown) {
  io.emit(event, payload);
}

function emitPcUpdate(payload: {
  pcId: string;
  zoneId: string;
  status: PCStatus;
  lastSeen?: string;
  activeSessionId?: string | null;
  remainingSeconds?: number;
  ipAddress?: string;
  machineName?: string;
  warning?: string;
}) {
  emitDashboardEvent("pc:update", { ...payload, serverTime: new Date().toISOString() });
}

function emitDebugSnapshot() {
  emitDashboardEvent("debug:update", {
    connectedSockets: pcClients.size,
    dashboardSockets: dashboardSocketCount,
    connectedPcIds: [...pcClients.keys()],
    reconnectEvents: Object.fromEntries(reconnectEvents.entries()),
    activeSessions: Object.fromEntries(activeSessionIds.entries()),
    heartbeats: Object.fromEntries(pcHeartbeats.entries()),
    commandLogs,
    generatedAt: new Date().toISOString()
  });
}

function forgetPcSocket(pcId: string, socket?: WebSocket) {
  const currentSocket = pcClients.get(pcId);

  if (!socket || currentSocket === socket) {
    pcClients.delete(pcId);
    pcZones.delete(pcId);
    pcStatuses.delete(pcId);
    pcHeartbeats.delete(pcId);
    activeSessionIds.delete(pcId);
  }
}

function unpairConnectedPc(pcId: string, reason: string, socket = pcClients.get(pcId)) {
  console.warn(`Heartbeat from deleted/unregistered PC: ${pcId}`);
  rememberLog(`Unpaired ${pcId}: ${reason}`);

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "command:unpaired", reason }));
    socket.close(4001, reason);
  }

  forgetPcSocket(pcId, socket);
  emitDashboardEvent("pc:unpaired", { pcId, reason, createdAt: new Date().toISOString() });
  emitDebugSnapshot();
}

function rejectPcAsUnpaired(ws: WebSocket, pcId: string, reason: string) {
  console.warn(`PC rejected: pcId=${pcId} reason=${reason}`);

  const payload = JSON.stringify({ type: "command:unpaired", reason });
  const sendUnpaired = () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  };

  sendUnpaired();
  const retry = setInterval(sendUnpaired, 250);
  setTimeout(() => {
    clearInterval(retry);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(1008, reason);
    }
  }, 2000);
}

function parseRawMessage(message: RawData): HeartbeatPayload {
  const text = message.toString();

  if (text === "pc:heartbeat" || text === "heartbeat") {
    return { type: "pc:heartbeat" };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function isCommandPayload(value: unknown): value is CommandPayload {
  return Boolean(value && typeof value === "object" && "type" in value);
}

function resolveCommandPayload(body: InternalCommandBody): CommandPayload {
  if (body.commandPayload) {
    return body.commandPayload;
  }

  if (isCommandPayload(body.command)) {
    return body.command;
  }

  return buildCommandPayload(body.command, body.payload);
}

function buildCommandPayload(command?: PcCommand | CommandPayload, payload?: unknown): CommandPayload {
  if (!command) {
    throw new Error("Missing command");
  }

  if (isCommandPayload(command)) {
    return command;
  }

  if (command === "command:start-session") {
    return { type: command, session: payload ?? {} };
  }

  if (command === "command:end-session") {
    return { type: command, reason: (payload as { reason?: string } | undefined)?.reason ?? "Session ended" };
  }

  if (command === "command:add-time") {
    return {
      type: command,
      durationSeconds: (payload as { durationSeconds?: number } | undefined)?.durationSeconds,
      startTime: (payload as { startTime?: string } | undefined)?.startTime
    };
  }

  if (command === "command:show-message") {
    return {
      type: command,
      message: (payload as { message?: string } | undefined)?.message ?? "Dashboard command test"
    };
  }

  if (command === "command:unpaired") {
    return {
      type: command,
      reason: (payload as { reason?: string } | undefined)?.reason ?? "This PC was removed from dashboard. Please pair again."
    };
  }

  return { type: command, payload: payload ?? {} };
}

async function updatePcHeartbeat(pcId: string, zoneId: string, heartbeat: HeartbeatPayload) {
  const now = new Date();
  const pc = await prisma.pC.findUnique({ where: { id: pcId }, select: { id: true } });

  if (!pc) {
    unpairConnectedPc(pcId, "This PC was removed from dashboard. Please pair again.");
    return;
  }

  await cleanupExpiredSessionsForPc(pcId);
  const activeSession = await getActiveSessionPayload(pcId);
  const reportedStatus = isPcStatus(heartbeat.status) ? heartbeat.status : pcStatuses.get(pcId) ?? PCStatus.available;
  const status = activeSession ? PCStatus.in_use : reportedStatus === PCStatus.offline ? PCStatus.available : reportedStatus;

  pcStatuses.set(pcId, status);
  pcHeartbeats.set(pcId, now.toISOString());

  if (activeSession) {
    activeSessionIds.set(pcId, activeSession.sessionId);
  } else {
    activeSessionIds.delete(pcId);
  }

  await prisma.$transaction([
    prisma.pCClient.updateMany({
      where: { pcId },
      data: {
        lastSeen: now,
        ...(heartbeat.installedVersion ? { installedVersion: heartbeat.installedVersion } : {})
      }
    }),
    prisma.pC.update({
      where: { id: pcId },
      data: {
        status,
        lastHeartbeat: now,
        ...(heartbeat.ipAddress ? { ipAddress: heartbeat.ipAddress } : {}),
        ...(heartbeat.machineName ? { machineName: heartbeat.machineName } : {})
      }
    })
  ]);

  await audit("pc_heartbeat", undefined, {
    pcId,
    status,
    activeSessionId: heartbeat.activeSessionId,
    remainingSeconds: heartbeat.remainingSeconds,
    ipAddress: heartbeat.ipAddress,
    machineName: heartbeat.machineName
  });

  console.log(`Heartbeat received: ${pcId}`);
  emitPcUpdate({
    pcId,
    zoneId,
    status,
    lastSeen: now.toISOString(),
    activeSessionId: activeSession?.sessionId ?? heartbeat.activeSessionId,
    remainingSeconds: activeSession?.remainingSeconds ?? heartbeat.remainingSeconds,
    ipAddress: heartbeat.ipAddress,
    machineName: heartbeat.machineName
  });

  if (activeSession && now.getTime() - (pcLastSyncAt.get(pcId) ?? 0) >= 10_000) {
    pcLastSyncAt.set(pcId, now.getTime());
    sendCommandToPc(pcId, {
      type: "command:add-time",
      durationSeconds: activeSession.durationSeconds,
      startTime: activeSession.startTime,
      serverTime: now.toISOString()
    });
  }

  emitDebugSnapshot();
}

async function cleanupExpiredSessionsForPc(pcId: string) {
  const completed = await completeExpiredSessions({ pcId });
  return completed.length;
}

async function updatePcStatus(pcId: string, zoneId: string, status: PCStatus) {
  const pc = await prisma.pC.findUnique({ where: { id: pcId }, select: { id: true } });

  if (!pc) {
    unpairConnectedPc(pcId, "This PC was removed from dashboard. Please pair again.");
    return;
  }

  pcStatuses.set(pcId, status);
  await prisma.pC.update({
    where: { id: pcId },
    data: { status, lastHeartbeat: new Date() }
  });
  await audit("pc_status", undefined, { pcId, status });
  emitPcUpdate({ pcId, zoneId, status, lastSeen: new Date().toISOString() });
}

async function getActiveSessionPayload(pcId: string): Promise<ActiveSessionPayload | null> {
  const session = await prisma.session.findFirst({
    where: { pcId, status: SessionStatus.active },
    include: {
      player: { select: { name: true, spica_balance: true } },
      zone: { select: { name: true } },
      pc: { select: { name: true } }
    },
    orderBy: { startTime: "desc" }
  });

  if (!session) {
    return null;
  }

  const remainingSeconds = getRemainingSeconds(session.startTime, session.durationSeconds);

  if (remainingSeconds <= 0) {
    await completeExpiredSessions({ pcId });
    return null;
  }

  return {
    sessionId: session.id,
    playerName: session.player.name,
    playerBalance: session.player.spica_balance,
    zoneName: session.zone.name,
    pcName: session.pc.name,
    startTime: session.startTime.toISOString(),
    durationSeconds: session.durationSeconds,
    remainingSeconds,
    serverTime: new Date().toISOString()
  };
}

async function completeExpiredSessions(filter: { pcId?: string } = {}) {
  const activeSessions = await prisma.session.findMany({
    where: { ...filter, status: SessionStatus.active },
    include: { pc: true }
  });
  const expired = activeSessions.filter((session) => isExpiredSession(session.startTime, session.durationSeconds));
  const completedSessions: typeof activeSessions = [];

  for (const session of expired) {
    const completed = await prisma.$transaction(async (tx) => {
      const current = await tx.session.findUnique({ where: { id: session.id } });

      if (!current || current.status === SessionStatus.completed) {
        return null;
      }

      const completedSession = await tx.session.update({
        where: { id: current.id },
        data: { status: SessionStatus.completed, completedAt: new Date() },
        include: { pc: true }
      });
      const commission = Math.round(completedSession.gross * 0.1);

      await tx.settlement.upsert({
        where: { sessionId: completedSession.id },
        create: {
          zoneId: completedSession.zoneId,
          sessionId: completedSession.id,
          gross: completedSession.gross,
          commission,
          net: completedSession.gross - commission
        },
        update: {
          gross: completedSession.gross,
          commission,
          net: completedSession.gross - commission
        }
      });
      await tx.pC.update({ where: { id: completedSession.pcId }, data: { status: PCStatus.available } });
      return completedSession;
    });

    if (!completed) {
      continue;
    }

    completedSessions.push(completed);
    activeSessionIds.delete(completed.pcId);
    console.log(`Expired stale session completed: ${completed.id}`);
    sendCommandToPc(completed.pcId, { type: "command:end-session", reason: "Session expired" });
    emitDashboardEvent("session:ended", {
      sessionId: completed.id,
      pcId: completed.pcId,
      zoneId: completed.zoneId,
      reason: "expired",
      completedAt: completed.completedAt?.toISOString() ?? new Date().toISOString()
    });
    emitDashboardEvent("session:update", {
      pcId: completed.pcId,
      command: "command:end-session",
      payload: { sessionId: completed.id, reason: "expired" }
    });
    emitPcUpdate({
      pcId: completed.pcId,
      zoneId: completed.zoneId,
      status: PCStatus.available,
      activeSessionId: null,
      remainingSeconds: 0
    });
  }

  if (completedSessions.length > 0) {
    emitDebugSnapshot();
  }

  return completedSessions;
}

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  console.log(`Incoming websocket connection URL: ${redactSensitiveUrl(url)}`);

  if (url.pathname.startsWith("/socket.io")) {
    return;
  }

  rawWss.handleUpgrade(request, socket, head, (ws) => {
    rawWss.emit("connection", ws, request);
  });
});

rawWss.on("connection", async (ws, request) => {
  try {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const pcId = url.searchParams.get("pcId");
    const zoneId = url.searchParams.get("zoneId");
    const authToken = url.searchParams.get("authToken") || url.searchParams.get("token");

    console.log("Detected connection type: pc");

    if (!pcId || !zoneId || !authToken) {
      console.warn(`PC rejected: pcId=${pcId || "missing"} zoneId=${zoneId || "missing"} authTokenPresent=${Boolean(authToken)}`);
      ws.close(1008, "Invalid PC credentials");
      return;
    }

    const pc = await prisma.pC.findUnique({ where: { id: pcId }, include: { client: true } });

    if (!pc) {
      console.warn(`PC rejected: pcId=${pcId} zoneId=${zoneId} reason=PC not found`);
      rejectPcAsUnpaired(ws, pcId, "This PC was removed from dashboard. Please pair again.");
      return;
    }

    if (!pc.client) {
      console.warn(`PC rejected: pcId=${pcId} zoneId=${zoneId} reason=PCClient missing`);
      rejectPcAsUnpaired(ws, pcId, "This PC pairing is no longer valid. Please pair again.");
      return;
    }

    if (pc.zoneId !== zoneId) {
      console.warn(`PC rejected: pcId=${pcId} zoneId=${zoneId} reason=zone mismatch savedZone=${pc.zoneId}`);
      rejectPcAsUnpaired(ws, pcId, "This PC belongs to another zone. Please pair again.");
      return;
    }

    if (pc.client.authToken !== authToken) {
      console.warn(`PC rejected: pcId=${pcId} zoneId=${zoneId} reason=token mismatch`);
      rejectPcAsUnpaired(ws, pcId, "This PC token is no longer valid. Please pair again.");
      return;
    }

    const client = { ...pc.client, pc };

    const existingSocket = pcClients.get(pcId);

    if (existingSocket && existingSocket.readyState === WebSocket.OPEN && existingSocket !== ws) {
      console.log(`Replaced existing connection for ${pcId}`);
      rememberLog(`Replaced existing connection for ${pcId}`);
      reconnectEvents.set(pcId, (reconnectEvents.get(pcId) ?? 0) + 1);
      existingSocket.close(4000, "Replaced by newer PC connection");
    }

    const initialStatus = client.pc.status === PCStatus.offline ? PCStatus.available : client.pc.status;
    pcClients.set(pcId, ws);
    pcZones.set(pcId, zoneId);
    pcStatuses.set(pcId, initialStatus);

    console.log(`PC auth success: ${pcId}`);
    console.log(`PC connected: ${pcId}`);

    await prisma.$transaction([
      prisma.pCClient.update({ where: { id: client.id }, data: { lastSeen: new Date() } }),
      prisma.pC.update({ where: { id: pcId }, data: { status: initialStatus, lastHeartbeat: new Date() } })
    ]);
    emitPcUpdate({ pcId, zoneId, status: initialStatus, lastSeen: new Date().toISOString() });
    emitDebugSnapshot();

    const activeSession = await getActiveSessionPayload(pcId);

    if (activeSession) {
      console.log(`Recovered active session ${activeSession.sessionId} for ${pcId}`);
      sendCommandToPc(pcId, { type: "command:start-session", session: activeSession });
    }

    ws.on("message", async (message) => {
      const payload = parseRawMessage(message);
      const event = payload.type ?? payload.event;

      if (event === "pc:heartbeat" || event === "heartbeat") {
        await updatePcHeartbeat(pcId, zoneId, { ...payload, pcId, zoneId });
        return;
      }

      if (event === "pc:status" && isPcStatus(payload.status)) {
        await updatePcStatus(pcId, zoneId, payload.status);
        return;
      }

      if (event === "session:recover" || event === "pc:recover-session") {
        const activeSession = await getActiveSessionPayload(pcId);

        if (activeSession) {
          sendCommandToPc(pcId, { type: "command:start-session", session: activeSession });
        } else {
          sendCommandToPc(pcId, { type: "command:end-session", reason: "No active session" });
        }
        return;
      }

      if (event === "pc:manual-override") {
        const reason = typeof (payload as { reason?: unknown }).reason === "string" ? (payload as { reason: string }).reason : "Emergency unlock";
        console.warn(`Manual override reported by ${pcId}: ${reason}`);
        rememberLog(`Manual override on ${pcId}: ${reason}`);
        await audit("pc_manual_override", undefined, { pcId, zoneId, reason, machineName: payload.machineName });
        emitDashboardEvent("pc:manual-override", {
          pcId,
          zoneId,
          reason,
          machineName: payload.machineName,
          createdAt: new Date().toISOString()
        });
        emitPcUpdate({
          pcId,
          zoneId,
          status: pcStatuses.get(pcId) ?? PCStatus.available,
          warning: "PC manually unlocked"
        });
        emitDebugSnapshot();
      }
    });

    ws.on("close", () => {
      if (pcClients.get(pcId) === ws) {
        forgetPcSocket(pcId, ws);
      }
      console.log(`PC disconnected: ${pcId}`);
      prisma.pC
        .findUnique({ where: { id: pcId }, select: { id: true } })
        .then((pc) => {
          if (!pc) {
            console.warn(`Disconnect from deleted/unregistered PC: ${pcId}`);
            return null;
          }

          return prisma.pC.update({ where: { id: pcId }, data: { status: PCStatus.offline } });
        })
        .then((updatedPc) => {
          if (!updatedPc) {
            return;
          }

          emitDashboardEvent("pc:offline", {
            pcId,
            zoneId,
            warning: "PC client disconnected. Session recovery remains available after reconnect."
          });
          emitPcUpdate({
            pcId,
            zoneId,
            status: PCStatus.offline,
            warning: "PC client disconnected. Session recovery remains available after reconnect."
          });
        })
        .catch((error) => console.error(`PC disconnect offline update failed: ${error instanceof Error ? error.message : error}`));
      emitDebugSnapshot();
    });
  } catch (error) {
    console.error(`PC websocket auth failed: ${error instanceof Error ? error.message : error}`);
    ws.close(1011, "PC auth service unavailable");
  }
});

io.on("connection", (socket) => {
  dashboardSocketCount += 1;
  console.log("Dashboard connected to realtime updates");
  emitDebugSnapshot();

  socket.on("disconnect", () => {
    dashboardSocketCount = Math.max(0, dashboardSocketCount - 1);
    console.log("Dashboard disconnected from realtime updates");
    emitDebugSnapshot();
  });
});

export function sendCommandToPc(pcId: string, commandPayload: CommandPayload) {
  const socket = pcClients.get(pcId);
  const commandType = typeof commandPayload.type === "string" ? commandPayload.type : "command";

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn(`Command failed: ${pcId} not connected`);
    return false;
  }

  console.log("Sending command payload:", commandPayload);
  rememberLog(`${commandType} -> ${pcId}`);
  socket.send(JSON.stringify(commandPayload));
  emitDashboardEvent("session:update", { pcId, command: commandType, payload: commandPayload });
  emitDebugSnapshot();

  if (commandType === "command:start-session") {
    console.log(`Start command sent to ${pcId}`);
  } else if (commandType === "command:end-session") {
    console.log(`End command sent to ${pcId}`);
  } else if (commandType === "command:add-time") {
    console.log(`Add time command sent to ${pcId}`);
  } else {
    console.log(`${commandType} sent to ${pcId}`);
  }

  return true;
}

async function markOfflinePcs() {
  const cutoff = new Date(Date.now() - 30_000);
  const stalePcs = await prisma.pC.findMany({
    include: {
      sessions: {
        where: { status: SessionStatus.active },
        select: { id: true, startTime: true, durationSeconds: true }
      }
    },
    where: {
      status: { not: PCStatus.offline },
      OR: [{ lastHeartbeat: null }, { lastHeartbeat: { lt: cutoff } }]
    }
  });

  for (const pc of stalePcs) {
    if (pcClients.has(pc.id)) {
      continue;
    }

    await prisma.pC.update({ where: { id: pc.id }, data: { status: PCStatus.offline } });
    console.log(`PC offline: ${pc.name} (${pc.id})`);
    emitDashboardEvent("pc:offline", {
      pcId: pc.id,
      zoneId: pc.zoneId,
      activeSessionId: pc.sessions[0]?.id,
      warning: pc.sessions.length > 0 ? "PC offline while session remains active for reconnect recovery." : undefined
    });
    emitPcUpdate({
      pcId: pc.id,
      zoneId: pc.zoneId,
      status: PCStatus.offline,
      activeSessionId: pc.sessions[0]?.id,
      remainingSeconds: pc.sessions[0] ? getRemainingSeconds(pc.sessions[0].startTime, pc.sessions[0].durationSeconds) : undefined,
      warning: pc.sessions.length > 0 ? "PC offline while session remains active for reconnect recovery." : undefined
    });
  }
}

async function startRealtimeServer() {
  await ensureDatabaseConnection();
  stopDiscoveryService = startDiscoveryService(port);
  setInterval(() => {
    markOfflinePcs().catch((error) => console.error(`Offline sync failed: ${error instanceof Error ? error.message : error}`));
  }, 5000);
  setInterval(() => {
    completeExpiredSessions().catch((error) => console.error(`Session expiry sync failed: ${error instanceof Error ? error.message : error}`));
  }, 1000);
  server.listen(port, () => {
    console.log(`WebSocket server running on port ${port}`);
  });
}

function shutdown() {
  console.log("Realtime server shutting down");
  stopDiscoveryService?.();
  for (const [pcId, socket] of pcClients.entries()) {
    console.log(`Closing PC socket: ${pcId}`);
    socket.close(1001, "Realtime server shutting down");
  }
  io.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startRealtimeServer().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
