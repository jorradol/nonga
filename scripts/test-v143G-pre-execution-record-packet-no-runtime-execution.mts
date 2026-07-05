/**
 * v14.3G pre-execution record packet validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3G
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3G-pre-execution-record-packet-no-runtime-execution.md";
const FIXTURE_PATH = "docs/examples/v14.3G-pre-execution-record-packet.synthetic.json";
const V143F_DOC_PATH = "docs/v14.3F-owner-only-pilot-dry-run-plan-no-runtime-execution.md";
const V143E_DOC_PATH = "docs/v14.3E-fresh-owner-approval-request-draft-no-gemini.md";
const V143D_DOC_PATH = "docs/v14.3D-controlled-owner-approval-packet-no-gemini.md";
const V143C_DOC_PATH = "docs/v14.3C-controlled-staging-pilot-preflight-visibility-check-no-gemini.md";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143G-pre-execution-record-packet-no-runtime-execution.mts";

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

console.log("=== v14.3G Pre-Execution Record Packet Validation ===\n");

ok("v14.3G doc exists", existsSync(DOC_PATH));
ok("v14.3G fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3F doc exists", existsSync(V143F_DOC_PATH));
ok("v14.3E doc exists", existsSync(V143E_DOC_PATH));
ok("v14.3D doc exists", existsSync(V143D_DOC_PATH));
ok("v14.3C doc exists", existsSync(V143C_DOC_PATH));
ok("owner evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143fDoc = read(V143F_DOC_PATH);
const v143eDoc = read(V143E_DOC_PATH);
const v143dDoc = read(V143D_DOC_PATH);
const v143cDoc = read(V143C_DOC_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 5300, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 4000, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const requiredNoBoundaryLines: Array<[string, RegExp]> = [
  ["runtime execution no", /runtime execution:\s*no/i],
  ["Gemini run no", /Gemini run:\s*no/i],
  ["one-run click no", /one-run click:\s*no/i],
  ["provider call no", /provider network call:\s*no/i],
  ["provider endpoint no", /endpoint call that may trigger provider:\s*no/i],
  ["retry no", /retry:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["deploy no", /deploy:\s*no/i],
  ["public route activation no", /public route activation:\s*no/i],
  ["production no", /production:\s*no/i],
  ["real lead sending no", /real lead sending:\s*no/i],
];
for (const [name, re] of requiredNoBoundaryLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

const requiredRecordFields = [
  "fresh owner approval line",
  "approval timestamp",
  "authorized run count = exactly 1",
  "runSessionLocked expected",
  "pre-run route/auth/gate status",
  "pre-run marker status",
  "pre-run boundary confirmation",
  "post-run evidence fields expected",
  "HOLD conditions",
];
for (const field of requiredRecordFields) {
  ok(`doc includes record field ${field}`, doc.includes(`- ${field}`));
}

const requiredCurrentStatusLines: Array<[string, RegExp]> = [
  ["runtime action now no", /runtime action now:\s*no/i],
  ["Gemini run now no", /Gemini run now:\s*no/i],
  ["one-run consumed now no", /one-run consumed now:\s*no/i],
  ["approval consumed now no", /approval consumed now:\s*no/i],
  ["retry allowed no", /retry allowed:\s*no/i],
  ["second run allowed no", /second run allowed:\s*no/i],
];
for (const [name, re] of requiredCurrentStatusLines) {
  ok(`doc includes current status line ${name}`, re.test(doc));
}

ok(
  "doc includes future fresh approval requirement and v14.3H line",
  /future execution requires fresh owner approval immediately before run/i.test(doc) &&
    /FINAL EXECUTION AUTHORIZE v14\.3H: YES — exactly ONE owner-only staging dry-run, no retry, no second run, staging only, owner\/admin only, synthetic\/sanitized only, no public, no production, no real lead\./.test(
      doc
    )
);

ok(
  "doc states v14.3G prompt/report is not approval",
  /prompt\/report text in this round is not approval/i.test(doc) &&
    /this packet is not approval consumption/i.test(doc)
);

const oneRunControlLines = [
  "exactly one-run wording required",
  "runSessionLocked expected before/after run evidence",
  "oneRunConsumed expected only after future run",
  "no retry allowed",
  "no second run allowed",
];
for (const line of oneRunControlLines) {
  ok(`doc includes one-run control ${line}`, doc.includes(`- ${line}`));
}

const preRunChecklistLines = [
  "route target remains staging-only",
  "owner/admin auth path is confirmed",
  "allowlist enforcement is visible",
  "guard markers visible",
  "Thai UX markers visible",
  "boundary confirmation visible",
  "approval wording unambiguous",
];
for (const line of preRunChecklistLines) {
  ok(`doc includes pre-run checklist item ${line}`, doc.includes(`- ${line}`));
}

const postRunEvidenceFields = [
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
  "leadPiiCueGuardActive",
  "phoneEchoGuardActive",
  "safeConfirmationStepWordingActive",
  "sanitizedUserVisibleText",
  "missingUserVisibleText",
  "answerFieldSource",
  "answerCharCount",
  "runSessionLocked",
  "oneRunConsumed",
  "noRetry",
  "noSecondRun",
  "boundary confirmation",
];
for (const field of postRunEvidenceFields) {
  ok(`doc includes post-run evidence ${field}`, doc.includes(`\`${field}\``));
}

const expectedHoldTriggers = [
  "draft-only/no-runtime status is missing",
  "fresh approval requirement is missing",
  "exactly one-run wording is missing",
  "no retry/no second run wording is missing",
  "no provider call now wording is missing",
  "no one-run consumed now wording is missing",
  "runSessionLocked expected is missing",
  "pre-run checklist incomplete",
  "post-run evidence checklist incomplete",
  "anti-misleading wording incomplete",
  "test failure",
];
for (const hold of expectedHoldTriggers) {
  ok(`doc includes HOLD trigger ${hold}`, doc.includes(`- ${hold}`));
}

const antiMisleadingLines = [
  "runtime action now: no",
  "Gemini run now: no",
  "one-run consumed now: no",
  "approval consumed now: no",
  "retry allowed: no",
  "second run allowed: no",
  "pilot active now: no",
  "public active now: no",
  "production active now: no",
  "real lead path active now: no",
];
for (const line of antiMisleadingLines) {
  ok(`doc includes anti-misleading wording ${line}`, doc.includes(`- ${line}`));
}

const expectedFinalRecommendations = [
  "READY FOR v14.3H FRESH OWNER APPROVAL DECISION POINT — NO GEMINI UNTIL OWNER APPROVES",
  "HOLD — PRE-EXECUTION RECORD PACKET INCOMPLETE",
  "HOLD — APPROVAL WORDING AMBIGUITY",
  "HOLD — ONE-RUN / RETRY / SECOND-RUN CONTROL AMBIGUITY",
  "HOLD — POST-RUN EVIDENCE REQUIREMENT INCOMPLETE",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — SECRET/PII RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

ok(
  "cross-doc lineage keeps pre-approval and plan constraints",
  /FINAL EXECUTION AUTHORIZE v14\.3F: YES/.test(v143eDoc) &&
    /one-run approval granted now:\s*yes/i.test(v143fDoc) &&
    /approval status now:\s*not granted/i.test(v143dDoc) &&
    /fresh owner approval required before any future one-run/.test(v143cDoc)
);

ok(
  "owner evidence and panel still expose run lock controls",
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
  ok("fixture version is v14.3G", root.version === "v14.3G");

  const executionType = root.executionType as Record<string, unknown>;
  ok(
    "fixture execution type is non-runtime static",
    executionType?.staticMockOnly === true &&
      executionType?.readOnlyInspectionOnly === true &&
      executionType?.runtimeExecution === false &&
      executionType?.geminiRun === false &&
      executionType?.oneRunClick === false &&
      executionType?.providerNetworkCall === false &&
      executionType?.providerTriggeringEndpointCall === false &&
      executionType?.retry === false &&
      executionType?.secondRun === false
  );

  const statusNow = root.currentStatusMustRemainNo as Record<string, unknown>;
  ok(
    "fixture current status remains no",
    statusNow?.runtimeActionNow === false &&
      statusNow?.geminiRunNow === false &&
      statusNow?.oneRunConsumedNow === false &&
      statusNow?.approvalConsumedNow === false &&
      statusNow?.retryAllowed === false &&
      statusNow?.secondRunAllowed === false
  );

  const fresh = root.freshApprovalHandling as Record<string, unknown>;
  ok(
    "fixture fresh approval handling complete",
    fresh?.futureExecutionRequiresFreshOwnerApprovalImmediatelyBeforeRun === true &&
      fresh?.requiredFutureApprovalLine ===
        "FINAL EXECUTION AUTHORIZE v14.3H: YES — exactly ONE owner-only staging dry-run, no retry, no second run, staging only, owner/admin only, synthetic/sanitized only, no public, no production, no real lead." &&
      fresh?.thisRoundPromptOrReportIsNotApproval === true &&
      fresh?.thisPacketDoesNotConsumeApproval === true
  );

  const oneRun = root.oneRunControls as Record<string, unknown>;
  ok(
    "fixture one-run controls complete",
    oneRun?.exactlyOneRunWordingRequired === true &&
      oneRun?.runSessionLockedExpected === true &&
      oneRun?.oneRunConsumedExpectedOnlyPostRun === true &&
      oneRun?.noRetry === true &&
      oneRun?.noSecondRun === true
  );

  const preRun = root.preRunChecklistRequired as Record<string, unknown>;
  ok(
    "fixture pre-run checklist complete",
    preRun?.stagingRouteOnly === true &&
      preRun?.ownerAdminAuthPathConfirmed === true &&
      preRun?.allowlistEnforcementVisible === true &&
      preRun?.guardMarkersVisible === true &&
      preRun?.thaiUxMarkersVisible === true &&
      preRun?.boundaryConfirmationVisible === true &&
      preRun?.approvalWordingUnambiguous === true
  );

  const postRun = root.postRunEvidenceChecklistRequired as Record<string, unknown>;
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
    "leadPiiCueGuardActive",
    "phoneEchoGuardActive",
    "safeConfirmationStepWordingActive",
    "sanitizedUserVisibleText",
    "missingUserVisibleText",
    "answerFieldSource",
    "answerCharCount",
    "runSessionLocked",
    "oneRunConsumed",
    "noRetry",
    "noSecondRun",
    "boundaryConfirmation",
  ]) {
    ok(`fixture post-run evidence includes ${field}`, postRun?.[field] === true);
  }

  const anti = root.antiMisleadingWordingRequired as Record<string, unknown>;
  ok(
    "fixture anti-misleading coverage complete",
    anti?.runtimeActionNowNo === true &&
      anti?.geminiRunNowNo === true &&
      anti?.oneRunConsumedNowNo === true &&
      anti?.approvalConsumedNowNo === true &&
      anti?.retryAllowedNo === true &&
      anti?.secondRunAllowedNo === true &&
      anti?.pilotActiveNowNo === true &&
      anti?.publicActiveNowNo === true &&
      anti?.productionActiveNowNo === true &&
      anti?.realLeadPathActiveNowNo === true
  );

  const holds = root.holdRulesRequired as Record<string, unknown>;
  ok(
    "fixture hold rules complete",
    holds?.holdOnDraftOnlyStatusMissing === true &&
      holds?.holdOnFreshApprovalRequirementMissing === true &&
      holds?.holdOnOneRunWordingMissing === true &&
      holds?.holdOnRetrySecondRunControlMissing === true &&
      holds?.holdOnNoProviderCallNowMissing === true &&
      holds?.holdOnNoOneRunConsumedNowMissing === true &&
      holds?.holdOnRunSessionLockedExpectedMissing === true &&
      holds?.holdOnPreRunChecklistIncomplete === true &&
      holds?.holdOnPostRunEvidenceChecklistIncomplete === true &&
      holds?.holdOnAntiMisleadingIncomplete === true &&
      holds?.holdOnPublicProductionRealLeadRisk === true &&
      holds?.holdOnSecretPiiRisk === true &&
      holds?.holdOnTestFailure === true
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

console.log(`\nDone v14.3G pre-execution packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
