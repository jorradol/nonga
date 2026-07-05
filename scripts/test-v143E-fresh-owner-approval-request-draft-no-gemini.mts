/**
 * v14.3E fresh owner approval request draft validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3E
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3E-fresh-owner-approval-request-draft-no-gemini.md";
const FIXTURE_PATH = "docs/examples/v14.3E-fresh-owner-approval-request-draft.synthetic.json";
const V143D_DOC_PATH = "docs/v14.3D-controlled-owner-approval-packet-no-gemini.md";
const V143C_DOC_PATH = "docs/v14.3C-controlled-staging-pilot-preflight-visibility-check-no-gemini.md";
const V143B_DOC_PATH = "docs/v14.3B-staging-only-pilot-gate-preflight-no-gemini.md";
const V142B_DOC_PATH =
  "docs/v14.2B-controlled-staging-deploy-thai-ux-evidence-surface-visibility-check.md";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143E-fresh-owner-approval-request-draft-no-gemini.mts";

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

console.log("=== v14.3E Fresh Owner Approval Request Draft Validation ===\n");

ok("v14.3E doc exists", existsSync(DOC_PATH));
ok("v14.3E fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3D doc exists", existsSync(V143D_DOC_PATH));
ok("v14.3C doc exists", existsSync(V143C_DOC_PATH));
ok("v14.3B doc exists", existsSync(V143B_DOC_PATH));
ok("v14.2B doc exists", existsSync(V142B_DOC_PATH));
ok("owner evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143dDoc = read(V143D_DOC_PATH);
const v143cDoc = read(V143C_DOC_PATH);
const v143bDoc = read(V143B_DOC_PATH);
const v142bDoc = read(V142B_DOC_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 6100, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 4100, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const requiredExecutionNoLines: Array<[string, RegExp]> = [
  ["runtime execution no", /runtime execution:\s*no/i],
  ["Gemini run no", /Gemini run:\s*no/i],
  ["one-run click no", /one-run click:\s*no/i],
  ["retry no", /retry:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["provider network call no", /provider network call:\s*no/i],
  ["provider-trigger endpoint no", /endpoint call that may trigger provider:\s*no/i],
  ["production deploy no", /production deploy:\s*no/i],
  ["staging deploy no", /staging deploy:\s*no/i],
  ["public route activation no", /public route activation:\s*no/i],
  ["real lead sending no", /real lead sending:\s*no/i],
  ["real customer pii no", /real customer data \/ PII:\s*no/i],
];
for (const [name, re] of requiredExecutionNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

ok(
  "doc includes draft-only status flags",
  /approval granted now:\s*no/i.test(doc) &&
    /this document is draft only:\s*yes/i.test(doc) &&
    /future fresh owner approval required before execution:\s*yes/i.test(doc)
);

ok(
  "doc includes exactly one-run approval wording anchors",
  /exactly ONE owner-only staging pilot dry-run/.test(doc) &&
    /Gemini\/provider call may occur only for that one approved run/.test(doc) &&
    /No retry\./.test(doc) &&
    /No second run\./.test(doc) &&
    /No public\/prod\/real lead\./.test(doc) &&
    /Synthetic\/sanitized data only\./.test(doc)
);

ok(
  "doc includes explicit future execution authorization line",
  /FINAL EXECUTION AUTHORIZE v14\.3F: YES — exactly ONE owner-only staging dry-run, no retry, no second run/.test(
    doc
  )
);

const boundaryChecklist = [
  "staging only",
  "owner/admin only",
  "allowlist only",
  "synthetic/sanitized only",
  "no real buyer data",
  "no phone capture",
  "no lead delivery",
  "no public route",
  "no production",
  "one run only",
  "no retry",
  "no second run",
  "runSessionLocked required",
];
for (const item of boundaryChecklist) {
  ok(`doc includes boundary recap item ${item}`, doc.includes(`- ${item}`));
}

const riskAcknowledgementRules = [
  "Gemini/provider call may occur only if owner approves future execution",
  "provider output must be sanitized",
  "lead/PII cue guard must remain active",
  "phone echo guard must remain active",
  "safe confirmation wording must remain active",
  "if any marker is missing, HOLD",
  "if route/auth/guard ambiguity appears, HOLD",
];
for (const rule of riskAcknowledgementRules) {
  ok(`doc includes owner risk acknowledgement ${rule}`, doc.includes(`- ${rule}`));
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
  ok(`doc includes post-run report field ${field}`, doc.includes(`\`${field}\``));
}

const antiMisleadingNoLines: Array<[string, RegExp]> = [
  ["Gemini run now no", /Gemini run now:\s*no/i],
  ["one-run approval granted now no", /one-run approval granted now:\s*no/i],
  ["pilot active now no", /pilot active now:\s*no/i],
  ["public active now no", /public active now:\s*no/i],
  ["production active now no", /production active now:\s*no/i],
  ["real lead path active now no", /real lead path active now:\s*no/i],
  ["retry allowed no", /retry allowed:\s*no/i],
  ["second run allowed no", /second run allowed:\s*no/i],
];
for (const [name, re] of antiMisleadingNoLines) {
  ok(`doc includes anti-misleading line ${name}`, re.test(doc));
}

const expectedFinalRecommendations = [
  "READY FOR v14.3F OWNER-ONLY PILOT DRY-RUN PLAN — NO RUNTIME EXECUTION",
  "READY FOR v14.3F FRESH OWNER APPROVAL DECISION POINT — NO GEMINI UNTIL OWNER APPROVES",
  "HOLD — FRESH OWNER APPROVAL DRAFT INCOMPLETE",
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
  "cross-doc keeps approval packet and preflight lineage",
  /approval status now:\s*not granted/i.test(v143dDoc) &&
    /future fresh owner approval required:\s*yes/i.test(v143dDoc) &&
    /fresh owner approval required before any future one-run/.test(v143cDoc)
);
ok(
  "cross-doc keeps non-runtime preflight boundaries",
  /Gemini run:\s*no/i.test(v143bDoc) &&
    /provider network call:\s*no/i.test(v143bDoc) &&
    /Gemini run:\s*no/i.test(v142bDoc)
);
ok(
  "owner evidence and panel still expose lock and control markers",
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
  ok("fixture version is v14.3E", root.version === "v14.3E");

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
      executionType?.providerTriggeringEndpointCall === false &&
      executionType?.deploy === false
  );

  const draftStatus = root.draftStatus as Record<string, unknown>;
  ok(
    "fixture enforces draft-only status",
    draftStatus?.approvalGrantedNow === false &&
      draftStatus?.documentIsDraftOnly === true &&
      draftStatus?.futureFreshOwnerApprovalRequiredBeforeExecution === true
  );

  const approvalRequirement = root.explicitFutureApprovalRequirement as Record<string, unknown>;
  ok(
    "fixture includes explicit future approval line and non-approval rules",
    approvalRequirement?.requiredFinalExecutionLine ===
      "FINAL EXECUTION AUTHORIZE v14.3F: YES — exactly ONE owner-only staging dry-run, no retry, no second run" &&
      approvalRequirement?.reportInThisRoundIsNotApproval === true &&
      approvalRequirement?.draftDocumentIsNotApproval === true
  );

  const recap = root.executionBoundaryRecap as Record<string, unknown>;
  ok(
    "fixture boundary recap includes required controls",
    recap?.stagingOnly === true &&
      recap?.ownerAdminOnly === true &&
      recap?.allowlistOnly === true &&
      recap?.syntheticSanitizedOnly === true &&
      recap?.noRealBuyerData === true &&
      recap?.noPhoneCapture === true &&
      recap?.noLeadDelivery === true &&
      recap?.noPublicRoute === true &&
      recap?.noProduction === true &&
      recap?.oneRunOnly === true &&
      recap?.noRetry === true &&
      recap?.noSecondRun === true &&
      recap?.runSessionLockedRequired === true
  );

  const risks = root.ownerRiskAcknowledgement as Record<string, unknown>;
  ok(
    "fixture owner risk acknowledgement includes all required statements",
    risks?.geminiProviderMayOccurOnlyIfOwnerApprovesFutureExecution === true &&
      risks?.providerOutputMustBeSanitized === true &&
      risks?.leadPiiCueGuardMustRemainActive === true &&
      risks?.phoneEchoGuardMustRemainActive === true &&
      risks?.safeConfirmationWordingMustRemainActive === true &&
      risks?.holdIfAnyMarkerMissing === true &&
      risks?.holdIfRouteAuthGuardAmbiguityAppears === true
  );

  const postRun = root.postRunReportExpectations as Record<string, unknown>;
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
    ok(`fixture requires post-run expectation ${field}`, postRun?.[field] === true);
  }

  const antiMisleading = root.antiMisleadingWordingMustRemainNo as Record<string, unknown>;
  ok(
    "fixture anti-misleading flags all false",
    antiMisleading?.geminiRunNow === false &&
      antiMisleading?.oneRunApprovalGrantedNow === false &&
      antiMisleading?.pilotActiveNow === false &&
      antiMisleading?.publicActiveNow === false &&
      antiMisleading?.productionActiveNow === false &&
      antiMisleading?.realLeadPathActiveNow === false &&
      antiMisleading?.retryAllowed === false &&
      antiMisleading?.secondRunAllowed === false
  );

  const holdRules = root.holdRulesRequired as Record<string, unknown>;
  ok(
    "fixture hold rules include all required hold triggers",
    holdRules?.holdOnDraftIncomplete === true &&
      holdRules?.holdOnApprovalWordingAmbiguity === true &&
      holdRules?.holdOnOneRunRetrySecondRunControlAmbiguity === true &&
      holdRules?.holdOnPostRunEvidenceRequirementIncomplete === true &&
      holdRules?.holdOnPublicProductionRealLeadRisk === true &&
      holdRules?.holdOnSecretPiiRisk === true &&
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

console.log(`\nDone v14.3E draft validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
