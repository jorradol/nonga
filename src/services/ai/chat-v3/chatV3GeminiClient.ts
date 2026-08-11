/**
 * WP-V3-07C — Server-only Gemini client boundary for Chat V.3.
 * Reuses @google/genai SDK already installed; marketplace prompt path is not reused.
 * Fake client is test-inject only and blocked in production.
 */
import { GoogleGenAI } from "@google/genai";
import type { ChatV3HistoryTurn } from "./chatV3ConversationContracts";

export const CHAT_V3_GEMINI_API_KEY_ENV = "GEMINI_API_KEY";

export type ChatV3EnvReader = (key: string) => string | undefined;

/**
 * Model id reused from existing server Gemini implementations:
 * - USER_VISIBLE_REAL_GEMINI_MODEL in salesBrainUserVisibleRealProvider.ts
 * - ADMIN_SHADOW_GEMINI_MODEL in salesBrainAdminShadowRealProvider.ts
 * Not a newly guessed model name.
 */
export const CHAT_V3_REUSED_SERVER_GEMINI_MODEL = "gemini-3.5-flash";

/** Optional override — name only; never print values. */
export const NONGA_AI_CHAT_V3_MODEL_ENV = "NONGA_AI_CHAT_V3_MODEL";

export type ChatV3GeminiRole = "user" | "model";

export interface ChatV3GeminiContentPart {
  text: string;
}

export interface ChatV3GeminiContentTurn {
  role: ChatV3GeminiRole;
  parts: ChatV3GeminiContentPart[];
}

export interface ChatV3GeminiGenerateRequest {
  model: string;
  systemInstruction: string;
  contents: ChatV3GeminiContentTurn[];
}

export interface ChatV3GeminiGenerateResult {
  text: string;
}

export interface ChatV3GeminiClient {
  readonly id: string;
  generateContent(
    request: ChatV3GeminiGenerateRequest
  ): Promise<ChatV3GeminiGenerateResult>;
}

export type FakeChatV3GeminiBehavior =
  | "success"
  | "empty"
  | "malformed"
  | "rejected"
  | "timeout";

export interface FakeChatV3GeminiClientOptions {
  behavior?: FakeChatV3GeminiBehavior;
  text?: string;
}

let testGeminiClient: ChatV3GeminiClient | null = null;
let sdkNetworkCallCount = 0;
let lastFakeGeminiRequest: ChatV3GeminiGenerateRequest | null = null;

function defaultEnvReader(key: string): string | undefined {
  return process.env[key];
}

function isProductionNodeEnv(): boolean {
  return String(process.env.NODE_ENV ?? "").trim().toLowerCase() === "production";
}

export function mapChatV3HistoryRoleToGemini(
  role: ChatV3HistoryTurn["role"]
): ChatV3GeminiRole {
  return role === "assistant" ? "model" : "user";
}

/**
 * Builds Gemini multi-turn contents: prior history + latest user message once.
 */
export function buildChatV3GeminiContents(
  history: ChatV3HistoryTurn[],
  latestUserMessage: string
): ChatV3GeminiContentTurn[] {
  const contents: ChatV3GeminiContentTurn[] = history.map((turn) => ({
    role: mapChatV3HistoryRoleToGemini(turn.role),
    parts: [{ text: turn.content }],
  }));
  contents.push({
    role: "user",
    parts: [{ text: latestUserMessage }],
  });
  return contents;
}

export function resolveChatV3GeminiModel(
  readEnv: ChatV3EnvReader = defaultEnvReader
): string {
  const configured = String(readEnv(NONGA_AI_CHAT_V3_MODEL_ENV) ?? "").trim();
  if (configured) return configured;
  return CHAT_V3_REUSED_SERVER_GEMINI_MODEL;
}

/**
 * Extract assistant text using the same response shapes already used server-side.
 */
export function extractChatV3GeminiResponseText(response: {
  text?: string;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
  }>;
}): string {
  const direct = String(response.text ?? "").trim();
  if (direct) return direct;
  const parts: string[] = [];
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.thought) continue;
      if (part.text) parts.push(part.text);
    }
  }
  return parts.join("").trim();
}

export function getChatV3GeminiSdkNetworkCallCount(): number {
  return sdkNetworkCallCount;
}

export function resetChatV3GeminiSdkNetworkCallCount(): void {
  sdkNetworkCallCount = 0;
}

