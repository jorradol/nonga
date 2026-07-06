/**
 * v15.10 controlled pre-execution packet review validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.10
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.10-controlled-pre-execution-packet-review.md";
const FIXTURE_PATH =
  "docs/examples/v15.10-controlled-pre-execution-packet-review.synthetic.json";
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

console.log("=== v15.10 Controlled Pre-Execution Packet Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states pre-execution packet review",
  /v15\.10 — Controlled Pre-Execution Packet Review/.test(doc)
);

ok(
  "doc confirms review-only no execution scope",
  hasEveryLine(doc, [
    "pre-execution-packet-review only",
    "review-only and not execution",
    "not dry-run execution",
    "not owner approval",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc confirms baseline through v15.9",
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
    "`v15.9` final pre-execution packet exists and passed",
  ])
);

ok(
  "doc includes review status",
  hasEveryLine(doc, [
    "v15.10 is review-only",
    "no execution in this round",
    "no dry-run in this round",
    "no owner approval in this round",
    "no deploy approval in this round",
    "no public/production/real lead approval in this round",
    "v16 not started",
  ])
);

ok(
  "doc includes v15.9 packet completeness review",
  hasEveryLine(doc, [
    "packet status coverage: complete",
    "milestone evidence rollup coverage: complete",
    "pre-execution readiness summary coverage: complete",
    "what v15.9 authorizes coverage: complete",
    "what v15.9 does NOT authorize coverage: complete",
    "final boundary checklist coverage: complete",
    "final stop conditions coverage: complete",
    "future owner approval placeholder coverage: complete",
    "safe next-step options coverage: complete",
    "decision mapping coverage: complete",
    "rollback/kill-switch coverage: complete",
    "Thai owner-friendly explanation coverage: complete",
  ])
);

ok(
  "doc includes no execution authorization review",
  hasEveryLine(doc, [
    "no one-run authorization",
    "no dry-run authorization",
    "no live endpoint authorization",
    "no provider/Gemini/runtime authorization",
    "no deploy authorization",
    "no public route authorization",
    "no buyer-facing release authorization",
    "no real lead authorization",
    "no v16 authorization",
  ])
);

ok(
  "doc includes future owner approval placeholder safety review",
  hasEveryLine(doc, [
    "approval phrase is placeholder only",
    "FINAL EXECUTION AUTHORIZE ...",
    "placeholder/example only",
    "no real approval is granted in v15.10",
    "future execution requires fresh owner approval",
    "retry/second-run requires fresh owner approval",
  ])
);

ok(
  "doc includes pre-execution readiness review",
  hasEveryLine(doc, [
    "exact scope required",
    "exact command/action required",
    "exact target required",
    "expected evidence required",
    "one-run declaration required",
    "retry/second-run default false",
    "rollback/kill-switch path required",
    "stop conditions required",
    "token/secret/PII handling required",
    "boundary assertions required",
  ])
);

ok(
  "doc includes boundary review",
  hasEveryLine(doc, [
    "no public release",
    "no production activation",
    "no production deploy",
    "no public route activation",
    "no buyer-facing release",
    "no real lead sending",
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
    "sensitive-pattern checks expected",
  ])
);

ok(
  "doc includes runtime provider gemini review",
  hasEveryLine(doc, [
    "no live endpoint call",
    "no provider/Gemini/runtime network call",
    "no uncontrolled Gemini execution",
    "prior v13/v14 evidence only",
    "requires separate owner approval",
  ])
);

ok(
  "doc includes rollback kill-switch review",
  hasEveryLine(doc, [
    "future execution requires rollback/disable path",
    "owner/operator responsibility",
    "evidence capture",
    "requires HOLD",
  ])
);

ok(
  "doc includes decision mapping review",
  hasEveryLine(doc, [
    "`GO` means move to next preparation/review step only",
    "`NEED REVIEW` means incomplete review while boundary remains intact",
    "`HOLD` means risk in execution/deploy/public/production/real lead/runtime/security/privacy/v16",
  ])
);

ok(
  "doc includes Thai owner-friendly review summary",
  hasEveryLine(doc, [
    "v15.10 คือการ review แฟ้มก่อน execution ไม่ใช่การรันจริง",
    "review ก่อน",
    "placeholder ในเอกสารไม่ใช่ approval จริง",
    "fresh owner approval แยก",
    "ยังห้าม one-run/retry/second-run",
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
  ok("fixture version is v15.10", root.version === "v15.10");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "61b719bb6214ecf91479ba08fea07d13a442b0da"
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
        "docs/v15.8-controlled-pre-prod-approval-template-review.md" &&
      root.sourceV159FinalPreExecutionPacket ===
        "docs/v15.9-controlled-pre-prod-final-pre-execution-packet.md"
  );

  ok(
    "fixture review boundaries are true",
    root.reviewOnly === true &&
      root.noExecution === true &&
      root.noDryRun === true &&
      root.noOwnerApproval === true &&
      root.noDeployApproval === true &&
      root.noPublicProductionRealLeadApproval === true &&
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

  const completeness = root.v159PacketCompletenessReview as Record<string, unknown>;
  ok(
    "fixture v15.9 packet completeness review is complete",
    Object.keys(completeness ?? {}).length >= 12 &&
      Object.values(completeness ?? {}).every((value) => value === true)
  );

  const noAuth = root.noExecutionAuthorizationReview as Record<string, unknown>;
  ok(
    "fixture no execution authorization review is complete",
    Object.keys(noAuth ?? {}).length >= 9 &&
      Object.values(noAuth ?? {}).every((value) => value === true)
  );

  const placeholder = root.futureOwnerApprovalPlaceholderSafetyReview as Record<string, unknown>;
  ok(
    "fixture placeholder safety review is complete",
    Object.keys(placeholder ?? {}).length >= 5 &&
      Object.values(placeholder ?? {}).every((value) => value === true)
  );

  const readiness = root.preExecutionReadinessReview as Record<string, unknown>;
  ok(
    "fixture pre-execution readiness review is complete",
    Object.keys(readiness ?? {}).length >= 10 &&
      Object.values(readiness ?? {}).every((value) => value === true)
  );

  const boundary = root.boundaryReview as Record<string, unknown>;
  ok(
    "fixture boundary review is complete",
    Object.keys(boundary ?? {}).length >= 8 &&
      Object.values(boundary ?? {}).every((value) => value === true)
  );

  const security = root.securityPrivacyReview as Record<string, unknown>;
  ok(
    "fixture security privacy review is complete",
    Object.keys(security ?? {}).length >= 6 &&
      Object.values(security ?? {}).every((value) => value === true)
  );

  const runtime = root.runtimeProviderGeminiReview as Record<string, unknown>;
  ok(
    "fixture runtime provider gemini review is complete",
    Object.keys(runtime ?? {}).length >= 5 &&
      Object.values(runtime ?? {}).every((value) => value === true)
  );

  const rollback = root.rollbackKillSwitchReview as Record<string, unknown>;
  ok(
    "fixture rollback kill-switch review is complete",
    Object.keys(rollback ?? {}).length >= 4 &&
      Object.values(rollback ?? {}).every((value) => value === true)
  );

  const mapping = root.decisionMappingReview as Record<string, unknown>;
  ok(
    "fixture decision mapping review has GO NEED_REVIEW HOLD",
    typeof mapping?.GO === "string" &&
      typeof mapping?.NEED_REVIEW === "string" &&
      typeof mapping?.HOLD === "string"
  );

  const thai = root.thaiOwnerFriendlyReviewSummary as Record<string, unknown>;
  ok(
    "fixture has Thai owner-friendly review summary",
    typeof thai?.whatIsV1510 === "string" &&
      typeof thai?.whyReviewFirst === "string" &&
      typeof thai?.placeholderNotRealApproval === "string" &&
      typeof thai?.futureRunNeedsFreshOwnerApproval === "string" &&
      typeof thai?.whatIsStillProhibited === "string" &&
      typeof thai?.v16NotStarted === "string"
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.11 CONTROLLED OWNER APPROVAL REQUEST DRAFT — NO EXECUTION"
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
    "package has test:v15.10 script",
    scripts["test:v15.10"] ===
      "tsx scripts/test-v1510-controlled-pre-execution-packet-review.mts"
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
  `\nDone v15.10 controlled pre-execution packet review validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
