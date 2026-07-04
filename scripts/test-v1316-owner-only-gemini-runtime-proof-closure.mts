/**
 * v13.16 owner-only Gemini runtime proof closure validator
 * Static checks only. No deploy/runtime mutation/no provider call.
 *
 * npm run test:v13.16
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.16-owner-only-gemini-runtime-proof-closure.md";
const SELF_PATH = "scripts/test-v1316-owner-only-gemini-runtime-proof-closure.mts";

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

console.log("=== v13.16 Owner-Only Gemini Runtime Proof Closure Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));

ok("doc has substantial content", doc.length > 2200, `${doc.length} chars`);
ok("pass headline recorded", /PASS - OWNER-ONLY GEMINI RUNTIME PATH PROVED ON STAGING/i.test(doc));

const requiredEvidence: Array<[string, RegExp]> = [
  ["pilotPathActive true", /`pilotPathActive=true`/],
  ["fallbackToLegacy false", /`fallbackToLegacy=false`/],
  ["skipGemini false", /`skipGemini=false`/],
  ["providerNetwork true", /`providerNetwork=true`/],
  ["carCardCount 2", /`carCardCount=2`/],
  ["runtimeMode high", /`runtimeMode=high`/],
  ["userVisibleEnabled true", /`userVisibleEnabled=true`/],
  ["pilotContextPresent true", /`pilotContextPresent=true`/],
  ["serverRecentCarCardsCount 2", /`serverRecentCarCardsCount=2`/],
  ["gateReason real_provider_call_ok", /`gateReason=real_provider_call_ok`/],
  ["pilotInactiveReason pilot_active", /`pilotInactiveReason=pilot_active`/],
];
for (const [name, re] of requiredEvidence) {
  ok(`required evidence includes ${name}`, re.test(doc));
}

ok(
  "root cause chain item 7 recorded",
  /runtimeMode=off[\s\S]*APP_URL[\s\S]*missing/i.test(doc)
);
ok(
  "root cause chain item 8 recorded",
  /APP_URL[\s\S]*added[\s\S]*staging Cloud Run config/i.test(doc)
);
ok("root cause chain item 9 recorded", /reached real provider path successfully/i.test(doc));

const boundaryChecks: Array<[string, RegExp]> = [
  ["staging only", /\bstaging only\b/i],
  ["owner-only controlled UX only", /owner-only controlled UX only/i],
  ["allowlisted owner UID only", /allowlisted owner UID only/i],
  ["synthetic context only", /synthetic car cards \/ controlled context only/i],
  ["no buyer-facing release", /no buyer-facing release/i],
  ["no public route activation", /no public route activation/i],
  ["no production", /\bno production\b/i],
  ["no real lead", /no real lead/i],
  ["no phone plate vin", /no phone \/ plate \/ VIN/i],
];
for (const [name, re] of boundaryChecks) {
  ok(`boundary includes ${name}`, re.test(doc));
}

const v14Checks: Array<[string, RegExp]> = [
  ["v14.0 handoff", /v14\.0 Owner-only Gemini answer quality review/i],
  ["v14.1 handoff", /v14\.1 Thai UX \/ naturalness tuning/i],
  ["v14.2 handoff", /v14\.2 AI guardrails and safety tuning/i],
  ["v14.3 handoff", /v14\.3 staging marketplace inventory \/ sandbox inventory decision/i],
  ["v14.4 handoff", /v14\.4 staging lead flow validation with PDPA constraints/i],
  ["v14.5 handoff", /v14\.5 limited staging pilot readiness/i],
];
for (const [name, re] of v14Checks) {
  ok(`handoff includes ${name}`, re.test(doc));
}

const allowedFinal = ["v13 CLOSED - READY TO START v14 IN NEW CHAT"];
const finalMatches = allowedFinal.filter((value) => doc.includes(value));
ok("final recommendation is allowed closure value", finalMatches.length === 1);

const forbiddenPatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["phone number", /\b0[689]\d{8}\b/],
  ["thai plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
  ["full uid h0x", /\bh0xjXUfEXBTMWzdPn0TQjK0WvSC3\b/],
  ["production authorization", /production authorization/i],
  ["public route authorization", /public route authorization/i],
  ["real lead authorization", /real lead authorization/i],
];
for (const [name, re] of forbiddenPatterns) {
  ok(`doc contains no forbidden pattern ${name}`, !re.test(doc));
}

ok("validator includes forbidden scan", /const forbiddenPatterns/.test(self));

console.log(`\nDone v13.16 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
