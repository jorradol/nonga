/**
 * v18.6 skeleton safety review gate validator
 * Static checks only. Gate-review-only, safety-review-only, no-execution, placeholder-only.
 *
 * npm run test:v18.6
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v18.6-skeleton-safety-review-gate.md";
const FIXTURE_PATH = "docs/examples/v18.6-skeleton-safety-review-gate.synthetic.json";
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
    "not approved",
    "not approval granted",
    "not execution allowed",
    "not go granted",
    "not real value inserted",
    "not ready to execute",
    "not one-run authorized",
    "not deploy authorized",
    "not production activated",
    "not public activated",
    "not real lead sent",
    "not real dealer activated",
    "is not",
    "does not",
    "not ",
    "must not",
    "cannot",
    "no "
  ];
  return safeMarkers.some((marker) => normalized.includes(marker));
}

function hasUnsafeInterpretationPhrase(
  source: string,
  phrase: string,
  options?: { allowSafeNegativeContext?: boolean }
): boolean {
  const normalizedPhrase = phrase.toLowerCase();
  const lines = source.split("\n");
  return lines.some((line) => {
    const normalizedLine = line.toLowerCase();
    if (!normalizedLine.includes(normalizedPhrase)) return false;
    if (options?.allowSafeNegativeContext && isSafeNegativeOrProhibitionContext(line)) return false;
    return true;
  });
}

console.log("=== v18.6 Skeleton Safety Review Gate Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v18.6 safety review gate correctly",
  /v18\.6 — Skeleton Safety Review Gate/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v18.6\"") &&
    fixtureRaw.includes("\"executionType\": \"skeleton-safety-review-gate only\"")
);

ok(
  "doc/fixture include gate-review-only safety-review-only review-only no-approval no-go no-execution placeholder-only",
  hasEveryLine(combined, [
    "GATE REVIEW ONLY",
    "SAFETY REVIEW ONLY",
    "REVIEW ONLY",
    "NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NO APPROVAL",
    "NO GO",
    "NOT REAL-VALUE INSERTION"
  ])
);

ok(
  "baseline confirms v13-v17 and v18.0-v18.5 closures",
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
    "v18.6 is a separate skeleton safety review gate only"
  ])
);

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusAfterV185Section",
  "closedBaselineCarryForwardSection",
  "v186ScopeSection",
  "gateReviewOnlyReminderSection",
  "safetyReviewOnlyReminderSection",
  "reviewOnlyReminderSection",
  "noApprovalReminderSection",
  "noGoReminderSection",
  "noExecutionReminderSection",
  "noRealValueInsertionReminderSection",
  "v18IntakeToSkeletonSummarySection",
  "skeletonSafetyReviewPurposeSection",
  "skeletonNotRealRequestGateSection",
  "skeletonNotApprovalGateSection",
  "skeletonNotGoGateSection",
  "skeletonNotExecutionGateSection",
  "skeletonNotRealValueInsertionGateSection",
  "skeletonNotOneRunApprovalGateSection",
  "skeletonNotDeployApprovalGateSection",
  "skeletonNotPublicProductionGateSection",
  "skeletonNotRealLeadGateSection",
  "skeletonNotRealDealerGateSection",
  "placeholderOnlyGateSection",
  "noRealValuesGateSection",
  "noRealValueRequestGateSection",
  "exactCommandPlaceholderSafetySection",
  "exactTargetPlaceholderSafetySection",
  "expectedEvidencePlaceholderSafetySection",
  "freshOwnerApprovalPlaceholderSafetySection",
  "oneRunNoRetryNoSecondRunSafetySection",
  "stopConditionsRollbackKillSwitchSafetySection",
  "boundaryPrecheckSafetySection",
  "tokenSecretPiiGuardSection",
  "publicProductionGuardSection",
  "realLeadGuardSection",
  "realDealerGuardSection",
  "runtimeProviderGeminiGuardSection",
  "liveEndpointManualGuessGuardSection",
  "thorDealerImportGuardSection",
  "forbiddenRealValuesGuardSection",
  "unsafeWordingReviewSection",
  "safeNegativeWordingSection",
  "ownerReviewOnlyActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];
ok("doc includes required section names", hasEveryLine(doc, requiredSections));

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_AFTER_V185_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "V186_SCOPE_PLACEHOLDER_ONLY",
  "GATE_REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "SAFETY_REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_REMINDER_PLACEHOLDER_ONLY",
  "NO_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NO_GO_REMINDER_PLACEHOLDER_ONLY",
  "NO_EXECUTION_REMINDER_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "V18_INTAKE_TO_SKELETON_SUMMARY_PLACEHOLDER_ONLY",
  "SKELETON_SAFETY_REVIEW_PURPOSE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_REAL_REQUEST_GATE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_APPROVAL_GATE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_GO_GATE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_EXECUTION_GATE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_REAL_VALUE_INSERTION_GATE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_ONE_RUN_APPROVAL_GATE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_DEPLOY_APPROVAL_GATE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_PUBLIC_PRODUCTION_GATE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_REAL_LEAD_GATE_PLACEHOLDER_ONLY",
  "SKELETON_NOT_REAL_DEALER_GATE_PLACEHOLDER_ONLY",
  "PLACEHOLDER_ONLY_GATE_PLACEHOLDER_ONLY",
  "NO_REAL_VALUES_GATE_PLACEHOLDER_ONLY",
  "NO_REAL_VALUE_REQUEST_GATE_PLACEHOLDER_ONLY",
  "EXACT_COMMAND_PLACEHOLDER_SAFETY_PLACEHOLDER_ONLY",
  "EXACT_TARGET_PLACEHOLDER_SAFETY_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_PLACEHOLDER_SAFETY_PLACEHOLDER_ONLY",
  "FRESH_OWNER_APPROVAL_PLACEHOLDER_SAFETY_PLACEHOLDER_ONLY",
  "ONE_RUN_NO_RETRY_NO_SECOND_RUN_SAFETY_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_ROLLBACK_KILL_SWITCH_SAFETY_PLACEHOLDER_ONLY",
  "BOUNDARY_PRECHECK_SAFETY_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY",
  "PUBLIC_PRODUCTION_GUARD_PLACEHOLDER_ONLY",
  "REAL_LEAD_GUARD_PLACEHOLDER_ONLY",
  "REAL_DEALER_GUARD_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY",
  "THOR_DEALER_IMPORT_GUARD_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY",
  "UNSAFE_WORDING_REVIEW_PLACEHOLDER_ONLY",
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "OWNER_REVIEW_ONLY_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];
ok("doc has required placeholder values", hasEveryLine(doc, requiredPlaceholders));

const requiredGateCheckLines = [
  "Skeleton is not a real request: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is not owner approval: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is not GO: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is not execution approval: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is not real-value insertion approval: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is not one-run approval: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is not deploy approval: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is not public/production approval: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is not real lead action: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is not real dealer action: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton is placeholder-only: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton contains no real values: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Skeleton does not ask for real values: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Exact command remains placeholder-only: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Exact target remains placeholder-only: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Expected evidence remains placeholder-only: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Fresh owner approval remains placeholder-only: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "One-run/no-retry/no-second-run remain future requirements only: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Stop/rollback/kill switch remain future requirements only: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Boundary precheck remains future requirement only: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action",
  "Safe default remains hold/no action: review-only, placeholder-only, not approval, not execution, not GO, does not authorize action"
];
ok("doc includes required gate check lines", hasEveryLine(doc, requiredGateCheckLines));

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
  ok("package has test:v18.6 script", scripts["test:v18.6"] === "tsx scripts/test-v186-skeleton-safety-review-gate.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "gateReviewOnly",
    "safetyReviewOnly",
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
    "gateChecksPlaceholderOnly",
    "skeletonDoesNotAskForRealValues",
    "skeletonNotUsableForExecution"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline object has v13-v17 and v18.0-v18.5 closed",
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
      baseline["v18.5"] === "OWNER FUTURE REQUEST DRAFT SKELETON CLOSED"
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
    "v18.6 separation flags true",
    separation.v186SeparatedFromV185 === true &&
      separation.v186SeparatedFromV184 === true &&
      separation.v186SeparatedFromV183 === true &&
      separation.v186SeparatedFromV182 === true &&
      separation.v186SeparatedFromV181 === true &&
      separation.v186SeparatedFromV180 === true &&
      separation.v186SeparatedFromV17 === true &&
      separation.v186DoesNotApproveExecution === true &&
      separation.v186DoesNotApproveGo === true &&
      separation.v186DoesNotApproveRealValueInsertion === true
  );

  ok(
    "gate checks exist and are placeholder-only non-authorizing",
    Array.isArray(root.gateChecks) &&
      root.gateChecks.length === 21 &&
      root.gateChecks.every((c: unknown) => {
        const check = asRecord(c);
        return (
          typeof check.checkName === "string" &&
          check.placeholderOnly === true &&
          check.reviewOnly === true &&
          check.notApproval === true &&
          check.notExecution === true &&
          check.notGo === true &&
          check.doesNotAuthorizeAction === true
        );
      })
  );

  const placeholderSafety = asRecord(root.placeholderSafety);
  ok(
    "placeholder safety blocks exist",
    placeholderSafety.exactCommandPlaceholderSafety === "EXACT_COMMAND_PLACEHOLDER_SAFETY_PLACEHOLDER_ONLY" &&
      placeholderSafety.exactTargetPlaceholderSafety === "EXACT_TARGET_PLACEHOLDER_SAFETY_PLACEHOLDER_ONLY" &&
      placeholderSafety.expectedEvidencePlaceholderSafety === "EXPECTED_EVIDENCE_PLACEHOLDER_SAFETY_PLACEHOLDER_ONLY" &&
      placeholderSafety.freshOwnerApprovalPlaceholderSafety === "FRESH_OWNER_APPROVAL_PLACEHOLDER_SAFETY_PLACEHOLDER_ONLY" &&
      placeholderSafety.oneRunNoRetryNoSecondRunSafety === "ONE_RUN_NO_RETRY_NO_SECOND_RUN_SAFETY_PLACEHOLDER_ONLY" &&
      placeholderSafety.stopConditionsRollbackKillSwitchSafety === "STOP_CONDITIONS_ROLLBACK_KILL_SWITCH_SAFETY_PLACEHOLDER_ONLY" &&
      placeholderSafety.boundaryPrecheckSafety === "BOUNDARY_PRECHECK_SAFETY_PLACEHOLDER_ONLY"
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

  const unsafeReview = asRecord(root.unsafeWordingReview);
  ok(
    "unsafe wording review exists",
    unsafeReview.placeholder === "UNSAFE_WORDING_REVIEW_PLACEHOLDER_ONLY" &&
      Array.isArray(unsafeReview.blockedPositiveInterpretations) &&
      unsafeReview.allowedOnlyInExplicitNegativeContext === true
  );

  const hold = asRecord(root.safeDefaultHoldNoAction);
  ok("safe default is hold/no action", hold.safeDefaultHold === true && hold.isHoldNoAction === true);
}

ok(
  "doc contains exact owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v18.6 เป็น gate review เพื่อตรวจว่าโครงร่าง v18.5 ยังปลอดภัยสำหรับให้ลุงเด่นทบทวนเท่านั้น ไม่ใช่คำขอจริง ไม่ใช่ GO ไม่ใช่ approval และไม่ใช่ execution",
    "ถ้า v18.6 ผ่าน ก็แปลว่า skeleton ยังอยู่ในกรอบเอกสาร placeholder-only เท่านั้น หากจะใช้จริงในอนาคตยังต้องเปิดงานใหม่แยกพร้อม prerequisite ครบและ fresh owner approval ก่อนเสมอ"
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

const unsafePositivePhrases = [
  "approved to run",
  "approval granted",
  "execution allowed",
  "go granted",
  "real value inserted",
  "ready to execute",
  "one-run authorized",
  "deploy authorized",
  "production activated",
  "public activated",
  "real lead sent",
  "real dealer activated"
];
for (const phrase of unsafePositivePhrases) {
  ok(
    `no unsafe positive interpretation ${phrase}`,
    !hasUnsafeInterpretationPhrase(combined, phrase, { allowSafeNegativeContext: true })
  );
}

ok(
  "doc includes safe negative wording lines",
  hasEveryLine(doc, [
    "not approved to run",
    "not approval granted",
    "not execution allowed",
    "not GO granted",
    "not real value inserted",
    "not ready to execute",
    "not one-run authorized",
    "not deploy authorized",
    "not production activated",
    "not public activated",
    "not real lead sent",
    "not real dealer activated"
  ])
);

ok(
  "doc includes final decision wording",
  doc.includes("V18.6 SKELETON SAFETY REVIEW GATE CLOSED — READY FOR OWNER REVIEW ONLY / NO EXECUTION")
);

console.log(`\nDone v18.6 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
