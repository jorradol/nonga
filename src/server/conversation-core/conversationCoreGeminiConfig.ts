/**
 * WP-V2U-03C3 / R1 — Core-owned Gemini configuration (env snapshot, fail-closed, no secrets).
 */
export const NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV =
  "NONGA_CONVERSATION_CORE_GEMINI_ENABLED";

export const NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV =
  "NONGA_CONVERSATION_CORE_GEMINI_MODEL";

/** Readiness env name only — never export or return the secret value. */
export const CONVERSATION_CORE_GEMINI_API_KEY_ENV = "GEMINI_API_KEY";

export const CONVERSATION_CORE_GEMINI_PROVIDER_ID = "conversation-core-gemini";

export const CONVERSATION_CORE_GEMINI_MODEL_FAMILY = "gemini";

/**
 * Server-owned allowlist. Reuses the model id already used by installed server Gemini paths.
 * Not a newly guessed model name.
 */
export const CONVERSATION_CORE_ALLOWED_GEMINI_MODELS = ["gemini-3.5-flash"] as const;

export type ConversationCoreAllowedGeminiModel =
  (typeof CONVERSATION_CORE_ALLOWED_GEMINI_MODELS)[number];

export type ConversationCoreGeminiConfigUnavailableReason =
  | "missing-model"
  | "invalid-model"
  | "missing-api-key"
  | "invalid-config";

export type ConversationCoreGeminiConfigStatus =
  | { readonly status: "disabled" }
  | {
      readonly status: "ready";
      readonly providerId: typeof CONVERSATION_CORE_GEMINI_PROVIDER_ID;
      readonly model: ConversationCoreAllowedGeminiModel;
      readonly modelFamily: typeof CONVERSATION_CORE_GEMINI_MODEL_FAMILY;
    }
  | {
      readonly status: "unavailable";
      readonly reasonCode: ConversationCoreGeminiConfigUnavailableReason;
    };

export interface ConversationCoreGeminiConfigInput {
  readonly readEnv: (key: string) => string | undefined;
  /** Injected readiness for tests — avoids reading a real secret value. */
  readonly apiKeyReady?: boolean;
}

const UNAVAILABLE_REASONS: readonly ConversationCoreGeminiConfigUnavailableReason[] = [
  "missing-model",
  "invalid-model",
  "missing-api-key",
  "invalid-config",
];

const CONFIG_INPUT_ALLOWED_KEYS = new Set(["readEnv", "apiKeyReady"]);

const DISABLED_KEYS = new Set(["status"]);
const READY_KEYS = new Set(["status", "providerId", "model", "modelFamily"]);
const UNAVAILABLE_KEYS = new Set(["status", "reasonCode"]);

