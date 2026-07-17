/**
 * Fail-closed guards for isolated staging only.
 * This library has no Production deployment mode and never prints secrets.
 */

export const PRODUCTION_PROJECT_ID = "nonga-ce93c";
export const PRODUCTION_HOSTING_SITE = "nonga-ce93c";
export const PRODUCTION_PUBLIC_URL = "https://a.nongbot.org";
export const PRODUCTION_PUBLIC_HOSTNAME = "a.nongbot.org";
export const PRODUCTION_CLOUD_RUN_SERVICE = "nonga-staging";
export const PRODUCTION_STORAGE_BUCKETS = [
  "nonga-ce93c.firebasestorage.app",
  "nonga-ce93c.appspot.com",
];
export const PRODUCTION_AUTH_DOMAINS = [
  "nonga-ce93c.firebaseapp.com",
  "nonga-ce93c.web.app",
];

/** Proposed values for Owner review; never used as runtime fallbacks. */
export const PROPOSED_ISOLATED_STAGING_PROJECT_ID = "nonga-staging-2026";
export const PROPOSED_ISOLATED_STAGING_HOSTING_SITE = "nonga-staging-2026";
export const PROPOSED_ISOLATED_CLOUD_RUN_SERVICE = "nonga-staging-api-2026";
export const PROPOSED_ISOLATED_CLOUD_RUN_REGION = "asia-southeast1";
export const PROPOSED_ISOLATED_STAGING_URL =
  "https://nonga-staging-2026.web.app";
export const PROPOSED_ISOLATED_STORAGE_BUCKET =
  "nonga-staging-2026.firebasestorage.app";
export const PROPOSED_ISOLATED_FIRESTORE_DATABASE_ID = "(default)";

export const APPROVAL_PHRASES = Object.freeze({
  gateAPlanningFiles: "OWNER APPROVES GATE A KEEP ISOLATED STAGING PLANNING FILES",
  gateBEmptyProject: "OWNER APPROVES GATE B CREATE EMPTY ISOLATED PROJECT",
  gateCBillingServices:
    "OWNER APPROVES GATE C LINK BILLING AND ENABLE ISOLATED SERVICES",
  gateDSeedFixtures: "OWNER APPROVES GATE D SEED SYNTHETIC FIXTURES",
  gateEDeployIsolated:
    "OWNER APPROVES GATE E DEPLOY API AND HOSTING TO ISOLATED STAGING",
});

const TARGET_ENV_KEYS = Object.freeze({
  projectId: "NONGA_ISOLATED_STAGING_PROJECT_ID",
  hostingSite: "NONGA_ISOLATED_STAGING_HOSTING_SITE",
  cloudRunService: "NONGA_ISOLATED_STAGING_CLOUD_RUN_SERVICE",
  region: "NONGA_ISOLATED_STAGING_REGION",
  stagingUrl: "NONGA_ISOLATED_STAGING_URL",
  storageBucket: "NONGA_ISOLATED_STAGING_STORAGE_BUCKET",
  firestoreDatabaseId: "NONGA_ISOLATED_STAGING_FIRESTORE_DATABASE_ID",
  firestoreProjectId: "NONGA_ISOLATED_STAGING_FIRESTORE_PROJECT_ID",
  apiProjectId: "NONGA_ISOLATED_STAGING_API_PROJECT_ID",
  authProjectId: "NONGA_ISOLATED_STAGING_AUTH_PROJECT_ID",
  authTenantId: "NONGA_ISOLATED_STAGING_AUTH_TENANT_ID",
});

export function requireExplicitValue(value, label, context) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.includes("${") || /^<.+>$/.test(normalized)) {
    throw new Error(`${context}: ${label} must be explicitly resolved and non-empty`);
  }
  return normalized;
}

export function resolveExplicitIsolatedTarget(env = process.env, context = "isolated target") {
  const target = {};
  for (const [field, envKey] of Object.entries(TARGET_ENV_KEYS)) {
    target[field] = requireExplicitValue(env[envKey], envKey, context);
  }
  return target;
}

export function isProductionPublicUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl));
    return parsed.hostname.toLowerCase() === PRODUCTION_PUBLIC_HOSTNAME;
  } catch {
    return false;
  }
}

export function assertNoProductionIdentifiers(values, context) {
  const serialized = JSON.stringify(values).toLowerCase();
  const forbidden = [
    PRODUCTION_PROJECT_ID,
    PRODUCTION_PUBLIC_HOSTNAME,
    PRODUCTION_HOSTING_SITE,
    ...PRODUCTION_STORAGE_BUCKETS,
    ...PRODUCTION_AUTH_DOMAINS,
  ];
  for (const identifier of forbidden) {
    if (serialized.includes(identifier.toLowerCase())) {
      throw new Error(`${context}: Production identifier is forbidden (${identifier})`);
    }
  }
}

