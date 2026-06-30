/**
 * v9.1 - Admin-Only Runtime Proof Technical Preconditions Packet
 * docs-only / static validation only
 *
 * npm run test:v91:runtime-preconditions
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v9.1-admin-only-runtime-proof-technical-preconditions-packet.md";
const SELF_PATH = "scripts/test-v91-admin-only-runtime-proof-technical-preconditions-packet.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v91:runtime-preconditions";

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

console.log("=== v9.1 Admin-Only Runtime Proof Technical Preconditions Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2400, `${doc.length} chars`);
ok("contains Technical Preconditions Packet", /Technical Preconditions Packet/i.test(doc));
ok("contains admin-only", /admin-only/i.test(doc));
ok(
  "contains source of truth statement",
  /deterministic flow remains source of truth/i.test(doc),
);

const REQUIRED_SECTIONS: Array<[string, RegExp]> = [
  ["Purpose", /^##\s*1\.\s*Purpose/m],
  ["Current Source of Truth", /^##\s*2\.\s*Current Source of Truth/m],
  ["Admin-Only Boundary Preconditions", /^##\s*3\.\s*Admin-Only Boundary Preconditions/m],
  ["Environment Variable Preconditions", /^##\s*4\.\s*Environment Variable Preconditions/m],
  ["Kill Switch Preconditions", /^##\s*5\.\s*Kill Switch Preconditions/m],
  ["Fallback Preconditions", /^##\s*6\.\s*Fallback Preconditions/m],
  ["Logging Redaction Preconditions", /^##\s*7\.\s*Logging Redaction Preconditions/m],
  ["Quota Cap Preconditions", /^##\s*8\.\s*Quota Cap Preconditions/m],
  ["Forbidden Actions in v9.1", /^##\s*9\.\s*Forbidden Actions in v9\.1/m],
  ["Exit Criteria Before Any Runtime-Touching Work", /^##\s*10\.\s*Exit Criteria Before Any Runtime-Touching Work/m],
];
for (const [name, re] of REQUIRED_SECTIONS) {
  ok(`contains section: ${name}`, re.test(doc));
}

const REQUIRED_PHRASES: Array<[string, RegExp]> = [
  ["no src changes", /no src changes/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no runtime activation", /no runtime activation/i],
  ["no Gemini activation", /no Gemini activation/i],
  ["no real secret/API key in repo", /no real secret\/API key in repo/i],
  ["no buyer-facing AI", /no buyer-facing AI/i],
  ["no user-visible AI", /no user-visible AI/i],
  ["no real lead sending", /no real lead sending/i],
];
for (const [name, re] of REQUIRED_PHRASES) {
  ok(`contains phrase: ${name}`, re.test(doc));
}

const REQUIRED_ENV_NAMES = [
  "GEMINI_API_KEY",
  "AI_RUNTIME_PROOF_ENABLED",
  "AI_ADMIN_RUNTIME_PROOF_ONLY",
  "AI_RUNTIME_PROOF_QUOTA_LIMIT",
  "AI_LOG_REDACTION_ENABLED",
];
for (const envName of REQUIRED_ENV_NAMES) {
  const re = new RegExp(`\\b${envName}\\b`);
  ok(`contains env var name: ${envName}`, re.test(doc));
}
for (const envName of REQUIRED_ENV_NAMES) {
  const assignRe = new RegExp(`\\b${envName}\\b\\s*[:=]\\s*\\S+`, "i");
  ok(`env var name only (no value): ${envName}`, !assignRe.test(doc));
}

const FORBIDDEN_CLAIMS: Array<[string, RegExp]> = [
  ["claims Gemini already activated", /Gemini(?:\s+จริง)?\s*(?:activated|live|enabled|เปิดแล้ว|ใช้งานแล้ว|เปิดใช้งานแล้ว)/i],
  [
    "claims production ready",
    /\b(?:production\s*(?:is\s*)?(?:ready|live|พร้อมแล้ว|พร้อมใช้งานแล้ว)|production GO\s*(?:approved|granted|signed|อนุมัติแล้ว))\b/i,
  ],
  [
    "claims runtime proof already activated",
    /runtime proof\s*(?:activated|live|enabled|เปิดแล้ว|เปิดใช้งานแล้ว|เรียบร้อยแล้ว|completed|done)/i,
  ],
];
for (const [name, re] of FORBIDDEN_CLAIMS) {
  ok(`no forbidden claim: ${name}`, !re.test(doc));
}

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key (AIza...)", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai style key (sk-...)", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{16,}/],
  ["generic secret assignment", /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{10,}["']/i],
];
for (const [name, re] of SECRET_PATTERNS) {
  ok(`no secret pattern: ${name}`, !re.test(doc));
}

{
  const head = self.split("const SECRET_PATTERNS")[0] ?? self;
  ok("script uses readFileSync", /readFileSync/.test(head));
  ok("script no fetch", !/\bfetch\s*\(/.test(head));
  ok("script no child_process import", !/node:child_process/.test(head));
  ok("script no shell exec", !/\bexec(?:Sync)?\s*\(/.test(head));
  ok("script no process.env read", !/process\.env/.test(head));
}

ok("package.json has v9.1 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v9.1 validator script",
  pkg.includes("scripts/test-v91-admin-only-runtime-proof-technical-preconditions-packet.mts"),
);

console.log(`\nDone v9.1 runtime-preconditions validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
