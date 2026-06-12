/**
 * v6.4G — AI Control Contract & Safety Evidence Readiness (static cross-layer validation)
 * npm run test:v64g-ai-control-contract-safety-evidence-readiness
 */
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_AI_CONTROL_PLANE_CONFIG,
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  isProductionRealProviderForbidden,
  isStagingRealProviderAllowed,
  resolveEffectiveProviderStatus,
} from "../src/config/aiControl/aiControlDefaults.ts";
import { runAiShadowHarnessFullMatrix } from "../src/services/ai/aiShadowHarness.ts";
import {
  REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED,
  evaluateRealProviderAdapterGuards,
  invokeRealProviderAdapterSkeleton,
} from "../src/services/ai/realProviderAdapter.ts";
import { runMockAiProvider } from "../src/services/ai/mockAiProvider.ts";

const DOC_PATH = "docs/v6.4G-ai-control-contract-safety-evidence-readiness.md";
const V64A_DOC = "docs/v6.4A-controlled-ai-gemini-admin-control-readiness.md";
const V64B_DOC = "docs/v6.4B-ai-control-model-types-static-readiness.md";
const V64C_DOC =
  "docs/v6.4C-admin-read-only-ai-control-status-panel-readiness.md";
const V64C2_DOC =
  "docs/v6.4C.2-legacy-ai-control-center-disclosure-ui-remediation.md";
const V64D_DOC = "docs/v6.4D-mock-provider-shadow-harness-readiness.md";
const V64E_DOC = "docs/v6.4E-staging-real-gemini-pilot-readiness-plan.md";
const V64F_DOC =
  "docs/v6.4F-real-provider-adapter-skeleton-disabled-by-default.md";

const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const MOCK_PATH = "src/services/ai/mockAiProvider.ts";
const HARNESS_PATH = "src/services/ai/aiShadowHarness.ts";
const DEFAULTS_PATH = "src/config/aiControl/aiControlDefaults.ts";
const TYPES_PATH = "src/config/aiControl/aiControlTypes.ts";
const PANEL_PATH = "src/components/admin/aiControl/AiControlStatusPanel.tsx";
const APP_PATH = "src/App.tsx";

const V64D_TEST = "scripts/test-v64d-mock-provider-shadow-harness-readiness.mts";
const V64E_TEST =
  "scripts/test-v64e-staging-real-gemini-pilot-readiness-plan.mts";
const V64F_TEST =
  "scripts/test-v64f-real-provider-adapter-skeleton-disabled-by-default.mts";

const AI_PROVIDER_FILES = [ADAPTER_PATH, MOCK_PATH, HARNESS_PATH, DEFAULTS_PATH];

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

const GEMINI_LIVE_CLAIM_PATTERNS = [
  /gemini\s+is\s+live/i,
  /gemini\s+is\s+active/i,
  /gemini\s+is\s+connected/i,
  /real\s+gemini\s+enabled\s+now/i,
  /gemini\s+runtime\s+enabled/i,
  /connected\s+to\s+real\s+gemini\s+successfully/i,
];

