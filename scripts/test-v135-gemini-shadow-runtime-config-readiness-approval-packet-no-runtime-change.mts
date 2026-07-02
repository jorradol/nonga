/**
 * v13.5 Gemini shadow runtime config readiness validator
 * Static/doc checks only. No endpoint call. No Gemini execution.
 *
 * npm run test:v135:gemini-shadow-runtime-config-readiness-approval-packet-no-runtime-change
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.5-gemini-shadow-runtime-config-readiness-approval-packet-no-runtime-change.md";
const SELF_PATH =
  "scripts/test-v135-gemini-shadow-runtime-config-readiness-approval-packet-no-runtime-change.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v135:gemini-shadow-runtime-config-readiness-approval-packet-no-runtime-change";

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

console.log("=== v13.5 Gemini Shadow Runtime Config Readiness Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 4200, `${doc.length} chars`);
ok(
  "doc title present",
  /v13\.5 Gemini Shadow Runtime Config Readiness Approval Packet\s*[—-]\s*No Runtime Change\s*\/\s*No Gemini Execution/i.test(
    doc
  )
);
ok("doc has APPROVAL PACKET ONLY status", /\bAPPROVAL PACKET ONLY\b/i.test(doc));

const REQUIRED_DOC_PHRASES: Array<[string, RegExp]> = [
  ["v13.5 Gemini Shadow Runtime Config Readiness Approval Packet", /v13\.5 Gemini Shadow Runtime Config Readiness Approval Packet/i],
  ["APPROVAL PACKET ONLY", /\bAPPROVAL PACKET ONLY\b/i],
  ["no runtime change", /\bno runtime change\b/i],
  ["no deploy", /\bno deploy\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["v13.4 Source Status", /\bv13\.4 Source Status\b/i],
  ["Current Blocker", /\bCurrent Blocker\b/i],
  ["Gemini provider config present: no", /Gemini provider config present:\s*no/i],
  ["admin-only smoke enabled/config present: no", /admin-only smoke enabled\/config present:\s*no/i],
  ["manual smoke enabled/config present: no", /manual smoke enabled\/config present:\s*no/i],
  ["real provider shadow enabled/config present: no", /real provider shadow enabled\/config present:\s*no/i],
  ["Real Gemini run count remained 0/1", /Real Gemini run count remained 0\/1/i],
  ["Runtime Config Required For Future v13.6", /\bRuntime Config Required For Future v13\.6\b/i],
  ["Secret / Non-Secret Config Separation", /\bSecret \/ Non-Secret Config Separation\b/i],
  ["Gemini API Key Handling Rules", /\bGemini API Key Handling Rules\b/i],
  ["Gemini API key must not be used as NONGA_ADMIN_API_TOKEN", /Gemini API key must not be used as NONGA_ADMIN_API_TOKEN/i],
  ["Admin-Only Smoke Enablement Rules", /\bAdmin-Only Smoke Enablement Rules\b/i],
  ["Owner Approval Required For v13.6", /\bOwner Approval Required For v13\.6\b/i],
  ["Exact Approval Wording Needed From Owner", /\bExact Approval Wording Needed From Owner\b/i],
  ["Non-Secret Runtime Config Templates", /\bNon-Secret Runtime Config Templates\b/i],
  ["Do not run this command in v13.5", /Do not run this command in v13\.5/i],
  ["Use repo-confirmed env names only", /Use repo-confirmed env names only/i],
  ["Future v13.6 Sequence", /\bFuture v13\.6 Sequence\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no public route", /\bno public route\b/i],
  ["no real leads", /\bno real leads\b/i],
  ["no production", /\bno production\b/i],
  [
    "final recommendation phrase",
    /READY FOR OWNER APPROVAL TO PROCEED TO v13\.6 STAGING GEMINI SHADOW RUNTIME CONFIG SETUP/i,
  ],
];

for (const [name, re] of REQUIRED_DOC_PHRASES) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok("package includes v135 script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v135 validator",
  pkg.includes("scripts/test-v135-gemini-shadow-runtime-config-readiness-approval-packet-no-runtime-change.mts")
);

{
  const selfExecutionBody = self.split("const REQUIRED_DOC_PHRASES")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfExecutionBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfExecutionBody));
  ok("validator no endpoint route", !/\/api\//.test(selfExecutionBody));
  ok("validator no child_process", !/node:child_process/.test(selfExecutionBody));
}

console.log(`\nDone v13.5 readiness-packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
