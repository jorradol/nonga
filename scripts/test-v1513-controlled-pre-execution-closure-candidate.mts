/**
 * v15.13 controlled pre-execution closure candidate validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.13
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.13-controlled-pre-execution-closure-candidate.md";
const FIXTURE_PATH =
  "docs/examples/v15.13-controlled-pre-execution-closure-candidate.synthetic.json";
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

console.log("=== v15.13 Controlled Pre-Execution Closure Candidate Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc and fixture state v15.13 closure candidate",
  /v15\.13 — Controlled Pre-Execution Closure Candidate/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v15.13\"")
);

ok(
  "doc states execution type closure-candidate only",
  hasEveryLine(doc, [
    "controlled pre-execution closure candidate only",
    "preparation-only and review-only",
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
  ok("isExecution=false", root.isExecution === false);
  ok("isDryRun=false", root.isDryRun === false);
  ok("isOwnerApproval=false", root.isOwnerApproval === false);
  ok("isPublicRelease=false", root.isPublicRelease === false);
  ok("isProductionActivation=false", root.isProductionActivation === false);
  ok("isRealLead=false", root.isRealLead === false);
  ok("isV16=false", root.isV16 === false);

  const baseline = root.baseline as Record<string, unknown>;
  ok(
    "baseline v13 v14 v15.0-v15.12 complete",
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
      baseline?.["v15.12"] === "PASSED"
  );

  const readiness = root.readinessChain as Record<string, unknown>;
  ok(
    "readiness chain complete",
    readiness?.v150ToV1512PreparationChainComplete === true &&
      readiness?.futureExecutionNeedsFreshOwnerApproval === true &&
      readiness?.exactCommandTargetEvidenceRequired === true &&
      readiness?.oneRunRetrySecondRunLockedWithoutFreshApproval === true
  );

  const approvalSafety = root.approvalSafetyChain as Record<string, unknown>;
  ok(
    "approval safety chain complete",
    approvalSafety?.v157TemplateSafety === true &&
      approvalSafety?.v158TemplateReviewSafety === true &&
      approvalSafety?.v1511RequestDraftPlaceholderSafety === true &&
      approvalSafety?.v1512RequestReviewNoRealApproval === true &&
      approvalSafety?.noRealApprovalGrantedInV1513 === true
  );

  ok(
    "no real approval confirmation complete",
    approvalSafety?.noRealApprovalGrantedInV1513 === true &&
      root.isOwnerApproval === false &&
      root.isExecution === false
  );

  ok(
    "boundary confirmation complete",
    (root.boundaries as Record<string, unknown>)?.noPublicRouteActivation === true &&
      (root.boundaries as Record<string, unknown>)?.noProductionDeploy === true &&
      (root.boundaries as Record<string, unknown>)?.noProductionActivation === true &&
      (root.boundaries as Record<string, unknown>)?.noBuyerFacingPublicRelease === true &&
      (root.boundaries as Record<string, unknown>)?.noRealLeadSending === true
  );

  ok(
    "runtime provider gemini boundary complete",
    (root.runtimeProviderGemini as Record<string, unknown>)?.noLiveEndpointCall === true &&
      (root.runtimeProviderGemini as Record<string, unknown>)?.noProviderGeminiRuntimeNetworkCall === true &&
      (root.runtimeProviderGemini as Record<string, unknown>)?.noUncontrolledGeminiExecution === true
  );

  ok(
    "security privacy pii token boundary complete",
    (root.securityPrivacy as Record<string, unknown>)?.noRealCustomerDataPii === true &&
      (root.securityPrivacy as Record<string, unknown>)?.noPhonePlateVin === true &&
      (root.securityPrivacy as Record<string, unknown>)?.noSecretTokenApiKeyExposure === true
  );

  ok(
    "rollback kill-switch reference complete",
    (root.rollbackKillSwitch as Record<string, unknown>)?.futureExecutionNeedsRollbackDisablePath === true &&
      (root.rollbackKillSwitch as Record<string, unknown>)?.ownerOperatorResponsibilityExplicit === true &&
      (root.rollbackKillSwitch as Record<string, unknown>)?.evidenceCaptureExplicit === true &&
      (root.rollbackKillSwitch as Record<string, unknown>)?.holdIfRollbackKillSwitchMissing === true
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
    typeof thai?.whatIsV1513 === "string" &&
      typeof thai?.notRealApprovalOrExecution === "string" &&
      typeof thai?.futureExecutionNeedsFreshOwnerApproval === "string" &&
      typeof thai?.whyNoPublicProductionRealLeadNow === "string" &&
      typeof thai?.v16NotStarted === "string"
  );

  ok(
    "next recommendation is v15.14 closure review only",
    root.nextRecommendation ===
      "READY FOR v15.14 CONTROLLED PRE-EXECUTION CLOSURE REVIEW — NO EXECUTION"
  );
}

ok(
  "doc confirms no execution no dry-run no real approval",
  hasEveryLine(doc, [
    "no execution",
    "no dry-run",
    "no owner approval",
    "must not be interpreted as real approval",
  ])
);

ok(
  "doc includes remaining locked gates",
  hasEveryLine(doc, [
    "fresh owner approval is still required",
    "one-run/retry/second-run gate remains locked",
    "runtime/provider/Gemini gate remains locked",
    "public/production/real lead gate remains locked",
    "v16 boundary remains locked",
  ])
);

ok(
  "doc includes exact next step recommendation",
  hasEveryLine(doc, [
    "READY FOR v15.14 CONTROLLED PRE-EXECUTION CLOSURE REVIEW — NO EXECUTION",
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
    "package has test:v15.13 script",
    scripts["test:v15.13"] ===
      "tsx scripts/test-v1513-controlled-pre-execution-closure-candidate.mts"
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
  `\nDone v15.13 controlled pre-execution closure candidate validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
