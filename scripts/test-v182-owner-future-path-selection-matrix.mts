/**
 * v18.2 owner future path selection matrix validator
 * Static checks only. Matrix-only, review-only, no-execution, placeholder-only.
 *
 * npm run test:v18.2
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v18.2-owner-future-path-selection-matrix.md";
const FIXTURE_PATH = "docs/examples/v18.2-owner-future-path-selection-matrix.synthetic.json";
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

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function isSafeNegativeOrProhibitionContext(line: string): boolean {
  const normalized = line.toLowerCase();
  const safeMarkers = [
    "not approved",
    "does not approve",
    "is not approved",
    "not authorized",
    "does not authorize",
    "execution is not authorized",
    "execution is not allowed",
    "this matrix does not authorize execution",
    "matrix is not approval",
    "has not started",
    "has not been inserted",
    "no real-value insertion",
    "must not",
    "do not include positive wording implying",
    " is not ",
    " no ",
    "does not",
    "cannot",
    "hold"
  ];
  return safeMarkers.some((marker) => normalized.includes(marker));
}

function hasUnsafeInterpretationPhrase(
  source: string,
  pattern: RegExp,
  options?: { allowSafeNegativeContext?: boolean }
): boolean {
  const lines = source.split("\n");
  return lines.some((line) => {
    if (options?.allowSafeNegativeContext && isSafeNegativeOrProhibitionContext(line)) return false;
    return pattern.test(line);
  });
}

console.log("=== v18.2 Owner Future Path Selection Matrix Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v18.2 matrix correctly",
  /v18\.2 — Owner Future Path Selection Matrix/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v18.2\"") &&
    fixtureRaw.includes("\"executionType\": \"owner-future-path-selection-matrix only\"")
);

ok(
  "doc/fixture include matrix-only review-only no-approval no-go no-execution placeholder-only",
  hasEveryLine(combined, [
    "MATRIX ONLY",
    "REVIEW ONLY",
    "NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NO APPROVAL",
    "NO GO",
    "NOT REAL-VALUE INSERTION"
  ])
);

ok(
  "baseline confirms v13-v17 closed and v18.0/v18.1 closed carry-forward",
  hasEveryLine(doc, [
    "v13 = CLOSED",
    "v14 = CLOSED",
    "v15 = CLOSED",
    "v16 = CLOSED / planning-only",
    "v16.11 owner acknowledgment record = CLOSED but not approval",
    "v17.0 = CLOSED",
    "v17.1 = CLOSED",
    "v17.2 = CLOSED",
    "v17.3 = CLOSED",
    "v17.4 = CLOSED",
    "v17.5 = CLOSED",
    "v17.6 = CLOSED",
    "v17.7 = CLOSED",
    "v17.8 = CLOSED",
    "v17.9 = CLOSED",
    "v17.10 = CLOSED",
    "v17.11 = CLOSED",
    "v17.12 = CLOSED",
    "v17 final milestone closure completed",
    "v18.0 SEPARATE OWNER REQUEST INTAKE CLOSED",
    "v18.1 OWNER INTAKE REVIEW PACKET CLOSED",
    "v18.2 is a separate owner future path selection matrix only"
  ])
);

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV181Section",
  "closedBaselineCarryForwardSection",
  "v182ScopeSection",
  "matrixOnlyReminderSection",
  "reviewOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "v18IntakeAndReviewSummarySection",
  "ownerDecisionContextSection",
  "selectionMatrixPurposeSection",
  "futurePathMatrixSection",
  "pathAReviewOnlyClarificationSection",
  "pathBReviseDocumentationSection",
  "pathCFutureRealValueInsertionDraftSection",
  "pathDFutureExecutionRequestDraftSection",
  "pathEFutureOwnerApprovalPacketDraftSection",
  "pathFHoldAllExecutionSection",
  "pathGNoGoDecisionYetSection",
  "pathComparisonCriteriaSection",
  "riskLevelPlaceholderSection",
  "readinessLevelPlaceholderSection",
  "ownerEffortPlaceholderSection",
  "executionDistancePlaceholderSection",
  "revenueDistancePlaceholderSection",
  "safetyBoundaryPlaceholderSection",
  "recommendedSafeDefaultSection",
  "notDecisionReminderSection",
  "futureRequestPrerequisitesSection",
  "freshOwnerApprovalRequiredSection",
  "exactCommandRequiredSection",
  "exactTargetRequiredSection",
  "expectedEvidenceRequiredSection",
  "oneRunOnlyRequiredSection",
  "noRetryNoSecondRunRequiredSection",
  "stopConditionsRequiredSection",
  "rollbackRequiredSection",
  "killSwitchRequiredSection",
  "tokenSecretPiiGuardSection",
  "publicProductionGuardSection",
  "realLeadGuardSection",
  "realDealerGuardSection",
  "runtimeProviderGeminiGuardSection",
  "liveEndpointManualGuessGuardSection",
  "thorDealerImportGuardSection",
  "forbiddenRealValuesGuardSection",
  "ownerQuestionChecklistSection",
  "safeNegativeWordingSection",
  "finalOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];
ok("doc includes required section names", hasEveryLine(doc, requiredSections));

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V181_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V182_SCOPE_PLACEHOLDER_ONLY",
  "MATRIX_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "V18_INTAKE_AND_REVIEW_SUMMARY_PLACEHOLDER_ONLY",
  "OWNER_DECISION_CONTEXT_PLACEHOLDER_ONLY",
  "SELECTION_MATRIX_PURPOSE_PLACEHOLDER_ONLY",
  "FUTURE_PATH_MATRIX_PLACEHOLDER_ONLY",
  "PATH_A_REVIEW_ONLY_CLARIFICATION_PLACEHOLDER_ONLY",
  "PATH_B_REVISE_DOCUMENTATION_PLACEHOLDER_ONLY",
  "PATH_C_FUTURE_REAL_VALUE_INSERTION_DRAFT_PLACEHOLDER_ONLY",
  "PATH_D_FUTURE_EXECUTION_REQUEST_DRAFT_PLACEHOLDER_ONLY",
  "PATH_E_FUTURE_OWNER_APPROVAL_PACKET_DRAFT_PLACEHOLDER_ONLY",
  "PATH_F_HOLD_ALL_EXECUTION_PLACEHOLDER_ONLY",
  "PATH_G_NO_GO_DECISION_YET_PLACEHOLDER_ONLY",
  "PATH_COMPARISON_CRITERIA_PLACEHOLDER_ONLY",
  "RISK_LEVEL_PLACEHOLDER_ONLY",
  "READINESS_LEVEL_PLACEHOLDER_ONLY",
  "OWNER_EFFORT_PLACEHOLDER_ONLY",
  "EXECUTION_DISTANCE_PLACEHOLDER_ONLY",
  "REVENUE_DISTANCE_PLACEHOLDER_ONLY",
  "SAFETY_BOUNDARY_PLACEHOLDER_ONLY",
  "RECOMMENDED_SAFE_DEFAULT_PLACEHOLDER_ONLY",
  "NOT_DECISION_REMINDER_PLACEHOLDER_ONLY",
  "FUTURE_REQUEST_PREREQUISITES_PLACEHOLDER_ONLY",
  "FRESH_OWNER_APPROVAL_REQUIRED_PLACEHOLDER_ONLY",
  "EXACT_COMMAND_REQUIRED_PLACEHOLDER_ONLY",
  "EXACT_TARGET_REQUIRED_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_REQUIRED_PLACEHOLDER_ONLY",
  "ONE_RUN_ONLY_REQUIRED_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_REQUIRED_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_REQUIRED_PLACEHOLDER_ONLY",
  "ROLLBACK_REQUIRED_PLACEHOLDER_ONLY",
  "KILL_SWITCH_REQUIRED_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY",
  "PUBLIC_PRODUCTION_GUARD_PLACEHOLDER_ONLY",
  "REAL_LEAD_GUARD_PLACEHOLDER_ONLY",
  "REAL_DEALER_GUARD_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY",
  "THOR_DEALER_IMPORT_GUARD_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY",
  "OWNER_QUESTION_CHECKLIST_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "FINAL_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];
ok("doc has required placeholder values", hasEveryLine(doc, requiredPlaceholders));

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
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
  ok("package has test:v18.2 script", scripts["test:v18.2"] === "tsx scripts/test-v182-owner-future-path-selection-matrix.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "matrixOnly",
    "reviewOnly",
    "documentationOnly",
    "fixtureOnly",
    "validatorOnly",
    "placeholderOnly",
    "notOwnerApproval",
    "notGo",
    "notExecution",
    "notRealValueInsertion",
    "notRealDealerAction",
    "notRealLeadAction",
    "noOneRunApproval",
    "noRetryApproval",
    "noSecondRunApproval",
    "noDeploy",
    "noPublicActivation",
    "noProductionActivation",
    "noBuyerFacingPublicRelease",
    "noRuntimeProviderGeminiCall",
    "noLiveEndpointCall",
    "noManualEndpointGuess",
    "noThorImport",
    "noDealerImport",
    "noTokenSecretExposure",
    "noPII"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline object has v13-v17 closed and v18.0/v18.1 closed",
    baseline.v13 === "CLOSED" &&
      baseline.v14 === "CLOSED" &&
      baseline.v15 === "CLOSED" &&
      baseline.v16 === "CLOSED / PLANNING-ONLY" &&
      baseline["v16.11"] === "CLOSED / OWNER ACKNOWLEDGMENT RECORD CLOSED BUT NOT APPROVAL" &&
      baseline["v17.0"] === "CLOSED" &&
      baseline["v17.1"] === "CLOSED" &&
      baseline["v17.2"] === "CLOSED" &&
      baseline["v17.3"] === "CLOSED" &&
      baseline["v17.4"] === "CLOSED" &&
      baseline["v17.5"] === "CLOSED" &&
      baseline["v17.6"] === "CLOSED" &&
      baseline["v17.7"] === "CLOSED" &&
      baseline["v17.8"] === "CLOSED" &&
      baseline["v17.9"] === "CLOSED" &&
      baseline["v17.10"] === "CLOSED" &&
      baseline["v17.11"] === "CLOSED" &&
      baseline["v17.12"] === "CLOSED" &&
      baseline.v17FinalMilestoneClosure === "COMPLETED" &&
      baseline["v18.0"] === "SEPARATE OWNER REQUEST INTAKE CLOSED" &&
      baseline["v18.1"] === "OWNER INTAKE REVIEW PACKET CLOSED"
  );

  const sections = asRecord(root.sections);
  ok("required sections map complete", requiredSections.every((k) => typeof sections[k] === "string"));

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => (root.requiredPlaceholderValues as string[]).includes(p))
  );

  const separation = asRecord(root.separationSummary);
  ok(
    "v18.2 separation flags true",
    separation.v182SeparatedFromV181 === true &&
      separation.v182SeparatedFromV180 === true &&
      separation.v182SeparatedFromV17 === true &&
      separation.v182DoesNotApproveExecution === true &&
      separation.v182DoesNotApproveRealValueInsertion === true
  );

  ok(
    "future path matrix rows exist and are placeholder-only",
    Array.isArray(root.futurePathMatrixRows) &&
      root.futurePathMatrixRows.length === 7 &&
      root.futurePathMatrixRowsPlaceholderOnly === true &&
      root.futurePathMatrixRows.every((r: unknown) => {
        const row = asRecord(r);
        return (
          typeof row.pathKey === "string" &&
          typeof row.pathName === "string" &&
          row.notApproval === true &&
          row.notExecution === true &&
          row.notGo === true &&
          row.noRealValuesIncluded === true &&
          row.separateFutureRequestRequiredIfContinuing === true
        );
      })
  );

  ok(
    "comparison criteria exist",
    Array.isArray(root.pathComparisonCriteria) &&
      root.pathComparisonCriteria.includes("owner clarity") &&
      root.pathComparisonCriteria.includes("safety risk") &&
      root.pathComparisonCriteria.includes("readiness level") &&
      root.pathComparisonCriteria.includes("effort required from owner") &&
      root.pathComparisonCriteria.includes("distance from execution") &&
      root.pathComparisonCriteria.includes("distance from revenue pilot") &&
      root.pathComparisonCriteria.includes("required future evidence") &&
      root.pathComparisonCriteria.includes("whether fresh owner approval would be needed later") &&
      root.pathComparisonCriteria.includes("whether exact command/target/evidence would be needed later") &&
      root.pathComparisonCriteria.includes("safest default choice")
  );

  const criteriaFields = asRecord(root.criteriaFieldsPlaceholderOnly);
  ok(
    "criteria fields use placeholder-only values",
    criteriaFields.riskLevel === "RISK_LEVEL_PLACEHOLDER_ONLY" &&
      criteriaFields.readinessLevel === "READINESS_LEVEL_PLACEHOLDER_ONLY" &&
      criteriaFields.ownerEffort === "OWNER_EFFORT_PLACEHOLDER_ONLY" &&
      criteriaFields.executionDistance === "EXECUTION_DISTANCE_PLACEHOLDER_ONLY" &&
      criteriaFields.revenueDistance === "REVENUE_DISTANCE_PLACEHOLDER_ONLY" &&
      criteriaFields.safetyBoundary === "SAFETY_BOUNDARY_PLACEHOLDER_ONLY"
  );

  const safeDefault = asRecord(root.recommendedSafeDefault);
  ok(
    "safe default does not authorize action",
    safeDefault.value === "RECOMMENDED_SAFE_DEFAULT_PLACEHOLDER_ONLY" &&
      safeDefault.notApproval === true &&
      safeDefault.notExecution === true &&
      safeDefault.notGo === true
  );

  const notDecision = asRecord(root.notDecisionReminder);
  ok(
    "not-decision reminder exists",
    notDecision.value === "NOT_DECISION_REMINDER_PLACEHOLDER_ONLY" &&
      notDecision.matrixIsNotDecisionRecord === true
  );

  const preReq = asRecord(root.futureRequestPrerequisites);
  ok(
    "future prerequisite separation present",
    preReq.futureRequestPrerequisitesPlaceholder === "FUTURE_REQUEST_PREREQUISITES_PLACEHOLDER_ONLY" &&
      preReq.freshOwnerApprovalRequired === true &&
      preReq.exactCommandRequired === true &&
      preReq.exactTargetRequired === true &&
      preReq.expectedEvidenceRequired === true &&
      preReq.oneRunOnlyRequired === true &&
      preReq.noRetryRequired === true &&
      preReq.noSecondRunRequired === true
  );

  const srk = asRecord(root.stopRollbackKillSwitchRequirements);
  ok(
    "stop rollback kill switch requirements present",
    srk.stopConditionsRequiredBeforeAnyFutureExecution === true &&
      srk.rollbackRequiredBeforeAnyFutureExecution === true &&
      srk.killSwitchRequiredBeforeAnyFutureExecution === true
  );
}

ok(
  "doc contains exact owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v18.2 เป็นตารางช่วยลุงเด่นเปรียบเทียบทางเลือกอนาคตหลัง v18.1 เท่านั้น ยังไม่ใช่การเลือก GO ยังไม่ใช่การอนุมัติให้ใส่ค่าจริง และยังไม่ใช่การอนุมัติให้รันจริง",
    "ทุกทางเลือกหลัง v18.2 หากจะเดินต่อ ต้องเปิดงานใหม่แยกพร้อม exact command, exact target, expected evidence และต้องมี fresh owner approval ก่อนเท่านั้น โดยยังคุม one-run, no-retry และ no-second-run เหมือนเดิม"
  ])
);

ok(
  "doc includes future path matrix rows with required row guards",
  hasEveryLine(doc, [
    "Path A: Review-only clarification request — not approval, not execution, not GO, no real values included, separate future request required if continuing",
    "Path B: Revise documentation request — not approval, not execution, not GO, no real values included, separate future request required if continuing",
    "Path C: Future real-value insertion request draft — not approval, not execution, not GO, no real values included, separate future request required if continuing",
    "Path D: Future execution request draft — not approval, not execution, not GO, no real values included, separate future request required if continuing",
    "Path E: Future owner approval packet draft — not approval, not execution, not GO, no real values included, separate future request required if continuing",
    "Path F: Hold all execution — not approval, not execution, not GO, no real values included, separate future request required if continuing",
    "Path G: No GO decision yet — not approval, not execution, not GO, no real values included, separate future request required if continuing"
  ])
);

ok(
  "doc includes required comparison criteria lines",
  hasEveryLine(doc, [
    "owner clarity",
    "safety risk",
    "readiness level",
    "effort required from owner",
    "distance from execution",
    "distance from revenue pilot",
    "required future evidence",
    "whether fresh owner approval would be needed later",
    "whether exact command/target/evidence would be needed later",
    "safest default choice"
  ])
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header", /\bAuthorization\s*:\s*[^\s].+/i],
  ["firebase token phrase", /\bfirebase[_\s-]?token\s*[:=]\s*[A-Za-z0-9\-_.]{8,}/i],
  ["generic api key assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenExecutionHintPatterns: Array<[string, RegExp]> = [
  [
    "real shell command",
    /(^|\n)\s*[-*]?\s*`?(npm|pnpm|yarn|node|tsx|curl|wget|Invoke-WebRequest|iwr)\s+[^\n`]+`?/im
  ],
  ["real url", /https?:\/\/[^\s"')]+/i],
  ["real endpoint path", /(^|\s)\/(api|v\d+|auth|dealer|lead|import|runtime)\/[A-Za-z0-9/_-]+/i],
  ["real target origin", /\borigin\/[A-Za-z0-9._/-]+/i]
];
for (const [name, re] of forbiddenExecutionHintPatterns) {
  ok(`no forbidden execution hint ${name}`, !re.test(combined));
}

const forbiddenInterpretationPatterns: Array<
  [string, RegExp, { allowSafeNegativeContext?: boolean }?]
> = [
  [
    "approved wording",
    /\b(?:go\s+is\s+approved|approved\s+for\s+go|run\s+approved|owner\s+approved|is\s+approved|approval\s+granted)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "authorized wording",
    /\b(?:authorized|authorization\s+granted)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "go wording",
    /\b(?:go\s+is\s+approved|approved\s+for\s+go)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "already started wording",
    /\b(?:already\s+started|pilot\s+(?:is\s+)?started|execution\s+(?:is\s+)?started)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "already inserted wording",
    /\b(?:already\s+inserted|real\s+values?\s+(?:are\s+)?inserted)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "execution allowed wording",
    /\b(?:execution\s+allowed|execution\s+permitted|allowed\s+to\s+execute|permitted\s+to\s+execute)\b/i,
    { allowSafeNegativeContext: true }
  ]
];
for (const [name, re, options] of forbiddenInterpretationPatterns) {
  ok(`no unsafe interpretation phrase ${name}`, !hasUnsafeInterpretationPhrase(combined, re, options));
}

console.log(`\nDone v18.2 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
