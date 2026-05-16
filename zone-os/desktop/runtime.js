const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

function getRootDir() {
  return path.resolve(__dirname, "..", "..");
}

function getBin(name) {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  return path.join(getRootDir(), "node_modules", ".bin", `${name}${suffix}`);
}

function getUsableLanIp() {
  const ignored = /wsl|hyper-v|vethernet|vmware|virtualbox|docker|bluetooth|loopback|npcap/i;
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    if (ignored.test(name)) continue;
    for (const entry of entries || []) {
      if (
        entry.family === "IPv4" &&
        !entry.internal &&
        !entry.address.startsWith("169.254.") &&
        !entry.address.startsWith("192.168.168.")
      ) {
        return entry.address;
      }
    }
  }
  return null;
}

function waitForHttp(url, timeoutMs = 45_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function attempt() {
      const request = http.get(url, (response) => {
        response.resume();
        resolve(true);
      });

      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(attempt, 900);
      });

      request.setTimeout(2000, () => {
        request.destroy();
      });
    }

    attempt();
  });
}

function isHttpUp(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(true);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1200, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function spawnManaged(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: getRootDir(),
    env: {
      ...process.env,
      ...options.env
    },
    shell: process.platform === "win32",
    windowsHide: true
  });

  child.stdout?.on("data", (chunk) => {
    options.onLog?.(label, chunk.toString());
  });

  child.stderr?.on("data", (chunk) => {
    options.onLog?.(label, chunk.toString());
  });

  child.on("exit", (code) => {
    options.onExit?.(label, code);
  });

  return child;
}

module.exports = {
  getBin,
  getRootDir,
  getUsableLanIp,
  isHttpUp,
  spawnManaged,
  waitForHttp
};
