/**
 * v14.2B controlled staging deploy visibility check validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.2B
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v14.2B-controlled-staging-deploy-thai-ux-evidence-surface-visibility-check.md";
const SELF_PATH =
  "scripts/test-v142B-controlled-staging-deploy-thai-ux-evidence-surface-visibility-check.mts";

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

console.log("=== v14.2B Controlled Staging Deploy Visibility Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 3500, `${doc.length} chars`);
ok("doc states controlled staging deploy yes", /controlled staging deploy.*yes/i.test(doc));
ok("doc states staging hosting deploy yes", /staging hosting deploy:\s*yes/i.test(doc));
ok("doc states staging runtime deploy yes", /staging runtime deploy:\s*yes/i.test(doc));
ok("doc states no Gemini run", /Gemini run:\s*no/i.test(doc));
ok("doc states no one-run click", /one-run click:\s*no/i.test(doc));
ok("doc states no provider network call", /provider network call:\s*no/i.test(doc));
ok("doc states no runtime config mutation", /runtime config mutation:\s*no/i.test(doc));
ok("doc states no secret value change", /secret value change:\s*no/i.test(doc));

ok(
  "doc includes expected frontend marker visibility list",
  /thaiUxTuningSliceId/.test(doc) &&
    /thaiUxTuningActive/.test(doc) &&
    /targetAnswerLengthGuidance/.test(doc) &&
    /4-7-sentences/.test(doc) &&
    /leadPiiCueGuardActive/.test(doc) &&
    /phoneEchoGuardActive/.test(doc) &&
    /safeConfirmationStepWordingActive/.test(doc) &&
    /v14\.2/.test(doc)
);

ok(
  "doc includes staging runtime revision and image evidence",
  /nonga-staging-00175-cxx/.test(doc) &&
    /v14\.2B-thai-ux-evidence-9abda71/.test(doc) &&
    /traffic:\s*`100%`/.test(doc)
);

ok(
  "doc includes safe status checks with auth boundary block",
  /GET \/api\/health.*200/.test(doc) &&
    /unauthenticated `POST \/api\/ai\/chat-user-visible-orchestrate` -> `401`/.test(doc)
);

ok(
  "doc includes explicit no provider-trigger statement",
  /no authenticated owner evidence endpoint call was executed/i.test(doc)
);

const expectedFinalRecommendations = [
  "READY FOR OWNER MANUAL QUALITY RETEST — FRESH APPROVAL REQUIRED",
  "READY WITH STAGING RUNTIME DEPLOY NEEDED — NO RETEST YET",
  "HOLD — THAI UX EVIDENCE SURFACE NOT VISIBLE",
  "HOLD — RUNTIME MARKER NOT UPDATED",
  "HOLD — DEPLOY SCOPE UNSAFE / NEED OWNER REVIEW",
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

console.log(`\nDone v14.2B validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
