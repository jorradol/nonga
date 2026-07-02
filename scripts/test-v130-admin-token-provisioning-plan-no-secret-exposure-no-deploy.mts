/**
 * v13.0 Admin token provisioning plan validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v130:admin-token-provisioning-plan-no-secret-exposure-no-deploy
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.0-admin-token-provisioning-plan-no-secret-exposure-no-deploy.md";
const SELF_PATH = "scripts/test-v130-admin-token-provisioning-plan-no-secret-exposure-no-deploy.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v130:admin-token-provisioning-plan-no-secret-exposure-no-deploy";

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

console.log("=== v13.0 Admin Token Provisioning Plan Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2800, `${doc.length} chars`);
ok(
  "doc title present",
  /v13\.0 Admin Token Provisioning Plan\s*[—-]\s*No Secret Exposure\s*\/\s*No Deploy/i.test(doc)
);
ok("doc has PREPARE ONLY status", /\bPREPARE ONLY\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["v13.0 Admin Token Provisioning Plan", /v13\.0 Admin Token Provisioning Plan/i],
  ["PREPARE ONLY", /\bPREPARE ONLY\b/i],
  ["no secret exposure", /\bno secret exposure\b/i],
  ["no deploy", /\bno deploy\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["NONGA_ADMIN_API_TOKEN", /\bNONGA_ADMIN_API_TOKEN\b/],
  ["Gemini API key must not be used", /Gemini API key must not be used/i],
  ["runtime/server env", /\bruntime\/server env\b/i],
  ["operator/session env", /\boperator\/session env\b/i],
  ["same admin token", /\bsame admin token\b/i],
  ["owner approval", /\bowner approval\b/i],
  ["staging runtime env setup", /\bstaging runtime env setup\b/i],
  [
    "final recommendation phrase",
    /READY FOR OWNER DECISION ON ADMIN TOKEN PROVISIONING \/ STAGING RUNTIME ENV SETUP/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v130 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v130 validator",
  pkg.includes("scripts/test-v130-admin-token-provisioning-plan-no-secret-exposure-no-deploy.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.0 provisioning-plan validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
