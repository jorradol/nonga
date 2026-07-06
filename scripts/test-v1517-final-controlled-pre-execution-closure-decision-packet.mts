/**
 * v15.17 final controlled pre-execution closure decision packet validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.17
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.17-final-controlled-pre-execution-closure-decision-packet.md";
const FIXTURE_PATH =
  "docs/examples/v15.17-final-controlled-pre-execution-closure-decision-packet.synthetic.json";
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

console.log(
  "=== v15.17 Final Controlled Pre-Execution Closure Decision Packet Validation ===\n"
);

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc and fixture state v15.17 correctly",
  /v15\.17 — Final Controlled Pre-Execution Closure Decision Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v15.17\"")
);

ok(
  "execution type is decision packet only",
  hasEveryLine(doc, ["decision-packet-only artifact", "no execution"]) &&
    fixtureRaw.includes(
      "\"executionType\": \"final-pre-execution-closure-decision-packet only\""
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

  ok("isDecisionPacketOnly=true", root.isDecisionPacketOnly === true);
  ok("isExecution=false", root.isExecution === false);
  ok("isDryRun=false", root.isDryRun === false);
  ok("isOwnerApproval=false", root.isOwnerApproval === false);
  ok("isPublicRelease=false", root.isPublicRelease === false);
  ok("isProductionActivation=false", root.isProductionActivation === false);
  ok("isRealLead=false", root.isRealLead === false);
  ok("isV16=false", root.isV16 === false);

  const baseline = root.baseline as Record<string, unknown>;
  ok(
    "baseline v13 v14 v15.0-v15.16 complete",
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
      baseline?.["v15.16"] === "PASSED"
  );

  const prepEvidence = root.v15PreparationCompletionEvidence as Record<string, unknown>;
  ok(
    "v15 preparation completion evidence summary complete",
    hasAllTrue(prepEvidence, 4)
  );

  const readiness = root.readinessChainFinalReview as Record<string, unknown>;
  ok("readiness chain final review complete", hasAllTrue(readiness, 5));

  const approvalSafety = root.approvalSafetyChainFinalReview as Record<string, unknown>;
  ok(
    "approval safety chain final review complete",
    hasAllTrue(approvalSafety, 5)
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
    hasAllTrue(runtime, 3)
  );

  const security = root.securityPrivacy as Record<string, unknown>;
  ok(
    "security privacy pii token boundary final confirmation complete",
    hasAllTrue(security, 4)
  );

  ok(
    "thor dealer real import boundary final confirmation complete",
    boundaries?.noThorRealDataImport === true &&
      boundaries?.noDealerRealInventoryImport === true &&
      boundaries?.noV16RealDealerRealLeadAction === true
  );

  const rollback = root.rollbackKillSwitch as Record<string, unknown>;
  ok("rollback kill-switch final reference complete", hasAllTrue(rollback, 4));

  const stopConditions = root.stopConditions as Record<string, unknown>;
  ok(
    "stop conditions complete",
    Object.keys(stopConditions ?? {}).length >= 10 &&
      Object.values(stopConditions ?? {}).every((value) => value === "HOLD")
  );

  const locked = root.remainingLockedGates as Record<string, unknown>;
  ok("remaining locked gates complete", hasAllTrue(locked, 7));

  const ownerDecisionOptions = Array.isArray(root.ownerDecisionOptions)
    ? (root.ownerDecisionOptions as string[])
    : [];
  ok(
    "owner decision options complete",
    ownerDecisionOptions.length >= 10 &&
      ownerDecisionOptions.includes(
        "READY FOR v15.18 OWNER-FACING FINAL V15 CLOSURE REVIEW — NO EXECUTION"
      ) &&
      ownerDecisionOptions.includes("HOLD — TEST FAILURE")
  );

  const recommendedDecision = String(root.recommendedDecision ?? "");
  ok(
    "recommended decision is owner review closure only",
    recommendedDecision ===
      "READY FOR v15.18 OWNER-FACING FINAL V15 CLOSURE REVIEW — NO EXECUTION"
  );
  ok(
    "recommended decision is not execution approval",
    !/execution approval|approve execution|authorize execution/i.test(
      recommendedDecision
    )
  );

  const thai = root.thaiOwnerSummary as Record<string, unknown>;
  ok(
    "thai owner-friendly summary complete",
    typeof thai?.summary === "string" &&
      typeof thai?.approvalStatus === "string" &&
      typeof thai?.executionStatus === "string" &&
      typeof thai?.launchStatus === "string" &&
      typeof thai?.versionStatus === "string"
  );

  const nextRecommendation = String(root.nextRecommendation ?? "");
  ok(
    "next recommendation is v15.18 owner-facing final v15 closure review no-execution step",
    /v15\.18/i.test(nextRecommendation) &&
      /owner-facing|owner review|owner-review/i.test(nextRecommendation) &&
      /final v15 closure review/i.test(nextRecommendation) &&
      /no-execution/i.test(nextRecommendation)
  );
}

ok(
  "doc includes required decision packet sections",
  hasEveryLine(doc, [
    "## 1) v15.17 Scope",
    "## 2) Decision-Packet-Only / No-Execution Status",
    "## 3) Baseline Confirmation: v13/v14/v15.0-v15.16",
    "## 4) v15 Preparation Completion Evidence Summary",
    "## 5) v15 Readiness Chain Final Review",
    "## 6) v15 Approval Safety Chain Final Review",
    "## 7) No Real Approval Final Confirmation",
    "## 8) No Dry-Run/Execution Final Confirmation",
    "## 9) Public/Production/Real Lead Boundary Final Confirmation",
    "## 10) Runtime/Provider/Gemini Boundary Final Confirmation",
    "## 11) Security/Privacy/PII/Token Boundary Final Confirmation",
    "## 12) Thor/Dealer Real Import Boundary Final Confirmation",
    "## 13) Rollback/Kill-Switch Final Readiness Reference",
    "## 14) Stop Condition Final Summary",
    "## 15) Remaining Locked Gates Before Any Future Execution",
    "## 16) Decision Options for Owner",
    "## 17) Recommended Decision",
    "## 18) Thai Owner-Friendly Summary",
    "## 19) Exact Next Step Recommendation",
  ])
);

ok(
  "doc states decision-only no-execution no-launch no-v16 constraints",
  hasEveryLine(doc, [
    "v15.17 is final closure decision packet only and not final public launch",
    "v15.17 is not owner approval",
    "v15.17 does not allow execution, dry-run, or one-run",
    "v15.17 does not open public/production/real lead",
    "v15.17 does not enter v16",
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
    "package has test:v15.17 script",
    scripts["test:v15.17"] ===
      "tsx scripts/test-v1517-final-controlled-pre-execution-closure-decision-packet.mts"
  );
}

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["generic api key assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
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
  ["thai public launched", /เปิดใช้งานจริงแล้ว|เปิดระบบจริงแล้ว|เริ่ม v16 แล้ว/i],
];
for (const [name, re] of forbiddenExecutionApprovalPatterns) {
  ok(`no unsafe authorization phrase ${name}`, !re.test(combined));
}

console.log(`\nDone v15.17 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
