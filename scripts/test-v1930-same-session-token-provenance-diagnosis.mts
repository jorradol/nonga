/**
 * v19.30 same-session token provenance diagnosis validator
 * Static checks only for docs/examples/package metadata.
 *
 * npm run test:v19.30
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.30-same-session-token-provenance-diagnosis.md";
const EXAMPLE_PATH = "docs/examples/v19.30-same-session-token-provenance-diagnosis.example.md";
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

console.log("=== v19.30 Same-Session Token Provenance Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.30 diagnosis record",
  doc.includes("# v19.30 - Same-Session Token Provenance Diagnosis") &&
    example.includes("milestone: v19.30") &&
    example.includes("record_type: same_session_token_provenance_diagnosis_only")
);

ok(
  "preflight branch/head/origin/tree confirmations exist",
  hasEveryLine(combined, [
    "feature/chat-image-attachment-v1",
    "9b8a89a",
    "working tree before work: clean",
    "working_tree_clean_before_work: true",
  ])
);

ok(
  "v19.29 baseline hold and no-execution confirmations exist",
  hasEveryLine(combined, [
    "HOLD — same-session token gate did not pass",
    "one-run attempts: `0`",
    "no retry",
    "no second-run",
    "no additional re-arm",
    "final_decision_hold_same_session_gate_not_passed: true",
    "one_run_attempts_v1929: 0",
  ])
);

ok(
  "lock read-only expected state exists",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "consumed=false",
    "rearmAttemptCount=1",
    "rearmedAtUtc=present",
    "lock_mutation_performed: false",
  ])
);

ok(
  "same-session provenance diagnosis details exist",
  hasEveryLine(combined, [
    "PowerShell",
    "5.1.26100.8655",
    "D:\\nonga",
    "v22.22.0",
    "11.6.2",
    "npm run check:admin-token-session-env",
    "NONGA_ADMIN_API_TOKEN: missing",
    "length: zero",
    "format: invalid",
    "token: ***MASKED***",
    "same_session_provenance_status: not proven",
  ])
);

ok(
  "masked-only and no-secret handling statements exist",
  hasEveryLine(combined, [
    "token: ***MASKED***",
    "token_masked_only: true",
    "no token/secret/API key/platform auth credential/Authorization header exposure",
    "no PII/phone/plate/VIN exposure",
  ])
);

ok(
  "no-execution boundaries explicitly preserved",
  hasEveryLine(combined, [
    "no one-run",
    "no retry",
    "no second-run",
    "no additional lock re-arm",
    "no deploy/public/production",
    "no real dealer action",
    "no real lead",
    "no Thor real import",
    "no dealer real inventory import",
    "no_one_run: true",
    "no_retry: true",
    "no_second_run: true",
    "no_additional_rearm: true",
  ])
);

ok(
  "required test commands recorded",
  hasEveryLine(combined, [
    "npm run test:v19.28",
    "npm run test:v19.29",
    "npm run test:v19.30",
    "npm run test:v19.28: pass",
    "npm run test:v19.29: pass",
    "npm run test:v19.30: pass",
  ])
);

ok(
  "five-step status remains pre-step2",
  hasEveryLine(combined, [
    "Step 1 not completed until owner-only staging one-run PASS",
    "Step 2 not started",
    "Step 3 not started",
    "Step 4 not started",
    "Step 5 not started",
    "step1_not_completed_until_owner_only_staging_one_run_pass: true",
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
  "package has test:v19.30 script",
  scripts["test:v19.30"] === "tsx scripts/test-v1930-same-session-token-provenance-diagnosis.mts"
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

console.log(`\nDone v19.30 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
