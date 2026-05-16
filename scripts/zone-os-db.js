const fs = require("node:fs");
const https = require("node:https");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const command = process.argv[2] || "check";
const POSTGRES_VERSION = "16.4-1";
const POSTGRES_INSTALLER_FILE = `postgresql-${POSTGRES_VERSION}-windows-x64.exe`;
const DEFAULT_POSTGRES_INSTALLER_URL = `https://get.enterprisedb.com/postgresql/${POSTGRES_INSTALLER_FILE}`;
const POSTGRES_INSTALLER_CACHE = path.join(os.tmpdir(), "spica-zone-os", POSTGRES_INSTALLER_FILE);

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return acc;
    const index = trimmed.indexOf("=");
    acc[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    return acc;
  }, {});
}

function redact(value) {
  return String(value || "").replace(/postgresql:\/\/([^:]+):([^@]+)@/gi, "postgresql://$1:***@");
}

function getDatabaseConfig() {
  const env = { ...parseEnvFile(path.join(root, ".env")), ...process.env };
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Run Zone OS setup first.");
  }

  const url = new URL(databaseUrl);
  const dbName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error("Database name contains unsupported characters.");
  }

  const adminUrl = new URL(url.toString());
  adminUrl.pathname = "/postgres";

  return {
    databaseUrl,
    adminUrl: adminUrl.toString(),
    dbName,
    password: decodeURIComponent(url.password),
    port: Number(url.port || 5432)
  };
}

function findPostgresService() {
  if (process.platform !== "win32") return null;
  const query = spawnSync("sc.exe", ["query", "type=", "service", "state=", "all"], {
    encoding: "utf8",
    windowsHide: true
  });
  const output = `${query.stdout || ""}\n${query.stderr || ""}`;
  const match = output.match(/SERVICE_NAME:\s*(postgresql[^\r\n]*)/i);
  return match?.[1]?.trim() || null;
}

function isPortReachable(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port, timeout: 1200 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function isPortReachableSync(port) {
  const probe = spawnSync(process.execPath, ["-e", `
    const net = require("node:net");
    const socket = net.createConnection({ host: "127.0.0.1", port: ${Number(port)}, timeout: 1200 });
    socket.on("connect", () => { socket.destroy(); process.exit(0); });
    socket.on("error", () => process.exit(1));
    socket.on("timeout", () => { socket.destroy(); process.exit(1); });
  `], { encoding: "utf8", windowsHide: true });
  return probe.status === 0;
}

function findPsql() {
  const candidates = [];
  if (process.env.PSQL_PATH) candidates.push(process.env.PSQL_PATH);

  if (process.platform === "win32") {
    const programFiles = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean);
    for (const base of programFiles) {
      const pgRoot = path.join(base, "PostgreSQL");
      if (!fs.existsSync(pgRoot)) continue;
      for (const version of fs.readdirSync(pgRoot)) {
        candidates.push(path.join(pgRoot, version, "bin", "psql.exe"));
      }
    }
  }

  candidates.push("psql");

  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8", windowsHide: true });
    if (probe.status === 0) {
      return candidate;
    }
  }

  return null;
}

function detectPostgres() {
  const config = getDatabaseConfig();
  const psqlPath = findPsql();
  const serviceName = findPostgresService();
  return {
    config,
    psqlPath,
    serviceName,
    portReachable: isPortReachableSync(config.port)
  };
}

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    windowsHide: true
  });
  return result;
}

