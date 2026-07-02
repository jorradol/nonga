/**
 * v13.4 One-run admin-only real Gemini proof execution record validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v134:one-run-admin-only-real-gemini-proof-execution-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.4-one-run-admin-only-real-gemini-proof-execution-record.md";
const SELF_PATH = "scripts/test-v134-one-run-admin-only-real-gemini-proof-execution-record.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v134:one-run-admin-only-real-gemini-proof-execution-record";

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

console.log("=== v13.4 One-Run Admin-Only Real Gemini Proof Record Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2800, `${doc.length} chars`);
ok(
  "doc title present",
  /v13\.4 One-Run Admin-Only Real Gemini Proof Execution Record/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["v13.4 One-Run Admin-Only Real Gemini Proof", /v13\.4 One-Run Admin-Only Real Gemini Proof/i],
  ["Execution Record", /\bExecution Record\b/i],
  ["Owner Approval", /\bOwner Approval\b/i],
  ["Pre-Execution Gates", /\bPre-Execution Gates\b/i],
  ["Secret Handling Confirmation", /\bSecret Handling Confirmation\b/i],
  ["NONGA_ADMIN_API_TOKEN", /\bNONGA_ADMIN_API_TOKEN\b/],
  ["GEMINI_API_KEY", /\bGEMINI_API_KEY\b/],
  ["POST /api/admin/sales-brain-shadow-smoke", /POST\s+\/api\/admin\/sales-brain-shadow-smoke/i],
  ["SS-01", /\bSS-01\b/],
  ["authorized Real Gemini run count", /authorized Real Gemini run count/i],
  ["1/1", /\b1\/1\b/],
  ["automatic retry used: no", /automatic retry used:\s*no/i],
  ["second run attempted: no", /second run attempted:\s*no/i],
  ["dispatch confirmed", /dispatch confirmed/i],
  ["provider path confirmed", /provider path confirmed/i],
  ["no secret exposure", /\bno secret exposure\b/i],
  ["no PII/customer data", /\bno PII\/customer data\b/i],
  ["no real lead sent", /\bno real lead sent\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no public route", /\bno public route\b/i],
  ["no production", /\bno production\b/i],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok(
  "recommendation is one allowed value",
  /PASS\s*[—-]\s*ready for v13\.5 owner-only staging trial plan|NEED REVIEW\s*[—-]\s*Real Gemini proof inconclusive or non-success|HOLD\s*[—-]\s*prerequisites missing or secret\/runtime risk detected/i.test(
    doc
  )
);

ok("package includes v134 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v134 validator",
  pkg.includes("scripts/test-v134-one-run-admin-only-real-gemini-proof-execution-record.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.4 execution-record validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
