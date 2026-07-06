/**
 * v15.2 controlled pre-prod risk register validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.2
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.2-controlled-pre-prod-risk-register.md";
const FIXTURE_PATH = "docs/examples/v15.2-controlled-pre-prod-risk-register.synthetic.json";
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

console.log("=== v15.2 Controlled Pre-Prod Risk Register Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states v15.2 controlled pre-prod risk register",
  /v15\.2 — Controlled Pre-Prod Risk Register/.test(doc)
);

ok(
  "doc confirms baseline v15.0 v15.0A v15.1 and risk-register only",
  hasEveryLine(doc, [
    "`v15.0` gate packet exists and passed",
    "`v15.0A` gate packet review exists and passed",
    "`v15.1` production/public prep checklist review exists and passed",
    "risk-register only",
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
  "doc includes no-run no-retry no-second-run",
  hasEveryLine(doc, ["no one-run", "no retry", "no second-run"])
);

ok(
  "doc includes no production activation no real lead",
  hasEveryLine(doc, ["no production activation", "no real lead sending"])
);

ok(
  "doc includes no pii phone plate vin and no secret exposure",
  hasEveryLine(doc, [
    "no real customer data / PII",
    "no phone / plate / VIN",
    "no secret / token / API key exposure",
  ])
);

ok(
  "doc includes no uncontrolled gemini provider runtime call",
  hasEveryLine(doc, [
    "no uncontrolled Gemini execution",
    "no provider/Gemini/runtime network call",
  ])
);

ok(
  "doc includes Thor dealer import prohibited and v16 boundary",
  hasEveryLine(doc, [
    "no Thor real data import",
    "no dealer real inventory import",
    "no v16 real dealer / real lead action",
  ])
);

ok(
  "doc includes rollback kill-switch owner approval and stop rules",
  hasEveryLine(doc, [
    "Rollback / kill-switch risk",
    "Owner Approval and Stop Rules",
    "no retry / no second-run without fresh owner approval",
    "hold immediately",
  ])
);

ok(
  "doc contains risk field coverage",
  hasEveryLine(doc, [
    "risk_id",
    "risk_area",
    "description",
    "boundary_status",
    "severity",
    "likelihood",
    "mitigation",
    "evidence_required",
    "owner_approval_required",
    "current_v15_2_status",
    "v16_reserved_if_applicable",
  ])
);

ok(
  "doc includes risk sections A-J",
  hasEveryLine(doc, [
    "RISK-A",
    "RISK-B",
    "RISK-C",
    "RISK-D",
    "RISK-E",
    "RISK-F",
    "RISK-G",
    "RISK-H",
    "RISK-I",
    "RISK-J",
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
  ok("fixture version is v15.2", root.version === "v15.2");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "914fe8bec94a5de839a9cf2caf6b6cc59d812877"
  );

  ok(
    "fixture source references are correct",
    root.sourceV14Closure === "docs/v14.6-limited-staging-pilot-readiness-closure.md" &&
      root.sourceV150GatePacket ===
        "docs/v15.0-controlled-production-public-preparation-gate-packet.md" &&
      root.sourceV150AReview ===
        "docs/v15.0A-controlled-production-public-preparation-gate-packet-review.md" &&
      root.sourceV151ChecklistReview ===
        "docs/v15.1-production-public-prep-checklist-review.md"
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
      noRun?.phonePlateVinByAgent === false &&
      noRun?.tokenSecretApiKeyExposureByAgent === false &&
      noRun?.thorRealDataImportByAgent === false &&
      noRun?.dealerRealInventoryImportByAgent === false &&
      noRun?.v16RealDealerRealLeadActionByAgent === false
  );

  const fields = Array.isArray(root.riskRegisterFields)
    ? (root.riskRegisterFields as string[])
    : [];
  const requiredFields = [
    "risk_id",
    "risk_area",
    "description",
    "boundary_status",
    "severity",
    "likelihood",
    "mitigation",
    "evidence_required",
    "owner_approval_required",
    "current_v15_2_status",
    "v16_reserved_if_applicable",
  ];
  ok(
    "fixture riskRegisterFields include required keys",
    requiredFields.every((field) => fields.includes(field))
  );

  const riskRegister = Array.isArray(root.riskRegister)
    ? (root.riskRegister as Array<Record<string, unknown>>)
    : [];
  ok("fixture riskRegister has 10 entries", riskRegister.length === 10);

  const ids = new Set(riskRegister.map((item) => String(item.risk_id ?? "")));
  const requiredIds = [
    "RISK-A",
    "RISK-B",
    "RISK-C",
    "RISK-D",
    "RISK-E",
    "RISK-F",
    "RISK-G",
    "RISK-H",
    "RISK-I",
    "RISK-J",
  ];
  ok("fixture risk ids A-J present", requiredIds.every((id) => ids.has(id)));

  const allRowsHaveFields = riskRegister.every((row) => {
    return requiredFields.every((field) => Object.prototype.hasOwnProperty.call(row, field));
  });
  ok("fixture each risk row has required fields", allRowsHaveFields);

  const prohibitedRows = riskRegister.filter((row) =>
    String(row.current_v15_2_status ?? "").includes("prohibited")
  );
  ok("fixture has prohibited status rows", prohibitedRows.length >= 9);

  ok(
    "fixture includes preparation-only rollback row",
    riskRegister.some(
      (row) =>
        row.risk_id === "RISK-J" &&
        String(row.current_v15_2_status ?? "").includes("preparation-only")
    )
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.3 CONTROLLED PRE-PROD GO/NO-GO CRITERIA — NO PUBLIC RELEASE"
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
    "package has test:v15.2 script",
    scripts["test:v15.2"] === "tsx scripts/test-v152-controlled-pre-prod-risk-register.mts"
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
  `\nDone v15.2 controlled pre-prod risk register validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
