/**
 * v14.3A limited staging pilot checklist validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3A
 */
import { existsSync, readFileSync } from "node:fs";

const V143_PLAN_DOC_PATH = "docs/v14.3-limited-staging-pilot-readiness-planning.md";
const V143A_DOC_PATH = "docs/v14.3A-limited-staging-pilot-checklist-validator.md";
const FIXTURE_PATH = "docs/examples/v14.3A-limited-staging-pilot-checklist.synthetic.json";
const V142C_DOC_PATH = "docs/v14.2C-owner-manual-gemini-quality-retest-pass-closure.md";
const V142A_DOC_PATH = "docs/v14.2A-owner-only-quality-evidence-surface-thai-ux-tuning-marker.md";
const V141C_DOC_PATH = "docs/v14.1C-owner-manual-gemini-quality-retest-pass-closure.md";
const SELF_PATH = "scripts/test-v143A-limited-staging-pilot-checklist-validator.mts";

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

console.log("=== v14.3A Limited Staging Pilot Checklist Validator ===\n");

ok("v14.3 plan doc exists", existsSync(V143_PLAN_DOC_PATH));
ok("v14.3A doc exists", existsSync(V143A_DOC_PATH));
ok("v14.3A fixture exists", existsSync(FIXTURE_PATH));
ok("v14.2C closure doc exists", existsSync(V142C_DOC_PATH));
ok("v14.2A evidence doc exists", existsSync(V142A_DOC_PATH));
ok("v14.1C closure doc exists", existsSync(V141C_DOC_PATH));
ok("self exists", existsSync(SELF_PATH));

