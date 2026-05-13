const buckets = [
  { id: "avatars", name: "avatars", public: true, file_size_limit: 2 * 1024 * 1024, allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  { id: "zone-media", name: "zone-media", public: true, file_size_limit: 5 * 1024 * 1024, allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  { id: "announcements", name: "announcements", public: true, file_size_limit: 8 * 1024 * 1024, allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"] },
  { id: "listing-requests", name: "listing-requests", public: false, file_size_limit: 8 * 1024 * 1024, allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] }
];

const fs = require("node:fs");
const path = require("node:path");

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function readEnv(key) {
  return process.env[key] || "";
}

async function main() {
  loadDotEnv();
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    console.error("Supabase env missing. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before creating buckets.");
    process.exit(1);
  }

  for (const bucket of buckets) {
    const response = await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(bucket)
    });

    if (response.ok || response.status === 409) {
      console.log(`${response.status === 409 ? "Bucket already exists" : "Bucket created"}: ${bucket.id}`);
      continue;
    }

    console.error(`Could not create bucket ${bucket.id}: ${await response.text()}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
