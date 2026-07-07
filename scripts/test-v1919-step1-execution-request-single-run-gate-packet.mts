/**
 * v19.19 Step 1 execution request / single-run gate packet validator
 * Static checks only. No execution/runtime/provider/deploy path.
 *
 * npm run test:v19.19
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.19-step1-execution-request-single-run-gate-packet.md";
const EXAMPLE_PATH = "docs/examples/v19.19-step1-execution-request-single-run-gate-packet.example.md";
const PACKAGE_PATH = "package.json";

const REQUIRED_LATEST_STATUS = "PASS — v19.18 fresh owner approval record closed";
const REQUIRED_LATEST_COMMIT = "3a072659f0b7bbb1782220e9f947d90cba62fa29";
const REQUIRED_V1917_STATUS = "HOLD — OWNER APPROVAL WORDING INSUFFICIENT FOR EXECUTION";
const REQUIRED_V1918_STATUS = "PASS — v19.18 fresh owner boundary-changing approval recorded for Step 1 scope only";
const REQUIRED_FINAL = "PASS — v19.19 Step 1 single-run gate packet closed";
const REQUIRED_BOUNDARY_PHRASE =
  "ยังไม่ GO, ยังไม่ execution, ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง";

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

console.log("=== v19.19 Step 1 Execution Request / Single-Run Gate Packet Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.19 single-run gate packet",
  doc.includes("# v19.19 - Step 1 Execution Request / Single-Run Gate Packet") &&
    example.includes("milestone: v19.19") &&
    example.includes("packet_type: step1_execution_request_single_run_gate_packet")
);

ok("latest status before task is exact", combined.includes(REQUIRED_LATEST_STATUS));
ok("latest known commit before task is exact", combined.includes(REQUIRED_LATEST_COMMIT));

ok("v19.17 baseline dependency exists", combined.includes(REQUIRED_V1917_STATUS));
ok("v19.18 approval dependency exists", combined.includes(REQUIRED_V1918_STATUS));
ok(
  "v19.19 depends on unchanged v19.18 record",
  hasEveryLine(combined, [
    "v19.19 depends on the v19.18 record as the mandatory approval source.",
    "v19_18_record_required_and_unchanged_for_future_execution: true"
  ])
);

ok("required boundary phrase exists", combined.includes(REQUIRED_BOUNDARY_PHRASE));
ok("required final decision exists", combined.includes(REQUIRED_FINAL));

ok(
  "no execution happened statements exist",
  hasEveryLine(combined, [
    "no Step 1 execution",
    "Step 1 execution is still not performed in v19.19.",
    "no execution happened in this v19.19 task.",
    "step1_executed_in_v19_19: false"
  ])
);

ok(
  "future action is exactly one lock re-arm and one one-run",
  hasEveryLine(combined, [
    "exactly one lock re-arm",
    "exactly one controlled owner-only staging one-run",
    "exactly_one_lock_rearm: true",
    "exactly_one_controlled_owner_only_staging_one_run: true"
  ])
);

ok(
  "no retry and no second-run boundaries exist",
  hasEveryLine(combined, [
    "no retry",
    "no second-run",
    "no_retry: true",
    "no_second_run: true"
  ])
);

ok(
  "full mandatory boundary scope exists",
  hasEveryLine(combined, [
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
    "no PII/phone/plate/VIN exposure"
  ])
);

ok(
  "mandatory immediate-stop conditions exist",
  hasEveryLine(combined, [
    "stop immediately if branch/head/origin mismatch.",
    "stop immediately if working tree is dirty before execution.",
    "stop immediately if v19.18 approval record is missing or changed.",
    "stop immediately if lock state is ambiguous.",
    "stop immediately if command target differs from the latest approved packet.",
    "stop immediately if any token/secret/PII would be exposed.",
    "stop immediately if any retry/second-run path appears."
  ])
);

ok(
  "position remains before Step 1 execution",
  hasEveryLine(combined, [
    "still before Step 1 Owner-only staging trial.",
    "Step 1 not executed in v19.19.",
    "remaining_main_steps_before_public_production: 5",
    "1) Owner-only staging trial",
    "2) Limited private pilot",
    "3) Real dealer dry-run",
    "4) Real lead pilot แบบจำกัดมาก",
    "5) Public / Production"
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
  "package has test:v19.19 script",
  scripts["test:v19.19"] === "tsx scripts/test-v1919-step1-execution-request-single-run-gate-packet.mts"
);

const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["authorization header value", /\bAuthorization\s*:\s*[^\s].+/i],
  ["quoted secret assignment", /\b(api[_-]?key|token|secret)\s*[:=]\s*["'][^"']{8,}["']/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["plate-like", /\b[ก-ฮ]{1,3}\s?\d{1,4}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

console.log(`\nDone v19.19 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
