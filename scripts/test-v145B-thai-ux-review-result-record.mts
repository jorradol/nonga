/**
 * v14.5B Thai UX review result record validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v14.5B
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.5B-thai-ux-review-result-record.md";
const FIXTURE_PATH = "docs/examples/v14.5B-thai-ux-review-result-record.synthetic.json";
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

console.log("=== v14.5B Thai UX Review Result Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states v14.5B Thai UX Review Result Record",
  /v14\.5B — Thai UX Review Result Record/.test(doc)
);

ok(
  "doc references v14.5 packet rubric fixture",
  hasEveryLine(doc, [
    "docs/v14.5-thai-ux-real-answer-final-review-packet.md",
    "docs/examples/v14.5-thai-ux-real-answer-final-review.synthetic.json",
  ])
);

ok(
  "doc references v14.5A execution plan",
  hasEveryLine(doc, ["docs/v14.5A-thai-ux-review-execution-plan.md"])
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

const requiredCaseIds = [
  "khukot-rangsit-limited-budget",
  "monthly-payment-question",
  "transfer-before-seeing-car",
  "early-phone-share-attempt",
  "condition-and-guarantee-question",
  "compare-two-car-cards",
  "continue-browsing-no-lead-capture",
  "short-unclear-thai-message",
];

ok(
  "doc has all 8 scenario sections",
  requiredCaseIds.every((id) => doc.includes(`caseId: \`${id}\``))
);

ok(
  "doc scenario sections include full rubric result fields",
  hasEveryLine(doc, [
    "Thai naturalness result:",
    "sales assistant tone result:",
    "context coupling result:",
    "car card coupling result:",
    "hallucinated vehicle facts result:",
    "finance/price/condition safety result:",
    "lead/PII safety result:",
    "phone echo guard result:",
    "safe confirmation wording result:",
    "legal/safety nudge result:",
    "user convenience result:",
    "conciseness result:",
    "reviewer notes:",
    "decision: PASS",
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
  ok("fixture version is v14.5B", root.version === "v14.5B");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "aa1563a340d0ce6f6daada3030328ca7a4bd0916"
  );
  ok(
    "fixture source references are correct",
    root.sourcePacket === "docs/v14.5-thai-ux-real-answer-final-review-packet.md" &&
      root.sourceExecutionPlan === "docs/v14.5A-thai-ux-review-execution-plan.md"
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

  const reviewResults = Array.isArray(root.reviewResults)
    ? (root.reviewResults as Array<Record<string, unknown>>)
    : [];
  ok("fixture reviewResults has 8 scenarios", reviewResults.length === 8);

  const ids = new Set(reviewResults.map((row) => String(row.caseId ?? "")));
  ok(
    "fixture reviewResults include all required case ids",
    requiredCaseIds.every((id) => ids.has(id))
  );

  const fieldsPerScenario = reviewResults.every((row) => {
    const decision = String(row.decision ?? "");
    return (
      row.caseId &&
      row.scenario &&
      row.sourceEvidenceType &&
      row.thaiNaturalnessResult &&
      row.salesAssistantToneResult &&
      row.contextCouplingResult &&
      row.carCardCouplingResult &&
      row.hallucinatedVehicleFactsResult &&
      row.financePriceConditionSafetyResult &&
      row.leadPiiSafetyResult &&
      row.phoneEchoGuardResult &&
      row.safeConfirmationWordingResult &&
      row.legalSafetyNudgeResult &&
      row.userConvenienceResult &&
      row.concisenessResult &&
      row.reviewerNotes &&
      ["PASS", "NEED REVIEW", "HOLD"].includes(decision)
    );
  });
  ok("fixture each scenario has rubric result fields and decision", fieldsPerScenario);

  ok("fixture has overallDecision", !!root.overallDecision);
  ok("fixture has safetySummary", !!root.safetySummary);
  ok("fixture has issueSummary", !!root.issueSummary);
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
    "package has test:v14.5B script",
    scripts["test:v14.5B"] ===
      "tsx scripts/test-v145B-thai-ux-review-result-record.mts"
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

console.log(`\nDone v14.5B Thai UX review result validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
