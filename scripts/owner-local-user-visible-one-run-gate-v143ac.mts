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
import { pathToFileURL } from "node:url";

const LOCK_PATH = resolve(".nonga-owner-local-one-run-v143ac-user-visible.lock.json");
const REQUIRED_APPROVAL_TEXT =
  "FINAL EXECUTION AUTHORIZE v14.3AC USER-VISIBLE FIREBASE SAME-CMD EXACTLY-ONE-RUN";
const REQUIRED_DISPATCH_APPROVAL_TEXT =
  "FINAL EXECUTION AUTHORIZE v14.3AJ USER-VISIBLE FIREBASE DISPATCH SAME-CMD EXACTLY-ONE-RUN";
const MAX_APPROVAL_AGE_MS = 15 * 60 * 1000;
const TARGET_PATH = "/api/ai/chat-user-visible-orchestrate";
const TARGET_ORIGIN = "https://a.nongbot.org";
const TARGET_URL = `${TARGET_ORIGIN}${TARGET_PATH}`;

const SYNTHETIC_DISPATCH_USER_MESSAGE =
  "ลูกค้าทดลองถามแบบไม่มีข้อมูลจริง: ช่วยสรุปจุดเด่นของคันที่ 1 และ 2 แบบสุภาพสำหรับครอบครัวหน่อยครับ";
const SYNTHETIC_PILOT_SESSION_CONTEXT = {
  recentCarCards: [
    {
      index: 1,
      brand: "Toyota",
      model: "Yaris Ativ",
      year: 2020,
      price: 419000,
      mileage: 56000,
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
      description: "รถครอบครัวขนาดกะทัดรัด เน้นใช้งานในเมือง",
    },
    {
      index: 2,
      brand: "Honda",
      model: "City",
      year: 2020,
      price: 449000,
      mileage: 61000,
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
      description: "ห้องโดยสารนั่งสบาย เหมาะใช้เดินทางครอบครัว",
    },
  ],
  lastSearchBudgetMax: 500000,
} as const;

type ParsedArgs = {
  executeApproved: boolean;
  dispatchApproved: boolean;
  approvalFile: string | null;
  unknownArgs: string[];
};

type FirebaseTokenState = {
  present: boolean;
  shapeValid: boolean;
};

class HoldError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "HoldError";
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  let executeApproved = false;
  let dispatchApproved = false;
  let approvalFile: string | null = null;
  const unknownArgs: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--execute-approved") {
      executeApproved = true;
      continue;
    }
    if (arg === "--dispatch-approved") {
      dispatchApproved = true;
      continue;
    }
    if (arg === "--approval-file") {
      approvalFile = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    unknownArgs.push(arg);
  }
  return { executeApproved, dispatchApproved, approvalFile, unknownArgs };
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
  throw new HoldError(reason);
}

