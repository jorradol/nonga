/**
 * v6.5H — Production Pilot Approval Packet (static validation only)
 * npm run test:v65h-production-pilot-approval-packet
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

const DOC_PATH = "docs/v6.5H-production-pilot-approval-packet.md";
const V65G_DOC =
  "docs/v6.5G-final-staging-go-no-go-decision-packet.md";
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
  /v6\.5H\s+approves\s+production\s+pilot\s+automatically/i,
  /v6\.5H\s+authorizes\s+production\s+pilot\s+start/i,
  /production\s+pilot\s+approval\s+authorizes\s+gemini\s+activation\s+automatically/i,
  /packet\s+authorizes\s+production\s+promotion\s+automatically/i,
  /v6\.5H\s+authorizes\s+secret\s+wiring\s+automatically/i,
  /production\s+pilot\s+is\s+approved/i,
];

const BAD_APPROVED_PATTERNS = [
  /\|\s*\*\*Staging Real Provider Pilot Smoke\*\*[^|]*\|\s*[^|]*\|\s*[^|]*\|\s*\*\*Yes\*\*[^|]*\|\s*\*\*Yes\*\*/i,
  /gate\s+executed\s+for\s+production/i,
  /all\s+gates\s+executed/i,
  /execution\s+authorized\s+by\s+v6\.5H/i,
  /Approval Captured by v6\.5H\?\s*=\s*Yes/i,
  /Execution Allowed by v6\.5H\?\s*=\s*Yes/i,
];

const HEAD_SHA = "d35c12b6f7e7477e53d28cc08adab67ecadbf99d";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.5H Production Pilot Approval Packet ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v65gDoc = readFileSync(V65G_DOC, "utf8");
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
  "scripts/test-v65h-production-pilot-approval-packet.mts",
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
  ok("v6.5H doc exists", doc.length > 12000);
  ok("doc v6.5H label", doc.includes("v6.5H"));
  ok("v6.5G doc exists", existsSync(V65G_DOC) && v65gDoc.includes("v6.5G"));
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
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
}

