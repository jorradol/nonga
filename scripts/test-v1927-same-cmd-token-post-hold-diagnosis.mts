/**
 * v19.27 same-CMD token post-hold diagnosis validator
 * Static checks only. No runtime/provider/endpoint execution.
 *
 * npm run test:v19.27
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.27-same-cmd-token-post-hold-diagnosis.md";
const EXAMPLE_PATH = "docs/examples/v19.27-same-cmd-token-post-hold-diagnosis.example.md";
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

console.log("=== v19.27 Same-CMD Token Post-HOLD Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.27 packet",
  doc.includes("# v19.27 - Same-CMD Token Requirement Post-HOLD Diagnosis") &&
    example.includes("milestone: v19.27") &&
    example.includes("packet_type: same_cmd_token_post_hold_diagnosis")
);

ok(
  "v19.26 hold reason recorded as same-CMD token missing",
  hasEveryLine(combined, [
    "HOLD — same-CMD token missing",
    "hold_reason: same-CMD token missing",
  ])
);

ok(
  "v19.26 exactly one live rearm happened",
  hasEveryLine(combined, [
    "exactly one live re-arm happened",
    "exactly_one_live_rearm_happened: true",
  ])
);

ok(
  "v19.26 exactly one one-run attempt happened and did not complete",
  hasEveryLine(combined, [
    "exactly one one-run attempt happened",
    "one-run did not complete",
    "exactly_one_one_run_attempt_happened: true",
    "one_run_completed: false",
  ])
);

ok(
  "v19.26 no retry and no second-run recorded",
  hasEveryLine(combined, [
    "no retry and no second-run occurred",
    "retry_occurred: false",
    "second_run_occurred: false",
  ])
);

ok(
  "v19.27 includes no-execution and no-lock-mutation statements",
  hasEveryLine(combined, [
    "v19.27 performed no lock mutation and no one-run",
    "v19.27 performed no Step 1 execution",
    "v19.27 performed no live lock reset/re-arm/deletion",
    "step1_executed: false",
    "live_lock_reset_rearm_mutation_deletion: false",
    "one_run: false",
  ])
);

ok(
  "v19.27 includes no token/secret/pii exposure statements",
  hasEveryLine(combined, [
    "v19.27 did not ask for or expose token/secret/API key/platform auth credential/Authorization header",
    "v19.27 did not expose PII/phone/plate/VIN",
    "token_secret_api_key_platform_auth_credential_authorization_header_exposure: false",
    "pii_phone_plate_vin_exposure: false",
    "asked_owner_to_paste_token_in_chat: false",
  ])
);

ok(
  "v19.27 includes fresh approval needed conclusion",
  hasEveryLine(combined, [
    "fresh owner approval is required before any future one-run attempt",
    "fresh_owner_approval_required_before_any_future_one_run_attempt: true",
  ])
);

ok(
  "depends on v19.18 through v19.26",
  hasEveryLine(combined, [
    "docs/v19.18-fresh-owner-boundary-changing-approval-step1-record.md",
    "docs/v19.19-step1-execution-request-single-run-gate-packet.md",
    "docs/v19.20-step1-controlled-owner-only-staging-one-run-execution-record.md",
    "docs/v19.21-rearm-command-target-ambiguity-resolution.md",
    "docs/v19.22-v19-specific-rearm-and-one-run-wrapper-preparation.md",
    "docs/v19.23-final-pre-execution-readiness-check-for-v19-wrapper.md",
    "docs/v19.24-step1-controlled-owner-only-staging-execution-via-v19-wrapper-record.md",
    "docs/v19.25-enable-v19-step1-rearm-helper-live-path.md",
    "docs/v19.26-step1-controlled-owner-only-staging-execution-after-rearm-live-path-record.md",
  ])
);

ok(
  "same-CMD token static diagnosis details exist",
  hasEveryLine(combined, [
    "NONGA_ADMIN_API_TOKEN",
    "wrapper_env_forwarding_correct: true",
    "wrapper_approval_file_forwarding_correct: true",
    "helper_requires_same_cmd_env_token_only: true",
    "documentation_only_correction_needed: true",
    "required_checker_command: npm run check:admin-token-session-env",
  ])
);

ok(
  "static/local-only requirement preserved",
  hasEveryLine(combined, [
    "STATIC/LOCAL DIAGNOSIS ONLY",
    "execution_type: static_local_diagnosis_only",
    "no runtime/provider/endpoint execution",
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
  "package has test:v19.27 script",
  scripts["test:v19.27"] === "tsx scripts/test-v1927-same-cmd-token-post-hold-diagnosis.mts"
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

console.log(`\nDone v19.27 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
