/**
 * v14.3N fresh owner approval decision + owner-friendly local UX validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3N
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3N-fresh-owner-approval-decision-owner-friendly-local-ux-no-gemini.md";
const FIXTURE_PATH =
  "docs/examples/v14.3N-fresh-owner-approval-decision-owner-friendly-local-ux.synthetic.json";
const V143M_DOC_PATH = "docs/v14.3M-owner-local-auth-evidence-acceptance-no-gemini.md";
const TOKEN_CHECK_SCRIPT_PATH = "scripts/check-admin-token-session-env.mts";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143N-fresh-owner-approval-decision-owner-friendly-local-ux-no-gemini.mts";

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

console.log("=== v14.3N Fresh Owner Approval + Owner-Friendly UX Validation ===\n");

ok("v14.3N doc exists", existsSync(DOC_PATH));
ok("v14.3N fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3M doc exists", existsSync(V143M_DOC_PATH));
ok("token checker exists", existsSync(TOKEN_CHECK_SCRIPT_PATH));
ok("owner evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143mDoc = read(V143M_DOC_PATH);
const tokenChecker = read(TOKEN_CHECK_SCRIPT_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 4700, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 3400, `${fixtureRaw.length} chars`);
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
];
for (const [name, re] of boundaryNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

ok(
  "doc states fresh approval packet not granted now",
  /approval granted now:\s*no/i.test(doc) &&
    /fresh owner approval required before execution:\s*yes/i.test(doc) &&
    /this packet is not runtime approval/i.test(doc)
);

ok(
  "doc includes future-only v14.3O approval line template",
  /FINAL EXECUTION AUTHORIZE v14\.3O: YES — exactly ONE owner-local CMD staging dry-run, no retry, no second run, staging only, owner\/admin only, synthetic\/sanitized only, no public, no production, no real lead\./.test(
    doc
  )
);

ok(
  "doc includes owner-friendly CMD UX step flow",
  /Step 1: open CMD at `D:\\nonga`/.test(doc) &&
    /Step 2: set token for this CMD session only/.test(doc) &&
    /Step 3: run safe checker/.test(doc) &&
    /Step 4: if token is present\/valid, move to fresh approval decision point/.test(doc) &&
    /Step 5: only after fresh owner approval, run exactly one owner-local dry-run command/.test(doc)
);

ok(
  "doc includes token handling UX constraints",
  /use the same CMD session where token is present/.test(doc) &&
    /if opening a new terminal, set token again/.test(doc) &&
    /do not echo token value/.test(doc) &&
    /do not paste token into chat\/report\/docs\/git/.test(doc)
);

ok(
  "doc includes one-command ergonomics proposal without runtime execution",
  /Future owner-friendly command pattern should:/.test(doc) &&
    /check token presence first/.test(doc) &&
    /fail closed when token is missing or invalid/.test(doc) &&
    /require explicit approval flag or approval text/.test(doc) &&
    /enforce exactly one run/.test(doc) &&
    /block retry and second run/.test(doc) &&
    /this is ergonomics proposal only/.test(doc)
);

ok(
  "doc includes safety-preserving UX rules",
  /convenience must not bypass fresh approval/.test(doc) &&
    /convenience must not store secrets in repository/.test(doc) &&
    /convenience must not persist token permanently by default/.test(doc) &&
    /convenience must not auto-run Gemini\/provider/.test(doc) &&
    /convenience must not allow retry\/second run/.test(doc) &&
    /convenience must not activate public\/prod\/real lead paths/.test(doc)
);

ok(
  "doc includes future execution model constraints",
  /future execution must run from owner-local CMD session where token is present\/valid/.test(doc) &&
    /agent\/operator session should not be assumed to have token/.test(doc) &&
    /fresh owner approval is required immediately before run/.test(doc) &&
    /one-run is consumed only if runtime command actually starts/.test(doc) &&
    /if auth\/session\/token is missing at execution time => HOLD, no run consumed/.test(doc)
);

ok(
  "doc keeps one-run state unconsumed",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc)
);

ok(
  "cross-doc lineage keeps owner-local readiness concept",
  /owner-local auth evidence ready/i.test(v143mDoc) &&
    /agent\/operator session token visibility:\s*`missing`/.test(v143mDoc)
);

ok(
  "token checker remains safe local-only and non-gemini",
  /Safe local-only check/.test(tokenChecker) &&
    /No network call/.test(tokenChecker) &&
    /No Gemini call/.test(tokenChecker)
);

ok(
  "owner evidence/panel preserve no-retry and single-run controls",
  /runSessionLocked:\s*boolean;/.test(ownerEvidence) &&
    /noRetry=true/.test(ownerPanel) &&
    /noSecondRunWithoutFreshApproval=true/.test(ownerPanel)
);

const expectedFinalRecommendations = [
  "READY FOR v14.3O FRESH OWNER APPROVAL DECISION POINT — OWNER-LOCAL AUTH READY, NO GEMINI UNTIL OWNER APPROVES",
  "READY FOR v14.3O OWNER-FRIENDLY ONE-RUN COMMAND PACKET — NO RUNTIME UNTIL OWNER APPROVES",
  "HOLD — OWNER-FRIENDLY UX REQUIREMENT INCOMPLETE",
  "HOLD — FRESH APPROVAL WORDING AMBIGUITY",
  "HOLD — OWNER-LOCAL EXECUTION MODEL AMBIGUITY",
  "HOLD — SECRET/TOKEN EXPOSURE RISK DETECTED",
  "HOLD — ONE-RUN / RETRY / SECOND-RUN CONTROL AMBIGUITY",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.3N", root.version === "v14.3N");

  const executionType = root.executionType as Record<string, unknown>;
  ok(
    "fixture execution remains no-runtime and no-provider",
    executionType?.docsTestsFixturesStaticMockOnly === true &&
      executionType?.readOnlyInspectionOnly === true &&
      executionType?.runtimeExecutionNow === false &&
      executionType?.geminiRunNow === false &&
      executionType?.oneRunClickNow === false &&
      executionType?.providerNetworkCallNow === false &&
      executionType?.providerTriggeringEndpointNow === false &&
      executionType?.retryNow === false &&
      executionType?.secondRunNow === false &&
      executionType?.deployNow === false
  );

  const approval = root.freshOwnerApprovalDecision as Record<string, unknown>;
  ok(
    "fixture records fresh approval decision as not granted now",
    approval?.approvalGrantedNow === false &&
      approval?.geminiRunNow === false &&
      approval?.oneRunConsumedNow === false &&
      approval?.freshOwnerApprovalRequiredBeforeExecution === true &&
      approval?.thisSliceIsNotRuntimeApproval === true &&
      approval?.futureApprovalLineTemplate ===
        "FINAL EXECUTION AUTHORIZE v14.3O: YES — exactly ONE owner-local CMD staging dry-run, no retry, no second run, staging only, owner/admin only, synthetic/sanitized only, no public, no production, no real lead."
  );

  const ux = root.ownerFriendlyLocalCmdUxPlan as Record<string, unknown>;
  ok(
    "fixture includes owner-friendly local CMD UX steps",
    ux?.step1OpenCmdAtDnonga === true &&
      ux?.step2SetTokenForSessionOnly === true &&
      ux?.step3RunSafeChecker === "npm run check:admin-token-session-env" &&
      ux?.step4MoveToFreshApprovalIfPresentValid === true &&
      ux?.step5RunExactlyOneOnlyAfterFreshApproval === true &&
      ux?.mustUseSameCmdSessionWithTokenPresent === true
  );

  const ergonomics = root.oneCommandErgonomicsProposal as Record<string, unknown>;
  ok(
    "fixture ergonomics proposal keeps strict safety gates",
    ergonomics?.planningOnlyNoRuntimeExecution === true &&
      ergonomics?.checkTokenPresenceFirst === true &&
      ergonomics?.failClosedIfTokenMissing === true &&
      ergonomics?.printMaskedOnlyStatus === true &&
      ergonomics?.requireExplicitApprovalFlagOrText === true &&
      ergonomics?.enforceExactlyOneRun === true &&
      ergonomics?.blockRetryAndSecondRun === true &&
      ergonomics?.neverPrintToken === true
  );

  const rules = root.safetyPreservingUxRules as Record<string, unknown>;
  ok(
    "fixture safety-preserving UX rules are complete",
    rules?.convenienceMustNotBypassFreshApproval === true &&
      rules?.convenienceMustNotStoreSecretsInRepo === true &&
      rules?.convenienceMustNotPersistTokenByDefault === true &&
      rules?.convenienceMustNotAutoRunGeminiProvider === true &&
      rules?.convenienceMustNotAllowRetrySecondRun === true &&
      rules?.convenienceMustNotActivatePublicProdRealLead === true
  );

  const future = root.futureExecutionModel as Record<string, unknown>;
  ok(
    "fixture future execution model remains owner-local and guarded",
    future?.runFromOwnerLocalCmdWithTokenPresentValid === true &&
      future?.agentOperatorSessionTokenNotAssumed === true &&
      future?.freshApprovalRequiredImmediatelyBeforeRun === true &&
      future?.oneRunConsumedOnlyWhenRuntimeActuallyStarts === true &&
      future?.missingAuthSessionTokenAtExecutionTimeMeansHoldNoConsumption === true
  );

  const oneRun = root.oneRunControlStatusNow as Record<string, unknown>;
  ok(
    "fixture one-run control status remains unconsumed",
    oneRun?.oneRunStarted === false &&
      oneRun?.oneRunConsumed === false &&
      oneRun?.retryUsed === false &&
      oneRun?.secondRunUsed === false
  );

  const hold = root.holdRulesRequired as Record<string, unknown>;
  ok(
    "fixture hold rules are complete",
    hold?.holdOnOwnerFriendlyUxRequirementIncomplete === true &&
      hold?.holdOnFreshApprovalWordingAmbiguity === true &&
      hold?.holdOnOwnerLocalExecutionModelAmbiguity === true &&
      hold?.holdOnSecretTokenExposureRisk === true &&
      hold?.holdOnOneRunRetrySecondRunControlAmbiguity === true &&
      hold?.holdOnPublicProductionRealLeadRisk === true &&
      hold?.holdOnTestFailure === true
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

console.log(`\nDone v14.3N owner-friendly approval packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
