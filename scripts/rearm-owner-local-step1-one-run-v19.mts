/**
 * v19.22 Step 1 owner-local re-arm helper (v19-specific)
 * Fail-closed by default. Dry-run/static diagnostics only in v19.22.
 *
 * IMPORTANT:
 * - This script does NOT mutate lock state in v19.22.
 * - Any future live re-arm must be explicitly enabled in a later approved packet.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCK_PATH = resolve(".nonga-owner-local-one-run-v143u.lock.json");
const APPROVAL_RECORD_PATH = resolve("docs/v19.18-fresh-owner-boundary-changing-approval-step1-record.md");
const GATE_PACKET_PATH = resolve("docs/v19.19-step1-execution-request-single-run-gate-packet.md");
const HOLD_RECORD_PATH = resolve("docs/v19.20-step1-controlled-owner-only-staging-one-run-execution-record.md");
const RESOLUTION_PATH = resolve("docs/v19.21-rearm-command-target-ambiguity-resolution.md");

type ParsedArgs = {
  dryRun: boolean;
  rearmApprovedV19Step1: boolean;
  allowLiveRearm: boolean;
  unknownArgs: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  let dryRun = false;
  let rearmApprovedV19Step1 = false;
  let allowLiveRearm = false;
  const unknownArgs: string[] = [];

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--rearm-approved-v19-step1") {
      rearmApprovedV19Step1 = true;
      continue;
    }
    if (arg === "--allow-live-rearm") {
      allowLiveRearm = true;
      continue;
    }
    unknownArgs.push(arg);
  }

  return { dryRun, rearmApprovedV19Step1, allowLiveRearm, unknownArgs };
}

function hold(reason: string): never {
  console.log(`HOLD — ${reason}`);
  process.exit(1);
}

function read(pathValue: string): string {
  return readFileSync(pathValue, "utf8").replace(/\r\n/g, "\n");
}

function baselineOkOrHold(): void {
  if (!existsSync(APPROVAL_RECORD_PATH)) hold("v19.18 approval record missing");
  if (!existsSync(GATE_PACKET_PATH)) hold("v19.19 gate packet missing");
  if (!existsSync(HOLD_RECORD_PATH)) hold("v19.20 hold record missing");
  if (!existsSync(RESOLUTION_PATH)) hold("v19.21 ambiguity-resolution packet missing");

  const approval = read(APPROVAL_RECORD_PATH);
  const gate = read(GATE_PACKET_PATH);
  const holdDoc = read(HOLD_RECORD_PATH);
  const resolution = read(RESOLUTION_PATH);

  if (!approval.includes("exactly one lock re-arm")) hold("v19.18 re-arm scope text missing");
  if (!gate.includes("exactly one lock re-arm")) hold("v19.19 re-arm scope text missing");
  if (!holdDoc.includes("HOLD")) hold("v19.20 hold status missing");
  if (!resolution.includes(".nonga-owner-local-one-run-v143u.lock.json")) {
    hold("v19.21 lock-family mapping missing");
  }
}

function lockStatusSafe(): string {
  if (!existsSync(LOCK_PATH)) return "missing";
  try {
    const parsed = JSON.parse(readFileSync(LOCK_PATH, "utf8")) as { consumed?: boolean };
    return parsed.consumed === true ? "consumed_true" : "consumed_false";
  } catch {
    return "parse_error";
  }
}

const args = parseArgs(process.argv.slice(2));

console.log("rearm-owner-local-step1-one-run-v19");
console.log("mode=v19-specific-rearm-helper");
console.log(`dryRun=${args.dryRun ? "true" : "false"}`);
console.log(`rearmApprovedV19Step1=${args.rearmApprovedV19Step1 ? "true" : "false"}`);
console.log(`allowLiveRearm=${args.allowLiveRearm ? "true" : "false"}`);
console.log("token=***MASKED***");

if (args.unknownArgs.length > 0) {
  hold("unexpected arguments detected; exact command only");
}

baselineOkOrHold();
console.log(`lockTargetPath=${LOCK_PATH}`);
console.log(`lockStatus=${lockStatusSafe()}`);

if (!args.rearmApprovedV19Step1 || args.dryRun) {
  console.log("PASS — v19 re-arm helper dry-run only (no lock mutation)");
  process.exit(0);
}

if (!args.allowLiveRearm) {
  hold("live re-arm blocked; require --allow-live-rearm");
}

hold("live re-arm path disabled in v19.22 preparation packet");
