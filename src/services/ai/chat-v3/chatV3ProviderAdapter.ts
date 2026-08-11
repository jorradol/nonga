/**
 * WP-V3-07B/07C — Provider-neutral Chat V.3 adapter.
 * Fake V.3 provider is test-only. Production Gemini adapter is server-only and
 * calls through an injectable Gemini client boundary (no marketplace templates).
 */
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../salesBrainRuntimeFlags";
import type {
  ChatV3HistoryTurn,
  ChatV3RuntimeExpertMode,
} from "./chatV3ConversationContracts";
import {
  buildChatV3GeminiContents,
  CHAT_V3_GEMINI_API_KEY_ENV,
  resolveChatV3GeminiClient,
  resolveChatV3GeminiModel,
  type ChatV3EnvReader,
  type ChatV3GeminiClient,
} from "./chatV3GeminiClient";

export { CHAT_V3_GEMINI_API_KEY_ENV };
export type { ChatV3EnvReader };

export const NONGA_AI_CHAT_V3_LIVE_PROVIDER_ENABLED_ENV =
  "NONGA_AI_CHAT_V3_LIVE_PROVIDER_ENABLED";
export const NONGA_AI_CHAT_V3_PROVIDER_ENV = "NONGA_AI_CHAT_V3_PROVIDER";

export const CHAT_V3_GEMINI_PROVIDER_ID = "gemini-v3";

export type ChatV3ProviderEnvironment = "local" | "test" | "staging" | "production";

export type ChatV3ProviderFailureReason =
  | "kill_switch"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_rejected"
  | "provider_failure"
  | "live_not_enabled"
  | "configuration_error"
  | "fake_blocked_in_production";

export interface ChatV3ProviderRequest {
  conversationId: string;
  message: string;
  history: ChatV3HistoryTurn[];
  expertMode: ChatV3RuntimeExpertMode;
  systemInstruction: string;
}

export interface ChatV3ProviderSuccess {
  ok: true;
  providerId: string;
  content: string;
}

export interface ChatV3ProviderFailure {
  ok: false;
  providerId: string;
  reason: ChatV3ProviderFailureReason;
  message: string;
}

export type ChatV3ProviderResult = ChatV3ProviderSuccess | ChatV3ProviderFailure;

export interface ChatV3ProviderAdapter {
  readonly id: string;
  generate(input: ChatV3ProviderRequest): Promise<ChatV3ProviderResult>;
}

