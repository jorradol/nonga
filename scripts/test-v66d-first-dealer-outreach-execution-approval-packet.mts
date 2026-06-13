/**
 * v6.6D — First Dealer Outreach Execution Approval Packet (static validation only)
 * npm run test:v66d-first-dealer-outreach-execution-approval-packet
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
  /v6\.6D\s+captures\s+approval\s+for\s+outreach/i,
  /v6\.6D\s+authorizes\s+dealer\s+outreach\s+start/i,
  /v6\.6D\s+authorizes\s+revenue\s+pilot\s+start/i,
  /v6\.6D\s+authorizes\s+dealer\s+onboarding/i,
  /v6\.6D\s+approves\s+payment/i,
  /execution\s+approved\s+for\s+production/i,
  /Outreach Execution is approved by v6\.6D alone/i,
  /v6\.6D\s+approved\b/i,
];

const BAD_OUTREACH_EXEC_APPROVED_PATTERNS = [
  /Dealer Outreach Approved\?\s*=\s*Yes/i,
  /Outreach Execution Approved\?\s*=\s*Yes/i,
  /Dealer Outreach Started\?\s*=\s*Yes/i,
  /Revenue Pilot Approved\?\s*=\s*Yes/i,
  /Revenue Pilot Started\?\s*=\s*Yes/i,
  /Dealer Onboarded\?\s*=\s*Yes/i,
  /Payment\/Billing Enabled\?\s*=\s*Yes/i,
  /Execution Allowed from v6\.6D\?\s*=\s*Yes/i,
  /Gemini Invocation in v6\.6D\?\s*=\s*Yes/i,
  /Adapter Allow Path Added\?\s*=\s*Yes/i,
  /Deploy Performed\?\s*=\s*Yes/i,
  /Production Touched\?\s*=\s*Yes/i,
  /User-Visible AI Enabled\?\s*=\s*Yes/i,
  /dealer outreach has been started/i,
  /outreach execution has been approved/i,
  /dealer has been onboarded/i,
  /payment has been enabled/i,
  /pilot has been started/i,
  /execution authorized by v6\.6D/i,
];

const HEAD_SHA = "dd86d0dd523416bf1958f0cb336a8721085126ab";
const STAGING_BUNDLE = "index-CHVc8agp.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.6D First Dealer Outreach Execution Approval Packet ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const v66cDoc = readFileSync(V66C_DOC, "utf8");
const v66bDoc = readFileSync(V66B_DOC, "utf8");
const v66aDoc = readFileSync(V66A_DOC, "utf8");
const adapterSrc = readFileSync(ADAPTER_PATH, "utf8");
const guardSrc = readFileSync(GUARD_PATH, "utf8");
const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const appSrc = readFileSync(APP_PATH, "utf8");
const useChatSrc = readFileSync(USE_CHAT_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v66d-first-dealer-outreach-execution-approval-packet.mts",
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
  ok("v6.6D doc exists", doc.length > 6000);
  ok("doc v6.6D label", doc.includes("v6.6D"));
  ok("v6.6C doc exists", existsSync(V66C_DOC) && v66cDoc.includes("v6.6C"));
  ok("v6.6B doc exists", existsSync(V66B_DOC) && v66bDoc.includes("v6.6B"));
  ok("v6.6A doc exists", existsSync(V66A_DOC) && v66aDoc.includes("v6.6A"));
  ok("Gate C guard exists", existsSync(GUARD_PATH));
  ok("Gate B harness exists", existsSync(HARNESS_PATH));
}

// --- safety positioning ---
{
  ok("doc HEAD dd86d0d", doc.includes(HEAD_SHA) || doc.includes("dd86d0d"));
  ok("doc staging bundle", doc.includes(STAGING_BUNDLE));
  ok("doc Real Gemini OFF", /Real Gemini.*OFF|OFF.*Real Gemini/i.test(doc));
  ok(
    "doc no outreach execution in v6.6D",
    /does not execute outreach|NOT outreach execution|Dealer Outreach Started\?\s*=\s*No/i.test(
      doc
    )
  );
  ok(
    "doc no actual dealer contact from v6.6D",
    /No actual dealer contact from v6\.6D|does not send messages to dealers/i.test(
      doc
    )
  );
  ok(
    "doc no Gemini invocation in v6.6D",
    /Gemini Invocation in v6\.6D\?\s*=\s*No/i.test(doc)
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
    "doc dealer outreach approved is no",
    /Dealer Outreach Approved\?\s*=\s*No|Dealer Outreach Approved\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc outreach execution approved is no",
    /Outreach Execution Approved\?\s*=\s*No|Outreach Execution Approved\?\s*\|\s*\*\*No\*\*/i.test(
      doc
    )
  );
  ok(
    "doc dealer outreach started is no",
    /Dealer Outreach Started\?\s*=\s*No/i.test(doc)
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
    "doc execution allowed from v66d is no",
    /Execution Allowed from v6\.6D\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc gemini invocation in v66d is no",
    /Gemini Invocation in v6\.6D\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc adapter allow path added is no",
    /Adapter Allow Path Added\?\s*=\s*No/i.test(doc)
  );
  ok(
    "doc does not state outreach execution approved",
    /Does not state outreach execution approved|does not state outreach execution approved/i.test(
      doc
    )
  );
  ok(
    "doc does not state dealer outreach started",
    /Does not state dealer outreach started|does not state dealer outreach started/i.test(
      doc
    )
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
    "doc relationship to v66abc",
    /Relationship to v6\.6A \/ v6\.6B \/ v6\.6C/i.test(doc)
  );
  ok(
    "doc outreach execution scope",
    /Outreach Execution Scope/i.test(doc)
  );
  ok(
    "doc allowed outreach actions",
    /Allowed Outreach Actions/i.test(doc)
  );
  ok("doc not allowed actions", /Not Allowed Actions/i.test(doc));
  ok(
    "doc outreach script confirmation",
    /Outreach Script Confirmation/i.test(doc)
  );
  ok(
    "doc prospect logging template",
    /Prospect Logging Template/i.test(doc)
  );
  ok(
    "doc stop escalation rules",
    /Stop \/ Escalation Rules/i.test(doc)
  );
  ok("doc exact approval wording", /Exact Approval Wording/i.test(doc));
  ok(
    "doc explicit non-execution confirmation",
    /Explicit Non-Execution Confirmation/i.test(doc)
  );
  ok(
    "doc explicit non-authorization confirmation",
    /Explicit Non-Authorization Confirmation/i.test(doc)
  );
  ok(
    "doc references v66b scripts",
    /v6\.6B|Outreach Message — Formal|Outreach Message — Friendly|Short Sales Script/i.test(
      doc
    )
  );
  ok(
    "doc references v66c checklist",
    /v6\.6C|Dealer Qualification Questions|Prospect Logging/i.test(doc)
  );
  ok(
    "doc manual line facebook",
    /LINE.*Facebook|Facebook.*LINE/i.test(doc)
  );
  ok(
    "doc short line facebook version",
    /Version สั้น.*LINE|LINE \/ Facebook/i.test(doc)
  );
  ok(
    "doc one minute phone version",
    /1 นาที|โทรคุย/i.test(doc)
  );
  ok(
    "doc prospect logging fields",
    /ชื่อเต็นท์|ชื่อผู้ติดต่อ|ช่องทางติดต่อ|วันที่ติดต่อ|จำนวนรถ|pain point|red flag|next action/i.test(
      doc
    )
  );
  ok(
    "doc stop immediate start",
    /เริ่มทันที|onboarding\/pilot/i.test(doc)
  );
  ok(
    "doc stop payment",
    /จ่ายเงิน|มัดจำ|payment/i.test(doc)
  );
  ok(
    "doc stop vehicle data import",
    /ข้อมูลรถจริง|import.*runtime|runtime.*import/i.test(doc)
  );
  ok(
    "doc stop ai replies customers",
    /AI ตอบลูกค้า/i.test(doc)
  );
  ok(
    "doc stop cloud ai cost",
    /cloud\/AI|ค่าใช้จ่าย cloud/i.test(doc)
  );
  ok(
    "doc stop production deploy",
    /production.*deploy|deploy.*production/i.test(doc)
  );
  ok(
    "doc exact approval wording thai",
    /อนุมัติให้เริ่ม First Dealer Outreach ตาม v6\.6D/i.test(doc)
  );
  ok(
    "doc limit 1-3 dealers",
    /1–3|1-3/.test(doc)
  );
  ok(
    "doc manual outreach only",
    /manual/i.test(doc)
  );
  ok(
    "doc no payment in outreach",
    /ห้ามปิดรับเงิน|ยังไม่รับเงิน|ห้ามรับเงิน/i.test(doc)
  );
  ok(
    "doc no runtime vehicle import",
    /ห้าม import ข้อมูลรถ|นำข้อมูลรถจริงเข้าระบบ runtime/i.test(doc)
  );
}

// --- no bad approved claims ---
{
  for (const pat of BAD_OUTREACH_EXEC_APPROVED_PATTERNS) {
    ok(
      `doc no bad outreach exec approved ${pat.source.slice(0, 22)}`,
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
    "adapter no lead payment mutation",
    !/contactReveal|revenueWrite|payment\.|invoice\./.test(adapterSrc)
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
    "package v66d script",
    pkg.includes("test:v66d-first-dealer-outreach-execution-approval-packet")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v66d-first-dealer-outreach-execution-approval-packet.mts"
    )
  );
}

console.log(
  "\nDone v6.6D First Dealer Outreach Execution Approval Packet tests."
);
if (process.exitCode) process.exit(process.exitCode);
