/**
 * v6.4F — Real Provider Adapter Skeleton, Disabled by Default (static + offline validation)
 * npm run test:v64f-real-provider-adapter-skeleton-disabled-by-default
 */
import { readFileSync } from "node:fs";
import {
  DEFAULT_AI_CONTROL_PLANE_CONFIG,
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  isProductionRealProviderForbidden,
} from "../src/config/aiControl/aiControlDefaults.ts";
import { AI_SHADOW_HARNESS_EXPECTATIONS } from "../src/services/ai/aiShadowHarness.ts";
import {
  REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED,
  REAL_PROVIDER_SECRET_READINESS,
  assertRealProviderShadowHarnessTypeReadiness,
  defaultRealProviderAdapterGuardContext,
  evaluateRealProviderAdapterGuards,
  invokeRealProviderAdapterSkeleton,
} from "../src/services/ai/realProviderAdapter.ts";

const DOC_PATH =
  "docs/v6.4F-real-provider-adapter-skeleton-disabled-by-default.md";
const V64E_DOC = "docs/v6.4E-staging-real-gemini-pilot-readiness-plan.md";
const V64D_DOC = "docs/v6.4D-mock-provider-shadow-harness-readiness.md";
const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const MOCK_PATH = "src/services/ai/mockAiProvider.ts";
const HARNESS_PATH = "src/services/ai/aiShadowHarness.ts";
const PANEL_PATH = "src/components/admin/aiControl/AiControlStatusPanel.tsx";
const APP_PATH = "src/App.tsx";

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