const v143PlanDoc = read(V143_PLAN_DOC_PATH);
const v143aDoc = read(V143A_DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v142cDoc = read(V142C_DOC_PATH);
const v142aDoc = read(V142A_DOC_PATH);
const v141cDoc = read(V141C_DOC_PATH);
const self = read(SELF_PATH);

ok("v14.3A doc has substantial content", v143aDoc.length > 4200, `${v143aDoc.length} chars`);
ok("v14.3A fixture has substantial content", fixtureRaw.length > 2200, `${fixtureRaw.length} chars`);
ok("v14.3 plan remains substantial", v143PlanDoc.length > 7000, `${v143PlanDoc.length} chars`);

const requiredBoundaryLines: Array<[string, RegExp]> = [
  ["owner/admin only", /owner\/admin only/i],
  ["staging only", /staging only/i],
  ["synthetic/sanitized inventory only", /synthetic(?: or)? sanitized inventory only/i],
  ["no public route activation", /no public route activation/i],
  ["no production deploy", /no production deploy/i],
  ["no real lead sending", /no real lead sending/i],
  ["no real buyer/customer data", /no real buyer\/customer data/i],
  ["no pii", /no PII/i],
  ["no phone capture in chat", /no phone capture in chat/i],
  ["no plate/vin exposure", /no plate\/VIN exposure/i],
  ["no secret/token/api key exposure", /no secret\/token\/API key exposure/i],
  ["no Thor real data import", /no Thor real data import/i],
  ["no dealer real inventory import", /no dealer real inventory import/i],
];
for (const [name, re] of requiredBoundaryLines) {
  ok(`v14.3A doc includes boundary gate ${name}`, re.test(v143aDoc));
}

const requiredApprovalLines: Array<[string, RegExp]> = [
  ["fresh owner approval required", /fresh owner approval required for any one-run/i],
  ["one-run count explicit", /one-run count explicit/i],
  ["no retry", /no retry/i],
  ["no second run", /no second run/i],
];
for (const [name, re] of requiredApprovalLines) {
  ok(`v14.3A doc includes approval gate ${name}`, re.test(v143aDoc));
}

const requiredGuardLines: Array<[string, RegExp]> = [
  ["lead pii cue guard required", /lead\/PII cue guard required/i],
  ["phone echo guard required", /phone echo guard required/i],
  ["safe confirmation wording required", /safe confirmation wording required/i],
  ["thai ux tuning marker required", /Thai UX tuning marker required/i],
  ["no finance guarantee", /no finance guarantee/i],
  ["no hallucinated vehicle facts", /no hallucinated vehicle facts/i],
  ["evidence capture required", /evidence capture required/i],
  ["runSessionLocked required", /runSessionLocked \(or equivalent one-run lock\) required/i],
  ["clear Stop/HOLD rules", /clear Stop\/HOLD rules/i],
];
for (const [name, re] of requiredGuardLines) {
  ok(`v14.3A doc includes safety gate ${name}`, re.test(v143aDoc));
}

ok(
  "v14.3A doc explains PASS meaning",
  /PASS means documentation and synthetic checklist contract are complete/i.test(v143aDoc)
);
ok("v14.3A doc says PASS is not runtime permission", /PASS does not mean runtime permission/i.test(v143aDoc));
ok(
  "v14.3A doc states no public/production/real lead after PASS",
  /still no public route activation/i.test(v143aDoc) &&
    /still no production deploy/i.test(v143aDoc) &&
    /still no real lead sending/i.test(v143aDoc)
);

ok(
  "v14.3A doc includes next safe steps",
  /v14\.3B STAGING-ONLY PILOT GATE PREFLIGHT — NO GEMINI YET/.test(v143aDoc) &&
    /v14\.3B OWNER-ONLY PILOT DRY-RUN PLAN — FRESH APPROVAL REQUIRED LATER/.test(v143aDoc)
);

const expectedFinalRecommendations = [
  "READY FOR v14.3B STAGING-ONLY PILOT GATE PREFLIGHT — NO GEMINI YET",
  "READY FOR v14.3B OWNER-ONLY PILOT DRY-RUN PLAN — NO RUNTIME EXECUTION",
  "HOLD — PILOT CHECKLIST VALIDATOR INCOMPLETE",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — SECRET/PII RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`v14.3A doc includes final recommendation ${value}`, v143aDoc.includes(value));
}

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses as JSON", true);
} catch (err) {
  ok("fixture parses as JSON", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.3A", root.version === "v14.3A");
  ok(
    "fixture has static/mock execution booleans",
    (root.executionType as Record<string, unknown>)?.staticMockOnly === true &&
      (root.executionType as Record<string, unknown>)?.runtimeExecution === false &&
      (root.executionType as Record<string, unknown>)?.geminiRun === false &&
      (root.executionType as Record<string, unknown>)?.providerNetworkCall === false &&
      (root.executionType as Record<string, unknown>)?.deploy === false
  );
  ok(
    "fixture has required scope booleans",
    (root.scope as Record<string, unknown>)?.ownerAdminOnly === true &&
      (root.scope as Record<string, unknown>)?.stagingOnly === true &&
      (root.scope as Record<string, unknown>)?.syntheticOrSanitizedInventoryOnly === true &&
      (root.scope as Record<string, unknown>)?.noPublicRouteActivation === true &&
      (root.scope as Record<string, unknown>)?.noProductionDeploy === true &&
      (root.scope as Record<string, unknown>)?.noRealLeadSending === true &&
      (root.scope as Record<string, unknown>)?.noRealBuyerCustomerData === true &&
      (root.scope as Record<string, unknown>)?.noPii === true &&
      (root.scope as Record<string, unknown>)?.noPhoneCaptureInChat === true &&
      (root.scope as Record<string, unknown>)?.noPlateVinExposure === true &&
      (root.scope as Record<string, unknown>)?.noSecretTokenApiKeyExposure === true &&
      (root.scope as Record<string, unknown>)?.noThorRealDataImport === true &&
      (root.scope as Record<string, unknown>)?.noDealerRealInventoryImport === true
  );
  ok(
    "fixture has approval policy booleans",
    (root.approvalPolicy as Record<string, unknown>)?.freshOwnerApprovalRequiredForAnyOneRun === true &&
      (root.approvalPolicy as Record<string, unknown>)?.oneRunCountMustBeExplicit === true &&
      (root.approvalPolicy as Record<string, unknown>)?.noRetry === true &&
      (root.approvalPolicy as Record<string, unknown>)?.noSecondRun === true
  );
  ok(
    "fixture has required guards booleans",
    (root.requiredGuards as Record<string, unknown>)?.leadPiiCueGuardRequired === true &&
      (root.requiredGuards as Record<string, unknown>)?.phoneEchoGuardRequired === true &&
      (root.requiredGuards as Record<string, unknown>)?.safeConfirmationWordingRequired === true &&
      (root.requiredGuards as Record<string, unknown>)?.thaiUxTuningMarkerRequired === true &&
      (root.requiredGuards as Record<string, unknown>)?.noFinanceGuarantee === true &&
      (root.requiredGuards as Record<string, unknown>)?.noHallucinatedVehicleFacts === true &&
      (root.requiredGuards as Record<string, unknown>)?.evidenceCaptureRequired === true &&
      (root.requiredGuards as Record<string, unknown>)?.runSessionLockedRequired === true
  );
  ok(
    "fixture required markers align with v14.1/v14.2/v14.2C evidence",
    (root.requiredMarkers as Record<string, unknown>)?.guardPolicyVersion === "v14.1-lead-pii-cue-guard" &&
      (root.requiredMarkers as Record<string, unknown>)?.thaiUxTuningSliceId === "v14.2" &&
      (root.requiredMarkers as Record<string, unknown>)?.targetAnswerLengthGuidance === "4-7-sentences" &&
      (root.requiredMarkers as Record<string, unknown>)?.evidenceFieldSource === "sanitizedUserVisibleText" &&
      (root.requiredMarkers as Record<string, unknown>)?.runSessionLockField === "runSessionLocked"
  );

  const holdRules = Array.isArray(root.stopHoldRulesRequired) ? root.stopHoldRulesRequired : [];
  ok("fixture includes stop/hold rule count >= 10", holdRules.length >= 10, `count=${holdRules.length}`);

  const finalEnum = Array.isArray(root.finalRecommendationEnum) ? root.finalRecommendationEnum : [];
  for (const expected of expectedFinalRecommendations) {
    ok(`fixture includes final recommendation ${expected}`, finalEnum.includes(expected));
  }
}

ok(
  "cross-doc: v14.2C has runSessionLocked and evidence fields",
  /runSessionLocked=true/.test(v142cDoc) &&
    /sanitizedUserVisibleText=present/.test(v142cDoc) &&
    /answerFieldSource=sanitizedUserVisibleText/.test(v142cDoc)
);
ok(
  "cross-doc: v14.2A has Thai UX and guard markers",
  /thaiUxTuningSliceId = "v14\.2"/.test(v142aDoc) &&
    /thaiUxTuningActive = true/.test(v142aDoc) &&
    /targetAnswerLengthGuidance = "4-7-sentences"/.test(v142aDoc) &&
    /leadPiiCueGuardActive = true/.test(v142aDoc) &&
    /phoneEchoGuardActive = true/.test(v142aDoc) &&
    /safeConfirmationStepWordingActive = true/.test(v142aDoc)
);
ok(
  "cross-doc: v14.1C has guard policy marker",
  /guardPolicyVersion=v14\.1-lead-pii-cue-guard/.test(v141cDoc)
);
ok(
  "cross-doc: v14.3 plan has stop/hold and owner approval rules",
  /Stop\/HOLD rules/.test(v143PlanDoc) &&
    /fresh owner approval is required for any one-run action/.test(v143PlanDoc) &&
    /one-run count must be explicit/.test(v143PlanDoc)
);

const combinedContent = `${v143aDoc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone style", /\b0[689]\d{8}\b/],
  ["thai plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combinedContent));
}

ok("validator includes static check design", /Static checks only/i.test(self));
ok("validator checks final recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.3A checklist validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
