/**
 * v6.5C — Production Cost Guard & Quota Review Packet (static validation only)
 * npm run test:v65c-production-cost-guard-quota-review-packet
 */
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  isProductionRealProviderForbidden,
} from "../src/config/aiControl/aiControlDefaults.ts";
import {
  REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED,
  invokeRealProviderAdapterSkeleton,
} from "../src/services/ai/realProviderAdapter.ts";
import {
  SYNTHETIC_REDACTION_FIXTURES,
  assertNoForbiddenSensitiveContent,
} from "../src/services/ai/redactionTestFixtures.ts";

const DOC_PATH = "docs/v6.5C-production-cost-guard-quota-review-packet.md";
const V65B_DOC =
  "docs/v6.5B-production-privacy-data-handling-review-packet.md";
const V65A_DOC =
  "docs/v6.5A-production-readiness-gap-review-phase-transition-baseline.md";
const V64U_DOC =
  "docs/v6.4U-pilot-monitoring-kill-switch-verification-approval-packet.md";
const V64T_DOC =
  "docs/v6.4T-staging-real-provider-pilot-smoke-final-go-no-go-approval-packet.md";
const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const APP_PATH = "src/App.tsx";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/i,
];

const SECRET_LOOKING_PLACEHOLDER_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{10,}/,
  /\bsk-[a-zA-Z0-9]{16,}\b/,
  /your[_-]?gemini[_-]?api[_-]?key/i,
];

const BILLING_SENSITIVE_PATTERNS = [
  /\bbilling[_-]?account[_-]?id\s*[=:]\s*['"][^'"]{6,}['"]/i,
  /\binvoice[_-]?(?:number|id)\s*[=:]\s*['"][^'"]{6,}['"]/i,
  /payment[_-]?method\s*[=:]\s*['"][^'"]{6,}['"]/i,
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
];

const REAL_PROJECT_ID_PATTERNS = [
  /\bnonga-ce93c\b/i,
  /projects\/nonga-[a-z0-9]+\/secrets\//i,
];

const REAL_PHONE_PATTERNS = [/\b0[689]\d{8}\b/];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V)\b/i,
];

const REAL_LISTING_SAMPLE_PATTERNS = [
  /รถมือสอง\s+ราคา\s+\d{5,}/,
  /เจ้าของขายเอง\s+โทร/i,
];

const AUTO_EXEC_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+deploy/i,
  /v6\.5C\s+approves\s+production\s+automatically/i,
  /v6\.5C\s+authorizes\s+billing\s+automatically/i,
  /packet\s+authorizes\s+quota\s+configuration\s+automatically/i,
];

