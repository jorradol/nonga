/**
 * v15.8 controlled pre-prod approval template review validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.8
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.8-controlled-pre-prod-approval-template-review.md";
const FIXTURE_PATH =
  "docs/examples/v15.8-controlled-pre-prod-approval-template-review.synthetic.json";
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

console.log("=== v15.8 Controlled Pre-Prod Approval Template Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states approval template review",
  /v15\.8 — Controlled Pre-Prod Approval Template Review/.test(doc)
);

ok(
  "doc confirms review-only and no execution scope",
  hasEveryLine(doc, [
    "approval-template-review only",
    "review-only and is not dry-run execution",
    "not execution approval",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc confirms baseline through v15.7",
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
  ])
);

ok(
  "doc includes review status",
  hasEveryLine(doc, [
    "v15.8 is review-only",
    "no execution approval in this round",
    "no dry-run approval in this round",
    "no deploy approval in this round",
    "no public/production/real lead approval in this round",
    "v16 not started",
  ])
);

ok(
  "doc includes v15.7 template completeness review",
  hasEveryLine(doc, [
    "template status coverage: complete",
    "required owner approval fields coverage: complete",
    "allowed approval types coverage: complete",
    "explicit disallowed approvals coverage: complete",
    "one-run/retry/second-run rule coverage: complete",
    "command/target clarity requirement coverage: complete",
    "evidence requirement coverage: complete",
    "boundary assertions coverage: complete",
    "rollback/kill-switch requirement coverage: complete",
    "stop conditions coverage: complete",
    "Thai owner-friendly explanation coverage: complete",
  ])
);

ok(
  "doc includes approval separation review",
  hasEveryLine(doc, [
    "production deploy approval is separate",
    "production activation approval is separate",
    "public route activation approval is separate",
    "buyer-facing release approval is separate",
    "real lead approval is separate",
    "dry-run execution approval is separate",
    "retry/second-run requires fresh owner approval",
  ])
);

ok(
  "doc includes no implicit authorization review",
  hasEveryLine(doc, [
    "no implicit execution approval",
    "no implicit deploy approval",
    "no implicit public route approval",
    "no implicit buyer-facing release approval",
    "no implicit real lead approval",
    "no implicit v16 approval",
  ])
);

ok(
  "doc includes command target ambiguity review",
  hasEveryLine(doc, [
    "manual endpoint guess is prohibited",
    "future approval must include exact command/action",
    "future approval must include exact target/scope",
    "future approval must include expected evidence",
    "decision must be HOLD",
  ])
);

ok(
  "doc includes security privacy review",
  hasEveryLine(doc, [
    "no token/secret/API key exposure",
    "no real PII/customer data",
    "no phone/plate/VIN",
    "masked-only expectation",
    "synthetic-only artifacts",
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
    "separate owner approval",
  ])
);

ok(
  "doc includes boundary v16 review",
  hasEveryLine(doc, [
    "no production deploy/activation",
    "no public route activation",
    "no buyer-facing release",
    "no real lead sending",
    "no Thor/dealer real import",
    "no v16 real dealer/real lead action",
    "v16 not started",
  ])
);

ok(
  "doc includes rollback kill-switch review",
  hasEveryLine(doc, [
    "future execution must define rollback/disable path",
    "owner/operator responsibility must be explicit",
    "evidence capture must be explicit",
    "requires HOLD",
  ])
);

ok(
  "doc includes decision mapping review",
  hasEveryLine(doc, [
    "`GO` means ready for next preparation step only",
    "`NEED REVIEW` means template/review incomplete but boundary intact",
    "`HOLD` means risk found in execution/deploy/public/production/real lead/runtime/security/privacy/v16",
  ])
);

ok(
  "doc includes Thai owner-friendly review summary",
  hasEveryLine(doc, [
    "v15.8 คือการ review template ไม่ใช่อนุมัติให้รันจริง",
    "ช่วยป้องกันการเปิด execution/deploy/public/real lead",
    "ต้องมี owner approval แยก",
    "ยังห้าม one-run/retry/second-run",
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
  ok("fixture version is v15.8", root.version === "v15.8");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "9557988cf8b8d46f0624b51e64c33997e5961936"
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
        "docs/v15.5-controlled-pre-prod-dry-run-packet-design.md" &&
      root.sourceV156DryRunReview ===
        "docs/v15.6-controlled-pre-prod-dry-run-packet-review.md" &&
      root.sourceV157OwnerApprovalTemplate ===
        "docs/v15.7-controlled-pre-prod-owner-approval-template.md"
  );

  ok(
    "fixture review boundaries are true",
    root.reviewOnly === true &&
      root.noExecution === true &&
      root.noDryRunApproval === true &&
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

  const completeness = root.v157TemplateCompletenessReview as Record<string, unknown>;
  ok(
    "fixture v15.7 template completeness review is complete",
    Object.keys(completeness ?? {}).length >= 11 &&
      Object.values(completeness ?? {}).every((value) => value === true)
  );

  const separation = root.approvalSeparationReview as Record<string, unknown>;
  ok(
    "fixture approval separation review is complete",
    Object.keys(separation ?? {}).length >= 7 &&
      Object.values(separation ?? {}).every((value) => value === true)
  );

  const noImplicit = root.noImplicitAuthorizationReview as Record<string, unknown>;
  ok(
    "fixture no implicit authorization review is complete",
    Object.keys(noImplicit ?? {}).length >= 6 &&
      Object.values(noImplicit ?? {}).every((value) => value === true)
  );

  const ambiguity = root.commandTargetAmbiguityReview as Record<string, unknown>;
  ok(
    "fixture command target ambiguity review is complete",
    Object.keys(ambiguity ?? {}).length >= 5 &&
      Object.values(ambiguity ?? {}).every((value) => value === true)
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

  const boundary = root.boundaryV16Review as Record<string, unknown>;
  ok(
    "fixture boundary v16 review is complete",
    Object.keys(boundary ?? {}).length >= 7 &&
      Object.values(boundary ?? {}).every((value) => value === true)
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
    typeof thai?.whatIsV158 === "string" &&
      typeof thai?.whatTemplatePrevents === "string" &&
      typeof thai?.futureRealRunNeeds === "string" &&
      typeof thai?.whatIsStillProhibited === "string"
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.9 CONTROLLED PRE-PROD FINAL PRE-EXECUTION PACKET — NO EXECUTION"
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
    "package has test:v15.8 script",
    scripts["test:v15.8"] ===
      "tsx scripts/test-v158-controlled-pre-prod-approval-template-review.mts"
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
  `\nDone v15.8 controlled pre-prod approval template review validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
