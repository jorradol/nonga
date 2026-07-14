/**
 * Runtime configuration bootstrap — loads secrets before server modules consume env.
 */
import { bootstrapProductionSecrets } from "./utils/secretManager";

let initialized = false;

export interface RuntimeConfigState {
  initialized: boolean;
  nodeEnv: string;
  deployEnv: string;
  secretsLoaded: string[];
  secretsFromGsm: boolean;
}

let state: RuntimeConfigState = {
  initialized: false,
  nodeEnv: process.env.NODE_ENV ?? "development",
  deployEnv: process.env.NONGA_DEPLOY_ENV ?? "",
  secretsLoaded: [],
  secretsFromGsm: false,
};

/**
 * Idempotent initialization — safe to call once at server startup.
 * In production Cloud Run, pulls API keys from Google Secret Manager.
 */
export async function initializeRuntimeConfig(): Promise<RuntimeConfigState> {
  if (initialized) return state;

  const bootstrap = await bootstrapProductionSecrets();
  initialized = true;
  state = {
    initialized: true,
    nodeEnv: process.env.NODE_ENV ?? "development",
    deployEnv: process.env.NONGA_DEPLOY_ENV ?? "",
    secretsLoaded: bootstrap.loaded,
    secretsFromGsm: bootstrap.fromSecretManager && bootstrap.loaded.length > 0,
  };

  if (state.secretsFromGsm) {
    console.log(
      `[config] production secrets loaded from Secret Manager: ${bootstrap.loaded.join(", ") || "(none)"}`
    );
  }

  return state;
}

export function getRuntimeConfig(): RuntimeConfigState {
  return state;
}

/** Read a config value — prefers env after bootstrap. */
export function getConfigValue(key: string, fallback = ""): string {
  return String(process.env[key] ?? fallback).trim();
}
