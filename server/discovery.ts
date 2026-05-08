import dgram from "node:dgram";
import { createDiscoveryManifest, DISCOVERY_PORT, DISCOVERY_QUERY } from "../lib/local-network";

export function startDiscoveryService(realtimePort: number) {
  const socket = dgram.createSocket("udp4");
  const manifest = createDiscoveryManifest(realtimePort);

  socket.on("message", (message, remote) => {
    if (message.toString().trim() !== DISCOVERY_QUERY) {
      return;
    }

    const response = Buffer.from(JSON.stringify(manifest));
    socket.send(response, remote.port, remote.address);
    console.log(`Discovery response sent to ${remote.address}:${remote.port}`);
  });

  socket.on("error", (error) => {
    console.warn(`Discovery service warning: ${error.message}`);
  });

  socket.bind(DISCOVERY_PORT, () => {
    socket.setBroadcast(true);
    console.log(`SPICA discovery service running on UDP ${DISCOVERY_PORT}`);
    console.log(`Zone Host advertised as ${manifest.hostName} (${manifest.hostIp}:${realtimePort})`);
  });

  return () => socket.close();
}
