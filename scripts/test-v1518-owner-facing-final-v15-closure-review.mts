/**
 * v15.18 owner-facing final v15 closure review validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.18
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.18-owner-facing-final-v15-closure-review.md";
const FIXTURE_PATH =
  "docs/examples/v15.18-owner-facing-final-v15-closure-review.synthetic.json";
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

console.log("=== v15.18 Owner-Facing Final v15 Closure Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc and fixture state v15.18 correctly",
  /v15\.18 — Owner-Facing Final v15 Closure Review/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v15.18\"")
);

ok(
  "execution type owner-facing-final-v15-closure-review only",
  hasEveryLine(doc, ["owner-facing review-only artifact", "no execution"]) &&
    fixtureRaw.includes(
      "\"executionType\": \"owner-facing-final-v15-closure-review only\""
    )
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

  ok("isOwnerFacingReviewOnly=true", root.isOwnerFacingReviewOnly === true);
  ok("isExecution=false", root.isExecution === false);
  ok("isDryRun=false", root.isDryRun === false);
  ok("isOwnerApproval=false", root.isOwnerApproval === false);
  ok("isPublicRelease=false", root.isPublicRelease === false);
  ok("isProductionActivation=false", root.isProductionActivation === false);
  ok("isRealLead=false", root.isRealLead === false);
  ok("isV16=false", root.isV16 === false);

  const baseline = root.baseline as Record<string, unknown>;
  ok(
    "baseline v13 v14 v15.0-v15.17 complete",
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
      baseline?.["v15.17"] === "PASSED"
  );

  const plainThaiOwnerSummary = root.plainThaiOwnerSummary as Record<string, unknown>;
  ok(
    "plain Thai owner summary complete",
    typeof plainThaiOwnerSummary?.summary === "string" &&
      typeof plainThaiOwnerSummary?.approvalStatus === "string" &&
      typeof plainThaiOwnerSummary?.executionStatus === "string" &&
      typeof plainThaiOwnerSummary?.launchStatus === "string" &&
      typeof plainThaiOwnerSummary?.versionStatus === "string"
  );

  const v15CompletedItems = Array.isArray(root.v15CompletedItems)
    ? (root.v15CompletedItems as string[])
    : [];
  ok("v15 completed items complete", v15CompletedItems.length >= 4);

  const v15NotApprovedItems = Array.isArray(root.v15NotApprovedItems)
    ? (root.v15NotApprovedItems as string[])
    : [];
  ok("v15 not approved items complete", v15NotApprovedItems.length >= 4);

  const evidenceChainSummary = root.evidenceChainSummary as Record<string, unknown>;
  ok("evidence chain summary complete", hasAllTrue(evidenceChainSummary, 5));

  const v1517DecisionPacketReview = root.v1517DecisionPacketReview as Record<string, unknown>;
  ok(
    "v15.17 decision packet review complete",
    hasAllTrue(v1517DecisionPacketReview, 4)
  );

  const noRealApproval = root.noRealApprovalConfirmation as Record<string, unknown>;
  ok(
    "no real approval confirmation complete",
    noRealApproval?.isRealOwnerApproval === false &&
      noRealApproval?.isDeployApproval === false &&
      noRealApproval?.authorizesExecution === false &&
      noRealApproval?.authorizesPublicProductionRealLead === false
  );

  const noDryRunExecution = root.noDryRunExecutionConfirmation as Record<string, unknown>;
  ok(
    "no dry-run execution confirmation complete",
    noDryRunExecution?.dryRunPerformed === false &&
      noDryRunExecution?.executionPerformed === false &&
      noDryRunExecution?.oneRunAuthorized === false &&
      noDryRunExecution?.retryOrSecondRunAuthorized === false
  );

  const boundaries = root.boundaries as Record<string, unknown>;
  ok(
    "public production real lead boundary confirmation complete",
    boundaries?.noProductionDeploy === true &&
      boundaries?.noProductionActivation === true &&
      boundaries?.noPublicRouteActivation === true &&
      boundaries?.noBuyerFacingPublicRelease === true &&
      boundaries?.noRealLeadSending === true
  );

  const runtime = root.runtimeProviderGemini as Record<string, unknown>;
  ok("runtime provider gemini boundary confirmation complete", hasAllTrue(runtime, 3));

  const security = root.securityPrivacy as Record<string, unknown>;
  ok("security privacy pii token boundary confirmation complete", hasAllTrue(security, 4));

  ok(
    "thor dealer real import boundary confirmation complete",
    boundaries?.noThorRealDataImport === true &&
      boundaries?.noDealerRealInventoryImport === true &&
      boundaries?.noV16RealDealerRealLeadAction === true
  );

  const remainingLockedGates = root.remainingLockedGates as Record<string, unknown>;
  ok("remaining locked gates complete", hasAllTrue(remainingLockedGates, 7));

  const riskIfSkippingApprovalGates = Array.isArray(root.riskIfSkippingApprovalGates)
    ? (root.riskIfSkippingApprovalGates as string[])
    : [];
  ok("risks if skipping approval gates complete", riskIfSkippingApprovalGates.length >= 4);

  const ownerDecisionChoices = Array.isArray(root.ownerDecisionChoices)
    ? (root.ownerDecisionChoices as string[])
    : [];
  ok(
    "owner decision choices complete",
    ownerDecisionChoices.length >= 10 &&
      ownerDecisionChoices.includes(
        "READY FOR v15.19 FINAL V15 CLOSURE RECORD — NO EXECUTION"
      ) &&
      ownerDecisionChoices.includes("HOLD — TEST FAILURE")
  );

  const recommendedOwnerSafeDecision = String(root.recommendedOwnerSafeDecision ?? "");
  ok(
    "recommended owner-safe decision is closure/no-execution only",
    recommendedOwnerSafeDecision ===
      "READY FOR v15.19 FINAL V15 CLOSURE RECORD — NO EXECUTION"
  );
  ok(
    "recommended owner-safe decision is not execution approval",
    !/execution approval|approve execution|authorize execution/i.test(
      recommendedOwnerSafeDecision
    )
  );

  const nextRecommendation = String(root.nextRecommendation ?? "");
  ok(
    "next recommendation is v15.19 no-execution closure-record step",
    /v15\.19/i.test(nextRecommendation) &&
      /final v15 closure record/i.test(nextRecommendation) &&
      /no-execution/i.test(nextRecommendation)
  );
}

ok(
  "doc includes required owner-facing review sections",
  hasEveryLine(doc, [
    "## 1) v15.18 Scope",
    "## 2) Owner-Facing Review-Only / No-Execution Status",
    "## 3) Baseline Confirmation: v13/v14/v15.0-v15.17",
    "## 4) Plain-Thai Summary for Owner",
    "## 5) What v15 Has Completed",
    "## 6) What v15 Has Not Approved",
    "## 7) Evidence Chain Summary",
    "## 8) Final Decision Packet Review Summary from v15.17",
    "## 9) No Real Approval Confirmation",
    "## 10) No Dry-Run/Execution Confirmation",
    "## 11) Public/Production/Real Lead Boundary Confirmation",
    "## 12) Runtime/Provider/Gemini Boundary Confirmation",
    "## 13) Security/Privacy/PII/Token Boundary Confirmation",
    "## 14) Thor/Dealer Real Import Boundary Confirmation",
    "## 15) Remaining Locked Gates",
    "## 16) Risks If Skipping Approval Gates",
    "## 17) Owner Decision Choices",
    "## 18) Recommended Owner-Safe Decision",
    "## 19) Exact Next Step Recommendation"
  ])
);

ok(
  "doc states owner-facing only no-execution no-launch no-v16 constraints",
  hasEveryLine(doc, [
    "v15.18 is owner-facing final closure review only and not final public launch",
    "v15.18 is not owner approval",
    "v15.18 does not allow execution, dry-run, or one-run",
    "v15.18 does not open public/production/real lead",
    "v15.18 does not enter v16"
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
    "package has test:v15.18 script",
    scripts["test:v15.18"] ===
      "tsx scripts/test-v1518-owner-facing-final-v15-closure-review.mts"
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

console.log(`\nDone v15.18 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
