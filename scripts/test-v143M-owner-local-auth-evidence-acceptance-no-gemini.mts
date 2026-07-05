/**
 * v14.3M owner-local auth evidence acceptance validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3M
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3M-owner-local-auth-evidence-acceptance-no-gemini.md";
const FIXTURE_PATH = "docs/examples/v14.3M-owner-local-auth-evidence-acceptance.synthetic.json";
const V143J_DOC_PATH = "docs/v14.3J-admin-auth-session-ready-confirmation-no-gemini.md";
const TOKEN_CHECK_SCRIPT_PATH = "scripts/check-admin-token-session-env.mts";
const OWNER_EVIDENCE_PATH = "src/components/admin/ownerOneRunEvidence.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const SELF_PATH = "scripts/test-v143M-owner-local-auth-evidence-acceptance-no-gemini.mts";

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

console.log("=== v14.3M Owner-Local Auth Evidence Acceptance Validation ===\n");

ok("v14.3M doc exists", existsSync(DOC_PATH));
ok("v14.3M fixture exists", existsSync(FIXTURE_PATH));
ok("v14.3J doc exists", existsSync(V143J_DOC_PATH));
ok("token checker exists", existsSync(TOKEN_CHECK_SCRIPT_PATH));
ok("owner evidence model exists", existsSync(OWNER_EVIDENCE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const v143jDoc = read(V143J_DOC_PATH);
const tokenChecker = read(TOKEN_CHECK_SCRIPT_PATH);
const ownerEvidence = read(OWNER_EVIDENCE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 3800, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 2600, `${fixtureRaw.length} chars`);
ok("validator states static checks only", /Static checks only/i.test(self));

const requiredNoLines: Array<[string, RegExp]> = [
  ["runtime execution no", /runtime execution:\s*no/i],
  ["Gemini run no", /Gemini run:\s*no/i],
  ["one-run click no", /one-run click:\s*no/i],
  ["provider network call no", /provider network call:\s*no/i],
  ["provider endpoint no", /endpoint call that may trigger Gemini\/provider:\s*no/i],
  ["retry no", /retry:\s*no/i],
  ["second run no", /second run:\s*no/i],
  ["deploy no", /deploy:\s*no/i],
];
for (const [name, re] of requiredNoLines) {
  ok(`doc includes boundary line ${name}`, re.test(doc));
}

ok(
  "doc records owner-local ready evidence as masked-only",
  /Owner-reported command in local CMD/.test(doc) &&
    /NONGA_ADMIN_API_TOKEN:\s*present/.test(doc) &&
    /format:\s*valid/.test(doc) &&
    /token:\s*\*\*\*MASKED\*\*\*/.test(doc) &&
    /READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK/.test(doc)
);

ok(
  "doc records session mismatch diagnosis and non-invalid-token interpretation",
  /agent\/operator session token visibility:\s*`missing`/.test(doc) &&
    /root cause:\s*`env session\/process mismatch`/.test(doc) &&
    /token invalid:\s*`no evidence`/.test(doc) &&
    /owner-local CMD token readiness:\s*`ready`/.test(doc)
);

ok(
  "doc includes future execution model and fresh approval requirement",
  /run from owner-local CMD session where token is already present/.test(doc) &&
    /do not assume agent\/operator session inherits owner token/.test(doc) &&
    /fresh owner approval is required again immediately before real execution/.test(doc)
);

ok(
  "doc includes hold/ready meaning constraints",
  /READY may apply only to `owner-local auth evidence ready`/.test(doc) &&
    /not runtime approval/.test(doc) &&
    /does not consume authorization/.test(doc)
);

ok(
  "doc keeps one-run status unconsumed",
  /oneRunStarted=false/.test(doc) &&
    /oneRunConsumed=false/.test(doc) &&
    /retryUsed=false/.test(doc) &&
    /secondRunUsed=false/.test(doc)
);

const antiMisleadingLines = [
  "runtime action now: no",
  "Gemini/provider call now: no",
  "one-run execution now: no",
  "authorization consumed now: no",
  "retry allowed now: no",
  "second run allowed now: no",
];
for (const line of antiMisleadingLines) {
  ok(`doc includes anti-misleading line ${line}`, doc.includes(`- ${line}`));
}

ok(
  "cross-doc lineage keeps previous session-hold state",
  /HOLD — ADMIN AUTH SESSION STILL NOT READY/.test(v143jDoc) &&
    /NONGA_ADMIN_API_TOKEN:\s*missing/.test(v143jDoc)
);

ok(
  "token checker script still defines ready and hold outcomes safely",
  /Safe local-only check/.test(tokenChecker) &&
    /HOLD — NONGA_ADMIN_API_TOKEN missing in operator\/session env/.test(tokenChecker) &&
    /READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK — token present in session env/.test(tokenChecker)
);

