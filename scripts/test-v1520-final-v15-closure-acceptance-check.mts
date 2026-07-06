/**
 * v15.20 final v15 closure acceptance check validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.20
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.20-final-v15-closure-acceptance-check.md";
const FIXTURE_PATH =
  "docs/examples/v15.20-final-v15-closure-acceptance-check.synthetic.json";
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

function hasAllTrue(record: Record<string, unknown>, minKeys = 1): boolean {
  return (
    Object.keys(record ?? {}).length >= minKeys &&
    Object.values(record ?? {}).every((value) => value === true)
  );
}

console.log("=== v15.20 Final v15 Closure Acceptance Check Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc and fixture state v15.20 correctly",
  /v15\.20 — Final v15 Closure Acceptance Check/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v15.20\"")
);

ok(
  "execution type final-v15-closure-acceptance-check only",
  hasEveryLine(doc, ["acceptance-check-only artifact", "no execution"]) &&
    fixtureRaw.includes("\"executionType\": \"final-v15-closure-acceptance-check only\"")
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

  ok("isAcceptanceCheckOnly=true", root.isAcceptanceCheckOnly === true);
  ok("isExecution=false", root.isExecution === false);
  ok("isDryRun=false", root.isDryRun === false);
  ok("isOwnerApproval=false", root.isOwnerApproval === false);
  ok("isPublicRelease=false", root.isPublicRelease === false);
  ok("isProductionActivation=false", root.isProductionActivation === false);
  ok("isRealLead=false", root.isRealLead === false);
  ok("isV16=false", root.isV16 === false);

  const baseline = root.baseline as Record<string, unknown>;
  ok(
    "baseline v13 v14 v15.0-v15.19 complete",
    baseline?.["v13"] === "CLOSED" &&
      baseline?.["v14"] === "CLOSED" &&
      baseline?.["v15.0"] === "PASSED" &&
      baseline?.["v15.0A"] === "PASSED" &&
      baseline?.["v15.1"] === "PASSED" &&
      baseline?.["v15.2"] === "PASSED" &&
      baseline?.["v15.3"] === "PASSED" &&
      baseline?.["v15.4"] === "PASSED" &&
      baseline?.["v15.5"] === "PASSED" &&
      baseline?.["v15.6"] === "PASSED" &&
      baseline?.["v15.7"] === "PASSED" &&
      baseline?.["v15.8"] === "PASSED" &&
      baseline?.["v15.9"] === "PASSED" &&
      baseline?.["v15.10"] === "PASSED" &&
      baseline?.["v15.11"] === "PASSED" &&
      baseline?.["v15.12"] === "PASSED" &&
      baseline?.["v15.13"] === "PASSED" &&
      baseline?.["v15.14"] === "PASSED" &&
      baseline?.["v15.15"] === "PASSED" &&
      baseline?.["v15.16"] === "PASSED" &&
      baseline?.["v15.17"] === "PASSED" &&
      baseline?.["v15.18"] === "PASSED" &&
      baseline?.["v15.19"] === "PASSED"
  );

  const v1519ClosureRecordReview = root.v1519ClosureRecordReview as Record<string, unknown>;
  ok("v15.19 final closure record review complete", hasAllTrue(v1519ClosureRecordReview, 4));

  const finalAcceptanceStatement = root.finalV15PreparationAcceptanceStatement as Record<
    string,
    unknown
  >;
  ok(
    "final v15 preparation acceptance statement complete and non-launch",
    finalAcceptanceStatement?.acceptsPreparationClosureOnly === true &&
      finalAcceptanceStatement?.doesNotOpenRealSystem === true &&
      finalAcceptanceStatement?.doesNotAuthorizeExecutionDeployActivation === true
  );

  const acceptanceCriteria = Array.isArray(root.acceptanceCriteria)
    ? (root.acceptanceCriteria as string[])
    : [];
  ok("acceptance criteria complete", acceptanceCriteria.length >= 4);

  const acceptedItems = Array.isArray(root.acceptedItems)
    ? (root.acceptedItems as string[])
    : [];
  ok("accepted items complete", acceptedItems.length >= 4);

  const notApprovedItems = Array.isArray(root.notApprovedItems)
    ? (root.notApprovedItems as string[])
    : [];
  ok("not approved items complete", notApprovedItems.length >= 4);

  const evidenceChainAcceptanceSummary = Array.isArray(root.evidenceChainAcceptanceSummary)
    ? (root.evidenceChainAcceptanceSummary as string[])
    : [];
  ok(
    "evidence chain acceptance summary complete",
    evidenceChainAcceptanceSummary.length >= 7 &&
      evidenceChainAcceptanceSummary.some((v) => v.includes("v15.19"))
  );

  const noRealApproval = root.noRealApprovalAcceptanceConfirmation as Record<string, unknown>;
  ok(
    "no real approval acceptance confirmation complete",
    noRealApproval?.isRealOwnerApproval === false &&
      noRealApproval?.isDeployApproval === false &&
      noRealApproval?.authorizesExecution === false &&
      noRealApproval?.authorizesPublicProductionRealLead === false
  );

  const noDryRunExecution = root.noDryRunExecutionAcceptanceConfirmation as Record<
    string,
    unknown
  >;
  ok(
    "no dry-run execution acceptance confirmation complete",
    noDryRunExecution?.dryRunPerformed === false &&
      noDryRunExecution?.executionPerformed === false &&
      noDryRunExecution?.oneRunAuthorized === false &&
      noDryRunExecution?.retryOrSecondRunAuthorized === false
  );

  const boundaries = root.boundaries as Record<string, unknown>;
  ok(
    "public production real lead boundary acceptance confirmation complete",
    boundaries?.noProductionDeploy === true &&
      boundaries?.noProductionActivation === true &&
      boundaries?.noPublicRouteActivation === true &&
      boundaries?.noBuyerFacingPublicRelease === true &&
      boundaries?.noRealLeadSending === true
  );

  const runtime = root.runtimeProviderGemini as Record<string, unknown>;
  ok(
    "runtime provider gemini boundary acceptance confirmation complete",
    hasAllTrue(runtime, 4)
  );

  const security = root.securityPrivacy as Record<string, unknown>;
  ok(
    "security privacy pii token boundary acceptance confirmation complete",
    hasAllTrue(security, 4)
  );

  const thorDealerImport = root.thorDealerImport as Record<string, unknown>;
  ok(
    "thor dealer real import boundary acceptance confirmation complete",
    hasAllTrue(thorDealerImport, 3)
  );

  const remainingLocked = root.remainingLockedGatesAfterAcceptance as Record<string, unknown>;
  ok("remaining locked gates after acceptance complete", hasAllTrue(remainingLocked, 7));

  const safeTransitionNote = root.safeTransitionNote as Record<string, unknown>;
  ok(
    "safe transition note complete and does not start v16",
    safeTransitionNote?.doesNotStartV16 === true &&
      safeTransitionNote?.v16NeedsSeparateOwnerReviewApproval === true &&
      safeTransitionNote?.noV16RealDealerRealLeadUntilExplicitV16Framework === true &&
      safeTransitionNote?.futureExecutionNeedsFreshOwnerApprovalExactCommandTargetEvidenceOneRunLimit ===
        true
  );

  const stopCarryForward = root.stopConditionCarryForward as Record<string, unknown>;
  ok(
    "stop condition carry-forward complete",
    Object.keys(stopCarryForward ?? {}).length >= 10 &&
      Object.values(stopCarryForward ?? {}).every((value) => value === "HOLD")
  );

  const thaiOwnerAcceptanceSummary = root.thaiOwnerAcceptanceSummary as Record<string, unknown>;
  ok(
    "Thai owner-friendly acceptance summary complete",
    typeof thaiOwnerAcceptanceSummary?.summary === "string" &&
      typeof thaiOwnerAcceptanceSummary?.approvalStatus === "string" &&
      typeof thaiOwnerAcceptanceSummary?.executionStatus === "string" &&
      typeof thaiOwnerAcceptanceSummary?.launchStatus === "string" &&
      typeof thaiOwnerAcceptanceSummary?.versionStatus === "string"
  );

  const nextRecommendation = String(root.nextRecommendation ?? "");
  ok(
    "next recommendation is v15.21 no-execution closed-marker step",
    /v15\.21/i.test(nextRecommendation) &&
      /final v15 closed marker/i.test(nextRecommendation) &&
      /no-execution/i.test(nextRecommendation) &&
      /closed-marker/i.test(nextRecommendation)
  );
}

ok(
  "doc includes required acceptance check sections",
  hasEveryLine(doc, [
    "## 1) v15.20 Scope",
    "## 2) Acceptance-Check-Only / No-Execution Status",
    "## 3) Baseline Confirmation: v13/v14/v15.0-v15.19",
    "## 4) v15.19 Final Closure Record Review",
    "## 5) Final v15 Preparation Acceptance Statement",
    "## 6) Acceptance Criteria Summary",
    "## 7) What Is Accepted",
    "## 8) What Remains Not Approved",
    "## 9) Evidence Chain Acceptance Summary",
    "## 10) No Real Approval Acceptance Confirmation",
    "## 11) No Dry-Run/Execution Acceptance Confirmation",
    "## 12) Public/Production/Real Lead Boundary Acceptance Confirmation",
    "## 13) Runtime/Provider/Gemini Boundary Acceptance Confirmation",
    "## 14) Security/Privacy/PII/Token Boundary Acceptance Confirmation",
    "## 15) Thor/Dealer Real Import Boundary Acceptance Confirmation",
    "## 16) Remaining Locked Gates After Acceptance",
    "## 17) Safe Transition Note Toward Future v16 Only After Separate Owner Review/Approval",
    "## 18) Stop Condition Carry-Forward",
    "## 19) Thai Owner-Friendly Acceptance Summary",
    "## 20) Exact Next Step Recommendation"
  ])
);

ok(
  "doc states acceptance-only no-execution no-launch no-v16 constraints",
  hasEveryLine(doc, [
    "v15.20 is final closure acceptance check only",
    "v15.20 accepts only v15 preparation closure and does not open real system usage",
    "v15.20 is not owner approval for execution",
    "v15.20 does not allow execution, dry-run, or one-run",
    "v15.20 does not open public/production/real lead",
    "v15.20 does not start v16"
  ])
);

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
    "package has test:v15.20 script",
    scripts["test:v15.20"] ===
      "tsx scripts/test-v1520-final-v15-closure-acceptance-check.mts"
  );
}

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

const forbiddenExecutionApprovalPatterns: Array<[string, RegExp]> = [
  ["real final execution authorize", /real\s+FINAL\s+EXECUTION\s+AUTHORIZE/i],
  ["execute approved", /\bexecute[_\s-]?approved\b/i],
  ["production activated", /\bproduction\s+(is\s+)?activated\b/i],
  ["public route activated", /\bpublic\s+route\s+activated\b/i],
  ["real lead enabled", /\breal\s+lead\s+(is\s+)?enabled\b/i],
  ["v16 started", /\bv16\s+(has\s+)?started\b/i],
  ["thai public launched", /เปิดใช้งานจริงแล้ว|เปิดระบบจริงแล้ว|เริ่ม v16 แล้ว/i]
];
for (const [name, re] of forbiddenExecutionApprovalPatterns) {
  ok(`no unsafe authorization phrase ${name}`, !re.test(combined));
}

console.log(`\nDone v15.20 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
