/**
 * v19.13 lock re-arm decision request packet validator
 * Static checks only. Lock-decision-request-only.
 *
 * npm run test:v19.13
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.13-lock-rearm-decision-request-packet.md";
const FIXTURE_PATH = "docs/examples/v19.13-lock-rearm-decision-request-packet.synthetic.json";
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

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV1912Section",
  "closedBaselineCarryForwardSection",
  "v1913ScopeSection",
  "lockDecisionRequestOnlyReminderSection",
  "lockRearmReviewOnlyReminderSection",
  "boundaryChangingDecisionRequestOnlyReminderSection",
  "noExecutionReminderSection",
  "noOneRunReminderSection",
  "noRetryReminderSection",
  "noSecondRunReminderSection",
  "noLockResetReminderSection",
  "noLockDeletionReminderSection",
  "noLockMutationReminderSection",
  "noLockRearmReminderSection",
  "v1912CarryForwardSection",
  "currentHoldReasonSection",
  "consumedLockBlocksPriorApprovalSection",
  "priorApprovalDoesNotCoverLockResetSection",
  "lockRearmMeaningSection",
  "boundaryChangingDecisionRequiredSection",
  "ownerDecisionOptionsSection",
  "optionStopAtHoldSection",
  "optionPrepareFutureLockRearmApprovalPacketSection",
  "optionFutureBoundaryChangingApprovalSection",
  "lockRearmNotApprovedSection",
  "lockMutationNotApprovedSection",
  "futureRearmConditionsSection",
  "futureOneRunConditionsSection",
  "noPublicBoundarySection",
  "noProductionBoundarySection",
  "noRealLeadBoundarySection",
  "noRealDealerActionBoundarySection",
  "noRealCustomerDataBoundarySection",
  "tokenSecretCredentialPiiGuardSection",
  "phonePlateVinGuardSection",
  "runtimeProviderGeminiGuardSection",
  "liveEndpointManualGuessGuardSection",
  "noDeployBoundarySection",
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
  "CURRENT_STATUS_AFTER_V1912_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V1913_SCOPE_PLACEHOLDER_ONLY",
  "LOCK_DECISION_REQUEST_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "LOCK_REARM_REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "BOUNDARY_CHANGING_DECISION_REQUEST_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_ONE_RUN_REMINDER_PLACEHOLDER_ONLY",
  "NO_RETRY_REMINDER_PLACEHOLDER_ONLY",
  "NO_SECOND_RUN_REMINDER_PLACEHOLDER_ONLY",
  "NO_LOCK_RESET_REMINDER_PLACEHOLDER_ONLY",
  "NO_LOCK_DELETION_REMINDER_PLACEHOLDER_ONLY",
  "NO_LOCK_MUTATION_REMINDER_PLACEHOLDER_ONLY",
  "NO_LOCK_REARM_REMINDER_PLACEHOLDER_ONLY",
  "V1912_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "CURRENT_HOLD_REASON_PLACEHOLDER_ONLY",
  "CONSUMED_LOCK_BLOCKS_PRIOR_APPROVAL_PLACEHOLDER_ONLY",
  "PRIOR_APPROVAL_DOES_NOT_COVER_LOCK_RESET_PLACEHOLDER_ONLY",
  "LOCK_REARM_MEANING_PLACEHOLDER_ONLY",
  "BOUNDARY_CHANGING_DECISION_REQUIRED_PLACEHOLDER_ONLY",
  "OWNER_DECISION_OPTIONS_PLACEHOLDER_ONLY",
  "OPTION_STOP_AT_HOLD_PLACEHOLDER_ONLY",
  "OPTION_PREPARE_FUTURE_LOCK_REARM_APPROVAL_PACKET_PLACEHOLDER_ONLY",
  "OPTION_FUTURE_BOUNDARY_CHANGING_APPROVAL_PLACEHOLDER_ONLY",
  "LOCK_REARM_NOT_APPROVED_PLACEHOLDER_ONLY",
  "LOCK_MUTATION_NOT_APPROVED_PLACEHOLDER_ONLY",
  "FUTURE_REARM_CONDITIONS_PLACEHOLDER_ONLY",
  "FUTURE_ONE_RUN_CONDITIONS_PLACEHOLDER_ONLY",
  "NO_PUBLIC_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_PRODUCTION_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_REAL_LEAD_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_REAL_DEALER_ACTION_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_REAL_CUSTOMER_DATA_BOUNDARY_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_CREDENTIAL_PII_GUARD_PLACEHOLDER_ONLY",
  "PHONE_PLATE_VIN_GUARD_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY",
  "NO_DEPLOY_BOUNDARY_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY",
  "UNSAFE_APPROVAL_WORDING_GUARD_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "EXACT_NEXT_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];

const requiredScopeFlags = [
  "LOCK DECISION REQUEST ONLY",
  "LOCK REARM REVIEW ONLY",
  "BOUNDARY CHANGING DECISION REQUEST ONLY",
  "NO EXECUTION",
  "NO ONE RUN",
  "NO RETRY",
  "NO SECOND RUN",
  "NO LOCK RESET",
  "NO LOCK DELETION",
  "NO LOCK MUTATION",
  "NO LOCK REARM",
  "PRIOR APPROVAL DOES NOT COVER LOCK RESET",
  "LOCK REARM NOT APPROVED",
  "LOCK MUTATION NOT APPROVED",
  "SAFE DEFAULT HOLD NO ACTION"
];

console.log("=== v19.13 Lock Re-Arm Decision Request Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.13 lock re-arm decision request packet",
  /v19\.13 - Lock Re-Arm Decision Request Packet/i.test(doc) &&
    fixtureRaw.includes("\"version\": \"v19.13\"") &&
    fixtureRaw.includes("\"executionType\": \"lock-decision-request-only\"")
);

ok("doc includes required sections", hasEveryLine(doc, requiredSections));
ok("doc has required placeholders", hasEveryLine(doc, requiredPlaceholders));
ok("required scope flags exist", hasEveryLine(combined, requiredScopeFlags));

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

const scripts =
  packageParsed && typeof packageParsed === "object"
    ? ((packageParsed as { scripts?: Record<string, string> }).scripts ?? {})
    : {};
ok(
  "package has test:v19.13 script",
  scripts["test:v19.13"] === "tsx scripts/test-v1913-lock-rearm-decision-request-packet.mts"
);

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "lockDecisionRequestOnly",
    "lockRearmReviewOnly",
    "boundaryChangingDecisionRequestOnly",
    "noExecution",
    "noOneRun",
    "noRetry",
    "noSecondRun",
    "noLockReset",
    "noLockDeletion",
    "noLockMutation",
    "noLockRearm",
    "priorApprovalDoesNotCoverLockReset",
    "lockRearmNotApproved",
    "lockMutationNotApproved",
    "safeDefaultHoldNoAction"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((k) => root[k] === true));

  const carry = asRecord(root.v1912CarryForward);
  ok(
    "v19.12 carry-forward exists and hold state persists",
    carry.v1912FinalDecision ===
      "V19.12 ONE-RUN LOCK STATE REVIEW PACKET CLOSED — READY FOR OWNER LOCK DECISION ONLY / NO EXECUTION" &&
      carry.lockReviewOnlyConfirmed === true &&
      carry.noLockMutationConfirmed === true &&
      carry.priorApprovalDoesNotCoverLockResetConfirmed === true &&
      carry.currentHoldReason === "HOLD — RETRY OR SECOND-RUN RISK DETECTED" &&
      carry.lockFilePath === ".nonga-owner-local-one-run-v143u.lock.json" &&
      carry.consumedStateObserved === true &&
      carry.consumedLockBlocksPriorApproval === true
  );

  const sections = asRecord(root.sections);
  ok("required sections map complete", requiredSections.every((k) => typeof sections[k] === "string"));

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => (root.requiredPlaceholderValues as string[]).includes(p))
  );

  ok(
    "scope flags array complete",
    Array.isArray(root.scopeFlags) && requiredScopeFlags.every((flag) => (root.scopeFlags as string[]).includes(flag))
  );

  const options = asRecord(root.ownerDecisionOptions);
  ok(
    "owner decision options exist",
    options.optionStopAtHold === true &&
      options.optionPrepareFutureLockRearmApprovalPacket === true &&
      options.optionFutureBoundaryChangingApproval === true
  );

  const futureConditions = asRecord(root.futureConditions);
  ok(
    "future re-arm and one-run conditions exist",
    futureConditions.futureRearmConditionsDefined === true &&
      futureConditions.futureOneRunConditionsDefined === true
  );

  const auth = asRecord(root.authorizationGuards);
  ok(
    "no execution/public/lock reset/re-arm authorization",
    auth.commandExecutionAuthorized === false &&
      auth.publicProductionRealLeadRealDealerAuthorized === false &&
      auth.lockResetAuthorized === false &&
      auth.lockRearmAuthorized === false
  );
}

ok(
  "owner-friendly thai summary lines exist",
  hasEveryLine(combined, [
    "v19.13 เป็นซองขอให้ลุงเด่นตัดสินใจเรื่อง lock เท่านั้น เพราะ lock เดิมถูกใช้ไปแล้วและ approval เดิมไม่ครอบคลุมการปลดล็อกหรือ re-arm",
    "v19.13 ยังห้าม reset lock ห้ามลบ lock ห้ามแก้ lock ห้าม re-arm ห้ามรันซ้ำ และห้ามถือว่าเป็น GO หากจะไปต่อ ต้องมี owner approval ใหม่แยกสำหรับ boundary-changing lock re-arm ก่อนเสมอ"
  ])
);

ok(
  "required hold and blocking statements exist",
  hasEveryLine(combined, [
    "HOLD — RETRY OR SECOND-RUN RISK DETECTED",
    ".nonga-owner-local-one-run-v143u.lock.json",
    "\"consumed\": true",
    "consumed lock blocks prior approval",
    "prior approval does not include lock reset/re-arm permission"
  ])
);

ok(
  "safe negative wording exists",
  hasEveryLine(combined, [
    "lock decision request only",
    "lock rearm review only",
    "boundary changing decision request only",
    "no execution",
    "no one run",
    "no retry",
    "no second run",
    "no lock reset",
    "no lock deletion",
    "no lock mutation",
    "no lock rearm",
    "prior approval does not cover lock reset",
    "lock rearm not approved",
    "lock mutation not approved",
    "safe default is hold/no action"
  ])
);

ok(
  "no command/public/real-action authorization statements exist",
  hasEveryLine(combined, [
    "no command execution is authorized",
    "no public/production/real lead/real dealer action is authorized"
  ])
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
  ["quoted secret assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenAuthorizationPatterns: Array<[string, RegExp]> = [
  ["owner approval granted phrase", /\bOWNER APPROVAL GRANTED\b/i],
  ["go granted phrase", /\bGO GRANTED\b/i],
  ["execution approved phrase", /\bEXECUTION APPROVED\b/i],
  ["command execute approved style", /--execute-approved/i]
];
for (const [name, re] of forbiddenAuthorizationPatterns) {
  ok(`no forbidden authorization pattern ${name}`, !re.test(combined));
}

ok(
  "final decision is owner lock re-arm decision only",
  doc.includes(
    "V19.13 LOCK RE-ARM DECISION REQUEST PACKET CLOSED — READY FOR OWNER LOCK RE-ARM DECISION ONLY / NO EXECUTION"
  ) &&
    fixtureRaw.includes(
      "\"finalDecision\": \"V19.13 LOCK RE-ARM DECISION REQUEST PACKET CLOSED — READY FOR OWNER LOCK RE-ARM DECISION ONLY / NO EXECUTION\""
    )
);

console.log(`\nDone v19.13 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
