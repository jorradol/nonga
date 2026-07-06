/**
 * v18.5 owner future request draft skeleton validator
 * Static checks only. Skeleton-only, draft-only, review-only, no-execution, placeholder-only.
 *
 * npm run test:v18.5
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v18.5-owner-future-request-draft-skeleton.md";
const FIXTURE_PATH = "docs/examples/v18.5-owner-future-request-draft-skeleton.synthetic.json";
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
    "this draft skeleton does not authorize execution",
    "draft skeleton is not approval",
    "has not started",
    "has not been inserted",
    "no real-value insertion",
    "must not",
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

console.log("=== v18.5 Owner Future Request Draft Skeleton Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v18.5 draft skeleton correctly",
  /v18\.5 — Owner Future Request Draft Skeleton/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v18.5\"") &&
    fixtureRaw.includes("\"executionType\": \"owner-future-request-draft-skeleton only\"")
);

ok(
  "doc/fixture include skeleton-only draft-only review-only no-approval no-go no-execution placeholder-only",
  hasEveryLine(combined, [
    "SKELETON ONLY",
    "DRAFT ONLY",
    "REVIEW ONLY",
    "NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NO APPROVAL",
    "NO GO",
    "NOT REAL-VALUE INSERTION"
  ])
);

ok(
  "baseline confirms v13-v17 and v18.0-v18.4 closures",
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
    "v18.2 OWNER FUTURE PATH SELECTION MATRIX CLOSED",
    "v18.3 FUTURE REQUEST PREREQUISITE CHECKLIST CLOSED",
    "v18.4 OWNER FUTURE REQUEST TYPE CLARIFICATION PACKET CLOSED",
    "v18.5 is a separate owner future request draft skeleton only"
  ])
);

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV184Section",
  "closedBaselineCarryForwardSection",
  "v185ScopeSection",
  "skeletonOnlyReminderSection",
  "draftOnlyReminderSection",
  "reviewOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "v18IntakeReviewMatrixChecklistClarificationSummarySection",
  "skeletonPurposeSection",
  "futureRequestHeaderPlaceholderSection",
  "futureRequestTypePlaceholderSection",
  "ownerIntentPlaceholderSection",
  "scopePlaceholderSection",
  "exactCommandPlaceholderSection",
  "exactTargetPlaceholderSection",
  "expectedEvidencePlaceholderSection",
  "freshOwnerApprovalPlaceholderSection",
  "oneRunOnlyRequirementSection",
  "noRetryNoSecondRunRequirementSection",
  "stopConditionsPlaceholderSection",
  "rollbackPlaceholderSection",
  "killSwitchPlaceholderSection",
  "boundaryPrecheckPlaceholderSection",
  "tokenSecretPiiGuardSection",
  "publicProductionGuardSection",
  "realLeadGuardSection",
  "realDealerGuardSection",
  "runtimeProviderGeminiGuardSection",
  "liveEndpointManualGuessGuardSection",
  "thorDealerImportGuardSection",
  "forbiddenRealValuesGuardSection",
  "ownerManualActionSeparationSection",
  "approvalWordingSeparationSection",
  "evidenceCapturePlaceholderSection",
  "postRunReviewPlaceholderSection",
  "expansionNotAllowedReminderSection",
  "noRealValueRequestReminderSection",
  "safeDefaultHoldSection",
  "skeletonNotUsableForExecutionSection",
  "ownerQuestionChecklistSection",
  "safeNegativeWordingSection",
  "finalOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];
ok("doc includes required section names", hasEveryLine(doc, requiredSections));

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V184_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V185_SCOPE_PLACEHOLDER_ONLY",
  "SKELETON_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "DRAFT_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "V18_INTAKE_REVIEW_MATRIX_CHECKLIST_CLARIFICATION_SUMMARY_PLACEHOLDER_ONLY",
  "SKELETON_PURPOSE_PLACEHOLDER_ONLY",
  "FUTURE_REQUEST_HEADER_PLACEHOLDER_ONLY",
  "FUTURE_REQUEST_TYPE_PLACEHOLDER_ONLY",
  "OWNER_INTENT_PLACEHOLDER_ONLY",
  "SCOPE_PLACEHOLDER_ONLY",
  "EXACT_COMMAND_PLACEHOLDER_ONLY",
  "EXACT_TARGET_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_PLACEHOLDER_ONLY",
  "FRESH_OWNER_APPROVAL_PLACEHOLDER_ONLY",
  "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_PLACEHOLDER_ONLY",
  "ROLLBACK_PLACEHOLDER_ONLY",
  "KILL_SWITCH_PLACEHOLDER_ONLY",
  "BOUNDARY_PRECHECK_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY",
  "PUBLIC_PRODUCTION_GUARD_PLACEHOLDER_ONLY",
  "REAL_LEAD_GUARD_PLACEHOLDER_ONLY",
  "REAL_DEALER_GUARD_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY",
  "THOR_DEALER_IMPORT_GUARD_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY",
  "OWNER_MANUAL_ACTION_SEPARATION_PLACEHOLDER_ONLY",
  "APPROVAL_WORDING_SEPARATION_PLACEHOLDER_ONLY",
  "EVIDENCE_CAPTURE_PLACEHOLDER_ONLY",
  "POST_RUN_REVIEW_PLACEHOLDER_ONLY",
  "EXPANSION_NOT_ALLOWED_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_REQUEST_REMINDER_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SKELETON_NOT_USABLE_FOR_EXECUTION_PLACEHOLDER_ONLY",
  "OWNER_QUESTION_CHECKLIST_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "FINAL_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];
ok("doc has required placeholder values", hasEveryLine(doc, requiredPlaceholders));

const requiredSkeletonFieldLines = [
  "Future request title: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Future request type: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Owner intent: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Scope: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Exact command placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Exact target placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Expected evidence placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Fresh owner approval placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "One-run only requirement: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "No retry requirement: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "No second-run requirement: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Stop conditions placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Rollback placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Kill switch placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Boundary precheck placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Evidence capture placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "Post-run review placeholder: placeholder-only, not real value, not approval, not execution, not GO, separate future request required",
  "No expansion without separate approval: placeholder-only, not real value, not approval, not execution, not GO, separate future request required"
];
ok("doc includes required skeleton field lines", hasEveryLine(doc, requiredSkeletonFieldLines));

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
  ok("package has test:v18.5 script", scripts["test:v18.5"] === "tsx scripts/test-v185-owner-future-request-draft-skeleton.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "skeletonOnly",
    "draftOnly",
    "reviewOnly",
    "documentationOnly",
    "fixtureOnly",
    "validatorOnly",
    "placeholderOnly",
    "notOwnerApproval",
    "notGo",
    "notExecution",
    "notRealValueInsertion",
    "notUsableForExecution",
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
    "noPII",
    "noRealLeadAction",
    "noRealDealerAction",
    "skeletonFieldsPlaceholderOnly",
    "skeletonDoesNotAskForRealValues"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline object has v13-v17 and v18.0-v18.4 closed",
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
      baseline["v18.1"] === "OWNER INTAKE REVIEW PACKET CLOSED" &&
      baseline["v18.2"] === "OWNER FUTURE PATH SELECTION MATRIX CLOSED" &&
      baseline["v18.3"] === "FUTURE REQUEST PREREQUISITE CHECKLIST CLOSED" &&
      baseline["v18.4"] === "OWNER FUTURE REQUEST TYPE CLARIFICATION PACKET CLOSED"
  );

  const sections = asRecord(root.sections);
  ok("required sections map complete", requiredSections.every((k) => typeof sections[k] === "string"));

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => root.requiredPlaceholderValues.includes(p))
  );

  const separation = asRecord(root.separationSummary);
  ok(
    "v18.5 separation flags true",
    separation.v185SeparatedFromV184 === true &&
      separation.v185SeparatedFromV183 === true &&
      separation.v185SeparatedFromV182 === true &&
      separation.v185SeparatedFromV181 === true &&
      separation.v185SeparatedFromV180 === true &&
      separation.v185SeparatedFromV17 === true &&
      separation.v185DoesNotApproveExecution === true &&
      separation.v185DoesNotApproveGo === true &&
      separation.v185DoesNotApproveRealValueInsertion === true
  );

  ok(
    "skeleton fields exist and are placeholder-only non-authorizing",
    Array.isArray(root.skeletonFields) &&
      root.skeletonFields.length === 18 &&
      root.skeletonFields.every((f: unknown) => {
        const field = asRecord(f);
        return (
          typeof field.fieldName === "string" &&
          typeof field.placeholderValue === "string" &&
          field.placeholderOnly === true &&
          field.notRealValue === true &&
          field.notApproval === true &&
          field.notExecution === true &&
          field.notGo === true &&
          field.separateFutureRequestRequired === true
        );
      })
  );

  const freshApproval = asRecord(root.freshOwnerApprovalSeparation);
  ok(
    "fresh owner approval separation exists",
    freshApproval.freshOwnerApprovalPlaceholder === "FRESH_OWNER_APPROVAL_PLACEHOLDER_ONLY" &&
      freshApproval.separateFutureRequestRequired === true
  );

  const cmdTargetEvidence = asRecord(root.exactCommandTargetEvidenceSeparation);
  ok(
    "exact command target evidence separation exists",
    cmdTargetEvidence.exactCommandPlaceholder === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      cmdTargetEvidence.exactTargetPlaceholder === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      cmdTargetEvidence.expectedEvidencePlaceholder === "EXPECTED_EVIDENCE_PLACEHOLDER_ONLY" &&
      cmdTargetEvidence.separatedAndNonAuthorizing === true
  );

  const policy = asRecord(root.oneRunNoRetryNoSecondRunPolicy);
  ok(
    "one-run no-retry no-second-run policy exists",
    policy.oneRunOnlyRequirement === "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY" &&
      policy.noRetryNoSecondRunRequirement === "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY" &&
      policy.policyPresent === true
  );

  const srk = asRecord(root.stopRollbackKillSwitchRequirements);
  ok(
    "stop rollback kill switch requirements exist",
    srk.stopConditionsPlaceholder === "STOP_CONDITIONS_PLACEHOLDER_ONLY" &&
      srk.rollbackPlaceholder === "ROLLBACK_PLACEHOLDER_ONLY" &&
      srk.killSwitchPlaceholder === "KILL_SWITCH_PLACEHOLDER_ONLY"
  );

  const guards = asRecord(root.boundaryAndGuardRequirements);
  ok(
    "boundary and guards exist",
    guards.boundaryPrecheckPlaceholder === "BOUNDARY_PRECHECK_PLACEHOLDER_ONLY" &&
      guards.tokenSecretPiiGuard === "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY" &&
      guards.publicProductionGuard === "PUBLIC_PRODUCTION_GUARD_PLACEHOLDER_ONLY" &&
      guards.realLeadGuard === "REAL_LEAD_GUARD_PLACEHOLDER_ONLY" &&
      guards.realDealerGuard === "REAL_DEALER_GUARD_PLACEHOLDER_ONLY" &&
      guards.runtimeProviderGeminiGuard === "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY" &&
      guards.liveEndpointManualGuessGuard === "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY" &&
      guards.thorDealerImportGuard === "THOR_DEALER_IMPORT_GUARD_PLACEHOLDER_ONLY" &&
      guards.forbiddenRealValuesGuard === "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY" &&
      guards.noRealValueRequestReminder === "NO_REAL_VALUE_REQUEST_REMINDER_PLACEHOLDER_ONLY" &&
      guards.evidenceCapturePlaceholder === "EVIDENCE_CAPTURE_PLACEHOLDER_ONLY" &&
      guards.postRunReviewPlaceholder === "POST_RUN_REVIEW_PLACEHOLDER_ONLY" &&
      guards.expansionNotAllowedReminder === "EXPANSION_NOT_ALLOWED_REMINDER_PLACEHOLDER_ONLY"
  );

  const hold = asRecord(root.safeDefaultHoldNoAction);
  ok("safe default is hold/no action", hold.safeDefaultHold === "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY" && hold.isHoldNoAction === true);
}

ok(
  "doc contains exact owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v18.5 เป็นเพียงโครงร่าง draft คำขออนาคตให้ลุงเด่นเห็นว่าถ้าจะไปต่อ ต้องกรอกหัวข้ออะไรบ้างเท่านั้น ยังไม่ใช่คำขอจริง ยังไม่ใช่ GO ยังไม่ใช่ approval และยังไม่ใช่ execution",
    "โครงร่าง v18.5 ห้ามใช้แทนคำสั่งรันจริง ห้ามใช้แทน approval และห้ามใส่ค่าจริง หากจะใช้งานจริงในอนาคตต้องเปิดงานใหม่แยกพร้อม prerequisite ครบและ fresh owner approval ก่อนเท่านั้น"
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

ok(
  "doc carries required reminders",
  hasEveryLine(doc, [
    "v18.5 is not approval",
    "v18.5 is not GO",
    "v18.5 is not execution",
    "v18.5 is not real-value insertion",
    "v18.5 is not usable for execution",
    "safe default is hold/no action"
  ])
);

ok(
  "doc includes final decision wording",
  doc.includes("V18.5 OWNER FUTURE REQUEST DRAFT SKELETON CLOSED — READY FOR OWNER REVIEW ONLY / NO EXECUTION")
);

console.log(`\nDone v18.5 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
