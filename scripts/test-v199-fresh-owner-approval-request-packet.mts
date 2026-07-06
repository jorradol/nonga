/**
 * v19.9 fresh owner approval request packet validator
 * Static checks only. Approval-request-packet-draft-only, owner-approval-request-draft-only.
 *
 * npm run test:v19.9
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.9-fresh-owner-approval-request-packet.md";
const FIXTURE_PATH = "docs/examples/v19.9-fresh-owner-approval-request-packet.synthetic.json";
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
  "UNSAFE_APPROVAL_PHRASE_EXECUTION_APPROVED",
  "UNSAFE_APPROVAL_PHRASE_GO_APPROVED",
  "UNSAFE_APPROVAL_PHRASE_READY_FOR_EXECUTION",
  "UNSAFE_APPROVAL_PHRASE_READY_FOR_GO",
  "UNSAFE_APPROVAL_PHRASE_PROCEED_TO_REAL_ACTION",
  "UNSAFE_APPROVAL_PHRASE_DEMO_APPROVED",
  "UNSAFE_APPROVAL_PHRASE_RUN_DEMO_NOW",
  "UNSAFE_APPROVAL_PHRASE_COMMAND_APPROVED",
  "UNSAFE_APPROVAL_PHRASE_TARGET_APPROVED",
  "UNSAFE_APPROVAL_PHRASE_EVIDENCE_APPROVED",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVAL_GRANTED",
  "UNSAFE_APPROVAL_PHRASE_FRESH_APPROVAL_GRANTED"
] as const;

function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unsafeTokenToPattern(token: string): RegExp {
  const tokenPrefix = "UNSAFE_APPROVAL_PHRASE_";
  if (!token.startsWith(tokenPrefix)) throw new Error(`invalid unsafe approval token: ${token}`);
  const words = token
    .slice(tokenPrefix.length)
    .split("_")
    .map((part) => part.toLowerCase());
  const patternBody = words
    .map((word, index) => {
      if (index === 0) return `\\b${escapeRegExpLiteral(word)}`;
      const previous = words[index - 1];
      const separator =
        (previous === "one" && word === "run") ||
        (previous === "second" && word === "run") ||
        (previous === "real" && word === "value")
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
    "approval request packet draft only",
    "owner approval request draft only",
    "review only",
    "placeholder only",
    "not selected",
    "not decision",
    "not approval",
    "not go",
    "not execution",
    "no owner approval granted",
    "no owner decision made",
    "safe default is hold/no action",
    "separate fresh owner approval required later",
    "one-run only if future approved",
    "no retry",
    "no second run",
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
  "currentStatusAfterV198Section",
  "closedBaselineCarryForwardSection",
  "v199ScopeSection",
  "approvalRequestPacketDraftOnlyReminderSection",
  "ownerApprovalRequestDraftOnlyReminderSection",
  "reviewOnlyReminderSection",
  "placeholderOnlyReminderSection",
  "noExecutionReminderSection",
  "noGoReminderSection",
  "noRealValueInsertionReminderSection",
  "noOwnerDecisionMadeReminderSection",
  "noOwnerApprovalGrantedReminderSection",
  "v198ExactPacketCarryForwardSection",
  "v197ControlledDemoRequestCarryForwardSection",
  "v196SafetyGateCarryForwardSection",
  "freshApprovalPurposeSection",
  "approvalMustBeFreshSection",
  "approvalMustBeSeparateSection",
  "approvalMustBeExplicitSection",
  "approvalMustMatchExactPacketSection",
  "ownerDecisionNotIncludedSection",
  "ownerApprovalNotGrantedSection",
  "goNotGrantedSection",
  "executionNotAuthorizedSection",
  "controlledOwnerOnlyOneRunFutureBoundarySection",
  "oneRunOnlyRequirementSection",
  "noRetryNoSecondRunRequirementSection",
  "stopConditionsRequirementSection",
  "rollbackRequirementSection",
  "killSwitchRequirementSection",
  "expectedEvidenceRequirementSection",
  "evidenceCaptureBoundarySection",
  "noPublicBoundarySection",
  "noProductionBoundarySection",
  "noRealLeadBoundarySection",
  "noRealDealerActionBoundarySection",
  "noRealCustomerDataBoundarySection",
  "tokenSecretPiiGuardSection",
  "phonePlateVinGuardSection",
  "runtimeProviderGeminiGuardSection",
  "liveEndpointManualGuessGuardSection",
  "noDeployBoundarySection",
  "approvalTextTemplatePlaceholderSection",
  "ownerManualActionPlaceholderSection",
  "approvalPhraseSafetyGuardSection",
  "unsafeApprovalWordingGuardSection",
  "forbiddenRealValuesGuardSection",
  "noDecisionOptionSelectedSection",
  "noRequestTypeSelectedSection",
  "noFuturePathSelectedSection",
  "noPacketFieldSelectedAsActionSection",
  "safeDefaultHoldSection",
  "safeNegativeWordingSection",
  "exactNextOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V198_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V199_SCOPE_PLACEHOLDER_ONLY",
  "APPROVAL_REQUEST_PACKET_DRAFT_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "OWNER_APPROVAL_REQUEST_DRAFT_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "PLACEHOLDER_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_OWNER_DECISION_MADE_REMINDER_PLACEHOLDER_ONLY",
  "NO_OWNER_APPROVAL_GRANTED_REMINDER_PLACEHOLDER_ONLY",
  "V198_EXACT_PACKET_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V197_CONTROLLED_DEMO_REQUEST_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V196_SAFETY_GATE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FRESH_APPROVAL_PURPOSE_PLACEHOLDER_ONLY",
  "APPROVAL_MUST_BE_FRESH_PLACEHOLDER_ONLY",
  "APPROVAL_MUST_BE_SEPARATE_PLACEHOLDER_ONLY",
  "APPROVAL_MUST_BE_EXPLICIT_PLACEHOLDER_ONLY",
  "APPROVAL_MUST_MATCH_EXACT_PACKET_PLACEHOLDER_ONLY",
  "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY",
  "OWNER_APPROVAL_NOT_GRANTED_PLACEHOLDER_ONLY",
  "GO_NOT_GRANTED_PLACEHOLDER_ONLY",
  "EXECUTION_NOT_AUTHORIZED_PLACEHOLDER_ONLY",
  "CONTROLLED_OWNER_ONLY_ONE_RUN_FUTURE_BOUNDARY_PLACEHOLDER_ONLY",
  "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY",
  "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY",
  "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_REQUIREMENT_PLACEHOLDER_ONLY",
  "EVIDENCE_CAPTURE_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_PUBLIC_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_PRODUCTION_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_REAL_LEAD_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_REAL_DEALER_ACTION_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_REAL_CUSTOMER_DATA_BOUNDARY_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY",
  "PHONE_PLATE_VIN_GUARD_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY",
  "NO_DEPLOY_BOUNDARY_PLACEHOLDER_ONLY",
  "APPROVAL_TEXT_TEMPLATE_PLACEHOLDER_ONLY",
  "OWNER_MANUAL_ACTION_PLACEHOLDER_ONLY",
  "APPROVAL_PHRASE_SAFETY_GUARD_PLACEHOLDER_ONLY",
  "UNSAFE_APPROVAL_WORDING_GUARD_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY",
  "NO_DECISION_OPTION_SELECTED_PLACEHOLDER_ONLY",
  "NO_REQUEST_TYPE_SELECTED_PLACEHOLDER_ONLY",
  "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY",
  "NO_PACKET_FIELD_SELECTED_AS_ACTION_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "EXACT_NEXT_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];

const requiredScopeFlags = [
  "APPROVAL REQUEST PACKET DRAFT ONLY",
  "OWNER APPROVAL REQUEST DRAFT ONLY",
  "REVIEW ONLY",
  "DOCUMENTATION ONLY",
  "FIXTURE ONLY",
  "VALIDATOR ONLY",
  "PLACEHOLDER ONLY",
  "NO EXECUTION",
  "NO GO",
  "NO REAL VALUE INSERTION",
  "NO OWNER DECISION MADE",
  "NO OWNER APPROVAL GRANTED",
  "NO FUTURE PATH SELECTED",
  "NO REQUEST TYPE SELECTED",
  "NO DECISION OPTION SELECTED",
  "NO PACKET FIELD SELECTED AS ACTION",
  "CONTROLLED OWNER ONLY ONE RUN FUTURE BOUNDARY ONLY",
  "ONE RUN ONLY REQUIRED IF FUTURE APPROVED",
  "NO RETRY NO SECOND RUN REQUIRED",
  "SAFE DEFAULT HOLD NO ACTION"
];

const packetFields = [
  "FRESH_OWNER_APPROVAL_REQUEST_FIELD_PLACEHOLDER",
  "OWNER_MANUAL_APPROVAL_ACTION_FIELD_PLACEHOLDER",
  "EXACT_PACKET_MATCH_FIELD_PLACEHOLDER",
  "CONTROLLED_OWNER_ONLY_ONE_RUN_FIELD_PLACEHOLDER",
  "ONE_RUN_ONLY_FIELD_PLACEHOLDER",
  "NO_RETRY_NO_SECOND_RUN_FIELD_PLACEHOLDER",
  "STOP_CONDITIONS_FIELD_PLACEHOLDER",
  "ROLLBACK_FIELD_PLACEHOLDER",
  "KILL_SWITCH_FIELD_PLACEHOLDER",
  "EXPECTED_EVIDENCE_FIELD_PLACEHOLDER",
  "SAFE_DEFAULT_HOLD_FIELD_PLACEHOLDER"
] as const;

console.log("=== v19.9 Fresh Owner Approval Request Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.9 approval request packet correctly",
  /v19\.9 - Fresh Owner Approval Request Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v19.9\"") &&
    fixtureRaw.includes("\"executionType\": \"approval-request-packet-draft only\"")
);

ok("required scope flags exist", hasEveryLine(combined, requiredScopeFlags));
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
  ok("package has test:v19.9 script", scripts["test:v19.9"] === "tsx scripts/test-v199-fresh-owner-approval-request-packet.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "approvalRequestPacketDraftOnly",
    "ownerApprovalRequestDraftOnly",
    "reviewOnly",
    "documentationOnly",
    "fixtureOnly",
    "validatorOnly",
    "placeholderOnly",
    "notDecision",
    "notOwnerApproval",
    "notGo",
    "notExecution",
    "notRealValueInsertion",
    "noOwnerDecisionMade",
    "noOwnerApprovalGranted",
    "noFuturePathSelected",
    "noRequestTypeSelected",
    "noDecisionOptionSelected",
    "noPacketFieldSelectedAsAction",
    "controlledOwnerOnlyOneRunFutureBoundaryOnly",
    "oneRunOnlyRequiredIfFutureApproved",
    "noRetryNoSecondRunRequired",
    "safeDefaultHoldNoAction"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline confirms v13-v19.8 carry-forward",
    baseline.v13 === "CLOSED" &&
      baseline.v14 === "CLOSED" &&
      baseline.v15 === "CLOSED" &&
      baseline.v16 === "CLOSED / PLANNING-ONLY" &&
      baseline.v17 === "CLOSED" &&
      baseline["v18.0-v18.11"] === "CLOSED" &&
      baseline["v19.0-v19.5"] === "CLOSED / OWNER FUTURE REQUEST DOCUMENTS ONLY" &&
      baseline["v19.6SafetyGateClosure"] ===
        "OWNER DECISION PACKET SAFETY REVIEW GATE CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION" &&
      baseline["v19.7ControlledDemoRequestClosure"] ===
        "CONTROLLED DEMO REQUEST DRAFT CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION" &&
      baseline["v19.8ExactPacketClosure"] ===
        "EXACT DEMO COMMAND TARGET EVIDENCE PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION"
  );

  const sections = asRecord(root.sections);
  ok("required sections map complete", requiredSections.every((k) => typeof sections[k] === "string"));

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => root.requiredPlaceholderValues.includes(p))
  );

  ok(
    "scope flags array complete",
    Array.isArray(root.scopeFlags) && requiredScopeFlags.every((flag) => root.scopeFlags.includes(flag))
  );

  const fields = asRecord(root.packetFieldPlaceholders);
  ok("packet field placeholders exist", packetFields.every((key) => typeof fields[key] === "object"));
  ok(
    "packet field placeholders stay non-action and non-decision",
    packetFields.every((key) => {
      const item = asRecord(fields[key]);
      return (
        item.placeholderOnly === true &&
        item.draftOnly === true &&
        item.selectedAsAction === false &&
        item.notDecision === true &&
        item.notApproval === true &&
        item.notGo === true &&
        item.notExecution === true &&
        item.noRealValuesIncluded === true &&
        item.noRealValuesRequested === true &&
        item.separateFreshOwnerApprovalRequired === true &&
        item.ownerManualActionRequiredLater === true
      );
    })
  );

  const req = asRecord(root.boundaryRequirements);
  ok(
    "boundary requirements exist",
    req.freshApprovalPurpose === "FRESH_APPROVAL_PURPOSE_PLACEHOLDER_ONLY" &&
      req.approvalMustBeFresh === "APPROVAL_MUST_BE_FRESH_PLACEHOLDER_ONLY" &&
      req.approvalMustBeSeparate === "APPROVAL_MUST_BE_SEPARATE_PLACEHOLDER_ONLY" &&
      req.approvalMustBeExplicit === "APPROVAL_MUST_BE_EXPLICIT_PLACEHOLDER_ONLY" &&
      req.approvalMustMatchExactPacket === "APPROVAL_MUST_MATCH_EXACT_PACKET_PLACEHOLDER_ONLY" &&
      req.ownerDecisionNotIncluded === "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      req.ownerApprovalNotGranted === "OWNER_APPROVAL_NOT_GRANTED_PLACEHOLDER_ONLY" &&
      req.goNotGranted === "GO_NOT_GRANTED_PLACEHOLDER_ONLY" &&
      req.executionNotAuthorized === "EXECUTION_NOT_AUTHORIZED_PLACEHOLDER_ONLY" &&
      req.controlledOwnerOnlyOneRunFutureBoundary === "CONTROLLED_OWNER_ONLY_ONE_RUN_FUTURE_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.oneRunOnlyRequirement === "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.noRetryNoSecondRunRequirement === "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.stopConditionsRequirement === "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.rollbackRequirement === "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.killSwitchRequirement === "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.expectedEvidenceRequirement === "EXPECTED_EVIDENCE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.evidenceCaptureBoundary === "EVIDENCE_CAPTURE_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noPublicBoundary === "NO_PUBLIC_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noProductionBoundary === "NO_PRODUCTION_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noRealLeadBoundary === "NO_REAL_LEAD_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noRealDealerActionBoundary === "NO_REAL_DEALER_ACTION_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noRealCustomerDataBoundary === "NO_REAL_CUSTOMER_DATA_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.tokenSecretPiiGuard === "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY" &&
      req.phonePlateVinGuard === "PHONE_PLATE_VIN_GUARD_PLACEHOLDER_ONLY" &&
      req.runtimeProviderGeminiGuard === "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY" &&
      req.liveEndpointManualGuessGuard === "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY" &&
      req.noDeployBoundary === "NO_DEPLOY_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.approvalTextTemplatePlaceholder === "APPROVAL_TEXT_TEMPLATE_PLACEHOLDER_ONLY" &&
      req.ownerManualActionPlaceholder === "OWNER_MANUAL_ACTION_PLACEHOLDER_ONLY" &&
      req.approvalPhraseSafetyGuard === "APPROVAL_PHRASE_SAFETY_GUARD_PLACEHOLDER_ONLY" &&
      req.unsafeApprovalWordingGuard === "UNSAFE_APPROVAL_WORDING_GUARD_PLACEHOLDER_ONLY" &&
      req.forbiddenRealValuesGuard === "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY" &&
      req.noDecisionOptionSelected === "NO_DECISION_OPTION_SELECTED_PLACEHOLDER_ONLY" &&
      req.noRequestTypeSelected === "NO_REQUEST_TYPE_SELECTED_PLACEHOLDER_ONLY" &&
      req.noFuturePathSelected === "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY" &&
      req.noPacketFieldSelectedAsAction === "NO_PACKET_FIELD_SELECTED_AS_ACTION_PLACEHOLDER_ONLY" &&
      req.safeDefaultHold === "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY" &&
      req.safeNegativeWording === "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY" &&
      req.exactNextOwnerAction === "EXACT_NEXT_OWNER_ACTION_PLACEHOLDER_ONLY" &&
      req.finalBoundaryCarryForward === "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY"
  );

  const unsafe = asRecord(root.unsafeApprovalWordingGuardState);
  ok(
    "unsafe approval wording guard flags true",
    unsafe.ownerApprovedExecutionBlocked === true &&
      unsafe.ownerApprovedGoBlocked === true &&
      unsafe.ownerApprovedOneRunBlocked === true &&
      unsafe.executionApprovedBlocked === true &&
      unsafe.goApprovedBlocked === true &&
      unsafe.readyForExecutionBlocked === true &&
      unsafe.readyForGoBlocked === true &&
      unsafe.proceedToRealActionBlocked === true &&
      unsafe.demoApprovedBlocked === true &&
      unsafe.runDemoNowBlocked === true &&
      unsafe.commandApprovedBlocked === true &&
      unsafe.targetApprovedBlocked === true &&
      unsafe.evidenceApprovedBlocked === true &&
      unsafe.ownerApprovalGrantedBlocked === true &&
      unsafe.freshApprovalGrantedBlocked === true
  );

  const unsafeLabelTokens = Array.isArray(unsafe.unsafeApprovalPhraseLabelTokens)
    ? unsafe.unsafeApprovalPhraseLabelTokens.filter((value): value is string => typeof value === "string")
    : [];
  ok("unsafe approval label tokens complete in fixture", UNSAFE_APPROVAL_LABEL_TOKENS.every((token) => unsafeLabelTokens.includes(token)));

  const forbidden = asRecord(root.forbiddenRealValuesGuardState);
  ok(
    "forbidden real values guard state all false",
    forbidden.containsRealCommand === false &&
      forbidden.containsRunnableCommand === false &&
      forbidden.containsUrl === false &&
      forbidden.containsEndpointPath === false &&
      forbidden.containsTargetOrigin === false &&
      forbidden.containsToken === false &&
      forbidden.containsSecret === false &&
      forbidden.containsApiKey === false &&
      forbidden.containsFirebaseToken === false &&
      forbidden.containsAuthorizationHeader === false &&
      forbidden.containsPii === false &&
      forbidden.containsPhone === false &&
      forbidden.containsPlate === false &&
      forbidden.containsVin === false &&
      forbidden.containsRealCustomerData === false &&
      forbidden.containsRealDealerImportValue === false
  );
}

ok(
  "doc includes owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v19.9 เป็นร่างซองขอ fresh owner approval เท่านั้น เพื่อให้ลุงเด่น review ก่อนตัดสินใจจริง ยังไม่ใช่ approval ยังไม่ใช่ GO ยังไม่ใช่ execution และยังไม่แตะของจริง",
    "ถ้าจะทดลองจริงหลัง v19.9 ต้องให้ลุงเด่นอนุมัติแยกแบบสด ชัดเจน และตรงกับซอง exact packet ก่อนเท่านั้น จากนั้นจึงทำ controlled owner-only one-run ได้ครั้งเดียว ไม่มี retry และไม่มี second-run"
  ])
);

ok(
  "v19.9 separation and carry-forward phrasing exists",
  hasEveryLine(doc, [
    "v19.8 EXACT DEMO COMMAND TARGET EVIDENCE PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION",
    "v19.7 CONTROLLED DEMO REQUEST DRAFT CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION",
    "v19.6 OWNER DECISION PACKET SAFETY REVIEW GATE CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION",
    "v19.9 is separated from v19.8/v19.7/v19.6/v19.5/v19.4/v19.3/v19.2/v19.1/v19.0/v18/v17"
  ])
);

ok(
  "doc contains required negative reminders",
  hasEveryLine(doc, [
    "approval request packet draft only",
    "owner approval request draft only",
    "review only",
    "placeholder only",
    "not selected",
    "not decision",
    "not approval",
    "not GO",
    "not execution",
    "no owner approval granted",
    "no owner decision made",
    "safe default is hold/no action",
    "separate fresh owner approval required later",
    "one-run only if future approved",
    "no retry",
    "no second run"
  ])
);

ok(
  "doc includes unsafe approval label tokens only",
  hasEveryLine(doc, UNSAFE_APPROVAL_LABEL_TOKENS.map((token) => `\`${token}\``))
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
  ok(
    `no unsafe approval wording for ${token}`,
    !hasUnsafeInterpretationPhrase(combined, pattern, { allowSafeNegativeContext: true })
  );
}

ok(
  "final decision wording exists",
  doc.includes("V19.9 FRESH OWNER APPROVAL REQUEST PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION") &&
    fixtureRaw.includes("\"finalDecision\": \"V19.9 FRESH OWNER APPROVAL REQUEST PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION\"")
);

console.log(`\nDone v19.9 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
