import os from "node:os";
import { readOptionalEnvValue } from "./env";

export const DISCOVERY_PORT = Number(process.env.SPICA_DISCOVERY_PORT ?? 41234);
export const DISCOVERY_QUERY = "SPICA_DISCOVER_V1";
export const DISCOVERY_RESPONSE = "SPICA_HOST_V1";

export type DiscoveryManifest = {
  type: typeof DISCOVERY_RESPONSE;
  product: "SPICA_ARENA_OS";
  hostName: string;
  hostIp: string;
  hostUrl: string;
  apiBaseUrl: string;
  realtimePort: number;
  wsUrl: string;
  socketIoUrl: string;
  pairingUrl: string;
  statusUrl: string;
  version: string;
};

type CandidateAddress = {
  adapterName: string;
  address: string;
  ignoredReason?: string;
};

const virtualAdapterPatterns = [
  /wsl/i,
  /hyper-v/i,
  /hyperv/i,
  /vmware/i,
  /virtualbox/i,
  /vbox/i,
  /docker/i,
  /bluetooth/i,
  /loopback/i,
  /npcap/i,
  /tap/i,
  /vethernet/i
];

function normalizeIp(ip?: string) {
  return ip?.replace(/^::ffff:/, "");
}

function sameClassCSubnet(a: string, b: string) {
  const left = a.split(".");
  const right = b.split(".");
  return left.length === 4 && right.length === 4 && left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

function isPrivateIpv4(ip: string) {
  return /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}

function ignoredReason(adapterName: string, address: string) {
  if (virtualAdapterPatterns.some((pattern) => pattern.test(adapterName))) {
    return "virtual adapter";
  }

  if (address.startsWith("127.") || address.startsWith("169.254.")) {
    return "non-routable address";
  }

  if (address.startsWith("192.168.168.")) {
    return "known virtual adapter subnet";
  }

  if (!isPrivateIpv4(address)) {
    return "not private LAN IPv4";
  }

  return undefined;
}

function getCandidateAddresses(): CandidateAddress[] {
  const interfaces = os.networkInterfaces();
  const candidates: CandidateAddress[] = [];

  for (const [adapterName, addresses] of Object.entries(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        candidates.push({
          adapterName,
          address: address.address,
          ignoredReason: ignoredReason(adapterName, address.address)
        });
      }
    }
  }

  return candidates;
}

export function selectReachableHostIp(clientIp?: string) {
  const override = process.env.SPICA_HOST_IP?.trim();

  if (override) {
    return {
      hostIp: override,
      ignoredAdapters: [],
      source: "SPICA_HOST_IP override"
    };
  }

  const normalizedClientIp = normalizeIp(clientIp);
  const candidates = getCandidateAddresses();
  const usable = candidates.filter((candidate) => !candidate.ignoredReason);
  const subnetMatch = normalizedClientIp
    ? usable.find((candidate) => sameClassCSubnet(candidate.address, normalizedClientIp))
    : undefined;
  const selected = subnetMatch ?? usable[0];

  return {
    hostIp: selected?.address ?? "127.0.0.1",
    ignoredAdapters: candidates
      .filter((candidate) => candidate.ignoredReason)
      .map((candidate) => `${candidate.adapterName} ${candidate.address} (${candidate.ignoredReason})`),
    source: subnetMatch ? `same subnet as ${normalizedClientIp}` : selected ? "first reachable LAN adapter" : "loopback fallback"
  };
}

export function createDiscoveryManifest(port: number, hostIp = selectReachableHostIp().hostIp): DiscoveryManifest {
  const baseHttpUrl = `http://${hostIp}:${port}`;
  const apiBaseUrl =
    readOptionalEnvValue("SPICA_API_BASE_URL") ??
    readOptionalEnvValue("NEXT_PUBLIC_APP_URL") ??
    readOptionalEnvValue("NEXT_PUBLIC_DASHBOARD_URL") ??
    baseHttpUrl;

  return {
    type: DISCOVERY_RESPONSE,
    product: "SPICA_ARENA_OS",
    hostName: "spica-host.local",
    hostIp,
    hostUrl: baseHttpUrl,
    apiBaseUrl,
    realtimePort: port,
    wsUrl: `ws://${hostIp}:${port}`,
    socketIoUrl: baseHttpUrl,
    pairingUrl: `${baseHttpUrl}/pairing/request`,
    statusUrl: `${baseHttpUrl}/pairing/status`,
    version: "1"
  };
}
