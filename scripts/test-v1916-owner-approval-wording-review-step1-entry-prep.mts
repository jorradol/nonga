/**
 * v19.16 owner approval wording review validator
 * Static checks only. No execution.
 *
 * npm run test:v19.16
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.16-owner-approval-wording-review-step1-entry-prep.md";
const FIXTURE_PATH = "docs/examples/v19.16-owner-approval-wording-review-step1-entry-prep.fixture.json";
const PACKAGE_PATH = "package.json";

const REQUIRED_BOUNDARY_PHRASE =
  "ยังไม่ GO, ยังไม่ execution, ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง";
const REQUIRED_LATEST_STATUS = "PASS — v19.15 fresh owner approval readiness preflight packet closed";
const REQUIRED_HOLD = "HOLD — OWNER APPROVAL WORDING INSUFFICIENT";
const REQUIRED_FINAL = "PASS — v19.16 owner approval wording review closed";

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

console.log("=== v19.16 Owner Approval Wording Review Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${fixtureRaw}`;

ok(
  "doc/fixture identify v19.16 wording review packet",
  doc.includes("# v19.16 - Owner Approval Wording Review Only - Step 1 Entry Prep") &&
    fixtureRaw.includes("\"milestone\": \"v19.16\"") &&
    fixtureRaw.includes("\"approval_wording_status\": \"template_only\"")
);

ok("required boundary phrase exists", combined.includes(REQUIRED_BOUNDARY_PHRASE));
ok("latest v19.15 status exists", combined.includes(REQUIRED_LATEST_STATUS));
ok("v13-v19.15 closed statement exists", combined.includes("v13-v19.15 are CLOSED."));

ok(
  "no execution/one-run/retry/second-run statement exists",
  hasEveryLine(doc, ["NO execution", "NO one-run", "NO retry", "NO second-run"])
);

ok(
  "no lock mutation and no lock re-arm statement exists",
  hasEveryLine(doc, ["NO lock mutation", "NO lock re-arm", "no lock mutation or lock re-arm is authorized in v19.16."])
);

ok(
  "v13 gemini proof not repeated and step1 purpose stated",
  hasEveryLine(doc, [
    "v13 Gemini/runtime proof does not need to be repeated just to prove Gemini can respond.",
    "Step 1 purpose is integrated owner-only staging trial of Nong A flow, not Gemini proof again."
  ])
);

ok(
  "step status and remaining major steps are stated",
  hasEveryLine(doc, [
    "current position: BEFORE STEP 1 — Owner-only staging trial.",
    "Step 1 has not started yet.",
    "remaining major steps to public/production: 5"
  ])
);

ok(
  "exact future approval requirements listed",
  hasEveryLine(doc, [
    "exactly one lock re-arm",
    "exactly one controlled owner-only one-run",
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
  "vague wording rejected and hold rule exists",
  hasEveryLine(doc, [
    "`OK`",
    "`GO`",
    "`ทำต่อได้`",
    "`อนุมัติ`",
    "`รันได้`",
    "`ไปต่อเลย`",
    "`จัดเลย`",
    "`ลุยได้`",
    `\`${REQUIRED_HOLD}\``
  ])
);

ok("final decision recommendation exists", combined.includes(REQUIRED_FINAL));

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
  "package has test:v19.16 script",
  scripts["test:v19.16"] === "tsx scripts/test-v1916-owner-approval-wording-review-step1-entry-prep.mts"
);

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok(
    "required status placeholders are exact",
    root.current_position === "before_step_1_owner_only_staging_trial" &&
      root.step_1_status === "not_started" &&
      root.execution_status === "not_performed" &&
      root.lock_rearm_status === "not_performed" &&
      root.one_run_status === "not_performed" &&
      root.gemini_runtime_call_status === "not_performed_in_v19_16" &&
      root.approval_status === "not_granted" &&
      root.approval_wording_status === "template_only" &&
      root.remaining_major_steps_to_public_production === 5 &&
      root.token_secret_exposure === "none" &&
      root.pii_exposure === "none"
  );

  const closure = asRecord(root.closure_context);
  ok(
    "closure context in fixture is complete",
    closure.v13_to_v1915_closed === true &&
      closure.latest_status_before_v1916 === REQUIRED_LATEST_STATUS &&
      closure.lock_file === ".nonga-owner-local-one-run-v143u.lock.json" &&
      closure.prior_observed_state === "\"consumed\": true" &&
      closure.prior_result === "HOLD — RETRY OR SECOND-RUN RISK DETECTED" &&
      closure.v13_gemini_proof_repeat_needed === false
  );

  ok(
    "step1 purpose field confirms integrated trial",
    root.step1_purpose === "integrated_owner_only_staging_trial_not_gemini_proof_again"
  );

  const req = asRecord(root.future_approval_requirements);
  ok(
    "future approval requirements in fixture are complete",
    req.exactly_one_lock_rearm === true &&
      req.exactly_one_controlled_owner_only_staging_one_run === true &&
      req.no_retry === true &&
      req.no_second_run === true &&
      req.owner_only === true &&
      req.staging_only === true &&
      req.no_public === true &&
      req.no_production === true &&
      req.no_real_dealer_action === true &&
      req.no_real_lead === true &&
      req.no_real_customer_data === true &&
      req.no_thor_real_import === true &&
      req.no_dealer_real_inventory_import === true &&
      req.no_token_secret_credential_pii_exposure === true
  );

  ok(
    "insufficient wording list in fixture is complete",
    Array.isArray(root.insufficient_wording_examples) &&
      root.insufficient_wording_examples.includes("OK") &&
      root.insufficient_wording_examples.includes("GO") &&
      root.insufficient_wording_examples.includes("ทำต่อได้") &&
      root.insufficient_wording_examples.includes("อนุมัติ") &&
      root.insufficient_wording_examples.includes("รันได้") &&
      root.insufficient_wording_examples.includes("ไปต่อเลย") &&
      root.insufficient_wording_examples.includes("จัดเลย") &&
      root.insufficient_wording_examples.includes("ลุยได้")
  );

  ok("hold wording in fixture is exact", root.hold_if_wording_insufficient === REQUIRED_HOLD);
  ok("boundary phrase in fixture is exact", root.boundary_phrase === REQUIRED_BOUNDARY_PHRASE);
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

console.log(`\nDone v19.16 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
