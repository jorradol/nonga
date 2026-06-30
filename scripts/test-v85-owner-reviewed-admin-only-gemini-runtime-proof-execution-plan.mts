/**
 * v8.5 — Owner-Reviewed Admin-Only Gemini Shadow Runtime-Proof Execution Plan
 * docs-only / static validation only
 *
 * npm run test:v85-owner-reviewed-admin-only-gemini-runtime-proof-execution-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.5-owner-reviewed-admin-only-gemini-runtime-proof-execution-plan.md";
const SELF_PATH = "scripts/test-v85-owner-reviewed-admin-only-gemini-runtime-proof-execution-plan.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v85-owner-reviewed-admin-only-gemini-runtime-proof-execution-plan";

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

function countMatches(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0;
}

console.log("=== v8.5 Owner-Reviewed Admin-Only Gemini Runtime-Proof Execution Plan Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- baseline labeling ---
ok("doc exists (substantial)", doc.length > 7000, `${doc.length} chars`);
ok("contains v8.5 label", /v8\.5/i.test(doc));
ok("contains owner-reviewed execution plan phrase", /owner-reviewed.*execution plan|execution plan.*owner review/i.test(doc));
ok("contains docs-only statement", /docs-only/i.test(doc));
ok("contains static validation statement", /static validation/i.test(doc));
ok("states plan only not runtime execution", /execution plan .*เท่านั้น|not runtime execution|ยังไม่ใช่ runtime execution/i.test(doc));

// --- v8.4 reference requirement ---
ok("references v8.4 milestone", /v8\.4-admin-only-gemini-shadow-runtime-proof-planning-packet/i.test(doc));
ok("contains full commit hash from v8.4", doc.includes("e7ff98452c65a9b6f80ae45cd36fc14bcc3041be"));
ok("contains short commit hash e7ff984", /\be7ff984\b/.test(doc));
ok("contains local = origin status", /local\s*=\s*origin/i.test(doc));
ok("contains working tree clean status", /working tree clean/i.test(doc));

// --- phase headings 0-7 ---
const REQUIRED_PHASES: Array<[string, RegExp]> = [
  ["phase 0 preflight", /Phase 0:\s*Preflight Verification/i],
  ["phase 1 secret readiness", /Phase 1:\s*Secret Readiness Check/i],
  ["phase 2 admin-only route boundary", /Phase 2:\s*Admin-Only Route\/Boundary Proof Plan/i],
  ["phase 3 kill switch", /Phase 3:\s*Kill Switch Proof Plan/i],
  ["phase 4 fallback", /Phase 4:\s*Fallback Proof Plan/i],
  ["phase 5 logging redaction", /Phase 5:\s*Logging\/Redaction Proof Plan/i],
  ["phase 6 quota budget guard", /Phase 6:\s*Quota\/Budget Guard Proof Plan/i],
  ["phase 7 owner evidence review", /Phase 7:\s*Owner Evidence Review/i],
];
for (const [name, re] of REQUIRED_PHASES) {
  ok(`phase heading present: ${name}`, re.test(doc));
}

// --- required fields in every phase (8 phases) ---
ok("objective appears for all 8 phases", countMatches(doc, /\*\*objective:\*\*/gi) >= 8);
ok("exact action allowed appears for all 8 phases", countMatches(doc, /\*\*exact action allowed:\*\*/gi) >= 8);
ok("forbidden action appears for all 8 phases", countMatches(doc, /\*\*forbidden action:\*\*/gi) >= 8);
ok("evidence to collect appears for all 8 phases", countMatches(doc, /\*\*evidence to collect:\*\*/gi) >= 8);
ok("pass criteria appears for all 8 phases", countMatches(doc, /\*\*pass criteria:\*\*/gi) >= 8);
ok("fail block condition appears for all 8 phases", countMatches(doc, /\*\*fail\/block condition:\*\*/gi) >= 8);
ok("rollback stop condition appears for all 8 phases", countMatches(doc, /\*\*rollback\/stop condition:\*\*/gi) >= 8);
ok("owner sign-off gate appears for all 8 phases", countMatches(doc, /\*\*owner sign-off gate:\*\*/gi) >= 8);

