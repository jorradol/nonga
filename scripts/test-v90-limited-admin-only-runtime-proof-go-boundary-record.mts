/**
 * v9.0 - Limited Admin-Only Runtime Proof GO Boundary Record
 * docs-only / static validation only
 *
 * npm run test:v90:go-boundary
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v9.0-limited-admin-only-runtime-proof-go-boundary-record.md";
const SELF_PATH = "scripts/test-v90-limited-admin-only-runtime-proof-go-boundary-record.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v90:go-boundary";

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

console.log("=== v9.0 Limited Admin-Only Runtime Proof GO Boundary Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 1800, `${doc.length} chars`);
ok("contains Limited GO phrase", /Limited GO/i.test(doc));
ok("contains admin-only phrase", /admin-only/i.test(doc));
ok(
  "contains source of truth statement",
  /deterministic flow remains source of truth/i.test(doc),
);

const REQUIRED_SECTIONS: Array<[string, RegExp]> = [
  ["allowed scope section", /^##\s*2\.\s*Allowed Scope/m],
  ["forbidden scope section", /^##\s*3\.\s*Forbidden Scope/m],
  ["runtime proof prerequisites section", /^##\s*4\.\s*Runtime Proof Prerequisites/m],
];
for (const [name, re] of REQUIRED_SECTIONS) {
  ok(`contains ${name}`, re.test(doc));
}

const REQUIRED_FORBIDDEN_PHRASES: Array<[string, RegExp]> = [
  ["no production deploy", /no production deploy/i],
  ["no buyer-facing AI", /no buyer-facing AI/i],
  ["no user-visible AI", /no user-visible AI/i],
  ["no real lead sending", /no real lead sending/i],
  ["no real secret/API key in repo", /no real secret\/API key in repo/i],
  ["no runtime activation", /no runtime activation/i],
  ["no src changes", /no src changes/i],
];
for (const [name, re] of REQUIRED_FORBIDDEN_PHRASES) {
  ok(`contains forbidden phrase: ${name}`, re.test(doc));
}

const REQUIRED_BOUNDARY_CONFIRMATIONS: Array<[string, RegExp]> = [
  ["not production go", /not a production GO/i],
  ["not buyer-facing go", /not a buyer-facing GO/i],
  ["not gemini activation go", /not a Gemini activation GO/i],
  ["not real lead go", /not a real lead GO/i],
];
for (const [name, re] of REQUIRED_BOUNDARY_CONFIRMATIONS) {
  ok(`contains boundary confirmation: ${name}`, re.test(doc));
}

const REQUIRED_PREREQUISITES: Array<[string, RegExp]> = [
  ["admin-only route boundary confirmed", /admin-only route boundary confirmed/i],
  ["environment names documented without values", /environment variable names documented without real values/i],
  ["kill switch default off", /kill switch default OFF/i],
  ["fallback deterministic response confirmed", /fallback deterministic response confirmed/i],
  ["logging redaction checklist", /logging redaction checklist/i],
  ["quota cap checklist", /quota cap checklist/i],
  ["no pii leak checklist", /no PII leak checklist/i],
  ["no buyer-visible path checklist", /no buyer-visible path checklist/i],
  ["rollback disable instruction", /rollback\/disable instruction/i],
  ["explicit owner approval for runtime touching work", /explicit owner approval for runtime-touching work/i],
];
for (const [name, re] of REQUIRED_PREREQUISITES) {
  ok(`contains prerequisite: ${name}`, re.test(doc));
}

const FORBIDDEN_CLAIMS: Array<[string, RegExp]> = [
  ["claims Gemini already activated", /Gemini(?:\s+จริง)?\s*(?:activated|live|enabled|เปิดแล้ว|ใช้งานแล้ว)/i],
  [
    "claims production is ready",
    /\b(?:production\s*(?:is\s*)?(?:ready|live|พร้อมแล้ว|พร้อมใช้งานแล้ว)|production GO\s*(?:approved|granted|signed|อนุมัติแล้ว))\b/i,
  ],
  ["claims runtime activation completed", /runtime activation\s*(?:completed|done|เรียบร้อยแล้ว|เปิดใช้งานแล้ว)/i],
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

ok("package.json has v9.0 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v9.0 validator script",
  pkg.includes("scripts/test-v90-limited-admin-only-runtime-proof-go-boundary-record.mts"),
);

console.log(`\nDone v9.0 go-boundary validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
