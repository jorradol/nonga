/**
 * v6.4B — AI Control Model Types Static Readiness (static validation only)
 * npm run test:v64b-ai-control-model-types-static-readiness
 */
import { readFileSync } from "node:fs";
import {
  AI_CHAT_SHADOW_REAL_PROVIDER_FLAG_ENV,
  AI_CONTROL_ALLOWED_PROMPT_FIELDS,
  AI_CONTROL_FORBIDDEN_PROMPT_FIELDS,
  AI_CONTROL_ROLE_PERMISSIONS,
  AI_CONTROL_SURFACE_REGISTRY,
  AI_OUTPUT_GUARD_POLICY,
  DEFAULT_AI_CONTROL_PLANE_CONFIG,
  DEFAULT_AI_PROVIDER_STATUS,
  DEFAULT_AI_SURFACE_MODE,
  adminCanEnableRealProvider,
  buildPerListingCacheKeyReadiness,
  getDefaultSurfaceMode,
  isProductionRealProviderForbidden,
  isRealProviderStatus,
  isStagingRealProviderAllowed,
  resolveEffectiveProviderStatus,
  roleHasPermission,
} from "../src/config/aiControl/aiControlDefaults.ts";
import type {
  AiAuditEvent,
  AiProviderStatus,
} from "../src/config/aiControl/aiControlTypes.ts";

const DOC_PATH = "docs/v6.4B-ai-control-model-types-static-readiness.md";
const V64A_DOC =
  "docs/v6.4A-controlled-ai-gemini-admin-control-readiness.md";
const TYPES_PATH = "src/config/aiControl/aiControlTypes.ts";
const DEFAULTS_PATH = "src/config/aiControl/aiControlDefaults.ts";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b0[689]\d{8}\b/,
];

const LINE_ID_PATTERNS = [/@line[a-z0-9._-]{2,}/i, /line\.me\/ti\/p\//i];

const FULL_PLATE_DATA_PATTERNS = [/\b[ก-ฮ]{2}\s?\d{1,4}\s?[ก-ฮ]{1,2}\b/];

const RAW_IMAGE_URL_PATTERNS = [
  /https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i,
  /firebasestorage\.googleapis\.com/i,
  /storage\.googleapis\.com/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Yaris|Vios|Altis|Revo|Vigo)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V|Jazz|CR-V|Accord)\b/i,
  /\bFord\s+Everest\b/i,
  /\bMitsubishi\s+Pajero\b/i,
  /\bIsuzu\s+(?:D-Max|Mu-X)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const HEAD_SHA = "51962c82d818a79b85c316a9699885deb0fb5f7f";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.4B AI Control Model Types Static Readiness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const typesSrc = readFileSync(TYPES_PATH, "utf8");
