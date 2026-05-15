import os from "node:os";
import { isLocalZoneRuntimeEnabled } from "@/lib/local-zone-runtime";

const ignoredAdapterPattern = /wsl|hyper-v|vethernet|vmware|virtualbox|docker|bluetooth|loopback|npcap/i;

function isUsableLanAddress(name: string, address: string) {
  if (ignoredAdapterPattern.test(name)) return false;
  if (address.startsWith("127.")) return false;
  if (address.startsWith("169.254.")) return false;
  if (address.startsWith("192.168.168.")) return false;
  return true;
}

export function getLocalLanAddresses() {
  return Object.entries(os.networkInterfaces())
    .flatMap(([name, entries]) =>
      (entries ?? [])
        .filter((entry) => entry.family === "IPv4" && !entry.internal && isUsableLanAddress(name, entry.address))
        .map((entry) => ({ name, address: entry.address }))
    );
}

export function getZoneOsRuntimeInfo() {
  const port = process.env.PORT || "3000";
  const realtimePort = process.env.REALTIME_PORT || "4001";
  const lanAddresses = getLocalLanAddresses();
  const primaryLanIp = lanAddresses[0]?.address ?? null;

  return {
    localDatabaseReady: isLocalZoneRuntimeEnabled(),
    localUrl: `http://localhost:${port}/zone`,
    lanUrl: primaryLanIp ? `http://${primaryLanIp}:${port}/zone` : null,
    realtimeUrl: primaryLanIp ? `ws://${primaryLanIp}:${realtimePort}` : `ws://localhost:${realtimePort}`,
    apiBaseUrl: primaryLanIp ? `http://${primaryLanIp}:${port}` : `http://localhost:${port}`,
    lanAddresses
  };
}
