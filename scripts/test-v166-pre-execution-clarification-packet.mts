/**
 * v16.6 pre-execution clarification packet validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.6
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.6-pre-execution-clarification-packet.md";
const FIXTURE_PATH = "docs/examples/v16.6-pre-execution-clarification-packet.synthetic.json";
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

console.log("=== v16.6 Pre-Execution Clarification Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.6 correctly",
  /v16\.6 — Pre-Execution Clarification Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.6\"") &&
    fixtureRaw.includes("\"executionType\": \"pre-execution-clarification-packet only\"")
);

ok(
  "planning-only phrases are explicit",
  hasEveryLine(doc, [
    "PLANNING ONLY / NO EXECUTION",
    "v16.6 is clarification-packet-only and planning-only",
    "v16.6 is not execution approval and not one-run approval",
    "v16.6 is not owner approval for execution"
  ])
);

ok(
  "doc includes required v16.6 sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Clarification packet scope",
    "## 5) What this packet does not approve",
    "## 6) Source gaps from v16.4-v16.5",
    "## 7) Cohort entry / exit clarification",
    "## 8) Lead eligibility tie-break clarification",
    "## 9) Sanitized evidence minimum bundle clarification",
    "## 10) Rollback / kill-switch owner-operator matrix clarification",
    "## 11) Monitoring / evidence review ownership clarification",
    "## 12) Operator accountability matrix clarification",
    "## 13) Approval separation clarification",
    "## 14) Future exact command / target / evidence clarification",
    "## 15) No-execution boundary confirmation",
    "## 16) One-run / no-retry / no-second-run carry-forward",
    "## 17) Public / production / real lead boundary confirmation",
    "## 18) Runtime / provider / Gemini boundary confirmation",
    "## 19) Security / privacy / PII / token boundary confirmation",
    "## 20) Thor / dealer real import boundary confirmation",
    "## 21) Stop condition clarification",
    "## 22) Open questions still remaining",
    "## 23) Clarification readiness matrix",
    "## 24) Thai owner-friendly summary",
    "## 25) Exact next step recommendation"
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
    "package has test:v16.6 script",
    scripts["test:v16.6"] === "tsx scripts/test-v166-pre-execution-clarification-packet.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

  ok("planningOnly=true", root.planningOnly === true);
  ok("noExecution=true", root.noExecution === true);
  ok("noDryRun=true", root.noDryRun === true);
  ok("noOneRun=true", root.noOneRun === true);
  ok("noRetry=true", root.noRetry === true);
  ok("noSecondRun=true", root.noSecondRun === true);
  ok("noPublicActivation=true", root.noPublicActivation === true);
  ok("noProductionActivation=true", root.noProductionActivation === true);
  ok("noRealLead=true", root.noRealLead === true);
  ok("noRealDealerAction=true", root.noRealDealerAction === true);
  ok("noRuntimeProviderGeminiCall=true", root.noRuntimeProviderGeminiCall === true);
  ok("noLiveEndpointCall=true", root.noLiveEndpointCall === true);
  ok("noManualEndpointGuess=true", root.noManualEndpointGuess === true);
  ok("noThorImport=true", root.noThorImport === true);
  ok("noDealerImport=true", root.noDealerImport === true);
  ok("noPII=true", root.noPII === true);
  ok("noTokenSecretExposure=true", root.noTokenSecretExposure === true);

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline complete through v16.6 planning-only packet",
    baseline["v13"] === "CLOSED" &&
      baseline["v14"] === "CLOSED" &&
      baseline["v15"] === "CLOSED" &&
      baseline["v16.0"] === "PASSED" &&
      baseline["v16.1"] === "PASSED" &&
      baseline["v16.2"] === "PASSED" &&
      baseline["v16.3"] === "PASSED via v16.3A HOLD FIX" &&
      baseline["v16.4"] === "PASSED" &&
      baseline["v16.5"] === "PASSED" &&
      baseline["v16.6"] === "PLANNING ONLY / PRE-EXECUTION CLARIFICATION PACKET ONLY"
  );

  ok(
    "source gaps from v16.4-v16.5 are complete",
    Array.isArray(root.sourceGapsFromV164V165) && root.sourceGapsFromV164V165.length >= 6
  );

  const cohort = asRecord(root.cohortEntryExitClarification);
  ok(
    "cohort entry/exit clarification complete",
    typeof cohort.entryCriteriaPlaceholder === "string" &&
      typeof cohort.exitCriteriaPlaceholder === "string" &&
      typeof cohort.ownerSignOffPlaceholder === "string" &&
      Array.isArray(cohort.allowedStatesTemplate) &&
      (cohort.allowedStatesTemplate as unknown[]).length >= 3 &&
      cohort.noRealDealerActivationInPacket === true &&
      cohort.noThorDealerImportInPacket === true
  );

  const lead = asRecord(root.leadEligibilityTieBreakClarification);
  ok(
    "lead eligibility tie-break clarification complete",
    Array.isArray(lead.decisionStatesTemplate) &&
      (lead.decisionStatesTemplate as unknown[]).length >= 3 &&
      lead.defaultForAmbiguousCase === "NEEDS_OWNER_REVIEW" &&
      lead.noRealLeadCapture === true &&
      lead.noRealLeadQueue === true &&
      lead.noRealLeadRoute === true &&
      lead.noRealLeadSending === true &&
      lead.noPhonePiiHandlingInPacket === true
  );

  const evidenceBundle = asRecord(root.sanitizedEvidenceMinimumBundleClarification);
  ok(
    "sanitized evidence minimum bundle clarification complete",
    evidenceBundle.versionedPacketReferenceRequired === true &&
      typeof evidenceBundle.exactCommandPlaceholderOnly === "string" &&
      typeof evidenceBundle.exactTargetPlaceholderOnly === "string" &&
      Array.isArray(evidenceBundle.expectedSanitizedEvidenceFieldsPlaceholder) &&
      (evidenceBundle.expectedSanitizedEvidenceFieldsPlaceholder as unknown[]).length >= 3 &&
      typeof evidenceBundle.passFailDecisionFormatPlaceholder === "string" &&
      evidenceBundle.noTokenSecretPii === true &&
      evidenceBundle.noRealPhonePlateVin === true &&
      evidenceBundle.noRealCommandEndpointUrlTarget === true
  );

  const rollback = asRecord(root.rollbackKillSwitchMatrixClarification);
  ok(
    "rollback/kill-switch matrix clarification complete",
    typeof rollback.ownerRolePlaceholder === "string" &&
      typeof rollback.operatorRolePlaceholder === "string" &&
      typeof rollback.killSwitchOwnerPlaceholder === "string" &&
      typeof rollback.haltTriggerOwnerPlaceholder === "string" &&
      typeof rollback.rollbackEvidenceOwnerPlaceholder === "string" &&
      typeof rollback.escalationContactRolePlaceholderOnly === "string" &&
      rollback.noContactDataPhonePiiToken === true
  );

  const monitoring = asRecord(root.monitoringEvidenceReviewOwnershipClarification);
  ok(
    "monitoring/evidence review ownership clarification complete",
    typeof monitoring.evidenceReviewerRolePlaceholder === "string" &&
      typeof monitoring.boundaryVerifierRolePlaceholder === "string" &&
      typeof monitoring.holdDecisionRolePlaceholder === "string" &&
      typeof monitoring.ownerReportSummarizerRolePlaceholder === "string" &&
      monitoring.artifactBundleSanitizedOnly === true
  );

  const operator = asRecord(root.operatorAccountabilityMatrixClarification);
  ok(
    "operator accountability matrix clarification complete",
    typeof operator.executionBoundaryComplianceOwnerPlaceholder === "string" &&
      typeof operator.evidenceCompletenessCheckerPlaceholder === "string" &&
      typeof operator.stopConditionTriggerCheckerPlaceholder === "string" &&
      typeof operator.ownerEscalationHandoffPlaceholder === "string" &&
      operator.templateOnlyNoOperationalActivation === true
  );

  const approval = asRecord(root.approvalSeparationClarification);
  ok(
    "approval separation clarification complete",
    approval.planningPacketIsNotApproval === true &&
      approval.approvalTemplateIsNotApproval === true &&
      approval.futureExecutionNeedsFreshOwnerReviewAndApproval === true &&
      approval.futureApprovalNeedsExactCommandTargetEvidenceButV166PlaceholderOnly === true &&
      approval.oneRunOnlyIfFutureApprovalExplicitlyGrants === true &&
      approval.noRetryNoSecondRunCarryForward === true
  );

  ok(
    "open questions still remaining present",
    Array.isArray(root.openQuestionsStillRemaining) && root.openQuestionsStillRemaining.length >= 3
  );

  const readinessMatrix = asRecord(root.clarificationReadinessMatrix);
  ok(
    "clarification readiness matrix complete",
    Object.keys(readinessMatrix).length >= 9 &&
      readinessMatrix.executionGate === "BLOCKED_FOR_EXECUTION"
  );

  const stopConditions = asRecord(root.stopConditions);
  ok(
    "stop conditions are complete and HOLD",
    Object.keys(stopConditions).length >= 10 &&
      Object.values(stopConditions).every((value) => value === "HOLD")
  );

  const carryForward = asRecord(root.ownerApprovalCarryForward);
  ok(
    "owner approval carry-forward exists and true",
    Object.keys(carryForward).length >= 4 &&
      Object.values(carryForward).every((value) => value === true)
  );

  const nextStepRecommendation = String(root.nextStepRecommendation ?? "");
  ok(
    "exact next step recommendation targets v16.7 template",
    /v16\.7/i.test(nextStepRecommendation) &&
      /future owner approval template/i.test(nextStepRecommendation) &&
      /planning-only/i.test(nextStepRecommendation) &&
      /no execution/i.test(nextStepRecommendation)
  );

  ok(
    "final decision is planning-only v16.7 readiness",
    root.finalDecision ===
      "READY FOR v16.7 FUTURE OWNER APPROVAL TEMPLATE — PLANNING ONLY / NO EXECUTION"
  );
}

ok(
  "doc confirms no-execution boundary",
  hasEveryLine(doc, [
    "no execution",
    "no dry-run",
    "no one-run",
    "no automatic retry",
    "no second run"
  ])
);

ok(
  "doc confirms one-run/no-retry/no-second-run carry-forward",
  hasEveryLine(doc, [
    "one-run policy remains locked and unavailable in v16.6",
    "no retry remains strict",
    "no second run without separate future approval remains strict"
  ])
);

ok(
  "doc confirms public/production/real lead boundaries",
  hasEveryLine(doc, [
    "no deploy",
    "no production activation",
    "no public route activation",
    "no buyer-facing public release",
    "no real lead sending",
    "no real dealer action"
  ])
);

ok(
  "doc confirms runtime/provider/Gemini boundaries",
  hasEveryLine(doc, [
    "no runtime/provider/Gemini network call",
    "no live endpoint call",
    "no manual endpoint guess"
  ])
);

ok(
  "doc confirms security/privacy/PII/token boundaries",
  hasEveryLine(doc, [
    "no token/secret/API key exposure",
    "no real customer data / PII / phone / plate / VIN"
  ])
);

ok(
  "doc confirms Thor/dealer import boundaries",
  hasEveryLine(doc, [
    "no Thor real data import",
    "no dealer real inventory import"
  ])
);

ok(
  "doc confirms future exact command/target/evidence placeholder-only mode",
  hasEveryLine(doc, [
    "EXACT_COMMAND_PLACEHOLDER_ONLY",
    "EXACT_TARGET_PLACEHOLDER_ONLY",
    "EXACT_EVIDENCE_PLACEHOLDER_ONLY",
    "no real command text",
    "no real endpoint string",
    "no real URL text"
  ])
);

ok(
  "doc confirms Thai summary and exact next step",
  hasEveryLine(doc, [
    "## 24) Thai owner-friendly summary",
    "## 25) Exact next step recommendation",
    "next step only: v16.7 future owner approval template (planning-only / no execution)"
  ])
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["generic api key assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenInterpretationPatterns: Array<[string, RegExp]> = [
  ["v16 pilot already started", /\bv16\s+.*(pilot).*(started|active|running)\b/i],
  ["owner approved execution", /\bowner\s+.*(approved|authoriz(ed|ation)).*execution\b/i],
  ["packet unlocks deploy/public/prod/real lead", /\bpacket\s+.*(unlocks|enables)\s+.*(deploy|public|production|real lead)\b/i],
  ["execute approved phrase", /\bexecute[_\s-]?approved\b/i],
  ["deploy now phrase", /\bdeploy\s+now\b/i]
];
for (const [name, re] of forbiddenInterpretationPatterns) {
  ok(`no unsafe interpretation phrase ${name}`, !re.test(combined));
}

const forbiddenEndpointOrCommandPatterns: Array<[string, RegExp]> = [
  ["curl command", /\bcurl\s+https?:\/\//i],
  ["wget command", /\bwget\s+https?:\/\//i],
  ["powershell web request command", /\b(iwr|Invoke-WebRequest)\b/i],
  ["http endpoint sample", /https?:\/\/[^\s"']+/i],
  ["generic host style endpoint", /\b[A-Za-z0-9-]+\.[A-Za-z]{2,}\/[A-Za-z0-9/_-]+/]
];
for (const [name, re] of forbiddenEndpointOrCommandPatterns) {
  ok(`no command/endpoint hint ${name}`, !re.test(combined));
}

const forbiddenManualEndpointGuessApprovalPatterns: Array<[string, RegExp]> = [
  [
    "manual endpoint guess allowed/permitted",
    /\bmanual\s+endpoint\s+guess(?:ing)?\s+(?:is\s+)?(?:allowed|permitted)\b/i
  ],
  [
    "allow/permit manual endpoint guess",
    /\b(?:allow|allows|allowed|permit|permits|permitted)\s+(?:a\s+)?manual\s+endpoint\s+guess(?:ing)?\b/i
  ]
];
for (const [name, re] of forbiddenManualEndpointGuessApprovalPatterns) {
  ok(`no manual-endpoint-guess approval phrase ${name}`, !re.test(combined));
}

console.log(`\nDone v16.6 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
