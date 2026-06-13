/**
 * v6.5R — Staging Runtime Switch Alignment Execution Record & Gate B Readiness (static validation only)
 * npm run test:v65r-staging-runtime-switch-alignment-execution-record-gate-b-readiness
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

const DOC_PATH =
  "docs/v6.5R-staging-runtime-switch-alignment-execution-record-gate-b-readiness.md";
const V65Q_DOC =
  "docs/v6.5Q-staging-runtime-ai-switch-alignment-approval-packet.md";
const V65P_DOC =
  "docs/v6.5P-staging-secret-wiring-pre-execution-final-go-no-go-packet.md";
const V65O_DOC =
  "docs/v6.5O-staging-secret-wiring-execution-candidate-approval-packet.md";
const V65N_DOC =
  "docs/v6.5N-first-execution-gate-selection-candidate-packet.md";
const V65M_DOC =
  "docs/v6.5M-execution-readiness-freeze-closure-packet.md";
const V65L_DOC =
  "docs/v6.5L-execution-packet-index-approval-checklist-packet.md";
const V65K_DOC =
  "docs/v6.5K-execution-approval-separation-version-boundary-packet.md";
const V65J_DOC =
  "docs/v6.5J-production-pilot-execution-handoff-boundary-packet.md";
const V65I_DOC =
  "docs/v6.5I-production-pilot-owner-decision-record-packet.md";
const V65H_DOC = "docs/v6.5H-production-pilot-approval-packet.md";
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
const V64J_DOC = "docs/v6.4J-staging-secret-wiring-plan-docs-only.md";
const V64K_DOC = "docs/v6.4K-redaction-logging-contract-readiness.md";
const V64L_DOC =
  "docs/v6.4L-synthetic-real-provider-invocation-plan-docs-only.md";
const V64M_DOC =
  "docs/v6.4M-redaction-test-fixture-implementation-candidate.md";
const V64N_DOC =
  "docs/v6.4N-staging-secret-wiring-execution-candidate-approval-required.md";
const V64O_DOC =
  "docs/v6.4O-synthetic-invocation-execution-candidate-approval-required.md";
const V64P_DOC =
  "docs/v6.4P-runtime-redaction-integration-candidate-approval-required.md";
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
const RUNTIME_FLAGS_PATH = "src/services/ai/salesBrainRuntimeFlags.ts";

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
  /v6\.5R\s+approves\s+production\s+pilot\s+automatically/i,
  /v6\.5R\s+authorizes\s+production\s+pilot\s+start/i,
  /v6\.5R\s+captures\s+approval\s+for\s+Gate\s+B/i,
  /v6\.5R\s+authorizes\s+Gate\s+B\s+execution/i,
  /v6\.5R\s+authorizes\s+Gemini\s+invocation/i,
  /execution\s+approved\s+for\s+production/i,
  /deploy\s+approved\s+for\s+production/i,
  /gemini\s+approved\s+for\s+production/i,
  /provider\s+approved\s+for\s+production/i,
  /packet\s+authorizes\s+production\s+promotion\s+automatically/i,
  /production\s+pilot\s+is\s+approved/i,
  /Gate\s+B\s+is\s+approved\s+by\s+v6\.5R\s+alone/i,
  /v6\.5R\s+approved\b/i,
];

const BAD_APPROVED_PATTERNS = [
  /Approval Captured\?\s*=\s*Yes/i,
  /Execution Allowed\?\s*=\s*Yes/i,
  /May Execute from v6\.5R\?\s*=\s*Yes/i,
  /Gate B Approved\?\s*=\s*Yes/i,
  /Gate B Executed\?\s*=\s*Yes/i,
  /Env Updated in v6\.5R\?\s*=\s*Yes/i,
  /Cloud Run Env Updated in v6\.5R\?\s*=\s*Yes/i,
  /gcloud Executed in v6\.5R\?\s*=\s*Yes/i,
  /Gemini Invocation Approved\?\s*=\s*Yes/i,
  /Gemini Invocation Executed\?\s*=\s*Yes/i,
  /Prompt\/Provider Payload Sent\?\s*=\s*Yes/i,
  /Pilot Start Approved\?\s*=\s*Yes/i,
  /Pilot Started\?\s*=\s*Yes/i,
  /Gate B\s+approved\s+for/i,
  /execution\s+approved\s+for/i,
  /deploy\s+approved\s+for/i,
  /gemini\s+approved\s+for/i,
  /provider\s+approved\s+for/i,
  /Gate B Executed\?\s*=\s*Yes/i,
  /Gate B has been executed/i,
  /Gate B execution completed/i,
  /all\s+gates\s+executed/i,
  /execution\s+authorized\s+by\s+v6\.5R/i,
];

const HEAD_SHA = "8f6e5cc6d12ea6a576775201f2c01fb540802003";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.5R Staging Runtime Switch Alignment Execution Record & Gate B Readiness ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v65qDoc = readFileSync(V65Q_DOC, "utf8");
const v65pDoc = readFileSync(V65P_DOC, "utf8");
const v65oDoc = readFileSync(V65O_DOC, "utf8");
const v65nDoc = readFileSync(V65N_DOC, "utf8");
const v65mDoc = readFileSync(V65M_DOC, "utf8");
const v65lDoc = readFileSync(V65L_DOC, "utf8");
const v65kDoc = readFileSync(V65K_DOC, "utf8");
const v65jDoc = readFileSync(V65J_DOC, "utf8");
const v65iDoc = readFileSync(V65I_DOC, "utf8");
const v65hDoc = readFileSync(V65H_DOC, "utf8");
const v65gDoc = readFileSync(V65G_DOC, "utf8");
const v65fDoc = readFileSync(V65F_DOC, "utf8");
const v65eDoc = readFileSync(V65E_DOC, "utf8");
const v65dDoc = readFileSync(V65D_DOC, "utf8");
const v65cDoc = readFileSync(V65C_DOC, "utf8");
const v65bDoc = readFileSync(V65B_DOC, "utf8");
const v65aDoc = readFileSync(V65A_DOC, "utf8");
const v64jDoc = readFileSync(V64J_DOC, "utf8");
const v64kDoc = readFileSync(V64K_DOC, "utf8");
const v64lDoc = readFileSync(V64L_DOC, "utf8");
const v64mDoc = readFileSync(V64M_DOC, "utf8");
const v64nDoc = readFileSync(V64N_DOC, "utf8");
const v64oDoc = readFileSync(V64O_DOC, "utf8");
const v64pDoc = readFileSync(V64P_DOC, "utf8");
const v64qDoc = readFileSync(V64Q_DOC, "utf8");
const v64rDoc = readFileSync(V64R_DOC, "utf8");
const v64sDoc = readFileSync(V64S_DOC, "utf8");
const v64tDoc = readFileSync(V64T_DOC, "utf8");
const v64uDoc = readFileSync(V64U_DOC, "utf8");
const v64vDoc = readFileSync(V64V_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const runtimeFlagsSrc = readFileSync(RUNTIME_FLAGS_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v65r-staging-runtime-switch-alignment-execution-record-gate-b-readiness.mts",
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
  ok("v6.5R doc exists", doc.length > 8000);
  ok("doc v6.5R label", doc.includes("v6.5R"));
  ok("v6.5Q doc exists", existsSync(V65Q_DOC) && v65qDoc.includes("v6.5Q"));
  ok("v6.5P doc exists", existsSync(V65P_DOC) && v65pDoc.includes("v6.5P"));
  ok("v6.5O doc exists", existsSync(V65O_DOC) && v65oDoc.includes("v6.5O"));
  ok("v6.5N doc exists", existsSync(V65N_DOC) && v65nDoc.includes("v6.5N"));
  ok("v6.5M doc exists", existsSync(V65M_DOC) && v65mDoc.includes("v6.5M"));
  ok("v6.5L doc exists", existsSync(V65L_DOC) && v65lDoc.includes("v6.5L"));
  ok("v6.5K doc exists", existsSync(V65K_DOC) && v65kDoc.includes("v6.5K"));
  ok("v6.5J doc exists", existsSync(V65J_DOC) && v65jDoc.includes("v6.5J"));
  ok("v6.5I doc exists", existsSync(V65I_DOC) && v65iDoc.includes("v6.5I"));
  ok("v6.5H doc exists", existsSync(V65H_DOC) && v65hDoc.includes("v6.5H"));
  ok("v6.5G doc exists", existsSync(V65G_DOC) && v65gDoc.includes("v6.5G"));
  ok("v6.5F doc exists", existsSync(V65F_DOC) && v65fDoc.includes("v6.5F"));
  ok("v6.5E doc exists", existsSync(V65E_DOC) && v65eDoc.includes("v6.5E"));
  ok("v6.5D doc exists", existsSync(V65D_DOC) && v65dDoc.includes("v6.5D"));
  ok("v6.5C doc exists", existsSync(V65C_DOC) && v65cDoc.includes("v6.5C"));
  ok("v6.5B doc exists", existsSync(V65B_DOC) && v65bDoc.includes("v6.5B"));
  ok("v6.5A doc exists", existsSync(V65A_DOC) && v65aDoc.includes("v6.5A"));
  ok("v6.4J doc exists", existsSync(V64J_DOC) && v64jDoc.includes("v6.4J"));
  ok("v6.4K doc exists", existsSync(V64K_DOC) && v64kDoc.includes("v6.4K"));
  ok("v6.4L doc exists", existsSync(V64L_DOC) && v64lDoc.includes("v6.4L"));
  ok("v6.4M doc exists", existsSync(V64M_DOC) && v64mDoc.includes("v6.4M"));
  ok("v6.4N doc exists", existsSync(V64N_DOC) && v64nDoc.includes("v6.4N"));
  ok("v6.4O doc exists", existsSync(V64O_DOC) && v64oDoc.includes("v6.4O"));
  ok("v6.4P doc exists", existsSync(V64P_DOC) && v64pDoc.includes("v6.4P"));
  ok("v6.4Q doc exists", existsSync(V64Q_DOC) && v64qDoc.includes("v6.4Q"));
  ok("v6.4R doc exists", existsSync(V64R_DOC) && v64rDoc.includes("v6.4R"));
  ok("v6.4S doc exists", existsSync(V64S_DOC) && v64sDoc.includes("v6.4S"));
  ok("v6.4T doc exists", existsSync(V64T_DOC) && v64tDoc.includes("v6.4T"));
  ok("v6.4U doc exists", existsSync(V64U_DOC) && v64uDoc.includes("v6.4U"));
  ok("v6.4V doc exists", existsSync(V64V_DOC) && v64vDoc.includes("v6.4V"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
  ok("runtime flags module exists", existsSync(RUNTIME_FLAGS_PATH));
}

// --- baseline and safety positioning ---
{
  ok("doc HEAD 8f6e5cc", doc.includes(HEAD_SHA) || doc.includes("8f6e5cc"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok("doc no deploy", /does not deploy|no deploy/i.test(docLower));
  ok(
    "doc no production touch",
    /does not touch production|no production touch/i.test(doc)
  );
  ok(
    "doc no production promotion",
    /no production promotion|does not promote/i.test(doc)
  );
  ok(
    "doc no production pilot start",
    /no production pilot start|does not start production pilot/i.test(doc)
  );
  ok(
    "doc no staging pilot start",
    /no staging pilot start|does not start staging/i.test(doc)
  );
  ok(
    "doc no runtime UI change",
    /does not change runtime UI|no runtime UI change/i.test(doc)
  );
  ok(
    "doc no user-visible AI answer execution",
    /no user-visible AI answer execution|does not execute user-visible AI answers/i.test(
      doc
    )
  );
  ok(
    "doc no Gemini invocation in v6.5R",
    /no Gemini invocation in v6\.5R|does not invoke Gemini/i.test(doc)
  );
  ok(
    "doc no prompt provider sending in v6.5R",
    /no prompt\/provider sending in v6\.5R|does not send prompts or provider payloads/i.test(
      doc
    )
  );
  ok(
    "doc no env update in v6.5R",
    /no env update in v6\.5R|Env Updated in v6\.5R\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc no Cloud Run env update in v6.5R",
    /no Cloud Run env update in v6\.5R|Cloud Run Env Updated in v6\.5R\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no gcloud execution in v6.5R",
    /no gcloud execution|gcloud Executed in v6\.5R\?\s*=\s*No|does not execute gcloud/i.test(
      doc
    )
  );
  ok(
    "doc no Firebase CLI execution",
    /does not execute Firebase CLI|Firebase CLI Executed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc no Cloud Run CLI execution",
    /does not execute Cloud Run CLI|Cloud Run CLI Executed\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no synthetic invocation execution",
    /no synthetic invocation execution|does not execute Gate B/i.test(doc)
  );
  ok(
    "doc no runtime redaction integration execution",
    /no runtime redaction integration execution/i.test(doc)
  );
  ok(
    "doc no monitoring logging execution",
    /no monitoring\/logging execution|does not add runtime monitoring/i.test(doc)
  );
  ok(
    "doc no AI log persistence",
    /no AI log persistence|does not persist AI logs/i.test(doc)
  );
  ok(
    "doc no approval captured for Gate B",
    /no approval captured for Gate B|No approval is captured for Gate B/i.test(
      doc
    )
  );
  ok(
    "doc no execution approval captured for Gate B",
    /no execution approval captured for Gate B/i.test(doc)
  );
  ok(
    "doc no deploy approval captured",
    /no deploy approval captured|No deploy approval captured/i.test(doc)
  );
  ok(
    "doc no gemini provider approval captured",
    /no Gemini\/provider approval captured|No Gemini\/provider approval captured/i.test(
      doc
    )
  );
  ok(
    "doc no pilot approval captured",
    /no pilot approval captured|No pilot approval captured/i.test(doc)
  );
  ok(
    "doc no execution allowed",
    /No execution is allowed|no execution allowed/i.test(doc)
  );
  ok(
    "doc Gate B remains approval-required",
    /Gate B remains approval-required/i.test(doc)
  );
}

// --- status fields ---
{
  ok(
    "doc approval captured is no",
    /Approval Captured\?\s*=\s*No|Approval Captured\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc execution allowed is no",
    /Execution Allowed\?\s*=\s*No|Execution Allowed\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc may execute from v65r is no",
    /May Execute from v6\.5R\?\s*=\s*No|May Execute from v6\.5R\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc gate b approved is no",
    /Gate B Approved\?\s*=\s*No|Gate B Approved\?\s*\|\s*\*\*No\*\*/i.test(doc)
  );
  ok(
    "doc gate b executed is no",
    /Gate B Executed\?\s*=\s*No|Gate B Executed\?\s*\|\s*\*\*No\*\*/i.test(doc)
  );
  ok(
    "doc gemini invocation approved is no",
    /Gemini Invocation Approved\?\s*=\s*No|Gemini Invocation Approved\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc gemini invocation executed is no",
    /Gemini Invocation Executed\?\s*=\s*No|Gemini Invocation Executed\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc prompt provider payload sent is no",
    /Prompt\/Provider Payload Sent\?\s*=\s*No|Prompt\/Provider Payload Sent\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc env updated in v65r is no",
    /Env Updated in v6\.5R\?\s*=\s*No|Env Updated in v6\.5R\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc cloud run env updated in v65r is no",
    /Cloud Run Env Updated in v6\.5R\?\s*=\s*No|Cloud Run Env Updated in v6\.5R\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc gcloud executed in v65r is no",
    /gcloud Executed in v6\.5R\?\s*=\s*No|gcloud Executed in v6\.5R\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc pilot start approved is no",
    /Pilot Start Approved\?\s*=\s*No|Pilot Start Approved\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc pilot started is no",
    /Pilot Started\?\s*=\s*No|Pilot Started\?\s*\|\s*\*\*No\*\*/i.test(doc)
  );
  ok(
    "doc does not state Gate B approved",
    /Does not state Gate B approved|does not state Gate B approved/i.test(doc)
  );
  ok(
    "doc does not state execution approved",
    /Does not state execution approved|does not state execution approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state deploy approved",
    /Does not state deploy approved|does not state deploy approved/i.test(doc)
  );
  ok(
    "doc does not state gemini provider approved",
    /Does not state Gemini\/provider approved|does not state Gemini\/provider approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state production pilot approved",
    /Does not state production pilot approved|does not state production pilot approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state Gate B executed",
    /Does not state Gate B executed|does not state Gate B executed/i.test(doc)
  );
}

