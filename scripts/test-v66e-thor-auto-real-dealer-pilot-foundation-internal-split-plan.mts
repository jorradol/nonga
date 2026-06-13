/**
 * v6.6E — Thor Auto Real Dealer Pilot Foundation & Internal Split Plan (static validation only)
 * npm run test:v66e-thor-auto-real-dealer-pilot-foundation-internal-split-plan
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
  "docs/v6.6E-thor-auto-real-dealer-pilot-foundation-internal-split-plan.md";
const V66D_DOC =
  "docs/v6.6D-first-dealer-outreach-execution-approval-packet.md";
const V66C_DOC =
  "docs/v6.6C-dealer-outreach-approval-first-prospect-checklist.md";
const V66B_DOC = "docs/v6.6B-dealer-starter-pilot-offer-outreach-packet.md";
const V66A_DOC = "docs/v6.6A-controlled-revenue-pilot-scope-packet.md";
const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const GUARD_PATH = "src/services/ai/realProviderRedactionGuard.ts";
const APP_PATH = "src/App.tsx";
const USE_CHAT_PATH = "src/hooks/chat/useChat.ts";
const HARNESS_PATH = "scripts/gate-b-synthetic-invocation-exec.mts";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/i,
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

const AUTO_EXEC_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+deploy/i,
  /v6\.6E\s+captures\s+approval\s+for\s+Thor/i,
  /v6\.6E\s+authorizes\s+runtime\s+import/i,
  /v6\.6E\s+authorizes\s+paid\s+pilot/i,
  /v6\.6E\s+authorizes\s+dealer\s+onboarding/i,
  /v6\.6E\s+approves\s+payment/i,
  /execution\s+approved\s+for\s+production/i,
  /Thor Auto Foundation is approved by v6\.6E alone/i,
  /v6\.6E\s+approved\b/i,
];

const BAD_FOUNDATION_APPROVED_PATTERNS = [
  /Thor Auto Foundation Approved\?\s*=\s*Yes/i,
  /Runtime Vehicle Import Performed\?\s*=\s*Yes/i,
  /Paid Pilot Started\?\s*=\s*Yes/i,
  /Revenue Pilot Approved\?\s*=\s*Yes/i,
  /Revenue Pilot Started\?\s*=\s*Yes/i,
  /Production Onboarding Completed\?\s*=\s*Yes/i,
  /Dealer Onboarded\?\s*=\s*Yes/i,
  /Payment\/Billing Enabled\?\s*=\s*Yes/i,
  /Execution Allowed from v6\.6E\?\s*=\s*Yes/i,
  /Gemini Invocation in v6\.6E\?\s*=\s*Yes/i,
  /Adapter Allow Path Added\?\s*=\s*Yes/i,
  /Deploy Performed\?\s*=\s*Yes/i,
  /Production Touched\?\s*=\s*Yes/i,
  /User-Visible AI Enabled\?\s*=\s*Yes/i,
  /paid pilot has been started/i,
  /runtime import has been performed/i,
  /production onboarding has been completed/i,
  /Thor Auto foundation has been approved/i,
  /execution authorized by v6\.6E/i,
];

const HEAD_SHA = "63896963ca1fce7e8408b28e09553b3c6df5a56e";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.6E Thor Auto Real Dealer Pilot Foundation & Internal Split Plan ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const v66dDoc = readFileSync(V66D_DOC, "utf8");
const v66cDoc = readFileSync(V66C_DOC, "utf8");
const v66bDoc = readFileSync(V66B_DOC, "utf8");
const v66aDoc = readFileSync(V66A_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const guardSrc = readFileSync(GUARD_PATH, "utf8");
const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const useChatSrc = readFileSync(USE_CHAT_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v66e-thor-auto-real-dealer-pilot-foundation-internal-split-plan.mts",
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

const combinedAdapterGuardSelf = adapterSrc + guardSrc + selfCodeOnly;

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- docs exist ---
{
  ok("v6.6E doc exists", doc.length > 6000);
  ok("doc v6.6E label", doc.includes("v6.6E"));
  ok("v6.6D doc exists", existsSync(V66D_DOC) && v66dDoc.includes("v6.6D"));
  ok("v6.6C doc exists", existsSync(V66C_DOC) && v66cDoc.includes("v6.6C"));
  ok("v6.6B doc exists", existsSync(V66B_DOC) && v66bDoc.includes("v6.6B"));
  ok("v6.6A doc exists", existsSync(V66A_DOC) && v66aDoc.includes("v6.6A"));
  ok("Gate C guard exists", existsSync(GUARD_PATH));
  ok("Gate B harness exists", existsSync(HARNESS_PATH));
}

// --- safety positioning ---
{
  ok("doc HEAD 6389696", doc.includes(HEAD_SHA) || doc.includes("6389696"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok(
    "doc no runtime import in v6.6E",
    /does not import vehicle data|Runtime Vehicle Import Performed\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no paid pilot start in v6.6E",
    /Paid Pilot Started\?\s*=\s*No|does not start paid pilot/i.test(doc)
  );
  ok(
    "doc no Gemini invocation in v6.6E",
    /Gemini Invocation in v6\.6E\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc no deploy",
    /Deploy Performed\?\s*=\s*No|does not deploy/i.test(doc)
  );
  ok(
    "doc no production touch",
    /Production Touched\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc no user-visible AI",
    /User-Visible AI Enabled\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc no Firestore write",
    /No Firestore write|no Firestore write/i.test(doc)
  );
}

// --- status fields ---
{
  ok(
    "doc thor auto foundation approved is no",
    /Thor Auto Foundation Approved\?\s*=\s*No|Thor Auto Foundation Approved\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc runtime vehicle import performed is no",
    /Runtime Vehicle Import Performed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc paid pilot started is no",
    /Paid Pilot Started\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc revenue pilot started is no",
    /Revenue Pilot Started\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc production onboarding completed is no",
    /Production Onboarding Completed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc dealer onboarded is no",
    /Dealer Onboarded\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc payment billing enabled is no",
    /Payment\/Billing Enabled\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc execution allowed from v66e is no",
    /Execution Allowed from v6\.6E\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc gemini invocation in v66e is no",
    /Gemini Invocation in v6\.6E\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc adapter allow path added is no",
    /Adapter Allow Path Added\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc does not state thor foundation approved",
    /Does not state Thor Auto foundation approved|does not state Thor Auto foundation approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state paid pilot started",
    /Does not state paid pilot started|does not state paid pilot started/i.test(doc)
  );
  ok(
    "doc does not claim 3 real dealers from splits",
    /Does not claim 3 real dealer|does not claim 3 real dealer|NOT 1Thor\+2Thor\+3Thor/i.test(
      doc
    )
  );
}

// --- required sections ---
{
  ok("doc baseline", /## 1\. Baseline/i.test(doc));
  ok("doc purpose", /## 2\. Purpose/i.test(doc));
  ok("doc non-authorization clause", /Non-Authorization Clause/i.test(doc));
  ok("doc current state summary", /Current State Summary/i.test(doc));
  ok(
    "doc relationship to v66ad",
    /Relationship to v6\.6A–D|Relationship to v6\.6A-D/i.test(doc)
  );
  ok(
    "doc thor auto role definition",
    /Thor Auto Role Definition/i.test(doc)
  );
  ok("doc internal split model", /Internal Split Model/i.test(doc));
  ok("doc allowed uses", /Allowed Uses/i.test(doc));
  ok("doc not allowed uses", /Not Allowed Uses/i.test(doc));
  ok(
    "doc readiness criteria before real thor pilot",
    /Readiness Criteria Before Real Thor Pilot/i.test(doc)
  );
  ok("doc path to revenue", /Path to Revenue/i.test(doc));
  ok("doc future approval wording", /Future Approval Wording/i.test(doc));
  ok(
    "doc explicit non-execution confirmation",
    /Explicit Non-Execution Confirmation/i.test(doc)
  );
  ok(
    "doc explicit non-authorization confirmation",
    /Explicit Non-Authorization Confirmation/i.test(doc)
  );
  ok(
    "doc thor auto first real dealer",
    /first real dealer candidate|First real dealer candidate/i.test(doc)
  );
  ok("doc 1Thor split", /1Thor/i.test(doc));
  ok("doc 2Thor split", /2Thor/i.test(doc));
  ok("doc 3Thor split", /3Thor/i.test(doc));
  ok(
    "doc not three real customers",
    /NOT three real customers|ไม่ใช่ลูกค้า 3 ราย|NOT 1Thor/i.test(doc)
  );
  ok(
    "doc one dealer group",
    /1 dealer group|dealer group จริง 1 ราย/i.test(doc)
  );
  ok(
    "doc internal sandbox partitions",
    /internal sandbox|sandbox partition/i.test(doc)
  );
  ok(
    "doc allowed listing workflow",
    /listing workflow/i.test(doc)
  );
  ok(
    "doc allowed lead tracking",
    /lead tracking/i.test(doc)
  );
  ok(
    "doc not allowed import runtime",
    /Import รถจริงเข้า runtime|import vehicle data into runtime/i.test(doc)
  );
  ok(
    "doc not allowed claim 3 dealers",
    /Claim ว่ามี dealer จริง 3 ราย|claim 3 real dealer/i.test(doc)
  );
  ok(
    "doc readiness admin review",
    /admin review workflow/i.test(doc)
  );
  ok(
    "doc readiness manual publish",
    /manual publish boundary/i.test(doc)
  );
  ok(
    "doc readiness cost guard",
    /cost guard/i.test(doc)
  );
  ok(
    "doc path external 2 dealers",
    /2 ราย|2 additional|external dealer/i.test(doc)
  );
  ok(
    "doc path real lead real revenue",
    /lead จริง|รายได้จริง|ไม่ใช่ demo/i.test(doc)
  );
  ok(
    "doc future approval wording thai",
    /อนุมัติให้เตรียม Thor Auto internal dealer split ตาม v6\.6E/i.test(doc)
  );
  ok("doc dealer counting rules", /Dealer Counting Rules/i.test(doc));
}

// --- no bad approved claims ---
{
  for (const pat of BAD_FOUNDATION_APPROVED_PATTERNS) {
    ok(
      `doc no bad foundation approved ${pat.source.slice(0, 22)}`,
      !pat.test(doc)
    );
  }
}

// --- static guards ---
{
  ok(
    "adapter guard self no generateContent",
    !/generateContent\s*\(/.test(combinedAdapterGuardSelf)
  );
  ok(
    "harness only generateContent site",
    /generateContent\s*\(/.test(harnessSrc)
  );
  ok(
    "combined adapter guard self no fetch http",
    !/fetch\s*\(\s*[`'"]https?:/.test(combinedAdapterGuardSelf)
  );
  ok("adapter no proc env read", !/\bprocess\.env\b/.test(adapterSrc));
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("useChat no realProviderAdapter import", !useChatSrc.includes("realProviderAdapter"));
  ok(
    "adapter no firestore write",
    !/\b(setDoc|getDocs|writeBatch)\b/.test(adapterSrc)
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
    "v64m fixture serialized clean",
    assertNoForbiddenSensitiveContent(
      JSON.stringify(SYNTHETIC_REDACTION_FIXTURES.metadata)
    ).pass
  );
}

// --- no secrets / PII ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret value ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of AUTO_EXEC_AUTH_PATTERNS) {
    ok(`doc no bad auth ${pat.source.slice(0, 18)}`, !pat.test(doc));
  }
  for (const pat of REAL_CONTACT_PATTERNS) {
    ok(`doc no real contact ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_PROJECT_ID_PATTERNS) {
    ok(`doc no real project id ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok(
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- package script ---
{
  ok(
    "package v66e script",
    pkg.includes(
      "test:v66e-thor-auto-real-dealer-pilot-foundation-internal-split-plan"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v66e-thor-auto-real-dealer-pilot-foundation-internal-split-plan.mts"
    )
  );
}

console.log(
  "\nDone v6.6E Thor Auto Real Dealer Pilot Foundation & Internal Split Plan tests."
);
if (process.exitCode) process.exit(process.exitCode);
