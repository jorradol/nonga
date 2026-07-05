/**
 * v14.3H owner-only one-run execution record validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3H
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3H-owner-only-one-run-execution-record-auth-hold.md";
const FIXTURE_PATH = "docs/examples/v14.3H-owner-only-one-run-execution-record.synthetic.json";
const V143G_DOC_PATH = "docs/v14.3G-pre-execution-record-packet-no-runtime-execution.md";
const V143F_DOC_PATH = "docs/v14.3F-owner-only-pilot-dry-run-plan-no-runtime-execution.md";
const V143E_DOC_PATH = "docs/v14.3E-fresh-owner-approval-request-draft-no-gemini.md";
const TOKEN_CHECK_SCRIPT_PATH = "scripts/check-admin-token-session-env.mts";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143H-owner-only-one-run-execution-record-auth-hold.mts";

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

console.log("=== v14.3H Owner-Only One-Run Execution Record Validation ===\n");

ok("v14.3H doc exists", existsSync(DOC_PATH));
ok("v14.3H fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3G doc exists", existsSync(V143G_DOC_PATH));
ok("v14.3F doc exists", existsSync(V143F_DOC_PATH));
ok("v14.3E doc exists", existsSync(V143E_DOC_PATH));
ok("token check script exists", existsSync(TOKEN_CHECK_SCRIPT_PATH));
ok("owner evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143gDoc = read(V143G_DOC_PATH);
const v143fDoc = read(V143F_DOC_PATH);
const v143eDoc = read(V143E_DOC_PATH);
const tokenCheckScript = read(TOKEN_CHECK_SCRIPT_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 5000, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 3600, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const requiredNoLines: Array<[string, RegExp]> = [
  ["runtime execution started no", /runtime execution started:\s*no/i],
  ["Gemini run no", /Gemini run:\s*no/i],
  ["one-run click no", /one-run click:\s*no/i],
  ["provider call no", /provider network call:\s*no/i],
  ["provider endpoint no", /endpoint call that may trigger provider:\s*no/i],
  ["retry no", /retry:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["deploy no", /deploy:\s*no/i],
  ["public route activation no", /public route activation:\s*no/i],
  ["production no", /production:\s*no/i],
  ["real lead sending no", /real lead sending:\s*no/i],
];
for (const [name, re] of requiredNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

ok(
  "doc records v14.3H authorization line",
  /FINAL EXECUTION AUTHORIZE v14\.3H: YES — exactly ONE owner-only staging dry-run, no retry, no second run, staging only, owner\/admin only, synthetic\/sanitized only, no public, no production, no real lead\./.test(
    doc
  )
);

ok(
  "doc includes auth/session hold result from token checker",
  /npm run check:admin-token-session-env/.test(doc) &&
    /NONGA_ADMIN_API_TOKEN`:\s*`missing`/.test(doc) &&
    /HOLD — NONGA_ADMIN_API_TOKEN missing in operator\/session env/.test(doc)
);

const oneRunControlLines: Array<[string, RegExp]> = [
  ["oneRunAuthorizedCount 1", /oneRunAuthorizedCount=1/],
  ["oneRunStarted false", /oneRunStarted=false/],
  ["oneRunConsumed false", /oneRunConsumed=false/],
  ["runSessionLockedExpected true", /runSessionLockedExpected=true/],
  ["retryUsed false", /retryUsed=false/],
  ["secondRunUsed false", /secondRunUsed=false/],
];
for (const [name, re] of oneRunControlLines) {
  ok(`doc includes one-run control ${name}`, re.test(doc));
}

const antiMisleadingStatus: Array<[string, RegExp]> = [
  ["runtime action now no", /runtime action now:\s*no/i],
  ["Gemini run now no", /Gemini run now:\s*no/i],
  ["one-run started now no", /one-run started now:\s*no/i],
  ["one-run consumed now no", /one-run consumed now:\s*no/i],
  ["approval consumed now no", /approval consumed now:\s*no/i],
  ["provider call now no", /provider call now:\s*no/i],
  ["retry allowed no", /retry allowed:\s*no/i],
  ["second run allowed no", /second run allowed:\s*no/i],
  ["pilot active now no", /pilot active now:\s*no/i],
  ["public active now no", /public active now:\s*no/i],
  ["production active now no", /production active now:\s*no/i],
  ["real lead path active now no", /real lead path active now:\s*no/i],
];
for (const [name, re] of antiMisleadingStatus) {
  ok(`doc includes anti-misleading status ${name}`, re.test(doc));
}

ok(
  "cross-doc lineage keeps pre-execution packet flow",
  /FINAL EXECUTION AUTHORIZE v14\.3H: YES/.test(v143gDoc) &&
    /one-run approval granted now:\s*yes/i.test(v143fDoc) &&
    /FINAL EXECUTION AUTHORIZE v14\.3F: YES/.test(v143eDoc)
);

ok(
  "token checker script is local-only and holds on missing token",
  /Safe local-only check\. No network call/.test(tokenCheckScript) &&
    /HOLD — NONGA_ADMIN_API_TOKEN missing in operator\/session env/.test(tokenCheckScript)
);

ok(
  "owner evidence and panel preserve run lock/no-retry semantics",
  /runSessionLocked:\s*boolean;/.test(ownerEvidence) &&
    /noRetry=true/.test(ownerPanel) &&
    /noSecondRunWithoutFreshApproval=true/.test(ownerPanel)
);

const expectedFinalRecommendations = [
  "READY FOR v14.3I OWNER-ONLY ONE-RUN EXECUTION ATTEMPT — STRICT SINGLE RUN",
  "HOLD — ADMIN AUTH SESSION NOT READY",
  "HOLD — ONE-RUN / RETRY / SECOND-RUN CONTROL AMBIGUITY",
  "HOLD — ROUTE/AUTH/GATE EXECUTION PRECONDITION INCOMPLETE",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — SECRET/PII RISK DETECTED",
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
  ok("fixture version is v14.3H", root.version === "v14.3H");

  const executionType = root.executionType as Record<string, unknown>;
  ok(
    "fixture execution flags stay non-runtime",
    executionType?.recordStaticOnly === true &&
      executionType?.runtimeExecutionStarted === false &&
      executionType?.geminiRun === false &&
      executionType?.oneRunClick === false &&
      executionType?.providerNetworkCall === false &&
      executionType?.providerTriggeringEndpointCall === false &&
      executionType?.retry === false &&
      executionType?.secondRun === false
  );

  const authSession = root.authSessionReadiness as Record<string, unknown>;
  ok(
    "fixture records auth hold status",
    authSession?.checkCommand === "npm run check:admin-token-session-env" &&
      authSession?.adminTokenPresence === "missing" &&
      authSession?.result === "hold" &&
      authSession?.tokenValueExposed === false
  );

  const oneRun = root.oneRunControlStateNow as Record<string, unknown>;
  ok(
    "fixture one-run state remains unconsumed",
    oneRun?.authorizedRunCount === 1 &&
      oneRun?.oneRunStarted === false &&
      oneRun?.oneRunConsumed === false &&
      oneRun?.runSessionLockedExpected === true &&
      oneRun?.retryUsed === false &&
      oneRun?.secondRunUsed === false
  );

  const anti = root.antiMisleadingStatusNow as Record<string, unknown>;
  ok(
    "fixture anti-misleading status now is all no",
    anti?.runtimeActionNow === false &&
      anti?.geminiRunNow === false &&
      anti?.oneRunStartedNow === false &&
      anti?.oneRunConsumedNow === false &&
      anti?.approvalConsumedNow === false &&
      anti?.providerCallNow === false &&
      anti?.retryAllowed === false &&
      anti?.secondRunAllowed === false &&
      anti?.pilotActiveNow === false &&
      anti?.publicActiveNow === false &&
      anti?.productionActiveNow === false &&
      anti?.realLeadPathActiveNow === false
  );

  const holdRules = root.holdRulesRequired as Record<string, unknown>;
  ok(
    "fixture hold rules include auth and control blockers",
    holdRules?.holdOnMissingOrInvalidAdminAuthSession === true &&
      holdRules?.holdOnOneRunLockCountAmbiguity === true &&
      holdRules?.holdOnRetrySecondRunPathOpen === true &&
      holdRules?.holdOnRouteAuthGateAmbiguity === true &&
      holdRules?.holdOnPublicProductionRealLeadRisk === true &&
      holdRules?.holdOnSecretPiiRisk === true &&
      holdRules?.holdOnTestFailure === true
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

console.log(`\nDone v14.3H execution record validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
