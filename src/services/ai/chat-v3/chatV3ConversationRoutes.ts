/**
 * WP-V3-07B — Chat V.3 thin conversation Express route (isolated from marketplace orchestrator).
 */
import type { Express, Request, Response } from "express";
import {
  CHAT_V3_CONVERSATION_ROUTE,
  CHAT_V3_USER_FACING_UNAVAILABLE,
} from "./chatV3ConversationContracts";
import {
  resolveChatV3ProviderAdapter,
  type ChatV3ProviderAdapter,
  type ChatV3ProviderEnvironment,
} from "./chatV3ProviderAdapter";
import { runChatV3Conversation } from "./chatV3ConversationService";

export { CHAT_V3_CONVERSATION_ROUTE };

function resolveServerEnvironment(): ChatV3ProviderEnvironment {
  const nodeEnv = String(process.env.NODE_ENV ?? "").trim().toLowerCase();
  if (nodeEnv === "production") return "production";
  if (nodeEnv === "test") return "test";
  const runtime = String(process.env.NONGA_RUNTIME_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();
  if (runtime === "staging") return "staging";
  if (runtime === "production") return "production";
  return "local";
}

export interface RegisterChatV3ConversationRoutesOptions {
  /** Test-only provider injection. Never pass fake in production wiring. */
  provider?: ChatV3ProviderAdapter;
  allowFakeProvider?: boolean;
  environment?: ChatV3ProviderEnvironment;
}

export function registerChatV3ConversationRoutes(
  app: Express,
  options: RegisterChatV3ConversationRoutesOptions = {}
): void {
  app.post(CHAT_V3_CONVERSATION_ROUTE, async (req: Request, res: Response) => {
    try {
      const environment = options.environment ?? resolveServerEnvironment();
      const provider =
        options.provider ??
        resolveChatV3ProviderAdapter({
          environment,
          allowFakeProvider: options.allowFakeProvider === true && environment !== "production",
        });

      const result = await runChatV3Conversation({
        rawRequest: req.body,
        environment,
        provider,
        allowFakeProvider: options.allowFakeProvider === true && environment !== "production",
      });

      if (!result.success) {
        const status =
          result.errorCode === "empty_message" ||
          result.errorCode === "invalid_conversation_id" ||
          result.errorCode === "invalid_history" ||
          result.errorCode === "history_too_large" ||
          result.errorCode === "role_not_allowed" ||
          result.errorCode === "client_forbidden_field"
            ? 400
            : result.errorCode === "kill_switch"
              ? 503
              : 503;
        return res.status(status).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("[chat-v3-converse] failed:", error instanceof Error ? error.message : "unknown");
      return res.status(500).json({
        success: false,
        errorCode: "internal_error",
        message: CHAT_V3_USER_FACING_UNAVAILABLE,
      });
    }
  });
}
