/**
 * v17.1 owner review packet for future execution request validator
 * Static checks only. Review-only and placeholder-only.
 *
 * npm run test:v17.1
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v17.1-owner-review-packet-future-execution-request.md";
const FIXTURE_PATH = "docs/examples/v17.1-owner-review-packet-future-execution-request.synthetic.json";
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
    "does not approve",
    "no execution",
    "no go",
    "pilot has not started",
    "execution is not authorized",
    "approval is not granted",
    "owner review is not approval",
    "review does not authorize execution",
    " is not ",
    " no ",
    "does not",
    "cannot",
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

console.log("=== v17.1 Owner Review Packet For Future Execution Request Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v17.1 correctly",
  /v17\.1 — Owner Review Packet For Future Execution Request/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v17.1\"") &&
    fixtureRaw.includes("\"executionType\": \"owner-review-packet-future-execution-request only\"")
);

ok(
  "status is review-only no-execution placeholder-only",
  hasEveryLine(doc, [
    "v17.1 = OWNER REVIEW PACKET ONLY",
    "REVIEW ONLY / NO EXECUTION",
    "PLACEHOLDER ONLY"
  ])
);

ok(
  "doc includes required sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Owner review checklist",
    "## 5) Future readiness review categories",
    "## 6) What v17.1 does not approve",
    "## 7) Fresh owner approval separation",
    "## 8) Placeholder-only rule",
    "## 9) Forbidden real values rule",
    "## 10) Safe negative/prohibition context",
    "## 11) Boundary carry-forward",
    "## 12) Owner-friendly Thai summary",
    "## 13) Review outcome options",
    "## 14) Exact next owner action"
  ])
);

ok(
  "purpose requirements included",
  hasEveryLine(doc, [
    "help owner review the v17.0 draft skeleton safely",
    "summarize what must be checked before any possible future execution request",
    "prevent owner acknowledgment/review from being interpreted as approval",
    "not a command, not a run, not a GO, not an approval"
  ])
);

ok(
  "baseline includes required closed states",
  hasEveryLine(doc, [
    "v13 = CLOSED",
    "v14 = CLOSED",
    "v15 = CLOSED",
    "v16 planning = CLOSED",
    "v16.11 owner acknowledgment record = CLOSED",
    "v17.0 draft skeleton = CLOSED",
    "v17.1 = OWNER REVIEW PACKET ONLY / NO EXECUTION"
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
    "package has test:v17.1 script",
    scripts["test:v17.1"] === "tsx scripts/test-v171-owner-review-packet-future-execution-request.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

  ok("reviewOnly=true", root.reviewOnly === true);
  ok("draftOnly=true", root.draftOnly === true);
  ok("placeholderOnly=true", root.placeholderOnly === true);
  ok("noExecution=true", root.noExecution === true);
  ok("noGo=true", root.noGo === true);
  ok("noOwnerApproval=true", root.noOwnerApproval === true);
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
      baseline["v17.0"] === "DRAFT SKELETON CLOSED" &&
      baseline["v17.1"] === "OWNER REVIEW PACKET ONLY / NO EXECUTION"
  );

  ok(
    "owner review checklist includes all required items",
    Array.isArray(root.ownerReviewChecklist) &&
      root.ownerReviewChecklist.includes("Do I understand this is review only?") &&
      root.ownerReviewChecklist.includes("Do I understand this is not GO?") &&
      root.ownerReviewChecklist.includes("Do I understand this is not execution approval?") &&
      root.ownerReviewChecklist.includes("Do I understand this does not authorize one-run?") &&
      root.ownerReviewChecklist.includes("Do I understand no real command is included?") &&
      root.ownerReviewChecklist.includes("Do I understand no real target is included?") &&
      root.ownerReviewChecklist.includes("Do I understand no real endpoint/URL is included?") &&
      root.ownerReviewChecklist.includes("Do I understand no real expected evidence is included?") &&
      root.ownerReviewChecklist.includes("Do I understand no token/secret/PII should be shared?") &&
      root.ownerReviewChecklist.includes(
        "Do I understand real execution would require a separate future approval?"
      )
  );

  ok(
    "future readiness review categories include all required items",
    Array.isArray(root.futureReadinessReviewCategories) &&
      root.futureReadinessReviewCategories.includes("repo/head/origin readiness") &&
      root.futureReadinessReviewCategories.includes("working tree readiness") &&
      root.futureReadinessReviewCategories.includes("tests readiness") &&
      root.futureReadinessReviewCategories.includes("exact command readiness") &&
      root.futureReadinessReviewCategories.includes("exact target readiness") &&
      root.futureReadinessReviewCategories.includes("exact expected evidence readiness") &&
      root.futureReadinessReviewCategories.includes("one-run-only readiness") &&
      root.futureReadinessReviewCategories.includes("no-retry readiness") &&
      root.futureReadinessReviewCategories.includes("no-second-run readiness") &&
      root.futureReadinessReviewCategories.includes("rollback / kill-switch readiness") &&
      root.futureReadinessReviewCategories.includes("stop condition readiness") &&
      root.futureReadinessReviewCategories.includes("sanitized evidence readiness") &&
      root.futureReadinessReviewCategories.includes("token/secret/PII safety readiness") &&
      root.futureReadinessReviewCategories.includes("public/prod/real lead ambiguity readiness") &&
      root.futureReadinessReviewCategories.includes("runtime/provider/Gemini ambiguity readiness") &&
      root.futureReadinessReviewCategories.includes("real dealer/import ambiguity readiness")
  );

  ok(
    "what v17.1 does not approve list complete",
    Array.isArray(root.whatV171DoesNotApprove) && root.whatV171DoesNotApprove.length >= 18
  );

  const freshApproval = asRecord(root.freshOwnerApprovalSeparation);
  ok(
    "fresh owner approval separation complete and true",
    Object.keys(freshApproval).length >= 6 &&
      Object.values(freshApproval).every((value) => value === true)
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

  const guard = asRecord(root.forbiddenRealValuesGuard);
  ok(
    "forbidden real values guard complete and false",
    Object.keys(guard).length >= 17 && Object.values(guard).every((value) => value === false)
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
      root.safeNegativeProhibitionContext.includes("approval is not granted") &&
      root.safeNegativeProhibitionContext.includes("owner review is not approval") &&
      root.safeNegativeProhibitionContext.includes("review does not authorize execution")
  );

  const carry = asRecord(root.boundaryCarryForward);
  ok(
    "boundary carry-forward complete and true",
    Object.keys(carry).length >= 8 && Object.values(carry).every((value) => value === true)
  );

  ok(
    "owner-friendly thai summary includes required lines",
    Array.isArray(root.ownerFriendlyThaiSummary) &&
      root.ownerFriendlyThaiSummary.includes("v17.1 เป็นชุดตรวจให้ลุงเด่นอ่านก่อนตัดสินใจในอนาคต") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่ใช่คำสั่งรัน") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่ใช่ GO") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่ใช่ approval") &&
      root.ownerFriendlyThaiSummary.includes("ยังไม่แตะของจริง") &&
      root.ownerFriendlyThaiSummary.includes(
        "ถ้าจะรันจริง ต้องมี approval ใหม่ แยก ชัดเจน และครบ command/target/evidence"
      )
  );

  ok(
    "review outcome options complete and review-only",
    Array.isArray(root.reviewOutcomeOptions) &&
      root.reviewOutcomeOptions.includes(
        "OWNER REVIEW COMPLETE — READY TO CONSIDER FUTURE REAL-VALUE REQUEST DRAFT ONLY"
      ) &&
      root.reviewOutcomeOptions.includes("HOLD OWNER REVIEW — CLARIFICATION NEEDED") &&
      root.reviewOutcomeOptions.includes("REVISE REVIEW PACKET — DOCS/TESTS/FIXTURES ONLY") &&
      root.reviewOutcomeOptions.includes(
        "STOP BEFORE FUTURE REAL-VALUE REQUEST — NO-GO REVIEW OUTCOME"
      ) &&
      root.reviewOutcomeOptionsDoNotAuthorizeExecutionOrGo === true
  );

  ok(
    "exact next owner action is exact required statement",
    root.exactNextOwnerAction ===
      "Owner review only. This is not execution approval. If owner wants to proceed later, create a separate future real-value request draft with exact command, target, and expected evidence."
  );

  ok(
    "final decision is owner review closure only",
    root.finalDecision ===
      "V17.1 OWNER REVIEW PACKET CLOSED — READY TO CONSIDER FUTURE REAL-VALUE REQUEST DRAFT ONLY / NO EXECUTION"
  );
}

ok(
  "doc includes owner review checklist required items",
  hasEveryLine(doc, [
    "Do I understand this is review only?",
    "Do I understand this is not GO?",
    "Do I understand this is not execution approval?",
    "Do I understand this does not authorize one-run?",
    "Do I understand no real command is included?",
    "Do I understand no real target is included?",
    "Do I understand no real endpoint/URL is included?",
    "Do I understand no real expected evidence is included?",
    "Do I understand no token/secret/PII should be shared?",
    "Do I understand real execution would require a separate future approval?"
  ])
);

ok(
  "doc includes future readiness review categories required items",
  hasEveryLine(doc, [
    "repo/head/origin readiness",
    "working tree readiness",
    "tests readiness",
    "exact command readiness",
    "exact target readiness",
    "exact expected evidence readiness",
    "one-run-only readiness",
    "no-retry readiness",
    "no-second-run readiness",
    "rollback / kill-switch readiness",
    "stop condition readiness",
    "sanitized evidence readiness",
    "token/secret/PII safety readiness",
    "public/prod/real lead ambiguity readiness",
    "runtime/provider/Gemini ambiguity readiness",
    "real dealer/import ambiguity readiness"
  ])
);

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
  "doc includes what v17.1 does not approve list",
  hasEveryLine(doc, [
    "GO",
    "execution",
    "one-run",
    "automatic retry",
    "second run",
    "deploy",
    "public route activation",
    "production activation",
    "buyer-facing public release",
    "real lead sending",
    "real dealer action",
    "runtime/provider/Gemini call",
    "live endpoint call",
    "manual endpoint guess",
    "Thor real import",
    "dealer real inventory import",
    "token/secret/PII exposure",
    "owner approval for future execution"
  ])
);

ok(
  "doc includes fresh owner approval separation statements",
  hasEveryLine(doc, [
    "owner review is not owner approval",
    "owner acknowledgment is not owner approval",
    "v17.0 draft skeleton is not owner approval",
    "v17.1 owner review packet is not owner approval",
    "any future real execution requires a separate fresh owner approval",
    "no approval may be inferred from review, planning closure, acknowledgment, or draft skeleton"
  ])
);

ok(
  "doc includes review outcome options and no execution authorization statement",
  hasEveryLine(doc, [
    "OWNER REVIEW COMPLETE — READY TO CONSIDER FUTURE REAL-VALUE REQUEST DRAFT ONLY",
    "HOLD OWNER REVIEW — CLARIFICATION NEEDED",
    "REVISE REVIEW PACKET — DOCS/TESTS/FIXTURES ONLY",
    "STOP BEFORE FUTURE REAL-VALUE REQUEST — NO-GO REVIEW OUTCOME",
    "none of these options authorize execution or GO"
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
  [
    "owner review equals approval wording",
    /\b(?:owner\s+review\s+.*(?:is|equals)\s+approval|review\s+approved|review\s+is\s+approval)\b/i,
    { allowSafeNegativeContext: true }
  ]
];
for (const [name, re, options] of forbiddenInterpretationPatterns) {
  ok(`no unsafe interpretation phrase ${name}`, !hasUnsafeInterpretationPhrase(combined, re, options));
}

ok(
  "safe negative/prohibition wording exists in doc",
  hasEveryLine(doc, [
    "not approved",
    "does not approve",
    "no execution",
    "no GO",
    "execution is not authorized",
    "approval is not granted",
    "owner review is not approval",
    "review does not authorize execution"
  ])
);

console.log(`\nDone v17.1 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
