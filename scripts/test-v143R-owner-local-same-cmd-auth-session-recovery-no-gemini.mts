/**
 * v14.3R owner-local same-CMD auth session recovery validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3R
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3R-owner-local-same-cmd-auth-session-recovery-no-gemini.md";
const FIXTURE_PATH = "docs/examples/v14.3R-owner-local-same-cmd-auth-session-recovery.synthetic.json";
const PACKAGE_PATH = "package.json";
const SELF_PATH = "scripts/test-v143R-owner-local-same-cmd-auth-session-recovery-no-gemini.mts";
const CHECKER_PATH = "scripts/check-admin-token-session-env.mts";
const V143Q_DOC_PATH = "docs/v14.3Q-owner-local-one-run-hold-record.md";

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

console.log("=== v14.3R Owner-Local Same-CMD Auth Session Recovery Validation ===\n");

ok("v14.3R doc exists", existsSync(DOC_PATH));
ok("v14.3R fixture exists", existsSync(FIXTURE_PATH));
ok("package.json exists", existsSync(PACKAGE_PATH));
ok("self exists", existsSync(SELF_PATH));
ok("token checker exists", existsSync(CHECKER_PATH));
ok("v14.3Q doc exists", existsSync(V143Q_DOC_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const self = read(SELF_PATH);

ok("validator states static checks only", /Static checks only/i.test(self));
ok("doc references v14.3R", /v14\.3R/i.test(doc));
ok("doc records no gemini / no runtime execution", /Gemini run now: no/i.test(doc) && /runtime execution started: no/i.test(doc));
ok("doc includes previous hold reason from v14.3Q", /HOLD — OWNER-LOCAL AUTH SESSION NOT READY/.test(doc));
ok(
  "doc explains token missing as same-session mismatch",
  /does(\s+\*\*not\*\*|\s+not)\s+automatically mean token value is broken/i.test(doc) &&
    /not present in the same CMD\/session/i.test(doc)
);
ok(
  "doc includes same-CMD flow",
  /cd \/d D:\\nonga/.test(doc) &&
    /set NONGA_ADMIN_API_TOKEN=<paste-token-here>/.test(doc) &&
    /npm run check:admin-token-session-env/.test(doc)
);
ok(
  "doc forbids token exposure actions",
  /do not run `echo %NONGA_ADMIN_API_TOKEN%`/i.test(doc) &&
    /do not screenshot token/i.test(doc) &&
    /do not paste token in chat\/report/i.test(doc) &&
    /do not print full token value anywhere/i.test(doc)
);
ok(
  "doc defines masked status-only reporting",
  /token: \*\*\*MASKED\*\*\*/.test(doc) &&
    /secretExposure=false/.test(doc) &&
    /NONGA_ADMIN_API_TOKEN: present/.test(doc) &&
    /NONGA_ADMIN_API_TOKEN: missing\/invalid/.test(doc)
);
ok(
  "doc states fresh approval from v14.3Q is not carry over",
  /must not be carried over into a new execution cycle/i.test(doc) &&
    /freshOwnerApprovalRequiredBeforeNextExecution=true/.test(doc) &&
    /freshApprovalForExecutionNow=false/.test(doc)
);
ok(
  "doc keeps one-run and retry controls false",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc)
);

