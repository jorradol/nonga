/**
 * WP-V3-04C — Production Firebase verify env-wiring tests.
 * Uses synthetic fixture values only. Never reads or prints real .env secrets.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  evaluateProductionFirebaseWebConfig,
  formatProductionFirebaseGuardMessage,
  resolveProductionFirebaseWebEnv,
  runProductionFirebaseVerification,
} from "./verify-vite-production-firebase.mts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function assertNoSecretLeak(text: string, bannedSnips: string[]): void {
  for (const snip of bannedSnips) {
    assert(!text.includes(snip), "output must not contain secret fixture value");
  }
}

const VALID_FIXTURE = {
  apiKey: "AIzaSyWpV304CValidFixtureKey0001",
  authDomain: "wp-v3-04c-valid.firebaseapp.com",
  projectId: "wp-v3-04c-valid",
  storageBucket: "wp-v3-04c-valid.appspot.com",
  messagingSenderId: "100000000401",
  appId: "1:100000000401:web:wpv304cvalid01",
  measurementId: "G-WPV304CVALID",
} as const;

const PLACEHOLDER_BASE = {
  apiKey: "placeholder-api-key",
  authDomain: "demo.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:demo",
} as const;

const FAKE_BASE = {
  apiKey: "fake-api-key-value",
  authDomain: "fake.example.firebaseapp.com",
  projectId: "fake-project",
  storageBucket: "fake-project.appspot.com",
  messagingSenderId: "111111111111",
  appId: "1:111111111111:web:fake",
} as const;

const BANNED_OUTPUT_SNIPS = [
  VALID_FIXTURE.apiKey,
  "AIzaSyShellOverrideKey04C0002",
  "AIzaSyFileOnlyKey04C0003",
];

function writeEnvFile(dir: string, name: string, entries: Record<string, string>): void {
  const body = Object.entries(entries)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  fs.writeFileSync(path.join(dir, name), `${body}\n`, "utf8");
}

function makeIsolatedEnvDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wp-v3-04c-firebase-env-"));
}

console.log("=== WP-V3-04C Production Firebase env-wiring ===");

// 1) Valid Firebase config from env passes
{
  const viteEnv = {
    VITE_FIREBASE_API_KEY: VALID_FIXTURE.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: VALID_FIXTURE.authDomain,
    VITE_FIREBASE_PROJECT_ID: VALID_FIXTURE.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: VALID_FIXTURE.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: VALID_FIXTURE.messagingSenderId,
    VITE_FIREBASE_APP_ID: VALID_FIXTURE.appId,
    VITE_FIREBASE_MEASUREMENT_ID: VALID_FIXTURE.measurementId,
  };
  const report = evaluateProductionFirebaseWebConfig(PLACEHOLDER_BASE, viteEnv);
  assert(report.mode === "firebase-auth", "valid env config must pass as firebase-auth");
  assert(report.fakeFields.length === 0, "valid env must not report fake fields");
  const message = formatProductionFirebaseGuardMessage(report);
  assertNoSecretLeak(message, BANNED_OUTPUT_SNIPS);
  console.log("PASS valid Firebase config from env");
}

// 2) Placeholder apiKey blocked
{
  const report = evaluateProductionFirebaseWebConfig(PLACEHOLDER_BASE, {});
  assert(report.mode === "invalid-production-config", "placeholder apiKey must be blocked");
  assert(report.fakeFields.includes("apiKey"), "apiKey must be listed as fake/placeholder");
  const message = formatProductionFirebaseGuardMessage(report);
  assert(message.includes("placeholder") || message.includes("invalid-production-config"), "block message required");
  assertNoSecretLeak(message, BANNED_OUTPUT_SNIPS);
  console.log("PASS placeholder apiKey blocked");
}

// 3) Fake Firebase config blocked
{
  const report = evaluateProductionFirebaseWebConfig(FAKE_BASE, {});
  assert(report.mode === "invalid-production-config", "fake config must be blocked");
  assert(report.fakeFields.includes("apiKey"), "fake apiKey must be detected");
  console.log("PASS fake Firebase config blocked");
}

// 4) Missing required field blocked
{
  const report = evaluateProductionFirebaseWebConfig(
    {
      apiKey: VALID_FIXTURE.apiKey,
      authDomain: VALID_FIXTURE.authDomain,
      // projectId missing
      appId: VALID_FIXTURE.appId,
    },
    {}
  );
  assert(report.mode === "invalid-production-config", "missing required field must be blocked");
  assert(report.missingRequiredFields.includes("projectId"), "projectId must be reported missing");
  console.log("PASS missing required field blocked");
}

// 5) Shell/CI env overrides env file values
{
  const dir = makeIsolatedEnvDir();
  writeEnvFile(dir, ".env", {
    VITE_FIREBASE_API_KEY: "AIzaSyFileOnlyKey04C0003",
    VITE_FIREBASE_AUTH_DOMAIN: "file-only.firebaseapp.com",
    VITE_FIREBASE_PROJECT_ID: "file-only-project",
    VITE_FIREBASE_STORAGE_BUCKET: "file-only-project.appspot.com",
    VITE_FIREBASE_MESSAGING_SENDER_ID: "200000000402",
    VITE_FIREBASE_APP_ID: "1:200000000402:web:fileonly04c",
  });
  writeEnvFile(dir, ".env.production", {
    VITE_FIREBASE_API_KEY: "placeholder-should-lose-to-shell",
    VITE_FIREBASE_PROJECT_ID: "mode-file-project",
  });

  const processEnv: NodeJS.ProcessEnv = {
    ...process.env,
    VITE_FIREBASE_API_KEY: "AIzaSyShellOverrideKey04C0002",
    VITE_FIREBASE_AUTH_DOMAIN: VALID_FIXTURE.authDomain,
    VITE_FIREBASE_PROJECT_ID: VALID_FIXTURE.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: VALID_FIXTURE.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: VALID_FIXTURE.messagingSenderId,
    VITE_FIREBASE_APP_ID: VALID_FIXTURE.appId,
  };

  const resolvedEnv = resolveProductionFirebaseWebEnv({
    mode: "production",
    root: dir,
    processEnv,
  });
  assert(
    resolvedEnv.VITE_FIREBASE_API_KEY === "AIzaSyShellOverrideKey04C0002",
    "shell/CI env must override env file apiKey"
  );
  assert(
    resolvedEnv.VITE_FIREBASE_PROJECT_ID === VALID_FIXTURE.projectId,
    "shell/CI env must override mode-specific projectId"
  );

  const result = runProductionFirebaseVerification({
    mode: "production",
    root: dir,
    processEnv,
    baseConfig: PLACEHOLDER_BASE,
  });
  assert(result.exitCode === 0, "shell-overridden valid env must pass verification");
  assert(result.report.mode === "firebase-auth", "shell override must resolve firebase-auth");
  assertNoSecretLeak(result.message, BANNED_OUTPUT_SNIPS);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("PASS shell/CI env overrides env file");
}

// 5b) Mode-specific env overrides general env when shell unset
{
  const dir = makeIsolatedEnvDir();
  writeEnvFile(dir, ".env", {
    VITE_FIREBASE_API_KEY: "AIzaSyGeneralFileKey04C0004",
    VITE_FIREBASE_AUTH_DOMAIN: VALID_FIXTURE.authDomain,
    VITE_FIREBASE_PROJECT_ID: "general-file-project",
    VITE_FIREBASE_STORAGE_BUCKET: VALID_FIXTURE.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: VALID_FIXTURE.messagingSenderId,
    VITE_FIREBASE_APP_ID: VALID_FIXTURE.appId,
  });
  writeEnvFile(dir, ".env.production", {
    VITE_FIREBASE_API_KEY: VALID_FIXTURE.apiKey,
    VITE_FIREBASE_PROJECT_ID: VALID_FIXTURE.projectId,
  });

  const processEnv: NodeJS.ProcessEnv = { ...process.env };
  for (const key of [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_MEASUREMENT_ID",
  ]) {
    delete processEnv[key];
  }

  const resolvedEnv = resolveProductionFirebaseWebEnv({
    mode: "production",
    root: dir,
    processEnv,
  });
  assert(
    resolvedEnv.VITE_FIREBASE_API_KEY === VALID_FIXTURE.apiKey,
    "production mode env must override general .env"
  );
  assert(
    resolvedEnv.VITE_FIREBASE_PROJECT_ID === VALID_FIXTURE.projectId,
    "production mode projectId must win over general .env"
  );
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("PASS mode-specific env overrides general env");
}

// 6) measurementId remains optional
{
  const viteEnv = {
    VITE_FIREBASE_API_KEY: VALID_FIXTURE.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: VALID_FIXTURE.authDomain,
    VITE_FIREBASE_PROJECT_ID: VALID_FIXTURE.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: VALID_FIXTURE.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: VALID_FIXTURE.messagingSenderId,
    VITE_FIREBASE_APP_ID: VALID_FIXTURE.appId,
    // measurementId intentionally omitted
  };
  const report = evaluateProductionFirebaseWebConfig(PLACEHOLDER_BASE, viteEnv);
  assert(report.mode === "firebase-auth", "missing measurementId must still pass");
  console.log("PASS measurementId remains optional");
}

// 7) Standalone verifier subprocess + no secret leak in stdout/stderr
{
  const scriptPath = path.join(process.cwd(), "scripts", "verify-vite-production-firebase.mts");
  const passEnv: NodeJS.ProcessEnv = {
    ...process.env,
    VITE_FIREBASE_API_KEY: VALID_FIXTURE.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: VALID_FIXTURE.authDomain,
    VITE_FIREBASE_PROJECT_ID: VALID_FIXTURE.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: VALID_FIXTURE.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: VALID_FIXTURE.messagingSenderId,
    VITE_FIREBASE_APP_ID: VALID_FIXTURE.appId,
    VITE_FIREBASE_MEASUREMENT_ID: VALID_FIXTURE.measurementId,
  };
  const passRun = spawnSync("npx", ["tsx", scriptPath], {
    env: passEnv,
    encoding: "utf8",
    cwd: process.cwd(),
    shell: true,
  });
  assert(passRun.status === 0, `standalone verifier should pass with valid shell env (status=${passRun.status})`);
  const passOut = `${passRun.stdout ?? ""}\n${passRun.stderr ?? ""}`;
  assert(passOut.includes("[vite-firebase-guard] PASS"), "standalone pass message required");
  assertNoSecretLeak(passOut, BANNED_OUTPUT_SNIPS);

  const failEnv: NodeJS.ProcessEnv = { ...process.env };
  for (const key of [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_MEASUREMENT_ID",
  ]) {
    delete failEnv[key];
  }
  // Force JSON placeholder path by pointing root to empty env dir and clearing shell vars.
  // Script still reads committed firebase-applet-config.json from package imports.
  const failRun = spawnSync("npx", ["tsx", scriptPath], {
    env: failEnv,
    encoding: "utf8",
    cwd: process.cwd(),
    shell: true,
  });
  // Note: if developer's real .env is loaded via loadEnv, failRun may pass.
  // So we also assert the in-process API with empty file root + cleared env.
  const isolated = makeIsolatedEnvDir();
  const isolatedFail = runProductionFirebaseVerification({
    mode: "production",
    root: isolated,
    processEnv: failEnv,
    baseConfig: PLACEHOLDER_BASE,
  });
  assert(isolatedFail.exitCode === 1, "placeholder-only path must fail");
  assert(
    isolatedFail.message.includes("invalid-production-config"),
    "fail message must keep production block semantics"
  );
  assertNoSecretLeak(isolatedFail.message, BANNED_OUTPUT_SNIPS);
  fs.rmSync(isolated, { recursive: true, force: true });

  // If local .env exists, standalone without shell override may pass — that is acceptable
  // and proves Vite-compatible loading. Record outcome without printing secrets.
  console.log(
    `INFO standalone-without-shell-override exit=${failRun.status} (0 means local env files supplied valid config)`
  );
  console.log("PASS standalone verifier secrecy + block semantics");
}

// 8) Guard message consistency for block path
{
  const blocked = evaluateProductionFirebaseWebConfig(PLACEHOLDER_BASE, {});
  const message = formatProductionFirebaseGuardMessage(blocked);
  assert(message.startsWith("[vite-firebase-guard] blocked production build:"), "block prefix preserved");
  assert(message.includes("mode=invalid-production-config"), "mode preserved");
  console.log("PASS guard message semantics preserved");
}

console.log("=== WP-V3-04C Production Firebase env-wiring — OK ===");
