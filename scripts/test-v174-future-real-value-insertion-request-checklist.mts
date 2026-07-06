/**
 * v17.4 future real-value insertion request checklist validator
 * Static checks only. Checklist-only and placeholder-only.
 *
 * npm run test:v17.4
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v17.4-future-real-value-insertion-request-checklist.md";
const FIXTURE_PATH = "docs/examples/v17.4-future-real-value-insertion-request-checklist.synthetic.json";
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
    "no execution",
    "no go",
    "pilot has not started",
    "execution is not authorized",
    "approval is not granted",
    "owner review is not approval",
    "template is not approval",
    "gate review is not approval",
    "checklist is not approval",
    "real values are not inserted",
    "real-value insertion is not authorized",
    "this checklist does not authorize execution",
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

console.log("=== v17.4 Future Real-Value Insertion Request Checklist Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v17.4 correctly",
  /v17\.4 — Future Real-Value Insertion Request Checklist/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v17.4\"") &&
    fixtureRaw.includes("\"executionType\": \"future-real-value-insertion-request-checklist only\"")
);

ok(
  "status is checklist-only no-execution placeholder-only not-owner-approval and not-real-value-insertion",
  hasEveryLine(doc, [
    "v17.4 = FUTURE REAL-VALUE INSERTION REQUEST CHECKLIST ONLY",
    "CHECKLIST ONLY / NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NOT OWNER APPROVAL",
    "NOT REAL-VALUE INSERTION"
  ])
);

ok(
  "doc includes required sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Future real-value insertion request checklist sections",
    "## 5) Required checklist statuses",
    "## 6) What v17.4 does not approve",
    "## 7) Fresh owner approval separation",
    "## 8) Real-value insertion separation",
    "## 9) One-run / no-retry / no-second-run policy",
    "## 10) Boundary carry-forward",
    "## 11) Forbidden real values guard",
    "## 12) Safe negative/prohibition context",
    "## 13) Owner-friendly Thai summary",
    "## 14) Checklist outcome options",
    "## 15) Exact next owner action"
  ])
);

ok(
  "purpose requirements included",
  hasEveryLine(doc, [
    "provide owner-readable checklist before any possible future real-value insertion task",
    "confirm every required gate from v17.3 remains placeholder-only",
    "prevent interpretation as GO, approval, execution authorization, or real-value insertion authorization",
    "help owner decide whether a separate future real-value insertion request should be prepared",
    "not a command, not a run, not a GO, not an approval"
  ])
);

ok(
  "baseline includes required closed states",
  hasEveryLine(doc, [
    "v13 = CLOSED",
    "v14 = CLOSED",
    "v15 = CLOSED",
    "v16 planning = CLOSED",
    "v16.11 owner acknowledgment record = CLOSED",
    "v17.0 draft skeleton = CLOSED",
    "v17.1 owner review packet = CLOSED",
    "v17.2 future real-value request template = CLOSED",
    "v17.3 future real-value insertion gate review = CLOSED",
    "v17.4 = FUTURE REAL-VALUE INSERTION REQUEST CHECKLIST ONLY / NO EXECUTION"
  ])
);

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
    "package has test:v17.4 script",
    scripts["test:v17.4"] === "tsx scripts/test-v174-future-real-value-insertion-request-checklist.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

  ok("checklistOnly=true", root.checklistOnly === true);
  ok("gateReviewOnly=true", root.gateReviewOnly === true);
  ok("templateOnly=true", root.templateOnly === true);
  ok("reviewOnly=true", root.reviewOnly === true);
  ok("draftOnly=true", root.draftOnly === true);
  ok("placeholderOnly=true", root.placeholderOnly === true);
  ok("notOwnerApproval=true", root.notOwnerApproval === true);
  ok("notRealValueInsertion=true", root.notRealValueInsertion === true);
  ok("noExecution=true", root.noExecution === true);
  ok("noGo=true", root.noGo === true);
  ok("noOwnerApproval=true", root.noOwnerApproval === true);
  ok("noOneRunApproval=true", root.noOneRunApproval === true);
  ok("noRetryApproval=true", root.noRetryApproval === true);
  ok("noSecondRunApproval=true", root.noSecondRunApproval === true);
  ok("noDeploy=true", root.noDeploy === true);
  ok("noPublicActivation=true", root.noPublicActivation === true);
  ok("noProductionActivation=true", root.noProductionActivation === true);
  ok("noBuyerFacingPublicRelease=true", root.noBuyerFacingPublicRelease === true);
  ok("noRealLead=true", root.noRealLead === true);
  ok("noRealDealerAction=true", root.noRealDealerAction === true);
  ok("noRuntimeProviderGeminiCall=true", root.noRuntimeProviderGeminiCall === true);
  ok("noLiveEndpointCall=true", root.noLiveEndpointCall === true);
  ok("noManualEndpointGuess=true", root.noManualEndpointGuess === true);
  ok("noThorImport=true", root.noThorImport === true);
  ok("noDealerImport=true", root.noDealerImport === true);
  ok("noTokenSecretExposure=true", root.noTokenSecretExposure === true);
  ok("noPII=true", root.noPII === true);

  const purpose = asRecord(root.purpose);
  ok(
    "purpose object complete and true",
    Object.keys(purpose).length >= 5 && Object.values(purpose).every((value) => value === true)
  );

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline object complete",
    baseline["v13"] === "CLOSED" &&
      baseline["v14"] === "CLOSED" &&
      baseline["v15"] === "CLOSED" &&
      baseline["v16Planning"] === "CLOSED" &&
      baseline["v16.11"] === "CLOSED / OWNER ACKNOWLEDGMENT RECORD CLOSED" &&
      baseline["v17.0"] === "DRAFT SKELETON CLOSED" &&
      baseline["v17.1"] === "OWNER REVIEW PACKET CLOSED" &&
      baseline["v17.2"] === "FUTURE REAL-VALUE REQUEST TEMPLATE CLOSED" &&
      baseline["v17.3"] === "FUTURE REAL-VALUE INSERTION GATE REVIEW CLOSED" &&
      baseline["v17.4"] === "FUTURE REAL-VALUE INSERTION REQUEST CHECKLIST ONLY / NO EXECUTION"
  );

  const sections = asRecord(root.futureRealValueInsertionRequestChecklistSections);
  ok(
    "future real-value insertion request checklist sections complete",
    sections.ownerIntentChecklist === "OWNER_INTENT_CHECK_PLACEHOLDER_ONLY" &&
      sections.ownerReviewChecklist === "OWNER_REVIEW_CHECK_PLACEHOLDER_ONLY" &&
      sections.ownerApprovalChecklist === "OWNER_APPROVAL_CHECK_PLACEHOLDER_ONLY" &&
      sections.exactCommandChecklist === "EXACT_COMMAND_CHECK_PLACEHOLDER_ONLY" &&
      sections.exactTargetChecklist === "EXACT_TARGET_CHECK_PLACEHOLDER_ONLY" &&
      sections.exactExpectedEvidenceChecklist === "EXACT_EXPECTED_EVIDENCE_CHECK_PLACEHOLDER_ONLY" &&
      sections.repoHeadChecklist === "REPO_HEAD_CHECK_PLACEHOLDER_ONLY" &&
      sections.originHeadChecklist === "ORIGIN_HEAD_CHECK_PLACEHOLDER_ONLY" &&
      sections.workingTreeChecklist === "WORKING_TREE_CHECK_PLACEHOLDER_ONLY" &&
      sections.requiredTestsChecklist === "REQUIRED_TESTS_CHECK_PLACEHOLDER_ONLY" &&
      sections.oneRunOnlyChecklist === "ONE_RUN_ONLY_CHECK_PLACEHOLDER_ONLY" &&
      sections.noAutomaticRetryChecklist === "NO_AUTOMATIC_RETRY_CHECK_PLACEHOLDER_ONLY" &&
      sections.noSecondRunChecklist === "NO_SECOND_RUN_CHECK_PLACEHOLDER_ONLY" &&
      sections.rollbackOwnerChecklist === "ROLLBACK_OWNER_CHECK_PLACEHOLDER_ONLY" &&
      sections.killSwitchOwnerChecklist === "KILL_SWITCH_OWNER_CHECK_PLACEHOLDER_ONLY" &&
      sections.stopConditionsChecklist === "STOP_CONDITIONS_CHECK_PLACEHOLDER_ONLY" &&
      sections.sanitizedEvidenceChecklist === "SANITIZED_EVIDENCE_CHECK_PLACEHOLDER_ONLY" &&
      sections.tokenSecretPiiChecklist === "TOKEN_SECRET_PII_CHECK_PLACEHOLDER_ONLY" &&
      sections.publicProductionChecklist === "PUBLIC_PRODUCTION_CHECK_PLACEHOLDER_ONLY" &&
      sections.realLeadChecklist === "REAL_LEAD_CHECK_PLACEHOLDER_ONLY" &&
      sections.realDealerChecklist === "REAL_DEALER_CHECK_PLACEHOLDER_ONLY" &&
      sections.runtimeProviderGeminiChecklist === "RUNTIME_PROVIDER_GEMINI_CHECK_PLACEHOLDER_ONLY" &&
      sections.liveEndpointManualGuessChecklist ===
        "LIVE_ENDPOINT_MANUAL_GUESS_CHECK_PLACEHOLDER_ONLY" &&
      sections.thorDealerImportChecklist === "THOR_DEALER_IMPORT_CHECK_PLACEHOLDER_ONLY" &&
      sections.finalOwnerDecisionChecklist === "FINAL_OWNER_DECISION_CHECK_PLACEHOLDER_ONLY"
  );

  ok(
    "required checklist statuses complete",
    Array.isArray(root.requiredChecklistStatuses) &&
      root.requiredChecklistStatuses.includes("OWNER_INTENT_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("OWNER_REVIEW_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("OWNER_APPROVAL_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("EXACT_COMMAND_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("EXACT_TARGET_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("EXACT_EXPECTED_EVIDENCE_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("REPO_HEAD_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("ORIGIN_HEAD_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("WORKING_TREE_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("REQUIRED_TESTS_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("ONE_RUN_ONLY_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("NO_AUTOMATIC_RETRY_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("NO_SECOND_RUN_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("ROLLBACK_OWNER_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("KILL_SWITCH_OWNER_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("STOP_CONDITIONS_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("SANITIZED_EVIDENCE_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("TOKEN_SECRET_PII_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("PUBLIC_PRODUCTION_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("REAL_LEAD_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("REAL_DEALER_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("RUNTIME_PROVIDER_GEMINI_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("LIVE_ENDPOINT_MANUAL_GUESS_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("THOR_DEALER_IMPORT_CHECK_PLACEHOLDER_ONLY") &&
      root.requiredChecklistStatuses.includes("FINAL_OWNER_DECISION_CHECK_PLACEHOLDER_ONLY")
  );

  ok(
    "what v17.4 does not approve list complete",
    Array.isArray(root.whatV174DoesNotApprove) && root.whatV174DoesNotApprove.length >= 19
  );

  const freshApproval = asRecord(root.freshOwnerApprovalSeparation);
  ok(
    "fresh owner approval separation complete and true",
    Object.keys(freshApproval).length >= 9 &&
      Object.values(freshApproval).every((value) => value === true)
  );

  const insertionSeparation = asRecord(root.realValueInsertionSeparation);
  ok(
    "real-value insertion separation complete and true",
    Object.keys(insertionSeparation).length >= 6 &&
      Object.values(insertionSeparation).every((value) => value === true)
  );

  const oneRunPolicy = asRecord(root.oneRunNoRetryNoSecondRunPolicy);
  ok(
    "one-run/no-retry/no-second-run policy complete and true",
    Object.keys(oneRunPolicy).length >= 5 && Object.values(oneRunPolicy).every((value) => value === true)
  );

  const carry = asRecord(root.boundaryCarryForward);
  ok(
    "boundary carry-forward complete and true",
    Object.keys(carry).length >= 8 && Object.values(carry).every((value) => value === true)
  );

  const guard = asRecord(root.forbiddenRealValuesGuard);
  ok(
    "forbidden real values guard complete and false",
    Object.keys(guard).length >= 22 && Object.values(guard).every((value) => value === false)
  );

  ok(
    "safe negative/prohibition context list includes all required items",
    Array.isArray(root.safeNegativeProhibitionContext) &&
      root.safeNegativeProhibitionContext.includes("not approved") &&
      root.safeNegativeProhibitionContext.includes("does not approve") &&
      root.safeNegativeProhibitionContext.includes("no execution") &&
      root.safeNegativeProhibitionContext.includes("no GO") &&
      root.safeNegativeProhibitionContext.includes("pilot has not started") &&
      root.safeNegativeProhibitionContext.includes("execution is not authorized") &&
      root.safeNegativeProhibitionContext.includes("approval is not granted") &&
      root.safeNegativeProhibitionContext.includes("owner review is not approval") &&
      root.safeNegativeProhibitionContext.includes("template is not approval") &&
      root.safeNegativeProhibitionContext.includes("gate review is not approval") &&
      root.safeNegativeProhibitionContext.includes("checklist is not approval") &&
      root.safeNegativeProhibitionContext.includes("real values are not inserted") &&
      root.safeNegativeProhibitionContext.includes("real-value insertion is not authorized") &&
      root.safeNegativeProhibitionContext.includes("this checklist does not authorize execution")
  );

  ok(
    "owner-friendly thai summary includes required lines",
    Array.isArray(root.ownerFriendlyThaiSummary) &&
      root.ownerFriendlyThaiSummary.includes("v17.4 เป็น checklist ก่อนอนาคตจะพิจารณาใส่ค่าจริง") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่ใส่ค่าจริง") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่ใช่คำสั่งรัน") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่ใช่ GO") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่ใช่ approval") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่แตะของจริง") &&
      root.ownerFriendlyThaiSummary.includes(
        "ถ้าจะใส่ค่าจริงหรือรันจริง ต้องมีงานใหม่และ approval ใหม่แยกต่างหาก"
      )
  );

  ok(
    "checklist outcome options complete and non-authorizing",
    Array.isArray(root.checklistOutcomeOptions) &&
      root.checklistOutcomeOptions.includes(
        "CHECKLIST COMPLETE — READY TO CONSIDER FUTURE REAL-VALUE INSERTION REQUEST ONLY"
      ) &&
      root.checklistOutcomeOptions.includes("HOLD CHECKLIST — CLARIFICATION NEEDED") &&
      root.checklistOutcomeOptions.includes("REVISE CHECKLIST — DOCS/TESTS/FIXTURES ONLY") &&
      root.checklistOutcomeOptions.includes(
        "STOP BEFORE REAL-VALUE INSERTION — NO-GO CHECKLIST OUTCOME"
      ) &&
      root.checklistOutcomeOptionsDoNotAuthorizeRealValueInsertionExecutionOrGo === true
  );

  ok(
    "exact next owner action is exact required statement",
    root.exactNextOwnerAction ===
      "Owner review of checklist only. This is not execution approval. If owner wants real values inserted later, create a separate future request with exact command, target, expected evidence, and fresh owner approval."
  );

  ok(
    "final decision is checklist closure only",
    root.finalDecision ===
      "V17.4 CHECKLIST CLOSED — READY TO CONSIDER FUTURE REAL-VALUE INSERTION REQUEST ONLY / NO EXECUTION"
  );
}

ok(
  "doc includes all checklist section names",
  hasEveryLine(doc, [
    "ownerIntentChecklist",
    "ownerReviewChecklist",
    "ownerApprovalChecklist",
    "exactCommandChecklist",
    "exactTargetChecklist",
    "exactExpectedEvidenceChecklist",
    "repoHeadChecklist",
    "originHeadChecklist",
    "workingTreeChecklist",
    "requiredTestsChecklist",
    "oneRunOnlyChecklist",
    "noAutomaticRetryChecklist",
    "noSecondRunChecklist",
    "rollbackOwnerChecklist",
    "killSwitchOwnerChecklist",
    "stopConditionsChecklist",
    "sanitizedEvidenceChecklist",
    "tokenSecretPiiChecklist",
    "publicProductionChecklist",
    "realLeadChecklist",
    "realDealerChecklist",
    "runtimeProviderGeminiChecklist",
    "liveEndpointManualGuessChecklist",
    "thorDealerImportChecklist",
    "finalOwnerDecisionChecklist"
  ])
);

ok(
  "doc has required checklist status placeholder strings",
  hasEveryLine(doc, [
    "OWNER_INTENT_CHECK_PLACEHOLDER_ONLY",
    "OWNER_REVIEW_CHECK_PLACEHOLDER_ONLY",
    "OWNER_APPROVAL_CHECK_PLACEHOLDER_ONLY",
    "EXACT_COMMAND_CHECK_PLACEHOLDER_ONLY",
    "EXACT_TARGET_CHECK_PLACEHOLDER_ONLY",
    "EXACT_EXPECTED_EVIDENCE_CHECK_PLACEHOLDER_ONLY",
    "REPO_HEAD_CHECK_PLACEHOLDER_ONLY",
    "ORIGIN_HEAD_CHECK_PLACEHOLDER_ONLY",
    "WORKING_TREE_CHECK_PLACEHOLDER_ONLY",
    "REQUIRED_TESTS_CHECK_PLACEHOLDER_ONLY",
    "ONE_RUN_ONLY_CHECK_PLACEHOLDER_ONLY",
    "NO_AUTOMATIC_RETRY_CHECK_PLACEHOLDER_ONLY",
    "NO_SECOND_RUN_CHECK_PLACEHOLDER_ONLY",
    "ROLLBACK_OWNER_CHECK_PLACEHOLDER_ONLY",
    "KILL_SWITCH_OWNER_CHECK_PLACEHOLDER_ONLY",
    "STOP_CONDITIONS_CHECK_PLACEHOLDER_ONLY",
    "SANITIZED_EVIDENCE_CHECK_PLACEHOLDER_ONLY",
    "TOKEN_SECRET_PII_CHECK_PLACEHOLDER_ONLY",
    "PUBLIC_PRODUCTION_CHECK_PLACEHOLDER_ONLY",
    "REAL_LEAD_CHECK_PLACEHOLDER_ONLY",
    "REAL_DEALER_CHECK_PLACEHOLDER_ONLY",
    "RUNTIME_PROVIDER_GEMINI_CHECK_PLACEHOLDER_ONLY",
    "LIVE_ENDPOINT_MANUAL_GUESS_CHECK_PLACEHOLDER_ONLY",
    "THOR_DEALER_IMPORT_CHECK_PLACEHOLDER_ONLY",
    "FINAL_OWNER_DECISION_CHECK_PLACEHOLDER_ONLY"
  ])
);

ok(
  "doc includes what v17.4 does not approve list",
  hasEveryLine(doc, [
    "GO",
    "execution",
    "real-value insertion",
    "one-run",
    "automatic retry",
    "second run",
    "deploy",
    "public route activation",
    "production activation",
    "buyer-facing public release",
    "real lead sending",
    "real dealer action",
    "runtime/provider/Gemini call",
    "live endpoint call",
    "manual endpoint guess",
    "Thor real import",
    "dealer real inventory import",
    "token/secret/PII exposure",
    "owner approval for future execution"
  ])
);

ok(
  "doc includes fresh owner approval separation statements",
  hasEveryLine(doc, [
    "v17.4 checklist is not owner approval",
    "v17.3 gate review is not owner approval",
    "v17.2 template is not owner approval",
    "v17.1 owner review packet is not owner approval",
    "v17.0 draft skeleton is not owner approval",
    "v16.11 owner acknowledgment is not owner approval",
    "any future real-value insertion requires a separate owner request",
    "any future execution requires a separate fresh owner approval",
    "no approval may be inferred from this checklist"
  ])
);

ok(
  "doc includes real-value insertion separation statements",
  hasEveryLine(doc, [
    "v17.4 does not insert real values",
    "any future real-value insertion must be a separate future task",
    "no token/secret/API key may be pasted into chat",
    "no PII/phone/plate/VIN may be added to docs/fixtures",
    "real command/target/evidence must only appear in a separate future owner-approved artifact, if ever approved",
    "until that separate artifact exists, all values remain placeholders only"
  ])
);

ok(
  "doc includes one-run/no-retry/no-second-run policy",
  hasEveryLine(doc, [
    "any future approved execution, if ever approved, must be exactly one run",
    "no automatic retry",
    "no second run",
    "any rerun requires separate fresh owner approval",
    "test failure or ambiguity means HOLD, not retry"
  ])
);

ok(
  "doc includes checklist outcome options and non-authorizing statement",
  hasEveryLine(doc, [
    "CHECKLIST COMPLETE — READY TO CONSIDER FUTURE REAL-VALUE INSERTION REQUEST ONLY",
    "HOLD CHECKLIST — CLARIFICATION NEEDED",
    "REVISE CHECKLIST — DOCS/TESTS/FIXTURES ONLY",
    "STOP BEFORE REAL-VALUE INSERTION — NO-GO CHECKLIST OUTCOME",
    "none of these options authorize real-value insertion, execution, or GO"
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
  ["real shell command", /(^|\n)\s*[-*]?\s*`?(npm|pnpm|yarn|node|tsx|curl|wget|Invoke-WebRequest|iwr)\s+[^\n`]+`?/im],
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
    "go already approved",
    /\b(?:go\s+.*(?:already\s+)?approved|go\s+is\s+approved|approved\s+for\s+go)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "pilot already started",
    /\bpilot\s+.*(already|is)\s+(started|active|running)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "execution authorized wording",
    /\b(?:execution\s+.*(?:authorized|approved|granted)|authorized\s+for\s+execution|owner\s+approved\s+execution|approval\s+granted\s+for\s+execution)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "owner review equals approval wording",
    /\b(?:owner\s+review\s+.*(?:is|equals)\s+approval|review\s+approved|review\s+is\s+approval)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "template equals approval wording",
    /\b(?:template\s+.*(?:is|equals)\s+approval|template\s+approved)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "gate review equals approval wording",
    /\b(?:gate\s+review\s+.*(?:is|equals)\s+approval|gate\s+approved)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "checklist equals approval wording",
    /\b(?:checklist\s+.*(?:is|equals)\s+approval|checklist\s+approved)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "real values already inserted wording",
    /\b(?:real\s+values?\s+.*(?:already\s+)?inserted|values?\s+already\s+inserted)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "real-value insertion authorized wording",
    /\b(?:real[-\s]?value\s+insertion\s+.*(?:authorized|approved|granted)|authorized\s+for\s+real[-\s]?value\s+insertion)\b/i,
    { allowSafeNegativeContext: true }
  ]
];
for (const [name, re, options] of forbiddenInterpretationPatterns) {
  ok(`no unsafe interpretation phrase ${name}`, !hasUnsafeInterpretationPhrase(combined, re, options));
}

ok(
  "safe negative/prohibition wording exists in doc",
  hasEveryLine(doc, [
    "not approved",
    "does not approve",
    "no execution",
    "no GO",
    "execution is not authorized",
    "approval is not granted",
    "owner review is not approval",
    "template is not approval",
    "gate review is not approval",
    "checklist is not approval",
    "real values are not inserted",
    "real-value insertion is not authorized",
    "this checklist does not authorize execution"
  ])
);

console.log(`\nDone v17.4 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
