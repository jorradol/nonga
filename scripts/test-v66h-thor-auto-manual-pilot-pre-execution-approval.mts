/**
 * v6.6H — Thor Auto Manual Pilot Preparation Pre-Execution Approval (static validation only)
 * npm run test:v66h-thor-auto-manual-pilot-pre-execution-approval
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
  "docs/v6.6H-thor-auto-manual-pilot-pre-execution-approval.md";
const V66G_DOC = "docs/v6.6G-thor-auto-manual-pilot-approval-packet.md";
const V66F_DOC =
  "docs/v6.6F-thor-auto-static-data-readiness-listing-workflow-prep.md";
const V66E_DOC =
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
  /v6\.6H\s+captures\s+approval\s+for\s+Thor/i,
  /v6\.6H\s+authorizes\s+runtime\s+import/i,
  /v6\.6H\s+authorizes\s+paid\s+pilot/i,
  /v6\.6H\s+authorizes\s+dealer\s+onboarding/i,
  /v6\.6H\s+approves\s+payment/i,
  /v6\.6H\s+authorizes\s+publish/i,
  /v6\.6H\s+authorizes\s+manual\s+pilot\s+execution/i,
  /execution\s+approved\s+for\s+production/i,
  /Thor Auto Manual Pilot Pre-Execution is approved by v6\.6H alone/i,
  /v6\.6H\s+approved\b/i,
];

const BAD_PREEXEC_APPROVED_PATTERNS = [
  /Thor Auto Manual Pilot Pre-Execution Approved\?\s*=\s*Yes/i,
  /Manual Pilot Preparation Started\?\s*=\s*Yes/i,
  /Runtime Vehicle Import Performed\?\s*=\s*Yes/i,
  /Firestore Write Performed\?\s*=\s*Yes/i,
  /Real Listing Published\?\s*=\s*Yes/i,
  /Auto-Publish Enabled\?\s*=\s*Yes/i,
  /Paid Pilot Started\?\s*=\s*Yes/i,
  /Revenue Pilot Approved\?\s*=\s*Yes/i,
  /Revenue Pilot Started\?\s*=\s*Yes/i,
  /Thor Auto Runtime Onboarding Performed\?\s*=\s*Yes/i,
  /Production Onboarding Completed\?\s*=\s*Yes/i,
  /Dealer Onboarded\?\s*=\s*Yes/i,
  /Payment\/Billing Enabled\?\s*=\s*Yes/i,
  /Execution Allowed from v6\.6H\?\s*=\s*Yes/i,
  /Gemini Invocation with Real Vehicle Data\?\s*=\s*Yes/i,
  /Adapter Allow Path Added\?\s*=\s*Yes/i,
  /Deploy Performed\?\s*=\s*Yes/i,
  /Production Touched\?\s*=\s*Yes/i,
  /User-Visible AI Enabled\?\s*=\s*Yes/i,
  /paid pilot has been started/i,
  /runtime import has been performed/i,
  /real listing has been published/i,
  /manual pilot preparation has been started/i,
  /pre-execution approval has been captured/i,
  /Thor Auto manual pilot pre-execution has been approved/i,
  /execution authorized by v6\.6H/i,
];

const HEAD_SHA = "89ff9ff992dc270968dfe60bd44117cba54b5b52";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.6H Thor Auto Manual Pilot Preparation Pre-Execution Approval ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const v66gDoc = readFileSync(V66G_DOC, "utf8");
const v66fDoc = readFileSync(V66F_DOC, "utf8");
const v66eDoc = readFileSync(V66E_DOC, "utf8");
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
  "scripts/test-v66h-thor-auto-manual-pilot-pre-execution-approval.mts",
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
  ok("v6.6H doc exists", doc.length > 6000);
  ok("doc v6.6H label", doc.includes("v6.6H"));
  ok("v6.6G doc exists", existsSync(V66G_DOC) && v66gDoc.includes("v6.6G"));
  ok("v6.6F doc exists", existsSync(V66F_DOC) && v66fDoc.includes("v6.6F"));
  ok("v6.6E doc exists", existsSync(V66E_DOC) && v66eDoc.includes("v6.6E"));
  ok("v6.6D doc exists", existsSync(V66D_DOC) && v66dDoc.includes("v6.6D"));
  ok("v6.6C doc exists", existsSync(V66C_DOC) && v66cDoc.includes("v6.6C"));
  ok("v6.6B doc exists", existsSync(V66B_DOC) && v66bDoc.includes("v6.6B"));
  ok("v6.6A doc exists", existsSync(V66A_DOC) && v66aDoc.includes("v6.6A"));
  ok("Gate C guard exists", existsSync(GUARD_PATH));
  ok("Gate B harness exists", existsSync(HARNESS_PATH));
}

// --- safety positioning ---
{
  ok("doc HEAD 89ff9ff", doc.includes(HEAD_SHA) || doc.includes("89ff9ff"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok(
    "doc no runtime import in v6.6H",
    /does not import vehicle data|Runtime Vehicle Import Performed\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no firestore write in v6.6H",
    /Firestore Write Performed\?\s*=\s*No|does not write Firestore/i.test(doc)
  );
  ok(
    "doc no paid pilot start in v6.6H",
    /Paid Pilot Started\?\s*=\s*No|does not start paid pilot/i.test(doc)
  );
  ok(
    "doc no gemini real vehicle in v6.6H",
    /Gemini Invocation with Real Vehicle Data\?\s*=\s*No/i.test(doc)
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
    "doc no auto-publish",
    /Auto-Publish Enabled\?\s*=\s*No|does not enable auto-publish/i.test(doc)
  );
  ok(
    "doc no manual pilot execution in v6.6H",
    /does not execute manual pilot|Manual Pilot Preparation Started\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no pre-execution capture",
    /does not capture pre-execution|does not capture.*approval|not captured pre-execution/i.test(
      doc
    )
  );
  ok(
    "doc no production onboarding",
    /Production Onboarding Completed\?\s*=\s*No/i.test(doc)
  );
}

// --- status fields ---
{
  ok(
    "doc thor manual pilot pre-exec approved is no",
    /Thor Auto Manual Pilot Pre-Execution Approved\?\s*=\s*No|Thor Auto Manual Pilot Pre-Execution Approved\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc manual pilot prep started is no",
    /Manual Pilot Preparation Started\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc revenue pilot approved is no",
    /Revenue Pilot Approved\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc runtime vehicle import performed is no",
    /Runtime Vehicle Import Performed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc firestore write performed is no",
    /Firestore Write Performed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc real listing published is no",
    /Real Listing Published\?\s*=\s*No/i.test(doc)
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
    "doc thor runtime onboarding performed is no",
    /Thor Auto Runtime Onboarding Performed\?\s*=\s*No/i.test(doc)
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
    "doc execution allowed from v66h is no",
    /Execution Allowed from v6\.6H\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc gemini real vehicle is no",
    /Gemini Invocation with Real Vehicle Data\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc adapter allow path added is no",
    /Adapter Allow Path Added\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc does not state pre-exec approved",
    /Does not state Thor Auto manual pilot pre-execution approved|does not state Thor Auto manual pilot pre-execution approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state manual pilot prep started",
    /Does not state manual pilot preparation started|does not state manual pilot preparation started/i.test(
      doc
    )
  );
  ok(
    "doc does not claim 3 real dealers from splits",
    /Does not claim 3 real dealer|NOT three real customers|NOT 1Thor/i.test(doc)
  );
}

// --- required sections ---
{
  ok("doc baseline", /## 1\. Baseline/i.test(doc));
  ok("doc purpose", /## 2\. Purpose/i.test(doc));
  ok("doc non-authorization clause", /Non-Authorization Clause/i.test(doc));
  ok("doc current state summary", /Current State Summary/i.test(doc));
  ok(
    "doc relationship to v66ag",
    /Relationship to v6\.6A–G|Relationship to v6\.6A-G/i.test(doc)
  );
  ok(
    "doc pre-execution decision summary",
    /Pre-Execution Decision Summary/i.test(doc)
  );
  ok(
    "doc allowed actions if future approval",
    /Allowed Actions If Future Approval Is Granted/i.test(doc)
  );
  ok("doc strict not allowed actions", /Strict Not Allowed Actions/i.test(doc));
  ok(
    "doc static data handling boundary",
    /Static Data Handling Boundary/i.test(doc)
  );
  ok(
    "doc manual draft output definition",
    /Manual Draft Output Definition/i.test(doc)
  );
  ok(
    "doc review gate before public use",
    /Review Gate Before Any Public Use/i.test(doc)
  );
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok(
    "doc exact future approval wording",
    /Exact Future Approval Wording/i.test(doc)
  );
  ok(
    "doc explicit non-execution confirmation",
    /Explicit Non-Execution Confirmation/i.test(doc)
  );
  ok(
    "doc explicit non-authorization confirmation",
    /Explicit Non-Authorization Confirmation/i.test(doc)
  );
  ok(
    "doc decision 5 to 10 manual static",
    /5–10 คัน.*manual.*static|manual\/static.*5–10/i.test(
      doc.replace(/\n/g, " ")
    )
  );
  ok(
    "doc not runtime import decision",
    /Runtime Vehicle Import Performed\?\s*=\s*No|ไม่ใช่ runtime import/i.test(
      doc
    )
  );
  ok(
    "doc not publish not paid not onboarding",
    /ไม่ใช่ publish จริง|ไม่ใช่ paid pilot|ไม่ใช่ production onboarding/i.test(
      doc
    )
  );
  ok(
    "doc v66f checklist reference",
    /v6\.6F readiness checklist/i.test(doc)
  );
  ok(
    "doc clean data listing caption",
    /clean data.*listing draft|listing draft.*social caption/i.test(
      doc.replace(/\n/g, " ")
    )
  );
  ok(
    "doc strict no runtime firestore deploy",
    /Runtime vehicle import|Firestore write|Deploy \/ production touch/i.test(
      doc
    )
  );
  ok(
    "doc strict no gemini real vehicle",
    /Gemini invocation กับข้อมูลรถจริง|Gemini with real vehicle/i.test(doc)
  );
  ok(
    "doc strict no payment paid pilot",
    /payment automation|Paid pilot start/i.test(doc)
  );
  ok(
    "doc static masked plate no pii",
    /Masked|masked/i.test(doc) && /PII|ลูกค้าปลายทาง/i.test(doc)
  );
  ok(
    "doc no commit detailed vehicle repo",
    /ห้าม commit ข้อมูลรถจริง|commit detailed.*real vehicle|detailed\/sensitive real vehicle/i.test(
      doc
    )
  );
  ok(
    "doc local private template",
    /local\/private|ไฟล์ local\/private/i.test(doc)
  );
  ok("doc clean data table output", /Clean data table|clean data table/i.test(doc));
  ok(
    "doc facebook line caption draft",
    /Facebook caption draft|LINE caption draft/i.test(doc)
  );
  ok(
    "doc admin review notes",
    /Admin review notes|admin review notes/i.test(doc)
  );
  ok(
    "doc publish readiness status",
    /Publish readiness status|ready.*needs cleanup.*blocked/i.test(doc)
  );
  ok(
    "doc lead hypothesis note",
    /Lead hypothesis note|lead hypothesis note/i.test(doc)
  );
  ok(
    "doc review gate brand price mileage",
    /ยี่ห้อ/i.test(doc) && /ราคา/i.test(doc) && /เลขไมล์/i.test(doc)
  );
  ok(
    "doc stop if uncertain",
    /ไม่ครบหรือไม่มั่นใจ|ไม่มั่นใจ.*stop/i.test(doc)
  );
  ok(
    "doc stop manual publish approval",
    /manual publish approval/i.test(doc)
  );
  ok(
    "doc stop payment pilot",
    /payment\/pilot approval|รับเงิน/i.test(doc)
  );
  ok(
    "doc future approval wording thai v66h",
    /อนุมัติให้เริ่ม Thor Auto manual pilot preparation ตาม v6\.6H/i.test(doc)
  );
  ok(
    "doc future wording no commit sensitive repo",
    /ห้าม commit ข้อมูลรถจริงละเอียด\/อ่อนไหวลง repo/i.test(doc)
  );
  ok("doc dealer counting rules", /Dealer Counting Rules/i.test(doc));
  ok(
    "doc one dealer group",
    /1 dealer group|dealer group จริง 1 ราย/i.test(doc)
  );
  ok("doc 1Thor split", /1Thor/i.test(doc));
  ok("doc 2Thor split", /2Thor/i.test(doc));
  ok("doc 3Thor split", /3Thor/i.test(doc));
}

// --- no bad approved claims ---
{
  for (const pat of BAD_PREEXEC_APPROVED_PATTERNS) {
    ok(
      `doc no bad preexec approved ${pat.source.slice(0, 22)}`,
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
    "package v66h script",
    pkg.includes("test:v66h-thor-auto-manual-pilot-pre-execution-approval")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v66h-thor-auto-manual-pilot-pre-execution-approval.mts"
    )
  );
}

console.log(
  "\nDone v6.6H Thor Auto Manual Pilot Preparation Pre-Execution Approval tests."
);
if (process.exitCode) process.exit(process.exitCode);
