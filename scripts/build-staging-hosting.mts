import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };
import {
  detectFirebaseClientConfig,
  isFirebasePlaceholderValue,
  resolveFirebaseClientConfig,
  type FirebaseWebConfigEnv,
} from "../src/lib/firebase/firebaseConfigGuard.ts";

const REQUIRED_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;
const STAGING_OWNER_HELPER_FLAGS = [
  "VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ENABLED",
  "VITE_NONGA_OWNER_GEMINI_ONE_RUN_HELPER_ENABLED",
] as const;

function redactEnvReport(env: Record<string, string | undefined>): void {
  for (const key of REQUIRED_ENV_KEYS) {
    const value = String(env[key] ?? "").trim();
    if (!value) {
      console.log(`${key}: missing`);
      continue;
    }
    if (key === "VITE_FIREBASE_API_KEY") {
      console.log(
        `${key}: present=true startsWith=${value.slice(0, 8)}... len=${value.length} placeholder=${isFirebasePlaceholderValue(value)}`
      );
      continue;
    }
    if (key === "VITE_FIREBASE_APP_ID") {
      console.log(`${key}: present=true len=${value.length} placeholder=${isFirebasePlaceholderValue(value)}`);
      continue;
    }
    console.log(`${key}: present=true value=${value} placeholder=${isFirebasePlaceholderValue(value)}`);
  }
  const measurement = String(env.VITE_FIREBASE_MEASUREMENT_ID ?? "").trim();
  console.log(
    `VITE_FIREBASE_MEASUREMENT_ID: ${measurement ? `present=true len=${measurement.length}` : "optional-missing"}`
  );
  console.log(
    `VITE_NONGA_PUBLIC_SIGNUP_ENABLED: ${String(env.VITE_NONGA_PUBLIC_SIGNUP_ENABLED ?? "").trim() || "missing"}`
  );
  for (const key of STAGING_OWNER_HELPER_FLAGS) {
    const value = String(env[key] ?? "").trim().toLowerCase();
    console.log(`${key}: ${value === "true" ? "true" : value || "missing"}`);
  }
}

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

