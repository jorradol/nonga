/**
 * v15.4 controlled pre-prod owner decision packet validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.4
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.4-controlled-pre-prod-owner-decision-packet.md";
const FIXTURE_PATH =
  "docs/examples/v15.4-controlled-pre-prod-owner-decision-packet.synthetic.json";
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

console.log("=== v15.4 Controlled Pre-Prod Owner Decision Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states owner decision packet",
  /v15\.4 — Controlled Pre-Prod Owner Decision Packet/.test(doc)
);

ok(
  "doc confirms preparation-only status",
  hasEveryLine(doc, [
    "owner-decision-packet only",
    "not execution approval",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc confirms baseline through v15.3",
  hasEveryLine(doc, [
    "`v15.0` gate packet exists and passed",
    "`v15.0A` gate packet review exists and passed",
    "`v15.1` checklist review exists and passed",
    "`v15.2` risk register exists and passed",
    "`v15.3` GO/NO-GO criteria exists and passed",
  ])
);

ok(
  "doc includes current milestone status",
  hasEveryLine(doc, [
    "v13 closed",
    "v14 closed",
    "v15 active as controlled preparation",
    "v16 not started",
    "no public release yet",
  ])
);

ok(
  "doc includes what v15.4 authorizes",
  hasEveryLine(doc, [
    "authorize documentation/review preparation only",
    "authorize owner decision framing only",
    "authorize no runtime execution",
    "authorize no deploy",
  ])
);

ok(
  "doc includes what v15.4 does not authorize",
  hasEveryLine(doc, [
    "no production deploy",
    "no production activation",
    "no public route activation",
    "no buyer-facing public release",
    "no real lead sending",
    "no real PII/customer data",
    "no Gemini/provider/runtime call",
    "no one-run/retry/second-run",
    "no Thor/dealer import",
    "no v16 action",
  ])
);

ok(
  "doc includes owner decision options",
  hasEveryLine(doc, [
    "OPTION A — Continue v15 controlled preparation",
    "OPTION B — Hold for review",
    "OPTION C — Prepare future owner-approved dry-run packet only",
    "OPTION D — Stop before any production/public movement",
  ])
);

ok(
  "doc includes future owner approval requirements",
  hasEveryLine(doc, [
    "production deploy approval is separate",
    "public route activation approval is separate",
    "buyer-facing release approval is separate",
    "real lead approval is separate",
    "manual one-run approval is separate",
    "retry/second-run requires fresh owner approval",
  ])
);

ok(
  "doc includes decision evidence summary",
  hasEveryLine(doc, [
    "v13 owner-only Gemini proof baseline",
    "v14 Thai UX / guardrail / limited staging readiness closure",
    "v15.0 gate packet",
    "v15.1 checklist review",
    "v15.2 risk register",
    "v15.3 GO/NO-GO criteria",
  ])
);

ok(
  "doc includes risk summary set",
  hasEveryLine(doc, [
    "production risk",
    "public route risk",
    "buyer-facing AI quality risk",
    "real lead/PII risk",
    "token/secret risk",
    "Gemini/provider/runtime risk",
    "retry/second-run risk",
    "Thor/dealer import risk",
    "v16 boundary risk",
    "rollback/kill-switch risk",
  ])
);

ok(
  "doc includes Thai owner-friendly explanation",
  hasEveryLine(doc, [
    "ตอนนี้เราอยู่ในช่วงเตรียมความพร้อมเชิงเอกสารและเกณฑ์ตัดสินเท่านั้น",
    "v15 คือการเตรียมแบบควบคุมเข้ม",
    "ยังไม่เปิด public ทันที",
    "ถ้าจะไปต่อ ต้องผ่านประตู owner approval",
  ])
);

ok(
  "doc includes rollback kill-switch expectation",
  hasEveryLine(doc, [
    "disable path",
    "owner/operator responsibility",
    "evidence capture",
    "stop condition",
  ])
);

ok(
  "doc includes boundaries for pii token runtime thor dealer and v16",
  hasEveryLine(doc, [
    "no real customer data / PII",
    "no phone / plate / VIN",
    "no secret / token / API key exposure",
    "no provider/Gemini/runtime network call",
    "no Thor real data import",
    "no dealer real inventory import",
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
  ok("fixture version is v15.4", root.version === "v15.4");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "18325bd82a2ac1d0246a35899499e239b9edac99"
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
        "docs/v15.2-controlled-pre-prod-risk-register.md" &&
      root.sourceV153GoNoGoCriteria ===
        "docs/v15.3-controlled-pre-prod-go-no-go-criteria.md"
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

  const milestone = root.currentMilestoneStatus as Record<string, unknown>;
  ok(
    "fixture current milestone status is complete",
    milestone?.v13Closed === true &&
      milestone?.v14Closed === true &&
      milestone?.v15ActiveControlledPreparation === true &&
      milestone?.v16NotStarted === true &&
      milestone?.noPublicReleaseYet === true
  );

  const authorizes = root.v154Authorizes as Record<string, unknown>;
  ok(
    "fixture authorizes section is correct",
    authorizes?.documentationReviewPreparationOnly === true &&
      authorizes?.ownerDecisionFramingOnly === true &&
      authorizes?.noRuntimeExecution === true &&
      authorizes?.noDeploy === true &&
      authorizes?.noPublicProductionRealLeadAction === true
  );

  const notAuthorize = root.v154DoesNotAuthorize as Record<string, unknown>;
  ok(
    "fixture does not authorize section is all false",
    Object.values(notAuthorize ?? {}).every((item) => item === false)
  );

  const options = Array.isArray(root.ownerDecisionOptions)
    ? (root.ownerDecisionOptions as string[])
    : [];
  ok(
    "fixture owner decision options include A-D",
    options.length >= 4 &&
      options.some((v) => v.includes("OPTION A")) &&
      options.some((v) => v.includes("OPTION B")) &&
      options.some((v) => v.includes("OPTION C")) &&
      options.some((v) => v.includes("OPTION D"))
  );

  const approvals = root.futureOwnerApprovalRequirements as Record<string, unknown>;
  ok(
    "fixture future owner approval requirements are complete",
    approvals?.productionDeploySeparateApproval === true &&
      approvals?.publicRouteActivationSeparateApproval === true &&
      approvals?.buyerFacingReleaseSeparateApproval === true &&
      approvals?.realLeadSeparateApproval === true &&
      approvals?.manualOneRunSeparateApprovalOneRunOnly === true &&
      approvals?.retrySecondRunNeedsFreshOwnerApproval === true
  );

  const riskSummary = root.riskSummary as Record<string, unknown>;
  ok(
    "fixture risk summary contains all locked risks",
    Object.keys(riskSummary ?? {}).length >= 10 &&
      Object.values(riskSummary ?? {}).every((value) => value === "locked")
  );

  const thaiExplain = root.thaiOwnerFriendlyExplanation as Record<string, unknown>;
  ok(
    "fixture has Thai owner-friendly explanation section",
    typeof thaiExplain?.currentPosition === "string" &&
      typeof thaiExplain?.v15VsV16 === "string" &&
      typeof thaiExplain?.whyNoPublicNow === "string" &&
      typeof thaiExplain?.requiredGatesToProceed === "string"
  );

  const rollback = root.rollbackKillSwitchExpectation as Record<string, unknown>;
  ok(
    "fixture rollback kill-switch expectations are complete",
    rollback?.disablePathRequiredBeforeFutureMovement === true &&
      rollback?.ownerOperatorResponsibilityRequired === true &&
      rollback?.evidenceCaptureRequired === true &&
      rollback?.stopConditionRequired === true
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.5 CONTROLLED PRE-PROD DRY-RUN PACKET DESIGN — NO PUBLIC RELEASE"
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
    "package has test:v15.4 script",
    scripts["test:v15.4"] ===
      "tsx scripts/test-v154-controlled-pre-prod-owner-decision-packet.mts"
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
  `\nDone v15.4 controlled pre-prod owner decision packet validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
