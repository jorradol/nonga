/**
 * v14.1A controlled staging deploy + guard visibility check validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.1A
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.1A-controlled-staging-deploy-guard-visibility-check.md";
const SELF_PATH = "scripts/test-v141A-controlled-staging-deploy-guard-visibility-check.mts";

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

console.log("=== v14.1A Controlled Staging Deploy Guard Visibility Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 3600, `${doc.length} chars`);
ok("doc states no Gemini run", /Gemini run: no/i.test(doc));
ok("doc states no one-run click", /one-run click: no/i.test(doc));
ok("doc states no retry", /retry: no/i.test(doc));
ok("doc states no second run", /second run: no/i.test(doc));
ok("doc includes staging hosting deploy only wording", /controlled staging deploy verification only: yes/i.test(doc));
ok("doc includes production deploy no", /production deploy: no/i.test(doc));
ok("doc includes cloud run runtime change no", /Cloud Run\/runtime config change: no/i.test(doc));
ok("doc includes guard visibility check wording", /guard visibility/i.test(doc) && /served bundle/i.test(doc));
ok("doc includes fresh owner approval wording", /FRESH APPROVAL REQUIRED/i.test(doc));
ok("doc includes readiness marker evidence", /Evidence capture readiness: v14\.0B contract active/.test(doc));
ok("doc includes one-run placeholder evidence", /One-run evidence \(sanitized\): waiting for fresh owner-approved run/.test(doc));

const expectedFinalRecommendations = [
  "READY FOR OWNER MANUAL GEMINI QUALITY RETEST — FRESH APPROVAL REQUIRED",
  "HOLD — STAGING DEPLOY FAILED",
  "HOLD — STAGING BUNDLE NOT UPDATED",
  "HOLD — V14.1 GUARD VISIBILITY NOT CONFIRMED",
  "HOLD — OWNER HELPER EVIDENCE READINESS MISSING",
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

console.log(`\nDone v14.1A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
