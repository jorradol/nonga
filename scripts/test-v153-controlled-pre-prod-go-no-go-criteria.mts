/**
 * v15.3 controlled pre-prod GO/NO-GO criteria validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.3
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.3-controlled-pre-prod-go-no-go-criteria.md";
const FIXTURE_PATH = "docs/examples/v15.3-controlled-pre-prod-go-no-go-criteria.synthetic.json";
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

console.log("=== v15.3 Controlled Pre-Prod GO/NO-GO Criteria Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states v15.3 GO/NO-GO criteria",
  /v15\.3 — Controlled Pre-Prod GO\/NO-GO Criteria/.test(doc)
);

ok(
  "doc confirms v15 baseline and criteria-only scope",
  hasEveryLine(doc, [
    "`v15.0` gate packet exists and passed",
    "`v15.0A` gate packet review exists and passed",
    "`v15.1` production/public prep checklist review exists and passed",
    "`v15.2` controlled pre-prod risk register exists and passed",
    "go-no-go criteria only",
  ])
);

ok(
  "doc confirms preparation-only and no public release",
  hasEveryLine(doc, [
    "not execution approval",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc includes no production activation no real lead and no v16 action",
  hasEveryLine(doc, [
    "no production activation",
    "no real lead sending",
    "no v16 real dealer / real lead action",
  ])
);

ok(
  "doc includes no PII phone plate VIN and no token secret api key",
  hasEveryLine(doc, [
    "no real customer data / PII",
    "no phone / plate / VIN",
    "no secret / token / API key exposure",
  ])
);

ok(
  "doc includes no uncontrolled Gemini and no provider runtime call",
  hasEveryLine(doc, [
    "no uncontrolled Gemini execution",
    "no provider/Gemini/runtime network call",
  ])
);

ok(
  "doc includes no one-run retry second-run",
  hasEveryLine(doc, ["no one-run", "no retry", "no second-run"])
);

ok(
  "doc includes owner approval and rollback kill-switch sections",
  hasEveryLine(doc, [
    "Owner approval GO criteria",
    "Rollback/kill-switch NO-GO",
    "fresh owner approval",
  ])
);

ok(
  "doc includes GO and NO-GO/HOLD sections",
  hasEveryLine(doc, [
    "GO Criteria",
    "NO-GO / HOLD Criteria",
    "Repo readiness GO criteria",
    "Boundary NO-GO",
    "Security/privacy NO-GO",
    "Runtime NO-GO",
  ])
);

ok(
  "doc includes decision mapping GO NEED REVIEW HOLD",
  hasEveryLine(doc, ["`GO`", "`NEED REVIEW`", "`HOLD`"])
);

ok(
  "doc includes Thor/dealer import prohibited",
  hasEveryLine(doc, ["no Thor real data import", "no dealer real inventory import"])
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
  ok("fixture version is v15.3", root.version === "v15.3");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "1a3c6202fae30137fba8a254e1b68ceb277c58a3"
  );
  ok(
    "fixture source references are correct",
    root.sourceV14Closure === "docs/v14.6-limited-staging-pilot-readiness-closure.md" &&
      root.sourceV150GatePacket ===
        "docs/v15.0-controlled-production-public-preparation-gate-packet.md" &&
      root.sourceV150AReview ===
        "docs/v15.0A-controlled-production-public-preparation-gate-packet-review.md" &&
      root.sourceV151ChecklistReview ===
        "docs/v15.1-production-public-prep-checklist-review.md" &&
      root.sourceV152RiskRegister ===
        "docs/v15.2-controlled-pre-prod-risk-register.md"
  );

  ok(
    "fixture preparation boundaries are true",
    root.preparationOnly === true &&
      root.noPublicRelease === true &&
      root.noProductionActivation === true &&
      root.noRealLead === true &&
      root.thorDealerImportProhibited === true &&
      root.v16BoundaryActive === true
  );

  const noRun = root.noRunControls as Record<string, unknown>;
  ok(
    "fixture noRunControls are complete and false",
    noRun?.oneRunByAgent === false &&
      noRun?.retryByAgent === false &&
      noRun?.secondRunByAgent === false &&
      noRun?.liveEndpointCallByAgent === false &&
      noRun?.providerGeminiRuntimeNetworkCallByAgent === false
  );

  const passGroups = [
    "repoReadinessGoCriteria",
    "productionPublicPreparationGoCriteria",
    "safetyGuardGoCriteria",
    "dataPrivacyGoCriteria",
    "runtimeProviderGeminiGoCriteria",
    "ownerApprovalGoCriteria",
  ];
  ok(
    "fixture GO criteria groups are PASS",
    passGroups.every((group) => {
      const item = root[group] as Record<string, unknown> | undefined;
      return item && Object.values(item).every((value) => value === "PASS");
    })
  );

  const holdGroups = [
    "repoNoGoHoldCriteria",
    "boundaryNoGoHoldCriteria",
    "securityPrivacyNoGoHoldCriteria",
    "runtimeNoGoHoldCriteria",
    "rollbackKillSwitchNoGoHoldCriteria",
  ];
  ok(
    "fixture NO-GO/HOLD criteria groups exist",
    holdGroups.every((group) => {
      const item = root[group] as Record<string, unknown> | undefined;
      return item && Object.keys(item).length > 0;
    })
  );

  const decisionMapping = root.decisionMapping as Record<string, unknown>;
  ok(
    "fixture decision mapping has GO NEED REVIEW HOLD",
    typeof decisionMapping?.GO === "string" &&
      typeof decisionMapping?.["NEED REVIEW"] === "string" &&
      typeof decisionMapping?.HOLD === "string"
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.4 CONTROLLED PRE-PROD OWNER DECISION PACKET — NO PUBLIC RELEASE"
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
    "package has test:v15.3 script",
    scripts["test:v15.3"] === "tsx scripts/test-v153-controlled-pre-prod-go-no-go-criteria.mts"
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
  `\nDone v15.3 controlled pre-prod go-no-go criteria validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
