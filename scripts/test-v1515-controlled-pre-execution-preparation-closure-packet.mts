/**
 * v15.15 controlled pre-execution preparation closure packet validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.15
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.15-controlled-pre-execution-preparation-closure-packet.md";
const FIXTURE_PATH =
  "docs/examples/v15.15-controlled-pre-execution-preparation-closure-packet.synthetic.json";
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

console.log("=== v15.15 Controlled Pre-Execution Preparation Closure Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc and fixture state v15.15 correctly",
  /v15\.15 — Controlled Pre-Execution Preparation Closure Packet/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v15.15\"")
);

ok(
  "doc states execution type pre-execution-preparation-closure-packet only",
  hasEveryLine(doc, [
    "pre-execution preparation closure packet only",
    "packet-only",
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
  ok("isPacketOnly=true", root.isPacketOnly === true);
  ok("isExecution=false", root.isExecution === false);
  ok("isDryRun=false", root.isDryRun === false);
  ok("isOwnerApproval=false", root.isOwnerApproval === false);
  ok("isPublicRelease=false", root.isPublicRelease === false);
  ok("isProductionActivation=false", root.isProductionActivation === false);
  ok("isRealLead=false", root.isRealLead === false);
  ok("isV16=false", root.isV16 === false);

  const baseline = root.baseline as Record<string, unknown>;
  ok(
    "baseline v13 v14 v15.0-v15.14 complete",
    baseline?.["v13"] === "CLOSED" &&
      baseline?.["v14"] === "CLOSED" &&
      baseline?.["v15.0"] === "PASSED" &&
      baseline?.["v15.0A"] === "PASSED" &&
      baseline?.["v15.1"] === "PASSED" &&
      baseline?.["v15.2"] === "PASSED" &&
      baseline?.["v15.3"] === "PASSED" &&
      baseline?.["v15.4"] === "PASSED" &&
      baseline?.["v15.5"] === "PASSED" &&
      baseline?.["v15.6"] === "PASSED" &&
      baseline?.["v15.7"] === "PASSED" &&
      baseline?.["v15.8"] === "PASSED" &&
      baseline?.["v15.9"] === "PASSED" &&
      baseline?.["v15.10"] === "PASSED" &&
      baseline?.["v15.11"] === "PASSED" &&
      baseline?.["v15.12"] === "PASSED" &&
      baseline?.["v15.13"] === "PASSED" &&
      baseline?.["v15.14"] === "PASSED"
  );

  const chain = root.preparationChain as Record<string, unknown>;
  ok(
    "preparation chain summary complete",
    Object.keys(chain ?? {}).length >= 5 &&
      Object.values(chain ?? {}).every((value) => value === true)
  );

  const evidenceIndex = Array.isArray(root.readinessEvidenceIndex)
    ? (root.readinessEvidenceIndex as string[])
    : [];
  ok(
    "readiness evidence index complete",
    evidenceIndex.length >= 16 &&
      evidenceIndex.some((v) => v.includes("v15.0")) &&
      evidenceIndex.some((v) => v.includes("v15.14"))
  );

  const approvalSafety = root.approvalSafetyChain as Record<string, unknown>;
  ok(
    "approval safety chain complete",
    Object.keys(approvalSafety ?? {}).length >= 4 &&
      Object.values(approvalSafety ?? {}).every((value) => value === true)
  );

  const noReal = root.noRealApprovalConfirmation as Record<string, unknown>;
  ok(
    "no real approval confirmation complete",
    Object.keys(noReal ?? {}).length >= 4 &&
      Object.values(noReal ?? {}).every((value) => value === true)
  );

  ok(
    "no dry-run and no execution confirmation complete",
    root.isExecution === false && root.isDryRun === false
  );

  const boundaries = root.boundaries as Record<string, unknown>;
  ok(
    "public production real lead boundary complete",
    boundaries?.noProductionDeploy === true &&
      boundaries?.noProductionActivation === true &&
      boundaries?.noPublicRouteActivation === true &&
      boundaries?.noBuyerFacingPublicRelease === true &&
      boundaries?.noRealLeadSending === true
  );

  const runtime = root.runtimeProviderGemini as Record<string, unknown>;
  ok(
    "runtime provider gemini boundary complete",
    Object.keys(runtime ?? {}).length >= 3 &&
      Object.values(runtime ?? {}).every((value) => value === true)
  );

  const security = root.securityPrivacy as Record<string, unknown>;
  ok(
    "security privacy pii token boundary complete",
    Object.keys(security ?? {}).length >= 6 &&
      Object.values(security ?? {}).every((value) => value === true)
  );

  ok(
    "thor dealer real import boundary complete",
    boundaries?.noThorRealDataImport === true &&
      boundaries?.noDealerRealInventoryImport === true
  );

  const rollback = root.rollbackKillSwitch as Record<string, unknown>;
  ok(
    "rollback kill-switch reference complete",
    Object.keys(rollback ?? {}).length >= 4 &&
      Object.values(rollback ?? {}).every((value) => value === true)
  );

  const stops = root.stopConditions as Record<string, unknown>;
  ok(
    "stop conditions complete",
    Object.keys(stops ?? {}).length >= 15 &&
      Object.values(stops ?? {}).every((value) => value === "HOLD")
  );

  const mapping = root.decisionMapping as Record<string, unknown>;
  ok(
    "decision mapping complete",
    typeof mapping?.GO === "string" &&
      typeof mapping?.NEED_REVIEW === "string" &&
      typeof mapping?.HOLD === "string"
  );

  const thai = root.thaiOwnerSummary as Record<string, unknown>;
  ok(
    "thai owner-friendly summary complete",
    typeof thai?.whatIsV1515 === "string" &&
      typeof thai?.notFinalPublicLaunch === "string" &&
      typeof thai?.notRealApproval === "string" &&
      typeof thai?.futureExecutionNeedsFreshOwnerApproval === "string" &&
      typeof thai?.whyNoPublicProductionRealLeadNow === "string" &&
      typeof thai?.v16NotStarted === "string"
  );

  ok(
    "next recommendation is v15.16 review-only step",
    root.nextRecommendation ===
      "READY FOR v15.16 CONTROLLED PRE-EXECUTION PREPARATION CLOSURE REVIEW — NO EXECUTION"
  );
}

ok(
  "doc confirms no approval no execution no launch",
  hasEveryLine(doc, [
    "not owner approval",
    "no execution",
    "no dry-run",
    "not final public launch",
    "does not authorize execution/dry-run/one-run",
  ])
);

ok(
  "doc includes remaining locked gates",
  hasEveryLine(doc, [
    "owner approval gate locked",
    "exact command/target/evidence gate locked",
    "one-run/retry/second-run gate locked",
    "runtime/provider/Gemini gate locked",
    "public/production/real lead gate locked",
    "v16 boundary gate locked",
  ])
);

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
    "package has test:v15.15 script",
    scripts["test:v15.15"] ===
      "tsx scripts/test-v1515-controlled-pre-execution-preparation-closure-packet.mts"
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

ok(
  "no real execution authorization phrase",
  !/FINAL EXECUTION AUTHORIZE(?!\s*\.\.\.)/i.test(combined)
);

console.log(
  `\nDone v15.15 controlled pre-execution preparation closure packet validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
