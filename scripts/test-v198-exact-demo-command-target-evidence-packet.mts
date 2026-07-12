/**
 * v19.8 exact demo command/target/evidence packet validator
 * Static checks only. Exact-packet-draft-only, demo-command-target-evidence-draft-only.
 *
 * npm run test:v19.8
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.8-exact-demo-command-target-evidence-packet.md";
const FIXTURE_PATH = "docs/examples/v19.8-exact-demo-command-target-evidence-packet.synthetic.json";
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
  "UNSAFE_APPROVAL_PHRASE_EVIDENCE_APPROVED"
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
    "exact packet draft only",
    "demo command target evidence draft only",
    "review only",
    "placeholder only",
    "not selected",
    "not decision",
    "not approval",
    "not go",
    "not execution",
    "command not executable by agent",
    "target not callable by agent",
    "evidence expected only",
    "no packet field selected as action",
    "safe default is hold/no action",
    "fresh owner approval required after packet",
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
  "currentStatusAfterV197Section",
  "closedBaselineCarryForwardSection",
  "v198ScopeSection",
  "exactPacketDraftOnlyReminderSection",
  "demoCommandTargetEvidenceDraftOnlyReminderSection",
  "reviewOnlyReminderSection",
  "placeholderOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "noOwnerDecisionMadeReminderSection",
  "v197ControlledDemoRequestCarryForwardSection",
  "v196SafetyGateCarryForwardSection",
  "exactDemoCommandPlaceholderSection",
  "exactDemoTargetPlaceholderSection",
  "expectedDemoEvidencePlaceholderSection",
  "commandIsNotExecutableByAgentSection",
  "targetIsNotCallableByAgentSection",
  "evidenceIsExpectedOnlySection",
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
  "noDeployBoundarySection",
  "oneRunOnlyFutureRequirementSection",
  "noRetryNoSecondRunFutureRequirementSection",
  "stopConditionsRequirementSection",
  "rollbackRequirementSection",
  "killSwitchRequirementSection",
  "expectedEvidencePassCriteriaPlaceholderSection",
  "expectedEvidenceFailCriteriaPlaceholderSection",
  "evidenceCaptureBoundarySection",
  "freshOwnerApprovalRequiredAfterPacketSection",
  "ownerApprovalNotIncludedSection",
  "ownerDecisionNotIncludedSection",
  "noDecisionOptionSelectedSection",
  "noRequestTypeSelectedSection",
  "noFuturePathSelectedSection",
  "noPacketFieldSelectedAsActionSection",
  "unsafeApprovalWordingGuardSection",
  "forbiddenRealValuesGuardSection",
  "safeDefaultHoldSection",
  "safeNegativeWordingSection",
  "exactNextOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V197_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V198_SCOPE_PLACEHOLDER_ONLY",
  "EXACT_PACKET_DRAFT_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "DEMO_COMMAND_TARGET_EVIDENCE_DRAFT_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "PLACEHOLDER_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_OWNER_DECISION_MADE_REMINDER_PLACEHOLDER_ONLY",
  "V197_CONTROLLED_DEMO_REQUEST_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V196_SAFETY_GATE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "EXACT_DEMO_COMMAND_PLACEHOLDER_ONLY",
  "EXACT_DEMO_TARGET_PLACEHOLDER_ONLY",
  "EXPECTED_DEMO_EVIDENCE_PLACEHOLDER_ONLY",
  "COMMAND_IS_NOT_EXECUTABLE_BY_AGENT_PLACEHOLDER_ONLY",
  "TARGET_IS_NOT_CALLABLE_BY_AGENT_PLACEHOLDER_ONLY",
  "EVIDENCE_IS_EXPECTED_ONLY_PLACEHOLDER_ONLY",
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
  "NO_DEPLOY_BOUNDARY_PLACEHOLDER_ONLY",
  "ONE_RUN_ONLY_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY",
  "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY",
  "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_PASS_CRITERIA_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_FAIL_CRITERIA_PLACEHOLDER_ONLY",
  "EVIDENCE_CAPTURE_BOUNDARY_PLACEHOLDER_ONLY",
  "FRESH_OWNER_APPROVAL_REQUIRED_AFTER_PACKET_PLACEHOLDER_ONLY",
  "OWNER_APPROVAL_NOT_INCLUDED_PLACEHOLDER_ONLY",
  "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY",
  "NO_DECISION_OPTION_SELECTED_PLACEHOLDER_ONLY",
  "NO_REQUEST_TYPE_SELECTED_PLACEHOLDER_ONLY",
  "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY",
  "NO_PACKET_FIELD_SELECTED_AS_ACTION_PLACEHOLDER_ONLY",
  "UNSAFE_APPROVAL_WORDING_GUARD_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "EXACT_NEXT_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];

const requiredScopeFlags = [
  "EXACT PACKET DRAFT ONLY",
  "DEMO COMMAND TARGET EVIDENCE DRAFT ONLY",
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
  "NO OWNER APPROVAL INCLUDED",
  "NO FUTURE PATH SELECTED",
  "NO REQUEST TYPE SELECTED",
  "NO DECISION OPTION SELECTED",
  "NO PACKET FIELD SELECTED AS ACTION",
  "COMMAND NOT EXECUTABLE BY AGENT",
  "TARGET NOT CALLABLE BY AGENT",
  "EVIDENCE EXPECTED ONLY",
  "FRESH OWNER APPROVAL REQUIRED AFTER PACKET"
];

const packetFields = [
  "EXACT_DEMO_COMMAND_FIELD_PLACEHOLDER",
  "EXACT_DEMO_TARGET_FIELD_PLACEHOLDER",
  "EXPECTED_DEMO_EVIDENCE_FIELD_PLACEHOLDER",
  "EXPECTED_EVIDENCE_PASS_CRITERIA_FIELD_PLACEHOLDER",
  "EXPECTED_EVIDENCE_FAIL_CRITERIA_FIELD_PLACEHOLDER",
  "STOP_CONDITIONS_FIELD_PLACEHOLDER",
  "ROLLBACK_FIELD_PLACEHOLDER",
  "KILL_SWITCH_FIELD_PLACEHOLDER",
  "ONE_RUN_ONLY_FIELD_PLACEHOLDER",
  "NO_RETRY_NO_SECOND_RUN_FIELD_PLACEHOLDER",
  "FRESH_OWNER_APPROVAL_AFTER_PACKET_FIELD_PLACEHOLDER"
] as const;

console.log("=== v19.8 Exact Demo Command Target Evidence Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.8 exact packet correctly",
  /v19\.8 - Exact Demo Command Target Evidence Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v19.8\"") &&
    fixtureRaw.includes("\"executionType\": \"exact-demo-command-target-evidence-packet-draft only\"")
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
  ok("package has test:v19.8 script", scripts["test:v19.8"] === "tsx scripts/test-v198-exact-demo-command-target-evidence-packet.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "exactPacketDraftOnly",
    "demoCommandTargetEvidenceDraftOnly",
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
    "noOwnerApprovalIncluded",
    "noFuturePathSelected",
    "noRequestTypeSelected",
    "noDecisionOptionSelected",
    "noPacketFieldSelectedAsAction",
    "commandNotExecutableByAgent",
    "targetNotCallableByAgent",
    "evidenceExpectedOnly",
    "freshOwnerApprovalRequiredAfterPacket"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline confirms v13-v19.7 carry-forward",
    baseline.v13 === "CLOSED" &&
      baseline.v14 === "CLOSED" &&
      baseline.v15 === "CLOSED" &&
      baseline.v16 === "CLOSED / PLANNING-ONLY" &&
      baseline["v17.0-v17.12"] === "CLOSED" &&
      baseline["v18.0-v18.11"] === "CLOSED" &&
      baseline["v19.0-v19.5"] === "CLOSED / OWNER FUTURE REQUEST DOCUMENTS ONLY" &&
      baseline["v19.6SafetyGateClosure"] ===
        "OWNER DECISION PACKET SAFETY REVIEW GATE CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION" &&
      baseline["v19.7ControlledDemoRequestClosure"] ===
        "CONTROLLED DEMO REQUEST DRAFT CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION"
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

  const fields = asRecord(root.packetFieldPlaceholders);
  ok("packet field placeholders exist", packetFields.every((key) => typeof fields[key] === "object"));
  ok(
    "no packet field selected as action",
    packetFields.every((key) => {
      const item = asRecord(fields[key]);
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
        item.notExecutableByAgent === true &&
        item.separateFreshOwnerApprovalRequiredAfterPacket === true
      );
    })
  );

  const req = asRecord(root.boundaryRequirements);
  ok(
    "boundary requirements exist",
    req.exactDemoCommandPlaceholder === "EXACT_DEMO_COMMAND_PLACEHOLDER_ONLY" &&
      req.exactDemoTargetPlaceholder === "EXACT_DEMO_TARGET_PLACEHOLDER_ONLY" &&
      req.expectedDemoEvidencePlaceholder === "EXPECTED_DEMO_EVIDENCE_PLACEHOLDER_ONLY" &&
      req.commandIsNotExecutableByAgent === "COMMAND_IS_NOT_EXECUTABLE_BY_AGENT_PLACEHOLDER_ONLY" &&
      req.targetIsNotCallableByAgent === "TARGET_IS_NOT_CALLABLE_BY_AGENT_PLACEHOLDER_ONLY" &&
      req.evidenceIsExpectedOnly === "EVIDENCE_IS_EXPECTED_ONLY_PLACEHOLDER_ONLY" &&
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
      req.noDeployBoundary === "NO_DEPLOY_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.oneRunOnlyFutureRequirement === "ONE_RUN_ONLY_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.noRetryNoSecondRunFutureRequirement === "NO_RETRY_NO_SECOND_RUN_FUTURE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.stopConditionsRequirement === "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.rollbackRequirement === "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.killSwitchRequirement === "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY" &&
      req.expectedEvidencePassCriteriaPlaceholder === "EXPECTED_EVIDENCE_PASS_CRITERIA_PLACEHOLDER_ONLY" &&
      req.expectedEvidenceFailCriteriaPlaceholder === "EXPECTED_EVIDENCE_FAIL_CRITERIA_PLACEHOLDER_ONLY" &&
      req.evidenceCaptureBoundary === "EVIDENCE_CAPTURE_BOUNDARY_PLACEHOLDER_ONLY" &&
      req.freshOwnerApprovalRequiredAfterPacket === "FRESH_OWNER_APPROVAL_REQUIRED_AFTER_PACKET_PLACEHOLDER_ONLY" &&
      req.ownerApprovalNotIncluded === "OWNER_APPROVAL_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      req.ownerDecisionNotIncluded === "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      req.noDecisionOptionSelected === "NO_DECISION_OPTION_SELECTED_PLACEHOLDER_ONLY" &&
      req.noRequestTypeSelected === "NO_REQUEST_TYPE_SELECTED_PLACEHOLDER_ONLY" &&
      req.noFuturePathSelected === "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY" &&
      req.noPacketFieldSelectedAsAction === "NO_PACKET_FIELD_SELECTED_AS_ACTION_PLACEHOLDER_ONLY" &&
      req.unsafeApprovalWordingGuard === "UNSAFE_APPROVAL_WORDING_GUARD_PLACEHOLDER_ONLY" &&
      req.forbiddenRealValuesGuard === "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY"
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
      unsafe.evidenceApprovedBlocked === true
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
    "v19.8 เป็นร่างซอง exact demo command/target/evidence เท่านั้น เพื่อเตรียมข้อมูลให้ลุงเด่น review ก่อนตัดสินใจจริง ยังไม่ใช่ GO ยังไม่ใช่ execution และยังไม่แตะของจริง",
    "v19.8 ยังไม่ใช่ approval และยังไม่ให้รันอะไร ขั้นถัดไปถ้าจะทดลองจริงต้องให้ลุงเด่นมี fresh owner approval แยกชัดเจนก่อน controlled owner-only one-run ครั้งเดียวเสมอ"
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
    "exact packet draft only",
    "demo command target evidence draft only",
    "review only",
    "placeholder only",
    "not selected",
    "not decision",
    "not approval",
    "not GO",
    "not execution",
    "command not executable by agent",
    "target not callable by agent",
    "evidence expected only",
    "no packet field selected as action",
    "safe default is hold/no action",
    "fresh owner approval required after packet",
    "v19.8 is separated from v19.7/v19.6/v19.5"
  ])
);

ok(
  "final decision wording exists",
  doc.includes("V19.8 EXACT DEMO COMMAND TARGET EVIDENCE PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION") &&
    fixtureRaw.includes("\"finalDecision\": \"V19.8 EXACT DEMO COMMAND TARGET EVIDENCE PACKET CLOSED - READY FOR OWNER REVIEW ONLY / NO EXECUTION\"")
);

console.log(`\nDone v19.8 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
