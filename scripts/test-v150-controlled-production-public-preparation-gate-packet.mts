/**
 * v15.0 controlled production/public preparation gate packet validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.0
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.0-controlled-production-public-preparation-gate-packet.md";
const FIXTURE_PATH =
  "docs/examples/v15.0-controlled-production-public-preparation-gate-packet.synthetic.json";
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

console.log("=== v15.0 Controlled Production/Public Preparation Gate Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states v15.0 Controlled Production/Public Preparation Gate Packet",
  /v15\.0 — Controlled Production\/Public Preparation Gate Packet/.test(doc)
);

ok(
  "doc references v14.6 closure source",
  hasEveryLine(doc, ["docs/v14.6-limited-staging-pilot-readiness-closure.md"])
);

ok(
  "doc states v14 closed and v14.6 pass",
  hasEveryLine(doc, ["v14 closed / v14.6 PASS", "v14.6 Limited Staging Pilot Readiness Closure = PASS"])
);

ok(
  "doc states no one-run retry second-run",
  hasEveryLine(doc, ["no one-run", "no retry", "no second-run"])
);

ok(
  "doc states no live endpoint provider gemini runtime call",
  hasEveryLine(doc, ["no live endpoint call", "no provider/Gemini/runtime network call"])
);

ok("doc states no deploy", hasEveryLine(doc, ["deploy by agent: no"]));

ok(
  "doc states no production public real lead",
  hasEveryLine(doc, ["no production deploy", "no public route activation", "no buyer-facing public release", "no real lead sending"])
);

ok(
  "doc states v16 reserved boundary",
  hasEveryLine(doc, ["v16 boundary is separate", "limited real dealer / real lead action belongs to v16 only"])
);

const requiredChecklistDocLines = [
  "v14 closure evidence confirmed",
  "staging readiness closure confirmed",
  "production/public boundary documented",
  "public route activation remains blocked",
  "buyer-facing public release remains blocked",
  "real lead sending remains blocked",
  "real PII/customer data remains blocked",
  "phone/plate/VIN handling remains blocked for public artifacts",
  "secret/token exposure prevention confirmed",
  "owner authorization model documented",
  "one-run approval model documented",
  "no retry / no second-run rule documented",
  "rollback/kill-switch expectation documented",
  "audit log / evidence capture expectation documented",
  "Thai UX and guardrail baseline documented",
  "Firebase auth/user-visible gate baseline documented",
  "Gemini/provider runtime baseline documented from prior evidence only",
  "v16 boundary documented separately",
];
ok(
  "doc v15 gate checklist covers required items",
  hasEveryLine(doc, requiredChecklistDocLines)
);

ok(
  "doc boundary matrix has four layers",
  hasEveryLine(doc, [
    "Current allowed in v15.0",
    "Still prohibited in v15.0",
    "Requires future owner approval",
    "Reserved for v16",
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
  ok("fixture version is v15.0", root.version === "v15.0");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "7c02bd22d058ba590725e2756e10689478c93b29"
  );
  ok(
    "fixture source references are correct",
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
      noRun?.dealerRealInventoryImportByAgent === false
  );

  const checklist = root.v15GateChecklist as Record<string, unknown>;
  ok(
    "fixture v15GateChecklist is complete with PASS",
    checklist?.v14ClosureEvidenceConfirmed === "PASS" &&
      checklist?.stagingReadinessClosureConfirmed === "PASS" &&
      checklist?.productionPublicBoundaryDocumented === "PASS" &&
      checklist?.publicRouteActivationRemainsBlocked === "PASS" &&
      checklist?.buyerFacingPublicReleaseRemainsBlocked === "PASS" &&
      checklist?.realLeadSendingRemainsBlocked === "PASS" &&
      checklist?.realPiiCustomerDataRemainsBlocked === "PASS" &&
      checklist?.phonePlateVinHandlingRemainsBlockedForPublicArtifacts === "PASS" &&
      checklist?.secretTokenExposurePreventionConfirmed === "PASS" &&
      checklist?.ownerAuthorizationModelDocumented === "PASS" &&
      checklist?.oneRunApprovalModelDocumented === "PASS" &&
      checklist?.noRetryNoSecondRunRuleDocumented === "PASS" &&
      checklist?.rollbackKillSwitchExpectationDocumented === "PASS" &&
      checklist?.auditLogEvidenceCaptureExpectationDocumented === "PASS" &&
      checklist?.thaiUxAndGuardrailBaselineDocumented === "PASS" &&
      checklist?.firebaseAuthUserVisibleGateBaselineDocumented === "PASS" &&
      checklist?.geminiProviderRuntimeBaselineDocumentedFromPriorEvidenceOnly === "PASS" &&
      checklist?.v16BoundaryDocumentedSeparately === "PASS"
  );

  const boundaryMatrix = Array.isArray(root.boundaryMatrix)
    ? (root.boundaryMatrix as Array<Record<string, unknown>>)
    : [];
  ok("fixture boundaryMatrix exists and is non-empty", boundaryMatrix.length > 0);

  const requiredCapabilities = [
    "staging controlled review",
    "production deploy",
    "public route activation",
    "buyer-facing AI release",
    "real lead sending",
    "real customer data / PII",
    "Thor real data import",
    "dealer real inventory import",
    "Gemini runtime execution",
    "Firebase auth / allowlist",
    "token/secret handling",
    "rollback / disable path",
  ];
  const capabilitySet = new Set(boundaryMatrix.map((row) => String(row.capability ?? "")));
  ok(
    "fixture boundaryMatrix has required capabilities",
    requiredCapabilities.every((item) => capabilitySet.has(item))
  );

  const hasFourLayersPerRow = boundaryMatrix.every((row) => {
    return (
      typeof row.currentAllowedInV150 === "string" &&
      typeof row.stillProhibitedInV150 === "string" &&
      typeof row.requiresFutureOwnerApproval === "string" &&
      typeof row.reservedForV16 === "string"
    );
  });
  ok("fixture boundaryMatrix has all four layer columns", hasFourLayersPerRow);

  ok("fixture has ownerApprovalRequirements", !!root.ownerApprovalRequirements);
  ok("fixture has rollbackKillSwitchExpectations", !!root.rollbackKillSwitchExpectations);
  ok("fixture has nextMilestoneCandidate", !!root.nextMilestoneCandidate);
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
    "package has test:v15.0 script",
    scripts["test:v15.0"] ===
      "tsx scripts/test-v150-controlled-production-public-preparation-gate-packet.mts"
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
  `\nDone v15.0 controlled production/public preparation gate packet validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