export function getLastFakeChatV3GeminiRequest(): ChatV3GeminiGenerateRequest | null {
  return lastFakeGeminiRequest;
}

export function resetLastFakeChatV3GeminiRequest(): void {
  lastFakeGeminiRequest = null;
}

/** Test-only inject. Hard-blocked when NODE_ENV=production. */
export function setChatV3GeminiClientForTests(
  client: ChatV3GeminiClient | null
): void {
  if (isProductionNodeEnv()) {
    throw new Error("Fake/test Gemini client cannot be set in production");
  }
  testGeminiClient = client;
}

export function resetChatV3GeminiClientForTests(): void {
  testGeminiClient = null;
}

export function getChatV3GeminiClientForTests(): ChatV3GeminiClient | null {
  return testGeminiClient;
}

export function assertFakeGeminiClientBlockedInProduction(): void {
  const previous = testGeminiClient;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  let threw = false;
  try {
    setChatV3GeminiClientForTests({
      id: "fake-gemini-client-v3",
      async generateContent() {
        return { text: "should-not-run" };
      },
    });
  } catch {
    threw = true;
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    testGeminiClient = previous;
  }
  if (!threw) {
    throw new Error("Expected fake Gemini client inject to be blocked in production");
  }
}

export function createFakeChatV3GeminiClient(
  options: FakeChatV3GeminiClientOptions = {}
): ChatV3GeminiClient {
  if (isProductionNodeEnv()) {
    throw new Error("Fake Gemini client cannot be constructed in production");
  }
  const behavior = options.behavior ?? "success";
  const text = options.text ?? "[fake-gemini-client] ok";

  return {
    id: "fake-gemini-client-v3",
    async generateContent(request) {
      lastFakeGeminiRequest = {
        model: request.model,
        systemInstruction: request.systemInstruction,
        contents: request.contents.map((turn) => ({
          role: turn.role,
          parts: turn.parts.map((part) => ({ text: part.text })),
        })),
      };

      if (behavior === "timeout") {
        const error = new Error("Gemini timeout (fake client)");
        (error as Error & { code?: string }).code = "ETIMEDOUT";
        throw error;
      }
      if (behavior === "rejected") {
        throw new Error("Gemini rejected (fake client)");
      }
      if (behavior === "empty") {
        return { text: "" };
      }
      if (behavior === "malformed") {
        // Simulate SDK returning a non-text payload that extracts to empty.
        return { text: "   " };
      }
      return { text };
    },
  };
}

/**
 * Production SDK client — only constructed when live path is intentionally enabled
 * and a key is present. Tests must inject a fake client instead of calling this.
 */
export function createSdkChatV3GeminiClient(apiKey: string): ChatV3GeminiClient {
  const client = new GoogleGenAI({ apiKey });
  return {
    id: "sdk-gemini-client-v3",
    async generateContent(request) {
      sdkNetworkCallCount += 1;
      const response = await client.models.generateContent({
        model: request.model,
        contents: request.contents.map((turn) => ({
          role: turn.role,
          parts: turn.parts.map((part) => ({ text: part.text })),
        })),
        config: {
          systemInstruction: request.systemInstruction,
        },
      });
      return { text: extractChatV3GeminiResponseText(response) };
    },
  };
}

export interface ResolveChatV3GeminiClientOptions {
  readEnv?: ChatV3EnvReader;
  /** Explicit inject for offline adapter tests. */
  injectedClient?: ChatV3GeminiClient;
  /** When false, never fall back to SDK (used by disabled/live-off paths). */
  allowSdk?: boolean;
}

export function resolveChatV3GeminiClient(
  options: ResolveChatV3GeminiClientOptions = {}
): ChatV3GeminiClient {
  if (options.injectedClient) {
    if (
      isProductionNodeEnv() &&
      options.injectedClient.id === "fake-gemini-client-v3"
    ) {
      throw new Error("Fake Gemini client cannot be used in production");
    }
    return options.injectedClient;
  }

  if (testGeminiClient) {
    if (isProductionNodeEnv()) {
      throw new Error("Test Gemini client cannot be active in production");
    }
    return testGeminiClient;
  }

  if (options.allowSdk === false) {
    throw new Error("Chat V.3 Gemini SDK client is not allowed in this configuration");
  }

  const readEnv = options.readEnv ?? defaultEnvReader;
  const apiKey = readEnv(CHAT_V3_GEMINI_API_KEY_ENV)?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  return createSdkChatV3GeminiClient(apiKey);
}
