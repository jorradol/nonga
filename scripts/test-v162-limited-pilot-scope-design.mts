/**
 * v16.2 limited pilot scope design validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.2
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.2-limited-pilot-scope-design.md";
const FIXTURE_PATH = "docs/examples/v16.2-limited-pilot-scope-design.synthetic.json";
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

console.log("=== v16.2 Limited Pilot Scope Design Validation ===\n");

ok("1) doc exists", existsSync(DOC_PATH));
ok("2) fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "3) doc/fixture identify v16.2 correctly",
  /v16\.2 — Limited Pilot Scope Design/.test(doc) && fixtureRaw.includes("\"version\": \"v16.2\"")
);

ok(
  "4) execution type is limited-pilot-scope-design only",
  hasEveryLine(doc, ["scope-design-only artifact", "planning-only artifact"]) &&
    fixtureRaw.includes("\"executionType\": \"limited-pilot-scope-design only\"")
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

  ok("5) isScopeDesignOnly=true", root.isScopeDesignOnly === true);
  ok("6) isPlanningOnly=true", root.isPlanningOnly === true);
  ok("7) isExecution=false", root.isExecution === false);
  ok("8) isDryRun=false", root.isDryRun === false);
  ok("9) isOwnerApproval=false", root.isOwnerApproval === false);
  ok("10) isPublicRelease=false", root.isPublicRelease === false);
  ok("11) isProductionActivation=false", root.isProductionActivation === false);
  ok("12) isRealLead=false", root.isRealLead === false);
  ok("13) isRealDealerAction=false", root.isRealDealerAction === false);
  ok("14) isThorRealImport=false", root.isThorRealImport === false);
  ok("15) isDealerRealImport=false", root.isDealerRealImport === false);

  const baseline = root.baseline as Record<string, unknown>;
  ok(
    "16) baseline v13/v14/v15 closed + v16.0-v16.1 passed complete",
    baseline?.["v13"] === "CLOSED" &&
      baseline?.["v14"] === "CLOSED" &&
      baseline?.["v15"] === "CLOSED" &&
      baseline?.["v16.0"] === "PASSED" &&
      baseline?.["v16.1"] === "PASSED" &&
      baseline?.["v16.2"] === "PLANNING ONLY"
  );

  const limitedPilotPurpose = root.limitedPilotPurpose as Record<string, unknown>;
  ok("17) limited pilot purpose complete", hasAllTrue(limitedPilotPurpose, 4));

  const proposedPilotBoundaries = root.proposedPilotBoundaries as Record<string, unknown>;
  ok("18) proposed pilot boundaries complete", hasAllTrue(proposedPilotBoundaries, 5));

  const proposedDealerCohortBoundary = root.proposedDealerCohortBoundary as Record<string, unknown>;
  ok("19) proposed dealer cohort boundary complete", hasAllTrue(proposedDealerCohortBoundary, 4));

  const proposedLeadEligibilityBoundary = root.proposedLeadEligibilityBoundary as Record<string, unknown>;
  ok(
    "20) proposed lead eligibility boundary complete",
    hasAllTrue(proposedLeadEligibilityBoundary, 4)
  );

  const proposedUserExposureBoundary = root.proposedUserExposureBoundary as Record<string, unknown>;
  ok("21) proposed user exposure boundary complete", hasAllTrue(proposedUserExposureBoundary, 4));

  const proposedDataBoundary = root.proposedDataBoundary as Record<string, unknown>;
  ok("22) proposed data boundary complete", hasAllTrue(proposedDataBoundary, 5));

  const proposedEvidenceBoundary = root.proposedEvidenceBoundary as Record<string, unknown>;
  ok("23) proposed evidence boundary complete", hasAllTrue(proposedEvidenceBoundary, 4));

  const notAllowedActions = asStringArray(root.notAllowedActions);
  ok(
    "24) not allowed actions complete",
    notAllowedActions.length >= 18 &&
      notAllowedActions.some((v) => /no execution/i.test(v)) &&
      notAllowedActions.some((v) => /no real lead/i.test(v)) &&
      notAllowedActions.some((v) => /no dealer real inventory import/i.test(v))
  );

  const ownerApprovalGates = root.ownerApprovalGates as Record<string, unknown>;
  ok("25) owner approval gates complete", hasAllTrue(ownerApprovalGates, 4));

  const futureRunRequirements = root.futureRunRequirements as Record<string, unknown>;
  ok("26) future run requirements complete", hasAllTrue(futureRunRequirements, 4));

  const oneRunPolicy = root.oneRunPolicy as Record<string, unknown>;
  ok(
    "27) one-run/no-retry/no-second-run policy complete",
    oneRunPolicy?.oneRunOnlyWhenSeparatelyApproved === true &&
      oneRunPolicy?.noAutomaticRetry === true &&
      oneRunPolicy?.noSecondRunWithoutFreshOwnerApproval === true
  );

  const boundaries = root.boundaries as Record<string, unknown>;
  ok(
    "28) public/production/real lead boundary complete",
    boundaries?.noProductionDeploy === true &&
      boundaries?.noProductionActivation === true &&
      boundaries?.noPublicRouteActivation === true &&
      boundaries?.noBuyerFacingPublicRelease === true &&
      boundaries?.noRealLeadSending === true &&
      boundaries?.noRealDealerAction === true
  );

  const runtimeProviderGemini = root.runtimeProviderGemini as Record<string, unknown>;
  ok("29) runtime/provider/Gemini boundary complete", hasAllTrue(runtimeProviderGemini, 4));

  const securityPrivacy = root.securityPrivacy as Record<string, unknown>;
  ok("30) security/privacy/PII/token boundary complete", hasAllTrue(securityPrivacy, 4));

  const thorImport = {
    noThorRealImport: root.isThorRealImport === false,
    noDealerRealImport: root.isDealerRealImport === false,
    noImportMarkerInBoundary:
      (root.proposedDataBoundary as Record<string, unknown>)?.noThorRealImport === true &&
      (root.proposedDataBoundary as Record<string, unknown>)?.noDealerRealInventoryImport === true
  };
  ok("31) Thor/dealer real import boundary complete", hasAllTrue(thorImport, 3));

  const rollbackKillSwitch = root.rollbackKillSwitch as Record<string, unknown>;
  ok("32) rollback/kill-switch requirements complete", hasAllTrue(rollbackKillSwitch, 4));

  const stopConditions = root.stopConditions as Record<string, unknown>;
  ok(
    "33) stop conditions complete",
    Object.keys(stopConditions ?? {}).length >= 10 &&
      Object.values(stopConditions ?? {}).every((value) => value === "HOLD")
  );

  const decisionOptions = asStringArray(root.decisionOptions);
  ok(
    "34) decision options complete",
    decisionOptions.length >= 15 &&
      decisionOptions.includes(
        "READY FOR v16.3 LIMITED PILOT SCOPE REVIEW — PLANNING ONLY / NO EXECUTION"
      )
  );

  const thaiOwnerSummary = root.thaiOwnerSummary as Record<string, unknown>;
  ok(
    "35) Thai owner-friendly summary complete",
    typeof thaiOwnerSummary?.summary === "string" &&
      typeof thaiOwnerSummary?.status === "string" &&
      typeof thaiOwnerSummary?.approvalStatus === "string" &&
      typeof thaiOwnerSummary?.activationStatus === "string"
  );

  const nextRecommendation = String(root.nextRecommendation ?? "");
  ok(
    "36) next recommendation is v16.3 planning-only scope review step",
    /v16\.3/i.test(nextRecommendation) &&
      /planning/i.test(nextRecommendation) &&
      /review/i.test(nextRecommendation) &&
      /no execution/i.test(nextRecommendation)
  );
}

ok(
  "doc includes required v16.2 sections",
  hasEveryLine(doc, [
    "## 1) v16.2 Scope",
    "## 2) Scope-Design-Only / Planning-Only / No-Execution Status",
    "## 3) Baseline Confirmation: v13/v14/v15 Closed + v16.0-v16.1 Passed",
    "## 4) Limited Pilot Purpose",
    "## 5) Proposed Pilot Boundaries",
    "## 6) Proposed Dealer Cohort Boundary",
    "## 7) Proposed Lead Eligibility Boundary",
    "## 8) Proposed User Exposure Boundary",
    "## 9) Proposed Data Boundary",
    "## 10) Proposed Evidence Boundary",
    "## 11) Not-Allowed Actions",
    "## 12) Owner Approval Gates Required Before Future Action",
    "## 13) Future Run Exact Command/Target/Evidence Requirements",
    "## 14) One-Run / No-Retry / No-Second-Run Carry-Forward",
    "## 15) Public/Production/Real Lead Boundary",
    "## 16) Runtime/Provider/Gemini Boundary",
    "## 17) Security/Privacy/PII/Token Boundary",
    "## 18) Thor/Dealer Real Import Boundary",
    "## 19) Rollback/Kill-Switch Requirements",
    "## 20) Stop Condition Matrix",
    "## 21) Decision Options",
    "## 22) Thai Owner-Friendly Summary",
    "## 23) Exact Next Step Recommendation"
  ])
);

ok(
  "doc states v16.2 non-execution constraints clearly",
  hasEveryLine(doc, [
    "v16.2 is scope design only",
    "v16.2 is planning only",
    "v16.2 does not start real dealer pilot",
    "v16.2 does not send real lead",
    "v16.2 does not import Thor/dealer real data",
    "v16.2 does not open public/production",
    "v16.2 does not call Gemini/runtime/provider",
    "v16.2 is not owner approval for execution",
    "pilot scope is proposal/design boundary only, not real-use approval"
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
    "package has test:v16.2 script",
    scripts["test:v16.2"] === "tsx scripts/test-v162-limited-pilot-scope-design.mts"
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
  ok(`37/38) no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenExecutionApprovalPatterns: Array<[string, RegExp]> = [
  ["real final execution authorize", /real\s+FINAL\s+EXECUTION\s+AUTHORIZE/i],
  ["execute approved", /\bexecute[_\s-]?approved\b/i],
  ["execution authorize phrase", /\bauthorize(d)?\s+execution\b/i],
  ["public route activated", /\bpublic\s+route\s+activated\b/i],
  ["production activated", /\bproduction\s+(is\s+)?activated\b/i],
  ["real lead enabled", /\breal\s+lead\s+(is\s+)?enabled\b/i],
  ["v16 real pilot started", /\bv16\s+real\s+pilot\s+(has\s+)?started\b/i],
  ["thai launched phrase", /เปิดใช้งานจริงแล้ว|เปิดระบบจริงแล้ว|เริ่ม real pilot แล้ว|เปิด public แล้ว|ขึ้น production แล้ว/i]
];
for (const [name, re] of forbiddenExecutionApprovalPatterns) {
  ok(`39/40/41) no unsafe authorization/activation phrase ${name}`, !re.test(combined));
}

const forbiddenRealDataPatterns: Array<[string, RegExp]> = [
  ["real dealer inventory payload marker", /\brealDealerInventory(Data|Payload)?\b/i],
  ["real customer data marker", /\brealCustomer(Data|Record)?\b/i],
  ["real lead data marker", /\brealLead(Data|Record)?\b/i]
];
for (const [name, re] of forbiddenRealDataPatterns) {
  ok(`42) no real-data sample marker ${name}`, !re.test(combined));
}

console.log(`\nDone v16.2 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