// --- owner decision gate ---
ok("contains owner decision gate section", /Owner Decision Gate/i.test(doc));
ok("contains GO to limited admin-only runtime proof", /GO to limited admin-only runtime proof/i.test(doc));
ok("contains HOLD for more docs checks", /HOLD for more docs\/checks/i.test(doc));
ok("contains NO-GO", /\bNO-GO\b/.test(doc));

// --- explicit non-activation requirements ---
ok("explicitly confirms not real Gemini activation", /ไม่ใช่การเปิด Gemini จริง|not.*open.*Gemini.*real/i.test(doc));
ok("explicitly confirms not user-visible AI", /ไม่ใช่ user-visible AI|not.*user-visible AI/i.test(doc));
ok("explicitly confirms deterministic flow source of truth", /deterministic flow .*source of truth/i.test(doc));

// --- required safety confirmations ---
const REQUIRED_SAFETY: Array<[string, RegExp]> = [
  ["no deploy", /ไม่ deploy|no deploy/i],
  ["no production touch", /ไม่แตะ production|no production touch/i],
  ["no real gemini", /ไม่เปิด Gemini จริง|no gemini/i],
  ["no secrets api keys", /ไม่มี secret\/API key จริง|no secret\/API key/i],
  ["no buyer facing ai", /ไม่เปิด buyer-facing\/user-visible AI|no buyer-facing\/user-visible AI/i],
  ["no real lead sending", /ไม่ส่ง lead จริง|no real lead sending/i],
  ["no runtime activation", /ไม่ทำ runtime activation จริง|no runtime activation/i],
  ["no src runtime touch", /ไม่แตะ `src\/` หรือ runtime|no `src\/` or runtime/i],
];
for (const [name, re] of REQUIRED_SAFETY) {
  ok(`safety: ${name}`, re.test(doc));
}

// --- forbidden activation claims ---
const FORBIDDEN_ACTIVATION_CLAIMS: Array<[string, RegExp]> = [
  ["claims gemini already active", /Gemini(?:\s+จริง)?\s*(?:เปิดแล้ว|activated|live|ใช้งานแล้ว|ถูกเปิดใช้งานแล้ว)/i],
  ["claims runtime activation completed", /runtime activation\s*(?:completed|done|เปิดแล้ว|เรียบร้อยแล้ว)/i],
  ["claims user-visible ai enabled", /user-visible AI\s*(?:เปิดแล้ว|enabled|live|ใช้งานแล้ว)/i],
];
for (const [name, re] of FORBIDDEN_ACTIVATION_CLAIMS) {
  ok(`no forbidden activation claim: ${name}`, !re.test(doc));
}

// --- forbidden secret/api key patterns ---
const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key (AIza...)", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai style key (sk-...)", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
  ["generic secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
];
for (const [name, re] of SECRET_PATTERNS) {
  ok(`no secret pattern: ${name}`, !re.test(doc));
}

// --- validator itself must remain static ---
{
  const head = self.split("// --- validator itself must remain static ---")[0] ?? self;
  ok("script uses readFileSync", /readFileSync/.test(head));
  ok("script no fetch", !/\bfetch\s*\(/.test(head));
  ok("script no child_process import", !/node:child_process/.test(head));
  ok("script no shell exec", !/\bexec(?:Sync)?\s*\(/.test(head));
  ok("script no process.env read", !/process\.env/.test(head));
}

// --- package.json wiring ---
ok("package.json has v8.5 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v8.5 validator script",
  pkg.includes("scripts/test-v85-owner-reviewed-admin-only-gemini-runtime-proof-execution-plan.mts")
);

console.log(`\nDone v8.5 owner-reviewed runtime-proof execution plan validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
