/**
 * v15.7 controlled pre-prod owner approval template validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.7
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.7-controlled-pre-prod-owner-approval-template.md";
const FIXTURE_PATH =
  "docs/examples/v15.7-controlled-pre-prod-owner-approval-template.synthetic.json";
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

console.log("=== v15.7 Controlled Pre-Prod Owner Approval Template Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states owner approval template",
  /v15\.7 — Controlled Pre-Prod Owner Approval Template/.test(doc)
);

ok(
  "doc confirms template-only no execution scope",
  hasEveryLine(doc, [
    "owner-approval-template only",
    "template-only and is not dry-run execution",
    "not execution approval",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc confirms baseline through v15.6",
  hasEveryLine(doc, [
    "`v13` closed",
    "`v14` closed",
    "`v15.0` gate packet exists and passed",
    "`v15.0A` gate packet review exists and passed",
    "`v15.1` checklist review exists and passed",
    "`v15.2` risk register exists and passed",
    "`v15.3` GO/NO-GO criteria exists and passed",
    "`v15.4` owner decision packet exists and passed",
    "`v15.5` dry-run packet design exists and passed",
    "`v15.6` dry-run packet review exists and passed",
  ])
);

ok(
  "doc includes template status",
  hasEveryLine(doc, [
    "v15.7 is template-only",
    "no execution approval in this round",
    "no dry-run approval in this round",
    "no deploy approval in this round",
    "no public/production/real lead approval in this round",
    "v16 not started",
  ])
);

ok(
  "doc includes required owner approval fields",
  hasEveryLine(doc, [
    "`approval_id`",
    "`approval_type`",
    "`requested_scope`",
    "`exact_command_or_action`",
    "`exact_target`",
    "`expected_run_count`",
    "`one_run_only`",
    "`retry_allowed`",
    "`second_run_allowed`",
    "`expected_evidence`",
    "`boundary_assertions`",
    "`rollback_plan`",
    "`stop_conditions`",
    "`token_secret_pii_handling`",
    "`owner_explicit_phrase`",
    "`approval_timestamp_placeholder`",
    "`final_allowed_decision`",
  ])
);

ok(
  "doc includes allowed approval types",
  hasEveryLine(doc, [
    "CONTROLLED_DRY_RUN_ONLY",
    "CONTROLLED_PREFLIGHT_REVIEW_ONLY",
    "CONTROLLED_EVIDENCE_CAPTURE_ONLY",
    "CONTROLLED_ROLLBACK_REVIEW_ONLY",
  ])
);

ok(
  "doc includes explicit disallowed approvals",
  hasEveryLine(doc, [
    "production deploy",
    "production activation",
    "public route activation",
    "buyer-facing public release",
    "real lead sending",
    "real customer data / PII",
    "phone/plate/VIN",
    "token/secret/API key exposure",
    "Thor/dealer real import",
    "v16 real dealer/real lead action",
  ])
);

ok(
  "doc includes one-run retry second-run rule",
  hasEveryLine(doc, [
    "declare expected run count",
    "default is one-run only",
    "retry default is false",
    "second-run default is false",
    "retry/second-run needs fresh owner approval",
    "automatic retry is prohibited",
  ])
);

ok(
  "doc includes command target clarity requirement",
  hasEveryLine(doc, [
    "manual endpoint guess is prohibited",
    "exact command or action must be declared",
    "exact target/scope must be declared",
    "expected evidence must be declared",
    "decision must be HOLD",
  ])
);

ok(
  "doc includes evidence requirement fields",
  hasEveryLine(doc, [
    "`executionAuthorized`",
    "`approvalId`",
    "`runCount`",
    "`commandOrAction`",
    "`targetScope`",
    "`publicReleaseActivated`",
    "`productionActivated`",
    "`realLeadSent`",
    "`providerNetworkUsed`",
    "`runtimeCallUsed`",
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
  "doc includes boundary assertions",
  hasEveryLine(doc, [
    "no public release",
    "no production activation",
    "no real lead",
    "no PII/phone/plate/VIN",
    "no token/secret/API key exposure",
    "no uncontrolled provider/Gemini/runtime call",
    "no Thor/dealer real import",
    "no v16 real action",
  ])
);

ok(
  "doc includes rollback kill-switch requirement",
  hasEveryLine(doc, [
    "rollback/disable path must exist",
    "owner/operator responsibility must be explicit",
    "evidence capture requirement must be explicit",
    "decision must be HOLD",
  ])
);

ok(
  "doc includes stop conditions",
  hasEveryLine(doc, [
    "stop if public/prod activation is detected",
    "stop if real lead risk is detected",
    "stop if token/secret/PII risk is detected",
    "stop if uncontrolled runtime/provider/Gemini risk is detected",
    "stop if retry/second-run risk is detected",
    "stop if command/target ambiguity is detected",
    "stop if rollback/kill-switch is missing",
    "stop if v16 boundary is crossed",
  ])
);

ok(
  "doc includes Thai owner-friendly explanation",
  hasEveryLine(doc, [
    "v15.7 คือแบบฟอร์มอนุมัติสำหรับอนาคตเท่านั้น",
    "ต้องมี template ก่อน",
    "ต้องระบุ run count, one-run rule, stop conditions",
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
  ok("fixture version is v15.7", root.version === "v15.7");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "9095fff491514264e34d4b599c335a5d910ad9b6"
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
        "docs/v15.4-controlled-pre-prod-owner-decision-packet.md" &&
      root.sourceV155DryRunDesign ===
        "docs/v15.5-controlled-pre-prod-dry-run-packet-design.md" &&
      root.sourceV156DryRunReview ===
        "docs/v15.6-controlled-pre-prod-dry-run-packet-review.md"
  );

  ok(
    "fixture template boundaries are true",
    root.templateOnly === true &&
      root.noExecution === true &&
      root.noDryRunApproval === true &&
      root.noDeployApproval === true &&
      root.noPublicProductionRealLeadApproval === true &&
      root.v16NotStarted === true &&
      root.runtimeEvidenceGeneratedInV157 === false &&
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

  const requiredFields = Array.isArray(root.requiredOwnerApprovalFields)
    ? (root.requiredOwnerApprovalFields as string[])
    : [];
  ok(
    "fixture required owner approval fields are complete",
    requiredFields.length >= 17 &&
      requiredFields.includes("approval_id") &&
      requiredFields.includes("approval_type") &&
      requiredFields.includes("requested_scope") &&
      requiredFields.includes("exact_command_or_action") &&
      requiredFields.includes("exact_target") &&
      requiredFields.includes("expected_run_count") &&
      requiredFields.includes("one_run_only") &&
      requiredFields.includes("retry_allowed") &&
      requiredFields.includes("second_run_allowed") &&
      requiredFields.includes("expected_evidence") &&
      requiredFields.includes("boundary_assertions") &&
      requiredFields.includes("rollback_plan") &&
      requiredFields.includes("stop_conditions") &&
      requiredFields.includes("token_secret_pii_handling") &&
      requiredFields.includes("owner_explicit_phrase") &&
      requiredFields.includes("approval_timestamp_placeholder") &&
      requiredFields.includes("final_allowed_decision")
  );

  const allowedTypes = Array.isArray(root.allowedApprovalTypes)
    ? (root.allowedApprovalTypes as string[])
    : [];
  ok(
    "fixture allowed approval types are complete",
    allowedTypes.length >= 4 &&
      allowedTypes.includes("CONTROLLED_DRY_RUN_ONLY") &&
      allowedTypes.includes("CONTROLLED_PREFLIGHT_REVIEW_ONLY") &&
      allowedTypes.includes("CONTROLLED_EVIDENCE_CAPTURE_ONLY") &&
      allowedTypes.includes("CONTROLLED_ROLLBACK_REVIEW_ONLY")
  );

  const disallowed = Array.isArray(root.disallowedApprovals)
    ? (root.disallowedApprovals as string[])
    : [];
  ok(
    "fixture disallowed approvals are complete",
    disallowed.length >= 10 &&
      disallowed.includes("production deploy") &&
      disallowed.includes("production activation") &&
      disallowed.includes("public route activation") &&
      disallowed.includes("buyer-facing public release") &&
      disallowed.includes("real lead sending") &&
      disallowed.includes("real customer data / PII") &&
      disallowed.includes("phone/plate/VIN") &&
      disallowed.includes("token/secret/API key exposure") &&
      disallowed.includes("Thor/dealer real import") &&
      disallowed.includes("v16 real dealer/real lead action")
  );

  const runRule = root.oneRunRetrySecondRunRule as Record<string, unknown>;
  ok(
    "fixture one-run retry second-run rule is complete",
    runRule?.futureApprovalMustDeclareRunCount === true &&
      runRule?.defaultOneRunOnly === true &&
      runRule?.defaultRetryAllowed === false &&
      runRule?.defaultSecondRunAllowed === false &&
      runRule?.retrySecondRunNeedsFreshOwnerApproval === true &&
      runRule?.automaticRetryProhibited === true
  );

  const clarity = root.commandTargetClarityRequirement as Record<string, unknown>;
  ok(
    "fixture command target clarity requirement is complete",
    clarity?.manualEndpointGuessProhibited === true &&
      clarity?.exactCommandOrActionRequiredBeforeFutureRun === true &&
      clarity?.exactTargetScopeRequiredBeforeFutureRun === true &&
      clarity?.expectedEvidenceRequiredBeforeFutureRun === true &&
      clarity?.holdIfCommandTargetAmbiguous === true
  );

  const evidenceFields = Array.isArray(root.evidenceRequirementFields)
    ? (root.evidenceRequirementFields as string[])
    : [];
  ok(
    "fixture evidence requirement fields are complete",
    evidenceFields.length >= 17 &&
      evidenceFields.includes("executionAuthorized") &&
      evidenceFields.includes("approvalId") &&
      evidenceFields.includes("runCount") &&
      evidenceFields.includes("commandOrAction") &&
      evidenceFields.includes("targetScope") &&
      evidenceFields.includes("publicReleaseActivated") &&
      evidenceFields.includes("productionActivated") &&
      evidenceFields.includes("realLeadSent") &&
      evidenceFields.includes("providerNetworkUsed") &&
      evidenceFields.includes("runtimeCallUsed") &&
      evidenceFields.includes("fallbackToLegacy") &&
      evidenceFields.includes("skipGemini") &&
      evidenceFields.includes("guardStatus") &&
      evidenceFields.includes("tokenExposure") &&
      evidenceFields.includes("piiExposure") &&
      evidenceFields.includes("rollbackReady") &&
      evidenceFields.includes("finalDecision")
  );

  const boundary = root.boundaryAssertions as Record<string, unknown>;
  ok(
    "fixture boundary assertions are complete",
    Object.keys(boundary ?? {}).length >= 8 &&
      Object.values(boundary ?? {}).every((value) => value === true)
  );

  const rollback = root.rollbackKillSwitchRequirement as Record<string, unknown>;
  ok(
    "fixture rollback kill-switch requirement is complete",
    rollback?.rollbackDisablePathRequiredBeforeFutureExecution === true &&
      rollback?.ownerOperatorResponsibilityRequired === true &&
      rollback?.evidenceCaptureRequired === true &&
      rollback?.holdIfRollbackKillSwitchUnclear === true
  );

  const stops = root.stopConditions as Record<string, unknown>;
  ok(
    "fixture stop conditions are complete",
    Object.keys(stops ?? {}).length >= 8 &&
      Object.values(stops ?? {}).every((value) => value === "stop")
  );

  const thai = root.thaiOwnerFriendlyExplanation as Record<string, unknown>;
  ok(
    "fixture has Thai owner-friendly explanation",
    typeof thai?.whatIsV157 === "string" &&
      typeof thai?.whyTemplateFirst === "string" &&
      typeof thai?.futureApprovalMustSpecify === "string" &&
      typeof thai?.whatIsStillProhibited === "string"
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.8 CONTROLLED PRE-PROD APPROVAL TEMPLATE REVIEW — NO EXECUTION"
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
    "package has test:v15.7 script",
    scripts["test:v15.7"] ===
      "tsx scripts/test-v157-controlled-pre-prod-owner-approval-template.mts"
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
  `\nDone v15.7 controlled pre-prod owner approval template validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
