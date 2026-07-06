/**
 * v18.7 owner review index validator
 * Static checks only. Index-only, review-only, no-execution, placeholder-only.
 *
 * npm run test:v18.7
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v18.7-owner-review-index.md";
const FIXTURE_PATH = "docs/examples/v18.7-owner-review-index.synthetic.json";
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
    "not approval",
    "not go",
    "not execution",
    "does not authorize action",
    "index-only",
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

console.log("=== v18.7 Owner Review Index Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v18.7 owner review index correctly",
  /v18\.7 — Owner Review Index/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v18.7\"") &&
    fixtureRaw.includes("\"executionType\": \"owner-review-index only\"")
);

ok(
  "doc/fixture include index-only review-only no-approval no-go no-execution placeholder-only",
  hasEveryLine(combined, [
    "INDEX ONLY",
    "REVIEW ONLY",
    "NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NO APPROVAL",
    "NO GO",
    "NOT REAL-VALUE INSERTION"
  ])
);

ok(
  "baseline confirms v13-v17 and v18.0-v18.6 closures",
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
    "v18.7 is an owner review index only"
  ])
);

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV186ASection",
  "closedBaselineCarryForwardSection",
  "v187ScopeSection",
  "indexOnlyReminderSection",
  "reviewOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "v18IndexPurposeSection",
  "v180IntakeIndexEntrySection",
  "v181OwnerReviewPacketIndexEntrySection",
  "v182FuturePathMatrixIndexEntrySection",
  "v183PrerequisiteChecklistIndexEntrySection",
  "v184RequestTypeClarificationIndexEntrySection",
  "v185DraftSkeletonIndexEntrySection",
  "v186SafetyGateIndexEntrySection",
  "v186AHoldFixIndexEntrySection",
  "v18CurrentClosureSummarySection",
  "ownerReviewOrderSection",
  "ownerWhatToLookForSection",
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
  "CURRENT_STATUS_AFTER_V186A_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V187_SCOPE_PLACEHOLDER_ONLY",
  "INDEX_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "V18_INDEX_PURPOSE_PLACEHOLDER_ONLY",
  "V180_INTAKE_INDEX_ENTRY_PLACEHOLDER_ONLY",
  "V181_OWNER_REVIEW_PACKET_INDEX_ENTRY_PLACEHOLDER_ONLY",
  "V182_FUTURE_PATH_MATRIX_INDEX_ENTRY_PLACEHOLDER_ONLY",
  "V183_PREREQUISITE_CHECKLIST_INDEX_ENTRY_PLACEHOLDER_ONLY",
  "V184_REQUEST_TYPE_CLARIFICATION_INDEX_ENTRY_PLACEHOLDER_ONLY",
  "V185_DRAFT_SKELETON_INDEX_ENTRY_PLACEHOLDER_ONLY",
  "V186_SAFETY_GATE_INDEX_ENTRY_PLACEHOLDER_ONLY",
  "V186A_HOLD_FIX_INDEX_ENTRY_PLACEHOLDER_ONLY",
  "V18_CURRENT_CLOSURE_SUMMARY_PLACEHOLDER_ONLY",
  "OWNER_REVIEW_ORDER_PLACEHOLDER_ONLY",
  "OWNER_WHAT_TO_LOOK_FOR_PLACEHOLDER_ONLY",
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

const requiredIndexEntryLines = [
  "v18.0 Separate future owner request intake: review/index reference only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.1 Owner intake review packet: review/index reference only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.2 Owner future path selection matrix: review/index reference only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.3 Future request prerequisite checklist: review/index reference only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.4 Owner future request type clarification packet: review/index reference only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.5 Owner future request draft skeleton: review/index reference only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.6 Skeleton safety review gate: review/index reference only, not approval, not execution, not GO, no real values included, separate future request required if continuing",
  "v18.6A HOLD fix wording guard closure: review/index reference only, not approval, not execution, not GO, no real values included, separate future request required if continuing"
];
ok("doc includes required index entry lines", hasEveryLine(doc, requiredIndexEntryLines));

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
  ok("package has test:v18.7 script", scripts["test:v18.7"] === "tsx scripts/test-v187-owner-review-index.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "indexOnly",
    "reviewOnly",
    "documentationOnly",
    "fixtureOnly",
    "validatorOnly",
    "placeholderOnly",
    "notOwnerApproval",
    "notGo",
    "notExecution",
    "notRealValueInsertion",
    "notUsableForExecution",
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
    "noPII",
    "noRealLeadAction",
    "noRealDealerAction",
    "indexEntriesPlaceholderOnly"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline object has v13-v17 and v18.0-v18.6 closed",
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
      baseline["v18.6A"] === "HOLD FIX WORDING GUARD CLOSURE COMPLETED"
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
    "v18.7 separation flags true",
    separation.v187SeparatedFromV186A === true &&
      separation.v187SeparatedFromV186 === true &&
      separation.v187SeparatedFromV185 === true &&
      separation.v187SeparatedFromV184 === true &&
      separation.v187SeparatedFromV183 === true &&
      separation.v187SeparatedFromV182 === true &&
      separation.v187SeparatedFromV181 === true &&
      separation.v187SeparatedFromV180 === true &&
      separation.v187SeparatedFromV17 === true &&
      separation.v187DoesNotApproveExecution === true &&
      separation.v187DoesNotApproveGo === true &&
      separation.v187DoesNotApproveRealValueInsertion === true
  );

  ok(
    "index entries exist and are placeholder-only non-authorizing",
    Array.isArray(root.indexEntries) &&
      root.indexEntries.length === 8 &&
      root.indexEntries.every((entry: unknown) => {
        const e = asRecord(entry);
        return (
          typeof e.entryName === "string" &&
          e.placeholderOnly === true &&
          e.reviewIndexReferenceOnly === true &&
          e.notApproval === true &&
          e.notExecution === true &&
          e.notGo === true &&
          e.noRealValuesIncluded === true &&
          e.separateFutureRequestRequiredIfContinuing === true &&
          e.doesNotAuthorizeAction === true
        );
      })
  );

  const order = asRecord(root.ownerReviewOrder);
  ok("owner review order exists", order.placeholder === "OWNER_REVIEW_ORDER_PLACEHOLDER_ONLY" && order.exists === true);

  const lookFor = asRecord(root.ownerWhatToLookFor);
  ok("owner what-to-look-for exists", lookFor.placeholder === "OWNER_WHAT_TO_LOOK_FOR_PLACEHOLDER_ONLY" && lookFor.exists === true);

  const decision = asRecord(root.ownerDecisionNotIncluded);
  ok(
    "owner decision not included",
    decision.placeholder === "OWNER_DECISION_NOT_INCLUDED_PLACEHOLDER_ONLY" && decision.notIncluded === true
  );

  const separate = asRecord(root.futureSeparateRequestReminder);
  ok("future separate request reminder exists", separate.placeholder === "FUTURE_SEPARATE_REQUEST_REMINDER_PLACEHOLDER_ONLY" && separate.exists === true);

  const req = asRecord(root.futureSeparationRequirements);
  ok(
    "future separation requirements exist",
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

  const hold = asRecord(root.safeDefaultHoldNoAction);
  ok("safe default is hold/no action", hold.safeDefaultHold === "SAFE_DEFAULT_HOLD_PLACEHOLDER_ONLY" && hold.isHoldNoAction === true);
}

ok(
  "doc contains exact owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v18.7 เป็นสารบัญให้ลุงเด่นทบทวนเอกสาร v18.0 ถึง v18.6 ที่ปิดแล้วเท่านั้น ยังไม่ใช่ GO ยังไม่ใช่ approval และยังไม่ใช่ execution",
    "v18.7 ช่วยให้ลุงเด่นเห็นภาพรวมก่อนตัดสินใจอนาคต แต่ถ้าจะเดินต่อจริง ต้องเปิดงานใหม่แยกพร้อม prerequisite ครบ และหากเกี่ยวกับการรันจริงต้องมี fresh owner approval ก่อนเสมอ"
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

ok(
  "doc carries required reminders",
  hasEveryLine(doc, [
    "owner review order exists and is documented",
    "owner decision is not included in this index",
    "future separate request reminder remains mandatory if continuing",
    "safe default is hold/no action"
  ])
);

ok(
  "doc includes final decision wording",
  doc.includes("V18.7 OWNER REVIEW INDEX CLOSED — READY FOR OWNER REVIEW ONLY / NO EXECUTION")
);

console.log(`\nDone v18.7 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
