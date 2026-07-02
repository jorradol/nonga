/**
 * v12.11 Admin Auth Non-Gemini Gate Recheck Plan validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v1211:admin-auth-non-gemini-gate-recheck-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.11-admin-auth-non-gemini-gate-recheck-plan.md";
const SELF_PATH = "scripts/test-v1211-admin-auth-non-gemini-gate-recheck-plan.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v1211:admin-auth-non-gemini-gate-recheck-plan";

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

console.log("=== v12.11 Admin Auth Non-Gemini Gate Recheck Plan Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
ok(
  "doc title present",
  /v12\.11 Admin Auth Non-Gemini Gate Recheck Plan\s*[—-]\s*No Gemini Execution/i.test(doc)
);
ok("doc has PREPARE ONLY", /\bPREPARE ONLY\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["v12.8", /\bv12\.8\b/i],
  ["401", /`?401`?/],
  ["authorization consumed: no", /authorization consumed:\s*no/i],
  ["run count: 0/1", /run count:\s*`?0\/1`?/i],
  ["NONGA_ADMIN_API_TOKEN", /\bNONGA_ADMIN_API_TOKEN\b/],
  ["Authorization", /\bAuthorization\b/],
  ["Bearer", /\bBearer\b/],
  ["***MASKED***", /\*\*\*MASKED\*\*\*/],
  ["no header", /\bno header\b/i],
  ["valid masked admin header", /\bvalid masked admin header\b/i],
  ["non-Gemini", /\bnon-Gemini\b/i],
  ["admin auth", /\badmin auth\b/i],
  ["no retry", /\bno retry\b/i],
  [
    "recommendation line",
    /(READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK\s*[—-]\s*no Gemini execution|HOLD\s*[—-]\s*no safe non-Gemini admin auth recheck endpoint identified|HOLD\s*[—-]\s*admin auth recheck plan incomplete)/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v1211 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v1211 validator",
  pkg.includes("scripts/test-v1211-admin-auth-non-gemini-gate-recheck-plan.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok(
    "validator no smoke endpoint call",
    !/\/api\/admin\/sales-brain-shadow-smoke/.test(selfExecutionBody)
  );
  ok("validator no /api/gemini call", !/\/api\/gemini\//.test(selfExecutionBody));
}

console.log(`\nDone v12.11 prepare-only validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
