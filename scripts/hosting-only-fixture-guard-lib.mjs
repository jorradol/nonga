/**
 * Fail-closed guards for Hosting-only UI fixture builds (Gate D1).
 * Never prints secrets. Never authorizes Production targets.
 */

export const PRODUCTION_PROJECT_ID = "nonga-ce93c";
export const PRODUCTION_HOSTING_SITE = "nonga-ce93c";
export const PRODUCTION_PUBLIC_HOSTNAME = "a.nongbot.org";
export const PRODUCTION_PUBLIC_URL = "https://a.nongbot.org";
export const PRODUCTION_CLOUD_RUN_SERVICE = "nonga-staging";

export const FIXTURE_PROJECT_ID = "nonga-staging-2026";
export const FIXTURE_HOSTING_SITE = "nonga-staging-2026";
export const FIXTURE_PUBLIC_URL = "https://nonga-staging-2026.web.app";
export const FIXTURE_PUBLIC_HOSTNAME = "nonga-staging-2026.web.app";

export const FIXTURE_FLAG_ENV = "VITE_NONGA_UI_FIXTURE";
export const FIXTURE_PUBLIC_BASE_URL_ENV = "VITE_NONGA_PUBLIC_BASE_URL";

const TARGET_ENV_KEYS = Object.freeze({
  projectId: "NONGA_HOSTING_ONLY_FIXTURE_PROJECT_ID",
  hostingSite: "NONGA_HOSTING_ONLY_FIXTURE_HOSTING_SITE",
  publicUrl: "NONGA_HOSTING_ONLY_FIXTURE_PUBLIC_URL",
});

export function requireExplicitValue(value, label, context) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.includes("${") || /^<.+>$/.test(normalized)) {
    throw new Error(`${context}: ${label} must be explicitly resolved and non-empty`);
  }
  return normalized;
}

export function resolveHostingOnlyFixtureTarget(env = process.env, context = "hosting-only fixture") {
  const target = {
    projectId: requireExplicitValue(env[TARGET_ENV_KEYS.projectId], TARGET_ENV_KEYS.projectId, context),
    hostingSite: requireExplicitValue(
      env[TARGET_ENV_KEYS.hostingSite],
      TARGET_ENV_KEYS.hostingSite,
      context
    ),
    publicUrl: requireExplicitValue(env[TARGET_ENV_KEYS.publicUrl], TARGET_ENV_KEYS.publicUrl, context),
  };
  return target;
}

export function assertNoProductionIdentifiers(values, context) {
  const serialized = JSON.stringify(values).toLowerCase();
  const forbidden = [
    PRODUCTION_PROJECT_ID,
    PRODUCTION_PUBLIC_HOSTNAME,
    PRODUCTION_HOSTING_SITE,
    `${PRODUCTION_PROJECT_ID}.firebaseapp.com`,
    `${PRODUCTION_PROJECT_ID}.web.app`,
    `${PRODUCTION_PROJECT_ID}.firebasestorage.app`,
    `${PRODUCTION_PROJECT_ID}.appspot.com`,
  ];
  for (const identifier of forbidden) {
    if (serialized.includes(identifier.toLowerCase())) {
      throw new Error(`${context}: Production identifier is forbidden (${identifier})`);
    }
  }
  if (serialized.includes(`"serviceid":"${PRODUCTION_CLOUD_RUN_SERVICE}"`)) {
    throw new Error(
      `${context}: Production Cloud Run service '${PRODUCTION_CLOUD_RUN_SERVICE}' is forbidden`
    );
  }
}

export function assertHostingOnlyFixtureTarget(target, context = "hosting-only fixture") {
  requireExplicitValue(target?.projectId, "projectId", context);
  requireExplicitValue(target?.hostingSite, "hostingSite", context);
  requireExplicitValue(target?.publicUrl, "publicUrl", context);
  assertNoProductionIdentifiers(target, context);

  if (target.projectId !== FIXTURE_PROJECT_ID) {
    throw new Error(`${context}: projectId must be '${FIXTURE_PROJECT_ID}'`);
  }
  if (target.hostingSite !== FIXTURE_HOSTING_SITE) {
    throw new Error(`${context}: hostingSite must be '${FIXTURE_HOSTING_SITE}'`);
  }
  if (target.publicUrl !== FIXTURE_PUBLIC_URL) {
    throw new Error(`${context}: publicUrl must be '${FIXTURE_PUBLIC_URL}'`);
  }
  if (target.projectId !== target.hostingSite) {
    throw new Error(`${context}: projectId and hostingSite must match`);
  }
}

export function assertHostingOnlyConfig(config, context = "firebase.hosting-only-fixture.json") {
  const hosting = config?.hosting;
  if (!hosting || typeof hosting !== "object") {
    throw new Error(`${context}: hosting block required`);
  }
  if (hosting.site !== FIXTURE_HOSTING_SITE) {
    throw new Error(`${context}: hosting.site must be '${FIXTURE_HOSTING_SITE}'`);
  }
  const rewrites = Array.isArray(hosting.rewrites) ? hosting.rewrites : [];
  for (const rewrite of rewrites) {
    const source = String(rewrite?.source ?? "");
    if (source.includes("/api") || rewrite?.run || rewrite?.function) {
      throw new Error(`${context}: API/Cloud Run/function rewrites are forbidden`);
    }
    if (typeof rewrite?.destination === "string" && /a\.nongbot\.org|nonga-ce93c/i.test(rewrite.destination)) {
      throw new Error(`${context}: Production redirect destinations are forbidden`);
    }
  }
  const headers = Array.isArray(hosting.headers) ? hosting.headers : [];
  const hasRobots = headers.some((entry) =>
    (entry?.headers || []).some(
      (h) =>
        String(h?.key ?? "").toLowerCase() === "x-robots-tag" &&
        String(h?.value ?? "").toLowerCase().includes("noindex")
    )
  );
  if (!hasRobots) {
    throw new Error(`${context}: X-Robots-Tag noindex header required`);
  }
  assertNoProductionIdentifiers(config, context);
}

export function assertFixtureBuildEnv(env, target, context = "hosting-only-fixture-build") {
  if (String(env[FIXTURE_FLAG_ENV] ?? "").trim() !== "true") {
    throw new Error(`${context}: ${FIXTURE_FLAG_ENV}=true is required`);
  }
  assertHostingOnlyFixtureTarget(target, context);
  assertNoProductionIdentifiers(env, context);

  const publicBase = requireExplicitValue(
    env[FIXTURE_PUBLIC_BASE_URL_ENV],
    FIXTURE_PUBLIC_BASE_URL_ENV,
    context
  );
  if (publicBase !== FIXTURE_PUBLIC_URL) {
    throw new Error(`${context}: ${FIXTURE_PUBLIC_BASE_URL_ENV} must be '${FIXTURE_PUBLIC_URL}'`);
  }
  if (String(env.VITE_NONGA_PUBLIC_SIGNUP_ENABLED ?? "").trim() !== "false") {
    throw new Error(`${context}: VITE_NONGA_PUBLIC_SIGNUP_ENABLED must be false`);
  }
  for (const key of [
    "VITE_NONGA_DEALER_API_TOKEN",
    "VITE_NONGA_ADMIN_API_TOKEN",
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_PROJECT_ID",
    "PUBLIC_NONGA_BASE_URL",
  ]) {
    if (String(env[key] ?? "").trim()) {
      throw new Error(`${context}: ${key} must be blank for Hosting-only fixture builds`);
    }
  }
}
