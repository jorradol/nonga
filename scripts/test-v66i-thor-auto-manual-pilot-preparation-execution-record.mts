/**
 * v6.6I — Thor Auto Manual Pilot Preparation Execution Record (static validation only)
 * npm run test:v66i-thor-auto-manual-pilot-preparation-execution-record
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
  "docs/v6.6I-thor-auto-manual-pilot-preparation-execution-record.md";
const V66H_DOC =
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
  /\bMazda\s+(?:2|3|CX-)/i,
  /\bIsuzu\s+(?:D-Max|MU-X)\b/i,
];

const AUTO_EXEC_AUTH_PATTERNS = [
  /this\s+document\s+is\s+approval\s+to\s+deploy/i,
  /v6\.6I\s+captures\s+approval\s+for\s+Thor/i,
  /v6\.6I\s+authorizes\s+runtime\s+import/i,
  /v6\.6I\s+authorizes\s+paid\s+pilot/i,
  /v6\.6I\s+authorizes\s+dealer\s+onboarding/i,
  /v6\.6I\s+approves\s+payment/i,
  /v6\.6I\s+authorizes\s+publish/i,
  /v6\.6I\s+authorizes\s+manual\s+pilot\s+execution/i,
  /execution\s+approved\s+for\s+production/i,
  /Thor Auto Manual Pilot Preparation Execution is approved by v6\.6I alone/i,
  /v6\.6I\s+approved\b/i,
  /v6\.6I\s+starts\s+manual\s+prep/i,
];

const BAD_EXEC_APPROVED_PATTERNS = [
  /Manual Prep Execution Approved\?\s*=\s*Yes/i,
  /Manual Prep Started\?\s*=\s*Yes/i,
  /Real Vehicle Data Committed\?\s*=\s*Yes/i,
  /Runtime Import Performed\?\s*=\s*Yes/i,
  /Firestore Write Performed\?\s*=\s*Yes/i,
  /Gemini Real Data Invocation\?\s*=\s*Yes/i,
  /Publish Performed\?\s*=\s*Yes/i,
  /Paid Pilot Started\?\s*=\s*Yes/i,
  /Revenue Pilot Started\?\s*=\s*Yes/i,
  /Thor Auto Runtime Onboarding Performed\?\s*=\s*Yes/i,
  /Production Onboarding Completed\?\s*=\s*Yes/i,
  /Dealer Onboarded\?\s*=\s*Yes/i,
  /Payment\/Billing Enabled\?\s*=\s*Yes/i,
  /Execution Allowed from v6\.6I\?\s*=\s*Yes/i,
  /Adapter Allow Path Added\?\s*=\s*Yes/i,
  /Deploy Performed\?\s*=\s*Yes/i,
  /Production Touched\?\s*=\s*Yes/i,
  /User-Visible AI Enabled\?\s*=\s*Yes/i,
  /Real Listing Published\?\s*=\s*Yes/i,
  /Auto-Publish Enabled\?\s*=\s*Yes/i,
  /paid pilot has been started/i,
  /runtime import has been performed/i,
  /real listing has been published/i,
  /manual prep has been started/i,
  /execution approval has been captured/i,
  /manual prep execution has been approved/i,
  /real vehicle data has been committed/i,
  /execution authorized by v6\.6I/i,
];

const HEAD_SHA = "f747b0d20199fe87d078d43c1f85dd69b2182ac4";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.6I Thor Auto Manual Pilot Preparation Execution Record ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const v66hDoc = readFileSync(V66H_DOC, "utf8");
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
  "scripts/test-v66i-thor-auto-manual-pilot-preparation-execution-record.mts",
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
  ok("v6.6I doc exists", doc.length > 6000);
  ok("doc v6.6I label", doc.includes("v6.6I"));
  ok("v6.6H doc exists", existsSync(V66H_DOC) && v66hDoc.includes("v6.6H"));
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
  ok("doc HEAD f747b0d", doc.includes(HEAD_SHA) || doc.includes("f747b0d"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok(
    "doc no runtime import in v6.6I",
    /does not import vehicle data|Runtime Import Performed\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no firestore write in v6.6I",
    /Firestore Write Performed\?\s*=\s*No|does not write Firestore/i.test(doc)
  );
  ok(
    "doc no paid pilot start in v6.6I",
    /Paid Pilot Started\?\s*=\s*No|does not start paid pilot/i.test(doc)
  );
  ok(
    "doc no gemini real data in v6.6I",
    /Gemini Real Data Invocation\?\s*=\s*No/i.test(doc)
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
    "doc no manual prep start in v6.6I",
    /does not start manual pilot|Manual Prep Started\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc no execution approval capture",
    /does not capture execution approval|does not capture.*approval|not captured execution approval/i.test(
      doc
    )
  );
  ok(
    "doc no real vehicle data committed",
    /Real Vehicle Data Committed\?\s*=\s*No|does not commit detailed real vehicle/i.test(
      doc
    )
  );
  ok(
    "doc no publish performed",
    /Publish Performed\?\s*=\s*No|does not publish real listings/i.test(doc)
  );
  ok(
    "doc manual static offline only",
    /manual\/static\/offline|manual \/ static \/ offline/i.test(doc)
  );
}

// --- status fields ---
{
  ok(
    "doc manual prep execution approved is no",
    /Manual Prep Execution Approved\?\s*=\s*No|Manual Prep Execution Approved\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc manual prep started is no",
    /Manual Prep Started\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc real vehicle data committed is no",
    /Real Vehicle Data Committed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc runtime import performed is no",
    /Runtime Import Performed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc firestore write performed is no",
    /Firestore Write Performed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc gemini real data invocation is no",
    /Gemini Real Data Invocation\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc publish performed is no",
    /Publish Performed\?\s*=\s*No/i.test(doc)
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
    "doc execution allowed from v66i is no",
    /Execution Allowed from v6\.6I\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc adapter allow path added is no",
    /Adapter Allow Path Added\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc does not state execution approved",
    /Does not state manual prep execution approved|does not state manual prep execution approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state manual prep started",
    /Does not state manual prep started|does not state manual prep started/i.test(
      doc
    )
  );
  ok(
    "doc does not state real vehicle data committed",
    /Does not state real vehicle data committed|does not state real vehicle data committed/i.test(
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
  ok(
    "doc execution approval basis",
    /Execution Approval Basis/i.test(doc)
  );
  ok(
    "doc manual preparation work items",
    /Manual Preparation Work Items/i.test(doc)
  );
  ok(
    "doc private data handling rules",
    /Private Data Handling Rules/i.test(doc)
  );
  ok(
    "doc static template definition",
    /Static Template Definition/i.test(doc)
  );
  ok("doc draft output checklist", /Draft Output Checklist/i.test(doc));
  ok(
    "doc review publish boundary",
    /Review \/ Publish Boundary/i.test(doc)
  );
  ok(
    "doc execution status fields",
    /Execution Status Fields/i.test(doc)
  );
  ok(
    "doc future approval wording",
    /Future Approval Wording/i.test(doc)
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
    "doc v66h reference",
    /v6\.6H/i.test(doc) && /pre-execution approval/i.test(doc)
  );
  ok(
    "doc owner approval separate from commit push",
    /separate from commit\/push approval|Owner approval for execution must be separate/i.test(
      doc
    )
  );
  ok(
    "doc not runtime not production",
    /Not runtime|not production|ไม่ใช่ runtime/i.test(doc)
  );
  ok(
    "doc work items 5 to 10 manual private",
    /5–10 คัน.*manual.*private|manual\/private.*5–10/i.test(
      doc.replace(/\n/g, " ")
    )
  );
  ok(
    "doc v66f checklist reference",
    /v6\.6F readiness checklist|v6\.6F checklist/i.test(doc)
  );
  ok(
    "doc clean data listing caption",
    /clean data.*listing draft|listing draft.*social caption/i.test(
      doc.replace(/\n/g, " ")
    )
  );
  ok(
    "doc admin review notes",
    /admin review notes|Admin review notes/i.test(doc)
  );
  ok(
    "doc strict no runtime firestore deploy",
    /Runtime import|Firestore write|Deploy \/ production/i.test(doc)
  );
  ok(
    "doc strict no gemini real vehicle",
    /Gemini invocation กับข้อมูลรถจริง|Gemini with real vehicle|Gemini Real Data/i.test(
      doc
    )
  );
  ok(
    "doc strict no payment paid pilot",
    /payment\/billing|Paid pilot start/i.test(doc)
  );
  ok(
    "doc private local file only",
    /local\/private|Local\/private file/i.test(doc)
  );
  ok(
    "doc no commit detailed vehicle repo",
    /ห้าม commit ข้อมูลรถจริง|commit detailed.*real vehicle|detailed\/sensitive real vehicle/i.test(
      doc
    )
  );
  ok(
    "doc masked plate no pii",
    /Masked|masked/i.test(doc) && /PII|ลูกค้าปลายทาง/i.test(doc)
  );
  ok(
    "doc field template brand model year",
    /`brand`|`model`|`year`/i.test(doc)
  );
  ok(
    "doc field template transmission engine mileage price",
    /`transmission`|`engine`|`mileage`|`price`/i.test(doc)
  );
  ok(
    "doc field template selling points defects finance promo",
    /`sellingPoints`|defects|finance|promotion/i.test(doc)
  );
  ok(
    "doc field template photo video review publish readiness",
    /photoStatus|videoSocialLinkStatus|reviewStatus|publishReadiness/i.test(doc)
  );
  ok(
    "doc required optional sensitive blocked fields",
    /Required|Optional|Sensitive|Blocked/i.test(doc)
  );
  ok(
    "doc fake sample placeholder rows",
    /FAKE DATA ONLY|SampleBrand|FakeMake|DemoBrand|PlaceholderCo/i.test(doc)
  );
  ok(
    "doc draft checklist clean data complete",
    /Clean data complete\?/i.test(doc)
  );
  ok(
    "doc draft checklist listing draft complete",
    /Listing draft complete\?/i.test(doc)
  );
  ok(
    "doc draft checklist social caption draft complete",
    /Social caption draft complete\?/i.test(doc)
  );
  ok(
    "doc draft checklist admin review complete",
    /Admin review complete\?/i.test(doc)
  );
  ok(
    "doc draft checklist publish approved",
    /Publish approved\?/i.test(doc)
  );
  ok(
    "doc draft checklist lead hypothesis noted",
    /Lead hypothesis noted\?/i.test(doc)
  );
  ok(
    "doc draft checklist blocked reason",
    /Blocked reason\?/i.test(doc)
  );
  ok(
    "doc review admin before publish",
    /admin ต้อง review ก่อนเผยแพร่|review ก่อนเผยแพร่ทุกครั้ง/i.test(doc)
  );
  ok(
    "doc v66i no real publish",
    /v6\.6I ไม่อนุญาต publish จริง|does not publish real listings/i.test(doc)
  );
  ok(
    "doc separate publish approval",
    /Manual publish approval แยก|publish approval แยก/i.test(doc)
  );
  ok(
    "doc separate gemini approval",
    /Gemini.*approval แยก|Gemini real-data approval/i.test(doc)
  );
  ok(
    "doc separate runtime import approval",
    /Runtime import approval แยก|runtime import approval/i.test(doc)
  );
  ok(
    "doc future approval wording thai v66i",
    /อนุมัติให้เริ่ม Thor Auto manual pilot preparation execution ตาม v6\.6I/i.test(
      doc
    )
  );
  ok(
    "doc future wording no commit sensitive repo",
    /ห้าม commit ข้อมูลรถจริงละเอียด\/อ่อนไหวหรือ PII ลง repo/i.test(doc)
  );
  ok(
    "doc future wording manual private offline",
    /manual\/private\/offline/i.test(doc)
  );
  ok("doc dealer counting rules", /Dealer Counting Rules/i.test(doc));
  ok(
    "doc one dealer group",
    /1 dealer group|dealer group จริง 1 ราย/i.test(doc)
  );
  ok("doc 1Thor split", /1Thor/i.test(doc));
  ok("doc 2Thor split", /2Thor/i.test(doc));
  ok("doc 3Thor split", /3Thor/i.test(doc));
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
}

// --- no bad approved claims ---
{
  for (const pat of BAD_EXEC_APPROVED_PATTERNS) {
    ok(
      `doc no bad exec approved ${pat.source.slice(0, 22)}`,
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
    "package v66i script",
    pkg.includes(
      "test:v66i-thor-auto-manual-pilot-preparation-execution-record"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v66i-thor-auto-manual-pilot-preparation-execution-record.mts"
    )
  );
}

console.log(
  "\nDone v6.6I Thor Auto Manual Pilot Preparation Execution Record tests."
);
if (process.exitCode) process.exit(process.exitCode);
