/**
 * v19.7 controlled demo request draft validator
 * Static checks only. Demo-request-draft-only, review-only, placeholder-only.
 *
 * npm run test:v19.7
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.7-controlled-demo-request-draft.md";
const FIXTURE_PATH = "docs/examples/v19.7-controlled-demo-request-draft.synthetic.json";
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
  "UNSAFE_APPROVAL_PHRASE_RUN_DEMO_NOW"
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
    "demo request draft only",
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
    "safe default is hold/no action",
    "exact command/target/evidence must be separated into future packet",
    "fresh owner approval must be separated later",
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
  "currentStatusAfterV196Section",
  "closedBaselineCarryForwardSection",
  "v197ScopeSection",
  "demoRequestDraftOnlyReminderSection",
  "reviewOnlyReminderSection",
  "placeholderOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "noOwnerDecisionMadeReminderSection",
  "v196SafetyGateCarryForwardSection",
  "controlledDemoPurposeSection",
  "ownerOnlyDemoBoundarySection",
  "stagingOnlyDemoBoundarySection",
  "syntheticOrSafeDataOnlyBoundarySection",
  "noRealLeadBoundarySection",
  "noPublicBoundarySection",
  "noProductionBoundarySection",
  "noRealDealerActionBoundarySection",
  "noRealCustomerDataBoundarySection",
  "tokenSecretPiiGuardSection",
  "phonePlateVinGuardSection",
  "runtimeProviderGeminiGuardSection",
  "liveEndpointManualGuessGuardSection",
  "exactCommandNotIncludedSection",
  "exactTargetNotIncludedSection",
  "expectedEvidenceNotIncludedSection",
  "freshOwnerApprovalRequiredLaterSection",
  "futureExactCommandPacketSeparationSection",
  "futureExactTargetPacketSeparationSection",
  "futureExpectedEvidencePacketSeparationSection",
  "futureOwnerApprovalPacketSeparationSection",
  "oneRunOnlyFutureRequirementSection",
  "noRetryNoSecondRunFutureRequirementSection",
  "stopConditionsFutureRequirementSection",
  "rollbackFutureRequirementSection",
  "killSwitchFutureRequirementSection",
  "demoSuccessCriteriaPlaceholderSection",
  "demoFailureCriteriaPlaceholderSection",
  "demoObservationOnlyBoundarySection",
  "noDecisionOptionSelectedSection",
  "noRequestTypeSelectedSection",
  "noFuturePathSelectedSection",
  "noSafetyGateCheckSelectedAsActionSection",
  "safeDefaultHoldSection",
  "safeNegativeWordingSection",
  "exactNextOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V196_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V197_SCOPE_PLACEHOLDER_ONLY",
  "DEMO_REQUEST_DRAFT_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "PLACEHOLDER_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_OWNER_DECISION_MADE_REMINDER_PLACEHOLDER_ONLY",
  "V196_SAFETY_GATE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "CONTROLLED_DEMO_PURPOSE_PLACEHOLDER_ONLY",
  "OWNER_ONLY_DEMO_BOUNDARY_PLACEHOLDER_ONLY",
  "STAGING_ONLY_DEMO_BOUNDARY_PLACEHOLDER_ONLY",
  "SYNTHETIC_OR_SAFE_DATA_ONLY_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_REAL_LEAD_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_PUBLIC_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_PRODUCTION_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_REAL_DEALER_ACTION_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_REAL_CUSTOMER_DATA_BOUNDARY_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY",
  "PHONE_PLATE_VIN_GUARD_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY",
  "EXACT_COMMAND_NOT_INCLUDED_PLACEHOLDER_ONLY",
  "EXACT_TARGET_NOT_INCLUDED_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_NOT_INCLUDED_PLACEHOLDER_ONLY",
  "FRESH_OWNER_APPROVAL_REQUIRED_LATER_PLACEHOLDER_ONLY",
  "FUTURE_EXACT_COMMAND_PACKET_SEPARATION_PLACEHOLDER_ONLY",
  "FUTURE_EXACT_TARGET_PACKET_SEPARATION_PLACEHOLDER_ONLY",
  "FUTURE_EXPECTED_EVIDENCE_PACKET_SEPARATION_PLACEHOLDER_ONLY",
  "FUTURE_OWNER_APPROVAL_PACKET_SEPARATION_PLACEHOLDER_ONLY",
  "ONE_RUN_ONLY_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY",
  "ROLLBACK_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY",
  "KILL_SWITCH_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY",
  "DEMO_SUCCESS_CRITERIA_PLACEHOLDER_ONLY",
  "DEMO_FAILURE_CRITERIA_PLACEHOLDER_ONLY",
  "DEMO_OBSERVATION_ONLY_BOUNDARY_PLACEHOLDER_ONLY",
  "NO_DECISION_OPTION_SELECTED_PLACEHOLDER_ONLY",
  "NO_REQUEST_TYPE_SELECTED_PLACEHOLDER_ONLY",
  "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY",
  "NO_SAFETY_GATE_CHECK_SELECTED_AS_ACTION_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "EXACT_NEXT_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];

const demoPlaceholders = [
  "OWNER_ONLY_DEMO_PLACEHOLDER",
  "STAGING_ONLY_DEMO_PLACEHOLDER",
  "SYNTHETIC_OR_SAFE_DATA_ONLY_DEMO_PLACEHOLDER",
  "NO_REAL_LEAD_DEMO_PLACEHOLDER",
  "NO_PUBLIC_DEMO_PLACEHOLDER",
  "NO_PRODUCTION_DEMO_PLACEHOLDER",
  "NO_REAL_DEALER_ACTION_DEMO_PLACEHOLDER",
  "NO_REAL_CUSTOMER_DATA_DEMO_PLACEHOLDER",
  "OBSERVATION_ONLY_DEMO_PLACEHOLDER"
] as const;

const requiredScopeFlags = [
  "DEMO REQUEST DRAFT ONLY",
  "REVIEW ONLY",
  "DOCUMENTATION ONLY",
  "FIXTURE ONLY",
  "VALIDATOR ONLY",
  "PLACEHOLDER ONLY",
  "NO EXECUTION",
  "NO APPROVAL",
  "NO GO",
  "NO REAL VALUE INSERTION",
  "NO OWNER DECISION MADE",
  "NO FUTURE PATH SELECTED",
  "NO REQUEST TYPE SELECTED",
  "NO DECISION OPTION SELECTED",
  "NO REAL COMMAND INCLUDED",
  "NO REAL TARGET INCLUDED",
  "NO EXPECTED EVIDENCE INCLUDED",
  "FRESH OWNER APPROVAL REQUIRED LATER"
];

console.log("=== v19.7 Controlled Demo Request Draft Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.7 controlled demo request draft correctly",
  /v19\.7 - Controlled Demo Request Draft/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v19.7\"") &&
    fixtureRaw.includes("\"executionType\": \"controlled-demo-request-draft only\"")
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
  ok("package has test:v19.7 script", scripts["test:v19.7"] === "tsx scripts/test-v197-controlled-demo-request-draft.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "demoRequestDraftOnly",
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
    "noFuturePathSelected",
    "noRequestTypeSelected",
    "noDecisionOptionSelected",
    "noRealCommandIncluded",
    "noRealTargetIncluded",
    "noExpectedEvidenceIncluded",
    "freshOwnerApprovalRequiredLater"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline confirms v13-v19.6 carry-forward",
    baseline.v13 === "CLOSED" &&
      baseline.v14 === "CLOSED" &&
      baseline.v15 === "CLOSED" &&
      baseline.v16 === "CLOSED / PLANNING-ONLY" &&
      baseline["v17.0-v17.12"] === "CLOSED" &&
      baseline["v18.0-v18.11"] === "CLOSED" &&
      baseline["v19.0-v19.5"] === "CLOSED / OWNER FUTURE REQUEST DOCUMENTS ONLY" &&
      baseline["v19.6SafetyGateClosure"] ===
        "OWNER DECISION PACKET SAFETY REVIEW GATE CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION"
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

  const demo = asRecord(root.demoBoundaryPlaceholders);
  ok("demo placeholders exist", demoPlaceholders.every((key) => typeof demo[key] === "object"));
  ok(
    "no demo placeholder selected as action",
    demoPlaceholders.every((key) => {
      const item = asRecord(demo[key]);
      return (
        item.placeholderOnly === true &&
        item.draftOnly === true &&
        item.selectedAsAction === false &&
        item.notDecision === true &&
        item.notApproval === true &&
        item.notExecution === true &&
        item.notGo === true &&
        item.noRealValuesIncluded === true &&
        item.noRealValuesRequested === true &&
        item.separateExactPacketRequiredLater === true &&
        item.separateFreshOwnerApprovalRequiredLater === true
      );
    })
  );

  const req = asRecord(root.boundaryRequirements);
  ok(
    "boundary requirements exist",
    req.ownerOnlyDemoBoundary === "OWNER_ONLY_DEMO_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.stagingOnlyDemoBoundary === "STAGING_ONLY_DEMO_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.syntheticOrSafeDataOnlyBoundary === "SYNTHETIC_OR_SAFE_DATA_ONLY_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noRealLeadBoundary === "NO_REAL_LEAD_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noPublicBoundary === "NO_PUBLIC_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noProductionBoundary === "NO_PRODUCTION_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noRealDealerActionBoundary === "NO_REAL_DEALER_ACTION_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noRealCustomerDataBoundary === "NO_REAL_CUSTOMER_DATA_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.tokenSecretPiiGuard === "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY" &&
      req.phonePlateVinGuard === "PHONE_PLATE_VIN_GUARD_PLACEHOLDER_ONLY" &&
      req.runtimeProviderGeminiGuard === "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY" &&
      req.liveEndpointManualGuessGuard === "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY" &&
      req.exactCommandNotIncluded === "EXACT_COMMAND_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      req.exactTargetNotIncluded === "EXACT_TARGET_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      req.expectedEvidenceNotIncluded === "EXPECTED_EVIDENCE_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      req.freshOwnerApprovalRequiredLater === "FRESH_OWNER_APPROVAL_REQUIRED_LATER_PLACEHOLDER_ONLY" &&
      req.futureExactCommandPacketSeparation === "FUTURE_EXACT_COMMAND_PACKET_SEPARATION_PLACEHOLDER_ONLY" &&
      req.futureExactTargetPacketSeparation === "FUTURE_EXACT_TARGET_PACKET_SEPARATION_PLACEHOLDER_ONLY" &&
      req.futureExpectedEvidencePacketSeparation === "FUTURE_EXPECTED_EVIDENCE_PACKET_SEPARATION_PLACEHOLDER_ONLY" &&
      req.futureOwnerApprovalPacketSeparation === "FUTURE_OWNER_APPROVAL_PACKET_SEPARATION_PLACEHOLDER_ONLY" &&
      req.oneRunOnlyFutureRequirement === "ONE_RUN_ONLY_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.noRetryNoSecondRunFutureRequirement === "NO_RETRY_NO_SECOND_RUN_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.stopConditionsFutureRequirement === "STOP_CONDITIONS_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.rollbackFutureRequirement === "ROLLBACK_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.killSwitchFutureRequirement === "KILL_SWITCH_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.demoSuccessCriteriaPlaceholder === "DEMO_SUCCESS_CRITERIA_PLACEHOLDER_ONLY" &&
      req.demoFailureCriteriaPlaceholder === "DEMO_FAILURE_CRITERIA_PLACEHOLDER_ONLY" &&
      req.demoObservationOnlyBoundary === "DEMO_OBSERVATION_ONLY_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.noDecisionOptionSelected === "NO_DECISION_OPTION_SELECTED_PLACEHOLDER_ONLY" &&
      req.noRequestTypeSelected === "NO_REQUEST_TYPE_SELECTED_PLACEHOLDER_ONLY" &&
      req.noFuturePathSelected === "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY" &&
      req.noSafetyGateCheckSelectedAsAction === "NO_SAFETY_GATE_CHECK_SELECTED_AS_ACTION_PLACEHOLDER_ONLY"
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
      unsafe.runDemoNowBlocked === true
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
    "v19.7 เป็นร่างคำขอ controlled demo เท่านั้น เพื่อเตรียมทางให้ลุงเด่นได้เห็นน้องเอทดลองเบื้องต้นในอนาคตแบบ owner-only และ staging-only ยังไม่ใช่ GO ยังไม่ใช่ execution และยังไม่แตะของจริง",
    "v19.7 ยังไม่ใส่ command จริง target จริง evidence จริง หรือ approval จริง ขั้นถัดไปต้องแยกไปทำ v19.8 exact demo command/target/evidence packet แล้วจึงต้องมี fresh owner approval แยกก่อน one-run เสมอ"
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
    "demo request draft only",
    "review only",
    "placeholder only",
    "not selected",
    "not decision",
    "not approval",
    "not GO",
    "not execution",
    "safe default is hold/no action",
    "exact command/target/evidence must be separated into future packet",
    "fresh owner approval must be separated later",
    "v19.7 is separated from v19.6 and v19.5",
    "v19.7 is not decision",
    "v19.7 is not approval",
    "v19.7 is not GO",
    "v19.7 is not execution",
    "v19.7 is not real-value insertion"
  ])
);

ok(
  "final decision wording exists",
  doc.includes("V19.7 CONTROLLED DEMO REQUEST DRAFT CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION") &&
    fixtureRaw.includes("\"finalDecision\": \"V19.7 CONTROLLED DEMO REQUEST DRAFT CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION\"")
);

console.log(`\nDone v19.7 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
