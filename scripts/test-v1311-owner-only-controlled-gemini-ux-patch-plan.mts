/**
 * v13.11 owner-only controlled Gemini UX patch plan validator
 * Static checks only. No runtime/deploy/smoke/Gemini execution.
 *
 * npm run test:v13.11
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v13.11-owner-only-controlled-gemini-ux-patch-plan.md";
const SELF_PATH = "scripts/test-v1311-owner-only-controlled-gemini-ux-patch-plan.mts";

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

console.log("=== v13.11 Owner-Only Controlled Gemini UX Patch Plan Validation ===\n");

ok("doc file exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));

ok("doc has substantial content", doc.length > 5000, `${doc.length} chars`);

const requiredExecutionLines: Array<[string, RegExp]> = [
  ["prepare-only yes", /prepare-only:\s*yes/i],
  ["docs test package only yes", /docs\/test\/package only:\s*yes/i],
  ["code path audit patch plan yes", /code path audit\s*\/\s*patch plan:\s*yes/i],
  ["no runtime behavior change", /no runtime behavior change/i],
  ["no deploy", /no deploy/i],
  ["no runtime config change", /no runtime config change/i],
  ["no Gemini execution", /no Gemini execution/i],
  ["no smoke endpoint", /no smoke endpoint/i],
  ["no production", /no production/i],
  ["no public route", /no public route/i],
  ["no buyer-facing release", /no buyer-facing release/i],
  ["no real lead", /no real lead/i],
  ["no real PII", /no real PII/i],
];
for (const [name, re] of requiredExecutionLines) {
  ok(`execution type includes ${name}`, re.test(doc));
}

ok("has baseline commit 80810d2", /latest commit:\s*`?80810d2`?/i.test(doc));
ok("has v13.10 accepted context", /v13\.10 accepted/i.test(doc));
ok("has owner manual trial pass", /owner manual trial PASS/i.test(doc));
ok(
  "has same-chat context switching pass",
  /same-chat context switching PASS/i.test(doc)
);
ok(
  "has controlled Gemini UX gate pass",
  /controlled Gemini UX gate PASS/i.test(doc)
);

const requiredSections: Array<[string, RegExp]> = [
  ["chat handling", /chat response handling|chat handling/i],
  ["deterministic guardrail", /deterministic guard/i],
  ["Gemini provider dispatch", /provider dispatch|Gemini\/provider/i],
  ["memory context handling", /memory\/context|context switching/i],
  ["lead confirmation", /lead confirmation/i],
  ["PII handling", /PII/i],
  ["seller fun finance", /seller.*fun.*finance|seller \/ fun \/ finance/i],
  ["controlled Gemini patch zones", /controlled Gemini patch zones|candidate zones/i],
  ["must remain deterministic zones", /must-remain deterministic zones/i],
  ["hybrid zones", /hybrid zones/i],
  ["required guard position", /required guard position/i],
  ["owner-only activation design", /owner-only activation design/i],
  ["rollback kill switch plan", /rollback.*kill switch plan/i],
  ["risk table", /risk table/i],
];
for (const [name, re] of requiredSections) {
  ok(`has section ${name}`, re.test(doc));
}

const finalRecommendationAllowed = [
  "READY FOR OWNER APPROVAL TO EXECUTE v13.12 OWNER-ONLY CONTROLLED GEMINI UX PATCH",
  "HOLD — controlled Gemini UX patch plan incomplete",
  "HOLD — unsafe patch boundary detected",
];
const finalRecMatches = finalRecommendationAllowed.filter((line) => doc.includes(line));
ok(
  "final recommendation is one allowed value",
  finalRecMatches.length === 1,
  finalRecMatches.join(" | ")
);

const secretPatternScan: Array<[string, RegExp]> = [
  ["google api key style", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key style", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  ["generic api key assignment", /\bapi[_-]?key\b\s*[:=]\s*["'`]?[\w\-]{16,}/i],
  ["generic token assignment", /\btoken\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["generic secret assignment", /\bsecret\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["bearer token style", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
];
for (const [name, re] of secretPatternScan) {
  ok(`no secret pattern: ${name}`, !re.test(doc));
}

const disallowedCommandScan: Array<[string, RegExp]> = [
  ["firebase deploy command", /\bfirebase\b[^\n]*\bdeploy\b/i],
  ["gcloud deploy command", /\bgcloud\b[^\n]*\bdeploy\b/i],
  ["npm deploy command", /(^|\n)\s*(npm|pnpm|yarn)\s+run\s+deploy\b/i],
  ["generic deploy command", /(^|\n)\s*deploy\b/i],
  ["smoke endpoint invocation", /(^|\n)\s*(curl|Invoke-WebRequest|wget)\b[^\n]*smoke/i],
  ["Gemini admin smoke wording", /\bGemini admin smoke\b/i],
];
for (const [name, re] of disallowedCommandScan) {
  ok(`no disallowed command: ${name}`, !re.test(doc));
}

const unsafeActivationClaims: Array<[string, RegExp]> = [
  ["buyer-facing opened", /\bbuyer-facing\b.*\b(opened|enabled|active|released|live)\b/i],
  ["public route opened", /\bpublic route\b.*\b(opened|enabled|active|released|live)\b/i],
  ["production opened", /\bproduction\b.*\b(opened|enabled|active|released|live)\b/i],
];
for (const [name, re] of unsafeActivationClaims) {
  ok(`no unsafe activation claim: ${name}`, !re.test(doc));
}

ok("validator includes secret scan", /const secretPatternScan/.test(self));

console.log(`\nDone v13.11 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
