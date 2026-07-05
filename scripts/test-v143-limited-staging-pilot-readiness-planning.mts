/**
 * v14.3 limited staging pilot readiness planning validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3-limited-staging-pilot-readiness-planning.md";
const SELF_PATH = "scripts/test-v143-limited-staging-pilot-readiness-planning.mts";

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

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

console.log("=== v14.3 Limited Staging Pilot Readiness Planning Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 6500, `${doc.length} chars`);
ok("doc states docs/planning/static only", /docs\/planning\/static validation only:\s*yes/i.test(doc));
ok("doc states no Gemini run", /Gemini run:\s*no/i.test(doc));
ok("doc states no one-run click", /one-run click:\s*no/i.test(doc));
ok("doc states no retry", /retry:\s*no/i.test(doc));
ok("doc states no second run", /second run:\s*no/i.test(doc));
ok("doc states no provider network call", /provider network call:\s*no/i.test(doc));
ok("doc states no production deploy", /production deploy:\s*no/i.test(doc));
ok("doc states no public route activation", /public route activation:\s*no/i.test(doc));
ok("doc states no real lead sending", /real lead sending:\s*no/i.test(doc));
ok("doc states no real customer data pii", /real customer data \/ PII:\s*no/i.test(doc));
ok("doc states no phone/plate/vin examples", /phone\/plate\/VIN examples:\s*no/i.test(doc));
ok("doc states no secret exposure", /secret\/token\/API key exposure:\s*no/i.test(doc));
ok("doc states no Thor real data import", /Thor real data import:\s*no/i.test(doc));
ok("doc states no dealer real inventory import", /dealer real inventory import:\s*no/i.test(doc));
ok("doc states no runtime config mutation", /runtime config mutation:\s*no/i.test(doc));
ok("doc states no secret value change", /secret value change:\s*no/i.test(doc));

ok(
  "doc has proven readiness anchors",
  /owner-only Gemini runtime path/i.test(doc) &&
    /guardPolicyVersion=v14\.1-lead-pii-cue-guard/.test(doc) &&
    /thaiUxTuningSliceId=v14\.2/.test(doc) &&
    /thaiUxTuningActive=true/.test(doc) &&
    /targetAnswerLengthGuidance=4-7-sentences/.test(doc) &&
    /sanitizedUserVisibleText/.test(doc)
);

ok(
  "doc explicitly lists still-not-allowed scope",
  /What is still NOT allowed in v14\.3/i.test(doc) &&
    /no public route activation/.test(doc) &&
    /no production deploy/.test(doc) &&
    /no real lead sending/.test(doc) &&
    /no real customer data \/ PII/.test(doc) &&
    /no Thor real data import/.test(doc) &&
    /no dealer real inventory import/.test(doc)
);

ok(
  "doc has limited pilot scope proposal",
  /Limited staging pilot scope proposal/i.test(doc) &&
    /owner\/admin only/.test(doc) &&
    /staging only/.test(doc) &&
    /synthetic or sanitized inventory only/.test(doc) &&
    /no real buyer\/customer data/.test(doc) &&
    /no real phone collection in chat/.test(doc) &&
    /no lead delivery/.test(doc)
);

const requiredChecklistAnchors = [
  "auth gate active",
  "allowlist",
  "runtime marker",
  "Thai UX marker",
  "lead/PII cue guard",
  "phone echo guard",
  "no finance approval/condition guarantee language",
  "no hallucinated vehicle facts",
  "evidence capture",
  "manual stop condition",
];
for (const anchor of requiredChecklistAnchors) {
  ok(`doc includes checklist anchor ${anchor}`, doc.includes(anchor));
}

const requiredRiskAnchors = [
  "Accidental public exposure",
  "Lead/PII cue regression",
  "Phone echo regression",
  "Hallucinated vehicle facts",
  "Finance/condition guarantee claims",
  "Real lead path accidentally triggered",
  "Staging/production confusion",
];
for (const anchor of requiredRiskAnchors) {
  ok(`doc includes risk matrix anchor ${anchor}`, doc.includes(anchor));
}

ok(
  "doc has stop hold rules section",
  /Stop\/HOLD rules/.test(doc) &&
    /Stop immediately and mark `HOLD`/.test(doc) &&
    /No progression to runtime action is allowed while HOLD conditions remain open\./.test(doc)
);

ok(
  "doc has owner approval rules with one-run constraints",
  /fresh owner approval is required for any one-run action/.test(doc) &&
    /one-run count must be explicit/.test(doc) &&
    /one-run only per approval event/.test(doc) &&
    /no retry/.test(doc) &&
    /no second run/.test(doc)
);

ok(
  "doc has v14.3A next-step recommendations",
  /v14\.3A pilot checklist validator/.test(doc) &&
    /v14\.3A staging-only pilot gate implementation\/preflight/.test(doc)
);

const expectedFinalRecommendations = [
  "READY FOR v14.3A LIMITED STAGING PILOT CHECKLIST VALIDATOR — NO RUNTIME EXECUTION",
  "READY FOR v14.3A STAGING-ONLY PILOT GATE PREFLIGHT — NO GEMINI YET",
  "HOLD — PILOT READINESS PLAN INCOMPLETE",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — SECRET/PII RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone style", /\b0[689]\d{8}\b/],
  ["thai plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(doc));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator checks final recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.3 planning validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
