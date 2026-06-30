/**
 * v8.3 — Owner Evidence Review / Gate Decision Packet
 * docs-only / static validation only
 *
 * npm run test:v83-owner-evidence-review-gate-decision-packet
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.3-owner-evidence-review-gate-decision-packet.md";
const SELF_PATH = "scripts/test-v83-owner-evidence-review-gate-decision-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v83-owner-evidence-review-gate-decision-packet";

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

console.log("=== v8.3 Owner Evidence Review / Gate Decision Packet Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- baseline document labeling ---
ok("doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
ok("contains v8.3 label", /v8\.3/i.test(doc));
ok("contains owner evidence review phrase", /owner evidence review/i.test(doc));
ok("contains gate decision packet phrase", /gate decision packet/i.test(doc));
ok("contains docs-only statement", /docs-only/i.test(doc));
ok("contains static validation statement", /static validation/i.test(doc));

// --- latest status from v8.2A ---
ok("contains latest full hash from v8.2A", doc.includes("83e743cdb4ac4655f72eeeedf940e45787ea12cc"));
ok("contains local = origin status", /local\s*=\s*origin/i.test(doc));
ok("contains working tree clean status", /working tree clean/i.test(doc));
ok("contains v8.2A validation result 63 pass", /63 PASS,\s*0 FAIL/i.test(doc));

// --- gate presence and decision labels ---
ok("contains gate b review table", /Gate B Review Table/i.test(doc));
ok("contains gate c review table", /Gate C Review Table/i.test(doc));
ok("contains PASS decision label", /\bPASS\b/.test(doc));
ok("contains HOLD decision label", /\bHOLD\b/.test(doc));
ok("contains NO-GO decision label", /\bNO-GO\b/.test(doc));
ok("contains owner decision matrix", /Owner Decision Matrix/i.test(doc));

// --- required critical blockers ---
const CRITICAL_BLOCKERS: Array<[string, RegExp]> = [
  ["owner sign-off missing", /owner sign-off ยังไม่มี|owner sign-off.*ยังไม่มี/i],
  ["secret wiring runtime proof missing", /secret wiring runtime proof ยังไม่มี/i],
  ["budget quota cap runtime proof missing", /budget\/quota cap runtime proof ยังไม่มี/i],
  ["kill switch runtime proof missing", /kill switch runtime proof ยังไม่มี/i],
  ["admin-only boundary runtime proof missing", /admin-only boundary runtime proof ยังไม่มี/i],
  ["fallback logging redaction runtime proof missing", /fallback\/logging-redaction runtime proof ยังไม่มี/i],
];
for (const [name, re] of CRITICAL_BLOCKERS) {
  ok(`critical blocker: ${name}`, re.test(doc));
}

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

// --- PDPA/privacy/lead/dealer isolation guardrails ---
const REQUIRED_GUARDRAILS: Array<[string, RegExp]> = [
  ["pdpa section exists", /PDPA/i],
  ["phone must be user-entered", /phone ต้องให้ลูกค้ากรอกเอง/i],
  ["lead preview before send", /lead preview ก่อนส่ง/i],
  ["final confirmation before send", /final confirmation ก่อนส่ง/i],
  ["lead consent present", /lead consent/i],
  ["plate present", /plate/i],
  ["vin present", /VIN/i],
  ["plate vin masking requirement", /plate\/VIN ไม่แสดงเต็ม/i],
  ["dealer isolation not changed", /dealer isolation ต้องไม่ถูกเปลี่ยน/i],
  ["thor auto sandbox must not mix", /Thor Auto \/ sandbox dealer ห้ามปนกัน/i],
  ["deterministic authority present", /deterministic authority/i],
];
for (const [name, re] of REQUIRED_GUARDRAILS) {
  ok(`guardrail: ${name}`, re.test(doc));
}

// --- forbidden "already activated" claims ---
const FORBIDDEN_ACTIVATION_CLAIMS: Array<[string, RegExp]> = [
  ["claims gemini already active", /Gemini(?:\s+จริง)?\s*(?:เปิดแล้ว|activated|live)/i],
  ["claims admin-only shadow already active", /admin-only shadow\s*(?:เปิดแล้ว|activated|live)/i],
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

// --- next step guidance ---
ok("contains explicit recommendation", /Current recommendation:\s*\*\*HOLD\*\*/i.test(doc));
ok("guidance says do not enable real gemini immediately", /ห้ามเปิด Gemini จริงทันที/i.test(doc));
ok("guidance allows only v8.4 runtime-proof planning or sign-off prep", /v8\.4 runtime-proof planning|owner sign-off preparation/i.test(doc));

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
ok("package.json has v8.3 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v8.3 validator script",
  pkg.includes("scripts/test-v83-owner-evidence-review-gate-decision-packet.mts")
);

console.log(`\nDone v8.3 owner evidence review validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
