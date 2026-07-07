/**
 * v19.21 re-arm / command-target ambiguity resolution validator
 * Static checks only. No runtime/endpoint/provider execution path.
 *
 * npm run test:v19.21
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.21-rearm-command-target-ambiguity-resolution.md";
const EXAMPLE_PATH = "docs/examples/v19.21-rearm-command-target-ambiguity-resolution.example.md";
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

console.log("=== v19.21 Re-Arm / Command-Target Ambiguity Resolution Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.21 packet",
  doc.includes("# v19.21 - Re-Arm / Command-Target Ambiguity Resolution Packet") &&
    example.includes("milestone: v19.21") &&
    example.includes("packet_type: rearm_command_target_ambiguity_resolution")
);

ok(
  "v19.20 HOLD correctness is explicit",
  hasEveryLine(combined, [
    "HOLD — Step 1 owner-only staging one-run not executed in v19.20 due immediate-stop condition",
    "v19.20 HOLD was correct and fail-closed",
    "v19_20_hold_due_to_rearm_command_target_ambiguity: true",
  ])
);

ok(
  "no-execution and no-lock-mutation boundary exists",
  hasEveryLine(combined, [
    "no Step 1 execution",
    "no lock reset",
    "no lock deletion",
    "no lock mutation",
    "no lock re-arm",
    "no one-run",
    "no retry",
    "no second-run",
    "no endpoint call",
    "no provider/runtime/Gemini call",
    "no deploy",
  ])
);

ok(
  "depends on v19.18 v19.19 v19.20",
  hasEveryLine(combined, [
    "docs/v19.18-fresh-owner-boundary-changing-approval-step1-record.md",
    "PASS — v19.18 fresh owner boundary-changing approval recorded for Step 1 scope only",
    "docs/v19.19-step1-execution-request-single-run-gate-packet.md",
    "PASS — v19.19 Step 1 single-run gate packet closed",
    "docs/v19.20-step1-controlled-owner-only-staging-one-run-execution-record.md",
    "HOLD — Step 1 owner-only staging one-run not executed in v19.20 due immediate-stop condition",
  ])
);

ok(
  "required future scope is preserved exactly",
  hasEveryLine(combined, [
    "exactly one lock re-arm",
    "exactly one controlled owner-only staging one-run",
    "no retry",
    "no second-run",
    "owner-only",
    "staging-only",
    "no public",
    "no production",
    "no real dealer action",
    "no real lead",
    "no real customer data",
    "no token/secret/API key/platform auth credential/Authorization header exposure",
    "no PII/phone/plate/VIN exposure",
    "exactly_one_lock_rearm: true",
    "exactly_one_controlled_owner_only_staging_one_run: true",
  ])
);

ok(
  "ambiguity source is documented",
  hasEveryLine(combined, [
    "owner-local-one-run:v14.3U",
    ".nonga-owner-local-one-run-v143u.lock.json",
    "no explicit v19-safe re-arm helper command is published in `package.json`",
    "v19_specific_one_run_wrapper_alias_exists: false",
    "v19_specific_rearm_helper_exists: false",
  ])
);

ok(
  "safe resolution recommendation is documented",
  hasEveryLine(combined, [
    "a v19-specific wrapper alias is required before execution",
    "a v19-specific re-arm helper is required before execution",
    "require_v19_specific_wrapper_alias_before_execution: true",
    "require_v19_specific_rearm_helper_before_execution: true",
  ])
);

ok(
  "v19.21 is static/local only without runtime path",
  hasEveryLine(combined, [
    "STATIC/LOCAL RESOLUTION PACKET ONLY",
    "static inspection of docs/package/scripts/helpers only",
    "no lock mutation and no execution were performed in v19.21",
    "endpoint_provider_runtime_gemini_call_in_v1921: false",
  ])
);

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}

const scripts =
  packageParsed && typeof packageParsed === "object"
    ? ((packageParsed as { scripts?: Record<string, string> }).scripts ?? {})
    : {};

ok(
  "package has test:v19.21 script",
  scripts["test:v19.21"] === "tsx scripts/test-v1921-rearm-command-target-ambiguity-resolution.mts"
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
  ["quoted secret assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v19.21 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
