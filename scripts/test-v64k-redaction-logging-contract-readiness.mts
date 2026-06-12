/**
 * v6.4K — Redaction & Logging Contract Readiness (static validation only)
 * npm run test:v64k-redaction-logging-contract-readiness
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

const DOC_PATH = "docs/v6.4K-redaction-logging-contract-readiness.md";
const V64J_DOC = "docs/v6.4J-staging-secret-wiring-plan-docs-only.md";
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

const AUTO_LOGGING_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+add\s+runtime\s+logging/i,
  /this\s+document\s+is\s+approval\s+to\s+persist\s+ai\s+logs/i,
  /v6\.4K\s+approves\s+logging\s+automatically/i,
  /plan\s+authorizes\s+runtime\s+logging\s+automatically/i,
];

const RAW_PROMPT_SAMPLE_PATTERNS = [
  /ช่วยแนะนำรถยนต์\s+Toyota/i,
  /อยากซื้อรถ\s+\d{6,}/,
  /prompt:\s*["'][^"']{30,}["']/i,
];

const HEAD_SHA = "9daaec8affc51d8653fcd208053e12ea9b181d74";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.4K Redaction & Logging Contract Readiness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64jDoc = readFileSync(V64J_DOC, "utf8");
const v64iDoc = readFileSync(V64I_DOC, "utf8");
const v64hDoc = readFileSync(V64H_DOC, "utf8");
const v64gDoc = readFileSync(V64G_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64k-redaction-logging-contract-readiness.mts",
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

// --- 1–6. docs and adapter exist ---
{
  ok("v6.4K doc exists", doc.length > 6000);
  ok("doc v6.4K label", doc.includes("v6.4K"));
  ok("v6.4J doc exists", existsSync(V64J_DOC) && v64jDoc.includes("v6.4J"));
  ok("v6.4I doc exists", existsSync(V64I_DOC) && v64iDoc.includes("v6.4I"));
  ok("v6.4H doc exists", existsSync(V64H_DOC) && v64hDoc.includes("v6.4H"));
  ok("v6.4G doc exists", existsSync(V64G_DOC) && v64gDoc.includes("v6.4G"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
  ok("v6.4F doc exists", existsSync(V64F_DOC));
}

// --- 7–14. docs safety positioning ---
{
  ok("doc HEAD 9daaec8", doc.includes(HEAD_SHA) || doc.includes("9daaec8"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok(
    "doc no gemini activation",
    /does not activate Gemini|ไม่เปิด Gemini/i.test(doc)
  );
  ok(
    "doc no runtime logging implementation",
    /does not add runtime logging/i.test(doc)
  );
  ok(
    "doc no prompt provider sending",
    /does not send prompts to any provider/i.test(doc)
  );
  ok("doc no AI log persistence", /does not persist AI logs/i.test(doc));
  ok(
    "doc no analytics event creation",
    /does not create analytics events/i.test(doc)
  );
  ok(
    "doc no automatic future authorization",
    /does not authorize future logging changes automatically/i.test(doc)
  );
}

// --- 15–22. forbidden-to-log contract ---
{
  ok("doc forbidden-to-log contract", /Forbidden-to-Log Contract/i.test(doc));
  ok("doc raw prompt forbidden", /Raw user prompt/i.test(doc));
  ok("doc full UID forbidden", /Full UID/i.test(doc));
  ok("doc PII forbidden", /Email.*phone|PII/i.test(doc));
  ok("doc secret env dump forbidden", /Secret values|Env dump/i.test(doc));
  ok(
    "doc provider request response forbidden",
    /Provider request\/response body/i.test(doc)
  );
  ok(
    "doc real car data forbidden",
    /Exact car listing text|Real car images/i.test(doc)
  );
  ok(
    "doc license plate VIN chassis forbidden",
    /License plate.*VIN.*chassis|VIN.*chassis/i.test(doc)
  );
}

// --- 23–27. allowed metadata contract ---
{
  ok("doc allowed metadata contract", /Allowed Metadata Contract/i.test(doc));
  ok("doc providerMode metadata", /providerMode/i.test(doc));
  ok("doc providerStatus metadata", /providerStatus/i.test(doc));
  ok(
    "doc guard fallback reason code metadata",
    /guardDecision|blockedReasonCode|fallbackReasonCode/i.test(doc)
  );
  ok("doc redactionApplied metadata", /redactionApplied/i.test(doc));
  ok(
    "doc no reconstruction requirement",
    /must not reconstruct|Reconstruction prohibition/i.test(doc)
  );
}

// --- 28–32. redaction rules and approval gates ---
{
  ok("doc redaction rules", /Redaction Rules/i.test(doc));
  ok("doc REDACTED_PROMPT placeholder", /\[REDACTED_PROMPT\]/i.test(doc));
  ok("doc approval gates", /Logging Approval Gates/i.test(doc));
  ok(
    "doc logging sink access retention gates",
    /Logging sink approval|Retention policy approval|Access control approval/i.test(
      doc
    )
  );
  ok("doc separate deploy approval", /Separate deploy approval/i.test(doc));
  ok(
    "doc separate provider activation approval",
    /Separate provider activation approval/i.test(doc)
  );
}

// --- 33–37. sequence / stop / rollback / non-auth / boundary ---
{
  ok(
    "doc future logging sequence plan only",
    /Future Logging Sequence.*Plan Only/i.test(doc) &&
      /does not execute in v6\.4K/i.test(doc)
  );
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok("doc rollback removal plan", /Rollback.*Removal Plan/i.test(doc));
  ok(
    "doc non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to add runtime logging/i.test(doc)
  );
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
  ok("doc v6.4L boundary", /v6\.4L/i.test(doc));
  ok("doc v6.4M boundary", /v6\.4M/i.test(doc));
}

// --- 38–41. static guards ---
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

// --- 42–47. integration boundary ---
{
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("adapter no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc));
  ok(
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
  );
  ok("self no hosting deploy cmd", !/firebase deploy/.test(selfCodeOnly));
  ok("self no public debug route", !/debug\/|\/debug\b/.test(selfCodeOnly));
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

// --- 48. no secret-looking values ---
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

// --- non-auto logging auth ---
{
  for (const pat of AUTO_LOGGING_AUTH_PATTERNS) {
    ok(`doc no bad auth claim ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to persist logs phrase",
    /not approval to persist AI logs/i.test(doc)
  );
}

// --- cross-ref prior slices ---
{
  ok("doc references v6.4J", doc.includes("v6.4J"));
  ok("doc references v6.4I", doc.includes("v6.4I"));
  ok("doc references v6.4H", doc.includes("v6.4H"));
  ok("doc references v6.4G", doc.includes("v6.4G"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
}

// --- 49. no PII / raw prompt samples ---
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
  for (const pat of RAW_PROMPT_SAMPLE_PATTERNS) {
    ok(`doc no raw prompt sample ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`self no raw prompt sample ${pat.source.slice(0, 12)}`, !pat.test(selfSrc));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- 50. package script ---
{
  ok(
    "package v64k script",
    pkg.includes("test:v64k-redaction-logging-contract-readiness")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v64k-redaction-logging-contract-readiness.mts")
  );
}

console.log("\nDone v6.4K Redaction & Logging Contract Readiness tests.");
if (process.exitCode) process.exit(process.exitCode);
