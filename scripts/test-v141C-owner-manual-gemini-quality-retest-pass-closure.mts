/**
 * v14.1C owner manual Gemini quality retest PASS closure validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.1C
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.1C-owner-manual-gemini-quality-retest-pass-closure.md";
const SELF_PATH = "scripts/test-v141C-owner-manual-gemini-quality-retest-pass-closure.mts";

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

console.log("=== v14.1C Owner Manual Gemini Quality Retest PASS Closure Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 2800, `${doc.length} chars`);

ok("doc records official PASS status", /PASS — OWNER-ONLY GEMINI QUALITY RETEST WITH V14\.1 GUARD ACTIVE/.test(doc));

ok("doc includes HTTP status", /HTTP 200/.test(doc));
ok("doc includes auth pass", /auth=pass/.test(doc));
ok("doc includes runtime mode high", /runtimeMode=high/.test(doc));
ok("doc includes userVisibleEnabled true", /userVisibleEnabled=true/.test(doc));

ok("doc includes pilotPathActive true", /pilotPathActive=true/.test(doc));
ok("doc includes fallbackToLegacy false", /fallbackToLegacy=false/.test(doc));
ok("doc includes skipGemini false", /skipGemini=false/.test(doc));
ok("doc includes providerNetwork true", /providerNetwork=true/.test(doc));
ok("doc includes gateReason", /gateReason=real_provider_call_ok/.test(doc));

ok("doc includes guard policy version", /guardPolicyVersion=v14\.1-lead-pii-cue-guard/.test(doc));
ok("doc includes lead guard true", /leadPiiCueGuardActive=true/.test(doc));
ok("doc includes phone guard true", /phoneEchoGuardActive=true/.test(doc));
ok(
  "doc includes safe confirmation wording guard true",
  /safeConfirmationStepWordingActive=true/.test(doc)
);

ok("doc includes sanitized answer present", /sanitizedUserVisibleText=present/.test(doc));
ok("doc includes missing answer false", /missingUserVisibleText=false/.test(doc));
ok(
  "doc includes answer source and char count",
  /answerFieldSource=sanitizedUserVisibleText/.test(doc) && /answerCharCount=711/.test(doc)
);
ok("doc includes capturedAt", /capturedAt=2026-07-04T15:11:55\.615Z/.test(doc));

ok("doc includes rubric overall PASS", /Overall:\s*`PASS`/.test(doc));
ok("doc includes lead cue wording check", /no cue asking user to leave name\/phone/.test(doc));
ok("doc includes no phone echo check", /no phone echo/.test(doc));
ok(
  "doc includes safe confirmation phrase check",
  /ขั้นตอนยืนยันความสนใจอย่างปลอดภัย/.test(doc)
);
ok("doc includes user enters contact at final step", /final confirmation step by user/.test(doc));

ok("doc includes one-run click 1", /one-run click:\s*`1`/.test(doc));
ok("doc includes retry no", /retry:\s*`no`/.test(doc));
ok("doc includes second run no", /second run:\s*`no`/.test(doc));

ok("doc includes no additional Gemini in closure", /Gemini run in closure step: no/.test(doc));
ok("doc includes no provider call in closure", /provider network call in closure step: no/.test(doc));
ok("doc includes no production deploy", /production deploy: no/.test(doc));
ok("doc includes no public route activation", /public route activation: no/.test(doc));

ok(
  "doc includes next step v14.2 recommendation",
  /v14\.2 — Real-answer Thai UX \/ Quality Tuning from Captured Evidence/.test(doc)
);

const expectedFinalRecommendations = [
  "READY FOR v14.2 QUALITY / THAI UX TUNING — NO RETEST YET",
  "HOLD — CLOSURE RECORD INCOMPLETE",
  "HOLD — RETEST EVIDENCE INCOMPLETE",
  "HOLD — GUARD MARKER VERIFICATION INCOMPLETE",
  "HOLD — SECRET/PII/REAL LEAD RISK DETECTED",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
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
  ok(`no forbidden sensitive pattern ${name}`, !re.test(doc));
}

const forbiddenExecutionPhrases: Array<[string, RegExp]> = [
  ["production activation command", /deploy production|activate production/i],
  ["public route activation command", /activate public route|enable public route/i],
  ["real lead send command", /send real lead|dispatch real lead/i],
];
for (const [name, re] of forbiddenExecutionPhrases) {
  ok(`no forbidden execution phrase ${name}`, !re.test(doc));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator checks final recommendations", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.1C closure validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
