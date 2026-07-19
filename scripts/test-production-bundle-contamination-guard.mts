/**
 * Production bundle contamination guard (Production Foundation B2).
 * npm run test:production-bundle-contamination-guard
 *
 * By default, builds a NORMAL (non-fixture) production probe and scans every
 * COMPILED JS/CSS asset. With `--dist`, scans the existing canonical staging
 * artifact directly without rebuilding or bypassing its production guard.
 *
 * False-positive scope note: the marketplace demo layer (cars/dealers in
 * src/store.ts and src/services/cars) is currently frozen and intentionally present
 * in the normal bundle, so this guard does NOT flag those. It targets synthetic ADMIN
 * PII, admin seed identities, fixture-only markers, fixture project ids, and enabled
 * test-mode flags. Test/fixture SOURCE (scripts/*, src/fixture/*) is not bundled and
 * is therefore not scanned here.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const scanExistingDist = process.argv.includes("--dist");
const outDir = scanExistingDist
  ? path.join(root, "dist")
  : path.join(root, "dist-contamination-guard-probe");

function rmDir(p: string) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

console.log("=== production bundle contamination guard (no deploy) ===");

if (!scanExistingDist) {
  rmDir(outDir);
  const env = {
    ...process.env,
    VITE_NONGA_UI_FIXTURE: "false",
    SKIP_FIREBASE_PRODUCTION_GUARD: "true",
    NODE_ENV: "production",
  };
  const result = spawnSync(
    "npx",
    ["vite", "build", "--outDir", "dist-contamination-guard-probe"],
    { cwd: root, env, stdio: "inherit", shell: process.platform === "win32" }
  );
  if (result.status !== 0) {
    console.error("FAIL contamination-guard vite build");
    process.exit(result.status ?? 1);
  }
} else if (!fs.existsSync(outDir)) {
  console.error("FAIL canonical dist does not exist; run npm run build:staging:hosting first");
  process.exit(1);
}

const assetsDir = path.join(outDir, "assets");
const files = fs
  .readdirSync(assetsDir)
  .filter((f) => f.endsWith(".js") || f.endsWith(".css"));
const bundle = files
  .map((f) => fs.readFileSync(path.join(assetsDir, f), "utf8"))
  .join("\n");

// Markers that must be ABSENT from a production bundle.
const contaminationMarkers: Array<{ label: string; marker: string }> = [
  // Synthetic admin user PII (illustrative platform users).
  { label: "synthetic admin email (suradech_spam100)", marker: "suradech_spam100@gmail.com" },
  { label: "synthetic admin email (nathida.gold)", marker: "nathida.gold@gmail.com" },
  { label: "synthetic admin email (somjai_luxury)", marker: "somjai_luxury@nongbot.space" },
  { label: "synthetic admin email (siri_heart)", marker: "siri_heart@outlook.com" },
  { label: "synthetic admin email (varis.boon)", marker: "varis.boon@gmail.com" },
  // platformUsers / ticket / report seed identities.
  { label: "platformUsers seed id u-e102", marker: "u-e102" },
  { label: "platformUsers seed id u-e104", marker: "u-e104" },
  { label: "support ticket seed id t-701", marker: "t-701" },
  { label: "report seed id rep-201", marker: "rep-201" },
  // Fixture-only markers.
  { label: "fixture role selector", marker: "ui-fixture-role-selector" },
  { label: "fixture banner attr", marker: "data-nonga-ui-fixture" },
  { label: "fixture guest id", marker: "fixture-guest-001" },
  { label: "fixture car id", marker: "fx-car-001" },
  { label: "fixture owner id", marker: "fixture-dealer-001" },
  { label: "fixture dealer id", marker: "fx-dealer-001" },
  { label: "fixture dealer label", marker: "STAGING FICTIONAL DEALER 001" },
  { label: "fixture placeholder asset", marker: "/fixture/placeholder-car.svg" },
  { label: "fixture network guard installer", marker: "installFixtureNetworkGuard" },
  // Fixture project identifier must not ship in production.
  { label: "fixture project id nonga-staging-2026", marker: "nonga-staging-2026" },
  // Enabled test-mode flag.
  { label: "ui fixture flag enabled", marker: 'VITE_NONGA_UI_FIXTURE:"true"' },
  // Fixture isolation replaces the canonical font stack with this override.
  { label: "fixture system-font override", marker: "--font-sans:ui-sans-serif,system-ui,sans-serif" },
];

let fail = 0;
for (const { label, marker } of contaminationMarkers) {
  if (bundle.includes(marker)) {
    console.log("FAIL production bundle contains:", label, `(${marker})`);
    fail += 1;
  } else {
    console.log("PASS production bundle clean of:", label);
  }
}

// Fixture-named assets must not be emitted in a normal build.
for (const file of files) {
  if (/fixture|syntheticCars/i.test(file)) {
    console.log("FAIL normal build emitted fixture-named asset:", file);
    fail += 1;
  }
}

if (!scanExistingDist) rmDir(outDir);

if (fail > 0) {
  console.error(`\n=== contamination guard: ${fail} contamination hit(s) ===`);
  process.exit(1);
}
console.log(
  `\nPASS production bundle contamination guard (${scanExistingDist ? "canonical dist" : "probe"})`
);
