/**
 * v16.7 future owner approval template validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.7
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.7-future-owner-approval-template.md";
const FIXTURE_PATH = "docs/examples/v16.7-future-owner-approval-template.synthetic.json";
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

function isSafeNegativeOrInvalidContext(line: string): boolean {
  const normalized = line.toLowerCase();
  const safeMarkers = [
    "invalid example",
    "invalid examples",
    "is not an approval",
    "is not approval",
    "not real approval",
    "cannot be used as a real approval",
    "non-executable and non-authorizing",
    "non-authorizing",
    "does not approve",
    "does not unlock",
    "do not treat this template as approval",
    "what this template does not approve"
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
    if (options?.allowSafeNegativeContext && isSafeNegativeOrInvalidContext(line)) return false;
    return pattern.test(line);
  });
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

console.log("=== v16.7 Future Owner Approval Template Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.7 correctly",
  /v16\.7 — Future Owner Approval Template/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.7\"") &&
    fixtureRaw.includes("\"executionType\": \"future-owner-approval-template only\"")
);

ok(
  "planning-only and approval-template-only phrases are explicit",
  hasEveryLine(doc, [
    "PLANNING ONLY / NO EXECUTION",
    "v16.7 is approval-template-only and planning-only",
    "v16.7A is HOLD FIX / PLANNING ONLY / NO EXECUTION",
    "v16.7 is not owner approval, not execution approval, and not one-run approval",
    "v16.7 template is not an approval artifact"
  ])
);

ok(
  "doc includes required v16.7 sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Template scope",
    "## 5) What this template does not approve",
    "## 6) Approval separation statement",
    "## 7) Required owner approval wording rules",
    "## 8) Required exact action type field",
    "## 9) Required exact command field placeholder",
    "## 10) Required exact target field placeholder",
    "## 11) Required exact evidence field placeholder",
    "## 12) Required versioned packet reference field",
    "## 13) Required rollback / kill-switch confirmation field",
    "## 14) Required stop condition confirmation field",
    "## 15) Required one-run / no-retry / no-second-run confirmation field",
    "## 16) Required public / production / real lead boundary confirmation field",
    "## 17) Required runtime / provider / Gemini boundary confirmation field",
    "## 18) Required security / privacy / PII / token confirmation field",
    "## 19) Required Thor / dealer import boundary confirmation field",
    "## 20) Required sanitized evidence review field",
    "## 21) Required operator accountability field",
    "## 22) Required owner final decision field",
    "## 23) Invalid approval examples",
    "## 24) Valid placeholder-only approval template",
    "## 25) Thai owner-friendly summary",
    "## 26) Exact next step recommendation"
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
    "package has test:v16.7 script",
    scripts["test:v16.7"] === "tsx scripts/test-v167-future-owner-approval-template.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

  ok("planningOnly=true", root.planningOnly === true);
  ok("approvalTemplateOnly=true", root.approvalTemplateOnly === true);
  ok(
    "v16.7A status is HOLD FIX / PLANNING ONLY / NO EXECUTION",
    root.v167aStatus === "HOLD FIX / PLANNING ONLY / NO EXECUTION"
  );
  ok("noExecution=true", root.noExecution === true);
  ok("noDryRun=true", root.noDryRun === true);
  ok("noOneRun=true", root.noOneRun === true);
  ok("noRetry=true", root.noRetry === true);
  ok("noSecondRun=true", root.noSecondRun === true);
  ok("noPublicActivation=true", root.noPublicActivation === true);
  ok("noProductionActivation=true", root.noProductionActivation === true);
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
    "baseline complete through v16.7 planning-only template",
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
      baseline["v16.7"] === "PLANNING ONLY / FUTURE OWNER APPROVAL TEMPLATE ONLY"
  );

  const templateScope = asRecord(root.templateScope);
  ok(
    "template scope summary complete",
    templateScope.purpose === "future owner approval request form structure only" &&
      templateScope.containsExecutableContent === false &&
      templateScope.placeholderOnly === true
  );

  ok(
    "what this template does not approve is complete",
    Array.isArray(root.whatThisTemplateDoesNotApprove) &&
      root.whatThisTemplateDoesNotApprove.length >= 12
  );

  const separation = asRecord(root.approvalSeparationStatement);
  ok(
    "approval separation statement complete",
    separation.planningPacketIsNotApproval === true &&
      separation.approvalTemplateIsNotApproval === true &&
      separation.futureExecutionNeedsFreshOwnerReview === true &&
      separation.futureExecutionNeedsFreshOwnerApproval === true
  );
  const separationExactPhrases = Array.isArray(separation.exactPhrases)
    ? (separation.exactPhrases as string[])
    : [];
  ok(
    "approval separation exact phrases are explicit",
    separationExactPhrases.includes("This template is not an approval.") &&
      separationExactPhrases.includes(
        "This template cannot be used as a real approval in v16.7."
      ) &&
      separationExactPhrases.includes(
        "Any future execution requires a separate fresh owner review and separate fresh owner approval."
      ) &&
      separationExactPhrases.includes(
        "The placeholder-only template is non-executable and non-authorizing."
      )
  );

  ok(
    "required owner approval fields complete",
    Array.isArray(root.requiredOwnerApprovalFields) &&
      root.requiredOwnerApprovalFields.length >= 10
  );

  const placeholders = asRecord(root.requiredPlaceholderFields);
  ok(
    "required placeholders are complete",
    placeholders.exactActionType === "EXACT_ACTION_TYPE_PLACEHOLDER_ONLY" &&
      placeholders.exactCommand === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      placeholders.exactTarget === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      placeholders.exactEvidence === "EXACT_EVIDENCE_PLACEHOLDER_ONLY" &&
      placeholders.versionedPacketReference === "VERSIONED_PACKET_REFERENCE_PLACEHOLDER_ONLY" &&
      placeholders.ownerFinalDecision === "OWNER_FINAL_DECISION_PLACEHOLDER_ONLY"
  );

  ok(
    "invalid approval examples complete",
    Array.isArray(root.invalidApprovalExamples) && root.invalidApprovalExamples.length >= 8
  );

  const validTemplate = asRecord(root.validPlaceholderOnlyTemplate);
  ok(
    "valid placeholder-only template complete",
    validTemplate.declaration === "THIS_IS_PLACEHOLDER_ONLY_NOT_REAL_APPROVAL" &&
      validTemplate.mustBeReviewedAgainBeforeUse === true &&
      validTemplate.cannotBeExecutedInV167 === true &&
      Array.isArray(validTemplate.requiredFields) &&
      (validTemplate.requiredFields as unknown[]).length >= 6
  );

  const stopConditions = asRecord(root.stopConditions);
  ok(
    "stop conditions are complete and HOLD",
    Object.keys(stopConditions).length >= 10 &&
      Object.values(stopConditions).every((value) => value === "HOLD")
  );

  const carryForward = asRecord(root.ownerApprovalCarryForward);
  ok(
    "owner approval carry-forward exists and true",
    Object.keys(carryForward).length >= 4 &&
      Object.values(carryForward).every((value) => value === true)
  );

  const nextStepRecommendation = String(root.nextStepRecommendation ?? "");
  ok(
    "exact next step recommendation targets v16.8 boundary review",
    /v16\.8/i.test(nextStepRecommendation) &&
      /pre-go boundary review/i.test(nextStepRecommendation) &&
      /planning-only/i.test(nextStepRecommendation) &&
      /no execution/i.test(nextStepRecommendation)
  );

  ok(
    "final decision is planning-only v16.8 readiness",
    root.finalDecision === "READY FOR v16.8 PRE-GO BOUNDARY REVIEW — PLANNING ONLY / NO EXECUTION"
  );
}

ok(
  "doc confirms what template does not approve",
  hasEveryLine(doc, [
    "no execution",
    "no dry-run",
    "no one-run",
    "no automatic retry",
    "no second run",
    "no deploy",
    "no production activation",
    "no public route activation",
    "no real lead sending",
    "no real dealer action"
  ])
);

ok(
  "doc confirms required placeholder fields",
  hasEveryLine(doc, [
    "EXACT_ACTION_TYPE_PLACEHOLDER_ONLY",
    "EXACT_COMMAND_PLACEHOLDER_ONLY",
    "EXACT_TARGET_PLACEHOLDER_ONLY",
    "EXACT_EVIDENCE_PLACEHOLDER_ONLY",
    "VERSIONED_PACKET_REFERENCE_PLACEHOLDER_ONLY",
    "OWNER_FINAL_DECISION_PLACEHOLDER_ONLY"
  ])
);

ok(
  "doc confirms one-run/no-retry/no-second-run and boundaries",
  hasEveryLine(doc, [
    "one-run only",
    "no automatic retry",
    "no second run",
    "no live endpoint call",
    "no provider/Gemini/runtime network call",
    "no manual endpoint guess",
    "no token/secret/API key exposure",
    "no real customer data / PII / phone / plate / VIN",
    "no Thor real data import",
    "no dealer real inventory import"
  ])
);

ok(
  "doc confirms template non-approval exact wording",
  hasEveryLine(doc, [
    "This template is not an approval.",
    "This template cannot be used as a real approval in v16.7.",
    "Any future execution requires a separate fresh owner review and separate fresh owner approval.",
    "The placeholder-only template is non-executable and non-authorizing."
  ])
);

ok(
  "doc confirms invalid examples and valid placeholder-only template sections",
  hasEveryLine(doc, [
    "## 23) Invalid approval examples",
    "## 24) Valid placeholder-only approval template",
    "this is placeholder-only and is not real approval",
    "in v16.7, this template cannot be used to run anything"
  ])
);

ok(
  "doc confirms Thai summary and exact next step",
  hasEveryLine(doc, [
    "## 25) Thai owner-friendly summary",
    "## 26) Exact next step recommendation",
    "next step only: v16.8 pre-go boundary review (planning-only / no execution)"
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
  ["v16 pilot already started", /\bv16\s+.*(pilot).*(started|active|running)\b/i],
  ["owner approved execution", /\bowner\s+.*(approved|authoriz(ed|ation)).*execution\b/i],
  [
    "template is real approval",
    /\btemplate\s+.*(is|acts as|can be used as|authorizes)\s+.*(real|live)?\s*approval\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "template unlocks deploy/public/prod/real lead",
    /\btemplate\s+.*(unlocks|enables)\s+.*(deploy|public|production|real lead|real dealer)\b/i,
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

console.log(`\nDone v16.7 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
