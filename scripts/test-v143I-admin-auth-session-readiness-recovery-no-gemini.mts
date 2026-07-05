/**
 * v14.3I admin auth session readiness recovery validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3I
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3I-admin-auth-session-readiness-recovery-no-gemini.md";
const FIXTURE_PATH = "docs/examples/v14.3I-admin-auth-session-readiness-recovery.synthetic.json";
const V143H_DOC_PATH = "docs/v14.3H-owner-only-one-run-execution-record-auth-hold.md";
const TOKEN_CHECK_SCRIPT_PATH = "scripts/check-admin-token-session-env.mts";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143I-admin-auth-session-readiness-recovery-no-gemini.mts";

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

console.log("=== v14.3I Admin Auth Session Readiness Recovery Validation ===\n");

ok("v14.3I doc exists", existsSync(DOC_PATH));
ok("v14.3I fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3H doc exists", existsSync(V143H_DOC_PATH));
ok("token checker exists", existsSync(TOKEN_CHECK_SCRIPT_PATH));
ok("owner evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143hDoc = read(V143H_DOC_PATH);
const tokenChecker = read(TOKEN_CHECK_SCRIPT_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 4400, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 2500, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const requiredBoundaryNoLines: Array<[string, RegExp]> = [
  ["runtime execution no", /runtime execution:\s*no/i],
  ["Gemini run no", /Gemini run:\s*no/i],
  ["one-run click no", /one-run click:\s*no/i],
  ["provider network call no", /provider network call:\s*no/i],
  ["provider endpoint no", /endpoint call that may trigger provider:\s*no/i],
  ["retry no", /retry:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["oneRunStarted true no", /oneRunStarted=true:\s*no/i],
  ["oneRunConsumed true no", /oneRunConsumed=true:\s*no/i],
  ["deploy no", /deploy:\s*no/i],
  ["secret change no", /secret change:\s*no/i],
];
for (const [name, re] of requiredBoundaryNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

ok(
  "doc captures auth readiness findings safely",
  /NONGA_ADMIN_API_TOKEN presence:\s*missing/.test(doc) &&
    /token value exposure:\s*`?no`?/i.test(doc) &&
    /\*\*\*MASKED\*\*\*/.test(doc) &&
    /admin auth readiness:\s*`?not ready`?/i.test(doc)
);

ok(
  "doc includes no-token-exposure recovery policy",
  /never print raw token/i.test(doc) &&
    /never paste token in docs\/report\/chat/i.test(doc) &&
    /never commit token/i.test(doc) &&
    /never echo token value/i.test(doc)
);

ok(
  "doc states fresh approval required again before future execution",
  /v14\.3H authorization line is not consumed/i.test(doc) &&
    /fresh owner approval must be requested again immediately before future execution/i.test(doc) &&
    /FINAL EXECUTION AUTHORIZE v14\.3J: YES — exactly ONE owner-only staging dry-run, no retry, no second run, staging only, owner\/admin only, synthetic\/sanitized only, no public, no production, no real lead\./.test(
      doc
    )
);

ok(
  "doc confirms one-run remains unconsumed",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc)
);

const requiredHoldRules = [
  "token format is invalid",
  "token exposure risk appears",
  "one-run consumption status is ambiguous",
  "retry/second-run control is ambiguous",
  "any provider-triggering action is attempted",
  "tests fail",
];
ok(
  "doc includes hold rule NONGA_ADMIN_API_TOKEN is missing",
  /NONGA_ADMIN_API_TOKEN.*missing/i.test(doc)
);
for (const hold of requiredHoldRules) {
  ok(`doc includes hold rule ${hold}`, doc.includes(`- ${hold}`) || new RegExp(hold, "i").test(doc));
}

const antiMisleadingLines = [
  "runtime action now: no",
  "Gemini/provider call now: no",
  "one-run consumed now: no",
  "retry allowed: no",
  "second run allowed: no",
  "admin auth readiness now: not ready",
];
for (const line of antiMisleadingLines) {
  ok(`doc includes anti-misleading line ${line}`, doc.includes(`- ${line}`));
}

ok(
  "cross-doc confirms v14.3H auth hold and non-consumption",
  /HOLD — ADMIN AUTH SESSION NOT READY/.test(v143hDoc) &&
    /oneRunStarted=false/.test(v143hDoc) &&
    /oneRunConsumed=false/.test(v143hDoc)
);

