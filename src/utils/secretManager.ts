/**
 * Google Secret Manager integration for production runtime.
 * Falls back to process.env in local/dev when GSM is unavailable or disabled.
 */
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const secretCache = new Map<string, string>();

/** Maps GSM secret resource names → process.env keys injected at bootstrap. */
export const PRODUCTION_SECRET_BINDINGS: Readonly<
  Record<string, string>
> = {
  "gemini-api-key": "GEMINI_API_KEY",
  "firebase-service-account-json": "FIREBASE_SERVICE_ACCOUNT_JSON",
  "nonga-admin-api-token": "NONGA_ADMIN_API_TOKEN",
  "nonga-dealer-api-token": "NONGA_DEALER_API_TOKEN",
};

let client: SecretManagerServiceClient | null = null;

function shouldUseSecretManager(): boolean {
  const flag = String(process.env.NONGA_USE_SECRET_MANAGER ?? "")
    .trim()
    .toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  if (flag === "1" || flag === "true" || flag === "yes") return true;

  // Cloud Run / GCP runtime — prefer GSM when project id is present.
  if (process.env.K_SERVICE?.trim()) return true;
  if (process.env.GOOGLE_CLOUD_PROJECT?.trim()) return true;
  if (process.env.GCLOUD_PROJECT?.trim()) return true;
  if (process.env.FIREBASE_PROJECT_ID?.trim()) return true;

  return false;
}

function resolveProjectId(): string {
  return (
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    "nonga-ce93c"
  );
}

function getClient(): SecretManagerServiceClient {
  if (!client) {
    client = new SecretManagerServiceClient();
  }
  return client;
}

function secretResourceName(secretId: string, version = "latest"): string {
  const projectId = resolveProjectId();
  return `projects/${projectId}/secrets/${secretId}/versions/${version}`;
}

/**
 * Fetch a secret value from Google Secret Manager (cached in-process).
 * Returns empty string when GSM is disabled or the secret cannot be read.
 */
export async function getSecret(
  secretId: string,
  version = "latest"
): Promise<string> {
  const cacheKey = `${secretId}:${version}`;
  if (secretCache.has(cacheKey)) {
    return secretCache.get(cacheKey) ?? "";
  }

  if (!shouldUseSecretManager()) {
    return "";
  }

  try {
    const [response] = await getClient().accessSecretVersion({
      name: secretResourceName(secretId, version),
    });
    const payload = response.payload?.data;
    const value =
      typeof payload === "string"
        ? payload
        : payload
          ? Buffer.from(payload).toString("utf8")
          : "";
    const trimmed = value.trim();
    if (trimmed) {
      secretCache.set(cacheKey, trimmed);
    }
    return trimmed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[secretManager] unable to read secret "${secretId}" (non-fatal): ${message}`
    );
    return "";
  }
}

export interface SecretBootstrapResult {
  loaded: string[];
  skipped: string[];
  fromSecretManager: boolean;
}

/**
 * Load production secrets from GSM into process.env.
 * Sets NODE_ENV=production when at least one secret loads successfully.
 */
export async function bootstrapProductionSecrets(): Promise<SecretBootstrapResult> {
  const loaded: string[] = [];
  const skipped: string[] = [];

  if (!shouldUseSecretManager()) {
    return { loaded, skipped: Object.values(PRODUCTION_SECRET_BINDINGS), fromSecretManager: false };
  }

  for (const [secretId, envKey] of Object.entries(PRODUCTION_SECRET_BINDINGS)) {
    const existing = String(process.env[envKey] ?? "").trim();
    if (existing) {
      skipped.push(envKey);
      continue;
    }

    const value = await getSecret(secretId);
    if (value) {
      process.env[envKey] = value;
      loaded.push(envKey);
    } else {
      skipped.push(envKey);
    }
  }

  if (loaded.length > 0) {
    process.env.NODE_ENV = "production";
    if (!process.env.NONGA_DEPLOY_ENV?.trim()) {
      process.env.NONGA_DEPLOY_ENV = "production";
    }
  }

  return { loaded, skipped, fromSecretManager: true };
}

/** Test helper — clears in-process secret cache. */
export function clearSecretCacheForTests(): void {
  secretCache.clear();
}
