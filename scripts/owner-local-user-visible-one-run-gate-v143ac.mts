/**
 * v14.3AC owner-local one-run gate wrapper (user-visible Firebase auth path)
 * Fail-closed command packet for controlled preflight only.
 *
 * Safety intent:
 * - Requires same-CMD Firebase ID token env presence/shape.
 * - Requires fresh owner approval evidence file exact match.
 * - Enforces exactly-one-run lock (blocks retry/second-run).
 * - Never prints token value.
 * - Does not execute provider/Gemini/runtime network in v14.3AC.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCK_PATH = resolve(".nonga-owner-local-one-run-v143ac-user-visible.lock.json");
const REQUIRED_APPROVAL_TEXT =
  "FINAL EXECUTION AUTHORIZE v14.3AC USER-VISIBLE FIREBASE SAME-CMD EXACTLY-ONE-RUN";
const MAX_APPROVAL_AGE_MS = 15 * 60 * 1000;

type ParsedArgs = {
  executeApproved: boolean;
  approvalFile: string | null;
  unknownArgs: string[];
};

type FirebaseTokenState = {
  present: boolean;
  shapeValid: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  let executeApproved = false;
  let approvalFile: string | null = null;
  const unknownArgs: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--execute-approved") {
      executeApproved = true;
      continue;
    }
    if (arg === "--approval-file") {
      approvalFile = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    unknownArgs.push(arg);
  }
  return { executeApproved, approvalFile, unknownArgs };
}

function isJwtLike(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  return parts.every((part) => /^[A-Za-z0-9\-_]+$/.test(part) && part.length > 0);
}

function checkFirebaseIdToken(raw: string | undefined): FirebaseTokenState {
  const token = typeof raw === "string" ? raw : "";
  const present = token.length > 0;
  const shapeValid =
    present &&
    token === token.trim() &&
    !/[\r\n]/.test(token) &&
    !/^['"].*['"]$/.test(token) &&
    !/^\$[A-Z0-9_]+$/i.test(token) &&
    !/^\$\{[A-Z0-9_]+\}$/i.test(token) &&
    !/^(undefined|null)$/i.test(token) &&
    !/^NONGA_OWNER_FIREBASE_ID_TOKEN$/i.test(token) &&
    !/^NONGA_ADMIN_API_TOKEN$/i.test(token) &&
    !/^Bearer\s+/i.test(token) &&
    isJwtLike(token);
  return { present, shapeValid };
}

function hold(reason: string): never {
  console.log(`HOLD — ${reason}`);
  process.exit(1);
}

function readApprovalFileOrHold(pathValue: string | null): string {
  if (!pathValue) hold("approval file is required (--approval-file <path>)");
  const resolved = resolve(pathValue);
  if (!existsSync(resolved)) hold("approval file not found");

  let mtimeMs = 0;
  try {
    mtimeMs = statSync(resolved).mtimeMs;
  } catch {
    hold("cannot read approval file metadata");
  }
  const ageMs = Math.max(0, Date.now() - mtimeMs);
  if (ageMs > MAX_APPROVAL_AGE_MS) {
    hold("approval file is not fresh enough (recreate in same CMD session)");
  }

  return readFileSync(resolved, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
}

function loadLock(): { consumed: boolean } {
  if (!existsSync(LOCK_PATH)) return { consumed: false };
  try {
    const parsed = JSON.parse(readFileSync(LOCK_PATH, "utf8")) as { consumed?: boolean };
    return { consumed: parsed.consumed === true };
  } catch {
    return { consumed: true };
  }
}

function consumeLockOrHold(): void {
  try {
    writeFileSync(
      LOCK_PATH,
      JSON.stringify(
        {
          consumed: true,
          consumedAtUtc: new Date().toISOString(),
          reason: "user_visible_firebase_auth_preflight_entry_started",
        },
        null,
        2
      ) + "\n",
      "utf8"
    );
  } catch {
    hold("cannot persist one-run lock");
  }
}

function runControlledRuntimeAdapterPreflight(): never {
  console.log("runtimeAdapter=entered");
  console.log("runtimeAdapterPolicy=user-visible-firebase-auth-preflight");
  console.log("providerCall=not_run");
  console.log("Gemini/runtime=not_run");
  console.log("providerNetwork=not_run");
  console.log("deploy=not_run");
  console.log("runtimeMutation=not_run");
  console.log("tokenExposure=masked-only");
  console.log(
    "HOLD — user-visible Firebase auth adapter reached controlled preflight"
  );
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

console.log("owner-local-user-visible-one-run-gate-v143ac");
console.log("firebaseToken: ***MASKED***");
console.log(`executeApproved=${args.executeApproved ? "true" : "false"}`);
console.log("authModel=firebase-id-token");
console.log("targetPath=/api/ai/chat-user-visible-orchestrate");
console.log("stagingOnly=yes");
console.log("ownerAdminAllowlistExpectation=documented");

if (!args.executeApproved) {
  console.log("PASS — dry-run gate packet is present (no runtime/provider execution)");
  process.exit(0);
}

if (args.unknownArgs.length > 0) hold("unexpected arguments detected; exact command only");

const token = checkFirebaseIdToken(process.env.NONGA_OWNER_FIREBASE_ID_TOKEN);
if (!token.present) hold("same-CMD Firebase ID token missing");
if (!token.shapeValid) hold("same-CMD Firebase ID token invalid-shape or unsafe");

if (process.env.NONGA_ADMIN_API_TOKEN?.trim()) {
  hold("admin token must not be used for user-visible Firebase auth route");
}

const approvalText = readApprovalFileOrHold(args.approvalFile);
if (approvalText !== REQUIRED_APPROVAL_TEXT) hold("fresh owner approval text mismatch");

const lock = loadLock();
if (lock.consumed) hold("one-run already consumed (retry/second-run blocked)");

consumeLockOrHold();
runControlledRuntimeAdapterPreflight();
