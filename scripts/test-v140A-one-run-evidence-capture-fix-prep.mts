/**
 * v14.0A one-run evidence capture fix/prep validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.0A
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.0A-one-run-evidence-capture-fix-prep.md";
const PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v140A-one-run-evidence-capture-fix-prep.mts";

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

console.log("=== v14.0A One-Run Evidence Capture Fix/Prep Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("panel exists", existsSync(PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const panel = read(PANEL_PATH);
const self = read(SELF_PATH);
const combined = `${doc}\n${panel}`;

ok("doc has substantial content", doc.length > 3000, `${doc.length} chars`);
ok("panel has one-run evidence section", /owner-gemini-ux-one-run-evidence/.test(panel));
ok(
  "panel captures sanitized answer field",
  /userVisibleTextSanitized/.test(panel) && /owner-gemini-ux-one-run-answer-text/.test(panel)
);
ok(
  "panel has missing-answer warning",
  /owner-gemini-ux-one-run-answer-missing-warning/.test(panel) &&
    /userVisibleText missing/.test(panel)
);
ok("panel captures evidence timestamp", /capturedAtIso/.test(panel));
ok("panel captures gate reason", /gateReason/.test(panel));
ok("panel captures provider network flag", /providerNetwork/.test(panel));
ok("panel captures fallback flag", /fallbackToLegacy/.test(panel));
ok("panel captures skipGemini flag", /skipGemini/.test(panel));
ok("panel captures carCardCount", /carCardCount/.test(panel));
ok("panel captures serverRecentCarCardsCount", /serverRecentCarCardsCount/.test(panel));
ok("panel captures runtimeMode", /runtimeMode/.test(panel));
ok("panel captures userVisibleEnabled", /userVisibleEnabled/.test(panel));
ok("panel captures pilotPathActive", /pilotPathActive/.test(panel));
ok("panel captures pilotContextPresent", /pilotContextPresent/.test(panel));
ok("panel includes no-retry reminder", /noRetry=true/.test(panel));
ok(
  "panel includes no second run reminder",
  /noSecondRunWithoutFreshApproval=true/.test(panel)
);

const requiredDocPhrases: Array<[string, RegExp]> = [
  ["no Gemini run wording", /Gemini run: no/i],
  ["no one-run click wording", /one-run click: no/i],
  ["no retry wording", /retry: no/i],
  ["no second run wording", /second run: no/i],
  ["fresh owner approval wording", /FRESH OWNER APPROVAL REQUIRED/i],
  ["next retest wording", /READY FOR OWNER MANUAL QUALITY RETEST 2\/2\?/i],
];
for (const [name, re] of requiredDocPhrases) {
  ok(`doc includes ${name}`, re.test(doc));
}

const expectedFinalRecommendations = [
  "READY FOR OWNER MANUAL GEMINI QUALITY RETEST — FRESH APPROVAL REQUIRED",
  "HOLD — EVIDENCE CAPTURE PATCH INCOMPLETE",
  "HOLD — MISSING ANSWER TEXT CAPTURE",
  "HOLD — GUARDRAIL GAP DETECTED",
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
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenExecutionPhrases: Array<[string, RegExp]> = [
  ["production activation", /activate production|deploy production/i],
  ["public route activation", /public route activation/i],
  ["real lead sending", /send real lead|dispatch real lead/i],
  ["automatic retry instruction", /automatic retry/i],
];
for (const [name, re] of forbiddenExecutionPhrases) {
  ok(`no forbidden execution phrase ${name}`, !re.test(panel));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator scans forbidden patterns", /forbiddenSensitivePatterns/.test(self));
ok("validator checks final recommendations", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.0A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
