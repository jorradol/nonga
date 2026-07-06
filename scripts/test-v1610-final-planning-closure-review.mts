/**
 * v16.10 final planning closure review validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.10
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.10-final-planning-closure-review.md";
const FIXTURE_PATH = "docs/examples/v16.10-final-planning-closure-review.synthetic.json";
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
    " is not ",
    " no ",
    "does not",
    "cannot",
    "not execution",
    "not approval",
    "not go",
    "has not",
    "not started",
    "non-authorizing",
    "non-executable",
    "hold",
    "no-go",
    "what v16.10 does not approve"
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

console.log("=== v16.10 Final Planning Closure Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.10 correctly",
  /v16\.10 — Final Planning Closure Review/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.10\"") &&
    fixtureRaw.includes("\"executionType\": \"final-planning-closure-review only\"")
);

ok(
  "planning-only and final-closure-only phrases are explicit",
  hasEveryLine(doc, [
    "FINAL PLANNING CLOSURE REVIEW ONLY",
    "PLANNING ONLY / NO EXECUTION",
    "not GO, not owner approval, and not execution approval"
  ])
);

ok(
  "doc includes required v16.10 sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Final planning artifact inventory",
    "## 5) Closure scope",
    "## 6) What v16.10 does not approve",
    "## 7) Owner-friendly final summary (Thai)",
    "## 8) Final planning closure decision options",
    "## 9) Future step separation",
    "## 10) Placeholder-only rule",
    "## 11) Boundary carry-forward",
    "## 12) Final closure checklist",
    "## 13) Exact next owner action"
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
    "package has test:v16.10 script",
    scripts["test:v16.10"] === "tsx scripts/test-v1610-final-planning-closure-review.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("planningOnly=true", root.planningOnly === true);
  ok("finalPlanningClosureReviewOnly=true", root.finalPlanningClosureReviewOnly === true);
  ok("noGo=true", root.noGo === true);
  ok("noExecution=true", root.noExecution === true);
  ok("noDryRun=true", root.noDryRun === true);
  ok("noOneRun=true", root.noOneRun === true);
  ok("noRetry=true", root.noRetry === true);
  ok("noSecondRun=true", root.noSecondRun === true);
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
  ok("noPII=true", root.noPII === true);
  ok("noTokenSecretExposure=true", root.noTokenSecretExposure === true);

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "baseline complete through v16.9A and v16.10 closure-only",
    baseline["v13"] === "CLOSED" &&
      baseline["v14"] === "CLOSED" &&
      baseline["v15"] === "CLOSED" &&
      baseline["v16.0"] === "PASSED" &&
      baseline["v16.1"] === "PASSED" &&
      baseline["v16.2"] === "PASSED" &&
      baseline["v16.3"] === "PASSED via v16.3A HOLD FIX" &&
      baseline["v16.4"] === "PASSED" &&
      baseline["v16.5"] === "PASSED" &&
      baseline["v16.6"] === "PASSED" &&
      baseline["v16.7"] === "PASSED via v16.7B HOLD FIX" &&
      baseline["v16.8"] === "PASSED via v16.8A HOLD FIX" &&
      baseline["v16.9"] === "PASSED via v16.9A HOLD FIX" &&
      baseline["v16.10"] === "FINAL PLANNING CLOSURE REVIEW ONLY / NO EXECUTION"
  );

  ok(
    "final planning artifact inventory complete",
    Array.isArray(root.finalPlanningArtifactInventory) && root.finalPlanningArtifactInventory.length >= 10
  );

  const closureScope = asRecord(root.closureScope);
  ok(
    "closure scope complete and true",
    Object.keys(closureScope).length >= 6 &&
      Object.values(closureScope).every((value) => value === true)
  );

  ok(
    "what v16.10 does not approve list complete",
    Array.isArray(root.whatV1610DoesNotApprove) && root.whatV1610DoesNotApprove.length >= 18
  );

  ok(
    "final planning closure decision options include all 4",
    Array.isArray(root.finalPlanningClosureDecisionOptions) &&
      root.finalPlanningClosureDecisionOptions.includes(
        "CLOSE V16 PLANNING — READY FOR OWNER ACKNOWLEDGMENT ONLY"
      ) &&
      root.finalPlanningClosureDecisionOptions.includes(
        "HOLD V16 PLANNING — OWNER REVIEW NEEDED"
      ) &&
      root.finalPlanningClosureDecisionOptions.includes(
        "REVISE V16 PLANNING — FIX DOCS/TESTS/FIXTURES ONLY"
      ) &&
      root.finalPlanningClosureDecisionOptions.includes(
        "STOP BEFORE FUTURE EXECUTION REQUEST — NO-GO PLANNING OUTCOME"
      )
  );

  const futureStepSeparation = asRecord(root.futureStepSeparation);
  ok(
    "future step separation complete",
    Object.keys(futureStepSeparation).length >= 17 &&
      futureStepSeparation.requiresSeparateFutureTask === true &&
      futureStepSeparation.requiresFreshOwnerReview === true &&
      futureStepSeparation.requiresFreshOwnerApproval === true &&
      futureStepSeparation.requiresExactCommand === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      futureStepSeparation.requiresExactTarget === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      futureStepSeparation.requiresExactExpectedEvidence ===
        "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY"
  );

  const placeholderOnlyRule = asRecord(root.placeholderOnlyRule);
  ok(
    "placeholder-only rule complete",
    placeholderOnlyRule.exactCommandPlaceholder === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      placeholderOnlyRule.exactTargetPlaceholder === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      placeholderOnlyRule.exactExpectedEvidencePlaceholder ===
        "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY" &&
      placeholderOnlyRule.containsRealCommandOrTargetOrEndpointOrEvidence === false
  );

  const boundaryCarryForward = asRecord(root.boundaryCarryForward);
  ok(
    "boundary carry-forward complete and true",
    Object.keys(boundaryCarryForward).length >= 8 &&
      Object.values(boundaryCarryForward).every((value) => value === true)
  );

  const finalClosureChecklist = asRecord(root.finalClosureChecklist);
  ok(
    "final closure checklist complete and true",
    Object.keys(finalClosureChecklist).length >= 9 &&
      Object.values(finalClosureChecklist).every((value) => value === true)
  );

  const stopConditions = asRecord(root.stopConditions);
  ok(
    "stop conditions complete and HOLD",
    Object.keys(stopConditions).length >= 8 &&
      Object.values(stopConditions).every((value) => value === "HOLD")
  );

  ok(
    "next step recommendation exact owner acknowledgment statement",
    root.nextStepRecommendation ===
      "Owner acknowledgment only: review v16 planning closure. This is not execution approval."
  );

  ok(
    "final decision is closure acknowledgment only no execution",
    root.finalDecision ===
      "CLOSE V16 PLANNING — READY FOR OWNER ACKNOWLEDGMENT ONLY / NO EXECUTION"
  );
}

ok(
  "doc confirms artifact inventory and closure scope",
  hasEveryLine(doc, [
    "v16.0 pilot planning packet",
    "v16.1 planning review",
    "v16.2 limited pilot scope design",
    "v16.3A scope review hold fix",
    "v16.4 readiness checklist",
    "v16.5 owner decision packet",
    "v16.6 pre-execution clarification packet",
    "v16.7B future owner approval template hold fix",
    "v16.8A pre-GO boundary review hold fix",
    "v16.9A GO/NO-GO decision frame hold fix",
    "no real pilot has started",
    "no real dealer activated",
    "no real lead path activated"
  ])
);

ok(
  "doc confirms what v16.10 does not approve",
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
  "doc confirms decision options future separation placeholder boundaries",
  hasEveryLine(doc, [
    "CLOSE V16 PLANNING — READY FOR OWNER ACKNOWLEDGMENT ONLY",
    "HOLD V16 PLANNING — OWNER REVIEW NEEDED",
    "REVISE V16 PLANNING — FIX DOCS/TESTS/FIXTURES ONLY",
    "STOP BEFORE FUTURE EXECUTION REQUEST — NO-GO PLANNING OUTCOME",
    "none of these options authorize GO or execution",
    "fresh owner review",
    "fresh owner approval",
    "EXACT_COMMAND_PLACEHOLDER_ONLY",
    "EXACT_TARGET_PLACEHOLDER_ONLY",
    "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY"
  ])
);

ok(
  "doc confirms checklist and exact next owner action",
  hasEveryLine(doc, [
    "repo/head/origin clean and synchronized",
    "tests pass",
    "doc/fixture/validator align",
    "no GO wording ambiguity",
    "no approval wording ambiguity",
    "no endpoint/command/evidence real values",
    "no real pilot started",
    "Owner acknowledgment only: review v16 planning closure. This is not execution approval."
  ])
);

ok(
  "doc contains Thai summary and required phrase",
  hasEveryLine(doc, [
    "Owner-friendly final summary (Thai)",
    "วางกรอบ v16 ก่อน ยังไม่แตะของจริง"
  ])
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["generic api key assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

const forbiddenInterpretationPatterns: Array<
  [string, RegExp, { allowSafeNegativeContext?: boolean }?]
> = [
  ["v16.10 is go", /\bv16\.10\s+.*\b(is|equals)\s+go\b/i],
  ["owner approved execution", /\bowner\s+.*(approved|authoriz(ed|ation)).*execution\b/i],
  [
    "one-run approved",
    /\bone[-\s]?run\s+.*(approved|authorized|enabled)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "pilot already started",
    /\b(v16|pilot)\s+.*(started|active|running)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "unlocks deploy/public/prod/real lead/real dealer",
    /\b(v16\.10|option|closure)\s+.*(unlocks|enables)\s+.*(deploy|public|production|real lead|real dealer)\b/i,
    { allowSafeNegativeContext: true }
  ],
  ["execute approved phrase", /\bexecute[_\s-]?approved\b/i],
  ["deploy now phrase", /\bdeploy\s+now\b/i]
];
for (const [name, re, options] of forbiddenInterpretationPatterns) {
  ok(`no unsafe interpretation phrase ${name}`, !hasUnsafeInterpretationPhrase(combined, re, options));
}

const forbiddenEndpointOrCommandPatterns: Array<[string, RegExp]> = [
  ["curl command", /\bcurl\s+https?:\/\//i],
  ["wget command", /\bwget\s+https?:\/\//i],
  ["powershell web request command", /\b(iwr|Invoke-WebRequest)\b/i],
  ["http endpoint sample", /https?:\/\/[^\s"']+/i],
  ["generic host style endpoint", /\b[A-Za-z0-9-]+\.[A-Za-z]{2,}\/[A-Za-z0-9/_-]+/]
];
for (const [name, re] of forbiddenEndpointOrCommandPatterns) {
  ok(`no command/endpoint hint ${name}`, !re.test(combined));
}

const forbiddenManualEndpointGuessApprovalPatterns: Array<[string, RegExp]> = [
  [
    "manual endpoint guess allowed/permitted",
    /\bmanual\s+endpoint\s+guess(?:ing)?\s+(?:is\s+)?(?:allowed|permitted)\b/i
  ],
  [
    "allow/permit manual endpoint guess",
    /\b(?:allow|allows|allowed|permit|permits|permitted)\s+(?:a\s+)?manual\s+endpoint\s+guess(?:ing)?\b/i
  ]
];
for (const [name, re] of forbiddenManualEndpointGuessApprovalPatterns) {
  ok(`no manual-endpoint-guess approval phrase ${name}`, !re.test(combined));
}

console.log(`\nDone v16.10 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
