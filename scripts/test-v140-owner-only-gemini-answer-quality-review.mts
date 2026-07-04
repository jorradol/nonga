/**
 * v14.0 owner-only Gemini answer quality review validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.0
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.0-owner-only-gemini-answer-quality-review-harness.md";
const FIXTURE_PATH = "docs/examples/v14.0-owner-only-gemini-answer-quality-evaluation-cases.synthetic.json";
const SELF_PATH = "scripts/test-v140-owner-only-gemini-answer-quality-review.mts";

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

function read(path: string): string {
  return normalize(readFileSync(path, "utf8"));
}

type EvalCase = {
  id: string;
  title: string;
  userMessage: string;
  syntheticCarCards: unknown[];
};

type Fixture = {
  version: string;
  scope: string;
  environment: string;
  dataPolicy: {
    syntheticOnly: boolean;
    noRealLead: boolean;
    noRealPii: boolean;
    noPhonePlateVin: boolean;
  };
  cases: EvalCase[];
  finalRecommendationEnum: string[];
  manualRetestGate: {
    requiresFreshOwnerApproval: boolean;
    noRetryWithoutFreshApproval: boolean;
    noSecondRunWithoutFreshApproval: boolean;
    agentGeminiRunAllowed: boolean;
  };
};

console.log("=== v14.0 Owner-Only Gemini Answer Quality Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 3500, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 4000, `${fixtureRaw.length} chars`);
ok("doc confirms v13 closure baseline", /OWNER-ONLY GEMINI RUNTIME PATH PROVED ON STAGING/i.test(doc));
ok("doc confirms v14 quality scope", /quality review/i.test(doc) && /does \*\*not\*\* repeat runtime proof/i.test(doc));

let fixture: Fixture | null = null;
try {
  fixture = JSON.parse(fixtureRaw) as Fixture;
  ok("fixture parse JSON", true);
} catch (err) {
  ok("fixture parse JSON", false, String(err));
}

if (!fixture) {
  console.log(`\nDone v14.0 validation - ${pass} PASS, ${fail} FAIL.\n`);
  if (process.exitCode) process.exit(process.exitCode);
  process.exit(1);
}

ok("fixture version is v14.0", fixture.version === "v14.0");
ok("fixture marks staging-only", fixture.environment === "staging-only");
ok("fixture marks synthetic only", fixture.dataPolicy?.syntheticOnly === true);
ok("fixture marks no real lead", fixture.dataPolicy?.noRealLead === true);
ok("fixture marks no real PII", fixture.dataPolicy?.noRealPii === true);
ok("fixture marks no phone/plate/vin", fixture.dataPolicy?.noPhonePlateVin === true);

const minimumCaseCount = fixture.cases.length;
ok("evaluation case count >= 8", minimumCaseCount >= 8, `count=${minimumCaseCount}`);
ok("evaluation case count >= 12 target", minimumCaseCount >= 12, `count=${minimumCaseCount}`);

const requiredCaseIds = [
  "Q01_budget_area_search",
  "Q02_compare_two_cards",
  "Q03_finance_monthly_question",
  "Q04_hidden_costs_used_car",
  "Q05_deposit_before_viewing",
  "Q06_family_city_trip_use_case",
  "Q07_context_switch_during_lead_intent",
  "Q08_contact_request_without_real_lead",
  "Q09_pii_refusal_plate_vin_phone",
  "Q10_finance_non_guarantee",
  "Q11_context_memory_preferences",
  "Q12_no_match_safe_alternative",
];

const caseIdSet = new Set(fixture.cases.map((c) => c.id));
for (const id of requiredCaseIds) {
  ok(`fixture includes case ${id}`, caseIdSet.has(id));
}

ok(
  "all cases are synthetic objects",
  fixture.cases.every(
    (c) =>
      typeof c.id === "string" &&
      c.id.length > 0 &&
      typeof c.title === "string" &&
      c.title.length > 0 &&
      typeof c.userMessage === "string" &&
      Array.isArray(c.syntheticCarCards)
  )
);

const finalRecommendations = new Set(fixture.finalRecommendationEnum ?? []);
const expectedFinalRecommendations = [
  "READY FOR OWNER MANUAL GEMINI QUALITY RETEST 1/1 — FRESH APPROVAL REQUIRED",
  "HOLD — V14.0 QUALITY HARNESS INCOMPLETE",
  "HOLD — GUARDRAIL GAP DETECTED",
  "HOLD — SECRET/PII/REAL LEAD RISK DETECTED",
];
for (const item of expectedFinalRecommendations) {
  ok(`final recommendation includes ${item}`, finalRecommendations.has(item));
}
ok("final recommendation enum size exact", finalRecommendations.size === 4);

ok(
  "manual retest gate requires fresh owner approval",
  fixture.manualRetestGate?.requiresFreshOwnerApproval === true
);
ok(
  "manual retest gate forbids retry",
  fixture.manualRetestGate?.noRetryWithoutFreshApproval === true
);
ok(
  "manual retest gate forbids second run",
  fixture.manualRetestGate?.noSecondRunWithoutFreshApproval === true
);
ok(
  "manual retest gate disallows agent Gemini run",
  fixture.manualRetestGate?.agentGeminiRunAllowed === false
);

const requiredChecklistMarkers: Array<[string, RegExp]> = [
  ["Thai naturalness rubric", /Thai naturalness: PASS \/ WARN \/ FAIL/i],
  ["answer relevance rubric", /answer relevance to user question: PASS \/ WARN \/ FAIL/i],
  ["buyer context rubric", /buyer context continuity: PASS \/ WARN \/ FAIL/i],
  ["car card grounding rubric", /car card grounding correctness: PASS \/ WARN \/ FAIL/i],
  ["finance non-guarantee rubric", /finance non-guarantee wording: PASS \/ WARN \/ FAIL/i],
  ["PDPA PII rubric", /PDPA\/PII safety refusal behavior: PASS \/ WARN \/ FAIL/i],
  ["lead flow safety rubric", /lead flow safety in v14 scope: PASS \/ WARN \/ FAIL/i],
  ["no hallucination rubric", /no hallucinated real vehicle facts: PASS \/ WARN \/ FAIL/i],
  ["fresh owner approval wording", /fresh owner approval is required/i],
];
for (const [name, re] of requiredChecklistMarkers) {
  ok(`doc includes ${name}`, re.test(doc));
}

const combined = `${doc}\n${fixtureRaw}`;

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["thai phone-like number", /\b0[689]\d{8}\b/],
  ["vin-like 17 chars", /\b[A-HJ-NPR-Z0-9]{17}\b/],
  ["raw gmail/yahoo style email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["api key pattern", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenExecutionPhrases: Array<[string, RegExp]> = [
  ["automatic Gemini run instruction", /\bautomatic gemini run\b/i],
  ["execute approved command hint", /execute-approved/i],
  ["activate public route command", /activate public route/i],
  ["send real lead command", /\b(?:send|dispatch)\s+real\s+lead\s+(?:now|immediately|directly)\b/i],
  ["deploy production command", /deploy production/i],
];
for (const [name, re] of forbiddenExecutionPhrases) {
  ok(`no forbidden execution phrase ${name}`, !re.test(combined));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator scans forbidden sensitive patterns", /forbiddenSensitivePatterns/.test(self));
ok("validator checks final recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.0 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
