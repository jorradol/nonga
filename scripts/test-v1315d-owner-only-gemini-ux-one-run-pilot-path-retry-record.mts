/**
 * v13.15D owner-only Gemini UX one-run pilot-path retry validator
 * Static checks only. No runtime mutation, no provider call.
 *
 * npm run test:v13.15D
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v13.15D-owner-only-gemini-ux-one-run-pilot-path-retry-record.md";
const SELF_PATH =
  "scripts/test-v1315d-owner-only-gemini-ux-one-run-pilot-path-retry-record.mts";

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

console.log(
  "=== v13.15D Owner-Only Gemini UX Pilot-Path Retry Validation ===\n"
);

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ok("doc has substantial content", doc.length > 7800, `${doc.length} chars`);

const executionChecks: Array<[string, RegExp]> = [
  [
    "owner-only pilot-path retry yes",
    /owner-only Gemini UX pilot-path retry:\s*yes/i,
  ],
  ["pilotPathActive prequalified yes", /pilotPathActive prequalified:\s*yes/i],
  ["staging only yes", /staging only:\s*yes/i],
  ["one-run only yes", /one-run only:\s*yes/i],
  ["synthetic data only yes", /synthetic data only:\s*yes/i],
  ["safe-zone only yes", /safe-zone only:\s*yes/i],
  ["production no", /production:\s*no/i],
  ["public route activation no", /public route activation:\s*no/i],
  ["buyer-facing release no", /buyer-facing release:\s*no/i],
  ["real lead sending no", /real lead sending:\s*no/i],
  ["real pii no", /real PII:\s*no/i],
  ["real phone plate vin no", /real phone\/plate\/VIN:\s*no/i],
  ["automatic retry no", /automatic Gemini retry:\s*no/i],
  ["post-run rollback yes", /post-run rollback:\s*yes/i],
];
for (const [name, re] of executionChecks) {
  ok(`execution includes ${name}`, re.test(doc));
}

ok("fresh owner authorization section", /Fresh owner authorization/i.test(doc));
ok(
  "authorization present yes/no",
  /authorization present:\s*(yes|no)/i.test(doc)
);
ok(
  "authorization consumed yes/no",
  /authorization consumed:\s*(yes|no)/i.test(doc)
);
ok("run count allowed 1", /run count allowed:\s*`?1`?/i.test(doc));
ok("run count executed", /run count executed:\s*`?(0\/1|1\/1)`?/i.test(doc));
ok("second run attempted no", /second run attempted:\s*no/i.test(doc));

ok("baseline includes 489db35", /baseline commit.*489db35/i.test(doc));
ok("root cause carried from v13.15C", /Root cause carried from v13\.15C/i.test(doc));
ok("mentions pilot_path_inactive", /pilot_path_inactive/i.test(doc));
ok(
  "runtime evidence before active after rollback section",
  /Runtime\/config masked evidence.*before.*active.*after rollback/is.test(doc)
);
ok("pilot prequalification section", /Pilot path prequalification evidence/i.test(doc));
ok("preflight tests section", /Preflight tests/i.test(doc));
ok("trial scenario section", /Trial scenario/i.test(doc));
ok("execution result section", /Execution result/i.test(doc));
ok("provider dispatch evidence section", /Provider dispatch evidence/i.test(doc));
ok(
  "owner-only ai-first user-visible pilot-path section",
  /Owner-only \/ AI-first \/ user-visible \/ pilot-path gate evidence/i.test(doc)
);
ok(
  "safe-zone boundary evidence section",
  /Safe-zone \/ deterministic boundary evidence/i.test(doc)
);
ok(
  "post-check fallback evidence section",
  /Post-check \/ fallback evidence/i.test(doc)
);
ok("no retry evidence section", /No retry evidence/i.test(doc));
ok("rollback posture section", /Rollback posture/i.test(doc));

const finalAllowed = [
  "READY FOR OWNER APPROVAL TO PREPARE v13.16 OWNER-ONLY UX RETEST SURFACE",
  "HOLD — v13.15D owner-only Gemini UX pilot-path retry incomplete",
  "HOLD — unsafe Gemini UX pilot-path boundary detected",
  "HOLD — pilotPathActive prequalification failed",
];
const finalMatches = finalAllowed.filter((value) => doc.includes(value));
ok(
  "final recommendation is one allowed value",
  finalMatches.length === 1,
  finalMatches.join(" | ")
);

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
  ["second run attempted yes", /second run attempted:\s*yes/i],
];
for (const [name, re] of unsafeClaims) {
  const hasUnsafe = lines.some(
    (line) => re.test(line) && !/\b(no|not|ยังไม่|ห้าม)\b/i.test(line)
  );
  ok(`no unsafe claim ${name}`, !hasUnsafe);
}

ok(
  "validator includes forbidden value scan",
  /forbiddenValuePatterns/.test(self)
);

console.log(`\nDone v13.15D validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
