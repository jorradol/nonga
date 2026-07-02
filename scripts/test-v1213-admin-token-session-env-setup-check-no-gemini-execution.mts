/**
 * v12.13 Admin token session env setup check validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v1213:admin-token-session-env-setup-check-no-gemini-execution
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.13-admin-token-session-env-setup-check-no-gemini-execution.md";
const SELF_PATH = "scripts/test-v1213-admin-token-session-env-setup-check-no-gemini-execution.mts";
const HELPER_PATH = "scripts/check-admin-token-session-env.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v1213:admin-token-session-env-setup-check-no-gemini-execution";

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

console.log("=== v12.13 Admin Token Session Env Setup Check Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const helper = readFileSync(HELPER_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3500, `${doc.length} chars`);
ok(
  "doc title present",
  /v12\.13 Admin Token Session Env Setup Check\s*[—-]\s*No Gemini Execution/i.test(doc)
);
ok("doc has SETUP CHECK ONLY", /\bSETUP CHECK ONLY\b/i.test(doc));

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
  ["present/missing", /present\/missing/i],
  ["***MASKED***", /\*\*\*MASKED\*\*\*/],
  ["token format", /\btoken format\b/i],
  ["no print token", /\bno print token\b/i],
  ["no commit token", /\bno commit token\b/i],
  ["v12.12", /\bv12\.12\b/i],
  ["token mode gate: FAIL", /token mode gate:\s*FAIL/i],
  ["total live calls: 0", /total live calls:\s*0/i],
  [
    "recommendation line",
    /(READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK\s*[—-]\s*token present in session env|HOLD\s*[—-]\s*NONGA_ADMIN_API_TOKEN missing in operator\/session env|HOLD\s*[—-]\s*token format invalid or unsafe)/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v1213 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v1213 validator",
  pkg.includes("scripts/test-v1213-admin-token-session-env-setup-check-no-gemini-execution.mts")
);

ok("helper reads NONGA_ADMIN_API_TOKEN", /process\.env\.NONGA_ADMIN_API_TOKEN/.test(helper));
ok("helper has masked output marker", /\*\*\*MASKED\*\*\*/.test(helper));
ok("helper has hold missing line", /HOLD — NONGA_ADMIN_API_TOKEN missing in operator\/session env/.test(helper));
ok("helper has hold invalid line", /HOLD — token format invalid or unsafe/.test(helper));
ok(
  "helper has ready line",
  /READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK — token present in session env/.test(helper)
);

ok(
  "helper does not print env value directly",
  !/console\.log\s*\(\s*process\.env\.NONGA_ADMIN_API_TOKEN/.test(helper) &&
    !/console\.log\s*\(\s*`[^`]*\$\{process\.env\.NONGA_ADMIN_API_TOKEN\}/.test(helper) &&
    !/console\.log\s*\(\s*.*\braw\b.*\)/i.test(helper)
);
ok("helper no fetch call", !/\bfetch\s*\(/.test(helper));
ok("helper no http(s) URL literal", !/https?:\/\//.test(helper));
ok("helper no endpoint route", !/\/api\//.test(helper));
ok("helper no Gemini route", !/\/api\/gemini\//.test(helper));
ok("helper no child_process", !/node:child_process/.test(helper));

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v12.13 setup-check validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
