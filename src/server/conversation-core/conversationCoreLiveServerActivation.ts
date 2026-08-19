/**
 * WP-V2U-03E2D2C2C2C — Lazy Local/Staging live activation for Search/Inventory.
 * No import-time network, secret access, or flag enablement.
 * registerConversationCoreRoutes does not turn capabilities on by importing this module.
 */
import { randomUUID } from "node:crypto";
import {
  isExplicitEnvironmentIdentity,
  resolveNongaEnvironmentIdentity,
  type NongaEnvironmentIdentity,
} from "../../config/environmentIdentity";
import {
  buildConversationCoreBaseInstruction,
  type ConversationCoreExpertMode,
} from "../../services/conversation-core/index";
import {
  createInventoryRepository,
  resolveInventoryDataBackend,
  type InventoryRepository,
  type NongaDataBackend,
} from "../repositories/inventoryRepository";
import type { ConversationCoreGeminiAdapter } from "./conversationCoreGeminiAdapter";
import {
  CONVERSATION_CORE_ALLOWED_GEMINI_MODELS,
  CONVERSATION_CORE_GEMINI_API_KEY_ENV,
  CONVERSATION_CORE_GEMINI_PROVIDER_ID,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  resolveConversationCoreGeminiConfig,
} from "./conversationCoreGeminiConfig";
import {
  CONVERSATION_CORE_BOUNDED_GEMINI_PROVIDER_ERROR_CLASSES,
  createConversationCoreGeminiToolTransportSdkSeam,
  type ConversationCoreGeminiToolTransportSdkSeam,
  type ConversationCoreRuntimeObservabilityEvent,
  type ConversationCoreRuntimeObservabilitySink,
} from "./conversationCoreGeminiToolTransport";
import type { ConversationCoreOrchestratorActivation } from "./conversationCoreOrchestrator";
import { resolveConversationCoreFeatureFlags } from "./conversationCoreFeatureFlags";
import { createConversationCoreRuntimeDeps } from "./conversationCoreRuntimeDeps";
import { runConversationCoreExecutionService } from "./conversationCoreExecutionService";

export const NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV =
  "NONGA_CONVERSATION_CORE_TOOLS_ENABLED";

export const NONGA_CONVERSATION_CORE_OBSERVABILITY_ENABLED_ENV =
  "NONGA_CONVERSATION_CORE_OBSERVABILITY_ENABLED";

export const CONVERSATION_CORE_RUNTIME_OBSERVABILITY_LOG_EVENT =
  "conversation_core_runtime_observability";

export const CONVERSATION_CORE_RUNTIME_OBSERVABILITY_MAX_EVENTS = 8;

const OBSERVABILITY_STAGES = new Set([
  "runtime_deps",
  "gemini_initial",
  "gemini_follow_up",
  "tool_execution",
  "coordinator",
  "execution_service",
]);

const OBSERVABILITY_KINDS = new Set([
  "ready",
  "unavailable",
  "tool_request",
  "final_answer",
  "provider_error",
  "invalid_response",
  "grounded",
  "attempted",
  "ok",
  "rejected",
  "error",
]);

const OBSERVABILITY_TOOLS = new Set(["marketplace.search", "inventory.fetch"]);

const OBSERVABILITY_ROUTES = new Set(["completed", "honest_unavailable"]);

const OBSERVABILITY_PROVIDER_ERROR_CLASSES = new Set<string>(
  CONVERSATION_CORE_BOUNDED_GEMINI_PROVIDER_ERROR_CLASSES
);

const BOUNDED_REASON_CODE = /^[a-z0-9][a-z0-9_-]{0,79}$/i;
const BOUNDED_CORRELATION_ID = /^[a-zA-Z0-9._:-]{8,128}$/;

export const CONVERSATION_CORE_LIVE_STAGED_TOOL_NAMES = [
  "marketplace.search",
  "inventory.fetch",
] as const;

const NON_PRODUCTION_IDENTITIES = new Set<NongaEnvironmentIdentity>([
  "local",
  "staging",
  "fixture",
]);

const KNOWN_NON_PRODUCTION_PROJECT_IDS = new Set([
  "nonga-ce93c",
  "nonga-staging-2026",
]);

const FAIL_CLOSED_TEXT_ADAPTER: ConversationCoreGeminiAdapter = Object.freeze({
  async generate() {
    return Object.freeze({ ok: false as const, code: "provider-error" as const });
  },
});

export type ConversationCoreLiveProjectClass =
  | "staging"
  | "fixture"
  | "emulator"
  | "local-file"
  | "unverified";

