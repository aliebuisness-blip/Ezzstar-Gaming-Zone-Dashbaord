const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = process.cwd();
const envPath = path.join(root, ".env");
const envExamplePath = path.join(root, ".env.example");
const shouldApplyDb = process.argv.includes("--apply-db");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return acc;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      acc[key] = value;
      return acc;
    }, {});
}

function quote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function randomSecret(label) {
  return `${label}-${crypto.randomBytes(32).toString("hex")}`;
}

function isPlaceholder(value) {
  return !value || value.includes("replace-with") || value.includes("USER:PASSWORD@HOST");
}

function usableLanAddresses() {
  const ignored = /wsl|hyper-v|vethernet|vmware|virtualbox|docker|bluetooth|loopback|npcap/i;
  return Object.entries(os.networkInterfaces())
    .flatMap(([name, entries]) =>
      (entries || [])
        .filter((entry) =>
          entry.family === "IPv4" &&
          !entry.internal &&
          !ignored.test(name) &&
          !entry.address.startsWith("169.254.") &&
          !entry.address.startsWith("192.168.168.")
        )
        .map((entry) => ({ name, address: entry.address }))
    );
}

function resolvePackageFile(packageName, relativeFile) {
  const packageJson = require.resolve(`${packageName}/package.json`, { paths: [root] });
  return path.join(path.dirname(packageJson), relativeFile);
}

function runNode(scriptPath, args) {
  console.log(`\n> node ${path.relative(root, scriptPath)} ${args.join(" ")}`);
  execFileSync(process.execPath, [scriptPath, ...args], { cwd: root, stdio: "inherit", shell: false });
}

function runPrisma(args) {
  runNode(resolvePackageFile("prisma", path.join("build", "index.js")), args);
}

function runTsx(args) {
  runNode(resolvePackageFile("tsx", path.join("dist", "cli.cjs")), args);
}

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log("Created .env from .env.example");
}

const env = parseEnvFile(envPath);

if (isPlaceholder(env.DATABASE_URL)) {
  env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/spica_arena_os?schema=public";
}

if (isPlaceholder(env.JWT_SECRET)) {
  env.JWT_SECRET = randomSecret("zone-os-jwt");
}

if (isPlaceholder(env.REALTIME_INTERNAL_SECRET)) {
  env.REALTIME_INTERNAL_SECRET = randomSecret("zone-os-internal");
}

env.NEXT_PUBLIC_REALTIME_URL = env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:4001";
env.SPICA_API_BASE_URL = env.SPICA_API_BASE_URL || "http://localhost:3000";
env.REALTIME_PORT = env.REALTIME_PORT || "4001";
env.SPICA_DISCOVERY_PORT = env.SPICA_DISCOVERY_PORT || "41234";

const envOutput = Object.entries(env)
  .map(([key, value]) => `${key}=${quote(value)}`)
  .join("\n");

fs.writeFileSync(envPath, `${envOutput}\n`);

const lanAddresses = usableLanAddresses();
const primaryIp = lanAddresses[0]?.address;

console.log("\nSPICA Zone OS local runtime prepared.");
console.log(`Database URL: ${env.DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@")}`);
console.log(`Local Zone OS: http://localhost:3000/zone`);
console.log(`LAN Zone OS: ${primaryIp ? `http://${primaryIp}:3000/zone` : "No LAN IPv4 detected yet"}`);
console.log(`PC realtime URL: ${primaryIp ? `ws://${primaryIp}:${env.REALTIME_PORT}` : `ws://localhost:${env.REALTIME_PORT}`}`);

if (lanAddresses.length) {
  console.log("\nDetected LAN adapters:");
  for (const adapter of lanAddresses) {
    console.log(`- ${adapter.name}: ${adapter.address}`);
  }
}

if (shouldApplyDb) {
  runPrisma(["generate"]);
  runPrisma(["migrate", "deploy"]);
  runTsx([path.join("prisma", "seed.dev.ts")]);
} else {
  console.log("\nNext setup commands:");
  console.log("1. npm run check:env");
  console.log("2. npm run zone-os:setup:db");
  console.log("3. npm run realtime");
  console.log("4. npm run dev -- --hostname 0.0.0.0");
}
