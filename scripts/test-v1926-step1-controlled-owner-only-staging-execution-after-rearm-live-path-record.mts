/**
 * v19.26 step1 controlled owner-only staging execution after rearm live-path record validator
 * Static checks only for docs/examples/package metadata.
 *
 * npm run test:v19.26
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v19.26-step1-controlled-owner-only-staging-execution-after-rearm-live-path-record.md";
const EXAMPLE_PATH =
  "docs/examples/v19.26-step1-controlled-owner-only-staging-execution-after-rearm-live-path-record.example.md";
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

console.log("=== v19.26 Step1 After Rearm Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.26 execution record",
  doc.includes("# v19.26 - Step 1 Controlled Owner-Only Staging Execution After Re-Arm Live-Path Record") &&
    example.includes("milestone: v19.26") &&
    example.includes("record_type: step1_controlled_owner_only_staging_execution_after_rearm_live_path_record")
);

ok(
  "preflight branch/head/origin/tree confirmations exist",
  hasEveryLine(combined, [
    "feature/chat-image-attachment-v1",
    "f8518c0",
    "working tree before execution: clean",
    "branch_exact_match: true",
    "local_head_exact_match: true",
    "origin_head_exact_match: true",
    "working_tree_clean_before_execution: true",
  ])
);

ok(
  "dependency chain v19.18-v19.25 confirmations exist",
  hasEveryLine(combined, [
    "v19.18 approval confirmation",
    "v19.19 gate confirmation",
    "v19.20 HOLD confirmation",
    "v19.21 ambiguity-resolution confirmation",
    "v19.22 wrapper-preparation confirmation",
    "v19.23 readiness confirmation",
    "v19.24 HOLD confirmation",
    "v19.25 live-path enablement confirmation",
    "v19_18_approval_confirmed: true",
    "v19_19_gate_confirmed: true",
    "v19_20_hold_confirmed: true",
    "v19_21_resolution_confirmed: true",
    "v19_22_preparation_confirmed: true",
    "v19_23_readiness_confirmed: true",
    "v19_24_hold_confirmed: true",
    "v19_25_live_path_enablement_confirmed: true",
  ])
);

ok(
  "required preflight and dry-run checks recorded",
  hasEveryLine(combined, [
    "npm run test:v19.22",
    "npm run test:v19.23",
    "npm run test:v19.24",
    "npm run test:v19.25",
    "npm run rearm:v19.22:dry-run",
    "npm run owner-local-one-run:v19.22:dry-run",
  ])
);

ok(
  "v19 helper and wrapper command evidence exists",
  hasEveryLine(combined, [
    "scripts/rearm-owner-local-step1-one-run-v19.mts",
    "scripts/owner-local-step1-one-run-v19.mts",
    "NONGA_V19_STEP1_REARM_CONFIRM=ALLOW_V19_STEP1_REARM_ONCE",
    "--rearm-approved-v19-step1 --allow-live-rearm",
    "--execute-approved-v19-step1 --allow-live-execution --approval-file",
  ])
);

ok(
  "lock state before and after rearm exists",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "consumed: true",
    "consumedAtUtc: 2026-07-05T11:42:37.334Z",
    "reason: runtime_adapter_entry_started",
    "consumed: false",
    "rearmAttemptCount: 1",
    "rearmedAtUtc: 2026-07-07T01:47:55.264Z",
  ])
);

ok(
  "exactly one live rearm and one-run status are explicit",
  hasEveryLine(combined, [
    "exactly one live lock re-arm happened: yes",
    "exactly_one_live_lock_rearm_happened: true",
    "exactly one owner-only staging one-run completed: no",
    "exactly_one_owner_only_staging_one_run_happened: false",
    "one-run command was attempted once: yes",
    "one_run_attempted_once: true",
  ])
);

ok(
  "one-run result and hold reason are documented",
  hasEveryLine(combined, [
    "result: `HOLD`",
    "result: hold",
    "HOLD — same-CMD token missing",
    "hold_reason: same-CMD token missing",
  ])
);

ok(
  "no retry second-run deploy public production real actions confirmed",
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
  "no sensitive exposure confirmations exist",
  hasEveryLine(combined, [
    "no token/secret/API key/platform auth credential/Authorization header exposure",
    "no PII/phone/plate/VIN exposure",
    "token_secret_api_key_platform_auth_credential_authorization_header_exposure: false",
    "pii_phone_plate_vin_exposure: false",
  ])
);

ok(
  "five-step status remains bounded",
  hasEveryLine(combined, [
    "Step 1 executed only if one-run completed: false",
    "step1_executed_only_if_one_run_completed: false",
    "Step 2 not started",
    "Step 3 not started",
    "Step 4 not started",
    "Step 5 not started",
    "step2_not_started: true",
    "step3_not_started: true",
    "step4_not_started: true",
    "step5_not_started: true",
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
  "package has test:v19.26 script",
  scripts["test:v19.26"] ===
    "tsx scripts/test-v1926-step1-controlled-owner-only-staging-execution-after-rearm-live-path-record.mts"
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

console.log(`\nDone v19.26 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
