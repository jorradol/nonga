/**
 * v15.1 production/public preparation checklist review validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.1
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.1-production-public-prep-checklist-review.md";
const FIXTURE_PATH = "docs/examples/v15.1-production-public-prep-checklist-review.synthetic.json";
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

console.log("=== v15.1 Production/Public Preparation Checklist Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states v15.1 checklist review",
  /v15\.1 — Production\/Public Preparation Checklist Review/.test(doc)
);

ok(
  "doc confirms baseline v14 v15.0 v15.0A",
  hasEveryLine(doc, [
    "v14` closed baseline is confirmed",
    "`v15.0` gate packet exists and passed",
    "`v15.0A` gate packet review exists and passed",
    "preparation/checklist review only",
  ])
);

ok(
  "doc states preparation-only and no public release",
  hasEveryLine(doc, [
    "checklist-review only",
    "not execution approval",
    "not deploy approval",
    "not public release approval",
  ])
);

ok(
  "doc states no production activation and no real lead",
  hasEveryLine(doc, ["no production activation", "no real lead sending"])
);

ok(
  "doc states no-run no-retry no-second-run",
  hasEveryLine(doc, ["no one-run", "no retry", "no second-run"])
);

ok(
  "doc includes owner approval model",
  hasEveryLine(doc, [
    "production deploy requires separate owner approval",
    "public route activation requires separate owner approval",
    "buyer-facing release requires separate owner approval",
    "real lead requires separate owner approval and remains outside v15.1",
  ])
);

ok(
  "doc includes rollback kill-switch expectation",
  hasEveryLine(doc, [
    "disable path expectation",
    "owner/operator responsibility",
    "evidence capture",
    "stop condition",
  ])
);

ok(
  "doc includes v16 boundary",
  hasEveryLine(doc, [
    "v16 has not started",
    "real dealer/real lead action is prohibited in v15.1",
    "Thor/dealer real import is prohibited in v15.1",
  ])
);

ok(
  "doc includes PII phone plate VIN and secret boundary",
  hasEveryLine(doc, [
    "real PII usage: prohibited",
    "phone/plate/VIN in artifacts: prohibited",
    "token/secret/API key exposure: prohibited",
    "redaction expectation",
  ])
);

ok(
  "doc includes Gemini provider runtime restrictions",
  hasEveryLine(doc, [
    "prior v13/v14 evidence only",
    "uncontrolled Gemini execution: prohibited",
    "provider/runtime network call in this round: prohibited",
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
  ok("fixture version is v15.1", root.version === "v15.1");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "8aa128137be9f395d2eb089c1060a1a757b4e073"
  );

  ok(
    "fixture baseline source references are correct",
    root.sourceV14Closure === "docs/v14.6-limited-staging-pilot-readiness-closure.md" &&
      root.sourceV150GatePacket ===
        "docs/v15.0-controlled-production-public-preparation-gate-packet.md" &&
      root.sourceV150AReview ===
        "docs/v15.0A-controlled-production-public-preparation-gate-packet-review.md"
  );

  const noRun = root.noRunControls as Record<string, unknown>;
  ok(
    "fixture noRunControls are complete and false",
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
      noRun?.phonePlateVinByAgent === false &&
      noRun?.tokenSecretApiKeyExposureByAgent === false &&
      noRun?.thorRealDataImportByAgent === false &&
      noRun?.dealerRealInventoryImportByAgent === false &&
      noRun?.v16RealDealerRealLeadActionByAgent === false
  );

  const checklists = [
    "productionDeployReadinessChecklist",
    "publicRouteReadinessChecklist",
    "buyerFacingReleaseReadinessChecklist",
    "realLeadReadinessChecklist",
    "piiPhonePlateVinChecklist",
    "geminiProviderRuntimeChecklist",
    "ownerApprovalModelChecklist",
    "rollbackKillSwitchChecklist",
    "v16BoundaryChecklist",
  ];
  ok(
    "fixture has all required checklist groups",
    checklists.every((key) => {
      const value = root[key] as Record<string, unknown> | undefined;
      return value && Object.values(value).every((entry) => entry === "PASS");
    })
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.2 CONTROLLED PRE-PROD RISK REGISTER — NO PUBLIC RELEASE"
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
    "package has test:v15.1 script",
    scripts["test:v15.1"] ===
      "tsx scripts/test-v151-production-public-prep-checklist-review.mts"
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
  `\nDone v15.1 production/public preparation checklist review validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
