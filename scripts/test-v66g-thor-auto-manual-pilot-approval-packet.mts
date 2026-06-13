/**
 * v6.6G — Thor Auto Manual Pilot Approval Packet (static validation only)
 * npm run test:v66g-thor-auto-manual-pilot-approval-packet
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

const DOC_PATH = "docs/v6.6G-thor-auto-manual-pilot-approval-packet.md";
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
  /v6\.6G\s+captures\s+approval\s+for\s+Thor/i,
  /v6\.6G\s+authorizes\s+runtime\s+import/i,
  /v6\.6G\s+authorizes\s+paid\s+pilot/i,
  /v6\.6G\s+authorizes\s+dealer\s+onboarding/i,
  /v6\.6G\s+approves\s+payment/i,
  /v6\.6G\s+authorizes\s+publish/i,
  /v6\.6G\s+authorizes\s+manual\s+pilot\s+execution/i,
  /execution\s+approved\s+for\s+production/i,
  /Thor Auto Manual Pilot Preparation is approved by v6\.6G alone/i,
  /v6\.6G\s+approved\b/i,
];

const BAD_PILOT_APPROVED_PATTERNS = [
  /Thor Auto Manual Pilot Preparation Approved\?\s*=\s*Yes/i,
  /Manual Pilot Preparation Started\?\s*=\s*Yes/i,
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
  /Execution Allowed from v6\.6G\?\s*=\s*Yes/i,
  /Gemini Invocation with Real Vehicle Data\?\s*=\s*Yes/i,
  /Adapter Allow Path Added\?\s*=\s*Yes/i,
  /Deploy Performed\?\s*=\s*Yes/i,
  /Production Touched\?\s*=\s*Yes/i,
  /User-Visible AI Enabled\?\s*=\s*Yes/i,
  /paid pilot has been started/i,
  /runtime import has been performed/i,
  /real listing has been published/i,
  /manual pilot preparation has been started/i,
  /Thor Auto manual pilot preparation has been approved/i,
  /execution authorized by v6\.6G/i,
];

const HEAD_SHA = "9698e3d5f871949409405db9151bd5794a1ee6b2";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.6G Thor Auto Manual Pilot Approval Packet ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
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
  "scripts/test-v66g-thor-auto-manual-pilot-approval-packet.mts",
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
  ok("v6.6G doc exists", doc.length > 6000);
  ok("doc v6.6G label", doc.includes("v6.6G"));
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
  ok("doc HEAD 9698e3d", doc.includes(HEAD_SHA) || doc.includes("9698e3d"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok(
    "doc no runtime import in v6.6G",
    /does not import vehicle data|Runtime Vehicle Import Performed\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no firestore write in v6.6G",
    /Firestore Write Performed\?\s*=\s*No|does not write Firestore/i.test(doc)
  );
  ok(
    "doc no paid pilot start in v6.6G",
    /Paid Pilot Started\?\s*=\s*No|does not start paid pilot/i.test(doc)
  );
  ok(
    "doc no gemini real vehicle in v6.6G",
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
    "doc no manual pilot execution in v6.6G",
    /does not execute manual pilot|Manual Pilot Preparation Started\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no Firestore write phrase",
    /No Firestore write|no Firestore write|does not write Firestore/i.test(doc)
  );
}

// --- status fields ---
{
  ok(
    "doc thor manual pilot prep approved is no",
    /Thor Auto Manual Pilot Preparation Approved\?\s*=\s*No|Thor Auto Manual Pilot Preparation Approved\?\s*\|\s*\*\*No\*\*/i.test(
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
    "doc execution allowed from v66g is no",
    /Execution Allowed from v6\.6G\?\s*=\s*No/i.test(doc)
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
    "doc does not state manual pilot prep approved",
    /Does not state Thor Auto manual pilot preparation approved|does not state Thor Auto manual pilot preparation approved/i.test(
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
    "doc does not state revenue pilot started",
    /Does not state revenue pilot started|does not state revenue pilot started/i.test(
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
    "doc relationship to v66af",
    /Relationship to v6\.6A–F|Relationship to v6\.6A-F/i.test(doc)
  );
  ok(
    "doc manual pilot preparation scope",
    /Manual Pilot Preparation Scope/i.test(doc)
  );
  ok(
    "doc allowed actions after future approval",
    /Allowed Actions After Future Approval/i.test(doc)
  );
  ok("doc not allowed actions", /Not Allowed Actions/i.test(doc));
  ok(
    "doc manual listing draft review gate",
    /Manual Listing Draft Review Gate/i.test(doc)
  );
  ok(
    "doc lead revenue hypothesis",
    /Lead \/ Revenue Hypothesis/i.test(doc)
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
    "doc scope 5 to 10 vehicles",
    /5–10 คัน|5-10/i.test(doc)
  );
  ok(
    "doc offline static real vehicle after approval",
    /offline.*static|offline \/ static/i.test(doc)
  );
  ok(
    "doc v66f checklist reference",
    /v6\.6F readiness checklist/i.test(doc)
  );
  ok(
    "doc allowed manual collection",
    /รวบรวมข้อมูลรถ Thor Auto แบบ.*manual|manual collection/i.test(doc)
  );
  ok(
    "doc allowed listing caption draft",
    /listing copy draft|social caption draft/i.test(doc)
  );
  ok(
    "doc not allowed runtime import",
    /Runtime vehicle import|runtime import/i.test(doc)
  );
  ok(
    "doc not allowed payment",
    /payment link|billing automation/i.test(doc)
  );
  ok(
    "doc review gate brand model year price",
    /ยี่ห้อ|brand/i.test(doc) &&
      /รุ่น|model/i.test(doc) &&
      /ราคา|price/i.test(doc)
  );
  ok(
    "doc review gate finance promo",
    /ไฟแนนซ์|finance/i.test(doc) && /โปรโมชั่น|promotion/i.test(doc)
  );
  ok(
    "doc stop if uncertain no publish",
    /ไม่ครบหรือไม่มั่นใจ|ไม่มั่นใจ.*ไม่ publish/i.test(doc)
  );
  ok(
    "doc lead hypothesis manual listing",
    /listing ที่ดีพอสำหรับโพสต์ manual|manual.*listing/i.test(doc)
  );
  ok(
    "doc not revenue pilot start",
    /ยังไม่ถือ.*revenue pilot|Revenue Pilot Started\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc not paid customer until payment",
    /ยังไม่ถือ.*paid customer|manual invoice/i.test(doc)
  );
  ok("doc 1Thor split", /1Thor/i.test(doc));
  ok("doc 2Thor split", /2Thor/i.test(doc));
  ok("doc 3Thor split", /3Thor/i.test(doc));
  ok(
    "doc not three real customers",
    /NOT three real customers|ไม่ใช่ลูกค้า 3 ราย|NOT paid dealer 3/i.test(doc)
  );
  ok(
    "doc stop runtime import",
    /import.*runtime|นำข้อมูลเข้าระบบ runtime/i.test(doc)
  );
  ok(
    "doc stop gemini real vehicle",
    /Gemini.*ข้อมูลรถจริง|Gemini with real vehicle/i.test(doc)
  );
  ok(
    "doc stop manual publish approval",
    /manual publish approval/i.test(doc)
  );
  ok(
    "doc stop paid pilot payment",
    /paid pilot.*รับเงิน|approval payment\/pilot/i.test(doc)
  );
  ok(
    "doc future approval wording thai exact",
    /อนุมัติให้เริ่ม Thor Auto manual pilot preparation ตาม v6\.6G/i.test(doc)
  );
  ok(
    "doc future wording 5 10 cars",
    /ไม่เกิน 5–10 คัน|5–10 คัน/i.test(doc)
  );
  ok("doc dealer counting rules", /Dealer Counting Rules/i.test(doc));
  ok(
    "doc one dealer group",
    /1 dealer group|dealer group จริง 1 ราย/i.test(doc)
  );
  ok(
    "doc real revenue path thor",
    /รายได้จริง|รายได้จริงรายแรก/i.test(doc)
  );
}

// --- no bad approved claims ---
{
  for (const pat of BAD_PILOT_APPROVED_PATTERNS) {
    ok(
      `doc no bad pilot approved ${pat.source.slice(0, 22)}`,
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
    "package v66g script",
    pkg.includes("test:v66g-thor-auto-manual-pilot-approval-packet")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v66g-thor-auto-manual-pilot-approval-packet.mts"
    )
  );
}

console.log("\nDone v6.6G Thor Auto Manual Pilot Approval Packet tests.");
if (process.exitCode) process.exit(process.exitCode);
