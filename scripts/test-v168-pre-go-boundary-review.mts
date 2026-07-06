/**
 * v16.8 pre-GO boundary review validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.8
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.8-pre-go-boundary-review.md";
const FIXTURE_PATH = "docs/examples/v16.8-pre-go-boundary-review.synthetic.json";
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

function isSafeNegativeOrBlockerContext(line: string): boolean {
  const normalized = line.toLowerCase();
  const safeMarkers = [
    " is not ",
    " no ",
    "does not",
    "cannot",
    "remains locked",
    "has not",
    "not started",
    "non-authorizing",
    "non-executable",
    "invalid",
    "blocker",
    "go blocked",
    "does not approve",
    "what this review does not approve",
    "planning-only"
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
    if (options?.allowSafeNegativeContext && isSafeNegativeOrBlockerContext(line)) return false;
    return pattern.test(line);
  });
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

console.log("=== v16.8 Pre-GO Boundary Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.8 correctly",
  /v16\.8 — Pre-GO Boundary Review/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.8\"") &&
    fixtureRaw.includes("\"executionType\": \"pre-go-boundary-review only\"")
);

ok(
  "planning-only and pre-go-only phrases are explicit",
  hasEveryLine(doc, [
    "PLANNING ONLY / NO EXECUTION",
    "PRE-GO BOUNDARY REVIEW ONLY",
    "v16.8A is HOLD FIX / PLANNING ONLY / NO EXECUTION",
    "v16.8 is not GO",
    "v16.8 is not owner approval",
    "v16.8 is not execution approval",
    "v16.8 is not one-run approval"
  ])
);

ok(
  "doc includes required v16.8 sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Pre-GO boundary review scope",
    "## 5) What this review does not approve",
    "## 6) GO separation statement",
    "## 7) No-execution boundary review",
    "## 8) One-run / no-retry / no-second-run boundary review",
    "## 9) Public / production / buyer-facing boundary review",
    "## 10) Real lead boundary review",
    "## 11) Real dealer action boundary review",
    "## 12) Runtime / provider / Gemini boundary review",
    "## 13) Live endpoint / manual endpoint guess boundary review",
    "## 14) Security / privacy / PII / token boundary review",
    "## 15) Thor / dealer real import boundary review",
    "## 16) Owner approval separation review",
    "## 17) Future approval template boundary review",
    "## 18) Exact command / target / evidence placeholder boundary review",
    "## 19) Rollback / kill-switch boundary review",
    "## 20) Stop condition boundary review",
    "## 21) GO-blocker matrix",
    "## 22) Boundary risk register",
    "## 23) Required conditions before any future GO request",
    "## 24) Thai owner-friendly summary",
    "## 25) Exact next step recommendation"
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
    "package has test:v16.8 script",
    scripts["test:v16.8"] === "tsx scripts/test-v168-pre-go-boundary-review.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

  ok(
    "v16.8A status is HOLD FIX / PLANNING ONLY / NO EXECUTION",
    root.v168aStatus === "HOLD FIX / PLANNING ONLY / NO EXECUTION"
  );
  ok("planningOnly=true", root.planningOnly === true);
  ok("preGoBoundaryReviewOnly=true", root.preGoBoundaryReviewOnly === true);
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
    "baseline complete through v16.7B and v16.8 planning-only",
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
      baseline["v16.8"] === "PLANNING ONLY / PRE-GO BOUNDARY REVIEW ONLY"
  );

  const boundaryReviews = asRecord(root.boundaryReviews);
  ok(
    "boundary reviews are complete and true",
    Object.keys(boundaryReviews).length >= 10 &&
      Object.values(boundaryReviews).every((value) => value === true)
  );

  const goSeparation = asRecord(root.goSeparationStatement);
  ok(
    "go separation statement is complete",
    Object.keys(goSeparation).length >= 6 &&
      Object.values(goSeparation).every((value) => value === true)
  );

  const ownerApprovalSeparation = asRecord(root.ownerApprovalSeparation);
  ok(
    "owner approval separation is complete",
    Object.keys(ownerApprovalSeparation).length >= 4 &&
      Object.values(ownerApprovalSeparation).every((value) => value === true)
  );

  const futureTemplateBoundary = asRecord(root.futureApprovalTemplateBoundary);
  ok(
    "future approval template boundary is complete",
    Object.keys(futureTemplateBoundary).length >= 3 &&
      Object.values(futureTemplateBoundary).every((value) => value === true)
  );

  const placeholders = asRecord(root.placeholderOnlyBoundary);
  ok(
    "placeholder-only command/target/evidence boundary is complete",
    placeholders.exactCommand === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      placeholders.exactTarget === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      placeholders.exactEvidence === "EXACT_EVIDENCE_PLACEHOLDER_ONLY" &&
      placeholders.placeholdersAreNonExecutableAndNonAuthorizing === true
  );

  const blockerMatrix = asRecord(root.goBlockerMatrix);
  ok(
    "go-blocker matrix is complete and HOLD",
    Object.keys(blockerMatrix).length >= 16 &&
      Object.values(blockerMatrix).every((value) => value === "HOLD")
  );

  ok(
    "boundary risk register is complete",
    Array.isArray(root.boundaryRiskRegister) && root.boundaryRiskRegister.length >= 10
  );

  ok(
    "required conditions before future GO request are complete",
    Array.isArray(root.requiredConditionsBeforeFutureGoRequest) &&
      root.requiredConditionsBeforeFutureGoRequest.length >= 8
  );

  const stopConditions = asRecord(root.stopConditions);
  ok(
    "stop conditions are complete and HOLD",
    Object.keys(stopConditions).length >= 8 &&
      Object.values(stopConditions).every((value) => value === "HOLD")
  );

  const nextStepRecommendation = String(root.nextStepRecommendation ?? "");
  ok(
    "exact next step recommendation targets v16.9 GO/NO-GO decision frame",
    /v16\.9/i.test(nextStepRecommendation) &&
      /go\/no-go/i.test(nextStepRecommendation) &&
      /planning-only/i.test(nextStepRecommendation) &&
      /no execution/i.test(nextStepRecommendation)
  );

  ok(
    "final decision is planning-only v16.9 readiness",
    root.finalDecision === "READY FOR v16.9 GO/NO-GO DECISION FRAME — PLANNING ONLY / NO EXECUTION"
  );
}

ok(
  "doc confirms what this review does not approve",
  hasEveryLine(doc, [
    "no GO",
    "no execution",
    "no one-run",
    "no automatic retry",
    "no second run",
    "no deploy",
    "no production activation",
    "no public route activation",
    "no buyer-facing public release",
    "no real lead sending",
    "no real dealer action"
  ])
);

ok(
  "doc confirms no-execution and one-run policy boundaries",
  hasEveryLine(doc, [
    "No-execution boundary review",
    "execution remains strictly blocked in v16.8",
    "v16.8 is not one-run approval",
    "one-run remains locked",
    "no automatic retry remains locked",
    "no second run remains locked"
  ])
);

ok(
  "doc confirms public/prod/real lead/real dealer boundaries",
  hasEveryLine(doc, [
    "no public route activation",
    "no production activation",
    "no buyer-facing public release",
    "no real lead sending",
    "no real dealer action"
  ])
);

ok(
  "doc confirms runtime/provider/gemini and endpoint boundaries",
  hasEveryLine(doc, [
    "no runtime invocation authorization",
    "no provider call authorization",
    "no Gemini call authorization",
    "no live endpoint call",
    "no manual endpoint guess"
  ])
);

ok(
  "doc confirms no-GO and pilot-not-started wording",
  hasEveryLine(doc, [
    "v16.8 is not GO",
    "v16.8 is not execution approval",
    "v16.8 is not one-run approval",
    "pilot has not started"
  ])
);

ok(
  "doc confirms security/pii/token and import boundaries",
  hasEveryLine(doc, [
    "no token/secret/API key exposure",
    "no real customer data / PII / phone / plate / VIN",
    "no Thor real data import",
    "no dealer real inventory import"
  ])
);

ok(
  "doc confirms owner/template/placeholder separation",
  hasEveryLine(doc, [
    "Any future GO request requires a separate fresh owner review and separate fresh owner approval.",
    "template must not be interpreted as real approval",
    "EXACT_COMMAND_PLACEHOLDER_ONLY",
    "EXACT_TARGET_PLACEHOLDER_ONLY",
    "EXACT_EVIDENCE_PLACEHOLDER_ONLY"
  ])
);

ok(
  "doc confirms rollback stop condition blocker risk next step and Thai summary",
  hasEveryLine(doc, [
    "## 19) Rollback / kill-switch boundary review",
    "## 20) Stop condition boundary review",
    "## 21) GO-blocker matrix",
    "## 22) Boundary risk register",
    "## 24) Thai owner-friendly summary",
    "next step only: v16.9 GO/NO-GO decision frame (planning-only / no execution)"
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
  ["v16.8 is go", /\bv16\.8\s+.*\b(is|equals)\s+go\b/i],
  ["owner approved execution", /\bowner\s+.*(approved|authoriz(ed|ation)).*execution\b/i],
  [
    "one run approved",
    /\bone[-\s]?run\s+.*(approved|authorized|enabled)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "go unlocks deploy/public/prod/real lead/real dealer",
    /\b(go|v16\.8)\s+.*(unlocks|enables)\s+.*(deploy|public|production|real lead|real dealer)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "pilot already started",
    /\b(v16|pilot)\s+.*(started|active|running)\b/i,
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

console.log(`\nDone v16.8 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
