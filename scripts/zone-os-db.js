const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = process.cwd();
const command = process.argv[2] || "check";

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
    password: decodeURIComponent(url.password)
  };
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

function ensureDatabase() {
  const config = getDatabaseConfig();
  const psqlPath = findPsql();

  const migrateStatus = runPrisma(["migrate", "status"]);
  if (migrateStatus.status === 0) {
    return { config, psqlPath, databaseExisted: true, prismaReachable: true };
  }

  if (!psqlPath) {
    throw new Error("PostgreSQL command line tools were not found. Install PostgreSQL for Windows, then retry Zone OS.");
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
  if (command === "check") {
    const config = getDatabaseConfig();
    const psqlPath = findPsql();
    const status = runPrisma(["migrate", "status"]);
    printResult(status.status === 0, status.status === 0 ? "Zone OS database is reachable." : "Zone OS database needs setup.", {
      databaseUrl: config.databaseUrl,
      psqlFound: Boolean(psqlPath)
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
