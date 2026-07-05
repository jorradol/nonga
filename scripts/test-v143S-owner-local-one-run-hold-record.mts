/**
 * v14.3S owner-local one-run hold record validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3S
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3S-owner-local-one-run-hold-record.md";
const FIXTURE_PATH = "docs/examples/v14.3S-owner-local-one-run-hold-record.synthetic.json";
const PACKAGE_PATH = "package.json";
const SELF_PATH = "scripts/test-v143S-owner-local-one-run-hold-record.mts";
const CHECKER_PATH = "scripts/check-admin-token-session-env.mts";
const V143R_DOC_PATH = "docs/v14.3R-owner-local-same-cmd-auth-session-recovery-no-gemini.md";

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

console.log("=== v14.3S Owner-Local One-Run HOLD Record Validation ===\n");

ok("v14.3S doc exists", existsSync(DOC_PATH));
ok("v14.3S fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("self exists", existsSync(SELF_PATH));
ok("token checker exists", existsSync(CHECKER_PATH));
ok("v14.3R doc exists", existsSync(V143R_DOC_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const self = read(SELF_PATH);
const v143rDoc = read(V143R_DOC_PATH);

ok("validator states static checks only", /Static checks only/i.test(self));
ok("doc names v14.3S", /v14\.3S/i.test(doc));
ok("doc is hold record mode", /HOLD Record/i.test(doc));
ok("doc includes baseline expected from v14.3R push", /aa354c94c6d366af51ce48fe3c77be4cb8236d81/.test(doc));
ok("doc confirms local equals origin and clean", /local equals origin:\s*`yes`/.test(doc) && /working tree clean:\s*`yes`/.test(doc));

const boundaryChecks: Array<[string, RegExp]> = [
  ["no Gemini before same-CMD token present/valid", /no Gemini before same-CMD token present\/valid:\s*`yes`/i],
  ["no Gemini before fresh owner approval", /no Gemini before fresh owner approval:\s*`yes`/i],
  ["no one-run before same-CMD token present/valid", /no one-run before same-CMD token present\/valid:\s*`yes`/i],
  ["no one-run before fresh owner approval", /no one-run before fresh owner approval:\s*`yes`/i],
  [
    "no provider/network/trigger endpoint call before both gates pass",
    /no provider\/network\/trigger endpoint call before both gates pass:\s*`yes`/i,
  ],
  ["no retry", /no retry:\s*`yes`/i],
  ["no second run", /no second run:\s*`yes`/i],
  ["no deploy", /no deploy:\s*`yes`/i],
  ["no runtime config mutation", /no runtime config mutation:\s*`yes`/i],
  ["no secret exposure", /no secret exposure:\s*`yes`/i],
  ["no public route activation", /no public route activation:\s*`yes`/i],
  ["no production", /no production:\s*`yes`/i],
  ["no buyer-facing AI release", /no buyer-facing AI release:\s*`yes`/i],
  ["no real lead sending", /no real lead sending:\s*`yes`/i],
  ["no real customer data / PII", /no real customer data \/ PII:\s*`yes`/i],
  ["no phone / plate / VIN", /no phone \/ plate \/ VIN:\s*`yes`/i],
  ["no Thor real data import", /no Thor real data import:\s*`yes`/i],
  ["no dealer real inventory import", /no dealer real inventory import:\s*`yes`/i],
];
for (const [name, re] of boundaryChecks) {
  ok(`doc includes boundary ${name}`, re.test(doc));
}

ok(
  "doc records same-CMD checker failed and hold",
  /sameCmdTokenCheckRan=true/.test(doc) &&
    /ownerLocalTokenPresent=false/.test(doc) &&
    /ownerLocalTokenValid=false/.test(doc) &&
    /NONGA_ADMIN_API_TOKEN: missing/.test(doc) &&
    /format: invalid/.test(doc) &&
    /token: \*\*\*MASKED\*\*\*/.test(doc) &&
    /HOLD — OWNER-LOCAL AUTH SESSION NOT READY/.test(doc)
);
ok(
  "doc includes token safety prohibitions",
  /do not echo token/i.test(doc) &&
    /do not screenshot token/i.test(doc) &&
    /do not paste token in chat\/report/i.test(doc) &&
    /do not print token in logs/i.test(doc) &&
    /do not persist token permanently by default/i.test(doc)
);

