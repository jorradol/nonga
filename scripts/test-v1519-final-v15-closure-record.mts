/**
 * v15.19 final v15 closure record validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.19
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.19-final-v15-closure-record.md";
const FIXTURE_PATH = "docs/examples/v15.19-final-v15-closure-record.synthetic.json";
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

console.log("=== v15.19 Final v15 Closure Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc and fixture state v15.19 correctly",
  /v15\.19 — Final v15 Closure Record/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v15.19\"")
);

ok(
  "execution type final-v15-closure-record only",
  hasEveryLine(doc, ["closure-record-only artifact", "no execution"]) &&
    fixtureRaw.includes("\"executionType\": \"final-v15-closure-record only\"")
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

  ok("isClosureRecordOnly=true", root.isClosureRecordOnly === true);
  ok("isExecution=false", root.isExecution === false);
  ok("isDryRun=false", root.isDryRun === false);
  ok("isOwnerApproval=false", root.isOwnerApproval === false);
  ok("isPublicRelease=false", root.isPublicRelease === false);
  ok("isProductionActivation=false", root.isProductionActivation === false);
  ok("isRealLead=false", root.isRealLead === false);
  ok("isV16=false", root.isV16 === false);

  const baseline = root.baseline as Record<string, unknown>;
  ok(
    "baseline v13 v14 v15.0-v15.18 complete",
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
      baseline?.["v15.18"] === "PASSED"
  );

  const finalStatement = root.finalV15PreparationClosureStatement as Record<string, unknown>;
  ok(
    "final v15 preparation closure statement complete and non-launch",
    finalStatement?.closureRecordedForPreparationOnly === true &&
      finalStatement?.notRealLaunchOrActivation === true &&
      finalStatement?.doesNotAuthorizeExecution === true
  );

  const v15CompletedItems = Array.isArray(root.v15CompletedItems)
    ? (root.v15CompletedItems as string[])
    : [];
  ok("v15 completed items complete", v15CompletedItems.length >= 4);

  const v15NotApprovedItems = Array.isArray(root.v15NotApprovedItems)
    ? (root.v15NotApprovedItems as string[])
    : [];
  ok("v15 not approved items complete", v15NotApprovedItems.length >= 4);

  const evidenceChainFinalIndex = Array.isArray(root.evidenceChainFinalIndex)
    ? (root.evidenceChainFinalIndex as string[])
    : [];
  ok(
    "evidence chain final index complete",
    evidenceChainFinalIndex.length >= 6 &&
      evidenceChainFinalIndex.some((v) => v.includes("v15.17")) &&
      evidenceChainFinalIndex.some((v) => v.includes("v15.18"))
  );

  const v1518OwnerFacingReviewSummary = root.v1518OwnerFacingReviewSummary as Record<
    string,
    unknown
  >;
  ok(
    "v15.18 owner-facing review summary complete",
    hasAllTrue(v1518OwnerFacingReviewSummary, 4)
  );

  const noRealApproval = root.noRealApprovalFinalConfirmation as Record<string, unknown>;
  ok(
    "no real approval final confirmation complete",
    noRealApproval?.isRealOwnerApproval === false &&
      noRealApproval?.isDeployApproval === false &&
      noRealApproval?.authorizesExecution === false &&
      noRealApproval?.authorizesPublicProductionRealLead === false
  );

  const noDryRunExecution = root.noDryRunExecutionFinalConfirmation as Record<string, unknown>;
  ok(
    "no dry-run execution final confirmation complete",
    noDryRunExecution?.dryRunPerformed === false &&
      noDryRunExecution?.executionPerformed === false &&
      noDryRunExecution?.oneRunAuthorized === false &&
      noDryRunExecution?.retryOrSecondRunAuthorized === false
  );

  const boundaries = root.boundaries as Record<string, unknown>;
  ok(
    "public production real lead boundary final confirmation complete",
    boundaries?.noProductionDeploy === true &&
      boundaries?.noProductionActivation === true &&
      boundaries?.noPublicRouteActivation === true &&
      boundaries?.noBuyerFacingPublicRelease === true &&
      boundaries?.noRealLeadSending === true
  );

  const runtime = root.runtimeProviderGemini as Record<string, unknown>;
  ok(
    "runtime provider gemini boundary final confirmation complete",
    hasAllTrue(runtime, 4)
  );

  const security = root.securityPrivacy as Record<string, unknown>;
  ok(
    "security privacy pii token boundary final confirmation complete",
    hasAllTrue(security, 4)
  );

  const thorDealerImport = root.thorDealerImport as Record<string, unknown>;
  ok(
    "thor dealer real import boundary final confirmation complete",
    hasAllTrue(thorDealerImport, 3)
  );

  const remainingLocked = root.remainingLockedGatesAfterClosure as Record<string, unknown>;
  ok("remaining locked gates after closure complete", hasAllTrue(remainingLocked, 7));

  const safeTransitionNote = root.safeTransitionNote as Record<string, unknown>;
  ok(
    "safe transition note complete and does not start v16",
    safeTransitionNote?.doesNotStartV16 === true &&
      safeTransitionNote?.v16NeedsSeparateOwnerReviewApproval === true &&
      safeTransitionNote?.noV16RealDealerRealLeadBeforeExplicitV16Framework === true &&
      safeTransitionNote?.futureExecutionStillNeedsFreshOwnerApprovalAndOneRunLimit === true
  );

  const stopCarryForward = root.stopConditionCarryForward as Record<string, unknown>;
  ok(
    "stop condition carry-forward complete",
    Object.keys(stopCarryForward ?? {}).length >= 10 &&
      Object.values(stopCarryForward ?? {}).every((value) => value === "HOLD")
  );

  const thaiOwnerFinalSummary = root.thaiOwnerFinalSummary as Record<string, unknown>;
  ok(
    "Thai owner-friendly final summary complete",
    typeof thaiOwnerFinalSummary?.summary === "string" &&
      typeof thaiOwnerFinalSummary?.approvalStatus === "string" &&
      typeof thaiOwnerFinalSummary?.executionStatus === "string" &&
      typeof thaiOwnerFinalSummary?.launchStatus === "string" &&
      typeof thaiOwnerFinalSummary?.versionStatus === "string"
  );

  const nextRecommendation = String(root.nextRecommendation ?? "");
  ok(
    "next recommendation is v15.20 no-execution acceptance-only step",
    /v15\.20/i.test(nextRecommendation) &&
      /closure acceptance check/i.test(nextRecommendation) &&
      /no-execution/i.test(nextRecommendation) &&
      /acceptance-only/i.test(nextRecommendation)
  );
}

ok(
  "doc includes required closure record sections",
  hasEveryLine(doc, [
    "## 1) v15.19 Scope",
    "## 2) Closure-Record-Only / No-Execution Status",
    "## 3) Baseline Confirmation: v13/v14/v15.0-v15.18",
    "## 4) Final v15 Preparation Closure Statement",
    "## 5) What v15 Completed",
    "## 6) What v15 Did Not Approve",
    "## 7) Evidence Chain Final Index",
    "## 8) Owner-Facing Closure Review Summary from v15.18",
    "## 9) No Real Approval Final Confirmation",
    "## 10) No Dry-Run/Execution Final Confirmation",
    "## 11) Public/Production/Real Lead Boundary Final Confirmation",
    "## 12) Runtime/Provider/Gemini Boundary Final Confirmation",
    "## 13) Security/Privacy/PII/Token Boundary Final Confirmation",
    "## 14) Thor/Dealer Real Import Boundary Final Confirmation",
    "## 15) Remaining Locked Gates After v15 Closure",
    "## 16) Safe Transition Note Toward Future v16 Only After Separate Approval",
    "## 17) Stop Condition Carry-Forward",
    "## 18) Thai Owner-Friendly Final Summary",
    "## 19) Exact Next Step Recommendation"
  ])
);

ok(
  "doc states closure-only no-execution no-launch no-v16 constraints",
  hasEveryLine(doc, [
    "v15.19 is final closure record only",
    "v15.19 closes only v15 preparation and does not open real system usage",
    "v15.19 is not owner approval",
    "v15.19 does not allow execution, dry-run, or one-run",
    "v15.19 does not open public/production/real lead",
    "v15.19 does not start v16"
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
    "package has test:v15.19 script",
    scripts["test:v15.19"] === "tsx scripts/test-v1519-final-v15-closure-record.mts"
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

console.log(`\nDone v15.19 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
