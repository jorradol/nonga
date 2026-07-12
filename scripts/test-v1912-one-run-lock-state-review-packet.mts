/**
 * v19.12 one-run lock state review packet validator
 * Static checks only. Lock-review-only and read-only-inspection-only.
 *
 * npm run test:v19.12
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.12-one-run-lock-state-review-packet.md";
const FIXTURE_PATH = "docs/examples/v19.12-one-run-lock-state-review-packet.synthetic.json";
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
  "currentStatusAfterV1911HoldSection",
  "closedBaselineCarryForwardSection",
  "v1912ScopeSection",
  "lockReviewOnlyReminderSection",
  "readOnlyInspectionOnlyReminderSection",
  "noExecutionReminderSection",
  "noOneRunReminderSection",
  "noRetryReminderSection",
  "noSecondRunReminderSection",
  "noLockResetReminderSection",
  "noLockDeletionReminderSection",
  "noLockMutationReminderSection",
  "v1911CarryForwardSection",
  "freshApprovalAttemptStoppedSection",
  "lockFileObservedSection",
  "lockConsumedStateObservedSection",
  "commandNotExecutedLatestAttemptSection",
  "runtimeProviderGeminiNotRunSection",
  "publicProductionRealLeadRealDealerNotRunSection",
  "tokenSecretPiiGuardSection",
  "phonePlateVinGuardSection",
  "holdReasonSection",
  "secondRunRiskSection",
  "ownerDecisionOptionsSection",
  "optionStopAtHoldSection",
  "optionFutureLockResetReviewOnlySection",
  "optionFutureFreshBoundaryChangingApprovalSection",
  "lockResetNotApprovedSection",
  "priorApprovalDoesNotCoverResetSection",
  "safeDefaultHoldSection",
  "safeNegativeWordingSection",
  "exactNextOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V1911_HOLD_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V1912_SCOPE_PLACEHOLDER_ONLY",
  "LOCK_REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "READ_ONLY_INSPECTION_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_ONE_RUN_REMINDER_PLACEHOLDER_ONLY",
  "NO_RETRY_REMINDER_PLACEHOLDER_ONLY",
  "NO_SECOND_RUN_REMINDER_PLACEHOLDER_ONLY",
  "NO_LOCK_RESET_REMINDER_PLACEHOLDER_ONLY",
  "NO_LOCK_DELETION_REMINDER_PLACEHOLDER_ONLY",
  "NO_LOCK_MUTATION_REMINDER_PLACEHOLDER_ONLY",
  "V1911_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FRESH_APPROVAL_ATTEMPT_STOPPED_PLACEHOLDER_ONLY",
  "LOCK_FILE_OBSERVED_PLACEHOLDER_ONLY",
  "LOCK_CONSUMED_STATE_OBSERVED_PLACEHOLDER_ONLY",
  "COMMAND_NOT_EXECUTED_LATEST_ATTEMPT_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_NOT_RUN_PLACEHOLDER_ONLY",
  "PUBLIC_PRODUCTION_REAL_LEAD_REAL_DEALER_NOT_RUN_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY",
  "PHONE_PLATE_VIN_GUARD_PLACEHOLDER_ONLY",
  "HOLD_REASON_PLACEHOLDER_ONLY",
  "SECOND_RUN_RISK_PLACEHOLDER_ONLY",
  "OWNER_DECISION_OPTIONS_PLACEHOLDER_ONLY",
  "OPTION_STOP_AT_HOLD_PLACEHOLDER_ONLY",
  "OPTION_FUTURE_LOCK_RESET_REVIEW_ONLY_PLACEHOLDER_ONLY",
  "OPTION_FUTURE_FRESH_BOUNDARY_CHANGING_APPROVAL_PLACEHOLDER_ONLY",
  "LOCK_RESET_NOT_APPROVED_PLACEHOLDER_ONLY",
  "PRIOR_APPROVAL_DOES_NOT_COVER_RESET_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "EXACT_NEXT_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];

const requiredScopeFlags = [
  "LOCK REVIEW ONLY",
  "READ ONLY INSPECTION ONLY",
  "NO EXECUTION",
  "NO ONE RUN",
  "NO RETRY",
  "NO SECOND RUN",
  "NO LOCK RESET",
  "NO LOCK DELETION",
  "NO LOCK MUTATION",
  "HOLD DUE TO SECOND RUN RISK",
  "PRIOR APPROVAL DOES NOT COVER LOCK RESET",
  "SAFE DEFAULT HOLD NO ACTION"
];

console.log("=== v19.12 One-Run Lock State Review Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.12 lock-state review packet",
  /v19\.12 - One-Run Lock State Review Packet/i.test(doc) &&
    fixtureRaw.includes("\"version\": \"v19.12\"") &&
    fixtureRaw.includes("\"executionType\": \"lock-review-only\"")
);

ok("doc includes required section names", hasEveryLine(doc, requiredSections));
ok("doc has required placeholder values", hasEveryLine(doc, requiredPlaceholders));
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
  "package has test:v19.12 script",
  scripts["test:v19.12"] === "tsx scripts/test-v1912-one-run-lock-state-review-packet.mts"
);

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "lockReviewOnly",
    "readOnlyInspectionOnly",
    "noExecution",
    "noOneRun",
    "noRetry",
    "noSecondRun",
    "noLockReset",
    "noLockDeletion",
    "noLockMutation",
    "holdDueToSecondRunRisk",
    "priorApprovalDoesNotCoverLockReset",
    "safeDefaultHoldNoAction"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((k) => root[k] === true));

  const carry = asRecord(root.v1911CarryForward);
  ok(
    "v19.11 carry-forward lock state is captured",
    carry.freshApprovalAttemptStopped === true &&
      carry.holdReason === "HOLD — RETRY OR SECOND-RUN RISK DETECTED" &&
      carry.lockFilePath === ".nonga-owner-local-one-run-v143u.lock.json" &&
      carry.consumedStateObserved === true &&
      carry.latestAttemptCommandExecuted === false &&
      carry.retryOccurred === false &&
      carry.secondRunOccurred === false &&
      carry.runtimeProviderGeminiCalled === false &&
      carry.publicProductionRealLeadRealDealerActionOccurred === false
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
    "owner decision options exist and are bounded",
    options.optionStopAtHold === true &&
      options.optionFutureLockResetReviewOnly === true &&
      options.optionFutureFreshBoundaryChangingApproval === true &&
      options.lockResetNotApproved === true &&
      options.priorApprovalDoesNotCoverReset === true
  );

  const authGuards = asRecord(root.authorizationGuards);
  ok(
    "no command/public/runtime/lock-reset authorization in this packet",
    authGuards.commandExecutionAuthorized === false &&
      authGuards.publicProductionRealLeadRealDealerAuthorized === false &&
      authGuards.runtimeProviderGeminiAuthorized === false &&
      authGuards.lockResetAuthorized === false
  );
}

ok(
  "owner-friendly thai summary lines exist",
  hasEveryLine(combined, [
    "v19.12 เป็นการ review สถานะ one-run lock เท่านั้น เพราะพบว่า lock ถูกใช้ไปแล้ว จึงหยุดก่อนรันเพื่อไม่ให้กลายเป็น retry หรือ second-run",
    "v19.12 ห้าม reset lock ห้ามลบ lock ห้ามรันซ้ำ และห้ามถือว่า approval เดิมครอบคลุมการปลดล็อก หากจะไปต่อ ต้องมี owner decision ใหม่แยกสำหรับการจัดการ lock ก่อนเสมอ"
  ])
);

ok(
  "required status lines exist",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "\"consumed\": true",
    "command executed in latest attempt: no",
    "retry status: none",
    "second-run status: none",
    "runtime/provider/Gemini status: not run",
    "public/production/real lead/real dealer action status: not run"
  ])
);

ok(
  "safe negative/prohibition wording is used",
  hasEveryLine(combined, [
    "lock review only",
    "read only inspection only",
    "no execution",
    "no one run",
    "no retry",
    "no second run",
    "no lock reset",
    "no lock deletion",
    "no lock mutation",
    "hold due to second run risk",
    "prior approval does not cover lock reset",
    "safe default is hold/no action"
  ])
);

ok(
  "no command execution is authorized and no public/production/real actions authorized",
  hasEveryLine(combined, [
    "no command execution is authorized in this packet.",
    "no public/production/real lead/real dealer action is authorized in this packet."
  ])
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key value", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer value", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
  ["generic quoted secret-like assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenAuthorizationPatterns: Array<[string, RegExp]> = [
  ["approval granted wording", /\bOWNER APPROVAL GRANTED\b/i],
  ["go granted wording", /\bGO GRANTED\b/i],
  ["execution approved wording", /\bEXECUTION APPROVED\b/i],
  ["run now wording", /\bRUN NOW\b/i],
  ["real action proceed wording", /\bPROCEED TO REAL ACTION\b/i]
];
for (const [name, re] of forbiddenAuthorizationPatterns) {
  ok(`no forbidden authorization wording ${name}`, !re.test(combined));
}

ok(
  "final decision is lock decision only and no execution",
  doc.includes(
    "V19.12 ONE-RUN LOCK STATE REVIEW PACKET CLOSED — READY FOR OWNER LOCK DECISION ONLY / NO EXECUTION"
  ) &&
    fixtureRaw.includes(
      "\"finalDecision\": \"V19.12 ONE-RUN LOCK STATE REVIEW PACKET CLOSED — READY FOR OWNER LOCK DECISION ONLY / NO EXECUTION\""
    )
);

console.log(`\nDone v19.12 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
