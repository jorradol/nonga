/**
 * v14.3Y runtime execution adapter disabled diagnosis validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3Y
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3Y-runtime-execution-adapter-disabled-diagnosis.md";
const FIXTURE_PATH = "docs/examples/v14.3Y-runtime-execution-adapter-disabled.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-one-run-gate-v143u.mts";
const PACKAGE_PATH = "package.json";
const GITIGNORE_PATH = ".gitignore";

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

console.log("=== v14.3Y Runtime Adapter Disabled Diagnosis Validation ===\n");

ok("v14.3Y doc exists", existsSync(DOC_PATH));
ok("v14.3Y fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));
ok("gitignore exists", existsSync(GITIGNORE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const packageRaw = read(PACKAGE_PATH);
const gitignore = read(GITIGNORE_PATH);

ok(
  "doc includes root cause and exact source",
  /Exact disabled adapter source/i.test(doc) &&
    /scripts\/owner-local-one-run-gate-v143u\.mts/.test(doc) &&
    /intentional placeholder policy/i.test(doc)
);
ok(
  "doc confirms patched controlled enablement",
  /Controlled enablement decision[\s\S]*`patched`/.test(doc) &&
    /runControlledRuntimeAdapter/.test(doc) &&
    /consumeLockOrHold/.test(doc)
);
ok(
  "doc includes no-run and no-retry confirmation",
  /one-run command executed by agent: no/.test(doc) &&
    /retry attempted by agent: no/.test(doc) &&
    /second run attempted by agent: no/.test(doc)
);
ok(
  "doc includes ready-for-v14.3Z final decision",
  /READY FOR v14\.3Z FRESH OWNER APPROVAL \+ OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN/.test(doc)
);

ok(
  "wrapper removes legacy v14.3T disabled hard-stop message",
  !/runtime execution adapter is disabled in v14\.3T packet/.test(wrapper)
);
ok(
  "wrapper has exact-command and strict gate checks",
  /unexpected arguments detected; exact command only/.test(wrapper) &&
    /if \(args\.unknownArgs\.length > 0\) hold/.test(wrapper) &&
    /if \(!args\.executeApproved\)/.test(wrapper)
);
ok(
  "wrapper includes controlled adapter entry and lock consume",
  /function consumeLockOrHold/.test(wrapper) &&
    /function runControlledRuntimeAdapter/.test(wrapper) &&
    /runtimeAdapter=entered/.test(wrapper) &&
    /providerCall=not_run/.test(wrapper) &&
    /providerNetwork=not_run/.test(wrapper)
);
ok(
  "wrapper preserves core gates and masked token contract",
  /same-CMD token missing/.test(wrapper) &&
    /fresh owner approval text mismatch/.test(wrapper) &&
    /one-run already consumed \(retry\/second-run blocked\)/.test(wrapper) &&
    /token: \*\*\*MASKED\*\*\*/.test(wrapper)
);
ok(
  "wrapper has no provider network call code",
  !/fetch\s*\(/.test(wrapper) && !/https?:\/\//.test(wrapper)
);
ok(
  "gitignore contains local approval and lock artifacts",
  /^v14\.\*-local-approval\.txt$/m.test(gitignore) &&
    /^\.nonga-owner-local-one-run-v143u\.lock\.json$/m.test(gitignore)
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
  ok("fixture version is v14.3Y", root.version === "v14.3Y");

  const source = root.disabledAdapterSource as Record<string, unknown>;
  ok(
    "fixture records disabled source and unreachable path before patch",
    source?.sourceFile === "scripts/owner-local-one-run-gate-v143u.mts" &&
      source?.sourceBranchType === "intentional_hard_stop_placeholder" &&
      source?.adapterReachableBeforePatch === false
  );

  const patch = root.controlledEnablementPatch as Record<string, unknown>;
  ok(
    "fixture records controlled patch behavior",
    patch?.patched === true &&
      patch?.exactArgsOnlyGuard === true &&
      patch?.sameCmdTokenRequired === true &&
      patch?.executeApprovedRequired === true &&
      patch?.freshApprovalExactMatchRequired === true &&
      patch?.runtimeAdapterEntrypointAdded === true &&
      patch?.providerCallByAdapter === "not_run"
  );

  const agentPolicy = root.agentExecutionPolicy as Record<string, unknown>;
  ok(
    "fixture confirms agent no-run boundary",
    agentPolicy?.agentRanOneRun === false &&
      agentPolicy?.agentRetry === false &&
      agentPolicy?.agentSecondRun === false &&
      agentPolicy?.agentProviderCall === false &&
      agentPolicy?.agentGeminiCall === false
  );

  const finalEnum = Array.isArray(root.finalDecisionEnum) ? root.finalDecisionEnum : [];
  ok(
    "fixture includes ready final decision enum",
    finalEnum.includes("READY FOR v14.3Z FRESH OWNER APPROVAL + OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN")
  );
  ok(
    "fixture final decision is ready for v14.3Z",
    root.finalDecision === "READY FOR v14.3Z FRESH OWNER APPROVAL + OWNER-LOCAL SAME-CMD EXACTLY-ONE-RUN"
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
    "package has test:v14.3Y script",
    scripts["test:v14.3Y"] === "tsx scripts/test-v143Y-runtime-execution-adapter-disabled.mts"
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

console.log(`\nDone v14.3Y diagnosis validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
