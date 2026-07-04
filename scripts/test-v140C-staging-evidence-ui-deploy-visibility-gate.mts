/**
 * v14.0C staging evidence UI deploy/visibility gate validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.0C
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.0C-staging-evidence-ui-deploy-visibility-gate.md";
const PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const EVIDENCE_UTIL_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const SELF_PATH = "scripts/test-v140C-staging-evidence-ui-deploy-visibility-gate.mts";

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

console.log("=== v14.0C Staging Evidence UI Deploy/Visibility Gate Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("panel exists", existsSync(PANEL_PATH));
ok("evidence utility exists", existsSync(EVIDENCE_UTIL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const panel = read(PANEL_PATH);
const util = read(EVIDENCE_UTIL_PATH);
const self = read(SELF_PATH);
const combined = `${doc}\n${panel}\n${util}`;
const codeOnly = `${panel}\n${util}`;

ok("doc has substantial content", doc.length > 4200, `${doc.length} chars`);
ok("doc states no Gemini run", /Gemini run: no/i.test(doc));
ok("doc states no one-run click", /one-run click: no/i.test(doc));
ok("doc states no retry", /retry: no/i.test(doc));
ok("doc states no second run", /second run: no/i.test(doc));
ok("doc includes fresh owner approval wording", /FRESH APPROVAL REQUIRED/i.test(doc));
ok(
  "doc includes no one-run visibility method",
  /Safe visibility verification method/i.test(doc) &&
    /no one-run/i.test(doc) &&
    /without triggering Gemini\/provider network/i.test(doc)
);
ok("doc includes staging diagnosis section", /v14\.0C diagnosis/i.test(doc));

ok(
  "panel includes readiness marker testid",
  /owner-one-run-evidence-readiness/.test(panel) &&
    /Evidence capture readiness: v14\.0B contract active/.test(panel)
);
ok(
  "panel includes evidence block testid",
  /owner-one-run-evidence-block/.test(panel) &&
    /One-run evidence readiness: sanitized answer text contract enabled/.test(panel)
);
ok(
  "panel includes pre-run placeholder",
  /One-run evidence \(sanitized\): waiting for fresh owner-approved run/.test(panel)
);
ok(
  "panel includes answer and missing warning testids",
  /owner-one-run-answer-text/.test(panel) && /owner-one-run-missing-answer-warning/.test(panel)
);
ok(
  "panel documents answer text field mapping",
  /answerFieldSource/.test(panel) &&
    /answerCharCount/.test(panel) &&
    /userVisibleTextSanitized/.test(panel)
);
ok("utility includes documented answer field", /sanitizedUserVisibleText/.test(util));
ok("utility includes missing-answer fallback", /userVisibleTextMissingReason/.test(util));

const expectedFinalRecommendations = [
  "READY FOR OWNER MANUAL GEMINI QUALITY RETEST — FRESH APPROVAL REQUIRED",
  "HOLD — STAGING BUNDLE NOT UPDATED",
  "HOLD — EVIDENCE READINESS MARKER MISSING",
  "HOLD — FRONTEND EVIDENCE BLOCK NOT VISIBLE",
  "HOLD — DEPLOY REQUIRED BUT NOT PERFORMED",
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
  ["production deployment command", /\bdeploy production\b|\bproduction deploy\b/i],
  ["public route activation", /public route activation|activate public route/i],
  ["real lead send command", /send real lead|dispatch real lead/i],
];
for (const [name, re] of forbiddenExecutionPhrases) {
  ok(`no forbidden execution phrase ${name}`, !re.test(codeOnly));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator checks recommendations", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.0C validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
