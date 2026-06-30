/**
 * v8.9 — Owner Pre-GO Readiness Checkpoint
 * docs-only / static validation only
 *
 * npm run test:v89-owner-pre-go-readiness-checkpoint
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.9-owner-pre-go-readiness-checkpoint.md";
const SELF_PATH = "scripts/test-v89-owner-pre-go-readiness-checkpoint.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v89-owner-pre-go-readiness-checkpoint";

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

console.log("=== v8.9 Owner Pre-GO Readiness Checkpoint Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- baseline identity and boundary ---
ok("doc exists (substantial)", doc.length > 5500, `${doc.length} chars`);
ok("contains v8.9 label", /v8\.9/i.test(doc));
ok("contains owner pre-go readiness checkpoint phrase", /Owner Pre-GO Readiness Checkpoint/i.test(doc));
ok("contains hold-compatible statement", /HOLD-compatible/i.test(doc));
ok("contains docs-only statement", /docs-only/i.test(doc));
ok("contains static validation statement", /static validation/i.test(doc));
ok("states not runtime execution", /not runtime execution|ไม่ใช่ runtime execution/i.test(doc));
ok("states not gemini activation", /not Gemini activation|ไม่ใช่ Gemini activation/i.test(doc));
ok("states not owner go", /not owner GO|ไม่ใช่ owner GO/i.test(doc));
ok("states not buyer-facing ai", /not buyer-facing AI|ไม่ใช่ buyer-facing AI/i.test(doc));
ok("contains deterministic authority statement", /deterministic flow remains source of truth|deterministic authority remains source of truth/i.test(doc));

// --- lineage required commits ---
ok("contains v8.4 full commit hash", doc.includes("e7ff98452c65a9b6f80ae45cd36fc14bcc3041be"));
ok("contains v8.5 full commit hash", doc.includes("f23518e3ccc26b7dc9342c735ae635677f932a64"));
ok("contains v8.6 full commit hash", doc.includes("63c4af80e3095508413944d6fdb43ac9028d0d0a"));
ok("contains v8.7 full commit hash", doc.includes("1ef8a4179a3223adca9afd710bd280c028d2f134"));
ok("contains v8.8 full commit hash", doc.includes("a694ce4cfc813e1666f126fc9976239d5d94e0b4"));

// --- current status section content ---
ok("contains current status heading", /Current Status/i.test(doc));
ok("current status includes default hold", /default decision remains HOLD/i.test(doc));
ok("current status includes no deploy", /no deploy/i.test(doc));
ok("current status includes no production", /no production/i.test(doc));
ok("current status includes no runtime activation", /no runtime activation/i.test(doc));
ok("current status includes no gemini activation", /no Gemini activation/i.test(doc));
ok("current status includes no secret api key in repo", /no secret\/API key in repo/i.test(doc));

// --- pre-go readiness checklist structure ---
ok("contains pre-go readiness checklist heading", /Pre-GO Readiness Checklist/i.test(doc));

const REQUIRED_CHECKLIST_TOPICS: Array<[string, RegExp]> = [
  ["owner explicit go readiness", /Owner Explicit GO Readiness/i],
  ["staging-only environment readiness", /Staging-Only Environment Readiness/i],
  ["admin-only identity boundary readiness", /Admin-Only Identity\/Boundary Readiness/i],
  ["secret storage outside repo readiness", /Secret Storage Outside Repo Readiness/i],
  ["budget quota cap readiness", /Budget\/Quota Cap Readiness/i],
  ["kill switch readiness", /Kill Switch Readiness/i],
  ["fallback to deterministic readiness", /Fallback to Deterministic Readiness/i],
  ["logging redaction readiness", /Logging\/Redaction Readiness/i],
  ["pii pdpa readiness", /PII\/PDPA Readiness/i],
  ["dealer isolation readiness", /Dealer Isolation Readiness/i],
  ["user-visible ai leakage prevention readiness", /User-Visible AI Leakage Prevention Readiness/i],
  ["rollback stop readiness", /Rollback\/Stop Readiness/i],
  ["evidence collection readiness", /Evidence Collection Readiness/i],
];
for (const [name, re] of REQUIRED_CHECKLIST_TOPICS) {
  ok(`checklist topic: ${name}`, re.test(doc));
}

const REQUIRED_CHECKLIST_FIELDS: Array<[string, RegExp]> = [
  ["readiness question", /- readiness question:/gi],
  ["required evidence", /- required evidence:/gi],
  ["pass condition", /- pass condition:/gi],
  ["blocker condition", /- blocker condition:/gi],
  ["owner review required", /- owner review required:\s*yes/gi],
];
for (const [name, re] of REQUIRED_CHECKLIST_FIELDS) {
  const count = doc.match(re)?.length ?? 0;
  ok(`checklist field count: ${name}`, count >= 13, `${count} found`);
}

// --- go preconditions ---
ok("contains go preconditions heading", /GO Preconditions/i.test(doc));
const REQUIRED_GO_PRECONDITIONS: Array<[string, RegExp]> = [
  ["owner explicitly signs go in separate step", /owner explicitly signs GO in a separate step/i],
  ["staging-only boundary confirmed", /staging-only boundary confirmed/i],
  ["admin-only boundary confirmed", /admin-only boundary confirmed/i],
  ["no buyer-facing route involved", /no buyer-facing route involved/i],
  ["secret storage method confirmed outside repo", /secret storage method confirmed outside repo/i],
  ["budget quota cap confirmed", /budget\/quota cap confirmed/i],
  ["kill switch confirmed", /kill switch confirmed/i],
  ["fallback confirmed", /fallback confirmed/i],
  ["logging redaction confirmed", /logging\/redaction confirmed/i],
  ["rollback stop plan confirmed", /rollback\/stop plan confirmed/i],
  ["deterministic authority remains source of truth", /deterministic authority remains source of truth/i],
];
for (const [name, re] of REQUIRED_GO_PRECONDITIONS) {
  ok(`go precondition: ${name}`, re.test(doc));
}

// --- explicit forbidden actions ---
ok("contains explicit forbidden actions heading", /Explicit Forbidden Actions/i.test(doc));
const REQUIRED_FORBIDDEN_ACTIONS: Array<[string, RegExp]> = [
  ["no deploy in v8.9", /no deploy in v8\.9/i],
  ["no production touch", /no production touch/i],
  ["no gemini activation", /no Gemini activation/i],
  ["no runtime activation", /no runtime activation/i],
  ["no secret api key in repo", /no secret\/API key in repo/i],
  ["no src changes", /no src changes/i],
  ["no public route", /no public route/i],
  ["no buyer-facing user-visible ai", /no buyer-facing\/user-visible AI/i],
  ["no real lead sending", /no real lead sending/i],
];
for (const [name, re] of REQUIRED_FORBIDDEN_ACTIONS) {
  ok(`forbidden action: ${name}`, re.test(doc));
}

// --- owner sign-off template ---
ok("contains owner sign-off template heading", /Owner Sign-Off Template/i.test(doc));
ok("template has current decision field", /Current decision:\s*HOLD \/ prepare for future GO review \/ NO-GO/i.test(doc));
ok("template has reason note field", /Reason\/note:/i.test(doc));
ok("template has date field", /Date:/i.test(doc));
ok("template has owner confirmation statement field", /Owner confirmation statement:/i.test(doc));
ok("default hold statement present", /default ต้องเป็น HOLD unless owner explicitly signs GO later/i.test(doc));

// --- safety confirmation ---
ok("contains safety confirmation heading", /Safety Confirmation/i.test(doc));
const REQUIRED_SAFETY: Array<[string, RegExp]> = [
  ["no deploy", /- no deploy/i],
  ["no production", /- no production/i],
  ["no gemini activation", /- no Gemini activation/i],
  ["no runtime activation", /- no runtime activation/i],
  ["no secret api key", /- no secret\/API key/i],
  ["no src changes", /- no src changes/i],
  ["no user-visible ai", /- no user-visible AI/i],
  ["no real lead sending", /- no real lead sending/i],
  ["deterministic flow remains source of truth", /- deterministic flow remains source of truth/i],
];
for (const [name, re] of REQUIRED_SAFETY) {
  ok(`safety: ${name}`, re.test(doc));
}

// --- forbidden activation claims ---
const FORBIDDEN_ACTIVATION_CLAIMS: Array<[string, RegExp]> = [
  ["claims gemini already active", /Gemini(?:\s+จริง)?\s*(?:เปิดแล้ว|activated|live|ใช้งานแล้ว|ถูกเปิดใช้งานแล้ว)/i],
  ["claims runtime activation completed", /runtime activation\s*(?:completed|done|เปิดแล้ว|เรียบร้อยแล้ว)/i],
  ["claims owner go already granted", /owner GO\s*(?:approved|granted|signed|อนุมัติแล้ว)/i],
  ["claims buyer-facing ai enabled", /buyer-facing AI\s*(?:enabled|live|เปิดแล้ว|ใช้งานแล้ว)/i],
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
ok("package.json has v8.9 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok("package.json points to v8.9 validator script", pkg.includes("scripts/test-v89-owner-pre-go-readiness-checkpoint.mts"));

console.log(`\nDone v8.9 owner pre-go readiness checkpoint validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
