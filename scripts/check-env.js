const fs = require("node:fs");
const path = require("node:path");

const requiredKeys = ["DATABASE_URL", "JWT_SECRET", "NEXT_PUBLIC_REALTIME_URL", "REALTIME_PORT", "REALTIME_INTERNAL_SECRET"];
const databaseUrlPattern = /^postgresql:\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+\/[^?\s]+(\?schema=public)$/;

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { values: {}, keys: [] };
  }

  const keys = [];
  const values = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return acc;
      }

      const separator = trimmed.indexOf("=");

      if (separator === -1) {
        return acc;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "");

      keys.push(key);
      acc[key] = value;
      return acc;
    }, {});

  return { values, keys };
}

const root = process.cwd();
const envPath = path.join(root, ".env");
const envExamplePath = path.join(root, ".env.example");

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log("Created .env from .env.example");
}

const parsed = parseEnvFile(envPath);
const envFileValues = parsed.values;
const env = { ...envFileValues, ...process.env };
const missing = requiredKeys.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (!databaseUrlPattern.test(env.DATABASE_URL)) {
  console.error("DATABASE_URL must match: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public");
  process.exit(1);
}

const duplicateKeys = parsed.keys.filter((key, index, keys) => keys.indexOf(key) !== index);

if (duplicateKeys.length > 0) {
  console.error(`Duplicate environment variables found: ${[...new Set(duplicateKeys)].join(", ")}`);
  process.exit(1);
}

console.log("Environment validation passed.");
console.log("Connected environment target:", env.DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@"));
console.log("JWT system initialized.");
console.log(`LAN discovery port: ${env.SPICA_DISCOVERY_PORT || "41234"}`);
