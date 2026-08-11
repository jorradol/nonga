/**
 * WP-V3-07B — Chat V.3 conversation client (browser → thin backend endpoint).
 * No secrets, no provider/model selection, no system prompt from client.
 */
import {
  CHAT_V3_CONVERSATION_ROUTE,
  CHAT_V3_USER_FACING_UNAVAILABLE,
  type ChatV3AutomotiveVehicleContextDto,
  type ChatV3ConversationRequest,
  type ChatV3ConversationResponse,
  type ChatV3HistoryTurn,
  type ChatV3RuntimeExpertMode,
} from "../../../services/ai/chat-v3/chatV3ConversationContracts";

export interface ChatV3ConversationClientInput {
  conversationId: string;
  message: string;
  history: ChatV3HistoryTurn[];
  expertMode: ChatV3RuntimeExpertMode;
  vehicleContext?: ChatV3AutomotiveVehicleContextDto;
  signal?: AbortSignal;
}

export type ChatV3ConversationTransport = (
  input: ChatV3ConversationClientInput
) => Promise<ChatV3ConversationResponse>;

async function defaultChatV3ConversationTransport(
  input: ChatV3ConversationClientInput
): Promise<ChatV3ConversationResponse> {
  const body: ChatV3ConversationRequest = {
    conversationId: input.conversationId,
    message: input.message,
    history: input.history,
    expertMode: input.expertMode,
    ...(input.vehicleContext ? { vehicleContext: input.vehicleContext } : {}),
  };

  let response: Response;
  try {
    response = await fetch(CHAT_V3_CONVERSATION_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: input.signal,
    });
  } catch {
    return {
      success: false,
      errorCode: "provider_failure",
      message: CHAT_V3_USER_FACING_UNAVAILABLE,
    };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    return {
      success: false,
      errorCode: "provider_failure",
      message: CHAT_V3_USER_FACING_UNAVAILABLE,
    };
  }

  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    typeof (payload as { success: unknown }).success === "boolean"
  ) {
    return payload as ChatV3ConversationResponse;
  }

  return {
    success: false,
    errorCode: "provider_failure",
    message: CHAT_V3_USER_FACING_UNAVAILABLE,
  };
}

let activeTransport: ChatV3ConversationTransport = defaultChatV3ConversationTransport;

/** Test-only transport swap. Production code must not call this. */
export function setChatV3ConversationTransportForTests(
  transport: ChatV3ConversationTransport | null
): void {
  activeTransport = transport ?? defaultChatV3ConversationTransport;
}

export async function sendChatV3ConversationRequest(
  input: ChatV3ConversationClientInput
): Promise<ChatV3ConversationResponse> {
  return activeTransport(input);
}