export type ConversationCoreLiveEnvironmentIdentityOk = {
  readonly ok: true;
  readonly identity: "local" | "staging" | "fixture";
  readonly backend: NongaDataBackend;
  readonly projectClass: Exclude<ConversationCoreLiveProjectClass, "unverified">;
  readonly projectIdLabel: "nonga-ce93c" | "nonga-staging-2026" | "emulator" | "file-local";
  readonly geminiProviderId: typeof CONVERSATION_CORE_GEMINI_PROVIDER_ID;
  readonly geminiModel: (typeof CONVERSATION_CORE_ALLOWED_GEMINI_MODELS)[number] | "unresolved";
};

export type ConversationCoreLiveEnvironmentIdentityBlocked = {
  readonly ok: false;
  readonly reason: "unverified" | "production" | "unknown-project";
};

export type ConversationCoreLiveEnvironmentIdentityResult =
  | ConversationCoreLiveEnvironmentIdentityOk
  | ConversationCoreLiveEnvironmentIdentityBlocked;

export interface ConversationCoreLiveServerActivationInput {
  readonly readEnv: (key: string) => string | undefined;
  readonly inventoryRepository?: InventoryRepository | null;
  readonly createSdkSeam?: (input: {
    readonly apiKey: string;
  }) => ConversationCoreGeminiToolTransportSdkSeam;
  readonly createInventoryRepository?: () => InventoryRepository;
  readonly expertMode?: ConversationCoreExpertMode;
  readonly mintRequestId?: () => string;
  readonly observabilityCorrelationId?: string;
  readonly writeObservabilityLog?: (line: string) => void;
}

export function isConversationCoreObservabilityEnabled(
  readEnv: (key: string) => string | undefined
): boolean {
  return String(readEnv(NONGA_CONVERSATION_CORE_OBSERVABILITY_ENABLED_ENV) ?? "").trim() === "true";
}

function takeBoundedString(
  value: unknown,
  allowed: ReadonlySet<string>
): string | undefined {
  return typeof value === "string" && allowed.has(value) ? value : undefined;
}

function takeBoundedReasonCode(value: unknown): string | undefined {
  return typeof value === "string" && BOUNDED_REASON_CODE.test(value) ? value : undefined;
}

function takeBoundedCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 8
    ? value
    : undefined;
}

function mapObservabilityStage(
  raw: ConversationCoreRuntimeObservabilityEvent
): string | undefined {
  if (raw.event === "runtime_deps_outcome") {
    return "runtime_deps";
  }
  if (raw.event === "gemini_transport_outcome") {
    if (raw.phase === "follow_up") {
      return "gemini_follow_up";
    }
    if (raw.phase === "initial") {
      return "gemini_initial";
    }
    return undefined;
  }
  if (raw.event === "tool_execution_outcome") {
    return "tool_execution";
  }
  if (raw.event === "coordinator_outcome") {
    return "coordinator";
  }
  if (raw.event === "execution_service_outcome") {
    return "execution_service";
  }
  return undefined;
}

export function toConversationCoreRuntimeObservabilityLog(input: {
  readonly requestCorrelationId: string;
  readonly raw: ConversationCoreRuntimeObservabilityEvent;
}): Record<string, string | number> | null {
  if (!BOUNDED_CORRELATION_ID.test(input.requestCorrelationId)) {
    return null;
  }
  const stage = mapObservabilityStage(input.raw);
  if (!stage || !OBSERVABILITY_STAGES.has(stage)) {
    return null;
  }
  const kind =
    takeBoundedString(input.raw.kind, OBSERVABILITY_KINDS) ??
    takeBoundedString(input.raw.status, OBSERVABILITY_KINDS);
  const payload: Record<string, string | number> = {
    event: CONVERSATION_CORE_RUNTIME_OBSERVABILITY_LOG_EVENT,
    requestCorrelationId: input.requestCorrelationId,
    stage,
  };
  if (kind) {
    payload.kind = kind;
  }
  const reasonCode =
    takeBoundedReasonCode(input.raw.reasonCode) ??
    takeBoundedReasonCode(input.raw.preservedCoordinatorReasonCode);
  if (reasonCode) {
    payload.reasonCode = reasonCode;
  }
  const providerErrorClass = takeBoundedString(
    input.raw.providerErrorClass,
    OBSERVABILITY_PROVIDER_ERROR_CLASSES
  );
  if (providerErrorClass) {
    payload.providerErrorClass = providerErrorClass;
  }
  const toolName = takeBoundedString(input.raw.toolName, OBSERVABILITY_TOOLS);
  if (toolName) {
    payload.toolName = toolName;
  }
  const providerCallCount = takeBoundedCount(input.raw.providerCallCount);
  if (providerCallCount !== undefined) {
    payload.providerCallCount = providerCallCount;
  }
  const toolExecutionCount = takeBoundedCount(input.raw.toolExecutionCount);
  if (toolExecutionCount !== undefined) {
    payload.toolExecutionCount = toolExecutionCount;
  }
  const authoritativeResultCount = takeBoundedCount(input.raw.authoritativeResultCount);
  if (authoritativeResultCount !== undefined) {
    payload.authoritativeResultCount = authoritativeResultCount;
  }
  const resultCount = takeBoundedCount(input.raw.resultCount);
  if (resultCount !== undefined) {
    payload.resultCount = resultCount;
  }
  const route = takeBoundedString(input.raw.route, OBSERVABILITY_ROUTES);
  if (route) {
    payload.route = route;
  }
  return payload;
}

