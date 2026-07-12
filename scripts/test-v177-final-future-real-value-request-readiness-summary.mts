/**
 * v17.7 final future real-value request readiness summary validator
 * Static checks only. Summary-only, no-execution, placeholder-only.
 *
 * npm run test:v17.7
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v17.7-final-future-real-value-request-readiness-summary.md";
const FIXTURE_PATH = "docs/examples/v17.7-final-future-real-value-request-readiness-summary.synthetic.json";
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
    "this summary does not authorize execution",
    "summary is not approval",
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

console.log("=== v17.7 Final Future Real-Value Request Readiness Summary Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v17.7 correctly",
  /v17\.7 — Final Future Real-Value Request Readiness Summary/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v17.7\"") &&
    fixtureRaw.includes("\"executionType\": \"final-future-real-value-request-readiness-summary only\"")
);

ok(
  "status is summary-only no-execution placeholder-only not-owner-approval not-go not-real-value-insertion",
  hasEveryLine(doc, [
    "v17.7 = FINAL FUTURE REAL-VALUE REQUEST READINESS SUMMARY ONLY",
    "SUMMARY ONLY / NO EXECUTION",
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
    "v17.7 is summary-only / no-execution / placeholder-only"
  ])
);

ok(
  "doc includes required section names",
  hasEveryLine(doc, [
    "ownerPlainThaiSummarySection",
    "currentMilestoneStatusSection",
    "closedBaselineSummarySection",
    "v17ArtifactMapSection",
    "whatIsReadyForReviewSection",
    "whatIsStillNotAllowedSection",
    "whatV17_7IsSection",
    "whatV17_7IsNotSection",
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
    "ownerDecisionOptionsSection",
    "finalOwnerActionSection",
    "finalBoundaryCarryForwardSection",
    "finalDecisionSection"
  ])
);

const requiredPlaceholders = [
  "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY",
  "CURRENT_MILESTONE_STATUS_PLACEHOLDER_ONLY",
  "CLOSED_BASELINE_SUMMARY_PLACEHOLDER_ONLY",
  "V17_ARTIFACT_MAP_PLACEHOLDER_ONLY",
  "READY_FOR_REVIEW_PLACEHOLDER_ONLY",
  "STILL_NOT_ALLOWED_PLACEHOLDER_ONLY",
  "V17_7_SUMMARY_ONLY_PLACEHOLDER_ONLY",
  "V17_7_NOT_APPROVAL_PLACEHOLDER_ONLY",
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
  "OWNER_DECISION_OPTIONS_PLACEHOLDER_ONLY",
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
  ok(
    "package has test:v17.7 script",
    scripts["test:v17.7"] === "tsx scripts/test-v177-final-future-real-value-request-readiness-summary.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("summaryOnly=true", root.summaryOnly === true);
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
      baseline["v17.6"] === "CLOSED VIA V17.6A HOLD FIX" &&
      baseline["v17.7"] === "SUMMARY-ONLY / NO-EXECUTION / PLACEHOLDER-ONLY"
  );

  const sections = asRecord(root.sections);
  ok(
    "required sections map complete",
    sections.ownerPlainThaiSummarySection === "OWNER_PLAIN_THAI_SUMMARY_PLACEHOLDER_ONLY" &&
      sections.currentMilestoneStatusSection === "CURRENT_MILESTONE_STATUS_PLACEHOLDER_ONLY" &&
      sections.closedBaselineSummarySection === "CLOSED_BASELINE_SUMMARY_PLACEHOLDER_ONLY" &&
      sections.v17ArtifactMapSection === "V17_ARTIFACT_MAP_PLACEHOLDER_ONLY" &&
      sections.whatIsReadyForReviewSection === "READY_FOR_REVIEW_PLACEHOLDER_ONLY" &&
      sections.whatIsStillNotAllowedSection === "STILL_NOT_ALLOWED_PLACEHOLDER_ONLY" &&
      sections.whatV17_7IsSection === "V17_7_SUMMARY_ONLY_PLACEHOLDER_ONLY" &&
      sections.whatV17_7IsNotSection === "V17_7_NOT_APPROVAL_PLACEHOLDER_ONLY" &&
      sections.futureRequestPrerequisitesSection === "FUTURE_REQUEST_PREREQUISITES_PLACEHOLDER_ONLY" &&
      sections.freshOwnerApprovalRequirementSection ===
        "FRESH_OWNER_APPROVAL_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.exactCommandRequirementSection === "EXACT_COMMAND_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.exactTargetRequirementSection === "EXACT_TARGET_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.expectedEvidenceRequirementSection ===
        "EXPECTED_EVIDENCE_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.oneRunOnlyRequirementSection === "ONE_RUN_ONLY_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.noRetryNoSecondRunRequirementSection ===
        "NO_RETRY_NO_SECOND_RUN_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.stopConditionsRequirementSection === "STOP_CONDITIONS_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.rollbackRequirementSection === "ROLLBACK_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.killSwitchRequirementSection === "KILL_SWITCH_REQUIREMENT_PLACEHOLDER_ONLY" &&
      sections.tokenSecretPiiGuardSection === "TOKEN_SECRET_PII_GUARD_PLACEHOLDER_ONLY" &&
      sections.publicProductionGuardSection === "PUBLIC_PRODUCTION_GUARD_PLACEHOLDER_ONLY" &&
      sections.realLeadGuardSection === "REAL_LEAD_GUARD_PLACEHOLDER_ONLY" &&
      sections.realDealerGuardSection === "REAL_DEALER_GUARD_PLACEHOLDER_ONLY" &&
      sections.runtimeProviderGeminiGuardSection ===
        "RUNTIME_PROVIDER_GEMINI_GUARD_PLACEHOLDER_ONLY" &&
      sections.liveEndpointManualGuessGuardSection ===
        "LIVE_ENDPOINT_MANUAL_GUESS_GUARD_PLACEHOLDER_ONLY" &&
      sections.thorDealerImportGuardSection === "THOR_DEALER_IMPORT_GUARD_PLACEHOLDER_ONLY" &&
      sections.forbiddenRealValuesGuardSection === "FORBIDDEN_REAL_VALUES_GUARD_PLACEHOLDER_ONLY" &&
      sections.safeNegativeWordingSection === "SAFE_NEGATIVE_WORDING_PLACEHOLDER_ONLY" &&
      sections.ownerDecisionOptionsSection === "OWNER_DECISION_OPTIONS_PLACEHOLDER_ONLY" &&
      sections.finalOwnerActionSection === "FINAL_OWNER_ACTION_PLACEHOLDER_ONLY" &&
      sections.finalBoundaryCarryForwardSection === "FINAL_BOUNDARY_CARRY_FORWARD_PLACEHOLDER_ONLY" &&
      sections.finalDecisionSection === "FINAL_DECISION_PLACEHOLDER_ONLY"
  );

  ok(
    "required placeholders array complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      requiredPlaceholders.every((p) => (root.requiredPlaceholderValues as string[]).includes(p))
  );

  const artifactMap = asRecord(root.v17ArtifactMap);
  ok(
    "v17 artifact map complete with non-approval flags",
    artifactMap["v17.0"] === "draft skeleton" &&
      artifactMap["v17.1"] === "owner review packet" &&
      artifactMap["v17.2"] === "future real-value request template" &&
      artifactMap["v17.3"] === "insertion gate review" &&
      artifactMap["v17.4"] === "insertion request checklist" &&
      artifactMap["v17.5"] === "insertion request draft" &&
      artifactMap["v17.6"] === "owner review decision packet, closed via v17.6A HOLD FIX" &&
      artifactMap["v17.7"] === "final readiness summary only" &&
      artifactMap.artifactMapIsNotApproval === true &&
      artifactMap.artifactMapIsNotExecutionPath === true
  );

  const prereq = asRecord(root.futureRequestPrerequisites);
  ok(
    "future request prerequisites complete and true",
    Object.keys(prereq).length >= 6 && Object.values(prereq).every((v) => v === true)
  );

  const oneRunPolicy = asRecord(root.oneRunNoRetryNoSecondRunPolicy);
  ok(
    "one-run/no-retry/no-second-run policy complete and true",
    Object.keys(oneRunPolicy).length >= 5 && Object.values(oneRunPolicy).every((v) => v === true)
  );

  const stopRollbackKill = asRecord(root.stopRollbackKillSwitchRequirements);
  ok(
    "stop/rollback/kill-switch requirements complete and true",
    Object.keys(stopRollbackKill).length >= 4 && Object.values(stopRollbackKill).every((v) => v === true)
  );

  const guards = asRecord(root.guardBoundaries);
  ok(
    "guard boundaries complete and true",
    Object.keys(guards).length >= 11 && Object.values(guards).every((v) => v === true)
  );

  const forbiddenGuard = asRecord(root.forbiddenRealValuesGuard);
  ok(
    "forbidden real values guard complete and false",
    Object.keys(forbiddenGuard).length >= 20 && Object.values(forbiddenGuard).every((v) => v === false)
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
      root.safeNegativeProhibitionContext.includes("this summary does not authorize execution") &&
      root.safeNegativeProhibitionContext.includes("summary is not approval") &&
      root.safeNegativeProhibitionContext.includes("has not started") &&
      root.safeNegativeProhibitionContext.includes("has not been inserted") &&
      root.safeNegativeProhibitionContext.includes("no real-value insertion")
  );

  ok(
    "owner-friendly thai summary contains required exact lines",
    Array.isArray(root.ownerFriendlyThaiSummary) &&
      root.ownerFriendlyThaiSummary.includes(
        "v17.7 เป็นเอกสารสรุปความพร้อมเชิงเอกสารสำหรับอนาคตเท่านั้น ยังไม่ใช่การอนุมัติให้ใส่ค่าจริง ยังไม่ใช่การอนุมัติให้รันจริง และยังไม่ใช่ GO"
      ) &&
      root.ownerFriendlyThaiSummary.includes(
        "ตอนนี้สิ่งที่พร้อมคือชุดเอกสารสำหรับให้ลุงเด่นทบทวน ส่วนการใส่ค่าจริงหรือการรันจริงต้องเปิดงานใหม่ พร้อม exact command, exact target, expected evidence และ fresh owner approval แยกต่างหาก"
      )
  );

  ok(
    "exact next owner action string is exact",
    root.exactNextOwnerAction ===
      "Owner review of summary only. This summary does not authorize execution. If owner wants real values inserted later, create a separate future request with exact command, exact target, expected evidence, and fresh owner approval."
  );

  ok(
    "final decision is summary-only closure",
    root.finalDecision ===
      "V17.7 FINAL READINESS SUMMARY CLOSED — READY FOR OWNER REVIEW ONLY / NO EXECUTION"
  );
}

ok(
  "doc contains required thai summary exact lines",
  hasEveryLine(doc, [
    "v17.7 เป็นเอกสารสรุปความพร้อมเชิงเอกสารสำหรับอนาคตเท่านั้น ยังไม่ใช่การอนุมัติให้ใส่ค่าจริง ยังไม่ใช่การอนุมัติให้รันจริง และยังไม่ใช่ GO",
    "ตอนนี้สิ่งที่พร้อมคือชุดเอกสารสำหรับให้ลุงเด่นทบทวน ส่วนการใส่ค่าจริงหรือการรันจริงต้องเปิดงานใหม่ พร้อม exact command, exact target, expected evidence และ fresh owner approval แยกต่างหาก"
  ])
);

ok(
  "doc includes v17 artifact map lines",
  hasEveryLine(doc, [
    "v17.0 = draft skeleton",
    "v17.1 = owner review packet",
    "v17.2 = future real-value request template",
    "v17.3 = insertion gate review",
    "v17.4 = insertion request checklist",
    "v17.5 = insertion request draft",
    "v17.6 = owner review decision packet, closed via v17.6A HOLD FIX",
    "v17.7 = final readiness summary only",
    "this artifact map is not approval",
    "this artifact map is not execution path"
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
    "this summary does not authorize execution",
    "summary is not approval",
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

console.log(`\nDone v17.7 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