ok(
  "doc tracks fresh approval as missing and no carryover",
  /freshApprovalReceived=false/.test(doc) &&
    /approvalTextMatched=false/.test(doc) &&
    /do not carry over approval from v14\.3Q or earlier rounds/i.test(doc) &&
    /FINAL EXECUTION AUTHORIZE v14\.3S OWNER-LOCAL ONE-RUN/.test(doc)
);

ok(
  "doc captures one-run controls and no runtime start",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc) &&
    /runtime\/provider execution started: no/.test(doc)
);

ok(
  "doc records one-run command identification status",
  /owner-local executable one-run command identified for this round: no/.test(doc) &&
    /do not guess command, do not invent endpoint/.test(doc)
);

const evidenceChecks: Array<[string, RegExp]> = [
  ["httpStatus not_run", /httpStatus=not_run/],
  ["auth fail", /auth=fail/],
  ["providerNetwork false", /providerNetwork=false/],
  ["gateReason hold", /gateReason=HOLD_OWNER_LOCAL_AUTH_SESSION_NOT_READY/],
  ["runtimeMode not_run", /runtimeMode=not_run/],
  ["userVisibleEnabled not_run", /userVisibleEnabled=not_run/],
  ["pilotContextPresent not_run", /pilotContextPresent=not_run/],
  ["allowlistMatch not_run", /allowlistMatch=not_run/],
  ["carCardCount not_run", /carCardCount=not_run/],
  ["serverRecentCarCardsCount not_run", /serverRecentCarCardsCount=not_run/],
  ["guardPolicyVersion not_run", /guardPolicyVersion=not_run/],
  ["thaiUxTuningSliceId not_run", /thaiUxTuningSliceId=not_run/],
  ["thaiUxTuningActive not_run", /thaiUxTuningActive=not_run/],
  ["leadPiiCueGuardActive not_run", /leadPiiCueGuardActive=not_run/],
  ["phoneEchoGuardActive not_run", /phoneEchoGuardActive=not_run/],
  ["safeConfirmationStepWordingActive not_run", /safeConfirmationStepWordingActive=not_run/],
  ["answerFieldSource not_run", /answerFieldSource=not_run/],
  ["answerCharCount not_run", /answerCharCount=not_run/],
  ["secretExposure false", /secretExposure=false/],
  ["publicRouteActivation false", /publicRouteActivation=false/],
  ["production false", /production=false/],
  ["realLeadSending false", /realLeadSending=false/],
  ["realCustomerData false", /realCustomerData=false/],
  ["PII false", /PII=false/],
  ["phonePlateVin false", /phonePlateVin=false/],
];
for (const [name, re] of evidenceChecks) {
  ok(`doc includes evidence ${name}`, re.test(doc));
}

ok("doc records rubric not_run in hold mode", /Thai naturalness:\s*`not_run`/.test(doc) && /Overall:\s*`not_run`/.test(doc));