export function createConversationCoreRuntimeObservabilityLogSink(input: {
  readonly requestCorrelationId: string;
  readonly writeLog?: (line: string) => void;
  readonly maxEvents?: number;
}): ConversationCoreRuntimeObservabilitySink {
  const writeLog = input.writeLog ?? ((line: string) => console.log(line));
  const maxEvents = input.maxEvents ?? CONVERSATION_CORE_RUNTIME_OBSERVABILITY_MAX_EVENTS;
  let emitted = 0;
  return (raw) => {
    if (emitted >= maxEvents) {
      return;
    }
    const payload = toConversationCoreRuntimeObservabilityLog({
      requestCorrelationId: input.requestCorrelationId,
      raw,
    });
    if (!payload) {
      return;
    }
    emitted += 1;
    try {
      writeLog(JSON.stringify(payload));
    } catch {
      // Observability logging must never change Core control flow.
    }
  };
}

function firstNonEmpty(readEnv: (key: string) => string | undefined, keys: readonly string[]): string {
  for (const key of keys) {
    const value = String(readEnv(key) ?? "").trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function resolveProjectClass(input: {
  readonly backend: NongaDataBackend;
  readonly readEnv: (key: string) => string | undefined;
}): {
  readonly projectClass: ConversationCoreLiveProjectClass;
  readonly projectIdLabel: ConversationCoreLiveEnvironmentIdentityOk["projectIdLabel"] | "unverified";
} {
  if (input.backend === "file") {
    return { projectClass: "local-file", projectIdLabel: "file-local" };
  }
  if (String(input.readEnv("FIRESTORE_EMULATOR_HOST") ?? "").trim()) {
    return { projectClass: "emulator", projectIdLabel: "emulator" };
  }
  const projectId = firstNonEmpty(input.readEnv, [
    "FIREBASE_PROJECT_ID",
    "NONGA_FIREBASE_PROJECT_ID",
    "GOOGLE_CLOUD_PROJECT",
    "GCLOUD_PROJECT",
    "VITE_FIREBASE_PROJECT_ID",
  ]);
  if (projectId === "nonga-ce93c") {
    return { projectClass: "staging", projectIdLabel: "nonga-ce93c" };
  }
  if (projectId === "nonga-staging-2026") {
    return { projectClass: "fixture", projectIdLabel: "nonga-staging-2026" };
  }
  return { projectClass: "unverified", projectIdLabel: "unverified" };
}

/**
 * Sanitized identity inspect. Never returns secret values or unknown raw project ids.
 */
export function inspectConversationCoreLiveEnvironmentIdentity(
  readEnv: (key: string) => string | undefined
): ConversationCoreLiveEnvironmentIdentityResult {
  if (!isExplicitEnvironmentIdentity(readEnv)) {
    return Object.freeze({ ok: false as const, reason: "unverified" as const });
  }
  const identity = resolveNongaEnvironmentIdentity(readEnv);
  if (identity === "production" || !NON_PRODUCTION_IDENTITIES.has(identity)) {
    return Object.freeze({ ok: false as const, reason: "production" as const });
  }
  const backend = resolveInventoryDataBackend({
    NONGA_DATA_BACKEND: readEnv("NONGA_DATA_BACKEND"),
    NODE_ENV: readEnv("NODE_ENV"),
  });
  const project = resolveProjectClass({ backend, readEnv });
  if (project.projectClass === "unverified") {
    return Object.freeze({ ok: false as const, reason: "unknown-project" as const });
  }
  const geminiConfig = resolveConversationCoreGeminiConfig({
    readEnv,
    apiKeyReady: Boolean(String(readEnv(CONVERSATION_CORE_GEMINI_API_KEY_ENV) ?? "").trim()),
  });
  return Object.freeze({
    ok: true as const,
    identity,
    backend,
    projectClass: project.projectClass,
    projectIdLabel: project.projectIdLabel as ConversationCoreLiveEnvironmentIdentityOk["projectIdLabel"],
    geminiProviderId: CONVERSATION_CORE_GEMINI_PROVIDER_ID,
    geminiModel:
      geminiConfig.status === "ready"
        ? geminiConfig.model
        : ("unresolved" as const),
  });
}

function hasInventoryRepository(repository: unknown): repository is InventoryRepository {
  if (!repository || typeof repository !== "object") {
    return false;
  }
  const listings = (repository as InventoryRepository).listings;
  return Boolean(
    listings &&
      typeof listings.listPublished === "function" &&
      typeof listings.getById === "function"
  );
}

function resolveLiveInventoryRepository(
  input: ConversationCoreLiveServerActivationInput
): InventoryRepository | null {
  if (input.inventoryRepository === null) {
    return null;
  }
  if (hasInventoryRepository(input.inventoryRepository)) {
    return input.inventoryRepository;
  }
  const createRepo = input.createInventoryRepository ?? createInventoryRepository;
  try {
    const repository = createRepo();
    return hasInventoryRepository(repository) ? repository : null;
  } catch {
    return null;
  }
}

/**
 * Build orchestrator activation for authoritative Search/Inventory only.
 * Returns undefined unless explicit non-production identity and server flags are on.
 * Never enables flags. Never stages Selection/Finance.
 */
export function resolveConversationCoreLiveServerActivation(
  input: ConversationCoreLiveServerActivationInput
): ConversationCoreOrchestratorActivation | undefined {
  if (!input || typeof input.readEnv !== "function") {
    return undefined;
  }

  const flags = resolveConversationCoreFeatureFlags({ readEnv: input.readEnv });
  const geminiRequested =
    String(input.readEnv(NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV) ?? "").trim() === "true";
  const toolsRequested =
    String(input.readEnv(NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV) ?? "").trim() === "true";
  if (
    flags.emergencyKillSwitchActive ||
    !flags.coreEnabled ||
    !geminiRequested ||
    !toolsRequested
  ) {
    return undefined;
  }

  const identity = inspectConversationCoreLiveEnvironmentIdentity(input.readEnv);
  if (!identity.ok) {
    return undefined;
  }

  const geminiConfig = resolveConversationCoreGeminiConfig({ readEnv: input.readEnv });
  if (geminiConfig.status !== "ready") {
    return undefined;
  }

  const apiKey = String(input.readEnv(CONVERSATION_CORE_GEMINI_API_KEY_ENV) ?? "").trim();
  if (!apiKey) {
    return undefined;
  }

  const inventoryRepository = resolveLiveInventoryRepository(input);
  if (!inventoryRepository) {
    return undefined;
  }

  const createSdkSeam =
    input.createSdkSeam ??
    ((seamInput: { readonly apiKey: string }) =>
      createConversationCoreGeminiToolTransportSdkSeam(seamInput));

  const expertMode = input.expertMode ?? "AUTO";
  const baseInstruction = buildConversationCoreBaseInstruction({ expertMode });
  if (!baseInstruction.trim()) {
    return undefined;
  }

  const observabilityEnabled = isConversationCoreObservabilityEnabled(input.readEnv);
  const observabilitySink = observabilityEnabled
    ? createConversationCoreRuntimeObservabilityLogSink({
        requestCorrelationId:
          typeof input.observabilityCorrelationId === "string" &&
          BOUNDED_CORRELATION_ID.test(input.observabilityCorrelationId)
            ? input.observabilityCorrelationId
            : randomUUID(),
        writeLog: input.writeObservabilityLog,
      })
    : undefined;

  return Object.freeze({
    geminiEnabled: true,
    toolsEnabled: true,
    serverStagedToolNames: Object.freeze([...CONVERSATION_CORE_LIVE_STAGED_TOOL_NAMES]),
    baseInstruction,
    geminiConfig,
    adapter: FAIL_CLOSED_TEXT_ADAPTER,
    killSwitchEnabled: false,
    resolveRuntimeDeps: (resolverInput) =>
      createConversationCoreRuntimeDeps({
        activation: resolverInput.activation,
        inventoryRepository,
        readEnv: input.readEnv,
        createSdkSeam,
        ...(typeof input.mintRequestId === "function"
          ? { mintRequestId: input.mintRequestId }
          : {}),
        ...(observabilitySink ? { observabilitySink } : {}),
      }),
    ...(observabilitySink
      ? {
          runExecution: (
            executionInput: Parameters<typeof runConversationCoreExecutionService>[0]
          ) =>
            runConversationCoreExecutionService({
              ...executionInput,
              observabilitySink,
            }),
        }
      : {}),
  }) satisfies ConversationCoreOrchestratorActivation;
}

export const CONVERSATION_CORE_LIVE_KNOWN_NON_PRODUCTION_PROJECT_IDS = Object.freeze(
  [...KNOWN_NON_PRODUCTION_PROJECT_IDS]
);
