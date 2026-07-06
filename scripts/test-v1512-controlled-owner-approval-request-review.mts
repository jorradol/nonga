/**
 * v15.12 controlled owner approval request review validator
 * Static checks only. No one-run/provider/runtime/live endpoint call.
 *
 * npm run test:v15.12
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v15.12-controlled-owner-approval-request-review.md";
const FIXTURE_PATH =
  "docs/examples/v15.12-controlled-owner-approval-request-review.synthetic.json";
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

console.log("=== v15.12 Controlled Owner Approval Request Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states owner approval request review",
  /v15\.12 — Controlled Owner Approval Request Review/.test(doc)
);

ok(
  "doc confirms review-only and no real approval",
  hasEveryLine(doc, [
    "owner-approval-request-review only",
    "review-only",
    "not owner approval",
    "not execution",
    "not dry-run",
    "not deploy approval",
    "not public release approval",
    "not real lead approval",
  ])
);

ok(
  "doc confirms baseline through v15.11",
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
    "`v15.10` pre-execution packet review exists and passed",
    "`v15.11` owner approval request draft exists and passed",
  ])
);

ok(
  "doc includes review status",
  hasEveryLine(doc, [
    "v15.12 is review-only",
    "not real owner approval",
    "not execution",
    "not dry-run",
    "no one-run approval",
    "no deploy approval",
    "no public/production/real lead approval",
    "v16 not started",
  ])
);

ok(
  "doc includes v15.11 draft completeness review",
  hasEveryLine(doc, [
    "draft status coverage: complete",
    "draft purpose coverage: complete",
    "required request fields coverage: complete",
    "safe requested action types coverage: complete",
    "approval phrase placeholder safety coverage: complete",
    "one-run/retry/second-run model coverage: complete",
    "command/target clarity coverage: complete",
    "boundary assertions coverage: complete",
    "evidence requirement draft coverage: complete",
    "rollback/kill-switch coverage: complete",
    "stop conditions coverage: complete",
    "safe next-step options coverage: complete",
    "Thai owner-friendly explanation coverage: complete",
  ])
);

ok(
  "doc includes no real approval review",
  hasEveryLine(doc, [
    "not real owner approval",
    "no immediate execution authorization",
    "no immediate dry-run authorization",
    "no immediate one-run authorization",
    "no immediate deploy/public/production/real lead authorization",
    "no immediate v16 authorization",
    "must not be interpreted as real approval",
  ])
);

ok(
  "doc includes approval phrase placeholder safety review",
  hasEveryLine(doc, [
    "placeholder/example only",
    "FINAL EXECUTION AUTHORIZE ...",
    "approval_not_granted_statement",
    "after separate owner review",
    "requires fresh owner approval",
    "retry/second-run requires fresh owner approval",
  ])
);

ok(
  "doc includes safe requested action type review",
  hasEveryLine(doc, [
    "REQUEST_CONTROLLED_DRY_RUN_ONLY",
    "REQUEST_CONTROLLED_PREFLIGHT_ONLY",
    "REQUEST_CONTROLLED_EVIDENCE_CAPTURE_ONLY",
    "REQUEST_CONTROLLED_ROLLBACK_REVIEW_ONLY",
    "no requested action type may directly open production/public/real lead",
  ])
);

ok(
  "doc includes command target evidence clarity review",
  hasEveryLine(doc, [
    "no manual endpoint guess",
    "exact command/action",
    "exact target/scope",
    "expected evidence",
    "ambiguity requires HOLD",
  ])
);

ok(
  "doc includes boundary review",
  hasEveryLine(doc, [
    "no public release",
    "no production activation",
    "no production deploy",
    "no public route activation",
    "no buyer-facing public release",
    "no real lead",
    "no real PII/customer data",
    "no phone/plate/VIN",
    "no token/secret/API key exposure",
    "no uncontrolled Gemini/provider/runtime call",
    "no Thor/dealer real import",
    "no v16 real action",
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
    "requires rollback/disable path",
    "owner/operator responsibility",
    "evidence capture",
    "requires HOLD",
  ])
);

ok(
  "doc includes stop condition review",
  hasEveryLine(doc, [
    "HOLD if owner approval is missing",
    "HOLD if approval phrase is ambiguous",
    "HOLD if command/target/evidence is ambiguous",
    "HOLD if one-run/retry/second-run boundary is crossed",
    "HOLD if token/secret/PII risk is detected",
    "HOLD if public/production activation risk is detected",
    "HOLD if real lead risk is detected",
    "HOLD if uncontrolled runtime/provider/Gemini risk is detected",
    "HOLD if Thor/dealer import risk is detected",
    "HOLD if v16 boundary is crossed",
    "HOLD if rollback/kill-switch is missing",
  ])
);

ok(
  "doc includes decision mapping review",
  hasEveryLine(doc, [
    "`GO` means move to next preparation/review step only",
    "`NEED REVIEW` means draft/review incomplete with boundary intact",
    "`HOLD` means risk in approval ambiguity/execution/deploy/public/production/real lead/runtime/security/privacy/v16",
  ])
);

ok(
  "doc includes Thai owner-friendly review summary",
  hasEveryLine(doc, [
    "v15.12 คือ review ร่างคำขออนุมัติ ไม่ใช่คำอนุมัติจริง",
    "ต้อง review ให้ครบก่อน",
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
  ok("fixture version is v15.12", root.version === "v15.12");
  ok(
    "fixture baseline head matches expected",
    root.baselineHead === "e99282f235853e3f3bb7e717eb30b9900fa5bb67"
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
        "docs/v15.9-controlled-pre-prod-final-pre-execution-packet.md" &&
      root.sourceV1510PreExecutionPacketReview ===
        "docs/v15.10-controlled-pre-execution-packet-review.md" &&
      root.sourceV1511OwnerApprovalRequestDraft ===
        "docs/v15.11-controlled-owner-approval-request-draft.md"
  );

  ok(
    "fixture review boundaries are true",
    root.reviewOnly === true &&
      root.noExecution === true &&
      root.noDryRun === true &&
      root.noOneRunApproval === true &&
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

  const completeness = root.v1511DraftCompletenessReview as Record<string, unknown>;
  ok(
    "fixture v15.11 draft completeness review is complete",
    Object.keys(completeness ?? {}).length >= 13 &&
      Object.values(completeness ?? {}).every((value) => value === true)
  );

  const noReal = root.noRealApprovalReview as Record<string, unknown>;
  ok(
    "fixture no real approval review is complete",
    Object.keys(noReal ?? {}).length >= 7 &&
      Object.values(noReal ?? {}).every((value) => value === true)
  );

  const placeholder = root.approvalPhrasePlaceholderSafetyReview as Record<string, unknown>;
  ok(
    "fixture placeholder safety review is complete",
    Object.keys(placeholder ?? {}).length >= 6 &&
      Object.values(placeholder ?? {}).every((value) => value === true)
  );

  const action = root.safeRequestedActionTypeReview as Record<string, unknown>;
  ok(
    "fixture safe requested action type review is complete",
    Object.keys(action ?? {}).length >= 5 &&
      Object.values(action ?? {}).every((value) => value === true)
  );

  const clarity = root.commandTargetEvidenceClarityReview as Record<string, unknown>;
  ok(
    "fixture command target evidence clarity review is complete",
    Object.keys(clarity ?? {}).length >= 5 &&
      Object.values(clarity ?? {}).every((value) => value === true)
  );

  const boundary = root.boundaryReview as Record<string, unknown>;
  ok(
    "fixture boundary review is complete",
    Object.keys(boundary ?? {}).length >= 12 &&
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

  const stops = root.stopConditionReview as Record<string, unknown>;
  ok(
    "fixture stop condition review is complete and HOLD",
    Object.keys(stops ?? {}).length >= 11 &&
      Object.values(stops ?? {}).every((value) => value === "HOLD")
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
    typeof thai?.whatIsV1512 === "string" &&
      typeof thai?.whyReviewBeforeFutureApproval === "string" &&
      typeof thai?.placeholderNotRealApproval === "string" &&
      typeof thai?.futureRunNeedsFreshOwnerApproval === "string" &&
      typeof thai?.whatIsStillProhibited === "string" &&
      typeof thai?.v16NotStarted === "string"
  );

  ok(
    "fixture review decision is expected",
    root.reviewDecision ===
      "READY FOR v15.13 CONTROLLED PRE-EXECUTION CLOSURE CANDIDATE — NO EXECUTION"
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
    "package has test:v15.12 script",
    scripts["test:v15.12"] ===
      "tsx scripts/test-v1512-controlled-owner-approval-request-review.mts"
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
  `\nDone v15.12 controlled owner approval request review validation - ${pass} PASS, ${fail} FAIL.\n`
);
if (process.exitCode) process.exit(process.exitCode);
