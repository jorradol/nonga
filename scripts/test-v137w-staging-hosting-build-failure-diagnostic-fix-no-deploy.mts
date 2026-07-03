/**
 * v13.7W staging hosting build failure diagnostic/fix record validator
 * Static/doc checks only. No Gemini. No network.
 *
 * npm run test:v137w:staging-hosting-build-failure-diagnostic-fix-no-deploy
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.7W-staging-hosting-build-failure-diagnostic-fix-no-deploy.md";
const SELF_PATH = "scripts/test-v137w-staging-hosting-build-failure-diagnostic-fix-no-deploy.mts";
const PKG_PATH = "package.json";
const SCRIPT_KEY = "test:v137w:staging-hosting-build-failure-diagnostic-fix-no-deploy";

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

console.log("=== v13.7W Staging Hosting Build Failure Diagnostic/Fix Validation ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const self = readFileSync(SELF_PATH, "utf8");
const pkg = readFileSync(PKG_PATH, "utf8");

ok("doc exists (substantial)", doc.length > 3800, `${doc.length} chars`);
ok("doc title present", /v13\.7W Staging Hosting Build Failure Diagnostic \/ Fix/i.test(doc));
ok("doc includes no deploy scope", /\bNo Deploy\b/i.test(doc));

const REQUIRED: Array<[string, RegExp]> = [
  ["Build Failure Reproduction", /\bBuild Failure Reproduction\b/i],
  ["Root Cause", /\bRoot Cause\b/i],
  ["Patch Scope", /\bPatch Scope\b/i],
  ["Patch Applied", /\bPatch Applied\b/i],
  ["npm run build:staging:hosting", /npm run build:staging:hosting/i],
  ["no deploy", /\bno deploy\b/i],
  ["no runtime config change", /\bno runtime config change\b/i],
  ["no Gemini execution", /\bno Gemini execution\b/i],
  ["no smoke endpoint call", /\bno smoke endpoint call\b/i],
  ["no /api/gemini/*", /no \/api\/gemini\/\*/i],
  ["no production", /\bno production\b/i],
  ["no public route activation", /\bno public route activation\b/i],
  ["no buyer-facing AI", /\bno buyer-facing AI\b/i],
  ["no real lead", /\bno real lead\b/i],
];

for (const [name, re] of REQUIRED) {
  ok(`doc includes: ${name}`, re.test(doc));
}

ok(
  "recommendation is allowed value",
  /READY FOR v13\.7X CONTROLLED STAGING DEPLOY \/ OWNER RETEST SURFACE REFRESH|HOLD\s*[—-]\s*build failure unresolved|HOLD\s*[—-]\s*build fix would require deploy\/runtime config\/Gemini risk|HOLD\s*[—-]\s*investigation incomplete/i.test(
    doc
  )
);

ok("package includes v137w script key", pkg.includes(`"${SCRIPT_KEY}"`));
ok(
  "package points to v137w validator",
  pkg.includes("scripts/test-v137w-staging-hosting-build-failure-diagnostic-fix-no-deploy.mts")
);

{
  const selfBody = self.split("const REQUIRED")[0] ?? self;
  ok("validator uses readFileSync", /readFileSync/.test(selfBody));
  ok("validator no fetch call", !/\bfetch\s*\(/.test(selfBody));
  ok("validator no api call", !/\/api\//.test(selfBody));
  ok("validator no child_process", !/node:child_process/.test(selfBody));
}

console.log(`\nDone v13.7W diagnostic/fix validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
