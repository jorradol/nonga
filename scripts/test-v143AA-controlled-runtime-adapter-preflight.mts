/**
 * v14.3AA controlled runtime adapter preflight diagnosis validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3AA
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3AA-controlled-runtime-adapter-preflight-diagnosis.md";
const FIXTURE_PATH = "docs/examples/v14.3AA-controlled-runtime-adapter-preflight.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-one-run-gate-v143u.mts";
const PACKAGE_PATH = "package.json";
const AUTH_CHECKER_PATH = "scripts/check-admin-token-session-env.mts";
const AUTH_CONTEXT_PATH = "src/server/serverAuthContext.ts";
const ADMIN_SHADOW_PATH = "src/services/ai/salesBrainServerShadowSmoke.ts";
const USER_VISIBLE_BRIDGE_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

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

console.log("=== v14.3AA Controlled Runtime Adapter Preflight Validation ===\n");

ok("v14.3AA doc exists", existsSync(DOC_PATH));
ok("v14.3AA fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("auth checker exists", existsSync(AUTH_CHECKER_PATH));
ok("server auth context exists", existsSync(AUTH_CONTEXT_PATH));
ok("admin shadow file exists", existsSync(ADMIN_SHADOW_PATH));
ok("user-visible bridge file exists", existsSync(USER_VISIBLE_BRIDGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const packageRaw = read(PACKAGE_PATH);
const authChecker = read(AUTH_CHECKER_PATH);
const authContext = read(AUTH_CONTEXT_PATH);
const adminShadow = read(ADMIN_SHADOW_PATH);
const userVisibleBridge = read(USER_VISIBLE_BRIDGE_PATH);

ok(
  "doc includes owner provided preflight hold snapshot",
  /runtimeAdapter=entered/.test(doc) &&
    /runtimeAdapterPolicy=staging-owner-only-preflight/.test(doc) &&
    /providerCall=not_run/.test(doc) &&
    /Gemini\/runtime=not_run/.test(doc) &&
    /providerNetwork=not_run/.test(doc) &&
    /HOLD — runtime adapter reached under controlled preflight/.test(doc)
);
ok(
  "doc identifies exact preflight hold source function",
  /scripts\/owner-local-one-run-gate-v143u\.mts/.test(doc) &&
    /runControlledRuntimeAdapter/.test(doc) &&
    /intentional preflight stop/i.test(doc)
);
ok(
  "doc maps both existing provider paths",
  /\/api\/admin\/sales-brain-shadow-smoke/.test(doc) &&
    /\/api\/ai\/chat-user-visible-orchestrate/.test(doc) &&
    /auth-model mismatch/i.test(doc)
);
ok(
  "doc final decision is need review safely mapped",
  /NEED REVIEW — EXISTING PROVIDER PATH NOT SAFELY MAPPED/.test(doc)
);
ok(
  "doc confirms no run no retry no second run",
  /one-run command executed by agent: no/.test(doc) &&
    /retry attempted by agent: no/.test(doc) &&
    /second run attempted by agent: no/.test(doc)
);

ok(
  "wrapper still reports controlled preflight hold markers",
  /runtimeAdapter=entered/.test(wrapper) &&
    /runtimeAdapterPolicy=staging-owner-only-preflight/.test(wrapper) &&
    /providerCall=not_run/.test(wrapper) &&
    /Gemini\/runtime=not_run/.test(wrapper) &&
    /providerNetwork=not_run/.test(wrapper) &&
    /runtime adapter reached under controlled preflight/.test(wrapper)
);
ok(
  "wrapper remains strict fail-closed and exact command only",
  /unexpected arguments detected; exact command only/.test(wrapper) &&
    /same-CMD token missing/.test(wrapper) &&
    /fresh owner approval text mismatch/.test(wrapper) &&
    /one-run already consumed \(retry\/second-run blocked\)/.test(wrapper)
);
ok(
  "wrapper has no direct provider network call code",
  !/fetch\s*\(/.test(wrapper) && !/https?:\/\//.test(wrapper)
);

ok(
  "auth checker validates NONGA_ADMIN_API_TOKEN model",
  /NONGA_ADMIN_API_TOKEN/.test(authChecker) &&
    /startsWithBearerPrefix/.test(authChecker) &&
    /READY FOR ADMIN AUTH NON-GEMINI LIVE RECHECK/.test(authChecker)
);
ok(
  "user-visible route requires firebase id token path",
  /Missing Firebase ID token/.test(authContext) &&
    /verifyFirebaseIdToken/.test(authContext) &&
    /getServerAuthContext/.test(userVisibleBridge)
);
ok(
  "admin shadow route exists as admin-token-compatible path",
  /SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE/.test(adminShadow) &&
    /real_provider_call_ok/.test(adminShadow)
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
  ok("fixture version is v14.3AA", root.version === "v14.3AA");

  const baseline = root.baselineBeforeWork as Record<string, unknown>;
  ok(
    "fixture baseline matches expected starting point",
    baseline?.branch === "feature/chat-image-attachment-v1" &&
      baseline?.localHead === "835f49c1e0306e554237dbad4b1dad860097bd86" &&
      baseline?.originHead === "835f49c1e0306e554237dbad4b1dad860097bd86" &&
      baseline?.localEqualsOrigin === true &&
      baseline?.workingTreeClean === true
  );

  const hold = root.preflightHoldSource as Record<string, unknown>;
  ok(
    "fixture records intentional preflight stop source",
    hold?.sourceFile === "scripts/owner-local-one-run-gate-v143u.mts" &&
      hold?.sourceFunction === "runControlledRuntimeAdapter" &&
      hold?.sourcePolicy === "staging-owner-only-preflight" &&
      hold?.intentionalPreflightStop === true &&
      hold?.missingImplementation === false
  );

  const mapping = root.providerPathMapping as Record<string, unknown>;
  const adminRoute = mapping?.adminShadowRoute as Record<string, unknown>;
  const userRoute = mapping?.userVisibleRoute as Record<string, unknown>;
  ok(
    "fixture records provider path mapping and mismatch",
    adminRoute?.route === "/api/admin/sales-brain-shadow-smoke" &&
      adminRoute?.tokenModel === "NONGA_ADMIN_API_TOKEN" &&
      adminRoute?.realProviderCapable === true &&
      userRoute?.route === "/api/ai/chat-user-visible-orchestrate" &&
      userRoute?.tokenModel === "Firebase ID token" &&
      userRoute?.realProviderCapable === true &&
      userRoute?.hasPilotMarkers === true &&
      mapping?.authModelMismatchDetected === true
  );

  const decision = root.controlledProviderPathDecision as Record<string, unknown>;
  ok(
    "fixture decision is not patched due to risk",
    decision?.patched === false &&
      decision?.decision === "not_patched_due_to_auth_path_ambiguity_risk" &&
      decision?.safeMappingConfirmed === false
  );

  const policy = root.agentExecutionPolicy as Record<string, unknown>;
  ok(
    "fixture confirms no-run boundaries by agent",
    policy?.agentRanOneRun === false &&
      policy?.agentRetry === false &&
      policy?.agentSecondRun === false &&
      policy?.agentProviderCall === false &&
      policy?.agentGeminiCall === false
  );

  const finalEnum = Array.isArray(root.finalDecisionEnum) ? root.finalDecisionEnum : [];
  ok(
    "fixture includes required safe mapping review decision",
    finalEnum.includes("NEED REVIEW — EXISTING PROVIDER PATH NOT SAFELY MAPPED")
  );
  ok(
    "fixture final decision is need review mapping",
    root.finalDecision === "NEED REVIEW — EXISTING PROVIDER PATH NOT SAFELY MAPPED"
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
    "package has test:v14.3AA script",
    scripts["test:v14.3AA"] === "tsx scripts/test-v143AA-controlled-runtime-adapter-preflight.mts"
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

console.log(`\nDone v14.3AA controlled preflight validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
