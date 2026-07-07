/**
 * v19.24 step1 controlled owner-only staging execution via v19 wrapper record validator
 * Static checks only for docs/examples/package metadata.
 *
 * npm run test:v19.24
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v19.24-step1-controlled-owner-only-staging-execution-via-v19-wrapper-record.md";
const EXAMPLE_PATH =
  "docs/examples/v19.24-step1-controlled-owner-only-staging-execution-via-v19-wrapper-record.example.md";
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

console.log("=== v19.24 Step1 Execution via v19 Wrapper Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.24 execution record",
  doc.includes("# v19.24 - Step 1 Controlled Owner-Only Staging Execution via v19 Wrapper Record") &&
    example.includes("milestone: v19.24") &&
    example.includes("record_type: step1_controlled_owner_only_staging_execution_via_v19_wrapper_record")
);

ok(
  "preflight branch/head/origin/tree confirmations exist",
  hasEveryLine(combined, [
    "feature/chat-image-attachment-v1",
    "e8443b50c2f2973026db53205a467a8cb66caecd",
    "working tree before execution: clean",
    "branch_exact_match: true",
    "local_head_exact_match: true",
    "origin_head_exact_match: true",
    "working_tree_clean_before_execution: true",
  ])
);

ok(
  "dependency chain v19.18-v19.23 confirmations exist",
  hasEveryLine(combined, [
    "v19.18 approval confirmation",
    "v19.19 gate confirmation",
    "v19.20 HOLD confirmation",
    "v19.21 ambiguity-resolution confirmation",
    "v19.22 wrapper-preparation confirmation",
    "v19.23 readiness confirmation",
    "v19_18_approval_confirmed: true",
    "v19_19_gate_confirmed: true",
    "v19_20_hold_confirmed: true",
    "v19_21_resolution_confirmed: true",
    "v19_22_preparation_confirmed: true",
    "v19_23_readiness_confirmed: true",
  ])
);

ok(
  "preflight and dry-run checks are recorded",
  hasEveryLine(combined, [
    "npm run test:v19.18",
    "npm run test:v19.19",
    "npm run test:v19.20",
    "npm run test:v19.21",
    "npm run test:v19.22",
    "npm run test:v19.23",
    "npm run rearm:v19.22:dry-run",
    "npm run owner-local-one-run:v19.22:dry-run",
  ])
);

ok(
  "v19 re-arm helper and wrapper command evidence exists",
  hasEveryLine(combined, [
    "scripts/rearm-owner-local-step1-one-run-v19.mts",
    "scripts/owner-local-step1-one-run-v19.mts",
    "npx tsx scripts/rearm-owner-local-step1-one-run-v19.mts --rearm-approved-v19-step1 --allow-live-rearm",
    "live_rearm_path_disabled_in_v1922_preparation_packet",
  ])
);

ok(
  "lock state before rearm and no mutation outcome exists",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "\"consumed\": true",
    "runtime_adapter_entry_started",
    "exactly one lock re-arm mutation happened: no",
    "exactly_one_lock_rearm_mutation_happened: false",
  ])
);

ok(
  "one-run was not executed and result is HOLD",
  hasEveryLine(combined, [
    "one-run via wrapper did not start because re-arm was not successful",
    "one-run executed: no",
    "one_run_result: HOLD",
    "exactly_one_owner_only_staging_one_run_happened: false",
  ])
);

ok(
  "explicit no retry second-run deploy public production real action confirmations exist",
  hasEveryLine(combined, [
    "no retry: confirmed",
    "no second-run: confirmed",
    "no deploy: confirmed",
    "no public: confirmed",
    "no production: confirmed",
    "no real dealer action: confirmed",
    "no real lead: confirmed",
    "retry_performed: false",
    "second_run_performed: false",
    "deploy_performed: false",
    "public_or_production_activated: false",
    "real_dealer_or_real_lead_action_performed: false",
  ])
);

ok(
  "future scope unchanged exists",
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
    "no Thor real import",
    "no dealer real inventory import",
    "no token/secret/API key/platform auth credential/Authorization header exposure",
    "no PII/phone/plate/VIN exposure",
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
  "package has test:v19.24 script",
  scripts["test:v19.24"] ===
    "tsx scripts/test-v1924-step1-controlled-owner-only-staging-execution-via-v19-wrapper-record.mts"
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

console.log(`\nDone v19.24 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
