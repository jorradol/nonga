/**
 * v6.5G — Final Staging Go/No-Go Decision Packet (static validation only)
 * npm run test:v65g-final-staging-go-no-go-decision-packet
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

const DOC_PATH = "docs/v6.5G-final-staging-go-no-go-decision-packet.md";
const V65F_DOC =
  "docs/v6.5F-staging-execution-decision-consolidation-packet.md";
const V65E_DOC =
  "docs/v6.5E-user-visible-ai-behavior-policy-review-packet.md";
const V65D_DOC =
  "docs/v6.5D-production-incident-rollback-playbook-packet.md";
const V65C_DOC =
  "docs/v6.5C-production-cost-guard-quota-review-packet.md";
const V65B_DOC =
  "docs/v6.5B-production-privacy-data-handling-review-packet.md";
const V65A_DOC =
  "docs/v6.5A-production-readiness-gap-review-phase-transition-baseline.md";
const V64Q_DOC =
  "docs/v6.4Q-staging-secret-wiring-final-go-no-go-approval-packet.md";
const V64R_DOC =
  "docs/v6.4R-synthetic-invocation-final-go-no-go-approval-packet.md";
const V64S_DOC =
  "docs/v6.4S-runtime-redaction-integration-final-go-no-go-approval-packet.md";
const V64T_DOC =
  "docs/v6.4T-staging-real-provider-pilot-smoke-final-go-no-go-approval-packet.md";
const V64U_DOC =
  "docs/v6.4U-pilot-monitoring-kill-switch-verification-approval-packet.md";
const V64V_DOC =
  "docs/v6.4V-limited-staging-pilot-review-approval-packet.md";
const V64J_DOC = "docs/v6.4J-staging-secret-wiring-plan-docs-only.md";
const V64K_DOC = "docs/v6.4K-redaction-logging-contract-readiness.md";
const V64L_DOC =
  "docs/v6.4L-synthetic-real-provider-invocation-plan-docs-only.md";
const V64N_DOC =
  "docs/v6.4N-staging-secret-wiring-execution-candidate-approval-required.md";
const V64O_DOC =
  "docs/v6.4O-synthetic-invocation-execution-candidate-approval-required.md";
const V64P_DOC =
  "docs/v6.4P-runtime-redaction-integration-candidate-approval-required.md";
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

const REAL_CONTACT_PATTERNS = [
  /\b0[689]\d{8}\b/,
  /@[a-z0-9.-]+\.(com|org|net)\b/i,
  /line\.me\/ti\//i,
];

const REAL_PROJECT_ID_PATTERNS = [
  /\bnonga-ce93c\b/i,
  /projects\/nonga-[a-z0-9]+\/secrets\//i,
];

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
  /v6\.5G\s+approves\s+execution\s+automatically/i,
  /go\/no-go\s+authorizes\s+gemini\s+activation\s+automatically/i,
  /packet\s+authorizes\s+production\s+promotion\s+automatically/i,
  /v6\.5G\s+authorizes\s+secret\s+wiring\s+automatically/i,
  /final\s+staging\s+go\s+is\s+approval\s+to\s+execute/i,
];

const BAD_APPROVED_PATTERNS = [
  /\|\s*\*\*Staging Secret Wiring\*\*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*\*\*approved\*\*/i,
  /gate\s+approved\s+for\s+execution/i,
  /all\s+gates\s+approved/i,
  /execution\s+authorized\s+by\s+v6\.5G/i,
];

