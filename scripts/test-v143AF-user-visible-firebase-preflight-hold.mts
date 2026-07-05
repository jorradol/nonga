/**
 * v14.3AF user-visible Firebase preflight HOLD + dispatch readiness validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3AF
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3AF-user-visible-firebase-preflight-hold-record.md";
const FIXTURE_PATH =
  "docs/examples/v14.3AF-user-visible-firebase-preflight-hold.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const STATUS_CHECKER_PATH = "scripts/check-v143AC-owner-local-run-status.mts";
const SERVER_AUTH_PATH = "src/server/serverAuthContext.ts";
const BRIDGE_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const REAL_PROVIDER_PATH = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const SERVER_PATH = "server.ts";
const GITIGNORE_PATH = ".gitignore";
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

console.log("=== v14.3AF User-Visible Preflight HOLD Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("status checker exists", existsSync(STATUS_CHECKER_PATH));
ok("server auth exists", existsSync(SERVER_AUTH_PATH));
ok("bridge exists", existsSync(BRIDGE_PATH));
ok("real provider exists", existsSync(REAL_PROVIDER_PATH));
ok("server.ts exists", existsSync(SERVER_PATH));
ok("gitignore exists", existsSync(GITIGNORE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const statusChecker = read(STATUS_CHECKER_PATH);
const serverAuth = read(SERVER_AUTH_PATH);
const bridge = read(BRIDGE_PATH);
const realProvider = read(REAL_PROVIDER_PATH);
const serverTs = read(SERVER_PATH);
const gitignore = read(GITIGNORE_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states static diagnosis/readiness with no-run boundaries",
  /docs\/tests\/fixtures\/static diagnosis \+ controlled provider-dispatch readiness prep only/i.test(
    doc
  ) &&
    /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second run by agent: no/i.test(doc) &&
    /provider\/Gemini\/runtime call by agent: no/i.test(doc)
);

ok(
  "doc records owner preflight HOLD and not_run evidence",
  /runtimeAdapterPolicy=user-visible-firebase-auth-preflight/.test(doc) &&
    /providerCall=not_run/.test(doc) &&
    /Gemini\/runtime=not_run/.test(doc) &&
    /providerNetwork=not_run/.test(doc) &&
    /HOLD — user-visible Firebase auth adapter reached controlled preflight/.test(doc)
);

ok(
  "doc identifies exact HOLD source and intentional fail-closed",
  /file: `scripts\/owner-local-user-visible-one-run-gate-v143ac\.mts`/.test(doc) &&
    /function: `runControlledRuntimeAdapterPreflight\(\)`/.test(doc) &&
    /intentional fail-closed/i.test(doc)
);

ok(
  "doc selects Level 2 dispatch readiness",
  /Level 2 — controlled dispatch patch prepared/.test(doc) &&
    /READY FOR v14\.3AG FRESH OWNER APPROVAL \+ USER-VISIBLE FIREBASE DISPATCH ONE-RUN/.test(
      doc
    )
);

ok(
  "wrapper retains preflight source and adds dispatch readiness gates",
  /runControlledRuntimeAdapterPreflight/.test(wrapper) &&
    /runtimeAdapterPolicy=user-visible-firebase-auth-preflight/.test(wrapper) &&
    /--dispatch-approved/.test(wrapper) &&
    /REQUIRED_DISPATCH_APPROVAL_TEXT/.test(wrapper) &&
    /DISPATCH_LOCK_PATH/.test(wrapper)
);

ok(
  "wrapper uses fixed target path and bearer dispatch without token logging",
  /const TARGET_PATH = "\/api\/ai\/chat-user-visible-orchestrate";/.test(wrapper) &&
    /const TARGET_ORIGIN = "https:\/\/a\.nongbot\.org";/.test(wrapper) &&
    /Authorization: `Bearer \$\{firebaseIdToken\}`/.test(wrapper) &&
    !/console\.log\([^)]*firebaseIdToken/.test(wrapper) &&
    !/console\.log\([^)]*Bearer/.test(wrapper)
);

ok(
  "wrapper requires guarded evidence and fails closed",
  /real_provider_call_ok/.test(wrapper) &&
    /dispatch response missing required guarded runtime evidence/.test(wrapper) &&
    /allowlistMatch/.test(wrapper) &&
    /userVisibleEnabled/.test(wrapper) &&
    /guardPolicyVersion=present/.test(wrapper) &&
    /leadPiiCueGuardActive=true/.test(wrapper)
);

ok(
  "status checker remains read-only not_run",
  /providerCall=not_run/.test(statusChecker) &&
    /providerNetwork=not_run/.test(statusChecker) &&
    /runtimeMutation=not_run/.test(statusChecker) &&
    !/writeFileSync/.test(statusChecker)
);

ok(
  "provider path mapping is present in source",
  /SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE =\s*"\/api\/ai\/chat-user-visible-orchestrate"/.test(
    bridge
  ) &&
    /getServerAuthContext\(req\)/.test(bridge) &&
    /registerSalesBrainUserVisibleOrchestrationBridgeRoutes/.test(serverTs) &&
    /real_provider_call_ok/.test(realProvider)
);

ok(
  "server auth requires Authorization Bearer token",
  /extractAuthorizationBearer/.test(serverAuth) &&
    /Missing Firebase ID token/.test(serverAuth) &&
    /auth\.startsWith\("Bearer "\)/.test(serverAuth)
);

ok(
  "gitignore covers v143ag dispatch lock",
  /\.nonga-owner-local-one-run-v143ag-user-visible-dispatch\.lock\.json/.test(gitignore)
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
  ok("fixture version is v14.3AF", root.version === "v14.3AF");

  const gate0 = root.gate0RepoSanity as Record<string, unknown>;
  ok(
    "fixture gate0 records clean synchronized repo",
    gate0?.branch === "feature/chat-image-attachment-v1" &&
      gate0?.localHead === "6e0256a92267f06b541faa62283a0c81408d0572" &&
      gate0?.originHead === "6e0256a92267f06b541faa62283a0c81408d0572" &&
      gate0?.localEqualsOrigin === true &&
      gate0?.workingTreeClean === true &&
      gate0?.decision === "PASS"
  );

  const diagnosis = root.diagnosis as Record<string, unknown>;
  ok(
    "fixture captures exact preflight hold source",
    diagnosis?.preflightHoldSourceFile ===
      "scripts/owner-local-user-visible-one-run-gate-v143ac.mts" &&
      diagnosis?.preflightHoldFunction === "runControlledRuntimeAdapterPreflight" &&
      diagnosis?.preflightHoldIsIntentionalFailClosed === true
  );

  const readiness = root.dispatchReadinessDecision as Record<string, unknown>;
  ok(
    "fixture dispatch readiness is Level 2 prepared-only",
    readiness?.level === "Level 2" &&
      readiness?.patchPreparedOnly === true &&
      readiness?.executedByAgent === false
  );

  const contract = root.dispatchPatchContract as Record<string, unknown>;
  ok(
    "fixture contract includes fixed path and fail-closed controls",
    contract?.requiresExecuteApproved === true &&
      contract?.requiresDispatchApprovedFlag === true &&
      contract?.fixedTargetPathOnly === true &&
      contract?.manualEndpointOverride === false &&
      contract?.failClosedOnMissingEvidence === true
  );

  const expected = root.expectedDispatchEvidence as Record<string, unknown>;
  ok(
    "fixture expected dispatch evidence includes guard diagnostics",
    expected?.providerCall === "run" &&
      expected?.gateReason === "real_provider_call_ok" &&
      expected?.pilotPathActive === true &&
      expected?.allowlistMatch === true &&
      expected?.userVisibleEnabled === true &&
      expected?.guardPolicyVersion === "present" &&
      expected?.leadPiiCueGuardActive === true &&
      expected?.phoneEchoGuardActive === true &&
      expected?.safeConfirmationStepWordingActive === true
  );

  ok(
    "fixture final decision is ready for v14.3AG dispatch one-run",
    root.finalDecision ===
      "READY FOR v14.3AG FRESH OWNER APPROVAL + USER-VISIBLE FIREBASE DISPATCH ONE-RUN"
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
    "package has test:v14.3AF script",
    scripts["test:v14.3AF"] ===
      "tsx scripts/test-v143AF-user-visible-firebase-preflight-hold.mts"
  );
}

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v14.3AF preflight hold validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
