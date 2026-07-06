/**
 * v17.0 future execution request draft skeleton validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v17.0
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v17.0-future-execution-request-draft-skeleton.md";
const FIXTURE_PATH = "docs/examples/v17.0-future-execution-request-draft-skeleton.synthetic.json";
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

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function isSafeNegativeOrProhibitionContext(line: string): boolean {
  const normalized = line.toLowerCase();
  const safeMarkers = [
    "do not include wording that implies",
    "must not",
    "not approved",
    "is not approved",
    "is not already approved",
    "not go approved",
    "no go approval",
    "does not approve",
    "does not approve go",
    "no execution",
    "no go",
    "pilot has not started",
    "execution is not authorized",
    "execution is not already authorized",
    "not authorized for execution",
    "no execution authorization",
    "does not authorize execution",
    "approval is not granted",
    "owner approval is not granted",
    " is not ",
    " no ",
    "does not",
    "cannot",
    "not approval",
    "hold",
    "no-go"
  ];
  return safeMarkers.some((marker) => normalized.includes(marker));
}

function hasUnsafeInterpretationPhrase(
  source: string,
  pattern: RegExp,
  options?: { allowSafeNegativeContext?: boolean }
): boolean {
  const lines = source.split("\n");
  return lines.some((line) => {
    if (options?.allowSafeNegativeContext && isSafeNegativeOrProhibitionContext(line)) return false;
    return pattern.test(line);
  });
}

console.log("=== v17.0 Future Execution Request Draft Skeleton Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v17.0 correctly",
  /v17\.0 — Future Execution Request Draft Skeleton/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v17.0\"") &&
    fixtureRaw.includes("\"executionType\": \"future-execution-request-draft-skeleton only\"")
);

ok(
  "status is draft-only no-execution placeholder-only",
  hasEveryLine(doc, [
    "v17.0 = FUTURE EXECUTION REQUEST DRAFT SKELETON ONLY",
    "DRAFT ONLY / NO EXECUTION",
    "PLACEHOLDER ONLY"
  ])
);

ok(
  "doc includes required sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Draft skeleton required sections (placeholder-only)",
    "## 5) Required placeholder values",
    "## 6) What v17.0 does not approve",
    "## 7) Fresh owner approval separation",
    "## 8) One-run / no-retry / no-second-run policy",
    "## 9) Boundary carry-forward",
    "## 10) Forbidden real values rule",
    "## 11) Owner-friendly Thai summary",
    "## 12) Final draft readiness checklist",
    "## 13) Exact next owner action"
  ])
);

ok(
  "purpose requirements included",
  hasEveryLine(doc, [
    "prepare a safe owner-reviewable skeleton for a possible future execution request",
    "keep all real execution details blank and placeholder-only",
    "prevent accidental interpretation as approval or GO",
    "not a command, not a run, not an approval"
  ])
);

ok(
  "baseline includes required closed states",
  hasEveryLine(doc, [
    "v13 = CLOSED",
    "v14 = CLOSED",
    "v15 = CLOSED",
    "v16 planning = CLOSED",
    "v16.11 = CLOSED / OWNER ACKNOWLEDGMENT RECORD CLOSED",
    "v17.0 = FUTURE EXECUTION REQUEST DRAFT SKELETON ONLY / NO EXECUTION"
  ])
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
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
    "package has test:v17.0 script",
    scripts["test:v17.0"] === "tsx scripts/test-v170-future-execution-request-draft-skeleton.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

  ok("draftOnly=true", root.draftOnly === true);
  ok("placeholderOnly=true", root.placeholderOnly === true);
  ok("noExecution=true", root.noExecution === true);
  ok("noGo=true", root.noGo === true);
  ok("noOneRunApproval=true", root.noOneRunApproval === true);
  ok("noRetryApproval=true", root.noRetryApproval === true);
  ok("noSecondRunApproval=true", root.noSecondRunApproval === true);
  ok("noDeploy=true", root.noDeploy === true);
  ok("noPublicActivation=true", root.noPublicActivation === true);
  ok("noProductionActivation=true", root.noProductionActivation === true);
  ok("noBuyerFacingPublicRelease=true", root.noBuyerFacingPublicRelease === true);
  ok("noRealLead=true", root.noRealLead === true);
  ok("noRealDealerAction=true", root.noRealDealerAction === true);
  ok("noRuntimeProviderGeminiCall=true", root.noRuntimeProviderGeminiCall === true);
  ok("noLiveEndpointCall=true", root.noLiveEndpointCall === true);
  ok("noManualEndpointGuess=true", root.noManualEndpointGuess === true);
  ok("noThorImport=true", root.noThorImport === true);
  ok("noDealerImport=true", root.noDealerImport === true);
  ok("noTokenSecretExposure=true", root.noTokenSecretExposure === true);
  ok("noPII=true", root.noPII === true);

  const purpose = asRecord(root.purpose);
  ok(
    "purpose object complete and true",
    Object.keys(purpose).length >= 4 && Object.values(purpose).every((value) => value === true)
  );

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline object complete",
    baseline["v13"] === "CLOSED" &&
      baseline["v14"] === "CLOSED" &&
      baseline["v15"] === "CLOSED" &&
      baseline["v16Planning"] === "CLOSED" &&
      baseline["v16.11"] === "CLOSED / OWNER ACKNOWLEDGMENT RECORD CLOSED" &&
      baseline["v17.0"] === "FUTURE EXECUTION REQUEST DRAFT SKELETON ONLY / NO EXECUTION"
  );

  const draftSkeleton = asRecord(root.draftSkeleton);
  ok(
    "draft skeleton placeholders and declarations complete",
    draftSkeleton.futureOwnerReviewStatus === "FUTURE_OWNER_REVIEW_PLACEHOLDER_ONLY" &&
      draftSkeleton.futureOwnerApprovalStatus === "FUTURE_OWNER_APPROVAL_PLACEHOLDER_ONLY" &&
      draftSkeleton.exactCommand === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      draftSkeleton.exactTarget === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      draftSkeleton.exactExpectedEvidence === "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY" &&
      draftSkeleton.rollbackOwner === "ROLLBACK_OWNER_PLACEHOLDER_ONLY" &&
      draftSkeleton.killSwitchOwner === "KILL_SWITCH_OWNER_PLACEHOLDER_ONLY" &&
      draftSkeleton.stopConditionList === "STOP_CONDITIONS_PLACEHOLDER_ONLY" &&
      draftSkeleton.sanitizedEvidenceBundle === "SANITIZED_EVIDENCE_BUNDLE_PLACEHOLDER_ONLY" &&
      draftSkeleton.oneRunOnlyDeclaration === true &&
      draftSkeleton.noAutomaticRetryDeclaration === true &&
      draftSkeleton.noSecondRunDeclaration === true
  );

  const requiredPlaceholders = asRecord(root.requiredPlaceholderValues);
  ok(
    "required placeholder values exact",
    requiredPlaceholders.exactCommand === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      requiredPlaceholders.exactTarget === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      requiredPlaceholders.exactExpectedEvidence === "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY" &&
      requiredPlaceholders.futureOwnerReview === "FUTURE_OWNER_REVIEW_PLACEHOLDER_ONLY" &&
      requiredPlaceholders.futureOwnerApproval === "FUTURE_OWNER_APPROVAL_PLACEHOLDER_ONLY" &&
      requiredPlaceholders.rollbackOwner === "ROLLBACK_OWNER_PLACEHOLDER_ONLY" &&
      requiredPlaceholders.killSwitchOwner === "KILL_SWITCH_OWNER_PLACEHOLDER_ONLY" &&
      requiredPlaceholders.stopConditions === "STOP_CONDITIONS_PLACEHOLDER_ONLY" &&
      requiredPlaceholders.sanitizedEvidenceBundle === "SANITIZED_EVIDENCE_BUNDLE_PLACEHOLDER_ONLY"
  );

  ok(
    "what v17.0 does not approve list complete",
    Array.isArray(root.whatV170DoesNotApprove) && root.whatV170DoesNotApprove.length >= 18
  );

  const freshApproval = asRecord(root.freshOwnerApprovalSeparation);
  ok(
    "fresh owner approval separation complete and true",
    Object.keys(freshApproval).length >= 5 &&
      Object.values(freshApproval).every((value) => value === true)
  );

  const oneRunPolicy = asRecord(root.oneRunNoRetryNoSecondRunPolicy);
  ok(
    "one-run/no-retry/no-second-run policy complete and true",
    Object.keys(oneRunPolicy).length >= 5 && Object.values(oneRunPolicy).every((value) => value === true)
  );

  const carry = asRecord(root.boundaryCarryForward);
  ok(
    "boundary carry-forward complete and true",
    Object.keys(carry).length >= 7 && Object.values(carry).every((value) => value === true)
  );

  const guard = asRecord(root.forbiddenRealValuesGuard);
  ok(
    "forbidden real values guard complete and false",
    Object.keys(guard).length >= 16 && Object.values(guard).every((value) => value === false)
  );

  ok(
    "safe negative/prohibition context list includes all required items",
    Array.isArray(root.safeNegativeProhibitionContext) &&
      root.safeNegativeProhibitionContext.includes("not approved") &&
      root.safeNegativeProhibitionContext.includes("does not approve") &&
      root.safeNegativeProhibitionContext.includes("no execution") &&
      root.safeNegativeProhibitionContext.includes("no GO") &&
      root.safeNegativeProhibitionContext.includes("pilot has not started") &&
      root.safeNegativeProhibitionContext.includes("execution is not authorized") &&
      root.safeNegativeProhibitionContext.includes("approval is not granted")
  );

  ok(
    "owner-friendly thai summary includes required lines",
    Array.isArray(root.ownerFriendlyThaiSummary) &&
      root.ownerFriendlyThaiSummary.includes("v17.0 เป็นแบบร่างคำขอรันในอนาคตเท่านั้น") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่ใช่คำสั่งรัน") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่ใช่ GO") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่แตะของจริง") &&
      root.ownerFriendlyThaiSummary.includes(
        "ถ้าจะรันจริง ต้องมี approval ใหม่ แยก ชัดเจน และครบ command/target/evidence"
      )
  );

  const checklist = asRecord(root.finalDraftReadinessChecklist);
  ok(
    "final draft readiness checklist complete and true",
    Object.keys(checklist).length >= 11 && Object.values(checklist).every((value) => value === true)
  );

  ok(
    "exact next owner action is exact required statement",
    root.exactNextOwnerAction ===
      "Owner review of draft skeleton only. This is not execution approval. Real execution requires a separate future approval with exact command, target, and expected evidence."
  );

  ok(
    "final decision is draft skeleton closure only",
    root.finalDecision === "V17.0 DRAFT SKELETON CLOSED — READY FOR OWNER REVIEW ONLY / NO EXECUTION"
  );
}

ok(
  "doc has required placeholder strings",
  hasEveryLine(doc, [
    "EXACT_COMMAND_PLACEHOLDER_ONLY",
    "EXACT_TARGET_PLACEHOLDER_ONLY",
    "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY",
    "FUTURE_OWNER_REVIEW_PLACEHOLDER_ONLY",
    "FUTURE_OWNER_APPROVAL_PLACEHOLDER_ONLY",
    "ROLLBACK_OWNER_PLACEHOLDER_ONLY",
    "KILL_SWITCH_OWNER_PLACEHOLDER_ONLY",
    "STOP_CONDITIONS_PLACEHOLDER_ONLY",
    "SANITIZED_EVIDENCE_BUNDLE_PLACEHOLDER_ONLY"
  ])
);

ok(
  "doc includes what v17.0 does not approve list",
  hasEveryLine(doc, [
    "no GO",
    "no execution",
    "no one-run",
    "no automatic retry",
    "no second run",
    "no deploy",
    "no public route activation",
    "no production activation",
    "no buyer-facing public release",
    "no real lead sending",
    "no real dealer action",
    "no runtime/provider/Gemini call",
    "no live endpoint call",
    "no manual endpoint guess",
    "no Thor real import",
    "no dealer real inventory import",
    "no token/secret/PII exposure",
    "no owner approval for future execution"
  ])
);

ok(
  "doc includes fresh owner approval separation statements",
  hasEveryLine(doc, [
    "any real future execution requires a separate fresh owner review",
    "any real future execution requires a separate fresh owner approval",
    "this v17.0 draft skeleton is not that approval",
    "owner acknowledgment from v16.11 is not approval to execute",
    "no approval may be inferred from planning closure, acknowledgment, or draft skeleton"
  ])
);

ok(
  "doc includes one-run/no-retry/no-second-run policy",
  hasEveryLine(doc, [
    "any future approved execution, if ever approved, must be exactly one run",
    "no automatic retry",
    "no second run",
    "any rerun requires a separate fresh owner approval",
    "test failure or ambiguity means HOLD, not retry"
  ])
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header", /\bAuthorization\s*:\s*[^\s].+/i],
  ["firebase token phrase", /\bfirebase[_\s-]?token\s*[:=]\s*[A-Za-z0-9\-_.]{8,}/i],
  ["generic api key assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenExecutionHintPatterns: Array<[string, RegExp]> = [
  ["real shell command", /(^|\n)\s*[-*]?\s*`?(npm|pnpm|yarn|node|tsx|curl|wget|Invoke-WebRequest|iwr)\s+[^\n`]+`?/im],
  ["real url", /https?:\/\/[^\s"')]+/i],
  ["real endpoint path", /(^|\s)\/(api|v\d+|auth|dealer|lead|import|runtime)\/[A-Za-z0-9/_-]+/i],
  ["real target origin", /\borigin\/[A-Za-z0-9._/-]+/i]
];
for (const [name, re] of forbiddenExecutionHintPatterns) {
  ok(`no forbidden execution hint ${name}`, !re.test(combined));
}

const forbiddenInterpretationPatterns: Array<
  [string, RegExp, { allowSafeNegativeContext?: boolean }?]
> = [
  ["v17.0 is go", /\bv17\.0\s+.*\b(is|equals)\s+go\b/i],
  [
    "go already approved",
    /\b(?:go\s+.*(?:already\s+)?approved|go\s+is\s+approved|approved\s+for\s+go)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "pilot already started",
    /\bpilot\s+.*(already|is)\s+(started|active|running)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "execution authorized wording",
    /\b(?:execution\s+.*(?:authorized|approved|granted)|authorized\s+for\s+execution|owner\s+approved\s+execution|approval\s+granted\s+for\s+execution)\b/i,
    { allowSafeNegativeContext: true }
  ],
  ["execute approved phrase", /\bexecute[_\s-]?approved\b/i],
  ["deploy now phrase", /\bdeploy\s+now\b/i]
];
for (const [name, re, options] of forbiddenInterpretationPatterns) {
  ok(`no unsafe interpretation phrase ${name}`, !hasUnsafeInterpretationPhrase(combined, re, options));
}

ok(
  "safe negative/prohibition wording exists in doc",
  hasEveryLine(doc, [
    "does not approve",
    "no execution",
    "no GO",
    "not approval"
  ])
);

console.log(`\nDone v17.0 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
