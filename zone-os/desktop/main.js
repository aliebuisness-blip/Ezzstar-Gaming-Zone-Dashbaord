const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  getBin,
  getRootDir,
  getUsableLanIp,
  isHttpUp,
  spawnManaged,
  waitForHttp
} = require("./runtime");

const WEB_PORT = process.env.ZONE_OS_WEB_PORT || "3000";
const REALTIME_PORT = process.env.REALTIME_PORT || "4001";
const LOCAL_ZONE_URL = `http://localhost:${WEB_PORT}/zone`;
const LOCAL_HEALTH_URL = `http://localhost:${WEB_PORT}`;
const children = new Set();

let mainWindow;
let startupLog = [];

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
        .card { border: 1px solid rgba(255,255,255,.08); border-radius: 14px; background: rgba(255,255,255,.035); padding: 12px; }
        .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .14em; }
        .value { margin-top: 6px; color: #f8fafc; font-size: 13px; word-break: break-all; }
        .note { margin-top: 16px; border: 1px solid rgba(251,191,36,.18); border-radius: 14px; background: rgba(251,191,36,.06); padding: 12px; color: #fde68a; font-size: 13px; }
        .pulse { display: inline-block; width: 8px; height: 8px; border-radius: 99px; margin-right: 8px; background: #22d3ee; animation: pulse 1.3s infinite; }
        ul { margin: 18px 0 0; padding-left: 18px; color: #64748b; font-size: 12px; line-height: 1.6; }
        @keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
      </style>
    </head>
    <body>
      <main>
        <section>
          <div class="eyebrow">SPICA Zone OS</div>
          <h1><span class="pulse"></span>${status}</h1>
          <p>${details || "Starting local operator services. This window will open Zone OS automatically."}</p>
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

function showStartup(status, details) {
  if (!mainWindow) return;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(renderStartupScreen(status, details))}`);
}

function pushLog(label, line) {
  const clean = redact(line).trim();
  if (!clean) return;
  startupLog.push(`${label}: ${clean.split(/\r?\n/)[0]}`);
  showStartup("Starting local services");
}

function runSetup() {
  showStartup("Preparing local runtime", "Checking local environment, ports, and runtime secrets.");
  const result = spawnSync(process.execPath, [path.join(getRootDir(), "scripts", "setup-zone-os-runtime.js")], {
    cwd: getRootDir(),
    env: process.env,
    encoding: "utf8",
    shell: process.platform === "win32"
  });

  if (result.stdout) pushLog("setup", result.stdout);
  if (result.stderr) pushLog("setup", result.stderr);

  if (result.status !== 0) {
    throw new Error("Zone OS setup failed. Check database and local environment.");
  }
}

async function startRealtime() {
  showStartup("Starting realtime service", "Opening local WebSocket and dashboard update server.");
  const existing = await isHttpUp(`http://localhost:${REALTIME_PORT}`);
  if (existing) {
    pushLog("realtime", `Port ${REALTIME_PORT} is already in use. Using the existing local realtime service if it is SPICA Zone OS.`);
    return null;
  }

  const child = spawnManaged("realtime", getBin("tsx"), [path.join("server", "realtime.ts")], {
    env: { REALTIME_PORT },
    onLog: pushLog,
    onExit: (label, code) => pushLog(label, `Exited with code ${code}`)
  });
  children.add(child);
  return child;
}

async function startWebRuntime() {
  showStartup("Starting Zone OS UI", "Launching the local operator web runtime.");
  const existing = await isHttpUp(LOCAL_HEALTH_URL);
  if (existing) {
    pushLog("web", `Port ${WEB_PORT} is already in use. Attempting to open the existing local Zone OS web runtime.`);
    return null;
  }

  const nextBin = getBin("next");
  const args = !app.isPackaged
    ? ["dev", "--hostname", "0.0.0.0", "--port", WEB_PORT]
    : ["start", "--hostname", "0.0.0.0", "--port", WEB_PORT];
  const child = spawnManaged("web", nextBin, args, {
    env: {
      PORT: WEB_PORT,
      NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL || `http://localhost:${REALTIME_PORT}`
    },
    onLog: pushLog,
    onExit: (label, code) => pushLog(label, `Exited with code ${code}`)
  });
  children.add(child);
  return child;
}

async function boot() {
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

  showStartup("Starting SPICA Zone OS");

  try {
    runSetup();
    await startRealtime();
    await startWebRuntime();
    showStartup("Opening Zone OS", "Local services are ready. Loading operator console.");
    await waitForHttp(LOCAL_ZONE_URL, 90_000);
    await mainWindow.loadURL(LOCAL_ZONE_URL);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zone OS failed to start.";
    showStartup("Startup failed", message);
    dialog.showErrorBox("SPICA Zone OS startup failed", message);
  }
}

app.whenReady().then(boot);

app.on("before-quit", () => {
  for (const child of children) {
    child.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
