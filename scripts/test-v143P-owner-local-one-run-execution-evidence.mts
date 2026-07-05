/**
 * v14.3P fresh owner approval request + owner-local one-run execution evidence validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3P
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3P-owner-local-one-run-execution-evidence.md";
const FIXTURE_PATH = "docs/examples/v14.3P-owner-local-one-run-execution-evidence.synthetic.json";
const V143O_DOC_PATH = "docs/v14.3O-fresh-owner-approval-decision-one-run-command-packet-no-gemini.md";
const TOKEN_CHECKER_PATH = "scripts/check-admin-token-session-env.mts";
const SELF_PATH = "scripts/test-v143P-owner-local-one-run-execution-evidence.mts";

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

console.log("=== v14.3P Owner-Local One-Run Execution Evidence Validation ===\n");

ok("v14.3P doc exists", existsSync(DOC_PATH));
ok("v14.3P fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3O doc exists", existsSync(V143O_DOC_PATH));
ok("token checker exists", existsSync(TOKEN_CHECKER_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143oDoc = read(V143O_DOC_PATH);
const tokenChecker = read(TOKEN_CHECKER_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 5000, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 4500, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

ok(
  "doc records baseline branch/head/origin/clean",
  /branch:\s*`feature\/chat-image-attachment-v1`/.test(doc) &&
    /local HEAD:\s*`22b98f4f4414aa2856d7b9535e17824a70fdbeb1`/.test(doc) &&
    /origin HEAD:\s*`22b98f4f4414aa2856d7b9535e17824a70fdbeb1`/.test(doc) &&
    /local equals origin:\s*`yes`/.test(doc) &&
    /working tree clean:\s*`yes`/.test(doc)
);

const boundaryNoRunChecks: Array<[string, RegExp]> = [
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
  ["no buyer-facing AI release", /no buyer-facing AI release:\s*`yes`/i],
  ["no real lead sending", /no real lead sending:\s*`yes`/i],
  ["no real customer data / PII", /no real customer data \/ PII:\s*`yes`/i],
  ["no phone / plate / VIN", /no phone \/ plate \/ VIN:\s*`yes`/i],
];
for (const [name, re] of boundaryNoRunChecks) {
  ok(`doc includes boundary ${name}`, re.test(doc));
}

ok(
  "doc includes exact v14.3P approval template text",
  /FINAL EXECUTION AUTHORIZE v14\.3P OWNER-LOCAL ONE-RUN/.test(doc) &&
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
  "doc holds when fresh approval is missing",
  /fresh approval received:\s*`no`/i.test(doc) &&
    /approval text matched template:\s*`no`/i.test(doc) &&
    /decision:\s*`HOLD — FRESH OWNER APPROVAL MISSING`/i.test(doc)
);

ok(
  "doc records hold-state one-run controls",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc)
);

ok(
  "doc includes required evidence fields in status-only mode",
  /freshApprovalReceived=false/.test(doc) &&
    /approvalTextMatched=false/.test(doc) &&
    /ownerLocalTokenPresent=false/.test(doc) &&
    /ownerLocalTokenValid=false/.test(doc) &&
    /httpStatus=not_run/.test(doc) &&
    /auth=not_run/.test(doc) &&
    /providerNetwork=false/.test(doc) &&
    /gateReason=HOLD_FRESH_OWNER_APPROVAL_MISSING/.test(doc) &&
    /runtimeMode=not_run/.test(doc) &&
    /guardPolicyVersion=not_run/.test(doc) &&
    /thaiUxTuningActive=not_run/.test(doc) &&
    /leadPiiCueGuardActive=not_run/.test(doc) &&
    /phoneEchoGuardActive=not_run/.test(doc) &&
    /safeConfirmationStepWordingActive=not_run/.test(doc)
);

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
  "doc sets runtime rubric not_run when execution not started",
  /No runtime execution happened in this round/.test(doc) &&
    /Thai naturalness:\s*`not_run`/.test(doc) &&
    /overall pass\/fail:\s*`not_run`/.test(doc)
);

const allowedFinalRecommendations = [
  "PASS — v14.3P OWNER-LOCAL ONE-RUN EVIDENCE COMPLETE",
  "READY TO CLOSE v14 LIMITED STAGING PILOT READINESS",
  "HOLD — FRESH OWNER APPROVAL MISSING",
  "HOLD — APPROVAL WORDING AMBIGUOUS",
  "HOLD — OWNER-LOCAL AUTH SESSION NOT READY",
  "HOLD — TOKEN CHECK FAILED",
  "HOLD — ONE-RUN NOT STARTED",
  "HOLD — RUNTIME STARTED BUT EVIDENCE INCOMPLETE",
  "HOLD — SECRET/TOKEN EXPOSURE RISK DETECTED",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — RETRY/SECOND-RUN CONTROL VIOLATION",
  "HOLD — TEST FAILURE",
];
for (const value of allowedFinalRecommendations) {
  ok(`doc includes allowed final recommendation ${value}`, doc.includes(value));
}
ok(
  "doc final recommendation is hold missing approval",
  /Final recommendation in this round:[\s\S]*HOLD — FRESH OWNER APPROVAL MISSING/.test(doc)
);

ok(
  "cross-doc lineage references v14.3O no-gemini recommendation",
  /READY FOR v14\.3P FRESH OWNER APPROVAL REQUEST — NO GEMINI UNTIL OWNER APPROVES/.test(v143oDoc)
);
ok(
  "token checker remains local-only safe command",
  /Safe local-only check\. No network call/.test(tokenChecker) &&
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
  ok("fixture version is v14.3P", root.version === "v14.3P");

  const boundary = root.boundaryBeforeApproval as Record<string, unknown>;
  ok(
    "fixture captures strict pre-approval boundary no-run",
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
    "fixture approval status indicates missing fresh approval",
    approval?.freshApprovalReceived === false &&
      approval?.approvalTextMatched === false &&
      approval?.decision === "HOLD — FRESH OWNER APPROVAL MISSING" &&
      typeof approval?.requiredApprovalText === "string" &&
      String(approval.requiredApprovalText).includes("FINAL EXECUTION AUTHORIZE v14.3P OWNER-LOCAL ONE-RUN")
  );

  const readiness = root.ownerLocalTokenSessionReadiness as Record<string, unknown>;
  ok(
    "fixture token readiness is hold/not_run",
    readiness?.ownerLocalTokenPresent === false &&
      readiness?.ownerLocalTokenValid === false &&
      readiness?.status === "not_run"
  );

  const evidence = root.evidenceSnapshot as Record<string, unknown>;
  ok(
    "fixture one-run/evidence fields are complete for hold",
    evidence?.freshApprovalReceived === false &&
      evidence?.approvalTextMatched === false &&
      evidence?.oneRunStarted === false &&
      evidence?.oneRunConsumed === false &&
      evidence?.retryUsed === false &&
      evidence?.secondRunUsed === false &&
      evidence?.httpStatus === "not_run" &&
      evidence?.auth === "not_run" &&
      evidence?.providerNetwork === false &&
      evidence?.gateReason === "HOLD_FRESH_OWNER_APPROVAL_MISSING" &&
      evidence?.secretExposure === false &&
      evidence?.publicRouteActivation === false &&
      evidence?.production === false &&
      evidence?.realLeadSending === false &&
      evidence?.realCustomerData === false &&
      evidence?.PII === false &&
      evidence?.phonePlateVin === false
  );

  const finalEnum = Array.isArray(root.finalRecommendationEnum) ? root.finalRecommendationEnum : [];
  for (const expected of allowedFinalRecommendations) {
    ok(`fixture includes allowed final recommendation ${expected}`, finalEnum.includes(expected));
  }
  ok(
    "fixture final recommendation is hold missing approval",
    root.finalRecommendation === "HOLD — FRESH OWNER APPROVAL MISSING"
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

console.log(`\nDone v14.3P owner-local one-run evidence validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
