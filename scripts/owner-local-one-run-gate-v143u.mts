/**
 * v14.3T owner-local one-run gate wrapper
 * Fail-closed command packet for next approved execution round.
 *
 * Safety intent:
 * - Requires same-CMD token env presence/format.
 * - Requires fresh owner approval evidence file.
 * - Enforces one-run lock (blocks retry/second-run).
 * - Never prints token value.
 * - Does not execute Gemini/provider in v14.3T.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCK_PATH = resolve(".nonga-owner-local-one-run-v143u.lock.json");
const REQUIRED_APPROVAL_TEXT =
  "FINAL EXECUTION AUTHORIZE v14.3U OWNER-LOCAL ONE-RUN\n" +
  "I approve exactly one owner-local staging Gemini run.\n" +
  "No retry.\n" +
  "No second run.\n" +
  "No production.\n" +
  "No public route.\n" +
  "No real lead.\n" +
  "No real customer data / PII.\n" +
  "I understand one-run is consumed only if runtime execution starts.";

type TokenState = {
  present: boolean;
  formatValid: boolean;
};

function parseArgs(argv: string[]): { executeApproved: boolean; approvalFile: string | null } {
  let executeApproved = false;
  let approvalFile: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--execute-approved") {
      executeApproved = true;
      continue;
    }
    if (arg === "--approval-file") {
      approvalFile = argv[i + 1] ?? null;
      i += 1;
    }
  }
  return { executeApproved, approvalFile };
}

function checkToken(raw: string | undefined): TokenState {
  const token = typeof raw === "string" ? raw : "";
  const present = token.length > 0;
  const formatValid =
    present &&
    token === token.trim() &&
    !/[\r\n]/.test(token) &&
    !/^['"].*['"]$/.test(token) &&
    !/^\$[A-Z0-9_]+$/i.test(token) &&
    !/^\$\{[A-Z0-9_]+\}$/i.test(token) &&
    !/^(undefined|null)$/i.test(token) &&
    !/^NONGA_ADMIN_API_TOKEN$/i.test(token) &&
    !/^Bearer\s+/i.test(token);
  return { present, formatValid };
}

function hold(reason: string): never {
  console.log(`HOLD — ${reason}`);
  process.exit(1);
}

function readApprovalFileOrHold(pathValue: string | null): string {
  if (!pathValue) hold("approval file is required (--approval-file <path>)");
  const resolved = resolve(pathValue);
  if (!existsSync(resolved)) hold("approval file not found");
  return readFileSync(resolved, "utf8").replace(/\r\n/g, "\n").trim();
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

const args = parseArgs(process.argv.slice(2));

console.log("owner-local-one-run-gate-v143u");
console.log("token: ***MASKED***");
console.log(`executeApproved=${args.executeApproved ? "true" : "false"}`);

if (!args.executeApproved) {
  console.log("PASS — dry-run gate packet is present (no runtime/provider execution)");
  process.exit(0);
}

const token = checkToken(process.env.NONGA_ADMIN_API_TOKEN);
if (!token.present) hold("same-CMD token missing");
if (!token.formatValid) hold("same-CMD token format invalid or unsafe");

const approvalText = readApprovalFileOrHold(args.approvalFile);
if (approvalText !== REQUIRED_APPROVAL_TEXT) hold("fresh owner approval text mismatch");

const lock = loadLock();
if (lock.consumed) hold("one-run already consumed (retry/second-run blocked)");

/**
 * v14.3T policy: do not run Gemini/provider in this round.
 * This wrapper is command-disambiguation only, so execution path is intentionally blocked.
 */
console.log("HOLD — runtime execution adapter is disabled in v14.3T packet");
console.log("No provider call, no deploy, no runtime mutation performed.");
process.exit(1);
