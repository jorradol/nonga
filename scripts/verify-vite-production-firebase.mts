/**
 * Production Firebase web-config verifier used by vite buildStart guard.
 * WP-V3-04C: load VITE_* env with Vite-compatible precedence before validating.
 *
 * Precedence:
 *   Shell/CI process environment > mode-specific env (.env.[mode]*) > general env (.env*) > committed fallback JSON
 *
 * Never logs secret values — only mode / field names / pass-fail.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };
import {
  detectFirebaseClientConfig,
  resolveFirebaseClientConfig,
  type FirebaseClientConfigLike,
  type FirebaseConfigReport,
  type FirebaseWebConfigEnv,
} from "../src/lib/firebase/firebaseConfigGuard.ts";

export const PRODUCTION_FIREBASE_WEB_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_MEASUREMENT_ID",
  "VITE_FIREBASE_FIRESTORE_DATABASE_ID",
] as const;

export type ProductionFirebaseWebEnvKey = (typeof PRODUCTION_FIREBASE_WEB_ENV_KEYS)[number];

export interface ResolveProductionFirebaseWebEnvOptions {
  /** Vite mode used for loadEnv file selection. Defaults to "production". */
  mode?: string;
  /** Project root containing .env files. Defaults to process.cwd(). */
  root?: string;
  /** Process/CI environment. Defaults to process.env. */
  processEnv?: NodeJS.ProcessEnv;
}

/**
 * Resolve VITE_FIREBASE_* for production verification using Vite loadEnv semantics,
 * with explicit Shell/CI precedence over file-loaded values.
 */
export function resolveProductionFirebaseWebEnv(
  options: ResolveProductionFirebaseWebEnvOptions = {}
): FirebaseWebConfigEnv {
  const mode = options.mode ?? "production";
  const root = options.root ?? process.cwd();
  const processEnv = options.processEnv ?? process.env;
  const fileEnv = loadEnv(mode, root, "VITE_");

  const resolved: FirebaseWebConfigEnv = {};
  for (const key of PRODUCTION_FIREBASE_WEB_ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(processEnv, key) && processEnv[key] !== undefined) {
      resolved[key] = processEnv[key];
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(fileEnv, key) && fileEnv[key] !== undefined) {
      resolved[key] = fileEnv[key];
    }
  }
  return resolved;
}

export function evaluateProductionFirebaseWebConfig(
  baseConfig: FirebaseClientConfigLike,
  viteEnv: FirebaseWebConfigEnv,
  options: { betaToken?: boolean } = {}
): FirebaseConfigReport {
  const resolved = resolveFirebaseClientConfig(baseConfig, viteEnv);
  return detectFirebaseClientConfig(resolved, {
    dev: false,
    prod: true,
    betaToken: Boolean(options.betaToken),
  });
}

export function formatProductionFirebaseGuardMessage(report: FirebaseConfigReport): string {
  if (report.mode === "firebase-auth") {
    return "[vite-firebase-guard] PASS production Firebase web config";
  }
  return `[vite-firebase-guard] blocked production build: mode=${report.mode}; ${report.warnings.join("; ")}`;
}

export function runProductionFirebaseVerification(options?: {
  mode?: string;
  root?: string;
  processEnv?: NodeJS.ProcessEnv;
  baseConfig?: FirebaseClientConfigLike;
}): { report: FirebaseConfigReport; exitCode: number; message: string } {
  const processEnv = options?.processEnv ?? process.env;
  const viteEnv = resolveProductionFirebaseWebEnv({
    mode: options?.mode,
    root: options?.root,
    processEnv,
  });
  const report = evaluateProductionFirebaseWebConfig(
    options?.baseConfig ?? firebaseConfig,
    viteEnv,
    {
      betaToken: Boolean(
        processEnv.VITE_NONGA_DEALER_API_TOKEN || processEnv.VITE_NONGA_ADMIN_API_TOKEN
      ),
    }
  );
  const message = formatProductionFirebaseGuardMessage(report);
  return {
    report,
    exitCode: report.mode === "firebase-auth" ? 0 : 1,
    message,
  };
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return path.resolve(fileURLToPath(import.meta.url)) === path.resolve(entry);
  } catch {
    return false;
  }
}

if (isExecutedDirectly()) {
  const result = runProductionFirebaseVerification();
  if (result.exitCode === 0) {
    console.log(result.message);
  } else {
    console.error(result.message);
  }
  process.exit(result.exitCode);
}
