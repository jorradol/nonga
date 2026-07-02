/**
 * v13.3 Admin-only real Gemini proof plan validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v133:admin-only-real-gemini-proof-plan-one-run-approval-packet-no-execution
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.3-admin-only-real-gemini-proof-plan-one-run-approval-packet-no-execution.md";
const SELF_PATH = "scripts/test-v133-admin-only-real-gemini-proof-plan-one-run-approval-packet-no-execution.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v133:admin-only-real-gemini-proof-plan-one-run-approval-packet-no-execution";

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

console.log("=== v13.3 Admin-Only Real Gemini Proof Plan Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3600, `${doc.length} chars`);
ok(
  "doc title present",
  /v13\.3 Admin-Only Real Gemini Proof Plan\s*[—-]\s*One-Run Approval Packet\s*\/\s*No Execution Yet/i.test(
    doc
  )
);
ok("doc has APPROVAL PACKET ONLY status", /\bAPPROVAL PACKET ONLY\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["v13.3 Admin-Only Real Gemini Proof Plan", /v13\.3 Admin-Only Real Gemini Proof Plan/i],
  ["APPROVAL PACKET ONLY", /\bAPPROVAL PACKET ONLY\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no deploy", /\bno deploy\b/i],
  ["no production", /\bno production\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  ["v13.2 Source Status", /\bv13\.2 Source Status\b/i],
  ["Owner Approval Required For v13.4", /\bOwner Approval Required For v13\.4\b/i],
  ["Admin-Only Real Gemini Proof Boundary", /\bAdmin-Only Real Gemini Proof Boundary\b/i],
  ["One-Run Limit", /\bOne-Run Limit\b/i],
  ["POST /api/admin/sales-brain-shadow-smoke", /POST\s+\/api\/admin\/sales-brain-shadow-smoke/i],
  ["Do not call this endpoint in v13.3", /Do not call this endpoint in v13\.3/i],
  ["Input Payload Rules", /\bInput Payload Rules\b/i],
  ["No real phone", /\bNo real phone\b/i],
  ["No plate", /\bNo plate\b/i],
  ["No VIN", /\bNo VIN\b/i],
  ["No real buyer data", /\bNo real buyer data\b/i],
  ["No real lead sending", /\bNo real lead sending\b/i],
  ["Do not print NONGA_ADMIN_API_TOKEN", /Do not print `?NONGA_ADMIN_API_TOKEN`?/i],
  ["Do not print GEMINI_API_KEY", /Do not print `?GEMINI_API_KEY`?/i],
  ["Sanitized Evidence Rules", /\bSanitized Evidence Rules\b/i],
  ["Expected Pass Criteria", /\bExpected Pass Criteria\b/i],
  ["Expected Fail / Hold Criteria", /\bExpected Fail \/ Hold Criteria\b/i],
  ["Future v13.4 Sequence", /\bFuture v13\.4 Sequence\b/i],
  [
    "final recommendation phrase",
    /READY FOR OWNER APPROVAL TO PROCEED TO v13\.4 ONE-RUN ADMIN-ONLY REAL GEMINI PROOF/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v133 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v133 validator",
  pkg.includes("scripts/test-v133-admin-only-real-gemini-proof-plan-one-run-approval-packet-no-execution.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.3 approval-packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
