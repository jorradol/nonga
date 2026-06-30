/**
 * v8.6 — Owner Decision Gate Review Packet
 * docs-only / static validation only
 *
 * npm run test:v86-owner-decision-gate-review-packet
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.6-owner-decision-gate-review-packet.md";
const SELF_PATH = "scripts/test-v86-owner-decision-gate-review-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v86-owner-decision-gate-review-packet";

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

console.log("=== v8.6 Owner Decision Gate Review Packet Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- baseline labeling ---
ok("doc exists (substantial)", doc.length > 4000, `${doc.length} chars`);
ok("contains v8.6 label", /v8\.6/i.test(doc));
ok("contains owner decision gate phrase", /owner decision gate review packet/i.test(doc));
ok("contains docs-only statement", /docs-only/i.test(doc));
ok("contains static validation statement", /static validation/i.test(doc));
ok("states packet only not runtime execution", /review packet เท่านั้น|not runtime execution|ไม่ใช่ runtime execution/i.test(doc));

// --- required lineage commits ---
ok("contains v8.4 full commit hash", doc.includes("e7ff98452c65a9b6f80ae45cd36fc14bcc3041be"));
ok("contains v8.5 full commit hash", doc.includes("f23518e3ccc26b7dc9342c735ae635677f932a64"));
ok("contains local = origin status", /local\s*=\s*origin/i.test(doc));
ok("contains working tree clean status", /working tree clean/i.test(doc));

// --- current state snapshot ---
ok("states Gemini not activated", /Gemini ยังไม่เปิดจริง|no Gemini activation|ไม่เปิด Gemini จริง/i.test(doc));
ok("states admin-only runtime proof not executed", /admin-only runtime proof ยังไม่เกิดขึ้น|not.*runtime proof.*yet/i.test(doc));
ok("states user-visible AI off", /user-visible AI ยังปิด|no user-visible AI|ไม่เปิด buyer-facing\/user-visible AI/i.test(doc));
ok("states no real secret in repo", /ไม่มี secret\/API key จริง|no secret\/API key/i.test(doc));
ok("states deterministic source of truth", /deterministic flow .*source of truth/i.test(doc));

// --- owner decision gate table & required columns ---
ok("contains owner decision gate table section", /Owner Decision Gate Table/i.test(doc));
ok("contains GO decision row", /GO to limited admin-only runtime proof preparation/i.test(doc));
ok("contains HOLD decision row", /HOLD for more review\/checks/i.test(doc));
ok("contains NO-GO decision row", /NO-GO\s*\/\s*do not proceed/i.test(doc));
ok("contains meaning column", /\|\s*decision\s*\|\s*meaning\s*\|/i.test(doc));
ok("contains allowed next column", /\|\s*decision\s*\|.*what is allowed next/i.test(doc));
ok("contains remains forbidden column", /\|\s*decision\s*\|.*what remains forbidden/i.test(doc));
ok("contains required evidence column", /\|\s*decision\s*\|.*required evidence before next step/i.test(doc));
ok("contains rollback stop column", /\|\s*decision\s*\|.*rollback\/stop expectation/i.test(doc));

// --- risk checklist coverage ---
const REQUIRED_RISKS: Array<[string, RegExp]> = [
  ["secret exposure risk", /secret exposure risk/i],
  ["budget quota risk", /budget\/quota risk/i],
  ["kill switch risk", /kill switch risk/i],
  ["admin-only boundary risk", /admin-only boundary risk/i],
  ["fallback risk", /fallback risk/i],
  ["logging redaction risk", /logging\/redaction risk/i],
  ["pii pdpa risk", /PII\/PDPA risk/i],
  ["dealer isolation risk", /dealer isolation risk/i],
  ["user-visible ai leakage risk", /user-visible AI leakage risk/i],
  ["deterministic authority risk", /deterministic authority risk/i],
];
for (const [name, re] of REQUIRED_RISKS) {
  ok(`risk checklist item: ${name}`, re.test(doc));
}

// --- owner sign-off choices ---
ok("contains owner sign-off template section", /Owner Sign-Off Template/i.test(doc));
ok("contains I choose GO", /I choose GO/i.test(doc));
ok("contains I choose HOLD", /I choose HOLD/i.test(doc));
ok("contains I choose NO-GO", /I choose NO-GO/i.test(doc));
ok("contains reason note field", /reason\/note/i.test(doc));
ok("contains date field", /\bdate\b/i.test(doc));

// --- explicit recommendation ---
ok("default recommendation HOLD", /default recommendation\s*=\s*.*HOLD/i.test(doc));
ok("requires explicit owner GO approval", /without explicit owner approval|explicitly signs GO/i.test(doc));

// --- required safety confirmations ---
const REQUIRED_SAFETY: Array<[string, RegExp]> = [
  ["no deploy", /no deploy|ไม่ deploy/i],
  ["no production", /no production|ไม่แตะ production/i],
  ["no gemini activation", /no Gemini activation|ไม่เปิด Gemini จริง/i],
  ["no runtime activation", /no runtime activation|ไม่เปิด runtime activation|ไม่ทำ runtime activation/i],
  ["no secret api key", /no secret\/API key|ไม่มี secret\/API key จริง/i],
  ["no src changes", /no src changes|ไม่แตะ `src\/`|ไม่แตะ src/i],
  ["no user-visible ai", /no user-visible AI|ไม่เปิด buyer-facing\/user-visible AI/i],
  ["no real lead sending", /no real lead sending|ไม่มี real lead sending|ไม่ส่ง lead จริง/i],
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
ok("package.json has v8.6 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok("package.json points to v8.6 validator script", pkg.includes("scripts/test-v86-owner-decision-gate-review-packet.mts"));

// --- minimum structural checkpoints ---
ok("risk checklist has at least 10 items", countMatches(doc, /^- \[ \]/gm) >= 10);
ok("decision rows at least 3", countMatches(doc, /^\| (GO|HOLD|NO-GO)/gim) >= 3);

console.log(`\nDone v8.6 owner decision gate review packet validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
