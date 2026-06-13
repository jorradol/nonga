/**
 * v6.5U — Gate C Runtime Redaction Integration Pre-Execution Approval Packet (static validation only)
 * npm run test:v65u-gate-c-runtime-redaction-integration-pre-execution-approval-packet
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
  "docs/v6.5U-gate-c-runtime-redaction-integration-pre-execution-approval-packet.md";
const V65T_DOC =
  "docs/v6.5T-gate-b-synthetic-invocation-execution-record-gate-c-readiness.md";
const V65S_DOC =
  "docs/v6.5S-gate-b-synthetic-invocation-pre-execution-approval-packet.md";
const V65R_DOC =
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
const HARNESS_PATH = "scripts/gate-b-synthetic-invocation-exec.mts";

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
  /v6\.5U\s+captures\s+approval\s+for\s+Gate\s+C/i,
  /v6\.5U\s+authorizes\s+Gate\s+C\s+execution/i,
  /v6\.5U\s+authorizes\s+runtime\s+redaction\s+integration/i,
  /v6\.5U\s+approves\s+production\s+pilot/i,
  /execution\s+approved\s+for\s+production/i,
  /deploy\s+approved\s+for\s+production/i,
  /Gate\s+C\s+is\s+approved\s+by\s+v6\.5U\s+alone/i,
  /v6\.5U\s+approved\b/i,
];

const BAD_GATE_C_APPROVED_PATTERNS = [
  /Gate C Approved\?\s*=\s*Yes/i,
  /Gate C Executed\?\s*=\s*Yes/i,
  /Runtime Redaction Integration Executed\?\s*=\s*Yes/i,
  /App\/User\/Chat\/Live Runtime Import Added\?\s*=\s*Yes/i,
  /Execution Allowed from v6\.5U\?\s*=\s*Yes/i,
  /Gemini Invocation in v6\.5U\?\s*=\s*Yes/i,
  /Prompt\/Provider Payload Sent in v6\.5U\?\s*=\s*Yes/i,
  /Deploy Performed\?\s*=\s*Yes/i,
  /Pilot Started\?\s*=\s*Yes/i,
  /Production Touched\?\s*=\s*Yes/i,
  /User-Visible AI Answer Executed\?\s*=\s*Yes/i,
  /Gate C has been executed/i,
  /runtime integration has been executed/i,
  /execution authorized by v6\.5U/i,
];

const HEAD_SHA = "34fb078d8e65b946aba1a4a2603163c1c909c341";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.5U Gate C Runtime Redaction Integration Pre-Execution Approval Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const v65tDoc = readFileSync(V65T_DOC, "utf8");
const v65sDoc = readFileSync(V65S_DOC, "utf8");
const v65rDoc = readFileSync(V65R_DOC, "utf8");
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
const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const runtimeFlagsSrc = readFileSync(RUNTIME_FLAGS_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v65u-gate-c-runtime-redaction-integration-pre-execution-approval-packet.mts",
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
  ok("v6.5U doc exists", doc.length > 8000);
  ok("doc v6.5U label", doc.includes("v6.5U"));
  ok("v6.5T doc exists", existsSync(V65T_DOC) && v65tDoc.includes("v6.5T"));
  ok("v6.5S doc exists", existsSync(V65S_DOC) && v65sDoc.includes("v6.5S"));
  ok("v6.5R doc exists", existsSync(V65R_DOC) && v65rDoc.includes("v6.5R"));
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
  ok("Gate B harness exists", existsSync(HARNESS_PATH));
  ok("runtime flags module exists", existsSync(RUNTIME_FLAGS_PATH));
}

// --- safety positioning ---
{
  ok("doc HEAD 34fb078", doc.includes(HEAD_SHA) || doc.includes("34fb078"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok(
    "doc no Gate C execution in v6.5U",
    /no Gate C execution in v6\.5U|does not execute Gate C/i.test(doc)
  );
  ok(
    "doc no runtime redaction integration execution",
    /no runtime redaction integration execution|Runtime Redaction Integration Executed\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no App user chat live runtime import",
    /no App\/user\/chat\/live runtime import|App\/User\/Chat\/Live Runtime Import Added\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no Gemini invocation in v6.5U",
    /no Gemini invocation|Gemini Invocation in v6\.5U\?\s*=\s*No|does not invoke Gemini/i.test(
      doc
    )
  );
  ok(
    "doc no prompt provider sending in v6.5U",
    /no prompt\/provider payload sending|Prompt\/Provider Payload Sent in v6\.5U\?\s*=\s*No|does not send prompts or provider payloads/i.test(
      doc
    )
  );
  ok(
    "doc no new Gate B invocation",
    /no new Gate B invocation|does not run new Gate B invocation/i.test(doc)
  );
  ok("doc no deploy", /does not deploy|no deploy|Deploy Performed\?\s*=\s*No/i.test(doc));
  ok(
    "doc no production touch",
    /does not touch production|no production touch|Production Touched\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc no pilot start",
    /no pilot start|Pilot Started\?\s*=\s*No|does not start staging/i.test(doc)
  );
  ok("doc no env update", /no env update|No env update|Env Updated in v6\.5U\?\s*=\s*No/i.test(doc));
  ok(
    "doc no Cloud Run env update",
    /no Cloud Run env update|No Cloud Run env update|Cloud Run Env Updated in v6\.5U\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no gcloud execution",
    /no gcloud execution|gcloud Executed in v6\.5U\?\s*=\s*No|does not execute gcloud/i.test(doc)
  );
  ok(
    "doc no Firebase CLI execution",
    /no Firebase CLI execution|does not execute Firebase CLI/i.test(doc)
  );
  ok(
    "doc no Cloud Run CLI execution",
    /no Cloud Run CLI execution|does not execute Cloud Run CLI/i.test(doc)
  );
  ok(
    "doc no Firestore write",
    /no Firestore write|Firestore write in v6\.5U/i.test(doc)
  );
  ok(
    "doc no AI log persistence",
    /no AI log persistence|does not persist AI logs|AI log persistence in v6\.5U/i.test(doc)
  );
  ok(
    "doc Gate C remains approval-required",
    /Gate C remains approval-required/i.test(doc)
  );
  ok(
    "doc no user-visible AI answer execution",
    /no user-visible AI answer execution|User-Visible AI Answer Executed\?\s*=\s*No/i.test(doc)
  );
}

// --- status fields ---
{
  ok(
    "doc gate c approved is no",
    /Gate C Approved\?\s*=\s*No|Gate C Approved\?\s*\|\s*\*\*No\*\*/i.test(doc)
  );
  ok(
    "doc gate c executed is no",
    /Gate C Executed\?\s*=\s*No|Gate C Executed\?\s*\|\s*\*\*No\*\*/i.test(doc)
  );
  ok(
    "doc runtime redaction integration executed is no",
    /Runtime Redaction Integration Executed\?\s*=\s*No|Runtime Redaction Integration Executed\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc app user chat live runtime import is no",
    /App\/User\/Chat\/Live Runtime Import Added\?\s*=\s*No|App\/User\/Chat\/Live Runtime Import Added\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc user visible ai answer executed is no",
    /User-Visible AI Answer Executed\?\s*=\s*No|User-Visible AI Answer Executed\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc gemini invocation in v65u is no",
    /Gemini Invocation in v6\.5U\?\s*=\s*No|Gemini Invocation in v6\.5U\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc prompt provider payload sent in v65u is no",
    /Prompt\/Provider Payload Sent in v6\.5U\?\s*=\s*No|Prompt\/Provider Payload Sent in v6\.5U\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc deploy performed is no",
    /Deploy Performed\?\s*=\s*No|Deploy Performed\?\s*\|\s*\*\*No\*\*/i.test(doc)
  );
  ok(
    "doc pilot started is no",
    /Pilot Started\?\s*=\s*No|Pilot Started\?\s*\|\s*\*\*No\*\*/i.test(doc)
  );
  ok(
    "doc production touched is no",
    /Production Touched\?\s*=\s*No|Production Touched\?\s*\|\s*\*\*No\*\*/i.test(doc)
  );
  ok(
    "doc execution allowed from v65u is no",
    /Execution Allowed from v6\.5U\?\s*=\s*No|Execution Allowed from v6\.5U\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc does not state Gate C approved",
    /Does not state Gate C approved|does not state Gate C approved/i.test(doc)
  );
  ok(
    "doc does not state runtime integration approved",
    /Does not state runtime integration approved|does not state runtime integration approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state deploy approved",
    /Does not state deploy approved|does not state deploy approved/i.test(doc)
  );
  ok(
    "doc does not state production pilot approved",
    /Does not state production pilot approved|does not state production pilot approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state Gate C executed",
    /Does not state Gate C executed|does not state Gate C executed/i.test(doc)
  );
}

