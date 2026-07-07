/**
 * v19.20 step1 controlled owner-only staging one-run execution record validator
 * Static checks only for docs/examples/metadata safety.
 *
 * npm run test:v19.20
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.20-step1-controlled-owner-only-staging-one-run-execution-record.md";
const EXAMPLE_PATH =
  "docs/examples/v19.20-step1-controlled-owner-only-staging-one-run-execution-record.example.md";
const PACKAGE_PATH = "package.json";

const REQUIRED_FINAL_DECISION =
  "HOLD — Step 1 owner-only staging one-run not executed in v19.20 due immediate-stop condition";

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

console.log("=== v19.20 Step1 Controlled Owner-Only Staging One-Run Execution Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.20 execution record",
  doc.includes("# v19.20 - Step 1 Controlled Owner-Only Staging One-Run Execution Record") &&
    example.includes("milestone: v19.20") &&
    example.includes("record_type: step1_controlled_owner_only_staging_one_run_execution_record")
);

ok(
  "preflight branch/head/origin/tree confirmations exist",
  hasEveryLine(combined, [
    "feature/chat-image-attachment-v1",
    "5ed7535f59d161c5ad318c0cb40d110366e95cb7",
    "working tree before execution: clean",
    "branch_exact_match: true",
    "local_head_exact_match: true",
    "origin_head_exact_match: true",
    "working_tree_clean_before_execution: true",
  ])
);

ok(
  "v19.18 and v19.19 confirmations exist",
  hasEveryLine(combined, [
    "v19.18 approval record exists and is exact",
    "v19.19 single-run gate packet exists and passed",
    "PASS — v19.18 fresh owner boundary-changing approval recorded for Step 1 scope only",
    "PASS — v19.19 Step 1 single-run gate packet closed",
  ])
);

ok(
  "required preflight checks are recorded",
  hasEveryLine(combined, [
    "npm run test:v19.17",
    "npm run test:v19.18",
    "npm run test:v19.19",
    "npm run owner-local-one-run:v14.3U",
  ])
);

ok(
  "lock state before re-arm is documented safely",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "\"consumed\": true",
    "runtime_adapter_entry_started",
    "lock_rearm_performed_exactly_once: false",
  ])
);

ok(
  "one-run result and immediate-stop HOLD are explicit",
  hasEveryLine(combined, [
    "one_run_result: HOLD",
    "immediate_stop_triggered: true",
    "stop_reason: command_target_or_rearm_path_ambiguous_for_current_approved_packet_chain",
    REQUIRED_FINAL_DECISION,
  ])
);

ok(
  "explicit no-retry/no-second-run/no-deploy/no-public-production confirmations exist",
  hasEveryLine(combined, [
    "retry performed: no",
    "second-run performed: no",
    "deploy performed: no",
    "public path activated: no",
    "production path activated: no",
    "retry_performed: false",
    "second_run_performed: false",
    "deploy_performed: false",
    "public_or_production_activated: false",
  ])
);

ok(
  "explicit no real action and sensitive-data exposure confirmations exist",
  hasEveryLine(combined, [
    "real dealer action performed: no",
    "real lead action performed: no",
    "real customer data used: no",
    "Thor real import performed: no",
    "dealer real inventory import performed: no",
    "token/secret/API key/platform auth credential/Authorization header exposure: no",
    "PII/phone/plate/VIN exposure: no",
    "token_secret_api_key_platform_auth_credential_authorization_header_exposure: false",
    "pii_phone_plate_vin_exposure: false",
  ])
);

ok(
  "5-step status keeps steps 2-5 not started",
  hasEveryLine(combined, [
    "Step 1 (Owner-only staging trial): not executed in v19.20 (HOLD)",
    "Step 2 (Limited private pilot): not started",
    "Step 3 (Real dealer dry-run): not started",
    "Step 4 (Real lead pilot แบบจำกัดมาก): not started",
    "Step 5 (Public / Production): not started",
    "step_2_not_started: true",
    "step_3_not_started: true",
    "step_4_not_started: true",
    "step_5_not_started: true",
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
  "package has test:v19.20 script",
  scripts["test:v19.20"] ===
    "tsx scripts/test-v1920-step1-controlled-owner-only-staging-one-run-execution-record.mts"
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

console.log(`\nDone v19.20 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
