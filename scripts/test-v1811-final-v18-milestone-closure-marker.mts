/**
 * v18.11 final v18 milestone closure marker validator
 * Static checks only. Milestone-closure-only, review-only, placeholder-only.
 *
 * npm run test:v18.11
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v18.11-final-v18-milestone-closure-marker.md";
const FIXTURE_PATH = "docs/examples/v18.11-final-v18-milestone-closure-marker.synthetic.json";
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

const UNSAFE_APPROVAL_TOKEN_PREFIX = "UNSAFE_APPROVAL_PHRASE_";

function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unsafeTokenToPattern(token: string): RegExp {
  if (!token.startsWith(UNSAFE_APPROVAL_TOKEN_PREFIX)) {
    throw new Error(`invalid unsafe approval token: ${token}`);
  }

  const words = token
    .slice(UNSAFE_APPROVAL_TOKEN_PREFIX.length)
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
    "final milestone closure only",
    "document closure only",
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
    "does not authorize action",
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

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV1810ASection",
  "closedBaselineCarryForwardSection",
  "v1811ScopeSection",
  "finalV18MilestoneClosureOnlySection",
  "finalMarkerOnlyReminderSection",
  "reviewOnlyReminderSection",
  "placeholderOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "v18ClosedDocumentChainSection",
  "v180ClosureReferenceSection",
  "v181ClosureReferenceSection",
  "v182ClosureReferenceSection",
  "v183ClosureReferenceSection",
  "v184ClosureReferenceSection",
  "v185ClosureReferenceSection",
  "v186ClosureReferenceSection",
  "v186AHoldFixClosureReferenceSection",
  "v187ClosureReferenceSection",
  "v188ClosureReferenceSection",
  "v189ClosureReferenceSection",
  "v1810AClosureReferenceSection",
  "v18FinalClosureMeaningSection",
  "v18FinalClosureNotApprovalSection",
  "v18FinalClosureNotGoSection",
  "v18FinalClosureNotExecutionSection",
  "v18FinalClosureNotRealValueInsertionSection",
  "v18FinalClosureNotOwnerExecutionApprovalSection",
  "v18FinalClosureNotOneRunApprovalSection",
  "v18FinalClosureNotDeployApprovalSection",
  "v18FinalClosureNotPublicProductionApprovalSection",
  "v18FinalClosureNotRealLeadApprovalSection",
  "v18FinalClosureNotRealDealerApprovalSection",
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
  "unsafeApprovalWordingGuardSection",
  "safeDefaultHoldSection",
  "safeNegativeWordingSection",
  "exactNextOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V1810A_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V1811_SCOPE_PLACEHOLDER_ONLY",
  "FINAL_V18_MILESTONE_CLOSURE_ONLY_PLACEHOLDER_ONLY",
  "FINAL_MARKER_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "PLACEHOLDER_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "V18_CLOSED_DOCUMENT_CHAIN_PLACEHOLDER_ONLY",
  "V180_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V181_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V182_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V183_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V184_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V185_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V186_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V186A_HOLD_FIX_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V187_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V188_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V189_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V1810A_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_MEANING_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_APPROVAL_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_GO_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_EXECUTION_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_REAL_VALUE_INSERTION_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_OWNER_EXECUTION_APPROVAL_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_ONE_RUN_APPROVAL_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_DEPLOY_APPROVAL_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_PUBLIC_PRODUCTION_APPROVAL_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_REAL_LEAD_APPROVAL_PLACEHOLDER_ONLY",
  "V18_FINAL_CLOSURE_NOT_REAL_DEALER_APPROVAL_PLACEHOLDER_ONLY",
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
  "UNSAFE_APPROVAL_WORDING_GUARD_PLACEHOLDER_ONLY",
  "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "EXACT_NEXT_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];

const closureReferenceKeyMap = {
  "v18.0": "V180_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.1": "V181_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.2": "V182_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.3": "V183_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.4": "V184_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.5": "V185_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.6": "V186_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.6A": "V186A_HOLD_FIX_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.7": "V187_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.8": "V188_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.9": "V189_CLOSURE_REFERENCE_PLACEHOLDER_ONLY",
  "v18.10A": "V1810A_CLOSURE_REFERENCE_PLACEHOLDER_ONLY"
} as const;

console.log("=== v18.11 Final v18 Milestone Closure Marker Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v18.11 final milestone closure marker correctly",
  /v18\.11 — Final v18 Milestone Closure Marker/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v18.11\"") &&
    fixtureRaw.includes("\"executionType\": \"final-v18-milestone-closure-marker only\"")
);

ok(
  "doc/fixture include milestone-closure-only final-marker-only review-only placeholder-only no-approval no-go no-execution",
  hasEveryLine(combined, [
    "MILESTONE CLOSURE ONLY",
    "FINAL MARKER ONLY",
    "REVIEW ONLY",
    "PLACEHOLDER ONLY",
    "NO EXECUTION",
    "NO APPROVAL",
    "NO GO",
    "NOT REAL-VALUE INSERTION"
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
  ok(
    "package has test:v18.11 script",
    scripts["test:v18.11"] === "tsx scripts/test-v1811-final-v18-milestone-closure-marker.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "finalV18MilestoneClosureOnly",
    "finalMarkerOnly",
    "reviewOnly",
    "placeholderOnly",
    "documentationOnly",
    "fixtureOnly",
    "validatorOnly",
    "notOwnerApproval",
    "notGo",
    "notExecution",
    "notRealValueInsertion"
  ];
  ok("top-level closure booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline confirms v13-v17 and v18.0-v18.10A chain",
    baseline.v13 === "CLOSED" &&
      baseline.v14 === "CLOSED" &&
      baseline.v15 === "CLOSED" &&
      baseline.v16 === "CLOSED / PLANNING-ONLY" &&
      baseline["v16.11"] === "OWNER ACKNOWLEDGMENT RECORD CLOSED BUT NOT APPROVAL" &&
      baseline["v17.0-v17.12"] === "CLOSED" &&
      baseline.v17FinalMilestoneClosure === "COMPLETED" &&
      baseline["v18.0"] === "SEPARATE FUTURE OWNER REQUEST INTAKE CLOSED" &&
      baseline["v18.10A"] ===
        "HOLD FIX CLOSED — V18.10 OWNER ACKNOWLEDGMENT REVIEW CLOSURE RECORD READY FOR OWNER REVIEW ONLY / NO EXECUTION"
  );

  const sections = asRecord(root.sections);
  ok("required sections map complete", requiredSections.every((k) => typeof sections[k] === "string"));

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => root.requiredPlaceholderValues.includes(p))
  );

  const closureRefs = asRecord(root.closureReferences);
  ok(
    "v18.0-v18.10A closure references exist",
    Object.keys(closureReferenceKeyMap).every((k) => typeof closureRefs[k] === "object")
  );
  ok(
    "every closure reference is placeholder-only and non-approval/non-execution/non-go",
    Object.entries(closureReferenceKeyMap).every(([key, placeholder]) => {
      const entry = asRecord(closureRefs[key]);
      return (
        entry.referencePlaceholder === placeholder &&
        entry.closureReferenceOnly === true &&
        entry.documentClosureOnly === true &&
        entry.notApproval === true &&
        entry.notExecution === true &&
        entry.notGo === true &&
        entry.noRealValuesIncluded === true &&
        entry.separateFutureRequestRequiredIfContinuing === true
      );
    })
  );

  const req = asRecord(root.futureSeparationRequirements);
  ok(
    "future separation requirements exist",
    req.ownerDecisionNotIncluded === "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY" &&
      req.noFuturePathSelected === "NO_FUTURE_PATH_SELECTED_PLACEHOLDER_ONLY" &&
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
  ok(
    "unsafe approval label tokens complete in fixture",
    UNSAFE_APPROVAL_LABEL_TOKENS.every((token) => unsafeLabelTokens.includes(token))
  );

  const hold = asRecord(root.safeDefaultHoldNoAction);
  ok("safe default is hold/no action", hold.safeDefaultHold === "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY" && hold.isHoldNoAction === true);
}

ok(
  "doc includes closure references v18.0-v18.10A",
  hasEveryLine(doc, [
    "v18.0 closure reference only",
    "v18.1 closure reference only",
    "v18.2 closure reference only",
    "v18.3 closure reference only",
    "v18.4 closure reference only",
    "v18.5 closure reference only",
    "v18.6 closure reference only",
    "v18.6A closure reference only",
    "v18.7 closure reference only",
    "v18.8 closure reference only",
    "v18.9 closure reference only",
    "v18.10A closure reference only"
  ])
);

ok(
  "doc closure references carry required non-approval/non-execution/non-go constraints",
  hasEveryLine(doc, [
    "document closure only",
    "not approval",
    "not execution",
    "not GO",
    "no real values included",
    "separate future request required if continuing"
  ])
);

ok(
  "doc contains exact owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v18.11 เป็น marker ปิด milestone v18 ทั้งชุดในเชิงเอกสารเท่านั้น ยืนยันว่า v18.0 ถึง v18.10A ปิดครบแล้ว แต่ยังไม่ใช่ GO ยังไม่ใช่ approval และยังไม่ใช่ execution",
    "หลัง v18.11 หากลุงเด่นต้องการเดินต่อไปสู่ของจริง ต้องเปิด future request ใหม่แยก ระบุ prerequisite, exact command, exact target และ expected evidence ให้ครบ และต้องมี fresh owner approval ก่อนเสมอ"
  ])
);

ok(
  "doc includes unsafe approval label tokens only",
  hasEveryLine(
    doc,
    UNSAFE_APPROVAL_LABEL_TOKENS.map((token) => `\`${token}\``)
  ) && !doc.includes("block unsafe wording:")
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

const forbiddenUnsafeApprovalPatterns: Array<[string, RegExp]> = [
  ...UNSAFE_APPROVAL_LABEL_TOKENS.map((token) => [token, unsafeTokenToPattern(token)] as [string, RegExp])
];
for (const [name, re] of forbiddenUnsafeApprovalPatterns) {
  ok(`no unsafe approval wording for ${name}`, !hasUnsafeInterpretationPhrase(combined, re, { allowSafeNegativeContext: true }));
}

ok(
  "doc carries required negative reminders",
  hasEveryLine(doc, [
    "owner decision is not included",
    "no future path selected",
    "safe default is hold/no action",
    "v18 final closure is not approval",
    "v18 final closure is not GO",
    "v18 final closure is not execution"
  ])
);

ok(
  "doc includes final decision wording",
  doc.includes("V18.11 FINAL V18 MILESTONE CLOSURE CLOSED — READY FOR FUTURE SEPARATE OWNER REQUEST ONLY / NO EXECUTION")
);

console.log(`\nDone v18.11 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
