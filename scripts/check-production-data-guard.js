const fs = require("node:fs");
const path = require("node:path");

const roots = ["app", "components", "context", "lib"];
const bannedPatterns = [
  /Ayan\s+Malik/i,
  /\bzone-a\b/i,
  /\bplayer-1\b/i,
  /Demo Player/i,
  /Galaxy Gaming Arena/i,
  /createMockSpicaState/i,
  /spica_balance:\s*10000/i,
  /balance:\s*10000/i
];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!extensions.has(path.extname(entry.name))) continue;

    const content = fs.readFileSync(fullPath, "utf8");

    for (const pattern of bannedPatterns) {
      if (pattern.test(content)) {
        failures.push(`${fullPath}: matched ${pattern}`);
      }
    }
  }
}

for (const root of roots) {
  walk(path.join(process.cwd(), root));
}

if (failures.length) {
  console.error("Production data guard failed. Demo identity/data leaked into production code:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Production data guard passed.");

