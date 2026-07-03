/**
 * v13.13 owner-only staging config/deploy plan validator
 * Static checks only. No deploy/runtime-config mutation/no Gemini execution.
 *
 * npm run test:v13.13
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.13-owner-only-staging-config-deploy-plan.md";
const SELF_PATH = "scripts/test-v1313-owner-only-staging-config-deploy-plan.mts";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

console.log("=== v13.13 Owner-Only Staging Config/Deploy Plan Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));

ok("doc has substantial content", doc.length > 5000, `${doc.length} chars`);

const executionChecks: Array<[string, RegExp]> = [
  ["prepare-only yes", /prepare-only:\s*yes/i],
  ["docs test package only yes", /docs\/test\/package only:\s*yes/i],
  ["staging config deploy plan yes", /staging config\/deploy plan:\s*yes/i],
  ["no runtime behavior change yes", /no runtime behavior change:\s*yes/i],
  ["no deploy yes", /no deploy:\s*yes/i],
  ["no runtime config change yes", /no runtime config change:\s*yes/i],
  ["no Gemini execution yes", /no Gemini execution:\s*yes/i],
  ["no smoke endpoint call yes", /no smoke endpoint call:\s*yes/i],
  ["no production yes", /no production:\s*yes/i],
  ["no public route activation yes", /no public route activation:\s*yes/i],
  ["no buyer-facing release yes", /no buyer-facing release:\s*yes/i],
  ["no real lead sending yes", /no real lead sending:\s*yes/i],
  ["no real PII yes", /no real PII:\s*yes/i],
  ["no automatic Gemini retry yes", /no automatic Gemini retry:\s*yes/i],
];
for (const [name, re] of executionChecks) {
  ok(`execution includes ${name}`, re.test(doc));
}

const baselineChecks: Array<[string, RegExp]> = [
  ["baseline commit 676c2d4", /latest commit:\s*`?676c2d4`?/i],
  ["v13.12 accepted", /v13\.12 accepted/i],
  ["owner-only patch exists", /owner-only controlled Gemini UX patch exists/i],
  ["default-off exists", /default-off exists/i],
  ["guard-before-dispatch exists", /guard-before-dispatch exists/i],
  ["post-check fallback exists", /post-check\/fallback exists/i],
  ["no automatic retry exists", /no automatic retry exists/i],
];
for (const [name, re] of baselineChecks) {
  ok(`baseline includes ${name}`, re.test(doc));
}

const requiredSections: Array<[string, RegExp]> = [
  ["staging env config checklist", /Required staging env\/config checklist/i],
  ["future deploy plan", /Future deploy plan/i],
  ["future owner-only smoke plan", /Future owner-only smoke plan/i],
  ["evidence collection plan", /Evidence collection plan/i],
  ["rollback plan", /Rollback plan/i],
  ["risk table", /Risk table/i],
  ["go hold criteria", /GO\/HOLD criteria/i],
];
for (const [name, re] of requiredSections) {
  ok(`has section ${name}`, re.test(doc));
}

const checklistKeywords: Array<[string, RegExp]> = [
  ["owner controlled env key", /NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED/],
  ["allowlist or session gate", /allowlist|session gate/i],
  ["existing provider flags", /provider flag|Gemini\/admin provider flags/i],
  ["staging-only verification", /staging-only/i],
  ["budget cap", /budget|cost cap/i],
  ["no retry confirmation", /no-retry|no retry/i],
  ["fallback deterministic confirmation", /fallback deterministic/i],
];
for (const [name, re] of checklistKeywords) {
  ok(`checklist includes ${name}`, re.test(doc));
}

const smokeKeywords: Array<[string, RegExp]> = [
  ["owner role only", /owner role only/i],
  ["non-owner blocked", /non-owner blocked/i],
  ["default-off blocked", /default-off blocked/i],
  ["safe-zone wording candidate", /safe-zone wording candidate/i],
  ["unsafe-zone blocked", /unsafe-zone blocked/i],
  ["PII phone plate vin blocked", /PII\/phone\/plate\/VIN blocked/i],
  ["lead confirmation deterministic", /lead confirmation deterministic/i],
  ["secret request blocked", /secret request blocked/i],
  ["production public request blocked", /production\/public request blocked/i],
  ["post-check fallback", /post-check fallback/i],
  ["no retry evidence", /no retry evidence/i],
];
for (const [name, re] of smokeKeywords) {
  ok(`smoke plan includes ${name}`, re.test(doc));
}

const evidenceKeywords: Array<[string, RegExp]> = [
  ["git HEAD", /git HEAD/i],
  ["runtime flag masked status", /runtime flag masked status/i],
  ["owner-only gate result", /owner-only gate result/i],
  ["safe-zone result", /safe-zone result/i],
  ["boundary block result", /boundary block result/i],
  ["fallback result", /fallback result/i],
  ["no retry proof", /no retry proof/i],
  ["no lead proof", /no lead proof/i],
  ["no PII proof", /no PII proof/i],
  ["no public production proof", /no public\/production proof/i],
];
for (const [name, re] of evidenceKeywords) {
  ok(`evidence includes ${name}`, re.test(doc));
}

const finalAllowed = [
  "READY FOR OWNER APPROVAL TO EXECUTE v13.14 OWNER-ONLY STAGING CONFIG + CONTROLLED DEPLOY",
  "HOLD — owner-only staging config/deploy plan incomplete",
  "HOLD — unsafe staging activation boundary detected",
];
const finalMatches = finalAllowed.filter((text) => doc.includes(text));
ok("final recommendation is one allowed value", finalMatches.length === 1, finalMatches.join(" | "));

const secretPatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
  ["token assignment", /\btoken\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["secret assignment", /\bsecret\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["api key assignment", /\bapi[_-]?key\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
];
for (const [name, re] of secretPatterns) {
  ok(`no secret pattern ${name}`, !re.test(doc));
}

const lines = doc.split("\n").map((line) => line.trim()).filter(Boolean);
const deployLike = /\b(firebase|gcloud|npm|pnpm|yarn)\b.*\bdeploy\b/i;
const smokeLike = /\b(curl|Invoke-WebRequest|wget)\b.*\bsmoke\b/i;

const hasUnsanitizedDeployLine = lines.some((line) => {
  if (!deployLike.test(line)) return false;
  return !/\bplaceholder\b|\bsanitized\b|\[[A-Z0-9_]+]/i.test(line);
});
ok("no unsanitized deploy command", !hasUnsanitizedDeployLine);

const hasUnsanitizedSmokeLine = lines.some((line) => {
  if (!smokeLike.test(line)) return false;
  return !/\bplaceholder\b|\bsanitized\b|\[[A-Z0-9_]+]/i.test(line);
});
ok("no unsanitized smoke command", !hasUnsanitizedSmokeLine);

const unsafeDoneClaims: Array<[string, RegExp]> = [
  ["deploy already happened", /\bdeploy(?:ed)?\b.*\b(done|happened|completed)\b/i],
  ["runtime config changed", /\bruntime config\b.*\b(changed|updated|applied)\b/i],
  ["Gemini executed", /\bGemini\b.*\b(executed|called|invoked)\b/i],
];
for (const [name, re] of unsafeDoneClaims) {
  const hasUnsafeClaim = lines.some((line) => {
    if (!re.test(line)) return false;
    return !/\b(no|not|ยังไม่|ห้าม)\b/i.test(line);
  });
  ok(`no unsafe done claim ${name}`, !hasUnsafeClaim);
}

ok("validator includes secret scan", /const secretPatterns/.test(self));

console.log(`\nDone v13.13 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
