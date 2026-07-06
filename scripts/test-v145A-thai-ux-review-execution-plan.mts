/**
 * v14.5A Thai UX review execution plan validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v14.5A
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.5A-thai-ux-review-execution-plan.md";
const FIXTURE_PATH = "docs/examples/v14.5A-thai-ux-review-execution-plan.synthetic.json";
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

console.log("=== v14.5A Thai UX Review Execution Plan Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states v14.5A Thai UX Review Execution Plan",
  /v14\.5A — Thai UX Review Execution Plan/.test(doc)
);

ok(
  "doc references v14.5 packet rubric fixture",
  hasEveryLine(doc, [
    "v14.5 Thai UX Real Answer Final Review Packet",
    "docs/v14.5-thai-ux-real-answer-final-review-packet.md",
    "docs/examples/v14.5-thai-ux-real-answer-final-review.synthetic.json",
  ])
);

ok(
  "doc states no one-run retry second-run",
  hasEveryLine(doc, ["no one-run", "no retry", "no second-run"])
);

ok(
  "doc states no live endpoint provider gemini runtime call",
  hasEveryLine(doc, [
    "no live endpoint call",
    "no provider/Gemini/runtime network call",
  ])
);

ok(
  "doc states no production public real lead",
  hasEveryLine(doc, [
    "no production",
    "no public route activation",
    "no real lead sending",
  ])
);

ok(
  "doc workflow includes all required steps",
  hasEveryLine(doc, [
    "Step 1: Select evidence sample",
    "Step 2: Map to v14.5 fixture scenarios",
    "Step 3: Score with rubric",
    "Step 4: Assign decision",
    "Step 5: Record sanitized findings",
    "Step 6: Summarize pre-v14.6 issues",
    "Step 7: Re-confirm boundary status",
  ])
);

ok(
  "doc scorecard template includes rubric fields",
  hasEveryLine(doc, [
    "caseId:",
    "scenario:",
    "sourceEvidenceType: sanitized-existing-evidence only",
    "Thai naturalness:",
    "sales assistant tone:",
    "context coupling:",
    "car card coupling:",
    "no hallucinated vehicle facts:",
    "finance/price/condition safety:",
    "lead/PII safety:",
    "phone echo guard:",
    "safe confirmation wording:",
    "legal/safety nudge:",
    "user convenience:",
    "conciseness:",
    "reviewer notes:",
    "decision: PASS / NEED REVIEW / HOLD",
  ])
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
  ok("fixture version is v14.5A", root.version === "v14.5A");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "968f91cb5154b25b17624ac7dbcf26050aeeebcb"
  );
  ok(
    "fixture source references are correct",
    root.sourcePacket === "docs/v14.5-thai-ux-real-answer-final-review-packet.md" &&
      root.sourceFixture === "docs/examples/v14.5-thai-ux-real-answer-final-review.synthetic.json"
  );

  const noRun = root.noRunControls as Record<string, unknown>;
  ok(
    "fixture noRunControls coverage is complete and false",
    noRun?.oneRunByAgent === false &&
      noRun?.retryByAgent === false &&
      noRun?.secondRunByAgent === false &&
      noRun?.liveEndpointCallByAgent === false &&
      noRun?.providerGeminiRuntimeNetworkCallByAgent === false &&
      noRun?.deployByAgent === false &&
      noRun?.productionByAgent === false &&
      noRun?.publicRouteActivationByAgent === false &&
      noRun?.realLeadSendByAgent === false
  );

  const workflow = Array.isArray(root.reviewWorkflow)
    ? (root.reviewWorkflow as Array<Record<string, unknown>>)
    : [];
  ok("fixture reviewWorkflow has 7 steps", workflow.length === 7);
  const workflowNames = new Set(workflow.map((w) => String(w.name ?? "")));
  ok(
    "fixture reviewWorkflow includes required step names",
    [
      "select-evidence-sample",
      "map-to-v145-fixture-scenario",
      "score-with-rubric",
      "assign-decision",
      "record-sanitized-findings",
      "summarize-pre-v146-issues",
      "reconfirm-boundary-status",
    ].every((name) => workflowNames.has(name))
  );

  const scorecard = root.scorecardTemplate as Record<string, unknown>;
  ok(
    "fixture scorecardTemplate has all rubric fields",
    hasEveryLine(JSON.stringify(scorecard), [
      "caseId",
      "scenario",
      "sourceEvidenceType",
      "thaiNaturalness",
      "salesAssistantTone",
      "contextCoupling",
      "carCardCoupling",
      "noHallucinatedVehicleFacts",
      "financePriceConditionSafety",
      "leadPiiSafety",
      "phoneEchoGuard",
      "safeConfirmationWording",
      "legalSafetyNudge",
      "userConvenience",
      "conciseness",
      "reviewerNotes",
      "decision",
    ])
  );

  const allowedDecisions = Array.isArray(root.allowedDecisions)
    ? (root.allowedDecisions as unknown[])
    : [];
  ok(
    "fixture allowedDecisions include PASS NEED REVIEW HOLD",
    ["PASS", "NEED REVIEW", "HOLD"].every((x) => allowedDecisions.includes(x))
  );

  ok(
    "fixture nextMilestoneCandidate is v14.6 closure",
    root.nextMilestoneCandidate === "v14.6 Limited Staging Pilot Readiness Closure"
  );
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
    "package has test:v14.5A script",
    scripts["test:v14.5A"] ===
      "tsx scripts/test-v145A-thai-ux-review-execution-plan.mts"
  );
}

const combined = `${doc}\n${fixtureRaw}`;
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

console.log(`\nDone v14.5A Thai UX review execution plan validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