const HEAD_SHA = "df131368c2dd2982a78aafd9c10fd2294790921b";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.4F Real Provider Adapter Skeleton, Disabled by Default ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const mockSrc = readFileSync(MOCK_PATH, "utf8");
const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const panelSrc = readFileSync(PANEL_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const v64eDoc = readFileSync(V64E_DOC, "utf8");
const v64dDoc = readFileSync(V64D_DOC, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v64f-real-provider-adapter-skeleton-disabled-by-default.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const combinedSrc = adapterSrc + selfSrc;

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc ---
{
  ok("readiness doc exists", doc.length > 4000);
  ok("doc v6.4F label", doc.includes("v6.4F"));
  ok(
    "doc skeleton disabled by default",
    /skeleton.*disabled by default|disabled by default/i.test(doc)
  );
  ok("doc HEAD df13136", doc.includes(HEAD_SHA) || doc.includes("df13136"));
  ok("doc no deploy", /no deploy|unchanged/i.test(docLower));
  ok("doc real gemini forbidden", /real Gemini.*forbidden|not enabled/i.test(doc));
  ok("doc module map realProviderAdapter", doc.includes("realProviderAdapter.ts"));
  ok("doc networkCallMade false", doc.includes("networkCallMade"));
  ok("doc realGeminiEnabled false", doc.includes("realGeminiEnabled"));
}

// --- source static guards ---
{
  ok("adapter module exists", adapterSrc.length > 1500);
  ok("adapter no generateContent", !/generateContent\s*\(/.test(adapterSrc));
  ok("adapter no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(adapterSrc));
  ok(
    "adapter no gemini sdk import",
    !/from\s+['"]@google\/generative-ai['"]/.test(adapterSrc)
  );
  ok("adapter no process.env", !/\bprocess\.env\b/.test(adapterSrc));
  ok("adapter no defaultEnvReader", !/defaultEnvReader/.test(adapterSrc));
  ok("adapter no firestore", !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc));
  ok("adapter no localStorage", !/\blocalStorage\b/.test(adapterSrc));
  ok(
    "adapter default enabled false",
    /REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED\s*=\s*false/.test(adapterSrc)
  );
  ok(
    "adapter realGeminiEnabled false type",
    /realGeminiEnabled:\s*false/.test(adapterSrc)
  );
  ok(
    "adapter networkCallMade false type",
    /networkCallMade:\s*false/.test(adapterSrc)
  );
  ok("adapter not wired comment", /Not wired to useChat/i.test(adapterSrc));
  ok("adapter uses v64b defaults", adapterSrc.includes("aiControlDefaults.ts"));
  ok("adapter secret readiness names only", adapterSrc.includes("REAL_PROVIDER_SECRET_READINESS"));
  ok(
    "adapter no secret value like",
    !/AIza[Sy]/.test(adapterSrc) && !/sk-[a-zA-Z0-9]{20,}/.test(adapterSrc)
  );
}

// --- integration boundary ---
{
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("app no invokeRealProviderAdapterSkeleton", !appSrc.includes("invokeRealProviderAdapterSkeleton"));
  ok("mock unchanged import boundary", !mockSrc.includes("realProviderAdapter"));
  ok("harness unchanged import boundary", !harnessSrc.includes("realProviderAdapter"));
  ok("panel still read-only", panelSrc.includes('data-readonly="true"'));
  ok("panel no button", !/<button\b/.test(panelSrc));
  ok("panel provider off", /AI provider is OFF/i.test(panelSrc));
  ok("panel no enable real gemini", !/enable.*real.*gemini/i.test(panelSrc));
}

// --- runtime adapter default disabled ---
{
  ok("default adapter enabled false", REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED === false);
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok("admin cannot enable real provider", adminCanEnableRealProvider() === false);

  const defaultResult = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
  });
  ok("default call blocked", defaultResult.blocked === true);
  ok("default call fallback used", defaultResult.fallbackUsed === true);
  ok("default realGeminiEnabled false", defaultResult.metadata.realGeminiEnabled === false);
  ok("default networkCallMade false", defaultResult.metadata.networkCallMade === false);
  ok("default providerActivated false", defaultResult.metadata.providerActivated === false);
  ok("default persistence false", defaultResult.metadata.persistence === false);
  ok("default guard block", defaultResult.metadata.guardResult === "block");
  ok("default text non-empty", defaultResult.text.trim().length > 0);
  ok(
    "default reason adapter_not_enabled or caps_unset",
    ["adapter_not_enabled", "caps_unset"].includes(defaultResult.reasonCode)
  );
}

// --- guard scenarios ---
{
  const productionBlock = evaluateRealProviderAdapterGuards({
    environment: "production",
    killSwitchActive: false,
    stagingApprovalGranted: true,
    allowlistConfigured: true,
    capsConfigured: true,
    adapterExplicitlyEnabled: true,
  });
  ok("production forbidden block", productionBlock.guardResult === "block");
  ok(
    "production reason",
    productionBlock.reasonCode === "production_forbidden"
  );
  ok(
    "production hard block static",
    isProductionRealProviderForbidden("production") === true
  );

  const capsUnset = evaluateRealProviderAdapterGuards({
    environment: "staging",
    killSwitchActive: false,
    stagingApprovalGranted: true,
    allowlistConfigured: true,
    capsConfigured: false,
    adapterExplicitlyEnabled: true,
  });
  ok("caps unset block", capsUnset.guardResult === "block");
  ok("caps unset reason", capsUnset.reasonCode === "caps_unset");

  const killSwitch = evaluateRealProviderAdapterGuards({
    environment: "staging",
    killSwitchActive: true,
    stagingApprovalGranted: true,
    allowlistConfigured: true,
    capsConfigured: true,
    adapterExplicitlyEnabled: true,
  });
  ok("kill switch block", killSwitch.guardResult === "block");
  ok("kill switch reason", killSwitch.reasonCode === "kill_switch_active");

  const missingApproval = evaluateRealProviderAdapterGuards({
    environment: "staging",
    killSwitchActive: false,
    stagingApprovalGranted: false,
    allowlistConfigured: true,
    capsConfigured: true,
    adapterExplicitlyEnabled: true,
  });
  ok("missing approval block", missingApproval.guardResult === "block");
  ok(
    "missing approval reason",
    missingApproval.reasonCode === "missing_approval"
  );

  const missingAllowlist = evaluateRealProviderAdapterGuards({
    environment: "staging",
    killSwitchActive: false,
    stagingApprovalGranted: true,
    allowlistConfigured: false,
    capsConfigured: true,
    adapterExplicitlyEnabled: true,
  });
  ok("missing allowlist block", missingAllowlist.guardResult === "block");
  ok(
    "missing allowlist reason",
    missingAllowlist.reasonCode === "missing_allowlist"
  );

  const adminBlock = evaluateRealProviderAdapterGuards({
    environment: "staging",
    killSwitchActive: false,
    stagingApprovalGranted: true,
    allowlistConfigured: true,
    capsConfigured: true,
    adapterExplicitlyEnabled: true,
  });
  ok("admin cannot enable block", adminBlock.guardResult === "block");
  ok(
    "admin cannot enable reason",
    adminBlock.reasonCode === "admin_cannot_enable"
  );
}

// --- invoke with explicit contexts ---
{
  const prodInvoke = invokeRealProviderAdapterSkeleton(
    { surfaceId: "buyerFriendlyDetailPreview" },
    {
      environment: "production",
      killSwitchActive: false,
      stagingApprovalGranted: true,
      allowlistConfigured: true,
      capsConfigured: true,
      adapterExplicitlyEnabled: true,
    }
  );
  ok("prod invoke blocked", prodInvoke.blocked === true);
  ok(
    "prod invoke reason",
    prodInvoke.reasonCode === "production_forbidden"
  );
  ok("prod invoke no network", prodInvoke.metadata.networkCallMade === false);

  const killInvoke = invokeRealProviderAdapterSkeleton(
    { surfaceId: "sellerListingCopy" },
    {
      environment: "staging",
      killSwitchActive: true,
      stagingApprovalGranted: true,
      allowlistConfigured: true,
      capsConfigured: true,
      adapterExplicitlyEnabled: true,
    }
  );
  ok("kill invoke blocked", killInvoke.blocked === true);
  ok("kill invoke reason", killInvoke.reasonCode === "kill_switch_active");
}

// --- shadow harness type readiness ---
{
  const sh01 = AI_SHADOW_HARNESS_EXPECTATIONS["SH-01-buyer-friendly-mock"];
  const bridge = assertRealProviderShadowHarnessTypeReadiness(sh01);
  ok(
    "shadow type bridge realGeminiEnabled",
    bridge.harnessExpectation.realGeminiEnabled === false &&
      bridge.adapterMetadataShape.realGeminiEnabled === false
  );
  ok(
    "shadow type bridge network",
    bridge.harnessExpectation.network === false &&
      bridge.adapterMetadataShape.networkCallMade === false
  );
  ok(
    "shadow type bridge persistence",
    bridge.harnessExpectation.persistence === false &&
      bridge.adapterMetadataShape.persistence === false
  );
}

// --- secret readiness names only ---
{
  ok("secret sm resource name", REAL_PROVIDER_SECRET_READINESS.smResourceName === "gemini-api-key");
  ok(
    "secret env logical name",
    REAL_PROVIDER_SECRET_READINESS.envVarLogicalName === "GEMINI_API_KEY"
  );
  ok("secret version latest", REAL_PROVIDER_SECRET_READINESS.smVersion === "latest");
  ok(
    "default guard context caps unset",
    defaultRealProviderAdapterGuardContext().capsConfigured === false
  );
  ok(
    "default config caps null",
    DEFAULT_AI_CONTROL_PLANE_CONFIG.costCaps.dailyRequestCap === null
  );
}

// --- cross-ref v64d/v64e ---
{
  ok("v64e doc exists", v64eDoc.includes("v6.4E"));
  ok("v64d doc exists", v64dDoc.includes("v6.4D"));
  ok("v64e references mock harness", /mockAiProvider|aiShadowHarness/i.test(v64eDoc));
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

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no firebase deploy", !/firebase deploy/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("combined no generateContent call", !/generateContent\s*\(/.test(combinedSrc));
}

// --- package.json ---
{
  ok(
    "package v64f script",
    pkg.includes(
      "test:v64f-real-provider-adapter-skeleton-disabled-by-default"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v64f-real-provider-adapter-skeleton-disabled-by-default.mts"
    )
  );
}

console.log(
  "\nDone v6.4F Real Provider Adapter Skeleton, Disabled by Default tests."
);
if (process.exitCode) process.exit(process.exitCode);
