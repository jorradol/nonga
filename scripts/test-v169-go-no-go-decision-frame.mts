/**
 * v16.9 GO/NO-GO decision frame validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.9
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.9-go-no-go-decision-frame.md";
const FIXTURE_PATH = "docs/examples/v16.9-go-no-go-decision-frame.synthetic.json";
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
    " not go",
    " no ",
    "does not",
    "cannot",
    "remains locked",
    "has not",
    "not started",
    "non-authorizing",
    "non-executable",
    "blocker",
    "hold",
    "no-go",
    "what this frame does not approve"
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

console.log("=== v16.9 GO/NO-GO Decision Frame Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.9 correctly",
  /v16\.9 — GO\/NO-GO Decision Frame/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.9\"") &&
    fixtureRaw.includes("\"executionType\": \"go-no-go-decision-frame only\"")
);

ok(
  "planning-only and decision-frame-only phrases are explicit",
  hasEveryLine(doc, [
    "PLANNING ONLY / NO EXECUTION",
    "GO-NO-GO DECISION FRAME ONLY",
    "v16.9 is not GO",
    "v16.9 is not owner approval",
    "v16.9 is not execution approval",
    "v16.9 is not one-run approval"
  ])
);

ok(
  "doc includes required v16.9 sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) GO/NO-GO decision frame scope",
    "## 5) What this frame does not approve",
    "## 6) GO separation statement",
    "## 7) Decision options",
    "## 8) GO option definition",
    "## 9) NO-GO option definition",
    "## 10) HOLD option definition",
    "## 11) REVISE option definition",
    "## 12) Required preconditions before any future GO request",
    "## 13) Required owner approval separation",
    "## 14) Required exact command / target / evidence separation",
    "## 15) One-run / no-retry / no-second-run carry-forward",
    "## 16) Public / production / buyer-facing boundary",
    "## 17) Real lead boundary",
    "## 18) Real dealer action boundary",
    "## 19) Runtime / provider / Gemini boundary",
    "## 20) Live endpoint / manual endpoint guess boundary",
    "## 21) Security / privacy / PII / token boundary",
    "## 22) Thor / dealer real import boundary",
    "## 23) Rollback / kill-switch requirement",
    "## 24) Stop condition requirement",
    "## 25) GO-blocker matrix",
    "## 26) Decision evidence checklist",
    "## 27) Thai owner-friendly summary",
    "## 28) Exact next step recommendation"
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
    "package has test:v16.9 script",
    scripts["test:v16.9"] === "tsx scripts/test-v169-go-no-go-decision-frame.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("planningOnly=true", root.planningOnly === true);
  ok("goNoGoDecisionFrameOnly=true", root.goNoGoDecisionFrameOnly === true);
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
    "baseline complete through v16.8A and v16.9 planning-only frame",
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
      baseline["v16.9"] === "PLANNING ONLY / GO-NO-GO DECISION FRAME ONLY"
  );

  ok(
    "decision options include all 4 planning-only options",
    Array.isArray(root.decisionOptions) &&
      root.decisionOptions.includes("GO-FRAME OPTION — PREPARE FUTURE EXECUTION REQUEST DRAFT ONLY") &&
      root.decisionOptions.includes("NO-GO OPTION — STOP BEFORE FUTURE EXECUTION REQUEST") &&
      root.decisionOptions.includes("HOLD OPTION — WAIT FOR OWNER / BUSINESS / SAFETY CLARIFICATION") &&
      root.decisionOptions.includes("REVISE OPTION — REVISE SCOPE / BOUNDARY / TEMPLATE BEFORE CONTINUING")
  );

  ok(
    "what this frame does not approve is complete",
    Array.isArray(root.whatThisFrameDoesNotApprove) &&
      root.whatThisFrameDoesNotApprove.length >= 18
  );

  const goSeparation = asRecord(root.goSeparationStatement);
  ok(
    "go separation statement is complete",
    Object.keys(goSeparation).length >= 6 &&
      Object.values(goSeparation).every((value) => value === true)
  );

  ok(
    "required preconditions before future GO request are complete",
    Array.isArray(root.requiredPreconditionsBeforeFutureGoRequest) &&
      root.requiredPreconditionsBeforeFutureGoRequest.length >= 16
  );

  const ownerApprovalSeparation = asRecord(root.ownerApprovalSeparation);
  ok(
    "owner approval separation is complete",
    Object.keys(ownerApprovalSeparation).length >= 3 &&
      Object.values(ownerApprovalSeparation).every((value) => value === true)
  );

  const exactSeparation = asRecord(root.exactCommandTargetEvidenceSeparation);
  ok(
    "exact command/target/evidence separation is placeholder-only",
    exactSeparation.exactCommand === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      exactSeparation.exactTarget === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      exactSeparation.exactEvidence === "EXACT_EVIDENCE_PLACEHOLDER_ONLY" &&
      exactSeparation.placeholdersRemainNonExecutableAndNonAuthorizing === true
  );

  const goBlockers = asRecord(root.goBlockerMatrix);
  ok(
    "go-blocker matrix is complete",
    Object.keys(goBlockers).length >= 19 &&
      Object.values(goBlockers).every((value) => value === "HOLD" || value === "HOLD_OR_NO_GO")
  );

  ok(
    "decision evidence checklist is complete",
    Array.isArray(root.decisionEvidenceChecklist) && root.decisionEvidenceChecklist.length >= 9
  );

  const stopConditions = asRecord(root.stopConditions);
  ok(
    "stop conditions are complete",
    Object.keys(stopConditions).length >= 8 &&
      Object.values(stopConditions).every((value) => value === "HOLD" || value === "HOLD_OR_NO_GO")
  );

  const nextStepRecommendation = String(root.nextStepRecommendation ?? "");
  ok(
    "exact next step recommendation targets v16.10 closure review",
    /v16\.10/i.test(nextStepRecommendation) &&
      /final planning closure review/i.test(nextStepRecommendation) &&
      /planning-only/i.test(nextStepRecommendation) &&
      /no execution/i.test(nextStepRecommendation)
  );

  ok(
    "final decision is planning-only v16.10 readiness",
    root.finalDecision === "READY FOR v16.10 FINAL PLANNING CLOSURE REVIEW — PLANNING ONLY / NO EXECUTION"
  );
}

ok(
  "doc confirms what frame does not approve",
  hasEveryLine(doc, [
    "no GO",
    "no execution",
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
  "doc confirms decision option definitions and non-approving nature",
  hasEveryLine(doc, [
    "GO-FRAME OPTION — PREPARE FUTURE EXECUTION REQUEST DRAFT ONLY",
    "NO-GO OPTION — STOP BEFORE FUTURE EXECUTION REQUEST",
    "HOLD OPTION — WAIT FOR OWNER / BUSINESS / SAFETY CLARIFICATION",
    "REVISE OPTION — REVISE SCOPE / BOUNDARY / TEMPLATE BEFORE CONTINUING",
    "this option is not GO",
    "this option is not approval",
    "this option is not execution"
  ])
);

ok(
  "doc confirms owner and exact command/target/evidence separation",
  hasEveryLine(doc, [
    "v16.9 is not owner approval",
    "owner approval for any future GO path must be separate and fresh",
    "EXACT_COMMAND_PLACEHOLDER_ONLY",
    "EXACT_TARGET_PLACEHOLDER_ONLY",
    "EXACT_EVIDENCE_PLACEHOLDER_ONLY"
  ])
);

ok(
  "doc confirms one-run/public/real lead/real dealer boundaries",
  hasEveryLine(doc, [
    "one-run remains locked in v16.9",
    "no automatic retry remains locked",
    "no second run remains locked",
    "no public route activation",
    "no production activation",
    "no real lead sending",
    "no real dealer action"
  ])
);

ok(
  "doc confirms runtime endpoint security import rollback stop conditions",
  hasEveryLine(doc, [
    "no runtime/provider/Gemini network call",
    "no live endpoint call",
    "no manual endpoint guess",
    "no token/secret/API key exposure",
    "no real customer data / PII / phone / plate / VIN",
    "no Thor real data import",
    "no dealer real inventory import",
    "rollback owner",
    "kill-switch owner",
    "Stop condition requirement"
  ])
);

ok(
  "doc confirms GO-blocker matrix decision evidence Thai summary next step",
  hasEveryLine(doc, [
    "## 25) GO-blocker matrix",
    "## 26) Decision evidence checklist",
    "## 27) Thai owner-friendly summary",
    "next step only: v16.10 final planning closure review (planning-only / no execution)"
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
  ["v16.9 is go", /\bv16\.9\s+.*\b(is|equals)\s+go\b/i],
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
    /\b(go|v16\.9|option)\s+.*(unlocks|enables)\s+.*(deploy|public|production|real lead|real dealer)\b/i,
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

console.log(`\nDone v16.9 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
