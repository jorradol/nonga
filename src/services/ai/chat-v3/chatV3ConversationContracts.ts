/**
 * WP-V3-07B — Chat V.3 thin conversation request/response contracts + validation.
 * Client must not send system role, provider/model names, or secrets.
 */

export const CHAT_V3_CONVERSATION_ROUTE = "/api/ai/chat-v3-converse";
export const CHAT_V3_CONVERSATION_SLICE_ID = "wp-v3-07b-thin-conversation";

export const CHAT_V3_MAX_MESSAGE_LENGTH = 4000;
export const CHAT_V3_MAX_HISTORY_TURNS = 20;
export const CHAT_V3_MAX_HISTORY_CONTENT_CHARS = 24_000;
export const CHAT_V3_MAX_CONVERSATION_ID_LENGTH = 128;

export const CHAT_V3_EXPERT_MODES = [
  "AUTO",
  "BUYING",
  "MAINTENANCE",
  "REPAIR",
  "INSURANCE",
  "FINANCE",
] as const;

export type ChatV3RuntimeExpertMode = (typeof CHAT_V3_EXPERT_MODES)[number];

export type ChatV3HistoryRole = "user" | "assistant";

export interface ChatV3HistoryTurn {
  role: ChatV3HistoryRole;
  content: string;
}

/** Optional vehicle context for WP-V3-09 reasoning (server-composed; client may send facts only). */
export interface ChatV3VehicleContextItemDto {
  id: string;
  label: string;
  summary?: string;
  facts?: Record<string, string>;
}

export interface ChatV3AutomotiveVehicleContextDto {
  selectedVehicleId?: string | null;
  vehicles: ChatV3VehicleContextItemDto[];
}

export interface ChatV3ConversationRequest {
  conversationId: string;
  message: string;
  history: ChatV3HistoryTurn[];
  expertMode?: ChatV3RuntimeExpertMode | string;
  /** Optional. Known vehicles in this conversation only — never invent facts client-side. */
  vehicleContext?: ChatV3AutomotiveVehicleContextDto;
}

export type ChatV3ConversationErrorCode =
  | "empty_message"
  | "invalid_conversation_id"
  | "invalid_history"
  | "history_too_large"
  | "role_not_allowed"
  | "client_forbidden_field"
  | "kill_switch"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_rejected"
  | "provider_failure"
  | "unsafe_output"
  | "internal_error";

export interface ChatV3ConversationSuccessData {
  sliceId: typeof CHAT_V3_CONVERSATION_SLICE_ID;
  conversationId: string;
  messageId: string;
  content: string;
  expertModeHint: ChatV3RuntimeExpertMode;
  providerId: string;
}

export interface ChatV3ConversationSuccessResponse {
  success: true;
  data: ChatV3ConversationSuccessData;
}

export interface ChatV3ConversationErrorResponse {
  success: false;
  errorCode: ChatV3ConversationErrorCode;
  message: string;
}

export type ChatV3ConversationResponse =
  | ChatV3ConversationSuccessResponse
  | ChatV3ConversationErrorResponse;

export interface ChatV3ValidatedConversationRequest {
  conversationId: string;
  message: string;
  history: ChatV3HistoryTurn[];
  expertMode: ChatV3RuntimeExpertMode;
  vehicleContext?: ChatV3AutomotiveVehicleContextDto;
}

const FORBIDDEN_CLIENT_KEYS = [
  "systemPrompt",
  "systemInstruction",
  "provider",
  "providerId",
  "model",
  "modelId",
  "apiKey",
  "secret",
  "token",
  "GEMINI_API_KEY",
] as const;

export const CHAT_V3_USER_FACING_UNAVAILABLE =
  "ระบบผู้ช่วยยังตอบไม่ได้ชั่วคราว กรุณาลองใหม่อีกครั้งในอีกสักครู่ครับ";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeExpertMode(raw: unknown): ChatV3RuntimeExpertMode {
  const value = String(raw ?? "AUTO").trim().toUpperCase();
  return (CHAT_V3_EXPERT_MODES as readonly string[]).includes(value)
    ? (value as ChatV3RuntimeExpertMode)
    : "AUTO";
}

function truncateHistoryToLimits(history: ChatV3HistoryTurn[]): ChatV3HistoryTurn[] {
  const capped = history.slice(-CHAT_V3_MAX_HISTORY_TURNS);
  let total = 0;
  const kept: ChatV3HistoryTurn[] = [];
  for (let index = capped.length - 1; index >= 0; index -= 1) {
    const turn = capped[index];
    const nextTotal = total + turn.content.length;
    if (nextTotal > CHAT_V3_MAX_HISTORY_CONTENT_CHARS && kept.length > 0) {
      break;
    }
    kept.unshift(turn);
    total = nextTotal;
  }
  return kept;
}

