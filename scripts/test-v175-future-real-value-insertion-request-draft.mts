/**
 * v17.5 future real-value insertion request draft validator
 * Static checks only. Draft-only, no-execution, placeholder-only.
 *
 * npm run test:v17.5
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v17.5-future-real-value-insertion-request-draft.md";
const FIXTURE_PATH = "docs/examples/v17.5-future-real-value-insertion-request-draft.synthetic.json";
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
    "draft is not approval",
    "real values are not inserted",
    "real-value insertion is not authorized",
    "this draft does not authorize execution",
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

console.log("=== v17.5 Future Real-Value Insertion Request Draft Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v17.5 correctly",
  /v17\.5 — Future Real-Value Insertion Request Draft/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v17.5\"") &&
    fixtureRaw.includes("\"executionType\": \"future-real-value-insertion-request-draft only\"")
);

ok(
  "status is draft-only no-execution placeholder-only not-owner-approval not-real-value-insertion not-go",
  hasEveryLine(doc, [
    "v17.5 = FUTURE REAL-VALUE INSERTION REQUEST DRAFT ONLY",
    "DRAFT ONLY / NO EXECUTION",
    "PLACEHOLDER ONLY",
    "NOT OWNER APPROVAL",
    "NOT REAL-VALUE INSERTION",
    "NOT GO"
  ])
);

ok(
  "doc includes required sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Draft request sections",
    "## 5) Required placeholder values",
    "## 6) Future real-value insertion request separation",
    "## 7) What v17.5 does not approve",
    "## 8) Fresh owner approval separation",
    "## 9) Real-value safety rules",
    "## 10) One-run / no-retry / no-second-run policy",
    "## 11) Boundary carry-forward",
    "## 12) Forbidden real values guard",
    "## 13) Safe negative/prohibition context",
    "## 14) Owner-friendly Thai summary",
    "## 15) Draft outcome options",
    "## 16) Exact next owner action"
  ])
);

ok(
  "purpose requirements included",
  hasEveryLine(doc, [
    "prepare a safe draft structure for a possible future real-value insertion request",
    "keep every real value absent",
    "make all required future fields visible to owner",
    "prevent interpretation as GO, approval, execution authorization, or real-value insertion authorization",
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
    "v17.4 future real-value insertion request checklist = CLOSED",
    "v17.5 = FUTURE REAL-VALUE INSERTION REQUEST DRAFT ONLY / NO EXECUTION / PLACEHOLDER ONLY"
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
    "package has test:v17.5 script",
    scripts["test:v17.5"] === "tsx scripts/test-v175-future-real-value-insertion-request-draft.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

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
      baseline["v17.4"] === "FUTURE REAL-VALUE INSERTION REQUEST CHECKLIST CLOSED" &&
      baseline["v17.5"] ===
        "FUTURE REAL-VALUE INSERTION REQUEST DRAFT ONLY / NO EXECUTION / PLACEHOLDER ONLY"
  );

  const sections = asRecord(root.draftRequestSections);
  ok(
    "draft request sections complete",
    sections.ownerIntentSection === "OWNER_INTENT_PLACEHOLDER_ONLY" &&
      sections.ownerReviewSection === "OWNER_REVIEW_PLACEHOLDER_ONLY" &&
      sections.ownerApprovalSection === "OWNER_APPROVAL_PLACEHOLDER_ONLY" &&
      sections.exactCommandSection === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      sections.exactTargetSection === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      sections.exactExpectedEvidenceSection === "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY" &&
      sections.repoHeadSection === "REPO_HEAD_CHECK_PLACEHOLDER_ONLY" &&
      sections.originHeadSection === "ORIGIN_HEAD_CHECK_PLACEHOLDER_ONLY" &&
      sections.workingTreeSection === "WORKING_TREE_CHECK_PLACEHOLDER_ONLY" &&
      sections.requiredTestsSection === "REQUIRED_TESTS_PLACEHOLDER_ONLY" &&
      sections.oneRunOnlySection === "ONE_RUN_ONLY_PLACEHOLDER_ONLY" &&
      sections.noAutomaticRetrySection === "NO_AUTOMATIC_RETRY_PLACEHOLDER_ONLY" &&
      sections.noSecondRunSection === "NO_SECOND_RUN_PLACEHOLDER_ONLY" &&
      sections.rollbackOwnerSection === "ROLLBACK_OWNER_PLACEHOLDER_ONLY" &&
      sections.killSwitchOwnerSection === "KILL_SWITCH_OWNER_PLACEHOLDER_ONLY" &&
      sections.stopConditionsSection === "STOP_CONDITIONS_PLACEHOLDER_ONLY" &&
      sections.sanitizedEvidenceSection === "SANITIZED_EVIDENCE_BUNDLE_PLACEHOLDER_ONLY" &&
      sections.tokenSecretPiiSection === "TOKEN_SECRET_PII_CHECK_PLACEHOLDER_ONLY" &&
      sections.publicProductionSection === "PUBLIC_PRODUCTION_CHECK_PLACEHOLDER_ONLY" &&
      sections.realLeadSection === "REAL_LEAD_CHECK_PLACEHOLDER_ONLY" &&
      sections.realDealerSection === "REAL_DEALER_CHECK_PLACEHOLDER_ONLY" &&
      sections.runtimeProviderGeminiSection === "RUNTIME_PROVIDER_GEMINI_CHECK_PLACEHOLDER_ONLY" &&
      sections.liveEndpointManualGuessSection ===
        "LIVE_ENDPOINT_MANUAL_GUESS_CHECK_PLACEHOLDER_ONLY" &&
      sections.thorDealerImportSection === "THOR_DEALER_IMPORT_CHECK_PLACEHOLDER_ONLY" &&
      sections.finalOwnerDecisionSection === "FINAL_OWNER_DECISION_PLACEHOLDER_ONLY"
  );

  ok(
    "required placeholder values complete",
    Array.isArray(root.requiredPlaceholderValues) &&
      (root.requiredPlaceholderValues as string[]).includes("OWNER_INTENT_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("OWNER_REVIEW_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("OWNER_APPROVAL_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("EXACT_COMMAND_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("EXACT_TARGET_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("REPO_HEAD_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("ORIGIN_HEAD_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("WORKING_TREE_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("REQUIRED_TESTS_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("ONE_RUN_ONLY_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("NO_AUTOMATIC_RETRY_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("NO_SECOND_RUN_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("ROLLBACK_OWNER_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("KILL_SWITCH_OWNER_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("STOP_CONDITIONS_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("SANITIZED_EVIDENCE_BUNDLE_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("TOKEN_SECRET_PII_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("PUBLIC_PRODUCTION_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("REAL_LEAD_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("REAL_DEALER_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("RUNTIME_PROVIDER_GEMINI_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("LIVE_ENDPOINT_MANUAL_GUESS_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("THOR_DEALER_IMPORT_CHECK_PLACEHOLDER_ONLY") &&
      (root.requiredPlaceholderValues as string[]).includes("FINAL_OWNER_DECISION_PLACEHOLDER_ONLY")
  );

  const insertionSeparation = asRecord(root.futureRealValueInsertionRequestSeparation);
  ok(
    "future real-value insertion request separation complete and true",
    Object.keys(insertionSeparation).length >= 7 &&
      Object.values(insertionSeparation).every((value) => value === true)
  );

  ok(
    "what v17.5 does not approve list complete",
    Array.isArray(root.whatV175DoesNotApprove) && root.whatV175DoesNotApprove.length >= 20
  );

  const freshApproval = asRecord(root.freshOwnerApprovalSeparation);
  ok(
    "fresh owner approval separation complete and true",
    Object.keys(freshApproval).length >= 10 &&
      Object.values(freshApproval).every((value) => value === true)
  );

  const safety = asRecord(root.realValueSafetyRules);
  ok(
    "real-value safety rules complete and true",
    Object.keys(safety).length >= 7 && Object.values(safety).every((value) => value === true)
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
    Object.keys(guard).length >= 23 && Object.values(guard).every((value) => value === false)
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
      root.safeNegativeProhibitionContext.includes("draft is not approval") &&
      root.safeNegativeProhibitionContext.includes("real values are not inserted") &&
      root.safeNegativeProhibitionContext.includes("real-value insertion is not authorized") &&
      root.safeNegativeProhibitionContext.includes("this draft does not authorize execution")
  );

  ok(
    "owner-friendly thai summary includes required lines",
    Array.isArray(root.ownerFriendlyThaiSummary) &&
      root.ownerFriendlyThaiSummary.includes("v17.5 เป็นร่างคำขอสำหรับอนาคตเท่านั้น") &&
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
    "draft outcome options complete and non-authorizing",
    Array.isArray(root.draftOutcomeOptions) &&
      root.draftOutcomeOptions.includes(
        "DRAFT COMPLETE — READY TO CONSIDER FUTURE OWNER REAL-VALUE INSERTION REQUEST ONLY"
      ) &&
      root.draftOutcomeOptions.includes("HOLD DRAFT — CLARIFICATION NEEDED") &&
      root.draftOutcomeOptions.includes("REVISE DRAFT — DOCS/TESTS/FIXTURES ONLY") &&
      root.draftOutcomeOptions.includes("STOP BEFORE REAL-VALUE INSERTION — NO-GO DRAFT OUTCOME") &&
      root.draftOutcomeOptionsDoNotAuthorizeRealValueInsertionExecutionOrGo === true
  );

  ok(
    "exact next owner action is exact required statement",
    root.exactNextOwnerAction ===
      "Owner review of draft only. This is not execution approval. If owner wants real values inserted later, create a separate future request with exact command, target, expected evidence, and fresh owner approval."
  );

  ok(
    "final decision is draft closure only",
    root.finalDecision ===
      "V17.5 DRAFT CLOSED — READY TO CONSIDER FUTURE OWNER REAL-VALUE INSERTION REQUEST ONLY / NO EXECUTION"
  );
}

ok(
  "doc includes all draft section names",
  hasEveryLine(doc, [
    "ownerIntentSection",
    "ownerReviewSection",
    "ownerApprovalSection",
    "exactCommandSection",
    "exactTargetSection",
    "exactExpectedEvidenceSection",
    "repoHeadSection",
    "originHeadSection",
    "workingTreeSection",
    "requiredTestsSection",
    "oneRunOnlySection",
    "noAutomaticRetrySection",
    "noSecondRunSection",
    "rollbackOwnerSection",
    "killSwitchOwnerSection",
    "stopConditionsSection",
    "sanitizedEvidenceSection",
    "tokenSecretPiiSection",
    "publicProductionSection",
    "realLeadSection",
    "realDealerSection",
    "runtimeProviderGeminiSection",
    "liveEndpointManualGuessSection",
    "thorDealerImportSection",
    "finalOwnerDecisionSection"
  ])
);

ok(
  "doc has required placeholder strings",
  hasEveryLine(doc, [
    "OWNER_INTENT_PLACEHOLDER_ONLY",
    "OWNER_REVIEW_PLACEHOLDER_ONLY",
    "OWNER_APPROVAL_PLACEHOLDER_ONLY",
    "EXACT_COMMAND_PLACEHOLDER_ONLY",
    "EXACT_TARGET_PLACEHOLDER_ONLY",
    "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY",
    "REPO_HEAD_CHECK_PLACEHOLDER_ONLY",
    "ORIGIN_HEAD_CHECK_PLACEHOLDER_ONLY",
    "WORKING_TREE_CHECK_PLACEHOLDER_ONLY",
    "REQUIRED_TESTS_PLACEHOLDER_ONLY",
    "ONE_RUN_ONLY_PLACEHOLDER_ONLY",
    "NO_AUTOMATIC_RETRY_PLACEHOLDER_ONLY",
    "NO_SECOND_RUN_PLACEHOLDER_ONLY",
    "ROLLBACK_OWNER_PLACEHOLDER_ONLY",
    "KILL_SWITCH_OWNER_PLACEHOLDER_ONLY",
    "STOP_CONDITIONS_PLACEHOLDER_ONLY",
    "SANITIZED_EVIDENCE_BUNDLE_PLACEHOLDER_ONLY",
    "TOKEN_SECRET_PII_CHECK_PLACEHOLDER_ONLY",
    "PUBLIC_PRODUCTION_CHECK_PLACEHOLDER_ONLY",
    "REAL_LEAD_CHECK_PLACEHOLDER_ONLY",
    "REAL_DEALER_CHECK_PLACEHOLDER_ONLY",
    "RUNTIME_PROVIDER_GEMINI_CHECK_PLACEHOLDER_ONLY",
    "LIVE_ENDPOINT_MANUAL_GUESS_CHECK_PLACEHOLDER_ONLY",
    "THOR_DEALER_IMPORT_CHECK_PLACEHOLDER_ONLY",
    "FINAL_OWNER_DECISION_PLACEHOLDER_ONLY"
  ])
);

ok(
  "doc includes future real-value insertion request separation statements",
  hasEveryLine(doc, [
    "v17.5 does not insert real values",
    "v17.5 is not the real-value insertion task",
    "any actual real-value insertion must be a separate future task",
    "any actual real-value insertion requires separate owner instruction",
    "any future execution requires fresh owner approval",
    "no approval may be inferred from this draft",
    "until a separate future owner-approved artifact exists, all fields remain placeholders only"
  ])
);

ok(
  "doc includes what v17.5 does not approve list",
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
    "owner approval for future execution",
    "owner approval for real-value insertion"
  ])
);

ok(
  "doc includes fresh owner approval separation statements",
  hasEveryLine(doc, [
    "v17.5 draft is not owner approval",
    "v17.4 checklist is not owner approval",
    "v17.3 gate review is not owner approval",
    "v17.2 template is not owner approval",
    "v17.1 owner review packet is not owner approval",
    "v17.0 draft skeleton is not owner approval",
    "v16.11 owner acknowledgment is not owner approval",
    "future real-value insertion requires a separate owner request",
    "future execution requires a separate fresh owner approval",
    "no approval may be inferred from draft/checklist/gate/template/review/acknowledgment"
  ])
);

ok(
  "doc includes real-value safety rules statements",
  hasEveryLine(doc, [
    "no token/secret/API key may be pasted into chat",
    "no Firebase token may be pasted into chat",
    "no Authorization header may be pasted into chat",
    "no PII/phone/plate/VIN may be added to docs/fixtures",
    "real command/target/evidence must only appear in a separate future owner-approved artifact, if ever approved",
    "no live endpoint or manual endpoint guess is allowed in this draft",
    "no real dealer import values are allowed"
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
  "doc includes boundary carry-forward statements",
  hasEveryLine(doc, [
    "one-run / no-retry / no-second-run boundary",
    "public / production / buyer-facing boundary",
    "real lead boundary",
    "real dealer action boundary",
    "runtime / provider / Gemini boundary",
    "live endpoint / manual endpoint guess boundary",
    "security / privacy / PII / token boundary",
    "Thor / dealer real import boundary"
  ])
);

ok(
  "doc includes draft outcome options and non-authorizing statement",
  hasEveryLine(doc, [
    "DRAFT COMPLETE — READY TO CONSIDER FUTURE OWNER REAL-VALUE INSERTION REQUEST ONLY",
    "HOLD DRAFT — CLARIFICATION NEEDED",
    "REVISE DRAFT — DOCS/TESTS/FIXTURES ONLY",
    "STOP BEFORE REAL-VALUE INSERTION — NO-GO DRAFT OUTCOME",
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
    "draft equals approval wording",
    /\b(?:draft\s+.*(?:is|equals)\s+approval|draft\s+approved)\b/i,
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
    "pilot has not started",
    "execution is not authorized",
    "approval is not granted",
    "owner review is not approval",
    "template is not approval",
    "gate review is not approval",
    "checklist is not approval",
    "draft is not approval",
    "real values are not inserted",
    "real-value insertion is not authorized",
    "this draft does not authorize execution"
  ])
);

console.log(`\nDone v17.5 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
