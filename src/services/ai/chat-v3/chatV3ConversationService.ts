/**
 * WP-V3-07B/11 — Thin Chat V.3 Conversation Service.
 * Provider owns answer content; no marketplace template override.
 * WP-V3-11 adds deterministic automotive safety + self-protection layer.
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
import {
  appendChatV3SafetyInstructionGuidance,
  applyChatV3OutputSafetyBoundary,
  assessChatV3Safety,
} from "./chatV3SafetyLayer";
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
 * Output safety boundary: reject empty/leaky output.
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
  const result = applyChatV3OutputSafetyBoundary(content);
  if (!result.ok) {
    return {
      ok: false,
      errorCode: "unsafe_output",
      message: CHAT_V3_USER_FACING_UNAVAILABLE,
    };
  }
  return { ok: true, content: result.content };
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

  // WP-V3-11 — input safety assessment (does not mutate user message).
  const safetyAssessment = assessChatV3Safety(request.message);
  if (safetyAssessment.shouldShortCircuit && safetyAssessment.safeReply) {
    const content = normalizeChatV3AssistantTypography(
      safetyAssessment.safeReply
    );
    return {
      success: true,
      data: {
        sliceId: CHAT_V3_CONVERSATION_SLICE_ID,
        conversationId: request.conversationId,
        messageId: options.createMessageId?.() ?? defaultMessageId(now),
        content,
        expertModeHint: request.expertMode,
        providerId: "chat-v3-safety-layer",
      },
    };
  }

  const provider =
    options.provider ??
    resolveChatV3ProviderAdapter({
      environment: options.environment,
      readEnv,
      allowFakeProvider: options.allowFakeProvider === true,
    });

  const baseInstruction = buildChatV3SystemInstruction(request.expertMode, {
    message: request.message,
    history: request.history,
    vehicleContext: request.vehicleContext ?? null,
  });
  const systemInstruction = appendChatV3SafetyInstructionGuidance(
    baseInstruction,
    safetyAssessment
  );

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

  const outputSafety = applyChatV3SafetyBoundary(providerResult.content);
  if (!outputSafety.ok) {
    return {
      success: false,
      errorCode: outputSafety.errorCode,
      message: outputSafety.message,
    };
  }

  // WP-V3-10D — assistant-only typography cleanup (does not touch user message).
  const content = normalizeChatV3AssistantTypography(outputSafety.content);

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