ok(
  "owner evidence/panel preserve run lock and no-retry semantics",
  /runSessionLocked:\s*boolean;/.test(ownerEvidence) &&
    /noRetry=true/.test(ownerPanel) &&
    /noSecondRunWithoutFreshApproval=true/.test(ownerPanel)
);

const expectedFinalRecommendations = [
  "READY FOR v14.3N FRESH OWNER APPROVAL DECISION POINT — OWNER-LOCAL AUTH EVIDENCE READY, NO GEMINI UNTIL OWNER APPROVES",
  "HOLD — OWNER-LOCAL AUTH EVIDENCE INCOMPLETE",
  "HOLD — SESSION MISMATCH DIAGNOSIS INCOMPLETE",
  "HOLD — SECRET/TOKEN EXPOSURE RISK DETECTED",
  "HOLD — ONE-RUN CONSUMPTION AMBIGUITY",
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
  ok("fixture version is v14.3M", root.version === "v14.3M");

  const executionType = root.executionType as Record<string, unknown>;
  ok(
    "fixture execution type remains non-runtime and non-provider",
    executionType?.docsTestsFixturesStaticMockOnly === true &&
      executionType?.readOnlyInspectionOnly === true &&
      executionType?.runtimeExecution === false &&
      executionType?.geminiRun === false &&
      executionType?.oneRunClick === false &&
      executionType?.providerNetworkCall === false &&
      executionType?.providerTriggeringEndpointCall === false &&
      executionType?.retry === false &&
      executionType?.secondRun === false &&
      executionType?.deploy === false
  );

  const ownerLocal = root.ownerLocalAuthEvidence as Record<string, unknown>;
  ok(
    "fixture owner-local auth evidence is ready and masked",
    ownerLocal?.sourceSession === "owner-local-cmd" &&
      ownerLocal?.command === "npm run check:admin-token-session-env" &&
      ownerLocal?.adminTokenPresence === "present" &&
      ownerLocal?.format === "valid" &&
      ownerLocal?.tokenMasked === "***MASKED***" &&
      ownerLocal?.ownerLocalEvidenceReady === true
  );

  const mismatch = root.agentOperatorSessionDiagnosis as Record<string, unknown>;
  ok(
    "fixture records agent/operator mismatch diagnosis",
    mismatch?.agentOperatorSessionTokenVisibility === "missing" &&
      mismatch?.rootCause === "env session/process mismatch" &&
      mismatch?.tokenInvalidEvidence === false &&
      mismatch?.ownerLocalCmdTokenReadiness === "ready" &&
      mismatch?.sessionMismatchAccepted === true
  );

  const handling = root.tokenSecretHandling as Record<string, unknown>;
  ok(
    "fixture enforces token secrecy constraints",
    handling?.tokenValueExposure === false &&
      handling?.maskedOnlyReporting === true &&
      handling?.noTokenEchoInTerminal === true &&
      handling?.noTokenInDocsReportGit === true &&
      handling?.noTokenPersistenceInRepo === true
  );

  const future = root.futureExecutionModel as Record<string, unknown>;
  ok(
    "fixture sets safe future execution model",
    future?.futureExecutionMustRunFromOwnerLocalCmdWithTokenPresent === true &&
      future?.agentOperatorSessionNotAssumedToHaveToken === true &&
      future?.freshOwnerApprovalRequiredBeforeFutureExecution === true &&
      future?.noRuntimeExecutionInV143M === true
  );

  const holdReady = root.holdReadyRule as Record<string, unknown>;
  ok(
    "fixture hold/ready meaning prevents execution confusion",
    holdReady?.readyMeansOwnerLocalEvidenceOnly === true &&
      holdReady?.readyIsNotRuntimeApproval === true &&
      holdReady?.readyIsNotOneRunExecution === true &&
      holdReady?.authorizationConsumedNow === false
  );

  const oneRun = root.oneRunControlStatus as Record<string, unknown>;
  ok(
    "fixture keeps one-run status false and unconsumed",
    oneRun?.oneRunStarted === false &&
      oneRun?.oneRunConsumed === false &&
      oneRun?.retryUsed === false &&
      oneRun?.secondRunUsed === false
  );

  const anti = root.antiMisleadingStatusNow as Record<string, unknown>;
  ok(
    "fixture anti-misleading status all false",
    anti?.runtimeActionNow === false &&
      anti?.geminiProviderCallNow === false &&
      anti?.oneRunExecutionNow === false &&
      anti?.authorizationConsumedNow === false &&
      anti?.retryAllowedNow === false &&
      anti?.secondRunAllowedNow === false &&
      anti?.publicActiveNow === false &&
      anti?.productionActiveNow === false
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

console.log(`\nDone v14.3M owner-local auth evidence validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
