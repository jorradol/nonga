/**
 * v14.3J admin auth session ready confirmation validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3J
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3J-admin-auth-session-ready-confirmation-no-gemini.md";
const FIXTURE_PATH = "docs/examples/v14.3J-admin-auth-session-ready-confirmation.synthetic.json";
const V143I_DOC_PATH = "docs/v14.3I-admin-auth-session-readiness-recovery-no-gemini.md";
const V143H_DOC_PATH = "docs/v14.3H-owner-only-one-run-execution-record-auth-hold.md";
const TOKEN_CHECK_SCRIPT_PATH = "scripts/check-admin-token-session-env.mts";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143J-admin-auth-session-ready-confirmation-no-gemini.mts";

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

console.log("=== v14.3J Admin Auth Session Ready Confirmation Validation ===\n");

ok("v14.3J doc exists", existsSync(DOC_PATH));
ok("v14.3J fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3I doc exists", existsSync(V143I_DOC_PATH));
ok("v14.3H doc exists", existsSync(V143H_DOC_PATH));
ok("token checker exists", existsSync(TOKEN_CHECK_SCRIPT_PATH));
ok("owner evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143iDoc = read(V143I_DOC_PATH);
const v143hDoc = read(V143H_DOC_PATH);
const tokenChecker = read(TOKEN_CHECK_SCRIPT_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 4400, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 3000, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const requiredNoLines: Array<[string, RegExp]> = [
  ["runtime execution no", /runtime execution:\s*no/i],
  ["Gemini run no", /Gemini run:\s*no/i],
  ["one-run click no", /one-run click:\s*no/i],
  ["provider network call no", /provider network call:\s*no/i],
  ["provider endpoint no", /endpoint call that may trigger Gemini\/provider:\s*no/i],
  ["retry no", /retry:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["oneRunStarted true no", /oneRunStarted=true:\s*no/i],
  ["oneRunConsumed true no", /oneRunConsumed=true:\s*no/i],
  ["deploy no", /deploy:\s*no/i],
];
for (const [name, re] of requiredNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

ok(
  "doc captures checker status in present/missing format only",
  /NONGA_ADMIN_API_TOKEN:\s*(present|missing)/i.test(doc) &&
    /masked:\s*(\*\*\*MASKED\*\*\*|n\/a)/i.test(doc) &&
    /readiness:\s*(ready|not ready)/i.test(doc) &&
    /token value exposed:\s*no/i.test(doc)
);

ok(
  "doc includes masked-only and no exposure prevention rules",
  /report `present\/missing` only/i.test(doc) &&
    /report `masked: \*\*\*MASKED\*\*\*` or `masked: n\/a` only/i.test(doc) &&
    /never print raw token value/i.test(doc) &&
    /never commit token/i.test(doc)
);

ok(
  "doc includes hold/ready decision logic and current hold path",
  /if token is `missing` => `HOLD — ADMIN AUTH SESSION STILL NOT READY`/.test(doc) &&
    /if token is `present` and checker passes safe format checks => `READY FOR v14\.3K FRESH OWNER APPROVAL DECISION POINT — AUTH READY, NO GEMINI UNTIL OWNER APPROVES`/.test(
      doc
    ) &&
    /Current v14\.3J decision in this session:\s*\n\n- `HOLD — ADMIN AUTH SESSION STILL NOT READY`/.test(doc)
);

ok(
  "doc keeps one-run counters unconsumed",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc)
);

ok(
  "doc requires fresh approval before future execution",
  /fresh owner approval is still required immediately before future execution/i.test(doc) &&
    /FINAL EXECUTION AUTHORIZE v14\.3K: YES — exactly ONE owner-only staging dry-run, no retry, no second run, staging only, owner\/admin only, synthetic\/sanitized only, no public, no production, no real lead\./.test(
      doc
    )
);

const holdReadyRules = [
  /`NONGA_ADMIN_API_TOKEN` is missing/,
  /token format is invalid or unsafe/,
  /secret\/token exposure risk appears/,
  /one-run consumption status is ambiguous/,
  /retry\/second-run control is ambiguous/,
  /provider-trigger risk is detected/,
  /tests fail/,
];
for (const re of holdReadyRules) {
  ok(`doc includes hold/ready rule ${re.source}`, re.test(doc));
}

const antiMisleading = [
  "runtime action now: no",
  "Gemini run now: no",
  "provider call now: no",
  "endpoint trigger now: no",
  "one-run started now: no",
  "one-run consumed now: no",
  "retry allowed: no",
  "second run allowed: no",
];
for (const line of antiMisleading) {
  ok(`doc includes anti-misleading line ${line}`, doc.includes(`- ${line}`));
}

ok(
  "cross-doc lineage preserves prior hold and no-consumption state",
  /HOLD — ADMIN AUTH SESSION STILL NOT READY/.test(v143iDoc) &&
    /oneRunStarted=false/.test(v143iDoc) &&
    /oneRunConsumed=false/.test(v143iDoc) &&
    /HOLD — ADMIN AUTH SESSION NOT READY/.test(v143hDoc)
);

ok(
  "token checker remains local-safe and masked-only",
  /Safe local-only check/.test(tokenChecker) &&
    /NONGA_ADMIN_API_TOKEN:/.test(tokenChecker) &&
    /masked:\s*"\*\*\*MASKED\*\*\*"/.test(tokenChecker) &&
    /No network call/.test(tokenChecker)
);

ok(
  "owner evidence/panel preserve lock and no second-run controls",
  /runSessionLocked:\s*boolean;/.test(ownerEvidence) &&
    /noRetry=true/.test(ownerPanel) &&
    /noSecondRunWithoutFreshApproval=true/.test(ownerPanel)
);

const expectedFinalRecommendations = [
  "READY FOR v14.3K FRESH OWNER APPROVAL DECISION POINT — AUTH READY, NO GEMINI UNTIL OWNER APPROVES",
  "HOLD — ADMIN AUTH SESSION STILL NOT READY",
  "HOLD — SECRET/TOKEN EXPOSURE RISK DETECTED",
  "HOLD — ONE-RUN CONSUMPTION AMBIGUITY",
  "HOLD — RETRY/SECOND-RUN CONTROL AMBIGUITY",
  "HOLD — PROVIDER-TRIGGER RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.3J", root.version === "v14.3J");

  const executionType = root.executionType as Record<string, unknown>;
  ok(
    "fixture execution stays non-runtime",
    executionType?.localSafeAuthReadinessCheckOnly === true &&
      executionType?.docsTestsFixturesStaticMockOnly === true &&
      executionType?.readOnlyInspectionOnly === true &&
      executionType?.runtimeExecution === false &&
      executionType?.geminiRun === false &&
      executionType?.oneRunClick === false &&
      executionType?.providerNetworkCall === false &&
      executionType?.providerTriggeringEndpointCall === false &&
      executionType?.retry === false &&
      executionType?.secondRun === false
  );

  const checker = root.authReadinessCheckerResult as Record<string, unknown>;
  ok(
    "fixture captures checker result safely",
    checker?.checkCommand === "npm run check:admin-token-session-env" &&
      (checker?.adminTokenPresence === "missing" || checker?.adminTokenPresence === "present") &&
      (checker?.masked === "***MASKED***" || checker?.masked === "n/a") &&
      (checker?.readiness === "not ready" || checker?.readiness === "ready") &&
      checker?.tokenValueExposed === false
  );

  const exposure = root.tokenExposurePrevention as Record<string, unknown>;
  const maskedAllow = Array.isArray(exposure?.allowMaskedPlaceholderValues)
    ? (exposure?.allowMaskedPlaceholderValues as unknown[])
    : [];
  ok(
    "fixture enforces masked-only no-exposure policy",
    exposure?.presenceOnlyReporting === true &&
      exposure?.maskedOnlyReporting === true &&
      maskedAllow.includes("***MASKED***") &&
      maskedAllow.includes("n/a") &&
      exposure?.noRawTokenPrint === true &&
      exposure?.noTokenCommit === true
  );

  const decision = root.authReadinessDecisionLogic as Record<string, unknown>;
  ok(
    "fixture decision logic includes hold and ready branches",
    decision?.ifMissingDecision === "HOLD — ADMIN AUTH SESSION STILL NOT READY" &&
      decision?.ifPresentAndCheckerPassDecision ===
        "READY FOR v14.3K FRESH OWNER APPROVAL DECISION POINT — AUTH READY, NO GEMINI UNTIL OWNER APPROVES" &&
      (decision?.currentDecision === "HOLD — ADMIN AUTH SESSION STILL NOT READY" ||
        decision?.currentDecision ===
          "READY FOR v14.3K FRESH OWNER APPROVAL DECISION POINT — AUTH READY, NO GEMINI UNTIL OWNER APPROVES") &&
      decision?.runtimeActionAfterHoldAllowed === false
  );

  const oneRun = root.oneRunControlStatus as Record<string, unknown>;
  ok(
    "fixture one-run controls remain false",
    oneRun?.oneRunStarted === false &&
      oneRun?.oneRunConsumed === false &&
      oneRun?.retryUsed === false &&
      oneRun?.secondRunUsed === false
  );

  const fresh = root.freshApprovalHandling as Record<string, unknown>;
  ok(
    "fixture keeps fresh approval required",
    fresh?.freshOwnerApprovalRequiredBeforeFutureExecution === true &&
      fresh?.priorAuthorizationConsumedInV143j === false &&
      fresh?.requiredFutureApprovalPattern ===
        "FINAL EXECUTION AUTHORIZE v14.3K: YES — exactly ONE owner-only staging dry-run, no retry, no second run, staging only, owner/admin only, synthetic/sanitized only, no public, no production, no real lead."
  );

  const rules = root.holdReadyProtectionRules as Record<string, unknown>;
  ok(
    "fixture hold/ready protection rules complete",
    rules?.holdOnMissingToken === true &&
      rules?.holdOnInvalidOrUnsafeTokenFormat === true &&
      rules?.holdOnSecretTokenExposureRisk === true &&
      rules?.holdOnOneRunConsumptionAmbiguity === true &&
      rules?.holdOnRetrySecondRunControlAmbiguity === true &&
      rules?.holdOnProviderTriggerRisk === true &&
      rules?.holdOnTestFailure === true &&
      rules?.readyOnlyWhenTokenPresentAndSafe === true
  );

  const anti = root.antiMisleadingStatusNow as Record<string, unknown>;
  ok(
    "fixture anti-misleading status is all false",
    anti?.runtimeActionNow === false &&
      anti?.geminiRunNow === false &&
      anti?.providerCallNow === false &&
      anti?.providerTriggerEndpointNow === false &&
      anti?.oneRunStartedNow === false &&
      anti?.oneRunConsumedNow === false &&
      anti?.retryAllowed === false &&
      anti?.secondRunAllowed === false &&
      anti?.publicActiveNow === false &&
      anti?.productionActiveNow === false &&
      anti?.realLeadPathActiveNow === false
  );

  const finalEnum = Array.isArray(root.finalRecommendationEnum) ? root.finalRecommendationEnum : [];
  for (const expected of expectedFinalRecommendations) {
    ok(`fixture includes final recommendation ${expected}`, finalEnum.includes(expected));
  }
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone style", /\b0[689]\d{8}\b/],
  ["thai plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

ok("validator checks final recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.3J auth readiness confirmation validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
