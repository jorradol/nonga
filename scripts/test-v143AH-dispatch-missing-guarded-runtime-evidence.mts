/**
 * v14.3AH dispatch missing guarded runtime evidence diagnosis validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3AH
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3AH-dispatch-missing-guarded-runtime-evidence-diagnosis.md";
const FIXTURE_PATH =
  "docs/examples/v14.3AH-dispatch-missing-guarded-runtime-evidence.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const BRIDGE_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const REAL_PROVIDER_PATH = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const STATUS_CHECKER_PATH = "scripts/check-v143AC-owner-local-run-status.mts";
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

console.log("=== v14.3AH Dispatch Evidence Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("bridge exists", existsSync(BRIDGE_PATH));
ok("real provider exists", existsSync(REAL_PROVIDER_PATH));
ok("status checker exists", existsSync(STATUS_CHECKER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const bridge = read(BRIDGE_PATH);
const realProvider = read(REAL_PROVIDER_PATH);
const statusChecker = read(STATUS_CHECKER_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states diagnosis-only execution and no-run policy",
  /docs\/tests\/fixtures\/static diagnosis \+ safe wrapper\/response evidence inspection only/i.test(
    doc
  ) &&
    /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second run by agent: no/i.test(doc) &&
    /provider\/Gemini\/runtime call by agent: no/i.test(doc)
);

ok(
  "doc records v14.3AG owner dispatch hold and node assertion",
  /runtimeAdapterPolicy=user-visible-firebase-auth-dispatch-v143ag/.test(doc) &&
    /HOLD — dispatch response missing required guarded runtime evidence/.test(doc) &&
    /Assertion failed: !\(handle->flags & UV_HANDLE_CLOSING\)/.test(doc)
);

ok(
  "wrapper has new dispatch status and missing-evidence diagnostics",
  /dispatchHttpStatus=/.test(wrapper) &&
    /dispatchResponseContentType=/.test(wrapper) &&
    /dispatchResponseBodyChars=/.test(wrapper) &&
    /dispatchEvidenceGateReason=/.test(wrapper) &&
    /dispatchEvidenceMissingFields=/.test(wrapper)
);

ok(
  "wrapper keeps strict guarded evidence gate fail-closed",
  /dispatch response missing required guarded runtime evidence/.test(wrapper) &&
    /real_provider_call_ok/.test(wrapper) &&
    /leadPiiCueGuardActive/.test(wrapper) &&
    /phoneEchoGuardActive/.test(wrapper) &&
    /safeConfirmationStepWordingActive/.test(wrapper)
);

ok(
  "wrapper uses non-abrupt hold path without direct process.exit",
  /class HoldError/.test(wrapper) &&
    /process\.exitCode = exitCode;/.test(wrapper) &&
    !/process\.exit\(/.test(wrapper)
);

ok(
  "bridge and provider still expose expected evidence schema paths",
  /userVisibleGateDiagnostic/.test(bridge) &&
    /userVisibleRuntimeDiagnostic/.test(bridge) &&
    /realProviderNetwork/.test(bridge) &&
    /real_provider_call_ok/.test(realProvider)
);

ok(
  "status checker remains read-only not_run",
  /providerCall=not_run/.test(statusChecker) &&
    /providerNetwork=not_run/.test(statusChecker) &&
    /runtimeMutation=not_run/.test(statusChecker) &&
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
  ok("fixture version is v14.3AH", root.version === "v14.3AH");

  const gate0 = root.gate0RepoSanity as Record<string, unknown>;
  ok(
    "fixture gate0 matches expected ready state",
    gate0?.branch === "feature/chat-image-attachment-v1" &&
      gate0?.localHead === "336f7d8f9140179d219a6086f71672346d4e7a9d" &&
      gate0?.originHead === "336f7d8f9140179d219a6086f71672346d4e7a9d" &&
      gate0?.localEqualsOrigin === true &&
      gate0?.workingTreeClean === true &&
      gate0?.decision === "PASS"
  );

  const patch = root.v143AHPatch as Record<string, unknown>;
  ok(
    "fixture captures diagnostics/extractor/cleanup hardening",
    patch?.wrapperDiagnosticsAdded === true &&
      patch?.extractorConservativeFallbackAdded === true &&
      patch?.nodeAsyncCleanupHardened === true &&
      patch?.passCriteriaRelaxed === false
  );

  ok(
    "fixture final decision is ready for v14.3AI owner rerun",
    root.finalDecision ===
      "READY FOR v14.3AI FRESH OWNER APPROVAL + USER-VISIBLE FIREBASE DISPATCH ONE-RUN"
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
    "package has test:v14.3AH script",
    scripts["test:v14.3AH"] ===
      "tsx scripts/test-v143AH-dispatch-missing-guarded-runtime-evidence.mts"
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

console.log(`\nDone v14.3AH diagnosis validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
