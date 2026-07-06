/**
 * v16.5 limited pilot owner decision packet validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.5
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.5-limited-pilot-owner-decision-packet.md";
const FIXTURE_PATH = "docs/examples/v16.5-limited-pilot-owner-decision-packet.synthetic.json";
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

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

console.log("=== v16.5 Limited Pilot Owner Decision Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.5 correctly",
  /v16\.5 — Limited Pilot Owner Decision Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.5\"") &&
    fixtureRaw.includes("\"executionType\": \"limited-pilot-owner-decision-packet only\"")
);

ok(
  "planning-only phrases are explicit",
  hasEveryLine(doc, [
    "PLANNING ONLY / NO EXECUTION",
    "v16.5 is owner-decision-packet-only and planning-only",
    "v16.5 does not authorize execution, deploy, or activation",
    "v16.5 is not owner approval for execution"
  ])
);

ok(
  "doc includes required v16.5 sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Owner decision packet scope",
    "## 5) Current milestone summary",
    "## 6) What is already closed",
    "## 7) What v16 has produced so far",
    "## 8) What this packet does not approve",
    "## 9) Limited pilot concept summary",
    "## 10) Readiness checklist summary from v16.4",
    "## 11) Open gaps before any future execution request",
    "## 12) Required clarifications before any future execution request",
    "## 13) Required artifacts before any future execution request",
    "## 14) Owner decision options",
    "## 15) Recommended owner decision",
    "## 16) No-execution boundary confirmation",
    "## 17) One-run / no-retry / no-second-run carry-forward",
    "## 18) Public / production / real lead boundary confirmation",
    "## 19) Runtime / provider / Gemini boundary confirmation",
    "## 20) Security / privacy / PII / token boundary confirmation",
    "## 21) Thor / dealer real import boundary confirmation",
    "## 22) Rollback / kill-switch requirement confirmation",
    "## 23) Stop condition confirmation",
    "## 24) Future approval requirement",
    "## 25) Thai owner-friendly summary",
    "## 26) Exact next step recommendation"
  ])
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

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
    "package has test:v16.5 script",
    scripts["test:v16.5"] === "tsx scripts/test-v165-limited-pilot-owner-decision-packet.mts"
  );
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
  ok("noManualEndpointGuess=true", root.noManualEndpointGuess === true);
  ok("noThorImport=true", root.noThorImport === true);
  ok("noDealerImport=true", root.noDealerImport === true);
  ok("noPII=true", root.noPII === true);
  ok("noTokenSecretExposure=true", root.noTokenSecretExposure === true);

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline complete through v16.5 planning-only packet",
    baseline["v13"] === "CLOSED" &&
      baseline["v14"] === "CLOSED" &&
      baseline["v15"] === "CLOSED" &&
      baseline["v16.0"] === "PASSED" &&
      baseline["v16.1"] === "PASSED" &&
      baseline["v16.2"] === "PASSED" &&
      baseline["v16.3"] === "PASSED via v16.3A HOLD FIX" &&
      baseline["v16.4"] === "PASSED" &&
      baseline["v16.5"] === "PLANNING ONLY / OWNER DECISION PACKET ONLY"
  );

  const milestoneSummary = asRecord(root.milestoneSummary);
  ok(
    "milestone summary is complete",
    milestoneSummary.milestone === "v16.5" &&
      milestoneSummary.phase === "pre-execution planning" &&
      milestoneSummary.status === "owner-decision-packet-only" &&
      milestoneSummary.executionGate === "BLOCKED_FOR_EXECUTION"
  );

  ok(
    "v16 produced summary is present",
    Array.isArray(root.v16ProducedSoFar) && root.v16ProducedSoFar.length >= 5
  );

  const readiness = asRecord(root.readinessSummary);
  ok("readiness summary includes v16.4 source", readiness.source === "v16.4 readiness checklist");
  ok(
    "readiness summary has planning-ready and clarification arrays",
    Array.isArray(readiness.planningReviewReadyAreas) &&
      (readiness.planningReviewReadyAreas as unknown[]).length >= 5 &&
      Array.isArray(readiness.needsClarificationBeforeExecutionRequest) &&
      (readiness.needsClarificationBeforeExecutionRequest as unknown[]).length >= 4
  );

  ok("open gaps list is present", Array.isArray(root.openGaps) && root.openGaps.length >= 4);
  ok(
    "required clarifications list is present",
    Array.isArray(root.requiredClarifications) && root.requiredClarifications.length >= 4
  );
  ok(
    "required artifacts list is present",
    Array.isArray(root.requiredArtifactsBeforeFutureExecution) &&
      root.requiredArtifactsBeforeFutureExecution.length >= 5
  );

  ok(
    "owner decision options complete",
    Array.isArray(root.ownerDecisionOptions) &&
      root.ownerDecisionOptions.length >= 4 &&
      fixtureRaw.includes("OPTION A — CONTINUE PLANNING TO v16.6") &&
      fixtureRaw.includes("OPTION B — HOLD v16 PLANNING") &&
      fixtureRaw.includes("OPTION C — REVISE SCOPE BEFORE CONTINUING") &&
      fixtureRaw.includes("OPTION D — PREPARE FUTURE OWNER APPROVAL TEMPLATE ONLY")
  );

  const recommendedOwnerDecision = asRecord(root.recommendedOwnerDecision);
  ok(
    "recommended owner decision is clearly defined",
    recommendedOwnerDecision.optionId === "OPTION_A" &&
      typeof recommendedOwnerDecision.label === "string" &&
      String(recommendedOwnerDecision.label).includes("OPTION A") &&
      typeof recommendedOwnerDecision.reason === "string" &&
      String(recommendedOwnerDecision.reason).length >= 20
  );

  const stopConditions = asRecord(root.stopConditions);
  ok(
    "stop conditions are complete and HOLD",
    Object.keys(stopConditions).length >= 10 &&
      Object.values(stopConditions).every((value) => value === "HOLD")
  );

  const ownerApprovalCarryForward = asRecord(root.ownerApprovalCarryForward);
  ok(
    "owner approval carry-forward exists and true",
    Object.keys(ownerApprovalCarryForward).length >= 4 &&
      Object.values(ownerApprovalCarryForward).every((value) => value === true)
  );

  const nextStepRecommendation = String(root.nextStepRecommendation ?? "");
  ok(
    "exact next step recommendation targets v16.6 clarification packet",
    /v16\.6/i.test(nextStepRecommendation) &&
      /pre-execution clarification packet/i.test(nextStepRecommendation) &&
      /planning-only/i.test(nextStepRecommendation) &&
      /no execution/i.test(nextStepRecommendation)
  );

  ok(
    "final decision is planning-only v16.6 readiness",
    root.finalDecision ===
      "READY FOR v16.6 PRE-EXECUTION CLARIFICATION PACKET — PLANNING ONLY / NO EXECUTION"
  );
}

ok(
  "doc confirms no-execution boundary",
  hasEveryLine(doc, [
    "no execution",
    "no dry-run",
    "no one-run",
    "no automatic retry",
    "no second run"
  ])
);

ok(
  "doc confirms one-run/no-retry/no-second-run carry-forward",
  hasEveryLine(doc, [
    "one-run policy remains future-gated and unavailable in v16.5",
    "no automatic retry remains strict",
    "no second run without fresh separate owner approval remains strict"
  ])
);

ok(
  "doc confirms public/production/real lead boundaries",
  hasEveryLine(doc, [
    "no deploy",
    "no production activation",
    "no public route activation",
    "no buyer-facing public release",
    "no real lead sending",
    "no real dealer action"
  ])
);

ok(
  "doc confirms runtime/provider/Gemini boundaries",
  hasEveryLine(doc, [
    "no runtime/provider/Gemini network call",
    "no live endpoint call",
    "no manual endpoint guess"
  ])
);

ok(
  "doc confirms security/privacy/PII/token boundaries",
  hasEveryLine(doc, [
    "no token/secret/API key exposure",
    "no real customer data / PII / phone / plate / VIN"
  ])
);

ok(
  "doc confirms Thor/dealer import boundaries",
  hasEveryLine(doc, [
    "no Thor real data import",
    "no dealer real inventory import"
  ])
);

ok(
  "doc confirms rollback/kill-switch requirement",
  hasEveryLine(doc, [
    "rollback requirement remains mandatory before any future execution request",
    "kill-switch requirement remains mandatory before any future execution request"
  ])
);

ok(
  "doc confirms stop conditions and future approval requirement",
  hasEveryLine(doc, [
    "HOLD on repo-state mismatch",
    "HOLD on test failure",
    "planning packet approval is never equivalent to execution approval"
  ])
);

ok(
  "doc includes readiness summary, open gaps, clarifications, artifacts, and Thai summary",
  hasEveryLine(doc, [
    "## 10) Readiness checklist summary from v16.4",
    "## 11) Open gaps before any future execution request",
    "## 12) Required clarifications before any future execution request",
    "## 13) Required artifacts before any future execution request",
    "## 25) Thai owner-friendly summary"
  ])
);

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

const forbiddenInterpretationPatterns: Array<[string, RegExp]> = [
  ["v16 pilot already started", /\bv16\s+.*(pilot).*(started|active|running)\b/i],
  ["owner approved execution", /\bowner\s+.*(approved|authoriz(ed|ation)).*execution\b/i],
  ["packet unlocks deploy/public/prod/real lead", /\bpacket\s+.*(unlocks|enables)\s+.*(deploy|public|production|real lead)\b/i],
  ["execute approved phrase", /\bexecute[_\s-]?approved\b/i],
  ["deploy now phrase", /\bdeploy\s+now\b/i]
];
for (const [name, re] of forbiddenInterpretationPatterns) {
  ok(`no unsafe interpretation phrase ${name}`, !re.test(combined));
}

const forbiddenEndpointOrCommandPatterns: Array<[string, RegExp]> = [
  ["curl command", /\bcurl\s+https?:\/\//i],
  ["wget command", /\bwget\s+https?:\/\//i],
  ["powershell web request command", /\b(iwr|Invoke-WebRequest)\b/i],
  ["http endpoint sample", /https?:\/\/[^\s"']+/i]
];
for (const [name, re] of forbiddenEndpointOrCommandPatterns) {
  ok(`no command/endpoint hint ${name}`, !re.test(combined));
}

const forbiddenManualEndpointGuessApprovalPatterns: Array<[string, RegExp]> = [
  [
    "manual endpoint guess allowed/permitted",
    /\bmanual\s+endpoint\s+guess(?:ing)?\s+(?:is\s+)?(?:allowed|permitted)\b/i
  ],
  [
    "allow/permit manual endpoint guess",
    /\b(?:allow|allows|allowed|permit|permits|permitted)\s+(?:a\s+)?manual\s+endpoint\s+guess(?:ing)?\b/i
  ]
];
for (const [name, re] of forbiddenManualEndpointGuessApprovalPatterns) {
  ok(`no manual-endpoint-guess approval phrase ${name}`, !re.test(combined));
}

console.log(`\nDone v16.5 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
