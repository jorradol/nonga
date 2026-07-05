/**
 * v14.3T owner-local one-run command disambiguation validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3T
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3T-owner-local-one-run-command-disambiguation-no-gemini.md";
const FIXTURE_PATH =
  "docs/examples/v14.3T-owner-local-one-run-command-disambiguation.synthetic.json";
const PACKAGE_PATH = "package.json";
const WRAPPER_PATH = "scripts/owner-local-one-run-gate-v143u.mts";
const SELF_PATH = "scripts/test-v143T-owner-local-one-run-command-disambiguation-no-gemini.mts";
const V143S_DOC_PATH = "docs/v14.3S-owner-local-one-run-hold-record.md";

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

console.log("=== v14.3T Owner-Local One-Run Command Disambiguation Validation ===\n");

ok("v14.3T doc exists", existsSync(DOC_PATH));
ok("v14.3T fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("v14.3S doc exists", existsSync(V143S_DOC_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const wrapper = read(WRAPPER_PATH);
const self = read(SELF_PATH);
const v143sDoc = read(V143S_DOC_PATH);

ok("validator states static checks only", /Static checks only/i.test(self));
ok("doc names v14.3T", /v14\.3T/i.test(doc));
ok(
  "doc baseline matches expected start",
  /branch:\s*`feature\/chat-image-attachment-v1`/.test(doc) &&
    /local HEAD:\s*`dd4882678bd52cbdfe2094b0d29e9c9317afcbbd`/.test(doc) &&
    /origin HEAD:\s*`dd4882678bd52cbdfe2094b0d29e9c9317afcbbd`/.test(doc) &&
    /local equals origin:\s*`yes`/.test(doc) &&
    /working tree clean:\s*`yes`/.test(doc)
);

ok(
  "doc records v14.3S previous hold reason",
  /HOLD — OWNER-LOCAL ONE-RUN COMMAND MISSING OR AMBIGUOUS/.test(doc) &&
    /same-CMD token gate:\s*PASS/.test(doc) &&
    /fresh approval gate:\s*PASS/.test(doc)
);

const requiredNoBoundaries: Array<[string, RegExp]> = [
  ["no Gemini", /no Gemini:\s*`yes`/i],
  ["no one-run click", /no one-run click:\s*`yes`/i],
  ["no provider network trigger endpoint call", /no provider\/network\/trigger endpoint call:\s*`yes`/i],
  ["no retry", /no retry:\s*`yes`/i],
  ["no second run", /no second run:\s*`yes`/i],
  ["no deploy", /no deploy:\s*`yes`/i],
  ["no runtime config mutation", /no runtime config mutation:\s*`yes`/i],
  ["no secret exposure", /no secret exposure:\s*`yes`/i],
  ["no public route activation", /no public route activation:\s*`yes`/i],
  ["no production", /no production:\s*`yes`/i],
  ["no buyer-facing AI release", /no buyer-facing AI release:\s*`yes`/i],
  ["no real lead sending", /no real lead sending:\s*`yes`/i],
  ["no real customer data pii", /no real customer data \/ PII:\s*`yes`/i],
  ["no phone plate vin", /no phone \/ plate \/ VIN:\s*`yes`/i],
  ["no thor real data import", /no Thor real data import:\s*`yes`/i],
  ["no dealer real inventory import", /no dealer real inventory import:\s*`yes`/i],
];
for (const [name, re] of requiredNoBoundaries) {
  ok(`doc includes boundary ${name}`, re.test(doc));
}

ok(
  "doc includes command disambiguation fields",
  /oneRunCommandIdentified=true/.test(doc) &&
    /oneRunCommand=`npm run owner-local-one-run:v14\.3U -- --execute-approved --approval-file <local-approval-file\.txt>`/.test(
      doc
    ) &&
    /commandSource=`package\.json` script `owner-local-one-run:v14\.3U` -> `scripts\/owner-local-one-run-gate-v143u\.mts`/.test(
      doc
    ) &&
    /commandRequiresSameCmdToken=true/.test(doc) &&
    /commandRequiresFreshApproval=true/.test(doc) &&
    /commandIsExactlyOneRun=true/.test(doc) &&
    /commandBlocksRetry=true/.test(doc) &&
    /commandBlocksSecondRun=true/.test(doc) &&
    /commandPrintsToken=false/.test(doc) &&
    /commandUsesProduction=false/.test(doc) &&
    /commandUsesPublicRoute=false/.test(doc) &&
    /commandUsesRealLead=false/.test(doc) &&
    /commandUsesPII=false/.test(doc)
);

ok(
  "doc includes same-CMD token policy and checker command",
  /cd \/d D:\\nonga/.test(doc) &&
    /set NONGA_ADMIN_API_TOKEN=<paste-token-here>/.test(doc) &&
    /npm run check:admin-token-session-env/.test(doc) &&
    /do not echo token/.test(doc) &&
    /do not screenshot token/.test(doc) &&
    /do not paste token in chat\/report/.test(doc) &&
    /do not print token in log/.test(doc) &&
    /do not persist token permanently by default/.test(doc)
);

ok(
  "doc keeps fresh approval carryover blocked and one-run unconsumed",
  /freshApprovalForExecutionNow=false/.test(doc) &&
    /GeminiRunNow=false/.test(doc) &&
    /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /freshOwnerApprovalRequiredBeforeNextExecution=true/.test(doc) &&
    /FINAL EXECUTION AUTHORIZE v14\.3U OWNER-LOCAL ONE-RUN/.test(doc)
);

const allowedFinalRecommendations = [
  "READY FOR v14.3U FRESH OWNER APPROVAL + IDENTIFIED SAME-CMD OWNER-LOCAL ONE-RUN — NO GEMINI UNTIL OWNER APPROVES",
  "HOLD — ONE-RUN COMMAND STILL AMBIGUOUS",
  "HOLD — COMMAND DISAMBIGUATION PACKET INCOMPLETE",
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
  "doc final recommendation is ready for v14.3U",
  /Final recommendation in this round:[\s\S]*READY FOR v14\.3U FRESH OWNER APPROVAL \+ IDENTIFIED SAME-CMD OWNER-LOCAL ONE-RUN — NO GEMINI UNTIL OWNER APPROVES/.test(
    doc
  )
);

ok(
  "wrapper is fail-closed with token and approval gates",
  /Fail-closed command packet/i.test(wrapper) &&
    /NONGA_ADMIN_API_TOKEN/.test(wrapper) &&
    /fresh owner approval text mismatch/.test(wrapper) &&
    /one-run already consumed \(retry\/second-run blocked\)/.test(wrapper) &&
    /never prints token value/i.test(wrapper)
);
ok(
  "wrapper does not execute provider or deploy in v14.3T",
  /does not execute Gemini\/provider in v14\.3T/i.test(wrapper) &&
    !/fetch\s*\(/.test(wrapper) &&
    !/https?:\/\//.test(wrapper) &&
    !/chat-user-visible-orchestrate/.test(wrapper) &&
    !/firebase deploy|gcloud|cloud run/i.test(wrapper)
);
ok(
  "wrapper keeps masked token reporting only",
  /token: \*\*\*MASKED\*\*\*/.test(wrapper) && !/console\.log\(\s*.*NONGA_ADMIN_API_TOKEN/.test(wrapper)
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
  ok("fixture version is v14.3T", root.version === "v14.3T");
  ok(
    "fixture execution type is disambiguation-only",
    root.executionType === "docs/tests/fixtures/static/mock + read-only command disambiguation only"
  );
  ok(
    "fixture previous hold reason matches v14.3S",
    root.previousHoldReason === "HOLD_OWNER_LOCAL_ONE_RUN_COMMAND_MISSING_OR_AMBIGUOUS"
  );

  const baseline = root.baselineBeforeWork as Record<string, unknown>;
  ok(
    "fixture baseline matches expected start",
    baseline?.branch === "feature/chat-image-attachment-v1" &&
      baseline?.localHead === "dd4882678bd52cbdfe2094b0d29e9c9317afcbbd" &&
      baseline?.originHead === "dd4882678bd52cbdfe2094b0d29e9c9317afcbbd" &&
      baseline?.localEqualsOrigin === true &&
      baseline?.workingTreeClean === true
  );

  const boundary = root.boundaryStatus as Record<string, unknown>;
  ok(
    "fixture boundary remains no-run",
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

  const command = root.commandInspection as Record<string, unknown>;
  ok(
    "fixture command inspection marks command identified and non-ambiguous",
    command?.oneRunCommandIdentified === true &&
      command?.oneRunCommand ===
        "npm run owner-local-one-run:v14.3U -- --execute-approved --approval-file <local-approval-file.txt>" &&
      typeof command?.commandSource === "string" &&
      String(command.commandSource).includes("scripts/owner-local-one-run-gate-v143u.mts") &&
      command?.commandRequiresSameCmdToken === true &&
      command?.commandRequiresFreshApproval === true &&
      command?.commandIsExactlyOneRun === true &&
      command?.commandBlocksRetry === true &&
      command?.commandBlocksSecondRun === true &&
      command?.commandPrintsToken === false &&
      command?.commandUsesProduction === false &&
      command?.commandUsesPublicRoute === false &&
      command?.commandUsesRealLead === false &&
      command?.commandUsesPII === false &&
      command?.commandAmbiguous === false
  );

  const approval = root.freshApprovalPolicy as Record<string, unknown>;
  ok(
    "fixture carryover policy is strict",
    approval?.freshApprovalCarryoverAllowed === false &&
      approval?.freshApprovalForExecutionNow === false &&
      approval?.geminiRunNow === false &&
      approval?.oneRunStarted === false &&
      approval?.oneRunConsumed === false &&
      approval?.freshOwnerApprovalRequiredBeforeNextExecution === true
  );

  const finalEnum = Array.isArray(root.finalRecommendationEnum) ? root.finalRecommendationEnum : [];
  for (const expected of allowedFinalRecommendations) {
    ok(`fixture includes allowed recommendation ${expected}`, finalEnum.includes(expected));
  }
  ok(
    "fixture final recommendation is ready for v14.3U",
    root.finalRecommendation ===
      "READY FOR v14.3U FRESH OWNER APPROVAL + IDENTIFIED SAME-CMD OWNER-LOCAL ONE-RUN — NO GEMINI UNTIL OWNER APPROVES"
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
    "package has test:v14.3T",
    scripts["test:v14.3T"] === "tsx scripts/test-v143T-owner-local-one-run-command-disambiguation-no-gemini.mts"
  );
  ok(
    "package has one disambiguated owner-local one-run command",
    scripts["owner-local-one-run:v14.3U"] ===
      "tsx scripts/owner-local-one-run-gate-v143u.mts"
  );
}

ok(
  "cross-doc continuity references v14.3S ambiguity hold",
  /HOLD — OWNER-LOCAL ONE-RUN COMMAND MISSING OR AMBIGUOUS/.test(v143sDoc)
);

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

console.log(`\nDone v14.3T command disambiguation validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
