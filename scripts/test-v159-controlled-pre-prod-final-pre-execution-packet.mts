/**
 * v15.9 controlled pre-prod final pre-execution packet validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.9
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.9-controlled-pre-prod-final-pre-execution-packet.md";
const FIXTURE_PATH =
  "docs/examples/v15.9-controlled-pre-prod-final-pre-execution-packet.synthetic.json";
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

console.log("=== v15.9 Controlled Pre-Prod Final Pre-Execution Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states final pre-execution packet",
  /v15\.9 — Controlled Pre-Prod Final Pre-Execution Packet/.test(doc)
);

ok(
  "doc confirms no execution no dry-run and no approvals",
  hasEveryLine(doc, [
    "final pre-execution packet only",
    "not execution",
    "not dry-run execution",
    "not execution approval",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc confirms baseline through v15.8",
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
    "`v15.6` dry-run packet review exists and passed",
    "`v15.7` owner approval template exists and passed",
    "`v15.8` approval template review exists and passed",
  ])
);

ok(
  "doc includes packet status",
  hasEveryLine(doc, [
    "v15.9 is final pre-execution packet only",
    "no execution in this round",
    "no dry-run in this round",
    "no one-run approval in this round",
    "no deploy approval in this round",
    "no public/production/real lead approval in this round",
    "v16 not started",
  ])
);

ok(
  "doc includes milestone evidence rollup",
  hasEveryLine(doc, [
    "v13 owner-only Gemini runtime proof",
    "v14 Thai UX / guardrails / limited staging readiness closure",
    "v15.0 gate packet",
    "v15.0A gate packet review",
    "v15.1 checklist review",
    "v15.2 risk register",
    "v15.3 GO/NO-GO criteria",
    "v15.4 owner decision packet",
    "v15.5 dry-run packet design",
    "v15.6 dry-run packet review",
    "v15.7 owner approval template",
    "v15.8 approval template review",
  ])
);

ok(
  "doc includes pre-execution readiness summary",
  hasEveryLine(doc, [
    "future execution requires fresh owner approval",
    "exact scope is required",
    "exact command/action is required",
    "exact target is required",
    "expected evidence is required",
    "one-run only declaration is required",
    "retry/second-run default is false",
    "rollback/kill-switch path is required",
    "stop conditions are required",
    "token/secret/PII handling is required",
    "boundary assertions are required",
  ])
);

ok(
  "doc includes what v15.9 authorizes",
  hasEveryLine(doc, [
    "documentation/review preparation only",
    "final pre-execution framing only",
    "no runtime execution",
    "no dry-run",
    "no deploy",
    "no public/production/real lead action",
  ])
);

ok(
  "doc includes what v15.9 does not authorize",
  hasEveryLine(doc, [
    "no one-run",
    "no retry",
    "no second-run",
    "no live endpoint call",
    "no provider/Gemini/runtime call",
    "no deploy",
    "no production deploy/activation",
    "no public route activation",
    "no buyer-facing public release",
    "no real lead",
    "no real PII/customer data",
    "no phone/plate/VIN",
    "no token/secret/API key exposure",
    "no Thor/dealer import",
    "no v16 action",
  ])
);

ok(
  "doc includes final boundary checklist",
  hasEveryLine(doc, [
    "repo state",
    "validation status",
    "data privacy",
    "token/secret exposure",
    "public/production block",
    "real lead block",
    "runtime/provider/Gemini block",
    "one-run/retry/second-run block",
    "rollback/kill-switch expectation",
    "v16 boundary",
  ])
);

ok(
  "doc includes final stop conditions",
  hasEveryLine(doc, [
    "HOLD if branch/HEAD/origin/working tree mismatch",
    "HOLD if validation failure",
    "HOLD if doc/fixture/test mismatch",
    "HOLD if token/secret/API key exposure",
    "HOLD if real PII/customer data/phone/plate/VIN",
    "HOLD if live endpoint/provider/Gemini/runtime call",
    "HOLD if uncontrolled Gemini execution",
    "HOLD if one-run/retry/second-run",
    "HOLD if production/public activation",
    "HOLD if buyer-facing public release",
    "HOLD if real lead sending",
    "HOLD if Thor/dealer real import",
    "HOLD if v16 real dealer/real lead action",
    "HOLD if rollback/kill-switch is missing",
    "HOLD if command/target ambiguity",
  ])
);

ok(
  "doc includes future owner approval placeholder only",
  hasEveryLine(doc, [
    "FUTURE OWNER APPROVAL REQUIRED — NOT GRANTED IN v15.9",
    "FINAL EXECUTION AUTHORIZE ...",
    "placeholder example only",
    "must not be interpreted as execution authorization",
  ])
);

ok(
  "doc includes safe next-step options",
  hasEveryLine(doc, [
    "OPTION A — Review final pre-execution packet only",
    "OPTION B — Prepare owner approval request draft only",
    "OPTION C — Hold before any execution",
    "OPTION D — Continue documentation-only closure",
  ])
);

ok(
  "doc includes decision mapping",
  hasEveryLine(doc, [
    "`GO` means ready for preparation/review step only",
    "`NEED REVIEW` means packet incomplete but boundary intact",
    "`HOLD` means risk in repo/test/security/privacy/runtime/public/production/real lead/v16",
  ])
);

ok(
  "doc includes rollback kill-switch section",
  hasEveryLine(doc, [
    "future execution requires rollback/disable path",
    "owner/operator responsibility",
    "evidence capture",
    "requires HOLD",
  ])
);

ok(
  "doc includes Thai owner-friendly explanation",
  hasEveryLine(doc, [
    "v15.9 คือแฟ้มสรุปก่อนการขออนุมัติรันในอนาคต",
    "ยังไม่ใช่การรันจริง",
    "ไม่ใช่คำอนุมัติ",
    "fresh owner approval แยก",
    "ยังไม่เปิด public/production/real lead",
    "v16 ยังไม่เริ่ม",
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
  ok("fixture version is v15.9", root.version === "v15.9");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "538c001b91713f0c2cf85732347c4c1d8ef78ac2"
  );

  ok(
    "fixture source references are correct",
    root.sourceV13Proof === "docs/v13.16-owner-only-gemini-runtime-proof-closure.md" &&
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
        "docs/v15.5-controlled-pre-prod-dry-run-packet-design.md" &&
      root.sourceV156DryRunReview ===
        "docs/v15.6-controlled-pre-prod-dry-run-packet-review.md" &&
      root.sourceV157OwnerApprovalTemplate ===
        "docs/v15.7-controlled-pre-prod-owner-approval-template.md" &&
      root.sourceV158ApprovalTemplateReview ===
        "docs/v15.8-controlled-pre-prod-approval-template-review.md"
  );

  ok(
    "fixture packet boundaries are true",
    root.finalPreExecutionPacketOnly === true &&
      root.noExecution === true &&
      root.noDryRun === true &&
      root.noExecutionApproval === true &&
      root.noDeployApproval === true &&
      root.noPublicReleaseApproval === true &&
      root.noRealLeadApproval === true &&
      root.v16NotStarted === true &&
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

  const rollup = Array.isArray(root.milestoneEvidenceRollup)
    ? (root.milestoneEvidenceRollup as string[])
    : [];
  ok(
    "fixture milestone evidence rollup contains all required entries",
    rollup.length >= 12 &&
      rollup.some((v) => v.includes("v13")) &&
      rollup.some((v) => v.includes("v14")) &&
      rollup.some((v) => v.includes("v15.0")) &&
      rollup.some((v) => v.includes("v15.0A")) &&
      rollup.some((v) => v.includes("v15.1")) &&
      rollup.some((v) => v.includes("v15.2")) &&
      rollup.some((v) => v.includes("v15.3")) &&
      rollup.some((v) => v.includes("v15.4")) &&
      rollup.some((v) => v.includes("v15.5")) &&
      rollup.some((v) => v.includes("v15.6")) &&
      rollup.some((v) => v.includes("v15.7")) &&
      rollup.some((v) => v.includes("v15.8"))
  );

  const readiness = root.preExecutionReadinessSummary as Record<string, unknown>;
  ok(
    "fixture pre-execution readiness summary is complete",
    Object.keys(readiness ?? {}).length >= 11 &&
      Object.values(readiness ?? {}).every((value) => value === true)
  );

  const auth = root.v159Authorizes as Record<string, unknown>;
  ok(
    "fixture v15.9 authorizes section is complete",
    Object.keys(auth ?? {}).length >= 6 &&
      Object.values(auth ?? {}).every((value) => value === true)
  );

  const noAuth = root.v159DoesNotAuthorize as Record<string, unknown>;
  ok(
    "fixture v15.9 does not authorize section is complete",
    Object.keys(noAuth ?? {}).length >= 15 &&
      Object.values(noAuth ?? {}).every((value) => value === false)
  );

  const checklist = root.finalBoundaryChecklist as Record<string, unknown>;
  ok(
    "fixture final boundary checklist is complete",
    Object.keys(checklist ?? {}).length >= 10
  );

  const stops = root.finalStopConditions as Record<string, unknown>;
  ok(
    "fixture final stop conditions are complete and HOLD",
    Object.keys(stops ?? {}).length >= 15 &&
      Object.values(stops ?? {}).every((value) => value === "HOLD")
  );

  const placeholder = root.futureOwnerApprovalPhrasePlaceholder as Record<string, unknown>;
  ok(
    "fixture future owner approval placeholder is safe",
    typeof placeholder?.placeholderLineA === "string" &&
      typeof placeholder?.placeholderLineB === "string" &&
      placeholder?.placeholderOnlyNotRealApproval === true
  );

  const options = Array.isArray(root.futureAllowedNextStepOptions)
    ? (root.futureAllowedNextStepOptions as string[])
    : [];
  ok(
    "fixture safe next-step options include A-D",
    options.length >= 4 &&
      options.some((v) => v.includes("OPTION A")) &&
      options.some((v) => v.includes("OPTION B")) &&
      options.some((v) => v.includes("OPTION C")) &&
      options.some((v) => v.includes("OPTION D"))
  );

  const mapping = root.decisionMapping as Record<string, unknown>;
  ok(
    "fixture decision mapping has GO NEED_REVIEW HOLD",
    typeof mapping?.GO === "string" &&
      typeof mapping?.NEED_REVIEW === "string" &&
      typeof mapping?.HOLD === "string"
  );

  const rollback = root.rollbackKillSwitch as Record<string, unknown>;
  ok(
    "fixture rollback kill-switch section is complete",
    Object.keys(rollback ?? {}).length >= 4 &&
      Object.values(rollback ?? {}).every((value) => value === true)
  );

  const thai = root.thaiOwnerFriendlyExplanation as Record<string, unknown>;
  ok(
    "fixture has Thai owner-friendly explanation",
    typeof thai?.whatIsV159 === "string" &&
      typeof thai?.notExecutionNow === "string" &&
      typeof thai?.futureRunNeedsFreshApproval === "string" &&
      typeof thai?.whyNoPublicProductionRealLeadNow === "string" &&
      typeof thai?.v16NotStarted === "string"
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.10 CONTROLLED PRE-EXECUTION PACKET REVIEW — NO EXECUTION"
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
    "package has test:v15.9 script",
    scripts["test:v15.9"] ===
      "tsx scripts/test-v159-controlled-pre-prod-final-pre-execution-packet.mts"
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
  `\nDone v15.9 controlled pre-prod final pre-execution packet validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
