/**
 * v17.9 owner review closure record validator
 * Static checks only. Closure-record-only, no-execution, placeholder-only.
 *
 * npm run test:v17.9
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v17.9-owner-review-closure-record.md";
const FIXTURE_PATH = "docs/examples/v17.9-owner-review-closure-record.synthetic.json";
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
    "do not include positive wording implying",
    "must not",
    "not approved",
    "does not approve",
    "is not approved",
    "not authorized",
    "does not authorize",
    "execution is not authorized",
    "execution is not allowed",
    "this closure record does not authorize execution",
    "closure record is not approval",
    "has not started",
    "has not been inserted",
    "no real-value insertion",
    " is not ",
    " no ",
    "does not",
    "cannot",
    "hold",
    "no-go"
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

console.log("=== v17.9 Owner Review Closure Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v17.9 correctly",
  /v17\.9 — Owner Review Closure Record/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v17.9\"") &&
    fixtureRaw.includes("\"executionType\": \"owner-review-closure-record only\"")
);

ok(
  "status is closure-record-only review-closure-only no-execution placeholder-only not-owner-approval not-go",
  hasEveryLine(doc, [
    "v17.9 = OWNER REVIEW CLOSURE RECORD ONLY",
    "CLOSURE RECORD ONLY / REVIEW CLOSURE ONLY / NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NOT OWNER APPROVAL",
    "NOT GO",
    "NOT REAL-VALUE INSERTION",
    "NOT REAL DEALER ACTION",
    "NOT REAL LEAD ACTION"
  ])
);

ok(
  "baseline includes required closure states",
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
    "v17.6 = CLOSED via v17.6A HOLD FIX",
    "v17.7 = VERIFIED via v17.7A RECONCILIATION",
    "v17.8 = CLOSED",
    "v17.9 is closure-record-only / no-execution / placeholder-only"
  ])
);

const requiredSections = [
  "ownerPlainThaiSummarySection",
  "currentStatusSection",
  "closedBaselineSection",
  "v17ReviewClosureScopeSection",
  "v17DocumentClosureMapSection",
  "ownerReviewReadyStatementSection",
  "notApprovalReminderSection",
  "notGoReminderSection",
  "notExecutionRequestReminderSection",
  "futureRequestOnlyReminderSection",
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
  "ownerNextDecisionOptionsSection",
  "finalOwnerActionSection",
  "finalBoundaryCarryForwardSection",
  "finalDecisionSection"
];
ok("doc includes required section names", hasEveryLine(doc, requiredSections));

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_PLACEHOLDER_ONLY",
  "V17_REVIEW_CLOSURE_SCOPE_PLACEHOLDER_ONLY",
  "V17_DOCUMENT_CLOSURE_MAP_PLACEHOLDER_ONLY",
  "OWNER_REVIEW_READY_STATEMENT_PLACEHOLDER_ONLY",
  "NOT_APPROVAL_REMINDER_PLACEHOLDER_ONLY",
  "NOT_GO_REMINDER_PLACEHOLDER_ONLY",
  "NOT_EXECUTION_REQUEST_REMINDER_PLACEHOLDER_ONLY",
  "FUTURE_REQUEST_ONLY_REMINDER_PLACEHOLDER_ONLY",
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
  "OWNER_NEXT_DECISION_OPTIONS_PLACEHOLDER_ONLY",
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
  ok("package has test:v17.9 script", scripts["test:v17.9"] === "tsx scripts/test-v179-owner-review-closure-record.mts");
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  const boolKeys = [
    "closureRecordOnly",
    "reviewClosureOnly",
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
    "baseline object complete",
    baseline["v17.7"] === "VERIFIED VIA V17.7A RECONCILIATION" &&
      baseline["v17.8"] === "CLOSED" &&
      baseline["v17.9"] === "CLOSURE-RECORD-ONLY / NO-EXECUTION / PLACEHOLDER-ONLY"
  );

  const sections = asRecord(root.sections);
  ok("required sections map complete", requiredSections.every((k) => typeof sections[k] === "string"));

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => (root.requiredPlaceholderValues as string[]).includes(p))
  );

  const closureMap = asRecord(root.v17DocumentClosureMap);
  ok(
    "v17 closure map covers v17.0-v17.9 with non-approval flags",
    !!closureMap["v17.0"] &&
      !!closureMap["v17.1"] &&
      !!closureMap["v17.2"] &&
      !!closureMap["v17.3"] &&
      !!closureMap["v17.4"] &&
      !!closureMap["v17.5"] &&
      !!closureMap["v17.6"] &&
      !!closureMap["v17.7"] &&
      !!closureMap["v17.8"] &&
      !!closureMap["v17.9"] &&
      closureMap.closureMapIsNotApproval === true &&
      closureMap.closureMapIsNotExecutionPath === true
  );

  ok(
    "owner next decision options complete",
    Array.isArray(root.ownerNextDecisionOptions) &&
      root.ownerNextDecisionOptions.includes("review only and stop") &&
      root.ownerNextDecisionOptions.includes("ask for clarification document") &&
      root.ownerNextDecisionOptions.includes("request revision to review docs") &&
      root.ownerNextDecisionOptions.includes("consider separate future request later") &&
      root.ownerNextDecisionOptions.includes("hold all execution") &&
      root.ownerNextDecisionOptions.includes("no GO decision yet")
  );
}

ok(
  "doc contains required thai summary exact lines",
  hasEveryLine(doc, [
    "v17.9 เป็นบันทึกปิดชุดเอกสารตรวจทาน v17 สำหรับลุงเด่นเท่านั้น ยังไม่ใช่การอนุมัติให้ใส่ค่าจริง ยังไม่ใช่การอนุมัติให้รันจริง และยังไม่ใช่ GO",
    "หลัง v17.9 สิ่งที่ปิดคือชุดเอกสารตรวจทาน ไม่ใช่การเปิดใช้งานจริง หากลุงเด่นต้องการไปต่อในอนาคต ต้องเปิดงานใหม่แยกต่างหาก พร้อม exact command, exact target, expected evidence และ fresh owner approval"
  ])
);

ok(
  "doc includes owner next decision options lines",
  hasEveryLine(doc, [
    "review only and stop",
    "ask for clarification document",
    "request revision to review docs",
    "consider separate future request later",
    "hold all execution",
    "no GO decision yet"
  ])
);

ok(
  "doc includes safe negative/prohibition context lines",
  hasEveryLine(doc, [
    "not approved",
    "does not approve",
    "is not approved",
    "not authorized",
    "does not authorize",
    "execution is not authorized",
    "execution is not allowed",
    "this closure record does not authorize execution",
    "closure record is not approval",
    "has not started",
    "has not been inserted",
    "no real-value insertion"
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

console.log(`\nDone v17.9 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
