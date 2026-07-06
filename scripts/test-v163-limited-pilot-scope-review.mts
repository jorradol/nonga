/**
 * v16.3 limited pilot scope review validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.3
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.3-limited-pilot-scope-review.md";
const FIXTURE_PATH = "docs/examples/v16.3-limited-pilot-scope-review.synthetic.json";
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

console.log("=== v16.3 Limited Pilot Scope Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.3 correctly",
  /v16\.3 — Limited Pilot Scope Review/.test(doc) && fixtureRaw.includes("\"version\": \"v16.3\"")
);

ok(
  "planning-only phrases and execution-type are correct",
  hasEveryLine(doc, [
    "v16.3 is limited pilot scope review only",
    "guiding phrase: วางกรอบ v16 ก่อน ยังไม่แตะของจริง",
    "v16.3 is scope review only",
    "v16.3 is planning only"
  ]) && fixtureRaw.includes("\"executionType\": \"limited-pilot-scope-review only\"")
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

  const baseline = root.baselineConfirmed as Record<string, unknown>;
  ok(
    "baseline is complete through v16.3A",
    baseline?.["v13"] === "CLOSED" &&
      baseline?.["v14"] === "CLOSED" &&
      baseline?.["v15"] === "CLOSED" &&
      baseline?.["v16.0"] === "PASSED" &&
      baseline?.["v16.1"] === "PASSED" &&
      baseline?.["v16.2"] === "PASSED" &&
      baseline?.["v16.3"] === "PLANNING ONLY / SCOPE REVIEW ONLY" &&
      baseline?.["v16.3A"] === "HOLD FIX / PLANNING ONLY / NO EXECUTION"
  );

  const reviewed = root.v162ArtifactsReviewed as Record<string, unknown>;
  ok("v16.2 artifact review is complete", hasAllTrue(reviewed, 4));

  const coverage = root.reviewCoverage as Record<string, unknown>;
  ok("review coverage is complete", hasAllTrue(coverage, 20));

  const gaps = root.gaps;
  ok("gap review exists", Array.isArray(gaps) && gaps.length >= 3);

  const risks = root.risks;
  ok("risk register exists", Array.isArray(risks) && risks.length >= 3);

  const stopConditions = root.stopConditions as Record<string, unknown>;
  ok(
    "stop conditions are complete and HOLD",
    Object.keys(stopConditions ?? {}).length >= 10 &&
      Object.values(stopConditions ?? {}).every((value) => value === "HOLD")
  );

  const ownerApprovalCarryForward = root.ownerApprovalCarryForward as Record<string, unknown>;
  ok("owner approval carry-forward is complete", hasAllTrue(ownerApprovalCarryForward, 4));

  const nextStepRecommendation = String(root.nextStepRecommendation ?? "");
  ok(
    "next step recommendation is v16.4 planning-only checklist",
    /v16\.4/i.test(nextStepRecommendation) &&
      /planning/i.test(nextStepRecommendation) &&
      /checklist/i.test(nextStepRecommendation) &&
      /no execution/i.test(nextStepRecommendation)
  );

  const finalDecision = String(root.finalDecision ?? "");
  ok(
    "final decision is valid v16.4 readiness planning-only",
    finalDecision ===
      "READY FOR v16.4 LIMITED PILOT READINESS CHECKLIST — PLANNING ONLY / NO EXECUTION"
  );
}

ok(
  "doc includes all required review sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Scope Review Decision",
    "## 3) Baseline Confirmation",
    "## 4) v16.2 Artifact Review",
    "## 5) Boundary Review",
    "## 6) Limited Pilot Purpose Review",
    "## 7) Pilot Boundary Review",
    "## 8) Dealer Cohort Boundary Review",
    "## 9) Lead Eligibility Boundary Review",
    "## 10) User Exposure Boundary Review",
    "## 11) Data Boundary Review",
    "## 12) Evidence Boundary Review",
    "## 13) Not-Allowed Actions Review",
    "## 14) Owner Approval Gate Review",
    "## 15) Future Run Requirements Review",
    "## 16) One-Run / No-Retry / No-Second-Run Policy Review",
    "## 17) Public / Production / Real Lead Boundary Review",
    "## 18) Runtime / Provider / Gemini Boundary Review",
    "## 19) Security / Privacy / PII / Token Review",
    "## 20) Thor / Dealer Real Import Review",
    "## 21) Rollback / Kill-Switch Review",
    "## 22) Stop Condition Matrix Review",
    "## 23) Gap / Ambiguity Review",
    "## 24) Risk Register",
    "## 25) Required Clarifications Before Any Future Execution",
    "## 26) Thai Owner-Friendly Summary",
    "## 27) Exact Next Step Recommendation"
  ])
);

ok(
  "doc confirms no-execution and no-real-action boundaries",
  hasEveryLine(doc, [
    "v16.3 does not start real dealer pilot",
    "v16.3 does not send real lead",
    "v16.3 does not import Thor/dealer real data",
    "v16.3 does not open public/production",
    "v16.3 does not call Gemini/runtime/provider",
    "v16.3 is not owner approval for execution"
  ])
);

ok(
  "manual endpoint guess prohibition is explicitly present",
  hasEveryLine(doc, ["no manual endpoint guess remains explicit"])
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
    "package has test:v16.3 script",
    scripts["test:v16.3"] === "tsx scripts/test-v163-limited-pilot-scope-review.mts"
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
  ["thai launched phrase", /เปิดใช้งานจริงแล้ว|เปิดระบบจริงแล้ว|เริ่ม real pilot แล้ว|เปิด public แล้ว|ขึ้น production แล้ว/i],
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

console.log(`\nDone v16.3 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
