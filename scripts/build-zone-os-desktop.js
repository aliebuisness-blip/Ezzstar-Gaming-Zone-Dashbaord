const { spawnSync } = require("node:child_process");

function hasPackage(name) {
  try {
    require.resolve(name, { paths: [process.cwd()] });
    return true;
  } catch {
    return false;
  }
}

if (!hasPackage("electron-builder")) {
  console.log("Zone OS desktop packaging is scaffolded, but electron-builder is not installed.");
  console.log("Install packaging dependencies first:");
  console.log("npm install --save-dev electron electron-builder");
  console.log("Then run:");
  console.log("npm run zone-os:desktop:build");
  process.exit(0);
}

const electronBuilderCli = require.resolve("electron-builder/out/cli/cli.js", { paths: [process.cwd()] });
const result = spawnSync(process.execPath, [electronBuilderCli, "--config", "zone-os/electron-builder.json"], {
  cwd: process.cwd(),
  stdio: "inherit"
});

process.exit(result.status ?? 1);
