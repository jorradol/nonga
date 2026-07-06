/**
 * v16.11 owner acknowledgment record validator
 * Static checks only. No execution/dry-run/provider/runtime/live endpoint call.
 *
 * npm run test:v16.11
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v16.11-owner-acknowledgment-record.md";
const FIXTURE_PATH = "docs/examples/v16.11-owner-acknowledgment-record.synthetic.json";
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
    "non-authorizing",
    "non-executable",
    "hold",
    "no-go",
    "what v16.11 does not approve"
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

console.log("=== v16.11 Owner Acknowledgment Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v16.11 correctly",
  /v16\.11 — Owner Acknowledgment Record/.test(doc) &&
    fixtureRaw.includes("\"version\": \"v16.11\"") &&
    fixtureRaw.includes("\"executionType\": \"owner-acknowledgment-record only\"")
);

ok(
  "status phrase is explicit",
  hasEveryLine(doc, [
    "v16.11 = OWNER ACKNOWLEDGMENT RECORD ONLY",
    "PLANNING CLOSURE ACKNOWLEDGMENT ONLY / NO EXECUTION"
  ])
);

ok(
  "doc includes required v16.11 sections",
  hasEveryLine(doc, [
    "## 1) Status",
    "## 2) Purpose",
    "## 3) Baseline confirmation",
    "## 4) Owner acknowledgment meaning",
    "## 5) What v16.11 does not approve",
    "## 6) Owner-friendly Thai summary",
    "## 7) Future separation statement",
    "## 8) Placeholder-only rule",
    "## 9) Boundary carry-forward",
    "## 10) Final acknowledgment checklist",
    "## 11) Exact next owner action"
  ])
);

ok(
  "purpose section includes required intent",
  hasEveryLine(doc, [
    "record owner acknowledgment of v16 planning closure",
    "owner-friendly summary",
    "prepare a clean boundary before any possible future execution-request draft",
    "not GO, not execution, not approval"
  ])
);

ok(
  "baseline includes v13-v15 closed and v16.0-v16.10A passed",
  hasEveryLine(doc, [
    "v13 = CLOSED",
    "v14 = CLOSED",
    "v15 = CLOSED",
    "v16.0 = PASSED",
    "v16.1 = PASSED",
    "v16.2 = PASSED",
    "v16.3 = PASSED via v16.3A HOLD FIX",
    "v16.4 = PASSED",
    "v16.5 = PASSED",
    "v16.6 = PASSED",
    "v16.7 = PASSED via v16.7B HOLD FIX",
    "v16.8 = PASSED via v16.8A HOLD FIX",
    "v16.9 = PASSED via v16.9A HOLD FIX",
    "v16.10 = PASSED via v16.10A HOLD FIX"
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
    "package has test:v16.11 script",
    scripts["test:v16.11"] === "tsx scripts/test-v1611-owner-acknowledgment-record.mts"
  );
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;

  ok("planningClosureAcknowledgmentOnly=true", root.planningClosureAcknowledgmentOnly === true);
  ok("ownerAcknowledgmentRecordOnly=true", root.ownerAcknowledgmentRecordOnly === true);
  ok("noGo=true", root.noGo === true);
  ok("noExecution=true", root.noExecution === true);
  ok("noDryRun=true", root.noDryRun === true);
  ok("noOneRun=true", root.noOneRun === true);
  ok("noRetry=true", root.noRetry === true);
  ok("noSecondRun=true", root.noSecondRun === true);
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
  ok("noPII=true", root.noPII === true);
  ok("noTokenSecretExposure=true", root.noTokenSecretExposure === true);

  const purpose = asRecord(root.purpose);
  ok(
    "purpose object complete and true",
    Object.keys(purpose).length >= 4 && Object.values(purpose).every((value) => value === true)
  );

  const baseline = asRecord(root.baselineConfirmed);
  ok(
    "fixture baseline complete through v16.10A",
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
      baseline["v16.10"] === "PASSED via v16.10A HOLD FIX" &&
      baseline["v16PlanningClosureDecision"] ===
        "CLOSE V16 PLANNING — READY FOR OWNER ACKNOWLEDGMENT ONLY / NO EXECUTION"
  );

  const ownerMeaning = asRecord(root.ownerAcknowledgmentMeaning);
  ok(
    "owner acknowledgment meaning is complete",
    Object.keys(ownerMeaning).length >= 10 && Object.values(ownerMeaning).every((value) => value === true)
  );

  ok(
    "what v16.11 does not approve list complete",
    Array.isArray(root.whatV1611DoesNotApprove) && root.whatV1611DoesNotApprove.length >= 18
  );

  ok(
    "owner-friendly thai summary contains 4 required lines",
    Array.isArray(root.ownerFriendlyThaiSummary) &&
      root.ownerFriendlyThaiSummary.includes("v16 planning ปิดแล้ว") &&
      root.ownerFriendlyThaiSummary.includes("วางกรอบ v16 ก่อน ยังไม่แตะของจริง") &&
      root.ownerFriendlyThaiSummary.includes("การรับทราบนี้ไม่ใช่คำสั่งรัน") &&
      root.ownerFriendlyThaiSummary.includes(
        "ถ้าจะรันจริงในอนาคต ต้องมีงานใหม่และ approval ใหม่แยกต่างหาก"
      )
  );

  const future = asRecord(root.futureSeparationStatement);
  ok(
    "future separation statement complete",
    Object.keys(future).length >= 16 &&
      future.separateFutureTaskRequired === true &&
      future.freshOwnerReview === true &&
      future.freshOwnerApproval === true &&
      future.exactCommand === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      future.exactTarget === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      future.exactExpectedEvidence === "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY"
  );

  const placeholder = asRecord(root.placeholderOnlyRule);
  ok(
    "placeholder-only rule complete",
    placeholder.exactCommandPlaceholder === "EXACT_COMMAND_PLACEHOLDER_ONLY" &&
      placeholder.exactTargetPlaceholder === "EXACT_TARGET_PLACEHOLDER_ONLY" &&
      placeholder.exactExpectedEvidencePlaceholder === "EXACT_EXPECTED_EVIDENCE_PLACEHOLDER_ONLY" &&
      placeholder.containsRealCommandOrTargetOrUrlOrEndpointOrEvidence === false &&
      placeholder.containsRealOwnerApprovalWording === false &&
      placeholder.containsTokenSecretApiKeyPii === false &&
      placeholder.containsPhonePlateVin === false &&
      placeholder.containsThorDealerRealImportValues === false
  );

  const carry = asRecord(root.boundaryCarryForward);
  ok(
    "boundary carry-forward complete and true",
    Object.keys(carry).length >= 8 && Object.values(carry).every((value) => value === true)
  );

  const checklist = asRecord(root.finalAcknowledgmentChecklist);
  ok(
    "final acknowledgment checklist complete and true",
    Object.keys(checklist).length >= 9 && Object.values(checklist).every((value) => value === true)
  );

  ok(
    "exact next owner action is exact required statement",
    root.exactNextOwnerAction ===
      "Owner acknowledgment only. This is not execution approval. Future execution-request draft requires a separate fresh owner approval."
  );

  ok(
    "final decision is owner acknowledgment closure only",
    root.finalDecision ===
      "V16 OWNER ACKNOWLEDGMENT RECORD CLOSED — READY FOR FUTURE EXECUTION REQUEST DRAFT ONLY IF OWNER SEPARATELY APPROVES / NO EXECUTION"
  );
}

ok(
  "doc includes owner acknowledgment meaning details",
  hasEveryLine(doc, [
    "acknowledgment means owner has reviewed and accepted the planning closure record",
    "acknowledgment does not authorize execution",
    "acknowledgment does not authorize one-run",
    "acknowledgment does not authorize retry",
    "acknowledgment does not authorize second run",
    "acknowledgment does not authorize deploy/public/production",
    "acknowledgment does not authorize real lead or real dealer action",
    "acknowledgment does not authorize runtime/provider/Gemini call",
    "acknowledgment does not authorize live endpoint call or manual endpoint guess",
    "acknowledgment does not authorize Thor/dealer real import"
  ])
);

ok(
  "doc includes full not-approve list",
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
  "doc includes future separation details",
  hasEveryLine(doc, [
    "fresh owner review",
    "fresh owner approval",
    "exact command",
    "exact target",
    "exact expected evidence",
    "one-run only",
    "no automatic retry",
    "no second run",
    "rollback / kill-switch owner",
    "stop conditions",
    "sanitized evidence",
    "zero token/secret/PII ambiguity",
    "zero public/prod/real lead ambiguity",
    "zero runtime/provider/Gemini ambiguity",
    "zero real dealer/import ambiguity"
  ])
);

ok(
  "doc includes exact next owner action statement",
  doc.includes(
    "Owner acknowledgment only. This is not execution approval. Future execution-request draft requires a separate fresh owner approval."
  )
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
  ["v16.11 is go", /\bv16\.11\s+.*\b(is|equals)\s+go\b/i],
  ["owner approved execution", /\bowner\s+.*(approved|authoriz(ed|ation)).*execution\b/i],
  [
    "one-run approved",
    /\bone[-\s]?run\s+.*(approved|authorized|enabled)\b/i,
    { allowSafeNegativeContext: true }
  ],
  [
    "unlocks deploy/public/prod/real lead/real dealer",
    /\b(v16\.11|acknowledgment|record)\s+.*(unlocks|enables)\s+.*(deploy|public|production|real lead|real dealer)\b/i,
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

console.log(`\nDone v16.11 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
