/**
 * v19.25 enable v19 step1 re-arm helper live path validator
 * Static checks only. No runtime/provider/endpoint execution.
 *
 * npm run test:v19.25
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v19.25-enable-v19-step1-rearm-helper-live-path.md";
const EXAMPLE_PATH = "docs/examples/v19.25-enable-v19-step1-rearm-helper-live-path.example.md";
const HELPER_PATH = "scripts/rearm-owner-local-step1-one-run-v19.mts";
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

console.log("=== v19.25 Live-Path Enablement Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("example exists", existsSync(EXAMPLE_PATH));
ok("helper exists", existsSync(HELPER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const example = read(EXAMPLE_PATH);
const helper = read(HELPER_PATH);
const packageRaw = read(PACKAGE_PATH);
const combined = `${doc}\n${example}`;

ok(
  "doc/example identify v19.25 packet",
  doc.includes("# v19.25 - Enable v19 Step 1 Re-Arm Helper Live Path") &&
    example.includes("milestone: v19.25") &&
    example.includes("packet_type: enable_v19_step1_rearm_helper_live_path")
);

ok(
  "v19.25 confirms no live rearm and no one-run in this task",
  hasEveryLine(combined, [
    "v19.25 did not perform live re-arm",
    "v19.25 did not execute one-run",
    "live_rearm_performed_in_v1925: false",
    "one_run_executed_in_v1925: false",
  ])
);

ok(
  "depends on v19.18-v19.24 chain",
  hasEveryLine(combined, [
    "docs/v19.18-fresh-owner-boundary-changing-approval-step1-record.md",
    "docs/v19.19-step1-execution-request-single-run-gate-packet.md",
    "docs/v19.20-step1-controlled-owner-only-staging-one-run-execution-record.md",
    "docs/v19.21-rearm-command-target-ambiguity-resolution.md",
    "docs/v19.22-v19-specific-rearm-and-one-run-wrapper-preparation.md",
    "docs/v19.23-final-pre-execution-readiness-check-for-v19-wrapper.md",
    "docs/v19.24-step1-controlled-owner-only-staging-execution-via-v19-wrapper-record.md",
    "v19_18_to_v19_24_dependency_chain_confirmed: true",
  ])
);

ok(
  "patched helper name documented",
  hasEveryLine(combined, [
    "scripts/rearm-owner-local-step1-one-run-v19.mts",
    "patched_helper_file: scripts/rearm-owner-local-step1-one-run-v19.mts",
  ])
);

ok(
  "exact lock target documented",
  hasEveryLine(combined, [
    ".nonga-owner-local-one-run-v143u.lock.json",
    "lock_target_exact: .nonga-owner-local-one-run-v143u.lock.json",
  ])
);

ok(
  "future scope keeps exactly one rearm and one one-run",
  hasEveryLine(combined, [
    "exactly one lock re-arm",
    "exactly one controlled owner-only staging one-run",
    "exactly_one_lock_rearm: true",
    "exactly_one_controlled_owner_only_staging_one_run: true",
  ])
);

ok(
  "future scope keeps no retry and no second-run",
  hasEveryLine(combined, [
    "no retry",
    "no second-run",
    "no_retry: true",
    "no_second_run: true",
  ])
);

ok(
  "future scope keeps no public/production/real dealer/real lead",
  hasEveryLine(combined, [
    "no public",
    "no production",
    "no real dealer action",
    "no real lead",
    "no_public: true",
    "no_production: true",
    "no_real_dealer_action: true",
    "no_real_lead: true",
  ])
);

ok(
  "future scope keeps no secret/pii exposure",
  hasEveryLine(combined, [
    "no token/secret/API key/platform auth credential/Authorization header exposure",
    "no PII/phone/plate/VIN exposure",
    "no_token_secret_api_key_platform_auth_credential_authorization_header_exposure: true",
    "no_pii_phone_plate_vin_exposure: true",
  ])
);

ok(
  "doc explains v19.24 HOLD and dry-run behavior",
  hasEveryLine(combined, [
    "v19.24 HOLDed correctly because live re-arm path was disabled",
    "dry-run behavior remains non-mutating",
    "future live path is fail-closed and flag-gated",
  ])
);

ok(
  "helper has explicit flag/env-gated live rearm path",
  hasEveryLine(helper, [
    "--rearm-approved-v19-step1",
    "--allow-live-rearm",
    "NONGA_V19_STEP1_REARM_CONFIRM",
    "ALLOW_V19_STEP1_REARM_ONCE",
    "liveRearmState=dry-run-only",
    "liveRearmState=allowed-but-not-invoked",
    "liveRearmState=performed",
  ])
);

ok(
  "helper validates target lock and pre-mutation state",
  hasEveryLine(helper, [
    "lock file missing; cannot live re-arm",
    "lock consumed must be true before re-arm",
    "lock consumedAtUtc missing before re-arm",
    "lock reason missing before re-arm",
    "lock target family mismatch",
  ])
);

ok(
  "helper blocks second rearm attempt",
  hasEveryLine(helper, [
    "second re-arm attempt blocked by static safeguard",
    "re-arm already performed once; second attempt blocked",
    "rearmAttemptCount: 1",
  ])
);

ok(
  "helper does not include endpoint/provider/runtime calls",
  !/fetch\(|axios|Gemini|providerNetwork=run|https?:\/\//i.test(helper)
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
  "package has test:v19.25 script",
  scripts["test:v19.25"] === "tsx scripts/test-v1925-enable-v19-step1-rearm-helper-live-path.mts"
);
ok(
  "v19.22 dry-run scripts unchanged",
  scripts["rearm:v19.22:dry-run"] === "tsx scripts/rearm-owner-local-step1-one-run-v19.mts --dry-run" &&
    scripts["owner-local-one-run:v19.22:dry-run"] ===
      "tsx scripts/owner-local-step1-one-run-v19.mts --preflight"
);

console.log(`\nDone v19.25 validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
