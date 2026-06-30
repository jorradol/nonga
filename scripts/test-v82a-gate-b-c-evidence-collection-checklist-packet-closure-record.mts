/**
 * v8.2A — Gate B-C Evidence Collection Checklist Packet Closure Record
 * (closure-record-only / docs-only / static validation)
 * npm run test:v82a-gate-b-c-evidence-collection-checklist-packet-closure-record
 *
 * Validates closure record coverage and non-activation claims only.
 * Does NOT deploy, does NOT call Gemini, does NOT read secrets/env,
 * and does NOT modify runtime/source code.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.2A-gate-b-c-evidence-collection-checklist-packet-closure-record.md";
const SELF_PATH = "scripts/test-v82a-gate-b-c-evidence-collection-checklist-packet-closure-record.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v82a-gate-b-c-evidence-collection-checklist-packet-closure-record";

const REQUIRED_EVIDENCE = {
  headFull: "b2eb9c4d9ee7ddd785019ae1cf2591b3fb39d5c5",
  headShort: "b2eb9c4",
  pushRange: "34aae52..b2eb9c4",
  v82PassFail: "135 PASS, 0 FAIL",
  v82CommittedFiles: [
    "docs/v8.2-gate-b-c-evidence-collection-checklist-packet.md",
    "scripts/test-v82-gate-b-c-evidence-collection-checklist-packet.mts",
    "package.json",
  ],
};

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

console.log("=== v8.2A Gate B-C Evidence Collection Checklist Packet Closure Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- core labeling ---
ok("doc exists (substantial)", doc.length > 2500, `${doc.length} chars`);
ok("contains v8.2A label", /v8\.2A/i.test(doc));
ok("contains closure record label", /closure record/i.test(doc));
ok("contains docs-only label", /docs-only/i.test(doc));
ok("contains static validation label", /static validation/i.test(doc));
ok("contains non-activation statement", /not activation milestone|ไม่ใช่ activation milestone|ไม่ใช่ execution milestone/i.test(doc));

// --- required sections ---
const REQUIRED_SECTIONS: Array<[string, RegExp]> = [
  ["closure summary", /Closure Summary/i],
  ["commit push evidence", /Commit and Push Evidence/i],
  ["files committed in v8.2", /Files Committed in v8\.2/i],
  ["validation result evidence", /Validation Result Evidence/i],
  ["safety confirmation", /Safety Confirmation/i],
  ["readiness state", /Readiness State/i],
  ["missing evidence blockers", /Missing Evidence/i],
  ["next step guidance", /Next Step Guidance/i],
  ["explicit non-activation statement", /Explicit Non-Activation Statement/i],
  ["closure verdict", /Closure Verdict/i],
];
for (const [name, re] of REQUIRED_SECTIONS) ok(`section: ${name}`, re.test(doc));

// --- mandatory evidence values ---
ok("contains required full hash", doc.includes(REQUIRED_EVIDENCE.headFull));
ok("contains required short hash", doc.includes(REQUIRED_EVIDENCE.headShort));
ok("contains required push range", doc.includes(REQUIRED_EVIDENCE.pushRange));
ok("contains required v8.2 pass/fail result", doc.includes(REQUIRED_EVIDENCE.v82PassFail));
for (const file of REQUIRED_EVIDENCE.v82CommittedFiles) {
  ok(`contains committed file evidence: ${file}`, doc.includes(file));
}

// --- safety confirmation checklist ---
const REQUIRED_SAFETY: Array<[string, RegExp]> = [
  ["no deploy", /no deploy|ไม่มี deploy/i],
  ["no production touch", /no production touch|ไม่แตะ production/i],
  ["no gemini activation", /no Gemini activation|ไม่เปิด Gemini จริง/i],
  ["no admin-only shadow activation", /no admin-only shadow activation|ไม่เปิด admin-only shadow จริง/i],
  ["no buyer-facing user-visible activation", /no buyer-facing\/user-visible AI activation|ไม่เปิด buyer-facing\/user-visible AI จริง/i],
  ["no secret api key", /no secret\/API key|ไม่ใส่ secret\/API key จริง/i],
  ["no src runtime change", /no `src\/` หรือ runtime change|ไม่แตะ `src\/` หรือ runtime/i],
  ["no real lead sending", /no real lead sending|ไม่ส่ง lead จริง/i],
  ["deterministic source of truth", /deterministic flow remains source of truth|deterministic flow ยังเป็น source of truth/i],
];
for (const [name, re] of REQUIRED_SAFETY) ok(`safety: ${name}`, re.test(doc));

// --- readiness and blocker assertions ---
ok("readiness has checklist packet completed", /checklist packet completed/i.test(doc));
ok("readiness has admin-only real activation hold", /admin-only Gemini shadow real activation remains HOLD/i.test(doc));
ok("blocker owner sign-off", /owner sign-off/i.test(doc));
ok("blocker secret wiring runtime proof", /secret wiring runtime proof/i.test(doc));
ok("blocker budget quota cap runtime proof", /budget\/quota cap runtime proof/i.test(doc));
ok("blocker kill switch runtime proof", /kill switch runtime proof/i.test(doc));
ok("blocker admin-only boundary runtime proof", /admin-only boundary runtime proof/i.test(doc));
ok("blocker fallback logging redaction runtime proof", /fallback\/logging-redaction runtime proof/i.test(doc));

// --- next step guidance assertions ---
ok("guidance disallow immediate real Gemini", /ห้ามเปิด Gemini จริงทันทีหลัง v8\.2A/i.test(doc));
ok(
  "guidance allows only review or runtime-proof planning",
  /owner evidence review \/ decision packet|runtime-proof planning/i.test(doc)
);

// --- forbidden activation claims in closure document ---
const FORBIDDEN_CLAIMS: Array<[string, RegExp]> = [
  ["claims gemini already activated", /Gemini (?:is|was|เปิดใช้งาน).*already|เปิด Gemini จริงแล้ว/i],
  ["claims admin shadow already activated", /admin-only shadow.*(activated|opened|เปิดแล้ว)|เปิด admin-only shadow จริงแล้ว/i],
  ["claims buyer-facing AI already activated", /buyer-facing.*(activated|live)|user-visible AI.*(activated|live)|เปิด buyer-facing\/user-visible AI จริงแล้ว/i],
  ["claims runtime src changed for activation", /runtime.*(enabled|activated).*Gemini|src\/.*Gemini.*enabled/i],
];
for (const [label, re] of FORBIDDEN_CLAIMS) {
  ok(`doc has no forbidden activation claim: ${label}`, !re.test(doc));
}

// --- forbid operational activation commands in closure document ---
const FORBIDDEN_COMMANDS: Array<[string, RegExp]> = [
  ["firebase deploy command", /\bfirebase\s+deploy\b/i],
  ["gcloud deploy command", /\bgcloud\s+run\s+deploy\b/i],
  ["live generate content invoke", /generateContent\s*\(/],
  ["execute-approved switch", /--execute-approved/],
];
for (const [label, re] of FORBIDDEN_COMMANDS) {
  ok(`doc has no activation command: ${label}`, !re.test(doc));
}

// --- secret/pii pattern scans ---
const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["google api key (AIza...)", /AIza[0-9A-Za-z\-_]{20,}/],
  ["openai key (sk-...)", /\bsk-[a-zA-Z0-9]{20,}\b/],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{12,}/],
  ["generic token assignment", /\b(?:token|secret|password)\s*[:=]\s*['"][^'"]{10,}['"]/i],
];
for (const [label, re] of SECRET_PATTERNS) {
  ok(`doc no secret pattern: ${label}`, !re.test(doc));
}
ok("doc no thai phone number", !/\b0[689]\d{8}\b/.test(doc));
ok("doc no VIN-like 17-char run", !/\b[A-HJ-NPR-Z0-9]{17}\b/.test(doc));

// --- validator itself remains static-only ---
{
  const head = self.split("// --- validator itself remains static-only ---")[0] ?? self;
  ok("script uses readFileSync", /readFileSync/.test(head));
  ok("script no fetch", !/\bfetch\s*\(/.test(head));
  ok("script no child_process import", !/from\s+["']node:child_process["']/.test(head));
  ok("script no shell exec", !/\bexec(?:Sync)?\s*\(/.test(head));
  ok("script no process.env read", !/process\.env/.test(head));
}

// --- package.json script wiring ---
ok("package.json contains v8.2A script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok(
  "package.json points to v8.2A validator script",
  pkg.includes("scripts/test-v82a-gate-b-c-evidence-collection-checklist-packet-closure-record.mts")
);

console.log(`\nDone v8.2A closure validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
