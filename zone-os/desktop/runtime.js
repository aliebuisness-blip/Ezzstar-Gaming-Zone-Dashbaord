const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

function getRootDir() {
  return path.resolve(__dirname, "..", "..");
}

function getNodeExecutable() {
  return process.env.ZONE_OS_NODE_PATH || process.env.npm_node_execpath || process.execPath;
}

function getNodeEnv(extraEnv = {}) {
  const nodeExecutable = getNodeExecutable();
  const usesElectronAsNode = Boolean(process.versions.electron) && nodeExecutable === process.execPath;
  return {
    ...process.env,
    ...(usesElectronAsNode ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
    ...extraEnv
  };
}

function resolvePackageFile(packageName, relativeFile) {
  const packageJson = require.resolve(`${packageName}/package.json`, { paths: [getRootDir()] });
  return path.join(path.dirname(packageJson), relativeFile);
}

function getNextCli() {
  return resolvePackageFile("next", path.join("dist", "bin", "next"));
}

function getTsxCli() {
  return resolvePackageFile("tsx", path.join("dist", "cli.cjs"));
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
    env: options.nodeChild ? getNodeEnv(options.env) : { ...process.env, ...options.env },
    shell: false,
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

function spawnNodeManaged(label, scriptPath, args, options = {}) {
  return spawnManaged(label, getNodeExecutable(), [scriptPath, ...args], { ...options, nodeChild: true });
}

module.exports = {
  getNextCli,
  getNodeEnv,
  getNodeExecutable,
  getRootDir,
  getTsxCli,
  getUsableLanIp,
  isHttpUp,
  spawnManaged,
  spawnNodeManaged,
  waitForHttp
};
