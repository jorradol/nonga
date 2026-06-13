/**
 * v6.6F — Thor Auto Static Data Readiness & Listing Workflow Prep (static validation only)
 * npm run test:v66f-thor-auto-static-data-readiness-listing-workflow-prep
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
  /v6\.6F\s+captures\s+approval\s+for\s+Thor/i,
  /v6\.6F\s+authorizes\s+runtime\s+import/i,
  /v6\.6F\s+authorizes\s+paid\s+pilot/i,
  /v6\.6F\s+authorizes\s+dealer\s+onboarding/i,
  /v6\.6F\s+approves\s+payment/i,
  /v6\.6F\s+authorizes\s+publish/i,
  /execution\s+approved\s+for\s+production/i,
  /Thor Auto Static Data Readiness is approved by v6\.6F alone/i,
  /v6\.6F\s+approved\b/i,
];

const BAD_READINESS_APPROVED_PATTERNS = [
  /Thor Auto Static Data Readiness Approved\?\s*=\s*Yes/i,
  /Runtime Vehicle Import Performed\?\s*=\s*Yes/i,
  /Firestore Write Performed\?\s*=\s*Yes/i,
  /Real Listing Published\?\s*=\s*Yes/i,
  /Auto-Publish Enabled\?\s*=\s*Yes/i,
  /Paid Pilot Started\?\s*=\s*Yes/i,
  /Revenue Pilot Approved\?\s*=\s*Yes/i,
  /Revenue Pilot Started\?\s*=\s*Yes/i,
  /Thor Auto Runtime Onboarding Performed\?\s*=\s*Yes/i,
  /Dealer Onboarded\?\s*=\s*Yes/i,
  /Payment\/Billing Enabled\?\s*=\s*Yes/i,
  /Execution Allowed from v6\.6F\?\s*=\s*Yes/i,
  /Gemini Invocation in v6\.6F\?\s*=\s*Yes/i,
  /Adapter Allow Path Added\?\s*=\s*Yes/i,
  /Deploy Performed\?\s*=\s*Yes/i,
  /Production Touched\?\s*=\s*Yes/i,
  /User-Visible AI Enabled\?\s*=\s*Yes/i,
  /paid pilot has been started/i,
  /runtime import has been performed/i,
  /real listing has been published/i,
  /Thor Auto static data readiness has been approved/i,
  /execution authorized by v6\.6F/i,
];

const HEAD_SHA = "6ab8dae902ba3876c9400bc450696182e8561ba4";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.6F Thor Auto Static Data Readiness & Listing Workflow Prep ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
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
  "scripts/test-v66f-thor-auto-static-data-readiness-listing-workflow-prep.mts",
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
  ok("v6.6F doc exists", doc.length > 6000);
  ok("doc v6.6F label", doc.includes("v6.6F"));
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
  ok("doc HEAD 6ab8dae", doc.includes(HEAD_SHA) || doc.includes("6ab8dae"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok(
    "doc no runtime import in v6.6F",
    /does not import vehicle data|Runtime Vehicle Import Performed\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no firestore write in v6.6F",
    /Firestore Write Performed\?\s*=\s*No|does not write Firestore/i.test(doc)
  );
  ok(
    "doc no paid pilot start in v6.6F",
    /Paid Pilot Started\?\s*=\s*No|does not start paid pilot/i.test(doc)
  );
  ok(
    "doc no gemini invocation in v6.6F",
    /Gemini Invocation in v6\.6F\?\s*=\s*No/i.test(doc)
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
    "doc no Firestore write phrase",
    /No Firestore write|no Firestore write|does not write Firestore/i.test(doc)
  );
}

// --- status fields ---
{
  ok(
    "doc thor auto static readiness approved is no",
    /Thor Auto Static Data Readiness Approved\?\s*=\s*No|Thor Auto Static Data Readiness Approved\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
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
    "doc execution allowed from v66f is no",
    /Execution Allowed from v6\.6F\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc gemini invocation in v66f is no",
    /Gemini Invocation in v6\.6F\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc adapter allow path added is no",
    /Adapter Allow Path Added\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc does not state static readiness approved",
    /Does not state Thor Auto static data readiness approved|does not state Thor Auto static data readiness approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state paid pilot started",
    /Does not state paid pilot started|does not state paid pilot started/i.test(
      doc
    )
  );
  ok(
    "doc does not state real listing published",
    /Does not state real listing published|does not state real listing published/i.test(
      doc
    )
  );
  ok(
    "doc does not claim 3 real dealers from splits",
    /Does not claim 3 real dealer|does not claim 3 real dealer|NOT 1Thor/i.test(
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
    "doc relationship to v66ae",
    /Relationship to v6\.6A–E|Relationship to v6\.6A-E/i.test(doc)
  );
  ok(
    "doc vehicle data readiness checklist",
    /Thor Auto Vehicle Data Readiness Checklist/i.test(doc)
  );
  ok("doc listing draft workflow", /Listing Draft Workflow/i.test(doc));
  ok("doc admin review boundary", /Admin Review Boundary/i.test(doc));
  ok("doc internal split usage", /Internal Split Usage/i.test(doc));
  ok("doc lead path preparation", /Lead Path Preparation/i.test(doc));
  ok("doc stop conditions", /Stop Conditions/i.test(doc));
  ok("doc path to real revenue", /Path to Real Revenue/i.test(doc));
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
    "doc required optional sensitive fields",
    /Required fields|Optional fields|Sensitive fields/i.test(doc)
  );
  ok("doc brand model year fields", /ยี่ห้อ|brand/i.test(doc) && /รุ่น|model/i.test(doc));
  ok("doc mileage price fields", /เลขไมล์|mileage/i.test(doc) && /ราคา|price/i.test(doc));
  ok("doc end customer PII forbidden", /ลูกค้าปลายทาง|end-customer PII/i.test(doc));
  ok(
    "doc raw to manual publish workflow",
    /raw vehicle data.*clean data.*listing copy draft|Raw vehicle data.*Clean data/i.test(
      doc.replace(/\n/g, " ")
    )
  );
  ok(
    "doc ai back office draft future only",
    /หลังบ้าน|back-office AI draft|back-office AI/i.test(doc)
  );
  ok(
    "doc no auto publish",
    /ยังไม่ auto-publish|does not enable auto-publish|Auto-Publish Enabled/i.test(doc)
  );
  ok(
    "doc no ai reply customer",
    /ห้าม.*ตอบลูกค้า|AI ตอบลูกค้า/i.test(doc)
  );
  ok(
    "doc admin uncle review",
    /ลุงเด่น|admin review/i.test(doc)
  );
  ok("doc 1Thor listing complete", /1Thor.*listing complete|listing complete/i.test(doc));
  ok("doc 2Thor needs cleanup", /2Thor.*needs cleanup|needs cleanup/i.test(doc));
  ok(
    "doc 3Thor caption lead",
    /3Thor.*caption|caption.*lead workflow/i.test(doc)
  );
  ok(
    "doc not three real customers",
    /NOT three real customers|ไม่ใช่ลูกค้า 3 ราย|NOT paid dealer 3/i.test(doc)
  );
  ok(
    "doc facebook line lead path",
    /Facebook.*manual|LINE manual/i.test(doc)
  );
  ok(
    "doc no automated lead capture production",
    /Automated lead capture in production|automated lead capture in production/i.test(
      doc
    )
  );
  ok(
    "doc stop runtime import approval",
    /import.*runtime.*approval|นำข้อมูลรถจริงเข้า runtime/i.test(doc)
  );
  ok(
    "doc stop gemini real vehicle",
    /Gemini.*ข้อมูลรถจริง|Gemini with real vehicle data/i.test(doc)
  );
  ok(
    "doc path thor manual pilot",
    /Thor Auto manual pilot/i.test(doc)
  );
  ok(
    "doc path external 2 dealers",
    /2 ราย|2 additional|external dealer/i.test(doc)
  );
  ok(
    "doc future approval wording thai",
    /อนุมัติให้เตรียม Thor Auto static vehicle data และ listing workflow ตาม v6\.6F/i.test(
      doc
    )
  );
  ok("doc dealer counting rules", /Dealer Counting Rules/i.test(doc));
  ok(
    "doc one dealer group",
    /1 dealer group|dealer group จริง 1 ราย/i.test(doc)
  );
}

// --- no bad approved claims ---
{
  for (const pat of BAD_READINESS_APPROVED_PATTERNS) {
    ok(
      `doc no bad readiness approved ${pat.source.slice(0, 22)}`,
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
    "package v66f script",
    pkg.includes(
      "test:v66f-thor-auto-static-data-readiness-listing-workflow-prep"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v66f-thor-auto-static-data-readiness-listing-workflow-prep.mts"
    )
  );
}

console.log(
  "\nDone v6.6F Thor Auto Static Data Readiness & Listing Workflow Prep tests."
);
if (process.exitCode) process.exit(process.exitCode);
