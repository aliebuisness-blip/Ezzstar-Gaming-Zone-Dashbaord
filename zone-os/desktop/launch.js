const { spawn } = require("node:child_process");
const path = require("node:path");

function resolveElectron() {
  try {
    return require("electron");
  } catch {
    return null;
  }
}

const electronPath = resolveElectron();

if (!electronPath) {
  console.error("Electron is not installed. Install desktop packaging dependencies first:");
  console.error("npm install --save-dev electron electron-builder");
  process.exit(1);
}

const child = spawn(electronPath, [path.join(__dirname, "main.js")], {
  cwd: path.resolve(__dirname, "..", ".."),
  stdio: "inherit",
  shell: process.platform === "win32"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
