/**
 * v15.6 controlled pre-prod dry-run packet review validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.6
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.6-controlled-pre-prod-dry-run-packet-review.md";
const FIXTURE_PATH =
  "docs/examples/v15.6-controlled-pre-prod-dry-run-packet-review.synthetic.json";
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

console.log("=== v15.6 Controlled Pre-Prod Dry-Run Packet Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states dry-run packet review",
  /v15\.6 — Controlled Pre-Prod Dry-Run Packet Review/.test(doc)
);

ok(
  "doc confirms review-only no execution scope",
  hasEveryLine(doc, [
    "dry-run packet review only",
    "review-only and is not dry-run execution",
    "not execution approval",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc confirms baseline through v15.5",
  hasEveryLine(doc, [
    "`v13` closed",
    "`v14` closed",
    "`v15.0` gate packet exists and passed",
    "`v15.0A` gate packet review exists and passed",
    "`v15.1` checklist review exists and passed",
    "`v15.2` risk register exists and passed",
    "`v15.3` GO/NO-GO criteria exists and passed",
    "`v15.4` owner decision packet exists and passed",
    "`v15.5` dry-run packet design exists and passed",
  ])
);

ok(
  "doc includes review scope",
  hasEveryLine(doc, [
    "v15.6 is review-only",
    "no dry-run execution in this round",
    "no one-run in this round",
    "no deploy in this round",
    "no public/production/real lead action in this round",
    "no v16 action in this round",
  ])
);

ok(
  "doc includes v15.5 design completeness review",
  hasEveryLine(doc, [
    "dry-run status coverage: complete",
    "future purpose coverage: complete",
    "future owner approval requirement coverage: complete",
    "preflight checklist design coverage: complete",
    "evidence field design coverage: complete",
    "stop conditions coverage: complete",
    "allowed future decisions safety: complete and bounded",
    "rollback/kill-switch design coverage: complete",
    "Thai owner-friendly explanation coverage: complete",
  ])
);

ok(
  "doc includes execution approval separation review",
  hasEveryLine(doc, [
    "v15.5 and v15.6 do not authorize execution",
    "future dry-run execution requires fresh owner approval",
    "scope/command/target/evidence before execution",
    "no retry/no second-run without fresh owner approval",
  ])
);

ok(
  "doc includes boundary review",
  hasEveryLine(doc, [
    "no public release",
    "no production activation",
    "no real lead sending",
    "no buyer-facing public release",
    "no Thor/dealer real import",
    "no v16 real dealer/real lead action",
  ])
);

ok(
  "doc includes security privacy review",
  hasEveryLine(doc, [
    "no token/secret/API key exposure",
    "no real PII/customer data",
    "no phone/plate/VIN",
    "synthetic-only artifacts",
    "masked-only expectation",
  ])
);

ok(
  "doc includes runtime provider gemini review",
  hasEveryLine(doc, [
    "no live endpoint call",
    "no provider/Gemini/runtime network call",
    "no uncontrolled Gemini execution",
    "prior v13/v14 evidence only",
  ])
);

ok(
  "doc includes stop condition review",
  hasEveryLine(doc, [
    "HOLD if public/prod activation risk is detected",
    "HOLD if real lead risk is detected",
    "HOLD if token/secret/PII risk is detected",
    "HOLD if uncontrolled runtime/provider/Gemini risk is detected",
    "HOLD if retry/second-run risk is detected",
    "HOLD if v16 boundary is crossed",
    "HOLD if rollback/kill-switch is missing",
  ])
);

ok(
  "doc includes decision mapping review",
  hasEveryLine(doc, [
    "`GO` means ready for next preparation step only",
    "`NEED REVIEW` means packet/review incomplete but boundary still intact",
    "`HOLD` means risk found in public/production/real lead/runtime/security/privacy/v16",
  ])
);

ok(
  "doc includes rollback kill-switch review",
  hasEveryLine(doc, [
    "rollback expectation remains mandatory",
    "disable path expectation must be explicit",
    "owner/operator responsibility must be explicit",
    "evidence capture must be explicit",
    "stop condition must be explicit",
  ])
);

ok(
  "doc includes Thai owner-friendly review summary",
  hasEveryLine(doc, [
    "v15.6 คือการตรวจทาน packet เท่านั้น ไม่ใช่การรัน dry-run จริง",
    "การ review ก่อน future dry-run",
    "ยังห้าม one-run/retry/second-run",
    "ต้องมี owner approval แยก",
  ])
);

ok(
  "doc includes hard boundaries for no-run no-public no-pii no-token and no-runtime",
  hasEveryLine(doc, [
    "no one-run",
    "no retry",
    "no second-run",
    "no public route activation",
    "no production activation",
    "no real customer data / PII",
    "no phone / plate / VIN",
    "no secret / token / API key exposure",
    "no provider/Gemini/runtime network call",
    "no v16 real dealer / real lead action",
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
  ok("fixture version is v15.6", root.version === "v15.6");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "f430e1a55c47d9610a1a2cefaf3bef806b938d92"
  );

  ok(
    "fixture source references are correct",
    root.sourceV13Closure === "docs/v13.16-owner-only-gemini-runtime-proof-closure.md" &&
      root.sourceV14Closure === "docs/v14.6-limited-staging-pilot-readiness-closure.md" &&
      root.sourceV150GatePacket ===
        "docs/v15.0-controlled-production-public-preparation-gate-packet.md" &&
      root.sourceV150AReview ===
        "docs/v15.0A-controlled-production-public-preparation-gate-packet-review.md" &&
      root.sourceV151ChecklistReview ===
        "docs/v15.1-production-public-prep-checklist-review.md" &&
      root.sourceV152RiskRegister ===
        "docs/v15.2-controlled-pre-prod-risk-register.md" &&
      root.sourceV153GoNoGoCriteria ===
        "docs/v15.3-controlled-pre-prod-go-no-go-criteria.md" &&
      root.sourceV154OwnerDecisionPacket ===
        "docs/v15.4-controlled-pre-prod-owner-decision-packet.md" &&
      root.sourceV155DryRunDesign ===
        "docs/v15.5-controlled-pre-prod-dry-run-packet-design.md"
  );

  ok(
    "fixture review boundaries are true",
    root.reviewOnly === true &&
      root.noExecution === true &&
      root.noPublicRelease === true &&
      root.noProductionActivation === true &&
      root.noRealLead === true &&
      root.thorDealerImportProhibited === true
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

  const scope = root.reviewScope as Record<string, unknown>;
  ok(
    "fixture review scope is complete",
    scope?.v156ReviewOnly === true &&
      scope?.noDryRunExecution === true &&
      scope?.noOneRun === true &&
      scope?.noDeploy === true &&
      scope?.noPublicProductionRealLead === true &&
      scope?.noV16Action === true
  );

  const completeness = root.v155DesignCompletenessReview as Record<string, unknown>;
  ok(
    "fixture v15.5 design completeness review is complete",
    Object.keys(completeness ?? {}).length >= 9 &&
      Object.values(completeness ?? {}).every((value) => value === true)
  );

  const separation = root.executionApprovalSeparationReview as Record<string, unknown>;
  ok(
    "fixture execution approval separation review is complete",
    separation?.v155AndV156DoNotAuthorizeExecution === true &&
      separation?.futureExecutionNeedsFreshOwnerApproval === true &&
      separation?.scopeCommandTargetEvidenceRequiredBeforeFutureRun === true &&
      separation?.retrySecondRunNeedsFreshOwnerApproval === true
  );

  const boundary = root.boundaryReview as Record<string, unknown>;
  ok(
    "fixture boundary review is complete",
    Object.keys(boundary ?? {}).length >= 6 &&
      Object.values(boundary ?? {}).every((value) => value === true)
  );

  const security = root.securityPrivacyReview as Record<string, unknown>;
  ok(
    "fixture security privacy review is complete",
    Object.keys(security ?? {}).length >= 5 &&
      Object.values(security ?? {}).every((value) => value === true)
  );

  const runtime = root.runtimeProviderGeminiReview as Record<string, unknown>;
  ok(
    "fixture runtime provider gemini review is complete",
    Object.keys(runtime ?? {}).length >= 4 &&
      Object.values(runtime ?? {}).every((value) => value === true)
  );

  const stop = root.stopConditionReview as Record<string, unknown>;
  ok(
    "fixture stop condition review maps all risks to HOLD",
    Object.keys(stop ?? {}).length >= 7 &&
      Object.values(stop ?? {}).every((value) => value === "HOLD")
  );

  const mapping = root.decisionMappingReview as Record<string, unknown>;
  ok(
    "fixture decision mapping review has GO NEED_REVIEW HOLD",
    typeof mapping?.GO === "string" &&
      typeof mapping?.NEED_REVIEW === "string" &&
      typeof mapping?.HOLD === "string"
  );

  const rollback = root.rollbackKillSwitchReview as Record<string, unknown>;
  ok(
    "fixture rollback kill-switch review is complete",
    Object.keys(rollback ?? {}).length >= 5 &&
      Object.values(rollback ?? {}).every((value) => value === true)
  );

  const v16 = root.v16Boundary as Record<string, unknown>;
  ok(
    "fixture v16 boundary is complete",
    v16?.v16NotStarted === true &&
      v16?.notRealDealerRealLeadPilot === true &&
      v16?.thorDealerRealImportProhibited === true &&
      v16?.realLeadSendingProhibited === true
  );

  const thai = root.thaiOwnerFriendlyReviewSummary as Record<string, unknown>;
  ok(
    "fixture has Thai owner-friendly review summary",
    typeof thai?.whatIsV156 === "string" &&
      typeof thai?.whyReviewFirst === "string" &&
      typeof thai?.whatIsStillProhibited === "string" &&
      typeof thai?.futureRunNeedsSeparateOwnerApproval === "string"
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.7 CONTROLLED PRE-PROD OWNER APPROVAL TEMPLATE — NO EXECUTION"
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
    "package has test:v15.6 script",
    scripts["test:v15.6"] ===
      "tsx scripts/test-v156-controlled-pre-prod-dry-run-packet-review.mts"
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
  `\nDone v15.6 controlled pre-prod dry-run packet review validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