// --- required sections ---
{
  ok("doc baseline", /## 1\. Baseline/i.test(doc));
  ok("doc purpose", /## 2\. Purpose/i.test(doc));
  ok("doc non-authorization clause", /Non-Authorization Clause/i.test(doc));
  ok("doc current state summary", /Current State Summary/i.test(doc));
  ok("doc relationship to Gate A", /Relationship to Gate A/i.test(doc));
  ok("doc relationship to v65q exec", /Relationship to v6\.5Q\.EXEC/i.test(doc));
  ok(
    "doc relationship to gate b v65t",
    /Relationship to Gate B \/ v6\.5T/i.test(doc)
  );
  ok("doc gate c definition", /Gate C Definition/i.test(doc));
  ok("doc gate c scope", /Gate C Scope/i.test(doc));
  ok("doc gate c non-scope", /Gate C Non-Scope/i.test(doc));
  ok("doc candidate runtime paths", /Candidate Runtime Paths/i.test(doc));
  ok(
    "doc runtime paths explicitly excluded",
    /Runtime Paths Explicitly Excluded/i.test(doc)
  );
  ok(
    "doc redaction contract carry-forward",
    /Redaction Contract Carry-Forward/i.test(doc)
  );
  ok(
    "doc synthetic fixture carry-forward",
    /Synthetic Fixture Carry-Forward/i.test(doc)
  );
  ok("doc provider payload boundary", /Provider Payload Boundary/i.test(doc));
  ok("doc prompt redaction boundary", /Prompt Redaction Boundary/i.test(doc));
  ok(
    "doc response metadata boundary",
    /Response Metadata Boundary/i.test(doc)
  );
  ok("doc logging boundary", /Logging Boundary/i.test(doc));
  ok(
    "doc user-visible isolation boundary",
    /User-Visible Isolation Boundary/i.test(doc)
  );
  ok(
    "doc admin shadow isolation boundary",
    /Admin Shadow Isolation Boundary/i.test(doc)
  );
  ok(
    "doc recommended conservative gate c slice",
    /Recommended Conservative Gate C Slice/i.test(doc)
  );
  ok(
    "doc required future approval wording",
    /Required Future Approval Wording/i.test(doc)
  );
  ok(
    "doc pre-execution report requirement",
    /Pre-Execution Report Requirement/i.test(doc)
  );
  ok("doc safety checklist", /Safety Checklist/i.test(doc));
  ok(
    "doc privacy redaction checklist",
    /Privacy\/Redaction Checklist/i.test(doc)
  );
  ok("doc runtime import boundary", /Runtime Import Boundary/i.test(doc));
  ok("doc test requirements", /Test Requirements/i.test(doc));
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok("doc no-go conditions", /No-Go Conditions/i.test(doc));
  ok(
    "doc post-execution report required format",
    /Post-Execution Report Required Format/i.test(doc)
  );
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
    "doc conservative slice v65u exec label",
    /v6\.5U\.EXEC.*Runtime Redaction Integration Minimal Candidate/i.test(doc)
  );
  ok(
    "doc required approval wording thai",
    /อนุมัติให้ execute Gate C: Runtime Redaction Integration Minimal Candidate/i.test(
      doc
    )
  );
  ok(
    "doc disabled-by-default in approval wording",
    /disabled-by-default/i.test(doc)
  );
  ok(
    "doc v65u does not execute gate c",
    /v6\.5U does not execute Gate C/i.test(doc)
  );
  ok(
    "doc realProviderAdapter candidate path",
    doc.includes("realProviderAdapter.ts")
  );
}

// --- no bad Gate C approved claims ---
{
  for (const pat of BAD_GATE_C_APPROVED_PATTERNS) {
    ok(`doc no bad gate c approved ${pat.source.slice(0, 22)}`, !pat.test(doc));
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
    "adapter and self no generateContent",
    !/generateContent\s*\(/.test(adapterSrc + selfCodeOnly)
  );
  ok(
    "harness only generateContent outside adapter",
    /generateContent\s*\(/.test(harnessSrc)
  );
  ok(
    "combined adapter self no fetch http",
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
    "doc v65u does not authorize execution alone",
    /Execution Allowed from v6\.5U\?\s*=\s*No/i.test(doc)
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
    "package v65u script",
    pkg.includes(
      "test:v65u-gate-c-runtime-redaction-integration-pre-execution-approval-packet"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v65u-gate-c-runtime-redaction-integration-pre-execution-approval-packet.mts"
    )
  );
}

console.log(
  "\nDone v6.5U Gate C Runtime Redaction Integration Pre-Execution Approval Packet tests."
);
if (process.exitCode) process.exit(process.exitCode);
