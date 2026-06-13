/**
 * v6.6C — Dealer Outreach Approval & First Prospect Checklist (static validation only)
 * npm run test:v66c-dealer-outreach-approval-first-prospect-checklist
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
  "docs/v6.6C-dealer-outreach-approval-first-prospect-checklist.md";
const V66B_DOC = "docs/v6.6B-dealer-starter-pilot-offer-outreach-packet.md";
const V66A_DOC = "docs/v6.6A-controlled-revenue-pilot-scope-packet.md";
const ADAPTER_PATH = "src/services/ai/realProviderAdapter.ts";
const GUARD_PATH = "src/services/ai/realProviderRedactionGuard.ts";
const APP_PATH = "src/App.tsx";
const USE_CHAT_PATH = "src/hooks/chat/useChat.ts";
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
  /v6\.6C\s+captures\s+approval\s+for\s+dealer\s+outreach/i,
  /v6\.6C\s+authorizes\s+dealer\s+outreach\s+start/i,
  /v6\.6C\s+authorizes\s+revenue\s+pilot\s+start/i,
  /v6\.6C\s+authorizes\s+dealer\s+onboarding/i,
  /v6\.6C\s+approves\s+payment\s+automation/i,
  /execution\s+approved\s+for\s+production/i,
  /deploy\s+approved\s+for\s+production/i,
  /Dealer Outreach is approved by v6\.6C alone/i,
  /v6\.6C\s+approved\b/i,
];

const BAD_OUTREACH_APPROVED_PATTERNS = [
  /Dealer Outreach Approved\?\s*=\s*Yes/i,
  /Dealer Outreach Started\?\s*=\s*Yes/i,
  /Revenue Pilot Approved\?\s*=\s*Yes/i,
  /Revenue Pilot Started\?\s*=\s*Yes/i,
  /Dealer Onboarded\?\s*=\s*Yes/i,
  /Payment\/Billing Enabled\?\s*=\s*Yes/i,
  /Execution Allowed from v6\.6C\?\s*=\s*Yes/i,
  /Gemini Invocation in v6\.6C\?\s*=\s*Yes/i,
  /Adapter Allow Path Added\?\s*=\s*Yes/i,
  /Deploy Performed\?\s*=\s*Yes/i,
  /Production Touched\?\s*=\s*Yes/i,
  /User-Visible AI Enabled\?\s*=\s*Yes/i,
  /dealer outreach has been started/i,
  /dealer has been onboarded/i,
  /payment has been enabled/i,
  /pilot has been started/i,
  /execution authorized by v6\.6C/i,
];

const HEAD_SHA = "9ffebe9bddf533bf16ed4dc1a7df5ff7c9a97962";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.6C Dealer Outreach Approval & First Prospect Checklist ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const v66bDoc = readFileSync(V66B_DOC, "utf8");
const v66aDoc = readFileSync(V66A_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const guardSrc = readFileSync(GUARD_PATH, "utf8");
const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const runtimeFlagsSrc = readFileSync(RUNTIME_FLAGS_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const useChatSrc = readFileSync(USE_CHAT_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v66c-dealer-outreach-approval-first-prospect-checklist.mts",
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

// --- docs and modules exist ---
{
  ok("v6.6C doc exists", doc.length > 6000);
  ok("doc v6.6C label", doc.includes("v6.6C"));
  ok("v6.6B doc exists", existsSync(V66B_DOC) && v66bDoc.includes("v6.6B"));
  ok("v6.6A doc exists", existsSync(V66A_DOC) && v66aDoc.includes("v6.6A"));
  ok("v6.4F adapter exists", existsSync(ADAPTER_PATH));
  ok("Gate C guard exists", existsSync(GUARD_PATH));
  ok("Gate B harness exists", existsSync(HARNESS_PATH));
  ok("runtime flags module exists", existsSync(RUNTIME_FLAGS_PATH));
}

// --- safety positioning ---
{
  ok("doc HEAD 9ffebe9", doc.includes(HEAD_SHA) || doc.includes("9ffebe9"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok(
    "doc no dealer outreach start in v6.6C",
    /no dealer outreach start|Dealer Outreach Started\?\s*=\s*No|does not start dealer outreach/i.test(
      doc
    )
  );
  ok(
    "doc no actual dealer contact from v6.6C",
    /No actual dealer contact from v6\.6C|does not send messages to dealers|ไม่ส่งข้อความหาเต็นท์/i.test(
      doc
    )
  );
  ok(
    "doc no revenue pilot start in v6.6C",
    /Revenue Pilot Started\?\s*=\s*No|does not start revenue pilot/i.test(doc)
  );
  ok(
    "doc no Gemini invocation in v6.6C",
    /Gemini Invocation in v6\.6C\?\s*=\s*No|does not invoke Gemini/i.test(doc)
  );
  ok(
    "doc no deploy",
    /does not deploy|Deploy Performed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc no production touch",
    /Production Touched\?\s*=\s*No|does not touch production/i.test(doc)
  );
  ok(
    "doc no user-visible AI",
    /User-Visible AI Enabled\?\s*=\s*No|User-Visible AI Exclusion/i.test(doc)
  );
  ok(
    "doc no Firestore write",
    /No Firestore write|no Firestore write/i.test(doc)
  );
}

// --- status fields ---
{
  ok(
    "doc dealer outreach approved is no",
    /Dealer Outreach Approved\?\s*=\s*No|Dealer Outreach Approved\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc dealer outreach started is no",
    /Dealer Outreach Started\?\s*=\s*No|Dealer Outreach Started\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc revenue pilot approved is no",
    /Revenue Pilot Approved\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc revenue pilot started is no",
    /Revenue Pilot Started\?\s*=\s*No/i.test(doc)
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
    "doc deploy performed is no",
    /Deploy Performed\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc production touched is no",
    /Production Touched\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc user visible ai enabled is no",
    /User-Visible AI Enabled\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc gemini invocation in v66c is no",
    /Gemini Invocation in v6\.6C\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc adapter allow path added is no",
    /Adapter Allow Path Added\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc execution allowed from v66c is no",
    /Execution Allowed from v6\.6C\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc does not state outreach approved",
    /Does not state outreach approved|does not state outreach approved/i.test(doc)
  );
  ok(
    "doc does not state dealer onboarded",
    /Does not state dealer onboarded|does not state dealer onboarded/i.test(doc)
  );
  ok(
    "doc does not state payment enabled",
    /Does not state payment enabled|does not state payment enabled/i.test(doc)
  );
  ok(
    "doc does not state pilot started",
    /Does not state pilot started|does not state pilot started/i.test(doc)
  );
}

// --- required sections ---
{
  ok("doc baseline", /## 1\. Baseline/i.test(doc));
  ok("doc purpose", /## 2\. Purpose/i.test(doc));
  ok("doc non-authorization clause", /Non-Authorization Clause/i.test(doc));
  ok("doc current state summary", /Current State Summary/i.test(doc));
  ok(
    "doc relationship to v66a v66b",
    /Relationship to v6\.6A \/ v6\.6B/i.test(doc)
  );
  ok("doc first prospect checklist", /First Prospect Checklist/i.test(doc));
  ok(
    "doc dealer qualification questions",
    /Dealer Qualification Questions/i.test(doc)
  );
  ok(
    "doc outreach approval boundary",
    /Outreach Approval Boundary/i.test(doc)
  );
  ok(
    "doc first outreach tracking table",
    /First Outreach Tracking Table/i.test(doc)
  );
  ok("doc risk stop conditions", /Risk \/ Stop Conditions/i.test(doc));
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
  ok("doc owner decision checklist", /Owner Decision Checklist/i.test(doc));
  ok("doc safety checklist", /Safety Checklist/i.test(doc));
  ok("doc privacy checklist", /Privacy Checklist/i.test(doc));
  ok("doc cost checklist", /Cost Checklist/i.test(doc));
  ok("doc no-go conditions", /No-Go Conditions/i.test(doc));
  ok("doc recommended next step", /Recommended Next Step/i.test(doc));
  ok(
    "doc prospect limit 1-3",
    /1–3|1-3/.test(doc) && /เต็นท์/.test(doc)
  );
  ok("doc vehicle limit 20", /20 คัน|≤20/.test(doc));
  ok(
    "doc qualification has vehicle count question",
    /มีรถ.*กี่คัน|รถในสต็อกกี่คัน/i.test(doc)
  );
  ok(
    "doc qualification has photo data question",
    /รูป.*ข้อมูล|ข้อมูลรถพร้อม/i.test(doc)
  );
  ok(
    "doc qualification has social channel question",
    /Facebook.*LINE|TikTok/i.test(doc)
  );
  ok(
    "doc qualification has listing pain question",
    /ปัญห.*ลงประกาศ|ลงประกาศ/i.test(doc)
  );
  ok(
    "doc qualification has admin review question",
    /review.*ก่อน|แอดมิน.*review/i.test(doc)
  );
  ok(
    "doc qualification has 30 day pilot question",
    /30 วัน/i.test(doc)
  );
  ok(
    "doc tracking table columns",
    /ชื่อเต็นท์|ช่องทางติดต่อ|ความสัมพันธ์|จำนวนรถ|pain point|สถานะความสนใจ|next action|stop condition/i.test(
      doc
    )
  );
  ok(
    "doc stop ai replies to customers",
    /AI ตอบลูกค้า|ตอบลูกค้าเอง/i.test(doc)
  );
  ok(
    "doc stop production payment automation",
    /production.*payment|payment.*automation/i.test(doc)
  );
  ok(
    "doc stop sensitive data",
    /PII|ข้อมูลอ่อนไหว|ข้อมูลลูกค้าจริง/i.test(doc)
  );
  ok(
    "doc stop cloud ai cost",
    /ค่าใช้จ่าย cloud|cloud\/AI/i.test(doc)
  );
  ok(
    "doc stop unprepared vehicle data",
    /ข้อมูลรถไม่พร้อม|คุณภาพข้อมูลรถ/i.test(doc)
  );
  ok(
    "doc required approval wording thai",
    /อนุมัติให้เริ่ม Dealer Starter Pilot Outreach ตาม v6\.6C/i.test(doc)
  );
  ok(
    "doc outreach not onboarding",
    /Outreach ≠ onboard|Not onboarding/i.test(doc)
  );
  ok(
    "doc nong a dealer starter pilot reference",
    /Nong A Dealer Starter Pilot/i.test(doc)
  );
}

// --- no bad outreach approved claims ---
{
  for (const pat of BAD_OUTREACH_APPROVED_PATTERNS) {
    ok(
      `doc no bad outreach approved ${pat.source.slice(0, 22)}`,
      !pat.test(doc)
    );
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
  ok("guard no proc env read", !/\bprocess\.env\b/.test(guardSrc));
  ok("self no proc env read", !/\bprocess\.env\b/.test(selfCodeOnly));
  ok(
    "self no gcloud command execution",
    !/execSync\s*\(/.test(selfCodeOnly) &&
      !/spawnSync\s*\(/.test(selfCodeOnly) &&
      !/child_process/.test(selfCodeOnly)
  );
  ok("self no firebase deploy cmd", !/firebase deploy/.test(selfCodeOnly));
  ok("app no realProviderAdapter import", !appSrc.includes("realProviderAdapter"));
  ok("useChat no realProviderAdapter import", !useChatSrc.includes("realProviderAdapter"));
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
    "package v66c script",
    pkg.includes(
      "test:v66c-dealer-outreach-approval-first-prospect-checklist"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v66c-dealer-outreach-approval-first-prospect-checklist.mts"
    )
  );
}

console.log(
  "\nDone v6.6C Dealer Outreach Approval & First Prospect Checklist tests."
);
if (process.exitCode) process.exit(process.exitCode);
