/**
 * Canonical explicit environment identity — fail closed.
 *
 * Security boundary (Production Foundation B1): the runtime environment used for
 * authorization-relevant policy (e.g. user-visible AI access) must come from an
 * EXPLICIT configuration key, never from `APP_URL`, Firebase project name, or any
 * domain / substring match. A public canonical-staging domain (a.nongbot.org on the
 * `nonga-ce93c` project) must not be able to unlock the staging-expanded policy.
 *
 * Reuses the existing canonical keys already present across the codebase:
 *   - NONGA_RUNTIME_ENV (primary)
 *   - NONGA_DEPLOY_ENV  (fallback)
 * No new configuration system is introduced.
 */

export type NongaEnvironmentIdentity = "fixture" | "staging" | "production" | "local";

export const NONGA_RUNTIME_ENV_KEY = "NONGA_RUNTIME_ENV";
export const NONGA_DEPLOY_ENV_KEY = "NONGA_DEPLOY_ENV";

/** Ordered so the primary key wins when both are set. */
export const NONGA_ENVIRONMENT_IDENTITY_KEYS = [
  NONGA_RUNTIME_ENV_KEY,
  NONGA_DEPLOY_ENV_KEY,
] as const;

export type EnvReader = (key: string) => string | undefined;

function defaultReadEnv(key: string): string | undefined {
  return typeof process !== "undefined"
    ? (process.env[key] as string | undefined)
    : undefined;
}

function firstExplicitValue(read: EnvReader): string {
  for (const key of NONGA_ENVIRONMENT_IDENTITY_KEYS) {
    const value = String(read(key) ?? "").trim();
    if (value) return value.toLowerCase();
  }
  return "";
}

/**
 * Resolve the explicit environment identity.
 *
 * Fail-closed contract: a missing, empty, invalid, or unknown value resolves to
 * `production` (the strictest tier) so that unclassified runtimes never receive a
 * relaxed policy.
 */
export function resolveNongaEnvironmentIdentity(
  readEnv: EnvReader = defaultReadEnv
): NongaEnvironmentIdentity {
  const raw = firstExplicitValue(readEnv);
  switch (raw) {
    case "production":
    case "prod":
      return "production";
    case "staging":
    case "stage":
      return "staging";
    case "fixture":
    case "test":
      return "fixture";
    case "local":
    case "development":
    case "dev":
      return "local";
    default:
      // Missing / invalid / unknown -> fail closed to the strictest tier.
      return "production";
  }
}

/** True only for an explicitly recognized, non-fail-closed value. */
export function isExplicitEnvironmentIdentity(readEnv: EnvReader = defaultReadEnv): boolean {
  const raw = firstExplicitValue(readEnv);
  return (
    raw === "production" ||
    raw === "prod" ||
    raw === "staging" ||
    raw === "stage" ||
    raw === "fixture" ||
    raw === "test" ||
    raw === "local" ||
    raw === "development" ||
    raw === "dev"
  );
}
