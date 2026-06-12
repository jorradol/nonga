/**
 * v6.4J — Staging Secret Wiring Plan, Docs Only (static validation only)
 * npm run test:v64j-staging-secret-wiring-plan-docs-only
 */
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  isProductionRealProviderForbidden,
} from "../src/config/aiControl/aiControlDefaults.ts";
import {
  REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED,
  REAL_PROVIDER_SECRET_READINESS,
  invokeRealProviderAdapterSkeleton,
} from "../src/services/ai/realProviderAdapter.ts";

const DOC_PATH = "docs/v6.4J-staging-secret-wiring-plan-docs-only.md";
const V64I_DOC = "docs/v6.4I-owner-approval-packet-pilot-runbook.md";
const V64H_DOC = "docs/v6.4H-real-pilot-dry-run-gate-plan.md";
const V64G_DOC = "docs/v6.4G-ai-control-contract-safety-evidence-readiness.md";
const V64F_DOC =
  "docs/v6.4F-real-provider-adapter-skeleton-disabled-by-default.md";
const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const APP_PATH = "src/App.tsx";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/i,
];

const SECRET_LOOKING_PLACEHOLDER_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{10,}/,
  /\bsk-[a-zA-Z0-9]{16,}\b/,
  /example-api-key-[a-z0-9]{8,}/i,
  /your[_-]?gemini[_-]?api[_-]?key/i,
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
];

const AUTO_SECRET_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+create\s+a\s+secret/i,
  /this\s+document\s+is\s+approval\s+to\s+bind/i,
  /plan\s+authorizes\s+secret\s+wiring\s+automatically/i,
  /v6\.4J\s+approves\s+secret\s+binding/i,
];

const SAFE_RESOURCE_PLACEHOLDER =
  "projects/<approved-staging-project>/secrets/<approved-gemini-staging-secret>";

