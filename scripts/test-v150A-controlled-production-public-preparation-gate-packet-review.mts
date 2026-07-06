/**
 * v15.0A controlled production/public preparation gate packet review validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.0A
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.0A-controlled-production-public-preparation-gate-packet-review.md";
const FIXTURE_PATH =
  "docs/examples/v15.0A-controlled-production-public-preparation-gate-packet-review.synthetic.json";
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

console.log("=== v15.0A Controlled Production/Public Preparation Gate Packet Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states v15.0A Controlled Production/Public Preparation Gate Packet Review",
  /v15\.0A — Controlled Production\/Public Preparation Gate Packet Review/.test(doc)
);

ok(
  "doc includes no-run controls",
  hasEveryLine(doc, ["no one-run", "no retry", "no second-run", "no live endpoint call", "no provider/Gemini/runtime network call"])
);

ok(
  "doc confirms review dimensions",
  hasEveryLine(doc, [
    "v14 closure baseline: confirmed",
    "v15 preparation-only status: confirmed",
    "production/public boundary matrix: confirmed complete with 4 layers",
    "owner approval model: confirmed documented and owner-gated",
    "one-run / no-retry / no-second-run model: confirmed",
    "rollback / kill-switch expectation: confirmed",
    "safety/guard baseline: confirmed",
    "audit/evidence requirement: confirmed",
  ])
);

ok(
  "doc confirms no sensitive exposure and no v16 crossing",
  hasEveryLine(doc, [
    "no token/secret/PII exposure posture: confirmed",
    "no phone/plate/VIN posture: confirmed",
    "no Thor/dealer real import posture: confirmed",
    "no v16 real dealer/real lead crossing posture: confirmed",
  ])
);

ok(
  "doc records zero-gap result",
  hasEveryLine(doc, ["gap count: 0", "runtime path changes needed: none"])
);

ok(
  "doc has allowed final decision",
  hasEveryLine(doc, [
    "READY FOR v15.1 PRODUCTION/PUBLIC PREP CHECKLIST REVIEW — NO PUBLIC RELEASE",
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
  ok("fixture version is v15.0A", root.version === "v15.0A");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "c733abb6b8ed4a87f83926bffe0c30746f7e3df6"
  );

  ok(
    "fixture source references are correct",
    root.sourceV150Doc === "docs/v15.0-controlled-production-public-preparation-gate-packet.md" &&
      root.sourceV150Fixture ===
        "docs/examples/v15.0-controlled-production-public-preparation-gate-packet.synthetic.json" &&
      root.sourceV150Test ===
        "scripts/test-v150-controlled-production-public-preparation-gate-packet.mts" &&
      root.sourceV14Closure === "docs/v14.6-limited-staging-pilot-readiness-closure.md" &&
      root.sourceDispatchClosure ===
        "docs/v14.4J-user-visible-firebase-dispatch-pass-evidence-closure.md" &&
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
      noRun?.productionDeployByAgent === false &&
      noRun?.productionActivationByAgent === false &&
      noRun?.publicRouteActivationByAgent === false &&
      noRun?.buyerFacingPublicReleaseByAgent === false &&
      noRun?.realLeadSendByAgent === false &&
      noRun?.realCustomerDataPiiByAgent === false &&
      noRun?.thorRealDataImportByAgent === false &&
      noRun?.dealerRealInventoryImportByAgent === false &&
      noRun?.v16RealDealerRealLeadActionByAgent === false
  );

  const checklist = root.reviewChecklist as Record<string, unknown>;
  ok(
    "fixture reviewChecklist is complete with PASS",
    checklist?.v14ClosureBaselineConfirmed === "PASS" &&
      checklist?.v15PreparationOnlyStatusConfirmed === "PASS" &&
      checklist?.productionPublicBoundaryMatrixConfirmed === "PASS" &&
      checklist?.ownerApprovalModelConfirmed === "PASS" &&
      checklist?.oneRunNoRetryNoSecondRunModelConfirmed === "PASS" &&
      checklist?.rollbackKillSwitchExpectationConfirmed === "PASS" &&
      checklist?.safetyGuardBaselineConfirmed === "PASS" &&
      checklist?.auditEvidenceRequirementConfirmed === "PASS" &&
      checklist?.tokenSecretPiiExposureRiskConfirmedNone === "PASS" &&
      checklist?.phonePlateVinRiskConfirmedNone === "PASS" &&
      checklist?.thorDealerRealImportRiskConfirmedNone === "PASS" &&
      checklist?.v16BoundaryCrossingRiskConfirmedNone === "PASS"
  );

  const gap = root.gapAnalysis as Record<string, unknown>;
  ok(
    "fixture gapAnalysis confirms zero-gap",
    gap?.gapCount === 0 &&
      gap?.runtimePathChangeNeeded === false &&
      gap?.endpointProviderDeployConfigChangeNeeded === false &&
      gap?.docsTestsFixturesRemediationRequired === false
  );

  ok(
    "fixture final decision is allowed and expected",
    root.finalDecision ===
      "READY FOR v15.1 PRODUCTION/PUBLIC PREP CHECKLIST REVIEW — NO PUBLIC RELEASE"
  );
  ok("fixture has nextOwnerAction", !!root.nextOwnerAction);
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
    "package has test:v15.0A script",
    scripts["test:v15.0A"] ===
      "tsx scripts/test-v150A-controlled-production-public-preparation-gate-packet-review.mts"
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
  `\nDone v15.0A controlled production/public preparation gate packet review validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
