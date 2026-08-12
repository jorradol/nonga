/**
 * WP-V3-07B — Thin Chat V.3 Conversation Service.
 * Provider owns answer content; no marketplace template override.
 */
import {
  CHAT_V3_CONVERSATION_SLICE_ID,
  CHAT_V3_USER_FACING_UNAVAILABLE,
  validateChatV3ConversationRequest,
  type ChatV3ConversationErrorCode,
  type ChatV3ConversationResponse,
  type ChatV3ValidatedConversationRequest,
} from "./chatV3ConversationContracts";
import {
  isChatV3KillSwitchActive,
  resolveChatV3ProviderAdapter,
  type ChatV3EnvReader,
  type ChatV3ProviderAdapter,
  type ChatV3ProviderEnvironment,
  type ChatV3ProviderFailureReason,
} from "./chatV3ProviderAdapter";
import { buildChatV3SystemInstruction } from "./chatV3SystemInstruction";
import { normalizeChatV3AssistantTypography } from "./chatV3TypographyNormalize";

export interface RunChatV3ConversationOptions {
  rawRequest: unknown;
  environment: ChatV3ProviderEnvironment;
  readEnv?: ChatV3EnvReader;
  provider?: ChatV3ProviderAdapter;
  allowFakeProvider?: boolean;
  now?: () => number;
  createMessageId?: () => string;
}

const PROMPT_LEAK_MARKERS = [
  "system instruction",
  "systemInstruction",
  "GEMINI_API_KEY",
  "NONGA_AI_",
];

function mapProviderFailureToErrorCode(
  reason: ChatV3ProviderFailureReason
): ChatV3ConversationErrorCode {
  if (reason === "kill_switch") return "kill_switch";
  if (reason === "provider_timeout") return "provider_timeout";
  if (reason === "provider_rejected") return "provider_rejected";
  if (
    reason === "provider_unavailable" ||
    reason === "live_not_enabled" ||
    reason === "configuration_error" ||
    reason === "fake_blocked_in_production"
  ) {
    return "provider_unavailable";
  }
  return "provider_failure";
}

/**
 * Minimal safety boundary: reject empty/leaky output.
 * Does not replace safe provider text with automotive templates.
 */
export function applyChatV3SafetyBoundary(content: string): {
  ok: true;
  content: string;
} | {
  ok: false;
  errorCode: ChatV3ConversationErrorCode;
  message: string;
} {
  const trimmed = content.trim();
  if (!trimmed) {
    return {
      ok: false,
      errorCode: "unsafe_output",
      message: CHAT_V3_USER_FACING_UNAVAILABLE,
    };
  }
  const lower = trimmed.toLowerCase();
  for (const marker of PROMPT_LEAK_MARKERS) {
    if (lower.includes(marker.toLowerCase())) {
      return {
        ok: false,
        errorCode: "unsafe_output",
        message: CHAT_V3_USER_FACING_UNAVAILABLE,
      };
    }
  }
  return { ok: true, content: trimmed };
}

function defaultMessageId(now: number): string {
  return `msg-v3-assistant-${now}`;
}

export async function runChatV3Conversation(
  options: RunChatV3ConversationOptions
): Promise<ChatV3ConversationResponse> {
  const readEnv = options.readEnv ?? ((key: string) => process.env[key]);
  const now = options.now?.() ?? Date.now();

  if (isChatV3KillSwitchActive(readEnv)) {
    return {
      success: false,
      errorCode: "kill_switch",
      message: CHAT_V3_USER_FACING_UNAVAILABLE,
    };
  }

  const validated = validateChatV3ConversationRequest(options.rawRequest);
  if (!validated.ok) {
    return {
      success: false,
      errorCode: validated.errorCode,
      message: validated.message,
    };
  }

  const request: ChatV3ValidatedConversationRequest = validated.value;
  const provider =
    options.provider ??
    resolveChatV3ProviderAdapter({
      environment: options.environment,
      readEnv,
      allowFakeProvider: options.allowFakeProvider === true,
    });

  const systemInstruction = buildChatV3SystemInstruction(request.expertMode, {
    message: request.message,
    history: request.history,
    vehicleContext: request.vehicleContext ?? null,
  });

  let providerResult;
  try {
    providerResult = await provider.generate({
      conversationId: request.conversationId,
      message: request.message,
      history: request.history,
      expertMode: request.expertMode,
      systemInstruction,
    });
  } catch {
    return {
      success: false,
      errorCode: "provider_failure",
      message: CHAT_V3_USER_FACING_UNAVAILABLE,
    };
  }

  if (!providerResult.ok) {
    return {
      success: false,
      errorCode: mapProviderFailureToErrorCode(providerResult.reason),
      message: CHAT_V3_USER_FACING_UNAVAILABLE,
    };
  }

  const safety = applyChatV3SafetyBoundary(providerResult.content);
  if (!safety.ok) {
    return {
      success: false,
      errorCode: safety.errorCode,
      message: safety.message,
    };
  }

  // WP-V3-10D — assistant-only typography cleanup (does not touch user message).
  const content = normalizeChatV3AssistantTypography(safety.content);

  return {
    success: true,
    data: {
      sliceId: CHAT_V3_CONVERSATION_SLICE_ID,
      conversationId: request.conversationId,
      messageId:
        options.createMessageId?.() ?? defaultMessageId(now),
      content,
      expertModeHint: request.expertMode,
      providerId: providerResult.providerId,
    },
  };
}
