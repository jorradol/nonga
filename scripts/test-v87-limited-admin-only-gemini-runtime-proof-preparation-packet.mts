/**
 * v8.7 — Limited Admin-Only Gemini Runtime-Proof Preparation Packet
 * docs-only / static validation only
 *
 * npm run test:v87-limited-admin-only-gemini-runtime-proof-preparation-packet
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.7-limited-admin-only-gemini-runtime-proof-preparation-packet.md";
const SELF_PATH = "scripts/test-v87-limited-admin-only-gemini-runtime-proof-preparation-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v87-limited-admin-only-gemini-runtime-proof-preparation-packet";

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

console.log("=== v8.7 Limited Admin-Only Gemini Runtime-Proof Preparation Packet Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- baseline labeling ---
ok("doc exists (substantial)", doc.length > 5000, `${doc.length} chars`);
ok("contains v8.7 label", /v8\.7/i.test(doc));
ok("contains preparation packet phrase", /preparation packet/i.test(doc));
ok("contains docs-only statement", /docs-only/i.test(doc));
ok("contains static validation statement", /static validation/i.test(doc));
ok("states not runtime execution", /not runtime execution|ไม่ใช่ runtime execution/i.test(doc));
ok("states not runtime activation", /not runtime activation|ไม่ใช่ runtime activation|ไม่เปิด runtime activation/i.test(doc));
ok("states not real gemini activation", /not.*เปิด Gemini จริง|ไม่เปิด Gemini จริง|not.*Gemini.*real/i.test(doc));

// --- required lineage commits ---
ok("contains v8.4 full commit hash", doc.includes("e7ff98452c65a9b6f80ae45cd36fc14bcc3041be"));
ok("contains v8.5 full commit hash", doc.includes("f23518e3ccc26b7dc9342c735ae635677f932a64"));
ok("contains v8.6 full commit hash", doc.includes("63c4af80e3095508413944d6fdb43ac9028d0d0a"));
ok("contains local = origin status", /local\s*=\s*origin/i.test(doc));
ok("contains working tree clean status", /working tree clean/i.test(doc));

// --- prerequisites before real runtime proof ---
const REQUIRED_PREREQS: Array<[string, RegExp]> = [
  ["owner explicitly signs GO", /owner explicitly signs GO/i],
  ["staging-only boundary confirmed", /staging-only boundary confirmed/i],
  ["admin-only identity boundary confirmed", /admin-only identity\/boundary confirmed/i],
  ["kill switch available", /kill switch available/i],
  ["fallback deterministic verified", /fallback to deterministic verified/i],
  ["budget quota cap defined", /budget\/quota cap defined/i],
  ["secret storage outside repo confirmed", /secret storage method confirmed outside repo/i],
  ["logging redaction policy confirmed", /logging\/redaction policy confirmed/i],
];
for (const [name, re] of REQUIRED_PREREQS) {
  ok(`prerequisite: ${name}`, re.test(doc));
}

// --- checklist section and required headings ---
ok("contains preparation checklist section", /runtime-proof preparation checklist/i.test(doc));
const REQUIRED_CHECKLIST_HEADINGS: Array<[string, RegExp]> = [
  ["environment readiness", /5\.1\s*Environment Readiness/i],
  ["secret readiness", /5\.2\s*Secret Readiness/i],
  ["budget quota readiness", /5\.3\s*Budget\/Quota Readiness/i],
  ["kill switch readiness", /5\.4\s*Kill Switch Readiness/i],
  ["admin-only access readiness", /5\.5\s*Admin-Only Access Readiness/i],
  ["fallback readiness", /5\.6\s*Fallback Readiness/i],
  ["logging redaction readiness", /5\.7\s*Logging\/Redaction Readiness/i],
  ["pdpa pii readiness", /5\.8\s*PDPA\/PII Readiness/i],
  ["dealer isolation readiness", /5\.9\s*Dealer Isolation Readiness/i],
  ["deterministic authority readiness", /5\.10\s*Deterministic Authority Readiness/i],
];
for (const [name, re] of REQUIRED_CHECKLIST_HEADINGS) {
  ok(`checklist heading: ${name}`, re.test(doc));
}

// --- each checklist item field requirement ---
ok("purpose appears for all checklist items", countMatches(doc, /\*\*purpose:\*\*/gi) >= 10);
ok("required evidence appears for all checklist items", countMatches(doc, /\*\*required evidence:\*\*/gi) >= 10);
ok("pass condition appears for all checklist items", countMatches(doc, /\*\*pass condition:\*\*/gi) >= 10);
ok("blocker condition appears for all checklist items", countMatches(doc, /\*\*blocker condition:\*\*/gi) >= 10);
ok("owner review requirement appears for all checklist items", countMatches(doc, /\*\*owner review requirement:\*\*/gi) >= 10);

// --- explicit forbidden actions ---
const REQUIRED_FORBIDDEN_ACTIONS: Array<[string, RegExp]> = [
  ["no production deploy", /no production deploy/i],
  ["no public route", /no public route/i],
  ["no buyer-facing Gemini", /no buyer-facing Gemini/i],
  ["no real lead sending", /no real lead sending/i],
  ["no secret in repo", /no secret in repo/i],
  ["no runtime activation in v8.7", /no runtime activation in v8\.7/i],
];
for (const [name, re] of REQUIRED_FORBIDDEN_ACTIONS) {
  ok(`forbidden action: ${name}`, re.test(doc));
}

// --- owner go requirement ---
ok("contains owner go requirement section", /Owner GO Requirement/i.test(doc));
ok("v8.7 does not grant GO by itself", /v8\.7 does not grant GO by itself/i.test(doc));
ok(
  "runtime proof requires explicit separate owner GO",
  /runtime proof cannot start until owner gives explicit separate GO after reviewing v8\.7/i.test(doc)
);

// --- required safety confirmations ---
const REQUIRED_SAFETY: Array<[string, RegExp]> = [
  ["no deploy", /no deploy|ไม่มี deploy|ไม่ deploy/i],
  ["no production", /no production|ไม่แตะ production/i],
  ["no gemini activation", /no Gemini activation|ไม่เปิด Gemini จริง/i],
  ["no runtime activation", /no runtime activation|ไม่เปิด runtime activation|ไม่ทำ runtime activation/i],
  ["no secret api key", /no secret\/API key|ไม่มี secret\/API key/i],
  ["no src changes", /no src changes|ไม่แตะ `src\/`|ไม่แตะ src/i],
  ["no user-visible ai", /no user-visible AI|ไม่เปิด buyer-facing\/user-visible AI/i],
  ["no real lead sending", /no real lead sending|ไม่มี real lead sending|ไม่ส่ง lead จริง/i],
];
for (const [name, re] of REQUIRED_SAFETY) {
  ok(`safety: ${name}`, re.test(doc));
}

// --- deterministic authority statement ---
ok("deterministic flow remains source of truth", /deterministic flow .*source of truth/i.test(doc));

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
ok("package.json has v8.7 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v8.7 validator script",
  pkg.includes("scripts/test-v87-limited-admin-only-gemini-runtime-proof-preparation-packet.mts")
);

console.log(`\nDone v8.7 limited admin-only runtime-proof preparation packet validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
