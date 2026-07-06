/**
 * v14.6 limited staging pilot readiness closure validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v14.6
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.6-limited-staging-pilot-readiness-closure.md";
const FIXTURE_PATH =
  "docs/examples/v14.6-limited-staging-pilot-readiness-closure.synthetic.json";
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

console.log("=== v14.6 Limited Staging Pilot Readiness Closure Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states v14.6 Limited Staging Pilot Readiness Closure",
  /v14\.6 — Limited Staging Pilot Readiness Closure/.test(doc)
);

ok(
  "doc references v14.4J v14.5 v14.5A v14.5B",
  hasEveryLine(doc, [
    "docs/v14.4J-user-visible-firebase-dispatch-pass-evidence-closure.md",
    "docs/v14.5-thai-ux-real-answer-final-review-packet.md",
    "docs/v14.5A-thai-ux-review-execution-plan.md",
    "docs/v14.5B-thai-ux-review-result-record.md",
  ])
);

ok(
  "doc records v14.4 and v14.5 closure pass lines",
  hasEveryLine(doc, [
    "v14.4 Dispatch Evidence = PASS / CLOSED",
    "v14.5 Thai UX Review = PASS / CLOSED",
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
    "no buyer-facing public release",
    "no real lead sending",
  ])
);

const requiredChecklistDocLines = [
  "Runtime dispatch evidence: PASS",
  "Firebase auth dispatch path: PASS",
  "Gemini/provider path proved: PASS",
  "fallbackToLegacy=false: PASS",
  "skipGemini=false: PASS",
  "guard active: PASS",
  "lead PII cue guard: PASS",
  "phone echo guard: PASS",
  "safe confirmation wording: PASS",
  "Thai UX final review: PASS",
  "8 scenario review coverage: PASS",
  "no hallucinated vehicle facts review: PASS",
  "finance/price/condition safety review: PASS",
  "user convenience / low-friction flow review: PASS",
  "token/secret/PII exposure check: PASS",
  "no public/production/real lead boundary: PASS",
  "no Thor/dealer real import: PASS",
];
ok(
  "doc readiness checklist covers required items",
  hasEveryLine(doc, requiredChecklistDocLines)
);

const requiredBoundaryDocLines = [
  "still no production",
  "still no public route activation",
  "still no buyer-facing public release",
  "still no real lead sending",
  "still no real customer data / PII",
  "still no Thor real data import / dealer real inventory import",
  "v15",
  "v16",
];
ok(
  "doc remaining boundaries are complete",
  hasEveryLine(doc, requiredBoundaryDocLines)
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
  ok("fixture version is v14.6", root.version === "v14.6");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "9e035ae822079d36cd4ff0408283aab59f5140b8"
  );
  ok(
    "fixture source references are correct",
    root.sourceDispatchClosure ===
      "docs/v14.4J-user-visible-firebase-dispatch-pass-evidence-closure.md" &&
      root.sourceThaiUxPacket ===
        "docs/v14.5-thai-ux-real-answer-final-review-packet.md" &&
      root.sourceThaiUxPlan === "docs/v14.5A-thai-ux-review-execution-plan.md" &&
      root.sourceThaiUxResult === "docs/v14.5B-thai-ux-review-result-record.md"
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
      noRun?.buyerFacingPublicReleaseByAgent === false &&
      noRun?.realLeadSendByAgent === false
  );

  const checklist = root.readinessChecklist as Record<string, unknown>;
  ok(
    "fixture readinessChecklist is complete with PASS",
    checklist?.runtimeDispatchEvidence === "PASS" &&
      checklist?.firebaseAuthDispatchPath === "PASS" &&
      checklist?.geminiProviderPathProvedFromPriorOwnerRunOnly === "PASS" &&
      checklist?.fallbackToLegacyFalse === "PASS" &&
      checklist?.skipGeminiFalse === "PASS" &&
      checklist?.guardActive === "PASS" &&
      checklist?.leadPiiCueGuard === "PASS" &&
      checklist?.phoneEchoGuard === "PASS" &&
      checklist?.safeConfirmationWording === "PASS" &&
      checklist?.thaiUxFinalReview === "PASS" &&
      checklist?.eightScenarioCoverage === "PASS" &&
      checklist?.noHallucinatedVehicleFactsReview === "PASS" &&
      checklist?.financePriceConditionSafetyReview === "PASS" &&
      checklist?.userConvenienceLowFrictionReview === "PASS" &&
      checklist?.tokenSecretPiiExposureCheck === "PASS" &&
      checklist?.noPublicProductionRealLeadBoundary === "PASS" &&
      checklist?.noThorDealerRealImport === "PASS"
  );

  const boundaries = root.remainingBoundaries as Record<string, unknown>;
  ok(
    "fixture remainingBoundaries are complete",
    boundaries?.production === "still-disallowed" &&
      boundaries?.publicRouteActivation === "still-disallowed" &&
      boundaries?.buyerFacingPublicRelease === "still-disallowed" &&
      boundaries?.realLeadSending === "still-disallowed" &&
      boundaries?.realCustomerDataPii === "still-disallowed" &&
      boundaries?.thorRealDataImport === "still-disallowed" &&
      boundaries?.dealerRealInventoryImport === "still-disallowed" &&
      String(boundaries?.v15Scope ?? "").includes("controlled production/public preparation") &&
      String(boundaries?.v16Scope ?? "").includes("limited real dealer / real lead pilot")
  );

  ok("fixture has closureDecision", !!root.closureDecision);
  ok("fixture has nextMilestone", !!root.nextMilestone);
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
    "package has test:v14.6 script",
    scripts["test:v14.6"] ===
      "tsx scripts/test-v146-limited-staging-pilot-readiness-closure.mts"
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

console.log(
  `\nDone v14.6 limited staging pilot readiness closure validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
