/**
 * v14.2C owner manual Gemini quality retest PASS closure validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.2C
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.2C-owner-manual-gemini-quality-retest-pass-closure.md";
const SELF_PATH = "scripts/test-v142C-owner-manual-gemini-quality-retest-pass-closure.mts";

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

console.log("=== v14.2C Owner Manual Gemini PASS Closure Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 3500, `${doc.length} chars`);
ok(
  "doc has official pass status line",
  /PASS — OWNER-ONLY GEMINI QUALITY RETEST v14\.2B PASSED WITH THAI UX TUNING ACTIVE/.test(doc)
);
ok("doc states closure has no Gemini run", /Gemini run in closure step:\s*no/i.test(doc));
ok("doc states closure has no one-run click", /one-run click in closure step:\s*no/i.test(doc));
ok("doc states closure has no provider network call", /provider network call in closure step:\s*no/i.test(doc));
ok("doc has HTTP/auth/runtime snapshot", /httpStatus=200/.test(doc) && /auth=pass/.test(doc) && /runtimeMode=high/.test(doc));
ok("doc has path/provider snapshot", /pilotPathActive=true/.test(doc) && /fallbackToLegacy=false/.test(doc) && /providerNetwork=true/.test(doc));
ok(
  "doc has guard and thai ux markers",
  /guardPolicyVersion=v14\.1-lead-pii-cue-guard/.test(doc) &&
    /thaiUxTuningSliceId=v14\.2/.test(doc) &&
    /thaiUxTuningActive=true/.test(doc) &&
    /targetAnswerLengthGuidance=4-7-sentences/.test(doc) &&
    /leadPiiCueGuardActive=true/.test(doc) &&
    /phoneEchoGuardActive=true/.test(doc) &&
    /safeConfirmationStepWordingActive=true/.test(doc)
);
ok(
  "doc has evidence capture fields",
  /sanitizedUserVisibleText=present/.test(doc) &&
    /missingUserVisibleText=false/.test(doc) &&
    /missingUserVisibleTextReason=none/.test(doc) &&
    /answerFieldSource=sanitizedUserVisibleText/.test(doc) &&
    /answerCharCount=761/.test(doc) &&
    /capturedAt=2026-07-05T04:58:53\.869Z/.test(doc) &&
    /runSessionLocked=true/.test(doc)
);
ok(
  "doc has one-run compliance values",
  /one-run click count:\s*`1`/.test(doc) &&
    /retry used:\s*`false`/.test(doc) &&
    /second run used:\s*`false`/.test(doc)
);
ok(
  "doc has sanitized answer summary anchors",
  /Toyota Yaris Ativ 2020/.test(doc) &&
    /Honda City 2020/.test(doc) &&
    /419,000 บาท/.test(doc) &&
    /449,000 บาท/.test(doc) &&
    /ขั้นตอนยืนยันความสนใจอย่างปลอดภัย/.test(doc)
);
ok(
  "doc has rubric pass and 5 sentence detail",
  /Thai naturalness:\s*`PASS`/.test(doc) &&
    /Structure 4-7 sentences:\s*`PASS` \(5 sentences\)/.test(doc) &&
    /Overall:\s*`PASS`/.test(doc)
);
ok(
  "doc has v14.3 limited staging pilot readiness recommendation",
  /READY FOR v14\.3 LIMITED STAGING PILOT READINESS PLANNING — NO PUBLIC\/PRODUCTION\/REAL LEAD YET/.test(doc)
);

const expectedFinalRecommendations = [
  "READY FOR v14.3 LIMITED STAGING PILOT READINESS PLANNING — NO PUBLIC/PRODUCTION/REAL LEAD YET",
  "READY FOR v14.3 QUALITY CASE EXPANSION / LIMITED PILOT READINESS CHECK — NO RETEST YET",
  "HOLD — CLOSURE RECORD INCOMPLETE",
  "HOLD — RETEST EVIDENCE INCOMPLETE",
  "HOLD — BOUNDARY/SAFETY REGRESSION DETECTED",
  "HOLD — TEST FAILURE",
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

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator checks recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.2C closure validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
