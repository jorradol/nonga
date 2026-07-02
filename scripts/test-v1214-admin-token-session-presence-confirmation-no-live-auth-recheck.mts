/**
 * v12.14 Admin token session presence confirmation validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v1214:admin-token-session-presence-confirmation-no-live-auth-recheck
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v12.14-admin-token-session-presence-confirmation-no-live-auth-recheck.md";
const SELF_PATH = "scripts/test-v1214-admin-token-session-presence-confirmation-no-live-auth-recheck.mts";
const HELPER_PATH = "scripts/check-admin-token-session-env.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v1214:admin-token-session-presence-confirmation-no-live-auth-recheck";

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

console.log("=== v12.14 Admin Token Session Presence Confirmation Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const helper = readFileSync(HELPER_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2500, `${doc.length} chars`);
ok(
  "doc title present",
  /v12\.14 Admin Token Session Presence Confirmation\s*[—-]\s*No Live Auth Recheck/i.test(doc)
);
ok("doc has PRESENCE CONFIRMATION ONLY", /\bPRESENCE CONFIRMATION ONLY\b/i.test(doc));

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
  ["valid/invalid", /valid\/invalid/i],
  ["***MASKED***", /\*\*\*MASKED\*\*\*/],
  ["v12.13", /\bv12\.13\b/i],
  [
    "recommendation line",
    /(READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK\s*[—-]\s*token present in session env|HOLD\s*[—-]\s*NONGA_ADMIN_API_TOKEN still missing in operator\/session env|HOLD\s*[—-]\s*token format invalid or unsafe)/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v1214 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v1214 validator",
  pkg.includes("scripts/test-v1214-admin-token-session-presence-confirmation-no-live-auth-recheck.mts")
);
ok(
  "package has safe check script alias",
  pkg.includes("\"check:admin-token-session-env\": \"npm exec tsx scripts/check-admin-token-session-env.mts\"")
);

ok("helper reads NONGA_ADMIN_API_TOKEN", /process\.env\.NONGA_ADMIN_API_TOKEN/.test(helper));
ok("helper prints masked token marker only", /\*\*\*MASKED\*\*\*/.test(helper));
ok("helper has present/missing output", /NONGA_ADMIN_API_TOKEN:\s*\$\{result\.presence\}/.test(helper));
ok("helper has valid/invalid output", /format:\s*\$\{result\.format\}/.test(helper));
ok("helper has no fetch call", !/\bfetch\s*\(/.test(helper));
ok("helper has no endpoint route", !/\/api\//.test(helper));
ok("helper has no child_process", !/node:child_process/.test(helper));
ok("helper has no token echo", !/console\.log\s*\(\s*process\.env\.NONGA_ADMIN_API_TOKEN/.test(helper));

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v12.14 presence confirmation validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
