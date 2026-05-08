import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type RuntimeEnv = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  NEXT_PUBLIC_REALTIME_URL: string;
  REALTIME_PORT: string;
  REALTIME_INTERNAL_SECRET: string;
};

const databaseUrlPattern = /^postgresql:\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+\/[^?\s]+(\?schema=public)$/;
let envLoaded = false;
const globalForEnv = globalThis as unknown as {
  jwtLogged?: boolean;
};

function loadDotEnv() {
  if (envLoaded) {
    return;
  }

  envLoaded = true;
  const envPath = join(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readEnvValue(key: keyof RuntimeEnv): string {
  loadDotEnv();
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is missing. Add it to .env. Example: see .env.example`);
  }

  return value;
}

export function validateRuntimeEnv(): RuntimeEnv {
  const env = {
    DATABASE_URL: readEnvValue("DATABASE_URL"),
    JWT_SECRET: readEnvValue("JWT_SECRET"),
    NEXT_PUBLIC_REALTIME_URL: readEnvValue("NEXT_PUBLIC_REALTIME_URL"),
    REALTIME_PORT: readEnvValue("REALTIME_PORT"),
    REALTIME_INTERNAL_SECRET: readEnvValue("REALTIME_INTERNAL_SECRET")
  };

  if (!databaseUrlPattern.test(env.DATABASE_URL)) {
    throw new Error("DATABASE_URL must match: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public");
  }

  return env;
}

export function getJwtSecret(): string {
  const { JWT_SECRET } = validateRuntimeEnv();

  if (!globalForEnv.jwtLogged) {
    globalForEnv.jwtLogged = true;
    console.log("JWT system initialized");
  }

  return JWT_SECRET;
}

export function getRealtimePort(): number {
  const { REALTIME_PORT } = validateRuntimeEnv();
  const port = Number(REALTIME_PORT);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("REALTIME_PORT must be a positive integer.");
  }

  return port;
}
