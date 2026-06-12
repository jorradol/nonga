/**
 * v6.4E — Staging Real Gemini Pilot Readiness Plan (static validation only)
 * npm run test:v64e-staging-real-gemini-pilot-readiness-plan
 */
import { readFileSync } from "node:fs";
import {
  AI_CONTROL_ALLOWED_PROMPT_FIELDS,
  AI_CONTROL_FORBIDDEN_PROMPT_FIELDS,
  AI_OUTPUT_GUARD_POLICY,
  DEFAULT_AI_CONTROL_PLANE_CONFIG,
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  isProductionRealProviderForbidden,
  isStagingRealProviderAllowed,
  resolveEffectiveProviderStatus,
  roleHasPermission,
} from "../src/config/aiControl/aiControlDefaults.ts";
import { runAiShadowHarnessFullMatrix } from "../src/services/ai/aiShadowHarness.ts";
import {
  applyMockOutputGuardChain,
  runMockAiProvider,
} from "../src/services/ai/mockAiProvider.ts";

const DOC_PATH = "docs/v6.4E-staging-real-gemini-pilot-readiness-plan.md";
const V64D_DOC = "docs/v6.4D-mock-provider-shadow-harness-readiness.md";
const V64B_DOC = "docs/v6.4B-ai-control-model-types-static-readiness.md";
const DEFAULTS_PATH = "src/config/aiControl/aiControlDefaults.ts";
const MOCK_PATH = "src/services/ai/mockAiProvider.ts";
const HARNESS_PATH = "src/services/ai/aiShadowHarness.ts";
const PANEL_PATH = "src/components/admin/aiControl/AiControlStatusPanel.tsx";

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
];

