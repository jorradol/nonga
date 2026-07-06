/**
 * v15.5 controlled pre-prod dry-run packet design validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.5
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.5-controlled-pre-prod-dry-run-packet-design.md";
const FIXTURE_PATH =
  "docs/examples/v15.5-controlled-pre-prod-dry-run-packet-design.synthetic.json";
const PACKAGE_PATH = "package.json";

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

function hasEveryLine(source: string, required: string[]): boolean {
  return required.every((token) => source.includes(token));
}

console.log("=== v15.5 Controlled Pre-Prod Dry-Run Packet Design Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states dry-run packet design",
  /v15\.5 — Controlled Pre-Prod Dry-Run Packet Design/.test(doc)
);

ok(
  "doc confirms design-only and no execution scope",
  hasEveryLine(doc, [
    "dry-run packet design only",
    "design-only and is not dry-run execution",
    "not execution approval",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc confirms baseline through v15.4",
  hasEveryLine(doc, [
    "`v13` closed",
    "`v14` closed",
    "`v15.0` gate packet exists and passed",
    "`v15.0A` gate packet review exists and passed",
    "`v15.1` checklist review exists and passed",
    "`v15.2` risk register exists and passed",
    "`v15.3` GO/NO-GO criteria exists and passed",
    "`v15.4` owner decision packet exists and passed",
  ])
);

ok(
  "doc includes dry-run status",
  hasEveryLine(doc, [
    "v15.5 is dry-run packet design only",
    "no dry-run execution in this round",
    "no one-run in this round",
    "no deploy in this round",
    "no public/production/real lead action in this round",
  ])
);

ok(
  "doc includes future dry-run purpose",
  hasEveryLine(doc, [
    "future phase after owner approval",
    "synthetic-only evidence design",
    "controlled path only",
    "do not open buyer-facing public release",
  ])
);

ok(
  "doc includes future owner approval requirements",
  hasEveryLine(doc, [
    "future dry-run execution requires fresh owner approval",
    "define scope clearly before run",
    "define command/target clearly before run",
    "define expected evidence clearly before run",
    "retry/second-run is prohibited without fresh owner approval",
  ])
);

ok(
  "doc includes dry-run preflight checklist design",
  hasEveryLine(doc, [
    "repo state check",
    "branch/HEAD/origin/clean tree check",
    "test suite pass check",
    "environment/boundary check in masked-only mode",
    "no secret exposure check",
    "no PII/phone/plate/VIN check",
    "rollback/kill-switch expectation check",
    "owner approval capture check",
  ])
);

ok(
  "doc includes dry-run evidence design fields",
  hasEveryLine(doc, [
    "`executionAuthorized`",
    "`runCount`",
    "`targetScope`",
    "`routeOrCommandNameMasked`",
    "`publicReleaseActivated`",
    "`productionActivated`",
    "`realLeadSent`",
    "`providerNetworkUsed`",
    "`fallbackToLegacy`",
    "`skipGemini`",
    "`guardStatus`",
    "`tokenExposure`",
    "`piiExposure`",
    "`rollbackReady`",
    "`finalDecision`",
    "does not generate runtime evidence",
  ])
);

ok(
  "doc includes stop conditions",
  hasEveryLine(doc, [
    "stop if public/production activation is detected",
    "stop if real lead risk is detected",
    "stop if token/secret/PII exposure is detected",
    "stop if uncontrolled Gemini/provider/runtime call is detected",
    "stop if retry/second-run risk is detected",
    "stop if v16 boundary is crossed",
    "stop if rollback/kill-switch expectation is missing",
  ])
);

ok(
  "doc includes allowed future decisions",
  hasEveryLine(doc, [
    "READY FOR NEXT PREPARATION STEP — NO PUBLIC RELEASE",
    "NEED REVIEW — DRY-RUN EVIDENCE INCOMPLETE",
    "HOLD — BOUNDARY RISK DETECTED",
    "HOLD — TOKEN/SECRET/PII RISK DETECTED",
    "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  ])
);

ok(
  "doc includes rollback kill-switch design",
  hasEveryLine(doc, [
    "disable path expectation",
    "owner/operator responsibility",
    "evidence capture",
    "stop condition",
    "no public movement without rollback expectation",
  ])
);

ok(
  "doc includes v16 boundary and Thor/dealer import prohibitions",
  hasEveryLine(doc, [
    "v16 not started",
    "not a real dealer/real lead pilot",
    "no Thor/dealer real import",
    "no real lead sending",
  ])
);

ok(
  "doc includes Thai owner-friendly explanation",
  hasEveryLine(doc, [
    "v15.5 คือการออกแบบแพ็กเกจ dry-run ล่วงหน้า ยังไม่ใช่การรันจริง",
    "ต้องมี dry-run packet ก่อน",
    "ต้องขอ owner approval แยก",
    "ยังห้าม one-run/retry/second-run",
  ])
);

ok(
  "doc includes hard boundaries for no-run no-public no-pii no-token and no-runtime",
  hasEveryLine(doc, [
    "no one-run",
    "no retry",
    "no second-run",
    "no public route activation",
    "no production activation",
    "no real customer data / PII",
    "no phone / plate / VIN",
    "no secret / token / API key exposure",
    "no provider/Gemini/runtime network call",
    "no v16 real dealer / real lead action",
  ])
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
  ok("fixture version is v15.5", root.version === "v15.5");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "967c5a63474b52283930aa0d04f7f637fb077c0d"
  );
  ok(
    "fixture source references are correct",
    root.sourceV13Closure === "docs/v13.16-owner-only-gemini-runtime-proof-closure.md" &&
      root.sourceV14Closure === "docs/v14.6-limited-staging-pilot-readiness-closure.md" &&
      root.sourceV150GatePacket ===
        "docs/v15.0-controlled-production-public-preparation-gate-packet.md" &&
      root.sourceV150AReview ===
        "docs/v15.0A-controlled-production-public-preparation-gate-packet-review.md" &&
      root.sourceV151ChecklistReview ===
        "docs/v15.1-production-public-prep-checklist-review.md" &&
      root.sourceV152RiskRegister ===
        "docs/v15.2-controlled-pre-prod-risk-register.md" &&
      root.sourceV153GoNoGoCriteria ===
        "docs/v15.3-controlled-pre-prod-go-no-go-criteria.md" &&
      root.sourceV154OwnerDecisionPacket ===
        "docs/v15.4-controlled-pre-prod-owner-decision-packet.md"
  );

  ok(
    "fixture design boundaries are true",
    root.designOnly === true &&
      root.noExecution === true &&
      root.noPublicRelease === true &&
      root.noProductionActivation === true &&
      root.noRealLead === true &&
      root.runtimeEvidenceGeneratedInV155 === false &&
      root.thorDealerImportProhibited === true
  );

  const noRun = root.noRunControls as Record<string, unknown>;
  ok(
    "fixture noRunControls are complete and false",
    noRun?.oneRunByAgent === false &&
      noRun?.retryByAgent === false &&
      noRun?.secondRunByAgent === false &&
      noRun?.liveEndpointCallByAgent === false &&
      noRun?.providerGeminiRuntimeNetworkCallByAgent === false
  );

  const status = root.dryRunStatus as Record<string, unknown>;
  ok(
    "fixture dry-run status is complete",
    status?.v155DesignOnly === true &&
      status?.notExecuted === true &&
      status?.notOneRun === true &&
      status?.notDeploy === true &&
      status?.notPublicProductionRealLead === true
  );

  const purpose = root.futureDryRunPurpose as Record<string, unknown>;
  ok(
    "fixture future dry-run purpose is complete",
    purpose?.futureReadinessValidationAfterOwnerApprovalOnly === true &&
      purpose?.syntheticOnlyEvidence === true &&
      purpose?.controlledPathOnly === true &&
      purpose?.noBuyerFacingPublicRelease === true
  );

  const approvals = root.futureOwnerApprovalRequirement as Record<string, unknown>;
  ok(
    "fixture future owner approval requirement is complete",
    approvals?.freshOwnerApprovalRequiredForExecution === true &&
      approvals?.scopeMustBeDeclared === true &&
      approvals?.commandTargetMustBeDeclared === true &&
      approvals?.expectedEvidenceMustBeDeclared === true &&
      approvals?.retrySecondRunNeedsFreshOwnerApproval === true
  );

  const preflight = Array.isArray(root.dryRunPreflightChecklistDesign)
    ? (root.dryRunPreflightChecklistDesign as string[])
    : [];
  ok(
    "fixture dry-run preflight checklist design includes required checks",
    preflight.length >= 8 &&
      preflight.includes("repoStateCheck") &&
      preflight.includes("branchHeadOriginCleanTreeCheck") &&
      preflight.includes("testSuitePassCheck") &&
      preflight.includes("environmentBoundaryMaskedOnlyCheck") &&
      preflight.includes("noSecretExposureCheck") &&
      preflight.includes("noPiiPhonePlateVinCheck") &&
      preflight.includes("rollbackKillSwitchExpectationCheck") &&
      preflight.includes("ownerApprovalCaptureCheck")
  );

  const evidenceFields = Array.isArray(root.dryRunEvidenceDesignFields)
    ? (root.dryRunEvidenceDesignFields as string[])
    : [];
  ok(
    "fixture dry-run evidence field design includes required fields",
    evidenceFields.length >= 15 &&
      evidenceFields.includes("executionAuthorized") &&
      evidenceFields.includes("runCount") &&
      evidenceFields.includes("targetScope") &&
      evidenceFields.includes("routeOrCommandNameMasked") &&
      evidenceFields.includes("publicReleaseActivated") &&
      evidenceFields.includes("productionActivated") &&
      evidenceFields.includes("realLeadSent") &&
      evidenceFields.includes("providerNetworkUsed") &&
      evidenceFields.includes("fallbackToLegacy") &&
      evidenceFields.includes("skipGemini") &&
      evidenceFields.includes("guardStatus") &&
      evidenceFields.includes("tokenExposure") &&
      evidenceFields.includes("piiExposure") &&
      evidenceFields.includes("rollbackReady") &&
      evidenceFields.includes("finalDecision")
  );

  const stops = root.dryRunStopConditions as Record<string, unknown>;
  ok(
    "fixture dry-run stop conditions are complete",
    Object.keys(stops ?? {}).length >= 7 &&
      Object.values(stops ?? {}).every((value) => value === "stop")
  );

  const decisions = Array.isArray(root.dryRunAllowedFutureDecisions)
    ? (root.dryRunAllowedFutureDecisions as string[])
    : [];
  ok(
    "fixture allowed future decisions include approved design set",
    decisions.length >= 5 &&
      decisions.includes("READY FOR NEXT PREPARATION STEP — NO PUBLIC RELEASE") &&
      decisions.includes("NEED REVIEW — DRY-RUN EVIDENCE INCOMPLETE") &&
      decisions.includes("HOLD — BOUNDARY RISK DETECTED") &&
      decisions.includes("HOLD — TOKEN/SECRET/PII RISK DETECTED") &&
      decisions.includes("HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED")
  );

  const rollback = root.rollbackKillSwitchDesign as Record<string, unknown>;
  ok(
    "fixture rollback kill-switch design is complete",
    rollback?.disablePathExpectationRequired === true &&
      rollback?.ownerOperatorResponsibilityRequired === true &&
      rollback?.evidenceCaptureRequired === true &&
      rollback?.stopConditionRequired === true &&
      rollback?.noPublicMovementWithoutRollbackExpectation === true
  );

  const v16 = root.v16Boundary as Record<string, unknown>;
  ok(
    "fixture v16 boundary is complete",
    v16?.v16NotStarted === true &&
      v16?.notRealDealerRealLeadPilot === true &&
      v16?.thorDealerRealImportProhibited === true &&
      v16?.realLeadSendingProhibited === true
  );

  const thai = root.thaiOwnerFriendlyExplanation as Record<string, unknown>;
  ok(
    "fixture has Thai owner-friendly explanation section",
    typeof thai?.whatIsV155 === "string" &&
      typeof thai?.whyDryRunPacketFirst === "string" &&
      typeof thai?.whatNeedsSeparateApproval === "string" &&
      typeof thai?.whatIsStillProhibited === "string"
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.6 CONTROLLED PRE-PROD DRY-RUN REVIEW — NO EXECUTION"
  );
  ok("fixture has nextOwnerAction", !!root.nextOwnerAction);
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
    "package has test:v15.5 script",
    scripts["test:v15.5"] ===
      "tsx scripts/test-v155-controlled-pre-prod-dry-run-packet-design.mts"
  );
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["generic api key assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(
  `\nDone v15.5 controlled pre-prod dry-run packet design validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
