const { app, BrowserWindow, dialog, shell } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  getNextCli,
  getNodeEnv,
  getNodeExecutable,
  getRootDir,
  getTsxCli,
  getUsableLanIp,
  isHttpUp,
  spawnNodeManaged,
  waitForHttp
} = require("./runtime");

const WEB_PORT = process.env.ZONE_OS_WEB_PORT || "3000";
const REALTIME_PORT = process.env.REALTIME_PORT || "4001";
const LOCAL_ZONE_URL = `http://localhost:${WEB_PORT}/zone`;
const LOCAL_HEALTH_URL = `http://localhost:${WEB_PORT}`;
const STARTUP_LOG_PATH = path.join(os.tmpdir(), "spica-zone-os-startup.log");
const children = new Set();

let mainWindow;
let startupLog = [];
let isQuitting = false;
let hasLoadedZoneOs = false;
let startupRenderTimer = null;
let serviceStatus = {
  setup: "waiting",
  database: "waiting",
  realtime: "waiting",
  web: "waiting"
};

function redact(line) {
  return line
    .replace(/postgresql:\/\/([^:]+):([^@]+)@/gi, "postgresql://$1:***@")
    .replace(/(SERVICE_ROLE_KEY|JWT_SECRET|REALTIME_INTERNAL_SECRET|DATABASE_URL)=("[^"]+"|[^\s]+)/gi, "$1=***");
}

function renderStartupScreen(status, details = "") {
  const lanIp = getUsableLanIp();
  const lanZoneUrl = lanIp ? `http://${lanIp}:${WEB_PORT}/zone` : "LAN IP not detected yet";
  const lanWsUrl = lanIp ? `ws://${lanIp}:${REALTIME_PORT}` : `ws://localhost:${REALTIME_PORT}`;
  const logLines = startupLog.slice(-8).map((line) => `<li>${line}</li>`).join("");
  const statusCards = [
    ["Setup", serviceStatus.setup],
    ["Database", serviceStatus.database],
    ["Realtime", serviceStatus.realtime],
    ["Zone OS UI", serviceStatus.web]
  ]
    .map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join("");

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>SPICA Zone OS</title>
      <style>
        body { margin: 0; background: #07090d; color: #e5eefc; font-family: Inter, Segoe UI, Arial, sans-serif; }
        main { min-height: 100vh; display: grid; place-items: center; padding: 32px; box-sizing: border-box; }
        section { width: min(720px, 100%); border: 1px solid rgba(255,255,255,.1); border-radius: 22px; background: #0b0e14; padding: 28px; box-shadow: 0 24px 80px rgba(0,0,0,.35); }
        .eyebrow { color: #67e8f9; font-size: 12px; letter-spacing: .2em; text-transform: uppercase; }
        h1 { margin: 10px 0 8px; font-size: 28px; }
        p { color: #94a3b8; line-height: 1.6; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; margin-top: 18px; }
        .status-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-top: 18px; }
        .card { border: 1px solid rgba(255,255,255,.08); border-radius: 14px; background: rgba(255,255,255,.035); padding: 12px; }
        .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .14em; }
        .value { margin-top: 6px; color: #f8fafc; font-size: 13px; word-break: break-all; }
        .note { margin-top: 16px; border: 1px solid rgba(251,191,36,.18); border-radius: 14px; background: rgba(251,191,36,.06); padding: 12px; color: #fde68a; font-size: 13px; }
        .pulse { display: inline-block; width: 8px; height: 8px; border-radius: 99px; margin-right: 8px; background: #22d3ee; animation: pulse 1.3s infinite; }
        ul { margin: 18px 0 0; padding-left: 18px; color: #64748b; font-size: 12px; line-height: 1.6; }
        @keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
        @media (max-width: 760px) { .grid, .status-grid { grid-template-columns: 1fr; } }
      </style>
    </head>
    <body>
      <main>
        <section>
          <div class="eyebrow">SPICA Zone OS</div>
          <h1><span class="pulse"></span>${status}</h1>
          <p>${details || "Starting local operator services. This window will open Zone OS automatically."}</p>
          <div class="status-grid">${statusCards}</div>
          <div class="grid">
            <div class="card"><div class="label">Local Zone OS</div><div class="value">${LOCAL_ZONE_URL}</div></div>
            <div class="card"><div class="label">LAN Zone OS</div><div class="value">${lanZoneUrl}</div></div>
            <div class="card"><div class="label">PC Realtime URL</div><div class="value">${lanWsUrl}</div></div>
            <div class="card"><div class="label">Realtime Port</div><div class="value">${REALTIME_PORT}</div></div>
          </div>
          <div class="note">Windows Firewall: allow private-network access for ports ${WEB_PORT} and ${REALTIME_PORT} so gaming PCs can pair and connect on LAN.</div>
          <ul>${logLines}</ul>
        </section>
      </main>
    </body>
  </html>`;
}

function renderDatabaseSetupScreen(details = "") {
  const safeDetails = redact(details).replace(/[<>&]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[char]));

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>SPICA Zone OS Database Setup</title>
      <style>
        body { margin: 0; background: #07090d; color: #e5eefc; font-family: Inter, Segoe UI, Arial, sans-serif; }
        main { min-height: 100vh; display: grid; place-items: center; padding: 32px; box-sizing: border-box; }
        section { width: min(760px, 100%); border: 1px solid rgba(251,191,36,.22); border-radius: 22px; background: #0b0e14; padding: 28px; box-shadow: 0 24px 80px rgba(0,0,0,.35); }
        .eyebrow { color: #fde68a; font-size: 12px; letter-spacing: .2em; text-transform: uppercase; }
        h1 { margin: 10px 0 8px; font-size: 28px; }
        p { color: #94a3b8; line-height: 1.6; }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
        a { color: inherit; text-decoration: none; }
        .button { border: 1px solid rgba(34,211,238,.35); border-radius: 14px; background: rgba(34,211,238,.12); padding: 11px 14px; color: #ecfeff; font-weight: 700; }
        .secondary { border-color: rgba(255,255,255,.12); background: rgba(255,255,255,.045); color: #cbd5e1; }
        .diag { margin-top: 18px; border: 1px solid rgba(255,255,255,.08); border-radius: 14px; background: rgba(0,0,0,.25); padding: 12px; color: #64748b; font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <main>
        <section>
          <div class="eyebrow">Local database setup required</div>
          <h1>PostgreSQL setup needs attention</h1>
          <p>Zone OS tried to install or repair the local database automatically. If Windows blocked the silent installer, complete the PostgreSQL installer that opened, then retry setup.</p>
          <div class="actions">
            <a class="button" href="https://www.postgresql.org/download/windows/">Download PostgreSQL manually</a>
            <a class="button secondary" href="spica-zone-os://retry-db">Retry setup</a>
          </div>
          <div class="diag">${safeDetails || "No unsafe diagnostics are shown here. Database passwords and secrets are redacted."}</div>
        </section>
      </main>
    </body>
  </html>`;
}

function isWindowUsable() {
  return Boolean(
    mainWindow &&
    !mainWindow.isDestroyed() &&
    mainWindow.webContents &&
    !mainWindow.webContents.isDestroyed()
  );
}

function safeLoadUrl(url) {
  if (isQuitting || !isWindowUsable()) return;
  mainWindow.loadURL(url).catch((error) => {
    if (isQuitting) return;
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ERR_ABORTED")) return;
    writeDiagnostic("desktop", `Navigation failed: ${message}`);
  });
}

function writeDiagnostic(label, line) {
  const clean = redact(line).trim();
  if (!clean) return;
  const entry = `${new Date().toISOString()} ${label}: ${clean.split(/\r?\n/)[0]}`;
  startupLog.push(entry);
  try {
    fs.appendFileSync(STARTUP_LOG_PATH, `${entry}\n`);
  } catch {
    // Startup diagnostics should never block the operator console.
  }
}

function showStartup(status, details, options = {}) {
  if (isQuitting || hasLoadedZoneOs || !isWindowUsable()) return;
  const render = () => {
    startupRenderTimer = null;
    if (isQuitting || hasLoadedZoneOs || !isWindowUsable()) return;
    safeLoadUrl(`data:text/html;charset=utf-8,${encodeURIComponent(renderStartupScreen(status, details))}`);
  };

  if (options.immediate) {
    if (startupRenderTimer) {
      clearTimeout(startupRenderTimer);
      startupRenderTimer = null;
    }
    render();
    return;
  }

  if (startupRenderTimer) clearTimeout(startupRenderTimer);
  startupRenderTimer = setTimeout(render, 120);
}

function showDatabaseSetup(details) {
  if (isQuitting || hasLoadedZoneOs || !isWindowUsable()) return;
  if (startupRenderTimer) {
    clearTimeout(startupRenderTimer);
    startupRenderTimer = null;
  }
  safeLoadUrl(`data:text/html;charset=utf-8,${encodeURIComponent(renderDatabaseSetupScreen(details))}`);
}

function pushLog(label, line) {
  writeDiagnostic(label, line);
  showStartup("Starting local services");
}

function setServiceStatus(name, status) {
  serviceStatus = { ...serviceStatus, [name]: status };
  showStartup("Starting local services");
}

function runSetup() {
  setServiceStatus("setup", "running");
  showStartup("Preparing local runtime", "Checking local environment, ports, and runtime secrets.");
  const result = spawnSync(getNodeExecutable(), [path.join(getRootDir(), "scripts", "setup-zone-os-runtime.js")], {
    cwd: getRootDir(),
    env: getNodeEnv(),
    encoding: "utf8",
    shell: false,
    windowsHide: true
  });

  if (result.stdout) pushLog("setup", result.stdout);
  if (result.stderr) pushLog("setup", result.stderr);

  if (result.status !== 0) {
    setServiceStatus("setup", "failed");
    throw new Error("Zone OS setup failed. Check database and local environment.");
  }
  setServiceStatus("setup", "ready");
}

function runDatabaseSetup() {
  setServiceStatus("database", "running");
  showStartup("Installing local database", "Checking PostgreSQL. If it is missing, Zone OS will download the Windows installer, run setup, apply migrations, and seed baseline records.");
  const result = spawnSync(getNodeExecutable(), [path.join(getRootDir(), "scripts", "zone-os-db.js"), "setup"], {
    cwd: getRootDir(),
    env: getNodeEnv(),
    encoding: "utf8",
    windowsHide: true
  });

  if (result.stdout) pushLog("database", result.stdout);
  if (result.stderr) pushLog("database", result.stderr);

  if (result.status !== 0) {
    setServiceStatus("database", "failed");
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n");
    const error = new Error("Local database setup required");
    error.detail = detail;
    throw error;
  }
  setServiceStatus("database", "ready");
}

async function startRealtime() {
  setServiceStatus("realtime", "starting");
  showStartup("Starting realtime service", "Opening local WebSocket and dashboard update server.");
  const existing = await isHttpUp(`http://localhost:${REALTIME_PORT}`);
  if (existing) {
    pushLog("realtime", `Port ${REALTIME_PORT} is already in use. Using the existing local realtime service if it is SPICA Zone OS.`);
    setServiceStatus("realtime", "using existing service");
    return null;
  }

  const child = spawnNodeManaged("realtime", getTsxCli(), [path.join("server", "realtime.ts")], {
    env: { REALTIME_PORT },
    onLog: pushLog,
    onExit: (label, code) => {
      setServiceStatus("realtime", code === 0 ? "stopped" : "failed");
      pushLog(label, `Exited with code ${code}`);
    }
  });
  setServiceStatus("realtime", "starting on port " + REALTIME_PORT);
  children.add(child);
  return child;
}

async function startWebRuntime() {
  setServiceStatus("web", "starting");
  showStartup("Starting Zone OS UI", "Launching the local operator web runtime.");
  const existing = await isHttpUp(LOCAL_HEALTH_URL);
  if (existing) {
    pushLog("web", `Port ${WEB_PORT} is already in use. Attempting to open the existing local Zone OS web runtime.`);
    setServiceStatus("web", "using existing service");
    return null;
  }

  const args = !app.isPackaged
    ? ["dev", "--hostname", "0.0.0.0", "--port", WEB_PORT]
    : ["start", "--hostname", "0.0.0.0", "--port", WEB_PORT];
  const child = spawnNodeManaged("web", getNextCli(), args, {
    env: {
      PORT: WEB_PORT,
      NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL || `http://localhost:${REALTIME_PORT}`
    },
    onLog: pushLog,
    onExit: (label, code) => {
      setServiceStatus("web", code === 0 ? "stopped" : "failed");
      pushLog(label, `Exited with code ${code}`);
    }
  });
  setServiceStatus("web", "starting on port " + WEB_PORT);
  children.add(child);
  return child;
}

async function boot() {
  try {
    fs.writeFileSync(STARTUP_LOG_PATH, "");
  } catch {
    // Startup diagnostics are best-effort only.
  }
  pushLog("desktop", `Startup diagnostics: ${STARTUP_LOG_PATH}`);
  pushLog("desktop", "Electron app is ready. Creating operator window.");

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    title: "SPICA Zone OS",
    backgroundColor: "#07090d",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url === "spica-zone-os://retry-db") {
      event.preventDefault();
      startServices();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  pushLog("desktop", "Operator window created. Starting services.");
  await startServices();
}

async function startServices() {
  hasLoadedZoneOs = false;
  showStartup("Starting SPICA Zone OS", "", { immediate: true });

  try {
    runSetup();
    runDatabaseSetup();
    await startRealtime();
    await startWebRuntime();
    showStartup("Opening Zone OS", "Local services are ready. Loading operator console.");
    await waitForHttp(LOCAL_ZONE_URL, 90_000);
    if (isQuitting || !isWindowUsable()) return;
    setServiceStatus("realtime", serviceStatus.realtime === "starting on port " + REALTIME_PORT ? "ready" : serviceStatus.realtime);
    setServiceStatus("web", serviceStatus.web === "starting on port " + WEB_PORT ? "ready" : serviceStatus.web);
    if (startupRenderTimer) {
      clearTimeout(startupRenderTimer);
      startupRenderTimer = null;
    }
    hasLoadedZoneOs = true;
    await mainWindow.loadURL(LOCAL_ZONE_URL);
  } catch (error) {
    if (isQuitting || !isWindowUsable()) return;
    const message = error instanceof Error ? error.message : "Zone OS failed to start.";
    if (message === "Local database setup required") {
      showDatabaseSetup(error.detail ?? "");
      return;
    }
    showStartup("Startup failed", message);
    if (!isQuitting) {
      dialog.showErrorBox("SPICA Zone OS startup failed", message);
    }
  }
}

app.whenReady().then(boot).catch((error) => {
  pushLog("desktop", error instanceof Error ? error.message : "Electron boot failed.");
});

app.on("before-quit", () => {
  isQuitting = true;
  if (startupRenderTimer) {
    clearTimeout(startupRenderTimer);
    startupRenderTimer = null;
  }
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // Child cleanup is best-effort during app shutdown.
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
