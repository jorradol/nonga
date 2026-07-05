/**
 * v14.3O fresh owner approval decision point + owner-friendly one-run command packet validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3O
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3O-fresh-owner-approval-decision-one-run-command-packet-no-gemini.md";
const FIXTURE_PATH =
  "docs/examples/v14.3O-fresh-owner-approval-decision-one-run-command-packet.synthetic.json";
const V143N_DOC_PATH = "docs/v14.3N-fresh-owner-approval-decision-owner-friendly-local-ux-no-gemini.md";
const TOKEN_CHECK_SCRIPT_PATH = "scripts/check-admin-token-session-env.mts";
const SELF_PATH = "scripts/test-v143O-fresh-owner-approval-decision-one-run-command-packet-no-gemini.mts";

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

console.log("=== v14.3O Fresh Owner Approval Decision + One-Run Command Packet Validation ===\n");

ok("v14.3O doc exists", existsSync(DOC_PATH));
ok("v14.3O fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3N doc exists", existsSync(V143N_DOC_PATH));
ok("token checker exists", existsSync(TOKEN_CHECK_SCRIPT_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143nDoc = read(V143N_DOC_PATH);
const tokenChecker = read(TOKEN_CHECK_SCRIPT_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 5000, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 3200, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const boundaryNoLines: Array<[string, RegExp]> = [
  ["runtime execution now no", /runtime execution now:\s*no/i],
  ["Gemini run now no", /Gemini run now:\s*no/i],
  ["one-run click now no", /one-run click now:\s*no/i],
  ["provider network call now no", /provider network call now:\s*no/i],
  ["provider endpoint now no", /endpoint call that may trigger Gemini\/provider now:\s*no/i],
  ["retry now no", /retry now:\s*no/i],
  ["second run now no", /second run now:\s*no/i],
  ["deploy now no", /deploy now:\s*no/i],
  ["runtime config mutation now no", /runtime config mutation now:\s*no/i],
  ["secret exposure now no", /secret\/token\/API key exposure now:\s*no/i],
  ["public route activation now no", /public route activation now:\s*no/i],
  ["production now no", /production now:\s*no/i],
  ["real lead sending now no", /real lead sending now:\s*no/i],
  ["real customer data pii now no", /real customer data \/ PII now:\s*no/i],
];
for (const [name, re] of boundaryNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

ok(
  "doc includes current status with no runtime/provider consumption",
  /v14\.3N CLOSED \/ PUSHED/.test(doc) &&
    /owner-local auth ready/.test(doc) &&
    /agent\/operator session mismatch diagnosed/.test(doc) &&
    /token invalid = no evidence/.test(doc) &&
    /secret exposure = no/.test(doc) &&
    /Gemini\/provider call = no/.test(doc) &&
    /runtime execution = no/.test(doc)
);

ok(
  "doc states approval not granted now and fresh approval required",
  /approval granted now:\s*no/i.test(doc) &&
    /Gemini run now:\s*no/i.test(doc) &&
    /one-run consumed now:\s*no/i.test(doc) &&
    /fresh owner approval required before execution:\s*yes/i.test(doc)
);

ok(
  "doc includes future-only approval template and non-approval clarification",
  /FINAL EXECUTION AUTHORIZE v14\.3P OWNER-LOCAL ONE-RUN/.test(doc) &&
    /I approve exactly one owner-local staging Gemini run\./.test(doc) &&
    /No retry\./.test(doc) &&
    /No second run\./.test(doc) &&
    /No production\./.test(doc) &&
    /No public route\./.test(doc) &&
    /No real lead\./.test(doc) &&
    /No real customer data \/ PII\./.test(doc) &&
    /I understand one-run is consumed only if runtime execution starts\./.test(doc) &&
    /this template is future-only/.test(doc) &&
    /this is not approval in v14\.3O/.test(doc) &&
    /must be freshly provided by owner before v14\.3P execution/.test(doc)
);

ok(
  "doc includes owner-local cmd session token flow",
  /open a new Windows CMD window/.test(doc) &&
    /run `cd \/d D:\\nonga`/.test(doc) &&
    /run `set NONGA_ADMIN_API_TOKEN=\.\.\.`/.test(doc) &&
    /run `npm run check:admin-token-session-env`/.test(doc) &&
    /masked\/status-only/.test(doc) &&
    /stop at HOLD until fresh owner approval text is provided/.test(doc) &&
    /only after fresh owner approval for v14\.3P, execute exactly one approved owner-local command/.test(
      doc
    )
);

ok(
  "doc has token/secret handling rules",
  /use one CMD\/session for token-check and future one-run execution/.test(doc) &&
    /do not echo token/.test(doc) &&
    /do not screenshot token/.test(doc) &&
    /do not paste token into chat\/report\/docs\/git/.test(doc) &&
    /do not persist token permanently by default/.test(doc) &&
    /token reporting must be masked\/status-only/.test(doc)
);

ok(
  "doc defines fail-closed future-only one-run packet design",
  /One-run command packet design \(fail-closed, future-only\)/.test(doc) &&
    /check token\/session status before any runtime path/.test(doc) &&
    /require explicit fresh owner approval evidence before runtime start/.test(doc) &&
    /prevent auto-run and keep manual owner-local control/.test(doc) &&
    /enforce exactly one run when approved/.test(doc) &&
    /block retry and block second run/.test(doc) &&
    /keep one-run unconsumed when fail occurs before runtime start/.test(doc) &&
    /never print token value/.test(doc) &&
    /never mutate runtime config/.test(doc) &&
    /never deploy/.test(doc) &&
    /never use production\/public\/real lead\/PII paths/.test(doc) &&
    /no Gemini\/provider\/runtime call in this slice/.test(doc)
);

ok(
  "doc keeps one-run status not started and not consumed",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc)
);

ok(
  "doc defines one-run hold policy for missing token and pre-start failure",
  /if token missing at execution time => HOLD, no consumption/.test(doc) &&
    /if command fails before runtime start => HOLD, no consumption/.test(doc) &&
    /no retry and no second run without fresh owner approval/.test(doc)
);

const holdConditions = [
  "HOLD — fresh owner approval missing",
  "HOLD — token missing in owner-local CMD session",
  "HOLD — token checker failed",
  "HOLD — command would expose secret",
  "HOLD — command would run provider without fresh approval",
  "HOLD — command allows retry/second run",
  "HOLD — command targets production/public route",
  "HOLD — command risks real lead / PII",
  "HOLD — tests failed",
];
for (const value of holdConditions) {
  ok(`doc includes hold condition ${value}`, doc.includes(value));
}

const expectedFinalRecommendations = [
  "READY FOR v14.3P OWNER-LOCAL ONE-RUN EXECUTION — FRESH OWNER APPROVAL STILL REQUIRED",
  "READY FOR v14.3P FRESH OWNER APPROVAL REQUEST — NO GEMINI UNTIL OWNER APPROVES",
  "HOLD — FRESH OWNER APPROVAL WORDING AMBIGUITY",
  "HOLD — OWNER-LOCAL COMMAND PACKET INCOMPLETE",
  "HOLD — SECRET/TOKEN EXPOSURE RISK DETECTED",
  "HOLD — ONE-RUN / RETRY / SECOND-RUN CONTROL AMBIGUITY",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

ok(
  "doc does not imply approval already granted or execution already run",
  !/approval granted now:\s*yes/i.test(doc) &&
    !/Gemini run now:\s*yes/i.test(doc) &&
    !/one-run consumed now:\s*yes/i.test(doc)
);

ok(
  "cross-doc lineage includes v14.3N readiness state",
  /READY FOR v14\.3O FRESH OWNER APPROVAL DECISION POINT/.test(v143nDoc) &&
    /owner-local auth ready/i.test(v143nDoc)
);

ok(
  "token checker remains safe local-only and non-gemini",
  /Safe local-only check/.test(tokenChecker) &&
    /No network call/.test(tokenChecker) &&
    /No Gemini call/.test(tokenChecker)
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
  ok("fixture version is v14.3O", root.version === "v14.3O");
  ok(
    "fixture execution type states static/mock and read-only inspection",
    root.executionType === "docs/tests/fixtures/static/mock + read-only inspection only"
  );

  const boundary = root.boundaryStatus as Record<string, unknown>;
  ok(
    "fixture boundary status remains strict no across safety constraints",
    boundary?.noGemini === true &&
      boundary?.noOneRunClick === true &&
      boundary?.noProviderNetworkTriggerEndpointCall === true &&
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

  const status = root.currentStatus as Record<string, unknown>;
  ok(
    "fixture current status matches v14.3O constraints",
    status?.v143NClosedPushed === true &&
      status?.ownerLocalAuthReady === true &&
      status?.agentSessionMismatchDiagnosed === true &&
      status?.tokenInvalidEvidenceFound === false &&
      status?.secretExposure === false &&
      status?.oneRunStarted === false &&
      status?.oneRunConsumed === false &&
      status?.retryUsed === false &&
      status?.secondRunUsed === false &&
      status?.geminiProviderCall === false &&
      status?.runtimeExecution === false
  );

  const approval = root.freshOwnerApprovalDecision as Record<string, unknown>;
  ok(
    "fixture approval decision remains not granted now and future-only",
    approval?.approvalGrantedNow === false &&
      approval?.geminiRunNow === false &&
      approval?.oneRunConsumedNow === false &&
      approval?.freshOwnerApprovalRequiredBeforeExecution === true &&
      approval?.futureOnlyNotApprovalInV143O === true &&
      typeof approval?.futureOnlyTemplate === "string" &&
      String(approval.futureOnlyTemplate).includes("FINAL EXECUTION AUTHORIZE v14.3P OWNER-LOCAL ONE-RUN")
  );

  const packet = root.ownerFriendlyCommandPacket as Record<string, unknown>;
  ok(
    "fixture owner-friendly command packet keeps masked token flow",
    packet?.futureExecutionOnly === true &&
      packet?.ownerLocalCmdPath === "D:\\nonga" &&
      packet?.sameCmdSessionRequired === true &&
      packet?.tokenSetCommand === "set NONGA_ADMIN_API_TOKEN=..." &&
      packet?.tokenCheckCommand === "npm run check:admin-token-session-env" &&
      packet?.tokenReporting === "masked/status-only" &&
      packet?.doNotEchoToken === true &&
      packet?.doNotScreenshotToken === true &&
      packet?.doNotPasteTokenInChatOrDocs === true &&
      packet?.doNotPersistTokenByDefault === true &&
      packet?.holdUntilFreshOwnerApproval === true
  );

  const design = root.oneRunCommandPacketDesign as Record<string, unknown>;
  ok(
    "fixture one-run packet design remains fail-closed and no-runtime-mutation",
    design?.futureOnlyPlanning === true &&
      design?.failClosed === true &&
      design?.checkTokenBeforeRuntime === true &&
      design?.requireFreshApprovalEvidence === true &&
      design?.preventAutoRun === true &&
      design?.enforceExactlyOneRun === true &&
      design?.blockRetry === true &&
      design?.blockSecondRun === true &&
      design?.doNotConsumeIfFailBeforeRuntimeStart === true &&
      design?.captureEvidenceFields === true &&
      design?.neverPrintToken === true &&
      design?.neverMutateRuntimeConfig === true &&
      design?.neverDeploy === true &&
      design?.neverUseProductionPublicRealLeadPIIPath === true
  );

  const hold = Array.isArray(root.holdConditions) ? root.holdConditions : [];
  for (const expected of holdConditions) {
    ok(`fixture includes hold condition ${expected}`, hold.includes(expected));
  }

  const finalEnum = Array.isArray(root.finalRecommendationEnum) ? root.finalRecommendationEnum : [];
  for (const expected of expectedFinalRecommendations) {
    ok(`fixture includes final recommendation ${expected}`, finalEnum.includes(expected));
  }

  ok(
    "fixture final recommendation remains no-gemini approval request",
    root.finalRecommendation ===
      "READY FOR v14.3P FRESH OWNER APPROVAL REQUEST — NO GEMINI UNTIL OWNER APPROVES"
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

ok(
  "validator checks ambiguous approval wording guard",
  /does not imply approval already granted or execution already run/.test(self)
);

console.log(`\nDone v14.3O fresh owner approval packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
