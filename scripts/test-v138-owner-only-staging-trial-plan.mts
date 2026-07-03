/**
 * v13.8 owner-only staging trial plan validator
 * Static/doc checks only. No deploy. No runtime calls.
 *
 * npm run test:v13.8
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.8-owner-only-staging-trial-plan.md";
const SELF_PATH = "scripts/test-v138-owner-only-staging-trial-plan.mts";

let pass = 0;
let fail = 0;

function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name, detail);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
    process.exitCode = 1;
  }
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

console.log("=== v13.8 Owner-Only Staging Trial Plan Validation ===\n");

const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));

ok("doc exists (substantial)", doc.length > 4000, `${doc.length} chars`);
ok(
  "doc has v13.8 title",
  /v13\.8 Owner-Only Staging Trial Plan/i.test(doc)
);

const REQUIRED_EXECUTION_PHRASES: Array<[string, RegExp]> = [
  ["prepare-only yes", /prepare-only:\s*yes/i],
  ["docs test package only yes", /docs\/test\/package only:\s*yes/i],
  ["owner-only staging trial plan yes", /owner-only staging trial plan:\s*yes/i],
  ["no deploy yes", /no deploy:\s*yes/i],
  ["no runtime config change yes", /no runtime config change:\s*yes/i],
  ["no Gemini execution yes", /no Gemini execution:\s*yes/i],
  ["no smoke endpoint call yes", /no smoke endpoint call:\s*yes/i],
  ["no production yes", /no production:\s*yes/i],
  ["no public route activation yes", /no public route activation:\s*yes/i],
  ["no buyer-facing AI release yes", /no buyer-facing AI release:\s*yes/i],
  ["no real lead yes", /no real lead:\s*yes/i],
];
for (const [name, re] of REQUIRED_EXECUTION_PHRASES) {
  ok(`execution type includes: ${name}`, re.test(doc));
}

const REQUIRED_TRIAL_BOUNDARY: Array<[string, RegExp]> = [
  ["owner-only", /\bowner-only\b/i],
  ["staging only", /\bstaging only\b/i],
  ["no public", /\bno public\b/i],
  ["no buyer-facing general release", /no buyer-facing general release/i],
  ["no real lead", /\bno real lead\b/i],
  ["no PII", /\bno PII\b/i],
  ["no real phone", /no real phone/i],
  ["no real plate vin", /no real plate\/VIN/i],
  ["no secret api key token exposure", /no secret\/API key\/token exposure/i],
  ["no automatic Gemini retries", /no automatic Gemini retries/i],
  ["no deploy runtime config change without separate approval", /no deploy\/runtime config change without separate approval/i],
];
for (const [name, re] of REQUIRED_TRIAL_BOUNDARY) {
  ok(`trial boundary includes: ${name}`, re.test(doc));
}

ok(
  "classification has deterministic guardrail path",
  /Deterministic guardrail path/i.test(doc)
);
ok(
  "classification has Gemini candidate path",
  /Gemini candidate path/i.test(doc)
);
ok("classification has hybrid path", /Hybrid path/i.test(doc));

const REQUIRED_MATRIX_TOPICS: Array<[string, RegExp]> = [
  ["ค้นหารถตามงบ/พื้นที่", /ค้นหารถตามงบ\/พื้นที่/],
  ["เปลี่ยนใจระหว่างคุย", /เปลี่ยนใจระหว่างคุย/],
  ["ผ่อน/ไฟแนนซ์", /ผ่อน\/ไฟแนนซ์/],
  ["โอนเงิน/มัดจำ", /โอนเงิน\/มัดจำ/],
  ["PDPA/ทะเบียน/VIN/เบอร์", /PDPA\/ทะเบียน\/VIN\/เบอร์/],
  ["lead confirmation", /lead confirmation/i],
  ["off-topic recovery", /off-topic recovery/i],
  ["ประกาศขายรถ", /ประกาศขายรถ/],
  ["lucky color / fun car match", /lucky color\s*\/\s*fun car match/i],
];
for (const [name, re] of REQUIRED_MATRIX_TOPICS) {
  ok(`owner matrix topic includes: ${name}`, re.test(doc));
}

ok("doc has scoring PASS", /\bPASS\b/.test(doc));
ok("doc has scoring NEED REVIEW", /\bNEED REVIEW\b/.test(doc));
ok("doc has scoring HOLD", /\bHOLD\b/.test(doc));

ok(
  "doc has exact final recommendation",
  /READY FOR OWNER APPROVAL TO PROCEED TO v13\.9 OWNER-ONLY STAGING TRIAL EXECUTION/.test(
    doc
  )
);

const POSSIBLE_SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key style", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key style", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  ["generic token assignment", /\b(?:api[_-]?key|token)\b\s*[:=]\s*(?!yes\b|no\b|redacted\b|<[^>]+>|`?[A-Z0-9_]+`?\b)[^\s`]{16,}/i],
  ["bearer token style", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
];
for (const [name, re] of POSSIBLE_SECRET_PATTERNS) {
  ok(`doc has no real secret pattern: ${name}`, !re.test(doc));
}

const DISALLOWED_EXECUTION_HINTS: Array<[string, RegExp]> = [
  ["firebase deploy command", /\bfirebase(\.tools)?\b[^\n]*\bdeploy\b/i],
  ["gcloud run deploy command", /\bgcloud\b[^\n]*\brun\b[^\n]*\bdeploy\b/i],
  ["curl smoke endpoint", /\bcurl\b[^\n]*\bsmoke\b/i],
  ["invoke web request smoke endpoint", /\bInvoke-WebRequest\b[^\n]*\bsmoke\b/i],
  ["api admin smoke endpoint", /\/api\/admin\/sales-brain-shadow-smoke/i],
];
for (const [name, re] of DISALLOWED_EXECUTION_HINTS) {
  ok(`doc excludes execute-now hint: ${name}`, !re.test(doc));
}

{
  const selfExecutionBody = self.split("const POSSIBLE_SECRET_PATTERNS")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
  ok("validator no fetch", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no exec call", !/\bexec(File|Sync)?\s*\(/.test(selfExecutionBody));
  ok("validator no spawn call", !/\bspawn(Sync)?\s*\(/.test(selfExecutionBody));
}

console.log(`\nDone v13.8 owner-only plan validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);