ok(
  "token checker remains local-safe and masked",
  /Safe local-only check/.test(tokenChecker) &&
    /masked:\s*"\*\*\*MASKED\*\*\*"/.test(tokenChecker) &&
    /HOLD — NONGA_ADMIN_API_TOKEN missing in operator\/session env/.test(tokenChecker)
);

ok(
  "owner evidence/panel still include run lock and no-retry semantics",
  /runSessionLocked:\s*boolean;/.test(ownerEvidence) &&
    /noRetry=true/.test(ownerPanel) &&
    /noSecondRunWithoutFreshApproval=true/.test(ownerPanel)
);

const expectedFinalRecommendations = [
  "READY FOR v14.3J FRESH OWNER APPROVAL DECISION POINT — AUTH READY, NO GEMINI UNTIL OWNER APPROVES",
  "HOLD — ADMIN AUTH SESSION STILL NOT READY",
  "HOLD — SECRET/TOKEN EXPOSURE RISK DETECTED",
  "HOLD — ONE-RUN CONSUMPTION AMBIGUITY",
  "HOLD — RETRY/SECOND-RUN CONTROL AMBIGUITY",
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
  ok("fixture version is v14.3I", root.version === "v14.3I");

  const executionType = root.executionType as Record<string, unknown>;
  ok(
    "fixture execution type stays non-runtime",
    executionType?.staticMockOnly === true &&
      executionType?.readOnlyInspectionOnly === true &&
      executionType?.localSafeAuthReadinessCheckOnly === true &&
      executionType?.runtimeExecution === false &&
      executionType?.geminiRun === false &&
      executionType?.oneRunClick === false &&
      executionType?.providerNetworkCall === false &&
      executionType?.providerTriggeringEndpointCall === false &&
      executionType?.retry === false &&
      executionType?.secondRun === false
  );

  const auth = root.authReadinessStatus as Record<string, unknown>;
  ok(
    "fixture captures auth readiness safely",
    auth?.checkCommand === "npm run check:admin-token-session-env" &&
      auth?.adminTokenPresence === "missing" &&
      auth?.tokenValueExposure === false &&
      auth?.maskedTokenOutputOnly === true &&
      auth?.adminAuthReadiness === "not ready"
  );

  const exposure = root.tokenSecretExposurePolicy as Record<string, unknown>;
  ok(
    "fixture enforces no secret exposure rules",
    exposure?.reportPresenceOnly === true &&
      exposure?.noRawTokenPrint === true &&
      exposure?.noTokenInDocsOrReport === true &&
      exposure?.noTokenCommit === true &&
      exposure?.noTokenEcho === true
  );

  const fresh = root.freshApprovalHandling as Record<string, unknown>;
  ok(
    "fixture enforces fresh approval handling",
    fresh?.v143hAuthorizationConsumed === false &&
      fresh?.freshOwnerApprovalRequiredBeforeFutureExecution === true &&
      fresh?.requiredFutureApprovalPattern ===
        "FINAL EXECUTION AUTHORIZE v14.3J: YES — exactly ONE owner-only staging dry-run, no retry, no second run, staging only, owner/admin only, synthetic/sanitized only, no public, no production, no real lead."
  );

  const oneRun = root.oneRunConsumptionStatus as Record<string, unknown>;
  ok(
    "fixture keeps one-run status unconsumed",
    oneRun?.oneRunStarted === false &&
      oneRun?.oneRunConsumed === false &&
      oneRun?.retryUsed === false &&
      oneRun?.secondRunUsed === false
  );

  const hold = root.holdRulesRequired as Record<string, unknown>;
  ok(
    "fixture hold rules complete",
    hold?.holdOnMissingAdminToken === true &&
      hold?.holdOnInvalidTokenFormat === true &&
      hold?.holdOnTokenExposureRisk === true &&
      hold?.holdOnOneRunConsumptionAmbiguity === true &&
      hold?.holdOnRetrySecondRunControlAmbiguity === true &&
      hold?.holdOnProviderTriggeringActionAttempt === true &&
      hold?.holdOnTestFailure === true
  );

  const anti = root.antiMisleadingStatus as Record<string, unknown>;
  ok(
    "fixture anti-misleading status complete",
    anti?.runtimeActionNow === false &&
      anti?.geminiProviderCallNow === false &&
      anti?.oneRunConsumedNow === false &&
      anti?.retryAllowed === false &&
      anti?.secondRunAllowed === false &&
      anti?.adminAuthReadinessNowReady === false
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

console.log(`\nDone v14.3I auth recovery validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
