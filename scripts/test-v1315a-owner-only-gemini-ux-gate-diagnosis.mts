/**
 * v13.15A owner-only Gemini UX gate diagnosis validator
 * Static checks only. No Gemini/network/endpoint dispatch.
 *
 * npm run test:v13.15A
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.15A-owner-only-gemini-ux-gate-diagnosis.md";
const SELF_PATH = "scripts/test-v1315a-owner-only-gemini-ux-gate-diagnosis.mts";

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

console.log("=== v13.15A Owner-Only Gemini UX Gate Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ok("doc has substantial content", doc.length > 6000, `${doc.length} chars`);

const executionChecks: Array<[string, RegExp]> = [
  ["gate diagnosis yes", /gate diagnosis:\s*yes/i],
  ["prepare-only preferred yes", /prepare-only preferred:\s*yes/i],
  ["docs test package preferred yes", /docs\/test\/package preferred:\s*yes/i],
  ["gemini execution no", /Gemini execution:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["smoke endpoint call no", /smoke endpoint call:\s*no/i],
  ["production no", /production:\s*no/i],
  ["public route activation no", /public route activation:\s*no/i],
  ["buyer-facing release no", /buyer-facing release:\s*no/i],
  ["real lead sending no", /real lead sending:\s*no/i],
  ["real pii no", /real PII:\s*no/i],
  ["automatic retry no", /automatic Gemini retry:\s*no/i],
];
for (const [name, re] of executionChecks) {
  ok(`execution includes ${name}`, re.test(doc));
}

ok("baseline includes ac2e2a8", /baseline commit.*ac2e2a8/i.test(doc));
ok("root cause ai_first_disabled present", /ai_first_disabled/i.test(doc));
ok("root cause points to user visible gate", /evaluateUserVisibleGate|checkUserVisiblePrerequisites/i.test(doc));
ok("required flags section exists", /Required flags for actual Gemini UX dispatch/i.test(doc));
ok("gate order section exists", /Gate order summary/i.test(doc));
ok("safe activation recipe exists", /Safe activation recipe/i.test(doc));

const requiredFlagMentions = [
  "NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED",
  "NONGA_AI_USER_VISIBLE_ENABLED",
  "NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED",
  "NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS",
  "NONGA_AI_FIRST_ENABLED",
  "NONGA_AI_PROVIDER",
  "NONGA_AI_MODE",
];
for (const flag of requiredFlagMentions) {
  ok(`mentions required flag ${flag}`, doc.includes(flag));
}

const finalAllowed = [
  "READY FOR OWNER APPROVAL TO EXECUTE v13.15B OWNER-ONLY GEMINI UX ONE-RUN DISPATCH RETRY",
  "HOLD — Gemini UX gate diagnosis incomplete",
  "HOLD — unsafe Gemini UX activation boundary detected",
];
const finalMatches = finalAllowed.filter((value) => doc.includes(value));
ok("final recommendation is one allowed value", finalMatches.length === 1, finalMatches.join(" | "));

const forbiddenValuePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
  ["token assignment", /\btoken\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["secret assignment", /\bsecret\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["api key assignment", /\bapi[_-]?key\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["real phone digits", /\b0[689]\d{8}\b/],
  ["plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenValuePatterns) {
  ok(`no forbidden value ${name}`, !re.test(doc));
}

const unsafeClaims: Array<[string, RegExp]> = [
  ["gemini dispatch success", /\bGemini dispatch (?:success|successful|สำเร็จแล้ว)\b/i],
  ["public enabled", /\bpublic\b.*\b(opened|enabled|active|released|live)\b/i],
  ["production enabled", /\bproduction\b.*\b(opened|enabled|active|released|live)\b/i],
  ["buyer-facing enabled", /\bbuyer-facing\b.*\b(opened|enabled|active|released|live)\b/i],
  ["real lead sent", /\breal lead\b.*\b(sent|submitted|created)\b/i],
];
for (const [name, re] of unsafeClaims) {
  const hasUnsafe = lines.some((line) => re.test(line) && !/\b(no|not|ยังไม่|ห้าม)\b/i.test(line));
  ok(`no unsafe claim ${name}`, !hasUnsafe);
}

ok("validator includes secret scan", /forbiddenValuePatterns/.test(self));

console.log(`\nDone v13.15A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