const allowedFinalRecommendations = [
  "PASS — v14.3S OWNER-LOCAL ONE-RUN EVIDENCE COMPLETE",
  "READY TO CLOSE v14 LIMITED STAGING PILOT READINESS",
  "HOLD — REPO BASELINE NOT READY",
  "HOLD — OWNER-LOCAL AUTH SESSION NOT READY",
  "HOLD — TOKEN CHECK FAILED",
  "HOLD — FRESH OWNER APPROVAL MISSING",
  "HOLD — APPROVAL WORDING AMBIGUOUS",
  "HOLD — OWNER-LOCAL ONE-RUN COMMAND MISSING OR AMBIGUOUS",
  "HOLD — ONE-RUN NOT STARTED",
  "HOLD — RUNTIME STARTED BUT EVIDENCE INCOMPLETE",
  "HOLD — QUALITY RUBRIC FAILED",
  "HOLD — SECRET/TOKEN EXPOSURE RISK DETECTED",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — RETRY/SECOND-RUN CONTROL VIOLATION",
  "HOLD — TEST FAILURE",
];
for (const value of allowedFinalRecommendations) {
  ok(`doc includes allowed final recommendation ${value}`, doc.includes(value));
}
ok(
  "doc final recommendation is hold owner-local auth session not ready",
  /Final recommendation in this round:[\s\S]*HOLD — OWNER-LOCAL AUTH SESSION NOT READY/.test(doc)
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
  ok("fixture version is v14.3S", root.version === "v14.3S");
  ok(
    "fixture execution type is hold mode only",
    root.executionType === "docs/tests/fixtures/static/mock + owner-local auth checker evidence only"
  );

  const baseline = root.baselineBeforeWork as Record<string, unknown>;
  ok(
    "fixture baseline matches expected starting point",
    baseline?.branch === "feature/chat-image-attachment-v1" &&
      baseline?.localHead === "aa354c94c6d366af51ce48fe3c77be4cb8236d81" &&
      baseline?.originHead === "aa354c94c6d366af51ce48fe3c77be4cb8236d81" &&
      baseline?.localEqualsOrigin === true &&
      baseline?.workingTreeClean === true
  );

  const boundary = root.boundaryStatusBeforeApproval as Record<string, unknown>;
  ok(
    "fixture boundary status is fully locked to no-run",
    boundary?.noGeminiBeforeSameCmdTokenPresentValid === true &&
      boundary?.noGeminiBeforeFreshOwnerApproval === true &&
      boundary?.noOneRunBeforeSameCmdTokenPresentValid === true &&
      boundary?.noOneRunBeforeFreshOwnerApproval === true &&
      boundary?.noProviderNetworkTriggerEndpointCallBeforeBothGatesPass === true &&
      boundary?.noRetry === true &&
      boundary?.noSecondRun === true &&
      boundary?.noDeploy === true &&
      boundary?.noRuntimeConfigMutation === true &&
      boundary?.noSecretExposure === true &&
      boundary?.noPublicRouteActivation === true &&
      boundary?.noProduction === true &&
      boundary?.noBuyerFacingAiRelease === true &&
      boundary?.noRealLeadSending === true &&
      boundary?.noRealCustomerDataPII === true &&
      boundary?.noPhonePlateVin === true &&
      boundary?.noThorRealDataImport === true &&
      boundary?.noDealerRealInventoryImport === true
  );

  const tokenGate = root.tokenSessionGate as Record<string, unknown>;
  ok(
    "fixture token gate failed with masked reporting",
    tokenGate?.sameCmdTokenCheckRan === true &&
      tokenGate?.command === "npm run check:admin-token-session-env" &&
      tokenGate?.ownerLocalTokenPresent === false &&
      tokenGate?.ownerLocalTokenValid === false &&
      tokenGate?.tokenReporting === "masked/status-only" &&
      tokenGate?.token === "***MASKED***" &&
      tokenGate?.secretExposure === false &&
      tokenGate?.gateResult === "HOLD_OWNER_LOCAL_AUTH_SESSION_NOT_READY"
  );

  const approvalGate = root.freshOwnerApprovalGate as Record<string, unknown>;
  ok(
    "fixture approval gate indicates missing fresh approval and no carryover",
    approvalGate?.requiredTemplateVersion === "v14.3S" &&
      approvalGate?.carryOverFromV143QAllowed === false &&
      approvalGate?.carryOverFromPreviousRoundsAllowed === false &&
      approvalGate?.freshApprovalReceived === false &&
      approvalGate?.approvalTextMatched === false
  );

  const commandStatus = root.oneRunCommandStatus as Record<string, unknown>;
  ok(
    "fixture one-run command status is identified false and not_run",
    commandStatus?.inspectedPriorPacket === true &&
      commandStatus?.identified === false &&
      commandStatus?.status === "not_run" &&
      commandStatus?.doNotGuessCommand === true &&
      commandStatus?.doNotInventEndpoint === true
  );

  const executionState = root.executionState as Record<string, unknown>;
  ok(
    "fixture execution state keeps one-run unconsumed",
    executionState?.oneRunStarted === false &&
      executionState?.oneRunConsumed === false &&
      executionState?.retryUsed === false &&
      executionState?.secondRunUsed === false &&
      executionState?.runtimeStarted === false &&
      executionState?.providerNetwork === false
  );

  const evidence = root.evidenceSnapshot as Record<string, unknown>;
  ok(
    "fixture evidence snapshot fields are complete in hold mode",
    evidence?.sameCmdTokenCheckRan === true &&
      evidence?.ownerLocalTokenPresent === false &&
      evidence?.ownerLocalTokenValid === false &&
      evidence?.freshApprovalReceived === false &&
      evidence?.approvalTextMatched === false &&
      evidence?.oneRunStarted === false &&
      evidence?.oneRunConsumed === false &&
      evidence?.retryUsed === false &&
      evidence?.secondRunUsed === false &&
      evidence?.httpStatus === "not_run" &&
      evidence?.auth === "fail" &&
      evidence?.pilotPathActive === "not_run" &&
      evidence?.fallbackToLegacy === "not_run" &&
      evidence?.skipGemini === "not_run" &&
      evidence?.providerNetwork === false &&
      evidence?.gateReason === "HOLD_OWNER_LOCAL_AUTH_SESSION_NOT_READY" &&
      evidence?.runtimeMode === "not_run" &&
      evidence?.userVisibleEnabled === "not_run" &&
      evidence?.pilotContextPresent === "not_run" &&
      evidence?.allowlistMatch === "not_run" &&
      evidence?.carCardCount === "not_run" &&
      evidence?.serverRecentCarCardsCount === "not_run" &&
      evidence?.guardPolicyVersion === "not_run" &&
      evidence?.thaiUxTuningSliceId === "not_run" &&
      evidence?.thaiUxTuningActive === "not_run" &&
      evidence?.leadPiiCueGuardActive === "not_run" &&
      evidence?.phoneEchoGuardActive === "not_run" &&
      evidence?.safeConfirmationStepWordingActive === "not_run" &&
      evidence?.answerFieldSource === "not_run" &&
      evidence?.answerCharCount === "not_run" &&
      evidence?.secretExposure === false &&
      evidence?.publicRouteActivation === false &&
      evidence?.production === false &&
      evidence?.realLeadSending === false &&
      evidence?.realCustomerData === false &&
      evidence?.PII === false &&
      evidence?.phonePlateVin === false
  );

  const rubric = root.runtimeRubric as Record<string, unknown>;
  ok(
    "fixture rubric is not_run when runtime not executed",
    rubric?.executed === false &&
      rubric?.thaiNaturalness === "not_run" &&
      rubric?.structure4to7SentencesOrBalancedLength === "not_run" &&
      rubric?.contextCouplingBuyerCarBudgetConstraints === "not_run" &&
      rubric?.noHallucinatedVehicleFacts === "not_run" &&
      rubric?.noFinancePriceConditionGuarantee === "not_run" &&
      rubric?.noLeadCueAskingNamePhone === "not_run" &&
      rubric?.noPhoneEcho === "not_run" &&
      rubric?.safeConfirmationWordingPresent === "not_run" &&
      rubric?.guardPolicyActive === "not_run" &&
      rubric?.thaiUxTuningActive === "not_run" &&
      rubric?.overall === "not_run"
  );

  const finalEnum = Array.isArray(root.finalRecommendationEnum) ? root.finalRecommendationEnum : [];
  for (const expected of allowedFinalRecommendations) {
    ok(`fixture includes allowed final recommendation ${expected}`, finalEnum.includes(expected));
  }
  ok(
    "fixture final recommendation is hold owner-local auth session not ready",
    root.finalRecommendation === "HOLD — OWNER-LOCAL AUTH SESSION NOT READY"
  );
}

ok(
  "cross-doc continuity from v14.3R to v14.3S exists",
  /READY FOR v14\.3S/.test(v143rDoc) && /HOLD — OWNER-LOCAL AUTH SESSION NOT READY/.test(doc)
);

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}
if (packageParsed && typeof packageParsed === "object") {
  const scripts = (packageParsed as { scripts?: Record<string, string> }).scripts ?? {};
  ok("package has test:v14.3S script", scripts["test:v14.3S"] === "tsx scripts/test-v143S-owner-local-one-run-hold-record.mts");
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone style", /\b0[689]\d{8}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v14.3S owner-local hold record validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
