/**
 * v8.4 — Admin-Only Gemini Shadow Runtime-Proof Planning Packet
 * docs-only / static validation only
 *
 * npm run test:v84-admin-only-gemini-shadow-runtime-proof-planning-packet
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.4-admin-only-gemini-shadow-runtime-proof-planning-packet.md";
const SELF_PATH = "scripts/test-v84-admin-only-gemini-shadow-runtime-proof-planning-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v84-admin-only-gemini-shadow-runtime-proof-planning-packet";

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

console.log("=== v8.4 Admin-Only Gemini Shadow Runtime-Proof Planning Packet Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- baseline labeling ---
ok("doc exists (substantial)", doc.length > 5000, `${doc.length} chars`);
ok("contains v8.4 label", /v8\.4/i.test(doc));
ok("contains runtime-proof planning phrase", /runtime-proof planning/i.test(doc));
ok("contains docs-only statement", /docs-only/i.test(doc));
ok("contains static validation statement", /static validation/i.test(doc));
ok("states planning only not runtime proof real", /planning เท่านั้น|ยังไม่ใช่ runtime proof จริง/i.test(doc));

// --- latest status from v8.3 ---
ok("contains latest full hash from v8.3", doc.includes("cbd2a78eb1b8279364fb80a99393cd03bf854eed"));
ok("contains local = origin status", /local\s*=\s*origin/i.test(doc));
ok("contains working tree clean status", /working tree clean/i.test(doc));
ok("contains v8.3 validation result 58 pass", /58 PASS,\s*0 FAIL/i.test(doc));

// --- proof plans: 7 categories required ---
const REQUIRED_PLAN_HEADINGS: Array<[string, RegExp]> = [
  ["secret wiring plan", /Secret Wiring Proof Plan/i],
  ["budget quota cap plan", /Budget\/Quota Cap Proof Plan/i],
  ["kill switch plan", /Kill Switch Proof Plan/i],
  ["admin-only boundary plan", /Admin-Only Boundary Proof Plan/i],
  ["fallback behavior plan", /Fallback Behavior Proof Plan/i],
  ["logging redaction plan", /Logging\/Redaction Proof Plan/i],
  ["deterministic authority plan", /Deterministic Authority Proof Plan/i],
];
for (const [name, re] of REQUIRED_PLAN_HEADINGS) {
  ok(`proof plan present: ${name}`, re.test(doc));
}

// --- each plan must include required fields ---
ok("objective appears for all 7 plans", countMatches(doc, /\*\*objective:\*\*/gi) >= 7);
ok("prerequisite appears for all 7 plans", countMatches(doc, /\*\*prerequisite:\*\*/gi) >= 7);
ok("evidence to collect appears for all 7 plans", countMatches(doc, /\*\*evidence to collect:\*\*/gi) >= 7);
ok("acceptable evidence appears for all 7 plans", countMatches(doc, /\*\*acceptable evidence:\*\*/gi) >= 7);
ok("failure blocker condition appears for all 7 plans", countMatches(doc, /\*\*failure\/blocker condition:\*\*/gi) >= 7);
ok("rollback stop condition appears for all 7 plans", countMatches(doc, /\*\*rollback\/stop condition:\*\*/gi) >= 7);
ok("owner sign-off requirement appears for all 7 plans", countMatches(doc, /\*\*owner sign-off requirement:\*\*/gi) >= 7);

// --- owner decision section ---
ok("contains owner decision section", /Owner Decision Section/i.test(doc));
ok("contains GO decision", /\bGO\b/.test(doc));
ok("contains HOLD decision", /\bHOLD\b/.test(doc));
ok("contains NO-GO decision", /\bNO-GO\b/.test(doc));

// --- required safety confirmations ---
const REQUIRED_SAFETY: Array<[string, RegExp]> = [
  ["no deploy", /no deploy|ไม่ deploy|ไม่มี deploy/i],
  ["no production touch", /no production touch|ไม่แตะ production/i],
  ["no gemini activation", /no Gemini activation|ไม่เปิด Gemini จริง/i],
  ["no admin-only shadow activation", /no admin-only shadow activation|ไม่เปิด admin-only shadow จริง/i],
  ["no buyer-facing user-visible ai", /no buyer-facing\/user-visible AI|ไม่เปิด buyer-facing\/user-visible AI จริง/i],
  ["no secret api key", /no secret\/API key|ไม่ใส่ secret\/API key จริง/i],
  ["no src runtime change", /no `src\/` or runtime change|no `src\/` หรือ runtime change|ไม่แตะ `src\/` หรือ runtime/i],
  ["no real lead sending", /no real lead sending|ไม่ส่ง lead จริง/i],
  ["deterministic source of truth", /deterministic flow remains source of truth|deterministic flow ยังเป็น source of truth/i],
];
for (const [name, re] of REQUIRED_SAFETY) {
  ok(`safety: ${name}`, re.test(doc));
}

// --- PDPA/privacy/dealer isolation/deterministic authority keywords ---
const REQUIRED_GUARDRAILS: Array<[string, RegExp]> = [
  ["pdpa present", /PDPA/i],
  ["phone present", /phone/i],
  ["phone user-entered requirement", /phone ต้องให้ลูกค้ากรอกเอง/i],
  ["plate present", /plate/i],
  ["vin present", /VIN/i],
  ["lead consent present", /lead consent/i],
  ["lead preview present", /lead preview ก่อนส่ง/i],
  ["final confirmation present", /final confirmation ก่อนส่ง/i],
  ["dealer isolation present", /dealer isolation/i],
  ["thor auto sandbox separation", /Thor Auto \/ sandbox dealer ห้ามปนกัน/i],
  ["deterministic authority present", /deterministic authority/i],
  ["logging redact pii secret", /logging ต้อง redact PII\/secrets/i],
];
for (const [name, re] of REQUIRED_GUARDRAILS) {
  ok(`guardrail: ${name}`, re.test(doc));
}

// --- explicit recommendation required ---
ok("current state hold for real activation", /Current state remains \*\*HOLD\*\* for real admin-only Gemini shadow activation/i.test(doc));
ok("next step is owner-reviewed execution plan not real activation", /owner-reviewed runtime-proof execution plan, not real activation/i.test(doc));

// --- forbidden "already activated" claims ---
const FORBIDDEN_ACTIVATION_CLAIMS: Array<[string, RegExp]> = [
  ["claims gemini already active", /Gemini(?:\s+จริง)?\s*(?:เปิดแล้ว|activated|live|ใช้งานแล้ว|ถูกเปิดใช้งานแล้ว)/i],
  ["claims admin-only shadow already active", /admin-only shadow\s*(?:เปิดแล้ว|activated|live|ใช้งานแล้ว|ถูกเปิดใช้งานแล้ว)/i],
  ["claims runtime activation already completed", /runtime activation\s*(?:completed|done|เปิดแล้ว|เรียบร้อยแล้ว)/i],
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
ok("package.json has v8.4 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v8.4 validator script",
  pkg.includes("scripts/test-v84-admin-only-gemini-shadow-runtime-proof-planning-packet.mts")
);

console.log(`\nDone v8.4 runtime-proof planning packet validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
