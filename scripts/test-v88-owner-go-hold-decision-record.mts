/**
 * v8.8 — Owner GO/HOLD/NO-GO Decision Record
 * docs-only / static validation only
 *
 * npm run test:v88-owner-go-hold-decision-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v8.8-owner-go-hold-decision-record.md";
const SELF_PATH = "scripts/test-v88-owner-go-hold-decision-record.mts";
const PKG_PATH = "package.json";
const NPM_SCRIPT_KEY = "test:v88-owner-go-hold-decision-record";

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

console.log("=== v8.8 Owner GO/HOLD/NO-GO Decision Record Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

// --- baseline labeling ---
ok("doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
ok("contains v8.8 label", /v8\.8/i.test(doc));
ok("contains owner decision record phrase", /owner decision record|decision record only/i.test(doc));
ok("contains docs-only statement", /docs-only/i.test(doc));
ok("contains static validation statement", /static validation/i.test(doc));
ok("states not runtime execution", /not runtime execution|ไม่ใช่ runtime execution/i.test(doc));
ok("states not runtime activation", /not runtime activation|ไม่ใช่ runtime activation|ไม่เปิด runtime activation/i.test(doc));
ok("states not real gemini activation", /not.*เปิด Gemini จริง|ไม่เปิด Gemini จริง|not.*Gemini.*real/i.test(doc));

// --- required lineage commits ---
ok("contains v8.4 full commit hash", doc.includes("e7ff98452c65a9b6f80ae45cd36fc14bcc3041be"));
ok("contains v8.5 full commit hash", doc.includes("f23518e3ccc26b7dc9342c735ae635677f932a64"));
ok("contains v8.6 full commit hash", doc.includes("63c4af80e3095508413944d6fdb43ac9028d0d0a"));
ok("contains v8.7 full commit hash", doc.includes("1ef8a4179a3223adca9afd710bd280c028d2f134"));
ok("contains local = origin status", /local\s*=\s*origin/i.test(doc));
ok("contains working tree clean status", /working tree clean/i.test(doc));

// --- default recommendation ---
ok("contains default recommendation section", /Current Default Recommendation/i.test(doc));
ok("contains hold unless owner explicitly signs go", /HOLD unless owner explicitly signs GO/i.test(doc));

// --- decision options ---
ok("contains HOLD decision heading", /4\.1\s*HOLD/i.test(doc));
ok("contains GO decision heading", /4\.2\s*GO/i.test(doc));
ok("contains NO-GO decision heading", /4\.3\s*NO-GO/i.test(doc));

const REQUIRED_DECISION_FIELDS: Array<[string, RegExp]> = [
  ["meaning field", /\*\*meaning:\*\*/i],
  ["allowed next action field", /\*\*allowed next action:\*\*/i],
  ["forbidden action field", /\*\*forbidden action:\*\*/i],
  ["risk note field", /\*\*risk note:\*\*/i],
  ["required owner sign-off text field", /\*\*required owner sign-off text:\*\*/i],
];
for (const [name, re] of REQUIRED_DECISION_FIELDS) {
  const count = doc.match(new RegExp(re.source, "gi"))?.length ?? 0;
  ok(`each decision has ${name}`, count >= 3, `${count} found`);
}

ok(
  "HOLD meaning text present",
  /HOLD[\s\S]*do not proceed to runtime; continue documentation\/checking only/i.test(doc)
);
ok(
  "GO meaning text present",
  /GO[\s\S]*next preparation step[\s\S]*limited admin-only runtime proof/i.test(doc)
);
ok("NO-GO meaning text present", /NO-GO[\s\S]*stop[\s\S]*runtime-proof track/i.test(doc));

// --- owner sign-off template ---
ok("contains owner sign-off template heading", /Owner Sign-Off Template/i.test(doc));
ok("template has selected decision field", /Selected decision:\s*HOLD \/ GO \/ NO-GO/i.test(doc));
ok("template has reason note field", /Reason\/note:/i.test(doc));
ok("template has date field", /Date:/i.test(doc));
ok("template has confirmation statement field", /Owner confirmation statement:/i.test(doc));

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

// --- go boundary clarification ---
ok(
  "GO still not buyer-facing AI",
  /แม้ owner จะเลือก `GO`[\s\S]*ยังไม่ใช่การเปิด buyer-facing AI/i.test(doc)
);
ok(
  "GO still limited admin-only runtime-proof preparation",
  /limited admin-only runtime proof เท่านั้น/i.test(doc)
);
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
ok("package.json has v8.8 script key", pkg.includes(`"${NPM_SCRIPT_KEY}"`));
ok("package.json points to v8.8 validator script", pkg.includes("scripts/test-v88-owner-go-hold-decision-record.mts"));

console.log(`\nDone v8.8 owner decision record validation — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
