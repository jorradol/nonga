/**
 * v18.3 future request prerequisite checklist validator
 * Static checks only. Checklist-only, review-only, no-execution, placeholder-only.
 *
 * npm run test:v18.3
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v18.3-future-request-prerequisite-checklist.md";
const FIXTURE_PATH = "docs/examples/v18.3-future-request-prerequisite-checklist.synthetic.json";
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
    "this checklist does not authorize execution",
    "checklist is not approval",
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

console.log("=== v18.3 Future Request Prerequisite Checklist Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v18.3 checklist correctly",
  /v18\.3 — Future Request Prerequisite Checklist/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v18.3\"") &&
    fixtureRaw.includes("\"executionType\": \"future-request-prerequisite-checklist only\"")
);

ok(
  "doc/fixture include checklist-only review-only no-approval no-go no-execution placeholder-only",
  hasEveryLine(combined, [
    "CHECKLIST ONLY",
    "REVIEW ONLY",
    "NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NO APPROVAL",
    "NO GO",
    "NOT REAL-VALUE INSERTION"
  ])
);

ok(
  "baseline confirms v13-v17 closed and v18.0-v18.2 closed carry-forward",
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
    "v18.3 is a separate future request prerequisite checklist only"
  ])
);

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV182Section",
  "closedBaselineCarryForwardSection",
  "v183ScopeSection",
  "checklistOnlyReminderSection",
  "reviewOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "v18IntakeReviewMatrixSummarySection",
  "prerequisiteChecklistPurposeSection",
  "futureRequestPrerequisiteOverviewSection",
  "futureRequestTypePlaceholderSection",
  "ownerIntentPlaceholderRequirementSection",
  "exactCommandPlaceholderRequirementSection",
  "exactTargetPlaceholderRequirementSection",
  "expectedEvidencePlaceholderRequirementSection",
  "freshOwnerApprovalPlaceholderRequirementSection",
  "oneRunOnlyRequirementSection",
  "noRetryNoSecondRunRequirementSection",
  "stopConditionsRequirementSection",
  "rollbackRequirementSection",
  "killSwitchRequirementSection",
  "boundaryPrecheckRequirementSection",
  "tokenSecretPiiPrecheckSection",
  "publicProductionPrecheckSection",
  "realLeadPrecheckSection",
  "realDealerPrecheckSection",
  "runtimeProviderGeminiPrecheckSection",
  "liveEndpointManualGuessPrecheckSection",
  "thorDealerImportPrecheckSection",
  "forbiddenRealValuesPrecheckSection",
  "ownerManualActionSeparationSection",
  "approvalWordingSeparationSection",
  "evidenceCaptureRequirementSection",
  "postRunReviewRequirementSection",
  "expansionNotAllowedReminderSection",
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
  "CURRENT_STATUS_AFTER_V182_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V183_SCOPE_PLACEHOLDER_ONLY",
  "CHECKLIST_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "V18_INTAKE_REVIEW_MATRIX_SUMMARY_PLACEHOLDER_ONLY",
  "PREREQUISITE_CHECKLIST_PURPOSE_PLACEHOLDER_ONLY",
  "FUTURE_REQUEST_PREREQUISITE_OVERVIEW_PLACEHOLDER_ONLY",
  "FUTURE_REQUEST_TYPE_PLACEHOLDER_ONLY",
  "OWNER_INTENT_PLACEHOLDER_REQUIREMENT_ONLY",
  "EXACT_COMMAND_PLACEHOLDER_REQUIREMENT_ONLY",
  "EXACT_TARGET_PLACEHOLDER_REQUIREMENT_ONLY",
  "EXPECTED_EVIDENCE_PLACEHOLDER_REQUIREMENT_ONLY",
  "FRESH_OWNER_APPROVAL_PLACEHOLDER_REQUIREMENT_ONLY",
  "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY",
  "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY",
  "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY",
  "BOUNDARY_PRECHECK_REQUIREMENT_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_PRECHECK_PLACEHOLDER_ONLY",
  "PUBLIC_PRODUCTION_PRECHECK_PLACEHOLDER_ONLY",
  "REAL_LEAD_PRECHECK_PLACEHOLDER_ONLY",
  "REAL_DEALER_PRECHECK_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_PRECHECK_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_PRECHECK_PLACEHOLDER_ONLY",
  "THOR_DEALER_IMPORT_PRECHECK_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_PRECHECK_PLACEHOLDER_ONLY",
  "OWNER_MANUAL_ACTION_SEPARATION_PLACEHOLDER_ONLY",
  "APPROVAL_WORDING_SEPARATION_PLACEHOLDER_ONLY",
  "EVIDENCE_CAPTURE_REQUIREMENT_PLACEHOLDER_ONLY",
  "POST_RUN_REVIEW_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXPANSION_NOT_ALLOWED_REMINDER_PLACEHOLDER_ONLY",
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
  ok("package has test:v18.3 script", scripts["test:v18.3"] === "tsx scripts/test-v183-future-request-prerequisite-checklist.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "checklistOnly",
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
    "baseline object has v13-v17 and v18.0-v18.2 closed",
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
      baseline["v18.2"] === "OWNER FUTURE PATH SELECTION MATRIX CLOSED"
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
    "v18.3 separation flags true",
    separation.v183SeparatedFromV182 === true &&
      separation.v183SeparatedFromV181 === true &&
      separation.v183SeparatedFromV180 === true &&
      separation.v183SeparatedFromV17 === true &&
      separation.v183DoesNotApproveExecution === true &&
      separation.v183DoesNotApproveRealValueInsertion === true
  );

  ok(
    "required checklist items exist and are prerequisite-only non-authorizing",
    Array.isArray(root.requiredChecklistItems) &&
      root.requiredChecklistItems.length === 24 &&
      root.checklistItemsPrerequisiteOnly === true &&
      root.checklistItemsDoNotAuthorizeAction === true &&
      root.requiredChecklistItems.every((i: unknown) => {
        const item = asRecord(i);
        return typeof item.itemName === "string" && item.prerequisiteOnly === true && item.doesNotAuthorizeAction === true;
      })
  );

  const prereq = asRecord(root.futureRequestPrerequisites);
  ok(
    "future request prerequisite separation exists",
    prereq.ownerIntentPlaceholderRequirement === "OWNER_INTENT_PLACEHOLDER_REQUIREMENT_ONLY" &&
      prereq.exactCommandPlaceholderRequirement === "EXACT_COMMAND_PLACEHOLDER_REQUIREMENT_ONLY" &&
      prereq.exactTargetPlaceholderRequirement === "EXACT_TARGET_PLACEHOLDER_REQUIREMENT_ONLY" &&
      prereq.expectedEvidencePlaceholderRequirement === "EXPECTED_EVIDENCE_PLACEHOLDER_REQUIREMENT_ONLY" &&
      prereq.freshOwnerApprovalPlaceholderRequirement === "FRESH_OWNER_APPROVAL_PLACEHOLDER_REQUIREMENT_ONLY" &&
      prereq.oneRunOnlyRequirement === "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY" &&
      prereq.noRetryNoSecondRunRequirement === "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY"
  );

  const srk = asRecord(root.stopRollbackKillSwitchRequirements);
  ok(
    "stop rollback kill switch requirements exist",
    srk.stopConditionsRequirement === "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY" &&
      srk.rollbackRequirement === "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY" &&
      srk.killSwitchRequirement === "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY"
  );

  const precheck = asRecord(root.boundaryPrecheck);
  ok(
    "boundary precheck and guard prechecks exist",
    precheck.boundaryPrecheckRequirement === "BOUNDARY_PRECHECK_REQUIREMENT_PLACEHOLDER_ONLY" &&
      precheck.tokenSecretPiiPrecheck === "TOKEN_SECRET_PII_PRECHECK_PLACEHOLDER_ONLY" &&
      precheck.publicProductionPrecheck === "PUBLIC_PRODUCTION_PRECHECK_PLACEHOLDER_ONLY" &&
      precheck.realLeadPrecheck === "REAL_LEAD_PRECHECK_PLACEHOLDER_ONLY" &&
      precheck.realDealerPrecheck === "REAL_DEALER_PRECHECK_PLACEHOLDER_ONLY" &&
      precheck.runtimeProviderGeminiPrecheck === "RUNTIME_PROVIDER_GEMINI_PRECHECK_PLACEHOLDER_ONLY" &&
      precheck.liveEndpointManualGuessPrecheck === "LIVE_ENDPOINT_MANUAL_GUESS_PRECHECK_PLACEHOLDER_ONLY" &&
      precheck.thorDealerImportPrecheck === "THOR_DEALER_IMPORT_PRECHECK_PLACEHOLDER_ONLY" &&
      precheck.forbiddenRealValuesPrecheck === "FORBIDDEN_REAL_VALUES_PRECHECK_PLACEHOLDER_ONLY"
  );

  const separation2 = asRecord(root.ownerManualActionAndApprovalWordingSeparation);
  ok(
    "owner manual action and approval wording separation exist",
    separation2.ownerManualActionSeparation === "OWNER_MANUAL_ACTION_SEPARATION_PLACEHOLDER_ONLY" &&
      separation2.approvalWordingSeparation === "APPROVAL_WORDING_SEPARATION_PLACEHOLDER_ONLY"
  );

  const ev = asRecord(root.evidenceAndReviewRequirements);
  ok(
    "evidence capture and post-run review requirements exist",
    ev.evidenceCaptureRequirement === "EVIDENCE_CAPTURE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      ev.postRunReviewRequirement === "POST_RUN_REVIEW_REQUIREMENT_PLACEHOLDER_ONLY" &&
      ev.expansionNotAllowedReminder === "EXPANSION_NOT_ALLOWED_REMINDER_PLACEHOLDER_ONLY"
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
    "v18.3 เป็น checklist ให้ลุงเด่นเห็นว่าก่อนจะพิจารณางานอนาคตแบบใส่ค่าจริงหรือรันจริง ต้องมีเงื่อนไขอะไรครบก่อนเท่านั้น ยังไม่ใช่ GO ยังไม่ใช่ approval และยังไม่ใช่ execution",
    "หลัง v18.3 ถ้าจะเดินต่อ ต้องเปิดงานใหม่แยก โดยยังต้องมี owner intent, exact command, exact target, expected evidence, fresh owner approval, one-run only, no-retry, no-second-run, stop conditions, rollback และ kill switch ครบก่อนเท่านั้น"
  ])
);

ok(
  "doc includes required checklist item lines",
  hasEveryLine(doc, [
    "Future request type selected — prerequisite-only and does not authorize action",
    "Owner intent clarified — prerequisite-only and does not authorize action",
    "Exact command defined later — prerequisite-only and does not authorize action",
    "Exact target defined later — prerequisite-only and does not authorize action",
    "Expected evidence defined later — prerequisite-only and does not authorize action",
    "Fresh owner approval required later — prerequisite-only and does not authorize action",
    "One-run only — prerequisite-only and does not authorize action",
    "No retry — prerequisite-only and does not authorize action",
    "No second run — prerequisite-only and does not authorize action",
    "Stop conditions — prerequisite-only and does not authorize action",
    "Rollback plan — prerequisite-only and does not authorize action",
    "Kill switch — prerequisite-only and does not authorize action",
    "Boundary precheck — prerequisite-only and does not authorize action",
    "Token/secret/PII guard — prerequisite-only and does not authorize action",
    "Public/production guard — prerequisite-only and does not authorize action",
    "Real lead guard — prerequisite-only and does not authorize action",
    "Real dealer guard — prerequisite-only and does not authorize action",
    "Runtime/provider/Gemini guard — prerequisite-only and does not authorize action",
    "Live endpoint/manual guess guard — prerequisite-only and does not authorize action",
    "Thor/dealer import guard — prerequisite-only and does not authorize action",
    "Forbidden real values guard — prerequisite-only and does not authorize action",
    "Evidence capture plan — prerequisite-only and does not authorize action",
    "Post-run review plan — prerequisite-only and does not authorize action",
    "No expansion without separate approval — prerequisite-only and does not authorize action"
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

console.log(`\nDone v18.3 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