function parseTruthy(raw: string | undefined): boolean {
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function defaultEnvReader(key: string): string | undefined {
  return process.env[key];
}

export function isChatV3KillSwitchActive(
  readEnv: ChatV3EnvReader = defaultEnvReader
): boolean {
  return parseTruthy(readEnv(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV));
}

export function isChatV3LiveProviderEnabled(
  readEnv: ChatV3EnvReader = defaultEnvReader
): boolean {
  return parseTruthy(readEnv(NONGA_AI_CHAT_V3_LIVE_PROVIDER_ENABLED_ENV));
}

export function isChatV3GeminiKeyPresent(
  readEnv: ChatV3EnvReader = defaultEnvReader
): boolean {
  return Boolean(readEnv(CHAT_V3_GEMINI_API_KEY_ENV)?.trim());
}

/** Captures last fake *provider* request for WP-07B tests. */
let lastFakeProviderRequest: ChatV3ProviderRequest | null = null;

export function getLastFakeChatV3ProviderRequest(): ChatV3ProviderRequest | null {
  return lastFakeProviderRequest;
}

export function resetLastFakeChatV3ProviderRequest(): void {
  lastFakeProviderRequest = null;
}

export type FakeChatV3ProviderBehavior =
  | "success"
  | "timeout"
  | "rejected"
  | "failure";

export interface FakeChatV3ProviderOptions {
  behavior?: FakeChatV3ProviderBehavior;
  contentPrefix?: string;
}

/**
 * Deterministic fake provider — must only be constructed when allowFakeProvider is true
 * and environment is not production. Not a substitute for the real Gemini adapter.
 */
export function createFakeChatV3Provider(
  options: FakeChatV3ProviderOptions = {}
): ChatV3ProviderAdapter {
  const behavior = options.behavior ?? "success";
  const contentPrefix = options.contentPrefix ?? "[fake-v3]";

  return {
    id: "fake-v3",
    async generate(input) {
      lastFakeProviderRequest = {
        conversationId: input.conversationId,
        message: input.message,
        history: input.history.map((turn) => ({ ...turn })),
        expertMode: input.expertMode,
        systemInstruction: input.systemInstruction,
      };

      if (behavior === "timeout") {
        return {
          ok: false,
          providerId: "fake-v3",
          reason: "provider_timeout",
          message: "provider timeout (fake)",
        };
      }
      if (behavior === "rejected") {
        return {
          ok: false,
          providerId: "fake-v3",
          reason: "provider_rejected",
          message: "provider rejected (fake)",
        };
      }
      if (behavior === "failure") {
        return {
          ok: false,
          providerId: "fake-v3",
          reason: "provider_failure",
          message: "provider failure (fake)",
        };
      }

      const historyDigest = input.history
        .map((turn, index) => `${index + 1}:${turn.role}:${turn.content}`)
        .join(" || ");

      return {
        ok: true,
        providerId: "fake-v3",
        content: [
          contentPrefix,
          `expertMode=${input.expertMode}`,
          `historyTurns=${input.history.length}`,
          `message=${input.message}`,
          `history=${historyDigest}`,
        ].join(" | "),
      };
    },
  };
}

export function createUnavailableChatV3Provider(
  reason: ChatV3ProviderFailureReason = "provider_unavailable"
): ChatV3ProviderAdapter {
  return {
    id: "unavailable-v3",
    async generate() {
      return {
        ok: false,
        providerId: "unavailable-v3",
        reason,
        message: "Chat V.3 provider is unavailable",
      };
    },
  };
}

export interface CreateRealGeminiChatV3ProviderOptions {
  readEnv?: ChatV3EnvReader;
  /** Offline inject at SDK/network boundary — production path uses SDK client. */
  geminiClient?: ChatV3GeminiClient;
  /**
   * When true, skip live-enable gate (used only by offline adapter tests that
   * still inject a fake Gemini client and never open the live flag).
   */
  bypassLiveEnableGateForTests?: boolean;
}

function mapGeminiClientError(
  error: unknown
): ChatV3ProviderFailureReason {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  if (
    code === "ETIMEDOUT" ||
    /timeout|aborted|abort/i.test(message)
  ) {
    return "provider_timeout";
  }
  if (/reject|permission|denied|unauthorized|403|401/i.test(message)) {
    return "provider_rejected";
  }
  if (/not configured|configuration/i.test(message)) {
    return "configuration_error";
  }
  return "provider_failure";
}

/**
 * Real Chat V.3 Gemini adapter (server-only).
 * Invokes Gemini only through resolveChatV3GeminiClient / injected client.
 */
export function createRealGeminiChatV3Provider(
  options: CreateRealGeminiChatV3ProviderOptions = {}
): ChatV3ProviderAdapter {
  const readEnv = options.readEnv ?? defaultEnvReader;

  return {
    id: CHAT_V3_GEMINI_PROVIDER_ID,
    async generate(input) {
      if (isChatV3KillSwitchActive(readEnv)) {
        return {
          ok: false,
          providerId: CHAT_V3_GEMINI_PROVIDER_ID,
          reason: "kill_switch",
          message: "Emergency kill switch is active",
        };
      }

      if (
        !options.bypassLiveEnableGateForTests &&
        !isChatV3LiveProviderEnabled(readEnv)
      ) {
        return {
          ok: false,
          providerId: CHAT_V3_GEMINI_PROVIDER_ID,
          reason: "live_not_enabled",
          message: "Live Chat V.3 provider flag is off",
        };
      }

      if (!isChatV3GeminiKeyPresent(readEnv)) {
        return {
          ok: false,
          providerId: CHAT_V3_GEMINI_PROVIDER_ID,
          reason: "configuration_error",
          message: "GEMINI_API_KEY is not configured",
        };
      }

      let client: ChatV3GeminiClient;
      try {
        client = resolveChatV3GeminiClient({
          readEnv,
          injectedClient: options.geminiClient,
          allowSdk: options.bypassLiveEnableGateForTests !== true,
        });
      } catch (error) {
        return {
          ok: false,
          providerId: CHAT_V3_GEMINI_PROVIDER_ID,
          reason: mapGeminiClientError(error),
          message: "Chat V.3 Gemini client is unavailable",
        };
      }

      const model = resolveChatV3GeminiModel(readEnv);
      if (!model) {
        return {
          ok: false,
          providerId: CHAT_V3_GEMINI_PROVIDER_ID,
          reason: "configuration_error",
          message: "Chat V.3 Gemini model is not configured",
        };
      }

      const contents = buildChatV3GeminiContents(input.history, input.message);

      try {
        const result = await client.generateContent({
          model,
          systemInstruction: input.systemInstruction,
          contents,
        });
        const text = String(result?.text ?? "").trim();
        if (!text) {
          return {
            ok: false,
            providerId: CHAT_V3_GEMINI_PROVIDER_ID,
            reason: "provider_failure",
            message: "Gemini returned an empty or malformed response",
          };
        }
        return {
          ok: true,
          providerId: CHAT_V3_GEMINI_PROVIDER_ID,
          content: text,
        };
      } catch (error) {
        return {
          ok: false,
          providerId: CHAT_V3_GEMINI_PROVIDER_ID,
          reason: mapGeminiClientError(error),
          message: "Gemini provider call failed",
        };
      }
    },
  };
}

/**
 * @deprecated Prefer createRealGeminiChatV3Provider — kept as alias for WP-07B continuity.
 */
export function createPreparedLiveChatV3Provider(
  readEnv: ChatV3EnvReader = defaultEnvReader
): ChatV3ProviderAdapter {
  return createRealGeminiChatV3Provider({ readEnv });
}

export interface ResolveChatV3ProviderOptions {
  environment: ChatV3ProviderEnvironment;
  readEnv?: ChatV3EnvReader;
  /** Explicit inject for tests only. */
  injectedProvider?: ChatV3ProviderAdapter;
  allowFakeProvider?: boolean;
  fakeOptions?: FakeChatV3ProviderOptions;
  /** Offline inject for the real Gemini adapter's client boundary. */
  geminiClient?: ChatV3GeminiClient;
}

/**
 * Resolves the adapter for Chat V.3.
 * Fake V.3 provider and fake Gemini client cannot be selected in production via env.
 */
export function resolveChatV3ProviderAdapter(
  options: ResolveChatV3ProviderOptions
): ChatV3ProviderAdapter {
  if (options.injectedProvider) {
    if (
      options.environment === "production" &&
      options.injectedProvider.id === "fake-v3"
    ) {
      throw new Error("Fake Chat V.3 provider cannot be injected in production");
    }
    return options.injectedProvider;
  }

  const readEnv = options.readEnv ?? defaultEnvReader;
  const requested = String(readEnv(NONGA_AI_CHAT_V3_PROVIDER_ENV) ?? "")
    .trim()
    .toLowerCase();

  if (requested === "fake") {
    if (options.environment === "production" || !options.allowFakeProvider) {
      throw new Error("Fake Chat V.3 provider is blocked outside approved test use");
    }
    return createFakeChatV3Provider(options.fakeOptions);
  }

  if (requested === "fake-gemini-client") {
    throw new Error("Fake Gemini client cannot be selected via environment");
  }

  if (isChatV3KillSwitchActive(readEnv)) {
    return createUnavailableChatV3Provider("kill_switch");
  }

  if (isChatV3LiveProviderEnabled(readEnv)) {
    return createRealGeminiChatV3Provider({
      readEnv,
      geminiClient: options.geminiClient,
    });
  }

  // Live flag off — never construct/call SDK client.
  return createUnavailableChatV3Provider(
    requested === "gemini" ? "live_not_enabled" : "provider_unavailable"
  );
}

export function assertFakeProviderBlockedInProduction(): void {
  let threw = false;
  try {
    resolveChatV3ProviderAdapter({
      environment: "production",
      allowFakeProvider: true,
      readEnv: (key) =>
        key === NONGA_AI_CHAT_V3_PROVIDER_ENV ? "fake" : undefined,
    });
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error("Expected fake provider to be blocked in production");
  }
}
