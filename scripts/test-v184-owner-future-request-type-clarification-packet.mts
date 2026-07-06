/**
 * v18.4 owner future request type clarification packet validator
 * Static checks only. Clarification-only, review-only, no-execution, placeholder-only.
 *
 * npm run test:v18.4
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v18.4-owner-future-request-type-clarification-packet.md";
const FIXTURE_PATH = "docs/examples/v18.4-owner-future-request-type-clarification-packet.synthetic.json";
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
    "this clarification packet does not authorize execution",
    "clarification packet is not approval",
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

console.log("=== v18.4 Owner Future Request Type Clarification Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v18.4 clarification packet correctly",
  /v18\.4 — Owner Future Request Type Clarification Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v18.4\"") &&
    fixtureRaw.includes("\"executionType\": \"owner-future-request-type-clarification-packet only\"")
);

ok(
  "doc/fixture include clarification-only review-only no-approval no-go no-execution placeholder-only",
  hasEveryLine(combined, [
    "CLARIFICATION ONLY",
    "REVIEW ONLY",
    "NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NO APPROVAL",
    "NO GO",
    "NOT REAL-VALUE INSERTION"
  ])
);

ok(
  "baseline confirms v13-v17 and v18.0-v18.3 closures",
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
    "v18.4 is a separate owner future request type clarification packet only"
  ])
);

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV183Section",
  "closedBaselineCarryForwardSection",
  "v184ScopeSection",
  "clarificationOnlyReminderSection",
  "reviewOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "v18IntakeReviewMatrixChecklistSummarySection",
  "clarificationPacketPurposeSection",
  "ownerRequestTypeQuestionSection",
  "requestTypeOptionAReviewOnlyClarificationSection",
  "requestTypeOptionBReviseDocumentationSection",
  "requestTypeOptionCFutureRealValueInsertionDraftSection",
  "requestTypeOptionDFutureExecutionRequestDraftSection",
  "requestTypeOptionEFutureOwnerApprovalPacketDraftSection",
  "requestTypeOptionFHoldAllExecutionSection",
  "requestTypeOptionGNoGoDecisionYetSection",
  "requestTypeComparisonSection",
  "clarificationQuestionsSection",
  "ownerIntentClarificationSection",
  "scopeClarificationSection",
  "riskClarificationSection",
  "evidenceClarificationSection",
  "approvalSeparationClarificationSection",
  "exactCommandSeparationSection",
  "exactTargetSeparationSection",
  "expectedEvidenceSeparationSection",
  "oneRunOnlyRequirementSection",
  "noRetryNoSecondRunRequirementSection",
  "stopConditionsRequirementSection",
  "rollbackRequirementSection",
  "killSwitchRequirementSection",
  "boundaryPrecheckRequirementSection",
  "tokenSecretPiiGuardSection",
  "publicProductionGuardSection",
  "realLeadGuardSection",
  "realDealerGuardSection",
  "runtimeProviderGeminiGuardSection",
  "liveEndpointManualGuessGuardSection",
  "thorDealerImportGuardSection",
  "forbiddenRealValuesGuardSection",
  "noRealValueRequestReminderSection",
  "safeDefaultHoldSection",
  "ownerQuestionChecklistSection",
  "safeNegativeWordingSection",
  "finalOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];
ok("doc includes required section names", hasEveryLine(doc, requiredSections));

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V183_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V184_SCOPE_PLACEHOLDER_ONLY",
  "CLARIFICATION_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "V18_INTAKE_REVIEW_MATRIX_CHECKLIST_SUMMARY_PLACEHOLDER_ONLY",
  "CLARIFICATION_PACKET_PURPOSE_PLACEHOLDER_ONLY",
  "OWNER_REQUEST_TYPE_QUESTION_PLACEHOLDER_ONLY",
  "REQUEST_TYPE_OPTION_A_REVIEW_ONLY_CLARIFICATION_PLACEHOLDER_ONLY",
  "REQUEST_TYPE_OPTION_B_REVISE_DOCUMENTATION_PLACEHOLDER_ONLY",
  "REQUEST_TYPE_OPTION_C_FUTURE_REAL_VALUE_INSERTION_DRAFT_PLACEHOLDER_ONLY",
  "REQUEST_TYPE_OPTION_D_FUTURE_EXECUTION_REQUEST_DRAFT_PLACEHOLDER_ONLY",
  "REQUEST_TYPE_OPTION_E_FUTURE_OWNER_APPROVAL_PACKET_DRAFT_PLACEHOLDER_ONLY",
  "REQUEST_TYPE_OPTION_F_HOLD_ALL_EXECUTION_PLACEHOLDER_ONLY",
  "REQUEST_TYPE_OPTION_G_NO_GO_DECISION_YET_PLACEHOLDER_ONLY",
  "REQUEST_TYPE_COMPARISON_PLACEHOLDER_ONLY",
  "CLARIFICATION_QUESTIONS_PLACEHOLDER_ONLY",
  "OWNER_INTENT_CLARIFICATION_PLACEHOLDER_ONLY",
  "SCOPE_CLARIFICATION_PLACEHOLDER_ONLY",
  "RISK_CLARIFICATION_PLACEHOLDER_ONLY",
  "EVIDENCE_CLARIFICATION_PLACEHOLDER_ONLY",
  "APPROVAL_SEPARATION_CLARIFICATION_PLACEHOLDER_ONLY",
  "EXACT_COMMAND_SEPARATION_PLACEHOLDER_ONLY",
  "EXACT_TARGET_SEPARATION_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_SEPARATION_PLACEHOLDER_ONLY",
  "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY",
  "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY",
  "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY",
  "BOUNDARY_PRECHECK_REQUIREMENT_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY",
  "PUBLIC_PRODUCTION_GUARD_PLACEHOLDER_ONLY",
  "REAL_LEAD_GUARD_PLACEHOLDER_ONLY",
  "REAL_DEALER_GUARD_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY",
  "THOR_DEALER_IMPORT_GUARD_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_REQUEST_REMINDER_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
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
  ok("package has test:v18.4 script", scripts["test:v18.4"] === "tsx scripts/test-v184-owner-future-request-type-clarification-packet.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "clarificationOnly",
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
    "baseline object has v13-v17 and v18.0-v18.3 closed",
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
      baseline["v18.3"] === "FUTURE REQUEST PREREQUISITE CHECKLIST CLOSED"
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
    "v18.4 separation flags true",
    separation.v184SeparatedFromV183 === true &&
      separation.v184SeparatedFromV182 === true &&
      separation.v184SeparatedFromV181 === true &&
      separation.v184SeparatedFromV180 === true &&
      separation.v184SeparatedFromV17 === true &&
      separation.v184DoesNotApproveExecution === true &&
      separation.v184DoesNotApproveRealValueInsertion === true
  );

  ok(
    "request type options exist and are placeholder-only non-authorizing",
    Array.isArray(root.requestTypeOptions) &&
      root.requestTypeOptions.length === 7 &&
      root.requestTypeOptionsPlaceholderOnly === true &&
      root.requestTypeOptions.every((o: unknown) => {
        const option = asRecord(o);
        return (
          typeof option.optionKey === "string" &&
          typeof option.optionName === "string" &&
          option.notApproval === true &&
          option.notExecution === true &&
          option.notGo === true &&
          option.noRealValuesIncluded === true &&
          option.separateFutureRequestRequiredIfContinuing === true &&
          option.freshOwnerApprovalRequiredLaterIfExecutionOrRealValueInsertionEverConsidered === true
        );
      })
  );

  ok(
    "clarification questions exist and no real values request",
    Array.isArray(root.clarificationQuestions) &&
      root.clarificationQuestions.includes("What outcome does owner want to consider next?") &&
      root.clarificationQuestions.includes("Is the next step only document review?") &&
      root.clarificationQuestions.includes("Is the next step only documentation revision?") &&
      root.clarificationQuestions.includes("Is the owner considering future real-value insertion draft only?") &&
      root.clarificationQuestions.includes("Is the owner considering future execution request draft only?") &&
      root.clarificationQuestions.includes("Is the owner considering future approval packet draft only?") &&
      root.clarificationQuestions.includes("Does the owner want to hold all execution?") &&
      root.clarificationQuestions.includes("Is there no GO decision yet?") &&
      root.clarificationQuestions.includes("What evidence would be expected in a future request?") &&
      root.clarificationQuestions.includes("What boundaries must remain locked?") &&
      root.clarificationQuestions.includes("What stop conditions would be required later?") &&
      root.clarificationQuestions.includes("What rollback and kill switch would be required later?") &&
      root.clarificationQuestionsNoRealValuesRequest === true
  );

  const sepReq = asRecord(root.separationRequirements);
  ok(
    "fresh owner approval and exact command/target/evidence separation exist",
    sepReq.approvalSeparationClarification === "APPROVAL_SEPARATION_CLARIFICATION_PLACEHOLDER_ONLY" &&
      sepReq.exactCommandSeparation === "EXACT_COMMAND_SEPARATION_PLACEHOLDER_ONLY" &&
      sepReq.exactTargetSeparation === "EXACT_TARGET_SEPARATION_PLACEHOLDER_ONLY" &&
      sepReq.expectedEvidenceSeparation === "EXPECTED_EVIDENCE_SEPARATION_PLACEHOLDER_ONLY" &&
      sepReq.oneRunOnlyRequirement === "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sepReq.noRetryNoSecondRunRequirement === "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY"
  );

  const srk = asRecord(root.stopRollbackKillSwitchRequirements);
  ok(
    "stop rollback kill switch requirements exist",
    srk.stopConditionsRequirement === "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY" &&
      srk.rollbackRequirement === "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY" &&
      srk.killSwitchRequirement === "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY"
  );

  const boundary = asRecord(root.boundaryAndGuardRequirements);
  ok(
    "boundary and guard requirements exist",
    boundary.boundaryPrecheckRequirement === "BOUNDARY_PRECHECK_REQUIREMENT_PLACEHOLDER_ONLY" &&
      boundary.tokenSecretPiiGuard === "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY" &&
      boundary.publicProductionGuard === "PUBLIC_PRODUCTION_GUARD_PLACEHOLDER_ONLY" &&
      boundary.realLeadGuard === "REAL_LEAD_GUARD_PLACEHOLDER_ONLY" &&
      boundary.realDealerGuard === "REAL_DEALER_GUARD_PLACEHOLDER_ONLY" &&
      boundary.runtimeProviderGeminiGuard === "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY" &&
      boundary.liveEndpointManualGuessGuard === "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY" &&
      boundary.thorDealerImportGuard === "THOR_DEALER_IMPORT_GUARD_PLACEHOLDER_ONLY" &&
      boundary.forbiddenRealValuesGuard === "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY" &&
      boundary.noRealValueRequestReminder === "NO_REAL_VALUE_REQUEST_REMINDER_PLACEHOLDER_ONLY"
  );

  const hold = asRecord(root.safeDefaultHoldNoAction);
  ok(
    "safe default is hold/no action",
    hold.safeDefaultHold === "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY" &&
      hold.isHoldNoAction === true
  );
}

ok(
  "doc contains exact owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v18.4 เป็นเอกสารช่วยลุงเด่นแยกประเภทคำขอในอนาคตเท่านั้น ว่าต้องการทบทวนเอกสาร ทำ draft งานอนาคต หรือพักไว้ก่อน ยังไม่ใช่ GO ยังไม่ใช่ approval และยังไม่ใช่ execution",
    "หลัง v18.4 ถ้าลุงเด่นเลือกจะเดินต่อ ต้องเปิดงานใหม่แยกตามประเภทคำขอที่เลือก โดยยังต้องมี prerequisite ครบ และถ้าเกี่ยวกับการรันจริงต้องมี exact command, exact target, expected evidence, fresh owner approval, one-run only, no-retry และ no-second-run ก่อนเท่านั้น"
  ])
);

ok(
  "doc includes required request type option lines",
  hasEveryLine(doc, [
    "Option A: Review-only clarification request — not approval, not execution, not GO, no real values included, separate future request required if continuing, fresh owner approval required later if execution or real-value insertion is ever considered",
    "Option B: Revise documentation request — not approval, not execution, not GO, no real values included, separate future request required if continuing, fresh owner approval required later if execution or real-value insertion is ever considered",
    "Option C: Future real-value insertion request draft — not approval, not execution, not GO, no real values included, separate future request required if continuing, fresh owner approval required later if execution or real-value insertion is ever considered",
    "Option D: Future execution request draft — not approval, not execution, not GO, no real values included, separate future request required if continuing, fresh owner approval required later if execution or real-value insertion is ever considered",
    "Option E: Future owner approval packet draft — not approval, not execution, not GO, no real values included, separate future request required if continuing, fresh owner approval required later if execution or real-value insertion is ever considered",
    "Option F: Hold all execution — not approval, not execution, not GO, no real values included, separate future request required if continuing, fresh owner approval required later if execution or real-value insertion is ever considered",
    "Option G: No GO decision yet — not approval, not execution, not GO, no real values included, separate future request required if continuing, fresh owner approval required later if execution or real-value insertion is ever considered"
  ])
);

ok(
  "doc includes required clarification question lines",
  hasEveryLine(doc, [
    "What outcome does owner want to consider next?",
    "Is the next step only document review?",
    "Is the next step only documentation revision?",
    "Is the owner considering future real-value insertion draft only?",
    "Is the owner considering future execution request draft only?",
    "Is the owner considering future approval packet draft only?",
    "Does the owner want to hold all execution?",
    "Is there no GO decision yet?",
    "What evidence would be expected in a future request?",
    "What boundaries must remain locked?",
    "What stop conditions would be required later?",
    "What rollback and kill switch would be required later?"
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

console.log(`\nDone v18.4 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