export function validateChatV3ConversationRequest(
  raw: unknown
):
  | { ok: true; value: ChatV3ValidatedConversationRequest }
  | { ok: false; errorCode: ChatV3ConversationErrorCode; message: string } {
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      errorCode: "invalid_history",
      message: "รูปแบบคำขอไม่ถูกต้อง",
    };
  }

  for (const key of FORBIDDEN_CLIENT_KEYS) {
    if (key in raw) {
      return {
        ok: false,
        errorCode: "client_forbidden_field",
        message: "คำขอมีฟิลด์ที่ไม่อนุญาต",
      };
    }
  }

  const conversationId = String(raw.conversationId ?? "").trim();
  if (
    !conversationId ||
    conversationId.length > CHAT_V3_MAX_CONVERSATION_ID_LENGTH
  ) {
    return {
      ok: false,
      errorCode: "invalid_conversation_id",
      message: "ไม่พบรหัสห้องสนทนาที่ถูกต้อง",
    };
  }

  const message = String(raw.message ?? "").trim();
  if (!message) {
    return {
      ok: false,
      errorCode: "empty_message",
      message: "กรุณาพิมพ์ข้อความก่อนส่ง",
    };
  }
  if (message.length > CHAT_V3_MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      errorCode: "history_too_large",
      message: "ข้อความยาวเกินที่รองรับ",
    };
  }

  if (!Array.isArray(raw.history)) {
    return {
      ok: false,
      errorCode: "invalid_history",
      message: "ประวัติการสนทนาไม่ถูกต้อง",
    };
  }

  if (raw.history.length > CHAT_V3_MAX_HISTORY_TURNS) {
    return {
      ok: false,
      errorCode: "history_too_large",
      message: "ประวัติการสนทนายาวเกินที่รองรับ",
    };
  }

  const history: ChatV3HistoryTurn[] = [];
  for (const item of raw.history) {
    if (!isPlainObject(item)) {
      return {
        ok: false,
        errorCode: "invalid_history",
        message: "ประวัติการสนทนาไม่ถูกต้อง",
      };
    }
    const role = String(item.role ?? "").trim().toLowerCase();
    if (role === "system") {
      return {
        ok: false,
        errorCode: "role_not_allowed",
        message: "ไม่อนุญาตให้ส่งบทบาทระบบจากฝั่งลูกค้า",
      };
    }
    if (role !== "user" && role !== "assistant") {
      return {
        ok: false,
        errorCode: "role_not_allowed",
        message: "บทบาทในประวัติไม่ถูกต้อง",
      };
    }
    const content = String(item.content ?? "").trim();
    if (!content) {
      return {
        ok: false,
        errorCode: "invalid_history",
        message: "พบข้อความว่างในประวัติ",
      };
    }
    if (content.length > CHAT_V3_MAX_MESSAGE_LENGTH) {
      return {
        ok: false,
        errorCode: "history_too_large",
        message: "ประวัติการสนทนายาวเกินที่รองรับ",
      };
    }
    history.push({ role, content });
  }

  const totalHistoryChars = history.reduce((sum, turn) => sum + turn.content.length, 0);
  if (totalHistoryChars > CHAT_V3_MAX_HISTORY_CONTENT_CHARS) {
    return {
      ok: false,
      errorCode: "history_too_large",
      message: "ประวัติการสนทนายาวเกินที่รองรับ",
    };
  }

  const vehicleContext = normalizeVehicleContext(raw.vehicleContext);

  return {
    ok: true,
    value: {
      conversationId,
      message,
      history: truncateHistoryToLimits(history),
      expertMode: normalizeExpertMode(raw.expertMode),
      ...(vehicleContext ? { vehicleContext } : {}),
    },
  };
}

const CHAT_V3_MAX_VEHICLE_CONTEXT_ITEMS = 8;
const CHAT_V3_MAX_VEHICLE_LABEL_LENGTH = 160;
const CHAT_V3_MAX_VEHICLE_SUMMARY_LENGTH = 400;
const CHAT_V3_MAX_VEHICLE_FACT_ENTRIES = 12;
const CHAT_V3_MAX_VEHICLE_FACT_VALUE_LENGTH = 200;

function normalizeVehicleContext(
  raw: unknown
): ChatV3AutomotiveVehicleContextDto | undefined {
  if (raw == null) return undefined;
  if (!isPlainObject(raw)) return undefined;
  if (!Array.isArray(raw.vehicles)) return undefined;

  const vehicles: ChatV3VehicleContextItemDto[] = [];
  for (const item of raw.vehicles.slice(0, CHAT_V3_MAX_VEHICLE_CONTEXT_ITEMS)) {
    if (!isPlainObject(item)) continue;
    const id = String(item.id ?? "").trim();
    const label = String(item.label ?? "").trim();
    if (!id || !label) continue;
    if (id.length > CHAT_V3_MAX_CONVERSATION_ID_LENGTH) continue;
    if (label.length > CHAT_V3_MAX_VEHICLE_LABEL_LENGTH) continue;

    const summaryRaw = String(item.summary ?? "").trim();
    const summary =
      summaryRaw && summaryRaw.length <= CHAT_V3_MAX_VEHICLE_SUMMARY_LENGTH
        ? summaryRaw
        : undefined;

    let facts: Record<string, string> | undefined;
    if (isPlainObject(item.facts)) {
      const entries = Object.entries(item.facts)
        .slice(0, CHAT_V3_MAX_VEHICLE_FACT_ENTRIES)
        .map(([key, value]) => [String(key).trim(), String(value ?? "").trim()] as const)
        .filter(
          ([key, value]) =>
            Boolean(key) &&
            Boolean(value) &&
            value.length <= CHAT_V3_MAX_VEHICLE_FACT_VALUE_LENGTH
        );
      if (entries.length > 0) {
        facts = Object.fromEntries(entries);
      }
    }

    vehicles.push({
      id,
      label,
      ...(summary ? { summary } : {}),
      ...(facts ? { facts } : {}),
    });
  }

  if (vehicles.length === 0) return undefined;

  const selectedRaw = raw.selectedVehicleId;
  const selectedVehicleId =
    selectedRaw == null || selectedRaw === ""
      ? null
      : String(selectedRaw).trim();

  return {
    selectedVehicleId:
      selectedVehicleId &&
      vehicles.some((vehicle) => vehicle.id === selectedVehicleId)
        ? selectedVehicleId
        : null,
    vehicles,
  };
}