export function assertIsolatedTarget(target, context = "isolated target") {
  for (const field of Object.keys(TARGET_ENV_KEYS)) {
    requireExplicitValue(target?.[field], field, context);
  }
  assertNoProductionIdentifiers(target, context);

  if (target.cloudRunService === PRODUCTION_CLOUD_RUN_SERVICE) {
    throw new Error(
      `${context}: Cloud Run service '${PRODUCTION_CLOUD_RUN_SERVICE}' is reserved by the live system`
    );
  }
  if (target.cloudRunService !== PROPOSED_ISOLATED_CLOUD_RUN_SERVICE) {
    throw new Error(
      `${context}: Cloud Run service must be '${PROPOSED_ISOLATED_CLOUD_RUN_SERVICE}'`
    );
  }
  if (target.region !== PROPOSED_ISOLATED_CLOUD_RUN_REGION) {
    throw new Error(
      `${context}: region must be '${PROPOSED_ISOLATED_CLOUD_RUN_REGION}'`
    );
  }
  if (target.projectId !== target.apiProjectId ||
      target.projectId !== target.authProjectId ||
      target.projectId !== target.firestoreProjectId) {
    throw new Error(`${context}: frontend, API, Auth, and Firestore projects must match`);
  }
  const url = new URL(target.stagingUrl);
  if (url.protocol !== "https:" || url.hostname === PRODUCTION_PUBLIC_HOSTNAME) {
    throw new Error(`${context}: staging URL must be isolated HTTPS`);
  }
  if (!url.hostname.startsWith(`${target.hostingSite}.`)) {
    throw new Error(`${context}: staging URL hostname must match hosting site`);
  }
  if (!target.storageBucket.startsWith(`${target.projectId}.`)) {
    throw new Error(`${context}: Storage bucket must belong to isolated project`);
  }
  return target;
}

export function requireOwnerApprovalPhrase(actualPhrase, gate, context) {
  const expected = APPROVAL_PHRASES[gate];
  if (!expected) throw new Error(`${context}: unknown approval gate`);
  if (String(actualPhrase ?? "").trim() !== expected) {
    throw new Error(`${context}: missing or incorrect ${gate} approval phrase`);
  }
}

export function parseFirebaseHostingRewrites(firebaseJson) {
  const rewrites = firebaseJson?.hosting?.rewrites;
  return Array.isArray(rewrites) ? rewrites : [];
}

export function getApiRewriteTarget(firebaseJson) {
  const rewrite = parseFirebaseHostingRewrites(firebaseJson).find(
    (item) => item?.source === "/api/**"
  );
  return {
    serviceId: String(rewrite?.run?.serviceId ?? "").trim(),
    region: String(rewrite?.run?.region ?? "").trim(),
  };
}

export function assertStagingHostingRewrite(firebaseJson, target, context) {
  assertIsolatedTarget(target, context);
  const site = requireExplicitValue(firebaseJson?.hosting?.site, "hosting.site", context);
  if (site !== target.hostingSite) {
    throw new Error(`${context}: hosting.site must equal explicit staging site`);
  }
  const { serviceId, region } = getApiRewriteTarget(firebaseJson);
  if (serviceId === PRODUCTION_CLOUD_RUN_SERVICE) {
    throw new Error(`${context}: Production Cloud Run service rewrite is forbidden`);
  }
  if (serviceId !== target.cloudRunService) {
    throw new Error(`${context}: /api/** service must equal explicit isolated service`);
  }
  if (!region || region !== target.region) {
    throw new Error(`${context}: /api/** region must equal explicit isolated region`);
  }
  assertNoProductionIdentifiers(firebaseJson, context);
}

export function assertSafetyFlagsOff(healthPayload) {
  if (!healthPayload || typeof healthPayload !== "object") {
    throw new Error("health payload missing");
  }
  if (healthPayload.publicSignupEnabled !== false) {
    throw new Error("publicSignupEnabled must explicitly be false");
  }
  if (healthPayload.leadCaptureEnabled !== false) {
    throw new Error("leadCaptureEnabled must explicitly be false");
  }
  if (healthPayload.dealerNotificationEnabled === true) {
    throw new Error("dealerNotificationEnabled must not be true");
  }
}

export function assertHealthEnvironmentIsolation(healthPayload, target) {
  assertSafetyFlagsOff(healthPayload);
  assertNoProductionIdentifiers(healthPayload, "staging health payload");
  const reportedProject =
    healthPayload.projectId ??
    healthPayload.firebaseProjectId ??
    healthPayload.googleCloudProject ??
    healthPayload.environment?.projectId;
  requireExplicitValue(reportedProject, "health project identity", "staging health payload");
  if (String(reportedProject) !== target.projectId) {
    throw new Error("staging health payload project does not match isolated target");
  }
}
