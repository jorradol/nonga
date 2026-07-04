/**
 * v14.2 real-answer thai ux / quality tuning validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.2
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.2-real-answer-thai-ux-quality-tuning-from-captured-evidence.md";
const CASES_PATH = "docs/examples/v14.2-real-answer-thai-ux-quality-tuning-cases.synthetic.json";
const REAL_PROVIDER_PATH = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const SELF_PATH = "scripts/test-v142-real-answer-thai-ux-quality-tuning-from-captured-evidence.mts";

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

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

console.log("=== v14.2 Real-answer Thai UX Quality Tuning Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("cases fixture exists", existsSync(CASES_PATH));
ok("real provider source exists", existsSync(REAL_PROVIDER_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const casesRaw = read(CASES_PATH);
const source = read(REAL_PROVIDER_PATH);
const self = read(SELF_PATH);
const combinedDocs = `${doc}\n${casesRaw}`;

ok("doc has substantial content", doc.length > 4200, `${doc.length} chars`);
ok("doc states no Gemini run", /Gemini run: no/i.test(doc));
ok("doc states no one-run click", /one-run click: no/i.test(doc));
ok("doc states no provider network call", /provider network call: no/i.test(doc));
ok("doc states no production deploy", /production deploy: no/i.test(doc));
ok("doc states owner-only quality line", /staging owner-only quality line: yes/i.test(doc));

ok("doc includes v14.1C baseline reference", /v14\.1C/i.test(doc));
ok("doc includes Thai naturalness goal", /Thai naturalness/i.test(doc));
ok("doc includes concise depth goal", /not too short, not overly verbose/i.test(doc));
ok("doc includes guardrail section", /Guardrail behavior preserved/i.test(doc));
ok("doc includes safe phrase marker", /ขั้นตอนยืนยันความสนใจอย่างปลอดภัย/.test(doc));
ok("doc includes final recommendation enum", /Final recommendation enum \(v14\.2\)/.test(doc));

ok(
  "source includes v14.2 tuning slice marker",
  /USER_VISIBLE_THAI_UX_TUNING_SLICE_ID\s*=\s*"v14\.2"/.test(source)
);
ok(
  "source includes summary-first structure prompt",
  /โครงสร้างคำตอบที่ต้องการ: \(1\) สรุปตรงคำถามก่อน/.test(source)
);
ok(
  "source includes concise length prompt target",
  /ความยาวเป้าหมาย 4-7 ประโยค/.test(source)
);
ok(
  "source keeps safe confirmation and user self-entry wording",
  /ขั้นตอนยืนยันความสนใจอย่างปลอดภัย/.test(source) &&
    /ผู้ใช้เป็นคนกรอกเบอร์เองในขั้นตอนยืนยันสุดท้าย/.test(source)
);
ok(
  "source keeps lead and phone guard functions",
  /assertNoLeadOrPiiCueLanguage/.test(source) && /assertNoPhoneEchoInChatText/.test(source)
);

let parsed: unknown = null;
try {
  parsed = JSON.parse(casesRaw);
  ok("cases fixture parse JSON", true);
} catch (err) {
  ok("cases fixture parse JSON", false, String(err));
}

if (parsed && typeof parsed === "object") {
  const root = parsed as Record<string, unknown>;
  ok("cases version is v14.2", root.version === "v14.2");
  ok(
    "cases environment is staging owner-only quality tuning",
    root.environment === "staging-owner-only-quality-tuning"
  );
  ok("cases synthetic only policy true", (root.dataPolicy as Record<string, unknown>)?.syntheticOnly === true);
  ok("cases no real lead policy true", (root.dataPolicy as Record<string, unknown>)?.noRealLead === true);
  ok("cases no real pii policy true", (root.dataPolicy as Record<string, unknown>)?.noRealPii === true);
  ok(
    "cases include no lead/PII cue guardrail",
    (root.guardrailsMustHold as Record<string, unknown>)?.noLeadPiiCueInChat === true
  );
  ok(
    "cases include no phone echo guardrail",
    (root.guardrailsMustHold as Record<string, unknown>)?.noPhoneEchoInChat === true
  );
  const cases = Array.isArray(root.cases) ? (root.cases as Array<Record<string, unknown>>) : [];
  ok("cases count >= 10", cases.length >= 10, `count=${cases.length}`);
}

const expectedFinalRecommendations = [
  "READY FOR v14.2A OWNER-ONLY QUALITY EVIDENCE SURFACE / NO GEMINI YET",
  "READY FOR OWNER MANUAL QUALITY RETEST — FRESH APPROVAL REQUIRED",
  "HOLD — QUALITY TUNING NEEDS REVIEW",
  "HOLD — GUARDRAIL REGRESSION DETECTED",
  "HOLD — TEST FAILURE",
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
  ok(`no forbidden execution phrase ${name}`, !re.test(combinedDocs));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator checks recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.2 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