function loadFromCloudBuild(buildId: string): Record<string, string> {
  const raw = execSync(
    `gcloud builds describe ${buildId} --project=nonga-ce93c --format=json`,
    { encoding: "utf8" }
  );
  const subs = JSON.parse(raw).substitutions || {};
  return {
    VITE_FIREBASE_API_KEY: subs._VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: subs._VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: subs._VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: subs._VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: subs._VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: subs._VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MEASUREMENT_ID: subs._VITE_FIREBASE_MEASUREMENT_ID,
    VITE_NONGA_PUBLIC_SIGNUP_ENABLED: "false",
    VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ENABLED: "true",
    VITE_NONGA_OWNER_GEMINI_ONE_RUN_HELPER_ENABLED: "true",
  };
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

function assertStagingBuildEnv(env: Record<string, string>): FirebaseWebConfigEnv {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !String(env[key] ?? "").trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing staging Vite Firebase env: ${missing.join(", ")}. ` +
        "Create .env.staging (gitignored) or set NONGA_STAGING_CLOUD_BUILD_ID to a build with real _VITE_FIREBASE_* substitutions."
    );
  }
  if (env.VITE_NONGA_PUBLIC_SIGNUP_ENABLED !== "false") {
    throw new Error("VITE_NONGA_PUBLIC_SIGNUP_ENABLED must be false for staging hosting builds");
  }
  if (env.VITE_NONGA_DEALER_API_TOKEN || env.VITE_NONGA_ADMIN_API_TOKEN) {
    throw new Error(
      "VITE_NONGA_DEALER_API_TOKEN and VITE_NONGA_ADMIN_API_TOKEN must be blank for staging Firebase Auth builds"
    );
  }
  if (env.VITE_FIREBASE_PROJECT_ID !== "nonga-ce93c") {
    throw new Error(
      `VITE_FIREBASE_PROJECT_ID must be nonga-ce93c (got ${env.VITE_FIREBASE_PROJECT_ID})`
    );
  }
  for (const key of STAGING_OWNER_HELPER_FLAGS) {
    if (String(env[key] ?? "").trim().toLowerCase() !== "true") {
      throw new Error(`${key} must be true for staging owner-helper hosting builds`);
    }
  }

  const viteEnv: FirebaseWebConfigEnv = {
    VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MEASUREMENT_ID: env.VITE_FIREBASE_MEASUREMENT_ID,
  };
  const resolved = resolveFirebaseClientConfig(firebaseConfig, viteEnv);
  const report = detectFirebaseClientConfig(resolved, {
    dev: false,
    prod: true,
    betaToken: false,
  });
  if (report.mode !== "firebase-auth") {
    throw new Error(
      `Staging hosting build blocked: Firebase client mode=${report.mode}; ${report.warnings.join("; ")}`
    );
  }
  return viteEnv;
}

function verifyDistBundle(): void {
  const assetsDir = path.join(process.cwd(), "dist", "assets");
  if (!fs.existsSync(assetsDir)) {
    throw new Error("dist/assets not found after vite build");
  }
  const jsFiles = fs
    .readdirSync(assetsDir)
    .filter((name) => name.endsWith(".js"));
  const forbidden = [
    /signInWithPassword\?key=fake/i,
    /identitytoolkit\.googleapis\.com[^"']*key=fake/i,
    /VITE_FIREBASE_API_KEY:"fake/i,
    /VITE_FIREBASE_PROJECT_ID:"fake"/i,
  ];
  const required = [
    /VITE_FIREBASE_PROJECT_ID:"nonga-ce93c"/,
    /VITE_FIREBASE_AUTH_DOMAIN:"nonga-ce93c\.firebaseapp\.com"/,
    /VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ENABLED:"true"/,
    /VITE_NONGA_OWNER_GEMINI_ONE_RUN_HELPER_ENABLED:"true"/,
  ];
  for (const file of jsFiles) {
    const content = fs.readFileSync(path.join(assetsDir, file), "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(content)) {
        throw new Error(
          `dist/assets/${file} still contains active placeholder Firebase config (${pattern})`
        );
      }
    }
    for (const pattern of required) {
      if (!pattern.test(content)) {
        throw new Error(`dist/assets/${file} missing inlined staging Firebase env (${pattern})`);
      }
    }
  }
  console.log(`PASS dist bundle verified (${jsFiles.length} js asset file(s))`);
}

console.log("=== Nong A staging hosting build ===");

const envFile = process.env.NONGA_STAGING_ENV_FILE || ".env.staging";
const buildId =
  process.env.NONGA_STAGING_CLOUD_BUILD_ID || "3ad33182-1fcd-43af-84fa-7e0dab314675";

const fromFile = loadDotEnvFile(path.resolve(envFile));
const fromCloud =
  Object.keys(fromFile).length === 0 ? loadFromCloudBuild(buildId) : {};
const processFirebaseEnv = Object.fromEntries(
  [
    ...REQUIRED_ENV_KEYS,
    ...STAGING_OWNER_HELPER_FLAGS,
    "VITE_FIREBASE_MEASUREMENT_ID",
    "VITE_NONGA_PUBLIC_SIGNUP_ENABLED",
    "VITE_NONGA_DEALER_API_TOKEN",
    "VITE_NONGA_ADMIN_API_TOKEN",
  ]
    .map((key) => [key, process.env[key]])
    .filter(([, value]) => typeof value === "string" && value.trim())
) as Record<string, string>;
const env = mergeEnv(processFirebaseEnv, fromCloud, fromFile);

console.log(`env source: ${Object.keys(fromFile).length > 0 ? envFile : `cloud build ${buildId}`}`);
redactEnvReport(env);
assertStagingBuildEnv(env);

const childEnv: NodeJS.ProcessEnv = {
  ...process.env,
  ...env,
  NODE_ENV: "production",
  VITE_NONGA_DEALER_API_TOKEN: "",
  VITE_NONGA_ADMIN_API_TOKEN: "",
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
console.log("PASS staging hosting build complete (vite only; deploy with firebase deploy --only hosting)");