const HEAD_SHA = "7b58f2b7dbd6f28ef79c7c3b39e0bdf4e48ddfa8";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.5G Final Staging Go/No-Go Decision Packet ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v65fDoc = readFileSync(V65F_DOC, "utf8");
const v65eDoc = readFileSync(V65E_DOC, "utf8");
const v65dDoc = readFileSync(V65D_DOC, "utf8");
const v65cDoc = readFileSync(V65C_DOC, "utf8");
const v65bDoc = readFileSync(V65B_DOC, "utf8");
const v65aDoc = readFileSync(V65A_DOC, "utf8");
const v64qDoc = readFileSync(V64Q_DOC, "utf8");
const v64rDoc = readFileSync(V64R_DOC, "utf8");
const v64sDoc = readFileSync(V64S_DOC, "utf8");
const v64tDoc = readFileSync(V64T_DOC, "utf8");
const v64uDoc = readFileSync(V64U_DOC, "utf8");
const v64vDoc = readFileSync(V64V_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v65g-final-staging-go-no-go-decision-packet.mts",
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

// --- docs and modules exist ---
{
  ok("v6.5G doc exists", doc.length > 12000);
  ok("doc v6.5G label", doc.includes("v6.5G"));
  ok("v6.5F doc exists", existsSync(V65F_DOC) && v65fDoc.includes("v6.5F"));
  ok("v6.5E doc exists", existsSync(V65E_DOC) && v65eDoc.includes("v6.5E"));
  ok("v6.5D doc exists", existsSync(V65D_DOC) && v65dDoc.includes("v6.5D"));
  ok("v6.5C doc exists", existsSync(V65C_DOC) && v65cDoc.includes("v6.5C"));
  ok("v6.5B doc exists", existsSync(V65B_DOC) && v65bDoc.includes("v6.5B"));
  ok("v6.5A doc exists", existsSync(V65A_DOC) && v65aDoc.includes("v6.5A"));
  ok("v6.4Q doc exists", existsSync(V64Q_DOC) && v64qDoc.includes("v6.4Q"));
  ok("v6.4R doc exists", existsSync(V64R_DOC) && v64rDoc.includes("v6.4R"));
  ok("v6.4S doc exists", existsSync(V64S_DOC) && v64sDoc.includes("v6.4S"));
  ok("v6.4T doc exists", existsSync(V64T_DOC) && v64tDoc.includes("v6.4T"));
  ok("v6.4U doc exists", existsSync(V64U_DOC) && v64uDoc.includes("v6.4U"));
  ok("v6.4V doc exists", existsSync(V64V_DOC) && v64vDoc.includes("v6.4V"));
  ok("v6.4J doc exists", existsSync(V64J_DOC));
  ok("v6.4K doc exists", existsSync(V64K_DOC));
  ok("v6.4L doc exists", existsSync(V64L_DOC));
  ok("v6.4N doc exists", existsSync(V64N_DOC));
  ok("v6.4O doc exists", existsSync(V64O_DOC));
  ok("v6.4P doc exists", existsSync(V64P_DOC));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- safety positioning ---
{
  ok("doc HEAD 7b58f2b", doc.includes(HEAD_SHA) || doc.includes("7b58f2b"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /does not deploy|no deploy/i.test(docLower));
  ok(
    "doc no production touch",
    /does not touch production|no production touch/i.test(doc)
  );
  ok(
    "doc no runtime UI change",
    /does not change runtime UI|no runtime UI change/i.test(doc)
  );
  ok(
    "doc no user-visible AI answer execution",
    /does not execute user-visible AI answers|no user-visible AI answer execution/i.test(
      doc
    )
  );
  ok(
    "doc no secret wiring execution",
    /does not execute secret wiring|no secret wiring execution/i.test(doc)
  );
  ok(
    "doc no synthetic invocation execution",
    /does not execute synthetic invocation|no synthetic invocation execution/i.test(
      doc
    )
  );
  ok(
    "doc no runtime redaction integration execution",
    /does not execute runtime redaction integration|no runtime redaction integration execution/i.test(
      doc
    )
  );
  ok("doc no Gemini invocation", /does not invoke Gemini/i.test(doc));
  ok(
    "doc no prompt provider sending",
    /does not send prompts or provider payloads/i.test(doc)
  );
  ok("doc no pilot start", /does not start any pilot|no pilot start/i.test(doc));
  ok(
    "doc no production promotion",
    /does not promote to production|no production promotion/i.test(doc)
  );
  ok(
    "doc go no-go decision packet only",
    /Go\/No-Go decision packet only|final staging Go\/No-Go decision packet/i.test(
      doc
    )
  );
  ok(
    "doc execution allowed by v65g is no",
    /Execution Allowed by v6\.5G\?\s*=\s*No|Execution Allowed by v6\.5G\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok("doc no gate approved", /No gate is approved|no gate approved/i.test(doc));
  ok(
    "doc no gate executed",
    /No gate is approved or executed|no gate executed|not executed/i.test(doc)
  );
}

// --- required sections ---
{
  ok("doc non-authorization clause", /Non-Authorization Clause/i.test(doc));
  ok(
    "doc not approval to execute deploy activate production",
    /not approval to execute\/deploy\/activate\/production|not approval to deploy/i.test(
      doc
    )
  );
  ok("doc current state summary", /Current State Summary/i.test(doc));
  ok(
    "doc decision options Go No-Go Defer",
    /Decision Options: Go \/ No-Go \/ Defer|Go \/ No-Go \/ Defer/i.test(doc)
  );
  ok(
    "doc owner decision form template",
    /Owner Decision Form \/ Template/i.test(doc)
  );
  ok("doc final evidence inventory", /Final Evidence Inventory/i.test(doc));
  ok("doc cross-reference summary", /Cross-Reference Summary/i.test(doc));
  ok("doc gate readiness summary", /Gate Readiness Summary/i.test(doc));
  ok(
    "doc gate-by-gate Go No-Go table",
    /Gate-by-Gate Go\/No-Go Table/i.test(doc)
  );
  ok(
    "doc required approvals before execution",
    /Required Approvals Before Any Execution/i.test(doc)
  );
  ok(
    "doc required evidence before execution",
    /Required Evidence Before Any Execution/i.test(doc)
  );
  ok("doc No-Go conditions", /No-Go Conditions/i.test(doc));
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok(
    "doc rollback readiness summary",
    /Rollback Readiness Summary/i.test(doc)
  );
  ok(
    "doc privacy data handling readiness",
    /Privacy \/ Data Handling Readiness Summary/i.test(doc)
  );
  ok(
    "doc cost guard quota readiness",
    /Cost Guard \/ Quota Readiness Summary/i.test(doc)
  );
  ok(
    "doc incident rollback readiness",
    /Incident \/ Rollback Readiness Summary/i.test(doc)
  );
  ok(
    "doc user-visible behavior readiness",
    /User-Visible Behavior Readiness Summary/i.test(doc)
  );
  ok(
    "doc monitoring kill switch readiness",
    /Monitoring \/ Kill Switch Readiness Summary/i.test(doc)
  );
  ok(
    "doc staging vs production boundary",
    /Staging vs Production Boundary/i.test(doc)
  );
  ok(
    "doc runtime vs docs-only boundary",
    /Runtime vs Docs-Only Boundary/i.test(doc)
  );
  ok("doc Go decision limitations", /Go Decision Limitations/i.test(doc));
  ok("doc Defer decision handling", /Defer Decision Handling/i.test(doc));
  ok("doc No-Go decision handling", /No-Go Decision Handling/i.test(doc));
  ok(
    "doc future execution approval boundary",
    /Future Execution Approval Boundary/i.test(doc)
  );
  ok(
    "doc future version boundary",
    /Recommended Next Version Boundary|Future Version Boundary/i.test(doc)
  );
  ok(
    "doc explicit future approval requirements",
    /Explicit Future Approval Requirements/i.test(doc)
  );
  ok(
    "doc rollback removal plan for v65g",
    /Rollback \/ Removal Plan for v6\.5G/i.test(doc)
  );
  ok("doc roadmap v6.5H", /v6\.5H/i.test(doc));
  ok(
    "doc Go is template option only",
    /template \/ decision option only|decision option template only/i.test(doc)
  );
}

// --- gate Go/No-Go table rows ---
{
  ok(
    "doc gate Staging Secret Wiring",
    /Staging Secret Wiring/i.test(doc)
  );
  ok("doc gate Synthetic Invocation", /Synthetic Invocation/i.test(doc));
  ok(
    "doc gate Runtime Redaction Integration",
    /Runtime Redaction Integration/i.test(doc)
  );
  ok(
    "doc gate Staging Real Provider Pilot Smoke",
    /Staging Real Provider Pilot Smoke/i.test(doc)
  );
  ok(
    "doc gate Pilot Monitoring Kill Switch",
    /Pilot Monitoring \/ Kill Switch/i.test(doc)
  );
  ok(
    "doc gate Limited Staging Pilot Review",
    /Limited Staging Pilot Review/i.test(doc)
  );
  ok(
    "doc gate Privacy Data Handling",
    /Privacy \/ Data Handling/i.test(doc)
  );
  ok("doc gate Cost Guard Quota", /Cost Guard \/ Quota/i.test(doc));
  ok("doc gate Incident Rollback", /Incident \/ Rollback/i.test(doc));
  ok(
    "doc gate User-Visible AI Behavior",
    /User-Visible AI Behavior/i.test(doc)
  );
  ok(
    "doc gate Consolidated Decision",
    /Consolidated Decision/i.test(doc)
  );
  ok(
    "doc allowed decision Go No-Go Defer",
    /Go \/ No-Go \/ Defer/i.test(doc)
  );
  ok("doc references v6.5F", doc.includes("v6.5F"));
  ok("doc references v6.5E", doc.includes("v6.5E"));
  ok("doc references v6.5D", doc.includes("v6.5D"));
  ok("doc references v6.5C", doc.includes("v6.5C"));
  ok("doc references v6.5B", doc.includes("v6.5B"));
  ok("doc references v6.5A", doc.includes("v6.5A"));
  ok("doc references v6.4Q", doc.includes("v6.4Q"));
  ok("doc references v6.4V", doc.includes("v6.4V"));
  ok("doc references v6.4F", doc.includes("v6.4F"));
}

// --- no bad approved/executed claims ---
{
  for (const pat of BAD_APPROVED_PATTERNS) {
    ok(`doc no bad approved ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
}

// --- no real project id in doc ---
{
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- static guards ---
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

// --- no secrets / PII / sensitive samples ---
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
  for (const pat of AUTO_EXEC_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  ok(
    "doc has not approval to deploy in clause",
    /not approval to deploy/i.test(doc)
  );
  ok(
    "doc v65g does not authorize execution alone",
    /v6\.5G alone satisfies none|Execution Allowed by v6\.5G\?\s*=\s*No/i.test(
      doc
    )
  );
  for (const pat of REAL_CONTACT_PATTERNS) {
    ok(`doc no real contact ${pat.source.slice(0, 12)}`, !pat.test(doc));
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

// --- package script ---
{
  ok(
    "package v65g script",
    pkg.includes("test:v65g-final-staging-go-no-go-decision-packet")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v65g-final-staging-go-no-go-decision-packet.mts"
    )
  );
}

console.log("\nDone v6.5G Final Staging Go/No-Go Decision Packet tests.");
if (process.exitCode) process.exit(process.exitCode);