// --- safety positioning ---
{
  ok("doc HEAD d35c12b", doc.includes(HEAD_SHA) || doc.includes("d35c12b"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /does not deploy|no deploy/i.test(docLower));
  ok(
    "doc no production touch",
    /does not touch production|no production touch/i.test(doc)
  );
  ok(
    "doc no production promotion",
    /does not promote staging to production|no production promotion/i.test(doc)
  );
  ok(
    "doc no production pilot start",
    /does not start production pilot|no production pilot start/i.test(doc)
  );
  ok(
    "doc no staging pilot start",
    /does not start staging pilot|no staging pilot start/i.test(doc)
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
  ok(
    "doc no monitoring logging execution",
    /does not add runtime monitoring\/logging|no monitoring\/logging execution/i.test(
      doc
    )
  );
  ok("doc no AI log persistence", /does not persist AI logs|no AI log persistence/i.test(doc));
  ok("doc no Gemini invocation", /does not invoke Gemini/i.test(doc));
  ok(
    "doc no prompt provider sending",
    /does not send prompts or provider payloads/i.test(doc)
  );
  ok(
    "doc production pilot approval packet only",
    /Production pilot approval packet only|production pilot approval packet/i.test(
      doc
    )
  );
  ok(
    "doc approval captured by v65h is no",
    /Approval Captured by v6\.5H\?\s*=\s*No|Approval Captured by v6\.5H\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc execution allowed by v65h is no",
    /Execution Allowed by v6\.5H\?\s*=\s*No|Execution Allowed by v6\.5H\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok("doc no gate executed", /No gate is approved or executed|no gate executed|not executed/i.test(doc));
  ok(
    "doc does not state production pilot approved",
    /Does not state production pilot approved|does not state production pilot approved/i.test(
      doc
    )
  );
}

// --- required sections ---
{
  ok("doc non-authorization clause", /Non-Authorization Clause/i.test(doc));
  ok(
    "doc not approval to execute deploy activate production pilot",
    /not approval to execute\/deploy\/activate\/production\/pilot|not approval to deploy/i.test(
      doc
    )
  );
  ok("doc current state summary", /Current State Summary/i.test(doc));
  ok("doc production pilot definition", /Production Pilot Definition/i.test(doc));
  ok(
    "doc what v65h is is not",
    /What v6\.5H Is \/ Is Not/i.test(doc)
  );
  ok(
    "doc production pilot approval form template",
    /Production Pilot Approval Form \/ Template/i.test(doc)
  );
  ok(
    "doc required preconditions before pilot",
    /Required Preconditions Before Any Production Pilot/i.test(doc)
  );
  ok(
    "doc required owner approvals before pilot",
    /Required Owner Approvals Before Any Production Pilot/i.test(doc)
  );
  ok(
    "doc required evidence before pilot",
    /Required Evidence Before Any Production Pilot/i.test(doc)
  );
  ok(
    "doc pilot scope constraints",
    /Production Pilot Scope Constraints/i.test(doc)
  );
  ok(
    "doc allowed pilot traffic shape",
    /Allowed Pilot Traffic Shape for Future Approval/i.test(doc)
  );
  ok(
    "doc forbidden pilot traffic shape",
    /Forbidden Pilot Traffic Shape/i.test(doc)
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
    "doc staging prerequisite dependency",
    /Staging Prerequisite Dependency Summary/i.test(doc)
  );
  ok(
    "doc staging evidence carry-forward",
    /Staging Evidence Carry-Forward Requirements/i.test(doc)
  );
  ok(
    "doc production boundary conditions",
    /Production Boundary Conditions/i.test(doc)
  );
  ok(
    "doc runtime boundary conditions",
    /Runtime Boundary Conditions/i.test(doc)
  );
  ok(
    "doc data boundary conditions",
    /Data Boundary Conditions/i.test(doc)
  );
  ok(
    "doc cost boundary conditions",
    /Cost Boundary Conditions/i.test(doc)
  );
  ok(
    "doc user trust disclosure boundary",
    /User Trust \/ Disclosure Boundary Conditions/i.test(doc)
  );
  ok("doc No-Go conditions", /No-Go Conditions/i.test(doc));
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok(
    "doc rollback readiness requirements",
    /Rollback Readiness Requirements/i.test(doc)
  );
  ok(
    "doc kill switch requirements",
    /Kill Switch Requirements/i.test(doc)
  );
  ok(
    "doc post-pilot review requirements",
    /Post-Pilot Review Requirements/i.test(doc)
  );
  ok("doc pilot exit criteria", /Pilot Exit Criteria/i.test(doc));
  ok(
    "doc future execution approval boundary",
    /Future Execution Approval Boundary/i.test(doc)
  );
  ok(
    "doc future version boundary",
    /Recommended Next Version Boundary/i.test(doc)
  );
  ok(
    "doc explicit future approval requirements",
    /Explicit Future Approval Requirements/i.test(doc)
  );
  ok(
    "doc production pilot approval table",
    /Production Pilot Approval Table/i.test(doc)
  );
  ok(
    "doc approval template only not captured",
    /template only|not captured approval/i.test(doc)
  );
}

// --- production pilot approval table rows ---
{
  ok(
    "doc area Staging Real Provider Pilot Smoke",
    /Staging Real Provider Pilot Smoke/i.test(doc)
  );
  ok(
    "doc area Pilot Monitoring Kill Switch",
    /Pilot Monitoring \/ Kill Switch/i.test(doc)
  );
  ok(
    "doc area Limited Staging Pilot Review",
    /Limited Staging Pilot Review/i.test(doc)
  );
  ok(
    "doc area Production Readiness Gaps",
    /Production Readiness Gaps/i.test(doc)
  );
  ok(
    "doc area Privacy Data Handling",
    /Privacy \/ Data Handling/i.test(doc)
  );
  ok("doc area Cost Guard Quota", /Cost Guard \/ Quota/i.test(doc));
  ok("doc area Incident Rollback", /Incident \/ Rollback/i.test(doc));
  ok(
    "doc area User-Visible AI Behavior",
    /User-Visible AI Behavior/i.test(doc)
  );
  ok(
    "doc area Staging Execution Decision",
    /Staging Execution Decision/i.test(doc)
  );
  ok(
    "doc area Final Staging Go/No-Go",
    /Final Staging Go\/No-Go/i.test(doc)
  );
  ok(
    "doc area Production Pilot Approval",
    /Production Pilot Approval/i.test(doc)
  );
  ok("doc references v6.5G", doc.includes("v6.5G"));
  ok("doc references v6.5F", doc.includes("v6.5F"));
  ok("doc references v6.5E", doc.includes("v6.5E"));
  ok("doc references v6.5D", doc.includes("v6.5D"));
  ok("doc references v6.5C", doc.includes("v6.5C"));
  ok("doc references v6.5B", doc.includes("v6.5B"));
  ok("doc references v6.5A", doc.includes("v6.5A"));
  ok("doc references v6.4T", doc.includes("v6.4T"));
  ok("doc references v6.4U", doc.includes("v6.4U"));
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
    "doc v65h does not authorize execution alone",
    /v6\.5H alone satisfies none|Execution Allowed by v6\.5H\?\s*=\s*No/i.test(
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
    "package v65h script",
    pkg.includes("test:v65h-production-pilot-approval-packet")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v65h-production-pilot-approval-packet.mts")
  );
}

console.log("\nDone v6.5H Production Pilot Approval Packet tests.");
if (process.exitCode) process.exit(process.exitCode);
