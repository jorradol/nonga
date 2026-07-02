/**
 * v13.7R session token re-arm + one-run admin-only real Gemini proof execution validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v137r:session-admin-token-rearm-one-run-admin-only-real-gemini-proof-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v13.7R-session-admin-token-rearm-one-run-admin-only-real-gemini-proof-execution-record.md";
const SELF_PATH =
  "scripts/test-v137r-session-admin-token-rearm-one-run-admin-only-real-gemini-proof-execution-record.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY =
  "test:v137r:session-admin-token-rearm-one-run-admin-only-real-gemini-proof-execution-record";

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

console.log("=== v13.7R Session Re-Arm One-Run Proof Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3800, `${doc.length} chars`);
ok("doc includes v13.7R title", /v13\.7R Session Admin Token Re-Arm/i.test(doc));
ok("doc includes one-run proof wording", /One-Run Admin-Only Real Gemini Proof/i.test(doc));
ok("doc includes execution record wording", /\bExecution Record\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["Session Token Re-Arm", /\bSession Token Re-Arm\b/i],
  ["NONGA_ADMIN_API_TOKEN", /\bNONGA_ADMIN_API_TOKEN\b/],
  ["GEMINI_API_KEY", /\bGEMINI_API_KEY\b/],
  ["NONGA_AI_PROVIDER=gemini", /NONGA_AI_PROVIDER=gemini/i],
  ["NONGA_AI_MODE=shadow", /NONGA_AI_MODE=shadow/i],
  ["NONGA_AI_FIRST_ENABLED=false", /NONGA_AI_FIRST_ENABLED=false/i],
  ["NONGA_AI_SHADOW_MODE_ENABLED=true", /NONGA_AI_SHADOW_MODE_ENABLED=true/i],
  [
    "NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED=true",
    /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED=true/i,
  ],
  [
    "NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED=true",
    /NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED=true/i,
  ],
  [
    "NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID=SS-01",
    /NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID=SS-01/i,
  ],
  [
    "POST /api/admin/sales-brain-shadow-smoke",
    /POST \/api\/admin\/sales-brain-shadow-smoke/i,
  ],
  ["SS-01", /\bSS-01\b/],
  ["authorized Real Gemini run count", /authorized Real Gemini run count/i],
  ["1/1", /\b1\/1\b/],
  ["automatic retry used: no", /automatic retry used:\s*no/i],
  ["second run attempted: no", /second run attempted:\s*no/i],
  ["dispatch confirmed", /dispatch confirmed:\s*(yes|no|unclear)/i],
  ["provider path confirmed", /provider path confirmed:\s*(yes|no|unclear)/i],
  ["no secret exposure", /\bno secret exposure:\s*yes\b/i],
  ["no PII/customer data", /\bno PII\/customer data:\s*yes\b/i],
  ["no real lead sent", /\bno real lead sent:\s*yes\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI enabled:\s*yes\b/i],
  ["no public route", /\bno public route activated:\s*yes\b/i],
  ["no production", /\bno production touched:\s*yes\b/i],
  ["no deploy", /\bno deploy:\s*yes\b/i],
  ["no runtime config change", /\bno runtime config change:\s*yes\b/i],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok(
  "recommendation is one allowed value",
  /PASS\s*[—-]\s*ready for v13\.8 owner-only staging trial plan|NEED REVIEW\s*[—-]\s*Real Gemini proof inconclusive or non-success|HOLD\s*[—-]\s*prerequisites missing or secret\/runtime risk detected/i.test(
    doc
  )
);

ok("package includes v137r script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v137r validator",
  pkg.includes(
    "scripts/test-v137r-session-admin-token-rearm-one-run-admin-only-real-gemini-proof-execution-record.mts"
  )
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.7R execution-record validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
