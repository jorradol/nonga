/**
 * v19.11 controlled owner-only one-run execution request packet validator
 * Static checks only. Final-execution-request-only.
 *
 * npm run test:v19.11
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.11-controlled-owner-only-one-run-execution-request-packet.md";
const FIXTURE_PATH = "docs/examples/v19.11-controlled-owner-only-one-run-execution-request-packet.synthetic.json";
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
  "UNSAFE_APPROVAL_PHRASE_RUN_DEMO_NOW",
  "UNSAFE_APPROVAL_PHRASE_OWNER_APPROVAL_GRANTED",
  "UNSAFE_APPROVAL_PHRASE_FRESH_APPROVAL_GRANTED",
  "UNSAFE_APPROVAL_PHRASE_OWNER_INTENT_MEANS_APPROVED"
] as const;

const FORBIDDEN_CREDENTIAL_LABEL_TOKENS = [
  "FORBIDDEN_CREDENTIAL_LABEL_PLATFORM_AUTH_TOKEN",
  "FORBIDDEN_CREDENTIAL_LABEL_AUTHORIZATION_HEADER",
  "FORBIDDEN_CREDENTIAL_LABEL_API_KEY",
  "FORBIDDEN_CREDENTIAL_LABEL_SECRET_VALUE"
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
    "final execution request only",
    "controlled owner only one run request only",
    "owner review before approval only",
    "no execution",
    "no go",
    "no owner approval granted",
    "no owner decision made",
    "owner intent is not approval",
    "command not executed by agent",
    "target not called by agent",
    "one run only",
    "no retry",
    "no second run",
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
  "currentStatusAfterV1910Section",
  "closedBaselineCarryForwardSection",
  "v1911ScopeSection",
  "ownerIntentNotApprovalReminderSection",
  "finalExecutionRequestOnlyReminderSection",
  "controlledOwnerOnlyOneRunRequestOnlyReminderSection",
  "ownerReviewBeforeApprovalOnlyReminderSection",
  "noExecutionReminderSection",
  "noGoReminderSection",
  "noOwnerApprovalGrantedReminderSection",
  "noOwnerDecisionMadeReminderSection",
  "v1910ReadinessCarryForwardSection",
  "v199ApprovalRequestCarryForwardSection",
  "v198ExactPacketCarryForwardSection",
  "v197ControlledDemoRequestCarryForwardSection",
  "v196SafetyGateCarryForwardSection",
  "testPurposeSection",
  "ownerOnlyBoundarySection",
  "stagingOnlyBoundarySection",
  "syntheticOrSafeDataOnlyBoundarySection",
  "exactOwnerRunCommandCandidateSection",
  "commandCandidateSourceSection",
  "commandNotExecutedByAgentSection",
  "targetNotCalledByAgentSection",
  "evidenceCaptureRequirementSection",
  "expectedEvidencePassCriteriaSection",
  "expectedEvidenceNeedReviewCriteriaSection",
  "expectedEvidenceHoldCriteriaSection",
  "stopConditionsRequirementSection",
  "rollbackRequirementSection",
  "killSwitchRequirementSection",
  "oneRunOnlyRequirementSection",
  "noRetryNoSecondRunRequirementSection",
  "freshOwnerApprovalRequiredBeforeRunSection",
  "ownerApprovalPhrasePlaceholderSection",
  "ownerManualActionPlaceholderSection",
  "approvalMustMatchThisPacketSection",
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
  "noRealValueInsertionSection",
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
  "CURRENT_STATUS_AFTER_V1910_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V1911_SCOPE_PLACEHOLDER_ONLY",
  "OWNER_INTENT_NOT_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "FINAL_EXECUTION_REQUEST_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "CONTROLLED_OWNER_ONLY_ONE_RUN_REQUEST_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "OWNER_REVIEW_BEFORE_APPROVAL_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_OWNER_APPROVAL_GRANTED_REMINDER_PLACEHOLDER_ONLY",
  "NO_OWNER_DECISION_MADE_REMINDER_PLACEHOLDER_ONLY",
  "V1910_READINESS_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V199_APPROVAL_REQUEST_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V198_EXACT_PACKET_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V197_CONTROLLED_DEMO_REQUEST_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V196_SAFETY_GATE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "TEST_PURPOSE_PLACEHOLDER_ONLY",
  "OWNER_ONLY_BOUNDARY_PLACEHOLDER_ONLY",
  "STAGING_ONLY_BOUNDARY_PLACEHOLDER_ONLY",
  "SYNTHETIC_OR_SAFE_DATA_ONLY_BOUNDARY_PLACEHOLDER_ONLY",
  "EXACT_OWNER_RUN_COMMAND_CANDIDATE_PLACEHOLDER_ONLY",
  "COMMAND_CANDIDATE_SOURCE_PLACEHOLDER_ONLY",
  "COMMAND_NOT_EXECUTED_BY_AGENT_PLACEHOLDER_ONLY",
  "TARGET_NOT_CALLED_BY_AGENT_PLACEHOLDER_ONLY",
  "EVIDENCE_CAPTURE_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_PASS_CRITERIA_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_NEED_REVIEW_CRITERIA_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_HOLD_CRITERIA_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY",
  "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY",
  "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY",
  "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY",
  "FRESH_OWNER_APPROVAL_REQUIRED_BEFORE_RUN_PLACEHOLDER_ONLY",
  "OWNER_APPROVAL_PHRASE_PLACEHOLDER_ONLY",
  "OWNER_MANUAL_ACTION_PLACEHOLDER_ONLY",
  "APPROVAL_MUST_MATCH_THIS_PACKET_PLACEHOLDER_ONLY",
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
  "NO_REAL_VALUE_INSERTION_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY",
  "UNSAFE_APPROVAL_WORDING_GUARD_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "EXACT_NEXT_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];

const requiredScopeFlags = [
  "FINAL EXECUTION REQUEST ONLY",
  "CONTROLLED OWNER ONLY ONE RUN REQUEST ONLY",
  "OWNER REVIEW BEFORE APPROVAL ONLY",
  "NO EXECUTION",
  "NO GO",
  "NO OWNER APPROVAL GRANTED",
  "NO OWNER DECISION MADE",
  "OWNER INTENT IS NOT APPROVAL",
  "COMMAND NOT EXECUTED BY AGENT",
  "TARGET NOT CALLED BY AGENT",
  "FRESH OWNER APPROVAL REQUIRED BEFORE RUN",
  "ONE RUN ONLY",
  "NO RETRY NO SECOND RUN",
  "NO PUBLIC",
  "NO PRODUCTION",
  "NO REAL LEAD",
  "NO REAL DEALER ACTION",
  "NO REAL CUSTOMER DATA",
  "NO TOKEN SECRET CREDENTIAL PII EXPOSURE",
  "NO PHONE PLATE VIN",
  "SAFE DEFAULT HOLD NO ACTION"
];

console.log("=== v19.11 Controlled Owner-Only One-Run Execution Request Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.11 execution request packet",
  /v19\.11 - Controlled Owner-Only One-Run Execution Request Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v19.11\"") &&
    fixtureRaw.includes("\"executionType\": \"final-execution-request-only\"")
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

const scripts = packageParsed && typeof packageParsed === "object"
  ? ((packageParsed as { scripts?: Record<string, string> }).scripts ?? {})
  : {};
ok(
  "package has test:v19.11 script",
  scripts["test:v19.11"] === "tsx scripts/test-v1911-controlled-owner-only-one-run-execution-request-packet.mts"
);
const hasSafeCandidateScript =
  scripts["owner-local-one-run:v14.3U"] === "tsx scripts/owner-local-one-run-gate-v143u.mts";
ok("safe owner-local command candidate exists in package", hasSafeCandidateScript);

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "finalExecutionRequestOnly",
    "controlledOwnerOnlyOneRunRequestOnly",
    "ownerReviewBeforeApprovalOnly",
    "notApproval",
    "notGo",
    "notExecution",
    "ownerIntentIsNotApproval",
    "commandNotExecutedByAgent",
    "targetNotCalledByAgent",
    "freshOwnerApprovalRequiredBeforeRun",
    "oneRunOnly",
    "noRetryNoSecondRun",
    "noPublic",
    "noProduction",
    "noRealLead",
    "noRealDealerAction",
    "noRealCustomerData",
    "noTokenSecretCredentialPiiExposure",
    "noPhonePlateVin",
    "safeDefaultHoldNoAction"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline confirms v13-v19.10 carry-forward",
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
        "EXACT DEMO COMMAND TARGET EVIDENCE PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION" &&
      baseline["v19.9ApprovalRequestClosure"] ===
        "FRESH OWNER APPROVAL REQUEST PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION" &&
      baseline["v19.10ReadinessClosure"] ===
        "FRESH OWNER APPROVAL READINESS PACKET CLOSED - READY FOR OWNER FRESH APPROVAL DECISION ONLY / NO EXECUTION"
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

  const candidate = asRecord(root.safeCommandCandidate);
  ok(
    "exact owner-run command candidate is review-only",
    candidate.candidateLabel === "OWNER_LOCAL_ONE_RUN_COMMAND_CANDIDATE_SAFE_REVIEW_ONLY" &&
      candidate.scriptName === "owner-local-one-run:v14.3U" &&
      candidate.scriptTarget === "scripts/owner-local-one-run-gate-v143u.mts" &&
      candidate.sourceFile === "package.json" &&
      candidate.reviewOnly === true &&
      candidate.notExecutedByAgent === true &&
      candidate.notAuthorizedInThisPacket === true &&
      candidate.ownerManualOnlyAfterFreshApproval === true
  );

  const evidence = asRecord(root.evidenceCriteria);
  ok(
    "pass/need-review/hold criteria placeholders exist",
    evidence.passCriteriaPlaceholder === "EXPECTED_EVIDENCE_PASS_CRITERIA_PLACEHOLDER_ONLY" &&
      evidence.needReviewCriteriaPlaceholder === "EXPECTED_EVIDENCE_NEED_REVIEW_CRITERIA_PLACEHOLDER_ONLY" &&
      evidence.holdCriteriaPlaceholder === "EXPECTED_EVIDENCE_HOLD_CRITERIA_PLACEHOLDER_ONLY" &&
      evidence.stopConditionsPlaceholder === "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY" &&
      evidence.rollbackPlaceholder === "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY" &&
      evidence.killSwitchPlaceholder === "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY"
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
      unsafe.runDemoNowBlocked === true &&
      unsafe.ownerApprovalGrantedBlocked === true &&
      unsafe.freshApprovalGrantedBlocked === true &&
      unsafe.ownerIntentMeansApprovedBlocked === true
  );
}

ok(
  "doc contains owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v19.11 เป็นซองคำขอ one-run สุดท้ายเพื่อให้ลุงเด่น review ก่อนอนุมัติทดลองจริงแบบ owner-only ยังไม่ใช่ approval ยังไม่ใช่ GO ยังไม่ใช่ execution และน้องซีห้ามรันเอง",
    "หลัง v19.11 ถ้าลุงเด่นจะทดลองจริง ต้องให้ fresh owner approval แยกแบบชัดเจน ตรงซองนี้ และจำกัด controlled owner-only one-run ครั้งเดียว ไม่มี retry ไม่มี second-run ไม่มี public ไม่มี production ไม่มี real lead และไม่มี real dealer action"
  ])
);

ok(
  "doc includes command candidate and source",
  hasEveryLine(doc, [
    "OWNER_LOCAL_ONE_RUN_COMMAND_CANDIDATE_SAFE_REVIEW_ONLY",
    "`owner-local-one-run:v14.3U`",
    "`scripts/owner-local-one-run-gate-v143u.mts`",
    "`package.json`",
    "command not executed by agent",
    "target not called by agent"
  ])
);

ok(
  "doc includes required negative reminders",
  hasEveryLine(doc, [
    "final execution request only",
    "controlled owner only one run request only",
    "owner review before approval only",
    "no execution",
    "no GO",
    "no owner approval granted",
    "no owner decision made",
    "owner intent is not approval",
    "command not executed by agent",
    "target not called by agent",
    "one run only",
    "no retry",
    "no second run",
    "safe default is hold/no action"
  ])
);

ok(
  "doc includes unsafe approval label tokens only",
  hasEveryLine(doc, UNSAFE_APPROVAL_LABEL_TOKENS.map((token) => `\`${token}\``))
);
ok(
  "doc includes forbidden credential label tokens only",
  hasEveryLine(doc, FORBIDDEN_CREDENTIAL_LABEL_TOKENS.map((token) => `\`${token}\``))
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
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

if (hasSafeCandidateScript) {
  ok(
    "final decision set to ready for fresh owner approval",
    doc.includes("V19.11 CONTROLLED OWNER-ONLY ONE-RUN EXECUTION REQUEST PACKET CLOSED - READY FOR FRESH OWNER APPROVAL ONLY / NO EXECUTION") &&
      fixtureRaw.includes("\"finalDecision\": \"V19.11 CONTROLLED OWNER-ONLY ONE-RUN EXECUTION REQUEST PACKET CLOSED - READY FOR FRESH OWNER APPROVAL ONLY / NO EXECUTION\"")
  );
} else {
  ok(
    "final decision set to command-not-found need-review",
    doc.includes("NEED REVIEW - EXACT OWNER-RUN COMMAND NOT FOUND") &&
      fixtureRaw.includes("\"finalDecision\": \"NEED REVIEW - EXACT OWNER-RUN COMMAND NOT FOUND\"")
  );
}

console.log(`\nDone v19.11 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
