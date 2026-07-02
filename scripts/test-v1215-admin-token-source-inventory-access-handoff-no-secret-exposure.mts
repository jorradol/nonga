/**
 * v12.15 Admin token source inventory / access handoff validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v1215:admin-token-source-inventory-access-handoff-no-secret-exposure
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.15-admin-token-source-inventory-access-handoff-no-secret-exposure.md";
const SELF_PATH = "scripts/test-v1215-admin-token-source-inventory-access-handoff-no-secret-exposure.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v1215:admin-token-source-inventory-access-handoff-no-secret-exposure";

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

console.log("=== v12.15 Admin Token Source Inventory / Access Handoff Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2500, `${doc.length} chars`);
ok(
  "doc title present",
  /v12\.15 Admin Token Source Inventory \/ Access Handoff\s*[—-]\s*No Secret Exposure/i.test(doc)
);
ok("doc has SOURCE INVENTORY ONLY", /\bSOURCE INVENTORY ONLY\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["no live auth recheck", /\bno live auth recheck\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["NONGA_ADMIN_API_TOKEN", /\bNONGA_ADMIN_API_TOKEN\b/],
  [
    "operator/admin secret value is not available in session",
    /operator\/admin secret value is not available in session/i,
  ],
  ["no print token", /\bno print token\b/i],
  ["no commit token", /\bno commit token\b/i],
  ["source identified", /\bsource identified\b/i],
  ["owner/operator", /\bowner\/operator\b/i],
  [
    "recommendation line",
    /(READY FOR OPERATOR SECRET SETUP\s*[—-]\s*source identified,\s*value not exposed|HOLD\s*[—-]\s*admin token source not identified|HOLD\s*[—-]\s*secret access required from owner\/operator)/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v1215 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v1215 validator",
  pkg.includes("scripts/test-v1215-admin-token-source-inventory-access-handoff-no-secret-exposure.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v12.15 source-inventory validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
