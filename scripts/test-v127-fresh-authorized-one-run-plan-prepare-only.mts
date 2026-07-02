/**
 * v12.7 Fresh Authorized One-Run Plan prepare-only validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v127:fresh-authorized-one-run-plan-prepare-only
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.7-fresh-authorized-one-run-plan-prepare-only.md";
const SELF_PATH = "scripts/test-v127-fresh-authorized-one-run-plan-prepare-only.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v127:fresh-authorized-one-run-plan-prepare-only";

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

console.log("=== v12.7 Fresh Authorized One-Run Plan Prepare-Only Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
ok(
  "doc title present",
  /v12\.7 Fresh Authorized One-Run Plan\s*[—-]\s*Prepare Only/i.test(doc)
);
ok("doc has PREPARE ONLY", /\bPREPARE ONLY\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["no execution", /\bno execution\b/i],
  ["no retry", /\bno retry\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["authorization consumed", /\bauthorization consumed\b/i],
  ["fresh authorization", /\bfresh authorization\b/i],
  [
    "final execution authorize wording",
    /FINAL EXECUTION AUTHORIZE v12\.8 ADMIN SS-01 ONE-RUN/,
  ],
  ["local = origin", /local\s*=\s*origin/i],
  ["working tree clean", /\bworking tree clean\b/i],
  ["URL parse", /\bURL parse\b/i],
  ["port", /\bport\b/i],
  ["0–65535", /0[–-]65535/],
  ["masked token", /\*\*\*MASKED\*\*\*/],
  ["/api/admin/sales-brain-shadow-smoke", /\/api\/admin\/sales-brain-shadow-smoke/],
  ["client error vs HTTP status", /client error vs HTTP status/i],
  ["request dispatch unknown", /request dispatch unknown/i],
  ["provider call unknown", /provider call unknown/i],
  ["Owner Decision Required", /Owner Decision Required/i],
  [
    "recommendation line",
    /(READY FOR OWNER DECISION ON FRESH FINAL EXECUTION AUTHORIZE FOR v12\.8 ONE-RUN|HOLD\s*[—-]\s*one-run plan still incomplete|HOLD\s*[—-]\s*command safety gates not ready)/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v127 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v127 validator",
  pkg.includes("scripts/test-v127-fresh-authorized-one-run-plan-prepare-only.mts")
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

console.log(`\nDone v12.7 prepare-only validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