const HEAD_SHA = "bf8b502cc8dbd9a39c9819f5f71d3b3b82a26c45";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.4G AI Control Contract & Safety Evidence Readiness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const mockSrc = readFileSync(MOCK_PATH, "utf8");
const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const defaultsSrc = readFileSync(DEFAULTS_PATH, "utf8");
const typesSrc = readFileSync(TYPES_PATH, "utf8");
const panelSrc = readFileSync(PANEL_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64g-ai-control-contract-safety-evidence-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const combinedAiSrc = AI_PROVIDER_FILES.map((p) => readFileSync(p, "utf8")).join(
  "\n"
);
const combinedNew = doc + selfSrc;

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- 1. v6.4G docs exists ---
{
  ok("v6.4G doc exists", doc.length > 5000);
  ok("doc v6.4G label", doc.includes("v6.4G"));
  ok(
    "doc contract safety evidence",
    /contract.*safety evidence|safety contract/i.test(doc)
  );
  ok("doc HEAD bf8b502", doc.includes(HEAD_SHA) || doc.includes("bf8b502"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok("doc safety contract matrix", /Safety Contract Matrix/i.test(doc));
  ok("doc not done yet section", /Not Done Yet/i.test(doc));
  ok("doc future gates", /Future Gates Before Real Pilot/i.test(doc));
  ok("doc cross-layer evidence", /Cross-Layer Evidence/i.test(doc));
}

// --- 2. v6.4F adapter exists ---
{
  ok("v6.4F adapter file exists", existsSync(ADAPTER_PATH));
  ok("adapter module non-empty", adapterSrc.length > 1500);
}

// --- 3–6. adapter safety markers ---
{
  ok(
    "adapter realGeminiEnabled false type",
    /realGeminiEnabled:\s*false/.test(adapterSrc)
  );
  ok(
    "adapter networkCallMade false type",
    /networkCallMade:\s*false/.test(adapterSrc)
  );
  ok(
    "adapter production hard block",
    adapterSrc.includes("production_forbidden") &&
      adapterSrc.includes("isProductionRealProviderForbidden")
  );
  ok(
    "adapter disabled fallback metadata",
    adapterSrc.includes("disabledReason") &&
      adapterSrc.includes("fallbackReason") &&
      adapterSrc.includes("guardResult")
  );
  ok(
    "adapter default enabled false",
    REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED === false
  );
}

// --- 7–12. static guards across AI provider files ---
{
  for (const file of AI_PROVIDER_FILES) {
    const src = readFileSync(file, "utf8");
    const label = file.split("/").pop() ?? file;
    ok(`${label} no gemini sdk`, !/from\s+['"]@google\/generative-ai['"]/.test(src));
    ok(`${label} no generateContent`, !/generateContent\s*\(/.test(src));
    ok(`${label} no fetch http`, !/fetch\s*\(\s*[`'"]https?:/.test(src));
  }
  ok("adapter no process.env", !/\bprocess\.env\b/.test(adapterSrc));
  ok("adapter no defaultEnvReader", !/defaultEnvReader/.test(adapterSrc));
  ok("combined no gcloud secrets", !/gcloud\s+secrets/.test(combinedAiSrc));
  ok("combined no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(combinedAiSrc));
}

// --- 13–16. integration boundary / no mutation ---
{
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok(
    "app no invokeRealProviderAdapterSkeleton",
    !appSrc.includes("invokeRealProviderAdapterSkeleton")
  );
  ok("app no mockAiProvider import", !appSrc.includes("mockAiProvider"));
  ok("app no aiShadowHarness import", !appSrc.includes("aiShadowHarness"));
  ok("adapter no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc));
  ok("mock no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(mockSrc));
  ok("harness no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(harnessSrc));
  ok(
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
  );
}

// --- 17. admin cannot enable ---
{
  ok("admin cannot enable real provider", adminCanEnableRealProvider() === false);
  ok(
    "adapter adminCanEnableRealProvider false metadata",
    /adminCanEnableRealProvider:\s*false/.test(adapterSrc)
  );
  ok("panel no enable button", !/<button\b/.test(panelSrc));
  ok("panel read-only", panelSrc.includes('data-readonly="true"'));
}

// --- 18–21. docs safety language ---
{
  ok("doc disabled by default", /disabled by default/i.test(doc));
  ok("doc states no deploy slice", /no deploy|ห้าม deploy/i.test(doc));
  ok("doc Real Gemini OFF explicit", doc.includes("Real Gemini") && /OFF/.test(doc));
  for (const pat of GEMINI_LIVE_CLAIM_PATTERNS) {
    ok(`doc no live claim ${pat.source.slice(0, 20)}`, !pat.test(doc));
  }
}

// --- 22. no PII in new files ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`self no secret ${pat.source.slice(0, 12)}`, !pat.test(selfSrc));
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

// --- 23–25. prior slice artifacts exist ---
{
  ok("v64d test script exists", existsSync(V64D_TEST));
  ok("v64e test script exists", existsSync(V64E_TEST));
  ok("v64f test script exists", existsSync(V64F_TEST));
  ok("v64a doc exists", existsSync(V64A_DOC));
  ok("v64b doc exists", existsSync(V64B_DOC));
  ok("v64c doc exists", existsSync(V64C_DOC));
  ok("v64c2 doc exists", existsSync(V64C2_DOC));
  ok("v64d doc exists", existsSync(V64D_DOC));
  ok("v64e doc exists", existsSync(V64E_DOC));
  ok("v64f doc exists", existsSync(V64F_DOC));
}

// --- 26. package script ---
{
  ok(
    "package v64g script",
    pkg.includes("test:v64g-ai-control-contract-safety-evidence-readiness")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64g-ai-control-contract-safety-evidence-readiness.mts"
    )
  );
}

// --- cross-layer contract runtime evidence ---
{
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok(
    "production real forbidden",
    isProductionRealProviderForbidden("production") === true
  );
  ok(
    "staging real blocked without approval",
    isStagingRealProviderAllowed({
      environment: "staging",
      killSwitchActive: false,
      stagingApprovalGranted: false,
      allowlistConfigured: true,
      capsConfigured: true,
    }) === false
  );
  ok(
    "caps unset blocks staging real",
    isStagingRealProviderAllowed({
      environment: "staging",
      killSwitchActive: false,
      stagingApprovalGranted: true,
      allowlistConfigured: true,
      capsConfigured: false,
    }) === false
  );
  ok(
    "kill switch resolves DISABLED",
    resolveEffectiveProviderStatus({
      providerStatus: "STAGING_REAL",
      killSwitchActive: true,
    }) === "DISABLED"
  );
  ok(
    "default config caps null",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.costCaps.dailyRequestCap === null
  );

  const adapterDefault = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
  });
  ok("adapter invoke blocked", adapterDefault.blocked === true);
  ok(
    "adapter invoke realGeminiEnabled false",
    adapterDefault.metadata.realGeminiEnabled === false
  );
  ok(
    "adapter invoke networkCallMade false",
    adapterDefault.metadata.networkCallMade === false
  );

  const mockResult = runMockAiProvider(
    {
      surfaceId: "buyerFriendlyDetailPreview",
      fields: {
        brand: "ยี่ห้อตัวอย่าง",
        model: "รุ่นตัวอย่าง",
        sanitizedPublicDescription: "SUV ไฮบริด เบาะหนัง Cruise Control",
      },
      sessionSeed: "v64g-contract",
    },
    { shadowSimulation: true }
  );
  ok("mock realGeminiEnabled false", mockResult.metadata.realGeminiEnabled === false);
  ok("mock network false", mockResult.metadata.network === false);
  ok("mock persistence false", mockResult.metadata.persistence === false);

  const harnessMatrix = runAiShadowHarnessFullMatrix();
  ok("shadow harness matrix 6", harnessMatrix.length === 6);
  for (const row of harnessMatrix) {
    ok(`harness ${row.scenarioId} pass`, row.pass, row.failures.join("; "));
  }

  const prodGuard = evaluateRealProviderAdapterGuards({
    environment: "production",
    killSwitchActive: false,
    stagingApprovalGranted: true,
    allowlistConfigured: true,
    capsConfigured: true,
    adapterExplicitlyEnabled: true,
  });
  ok("adapter production guard block", prodGuard.guardResult === "block");
  ok(
    "adapter production reason",
    prodGuard.reasonCode === "production_forbidden"
  );
}

// --- contract matrix references in doc ---
{
  ok("doc references v6.4A", doc.includes("v6.4A"));
  ok("doc references v6.4B", doc.includes("v6.4B"));
  ok("doc references v6.4C", doc.includes("v6.4C"));
  ok("doc references v6.4D", doc.includes("v6.4D"));
  ok("doc references v6.4E", doc.includes("v6.4E"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
  ok("doc references mockAiProvider", doc.includes("mockAiProvider.ts"));
  ok("doc references realProviderAdapter", doc.includes("realProviderAdapter.ts"));
  ok("doc references aiShadowHarness", doc.includes("aiShadowHarness.ts"));
  ok("doc references AiControlStatusPanel", doc.includes("AiControlStatusPanel"));
}

// --- v6.4C.2 disclosure alignment ---
{
  const c2Doc = readFileSync(V64C2_DOC, "utf8");
  ok("v64c2 demo not connected", /Demo\s*\/\s*Not connected/i.test(c2Doc));
  ok("v64c2 mock analytics", /Mock analytics/i.test(c2Doc));
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no firebase deploy", !/firebase deploy/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("combined new no generateContent", !/generateContent\s*\(/.test(combinedNew));
}

// --- static model authority unchanged ---
{
  ok("defaults DEFAULT_AI_PROVIDER_STATUS OFF", defaultsSrc.includes('"OFF"'));
  ok("types AiProviderStatus", typesSrc.includes("AiProviderStatus"));
  ok(
    "types chatShadowRealProviderEnabled false default",
    /chatShadowRealProviderEnabled:\s*false/.test(defaultsSrc)
  );
}

console.log(
  "\nDone v6.4G AI Control Contract & Safety Evidence Readiness tests."
);
if (process.exitCode) process.exit(process.exitCode);