const HEAD_SHA = "c669c854c0383e51f86d5c93850afca53812fffb";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.5C Production Cost Guard & Quota Review Packet ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v65bDoc = readFileSync(V65B_DOC, "utf8");
const v65aDoc = readFileSync(V65A_DOC, "utf8");
const v64uDoc = readFileSync(V64U_DOC, "utf8");
const v64tDoc = readFileSync(V64T_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v65c-production-cost-guard-quota-review-packet.mts",
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

// --- 1–6. docs and modules exist ---
{
  ok("v6.5C doc exists", doc.length > 8000);
  ok("doc v6.5C label", doc.includes("v6.5C"));
  ok("v6.5B doc exists", existsSync(V65B_DOC) && v65bDoc.includes("v6.5B"));
  ok("v6.5A doc exists", existsSync(V65A_DOC) && v65aDoc.includes("v6.5A"));
  ok("v6.4U doc exists", existsSync(V64U_DOC) && v64uDoc.includes("v6.4U"));
  ok("v6.4T doc exists", existsSync(V64T_DOC) && v64tDoc.includes("v6.4T"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- 7–21. safety positioning ---
{
  ok("doc HEAD c669c85", doc.includes(HEAD_SHA) || doc.includes("c669c85"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /does not deploy|no deploy/i.test(docLower));
  ok(
    "doc no production touch",
    /does not touch production|no production touch/i.test(doc)
  );
  ok(
    "doc no billing setting change",
    /does not change billing settings|no billing.*setting change/i.test(doc)
  );
  ok(
    "doc no quota setting change",
    /does not change quota settings|no quota.*setting change/i.test(doc)
  );
  ok(
    "doc no rate-limit setting change",
    /does not change rate-limit settings|no rate-limit.*setting change/i.test(
      doc
    )
  );
  ok(
    "doc no Cloud Run env update",
    /does not update Cloud Run env|no Cloud Run env update/i.test(doc)
  );
  ok(
    "doc no gcloud execution",
    /does not execute gcloud|no gcloud command execution/i.test(doc)
  );
  ok("doc no Gemini invocation", /does not invoke Gemini/i.test(doc));
  ok(
    "doc no prompt provider sending",
    /does not send prompts or provider payloads/i.test(doc)
  );
  ok(
    "doc no runtime invocation code",
    /no runtime invocation code/i.test(doc)
  );
  ok(
    "doc no runtime monitoring logging",
    /does not add runtime monitoring\/logging|no runtime monitoring\/logging implementation/i.test(
      doc
    )
  );
  ok(
    "doc no AI log persistence analytics",
    /does not persist AI logs|no AI log persistence|analytics events/i.test(doc)
  );
  ok("doc no pilot start", /does not start any pilot|no pilot start/i.test(doc));
  ok(
    "doc no production promotion",
    /does not promote to production|no production promotion/i.test(doc)
  );
  ok(
    "doc cost quota review packet only",
    /cost guard and quota review packet only|cost guard & quota review packet/i.test(
      doc
    )
  );
}

// --- 22–53. required sections ---
{
  ok(
    "doc cost guard decision template",
    /Cost Guard Decision Template/i.test(doc)
  );
  ok("doc default decision is NO-GO", /Default.*NO-GO|Default:\s*NO-GO/i.test(doc));
  ok("doc billing owner", /Approved billing owner|billing owner/i.test(doc));
  ok("doc cost cap owner", /Approved cost cap owner|cost cap owner/i.test(doc));
  ok("doc daily cap", /Approved daily cap|daily cap/i.test(doc));
  ok("doc per-run cap", /Approved per-run cap|per-run cap/i.test(doc));
  ok("doc per-user cap", /Approved per-user cap|per-user cap/i.test(doc));
  ok(
    "doc token bucket policy",
    /Approved token bucket policy|token bucket policy/i.test(doc)
  );
  ok(
    "doc request-per-minute limit",
    /request-per-minute limit|Approved request-per-minute/i.test(doc)
  );
  ok(
    "doc request-per-day limit",
    /request-per-day limit|Approved request-per-day/i.test(doc)
  );
  ok(
    "doc kill switch owner",
    /Approved kill switch owner|kill switch owner/i.test(doc)
  );
  ok("doc stop threshold", /Approved stop threshold|stop threshold/i.test(doc));
  ok(
    "doc alert threshold",
    /Approved alert threshold|alert threshold/i.test(doc)
  );
  ok(
    "doc explicit billing configuration approval",
    /Explicit billing configuration approval/i.test(doc)
  );
  ok(
    "doc explicit quota rate-limit configuration approval",
    /Explicit quota\/rate-limit configuration approval/i.test(doc)
  );
  ok("doc cost risk model", /Cost Risk Model/i.test(doc));
  ok(
    "doc accidental real provider activation risk",
    /Accidental real provider activation/i.test(doc)
  );
  ok("doc missing quota cap risk", /Missing quota cap/i.test(doc));
  ok(
    "doc runaway loop retry storm risk",
    /Runaway loop.*repeated retry|retry storm/i.test(doc)
  );
  ok(
    "doc quota rate limit boundary",
    /Quota \/ Rate Limit Boundary/i.test(doc)
  );
  ok(
    "doc fail closed if cap state unknown",
    /Fail closed if cap state unknown|fail closed if cap state unknown/i.test(doc)
  );
  ok(
    "doc kill switch before network",
    /Kill switch before network/i.test(doc)
  );
  ok(
    "doc fallback when cap exceeded",
    /Fallback when cap exceeded/i.test(doc)
  );
  ok("doc cost monitoring boundary", /Cost Monitoring Boundary/i.test(doc));
  ok("doc allowed metadata list", /Allowed metadata-only/i.test(doc));
  ok(
    "doc forbidden billing payment details",
    /Invoice details|Payment method|Billing account ID/i.test(doc)
  );
  ok("doc cost stop conditions", /Cost Stop Conditions/i.test(doc));
  ok(
    "doc production cost readiness gaps",
    /Production Cost Readiness Gaps/i.test(doc)
  );
  ok("doc recommended next steps", /Recommended Next Steps/i.test(doc));
  ok("doc roadmap v6.5D", /v6\.5D/i.test(doc));
  ok("doc roadmap v6.5G", /v6\.5G/i.test(doc));
  ok(
    "doc explicit non-authorization clause",
    /Explicit Non-Authorization Clause/i.test(doc) &&
      /not approval to configure billing/i.test(doc)
  );
  ok("doc rollback removal plan", /Rollback \/ Removal Plan/i.test(doc));
  ok("doc future version boundary", /Future Version Boundary/i.test(doc));
}

// --- no real project id in doc ---
{
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- 54–65. static guards ---
{
  ok(
    "adapter no gemini sdk",
    !/from\s+['"]@google\/generative-ai['"]/.test(adapterSrc)
  );
  ok(
    "self no gemini sdk",
    !/from\s+['"]@google\/generative-ai['"]/.test(selfCodeOnly)
  );
  ok(
    "combined no generateContent call",
    !/generateContent\s*\(/.test(adapterSrc + selfCodeOnly)
  );
  ok(
    "combined no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(adapterSrc + selfCodeOnly)
  );
  ok("adapter no proc env read", !/\bprocess\.env\b/.test(adapterSrc));
  ok("self no proc env read", !/\bprocess\.env\b/.test(selfCodeOnly));
  ok(
    "self no gcloud command execution",
    !/execSync\s*\(/.test(selfCodeOnly) &&
      !/spawnSync\s*\(/.test(selfCodeOnly) &&
      !/child_process/.test(selfCodeOnly)
  );
  ok(
    "self no dotenv file write",
    !/writeFileSync\s*\([^)]*\.env/.test(selfCodeOnly)
  );
  ok(
    "app no redactionTestFixtures import",
    !appSrc.includes("redactionTestFixtures")
  );
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok(
    "adapter no firestore write",
    !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc)
  );
  ok(
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
  );
  ok("self no hosting deploy cmd", !/firebase deploy/.test(selfCodeOnly));
  ok("self no public debug route", !/debug\/|\/debug\b/.test(selfCodeOnly));
  ok(
    "self no runtime logging implementation",
    !/createLogger|winston|pino\b/.test(selfCodeOnly)
  );
  ok(
    "self no AI log persistence",
    !/analytics\.track|logEvent|persistAiLog/.test(selfCodeOnly)
  );
}

// --- runtime contract ---
{
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok("admin cannot enable", adminCanEnableRealProvider() === false);
  ok(
    "adapter default disabled",
    REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED === false
  );
  ok(
    "production forbidden",
    isProductionRealProviderForbidden("production") === true
  );
  const result = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
  });
  ok("adapter invoke blocked", result.blocked === true);
  ok(
    "adapter realGeminiEnabled false",
    result.metadata.realGeminiEnabled === false
  );
  ok(
    "adapter networkCallMade false",
    result.metadata.networkCallMade === false
  );
  ok(
    "v64m fixture realGeminiEnabled false",
    SYNTHETIC_REDACTION_FIXTURES.metadata.realGeminiEnabled === false
  );
  ok(
    "v64m fixture networkCallMade false",
    SYNTHETIC_REDACTION_FIXTURES.metadata.networkCallMade === false
  );
  ok(
    "v64m fixture serialized clean",
    assertNoForbiddenSensitiveContent(
      JSON.stringify(SYNTHETIC_REDACTION_FIXTURES.metadata)
    ).pass
  );
}

// --- no secrets / PII / billing ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret value ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(
      `self no secret value ${pat.source.slice(0, 12)}`,
      !pat.test(selfCodeOnly)
    );
  }
  for (const pat of SECRET_LOOKING_PLACEHOLDER_PATTERNS) {
    ok(`doc no secret-like ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of BILLING_SENSITIVE_PATTERNS) {
    ok(`doc no billing sensitive ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(
      `self no billing sensitive ${pat.source.slice(0, 12)}`,
      !pat.test(selfCodeOnly)
    );
  }
  for (const pat of AUTO_EXEC_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to incur real AI cost",
    /not approval to incur real AI cost/i.test(doc)
  );
  ok(
    "doc v6.5C not approval to execute deploy activate billing quota production",
    /not approval to execute\/deploy\/activate\/billing\/quota\/production|is not approval to execute/i.test(
      doc
    )
  );
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_LISTING_SAMPLE_PATTERNS) {
    ok(`doc no real listing ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(
      `self no real listing ${pat.source.slice(0, 12)}`,
      !pat.test(selfCodeOnly)
    );
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- cross-ref ---
{
  ok("doc references v6.5B", doc.includes("v6.5B"));
  ok("doc references v6.5A", doc.includes("v6.5A"));
  ok("doc references v6.4U", doc.includes("v6.4U"));
  ok("doc references v6.4T", doc.includes("v6.4T"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
}

// --- package script ---
{
  ok(
    "package v65c script",
    pkg.includes("test:v65c-production-cost-guard-quota-review-packet")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v65c-production-cost-guard-quota-review-packet.mts"
    )
  );
}

console.log("\nDone v6.5C Production Cost Guard & Quota Review Packet tests.");
if (process.exitCode) process.exit(process.exitCode);
