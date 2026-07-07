/**
 * v19.22 v19-specific re-arm and one-run wrapper preparation validator
 * Static checks only. No runtime/provider/endpoint execution.
 *
 * npm run test:v19.22
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.22-v19-specific-rearm-and-one-run-wrapper-preparation.md";
const EXAMPLE_PATH =
  "docs/examples/v19.22-v19-specific-rearm-and-one-run-wrapper-preparation.example.md";
const WRAPPER_PATH = "scripts/owner-local-step1-one-run-v19.mts";
const REARM_HELPER_PATH = "scripts/rearm-owner-local-step1-one-run-v19.mts";
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

console.log("=== v19.22 Wrapper Preparation Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("rearm helper exists", existsSync(REARM_HELPER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const wrapper = read(WRAPPER_PATH);
const rearmHelper = read(REARM_HELPER_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.22 packet",
  doc.includes("# v19.22 - v19-Specific Re-Arm and One-Run Wrapper Preparation") &&
    example.includes("milestone: v19.22") &&
    example.includes("packet_type: v19_specific_rearm_and_one_run_wrapper_preparation")
);

ok(
  "v19.22 doc has no-execution and no-lock-mutation statements",
  hasEveryLine(combined, [
    "no Step 1 execution in v19.22",
    "Step 1 execution in v19.22: no",
    "one-run in v19.22: no",
    "lock reset in v19.22: no",
    "lock re-arm in v19.22: no",
    "lock mutation in v19.22: no",
    "lock deletion in v19.22: no",
    "dry-run/preflight only was used: yes",
  ])
);

ok(
  "depends on v19.18 v19.19 v19.20 v19.21",
  hasEveryLine(combined, [
    "docs/v19.18-fresh-owner-boundary-changing-approval-step1-record.md",
    "docs/v19.19-step1-execution-request-single-run-gate-packet.md",
    "docs/v19.20-step1-controlled-owner-only-staging-one-run-execution-record.md",
    "docs/v19.21-rearm-command-target-ambiguity-resolution.md",
    "v19_18_record_exists_and_exact: true",
    "v19_19_gate_exists_and_passed: true",
    "v19_20_hold_record_exists_and_step1_not_executed: true",
    "v19_21_resolution_exists_and_passed: true",
  ])
);

ok(
  "v19-specific wrapper and rearm helper names documented",
  hasEveryLine(combined, [
    "scripts/owner-local-step1-one-run-v19.mts",
    "scripts/rearm-owner-local-step1-one-run-v19.mts",
    "one_run_wrapper_file: scripts/owner-local-step1-one-run-v19.mts",
    "rearm_helper_file: scripts/rearm-owner-local-step1-one-run-v19.mts",
  ])
);

ok(
  "future scope preserves exactly one rearm and one one-run",
  hasEveryLine(combined, [
    "exactly one lock re-arm",
    "exactly one controlled owner-only staging one-run",
    "exactly_one_lock_rearm: true",
    "exactly_one_controlled_owner_only_staging_one_run: true",
  ])
);

ok(
  "future scope preserves no-retry and no-second-run",
  hasEveryLine(combined, [
    "no retry",
    "no second-run",
    "no_retry: true",
    "no_second_run: true",
  ])
);

ok(
  "future scope preserves no public production dealer lead",
  hasEveryLine(combined, [
    "no public",
    "no production",
    "no real dealer action",
    "no real lead",
    "no_public: true",
    "no_production: true",
    "no_real_dealer_action: true",
    "no_real_lead: true",
  ])
);

ok(
  "wrapper is fail-closed and supports dry-run",
  hasEveryLine(wrapper, [
    "Fail-closed by default; dry-run/preflight only unless explicit flags are provided.",
    "if (!args.executeApprovedV19Step1)",
    "PASS — v19 wrapper dry-run/preflight completed (no execution)",
    "--allow-live-execution",
    "owner-local-one-run-gate-v143u.mts",
  ])
);

ok(
  "rearm helper is fail-closed and live path disabled",
  hasEveryLine(rearmHelper, [
    "Fail-closed by default. Dry-run/static diagnostics only in v19.22.",
    "PASS — v19 re-arm helper dry-run only (no lock mutation)",
    "--rearm-approved-v19-step1",
    "--allow-live-rearm",
    "live re-arm path disabled in v19.22 preparation packet",
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

ok("package has preflight:v19.22", typeof scripts["preflight:v19.22"] === "string");
ok(
  "package has rearm:v19.22:dry-run",
  scripts["rearm:v19.22:dry-run"] === "tsx scripts/rearm-owner-local-step1-one-run-v19.mts --dry-run"
);
ok(
  "package has owner-local-one-run:v19.22:dry-run",
  scripts["owner-local-one-run:v19.22:dry-run"] ===
    "tsx scripts/owner-local-step1-one-run-v19.mts --preflight"
);
ok(
  "package has test:v19.22",
  scripts["test:v19.22"] ===
    "tsx scripts/test-v1922-v19-specific-rearm-and-one-run-wrapper-preparation.mts"
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

console.log(`\nDone v19.22 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
