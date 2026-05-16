import fs from "node:fs";
import path from "node:path";

type InstallerProduct = {
  id: "zone-os" | "pc-client";
  productName: string;
  version: string;
  localFileName: string;
  localPath: string;
  envUrlKeys: string[];
  fileSize: string;
  updatedAt: string;
  releaseNotes: string[];
};

export type InstallerDownload = InstallerProduct & {
  downloadUrl: string | null;
  isAvailable: boolean;
  source: "local-public" | "external" | "missing";
};

const products: InstallerProduct[] = [
  {
    id: "zone-os",
    productName: "SPICA Zone OS",
    version: "0.1.0",
    localFileName: "SPICA-Zone-OS-Setup.exe",
    localPath: "/downloads/zone-os/SPICA-Zone-OS-Setup.exe",
    envUrlKeys: ["SPICA_ZONE_OS_DOWNLOAD_URL", "NEXT_PUBLIC_SPICA_ZONE_OS_DOWNLOAD_URL"],
    fileSize: "Installer package",
    updatedAt: "2026-05-16",
    releaseNotes: [
      "Local operator shell for Zone OS.",
      "Starts local web runtime and realtime services.",
      "Prepares local database setup and LAN operator access."
    ]
  },
  {
    id: "pc-client",
    productName: "SPICA PC Client",
    version: "0.1.0",
    localFileName: "SPICA-PC-Client-Setup.exe",
    localPath: "/downloads/pc-client/SPICA-PC-Client-Setup.exe",
    envUrlKeys: ["SPICA_PC_CLIENT_DOWNLOAD_URL", "NEXT_PUBLIC_SPICA_PC_CLIENT_DOWNLOAD_URL"],
    fileSize: "Installer package",
    updatedAt: "2026-05-16",
    releaseNotes: [
      "Windows kiosk runtime for gaming PCs.",
      "Pairs with Zone OS over local network.",
      "Receives session lock, unlock, and timer commands."
    ]
  }
];

function getPublicFilePath(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

function getExternalUrl(keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value?.trim()) return value.trim();
  }
  return null;
}

export function getInstallerDownloads(): InstallerDownload[] {
  return products.map((product) => {
    const externalUrl = getExternalUrl(product.envUrlKeys);
    if (externalUrl) {
      return {
        ...product,
        downloadUrl: externalUrl,
        isAvailable: true,
        source: "external"
      };
    }

    const localFilePath = getPublicFilePath(product.localPath);
    if (fs.existsSync(localFilePath)) {
      return {
        ...product,
        downloadUrl: product.localPath,
        isAvailable: true,
        source: "local-public"
      };
    }

    return {
      ...product,
      downloadUrl: null,
      isAvailable: false,
      source: "missing"
    };
  });
}

