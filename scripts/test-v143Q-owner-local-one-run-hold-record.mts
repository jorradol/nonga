/**
 * v14.3Q fresh owner authorization + owner-local one-run hold record validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3Q
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3Q-owner-local-one-run-hold-record.md";
const FIXTURE_PATH = "docs/examples/v14.3Q-owner-local-one-run-hold-record.synthetic.json";
const V143P_DOC_PATH = "docs/v14.3P-owner-local-one-run-execution-evidence.md";
const V143O_DOC_PATH = "docs/v14.3O-fresh-owner-approval-decision-one-run-command-packet-no-gemini.md";
const TOKEN_CHECKER_PATH = "scripts/check-admin-token-session-env.mts";
const SELF_PATH = "scripts/test-v143Q-owner-local-one-run-hold-record.mts";

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

console.log("=== v14.3Q Owner-Local One-Run HOLD Record Validation ===\n");

ok("v14.3Q doc exists", existsSync(DOC_PATH));
ok("v14.3Q fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3P doc exists", existsSync(V143P_DOC_PATH));
ok("v14.3O doc exists", existsSync(V143O_DOC_PATH));
ok("token checker exists", existsSync(TOKEN_CHECKER_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143pDoc = read(V143P_DOC_PATH);
const v143oDoc = read(V143O_DOC_PATH);
const tokenChecker = read(TOKEN_CHECKER_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 5500, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 4200, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

ok(
  "doc records baseline branch/head/origin/clean",
  /branch:\s*`feature\/chat-image-attachment-v1`/.test(doc) &&
    /local HEAD:\s*`c25c37d832aeb47bbcd7310148ee3893faa19b2a`/.test(doc) &&
    /origin HEAD:\s*`c25c37d832aeb47bbcd7310148ee3893faa19b2a`/.test(doc) &&
    /local equals origin:\s*`yes`/.test(doc) &&
    /working tree clean:\s*`yes`/.test(doc)
);

const boundaryChecks: Array<[string, RegExp]> = [
  ["no Gemini before fresh owner approval", /no Gemini before fresh owner approval:\s*`yes`/i],
  ["no one-run before fresh owner approval", /no one-run before fresh owner approval:\s*`yes`/i],
  [
    "no provider network before fresh owner approval",
    /no provider\/network\/trigger endpoint call before fresh owner approval:\s*`yes`/i,
  ],
  ["no retry", /no retry:\s*`yes`/i],
  ["no second run", /no second run:\s*`yes`/i],
  ["no deploy", /no deploy:\s*`yes`/i],
  ["no runtime config mutation", /no runtime config mutation:\s*`yes`/i],
  ["no secret exposure", /no secret exposure:\s*`yes`/i],
  ["no public route activation", /no public route activation:\s*`yes`/i],
  ["no production", /no production:\s*`yes`/i],
  ["no buyer-facing ai release", /no buyer-facing AI release:\s*`yes`/i],
  ["no real lead sending", /no real lead sending:\s*`yes`/i],
  ["no real customer data pii", /no real customer data \/ PII:\s*`yes`/i],
  ["no phone plate vin", /no phone \/ plate \/ VIN:\s*`yes`/i],
  ["no thor real data import", /no Thor real data import:\s*`yes`/i],
  ["no dealer real inventory import", /no dealer real inventory import:\s*`yes`/i],
];
for (const [name, re] of boundaryChecks) {
  ok(`doc includes boundary ${name}`, re.test(doc));
}

ok(
  "doc includes exact v14.3Q approval template text",
  /FINAL EXECUTION AUTHORIZE v14\.3Q OWNER-LOCAL ONE-RUN/.test(doc) &&
    /I approve exactly one owner-local staging Gemini run\./.test(doc) &&
    /No retry\./.test(doc) &&
    /No second run\./.test(doc) &&
    /No production\./.test(doc) &&
    /No public route\./.test(doc) &&
    /No real lead\./.test(doc) &&
    /No real customer data \/ PII\./.test(doc) &&
    /I understand one-run is consumed only if runtime execution starts\./.test(doc)
);

ok(
  "doc accepts fresh approval and moves to token readiness gate",
  /freshApprovalReceived:\s*`true`/i.test(doc) &&
    /approvalTextMatched:\s*`true`/i.test(doc) &&
    /execution decision at this gate:\s*`proceed to owner-local token\/session readiness`/i.test(doc)
);

ok(
  "doc records failed owner-local token session check",
  /ownerLocalTokenPresent:\s*`false`/i.test(doc) &&
    /ownerLocalTokenValid:\s*`false`/i.test(doc) &&
    /NONGA_ADMIN_API_TOKEN:\s*missing/i.test(doc) &&
    /format:\s*invalid/i.test(doc) &&
    /token printed:\s*no/i.test(doc) &&
    /secret exposure:\s*false/i.test(doc) &&
    /hold reason:\s*`HOLD — OWNER-LOCAL AUTH SESSION NOT READY`/i.test(doc)
);

ok(
  "doc keeps command execution blocked before runtime start",
  /command identified for execution now:\s*`not_run`/i.test(doc) &&
    /command execution now:\s*`not_run`/i.test(doc) &&
    /do not guess command/.test(doc) &&
    /do not invent endpoint/.test(doc)
);

ok(
  "doc records hold-state one-run controls",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc)
);

const evidenceChecks: Array<[string, RegExp]> = [
  ["freshApprovalReceived true", /freshApprovalReceived=true/],
  ["approvalTextMatched true", /approvalTextMatched=true/],
  ["ownerLocalTokenPresent false", /ownerLocalTokenPresent=false/],
  ["ownerLocalTokenValid false", /ownerLocalTokenValid=false/],
  ["httpStatus not_run", /httpStatus=not_run/],
  ["auth fail", /auth=fail/],
  ["providerNetwork false", /providerNetwork=false/],
  ["gateReason hold", /gateReason=HOLD_OWNER_LOCAL_AUTH_SESSION_NOT_READY/],
  ["runtimeMode not_run", /runtimeMode=not_run/],
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
];
for (const [name, re] of evidenceChecks) {
  ok(`doc includes evidence ${name}`, re.test(doc));
}

ok(
  "doc confirms no secret/pii/public/prod/real lead risk",
  /secretExposure=false/.test(doc) &&
    /publicRouteActivation=false/.test(doc) &&
    /production=false/.test(doc) &&
    /realLeadSending=false/.test(doc) &&
    /realCustomerData=false/.test(doc) &&
    /PII=false/.test(doc) &&
    /phonePlateVin=false/.test(doc)
);

ok(
  "doc keeps runtime rubric not_run in hold mode",
  /No runtime response happened in this round/.test(doc) &&
    /Thai naturalness:\s*`not_run`/.test(doc) &&
    /Overall:\s*`not_run`/.test(doc)
);

const allowedFinalRecommendations = [
  "PASS — v14.3Q OWNER-LOCAL ONE-RUN EVIDENCE COMPLETE",
  "READY TO CLOSE v14 LIMITED STAGING PILOT READINESS",
  "HOLD — FRESH OWNER APPROVAL MISSING",
  "HOLD — APPROVAL WORDING AMBIGUOUS",
  "HOLD — OWNER-LOCAL AUTH SESSION NOT READY",
  "HOLD — TOKEN CHECK FAILED",
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

ok(
  "cross-doc lineage keeps no-gemini and future-only constraints",
  /owner-local one-run execution evidence packet: hold-record mode/i.test(v143pDoc) &&
    /future-only/.test(v143oDoc)
);
ok(
  "token checker remains local-only safe command",
  /Safe local-only check/i.test(tokenChecker) &&
    /No network call/i.test(tokenChecker) &&
    /No Gemini call/i.test(tokenChecker)
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
  ok("fixture version is v14.3Q", root.version === "v14.3Q");

  const baseline = root.baselineBeforeWork as Record<string, unknown>;
  ok(
    "fixture baseline matches v14.3Q snapshot",
    baseline?.branch === "feature/chat-image-attachment-v1" &&
      baseline?.localHead === "c25c37d832aeb47bbcd7310148ee3893faa19b2a" &&
      baseline?.originHead === "c25c37d832aeb47bbcd7310148ee3893faa19b2a" &&
      baseline?.localEqualsOrigin === true &&
      baseline?.workingTreeClean === true
  );

  const boundary = root.boundaryBeforeApproval as Record<string, unknown>;
  ok(
    "fixture captures strict no-run boundary before approval",
    boundary?.noGeminiBeforeFreshApproval === true &&
      boundary?.noOneRunBeforeFreshApproval === true &&
      boundary?.noProviderNetworkTriggerEndpointCallBeforeFreshApproval === true &&
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

  const approval = root.freshApproval as Record<string, unknown>;
  ok(
    "fixture approval status indicates fresh approval accepted",
    approval?.freshApprovalReceived === true &&
      approval?.approvalTextMatched === true &&
      approval?.decision === "PROCEED_TO_OWNER_LOCAL_TOKEN_SESSION_READINESS" &&
      typeof approval?.requiredApprovalText === "string" &&
      String(approval.requiredApprovalText).includes("FINAL EXECUTION AUTHORIZE v14.3Q OWNER-LOCAL ONE-RUN")
  );

  const readiness = root.ownerLocalTokenSessionReadiness as Record<string, unknown>;
  ok(
    "fixture token readiness captures failed checker",
    readiness?.ownerLocalTokenPresent === false &&
      readiness?.ownerLocalTokenValid === false &&
      readiness?.status === "failed" &&
      readiness?.tokenPrinted === false &&
      readiness?.secretExposure === false &&
      (readiness?.checkerSummary as Record<string, unknown>)?.tokenState === "missing" &&
      (readiness?.checkerSummary as Record<string, unknown>)?.formatState === "invalid"
  );

  const command = root.ownerLocalOneRunCommandStatus as Record<string, unknown>;
  ok(
    "fixture command state is not_run with ambiguity hold guard",
    command?.identified === "not_run" &&
      command?.executed === "not_run" &&
      command?.futureHoldIfMissingOrAmbiguous === "HOLD — OWNER-LOCAL ONE-RUN COMMAND MISSING OR AMBIGUOUS" &&
      command?.doNotGuessCommand === true &&
      command?.doNotInventEndpoint === true
  );

  const evidence = root.evidenceSnapshot as Record<string, unknown>;
  ok(
    "fixture evidence fields are complete in hold mode",
    evidence?.freshApprovalReceived === true &&
      evidence?.approvalTextMatched === true &&
      evidence?.ownerLocalTokenPresent === false &&
      evidence?.ownerLocalTokenValid === false &&
      evidence?.oneRunStarted === false &&
      evidence?.oneRunConsumed === false &&
      evidence?.retryUsed === false &&
      evidence?.secondRunUsed === false &&
      evidence?.httpStatus === "not_run" &&
      evidence?.auth === "fail" &&
      evidence?.providerNetwork === false &&
      evidence?.gateReason === "HOLD_OWNER_LOCAL_AUTH_SESSION_NOT_READY" &&
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

  const rubric = root.runtimeRubricStatus as Record<string, unknown>;
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

ok("validator enforces allowed recommendation list", /allowedFinalRecommendations/.test(self));

console.log(`\nDone v14.3Q owner-local one-run hold record validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
