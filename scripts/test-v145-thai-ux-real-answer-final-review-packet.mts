/**
 * v14.5 Thai UX real answer final review packet validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v14.5
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.5-thai-ux-real-answer-final-review-packet.md";
const FIXTURE_PATH = "docs/examples/v14.5-thai-ux-real-answer-final-review.synthetic.json";
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

console.log("=== v14.5 Thai UX Real Answer Final Review Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states v14.5 Thai UX Real Answer Final Review",
  /v14\.5 — Thai UX Real Answer Final Review Packet/.test(doc) &&
    /v14\.5 Review Goal/.test(doc)
);

ok(
  "doc references v14.4 Dispatch Evidence PASS CLOSED",
  /v14\.4 Dispatch Evidence = PASS \/ CLOSED/.test(doc)
);

ok(
  "doc states no production public real lead boundaries",
  hasEveryLine(doc, [
    "no production",
    "no public route activation",
    "no buyer-facing public release",
    "no real lead sending",
  ])
);

ok(
  "doc states no one-run retry second-run live endpoint gemini call",
  hasEveryLine(doc, [
    "no one-run",
    "no retry",
    "no second-run",
    "no live endpoint call",
    "no provider/Gemini/runtime call",
  ])
);

ok(
  "doc states no token sharing",
  /no token sharing/i.test(doc)
);

ok(
  "doc includes rubric headings coverage",
  hasEveryLine(doc, [
    "Thai naturalness",
    "Helpful sales assistant tone",
    "Context coupling",
    "Car card coupling",
    "No hallucinated vehicle facts",
    "Finance safety",
    "Price safety",
    "Condition safety",
    "Lead/PII safety",
    "Phone echo guard",
    "Safe confirmation wording",
    "Thai legal/safety nudge",
    "User convenience",
    "Conciseness",
    "Overall decision",
  ])
);

ok(
  "doc states this packet is not production runtime rerun",
  /not production/i.test(doc) &&
    /not public route activation/i.test(doc) &&
    /not a new Gemini run/i.test(doc)
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
  ok("fixture version is v14.5", root.version === "v14.5");
  ok(
    "fixture review name is Thai UX Real Answer Final Review",
    root.reviewName === "Thai UX Real Answer Final Review"
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

  const cases = Array.isArray(root.cases) ? (root.cases as Array<Record<string, unknown>>) : [];
  const caseIds = new Set(cases.map((entry) => String(entry.id ?? "")));
  ok(
    "fixture has all required synthetic case ids",
    requiredCaseIds.every((id) => caseIds.has(id))
  );

  ok("fixture has at least 8 cases", cases.length >= 8);

  const everyCaseHasRequiredFields = cases.every((entry) => {
    return (
      entry.inputContext &&
      Array.isArray(entry.expectedAssistantBehavior) &&
      Array.isArray(entry.safetyChecks) &&
      Array.isArray(entry.passCriteria) &&
      Array.isArray(entry.failCriteria) &&
      (entry.expectedAssistantBehavior as unknown[]).length > 0 &&
      (entry.safetyChecks as unknown[]).length > 0 &&
      (entry.passCriteria as unknown[]).length > 0 &&
      (entry.failCriteria as unknown[]).length > 0
    );
  });
  ok(
    "fixture every case has inputContext expected behavior safety pass fail",
    everyCaseHasRequiredFields
  );

  const noRun = root.noRunControls as Record<string, unknown>;
  ok(
    "fixture no-run controls are disabled",
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
    "package has test:v14.5 script",
    scripts["test:v14.5"] ===
      "tsx scripts/test-v145-thai-ux-real-answer-final-review-packet.mts"
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

console.log(`\nDone v14.5 Thai UX final review packet validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
