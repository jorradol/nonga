/**
 * v14.3AD lost owner output + wrong token incident validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3AD
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3AD-lost-owner-output-wrong-token-incident-record.md";
const FIXTURE_PATH = "docs/examples/v14.3AD-lost-owner-output-wrong-token.synthetic.json";
const PACKAGE_PATH = "package.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const CHECKER_PATH = "scripts/check-owner-firebase-token-session-env.mts";
const STATUS_CHECKER_PATH = "scripts/check-v143AC-owner-local-run-status.mts";

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

console.log("=== v14.3AD Lost Owner Output Incident Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("checker exists", existsSync(CHECKER_PATH));
ok("status checker exists", existsSync(STATUS_CHECKER_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const wrapper = read(WRAPPER_PATH);
const checker = read(CHECKER_PATH);
const statusChecker = read(STATUS_CHECKER_PATH);

ok(
  "doc contains required incident status and lost-output classification",
  /ownerLocalCommandStarted=true/.test(doc) &&
    /ownerLocalOutputCaptured=false/.test(doc) &&
    /wrongTokenTypeLikely=true/.test(doc) &&
    /provider\/Gemini status=unknown_from_output/.test(doc) &&
    /NEED REVIEW — OWNER-LOCAL USER-VISIBLE RUN OUTPUT LOST \/ WRONG TOKEN USED/.test(doc)
);

ok(
  "doc states no one-run retry second-run in this round",
  /one-run execution by agent: no/.test(doc) &&
    /retry by agent: no/.test(doc) &&
    /second run by agent: no/.test(doc)
);

ok(
  "doc captures wrong-token hold-before-provider analysis",
  /wrong-token path is expected to hold before provider call/i.test(doc) &&
    /providerCall=not_run/.test(doc) &&
    /Gemini\/runtime=not_run/.test(doc) &&
    /providerNetwork=not_run/.test(doc)
);

ok(
  "doc captures lock consume uncertainty due to lost output",
  /lock is consumed only after token \+ approval pass/i.test(doc) &&
    /consumed state is \*\*not confirmed\*\* until read-only local status check is run/i.test(
      doc
    )
);

ok(
  "doc final decision is read-only status check no one-run",
  /READY FOR OWNER READ-ONLY STATUS CHECK — NO ONE-RUN/.test(doc)
);

ok(
  "wrapper validates token before lock and keeps preflight not_run",
  /same-CMD Firebase ID token invalid-shape or unsafe/.test(wrapper) &&
    /resolveDispatchLockPathForApprovalTextOrHold/.test(wrapper) &&
    /const selectedLockPath = args\.dispatchApproved/.test(wrapper) &&
    /const lock = loadLock\(selectedLockPath\)/.test(wrapper) &&
    /consumeLockOrHold\(/.test(wrapper) &&
    /providerCall=not_run/.test(wrapper) &&
    /Gemini\/runtime=not_run/.test(wrapper) &&
    /providerNetwork=not_run/.test(wrapper)
);

ok(
  "wrapper blocks admin token contamination",
  /admin token must not be used for user-visible Firebase auth route/.test(wrapper)
);

ok(
  "checker validates firebase token shape with masked output",
  /jwtThreeSegments/.test(checker) &&
    /HOLD — Firebase ID token format invalid or unsafe/.test(checker) &&
    /token: \$\{result\.masked\}/.test(checker)
);

ok(
  "status checker is read-only and no provider/network/mutation",
  /read-only local status checker/i.test(statusChecker) &&
    /providerCall=not_run/.test(statusChecker) &&
    /providerNetwork=not_run/.test(statusChecker) &&
    /runtimeMutation=not_run/.test(statusChecker) &&
    /tokenExposure=masked-only/.test(statusChecker) &&
    !/writeFileSync/.test(statusChecker) &&
    !/fetch\s*\(/.test(statusChecker)
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.3AD", root.version === "v14.3AD");

  const incident = root.incident as Record<string, unknown>;
  ok(
    "fixture incident classification matches required",
    incident?.ownerLocalCommandStarted === true &&
      incident?.ownerLocalOutputCaptured === false &&
      incident?.wrongTokenTypeLikely === true &&
      incident?.retryAllowed === false &&
      incident?.secondRunAllowed === false &&
      incident?.providerGeminiStatus === "unknown_from_output"
  );

  const analysis = root.failClosedAnalysis as Record<string, unknown>;
  ok(
    "fixture fail-closed analysis captures provider not run",
    analysis?.wrongTokenInvalidShapeHoldsBeforeProviderCall === true &&
      analysis?.adminTokenMixedSessionHolds === true &&
      analysis?.providerDispatchPresentInWrapper === false &&
      analysis?.preflightOnlyProviderCallState === "not_run"
  );

  const lock = root.lockConsumeOrderAnalysis as Record<string, unknown>;
  ok(
    "fixture lock consume analysis captures not confirmed state",
    lock?.tokenValidationBeforeLockConsume === true &&
      lock?.approvalValidationBeforeLockConsume === true &&
      lock?.lostOutputMeansConsumedNotConfirmed === true
  );

  const recovery = root.recoveryChecker as Record<string, unknown>;
  ok(
    "fixture recovery checker remains read-only",
    recovery?.added === true &&
      recovery?.readOnly === true &&
      recovery?.printsRawToken === false &&
      recovery?.providerCall === false &&
      recovery?.providerNetwork === false &&
      recovery?.runtimeMutation === false &&
      recovery?.lockMutation === false
  );

  ok(
    "fixture final decision is ready for read-only status check",
    root.finalDecision === "READY FOR OWNER READ-ONLY STATUS CHECK — NO ONE-RUN"
  );
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
    "package has test:v14.3AD script",
    scripts["test:v14.3AD"] === "tsx scripts/test-v143AD-lost-owner-output-wrong-token.mts"
  );
  ok(
    "package has read-only status checker script",
    scripts["check:v14.3AC-owner-local-run-status"] ===
      "tsx scripts/check-v143AC-owner-local-run-status.mts"
  );
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v14.3AD incident validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