function runPrisma(args) {
  return runNodeScript(require.resolve("prisma/build/index.js", { paths: [root] }), args);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runPrismaWithRetry(args, attempts = 3) {
  let result = runPrisma(args);
  for (let attempt = 1; attempt < attempts && result.status !== 0; attempt += 1) {
    sleep(900 * attempt);
    result = runPrisma(args);
  }
  return result;
}

function generatedPrismaClientExists() {
  return fs.existsSync(path.join(root, "node_modules", ".prisma", "client", "index.js"));
}

function runTsx(file) {
  const tsxPackage = require.resolve("tsx/package.json", { paths: [root] });
  const tsxCli = path.join(path.dirname(tsxPackage), "dist", "cli.cjs");
  return runNodeScript(tsxCli, [file]);
}

function psql(psqlPath, connectionUrl, sql, password) {
  return spawnSync(psqlPath, [connectionUrl, "-v", "ON_ERROR_STOP=1", "-tAc", sql], {
    cwd: root,
    env: {
      ...process.env,
      PGPASSWORD: password
    },
    encoding: "utf8",
    windowsHide: true
  });
}

function printResult(ok, message, detail = {}) {
  const safeDetail = { ...detail };
  if (safeDetail.databaseUrl) safeDetail.databaseUrl = redact(safeDetail.databaseUrl);
  if (safeDetail.adminUrl) safeDetail.adminUrl = redact(safeDetail.adminUrl);
  console.log(JSON.stringify({ ok, message, ...safeDetail }, null, 2));
}

function downloadFile(url, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    const request = https.get(url, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location) {
        file.close();
        fs.unlinkSync(destination);
        downloadFile(response.headers.location, destination).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destination, () => {});
        reject(new Error(`PostgreSQL installer download failed with HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(destination);
      });
    });
    request.on("error", (error) => {
      file.close();
      fs.unlink(destination, () => {});
      reject(error);
    });
  });
}

function downloadFileSync(url, destination) {
  const script = `
    const https = require("node:https");
    const fs = require("node:fs");
    const path = require("node:path");
    const url = ${JSON.stringify(url)};
    const destination = ${JSON.stringify(destination)};
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    function download(source) {
      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);
        const request = https.get(source, (response) => {
          if ([301,302,303,307,308].includes(response.statusCode || 0) && response.headers.location) {
            file.close();
            fs.unlink(destination, () => {});
            download(response.headers.location).then(resolve, reject);
            return;
          }
          if (response.statusCode !== 200) {
            file.close();
            fs.unlink(destination, () => {});
            reject(new Error("HTTP " + response.statusCode));
            return;
          }
          response.pipe(file);
          file.on("finish", () => file.close(resolve));
        });
        request.on("error", (error) => {
          file.close();
          fs.unlink(destination, () => {});
          reject(error);
        });
      });
    }
    download(url).then(() => process.exit(0)).catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
  `;
  return spawnSync(process.execPath, ["-e", script], { encoding: "utf8", windowsHide: true });
}

function runPostgresInstaller(installerPath, password, port) {
  const args = [
    "--mode", "unattended",
    "--unattendedmodeui", "none",
    "--superpassword", password,
    "--serverport", String(port),
    "--servicename", "postgresql-x64-16",
    "--enable-components", "server,commandlinetools"
  ];
  return spawnSync(installerPath, args, {
    cwd: path.dirname(installerPath),
    encoding: "utf8",
    windowsHide: true
  });
}

function openPostgresInstaller(installerPath) {
  if (process.platform === "win32") {
    spawnSync("cmd.exe", ["/c", "start", "", installerPath], {
      cwd: path.dirname(installerPath),
      windowsHide: true
    });
  }
}

function installPostgresIfMissing() {
  const detection = detectPostgres();
  if (detection.psqlPath && detection.portReachable) {
    return { attempted: false, installed: true, reason: "PostgreSQL already detected." };
  }

  if (process.platform !== "win32") {
    throw new Error("PostgreSQL is missing. Automatic install is currently available only on Windows.");
  }

  const installerUrl = process.env.POSTGRES_INSTALLER_URL || DEFAULT_POSTGRES_INSTALLER_URL;
  const installerPath = process.env.POSTGRES_INSTALLER_PATH || POSTGRES_INSTALLER_CACHE;
  console.warn("PostgreSQL was not detected. Downloading the Windows installer...");

  if (!fs.existsSync(installerPath)) {
    const download = downloadFileSync(installerUrl, installerPath);
    if (download.status !== 0) {
      throw new Error(`Could not download PostgreSQL installer. Open the manual installer and retry. ${download.stderr || download.stdout || ""}`.trim());
    }
  }

  console.warn("Running PostgreSQL installer in unattended mode. Windows may require administrator permission.");
  const install = runPostgresInstaller(installerPath, detection.config.password, detection.config.port);
  if (install.status !== 0) {
    openPostgresInstaller(installerPath);
    throw new Error("Silent PostgreSQL install did not complete. The installer has been opened for guided setup. After installation, click Retry.");
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    sleep(1500);
    const afterInstall = detectPostgres();
    if (afterInstall.psqlPath && afterInstall.portReachable) {
      return { attempted: true, installed: true, installerPath };
    }
  }

  throw new Error("PostgreSQL installation completed, but the local service is not reachable yet. Confirm the service is running, then retry.");
}

function ensureDatabase() {
  const config = getDatabaseConfig();
  let psqlPath = findPsql();

  const migrateStatus = runPrisma(["migrate", "status"]);
  if (migrateStatus.status === 0) {
    return { config, psqlPath, databaseExisted: true, prismaReachable: true };
  }

  if (!psqlPath || !isPortReachableSync(config.port)) {
    installPostgresIfMissing();
    psqlPath = findPsql();
  }

  if (!psqlPath) {
    throw new Error("PostgreSQL command line tools were not found after setup. Install PostgreSQL for Windows, then retry Zone OS.");
  }

  const reach = psql(psqlPath, config.adminUrl, "SELECT 1", config.password);
  if (reach.status !== 0) {
    throw new Error("Local PostgreSQL is not reachable. Confirm the PostgreSQL service is running and DATABASE_URL credentials are correct.");
  }

  const exists = psql(psqlPath, config.adminUrl, `SELECT 1 FROM pg_database WHERE datname='${config.dbName}'`, config.password);
  if (exists.status !== 0) {
    throw new Error("Could not check whether the Zone OS database exists.");
  }

  if (!exists.stdout.trim()) {
    const createdb = psql(psqlPath, config.adminUrl, `CREATE DATABASE ${config.dbName}`, config.password);
    if (createdb.status !== 0) {
      throw new Error("Could not create the local Zone OS database.");
    }
    return { config, psqlPath, databaseExisted: false, prismaReachable: false };
  }

  return { config, psqlPath, databaseExisted: true, prismaReachable: false };
}

function setupDatabase() {
  const result = ensureDatabase();

  const generate = runPrismaWithRetry(["generate"]);
  if (generate.status !== 0) {
    if (!generatedPrismaClientExists()) {
      throw new Error(`Prisma client generation failed: ${generate.stderr || generate.stdout}`);
    }
    console.warn("Prisma generate could not replace locked files, but an existing Prisma client is available. Continuing setup.");
  }

  const migrate = runPrisma(["migrate", "deploy"]);
  if (migrate.status !== 0) {
    throw new Error(`Prisma migrations failed: ${migrate.stderr || migrate.stdout}`);
  }

  const seed = runTsx(path.join("prisma", "seed.zone-os.ts"));
  if (seed.status !== 0) {
    throw new Error(`Zone OS baseline seed failed: ${seed.stderr || seed.stdout}`);
  }

  return result;
}

try {
  if (command === "diagnose") {
    const detection = detectPostgres();
    printResult(true, "Zone OS PostgreSQL diagnostics completed.", {
      databaseUrl: detection.config.databaseUrl,
      psqlFound: Boolean(detection.psqlPath),
      serviceName: detection.serviceName,
      portReachable: detection.portReachable,
      databaseName: detection.config.dbName
    });
    process.exit(0);
  }

  if (command === "install-postgres") {
    const result = installPostgresIfMissing();
    printResult(true, result.attempted ? "PostgreSQL automatic setup completed." : "PostgreSQL already installed.", {
      installerPath: result.installerPath,
      attempted: result.attempted
    });
    process.exit(0);
  }

  if (command === "check") {
    const detection = detectPostgres();
    const status = runPrisma(["migrate", "status"]);
    printResult(status.status === 0, status.status === 0 ? "Zone OS database is reachable." : "Zone OS database needs setup.", {
      databaseUrl: detection.config.databaseUrl,
      psqlFound: Boolean(detection.psqlPath),
      serviceName: detection.serviceName,
      portReachable: detection.portReachable
    });
    process.exit(status.status === 0 ? 0 : 1);
  }

  if (command === "setup" || command === "repair") {
    const result = setupDatabase();
    printResult(true, command === "repair" ? "Zone OS database repair completed." : "Zone OS database setup completed.", {
      databaseUrl: result.config.databaseUrl,
      psqlFound: Boolean(result.psqlPath),
      databaseCreated: !result.databaseExisted
    });
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  printResult(false, error instanceof Error ? error.message : "Zone OS database setup failed.");
  process.exit(1);
}
