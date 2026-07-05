/**
 * v14.3F owner-only pilot dry-run plan validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3F
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3F-owner-only-pilot-dry-run-plan-no-runtime-execution.md";
const FIXTURE_PATH = "docs/examples/v14.3F-owner-only-pilot-dry-run-plan.synthetic.json";
const V143E_DOC_PATH = "docs/v14.3E-fresh-owner-approval-request-draft-no-gemini.md";
const V143D_DOC_PATH = "docs/v14.3D-controlled-owner-approval-packet-no-gemini.md";
const V143C_DOC_PATH = "docs/v14.3C-controlled-staging-pilot-preflight-visibility-check-no-gemini.md";
const V143B_DOC_PATH = "docs/v14.3B-staging-only-pilot-gate-preflight-no-gemini.md";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143F-owner-only-pilot-dry-run-plan-no-runtime-execution.mts";

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

console.log("=== v14.3F Owner-Only Pilot Dry-Run Plan Validation ===\n");

ok("v14.3F doc exists", existsSync(DOC_PATH));
ok("v14.3F fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3E doc exists", existsSync(V143E_DOC_PATH));
ok("v14.3D doc exists", existsSync(V143D_DOC_PATH));
ok("v14.3C doc exists", existsSync(V143C_DOC_PATH));
ok("v14.3B doc exists", existsSync(V143B_DOC_PATH));
ok("owner evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143eDoc = read(V143E_DOC_PATH);
const v143dDoc = read(V143D_DOC_PATH);
const v143cDoc = read(V143C_DOC_PATH);
const v143bDoc = read(V143B_DOC_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 5600, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 3800, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const requiredNoLines: Array<[string, RegExp]> = [
  ["runtime execution no", /runtime execution:\s*no/i],
  ["Gemini run no", /Gemini run:\s*no/i],
  ["one-run click no", /one-run click:\s*no/i],
  ["retry no", /retry:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["provider call no", /provider network call:\s*no/i],
  ["provider endpoint no", /endpoint call that may trigger provider:\s*no/i],
  ["production deploy no", /production deploy:\s*no/i],
  ["staging deploy no", /staging deploy:\s*no/i],
  ["public route activation no", /public route activation:\s*no/i],
  ["real lead sending no", /real lead sending:\s*no/i],
];
for (const [name, re] of requiredNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

ok(
  "doc records final execution authorization line",
  /FINAL EXECUTION AUTHORIZE v14\.3F: YES — exactly ONE owner-only staging dry-run, no retry, no second run, staging only, owner\/admin only, synthetic\/sanitized only, no public, no production, no real lead\./.test(
    doc
  )
);

ok(
  "doc enforces non-execution lock now",
  /runtime action now:\s*no/i.test(doc) &&
    /one-run consumed now:\s*no/i.test(doc) &&
    /retry consumed now:\s*no/i.test(doc) &&
    /second run consumed now:\s*no/i.test(doc)
);

const futureBoundaryItems = [
  "staging only",
  "owner/admin only",
  "allowlist only",
  "synthetic/sanitized only",
  "no real buyer data",
  "no phone capture",
  "no lead delivery",
  "no public route",
  "no production",
  "exactly one run only",
  "no retry",
  "no second run",
  "runSessionLocked required",
];
for (const item of futureBoundaryItems) {
  ok(`doc includes future boundary item ${item}`, doc.includes(`- ${item}`));
}

const plannedEvidenceFields = [
  "httpStatus",
  "auth",
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
  "sanitizedUserVisibleText",
  "missingUserVisibleText",
  "missingUserVisibleTextReason",
  "answerFieldSource",
  "answerCharCount",
  "runSessionLocked",
  "oneRunConsumed",
  "noRetry",
  "noSecondRun",
  "boundary confirmation",
];
for (const field of plannedEvidenceFields) {
  ok(`doc includes planned evidence field ${field}`, doc.includes(`\`${field}\``));
}

const antiMisleadingPlanLines: Array<[string, RegExp]> = [
  ["Gemini run now no", /Gemini run now:\s*no/i],
  ["one-run approval granted now yes", /one-run approval granted now:\s*yes/i],
  ["one-run executed now no", /one-run executed now:\s*no/i],
  ["pilot active now no", /pilot active now:\s*no/i],
  ["public active now no", /public active now:\s*no/i],
  ["production active now no", /production active now:\s*no/i],
  ["real lead path active now no", /real lead path active now:\s*no/i],
  ["retry allowed no", /retry allowed:\s*no/i],
  ["second run allowed no", /second run allowed:\s*no/i],
];
for (const [name, re] of antiMisleadingPlanLines) {
  ok(`doc includes anti-misleading plan line ${name}`, re.test(doc));
}

const expectedFinalRecommendations = [
  "READY FOR v14.3G OWNER-ONLY ONE-RUN EXECUTION RECORD — STRICT SINGLE RUN",
  "READY FOR v14.3G CONTROLLED EXECUTION HANDOFF — NO RETRY / NO SECOND RUN",
  "HOLD — DRY-RUN PLAN INCOMPLETE",
  "HOLD — APPROVAL/BOUNDARY WORDING AMBIGUITY",
  "HOLD — ONE-RUN LOCK/COUNT CONTROL INCOMPLETE",
  "HOLD — POST-RUN EVIDENCE PLAN INCOMPLETE",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — SECRET/PII RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

ok(
  "cross-doc lineage keeps authorization and fresh approval history",
  /FINAL EXECUTION AUTHORIZE v14\.3F: YES/.test(v143eDoc) &&
    /approval status now:\s*not granted/i.test(v143dDoc) &&
    /fresh owner approval required before any future one-run/.test(v143cDoc) &&
    /Gemini run:\s*no/i.test(v143bDoc)
);

ok(
  "owner evidence/panel still include lock and control markers",
  /runSessionLocked:\s*boolean;/.test(ownerEvidence) &&
    /noRetry=true/.test(ownerPanel) &&
    /noSecondRunWithoutFreshApproval=true/.test(ownerPanel)
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
  ok("fixture version is v14.3F", root.version === "v14.3F");

  const executionType = root.executionType as Record<string, unknown>;
  ok(
    "fixture execution type remains static non-runtime",
    executionType?.staticMockOnly === true &&
      executionType?.readOnlyInspectionOnly === true &&
      executionType?.runtimeExecution === false &&
      executionType?.geminiRun === false &&
      executionType?.oneRunClick === false &&
      executionType?.retry === false &&
      executionType?.secondRun === false &&
      executionType?.providerNetworkCall === false &&
      executionType?.providerTriggeringEndpointCall === false
  );

  const authInput = root.authorizationInput as Record<string, unknown>;
  ok(
    "fixture keeps authorization as constraint only",
    authInput?.authorizationReceived === true &&
      authInput?.authorizationAppliedAsPlanConstraintOnly === true
  );

  const nonExec = root.nonExecutionLockNow as Record<string, unknown>;
  ok(
    "fixture keeps non-execution lock now",
    nonExec?.runtimeActionNow === false &&
      nonExec?.oneRunConsumedNow === false &&
      nonExec?.retryConsumedNow === false &&
      nonExec?.secondRunConsumedNow === false
  );

  const futureBoundary = root.futureExecutionBoundary as Record<string, unknown>;
  ok(
    "fixture future boundary includes strict controls",
    futureBoundary?.stagingOnly === true &&
      futureBoundary?.ownerAdminOnly === true &&
      futureBoundary?.allowlistOnly === true &&
      futureBoundary?.syntheticSanitizedOnly === true &&
      futureBoundary?.noRealBuyerData === true &&
      futureBoundary?.noPhoneCapture === true &&
      futureBoundary?.noLeadDelivery === true &&
      futureBoundary?.noPublicRoute === true &&
      futureBoundary?.noProduction === true &&
      futureBoundary?.exactlyOneRunOnly === true &&
      futureBoundary?.noRetry === true &&
      futureBoundary?.noSecondRun === true &&
      futureBoundary?.runSessionLockedRequired === true
  );

  const evidence = root.plannedPostRunEvidenceFields as Record<string, unknown>;
  for (const field of [
    "httpStatus",
    "auth",
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
    "sanitizedUserVisibleText",
    "missingUserVisibleText",
    "missingUserVisibleTextReason",
    "answerFieldSource",
    "answerCharCount",
    "runSessionLocked",
    "oneRunConsumed",
    "noRetry",
    "noSecondRun",
    "boundaryConfirmation",
  ]) {
    ok(`fixture planned evidence includes ${field}`, evidence?.[field] === true);
  }

  const antiMisleading = root.antiMisleadingPlanSlice as Record<string, unknown>;
  ok(
    "fixture anti-misleading plan slice values correct",
    antiMisleading?.geminiRunNow === false &&
      antiMisleading?.oneRunApprovalGrantedNow === true &&
      antiMisleading?.oneRunExecutedNow === false &&
      antiMisleading?.pilotActiveNow === false &&
      antiMisleading?.publicActiveNow === false &&
      antiMisleading?.productionActiveNow === false &&
      antiMisleading?.realLeadPathActiveNow === false &&
      antiMisleading?.retryAllowed === false &&
      antiMisleading?.secondRunAllowed === false
  );

  const holdRules = root.holdRulesRequired as Record<string, unknown>;
  ok(
    "fixture hold rules include required blockers",
    holdRules?.holdOnRouteAuthGuardAmbiguity === true &&
      holdRules?.holdOnMarkerMissingOrMismatch === true &&
      holdRules?.holdOnApprovalBoundaryWordingAmbiguity === true &&
      holdRules?.holdOnOneRunCountOrLockControlIncomplete === true &&
      holdRules?.holdOnRetryOrSecondRunPathVisible === true &&
      holdRules?.holdOnPublicProductionRealLeadRisk === true &&
      holdRules?.holdOnSecretPiiRisk === true &&
      holdRules?.holdOnPostRunEvidencePlanIncomplete === true &&
      holdRules?.holdOnTestFailure === true
  );

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

console.log(`\nDone v14.3F dry-run plan validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