function normalizeRunId(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function parseDispatchApprovalRunIdOrHold(approvalText: string): string {
  const match = approvalText.match(
    /^FINAL EXECUTION AUTHORIZE\s+([A-Za-z0-9._-]+)\s+USER-VISIBLE FIREBASE DISPATCH SAME-CMD EXACTLY-ONE-RUN$/
  );
  if (!match) {
    hold("dispatch approval text format invalid for one-run namespace");
  }
  const runId = normalizeRunId(match[1]);
  if (runId.length === 0) {
    hold("dispatch run id is missing for one-run namespace");
  }
  return runId;
}

export function resolveDispatchLockPathForApprovalTextOrHold(approvalText: string): string {
  const runId = parseDispatchApprovalRunIdOrHold(approvalText);
  return resolve(`.nonga-owner-local-one-run-${runId}-user-visible-dispatch.lock.json`);
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

function loadLock(pathValue: string): { consumed: boolean } {
  if (!existsSync(pathValue)) return { consumed: false };
  try {
    const parsed = JSON.parse(readFileSync(pathValue, "utf8")) as { consumed?: boolean };
    return { consumed: parsed.consumed === true };
  } catch {
    return { consumed: true };
  }
}

function consumeLockOrHold(pathValue: string, reason: string): void {
  try {
    writeFileSync(
      pathValue,
      JSON.stringify(
        {
          consumed: true,
          consumedAtUtc: new Date().toISOString(),
          reason,
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
  hold("user-visible Firebase auth adapter reached controlled preflight");
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizePreview(input: string): string {
  const collapsed = input.replace(/\s+/g, " ").trim();
  const redacted = collapsed
    .replace(/\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/gi, "Bearer ***REDACTED***")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "***@***")
    .replace(/\b[A-Za-z0-9_-]{18,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "***JWT***");
  return redacted.slice(0, 120);
}

function classifyDispatchErrorMessage(raw: string): string {
  const message = raw.trim().toLowerCase();
  if (!message) return "missing";
  if (message.includes("missing firebase id token")) return "missing_firebase_id_token";
  if (message.includes("invalid firebase id token")) return "invalid_firebase_id_token";
  if (message.includes("firebase admin credentials")) return "firebase_admin_credentials_missing";
  if (message.includes("กรุณาเข้าสู่ระบบ")) return "localized_auth_required";
  return "other";
}

function readBooleanFromCandidates(...values: unknown[]): boolean | null {
  for (const value of values) {
    const parsed = readBoolean(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

async function runControlledProviderDispatchOrHold(firebaseIdToken: string): Promise<void> {
  console.log("runtimeAdapter=entered");
  console.log("runtimeAdapterPolicy=user-visible-firebase-auth-dispatch-v143ag");
  console.log(`dispatchTargetPath=${TARGET_PATH}`);
  console.log(`dispatchTargetOrigin=${TARGET_ORIGIN}`);

  let response: Response;
  try {
    response = await fetch(TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firebaseIdToken}`,
      },
      body: JSON.stringify({
        userMessage: SYNTHETIC_DISPATCH_USER_MESSAGE,
        attachedImageCount: 0,
        pilotSessionContext: SYNTHETIC_PILOT_SESSION_CONTEXT,
      }),
    });
  } catch {
    hold("dispatch network/request failure (fail-closed)");
  }

  const dispatchHttpStatus = response.status;
  const responseContentType = response.headers.get("content-type") ?? "missing";
  let responseBodyText = "";
  try {
    responseBodyText = await response.text();
  } catch {
    hold("dispatch response body read failure");
  }

  console.log(`dispatchHttpStatus=${dispatchHttpStatus}`);
  console.log(`dispatchResponseContentType=${responseContentType}`);
  console.log(`dispatchResponseBodyChars=${responseBodyText.length}`);

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(responseBodyText);
  } catch {
    hold("dispatch response is not valid JSON");
  }

  if (!response.ok) {
    const parsedRecord = isObjectRecord(parsed) ? parsed : null;
    const responseErrorCode = readTrimmedString(parsedRecord?.code);
    const responseErrorMessage = readTrimmedString(parsedRecord?.message);
    console.log(`dispatchResponseErrorCode=${responseErrorCode || "missing"}`);
    console.log(
      `dispatchResponseErrorMessageClass=${classifyDispatchErrorMessage(responseErrorMessage)}`
    );
    console.log(`dispatchResponseBodyMaskedPreview=${sanitizePreview(responseBodyText) || "empty"}`);
    hold(`dispatch response http-not-ok (${response.status})`);
  }

  if (!isObjectRecord(parsed) || parsed.success !== true || !isObjectRecord(parsed.data)) {
    hold("dispatch response missing success/data envelope");
  }

  const data = parsed.data as Record<string, unknown>;
  const gateDiag = isObjectRecord(data.userVisibleGateDiagnostic)
    ? data.userVisibleGateDiagnostic
    : null;
  const runtimeDiag = isObjectRecord(data.userVisibleRuntimeDiagnostic)
    ? data.userVisibleRuntimeDiagnostic
    : null;

  const pilotPathActive = readBoolean(data.pilotPathActive);
  const fallbackToLegacy = readBoolean(data.fallbackToLegacy);
  const skipGemini = readBoolean(data.skipGemini);
  const providerNetwork = readBooleanFromCandidates(data.realProviderNetwork, data.providerNetwork);
  const allowlistMatch = readBooleanFromCandidates(gateDiag?.allowlistMatch, data.allowlistMatch);
  const userVisibleEnabled = readBooleanFromCandidates(
    runtimeDiag?.userVisibleEnabled,
    data.userVisibleEnabled
  );
  const leadPiiCueGuardActive = readBooleanFromCandidates(
    runtimeDiag?.leadPiiCueGuardActive,
    data.leadPiiCueGuardActive
  );
  const phoneEchoGuardActive = readBooleanFromCandidates(
    runtimeDiag?.phoneEchoGuardActive,
    data.phoneEchoGuardActive
  );
  const safeConfirmationStepWordingActive = readBooleanFromCandidates(
    runtimeDiag?.safeConfirmationStepWordingActive,
    data.safeConfirmationStepWordingActive
  );
  const guardPolicyVersion = readTrimmedString(
    runtimeDiag?.guardPolicyVersion ?? data.guardPolicyVersion
  );
  const gateReason = readTrimmedString(data.realProviderGateReason ?? data.gateReason);

  const evidenceComplete =
    pilotPathActive === true &&
    fallbackToLegacy === false &&
    skipGemini === false &&
    providerNetwork === true &&
    gateReason === "real_provider_call_ok" &&
    allowlistMatch === true &&
    userVisibleEnabled === true &&
    guardPolicyVersion.length > 0 &&
    leadPiiCueGuardActive === true &&
    phoneEchoGuardActive === true &&
    safeConfirmationStepWordingActive === true;

  if (!evidenceComplete) {
    const missingFields: string[] = [];
    if (pilotPathActive !== true) missingFields.push("pilotPathActive!=true");
    if (fallbackToLegacy !== false) missingFields.push("fallbackToLegacy!=false");
    if (skipGemini !== false) missingFields.push("skipGemini!=false");
    if (providerNetwork !== true) missingFields.push("providerNetwork!=true");
    if (gateReason !== "real_provider_call_ok") missingFields.push("gateReason!=real_provider_call_ok");
    if (allowlistMatch !== true) missingFields.push("allowlistMatch!=true");
    if (userVisibleEnabled !== true) missingFields.push("userVisibleEnabled!=true");
    if (guardPolicyVersion.length === 0) missingFields.push("guardPolicyVersion=missing");
    if (leadPiiCueGuardActive !== true) missingFields.push("leadPiiCueGuardActive!=true");
    if (phoneEchoGuardActive !== true) missingFields.push("phoneEchoGuardActive!=true");
    if (safeConfirmationStepWordingActive !== true) {
      missingFields.push("safeConfirmationStepWordingActive!=true");
    }
    console.log(`dispatchEvidenceSchema=success.data{...}`);
    console.log(`dispatchEvidenceGateReason=${gateReason || "missing"}`);
    console.log(`dispatchEvidenceMissingFields=${missingFields.join(",") || "none"}`);
    hold("dispatch response missing required guarded runtime evidence");
  }

  console.log("providerCall=run");
  console.log("Gemini/runtime=run");
  console.log("providerNetwork=true");
  console.log("fallbackToLegacy=false");
  console.log("skipGemini=false");
  console.log("gateReason=real_provider_call_ok");
  console.log("pilotPathActive=true");
  console.log("allowlistMatch=true");
  console.log("userVisibleEnabled=true");
  console.log("guardPolicyVersion=present");
  console.log("leadPiiCueGuardActive=true");
  console.log("phoneEchoGuardActive=true");
  console.log("safeConfirmationStepWordingActive=true");
  console.log("tokenExposure=masked-only");
  console.log("PASS — user-visible Firebase dispatch evidence captured");
  return;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  console.log("owner-local-user-visible-one-run-gate-v143ac");
  console.log("firebaseToken: ***MASKED***");
  console.log(`executeApproved=${args.executeApproved ? "true" : "false"}`);
  console.log(`dispatchApproved=${args.dispatchApproved ? "true" : "false"}`);
  console.log("authModel=firebase-id-token");
  console.log(`targetPath=${TARGET_PATH}`);
  console.log("stagingOnly=yes");
  console.log("ownerAdminAllowlistExpectation=documented");

  if (!args.executeApproved) {
    console.log("PASS — dry-run gate packet is present (no runtime/provider execution)");
    return 0;
  }

  if (args.unknownArgs.length > 0) hold("unexpected arguments detected; exact command only");

  const tokenRaw = String(process.env.NONGA_OWNER_FIREBASE_ID_TOKEN ?? "");
  const token = checkFirebaseIdToken(tokenRaw);
  if (!token.present) hold("same-CMD Firebase ID token missing");
  if (!token.shapeValid) hold("same-CMD Firebase ID token invalid-shape or unsafe");

  if (process.env.NONGA_ADMIN_API_TOKEN?.trim()) {
    hold("admin token must not be used for user-visible Firebase auth route");
  }

  const approvalText = readApprovalFileOrHold(args.approvalFile);
  const requiredApprovalText = args.dispatchApproved
    ? REQUIRED_DISPATCH_APPROVAL_TEXT
    : REQUIRED_APPROVAL_TEXT;
  if (approvalText !== requiredApprovalText) {
    hold("fresh owner approval text mismatch");
  }

  const selectedLockPath = args.dispatchApproved
    ? resolveDispatchLockPathForApprovalTextOrHold(requiredApprovalText)
    : LOCK_PATH;
  const lock = loadLock(selectedLockPath);
  if (lock.consumed) hold("one-run already consumed (retry/second-run blocked)");

  consumeLockOrHold(
    selectedLockPath,
    args.dispatchApproved
      ? "user_visible_firebase_dispatch_entry_started"
      : "user_visible_firebase_auth_preflight_entry_started"
  );

  if (args.dispatchApproved) {
    await runControlledProviderDispatchOrHold(tokenRaw);
    return 0;
  }

  runControlledRuntimeAdapterPreflight();
}

const isDirectExecution = (() => {
  const entryArg = process.argv[1];
  if (!entryArg) return false;
  return import.meta.url === pathToFileURL(resolve(entryArg)).href;
})();

if (isDirectExecution) {
  void main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((err) => {
      if (err instanceof HoldError) {
        process.exitCode = 1;
        return;
      }
      console.log("HOLD — unexpected wrapper failure");
      process.exitCode = 1;
    });
}