const HEAD_SHA = "c73c0fa00fde8e530a9be5bc892e3e209defe316";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.4E Staging Real Gemini Pilot Readiness Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v64dDoc = readFileSync(V64D_DOC, "utf8");
const v64bDoc = readFileSync(V64B_DOC, "utf8");
const defaultsSrc = readFileSync(DEFAULTS_PATH, "utf8");
const mockSrc = readFileSync(MOCK_PATH, "utf8");
const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const panelSrc = readFileSync(PANEL_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64e-staging-real-gemini-pilot-readiness-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const combinedNew = doc + selfSrc;

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc: readiness plan only ---
{
  ok("readiness doc exists", doc.length > 5000);
  ok("doc v6.4E label", doc.includes("v6.4E"));
  ok(
    "doc readiness plan only",
    /readiness plan only/i.test(doc) && /plan only/i.test(docLower)
  );
  ok("doc HEAD c73c0fa", doc.includes(HEAD_SHA) || doc.includes("c73c0fa"));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok("doc default OFF", /default.*OFF|OFF.*default/i.test(doc));
  ok("doc production real forbidden", /production.*forbidden|hard forbidden/i.test(doc));
  ok("doc real gemini not enabled", /real Gemini.*NOT enabled|not enabled|forbidden/i.test(doc));
}

// --- staging real provider gate ---
{
  ok("doc STAGING_REAL gate", doc.includes("STAGING_REAL"));
  ok("doc superadmin approval", /superadmin approval/i.test(doc));
  ok("doc allowlist", /allowlist/i.test(doc));
  ok("doc kill switch off", /kill switch.*off|killSwitch.*false/i.test(doc));
  ok("doc output guard active", /output guard/i.test(doc));
  ok("doc deterministic fallback", /deterministic fallback/i.test(doc));
  ok("doc prompt data boundary", /prompt.*data boundary|prompt\/ data boundary/i.test(doc));
  ok("doc audit redaction", /audit.*redact|redacted audit/i.test(doc));
  ok("doc cap unset blocks", /cap unset|unset blocks/i.test(doc));
}

// --- pilot surfaces ---
{
  ok("doc pilot buyerFriendlyDetailPreview", doc.includes("buyerFriendlyDetailPreview"));
  ok("doc pilot inChatGoldenSellerWeave", doc.includes("inChatGoldenSellerWeave"));
  ok("doc blocked buyerChatAnswer", doc.includes("buyerChatAnswer"));
  ok("doc blocked recommendationExplanation", doc.includes("recommendationExplanation"));
  ok("doc blocked sellerListingCopy", /sellerListingCopy/.test(doc));
  ok("doc blocked public chat", /public chat/i.test(doc));
  ok("doc pilot surfaces limited", /pilot surface/i.test(doc));
}

// --- cost control ---
{
  ok("doc daily cap placeholder", /dailyRequestCap|daily max requests/i.test(doc));
  ok("doc per-user session cap", /perUserSessionCap|per-user/i.test(doc));
  ok("doc per-listing cache", /per-listing cache|perListingCache/i.test(doc));
  ok("doc no-repeat generation", /no-repeat|no repeat/i.test(doc));
  ok("doc cost readiness only", /readiness only|readiness-only/i.test(doc));
  ok("doc manual kill switch", /manual kill switch|kill switch/i.test(doc));
}

// --- prompt/data boundary ---
{
  ok("doc allowed brand", doc.includes("brand"));
  ok("doc allowed sanitizedPublicDescription", doc.includes("sanitizedPublicDescription"));
  ok("doc forbidden licensePlate", doc.includes("licensePlate"));
  ok("doc forbidden phone", doc.includes("phone"));
  ok("doc forbidden fullUid", doc.includes("fullUid"));
  ok("doc forbidden rawImageUrl", doc.includes("rawImageUrl"));
  ok("doc forbidden raw prompt", /rawPromptDumpWithPii|raw prompt/i.test(doc));
  ok("doc forbidden chat transcript", /chat transcript/i.test(doc));
}

// --- output guard ---
{
  ok("doc guard fail fallback", /guard fail.*fallback|fail → deterministic/i.test(doc));
  ok("doc no PII output", /no PII|pii/i.test(doc));
  ok("doc no hype", /hype/i.test(doc));
  ok("doc no km/l without source", /km\/l|kmPerLiter/i.test(doc));
  ok("doc no accident claim", /accident|ownership claim/i.test(doc));
  ok("doc warranty guarantee", /warranty|guarantee/i.test(doc));
}

// --- audit / monitoring ---
{
  ok("doc audit requestId", /requestId|request id/i.test(doc));
  ok("doc audit maskedActorId", /maskedActorId|masked actor/i.test(doc));
  ok("doc audit guardResult", /guardResult|guard result/i.test(doc));
  ok("doc audit fallbackReason", /fallbackReason|fallback reason/i.test(doc));
  ok("doc audit token cost placeholder", /tokenCostPlaceholder|token.*cost.*placeholder/i.test(doc));
  ok("doc audit forbidden full UID", /forbidden.*full UID|full UID.*forbidden/i.test(doc));
}

// --- rollback / kill switch ---
{
  ok("doc kill switch immediate OFF", /immediate OFF|Immediate OFF/i.test(doc));
  ok("doc cap exceeded fallback", /cap exceeded.*fallback|Cap exceeded/i.test(doc));
  ok("doc provider error fallback", /provider error.*fallback|Provider error/i.test(doc));
  ok("doc suspicious output fallback", /suspicious output/i.test(doc));
  ok("doc production hard block", /hard block|hard forbidden/i.test(doc));
}

// --- admin / superadmin ---
{
  ok("doc admin cannot enable", /admin.*cannot enable|Admin cannot enable/i.test(doc));
  ok("doc superadmin future readiness", /superadmin.*future|future authority|readiness only/i.test(doc));
  ok("doc admin view status only", /view status|read-only/i.test(doc));
}

// --- secret handling ---
{
  ok("doc secret manager path", /secret manager/i.test(doc));
  ok("doc no key in repo", /no key in repo|Key in repo.*forbidden/i.test(doc));
  ok("doc no gcloud secrets slice", /gcloud secrets.*forbidden|forbidden in this slice/i.test(doc));
  ok("doc no env update slice", /env update.*forbidden|forbidden in this slice/i.test(doc));
}

// --- future phases ---
{
  ok("doc v64e plan only", /v6\.4E.*readiness plan only/i.test(doc));
  ok("doc v64f adapter skeleton", /v6\.4F/i.test(doc));
  ok("doc v64g env wiring", /v6\.4G/i.test(doc));
  ok("doc v64h dry-run", /v6\.4H/i.test(doc));
  ok("doc v64i execution smoke", /v6\.4I/i.test(doc));
  ok("doc separate approval future", /separate approval|approval แยก/i.test(doc));
}

// --- v6.4D baseline ---
{
  ok("doc v64d baseline", /v6\.4D|mock.*shadow harness/i.test(doc));
  ok("doc mockAiProvider baseline", doc.includes("mockAiProvider.ts"));
  ok("doc aiShadowHarness baseline", doc.includes("aiShadowHarness.ts"));
  ok("v64d doc exists", v64dDoc.includes("v6.4D"));
}

// --- static guards (runtime import, no network) ---
{
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok("production real forbidden", isProductionRealProviderForbidden("production"));
  ok(
    "staging real blocked without approval",
    !isStagingRealProviderAllowed({
      environment: "staging",
      stagingApprovalGranted: false,
      allowlistConfigured: false,
      capsConfigured: false,
      killSwitchActive: false,
    })
  );
  ok(
    "staging real blocked cap unset",
    !isStagingRealProviderAllowed({
      environment: "staging",
      stagingApprovalGranted: true,
      allowlistConfigured: true,
      capsConfigured: false,
      killSwitchActive: false,
    })
  );
  ok(
    "staging real blocked kill switch",
    !isStagingRealProviderAllowed({
      environment: "staging",
      stagingApprovalGranted: true,
      allowlistConfigured: true,
      capsConfigured: true,
      killSwitchActive: true,
    })
  );
  ok(
    "staging real allowed all gates",
    isStagingRealProviderAllowed({
      environment: "staging",
      stagingApprovalGranted: true,
      allowlistConfigured: true,
      capsConfigured: true,
      killSwitchActive: false,
    })
  );
  ok("kill switch resolves DISABLED", resolveEffectiveProviderStatus({
    providerStatus: "STAGING_REAL",
    killSwitchActive: true,
  }) === "DISABLED");
  ok("admin cannot enable real", !adminCanEnableRealProvider());
  ok("admin no approve permission", !roleHasPermission("admin", "approveStagingRealReadiness"));
  ok("superadmin approve permission", roleHasPermission("superadmin", "approveStagingRealReadiness"));
  ok("caps null blocks real default", DEFAULT_AI_CONTROL_PLANE_CONFIG.costCaps.dailyRequestCap === null);
  ok("output guard onFail deterministic", AI_OUTPUT_GUARD_POLICY.onFail === "deterministic");
}

// --- v6.4D baseline harness (offline) ---
{
  const matrix = runAiShadowHarnessFullMatrix();
  ok("v64d harness matrix baseline", matrix.every((row) => row.pass));
  const guardChain = applyMockOutputGuardChain(
    "รถไม่เคยชนจริง 100% ประหยัดสุดๆ ล้านเปอร์เซ็นต์"
  );
  ok("guard fail fallback deterministic", !guardChain.guardPass && guardChain.fallbackUsed);
  const mockPath = runMockAiProvider(
    {
      surfaceId: "buyerFriendlyDetailPreview",
      fields: {
        brand: "ยี่ห้อตัวอย่าง",
        model: "รุ่นตัวอย่าง",
        sanitizedPublicDescription: "SUV ไฮบริด เบาะหนัง Cruise Control",
      },
      sessionSeed: "v64e-baseline",
    },
    { shadowSimulation: true }
  );
  ok("mock baseline realGeminiEnabled false", mockPath.metadata.realGeminiEnabled === false);
  ok("mock baseline network false", mockPath.metadata.network === false);
}

// --- prompt fields align v6.4B ---
{
  ok("allowed fields in doc", AI_CONTROL_ALLOWED_PROMPT_FIELDS.every((f) => doc.includes(f)));
  ok("forbidden fields in doc", AI_CONTROL_FORBIDDEN_PROMPT_FIELDS.every((f) => doc.includes(f)));
}

// --- no Gemini SDK / network in new slice ---
{
  ok("doc no generateContent", !/generateContent\s*\(/.test(doc));
  ok("doc no gemini sdk import", !/from\s+['"]@google\/generative-ai['"]/.test(doc));
  ok("combined new no generateContent", !/generateContent\s*\(/.test(combinedNew));
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("self no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("self no gemini import", !/from\s+['"]@google\/generative-ai['"]/.test(selfCode));
  ok("self no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("self no firebase deploy", !/firebase deploy/.test(selfCode));
  ok("self no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
}

// --- unchanged runtime modules guard ---
{
  ok("defaults no generateContent", !/generateContent\s*\(/.test(defaultsSrc));
  ok("mock no generateContent", !/generateContent\s*\(/.test(mockSrc));
  ok("harness no generateContent", !/generateContent\s*\(/.test(harnessSrc));
  ok("mock no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(mockSrc));
  ok("panel still read-only", panelSrc.includes('data-readonly="true"'));
  ok("panel no enable button", !/<button\b/.test(panelSrc));
}

// --- no deploy / production / cloud ---
{
  ok("doc no Cloud Run deploy", /Cloud Run.*forbidden|must not change/i.test(doc) || doc.includes("Cloud Run"));
  ok("doc no Firestore deploy", /Firestore.*forbidden|Firestore deploy/i.test(doc));
  ok("doc no production touch", /production touch|Production touch/i.test(doc));
}

// --- no PII in doc ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
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

// --- cross-ref v64b ---
{
  ok("v64b doc exists", v64bDoc.includes("v6.4B"));
}

// --- package.json ---
{
  ok(
    "package v64e script",
    pkg.includes("test:v64e-staging-real-gemini-pilot-readiness-plan")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v64e-staging-real-gemini-pilot-readiness-plan.mts")
  );
}

console.log("\nDone v6.4E Staging Real Gemini Pilot Readiness Plan tests.");
if (process.exitCode) process.exit(process.exitCode);
