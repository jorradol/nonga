/**
 * v13.2 Controlled staging admin token provisioning validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v132:controlled-staging-admin-token-provisioning-non-gemini-auth-recheck
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.2-controlled-staging-admin-token-provisioning-non-gemini-auth-recheck.md";
const SELF_PATH = "scripts/test-v132-controlled-staging-admin-token-provisioning-non-gemini-auth-recheck.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v132:controlled-staging-admin-token-provisioning-non-gemini-auth-recheck";

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

console.log("=== v13.2 Controlled Staging Admin Token Provisioning Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3000, `${doc.length} chars`);
ok(
  "doc title present",
  /v13\.2 Controlled Staging Admin Token Provisioning\s*[—-]\s*Non-Gemini Auth Recheck Only/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["v13.2 Controlled Staging Admin Token Provisioning", /v13\.2 Controlled Staging Admin Token Provisioning/i],
  ["Non-Gemini Auth Recheck Only", /Non-Gemini Auth Recheck Only/i],
  ["NONGA_ADMIN_API_TOKEN", /\bNONGA_ADMIN_API_TOKEN\b/],
  ["no token value", /\bno token value\b/i],
  ["no token print", /\bno token print\b/i],
  ["token value exposed: no", /token value exposed:\s*no/i],
  ["same token", /\bsame token\b/i],
  ["operator/session env", /\boperator\/session env\b/i],
  ["staging runtime/server env", /\bstaging runtime\/server env\b/i],
  ["GET /api/admin/duplicates", /GET\s+\/api\/admin\/duplicates/i],
  ["without admin token", /without admin token/i],
  ["with valid admin token", /with valid admin token/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no\s+`?\/api\/gemini\/\*`?/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead sending", /\bno real lead sending\b/i],
  ["no PII/customer data", /\bno PII\/customer data\b/i],
  ["secret value exposed: no", /secret value exposed:\s*no/i],
  ["final recommendation phrase", /READY FOR v13\.3 ADMIN-ONLY REAL GEMINI PROOF PLAN/i],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v132 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v132 validator",
  pkg.includes("scripts/test-v132-controlled-staging-admin-token-provisioning-non-gemini-auth-recheck.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.2 controlled-provisioning validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