// --- required sections ---
{
  ok("doc baseline", /## 1\. Baseline/i.test(doc));
  ok("doc purpose", /## 2\. Purpose/i.test(doc));
  ok("doc non-authorization clause", /Non-Authorization Clause/i.test(doc));
  ok("doc current state summary", /Current State Summary/i.test(doc));
  ok("doc v65q relationship", /v6\.5Q Relationship/i.test(doc));
  ok(
    "doc v65q exec approval carry-forward",
    /v6\.5Q\.EXEC Approval Carry-Forward/i.test(doc)
  );
  ok(
    "doc v65q exec commands summary",
    /v6\.5Q\.EXEC Commands Summary/i.test(doc)
  );
  ok(
    "doc v65q exec result summary",
    /v6\.5Q\.EXEC Result Summary/i.test(doc)
  );
  ok(
    "doc env values before execution",
    /Env Values Before Execution/i.test(doc)
  );
  ok(
    "doc env values after execution",
    /Env Values After Execution/i.test(doc)
  );
  ok("doc revision summary", /Revision Summary/i.test(doc));
  ok("doc safety confirmations", /Safety Confirmations/i.test(doc));
  ok("doc no deploy confirmation", /No Deploy Confirmation/i.test(doc));
  ok(
    "doc no gemini invocation confirmation",
    /No Gemini Invocation Confirmation/i.test(doc)
  );
  ok(
    "doc no prompt provider payload confirmation",
    /No Prompt\/Provider Payload Confirmation/i.test(doc)
  );
  ok(
    "doc no pilot start confirmation",
    /No Pilot Start Confirmation/i.test(doc)
  );
  ok(
    "doc no production touch confirmation",
    /No Production Touch Confirmation/i.test(doc)
  );
  ok(
    "doc no secret value exposure confirmation",
    /No Secret Value Exposure Confirmation/i.test(doc)
  );
  ok("doc W-01 resolution", /W-01 Resolution/i.test(doc));
  ok("doc W-02 resolution", /W-02 Resolution/i.test(doc));
  ok("doc remaining warnings", /Remaining Warnings/i.test(doc));
  ok("doc gate b readiness summary", /Gate B Readiness Summary/i.test(doc));
  ok(
    "doc gate b remaining blockers",
    /Gate B Remaining Blockers/i.test(doc)
  );
  ok(
    "doc gate b required approval wording",
    /Gate B Required Approval Wording/i.test(doc)
  );
  ok(
    "doc gate b pre-execution report requirements",
    /Gate B Pre-Execution Report Requirements/i.test(doc)
  );
  ok("doc gate b safety checklist", /Gate B Safety Checklist/i.test(doc));
  ok("doc gate b cost checklist", /Gate B Cost Checklist/i.test(doc));
  ok(
    "doc gate b privacy redaction checklist",
    /Gate B Privacy\/Redaction Checklist/i.test(doc)
  );
  ok(
    "doc gate b prompt provider payload boundary",
    /Gate B Prompt\/Provider Payload Boundary/i.test(doc)
  );
  ok(
    "doc gate b user-visible isolation requirement",
    /Gate B User-Visible Isolation Requirement/i.test(doc)
  );
  ok("doc gate b stop conditions", /Gate B Stop Conditions/i.test(doc));
  ok("doc gate b no-go conditions", /Gate B No-Go Conditions/i.test(doc));
  ok("doc recommended next step", /Recommended Next Step/i.test(doc));
  ok(
    "doc explicit non-execution confirmation",
    /Explicit Non-Execution Confirmation/i.test(doc)
  );
  ok(
    "doc explicit non-authorization confirmation",
    /Explicit Non-Authorization Confirmation/i.test(doc)
  );
  ok(
    "doc v65q exec success",
    /v6\.5Q\.EXEC.*SUCCESS|SUCCESS.*v6\.5Q\.EXEC/i.test(doc)
  );
  ok(
    "doc W-01 before true after false",
    /NONGA_AI_USER_VISIBLE_ENABLED.*`true`|W-01.*true/i.test(doc) &&
      /NONGA_AI_USER_VISIBLE_ENABLED.*`false`|W-01.*RESOLVED/i.test(doc)
  );
  ok(
    "doc W-02 before true after false",
    /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*`true`|W-02.*true/i.test(
      doc
    ) &&
      /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*`false`|W-02.*RESOLVED/i.test(
        doc
      )
  );
  ok(
    "doc revision 00076 to 00077",
    /nonga-staging-00076-hmh/.test(doc) &&
      /nonga-staging-00077-j6w/.test(doc)
  );
  ok(
    "doc gate b synthetic invocation",
    /Gate B.*Synthetic Invocation|Synthetic Invocation Execution Candidate/i.test(
      doc
    )
  );
  ok(
    "doc v65r does not execute gate b",
    /v6\.5R does not execute Gate B/i.test(doc)
  );
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
  ok("self no firebase deploy cmd", !/firebase deploy/.test(selfCodeOnly));
  ok("self no gcloud secrets cmd", !/gcloud secrets/.test(selfCodeOnly));
  ok("self no gcloud run cmd", !/gcloud run/.test(selfCodeOnly));
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
  ok("self no public debug route", !/debug\/|\/debug\b/.test(selfCodeOnly));
  ok(
    "self no runtime logging implementation",
    !/createLogger|winston|pino\b/.test(selfCodeOnly)
  );
  ok(
    "self no AI log persistence",
    !/analytics\.track|logEvent|persistAiLog/.test(selfCodeOnly)
  );
  ok(
    "runtime flags defines user visible env",
    runtimeFlagsSrc.includes("NONGA_AI_USER_VISIBLE_ENABLED")
  );
  ok(
    "runtime flags defines admin shadow env",
    runtimeFlagsSrc.includes("NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED")
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
    "doc v65r does not authorize execution alone",
    /May Execute from v6\.5R\?\s*=\s*No|Execution Allowed\?\s*=\s*No/i.test(doc)
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
    "package v65r script",
    pkg.includes(
      "test:v65r-staging-runtime-switch-alignment-execution-record-gate-b-readiness"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v65r-staging-runtime-switch-alignment-execution-record-gate-b-readiness.mts"
    )
  );
}

console.log(
  "\nDone v6.5R Staging Runtime Switch Alignment Execution Record & Gate B Readiness tests."
);
if (process.exitCode) process.exit(process.exitCode);
