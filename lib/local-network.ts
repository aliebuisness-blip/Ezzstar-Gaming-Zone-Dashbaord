import os from "node:os";

export const DISCOVERY_PORT = Number(process.env.SPICA_DISCOVERY_PORT ?? 41234);
export const DISCOVERY_QUERY = "SPICA_DISCOVER_V1";
export const DISCOVERY_RESPONSE = "SPICA_HOST_V1";

export type DiscoveryManifest = {
  type: typeof DISCOVERY_RESPONSE;
  product: "SPICA_ARENA_OS";
  hostName: string;
  hostIp: string;
  realtimePort: number;
  wsUrl: string;
  socketIoUrl: string;
  pairingUrl: string;
  statusUrl: string;
  version: string;
};

export function getPrimaryLanAddress() {
  const interfaces = os.networkInterfaces();

  for (const addresses of Object.values(interfaces)) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }

  return "127.0.0.1";
}

export function createDiscoveryManifest(port: number, hostIp = getPrimaryLanAddress()): DiscoveryManifest {
  const baseHttpUrl = `http://${hostIp}:${port}`;

  return {
    type: DISCOVERY_RESPONSE,
    product: "SPICA_ARENA_OS",
    hostName: "spica-host.local",
    hostIp,
    realtimePort: port,
    wsUrl: `ws://${hostIp}:${port}`,
    socketIoUrl: baseHttpUrl,
    pairingUrl: `${baseHttpUrl}/pairing/request`,
    statusUrl: `${baseHttpUrl}/pairing/status`,
    version: "1"
  };
}
