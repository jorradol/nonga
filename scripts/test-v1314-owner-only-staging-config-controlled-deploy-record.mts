/**
 * v13.14 owner-only staging config + controlled deploy record validator
 * Static checks only. No deploy/runtime mutation/no Gemini execution.
 *
 * npm run test:v13.14
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.14-owner-only-staging-config-controlled-deploy-record.md";
const SELF_PATH = "scripts/test-v1314-owner-only-staging-config-controlled-deploy-record.mts";

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

console.log("=== v13.14 Owner-Only Staging Config + Controlled Deploy Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc.split("\n").map((line) => line.trim()).filter(Boolean);

ok("doc has substantial content", doc.length > 6000, `${doc.length} chars`);

const executionChecks: Array<[string, RegExp]> = [
  ["controlled staging deploy yes", /controlled staging deploy:\s*yes/i],
  ["owner-only staging config preparation yes", /owner-only staging config preparation:\s*yes/i],
  ["staging only yes", /staging only:\s*yes/i],
  ["production no", /production:\s*no/i],
  ["public route activation no", /public route activation:\s*no/i],
  ["buyer-facing release no", /buyer-facing release:\s*no/i],
  ["real lead sending no", /real lead sending:\s*no/i],
  ["real pii no", /real PII:\s*no/i],
  ["gemini execution no", /Gemini execution:\s*no/i],
  ["smoke endpoint call no", /smoke endpoint call:\s*no/i],
  ["automatic Gemini retry no", /automatic Gemini retry:\s*no/i],
  ["secret exposure no", /secret exposure:\s*no/i],
];
for (const [name, re] of executionChecks) {
  ok(`execution includes ${name}`, re.test(doc));
}

ok("baseline includes bb9603f", /baseline commit.*bb9603f/i.test(doc));
ok("has runtime config masked evidence section", /Runtime config masked evidence/i.test(doc));
ok("has deploy scope section", /Deploy scope/i.test(doc));
ok("has post-deploy non-gemini verification", /Post-deploy non-Gemini verification/i.test(doc));
ok("has owner-only gate readiness evidence", /Owner-only gate readiness evidence/i.test(doc));
ok("has rollback readiness", /Rollback readiness/i.test(doc));
ok("has risk review", /Risk review/i.test(doc));

const finalAllowed = [
  "READY FOR OWNER APPROVAL TO EXECUTE v13.15 OWNER-ONLY CONTROLLED GEMINI UX TRIAL",
  "HOLD — v13.14 staging config/deploy incomplete",
  "HOLD — unsafe staging activation boundary detected",
];
const finalMatches = finalAllowed.filter((value) => doc.includes(value));
ok("final recommendation is one allowed value", finalMatches.length === 1, finalMatches.join(" | "));

const secretPatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
  ["token assignment", /\btoken\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["secret assignment", /\bsecret\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["api key assignment", /\bapi[_-]?key\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
];
for (const [name, re] of secretPatterns) {
  ok(`no secret pattern ${name}`, !re.test(doc));
}

const unsafeStateClaims: Array<[string, RegExp]> = [
  ["public opened", /\bpublic\b.*\b(opened|enabled|active|released|live)\b/i],
  ["production opened", /\bproduction\b.*\b(opened|enabled|active|released|live)\b/i],
  ["buyer-facing opened", /\bbuyer-facing\b.*\b(opened|enabled|active|released|live)\b/i],
  ["gemini executed", /\bGemini\b.*\b(executed|called|invoked|ran)\b/i],
  ["real lead sent", /\breal lead\b.*\b(sent|submitted|created)\b/i],
];
for (const [name, re] of unsafeStateClaims) {
  const hasUnsafe = lines.some((line) => re.test(line) && !/\b(no|not|ยังไม่|ห้าม)\b/i.test(line));
  ok(`no unsafe state claim ${name}`, !hasUnsafe);
}

ok("doc includes no smoke endpoint evidence", /No smoke endpoint evidence/i.test(doc));
ok("doc includes no lead evidence", /No lead evidence/i.test(doc));
ok("doc includes no PII evidence", /No PII evidence/i.test(doc));
ok("doc includes no public production evidence", /No public\/production evidence/i.test(doc));

ok("validator includes secret scan", /const secretPatterns/.test(self));

console.log(`\nDone v13.14 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