function isExplicitTrue(raw: string | undefined): boolean {
  return String(raw ?? "").trim() === "true";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(raw: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(raw).every((key) => allowed.has(key));
}

function isAllowedModel(value: string): value is ConversationCoreAllowedGeminiModel {
  return (CONVERSATION_CORE_ALLOWED_GEMINI_MODELS as readonly string[]).includes(value);
}

function safeReadEnv(
  readEnv: (key: string) => unknown,
  key: string
): { readonly ok: true; readonly value: string | undefined } | { readonly ok: false } {
  try {
    const value = readEnv(key);
    if (value === undefined) {
      return { ok: true, value: undefined };
    }
    if (typeof value !== "string") {
      return { ok: false };
    }
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

function freezeDisabled(): ConversationCoreGeminiConfigStatus {
  return Object.freeze({ status: "disabled" as const });
}

function freezeUnavailable(
  reasonCode: ConversationCoreGeminiConfigUnavailableReason
): ConversationCoreGeminiConfigStatus {
  return Object.freeze({ status: "unavailable" as const, reasonCode });
}

function freezeReady(
  model: ConversationCoreAllowedGeminiModel
): ConversationCoreGeminiConfigStatus {
  return Object.freeze({
    status: "ready" as const,
    providerId: CONVERSATION_CORE_GEMINI_PROVIDER_ID,
    model,
    modelFamily: CONVERSATION_CORE_GEMINI_MODEL_FAMILY,
  });
}

/**
 * Runtime inspect of a claimed Gemini config status.
 * Forged objects, extra keys, and secret-like fields fail closed. Never returns secrets.
 */
export function inspectConversationCoreGeminiConfigStatus(
  raw: unknown
):
  | { readonly ok: true; readonly value: ConversationCoreGeminiConfigStatus }
  | { readonly ok: false } {
  if (!isPlainObject(raw)) {
    return Object.freeze({ ok: false as const });
  }
  if ("apiKey" in raw || "secret" in raw || "GEMINI_API_KEY" in raw) {
    return Object.freeze({ ok: false as const });
  }

  if (raw.status === "disabled") {
    if (!hasOnlyKeys(raw, DISABLED_KEYS)) {
      return Object.freeze({ ok: false as const });
    }
    return Object.freeze({ ok: true as const, value: freezeDisabled() });
  }

  if (raw.status === "unavailable") {
    if (!hasOnlyKeys(raw, UNAVAILABLE_KEYS)) {
      return Object.freeze({ ok: false as const });
    }
    if (typeof raw.reasonCode !== "string") {
      return Object.freeze({ ok: false as const });
    }
    if (!(UNAVAILABLE_REASONS as readonly string[]).includes(raw.reasonCode)) {
      return Object.freeze({ ok: false as const });
    }
    return Object.freeze({
      ok: true as const,
      value: freezeUnavailable(raw.reasonCode as ConversationCoreGeminiConfigUnavailableReason),
    });
  }

  if (raw.status === "ready") {
    if (!hasOnlyKeys(raw, READY_KEYS)) {
      return Object.freeze({ ok: false as const });
    }
    if (raw.providerId !== CONVERSATION_CORE_GEMINI_PROVIDER_ID) {
      return Object.freeze({ ok: false as const });
    }
    if (typeof raw.model !== "string" || !isAllowedModel(raw.model)) {
      return Object.freeze({ ok: false as const });
    }
    if (raw.modelFamily !== CONVERSATION_CORE_GEMINI_MODEL_FAMILY) {
      return Object.freeze({ ok: false as const });
    }
    return Object.freeze({ ok: true as const, value: freezeReady(raw.model) });
  }

  return Object.freeze({ ok: false as const });
}

function resolveConversationCoreGeminiConfigUnchecked(
  input: unknown
): ConversationCoreGeminiConfigStatus {
  if (input === null || input === undefined || !isPlainObject(input)) {
    return freezeDisabled();
  }
  if (!hasOnlyKeys(input, CONFIG_INPUT_ALLOWED_KEYS)) {
    return freezeUnavailable("invalid-config");
  }
  if (typeof input.readEnv !== "function") {
    return freezeUnavailable("invalid-config");
  }
  if (Object.prototype.hasOwnProperty.call(input, "apiKeyReady")) {
    if (typeof input.apiKeyReady !== "boolean") {
      return freezeUnavailable("invalid-config");
    }
  }

  const readEnv = input.readEnv as (key: string) => unknown;
  const enabledRaw = safeReadEnv(readEnv, NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV);
  if (!enabledRaw.ok) {
    return freezeUnavailable("invalid-config");
  }
  if (!isExplicitTrue(enabledRaw.value)) {
    return freezeDisabled();
  }

  const modelRaw = safeReadEnv(readEnv, NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV);
  if (!modelRaw.ok) {
    return freezeUnavailable("invalid-config");
  }
  const model = String(modelRaw.value ?? "").trim();
  if (!model) {
    return freezeUnavailable("missing-model");
  }
  if (!isAllowedModel(model)) {
    return freezeUnavailable("invalid-model");
  }

  if (typeof input.apiKeyReady === "boolean") {
    if (!input.apiKeyReady) {
      return freezeUnavailable("missing-api-key");
    }
    return freezeReady(model);
  }

  const apiKeyRaw = safeReadEnv(readEnv, CONVERSATION_CORE_GEMINI_API_KEY_ENV);
  if (!apiKeyRaw.ok) {
    return freezeUnavailable("invalid-config");
  }
  if (!String(apiKeyRaw.value ?? "").trim()) {
    return freezeUnavailable("missing-api-key");
  }

  return freezeReady(model);
}

/**
 * Resolve Core Gemini configuration from an injected env snapshot.
 * Accepts untrusted runtime input and never throws. V.3 flags have no effect.
 * Missing/malformed values fail closed. Never returns secrets, env values, or stacks.
 */
export function resolveConversationCoreGeminiConfig(
  input?: unknown
): ConversationCoreGeminiConfigStatus {
  try {
    return resolveConversationCoreGeminiConfigUnchecked(input);
  } catch {
    return freezeUnavailable("invalid-config");
  }
}
