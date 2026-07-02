/**
 * v13.7 one-run admin-only real Gemini proof approval packet validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v137:one-run-admin-only-real-gemini-proof-approval-packet
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.7-one-run-admin-only-real-gemini-proof-approval-packet.md";
const SELF_PATH = "scripts/test-v137-one-run-admin-only-real-gemini-proof-approval-packet.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v137:one-run-admin-only-real-gemini-proof-approval-packet";

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

console.log("=== v13.7 One-Run Admin-Only Real Gemini Approval Packet Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 2500, `${doc.length} chars`);
ok(
  "doc title present",
  /v13\.7 One-Run Admin-Only Real Gemini Proof Approval Packet/i.test(doc)
);
ok(
  "doc has approval-only status",
  /APPROVAL PACKET ONLY\s*[—-]\s*no Gemini execution in this packet/i.test(doc)
);

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["v13.6 Source Status", /\bv13\.6 Source Status\b/i],
  ["Owner Approval Required", /\bOwner Approval Required\b/i],
  ["One-Run Limit", /\bOne-Run Limit\b/i],
  ["Approved Endpoint", /\bApproved Endpoint\b/i],
  ["Approved Sanitized Payload", /\bApproved Sanitized Payload\b/i],
  ["Secret Handling Rules", /\bSecret Handling Rules\b/i],
  ["Evidence Rules", /\bEvidence Rules\b/i],
  ["Pass / Need Review / Hold Criteria", /\bPass \/ Need Review \/ Hold Criteria\b/i],
  ["Guardrails", /\bGuardrails\b/i],
  [
    "final owner wording header",
    /FINAL APPROVAL FOR v13\.7:/i,
  ],
  [
    "exactly one admin-only approval line",
    /I approve exactly one admin-only Real Gemini proof run on staging\./i,
  ],
  [
    "approved endpoint line",
    /Use only POST \/api\/admin\/sales-brain-shadow-smoke with sanitized SS-01 payload\./i,
  ],
  ["no secrets line", /Do not expose secrets\./i],
  ["no PII line", /Do not use real customer data, phone, plate, VIN, or PII\./i],
  ["no real leads line", /Do not send real leads\./i],
  ["no buyer-facing line", /Do not enable buyer-facing AI\./i],
  ["no public route line", /Do not activate public route\./i],
  ["no production line", /Do not touch production\./i],
  ["no auto retry line", /Do not retry automatically\./i],
  ["sanitized evidence line", /Capture only sanitized evidence\./i],
  ["stop after one run line", /Stop immediately after one run and report PASS \/ NEED REVIEW \/ HOLD\./i],
  ["endpoint phrase", /POST \/api\/admin\/sales-brain-shadow-smoke/i],
  ["ss-01 phrase", /\bSS-01\b/],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok(
  "recommendation is one allowed value",
  /READY FOR OWNER APPROVAL TO PROCEED TO v13\.7 ONE-RUN ADMIN-ONLY REAL GEMINI PROOF|HOLD\s*[—-]\s*v13\.7 approval packet incomplete|HOLD\s*[—-]\s*v13\.6 runtime config readiness incomplete/i.test(
    doc
  )
);

ok("package includes v137 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v137 validator",
  pkg.includes("scripts/test-v137-one-run-admin-only-real-gemini-proof-approval-packet.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.7 approval-packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
