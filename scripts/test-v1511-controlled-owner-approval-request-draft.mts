/**
 * v15.11 controlled owner approval request draft validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.11
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.11-controlled-owner-approval-request-draft.md";
const FIXTURE_PATH =
  "docs/examples/v15.11-controlled-owner-approval-request-draft.synthetic.json";
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

console.log("=== v15.11 Controlled Owner Approval Request Draft Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states owner approval request draft",
  /v15\.11 — Controlled Owner Approval Request Draft/.test(doc)
);

ok(
  "doc confirms draft-only no execution scope",
  hasEveryLine(doc, [
    "owner-approval-request-draft only",
    "draft-only",
    "not owner approval",
    "not execution",
    "not dry-run",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc confirms baseline through v15.10",
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
    "`v15.7` owner approval template exists and passed",
    "`v15.8` approval template review exists and passed",
    "`v15.9` final pre-execution packet exists and passed",
    "`v15.10` pre-execution packet review exists and passed",
  ])
);

ok(
  "doc includes draft status",
  hasEveryLine(doc, [
    "v15.11 is draft-only",
    "not real owner approval",
    "not execution",
    "not dry-run",
    "no one-run approval",
    "no deploy approval",
    "no public/production/real lead approval",
    "v16 not started",
  ])
);

ok(
  "doc includes draft purpose",
  hasEveryLine(doc, [
    "prepare future owner approval request wording only",
    "show scope/command/target/evidence/boundary/rollback",
    "not a run command",
    "not a real authorization phrase",
    "not deploy/public/real lead approval",
  ])
);

ok(
  "doc includes required request fields",
  hasEveryLine(doc, [
    "`request_id`",
    "`requested_action_type`",
    "`requested_scope`",
    "`exact_command_or_action_placeholder`",
    "`exact_target_placeholder`",
    "`expected_run_count`",
    "`one_run_only`",
    "`retry_allowed`",
    "`second_run_allowed`",
    "`expected_evidence`",
    "`boundary_assertions`",
    "`rollback_plan`",
    "`stop_conditions`",
    "`token_secret_pii_handling`",
    "`owner_explicit_approval_phrase_placeholder`",
    "`approval_not_granted_statement`",
    "`final_allowed_decision`",
  ])
);

ok(
  "doc includes safe requested action types",
  hasEveryLine(doc, [
    "REQUEST_CONTROLLED_DRY_RUN_ONLY",
    "REQUEST_CONTROLLED_PREFLIGHT_ONLY",
    "REQUEST_CONTROLLED_EVIDENCE_CAPTURE_ONLY",
    "REQUEST_CONTROLLED_ROLLBACK_REVIEW_ONLY",
  ])
);

ok(
  "doc includes approval phrase placeholder safety",
  hasEveryLine(doc, [
    "placeholder only",
    "FINAL EXECUTION AUTHORIZE ...",
    "example-only placeholder",
    "approval is not granted",
    "must not be treated as real approval",
  ])
);

ok(
  "doc includes one-run retry second-run model",
  hasEveryLine(doc, [
    "expected_run_count` is 1",
    "one_run_only = true",
    "retry_allowed = false",
    "second_run_allowed = false",
    "retry/second-run needs fresh owner approval",
    "automatic retry is prohibited",
  ])
);

ok(
  "doc includes command target clarity",
  hasEveryLine(doc, [
    "manual endpoint guess is prohibited",
    "exact command/action required",
    "exact target/scope required",
    "expected evidence required",
    "decision must be HOLD",
  ])
);

ok(
  "doc includes boundary assertions",
  hasEveryLine(doc, [
    "no public release",
    "no production activation",
    "no production deploy",
    "no public route activation",
    "no buyer-facing public release",
    "no real lead",
    "no real PII/customer data",
    "no phone/plate/VIN",
    "no token/secret/API key exposure",
    "no uncontrolled Gemini/provider/runtime call",
    "no Thor/dealer real import",
    "no v16 real action",
  ])
);

ok(
  "doc includes evidence requirement draft",
  hasEveryLine(doc, [
    "`executionAuthorized`",
    "`requestId`",
    "`approvalId`",
    "`runCount`",
    "`commandOrAction`",
    "`targetScope`",
    "`providerNetworkUsed`",
    "`runtimeCallUsed`",
    "`publicReleaseActivated`",
    "`productionActivated`",
    "`realLeadSent`",
    "`tokenExposure`",
    "`piiExposure`",
    "`rollbackReady`",
    "`finalDecision`",
    "does not generate runtime evidence",
  ])
);

ok(
  "doc includes rollback kill-switch section",
  hasEveryLine(doc, [
    "rollback/disable path required",
    "owner/operator responsibility",
    "evidence capture",
    "requires HOLD",
  ])
);

ok(
  "doc includes stop conditions",
  hasEveryLine(doc, [
    "HOLD if command/target ambiguity",
    "HOLD if owner approval is missing",
    "HOLD if one-run/retry/second-run boundary is crossed",
    "HOLD if token/secret/PII risk",
    "HOLD if public/production activation risk",
    "HOLD if real lead risk",
    "HOLD if uncontrolled runtime/provider/Gemini risk",
    "HOLD if Thor/dealer import risk",
    "HOLD if v16 boundary is crossed",
    "HOLD if rollback/kill-switch is missing",
  ])
);

ok(
  "doc includes safe next-step options",
  hasEveryLine(doc, [
    "OPTION A — Review approval request draft only",
    "OPTION B — Revise approval request draft only",
    "OPTION C — Prepare approval request review packet only",
    "OPTION D — Hold before any execution",
  ])
);

ok(
  "doc includes Thai owner-friendly explanation",
  hasEveryLine(doc, [
    "v15.11 คือร่างคำขออนุมัติ ยังไม่ใช่คำอนุมัติจริง",
    "ต้องร่างให้ครบก่อน",
    "owner จะอนุมัติจริงในอนาคต",
    "ยังไม่เปิด public/production/real lead",
    "v16 ยังไม่เริ่ม",
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
  ok("fixture version is v15.11", root.version === "v15.11");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "6c8e3137ee6023760c3db3fee6a49b74e12a90d4"
  );

  ok(
    "fixture source references are correct",
    root.sourceV13Proof === "docs/v13.16-owner-only-gemini-runtime-proof-closure.md" &&
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
        "docs/v15.6-controlled-pre-prod-dry-run-packet-review.md" &&
      root.sourceV157OwnerApprovalTemplate ===
        "docs/v15.7-controlled-pre-prod-owner-approval-template.md" &&
      root.sourceV158ApprovalTemplateReview ===
        "docs/v15.8-controlled-pre-prod-approval-template-review.md" &&
      root.sourceV159FinalPreExecutionPacket ===
        "docs/v15.9-controlled-pre-prod-final-pre-execution-packet.md" &&
      root.sourceV1510PreExecutionPacketReview ===
        "docs/v15.10-controlled-pre-execution-packet-review.md"
  );

  ok(
    "fixture draft boundaries are true",
    root.draftOnly === true &&
      root.noExecution === true &&
      root.noDryRun === true &&
      root.noOneRunApproval === true &&
      root.noDeployApproval === true &&
      root.noPublicProductionRealLeadApproval === true &&
      root.v16NotStarted === true &&
      root.runtimeEvidenceGeneratedInV1511 === false &&
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

  const purpose = root.draftPurpose as Record<string, unknown>;
  ok(
    "fixture draft purpose is complete",
    Object.keys(purpose ?? {}).length >= 5 &&
      Object.values(purpose ?? {}).every((value) => value === true)
  );

  const fields = Array.isArray(root.requiredRequestFields)
    ? (root.requiredRequestFields as string[])
    : [];
  ok(
    "fixture required request fields are complete",
    fields.length >= 17 &&
      fields.includes("request_id") &&
      fields.includes("requested_action_type") &&
      fields.includes("requested_scope") &&
      fields.includes("exact_command_or_action_placeholder") &&
      fields.includes("exact_target_placeholder") &&
      fields.includes("expected_run_count") &&
      fields.includes("one_run_only") &&
      fields.includes("retry_allowed") &&
      fields.includes("second_run_allowed") &&
      fields.includes("expected_evidence") &&
      fields.includes("boundary_assertions") &&
      fields.includes("rollback_plan") &&
      fields.includes("stop_conditions") &&
      fields.includes("token_secret_pii_handling") &&
      fields.includes("owner_explicit_approval_phrase_placeholder") &&
      fields.includes("approval_not_granted_statement") &&
      fields.includes("final_allowed_decision")
  );

  const actionTypes = Array.isArray(root.safeRequestedActionTypes)
    ? (root.safeRequestedActionTypes as string[])
    : [];
  ok(
    "fixture safe requested action types are complete",
    actionTypes.length >= 4 &&
      actionTypes.includes("REQUEST_CONTROLLED_DRY_RUN_ONLY") &&
      actionTypes.includes("REQUEST_CONTROLLED_PREFLIGHT_ONLY") &&
      actionTypes.includes("REQUEST_CONTROLLED_EVIDENCE_CAPTURE_ONLY") &&
      actionTypes.includes("REQUEST_CONTROLLED_ROLLBACK_REVIEW_ONLY")
  );

  const placeholder = root.approvalPhrasePlaceholderSafety as Record<string, unknown>;
  ok(
    "fixture approval phrase placeholder safety is complete",
    Object.keys(placeholder ?? {}).length >= 5 &&
      Object.values(placeholder ?? {}).every((value) => value === true)
  );

  const model = root.oneRunRetrySecondRunModel as Record<string, unknown>;
  ok(
    "fixture one-run retry second-run model is complete",
    model?.defaultExpectedRunCount === 1 &&
      model?.oneRunOnly === true &&
      model?.retryAllowed === false &&
      model?.secondRunAllowed === false &&
      model?.retrySecondRunNeedsFreshOwnerApproval === true &&
      model?.automaticRetryProhibited === true
  );

  const clarity = root.commandTargetClarity as Record<string, unknown>;
  ok(
    "fixture command target clarity is complete",
    Object.keys(clarity ?? {}).length >= 5 &&
      Object.values(clarity ?? {}).every((value) => value === true)
  );

  const assertions = root.boundaryAssertions as Record<string, unknown>;
  ok(
    "fixture boundary assertions are complete",
    Object.keys(assertions ?? {}).length >= 12 &&
      Object.values(assertions ?? {}).every((value) => value === true)
  );

  const evidence = Array.isArray(root.evidenceRequirementDraftFields)
    ? (root.evidenceRequirementDraftFields as string[])
    : [];
  ok(
    "fixture evidence requirement draft fields are complete",
    evidence.length >= 15 &&
      evidence.includes("executionAuthorized") &&
      evidence.includes("requestId") &&
      evidence.includes("approvalId") &&
      evidence.includes("runCount") &&
      evidence.includes("commandOrAction") &&
      evidence.includes("targetScope") &&
      evidence.includes("providerNetworkUsed") &&
      evidence.includes("runtimeCallUsed") &&
      evidence.includes("publicReleaseActivated") &&
      evidence.includes("productionActivated") &&
      evidence.includes("realLeadSent") &&
      evidence.includes("tokenExposure") &&
      evidence.includes("piiExposure") &&
      evidence.includes("rollbackReady") &&
      evidence.includes("finalDecision")
  );

  const rollback = root.rollbackKillSwitch as Record<string, unknown>;
  ok(
    "fixture rollback kill-switch is complete",
    Object.keys(rollback ?? {}).length >= 4 &&
      Object.values(rollback ?? {}).every((value) => value === true)
  );

  const stops = root.stopConditions as Record<string, unknown>;
  ok(
    "fixture stop conditions are complete and HOLD",
    Object.keys(stops ?? {}).length >= 10 &&
      Object.values(stops ?? {}).every((value) => value === "HOLD")
  );

  const options = Array.isArray(root.safeNextStepOptions)
    ? (root.safeNextStepOptions as string[])
    : [];
  ok(
    "fixture safe next-step options include A-D",
    options.length >= 4 &&
      options.some((v) => v.includes("OPTION A")) &&
      options.some((v) => v.includes("OPTION B")) &&
      options.some((v) => v.includes("OPTION C")) &&
      options.some((v) => v.includes("OPTION D"))
  );

  const thai = root.thaiOwnerFriendlyExplanation as Record<string, unknown>;
  ok(
    "fixture has Thai owner-friendly explanation",
    typeof thai?.whatIsV1511 === "string" &&
      typeof thai?.whyDraftFirst === "string" &&
      typeof thai?.whatOwnerMustReviewForFutureApproval === "string" &&
      typeof thai?.whyNoPublicProductionRealLeadNow === "string" &&
      typeof thai?.v16NotStarted === "string"
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.12 CONTROLLED OWNER APPROVAL REQUEST REVIEW — NO EXECUTION"
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
    "package has test:v15.11 script",
    scripts["test:v15.11"] ===
      "tsx scripts/test-v1511-controlled-owner-approval-request-draft.mts"
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
  `\nDone v15.11 controlled owner approval request draft validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
