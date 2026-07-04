export interface OwnerOneRunEvidence {
  capturedAtIso: string;
  httpStatus: number;
  auth: "pass" | "fail" | "unknown";
  pilotPathActive: string;
  fallbackToLegacy: string;
  skipGemini: string;
  carCardCount: string;
  providerNetwork: string;
  gateReason: string;
  requestUidMasked: string;
  allowlistMasked: string;
  allowlistMatch: string;
  allowlistCount: string;
  runtimeMode: string;
  userVisibleEnabled: string;
  pilotContextPresent: string;
  serverRecentCarCardsCount: string;
  pilotInactiveReason: string;
  guardPolicyVersion: string;
  leadPiiCueGuardActive: string;
  phoneEchoGuardActive: string;
  safeConfirmationStepWordingActive: string;
  userVisibleTextSanitized: string;
  userVisibleTextMissing: boolean;
  userVisibleTextMissingReason: string;
  answerFieldSource: string;
  answerCharCount: number;
  runSessionLocked: boolean;
}

function readBooleanField(value: unknown): string {
  if (typeof value !== "boolean") return "unknown";
  return value ? "true" : "false";
}

function readCountField(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
  return String(Math.max(0, Math.floor(value)));
}

function readStatusField(value: unknown): "pass" | "fail" | "unknown" {
  if (value === "pass" || value === "fail") return value;
  return "unknown";
}

function sanitizeAnswerText(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 1200);
}

function pickFirstStringField(
  payloadData: Record<string, unknown>,
  fields: string[]
): { value: string; source: string } {
  for (const field of fields) {
    const raw = payloadData[field];
    if (typeof raw === "string" && raw.trim()) {
      return { value: sanitizeAnswerText(raw), source: field };
    }
  }
  return { value: "", source: "none" };
}

export function buildOwnerOneRunEvidence(input: {
  responseStatus: number;
  payloadData: Record<string, unknown> | null;
  fallbackCapturedAtIso: string;
  runSessionLocked: boolean;
}): OwnerOneRunEvidence {
  const payload = input.payloadData ?? {};
  const gateDiagnostic =
    payload.userVisibleGateDiagnostic && typeof payload.userVisibleGateDiagnostic === "object"
      ? (payload.userVisibleGateDiagnostic as Record<string, unknown>)
      : {};
  const runtimeDiagnostic =
    payload.userVisibleRuntimeDiagnostic && typeof payload.userVisibleRuntimeDiagnostic === "object"
      ? (payload.userVisibleRuntimeDiagnostic as Record<string, unknown>)
      : {};

  const answerCandidate = pickFirstStringField(payload, [
    "sanitizedUserVisibleText",
    "userVisibleText",
    "assistantText",
    "answerText",
    "finalText",
    "content",
    "message",
  ]);

  const missingUserVisibleTextRaw = payload.missingUserVisibleText;
  const userVisibleTextMissing =
    typeof missingUserVisibleTextRaw === "boolean"
      ? missingUserVisibleTextRaw
      : answerCandidate.value.length === 0;

  const userVisibleTextMissingReason =
    typeof payload.missingUserVisibleTextReason === "string" &&
    payload.missingUserVisibleTextReason.trim()
      ? payload.missingUserVisibleTextReason.trim()
      : userVisibleTextMissing
        ? "missing_or_empty_user_visible_text"
        : "none";

  const blockedReason =
    typeof gateDiagnostic.blockedReason === "string" ? gateDiagnostic.blockedReason : "unknown";
  const realProviderGateReason =
    typeof payload.realProviderGateReason === "string" ? payload.realProviderGateReason : "unknown";

  const authFromPayload = readStatusField(payload.auth);
  const authFromHttp =
    input.responseStatus === 401 || input.responseStatus === 403
      ? "fail"
      : input.responseStatus >= 200 && input.responseStatus < 300
        ? "pass"
        : "unknown";

  const capturedAtIso =
    typeof payload.evidenceCapturedAt === "string" && payload.evidenceCapturedAt.trim()
      ? payload.evidenceCapturedAt.trim()
      : input.fallbackCapturedAtIso;

  return {
    capturedAtIso,
    httpStatus: input.responseStatus,
    auth: authFromPayload === "unknown" ? authFromHttp : authFromPayload,
    pilotPathActive: readBooleanField(payload.pilotPathActive),
    fallbackToLegacy: readBooleanField(payload.fallbackToLegacy),
    skipGemini: readBooleanField(payload.skipGemini),
    carCardCount: readCountField(payload.carCardCount),
    providerNetwork: readBooleanField(payload.realProviderNetwork),
    gateReason: realProviderGateReason !== "unknown" ? realProviderGateReason : blockedReason,
    requestUidMasked:
      typeof gateDiagnostic.requestUidMasked === "string"
        ? gateDiagnostic.requestUidMasked
        : "***",
    allowlistMasked: Array.isArray(gateDiagnostic.allowlistMasked)
      ? gateDiagnostic.allowlistMasked
          .filter((x) => typeof x === "string")
          .join(",")
      : "unknown",
    allowlistMatch: readBooleanField(gateDiagnostic.allowlistMatch),
    allowlistCount: readCountField(gateDiagnostic.allowlistCount),
    runtimeMode:
      typeof runtimeDiagnostic.runtimeMode === "string" ? runtimeDiagnostic.runtimeMode : "unknown",
    userVisibleEnabled: readBooleanField(runtimeDiagnostic.userVisibleEnabled),
    pilotContextPresent: readBooleanField(runtimeDiagnostic.pilotContextPresentServer),
    serverRecentCarCardsCount: readCountField(runtimeDiagnostic.serverRecentCarCardsCount),
    pilotInactiveReason:
      typeof runtimeDiagnostic.pilotInactiveReason === "string"
        ? runtimeDiagnostic.pilotInactiveReason
        : "unknown",
    guardPolicyVersion:
      typeof runtimeDiagnostic.guardPolicyVersion === "string"
        ? runtimeDiagnostic.guardPolicyVersion
        : "unknown",
    leadPiiCueGuardActive: readBooleanField(runtimeDiagnostic.leadPiiCueGuardActive),
    phoneEchoGuardActive: readBooleanField(runtimeDiagnostic.phoneEchoGuardActive),
    safeConfirmationStepWordingActive: readBooleanField(
      runtimeDiagnostic.safeConfirmationStepWordingActive
    ),
    userVisibleTextSanitized: answerCandidate.value,
    userVisibleTextMissing,
    userVisibleTextMissingReason,
    answerFieldSource: answerCandidate.source,
    answerCharCount: answerCandidate.value.length,
    runSessionLocked: input.runSessionLocked,
  };
}
