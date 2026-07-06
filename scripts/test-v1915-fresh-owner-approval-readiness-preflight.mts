/**
 * v19.15 fresh owner approval readiness preflight validator
 * Static checks only. Read-only lock state confirmation wording only.
 *
 * npm run test:v19.15
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.15-fresh-owner-approval-readiness-preflight.md";
const FIXTURE_PATH = "docs/examples/v19.15-fresh-owner-approval-readiness-preflight.fixture.json";
const PACKAGE_PATH = "package.json";

const REQUIRED_BOUNDARY_PHRASE =
  "ยังไม่ GO, ยังไม่ execution, ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง";
const REQUIRED_LATEST_STATUS =
  "V19.14 FUTURE LOCK RE-ARM APPROVAL PACKET CLOSED — READY FOR FRESH OWNER BOUNDARY-CHANGING APPROVAL ONLY / NO LOCK MUTATION / NO EXECUTION";
const REQUIRED_HOLD = "HOLD — OWNER APPROVAL WORDING INSUFFICIENT";
const REQUIRED_FINAL = "PASS — v19.15 fresh owner approval readiness preflight packet closed";

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

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

console.log("=== v19.15 Fresh Owner Approval Readiness Preflight Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.15 preflight packet",
  doc.includes("# v19.15 - Fresh Owner Approval Readiness Preflight Packet") &&
    fixtureRaw.includes("\"milestone\": \"v19.15\"") &&
    fixtureRaw.includes("\"approval_status\": \"not_granted\"")
);

ok("required boundary phrase exists", combined.includes(REQUIRED_BOUNDARY_PHRASE));
ok("v19.14 latest status carry-forward exists", combined.includes(REQUIRED_LATEST_STATUS));
ok("v13-v19.14 closed baseline statement exists", combined.includes("v13-v19.14 are CLOSED baseline checkpoints."));

ok(
  "read-only lock carry-forward lines exist",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "\"consumed\": true",
    "HOLD — RETRY OR SECOND-RUN RISK DETECTED"
  ])
);

ok(
  "explicit non-execution and non-mutation statements exist",
  hasEveryLine(doc, [
    "no command execution is authorized.",
    "no lock mutation is authorized.",
    "no one-run is authorized.",
    "no retry or second-run is authorized."
  ])
);

ok(
  "future fresh explicit owner approval requirement exists",
  hasEveryLine(doc, [
    "future action therefore requires fresh explicit owner approval.",
    "exactly one lock re-arm.",
    "exactly one controlled owner-only one-run.",
    "owner-only.",
    "staging-only."
  ])
);

ok(
  "vague wording is insufficient unless full explicit wording present",
  hasEveryLine(doc, [
    "vague or incomplete wording is insufficient.",
    "`OK`",
    "`GO`",
    "`ทำต่อได้`",
    "`อนุมัติ`",
    "`รันได้`",
    "unless full explicit boundary-changing approval wording is present, decision must be:",
    `\`${REQUIRED_HOLD}\``
  ])
);

ok("required final preflight decision exists", combined.includes(REQUIRED_FINAL));

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

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
  "package has test:v19.15 script",
  scripts["test:v19.15"] === "tsx scripts/test-v1915-fresh-owner-approval-readiness-preflight.mts"
);

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok(
    "required fixture status fields are exact placeholders",
    root.approval_status === "not_granted" &&
      root.lock_rearm_status === "not_performed" &&
      root.one_run_status === "not_performed" &&
      root.execution_status === "not_performed" &&
      root.public_status === "not_public" &&
      root.production_status === "not_production" &&
      root.real_dealer_status === "not_used" &&
      root.real_lead_status === "not_used" &&
      root.real_data_status === "not_used" &&
      root.token_secret_exposure === "none" &&
      root.pii_exposure === "none"
  );

  const carry = asRecord(root.carry_forward);
  ok(
    "carry forward object is complete",
    carry.v13_to_v1914_closed === true &&
      carry.latest_status === REQUIRED_LATEST_STATUS &&
      carry.lock_file === ".nonga-owner-local-one-run-v143u.lock.json" &&
      carry.previous_observed_state === "\"consumed\": true" &&
      carry.prior_hold_result === "HOLD — RETRY OR SECOND-RUN RISK DETECTED"
  );

  const required = asRecord(root.future_approval_requirements);
  ok(
    "future approval required fields are complete",
    required.exactly_one_lock_rearm === true &&
      required.exactly_one_controlled_owner_only_one_run === true &&
      required.no_retry === true &&
      required.no_second_run === true &&
      required.owner_only === true &&
      required.staging_only === true &&
      required.no_public === true &&
      required.no_production === true &&
      required.no_real_dealer_action === true &&
      required.no_real_lead === true &&
      required.no_real_customer_data === true &&
      required.no_token_secret_credential_pii_exposure === true &&
      required.fresh_explicit_boundary_changing_owner_approval_required === true
  );

  ok(
    "insufficient wording examples array complete",
    Array.isArray(root.insufficient_wording_examples) &&
      root.insufficient_wording_examples.includes("OK") &&
      root.insufficient_wording_examples.includes("GO") &&
      root.insufficient_wording_examples.includes("ทำต่อได้") &&
      root.insufficient_wording_examples.includes("อนุมัติ") &&
      root.insufficient_wording_examples.includes("รันได้")
  );

  ok("safe default hold exact in fixture", root.safe_default_if_wording_unclear === REQUIRED_HOLD);
  ok("final preflight decision exact in fixture", root.final_preflight_decision === REQUIRED_FINAL);
  ok("placeholder only flag true", root.placeholder_only === true);
}

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

console.log(`\nDone v19.15 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
