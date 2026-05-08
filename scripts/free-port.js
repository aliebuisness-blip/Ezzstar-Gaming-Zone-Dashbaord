const { execSync } = require("node:child_process");

const port = Number(process.argv[2]);

if (!port) {
  console.error("Usage: node scripts/free-port.js <port>");
  process.exit(1);
}

function run(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

function findWindowsPids() {
  const output = run("netstat -ano -p tcp");
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);

    if (parts.length < 5) {
      continue;
    }

    const localAddress = parts[1];
    const state = parts[3];
    const pid = parts[4];

    if (state === "LISTENING" && localAddress.endsWith(`:${port}`) && pid !== "0") {
      pids.add(pid);
    }
  }

  return [...pids];
}

function findUnixPids() {
  try {
    return run(`lsof -ti tcp:${port} -sTCP:LISTEN`).split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

const pids = process.platform === "win32" ? findWindowsPids() : findUnixPids();

if (pids.length === 0) {
  console.log(`Port ${port} is free.`);
  process.exit(0);
}

for (const pid of pids) {
  if (process.platform === "win32") {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
  } else {
    execSync(`kill -9 ${pid}`, { stdio: "ignore" });
  }
}

console.log(`Freed port ${port}. Stopped PID(s): ${pids.join(", ")}`);
