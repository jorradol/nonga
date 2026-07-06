/**
 * v19.5 owner future decision packet draft validator
 * Static checks only. Decision-packet-draft-only, future-owner-decision-draft-only, review-only.
 *
 * npm run test:v19.5
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.5-owner-future-decision-packet-draft.md";
const FIXTURE_PATH = "docs/examples/v19.5-owner-future-decision-packet-draft.synthetic.json";
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

const UNSAFE_APPROVAL_LABEL_TOKENS = [
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVED_EXECUTION",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVED_GO",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVED_ONE_RUN",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVED_DEPLOY",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVED_PUBLIC_ACTIVATION",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVED_PRODUCTION_ACTIVATION",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVED_REAL_LEAD",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVED_REAL_DEALER",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVED_REAL_VALUE_INSERTION",
  "UNSAFE_APPROVAL_PHRASE_APPROVAL_GRANTED",
  "UNSAFE_APPROVAL_PHRASE_EXECUTION_APPROVED",
  "UNSAFE_APPROVAL_PHRASE_GO_APPROVED",
  "UNSAFE_APPROVAL_PHRASE_READY_FOR_EXECUTION",
  "UNSAFE_APPROVAL_PHRASE_READY_FOR_GO",
  "UNSAFE_APPROVAL_PHRASE_PROCEED_TO_REAL_ACTION"
] as const;

function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unsafeTokenToPattern(token: string): RegExp {
  const tokenPrefix = "UNSAFE_APPROVAL_PHRASE_";
  if (!token.startsWith(tokenPrefix)) {
    throw new Error(`invalid unsafe approval token: ${token}`);
  }
  const words = token
    .slice(tokenPrefix.length)
    .split("_")
    .map((part) => part.toLowerCase());
  const patternBody = words
    .map((word, index) => {
      if (index === 0) return `\\b${escapeRegExpLiteral(word)}`;
      const previous = words[index - 1];
      const separator =
        (previous === "one" && word === "run") || (previous === "real" && word === "value")
          ? "[-\\s]+"
          : "\\s+";
      return `${separator}${escapeRegExpLiteral(word)}`;
    })
    .join("");
  return new RegExp(`${patternBody}\\b`, "i");
}

function isSafeNegativeOrProhibitionContext(line: string): boolean {
  const normalized = line.toLowerCase();
  const safeMarkers = [
    "decision packet draft only",
    "future owner decision draft only",
    "review only",
    "placeholder only",
    "not selected",
    "not decision",
    "not approval",
    "not go",
    "not execution",
    "not one-run approval",
    "not deploy approval",
    "not public/production approval",
    "not real lead approval",
    "not real dealer approval",
    "not real-value insertion approval",
    "safe default is hold/no action",
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
  return source.split("\n").some((line) => {
    if (options?.allowSafeNegativeContext && isSafeNegativeOrProhibitionContext(line)) return false;
    return pattern.test(line);
  });
}

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV194Section",
  "closedBaselineCarryForwardSection",
  "v195ScopeSection",
  "decisionPacketDraftOnlyReminderSection",
  "futureOwnerDecisionDraftOnlyReminderSection",
  "reviewOnlyReminderSection",
  "placeholderOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "noOwnerDecisionMadeReminderSection",
  "v190IntakeCarryForwardSection",
  "v191ReviewPacketCarryForwardSection",
  "v192PrerequisiteChecklistCarryForwardSection",
  "v193ClarificationPacketCarryForwardSection",
  "v194MatrixCarryForwardSection",
  "v19DecisionPacketDraftPurposeSection",
  "futureDecisionDraftStructureSection",
  "futureDecisionDraftNotDecisionSection",
  "ownerDecisionNotIncludedSection",
  "ownerApprovalNotIncludedSection",
  "noFuturePathSelectedSection",
  "noRequestTypeSelectedSection",
  "reviewOnlyDecisionOptionSection",
  "executionRequestDraftDecisionOptionSection",
  "realValueInsertionDraftDecisionOptionSection",
  "ownerApprovalPacketDecisionOptionSection",
  "controlledOneRunPrepDecisionOptionSection",
  "prerequisiteChecklistCarryForwardSection",
  "prerequisiteValuesNotProvidedSection",
  "exactCommandSeparationSection",
  "exactTargetSeparationSection",
  "expectedEvidenceSeparationSection",
  "freshOwnerApprovalSeparationSection",
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
  "unsafeApprovalWordingGuardSection",
  "safeDefaultHoldSection",
  "safeNegativeWordingSection",
  "exactNextOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V194_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V195_SCOPE_PLACEHOLDER_ONLY",
  "DECISION_PACKET_DRAFT_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "FUTURE_OWNER_DECISION_DRAFT_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "PLACEHOLDER_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_OWNER_DECISION_MADE_REMINDER_PLACEHOLDER_ONLY",
  "V190_INTAKE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V191_REVIEW_PACKET_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V192_PREREQUISITE_CHECKLIST_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V193_CLARIFICATION_PACKET_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V194_MATRIX_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V19_DECISION_PACKET_DRAFT_PURPOSE_PLACEHOLDER_ONLY",
  "FUTURE_DECISION_DRAFT_STRUCTURE_PLACEHOLDER_ONLY",
  "FUTURE_DECISION_DRAFT_NOT_DECISION_PLACEHOLDER_ONLY",
  "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY",
  "OWNER_APPROVAL_NOT_INCLUDED_PLACEHOLDER_ONLY",
  "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY",
  "NO_REQUEST_TYPE_SELECTED_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_DECISION_OPTION_PLACEHOLDER_ONLY",
  "EXECUTION_REQUEST_DRAFT_DECISION_OPTION_PLACEHOLDER_ONLY",
  "REAL_VALUE_INSERTION_DRAFT_DECISION_OPTION_PLACEHOLDER_ONLY",
  "OWNER_APPROVAL_PACKET_DECISION_OPTION_PLACEHOLDER_ONLY",
  "CONTROLLED_ONE_RUN_PREP_DECISION_OPTION_PLACEHOLDER_ONLY",
  "PREREQUISITE_CHECKLIST_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "PREREQUISITE_VALUES_NOT_PROVIDED_PLACEHOLDER_ONLY",
  "EXACT_COMMAND_SEPARATION_PLACEHOLDER_ONLY",
  "EXACT_TARGET_SEPARATION_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_SEPARATION_PLACEHOLDER_ONLY",
  "FRESH_OWNER_APPROVAL_SEPARATION_PLACEHOLDER_ONLY",
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
  "UNSAFE_APPROVAL_WORDING_GUARD_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "EXACT_NEXT_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];

const decisionOptions = [
  "FUTURE_DECISION_OPTION_REVIEW_ONLY_PLACEHOLDER",
  "FUTURE_DECISION_OPTION_EXECUTION_REQUEST_DRAFT_PLACEHOLDER",
  "FUTURE_DECISION_OPTION_REAL_VALUE_INSERTION_DRAFT_PLACEHOLDER",
  "FUTURE_DECISION_OPTION_OWNER_APPROVAL_PACKET_PLACEHOLDER",
  "FUTURE_DECISION_OPTION_CONTROLLED_ONE_RUN_PREP_PLACEHOLDER"
] as const;

console.log("=== v19.5 Owner Future Decision Packet Draft Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.5 owner future decision packet draft correctly",
  /v19\.5 - Owner Future Decision Packet Draft/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v19.5\"") &&
    fixtureRaw.includes("\"executionType\": \"owner-future-decision-packet-draft only\"")
);

ok(
  "v19.5 scope status flags appear",
  hasEveryLine(combined, [
    "DECISION PACKET DRAFT ONLY",
    "FUTURE OWNER DECISION DRAFT ONLY",
    "REVIEW ONLY",
    "PLACEHOLDER ONLY",
    "NO EXECUTION",
    "NO APPROVAL",
    "NO GO",
    "NOT REAL-VALUE INSERTION",
    "NO FUTURE PATH SELECTED",
    "NO REQUEST TYPE SELECTED",
    "NO OWNER DECISION MADE",
    "OWNER DECISION NOT INCLUDED",
    "OWNER APPROVAL NOT INCLUDED"
  ])
);

ok("doc includes required section names", hasEveryLine(doc, requiredSections));
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
  ok("package has test:v19.5 script", scripts["test:v19.5"] === "tsx scripts/test-v195-owner-future-decision-packet-draft.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "decisionPacketDraftOnly",
    "futureOwnerDecisionDraftOnly",
    "reviewOnly",
    "placeholderOnly",
    "documentationOnly",
    "fixtureOnly",
    "validatorOnly",
    "notDecision",
    "notOwnerApproval",
    "notGo",
    "notExecution",
    "notRealValueInsertion",
    "noFuturePathSelected",
    "noRequestTypeSelected",
    "noOwnerDecisionMade",
    "ownerDecisionNotIncluded",
    "ownerApprovalNotIncluded"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline confirms v13-v19.4 carry-forward",
    baseline.v13 === "CLOSED" &&
      baseline.v14 === "CLOSED" &&
      baseline.v15 === "CLOSED" &&
      baseline.v16 === "CLOSED / PLANNING-ONLY" &&
      baseline["v16.11"] === "OWNER ACKNOWLEDGMENT RECORD CLOSED BUT NOT APPROVAL" &&
      baseline["v17.0-v17.12"] === "CLOSED" &&
      baseline["v18.0-v18.11"] === "CLOSED" &&
      baseline["v18.11FinalClosure"] ===
        "FINAL V18 MILESTONE CLOSURE CLOSED - READY FOR FUTURE SEPARATE OWNER REQUEST ONLY / NO EXECUTION" &&
      baseline["v19.0IntakeClosure"] ===
        "FUTURE SEPARATE OWNER REQUEST INTAKE CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION" &&
      baseline["v19.1ReviewPacketClosure"] ===
        "OWNER FUTURE REQUEST REVIEW PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION" &&
      baseline["v19.2PrerequisiteChecklistClosure"] ===
        "FUTURE REQUEST PREREQUISITE CHECKLIST CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION" &&
      baseline["v19.3ClarificationPacketClosure"] ===
        "OWNER FUTURE REQUEST TYPE CLARIFICATION PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION" &&
      baseline["v19.4PathMatrixClosure"] ===
        "OWNER FUTURE PATH SELECTION MATRIX CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION"
  );

  const sections = asRecord(root.sections);
  ok("required sections map complete", requiredSections.every((k) => typeof sections[k] === "string"));

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => root.requiredPlaceholderValues.includes(p))
  );

  const options = asRecord(root.futureDecisionOptionPlaceholders);
  ok("future decision option placeholders exist", decisionOptions.every((key) => typeof options[key] === "object"));
  ok(
    "no decision option selected and placeholders only",
    decisionOptions.every((key) => {
      const item = asRecord(options[key]);
      return (
        item.placeholderDecisionOptionOnly === true &&
        item.draftReviewOnly === true &&
        item.selected === false &&
        item.notDecision === true &&
        item.notApproval === true &&
        item.notExecution === true &&
        item.notGo === true &&
        item.noRealValuesIncluded === true &&
        item.noRealValuesRequested === true &&
        item.separateOwnerDecisionRequiredIfContinuing === true
      );
    })
  );

  const req = asRecord(root.decisionDraftSeparationRequirements);
  ok(
    "decision draft separation requirements exist",
    req.ownerDecisionNotIncluded === "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      req.ownerApprovalNotIncluded === "OWNER_APPROVAL_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      req.noFuturePathSelected === "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY" &&
      req.noRequestTypeSelected === "NO_REQUEST_TYPE_SELECTED_PLACEHOLDER_ONLY" &&
      req.prerequisiteChecklistCarryForward === "PREREQUISITE_CHECKLIST_CARRY_FORWARD_PLACEHOLDER_ONLY" &&
      req.prerequisiteValuesNotProvided === "PREREQUISITE_VALUES_NOT_PROVIDED_PLACEHOLDER_ONLY" &&
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
      guards.forbiddenRealValuesGuard === "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY" &&
      guards.unsafeApprovalWordingGuard === "UNSAFE_APPROVAL_WORDING_GUARD_PLACEHOLDER_ONLY"
  );

  const unsafe = asRecord(root.unsafeApprovalWordingGuardState);
  ok(
    "unsafe approval wording guard flags true",
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
      unsafe.goApprovedBlocked === true &&
      unsafe.readyForExecutionBlocked === true &&
      unsafe.readyForGoBlocked === true &&
      unsafe.proceedToRealActionBlocked === true
  );

  const unsafeLabelTokens = Array.isArray(unsafe.unsafeApprovalPhraseLabelTokens)
    ? unsafe.unsafeApprovalPhraseLabelTokens.filter((value): value is string => typeof value === "string")
    : [];
  ok("unsafe approval label tokens complete in fixture", UNSAFE_APPROVAL_LABEL_TOKENS.every((token) => unsafeLabelTokens.includes(token)));

  const hold = asRecord(root.safeDefaultHoldNoAction);
  ok("safe default is hold/no action", hold.safeDefaultHold === "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY" && hold.isHoldNoAction === true);
}

ok(
  "doc contains exact owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v19.5 เป็นร่าง packet สำหรับการตัดสินใจในอนาคตเท่านั้น ใช้ให้ลุงเด่นเห็นรูปแบบว่าถ้าจะตัดสินใจภายหลังต้องมีข้อมูลอะไรบ้าง แต่ยังไม่ตัดสินใจ ยังไม่เลือกทางเดิน ยังไม่ใช่ GO ยังไม่ใช่ approval และยังไม่ใช่ execution",
    "v19.5 ยังไม่ใส่ค่าจริง ยังไม่ขอค่าจริง และยังไม่แตะของจริง หากจะตัดสินใจจริงในขั้นถัดไป ต้องเปิดงานใหม่แยกพร้อม prerequisite, exact command, exact target, expected evidence และ fresh owner approval ก่อนเสมอ"
  ])
);

ok(
  "doc includes unsafe approval label tokens only",
  hasEveryLine(doc, UNSAFE_APPROVAL_LABEL_TOKENS.map((token) => `\`${token}\``)) && !doc.includes("block unsafe wording:")
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
  ["real shell command", /(^|\n)\s*[-*]?\s*`?(npm|pnpm|yarn|node|tsx|curl|wget|Invoke-WebRequest|iwr)\s+[^\n`]+`?/im],
  ["real url", /https?:\/\/[^\s"')]+/i],
  ["real endpoint path", /(^|\s)\/(api|v\d+|auth|dealer|lead|import|runtime)\/[A-Za-z0-9/_-]+/i],
  ["real target origin", /\borigin\/[A-Za-z0-9._/-]+/i]
];
for (const [name, re] of forbiddenExecutionHintPatterns) {
  ok(`no forbidden execution hint ${name}`, !re.test(combined));
}

for (const token of UNSAFE_APPROVAL_LABEL_TOKENS) {
  const pattern = unsafeTokenToPattern(token);
  ok(`no unsafe approval wording for ${token}`, !hasUnsafeInterpretationPhrase(combined, pattern, { allowSafeNegativeContext: true }));
}

ok(
  "doc carries required negative reminders",
  hasEveryLine(doc, [
    "decision packet draft only",
    "future owner decision draft only",
    "review only",
    "placeholder only",
    "owner decision is not included",
    "owner approval is not included",
    "no future path selected",
    "no decision option is selected",
    "no request type is selected",
    "safe default is hold/no action",
    "v19.5 is not decision",
    "v19.5 is not approval",
    "v19.5 is not GO",
    "v19.5 is not execution",
    "v19.5 is not real-value insertion",
    "v19.5 is separated from v19.4/v19.3/v19.2/v19.1/v19.0/v18.11/v18.10A/v18.10/v18.9/v18.8/v18.7/v18.6A/v18.6/v18.5/v18.4/v18.3/v18.2/v18.1/v18.0/v17"
  ])
);

ok(
  "final decision wording exists",
  doc.includes("V19.5 OWNER FUTURE DECISION PACKET DRAFT CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION") &&
    fixtureRaw.includes("\"finalDecision\": \"V19.5 OWNER FUTURE DECISION PACKET DRAFT CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION\"")
);

console.log(`\nDone v19.5 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
