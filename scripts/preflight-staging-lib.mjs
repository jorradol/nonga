export const EXPECTED_BRANCH = "feature/chat-image-attachment-v1";
export const EXPECTED_PROJECT_ID = "nonga-ce93c";
export const EXPECTED_HOSTING_SITE = "nonga-ce93c";
export const EXPECTED_CLOUD_RUN_SERVICE = "nonga-staging";
export const EXPECTED_CLOUD_RUN_REGION = "asia-southeast1";
export const EXPECTED_CLOUD_RUN_REVISION = "nonga-staging-00215-dmx";
export const EXPECTED_MARKETPLACE_COUNT = 15;
export const EXPECTED_STAGING_URL = "https://a.nongbot.org";
export const STAGING_HOSTNAME = "a.nongbot.org";

export function parseJsonStrict(label, raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON`);
  }
}

export function getCloudRunRevision(serviceJson) {
  return serviceJson?.status?.latestReadyRevisionName ?? "";
}

export function getCarsCount(carsPayload) {
  if (!carsPayload || typeof carsPayload !== "object") return NaN;
  return Number(carsPayload.count);
}

export function getPublicSignupEnabled(healthPayload) {
  if (!healthPayload || typeof healthPayload !== "object") return undefined;
  return healthPayload.publicSignupEnabled;
}

export function isExpectedStagingUrl(rawUrl) {
  try {
    const parsed = new URL(String(rawUrl));
    return parsed.protocol === "https:" && parsed.hostname === STAGING_HOSTNAME;
  } catch {
    return false;
  }
}

export function parseMainJsAssetFromHtml(htmlText) {
  if (typeof htmlText !== "string" || htmlText.length === 0) return null;
  const scriptSrcMatches = [
    ...htmlText.matchAll(
      /<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["'][^>]*>/gi
    ),
  ];
  for (const match of scriptSrcMatches) {
    const src = String(match[1] ?? "").trim();
    if (/^\/?assets\/index-[A-Za-z0-9_-]+\.js$/.test(src)) {
      return src.replace(/^\//, "");
    }
  }
  return null;
}

export function maskValue(value) {
  if (typeof value !== "string" || value.length <= 4) return "***";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function isProductionLikeProject(projectId) {
  if (typeof projectId !== "string") return false;
  return /\bprod|production\b/i.test(projectId);
}

export function formatMismatch(name, expected, actual) {
  return `${name} mismatch: expected '${expected}' got '${actual}'`;
}
