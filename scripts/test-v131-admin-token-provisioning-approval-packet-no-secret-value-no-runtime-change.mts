/**
 * v13.1 Admin token provisioning approval packet validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v131:admin-token-provisioning-approval-packet-no-secret-value-no-runtime-change
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.1-admin-token-provisioning-approval-packet-no-secret-value-no-runtime-change.md";
const SELF_PATH = "scripts/test-v131-admin-token-provisioning-approval-packet-no-secret-value-no-runtime-change.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v131:admin-token-provisioning-approval-packet-no-secret-value-no-runtime-change";

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

console.log("=== v13.1 Admin Token Provisioning Approval Packet Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3200, `${doc.length} chars`);
ok(
  "doc title present",
  /v13\.1 Admin Token Provisioning Approval Packet\s*[—-]\s*No Secret Value\s*\/\s*No Runtime Change Yet/i.test(
    doc
  )
);
ok("doc has APPROVAL PACKET ONLY status", /\bAPPROVAL PACKET ONLY\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["v13.1 Admin Token Provisioning Approval Packet", /v13\.1 Admin Token Provisioning Approval Packet/i],
  ["APPROVAL PACKET ONLY", /\bAPPROVAL PACKET ONLY\b/i],
  ["no secret value", /\bno secret value\b/i],
  ["no runtime change", /\bno runtime change\b/i],
  ["no deploy", /\bno deploy\b/i],
  ["no endpoint call", /\bno endpoint call\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["NONGA_ADMIN_API_TOKEN", /\bNONGA_ADMIN_API_TOKEN\b/],
  ["same token", /\bsame token\b/i],
  ["runtime/server env", /\bruntime\/server env\b/i],
  ["operator/session env", /\boperator\/session env\b/i],
  ["Owner Decision Required", /\bOwner Decision Required\b/i],
  ["Admin Token Decision Options", /\bAdmin Token Decision Options\b/i],
  ["Recommended Option", /\bRecommended Option\b/i],
  ["Exact Approval Wording Needed From Owner", /\bExact Approval Wording Needed From Owner\b/i],
  ["Non-Secret Command Templates", /\bNon-Secret Command Templates\b/i],
  ["Do not run this command in v13.1", /Do not run this command in v13\.1/i],
  ["Gemini API key must not be used", /Gemini API key must not be used/i],
  ["Firebase service account must not be used", /Firebase service account must not be used/i],
  ["Google OAuth token must not be used", /Google OAuth token must not be used/i],
  ["Future v13.2 Sequence", /\bFuture v13\.2 Sequence\b/i],
  ["no smoke endpoint", /\bno smoke endpoint\b/i],
  ["no production", /\bno production\b/i],
  ["no public route", /\bno public route\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  [
    "final recommendation phrase",
    /READY FOR OWNER APPROVAL TO PROCEED TO v13\.2 CONTROLLED STAGING ADMIN TOKEN PROVISIONING/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v131 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v131 validator",
  pkg.includes("scripts/test-v131-admin-token-provisioning-approval-packet-no-secret-value-no-runtime-change.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.1 approval-packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
