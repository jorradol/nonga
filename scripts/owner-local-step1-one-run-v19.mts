/**
 * v19.22 Step 1 owner-local one-run wrapper (v19-specific alias)
 * Fail-closed by default; dry-run/preflight only unless explicit flags are provided.
 *
 * Default command behavior:
 * - no runtime/provider/deploy path
 * - no lock mutation by itself
 * - masked output only
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const LEGACY_WRAPPER_PATH = resolve("scripts/owner-local-one-run-gate-v143u.mts");
const APPROVAL_RECORD_PATH = resolve("docs/v19.18-fresh-owner-boundary-changing-approval-step1-record.md");
const GATE_PACKET_PATH = resolve("docs/v19.19-step1-execution-request-single-run-gate-packet.md");
const AMBIGUITY_RESOLUTION_PATH = resolve("docs/v19.21-rearm-command-target-ambiguity-resolution.md");

type ParsedArgs = {
  preflight: boolean;
  executeApprovedV19Step1: boolean;
  allowLiveExecution: boolean;
  approvalFile: string | null;
  unknownArgs: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  let preflight = false;
  let executeApprovedV19Step1 = false;
  let allowLiveExecution = false;
  let approvalFile: string | null = null;
  const unknownArgs: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--preflight") {
      preflight = true;
      continue;
    }
    if (arg === "--execute-approved-v19-step1") {
      executeApprovedV19Step1 = true;
      continue;
    }
    if (arg === "--allow-live-execution") {
      allowLiveExecution = true;
      continue;
    }
    if (arg === "--approval-file") {
      approvalFile = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    unknownArgs.push(arg);
  }

  return { preflight, executeApprovedV19Step1, allowLiveExecution, approvalFile, unknownArgs };
}

function hold(reason: string): never {
  console.log(`HOLD — ${reason}`);
  process.exit(1);
}

function requireBaselineOrHold(): void {
  if (!existsSync(LEGACY_WRAPPER_PATH)) hold("approved delegated one-run helper is missing");
  if (!existsSync(APPROVAL_RECORD_PATH)) hold("v19.18 approval record missing");
  if (!existsSync(GATE_PACKET_PATH)) hold("v19.19 gate packet missing");
  if (!existsSync(AMBIGUITY_RESOLUTION_PATH)) hold("v19.21 ambiguity-resolution packet missing");
}

const args = parseArgs(process.argv.slice(2));

console.log("owner-local-step1-one-run-v19");
console.log("mode=v19-specific-wrapper-alias");
console.log("token=***MASKED***");
console.log(`preflight=${args.preflight ? "true" : "false"}`);
console.log(`executeApprovedV19Step1=${args.executeApprovedV19Step1 ? "true" : "false"}`);
console.log(`allowLiveExecution=${args.allowLiveExecution ? "true" : "false"}`);

if (args.unknownArgs.length > 0) {
  hold("unexpected arguments detected; exact command only");
}

requireBaselineOrHold();

if (!args.executeApprovedV19Step1) {
  console.log("PASS — v19 wrapper dry-run/preflight completed (no execution)");
  process.exit(0);
}

if (!args.allowLiveExecution) {
  hold("live execution blocked; require --allow-live-execution");
}

if (!args.approvalFile) {
  hold("approval file is required (--approval-file <path>)");
}

// Explicit delegation path only: forward to the already-approved helper with strict arguments.
const delegated = spawnSync(
  process.execPath,
  [LEGACY_WRAPPER_PATH, "--execute-approved", "--approval-file", args.approvalFile],
  {
    stdio: "inherit",
    env: process.env,
  }
);

if (typeof delegated.status === "number") {
  process.exit(delegated.status);
}
hold("delegated one-run command terminated unexpectedly");
