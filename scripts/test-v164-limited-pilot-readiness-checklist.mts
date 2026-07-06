/**
 * v16.4 limited pilot readiness checklist validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.4
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.4-limited-pilot-readiness-checklist.md";
const FIXTURE_PATH = "docs/examples/v16.4-limited-pilot-readiness-checklist.synthetic.json";
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

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

console.log("=== v16.4 Limited Pilot Readiness Checklist Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.4 correctly",
  /v16\.4 — Limited Pilot Readiness Checklist/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.4\"")
);

ok(
  "planning-only phrases and execution-type are correct",
  hasEveryLine(doc, [
    "v16.4 is limited pilot readiness checklist only",
    "guiding phrase: วางกรอบ v16 ก่อน ยังไม่แตะของจริง",
    "v16.4 checklist does not unlock execution by itself",
    "v16.4 is readiness checklist only",
    "v16.4 is planning only"
  ]) && fixtureRaw.includes("\"executionType\": \"limited-pilot-readiness-checklist only\"")
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
  ok("noThorImport=true", root.noThorImport === true);
  ok("noDealerImport=true", root.noDealerImport === true);
  ok("noPII=true", root.noPII === true);
  ok("noTokenSecretExposure=true", root.noTokenSecretExposure === true);

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline complete through v16.4",
    baseline["v13"] === "CLOSED" &&
      baseline["v14"] === "CLOSED" &&
      baseline["v15"] === "CLOSED" &&
      baseline["v16.0"] === "PASSED" &&
      baseline["v16.1"] === "PASSED" &&
      baseline["v16.2"] === "PASSED" &&
      baseline["v16.3"] === "PASSED via v16.3A HOLD FIX" &&
      baseline["v16.4"] === "PLANNING ONLY / READINESS CHECKLIST ONLY"
  );

  const readinessAreas = asRecord(root.readinessAreas);
  ok("readiness areas complete", hasAllTrue(readinessAreas, 15));

  const readinessStatuses = asRecord(root.readinessStatuses);
  const allowedStatuses = new Set([
    "READY_FOR_PLANNING_REVIEW",
    "NEEDS_CLARIFICATION_BEFORE_EXECUTION_REQUEST",
    "BLOCKED_FOR_EXECUTION",
    "NOT_APPLICABLE_IN_PLANNING_ONLY"
  ]);
  ok(
    "readiness statuses exist and only allowed values used",
    Object.keys(readinessStatuses).length >= 15 &&
      Object.values(readinessStatuses).every((v) => typeof v === "string" && allowedStatuses.has(v))
  );
  ok(
    "readiness status values coverage is complete",
    Object.values(readinessStatuses).includes("READY_FOR_PLANNING_REVIEW") &&
      Object.values(readinessStatuses).includes("NEEDS_CLARIFICATION_BEFORE_EXECUTION_REQUEST") &&
      Object.values(readinessStatuses).includes("BLOCKED_FOR_EXECUTION") &&
      Object.values(readinessStatuses).includes("NOT_APPLICABLE_IN_PLANNING_ONLY")
  );

  ok(
    "required artifacts before future execution request are complete",
    Array.isArray(root.requiredArtifactsBeforeFutureExecution) &&
      root.requiredArtifactsBeforeFutureExecution.length >= 5
  );
  ok("open gaps are clear", Array.isArray(root.openGaps) && root.openGaps.length >= 3);
  ok(
    "blockers for execution are clear",
    Array.isArray(root.blockersForExecution) && root.blockersForExecution.length >= 2
  );

  const stopConditions = asRecord(root.stopConditions);
  ok(
    "stop conditions are complete and HOLD",
    Object.keys(stopConditions).length >= 10 &&
      Object.values(stopConditions).every((value) => value === "HOLD")
  );

  const ownerApprovalCarryForward = asRecord(root.ownerApprovalCarryForward);
  ok("owner approval carry-forward complete", hasAllTrue(ownerApprovalCarryForward, 4));

  const nextStepRecommendation = String(root.nextStepRecommendation ?? "");
  ok(
    "next recommendation is v16.5 planning-only decision step",
    /v16\.5/i.test(nextStepRecommendation) &&
      /planning/i.test(nextStepRecommendation) &&
      /no execution/i.test(nextStepRecommendation)
  );

  ok(
    "final decision is v16.5 owner decision packet planning-only",
    root.finalDecision ===
      "READY FOR v16.5 LIMITED PILOT OWNER DECISION PACKET — PLANNING ONLY / NO EXECUTION"
  );
}

ok(
  "doc includes all required checklist sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline Confirmation",
    "## 4) Readiness Checklist Decision",
    "## 5) Pilot Scope Readiness",
    "## 6) Dealer Cohort Readiness",
    "## 7) Lead Eligibility Readiness",
    "## 8) User Exposure Readiness",
    "## 9) Data Readiness",
    "## 10) Evidence Readiness",
    "## 11) Owner Approval Readiness",
    "## 12) Future Exact Command / Target / Evidence Readiness",
    "## 13) One-Run / No-Retry / No-Second-Run Readiness",
    "## 14) Public / Production / Real Lead Boundary Readiness",
    "## 15) Runtime / Provider / Gemini Boundary Readiness",
    "## 16) Security / Privacy / PII / Token Readiness",
    "## 17) Thor / Dealer Real Import Boundary Readiness",
    "## 18) Rollback / Kill-Switch Readiness",
    "## 19) Stop Condition Readiness",
    "## 20) Monitoring / Evidence Review Readiness",
    "## 21) Operator Role Readiness",
    "## 22) Required Artifacts Before Future Execution Request",
    "## 23) Open Gaps / Blockers",
    "## 24) Readiness Checklist Matrix",
    "## 25) Thai Owner-Friendly Summary",
    "## 26) Exact Next Step Recommendation"
  ])
);

ok(
  "doc confirms non-execution and non-approval boundaries",
  hasEveryLine(doc, [
    "v16.4 does not start real dealer pilot",
    "v16.4 does not send real lead",
    "v16.4 does not import Thor/dealer real data",
    "v16.4 does not open public/production",
    "v16.4 does not call Gemini/runtime/provider",
    "v16.4 is not owner approval for execution",
    "no manual endpoint guess"
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
    "package has test:v16.4 script",
    scripts["test:v16.4"] === "tsx scripts/test-v164-limited-pilot-readiness-checklist.mts"
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
  ["checklist unlocks execution", /\bchecklist\s+(?:now\s+)?(?:unlocks|enables)\s+execution\b/i],
  ["deploy now phrase", /\bdeploy\s+now\b/i]
];
for (const [name, re] of forbiddenExecutionApprovalPatterns) {
  ok(`no unsafe authorization/activation phrase ${name}`, !re.test(combined));
}

const forbiddenManualEndpointGuessApprovalPatterns: Array<[string, RegExp]> = [
  [
    "manual endpoint guess allowed/permitted",
    /\bmanual\s+endpoint\s+guess(?:ing)?\s+(?:is\s+)?(?:allowed|permitted)\b/i
  ],
  [
    "allow/permit manual endpoint guess",
    /\b(?:allow|allows|allowed|permit|permits|permitted)\s+(?:a\s+)?manual\s+endpoint\s+guess(?:ing)?\b/i
  ],
  [
    "instruction to use manual endpoint guess",
    /\b(?:use|run|perform|do|try)\s+(?:a\s+)?manual\s+endpoint\s+guess(?:ing)?\b/i
  ]
];
for (const [name, re] of forbiddenManualEndpointGuessApprovalPatterns) {
  ok(`no manual-endpoint-guess approval phrase ${name}`, !re.test(combined));
}

const forbiddenEndpointOrRunHints: Array<[string, RegExp]> = [
  ["curl command", /\bcurl\s+https?:\/\//i],
  ["wget command", /\bwget\s+https?:\/\//i],
  ["http endpoint sample", /https?:\/\/[^\s"']+/i]
];
for (const [name, re] of forbiddenEndpointOrRunHints) {
  ok(`no live endpoint/run hint ${name}`, !re.test(combined));
}

console.log(`\nDone v16.4 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
