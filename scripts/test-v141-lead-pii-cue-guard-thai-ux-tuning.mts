/**
 * v14.1 lead/pii cue guard + thai ux tuning validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.1
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.1-lead-pii-cue-guard-thai-ux-tuning.md";
const CASES_PATH = "docs/examples/v14.1-lead-pii-cue-guard-thai-ux-cases.synthetic.json";
const REAL_PROVIDER_PATH = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const PILOT_COPY_PATH = "src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
const SELF_PATH = "scripts/test-v141-lead-pii-cue-guard-thai-ux-tuning.mts";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function read(path: string): string {
  return normalize(readFileSync(path, "utf8"));
}

console.log("=== v14.1 Lead/PII Cue Guard + Thai UX Tuning Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("cases fixture exists", existsSync(CASES_PATH));
ok("real provider source exists", existsSync(REAL_PROVIDER_PATH));
ok("pilot copy source exists", existsSync(PILOT_COPY_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const casesRaw = read(CASES_PATH);
const realProvider = read(REAL_PROVIDER_PATH);
const pilotCopy = read(PILOT_COPY_PATH);
const self = read(SELF_PATH);
const combinedDocs = `${doc}\n${casesRaw}`;
const combinedCode = `${realProvider}\n${pilotCopy}`;

ok("doc has substantial content", doc.length > 4200, `${doc.length} chars`);
ok("doc states no Gemini run", /Gemini run: no/i.test(doc));
ok("doc states no one-run click", /one-run click: no/i.test(doc));
ok("doc states no retry", /retry: no/i.test(doc));
ok("doc states no second run", /second run: no/i.test(doc));
ok(
  "doc enforces user enters phone in final confirmation step",
  /user enters phone only in final confirmation step/i.test(doc)
);
ok("doc includes safe wording examples", /Safe wording examples/i.test(doc));
ok("doc includes forbidden wording examples", /Forbidden wording examples/i.test(doc));
ok("doc includes boundary reminder", /v14\.1 is patch-and-validate only/i.test(doc));
ok("doc includes fresh owner approval wording", /FRESH APPROVAL REQUIRED/i.test(doc));

ok(
  "source includes lead/pii cue output guard patterns",
  /USER_VISIBLE_LEAD_PII_CUE_OUTPUT_PATTERNS/.test(realProvider) &&
    /assertNoLeadOrPiiCueLanguage/.test(realProvider)
);
ok(
  "source includes phone echo guard patterns",
  /USER_VISIBLE_PHONE_ECHO_OUTPUT_PATTERNS/.test(realProvider) &&
    /assertNoPhoneEchoInChatText/.test(realProvider)
);
ok(
  "source includes safe confirmation-step prompt wording",
  /ขั้นตอนยืนยันความสนใจอย่างปลอดภัย/.test(realProvider) &&
    /กรอกเบอร์เองในขั้นตอนยืนยันสุดท้าย/.test(realProvider)
);
ok(
  "source removed direct ask name/phone in prompt",
  !/ชวนฝากชื่อ\/เบอร์ให้ทีมงานติดต่อกลับได้ครับ/.test(realProvider)
);
ok(
  "pilot finance fallback removed direct contact ask",
  !/ฝากชื่อและเบอร์ติดต่อให้ทีมงานช่วยประสานรายละเอียดได้ครับ/.test(pilotCopy) &&
    /ขั้นตอนยืนยันความสนใจอย่างปลอดภัย/.test(pilotCopy)
);

let parsedCases: unknown = null;
try {
  parsedCases = JSON.parse(casesRaw);
  ok("cases fixture parse JSON", true);
} catch (err) {
  ok("cases fixture parse JSON", false, String(err));
}

type CaseRecord = {
  id: string;
  title: string;
  userMessage: string;
  expectedBehavior: string[];
};

if (parsedCases && typeof parsedCases === "object") {
  const root = parsedCases as Record<string, unknown>;
  ok("cases version is v14.1", root.version === "v14.1");
  ok("cases environment is staging-only", root.environment === "staging-only");
  ok("cases synthetic only policy true", (root.dataPolicy as Record<string, unknown>)?.syntheticOnly === true);
  ok("cases no real lead policy true", (root.dataPolicy as Record<string, unknown>)?.noRealLead === true);
  ok("cases no real pii policy true", (root.dataPolicy as Record<string, unknown>)?.noRealPii === true);
  ok(
    "owner policy phone final confirmation only",
    (root.ownerPolicy as Record<string, unknown>)?.phoneEnteredByUserInFinalConfirmationOnly === true
  );
  const cases = Array.isArray(root.cases) ? (root.cases as CaseRecord[]) : [];
  ok("cases count >= 8", cases.length >= 8, `count=${cases.length}`);
  const caseIds = new Set(cases.map((c) => c.id));
  const expectedCaseIds = [
    "V141_Q01_interest_contact_callback_request",
    "V141_Q02_user_asks_if_phone_required",
    "V141_Q03_user_typed_phone_in_chat",
    "V141_Q04_request_seller_contact_directly",
    "V141_Q05_booking_deposit_before_viewing",
    "V141_Q06_finance_and_contact_combo",
    "V141_Q07_switch_back_to_search_flow",
    "V141_Q08_plate_vin_document_request",
  ];
  for (const id of expectedCaseIds) {
    ok(`cases include ${id}`, caseIds.has(id));
  }
}

const expectedFinalRecommendations = [
  "READY FOR OWNER MANUAL GEMINI QUALITY RETEST — FRESH APPROVAL REQUIRED",
  "READY WITH STAGING DEPLOY NEEDED — NO RETEST YET",
  "HOLD — LEAD/PII CUE GUARD INCOMPLETE",
  "HOLD — THAI UX TUNING INCOMPLETE",
  "HOLD — GUARDRAIL GAP DETECTED",
  "HOLD — SECRET/PII/REAL LEAD RISK DETECTED",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
  ok(`cases include final recommendation ${value}`, casesRaw.includes(value));
}

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone style", /\b0[689]\d{8}\b/],
  ["thai plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern in docs/cases ${name}`, !re.test(combinedDocs));
}

const forbiddenExecutionPhrases: Array<[string, RegExp]> = [
  ["production activation command", /deploy production|activate production/i],
  ["public route activation command", /activate public route|enable public route/i],
  ["real lead send command", /send real lead|dispatch real lead/i],
];
for (const [name, re] of forbiddenExecutionPhrases) {
  ok(`no forbidden execution phrase in code ${name}`, !re.test(combinedCode));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator checks recommendations", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.1 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
