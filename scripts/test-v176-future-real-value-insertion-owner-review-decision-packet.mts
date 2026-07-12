/**
 * v17.6 future real-value insertion owner review decision packet validator
 * Static checks only. Review-only, no-execution, placeholder-only.
 *
 * npm run test:v17.6
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v17.6-future-real-value-insertion-owner-review-decision-packet.md";
const FIXTURE_PATH =
  "docs/examples/v17.6-future-real-value-insertion-owner-review-decision-packet.synthetic.json";
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
    "do not include wording that implies",
    "must not",
    "not approved",
    "does not approve",
    "is not approved",
    "not authorized",
    "does not authorize",
    "no execution",
    "execution is not authorized",
    "execution is not allowed",
    "execution is not permitted",
    "no execution is allowed by this packet",
    "this packet does not authorize execution",
    "draft is not approval",
    "not already started",
    "has not started",
    "real-value insertion has not started",
    "not already inserted",
    "has not been inserted",
    "real values have not been inserted",
    "no real-value insertion",
    "prevent interpretation as",
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

console.log("=== v17.6 Future Real-Value Insertion Owner Review Decision Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v17.6 correctly",
  /v17\.6 — Future Real-Value Insertion Owner Review Decision Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v17.6\"") &&
    fixtureRaw.includes("\"executionType\": \"future-real-value-insertion-owner-review-decision-packet only\"")
);

ok(
  "status is review-only no-execution placeholder-only not-owner-approval not-go not-real-value-insertion",
  hasEveryLine(doc, [
    "v17.6 = FUTURE REAL-VALUE INSERTION OWNER REVIEW DECISION PACKET ONLY",
    "REVIEW ONLY / NO EXECUTION",
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
    "v17.6 is review-only / no-execution / placeholder-only"
  ])
);

ok(
  "doc includes required section names",
  hasEveryLine(doc, [
    "ownerPlainThaiSummarySection",
    "currentStatusSection",
    "whatIsAlreadyClosedSection",
    "whatV17_6IsSection",
    "whatV17_6IsNotSection",
    "ownerDecisionMapSection",
    "decisionOptionReviewOnlySection",
    "decisionOptionReviseDraftSection",
    "decisionOptionHoldSection",
    "decisionOptionFutureRequestOnlySection",
    "freshApprovalRequirementSection",
    "exactCommandRequirementSection",
    "exactTargetRequirementSection",
    "exactEvidenceRequirementSection",
    "oneRunOnlyRequirementSection",
    "noRetryNoSecondRunRequirementSection",
    "stopConditionsSection",
    "rollbackAndKillSwitchSection",
    "tokenSecretPiiSafetySection",
    "publicProductionSafetySection",
    "realLeadSafetySection",
    "realDealerSafetySection",
    "runtimeProviderGeminiSafetySection",
    "liveEndpointManualGuessSafetySection",
    "thorDealerImportSafetySection",
    "forbiddenRealValuesSection",
    "ownerChecklistBeforeFutureRequestSection",
    "finalBoundaryCarryForwardSection",
    "finalDecisionSection"
  ])
);

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_STATUS_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_PLACEHOLDER_ONLY",
  "V17_6_REVIEW_ONLY_PLACEHOLDER_ONLY",
  "V17_6_NOT_APPROVAL_PLACEHOLDER_ONLY",
  "OWNER_DECISION_MAP_PLACEHOLDER_ONLY",
  "REVIEW_ONLY_OPTION_PLACEHOLDER_ONLY",
  "REVISE_DRAFT_OPTION_PLACEHOLDER_ONLY",
  "HOLD_OPTION_PLACEHOLDER_ONLY",
  "FUTURE_REQUEST_ONLY_OPTION_PLACEHOLDER_ONLY",
  "FRESH_APPROVAL_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXACT_COMMAND_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXACT_TARGET_REQUIREMENT_PLACEHOLDER_ONLY",
  "EXACT_EVIDENCE_REQUIREMENT_PLACEHOLDER_ONLY",
  "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY",
  "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY",
  "STOP_CONDITIONS_PLACEHOLDER_ONLY",
  "ROLLBACK_KILL_SWITCH_PLACEHOLDER_ONLY",
  "TOKEN_SECRET_PII_SAFETY_PLACEHOLDER_ONLY",
  "PUBLIC_PRODUCTION_SAFETY_PLACEHOLDER_ONLY",
  "REAL_LEAD_SAFETY_PLACEHOLDER_ONLY",
  "REAL_DEALER_SAFETY_PLACEHOLDER_ONLY",
  "RUNTIME_PROVIDER_GEMINI_SAFETY_PLACEHOLDER_ONLY",
  "LIVE_ENDPOINT_MANUAL_GUESS_SAFETY_PLACEHOLDER_ONLY",
  "THOR_DEALER_IMPORT_SAFETY_PLACEHOLDER_ONLY",
  "FORBIDDEN_REAL_VALUES_PLACEHOLDER_ONLY",
  "OWNER_CHECKLIST_BEFORE_FUTURE_REQUEST_PLACEHOLDER_ONLY",
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
  ok(
    "package has test:v17.6 script",
    scripts["test:v17.6"] ===
      "tsx scripts/test-v176-future-real-value-insertion-owner-review-decision-packet.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("reviewOnly=true", root.reviewOnly === true);
  ok("placeholderOnly=true", root.placeholderOnly === true);
  ok("notOwnerApproval=true", root.notOwnerApproval === true);
  ok("notGo=true", root.notGo === true);
  ok("notRealValueInsertion=true", root.notRealValueInsertion === true);
  ok("notRealDealerAction=true", root.notRealDealerAction === true);
  ok("notRealLeadAction=true", root.notRealLeadAction === true);
  ok("noExecution=true", root.noExecution === true);
  ok("noOneRunApproval=true", root.noOneRunApproval === true);
  ok("noRetryApproval=true", root.noRetryApproval === true);
  ok("noSecondRunApproval=true", root.noSecondRunApproval === true);
  ok("noDeploy=true", root.noDeploy === true);
  ok("noPublicActivation=true", root.noPublicActivation === true);
  ok("noProductionActivation=true", root.noProductionActivation === true);
  ok("noBuyerFacingPublicRelease=true", root.noBuyerFacingPublicRelease === true);
  ok("noRuntimeProviderGeminiCall=true", root.noRuntimeProviderGeminiCall === true);
  ok("noLiveEndpointCall=true", root.noLiveEndpointCall === true);
  ok("noManualEndpointGuess=true", root.noManualEndpointGuess === true);
  ok("noThorImport=true", root.noThorImport === true);
  ok("noDealerImport=true", root.noDealerImport === true);
  ok("noTokenSecretExposure=true", root.noTokenSecretExposure === true);
  ok("noPII=true", root.noPII === true);

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline object complete",
    baseline["v13"] === "CLOSED" &&
      baseline["v14"] === "CLOSED" &&
      baseline["v15"] === "CLOSED" &&
      baseline["v16Planning"] === "CLOSED" &&
      baseline["v16.11"] === "CLOSED / OWNER ACKNOWLEDGMENT RECORD CLOSED BUT NOT APPROVAL" &&
      baseline["v17.0"] === "CLOSED" &&
      baseline["v17.1"] === "CLOSED" &&
      baseline["v17.2"] === "CLOSED" &&
      baseline["v17.3"] === "CLOSED" &&
      baseline["v17.4"] === "CLOSED" &&
      baseline["v17.5"] === "CLOSED" &&
      baseline["v17.6"] === "REVIEW-ONLY / NO-EXECUTION / PLACEHOLDER-ONLY"
  );

  const sections = asRecord(root.sections);
  ok(
    "required sections map complete",
    sections.ownerPlainThaiSummarySection === "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY" &&
      sections.currentStatusSection === "CURRENT_STATUS_PLACEHOLDER_ONLY" &&
      sections.whatIsAlreadyClosedSection === "CLOSED_BASELINE_PLACEHOLDER_ONLY" &&
      sections.whatV17_6IsSection === "V17_6_REVIEW_ONLY_PLACEHOLDER_ONLY" &&
      sections.whatV17_6IsNotSection === "V17_6_NOT_APPROVAL_PLACEHOLDER_ONLY" &&
      sections.ownerDecisionMapSection === "OWNER_DECISION_MAP_PLACEHOLDER_ONLY" &&
      sections.decisionOptionReviewOnlySection === "REVIEW_ONLY_OPTION_PLACEHOLDER_ONLY" &&
      sections.decisionOptionReviseDraftSection === "REVISE_DRAFT_OPTION_PLACEHOLDER_ONLY" &&
      sections.decisionOptionHoldSection === "HOLD_OPTION_PLACEHOLDER_ONLY" &&
      sections.decisionOptionFutureRequestOnlySection === "FUTURE_REQUEST_ONLY_OPTION_PLACEHOLDER_ONLY" &&
      sections.freshApprovalRequirementSection === "FRESH_APPROVAL_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.exactCommandRequirementSection === "EXACT_COMMAND_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.exactTargetRequirementSection === "EXACT_TARGET_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.exactEvidenceRequirementSection === "EXACT_EVIDENCE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.oneRunOnlyRequirementSection === "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.noRetryNoSecondRunRequirementSection ===
        "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.stopConditionsSection === "STOP_CONDITIONS_PLACEHOLDER_ONLY" &&
      sections.rollbackAndKillSwitchSection === "ROLLBACK_KILL_SWITCH_PLACEHOLDER_ONLY" &&
      sections.tokenSecretPiiSafetySection === "TOKEN_SECRET_PII_SAFETY_PLACEHOLDER_ONLY" &&
      sections.publicProductionSafetySection === "PUBLIC_PRODUCTION_SAFETY_PLACEHOLDER_ONLY" &&
      sections.realLeadSafetySection === "REAL_LEAD_SAFETY_PLACEHOLDER_ONLY" &&
      sections.realDealerSafetySection === "REAL_DEALER_SAFETY_PLACEHOLDER_ONLY" &&
      sections.runtimeProviderGeminiSafetySection ===
        "RUNTIME_PROVIDER_GEMINI_SAFETY_PLACEHOLDER_ONLY" &&
      sections.liveEndpointManualGuessSafetySection ===
        "LIVE_ENDPOINT_MANUAL_GUESS_SAFETY_PLACEHOLDER_ONLY" &&
      sections.thorDealerImportSafetySection === "THOR_DEALER_IMPORT_SAFETY_PLACEHOLDER_ONLY" &&
      sections.forbiddenRealValuesSection === "FORBIDDEN_REAL_VALUES_PLACEHOLDER_ONLY" &&
      sections.ownerChecklistBeforeFutureRequestSection ===
        "OWNER_CHECKLIST_BEFORE_FUTURE_REQUEST_PLACEHOLDER_ONLY" &&
      sections.finalBoundaryCarryForwardSection === "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY" &&
      sections.finalDecisionSection === "FINAL_DECISION_PLACEHOLDER_ONLY"
  );

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => (root.requiredPlaceholderValues as string[]).includes(p))
  );

  const decisionMap = asRecord(root.ownerDecisionMap);
  ok(
    "owner decision map complete",
    decisionMap.reviewOnlyOption === "REVIEW_ONLY_OPTION_PLACEHOLDER_ONLY" &&
      decisionMap.reviseDraftOption === "REVISE_DRAFT_OPTION_PLACEHOLDER_ONLY" &&
      decisionMap.holdOption === "HOLD_OPTION_PLACEHOLDER_ONLY" &&
      decisionMap.futureRequestOnlyOption === "FUTURE_REQUEST_ONLY_OPTION_PLACEHOLDER_ONLY" &&
      decisionMap.packetDoesNotAuthorizeExecution === true
  );

  const exactness = asRecord(root.freshApprovalAndExactnessRequirements);
  ok(
    "fresh approval and exactness requirements complete and true",
    Object.keys(exactness).length >= 5 && Object.values(exactness).every((v) => v === true)
  );

  const oneRunPolicy = asRecord(root.oneRunNoRetryNoSecondRunPolicy);
  ok(
    "one-run/no-retry/no-second-run policy complete and true",
    Object.keys(oneRunPolicy).length >= 5 && Object.values(oneRunPolicy).every((v) => v === true)
  );

  const stopRollback = asRecord(root.stopRollbackKillSwitchBoundaries);
  ok(
    "stop/rollback/kill-switch boundaries complete and true",
    Object.keys(stopRollback).length >= 4 && Object.values(stopRollback).every((v) => v === true)
  );

  const safety = asRecord(root.safetyBoundaries);
  ok(
    "safety boundaries complete and true",
    Object.keys(safety).length >= 9 && Object.values(safety).every((v) => v === true)
  );

  const guard = asRecord(root.forbiddenRealValuesGuard);
  ok(
    "forbidden real values guard complete and false",
    Object.keys(guard).length >= 20 && Object.values(guard).every((v) => v === false)
  );

  ok(
    "safe negative/prohibition context list complete",
    Array.isArray(root.safeNegativeProhibitionContext) &&
      root.safeNegativeProhibitionContext.includes("not approved") &&
      root.safeNegativeProhibitionContext.includes("does not approve") &&
      root.safeNegativeProhibitionContext.includes("is not approved") &&
      root.safeNegativeProhibitionContext.includes("not authorized") &&
      root.safeNegativeProhibitionContext.includes("does not authorize") &&
      root.safeNegativeProhibitionContext.includes("execution is not authorized") &&
      root.safeNegativeProhibitionContext.includes("execution is not allowed") &&
      root.safeNegativeProhibitionContext.includes("execution is not permitted") &&
      root.safeNegativeProhibitionContext.includes("no execution is allowed by this packet") &&
      root.safeNegativeProhibitionContext.includes("this packet does not authorize execution") &&
      root.safeNegativeProhibitionContext.includes("draft is not approval") &&
      root.safeNegativeProhibitionContext.includes("not already started") &&
      root.safeNegativeProhibitionContext.includes("has not started") &&
      root.safeNegativeProhibitionContext.includes("real-value insertion has not started") &&
      root.safeNegativeProhibitionContext.includes("not already inserted") &&
      root.safeNegativeProhibitionContext.includes("has not been inserted") &&
      root.safeNegativeProhibitionContext.includes("real values have not been inserted") &&
      root.safeNegativeProhibitionContext.includes("no real-value insertion")
  );

  ok(
    "owner-friendly thai summary contains required exact lines",
    Array.isArray(root.ownerFriendlyThaiSummary) &&
      root.ownerFriendlyThaiSummary.includes(
        "v17.6 เป็นเอกสารช่วยลุงเด่นตัดสินใจในอนาคตเท่านั้น ยังไม่ใช่การอนุมัติให้ใส่ค่าจริง ยังไม่ใช่การอนุมัติให้รันจริง และยังไม่ใช่ GO"
      ) &&
      root.ownerFriendlyThaiSummary.includes(
        "ถ้าจะไปขั้นใส่ค่าจริงหรือรันจริง ต้องเปิดงานใหม่ แยกจาก v17.6 พร้อม exact command, exact target, expected evidence และ fresh owner approval แยกต่างหาก"
      )
  );

  ok(
    "exact next owner action string is exact",
    root.exactNextOwnerAction ===
      "Owner review of decision packet only. This packet does not authorize execution. If owner wants real values inserted later, create a separate future request with exact command, exact target, expected evidence, and fresh owner approval."
  );

  ok(
    "final decision is review-only closure",
    root.finalDecision ===
      "V17.6 OWNER REVIEW DECISION PACKET CLOSED — READY FOR OWNER REVIEW ONLY / NO EXECUTION"
  );
}

ok(
  "doc contains required thai summary exact lines",
  hasEveryLine(doc, [
    "v17.6 เป็นเอกสารช่วยลุงเด่นตัดสินใจในอนาคตเท่านั้น ยังไม่ใช่การอนุมัติให้ใส่ค่าจริง ยังไม่ใช่การอนุมัติให้รันจริง และยังไม่ใช่ GO",
    "ถ้าจะไปขั้นใส่ค่าจริงหรือรันจริง ต้องเปิดงานใหม่ แยกจาก v17.6 พร้อม exact command, exact target, expected evidence และ fresh owner approval แยกต่างหาก"
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
    "execution is not permitted",
    "no execution is allowed by this packet",
    "this packet does not authorize execution",
    "draft is not approval",
    "not already started",
    "has not started",
    "real-value insertion has not started",
    "not already inserted",
    "has not been inserted",
    "real values have not been inserted",
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

console.log(`\nDone v17.6 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
