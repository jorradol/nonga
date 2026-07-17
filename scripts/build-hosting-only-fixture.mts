import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  FIXTURE_FLAG_ENV,
  FIXTURE_PROJECT_ID,
  FIXTURE_PUBLIC_URL,
  PRODUCTION_CLOUD_RUN_SERVICE,
  PRODUCTION_PROJECT_ID,
  PRODUCTION_PUBLIC_HOSTNAME,
  assertFixtureBuildEnv,
  assertHostingOnlyConfig,
  assertNoProductionIdentifiers,
  resolveHostingOnlyFixtureTarget,
} from "./hosting-only-fixture-guard-lib.mjs";

function loadDotEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function mergeEnv(
  ...sources: Array<Record<string, string | undefined>>
): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === "string" && value.trim()) {
        merged[key] = value.trim();
      }
    }
  }
  return merged;
}

function verifyDistBundle(): void {
  const assetsDir = path.join(process.cwd(), "dist", "assets");
  if (!fs.existsSync(assetsDir)) {
    throw new Error("dist/assets not found after vite build");
  }
  const assetFiles = fs
    .readdirSync(assetsDir)
    .filter((name) => name.endsWith(".js") || name.endsWith(".css"));
  if (assetFiles.length === 0) {
    throw new Error("no js/css assets in dist/assets");
  }

  const forbiddenExact = [
    PRODUCTION_PROJECT_ID,
    PRODUCTION_PUBLIC_HOSTNAME,
    `https://${PRODUCTION_PUBLIC_HOSTNAME}`,
    "images.unsplash.com",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "api.dicebear.com",
    "firebasestorage.googleapis.com",
    "identitytoolkit.googleapis.com",
    "securetoken.googleapis.com",
    "firestore.googleapis.com",
    "firebaseinstallations.googleapis.com",
    "generativelanguage.googleapis.com",
    "nonga-staging.a.run.app",
    `${PRODUCTION_PROJECT_ID}.firebaseapp.com`,
    `${PRODUCTION_PROJECT_ID}.web.app`,
    `${PRODUCTION_PROJECT_ID}.firebasestorage.app`,
  ];
  const forbiddenRegex = [
    /nonga-staging\.a\.run\.app/i,
    /["']nonga-staging["']/,
    /serviceId["']?\s*:\s*["']nonga-staging["']/i,
    /[a-z0-9-]+\.a\.run\.app/i,
    /https?:\/\/(?!nonga-staging-2026\.web\.app)[a-z0-9-]+\.firebaseapp\.com/i,
    /https?:\/\/(?!nonga-staging-2026\.web\.app)[a-z0-9-]+\.web\.app/i,
    /https?:\/\/[^/"']+\.appspot\.com/i,
    /https?:\/\/firebasestorage\.googleapis\.com/i,
    /VITE_FIREBASE_PROJECT_ID:"nonga-ce93c"/,
    /VITE_FIREBASE_(?:AUTH_DOMAIN|PROJECT_ID|STORAGE_BUCKET|MESSAGING_SENDER_ID|APP_ID):"(?!")/i,
    /(?:PUBLIC_NONGA_BASE_URL|VITE_NONGA_PUBLIC_BASE_URL):"https?:\/\/(?!nonga-staging-2026\.web\.app)/i,
    /(?:DEALER_API_TOKEN|ADMIN_API_TOKEN):"(?!")/i,
    /VITE_FIREBASE_API_KEY:"(?!$)[^"]+"/,
    /AIza[0-9A-Za-z_-]{20,}/, // raw Google API key shape — report presence only
    /(?:Bearer\s+|sk-)[0-9A-Za-z._-]{20,}/i,
  ];

  const required = [
    /VITE_NONGA_UI_FIXTURE:"true"/,
    /nonga-staging-2026\.web\.app/,
    /ข้อมูลสมมติสำหรับตรวจสอบหน้าจอ/,
    /ui-fixture-role-selector|FixtureQaChrome|fixture-guest-001/,
    /\/fixture\/placeholder-car\.svg/,
  ];

  const allContent = assetFiles
    .map((file) => fs.readFileSync(path.join(assetsDir, file), "utf8"))
    .join("\n");

  for (const file of assetFiles) {
    const content = fs.readFileSync(path.join(assetsDir, file), "utf8");
    for (const marker of forbiddenExact) {
      if (content.includes(marker)) {
        throw new Error(`dist/assets/${file} contains forbidden marker (${marker})`);
      }
    }
    for (const pattern of forbiddenRegex) {
      if (pattern.test(content)) {
        throw new Error(`dist/assets/${file} contains forbidden pattern (${pattern})`);
      }
    }
  }

  for (const pattern of required) {
    if (!pattern.test(allContent)) {
      throw new Error(`fixture dist bundle missing required marker (${pattern})`);
    }
  }

  // Firebase SDK init strings should not appear once stubs are aliased.
  if (/initializeApp\(/.test(allContent) && /getFirestore\(/.test(allContent) && /firebaseapp\.com/.test(allContent)) {
    throw new Error("fixture dist appears to retain live Firebase client initialization surface");
  }

  if (!fs.existsSync(path.join(process.cwd(), "dist", "fixture", "placeholder-car.svg"))) {
    throw new Error("dist/fixture/placeholder-car.svg missing");
  }
  console.log(`PASS dist fixture bundle verified (${assetFiles.length} js/css asset file(s))`);
}

console.log("=== Nong A Hosting-only UI fixture build (Gate D1) ===");

const envFile =
  process.env.NONGA_HOSTING_ONLY_FIXTURE_ENV_FILE || ".env.hosting-only-fixture";
const fromFile = loadDotEnvFile(path.resolve(envFile));

const defaults: Record<string, string> = {
  [FIXTURE_FLAG_ENV]: "true",
  VITE_NONGA_PUBLIC_BASE_URL: FIXTURE_PUBLIC_URL,
  NONGA_HOSTING_ONLY_FIXTURE_PROJECT_ID: FIXTURE_PROJECT_ID,
  NONGA_HOSTING_ONLY_FIXTURE_HOSTING_SITE: FIXTURE_PROJECT_ID,
  NONGA_HOSTING_ONLY_FIXTURE_PUBLIC_URL: FIXTURE_PUBLIC_URL,
  VITE_NONGA_PUBLIC_SIGNUP_ENABLED: "false",
  VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ENABLED: "false",
  VITE_NONGA_OWNER_GEMINI_ONE_RUN_HELPER_ENABLED: "false",
  VITE_NONGA_BUYER_FRIENDLY_COPY_PREVIEW_ENABLED: "false",
};

const processOverrides = Object.fromEntries(
  [
    FIXTURE_FLAG_ENV,
    "VITE_NONGA_PUBLIC_BASE_URL",
    "NONGA_HOSTING_ONLY_FIXTURE_PROJECT_ID",
    "NONGA_HOSTING_ONLY_FIXTURE_HOSTING_SITE",
    "NONGA_HOSTING_ONLY_FIXTURE_PUBLIC_URL",
    "VITE_NONGA_PUBLIC_SIGNUP_ENABLED",
    "VITE_NONGA_DEALER_API_TOKEN",
    "VITE_NONGA_ADMIN_API_TOKEN",
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ENABLED",
    "VITE_NONGA_OWNER_GEMINI_ONE_RUN_HELPER_ENABLED",
    "VITE_NONGA_BUYER_FRIENDLY_COPY_PREVIEW_ENABLED",
  ]
    .map((key) => [key, process.env[key]])
    .filter(([, value]) => typeof value === "string")
) as Record<string, string>;

const env = mergeEnv(defaults, fromFile, processOverrides);
const target = resolveHostingOnlyFixtureTarget(env, "hosting-only-fixture-build");
assertFixtureBuildEnv(env, target);

const hostingConfig = JSON.parse(
  fs.readFileSync(path.resolve("firebase.hosting-only-fixture.json"), "utf8")
);
assertHostingOnlyConfig(hostingConfig);
assertNoProductionIdentifiers(hostingConfig, "firebase.hosting-only-fixture.json");

console.log(`target project/site: ${target.projectId} / ${target.hostingSite}`);
console.log(`public URL: ${target.publicUrl}`);
console.log(`env source: ${Object.keys(fromFile).length > 0 ? envFile : "script defaults"}`);

const childEnv: NodeJS.ProcessEnv = {
  ...process.env,
  ...env,
  NODE_ENV: "production",
  SKIP_FIREBASE_PRODUCTION_GUARD: "true",
  VITE_NONGA_DEALER_API_TOKEN: "",
  VITE_NONGA_ADMIN_API_TOKEN: "",
  VITE_FIREBASE_API_KEY: "",
  VITE_FIREBASE_AUTH_DOMAIN: "",
  VITE_FIREBASE_PROJECT_ID: "",
  VITE_FIREBASE_STORAGE_BUCKET: "",
  VITE_FIREBASE_MESSAGING_SENDER_ID: "",
  VITE_FIREBASE_APP_ID: "",
  VITE_FIREBASE_MEASUREMENT_ID: "",
};

const result = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  env: childEnv,
  shell: process.platform === "win32",
});
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

verifyDistBundle();

const provenanceResult = spawnSync("node", ["scripts/write-build-provenance.mjs"], {
  stdio: "inherit",
  env: childEnv,
  shell: process.platform === "win32",
});
if (provenanceResult.status !== 0) {
  process.exit(provenanceResult.status ?? 1);
}

console.log(
  "PASS Hosting-only UI fixture build complete (local only — deploy NOT authorized in Gate D1)"
);
