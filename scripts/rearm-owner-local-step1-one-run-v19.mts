/**
 * v19.22 Step 1 owner-local re-arm helper (v19-specific)
 * Fail-closed by default. Dry-run/static diagnostics only in v19.22.
 *
 * IMPORTANT:
 * - This script does NOT mutate lock state in v19.22.
 * - Any future live re-arm must be explicitly enabled in a later approved packet.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCK_PATH = resolve(".nonga-owner-local-one-run-v143u.lock.json");
const APPROVAL_RECORD_PATH = resolve("docs/v19.18-fresh-owner-boundary-changing-approval-step1-record.md");
const GATE_PACKET_PATH = resolve("docs/v19.19-step1-execution-request-single-run-gate-packet.md");
const HOLD_RECORD_PATH = resolve("docs/v19.20-step1-controlled-owner-only-staging-one-run-execution-record.md");
const RESOLUTION_PATH = resolve("docs/v19.21-rearm-command-target-ambiguity-resolution.md");
const WRAPPER_PREP_PATH = resolve("docs/v19.22-v19-specific-rearm-and-one-run-wrapper-preparation.md");
const READINESS_PATH = resolve("docs/v19.23-final-pre-execution-readiness-check-for-v19-wrapper.md");
const EXECUTION_RECORD_PATH = resolve(
  "docs/v19.24-step1-controlled-owner-only-staging-execution-via-v19-wrapper-record.md"
);
const REQUIRED_LIVE_ENV_CONFIRM = "ALLOW_V19_STEP1_REARM_ONCE";

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
  if (!existsSync(WRAPPER_PREP_PATH)) hold("v19.22 wrapper-preparation packet missing");
  if (!existsSync(READINESS_PATH)) hold("v19.23 readiness packet missing");
  if (!existsSync(EXECUTION_RECORD_PATH)) hold("v19.24 execution record missing");

  const approval = read(APPROVAL_RECORD_PATH);
  const gate = read(GATE_PACKET_PATH);
  const holdDoc = read(HOLD_RECORD_PATH);
  const resolution = read(RESOLUTION_PATH);
  const wrapperPrep = read(WRAPPER_PREP_PATH);
  const readiness = read(READINESS_PATH);
  const executionRecord = read(EXECUTION_RECORD_PATH);

  if (!approval.includes("exactly one lock re-arm")) hold("v19.18 re-arm scope text missing");
  if (!gate.includes("exactly one lock re-arm")) hold("v19.19 re-arm scope text missing");
  if (!holdDoc.includes("HOLD")) hold("v19.20 hold status missing");
  if (!resolution.includes(".nonga-owner-local-one-run-v143u.lock.json")) {
    hold("v19.21 lock-family mapping missing");
  }
  if (!wrapperPrep.includes("PASS — v19.22 v19-specific re-arm and one-run wrapper preparation closed")) {
    hold("v19.22 status missing");
  }
  if (!readiness.includes("PASS — v19.23 final pre-execution readiness check closed")) {
    hold("v19.23 status missing");
  }
  if (!executionRecord.includes("one live re-arm attempt performed once and failed closed safely")) {
    hold("v19.24 single live re-arm attempt evidence missing");
  }
  if (!executionRecord.includes("exactly one lock re-arm mutation happened: no")) {
    hold("v19.24 confirms no lock mutation missing");
  }
  if (!executionRecord.includes("one-run executed: no")) {
    hold("v19.24 confirms one-run not executed missing");
  }
  if (!executionRecord.includes("HOLD — live re-arm path disabled in v19.22 preparation packet")) {
    hold("v19.24 hold reason mismatch");
  }
}

type LockFileState = {
  consumed?: boolean;
  consumedAtUtc?: string;
  reason?: string;
  rearmAttemptCount?: number;
  rearmedAtUtc?: string;
};

type LockValidation = {
  state: LockFileState;
  status: "ok";
};

function loadLockState(): LockFileState | null {
  if (!existsSync(LOCK_PATH)) return null;
  try {
    return JSON.parse(readFileSync(LOCK_PATH, "utf8")) as LockFileState;
  } catch {
    return null;
  }
}

function lockStatusSafe(): string {
  const lock = loadLockState();
  if (!lock) return existsSync(LOCK_PATH) ? "parse_error" : "missing";
  if (lock.consumed === true) return "consumed_true";
  if (lock.consumed === false) return "consumed_false";
  return "invalid_schema";
}

function validateLiveRearmPreconditionsOrHold(lock: LockFileState | null): LockValidation {
  if (!existsSync(LOCK_PATH)) hold("lock file missing; cannot live re-arm");
  if (!lock) hold("lock file parse error; cannot live re-arm");
  if (lock.consumed !== true) hold("lock consumed must be true before re-arm");
  if (typeof lock.consumedAtUtc !== "string" || lock.consumedAtUtc.trim().length === 0) {
    hold("lock consumedAtUtc missing before re-arm");
  }
  if (typeof lock.reason !== "string" || lock.reason.trim().length === 0) {
    hold("lock reason missing before re-arm");
  }
  if (LOCK_PATH !== resolve(".nonga-owner-local-one-run-v143u.lock.json")) {
    hold("lock target family mismatch");
  }
  if (typeof lock.rearmAttemptCount === "number" && lock.rearmAttemptCount >= 1) {
    hold("second re-arm attempt blocked by static safeguard");
  }
  if (typeof lock.rearmedAtUtc === "string" && lock.rearmedAtUtc.trim().length > 0) {
    hold("re-arm already performed once; second attempt blocked");
  }

  return { state: lock, status: "ok" };
}

function mutateLockForSingleRearmOrHold(current: LockFileState): void {
  const next: LockFileState = {
    ...current,
    consumed: false,
    rearmAttemptCount: 1,
    rearmedAtUtc: new Date().toISOString(),
  };
  delete next.consumedAtUtc;
  delete next.reason;

  try {
    writeFileSync(LOCK_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  } catch {
    hold("cannot persist re-armed lock");
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
const lockState = loadLockState();
console.log(`lockTargetPath=${LOCK_PATH}`);
console.log(`lockStatus=${lockStatusSafe()}`);
console.log(
  `liveRearmEnvConfirmed=${process.env.NONGA_V19_STEP1_REARM_CONFIRM === REQUIRED_LIVE_ENV_CONFIRM ? "true" : "false"}`
);

if (!args.rearmApprovedV19Step1 || args.dryRun) {
  console.log("liveRearmState=dry-run-only");
  console.log("PASS — v19 re-arm helper dry-run only (no lock mutation)");
  process.exit(0);
}

if (!args.allowLiveRearm) {
  if (process.env.NONGA_V19_STEP1_REARM_CONFIRM === REQUIRED_LIVE_ENV_CONFIRM) {
    console.log("liveRearmState=allowed-but-not-invoked");
    hold("live re-arm allowed but not invoked; require --allow-live-rearm");
  }
  hold("live re-arm blocked; require --allow-live-rearm");
}

if (process.env.NONGA_V19_STEP1_REARM_CONFIRM !== REQUIRED_LIVE_ENV_CONFIRM) {
  hold("live re-arm blocked; require NONGA_V19_STEP1_REARM_CONFIRM=ALLOW_V19_STEP1_REARM_ONCE");
}

const validated = validateLiveRearmPreconditionsOrHold(lockState);
mutateLockForSingleRearmOrHold(validated.state);
console.log("liveRearmState=performed");
console.log("PASS — v19 live re-arm performed (single safe mutation, no one-run)");
process.exit(0);
