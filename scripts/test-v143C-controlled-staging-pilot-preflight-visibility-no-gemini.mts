/**
 * v14.3C controlled staging pilot preflight visibility validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3C
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3C-controlled-staging-pilot-preflight-visibility-check-no-gemini.md";
const FIXTURE_PATH = "docs/examples/v14.3C-controlled-staging-pilot-preflight-visibility.synthetic.json";
const V143B_DOC_PATH = "docs/v14.3B-staging-only-pilot-gate-preflight-no-gemini.md";
const V142B_DOC_PATH =
  "docs/v14.2B-controlled-staging-deploy-thai-ux-evidence-surface-visibility-check.md";
const V141C_DOC_PATH = "docs/v14.1C-owner-manual-gemini-quality-retest-pass-closure.md";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143C-controlled-staging-pilot-preflight-visibility-no-gemini.mts";

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

console.log("=== v14.3C Controlled Staging Pilot Preflight Visibility Validation ===\n");

ok("v14.3C doc exists", existsSync(DOC_PATH));
ok("v14.3C fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3B doc exists", existsSync(V143B_DOC_PATH));
ok("v14.2B doc exists", existsSync(V142B_DOC_PATH));
ok("v14.1C doc exists", existsSync(V141C_DOC_PATH));
ok("owner one-run evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner helper panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143bDoc = read(V143B_DOC_PATH);
const v142bDoc = read(V142B_DOC_PATH);
const v141cDoc = read(V141C_DOC_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("v14.3C doc has substantial content", doc.length > 6200, `${doc.length} chars`);
ok("v14.3C fixture has substantial content", fixtureRaw.length > 5000, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const requiredExecutionNoLines: Array<[string, RegExp]> = [
  ["runtime execution no", /runtime execution:\s*no/i],
  ["Gemini run no", /Gemini run:\s*no/i],
  ["one-run click no", /one-run click:\s*no/i],
  ["retry no", /retry:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["provider network call no", /provider network call:\s*no/i],
  ["provider triggering endpoint no", /endpoint call that may trigger provider:\s*no/i],
  ["production deploy no", /production deploy:\s*no/i],
  ["staging deploy no", /staging deploy:\s*no/i],
  ["public route activation no", /public route activation:\s*no/i],
  ["real lead sending no", /real lead sending:\s*no/i],
  ["real customer pii no", /real customer data \/ PII:\s*no/i],
  ["phone plate vin no", /phone\/plate\/VIN examples:\s*no/i],
  ["secret exposure no", /secret\/token\/API key exposure:\s*no/i],
];
for (const [name, re] of requiredExecutionNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

const requiredVisibilityFields = [
  "runtimeMode",
  "userVisibleEnabled",
  "pilotPathActive",
  "fallbackToLegacy",
  "skipGemini",
  "providerNetwork",
  "gateReason",
  "guardPolicyVersion",
  "thaiUxTuningSliceId",
  "thaiUxTuningActive",
  "targetAnswerLengthGuidance",
  "leadPiiCueGuardActive",
  "phoneEchoGuardActive",
  "safeConfirmationStepWordingActive",
  "runSessionLocked",
  "freshOwnerApprovalRequired",
  "oneRunCountExplicit",
  "noRetry",
  "noSecondRun",
];
for (const field of requiredVisibilityFields) {
  ok(`doc includes visibility field ${field}`, doc.includes(`\`${field}\``));
}

const requiredOwnerWording = [
  "staging only",
  "owner/admin only",
  "synthetic/sanitized only",
  "no real buyer data",
  "no real phone capture",
  "no lead delivery",
  "no public route",
  "no production",
  "fresh owner approval required before any future one-run",
];
for (const wording of requiredOwnerWording) {
  ok(`doc includes owner wording ${wording}`, doc.includes(wording));
}

const requiredMisleadingFalseStatements: Array<[string, RegExp]> = [
  ["pilot active now no", /pilot active now:\s*no/i],
  ["public active now no", /public active now:\s*no/i],
  ["production active now no", /production active now:\s*no/i],
  ["real lead path active now no", /real lead path active now:\s*no/i],
  [
    "Gemini ready now without approval no",
    /Gemini ready to run now without fresh approval:\s*no/i,
  ],
  ["retry allowed no", /retry allowed:\s*no/i],
  ["second run allowed no", /second run allowed:\s*no/i],
];
for (const [name, re] of requiredMisleadingFalseStatements) {
  ok(`doc includes anti-misleading statement ${name}`, re.test(doc));
}

const misleadingPositivePatterns: Array<[string, RegExp]> = [
  ["pilot already started yes", /\bpilot already started:\s*yes\b/i],
  ["public active now yes", /\bpublic active now:\s*yes\b/i],
  ["production active now yes", /\bproduction active now:\s*yes\b/i],
  ["real lead path active now yes", /\breal lead path active now:\s*yes\b/i],
  ["retry allowed yes", /\bretry allowed:\s*yes\b/i],
  ["second run allowed yes", /\bsecond run allowed:\s*yes\b/i],
];
for (const [name, re] of misleadingPositivePatterns) {
  ok(`doc does not include misleading positive pattern ${name}`, !re.test(doc));
}

const expectedFinalRecommendations = [
  "READY FOR v14.3D OWNER-ONLY PILOT DRY-RUN PLAN — NO RUNTIME EXECUTION",
  "READY FOR v14.3D CONTROLLED OWNER APPROVAL PACKET — NO GEMINI YET",
  "HOLD — PREFLIGHT VISIBILITY INCOMPLETE",
  "HOLD — OWNER APPROVAL / ONE-RUN WORDING AMBIGUITY",
  "HOLD — ROUTE/AUTH/GUARD VISIBILITY AMBIGUITY",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — SECRET/PII RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

ok(
  "owner evidence model includes runtime and guard visibility fields",
  /runtimeMode:\s*string;/.test(ownerEvidence) &&
    /userVisibleEnabled:\s*string;/.test(ownerEvidence) &&
    /pilotPathActive:\s*string;/.test(ownerEvidence) &&
    /fallbackToLegacy:\s*string;/.test(ownerEvidence) &&
    /skipGemini:\s*string;/.test(ownerEvidence) &&
    /providerNetwork:\s*string;/.test(ownerEvidence) &&
    /gateReason:\s*string;/.test(ownerEvidence) &&
    /guardPolicyVersion:\s*string;/.test(ownerEvidence) &&
    /thaiUxTuningSliceId:\s*string;/.test(ownerEvidence) &&
    /thaiUxTuningActive:\s*string;/.test(ownerEvidence) &&
    /targetAnswerLengthGuidance:\s*string;/.test(ownerEvidence) &&
    /leadPiiCueGuardActive:\s*string;/.test(ownerEvidence) &&
    /phoneEchoGuardActive:\s*string;/.test(ownerEvidence) &&
    /safeConfirmationStepWordingActive:\s*string;/.test(ownerEvidence) &&
    /runSessionLocked:\s*boolean;/.test(ownerEvidence)
);

ok(
  "owner panel includes fresh approval and lock/no-retry wording",
  /fresh owner authorization/.test(ownerPanel) &&
    /sessionLocked=/.test(ownerPanel) &&
    /noRetry=true/.test(ownerPanel) &&
    /noSecondRunWithoutFreshApproval=true/.test(ownerPanel) &&
    /Run owner-only Gemini UX one-run \(1\/1\)/.test(ownerPanel)
);

ok(
  "v14.1C evidence contains owner-visible runtime and Gemini path fields",
  /runtimeMode=high/.test(v141cDoc) &&
    /userVisibleEnabled=true/.test(v141cDoc) &&
    /pilotPathActive=true/.test(v141cDoc) &&
    /fallbackToLegacy=false/.test(v141cDoc) &&
    /skipGemini=false/.test(v141cDoc) &&
    /providerNetwork=true/.test(v141cDoc) &&
    /gateReason=real_provider_call_ok/.test(v141cDoc)
);

ok(
  "v14.2B and v14.3B docs preserve no-provider preflight boundary",
  /provider network call:\s*no/i.test(v142bDoc) &&
    /Gemini run:\s*no/i.test(v142bDoc) &&
    /provider network call:\s*no/i.test(v143bDoc) &&
    /Gemini run:\s*no/i.test(v143bDoc)
);

ok(
  "v14.2B and v14.3B docs preserve guard and Thai UX marker visibility",
  /thaiUxTuningSliceId/.test(v142bDoc) &&
    /thaiUxTuningActive/.test(v142bDoc) &&
    /targetAnswerLengthGuidance/.test(v142bDoc) &&
    /leadPiiCueGuardActive/.test(v142bDoc) &&
    /phoneEchoGuardActive/.test(v142bDoc) &&
    /safeConfirmationStepWordingActive/.test(v142bDoc) &&
    /guardPolicyVersion=v14\.1-lead-pii-cue-guard/.test(v143bDoc)
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.3C", root.version === "v14.3C");

  const executionType = root.executionType as Record<string, unknown>;
  ok(
    "fixture execution type is static/read-only and non-runtime",
    executionType?.staticMockOnly === true &&
      executionType?.readOnlyInspectionOnly === true &&
      executionType?.runtimeExecution === false &&
      executionType?.geminiRun === false &&
      executionType?.oneRunClick === false &&
      executionType?.retry === false &&
      executionType?.secondRun === false &&
      executionType?.providerNetworkCall === false &&
      executionType?.providerTriggeringEndpointCall === false &&
      executionType?.deploy === false
  );

  const scope = root.scope as Record<string, unknown>;
  ok(
    "fixture scope preserves staging/owner/synthetic and no-risk boundaries",
    scope?.stagingOnly === true &&
      scope?.ownerAdminOnly === true &&
      scope?.syntheticSanitizedOnly === true &&
      scope?.noRealBuyerData === true &&
      scope?.noRealPhoneCapture === true &&
      scope?.noLeadDelivery === true &&
      scope?.noPublicRoute === true &&
      scope?.noProduction === true &&
      scope?.noRealCustomerDataPii === true &&
      scope?.noPhonePlateVinExamples === true &&
      scope?.noSecretTokenApiKeyExposure === true
  );

  const visibility = root.ownerVisibilityFields as Record<string, unknown>;
  for (const field of requiredVisibilityFields) {
    const entry = visibility?.[field] as Record<string, unknown> | undefined;
    ok(`fixture requires visibility field ${field}`, entry?.required === true);
  }

  const evidenceFields = root.evidenceFieldsForGoHold as Record<string, unknown>;
  const requiredEvidenceFields = [
    "sanitizedUserVisibleText",
    "missingUserVisibleText",
    "missingUserVisibleTextReason",
    "answerFieldSource",
    "answerCharCount",
    "capturedAt",
    "auth",
    "httpStatus",
    "requestUidMasked",
    "allowlistMasked",
    "allowlistMatch",
    "allowlistCount",
  ];
  for (const field of requiredEvidenceFields) {
    ok(`fixture requires evidence field ${field}`, evidenceFields?.[field] === true);
  }

  const misleadingFlags = root.misleadingWordingMustRemainFalse as Record<string, unknown>;
  ok(
    "fixture enforces false misleading wording flags",
    misleadingFlags?.pilotAlreadyActiveClaim === false &&
      misleadingFlags?.publicAlreadyActiveClaim === false &&
      misleadingFlags?.productionAlreadyActiveClaim === false &&
      misleadingFlags?.realLeadAlreadyActiveClaim === false &&
      misleadingFlags?.geminiRunWithoutFreshApprovalClaim === false &&
      misleadingFlags?.retryAllowedClaim === false &&
      misleadingFlags?.secondRunAllowedClaim === false
  );

  const requiredWording = Array.isArray(root.requiredOwnerVisibilityWording)
    ? root.requiredOwnerVisibilityWording
    : [];
  for (const wording of requiredOwnerWording) {
    ok(`fixture includes wording ${wording}`, requiredWording.includes(wording));
  }
  ok("fixture includes wording no retry", requiredWording.includes("no retry"));
  ok("fixture includes wording no second run", requiredWording.includes("no second run"));

  const holdRules = Array.isArray(root.stopHoldRulesRequired) ? root.stopHoldRulesRequired : [];
  ok("fixture stop/hold rule count >= 10", holdRules.length >= 10, `count=${holdRules.length}`);

  const finalEnum = Array.isArray(root.finalRecommendationEnum) ? root.finalRecommendationEnum : [];
  for (const expected of expectedFinalRecommendations) {
    ok(`fixture includes final recommendation ${expected}`, finalEnum.includes(expected));
  }
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone style", /\b0[689]\d{8}\b/],
  ["thai plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

ok("validator checks final recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.3C visibility validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