const defaultsSrc = readFileSync(DEFAULTS_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64b-ai-control-model-types-static-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v64aDoc = readFileSync(V64A_DOC, "utf8");
const combinedSrc = typesSrc + defaultsSrc + selfSrc;

const docForPlateScan = doc.replace(
  /Forbidden:[\s\S]*?## 10\. Output Guard Policy/,
  "## 10. Output Guard Policy"
);

// --- doc exists + v6.4B ---
{
  ok("readiness doc exists", doc.length > 4000);
  ok("doc v6.4B label", doc.includes("v6.4B"));
  ok(
    "doc ai control model types static readiness",
    /ai control model types static readiness/i.test(doc)
  );
  ok("doc HEAD 51962c8", doc.includes(HEAD_SHA) || doc.includes("51962c8"));
  ok("doc references v64a", /v6\.4A/i.test(doc));
  ok("doc static model only", /static model|types\/defaults/i.test(docLower));
  ok("doc no runtime enable", /no runtime enable|not in v6\.4B/i.test(docLower));
}

// --- module map ---
{
  ok("doc module map aiControlTypes", /aiControlTypes\.ts/i.test(doc));
  ok("doc module map aiControlDefaults", /aiControlDefaults\.ts/i.test(doc));
  ok("types file exists", typesSrc.length > 1000);
  ok("defaults file exists", defaultsSrc.length > 1000);
}

// --- default provider status OFF ---
{
  ok("DEFAULT_AI_PROVIDER_STATUS is OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok(
    "DEFAULT_AI_CONTROL_PLANE_CONFIG provider OFF",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.providerStatus === "OFF"
  );
  ok(
    "shadow real provider flag false",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.chatShadowRealProviderEnabled === false
  );
  ok(
    "shadow flag env name documented",
    AI_CHAT_SHADOW_REAL_PROVIDER_FLAG_ENV ===
      "NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED"
  );
}

// --- provider status enum ---
{
  ok("types AiProviderStatus OFF", /"OFF"/.test(typesSrc));
  ok("types AiProviderStatus MOCK", /"MOCK"/.test(typesSrc));
  ok("types AiProviderStatus STAGING_REAL", /STAGING_REAL/.test(typesSrc));
  ok("types AiProviderStatus DISABLED", /"DISABLED"/.test(typesSrc));
}

// --- production real provider forbidden ---
{
  ok(
    "production real forbidden",
    isProductionRealProviderForbidden("production") === true
  );
  ok(
    "staging not production forbidden",
    isProductionRealProviderForbidden("staging") === false
  );
  ok("doc production real forbidden", /production real provider.*forbidden/i.test(doc));
}

// --- staging real requirements ---
{
  ok(
    "staging real blocked without approval",
    isStagingRealProviderAllowed({
      environment: "staging",
      stagingApprovalGranted: false,
      allowlistConfigured: true,
      capsConfigured: true,
      killSwitchActive: false,
    }) === false
  );
  ok(
    "staging real blocked on production",
    isStagingRealProviderAllowed({
      environment: "production",
      stagingApprovalGranted: true,
      allowlistConfigured: true,
      capsConfigured: true,
      killSwitchActive: false,
    }) === false
  );
  ok(
    "staging real blocked kill switch",
    isStagingRealProviderAllowed({
      environment: "staging",
      stagingApprovalGranted: true,
      allowlistConfigured: true,
      capsConfigured: true,
      killSwitchActive: true,
    }) === false
  );
  ok(
    "staging real allowed when prerequisites met",
    isStagingRealProviderAllowed({
      environment: "staging",
      stagingApprovalGranted: true,
      allowlistConfigured: true,
      capsConfigured: true,
      killSwitchActive: false,
    }) === true
  );
}

// --- kill switch ---
{
  ok(
    "kill switch resolves DISABLED",
    resolveEffectiveProviderStatus({
      providerStatus: "STAGING_REAL",
      killSwitchActive: true,
    }) === "DISABLED"
  );
  ok(
    "kill switch off preserves status",
    resolveEffectiveProviderStatus({
      providerStatus: "MOCK",
      killSwitchActive: false,
    }) === "MOCK"
  );
  ok(
    "default kill switch inactive",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.killSwitch.active === false
  );
}

// --- admin cannot enable real provider ---
{
  ok("admin cannot enable real provider", adminCanEnableRealProvider() === false);
  ok(
    "admin lacks changeMockOrOff",
    roleHasPermission("admin", "changeMockOrOff") === false
  );
  ok(
    "admin lacks approveStagingRealReadiness",
    roleHasPermission("admin", "approveStagingRealReadiness") === false
  );
  ok(
    "admin lacks setCapsReadiness",
    roleHasPermission("admin", "setCapsReadiness") === false
  );
  ok(
    "admin lacks triggerKillSwitchReadiness",
    roleHasPermission("admin", "triggerKillSwitchReadiness") === false
  );
  ok(
    "admin can viewStatus",
    roleHasPermission("admin", "viewStatus") === true
  );
}

// --- superadmin permissions ---
{
  ok(
    "superadmin can approveStagingRealReadiness",
    roleHasPermission("superadmin", "approveStagingRealReadiness") === true
  );
  ok(
    "superadmin can triggerKillSwitchReadiness",
    roleHasPermission("superadmin", "triggerKillSwitchReadiness") === true
  );
  ok(
    "superadmin can setCapsReadiness",
    roleHasPermission("superadmin", "setCapsReadiness") === true
  );
  ok(
    "superadmin can manageAllowlistReadiness",
    roleHasPermission("superadmin", "manageAllowlistReadiness") === true
  );
}

// --- surface registry defaults ---
{
  ok("surface registry count 5", AI_CONTROL_SURFACE_REGISTRY.length === 5);
  ok(
    "surface buyerFriendlyDetailPreview",
    AI_CONTROL_SURFACE_REGISTRY.some(
      (surface) => surface.id === "buyerFriendlyDetailPreview"
    )
  );
  ok(
    "surface inChatGoldenSellerWeave",
    AI_CONTROL_SURFACE_REGISTRY.some(
      (surface) => surface.id === "inChatGoldenSellerWeave"
    )
  );
  ok(
    "surface sellerListingCopy",
    AI_CONTROL_SURFACE_REGISTRY.some(
      (surface) => surface.id === "sellerListingCopy"
    )
  );
  ok(
    "surface buyerChatAnswer",
    AI_CONTROL_SURFACE_REGISTRY.some(
      (surface) => surface.id === "buyerChatAnswer"
    )
  );
  ok(
    "surface recommendationExplanation",
    AI_CONTROL_SURFACE_REGISTRY.some(
      (surface) => surface.id === "recommendationExplanation"
    )
  );
  for (const surface of AI_CONTROL_SURFACE_REGISTRY) {
    ok(
      `surface ${surface.id} default deterministic`,
      getDefaultSurfaceMode(surface.id) === "DETERMINISTIC_ONLY"
    );
  }
  ok(
    "DEFAULT_AI_SURFACE_MODE deterministic",
    DEFAULT_AI_SURFACE_MODE === "DETERMINISTIC_ONLY"
  );
}

// --- cost caps model ---
{
  ok(
    "daily request cap null default",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.costCaps.dailyRequestCap === null
  );
  ok(
    "per user session cap null default",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.costCaps.perUserSessionCap === null
  );
  ok(
    "cost guard usd null default",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.costCaps.costGuardUsd === null
  );
  ok(
    "no repeat generation enabled",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.noRepeatGeneration.enabled === true
  );
  ok(
    "output guard onFail deterministic",
    AI_OUTPUT_GUARD_POLICY.onFail === "deterministic"
  );
  const cacheKey = buildPerListingCacheKeyReadiness({
    brand: "ยี่ห้อตัวอย่าง",
    model: "รุ่นตัวอย่าง",
    year: 2020,
    price: 420000,
  });
  ok("cache key built", cacheKey.includes("brand:ยี่ห้อตัวอย่าง"));
  ok("cache key no uid field", !cacheKey.includes("uid"));
}

// --- audit event redacted ---
{
  const sampleEvent: AiAuditEvent = {
    eventType: "providerStateChange",
    actorRole: "superadmin",
    maskedActorId: "adm_***xyz",
    surface: "global",
    previousStatus: "OFF",
    nextStatus: "MOCK",
    reason: "staging readiness test",
    timestamp: "2026-06-12T00:00:00.000Z",
  };
  ok("audit masked actor id", sampleEvent.maskedActorId.includes("***"));
  ok("audit no fullUid field in type", !("fullUid" in sampleEvent));
  ok("audit no rawPrompt field in type", !("rawPrompt" in sampleEvent));
  ok("audit no secret field in type", !("secret" in sampleEvent));
  ok("types maskedActorId", /maskedActorId/.test(typesSrc));
  ok("doc audit redacted", /maskedActorId|redacted/i.test(doc));
}

// --- prompt/data boundary ---
{
  ok("allowed fields brand", AI_CONTROL_ALLOWED_PROMPT_FIELDS.includes("brand"));
  ok("allowed fields model", AI_CONTROL_ALLOWED_PROMPT_FIELDS.includes("model"));
  ok("allowed fields year", AI_CONTROL_ALLOWED_PROMPT_FIELDS.includes("year"));
  ok(
    "allowed fields sanitized description",
    AI_CONTROL_ALLOWED_PROMPT_FIELDS.includes("sanitizedPublicDescription")
  );
  ok(
    "forbidden licensePlate",
    AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.includes("licensePlate")
  );
  ok("forbidden phone", AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.includes("phone"));
  ok("forbidden line", AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.includes("line"));
  ok("forbidden fullUid", AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.includes("fullUid"));
  ok(
    "forbidden wholesale",
    AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.includes("wholesaleInternalPrice")
  );
  ok(
    "forbidden secret env",
    AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.includes("secretEnvValues")
  );
  ok(
    "forbidden raw image url",
    AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.includes("rawImageUrl")
  );
  ok(
    "forbidden raw prompt dump",
    AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.includes("rawPromptDumpWithPii")
  );
}

// --- output guard policy ---
{
  ok("output guard pii category", AI_OUTPUT_GUARD_POLICY.categories.includes("pii"));
  ok(
    "output guard forbiddenClaims",
    AI_OUTPUT_GUARD_POLICY.categories.includes("forbiddenClaims")
  );
  ok("output guard hype", AI_OUTPUT_GUARD_POLICY.categories.includes("hype"));
  ok(
    "output guard kmPerLiterWithoutSource",
    AI_OUTPUT_GUARD_POLICY.categories.includes("kmPerLiterWithoutSource")
  );
  ok(
    "output guard accident claim",
    AI_OUTPUT_GUARD_POLICY.categories.includes(
      "accidentConditionOwnershipClaim"
    )
  );
  ok(
    "output guard mixed token",
    AI_OUTPUT_GUARD_POLICY.categories.includes("mixedThaiLatinCorruptedToken")
  );
  ok(
    "output guard finance claim",
    AI_OUTPUT_GUARD_POLICY.categories.includes("financeClaimWithoutSource")
  );
}

// --- no real gemini / no network in source ---
{
  ok("defaults no fetch", !/fetch\s*\(/.test(defaultsSrc));
  ok("defaults no generateContent", !/generateContent/.test(defaultsSrc));
  ok("types no generateContent", !/generateContent/.test(typesSrc));
  ok(
    "defaults no gemini import",
    !/from\s+["'].*gemini/i.test(defaultsSrc)
  );
  ok(
    "isRealProviderStatus STAGING_REAL only",
    isRealProviderStatus("STAGING_REAL") === true &&
      isRealProviderStatus("OFF") === false
  );
  ok("role permissions matrix defined", AI_CONTROL_ROLE_PERMISSIONS.admin.size > 0);
}

// --- rollout phases ---
{
  ok("rollout v64c admin panel", /v6\.4C.*admin read-only/i.test(doc));
  ok("rollout v64e approval separate", /v6\.4E.*approval แยก|approval แยก/i.test(doc));
  ok("v64a maps to v64b", /v6\.4B.*model\/types/i.test(v64aDoc));
}

// --- forbidden / no deploy ---
{
  ok("forbidden no deploy", /no deploy|forbidden.*deploy/i.test(docLower));
  ok("forbidden no env update", /env update/i.test(docLower));
  ok("forbidden no gcloud secrets", /gcloud secrets/i.test(docLower));
  ok("forbidden no admin UI", /Admin UI จริง|no runtime UI/i.test(doc));
  ok("forbidden no real gemini", /real Gemini/i.test(doc));
}

// --- no PII/secrets in doc and source ---
{
  const docForUidScan = doc.replace(
    /Git baseline:[\s\S]*?Branch:/,
    "Branch:"
  );
  for (const content of [docForUidScan, typesSrc, defaultsSrc]) {
    const label =
      content === docForUidScan ? "doc" : content === typesSrc ? "types" : "defaults";
    for (const pat of REAL_PHONE_PATTERNS) {
      ok(`${label} no phone`, !pat.test(content));
    }
    for (const pat of SECRET_VALUE_PATTERNS) {
      ok(`${label} no secret value`, !pat.test(content));
    }
  }
  ok(
    "types forbids fullUid in prompt boundary",
    AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.includes("fullUid")
  );
  ok(
    "audit type uses maskedActorId not fullUid",
    /maskedActorId/.test(typesSrc) && !/"fullUid":/.test(typesSrc)
  );
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(`doc no plate ${pat.source.slice(0, 12)}`, !pat.test(docForPlateScan));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("combined no generateContent call", !/generateContent\s*\(/.test(combinedSrc));
}

// --- package.json ---
{
  ok(
    "package v64b script",
    pkg.includes("test:v64b-ai-control-model-types-static-readiness")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64b-ai-control-model-types-static-readiness.mts"
    )
  );
}

console.log("\nDone v6.4B AI Control Model Types Static Readiness tests.");
if (process.exitCode) process.exit(process.exitCode);