const HEAD_SHA = "0d19b2d86078637424661656d9615d521ee69a66";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.4J Staging Secret Wiring Plan, Docs Only ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64iDoc = readFileSync(V64I_DOC, "utf8");
const v64hDoc = readFileSync(V64H_DOC, "utf8");
const v64gDoc = readFileSync(V64G_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64j-staging-secret-wiring-plan-docs-only.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

const selfCodeOnly = selfSrc
  .split("\n")
  .filter((line) => {
    const t = line.trimStart();
    if (t.startsWith("ok(") || t.startsWith('ok("')) return false;
    if (t.startsWith('"') && t.endsWith(",")) return false;
    if (/^\!\/.*\/\.test/.test(t)) return false;
    return true;
  })
  .join("\n");

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- 1–5. docs and adapter exist ---
{
  ok("v6.4J doc exists", doc.length > 8000);
  ok("doc v6.4J label", doc.includes("v6.4J"));
  ok("v6.4I doc exists", existsSync(V64I_DOC) && v64iDoc.includes("v6.4I"));
  ok("v6.4H doc exists", existsSync(V64H_DOC) && v64hDoc.includes("v6.4H"));
  ok("v6.4G doc exists", existsSync(V64G_DOC) && v64gDoc.includes("v6.4G"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
  ok("v6.4F doc exists", existsSync(V64F_DOC));
}

// --- 6–13. docs safety positioning ---
{
  ok("doc HEAD 0d19b2d", doc.includes(HEAD_SHA) || doc.includes("0d19b2d"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok(
    "doc no gemini activation",
    /does not activate Gemini|ไม่เปิด Gemini/i.test(doc)
  );
  ok("doc no secret creation", /does not create secrets/i.test(doc));
  ok("doc no secret read", /does not read secrets/i.test(doc));
  ok(
    "doc no Cloud Run secret binding",
    /does not bind secrets to Cloud Run/i.test(doc)
  );
  ok("doc no env update", /does not update env vars/i.test(doc));
  ok(
    "doc no automatic future authorization",
    /does not authorize future secret wiring automatically/i.test(doc)
  );
}

// --- 14–15. resource placeholder ---
{
  ok("doc safe resource placeholder", doc.includes(SAFE_RESOURCE_PLACEHOLDER));
  ok(
    "doc non-secret placeholder note",
    /non-secret resource-name placeholder only/i.test(doc)
  );
}

// --- 16–28. approval gates ---
{
  ok("doc owner approval gate", /Owner approval for secret wiring/i.test(doc));
  ok("doc staging-only gate", /Staging-only environment/i.test(doc));
  ok("doc IAM least privilege gate", /IAM least-privilege/i.test(doc));
  ok("doc no env dump policy", /No env dump/i.test(doc));
  ok(
    "doc no raw prompt PII policy",
    /No raw prompt.*PII logging|raw prompt.*PII/i.test(doc)
  );
  ok("doc redaction verification", /Redaction verification/i.test(doc));
  ok("doc cost cap gate", /Cost cap confirmed/i.test(doc));
  ok("doc kill switch gate", /Kill switch confirmed/i.test(doc));
  ok("doc allowlist gate", /Allowlist confirmed/i.test(doc));
  ok("doc rollback removal plan", /Rollback\/removal plan approved/i.test(doc));
  ok("doc rotation plan", /Rotation plan approved/i.test(doc));
  ok(
    "doc separate Cloud Run env approval",
    /Separate Cloud Run env update approval/i.test(doc)
  );
  ok("doc separate deploy approval", /Separate deploy approval/i.test(doc));
}

// --- 29–33. sequence / verification / stop / non-auth / boundary ---
{
  ok(
    "doc future wiring sequence plan only",
    /Future Wiring Sequence.*Plan Only/i.test(doc) &&
      /does not execute in v6\.4J/i.test(doc)
  );
  ok("doc verification rules", /Verification Rules/i.test(doc));
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok(
    "doc non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to create a secret/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4K boundary", /v6\.4K/i.test(doc));
  ok("doc v6.4M execution candidate", /v6\.4M/i.test(doc));
}

// --- 34–39. static guards ---
{
  ok("adapter no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(adapterSrc));
  ok("self no gemini sdk", !/from\s+['"]@google\/generative-ai['"]/.test(selfCodeOnly));
  ok(
    "combined no generateContent",
    !/generateContent\s*\(/.test(selfCodeOnly + adapterSrc)
  );
  ok(
    "combined no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(selfCodeOnly + adapterSrc)
  );
  ok("adapter no proc env read", !/\bprocess\.env\b/.test(adapterSrc));
  ok("self no proc env read", !/\bprocess\.env\b/.test(selfCodeOnly));
  ok(
    "self no gcloud access",
    !/gcloud\s+secrets/.test(selfCodeOnly) &&
      !/execSync\s*\(\s*[`'"]gcloud/.test(selfCodeOnly)
  );
  ok("self no dotenv file write", !/writeFileSync\s*\([^)]*\.env/.test(selfCodeOnly));
}

// --- 40–43. integration boundary ---
{
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("adapter no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc));
  ok(
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
  );
  ok("self no hosting deploy cmd", !/firebase deploy/.test(selfCodeOnly));
}

// --- runtime contract ---
{
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok("admin cannot enable", adminCanEnableRealProvider() === false);
  ok("adapter default disabled", REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED === false);
  ok(
    "production forbidden",
    isProductionRealProviderForbidden("production") === true
  );
  const result = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
  });
  ok("adapter invoke blocked", result.blocked === true);
  ok("adapter realGeminiEnabled false", result.metadata.realGeminiEnabled === false);
  ok("adapter networkCallMade false", result.metadata.networkCallMade === false);
  ok(
    "adapter secret readiness names only",
    REAL_PROVIDER_SECRET_READINESS.smResourceName === "gemini-api-key"
  );
}

// --- 44. no secret-looking values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret value ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`self no secret value ${pat.source.slice(0, 12)}`, !pat.test(selfSrc));
  }
  for (const pat of SECRET_LOOKING_PLACEHOLDER_PATTERNS) {
    ok(`doc no secret-like ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`self no secret-like ${pat.source.slice(0, 12)}`, !pat.test(selfSrc));
  }
}

// --- non-auto secret auth ---
{
  for (const pat of AUTO_SECRET_AUTH_PATTERNS) {
    ok(`doc no bad auth claim ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to bind phrase in clause",
    /not approval to bind a secret/i.test(doc)
  );
}

// --- cross-ref prior slices ---
{
  ok("doc references v6.4I", doc.includes("v6.4I"));
  ok("doc references v6.4H", doc.includes("v6.4H"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
}

// --- no PII ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of RAW_IMAGE_URL_PATTERNS) {
    ok(`doc no raw image URL ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production nongbot.org url", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(`doc no plate data ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- 45. package script ---
{
  ok(
    "package v64j script",
    pkg.includes("test:v64j-staging-secret-wiring-plan-docs-only")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v64j-staging-secret-wiring-plan-docs-only.mts")
  );
}

console.log("\nDone v6.4J Staging Secret Wiring Plan, Docs Only tests.");
if (process.exitCode) process.exit(process.exitCode);
