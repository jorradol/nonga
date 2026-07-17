import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist-normal-nonreg-probe");

function rmDir(p: string) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

console.log("=== normal-build non-regression probe (no deploy) ===");

rmDir(outDir);

const env = {
  ...process.env,
  VITE_NONGA_UI_FIXTURE: "",
  SKIP_FIREBASE_PRODUCTION_GUARD: "true",
  NODE_ENV: "production",
};

const result = spawnSync(
  "npx",
  ["vite", "build", "--outDir", "dist-normal-nonreg-probe"],
  {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  }
);

if (result.status !== 0) {
  console.error("FAIL normal probe vite build");
  process.exit(result.status ?? 1);
}

const assetsDir = path.join(outDir, "assets");
const files = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".js") || f.endsWith(".css"));
const all = files.map((f) => fs.readFileSync(path.join(assetsDir, f), "utf8")).join("\n");

const forbiddenFixtureMarkers = [
  "ui-fixture-role-selector",
  "ui-fixture-banner",
  "data-nonga-ui-fixture",
  "VITE_NONGA_UI_FIXTURE:\"true\"",
  "fixture-guest-001",
  "fx-car-001",
  "STAGING FICTIONAL DEALER 001",
  "/fixture/placeholder-car.svg",
  "__nongaFixtureFetchPatched",
  "installFixtureNetworkGuard",
];

let fail = 0;
for (const marker of forbiddenFixtureMarkers) {
  if (all.includes(marker)) {
    console.log("FAIL normal bundle contains fixture marker:", marker);
    fail += 1;
  } else {
    console.log("PASS normal bundle lacks fixture marker:", marker);
  }
}

for (const file of files) {
  if (/fixture|syntheticCars/i.test(file)) {
    console.log("FAIL normal build emitted fixture-named asset:", file);
    fail += 1;
  }
}

if (all.includes('VITE_NONGA_UI_FIXTURE:"true"')) {
  console.log("FAIL fixture flag true in normal probe");
  fail += 1;
} else {
  console.log("PASS fixture flag not enabled in normal probe");
}

// Cleanup probe output so it is not mistaken for fixture dist.
rmDir(outDir);

if (fail > 0) {
  process.exit(1);
}
console.log("PASS normal-build non-regression probe");
