/**
 * v14.3AD read-only local status checker for v14.3AC owner-local run.
 * Safe local-only diagnostics. No network call. No provider call. No lock/runtime mutation.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const LOCK_PATH = resolve(".nonga-owner-local-one-run-v143ac-user-visible.lock.json");
const APPROVAL_PATH = resolve("v14.3AC-user-visible-local-approval.txt");
const REQUIRED_APPROVAL_TEXT =
  "FINAL EXECUTION AUTHORIZE v14.3AC USER-VISIBLE FIREBASE SAME-CMD EXACTLY-ONE-RUN";

function isJwtLike(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  return parts.every((part) => /^[A-Za-z0-9\-_]+$/.test(part) && part.length > 0);
}

function firebaseTokenShapeStatus(raw: string | undefined): string {
  const token = typeof raw === "string" ? raw : "";
  if (!token) return "missing";
  const looksValid =
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
  return looksValid ? "valid-shape" : "invalid-shape";
}

function readApprovalStatus(): {
  exists: boolean;
  textMatch: "match" | "mismatch" | "not_checked";
  ageMinutes: string;
} {
  if (!existsSync(APPROVAL_PATH)) {
    return { exists: false, textMatch: "not_checked", ageMinutes: "n/a" };
  }
  let textMatch: "match" | "mismatch" = "mismatch";
  let ageMinutes = "unknown";
  try {
    const raw = readFileSync(APPROVAL_PATH, "utf8")
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n")
      .trim();
    textMatch = raw === REQUIRED_APPROVAL_TEXT ? "match" : "mismatch";
  } catch {
    textMatch = "mismatch";
  }
  try {
    const mtimeMs = statSync(APPROVAL_PATH).mtimeMs;
    ageMinutes = `${Math.max(0, Math.floor((Date.now() - mtimeMs) / 60000))}`;
  } catch {
    ageMinutes = "unknown";
  }
  return { exists: true, textMatch, ageMinutes };
}

function readLockStatus(): {
  exists: boolean;
  consumed: "true" | "false" | "unknown";
  consumedAtUtc: string;
  reason: string;
} {
  if (!existsSync(LOCK_PATH)) {
    return {
      exists: false,
      consumed: "false",
      consumedAtUtc: "n/a",
      reason: "n/a",
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(LOCK_PATH, "utf8")) as {
      consumed?: boolean;
      consumedAtUtc?: string;
      reason?: string;
    };
    return {
      exists: true,
      consumed: parsed.consumed === true ? "true" : "false",
      consumedAtUtc:
        typeof parsed.consumedAtUtc === "string" && parsed.consumedAtUtc.trim()
          ? parsed.consumedAtUtc
          : "unknown",
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason
          : "unknown",
    };
  } catch {
    return {
      exists: true,
      consumed: "unknown",
      consumedAtUtc: "unknown",
      reason: "lock_parse_error",
    };
  }
}

const tokenShape = firebaseTokenShapeStatus(process.env.NONGA_OWNER_FIREBASE_ID_TOKEN);
const adminPresent = (process.env.NONGA_ADMIN_API_TOKEN ?? "").trim().length > 0;
const approval = readApprovalStatus();
const lock = readLockStatus();

console.log("v14.3AC-owner-local-run-status");
console.log(`firebaseToken: ${tokenShape === "missing" ? "missing" : "***MASKED***"}`);
console.log(`firebaseTokenShape=${tokenShape}`);
console.log(`adminTokenPresent=${adminPresent ? "yes" : "no"}`);
console.log(`approvalFileExists=${approval.exists ? "yes" : "no"}`);
console.log(`approvalTextMatch=${approval.textMatch}`);
console.log(`approvalFileAgeMinutes=${approval.ageMinutes}`);
console.log(`lockFileExists=${lock.exists ? "yes" : "no"}`);
console.log(`lockConsumed=${lock.consumed}`);
console.log(`lockConsumedAtUtc=${lock.consumedAtUtc}`);
console.log(`lockReason=${lock.reason}`);
console.log("providerCall=not_run");
console.log("Gemini/runtime=not_run");
console.log("providerNetwork=not_run");
console.log("runtimeMutation=not_run");
console.log("tokenExposure=masked-only");
