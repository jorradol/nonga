/**
 * v13.7V controlled staging deploy/refresh record validator
 * Static/doc checks only. No Gemini. No network.
 *
 * npm run test:v137v:controlled-staging-deploy-owner-retest-surface-refresh
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.7V-controlled-staging-deploy-owner-retest-surface-refresh.md";
const SELF_PATH = "scripts/test-v137v-controlled-staging-deploy-owner-retest-surface-refresh.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v137v:controlled-staging-deploy-owner-retest-surface-refresh";

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

console.log("=== v13.7V Controlled Staging Deploy Refresh Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3600, `${doc.length} chars`);
ok("doc title present", /v13\.7V Controlled Staging Deploy/i.test(doc));
ok("doc includes owner retest surface wording", /Owner Retest Surface Refresh/i.test(doc));

const REQUIRED: Array<[string, RegExp]> = [
  ["v13.7U Root Cause", /\bv13\.7U Root Cause\b/i],
  ["patch exists but tested surface is not deployed", /patch exists but tested surface is not deployed/i],
  ["Deploy Target", /\bDeploy Target\b/i],
  ["Pre-Deploy Validation", /\bPre-Deploy Validation\b/i],
  ["Controlled Staging Deploy", /\bControlled Staging Deploy\b/i],
  ["Sanitized Deploy Evidence", /\bSanitized Deploy Evidence\b/i],
  ["Owner Retest Instructions", /\bOwner Retest Instructions\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no \/api\/gemini\/\*/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
  [
    "ready recommendation phrase present",
    /READY FOR OWNER RETEST OF v13\.7T SERVICE EXPLANATION PATCH ON STAGING/i,
  ],
];

for (const [name, re] of REQUIRED) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok(
  "recommendation is one allowed value",
  /READY FOR OWNER RETEST OF v13\.7T SERVICE EXPLANATION PATCH ON STAGING|HOLD\s*[—-]\s*staging deploy target unclear|HOLD\s*[—-]\s*predeploy validation failed|HOLD\s*[—-]\s*staging deploy failed or evidence unclear/i.test(
    doc
  )
);

ok("package includes v137v script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v137v validator",
  pkg.includes("scripts/test-v137v-controlled-staging-deploy-owner-retest-surface-refresh.mts")
);

{
  const selfBody = self.split("const REQUIRED")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfBody));
  ok("validator no api call", !/\/api\//.test(selfBody));
  ok("validator no child_process", !/node:child_process/.test(selfBody));
}

console.log(`\nDone v13.7V deploy-refresh validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
