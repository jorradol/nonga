/**
 * v18.0 separate future owner request intake validator
 * Static checks only. Intake-only, future-request-prep-only, no-execution, placeholder-only.
 *
 * npm run test:v18.0
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v18.0-separate-future-owner-request-intake.md";
const FIXTURE_PATH = "docs/examples/v18.0-separate-future-owner-request-intake.synthetic.json";
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
    "does not approve",
    "is not approved",
    "not authorized",
    "does not authorize",
    "execution is not authorized",
    "execution is not allowed",
    "this intake does not authorize execution",
    "intake is not approval",
    "has not started",
    "has not been inserted",
    "no real-value insertion",
    "must not",
    "do not include positive wording implying",
    " is not ",
    " no ",
    "does not",
    "cannot",
    "hold"
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

console.log("=== v18.0 Separate Future Owner Request Intake Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v18.0 intake-only correctly",
  /v18\.0 — Separate Future Owner Request Intake/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v18.0\"") &&
    fixtureRaw.includes("\"executionType\": \"separate-future-owner-request-intake only\"")
);

ok(
  "doc/fixture include intake-only future-request-prep-only no-execution placeholder-only",
  hasEveryLine(combined, [
    "INTAKE ONLY",
    "FUTURE REQUEST PREP ONLY",
    "NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NOT OWNER APPROVAL",
    "NOT GO",
    "NOT REAL-VALUE INSERTION"
  ])
);

ok(
  "baseline confirms v13-v17.12 closed and v18 separate",
  hasEveryLine(doc, [
    "v13 = CLOSED",
    "v14 = CLOSED",
    "v15 = CLOSED",
    "v16 planning = CLOSED",
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
    "v18.0 is a new separate intake-only document set"
  ])
);

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusSection",
  "closedMilestoneBaselineSection",
  "v18IntakeScopeSection",
  "whyV18IsSeparateFromV17Section",
  "notApprovalReminderSection",
  "notGoReminderSection",
  "notExecutionRequestReminderSection",
  "notRealValueInsertionReminderSection",
  "ownerFutureIntentPlaceholderSection",
  "possibleFutureRequestTypesSection",
  "futureRequestPrerequisitesSection",
  "freshOwnerApprovalRequirementSection",
  "exactCommandRequirementSection",
  "exactTargetRequirementSection",
  "expectedEvidenceRequirementSection",
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
  "safeNegativeWordingSection",
  "ownerFutureDecisionOptionsSection",
  "finalOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];
ok("doc includes required section names", hasEveryLine(doc, requiredSections));

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_PLACEHOLDER_ONLY",
  "CLOSED_MILESTONE_BASELINE_PLACEHOLDER_ONLY",
  "V18_INTAKE_SCOPE_PLACEHOLDER_ONLY",
  "V18_SEPARATE_FROM_V17_PLACEHOLDER_ONLY",
  "NOT_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NOT_GO_REMINDER_PLACEHOLDER_ONLY",
  "NOT_EXECUTION_REQUEST_REMINDER_PLACEHOLDER_ONLY",
  "NOT_REAL_VALUE_INSERTION_REMINDER_PLACEHOLDER_ONLY",
  "OWNER_FUTURE_INTENT_PLACEHOLDER_ONLY",
  "POSSIBLE_FUTURE_REQUEST_TYPES_PLACEHOLDER_ONLY",
  "FUTURE_REQUEST_PREREQUISITES_PLACEHOLDER_ONLY",
  "FRESH_OWNER_APPROVAL_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXACT_COMMAND_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXACT_TARGET_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXPECTED_EVIDENCE_REQUIREMENT_PLACEHOLDER_ONLY",
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
  "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY",
  "OWNER_FUTURE_DECISION_OPTIONS_PLACEHOLDER_ONLY",
  "FINAL_OWNER_ACTION_PLACEHOLDER_ONLY",
  "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY",
  "FINAL_DECISION_PLACEHOLDER_ONLY"
];
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
  ok("package has test:v18.0 script", scripts["test:v18.0"] === "tsx scripts/test-v180-separate-future-owner-request-intake.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "intakeOnly",
    "futureRequestPrepOnly",
    "placeholderOnly",
    "notOwnerApproval",
    "notGo",
    "notRealValueInsertion",
    "notRealDealerAction",
    "notRealLeadAction",
    "noExecution",
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
    "noPII"
  ];
  ok("top-level boundary booleans are true", boolKeys.every((key) => root[key] === true));

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline object has v17.0-v17.12 closed and v18 separate",
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
      baseline["v18.0"] === "SEPARATE INTAKE-ONLY / FUTURE-REQUEST-PREP-ONLY / NO-EXECUTION / PLACEHOLDER-ONLY"
  );

  const sections = asRecord(root.sections);
  ok("required sections map complete", requiredSections.every((k) => typeof sections[k] === "string"));

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => root.requiredPlaceholderValues.includes(p))
  );

  ok(
    "possible future request types complete and placeholder-only",
    Array.isArray(root.possibleFutureRequestTypes) &&
      root.possibleFutureRequestTypes.includes("review-only clarification request") &&
      root.possibleFutureRequestTypes.includes("revise documentation request") &&
      root.possibleFutureRequestTypes.includes("future real-value insertion request draft") &&
      root.possibleFutureRequestTypes.includes("future execution request draft") &&
      root.possibleFutureRequestTypes.includes("future owner approval packet draft") &&
      root.possibleFutureRequestTypes.includes("hold all execution") &&
      root.possibleFutureRequestTypes.includes("no GO decision yet")
  );
}

ok(
  "doc contains exact owner-friendly thai summary lines",
  hasEveryLine(doc, [
    "v18.0 เป็นเอกสารรับโจทย์ชุดใหม่หลังปิด v17 สำหรับลุงเด่นเท่านั้น ยังไม่ใช่การอนุมัติให้ใส่ค่าจริง ยังไม่ใช่การอนุมัติให้รันจริง และยังไม่ใช่ GO",
    "v18.0 แยกจาก v17 ที่ปิดแล้วโดยชัดเจน หากลุงเด่นต้องการไปต่อ ต้องมีงานใหม่พร้อม exact command, exact target, expected evidence และ fresh owner approval โดยยังคุม one-run, no-retry และ no-second-run เหมือนเดิม"
  ])
);

ok(
  "doc includes possible future request type lines and non-approval reminder",
  hasEveryLine(doc, [
    "review-only clarification request",
    "revise documentation request",
    "future real-value insertion request draft",
    "future execution request draft",
    "future owner approval packet draft",
    "hold all execution",
    "no GO decision yet",
    "all options above are placeholder-only, not approval, and not execution"
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

console.log(`\nDone v18.0 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
