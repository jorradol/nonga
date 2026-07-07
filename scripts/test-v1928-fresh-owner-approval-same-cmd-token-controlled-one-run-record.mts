/**
 * v19.28 fresh owner approval + same-cmd token controlled one-run record validator
 * Static checks only for docs/examples/package metadata.
 *
 * npm run test:v19.28
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.28-fresh-owner-approval-same-cmd-token-controlled-one-run-record.md";
const EXAMPLE_PATH =
  "docs/examples/v19.28-fresh-owner-approval-same-cmd-token-controlled-one-run-record.example.md";
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

console.log("=== v19.28 Same-CMD Token Controlled One-Run Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.28 record",
  doc.includes("# v19.28 - Fresh Owner Approval + Same-CMD Token Controlled One-Run Record") &&
    example.includes("milestone: v19.28") &&
    example.includes("record_type: fresh_owner_approval_same_cmd_token_controlled_one_run_record")
);

ok(
  "preflight branch/head/origin/tree confirmations exist",
  hasEveryLine(combined, [
    "feature/chat-image-attachment-v1",
    "db6e803",
    "working tree before execution: clean",
    "branch_exact_match: true",
    "local_head_exact_match: true",
    "origin_head_exact_match: true",
    "working_tree_clean_before_execution: true",
  ])
);

ok(
  "v19.18-v19.27 baseline chain confirmed",
  hasEveryLine(combined, [
    "v19.18 through v19.27 records exist and are consistent",
    "v19_18_confirmed: true",
    "v19_19_confirmed: true",
    "v19_20_confirmed: true",
    "v19_21_confirmed: true",
    "v19_22_confirmed: true",
    "v19_23_confirmed: true",
    "v19_24_confirmed: true",
    "v19_25_confirmed: true",
    "v19_26_confirmed: true",
    "v19_27_confirmed: true",
  ])
);

ok(
  "fresh owner approval scope recorded",
  hasEveryLine(combined, [
    "exactly one further controlled owner-only staging one-run attempt",
    "use already re-armed lock state from v19.26",
    "no additional lock re-arm by default",
    "no retry",
    "no second-run",
    "owner-only",
    "staging-only",
    "exactly_one_further_controlled_owner_only_staging_one_run_attempt: true",
    "use_already_rearmed_lock_state_from_v1926: true",
    "no_additional_lock_rearm_by_default: true",
  ])
);

ok(
  "lock state before one-run and no additional rearm recorded",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "consumed=false",
    "rearmAttemptCount=1",
    "rearmedAtUtc=present",
    "additional_rearm_performed_in_v1928: false",
  ])
);

ok(
  "required pre-check commands recorded",
  hasEveryLine(combined, [
    "npm run test:v19.24",
    "npm run test:v19.25",
    "npm run test:v19.26",
    "npm run test:v19.27",
    "npm run rearm:v19.22:dry-run",
    "npm run owner-local-one-run:v19.22:dry-run",
    "npm run check:admin-token-session-env",
  ])
);

ok(
  "token checker masked-only hold result recorded",
  hasEveryLine(combined, [
    "NONGA_ADMIN_API_TOKEN: missing",
    "length: zero",
    "format: invalid",
    "token: ***MASKED***",
    "token_masked_only: true",
    "checker_hold_reason: NONGA_ADMIN_API_TOKEN missing in operator/session env",
  ])
);

ok(
  "one-run command target recorded and blocked",
  hasEveryLine(combined, [
    "npx tsx scripts/owner-local-step1-one-run-v19.mts --execute-approved-v19-step1 --allow-live-execution --approval-file <temporary_local_approval_file>",
    "not executed in v19.28 due immediate HOLD condition from token checker failure",
    "one_run_executed_in_v1928: false",
    "one_run_attempts_in_v1928: 0",
    "one_run_result: HOLD",
  ])
);

ok(
  "explicit no retry/no second-run/no deploy/no public-production confirmations exist",
  hasEveryLine(combined, [
    "retry performed: no",
    "second-run performed: no",
    "no deploy: confirmed",
    "no public: confirmed",
    "no production: confirmed",
    "retry_performed: false",
    "second_run_performed: false",
    "deploy_performed: false",
    "public_or_production_activated: false",
  ])
);

ok(
  "explicit no real dealer/lead/token/pii confirmations exist",
  hasEveryLine(combined, [
    "no real dealer action: confirmed",
    "no real lead: confirmed",
    "no token/secret/API key/platform auth credential/Authorization header exposure: confirmed",
    "no PII/phone/plate/VIN exposure: confirmed",
    "real_dealer_or_real_lead_action_performed: false",
    "token_secret_api_key_platform_auth_credential_authorization_header_exposure: false",
    "pii_phone_plate_vin_exposure: false",
  ])
);

ok(
  "five-step status remains before Step 2",
  hasEveryLine(combined, [
    "Step 1 completed only if one-run PASS: false",
    "step1_completed_only_if_one_run_pass: false",
    "Step 2 not started",
    "Step 3 not started",
    "Step 4 not started",
    "Step 5 not started",
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
  "package has test:v19.28 script",
  scripts["test:v19.28"] ===
    "tsx scripts/test-v1928-fresh-owner-approval-same-cmd-token-controlled-one-run-record.mts"
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

console.log(`\nDone v19.28 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