const boundaryPatterns: Array<[string, RegExp]> = [
  ["no Gemini", /no Gemini:\s*`yes`/i],
  ["no one-run click", /no one-run click:\s*`yes`/i],
  ["no provider/network/trigger endpoint call", /no provider\/network\/trigger endpoint call:\s*`yes`/i],
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
for (const [name, re] of boundaryPatterns) {
  ok(`doc includes boundary ${name}`, re.test(doc));
}

const allowedFinalRecommendations = [
  "READY FOR v14.3S FRESH OWNER APPROVAL + SAME-CMD OWNER-LOCAL ONE-RUN — NO GEMINI UNTIL OWNER APPROVES",
  "HOLD — SAME-CMD AUTH RECOVERY PACKET INCOMPLETE",
  "HOLD — TOKEN/SECRET EXPOSURE RISK DETECTED",
  "HOLD — FRESH APPROVAL CARRYOVER RISK DETECTED",
  "HOLD — ONE-RUN / RETRY / SECOND-RUN CONTROL AMBIGUITY",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of allowedFinalRecommendations) {
  ok(`doc includes allowed recommendation ${value}`, doc.includes(value));
}
ok(
  "doc final recommendation is allowed enum",
  /Final recommendation in this round:[\s\S]*READY FOR v14\.3S FRESH OWNER APPROVAL \+ SAME-CMD OWNER-LOCAL ONE-RUN — NO GEMINI UNTIL OWNER APPROVES/.test(
    doc
  )
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
  ok("fixture version is v14.3R", root.version === "v14.3R");
  ok(
    "fixture execution type is docs/tests/fixtures/static/mock + checker evidence only",
    root.executionType === "docs/tests/fixtures/static/mock + owner-local auth checker evidence only"
  );
  ok("fixture previous hold reason matches v14.3Q", root.previousHoldReason === "HOLD_OWNER_LOCAL_AUTH_SESSION_NOT_READY");

  const baseline = root.baselineBeforeWork as Record<string, unknown>;
  ok(
    "fixture baseline is expected head and clean state",
    baseline?.branch === "feature/chat-image-attachment-v1" &&
      baseline?.localHead === "6b2a5cb1c801f132a0405adc8f9b5bb1075aa372" &&
      baseline?.originHead === "6b2a5cb1c801f132a0405adc8f9b5bb1075aa372" &&
      baseline?.localEqualsOrigin === true &&
      baseline?.workingTreeClean === true
  );

  const boundary = root.boundaryStatus as Record<string, unknown>;
  ok(
    "fixture boundary status is all false",
    boundary?.geminiRunNow === false &&
      boundary?.oneRunClickNow === false &&
      boundary?.providerNetworkCall === false &&
      boundary?.triggerEndpointCall === false &&
      boundary?.retryUsed === false &&
      boundary?.secondRunUsed === false &&
      boundary?.deploy === false &&
      boundary?.runtimeConfigMutation === false &&
      boundary?.secretExposure === false &&
      boundary?.publicRouteActivation === false &&
      boundary?.production === false &&
      boundary?.buyerFacingAiRelease === false &&
      boundary?.realLeadSending === false &&
      boundary?.realCustomerDataPII === false &&
      boundary?.phonePlateVin === false &&
      boundary?.thorRealDataImport === false &&
      boundary?.dealerRealInventoryImport === false
  );

  const sameCmd = root.sameCmdRecovery as Record<string, unknown>;
  const flow = Array.isArray(sameCmd?.sameCmdFlow) ? sameCmd.sameCmdFlow : [];
  ok(
    "fixture same-CMD requirement and flow are recorded",
    sameCmd?.sameCmdRequirementDocumented === true &&
      flow.includes("cd /d D:\\nonga") &&
      flow.includes("set NONGA_ADMIN_API_TOKEN=<paste-token-here>") &&
      flow.includes("npm run check:admin-token-session-env")
  );
  ok(
    "fixture same-CMD semantics distinguish missing vs invalid",
    sameCmd?.tokenMissingMeansSessionMismatchFirst === true &&
      sameCmd?.tokenMissingMeansTokenInvalidAutomatically === false &&
      sameCmd?.tokenReporting === "masked/status-only"
  );

  const checkerEvidence = root.checkerEvidence as Record<string, unknown>;
  ok(
    "fixture checker evidence is masked/status-only",
    checkerEvidence?.command === "npm run check:admin-token-session-env" &&
      checkerEvidence?.tokenPresence === "missing" &&
      checkerEvidence?.format === "invalid" &&
      checkerEvidence?.token === "***MASKED***" &&
      checkerEvidence?.secretExposure === false
  );

  const freshApprovalPolicy = root.freshApprovalPolicy as Record<string, unknown>;
  ok(
    "fixture fresh approval carryover policy is strict",
    freshApprovalPolicy?.freshApprovalFromV143QReceivedMatched === true &&
      freshApprovalPolicy?.carryOverToExecutionNowAllowed === false &&
      freshApprovalPolicy?.freshApprovalForExecutionNow === false &&
      freshApprovalPolicy?.freshOwnerApprovalRequiredBeforeNextExecution === true &&
      freshApprovalPolicy?.nextExecutionRound === "v14.3S"
  );

  const execState = root.executionState as Record<string, unknown>;
  ok(
    "fixture execution state stays no-run",
    execState?.GeminiRunNow === false &&
      execState?.oneRunStarted === false &&
      execState?.oneRunConsumed === false &&
      execState?.retryUsed === false &&
      execState?.secondRunUsed === false
  );

  const finalEnum = Array.isArray(root.finalRecommendationEnum) ? root.finalRecommendationEnum : [];
  for (const expected of allowedFinalRecommendations) {
    ok(`fixture includes allowed recommendation ${expected}`, finalEnum.includes(expected));
  }
  ok(
    "fixture final recommendation is ready for v14.3S with fresh approval",
    root.finalRecommendation ===
      "READY FOR v14.3S FRESH OWNER APPROVAL + SAME-CMD OWNER-LOCAL ONE-RUN — NO GEMINI UNTIL OWNER APPROVES"
  );
}

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}

if (packageParsed && typeof packageParsed === "object") {
  const scripts = (packageParsed as { scripts?: Record<string, string> }).scripts ?? {};
  ok(
    "package has test:v14.3R script",
    scripts["test:v14.3R"] === "tsx scripts/test-v143R-owner-local-same-cmd-auth-session-recovery-no-gemini.mts"
  );
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

console.log(`\nDone v14.3R same-CMD auth recovery validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
