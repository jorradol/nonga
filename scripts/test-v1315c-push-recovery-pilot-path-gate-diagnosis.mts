/**
 * v13.15C push recovery + pilot path gate diagnosis validator
 * Static checks only. No runtime mutation/no provider call.
 *
 * npm run test:v13.15C
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.15C-push-recovery-pilot-path-gate-diagnosis.md";
const SELF_PATH =
  "scripts/test-v1315c-push-recovery-pilot-path-gate-diagnosis.mts";

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

console.log("=== v13.15C Push Recovery + Pilot Gate Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ok("doc has substantial content", doc.length > 6200, `${doc.length} chars`);

const executionChecks: Array<[string, RegExp]> = [
  ["push recovery yes", /push recovery:\s*yes/i],
  ["pilot diagnosis yes", /pilot path gate diagnosis:\s*yes/i],
  ["gemini execution no", /Gemini execution:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["runtime config change no", /runtime config change:\s*no/i],
  ["deploy no", /deploy:\s*no/i],
  ["smoke endpoint no", /smoke endpoint call:\s*no/i],
  ["production no", /production:\s*no/i],
  ["public route no", /public route activation:\s*no/i],
  ["buyer-facing release no", /buyer-facing release:\s*no/i],
  ["real lead no", /real lead sending:\s*no/i],
  ["real pii no", /real PII:\s*no/i],
  ["automatic retry no", /automatic Gemini retry:\s*no/i],
];
for (const [name, re] of executionChecks) {
  ok(`execution includes ${name}`, re.test(doc));
}

ok("has baseline and git state section", /Baseline and git state/i.test(doc));
ok("includes local v13.15B commit", /5390b1b77a8de0b50ff1544645999e434ed87bb9/.test(doc));
ok("includes origin pre-recovery hash", /edc90e1709b365c72a4bbb00e26367b39b7e94a6/.test(doc));
ok("has push recovery result section", /Push recovery result/i.test(doc));
ok("carries v13.15B result section", /v13\.15B result carried forward/i.test(doc));
ok("mentions pilot_path_inactive", /pilot_path_inactive/i.test(doc));
ok("has root cause section", /Root cause of `pilot_path_inactive`|Root cause of pilot_path_inactive/i.test(doc));
ok("has required pilot activation conditions", /Required pilot activation conditions/i.test(doc));
ok("has gate order summary", /Gate order after AI-first\/user-visible gates/i.test(doc));
ok("has safe activation recipe", /Safe activation recipe for next retry/i.test(doc));
ok("has risk review", /Risk review/i.test(doc));
ok("has no-execution evidence", /No Gemini \/ no runtime change \/ no deploy evidence/i.test(doc));

const finalAllowed = [
  "READY FOR OWNER APPROVAL TO EXECUTE v13.15D OWNER-ONLY GEMINI UX ONE-RUN PILOT-PATH RETRY",
  "HOLD — push recovery incomplete",
  "HOLD — pilot path gate diagnosis incomplete",
  "HOLD — unsafe pilot activation boundary detected",
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
  ["gemini dispatch success claim", /\bGemini dispatch (?:success|successful|สำเร็จแล้ว)\b/i],
  ["public enabled", /\bpublic\b.*\b(opened|enabled|active|released|live)\b/i],
  ["production enabled", /\bproduction\b.*\b(opened|enabled|active|released|live)\b/i],
  ["buyer-facing enabled", /\bbuyer-facing\b.*\b(opened|enabled|active|released|live)\b/i],
  ["real lead sent", /\breal lead\b.*\b(sent|submitted|created)\b/i],
];
for (const [name, re] of unsafeClaims) {
  const hasUnsafe = lines.some((line) => re.test(line) && !/\b(no|not|ยังไม่|ห้าม)\b/i.test(line));
  ok(`no unsafe claim ${name}`, !hasUnsafe);
}

ok("validator includes forbidden value scan", /forbiddenValuePatterns/.test(self));

console.log(`\nDone v13.15C validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
