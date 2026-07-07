/**
 * v19.31 same-terminal token controlled owner-only one-run record validator
 * Static checks only for docs/examples/package metadata.
 *
 * npm run test:v19.31
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.31-same-terminal-token-controlled-owner-only-one-run-record.md";
const EXAMPLE_PATH =
  "docs/examples/v19.31-same-terminal-token-controlled-owner-only-one-run-record.example.md";
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

console.log("=== v19.31 Same-Terminal Token Controlled One-Run Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.31 record",
  doc.includes("# v19.31 - Fresh Owner Approval + Same-Terminal Token Controlled Owner-Only One-Run Record") &&
    example.includes("milestone: v19.31") &&
    example.includes(
      "record_type: fresh_owner_approval_same_terminal_token_controlled_owner_only_one_run_record"
    )
);

ok(
  "preflight branch/head/origin/tree confirmations exist",
  hasEveryLine(combined, [
    "feature/chat-image-attachment-v1",
    "768ea43",
    "working tree before execution: clean",
    "working_tree_clean_before_execution: true",
  ])
);

ok(
  "v19.29-v19.30 baseline and step status confirmations exist",
  hasEveryLine(combined, [
    "v19.29 confirmed HOLD",
    "v19.30 confirmed PASS",
    "v1929_hold_due_to_token_missing_in_execution_session: true",
    "v1930_pass_same_session_provenance_closed_no_execution: true",
    "Step 1 remains not completed",
    "Step 2-5 remain not started",
  ])
);

ok(
  "lock state expected and no additional rearm recorded",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "consumed=false",
    "rearmAttemptCount=1",
    "rearmedAtUtc=present",
    "additional_rearm_performed: false",
    "no re-arm command executed in v19.31",
  ])
);

ok(
  "pre-execution static checks recorded",
  hasEveryLine(combined, [
    "npm run test:v19.29",
    "npm run test:v19.30",
    "npm run test:v19.29: pass",
    "npm run test:v19.30: pass",
  ])
);

ok(
  "fresh v19.31 approval evidence recorded",
  hasEveryLine(combined, [
    "v19.31-local-approval.txt",
    "approval_reused_from_v1929: false",
    "FINAL EXECUTION AUTHORIZE v19.31 STEP1 OWNER-ONLY STAGING SAME-TERMINAL TOKEN ONE-RUN EXACTLY-ONCE / NO RE-ARM / NO RETRY / NO SECOND-RUN / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA",
  ])
);

ok(
  "same-terminal token checker masked-only hold result recorded",
  hasEveryLine(combined, [
    "npm run check:admin-token-session-env",
    "NONGA_ADMIN_API_TOKEN: missing",
    "length: zero",
    "format: invalid",
    "leading/trailing whitespace: no",
    "contains newline: no",
    "quoted value risk: no",
    "literal env token risk: no",
    "starts with Bearer prefix: no",
    "token: ***MASKED***",
    "token_masked_only: true",
  ])
);

ok(
  "one-run command target exists but not executed",
  hasEveryLine(combined, [
    "npx tsx scripts/owner-local-step1-one-run-v19.mts --execute-approved-v19-step1 --allow-live-execution --approval-file <v19.31_local_approval_file>",
    "not executed due token gate HOLD in same terminal",
    "executed: false",
    "one_run_attempts_v1931: 0",
    "retry_performed: false",
    "second_run_performed: false",
    "result: HOLD",
  ])
);

ok(
  "explicit boundaries and no-exposure confirmations exist",
  hasEveryLine(combined, [
    "no additional lock re-arm",
    "no retry",
    "no second-run",
    "no deploy",
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

ok(
  "post-record checks and final decision recorded",
  hasEveryLine(combined, [
    "npm run test:v19.31",
    "npm run test:v19.31: pass",
    "HOLD — same-terminal token gate did not pass in v19.31, so controlled one-run was not executed",
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
  "package has test:v19.31 script",
  scripts["test:v19.31"] ===
    "tsx scripts/test-v1931-same-terminal-token-controlled-owner-only-one-run-record.mts"
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

console.log(`\nDone v19.31 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
