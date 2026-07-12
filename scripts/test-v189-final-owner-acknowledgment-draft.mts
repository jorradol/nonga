/**
 * v18.9 final owner acknowledgment draft validator
 * Static checks only. Acknowledgment-draft-only, review-only, no-execution, placeholder-only.
 *
 * npm run test:v18.9
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v18.9-final-owner-acknowledgment-draft.md";
const FIXTURE_PATH = "docs/examples/v18.9-final-owner-acknowledgment-draft.synthetic.json";
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
    "owner acknowledgment only",
    "not approval",
    "not go",
    "not execution",
    "not one-run approval",
    "not deploy approval",
    "not public/production approval",
    "not real lead approval",
    "not real dealer approval",
    "not real-value insertion approval",
    "does not authorize action",
    "acknowledgment-draft-only",
    "review-only",
    "placeholder-only",
    "future-only requirement",
    "separate future request required",
    "must not",
    "is not",
    "does not",
    "no "
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

console.log("=== v18.9 Final Owner Acknowledgment Draft Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v18.9 final owner acknowledgment draft correctly",
  /v18\.9 — Final Owner Acknowledgment Draft/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v18.9\"") &&
    fixtureRaw.includes("\"executionType\": \"final-owner-acknowledgment-draft only\"")
);

ok(
  "doc/fixture include acknowledgment-draft-only review-only no-approval no-go no-execution placeholder-only",
  hasEveryLine(combined, [
    "ACKNOWLEDGMENT DRAFT ONLY",
    "REVIEW ONLY",
    "NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NO APPROVAL",
    "NO GO",
    "NOT REAL-VALUE INSERTION"
  ])
);

ok(
  "baseline confirms v13-v17 and v18.0-v18.8 closures",
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
    "v18.5 OWNER FUTURE REQUEST DRAFT SKELETON CLOSED",
    "v18.6 SKELETON SAFETY REVIEW GATE CLOSED via v18.6A HOLD FIX",
    "v18.7 OWNER REVIEW INDEX CLOSED",
    "v18.8 OWNER REVIEW CLOSURE RECORD CLOSED",
    "v18.9 is a final owner acknowledgment draft only"
  ])
);

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV188Section",
  "closedBaselineCarryForwardSection",
  "v189ScopeSection",
  "acknowledgmentDraftOnlyReminderSection",
  "reviewOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "ownerAcknowledgmentDraftPurposeSection",
  "acknowledgmentOfDocumentClosureOnlySection",
  "acknowledgmentNotApprovalSection",
  "acknowledgmentNotGoSection",
  "acknowledgmentNotExecutionSection",
  "acknowledgmentNotRealValueInsertionSection",
  "acknowledgmentNotOwnerExecutionApprovalSection",
  "acknowledgmentNotOneRunApprovalSection",
  "acknowledgmentNotDeployApprovalSection",
  "acknowledgmentNotPublicProductionApprovalSection",
  "acknowledgmentNotRealLeadApprovalSection",
  "acknowledgmentNotRealDealerApprovalSection",
  "v18ClosedDocumentReferencesSection",
  "v180AcknowledgmentReferenceSection",
  "v181AcknowledgmentReferenceSection",
  "v182AcknowledgmentReferenceSection",
  "v183AcknowledgmentReferenceSection",
  "v184AcknowledgmentReferenceSection",
  "v185AcknowledgmentReferenceSection",
  "v186AcknowledgmentReferenceSection",
  "v186AHoldFixAcknowledgmentReferenceSection",
  "v187AcknowledgmentReferenceSection",
  "v188AcknowledgmentReferenceSection",
  "noFuturePathSelectedSection",
  "ownerDecisionNotIncludedSection",
  "futureSeparateRequestReminderSection",
  "freshOwnerApprovalSeparationSection",
  "exactCommandSeparationSection",
  "exactTargetSeparationSection",
  "expectedEvidenceSeparationSection",
  "oneRunOnlyRequirementSection",
  "noRetryNoSecondRunRequirementSection",
  "stopConditionsRequirementSection",
  "rollbackRequirementSection",
  "killSwitchRequirementSection",
  "tokenSecretPiiGuardSection",
  "publicProductionGuardSection",
  "realLeadGuardSection",
  "realDealerGuardSection",
  "runtimeProviderGeminiGuardSection",
  "liveEndpointManualGuessGuardSection",
  "thorDealerImportGuardSection",
  "forbiddenRealValuesGuardSection",
  "safeDefaultHoldSection",
  "safeNegativeWordingSection",
  "finalOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];
ok("doc includes required section names", hasEveryLine(doc, requiredSections));

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V188_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V189_SCOPE_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_DRAFT_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "OWNER_ACKNOWLEDGMENT_DRAFT_PURPOSE_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_OF_DOCUMENT_CLOSURE_ONLY_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_APPROVAL_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_GO_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_EXECUTION_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_REAL_VALUE_INSERTION_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_OWNER_EXECUTION_APPROVAL_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_ONE_RUN_APPROVAL_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_DEPLOY_APPROVAL_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_PUBLIC_PRODUCTION_APPROVAL_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_REAL_LEAD_APPROVAL_PLACEHOLDER_ONLY",
  "ACKNOWLEDGMENT_NOT_REAL_DEALER_APPROVAL_PLACEHOLDER_ONLY",
  "V18_CLOSED_DOCUMENT_REFERENCES_PLACEHOLDER_ONLY",
  "V180_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "V181_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "V182_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "V183_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "V184_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "V185_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "V186_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "V186A_HOLD_FIX_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "V187_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "V188_ACKNOWLEDGMENT_REFERENCE_PLACEHOLDER_ONLY",
  "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY",
  "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY",
  "FUTURE_SEPARATE_REQUEST_REMINDER_PLACEHOLDER_ONLY",
  "FRESH_OWNER_APPROVAL_SEPARATION_PLACEHOLDER_ONLY",
  "EXACT_COMMAND_SEPARATION_PLACEHOLDER_ONLY",
  "EXACT_TARGET_SEPARATION_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_SEPARATION_PLACEHOLDER_ONLY",
  "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY",
  "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY",
  "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY",
  "PUBLIC_PRODUCTION_GUARD_PLACEHOLDER_ONLY",
  "REAL_LEAD_GUARD_PLACEHOLDER_ONLY",
  "REAL_DEALER_GUARD_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY",
  "THOR_DEALER_IMPORT_GUARD_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "FINAL_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];
ok("doc has required placeholder values", hasEveryLine(doc, requiredPlaceholders));

const requiredAcknowledgmentReferenceLines = [
  "v18.0 Separate future owner request intake closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.1 Owner intake review packet closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.2 Owner future path selection matrix closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.3 Future request prerequisite checklist closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.4 Owner future request type clarification packet closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.5 Owner future request draft skeleton closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.6 Skeleton safety review gate closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.6A HOLD fix wording guard closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.7 Owner review index closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.8 Owner review closure record closed: acknowledgment reference only, document closure only, not approval, not execution, not GO, no real values included, separate future request required if continuing"
];
ok("doc includes required acknowledgment reference lines", hasEveryLine(doc, requiredAcknowledgmentReferenceLines));

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
  ok("package has test:v18.9 script", scripts["test:v18.9"] === "tsx scripts/test-v189-final-owner-acknowledgment-draft.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "acknowledgmentDraftOnly",
    "reviewOnly",
    "documentationOnly",
    "fixtureOnly",
    "validatorOnly",
    "placeholderOnly",
    "notOwnerApproval",
    "notGo",
    "notExecution",
    "notRealValueInsertion",
    "notOwnerExecutionApproval",
    "notOneRunApproval",
    "notDeployApproval",
    "notPublicProductionApproval",
    "notRealLeadApproval",
    "notRealDealerApproval",
    "notUsableForExecution",
    "noRetryApproval",
    "noSecondRunApproval",
    "noRuntimeProviderGeminiCall",
    "noLiveEndpointCall",
    "noManualEndpointGuess",
    "noThorImport",
    "noDealerImport",
    "noTokenSecretExposure",
    "noPII",
    "acknowledgmentReferencesPlaceholderOnly"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline object has v13-v17 and v18.0-v18.8 closed",
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
      baseline["v18.4"] === "OWNER FUTURE REQUEST TYPE CLARIFICATION PACKET CLOSED" &&
      baseline["v18.5"] === "OWNER FUTURE REQUEST DRAFT SKELETON CLOSED" &&
      baseline["v18.6"] === "SKELETON SAFETY REVIEW GATE CLOSED" &&
      baseline["v18.6A"] === "HOLD FIX WORDING GUARD CLOSURE COMPLETED" &&
      baseline["v18.7"] === "OWNER REVIEW INDEX CLOSED" &&
      baseline["v18.8"] === "OWNER REVIEW CLOSURE RECORD CLOSED"
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
    "v18.9 separation flags true",
    separation.v189SeparatedFromV188 === true &&
      separation.v189SeparatedFromV187 === true &&
      separation.v189SeparatedFromV186A === true &&
      separation.v189SeparatedFromV186 === true &&
      separation.v189SeparatedFromV185 === true &&
      separation.v189SeparatedFromV184 === true &&
      separation.v189SeparatedFromV183 === true &&
      separation.v189SeparatedFromV182 === true &&
      separation.v189SeparatedFromV181 === true &&
      separation.v189SeparatedFromV180 === true &&
      separation.v189SeparatedFromV17 === true
  );

  ok(
    "acknowledgment references exist and are placeholder-only non-authorizing",
    Array.isArray(root.acknowledgmentReferences) &&
      root.acknowledgmentReferences.length === 10 &&
      root.acknowledgmentReferences.every((entry: unknown) => {
        const e = asRecord(entry);
        return (
          typeof e.entryName === "string" &&
          e.placeholderOnly === true &&
          e.acknowledgmentReferenceOnly === true &&
          e.documentClosureOnly === true &&
          e.notApproval === true &&
          e.notExecution === true &&
          e.notGo === true &&
          e.noRealValuesIncluded === true &&
          e.separateFutureRequestRequiredIfContinuing === true &&
          e.doesNotAuthorizeAction === true
        );
      })
  );

  const scope = asRecord(root.acknowledgmentScope);
  ok(
    "acknowledgment scope confirms closure-only and no decision/path",
    scope.acknowledgmentOfDocumentClosureOnly === "ACKNOWLEDGMENT_OF_DOCUMENT_CLOSURE_ONLY_PLACEHOLDER_ONLY" &&
      scope.ownerDecisionNotIncluded === "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      scope.noFuturePathSelected === "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY" &&
      scope.isAcknowledgmentOnly === true
  );

  const ack = asRecord(root.acknowledgmentNotApprovalSummary);
  ok(
    "acknowledgment not-approval summary exists",
    ack.acknowledgmentNotApproval === "ACKNOWLEDGMENT_NOT_APPROVAL_PLACEHOLDER_ONLY" &&
      ack.acknowledgmentNotGo === "ACKNOWLEDGMENT_NOT_GO_PLACEHOLDER_ONLY" &&
      ack.acknowledgmentNotExecution === "ACKNOWLEDGMENT_NOT_EXECUTION_PLACEHOLDER_ONLY" &&
      ack.acknowledgmentNotRealValueInsertion === "ACKNOWLEDGMENT_NOT_REAL_VALUE_INSERTION_PLACEHOLDER_ONLY" &&
      ack.acknowledgmentNotOwnerExecutionApproval === "ACKNOWLEDGMENT_NOT_OWNER_EXECUTION_APPROVAL_PLACEHOLDER_ONLY" &&
      ack.acknowledgmentNotOneRunApproval === "ACKNOWLEDGMENT_NOT_ONE_RUN_APPROVAL_PLACEHOLDER_ONLY" &&
      ack.acknowledgmentNotDeployApproval === "ACKNOWLEDGMENT_NOT_DEPLOY_APPROVAL_PLACEHOLDER_ONLY" &&
      ack.acknowledgmentNotPublicProductionApproval === "ACKNOWLEDGMENT_NOT_PUBLIC_PRODUCTION_APPROVAL_PLACEHOLDER_ONLY" &&
      ack.acknowledgmentNotRealLeadApproval === "ACKNOWLEDGMENT_NOT_REAL_LEAD_APPROVAL_PLACEHOLDER_ONLY" &&
      ack.acknowledgmentNotRealDealerApproval === "ACKNOWLEDGMENT_NOT_REAL_DEALER_APPROVAL_PLACEHOLDER_ONLY"
  );

  const req = asRecord(root.futureSeparationRequirements);
  ok(
    "future separation requirements exist",
    req.futureSeparateRequestReminder === "FUTURE_SEPARATE_REQUEST_REMINDER_PLACEHOLDER_ONLY" &&
      req.freshOwnerApprovalSeparation === "FRESH_OWNER_APPROVAL_SEPARATION_PLACEHOLDER_ONLY" &&
      req.exactCommandSeparation === "EXACT_COMMAND_SEPARATION_PLACEHOLDER_ONLY" &&
      req.exactTargetSeparation === "EXACT_TARGET_SEPARATION_PLACEHOLDER_ONLY" &&
      req.expectedEvidenceSeparation === "EXPECTED_EVIDENCE_SEPARATION_PLACEHOLDER_ONLY" &&
      req.oneRunOnlyRequirement === "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.noRetryNoSecondRunRequirement === "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.stopConditionsRequirement === "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.rollbackRequirement === "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.killSwitchRequirement === "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY"
  );

  const guards = asRecord(root.boundaryAndGuardRequirements);
  ok(
    "boundary guards exist",
    guards.tokenSecretPiiGuard === "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY" &&
      guards.publicProductionGuard === "PUBLIC_PRODUCTION_GUARD_PLACEHOLDER_ONLY" &&
      guards.realLeadGuard === "REAL_LEAD_GUARD_PLACEHOLDER_ONLY" &&
      guards.realDealerGuard === "REAL_DEALER_GUARD_PLACEHOLDER_ONLY" &&
      guards.runtimeProviderGeminiGuard === "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY" &&
      guards.liveEndpointManualGuessGuard === "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY" &&
      guards.thorDealerImportGuard === "THOR_DEALER_IMPORT_GUARD_PLACEHOLDER_ONLY" &&
      guards.forbiddenRealValuesGuard === "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY"
  );

  const unsafe = asRecord(root.unsafeAcknowledgmentWordingGuard);
  ok(
    "unsafe acknowledgment wording guard exists",
    unsafe.ownerApprovedExecutionBlocked === true &&
      unsafe.ownerApprovedGoBlocked === true &&
      unsafe.ownerApprovedOneRunBlocked === true &&
      unsafe.ownerApprovedDeployBlocked === true &&
      unsafe.ownerApprovedPublicActivationBlocked === true &&
      unsafe.ownerApprovedProductionActivationBlocked === true &&
      unsafe.ownerApprovedRealLeadBlocked === true &&
      unsafe.ownerApprovedRealDealerBlocked === true &&
      unsafe.ownerApprovedRealValueInsertionBlocked === true &&
      unsafe.approvalGrantedBlocked === true &&
      unsafe.executionApprovedBlocked === true &&
      unsafe.goApprovedBlocked === true
  );

  const hold = asRecord(root.safeDefaultHoldNoAction);
  ok("safe default is hold/no action", hold.safeDefaultHold === "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY" && hold.isHoldNoAction === true);
}

ok(
  "doc contains exact owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v18.9 เป็นร่างบันทึกรับทราบให้ลุงเด่นทบทวนว่าชุดเอกสาร v18.0 ถึง v18.8 ปิดครบแล้วเท่านั้น ยังไม่ใช่ GO ยังไม่ใช่ approval และยังไม่ใช่ execution",
    "การรับทราบใน v18.9 ไม่ใช่การอนุมัติให้รันจริง ไม่ใช่การอนุมัติให้ใส่ค่าจริง และไม่ใช่การเลือกทางเดินต่อ หากจะเดินต่อในอนาคตต้องเปิดงานใหม่แยกพร้อม prerequisite ครบและ fresh owner approval ก่อนเสมอ"
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

const forbiddenUnsafeAckPatterns: Array<[string, RegExp]> = [
  ["owner approved execution", /\bowner\s+approved\s+execution\b/i],
  ["owner approved go", /\bowner\s+approved\s+go\b/i],
  ["owner approved one-run", /\bowner\s+approved\s+one-?run\b/i],
  ["owner approved deploy", /\bowner\s+approved\s+deploy\b/i],
  ["owner approved public activation", /\bowner\s+approved\s+public\s+activation\b/i],
  ["owner approved production activation", /\bowner\s+approved\s+production\s+activation\b/i],
  ["owner approved real lead", /\bowner\s+approved\s+real\s+lead\b/i],
  ["owner approved real dealer", /\bowner\s+approved\s+real\s+dealer\b/i],
  ["owner approved real-value insertion", /\bowner\s+approved\s+real-?value\s+insertion\b/i],
  ["approval granted", /\bapproval\s+granted\b/i],
  ["execution approved", /\bexecution\s+approved\b/i],
  ["go approved", /\bgo\s+approved\b/i]
];
for (const [name, re] of forbiddenUnsafeAckPatterns) {
  ok(`no unsafe acknowledgment wording ${name}`, !hasUnsafeInterpretationPhrase(combined, re, { allowSafeNegativeContext: true }));
}

ok(
  "doc carries required acknowledgment summary reminders",
  hasEveryLine(doc, [
    "acknowledgment of document closure only exists",
    "owner decision is not included",
    "no future path selected",
    "acknowledgment is not approval",
    "acknowledgment is not GO",
    "acknowledgment is not execution",
    "acknowledgment is not one-run approval",
    "acknowledgment is not deploy approval",
    "acknowledgment is not public/production approval",
    "acknowledgment is not real lead approval",
    "acknowledgment is not real dealer approval",
    "safe default is hold/no action"
  ])
);

ok(
  "doc includes final decision wording",
  doc.includes("V18.9 FINAL OWNER ACKNOWLEDGMENT DRAFT CLOSED — READY FOR OWNER REVIEW ONLY / NO EXECUTION")
);

console.log(`\nDone v18.9 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
