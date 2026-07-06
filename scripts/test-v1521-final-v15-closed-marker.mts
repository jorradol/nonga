/**
 * v15.21 final v15 closed marker validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.21
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.21-final-v15-closed-marker.md";
const FIXTURE_PATH = "docs/examples/v15.21-final-v15-closed-marker.synthetic.json";
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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

console.log("=== v15.21 Final v15 Closed Marker Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc and fixture state v15.21 correctly",
  /v15\.21 — Final v15 Closed Marker/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v15.21\"") &&
    fixtureRaw.includes("\"scope\": \"final v15 closed marker\"")
);

ok(
  "execution type final-v15-closed-marker only",
  hasEveryLine(doc, ["closed-marker-only artifact", "no execution"]) &&
    fixtureRaw.includes("\"executionType\": \"final-v15-closed-marker only\"")
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

  ok("isClosedMarkerOnly=true", root.isClosedMarkerOnly === true);
  ok("isExecution=false", root.isExecution === false);
  ok("isDryRun=false", root.isDryRun === false);
  ok("isOwnerApproval=false", root.isOwnerApproval === false);
  ok("isPublicRelease=false", root.isPublicRelease === false);
  ok("isProductionActivation=false", root.isProductionActivation === false);
  ok("isRealLead=false", root.isRealLead === false);
  ok("isV16=false", root.isV16 === false);

  const baseline = root.baseline as Record<string, unknown>;
  ok(
    "baseline v13 v14 v15.0-v15.20 complete",
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
      baseline?.["v15.19"] === "PASSED" &&
      baseline?.["v15.20"] === "PASSED"
  );

  const finalMarker = root.finalV15ClosedMarkerStatement as Record<string, unknown>;
  ok(
    "final v15 closed marker statement complete and non-launch",
    finalMarker?.isFinalV15ClosedMarkerOnly === true &&
      finalMarker?.closesPreparationOnlyNotRealActivation === true &&
      finalMarker?.isNotOwnerApprovalForExecution === true &&
      finalMarker?.doesNotAllowExecutionDryRunOneRun === true &&
      finalMarker?.doesNotOpenPublicProductionRealLead === true &&
      finalMarker?.doesNotStartV16 === true
  );

  const acceptedItems = asStringArray(root.v15AcceptedItems);
  ok("v15 accepted items complete", acceptedItems.length >= 4);

  const notApprovedItems = asStringArray(root.v15StillNotApprovedItems);
  ok(
    "v15 still-not-approved items complete",
    notApprovedItems.length >= 6 &&
      notApprovedItems.some((v) => /execution/i.test(v)) &&
      notApprovedItems.some((v) => /v16/i.test(v))
  );

  const evidenceChain = asStringArray(root.finalEvidenceChainMarker);
  ok(
    "final evidence chain marker complete",
    evidenceChain.length >= 9 &&
      evidenceChain.some((v) => v.includes("v15.20")) &&
      evidenceChain.some((v) => v.includes("v15.21"))
  );

  const v1520Summary = root.v1520AcceptanceCheckSummary as Record<string, unknown>;
  ok(
    "v15.20 acceptance check summary complete",
    v1520Summary?.isPassed === true &&
      v1520Summary?.acceptanceCompletenessRecorded === true &&
      v1520Summary?.keptBoundaryLocks === true &&
      v1520Summary?.isPredecessorToV1521ClosedMarker === true
  );

  const noRealApproval = root.noRealApprovalFinalMarker as Record<string, unknown>;
  ok(
    "no real approval final marker complete",
    noRealApproval?.isRealOwnerApproval === false &&
      noRealApproval?.isDeployApproval === false &&
      noRealApproval?.authorizesExecution === false &&
      noRealApproval?.authorizesDryRun === false &&
      noRealApproval?.authorizesPublicProductionRealLead === false
  );

  const noDryRunExecution = root.noDryRunExecutionFinalMarker as Record<string, unknown>;
  ok(
    "no dry-run/execution final marker complete",
    noDryRunExecution?.dryRunPerformed === false &&
      noDryRunExecution?.executionPerformed === false &&
      noDryRunExecution?.oneRunAuthorized === false &&
      noDryRunExecution?.retryOrSecondRunAuthorized === false
  );

  const boundaries = root.boundaries as Record<string, unknown>;
  ok(
    "public/production/real lead boundary final marker complete",
    boundaries?.noProductionDeploy === true &&
      boundaries?.noProductionActivation === true &&
      boundaries?.noPublicRouteActivation === true &&
      boundaries?.noBuyerFacingPublicRelease === true &&
      boundaries?.noRealLeadSending === true
  );

  const runtime = root.runtimeProviderGemini as Record<string, unknown>;
  ok("runtime/provider/gemini boundary final marker complete", hasAllTrue(runtime, 4));

  const security = root.securityPrivacy as Record<string, unknown>;
  ok(
    "security/privacy/pii/token boundary final marker complete",
    hasAllTrue(security, 4)
  );

  const thorDealerImport = root.thorDealerImport as Record<string, unknown>;
  ok(
    "Thor/dealer real import boundary final marker complete",
    hasAllTrue(thorDealerImport, 3)
  );

  const remainingLocked = root.remainingLockedGatesAfterClosedMarker as Record<string, unknown>;
  ok("remaining locked gates after closed marker complete", hasAllTrue(remainingLocked, 9));

  const safeTransition = root.safeTransitionNote as Record<string, unknown>;
  ok(
    "safe transition note complete and does not start v16",
    safeTransition?.doesNotStartV16 === true &&
      safeTransition?.v16NeedsSeparateOwnerReviewApproval === true &&
      safeTransition?.v16NeedsNewScopeAndGates === true &&
      safeTransition?.noV16RealDealerRealLeadUntilSeparateScopeGatesApproval === true &&
      safeTransition?.futureExecutionNeedsFreshOwnerApprovalExactCommandTargetEvidenceOneRunLimit === true
  );

  const stopCondition = root.stopConditionCarryForward as Record<string, unknown>;
  ok(
    "stop condition carry-forward complete",
    Object.keys(stopCondition ?? {}).length >= 10 &&
      Object.values(stopCondition ?? {}).every((value) => value === "HOLD")
  );

  const thaiSummary = root.thaiOwnerClosedSummary as Record<string, unknown>;
  ok(
    "Thai owner-friendly closed summary complete",
    typeof thaiSummary?.summary === "string" &&
      typeof thaiSummary?.approvalStatus === "string" &&
      typeof thaiSummary?.executionStatus === "string" &&
      typeof thaiSummary?.launchStatus === "string" &&
      typeof thaiSummary?.versionStatus === "string"
  );

  const nextRecommendation = String(root.nextRecommendation ?? "");
  ok(
    "next recommendation is owner acknowledgment or planning-only v16 prompt",
    /owner acknowledgment/i.test(nextRecommendation) &&
      /v16/i.test(nextRecommendation) &&
      /planning-only/i.test(nextRecommendation) &&
      /no execution/i.test(nextRecommendation)
  );
}

ok(
  "doc includes required final closed marker sections",
  hasEveryLine(doc, [
    "## 1) v15.21 Scope",
    "## 2) Closed-Marker-Only / No-Execution Status",
    "## 3) Baseline Confirmation: v13/v14/v15.0-v15.20",
    "## 4) Final v15 Closed Marker Statement",
    "## 5) v15 Preparation Accepted Items",
    "## 6) v15 Still-Not-Approved Items",
    "## 7) Final Evidence Chain Marker",
    "## 8) v15.20 Acceptance Check Summary",
    "## 9) No Real Approval Final Marker",
    "## 10) No Dry-Run/Execution Final Marker",
    "## 11) Public/Production/Real Lead Boundary Final Marker",
    "## 12) Runtime/Provider/Gemini Boundary Final Marker",
    "## 13) Security/Privacy/PII/Token Boundary Final Marker",
    "## 14) Thor/Dealer Real Import Boundary Final Marker",
    "## 15) Remaining Locked Gates After v15 Closed Marker",
    "## 16) Safe Transition Note: Future v16 Requires Separate Owner Approval and New Scope",
    "## 17) Stop Condition Carry-Forward Into Future Work",
    "## 18) Thai Owner-Friendly Closed Summary",
    "## 19) Exact Next Step Recommendation"
  ])
);

ok(
  "doc states final closed-marker only no-launch no-v16 constraints",
  hasEveryLine(doc, [
    "v15.21 is final v15 closed marker only",
    "v15.21 closes only v15 preparation and does not open real operation",
    "v15.21 is not owner approval for execution",
    "v15.21 does not allow execution, dry-run, or one-run",
    "v15.21 does not open public/production/real lead",
    "v15.21 does not start v16"
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
    "package has test:v15.21 script",
    scripts["test:v15.21"] === "tsx scripts/test-v1521-final-v15-closed-marker.mts"
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
  ["execution authorize phrase", /\bauthorize(d)?\s+execution\b/i],
  ["production activated", /\bproduction\s+(is\s+)?activated\b/i],
  ["public route activated", /\bpublic\s+route\s+activated\b/i],
  ["real lead enabled", /\breal\s+lead\s+(is\s+)?enabled\b/i],
  ["v16 started", /\bv16\s+(has\s+)?started\b/i],
  ["thai launched phrase", /เปิดใช้งานจริงแล้ว|เปิดระบบจริงแล้ว|เริ่ม v16 แล้ว/i],
  ["unsafe execution go", /\bexecution\s+GO\b/i],
  ["standalone GO", /\bGO\b/]
];
for (const [name, re] of forbiddenExecutionApprovalPatterns) {
  ok(`no unsafe authorization phrase ${name}`, !re.test(combined));
}

const forbiddenBoundaryBreakPatterns: Array<[string, RegExp]> = [
  ["public opened", /\bpublic\s+(is\s+)?open(ed)?\b/i],
  ["production opened", /\bproduction\s+(is\s+)?open(ed)?\b/i],
  ["real lead live", /\breal\s+lead\s+(is\s+)?live\b/i],
  ["v16 in progress", /\bv16\s+in\s+progress\b/i]
];
for (const [name, re] of forbiddenBoundaryBreakPatterns) {
  ok(`no boundary-break phrase ${name}`, !re.test(combined));
}

console.log(`\nDone v15.21 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
