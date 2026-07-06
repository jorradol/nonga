/**
 * v16.0 limited real dealer / real lead pilot planning packet validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.0
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.0-limited-real-dealer-real-lead-pilot-planning-packet.md";
const FIXTURE_PATH =
  "docs/examples/v16.0-limited-real-dealer-real-lead-pilot-planning-packet.synthetic.json";
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

console.log("=== v16.0 Limited Real Dealer/Real Lead Planning Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.0 correctly",
  /v16\.0 — Limited Real Dealer \/ Real Lead Pilot Planning Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.0\"")
);

ok(
  "execution type is v16-planning-only",
  hasEveryLine(doc, ["planning-only artifact", "no execution"]) &&
    fixtureRaw.includes("\"executionType\": \"v16-planning-only\"")
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

  ok("isPlanningOnly=true", root.isPlanningOnly === true);
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
    "baseline v13/v14/v15 closed + v16 planning-only complete",
    baseline?.["v13"] === "CLOSED" &&
      baseline?.["v14"] === "CLOSED" &&
      baseline?.["v15"] === "CLOSED" &&
      baseline?.["v16"] === "PLANNING ONLY"
  );

  const objective = root.v16Objective as Record<string, unknown>;
  ok(
    "v16 objective complete",
    typeof objective?.plainThai === "string" &&
      objective?.planningFocusOnly === true &&
      objective?.noExecutionInV160 === true
  );

  const allowedPlanningItems = asStringArray(root.allowedPlanningItems);
  ok("allowed planning items complete", allowedPlanningItems.length >= 5);

  const notAllowedActions = asStringArray(root.notAllowedActions);
  ok(
    "not allowed actions complete",
    notAllowedActions.length >= 10 &&
      notAllowedActions.some((v) => /no execution/i.test(v)) &&
      notAllowedActions.some((v) => /no real lead/i.test(v)) &&
      notAllowedActions.some((v) => /no Thor real data import/i.test(v))
  );

  const ownerApprovalGates = root.ownerApprovalGates as Record<string, unknown>;
  ok("owner approval gates complete", hasAllTrue(ownerApprovalGates, 4));

  const futureRunRequirements = root.futureRunRequirements as Record<string, unknown>;
  ok("future run requirements complete", hasAllTrue(futureRunRequirements, 4));

  const oneRunPolicy = root.oneRunPolicy as Record<string, unknown>;
  ok(
    "one-run/no-retry/no-second-run policy complete",
    oneRunPolicy?.oneRunOnlyWhenSeparatelyApproved === true &&
      oneRunPolicy?.noAutomaticRetry === true &&
      oneRunPolicy?.noSecondRunWithoutFreshOwnerApproval === true
  );

  const boundaries = root.boundaries as Record<string, unknown>;
  ok(
    "public/production/real lead boundary complete",
    boundaries?.noProductionDeploy === true &&
      boundaries?.noProductionActivation === true &&
      boundaries?.noPublicRouteActivation === true &&
      boundaries?.noBuyerFacingPublicRelease === true &&
      boundaries?.noRealLeadSending === true &&
      boundaries?.noRealDealerAction === true
  );

  const runtime = root.runtimeProviderGemini as Record<string, unknown>;
  ok("runtime/provider/Gemini boundary complete", hasAllTrue(runtime, 4));

  const security = root.securityPrivacy as Record<string, unknown>;
  ok("security/privacy/PII/token boundary complete", hasAllTrue(security, 4));

  const rollbackKillSwitch = root.rollbackKillSwitch as Record<string, unknown>;
  ok("rollback/kill-switch requirement complete", hasAllTrue(rollbackKillSwitch, 4));

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
      decisionOptions.includes("READY FOR v16.1 LIMITED PILOT PLANNING REVIEW — NO EXECUTION")
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
    "next recommendation is v16.1 planning review only",
    /v16\.1/i.test(nextRecommendation) &&
      /planning/i.test(nextRecommendation) &&
      /no execution/i.test(nextRecommendation)
  );
}

ok(
  "doc includes required planning packet sections",
  hasEveryLine(doc, [
    "## 1) v16.0 Scope",
    "## 2) Planning-Only / No-Execution Status",
    "## 3) Baseline Confirmation: v13/v14/v15 Closed + v16 Planning-Only",
    "## 4) v16 Objective in Plain Thai",
    "## 5) What v16 Is Allowed to Plan",
    "## 6) What v16 Is Still Not Allowed to Do",
    "## 7) Limited Real Dealer Pilot Concept",
    "## 8) Limited Real Lead Pilot Concept",
    "## 9) Owner Approval Gates Required Before Any Future Action",
    "## 10) Exact Command/Target/Evidence Requirement for Any Future Run",
    "## 11) One-Run / No-Retry / No-Second-Run Policy Carry-Forward",
    "## 12) Public/Production/Real Lead Boundary",
    "## 13) Runtime/Provider/Gemini Boundary",
    "## 14) Security/Privacy/PII/Token Boundary",
    "## 15) Thor/Dealer Real Import Boundary",
    "## 16) Rollback/Kill-Switch Requirement Before Any Future Execution",
    "## 17) Stop Condition Matrix",
    "## 18) Decision Options",
    "## 19) Thai Owner-Friendly Summary",
    "## 20) Exact Next Step Recommendation"
  ])
);

ok(
  "doc states planning-only and no-real-action constraints clearly",
  hasEveryLine(doc, [
    "v16.0 is planning packet only",
    "v16.0 does not start real dealer pilot",
    "v16.0 does not send real lead",
    "v16.0 does not import Thor/dealer real data",
    "v16.0 does not open public/production",
    "v16.0 does not call Gemini/runtime/provider",
    "v16.0 is not owner approval for execution"
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
    "package has test:v16.0 script",
    scripts["test:v16.0"] ===
      "tsx scripts/test-v160-limited-real-dealer-real-lead-pilot-planning-packet.mts"
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

console.log(`\nDone v16.0 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
