import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };
import {
  detectFirebaseClientConfig,
  isFirebasePlaceholderValue,
  resolveFirebaseClientConfig,
  type FirebaseWebConfigEnv,
} from "../src/lib/firebase/firebaseConfigGuard.ts";
import {
  assertIsolatedTarget,
  assertNoProductionIdentifiers,
  PRODUCTION_PROJECT_ID,
  resolveExplicitIsolatedTarget,
} from "./isolated-staging-guard-lib.mjs";

const REQUIRED_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const ISOLATED_OWNER_HELPER_FLAGS = [
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
      console.log(`${key}: present=true redacted=true placeholder=${isFirebasePlaceholderValue(value)}`);
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
  for (const key of ISOLATED_OWNER_HELPER_FLAGS) {
    const value = String(env[key] ?? "").trim().toLowerCase();
    console.log(`${key}: ${value || "missing (defaults OFF for isolated staging)"}`);
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

function assertIsolatedStagingBuildEnv(
  env: Record<string, string>,
  target: Record<string, string>
): FirebaseWebConfigEnv {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !String(env[key] ?? "").trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing isolated staging Vite Firebase env: ${missing.join(", ")}. ` +
        "Create .env.isolated-staging (gitignored) with staging project Web SDK config only."
    );
  }

  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  assertIsolatedTarget(target, "isolated-staging-hosting-build");
  assertNoProductionIdentifiers(env, "isolated-staging-hosting-build");
  if (projectId !== target.projectId) {
    throw new Error("VITE_FIREBASE_PROJECT_ID must match explicit isolated target");
  }

  if (env.VITE_NONGA_PUBLIC_SIGNUP_ENABLED !== "false") {
    throw new Error("VITE_NONGA_PUBLIC_SIGNUP_ENABLED must be false for isolated staging builds");
  }
  if (env.VITE_NONGA_DEALER_API_TOKEN || env.VITE_NONGA_ADMIN_API_TOKEN) {
    throw new Error(
      "VITE_NONGA_DEALER_API_TOKEN and VITE_NONGA_ADMIN_API_TOKEN must be blank for isolated staging Auth builds"
    );
  }

  const expectedProjectId = target.projectId;
  const expectedAuthDomain = `${expectedProjectId}.firebaseapp.com`;
  const expectedStorageBucket = target.storageBucket;
  if (env.VITE_FIREBASE_AUTH_DOMAIN !== expectedAuthDomain) {
    throw new Error(
      `VITE_FIREBASE_AUTH_DOMAIN must be ${expectedAuthDomain} (got ${env.VITE_FIREBASE_AUTH_DOMAIN})`
    );
  }
  if (env.VITE_FIREBASE_STORAGE_BUCKET !== expectedStorageBucket) {
    throw new Error(
      `VITE_FIREBASE_STORAGE_BUCKET must be ${expectedStorageBucket} (got ${env.VITE_FIREBASE_STORAGE_BUCKET})`
    );
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
      `Isolated staging hosting build blocked: Firebase client mode=${report.mode}; ${report.warnings.join("; ")}`
    );
  }
  return viteEnv;
}

function verifyDistBundle(expectedProjectId: string): void {
  const assetsDir = path.join(process.cwd(), "dist", "assets");
  if (!fs.existsSync(assetsDir)) {
    throw new Error("dist/assets not found after vite build");
  }
  const jsFiles = fs.readdirSync(assetsDir).filter((name) => name.endsWith(".js"));
  const forbidden = [
    /signInWithPassword\?key=fake/i,
    /identitytoolkit\.googleapis\.com[^"']*key=fake/i,
    /VITE_FIREBASE_API_KEY:"fake/i,
    /VITE_FIREBASE_PROJECT_ID:"fake"/i,
    new RegExp(`VITE_FIREBASE_PROJECT_ID:"${PRODUCTION_PROJECT_ID}"`),
    new RegExp(`VITE_FIREBASE_AUTH_DOMAIN:"${PRODUCTION_PROJECT_ID}\\.firebaseapp\\.com"`),
  ];
  const required = [
    new RegExp(`VITE_FIREBASE_PROJECT_ID:"${expectedProjectId}"`),
    new RegExp(`VITE_FIREBASE_AUTH_DOMAIN:"${expectedProjectId}\\.firebaseapp\\.com"`),
    /VITE_NONGA_PUBLIC_SIGNUP_ENABLED:"false"/,
  ];
  for (const file of jsFiles) {
    const content = fs.readFileSync(path.join(assetsDir, file), "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(content)) {
        throw new Error(
          `dist/assets/${file} contains forbidden Firebase config (${pattern})`
        );
      }
    }
    for (const pattern of required) {
      if (!pattern.test(content)) {
        throw new Error(`dist/assets/${file} missing isolated staging env (${pattern})`);
      }
    }
  }
  console.log(`PASS dist bundle verified for ${expectedProjectId} (${jsFiles.length} js asset file(s))`);
}

console.log("=== Nong A isolated staging hosting build ===");

const envFile = process.env.NONGA_ISOLATED_STAGING_ENV_FILE || ".env.isolated-staging";
const fromFile = loadDotEnvFile(path.resolve(envFile));
const processFirebaseEnv = Object.fromEntries(
  [
    ...REQUIRED_ENV_KEYS,
    ...ISOLATED_OWNER_HELPER_FLAGS,
    "VITE_FIREBASE_MEASUREMENT_ID",
    "VITE_NONGA_PUBLIC_SIGNUP_ENABLED",
    "VITE_NONGA_DEALER_API_TOKEN",
    "VITE_NONGA_ADMIN_API_TOKEN",
    "NONGA_ISOLATED_STAGING_PROJECT_ID",
    "NONGA_ISOLATED_STAGING_HOSTING_SITE",
    "NONGA_ISOLATED_STAGING_CLOUD_RUN_SERVICE",
    "NONGA_ISOLATED_STAGING_REGION",
    "NONGA_ISOLATED_STAGING_URL",
    "NONGA_ISOLATED_STAGING_STORAGE_BUCKET",
    "NONGA_ISOLATED_STAGING_FIRESTORE_DATABASE_ID",
    "NONGA_ISOLATED_STAGING_FIRESTORE_PROJECT_ID",
    "NONGA_ISOLATED_STAGING_API_PROJECT_ID",
    "NONGA_ISOLATED_STAGING_AUTH_PROJECT_ID",
    "NONGA_ISOLATED_STAGING_AUTH_TENANT_ID",
  ]
    .map((key) => [key, process.env[key]])
    .filter(([, value]) => typeof value === "string" && value.trim())
) as Record<string, string>;

const env = mergeEnv(
  {
    VITE_NONGA_PUBLIC_SIGNUP_ENABLED: "false",
    VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ENABLED: "false",
    VITE_NONGA_OWNER_GEMINI_ONE_RUN_HELPER_ENABLED: "false",
  },
  processFirebaseEnv,
  fromFile
);
const target = resolveExplicitIsolatedTarget(
  env,
  "isolated staging build"
) as Record<string, string>;
const expectedProjectId = target.projectId;

console.log(`env source: ${Object.keys(fromFile).length > 0 ? envFile : "process env only"}`);
console.log("target identities: explicit and validated (values redacted)");
redactEnvReport(env);
assertIsolatedStagingBuildEnv(env, target);

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

verifyDistBundle(expectedProjectId);
const provenanceResult = spawnSync("node", ["scripts/write-build-provenance.mjs"], {
  stdio: "inherit",
  env: childEnv,
  shell: process.platform === "win32",
});
if (provenanceResult.status !== 0) {
  process.exit(provenanceResult.status ?? 1);
}
console.log(
  "PASS isolated staging hosting build complete (vite only; deploy with firebase.isolated-staging.json)"
);
