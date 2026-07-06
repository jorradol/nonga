/**
 * v16.1 limited pilot planning review validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.1
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.1-limited-pilot-planning-review.md";
const FIXTURE_PATH = "docs/examples/v16.1-limited-pilot-planning-review.synthetic.json";
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

console.log("=== v16.1 Limited Pilot Planning Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.1 correctly",
  /v16\.1 — Limited Pilot Planning Review/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.1\"")
);

ok(
  "execution type is v16-planning-review only",
  hasEveryLine(doc, ["planning-review-only artifact", "no execution"]) &&
    fixtureRaw.includes("\"executionType\": \"v16-planning-review only\"")
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

  ok("isPlanningReviewOnly=true", root.isPlanningReviewOnly === true);
  ok("isExecution=false", root.isExecution === false);
  ok("isDryRun=false", root.isDryRun === false);
  ok("isOwnerApproval=false", root.isOwnerApproval === false);
  ok("isPublicRelease=false", root.isPublicRelease === false);
  ok("isProductionActivation=false", root.isProductionActivation === false);
  ok("isRealLead=false", root.isRealLead === false);
  ok("isRealDealerAction=false", root.isRealDealerAction === false);
  ok("isThorRealImport=false", root.isThorRealImport === false);
  ok("isDealerRealImport=false", root.isDealerRealImport === false);

  const baseline = root.baseline as Record<string, unknown>;
  ok(
    "baseline v13/v14/v15 closed + v16.0 passed complete",
    baseline?.["v13"] === "CLOSED" &&
      baseline?.["v14"] === "CLOSED" &&
      baseline?.["v15"] === "CLOSED" &&
      baseline?.["v16.0"] === "PASSED" &&
      baseline?.["v16.1"] === "PLANNING REVIEW ONLY"
  );

  const v160PlanningPacketReview = root.v160PlanningPacketReview as Record<string, unknown>;
  ok(
    "v16.0 planning packet review complete",
    v160PlanningPacketReview?.planningPacketExists === true &&
      v160PlanningPacketReview?.requiredSectionsComplete === true &&
      v160PlanningPacketReview?.boundariesComplete === true &&
      v160PlanningPacketReview?.planningOnlyLanguageConfirmed === true &&
      v160PlanningPacketReview?.reviewStatus === "PASSED"
  );

  const allowedPlanningItemsReview = root.allowedPlanningItemsReview as Record<string, unknown>;
  ok("allowed planning items review complete", hasAllTrue(allowedPlanningItemsReview, 5));

  const notAllowedActionsReview = root.notAllowedActionsReview as Record<string, unknown>;
  ok("not-allowed actions review complete", hasAllTrue(notAllowedActionsReview, 10));

  const ownerApprovalGatesReview = root.ownerApprovalGatesReview as Record<string, unknown>;
  ok("owner approval gates review complete", hasAllTrue(ownerApprovalGatesReview, 4));

  const futureRunRequirementsReview = root.futureRunRequirementsReview as Record<string, unknown>;
  ok("future run requirements review complete", hasAllTrue(futureRunRequirementsReview, 4));

  const oneRunPolicyReview = root.oneRunPolicyReview as Record<string, unknown>;
  ok(
    "one-run/no-retry/no-second-run policy review complete",
    oneRunPolicyReview?.oneRunLimitMandatory === true &&
      oneRunPolicyReview?.noAutomaticRetry === true &&
      oneRunPolicyReview?.noSecondRunWithoutFreshOwnerApproval === true
  );

  const boundaries = root.boundaries as Record<string, unknown>;
  ok(
    "public/production/real lead boundary review complete",
    boundaries?.noProductionDeploy === true &&
      boundaries?.noProductionActivation === true &&
      boundaries?.noPublicRouteActivation === true &&
      boundaries?.noBuyerFacingPublicRelease === true &&
      boundaries?.noRealLeadSending === true &&
      boundaries?.noRealDealerAction === true
  );

  const runtimeProviderGemini = root.runtimeProviderGemini as Record<string, unknown>;
  ok("runtime/provider/Gemini boundary review complete", hasAllTrue(runtimeProviderGemini, 4));

  const securityPrivacy = root.securityPrivacy as Record<string, unknown>;
  ok("security/privacy/PII/token boundary review complete", hasAllTrue(securityPrivacy, 4));

  const rollbackKillSwitch = root.rollbackKillSwitch as Record<string, unknown>;
  ok("rollback/kill-switch requirement review complete", hasAllTrue(rollbackKillSwitch, 4));

  const stopConditions = root.stopConditions as Record<string, unknown>;
  ok(
    "stop conditions complete",
    Object.keys(stopConditions ?? {}).length >= 10 &&
      Object.values(stopConditions ?? {}).every((value) => value === "HOLD")
  );

  const decisionOptions = asStringArray(root.decisionOptions);
  ok(
    "decision options complete",
    decisionOptions.length >= 10 &&
      decisionOptions.includes(
        "READY FOR v16.2 LIMITED PILOT SCOPE DESIGN — PLANNING ONLY / NO EXECUTION"
      )
  );

  const thaiOwnerSummary = root.thaiOwnerSummary as Record<string, unknown>;
  ok(
    "Thai owner-friendly summary complete",
    typeof thaiOwnerSummary?.summary === "string" &&
      typeof thaiOwnerSummary?.status === "string" &&
      typeof thaiOwnerSummary?.approvalStatus === "string" &&
      typeof thaiOwnerSummary?.activationStatus === "string"
  );

  const nextRecommendation = String(root.nextRecommendation ?? "");
  ok(
    "next recommendation is v16.2 planning-only scope design step",
    /v16\.2/i.test(nextRecommendation) &&
      /planning/i.test(nextRecommendation) &&
      /no execution/i.test(nextRecommendation)
  );
}

ok(
  "doc includes required planning review sections",
  hasEveryLine(doc, [
    "## 1) v16.1 Scope",
    "## 2) Planning-Review-Only / No-Execution Status",
    "## 3) Baseline Confirmation: v13/v14/v15 Closed + v16.0 Passed",
    "## 4) v16.0 Planning Packet Completeness Review",
    "## 5) Allowed Planning Items Review",
    "## 6) Not-Allowed Actions Review",
    "## 7) Owner Approval Gates Review",
    "## 8) Future Run Requirements Review",
    "## 9) One-Run / No-Retry / No-Second-Run Policy Review",
    "## 10) Public/Production/Real Lead Boundary Review",
    "## 11) Runtime/Provider/Gemini Boundary Review",
    "## 12) Security/Privacy/PII/Token Boundary Review",
    "## 13) Thor/Dealer Real Import Boundary Review",
    "## 14) Rollback/Kill-Switch Requirement Review",
    "## 15) Stop Condition Review",
    "## 16) Decision Options Review",
    "## 17) Thai Owner-Friendly Review Summary",
    "## 18) Exact Next Step Recommendation"
  ])
);

ok(
  "doc states planning-review-only and no-real-action constraints clearly",
  hasEveryLine(doc, [
    "v16.1 is planning review only",
    "v16.1 does not start real dealer pilot",
    "v16.1 does not send real lead",
    "v16.1 does not import Thor/dealer real data",
    "v16.1 does not open public/production",
    "v16.1 does not call Gemini/runtime/provider",
    "v16.1 is not owner approval for execution"
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
    "package has test:v16.1 script",
    scripts["test:v16.1"] === "tsx scripts/test-v161-limited-pilot-planning-review.mts"
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
  ["public route activated", /\bpublic\s+route\s+activated\b/i],
  ["production activated", /\bproduction\s+(is\s+)?activated\b/i],
  ["real lead enabled", /\breal\s+lead\s+(is\s+)?enabled\b/i],
  ["v16 real pilot started", /\bv16\s+real\s+pilot\s+(has\s+)?started\b/i],
  ["thai launched phrase", /เปิดใช้งานจริงแล้ว|เปิดระบบจริงแล้ว|เริ่ม real pilot แล้ว/i]
];
for (const [name, re] of forbiddenExecutionApprovalPatterns) {
  ok(`no unsafe authorization phrase ${name}`, !re.test(combined));
}

const forbiddenRealDataPatterns: Array<[string, RegExp]> = [
  ["real dealer inventory payload marker", /\brealDealerInventory(Data|Payload)?\b/i],
  ["real customer data marker", /\brealCustomer(Data|Record)?\b/i],
  ["real lead data marker", /\brealLead(Data|Record)?\b/i]
];
for (const [name, re] of forbiddenRealDataPatterns) {
  ok(`no real-data sample marker ${name}`, !re.test(combined));
}

console.log(`\nDone v16.1 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
