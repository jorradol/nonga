/**
 * WP-V2U-03E2D2C2B — Lazy runtime dependency factory for grounded tool-turn (no production caller).
 * Composes existing Gemini transport, tool registry/executor, and coordinator deps on demand only.
 */
import {
  buildConversationCoreAuthoritativeGroundedAnswer,
  isPhase1ReadOnlyToolName,
  validateConversationCoreAuthoritativeGrounding,
  validateToolRequest,
  type ConversationCoreToolName,
} from "../../services/conversation-core/index";
import type { InventoryRepository } from "../repositories/inventoryRepository";
import { createConversationCoreBusinessToolRegistry } from "./conversationCoreBusinessToolAdapters";
import {
  CONVERSATION_CORE_GEMINI_API_KEY_ENV,
  resolveConversationCoreGeminiConfig,
  type ConversationCoreGeminiConfigStatus,
} from "./conversationCoreGeminiConfig";
import {
  emitConversationCoreRuntimeObservability,
  generateFinalAnswerFromToolResult,
  generateStructuredInitialTurn,
  type ConversationCoreGeminiToolTransportSdkSeam,
  type ConversationCoreRuntimeObservabilitySink,
} from "./conversationCoreGeminiToolTransport";
import {
  CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
  runConversationCoreGroundedToolTurnCoordinator,
  type ConversationCoreGroundedToolTurnCoordinatorInput,
  type ConversationCoreGroundedToolTurnCoordinatorOutcome,
  type ConversationCoreGroundedToolTurnCoordinatorReasonCode,
  type ConversationCoreGroundedToolTurnCoordinatorUnavailable,
} from "./conversationCoreGroundedToolTurnCoordinator";
import { executeConversationCoreTool } from "./conversationCoreToolExecutor";
import type { ConversationCoreToolRegistry } from "./conversationCoreToolRegistry";

export const CONVERSATION_CORE_RUNTIME_DEPS_SUPPORTED_TOOL_NAMES = [
  "marketplace.search",
  "inventory.fetch",
] as const;

export type ConversationCoreRuntimeDepsSupportedToolName =
  (typeof CONVERSATION_CORE_RUNTIME_DEPS_SUPPORTED_TOOL_NAMES)[number];

const RUNTIME_BLOCKED_TOOL_NAMES = new Set<string>([
  "vehicle.resolveSelection",
  "finance.calculate",
]);

const SUPPORTED_TOOL_SET = new Set<string>(CONVERSATION_CORE_RUNTIME_DEPS_SUPPORTED_TOOL_NAMES);

export const CONVERSATION_CORE_RUNTIME_DEPS_REASON_CODES = [
  "runtime-deps-disabled",
  "kill-switch-active",
  "core-disabled",
  "gemini-disabled",
  "tools-disabled",
  "empty-staged-tool-set",
  "unsupported-staged-tool",
  "invalid-runtime-deps-input",
  "gemini-config-unavailable",
  "inventory-repository-unavailable",
  "sdk-seam-unavailable",
  "runtime-deps-construction-failed",
] as const;

export type ConversationCoreRuntimeDepsReasonCode =
  (typeof CONVERSATION_CORE_RUNTIME_DEPS_REASON_CODES)[number];

export interface ConversationCoreRuntimeDepsActivationSnapshot {
  readonly killSwitchEnabled: boolean;
  readonly coreEnabled: boolean;
  readonly geminiEnabled: boolean;
  readonly toolsEnabled: boolean;
  readonly serverStagedToolNames: readonly ConversationCoreToolName[];
}

export interface ConversationCoreRuntimeDepsInput {
  readonly activation: ConversationCoreRuntimeDepsActivationSnapshot;
  readonly readEnv?: (key: string) => string | undefined;
  readonly inventoryRepository?: InventoryRepository | null;
  readonly createSdkSeam?: (input: {
    readonly apiKey: string;
  }) => ConversationCoreGeminiToolTransportSdkSeam;
  readonly mintRequestId?: () => string;
  readonly resolveGeminiConfig?: (input: unknown) => ConversationCoreGeminiConfigStatus;
  readonly observabilitySink?: ConversationCoreRuntimeObservabilitySink;
}

export type ConversationCoreRuntimeDepsGroundedToolTurnRunner = (
  input: ConversationCoreGroundedToolTurnCoordinatorInput
) => Promise<ConversationCoreGroundedToolTurnCoordinatorOutcome>;

export interface ConversationCoreRuntimeDepsReady {
  readonly kind: "ready";
  readonly supportedToolNames: readonly ConversationCoreRuntimeDepsSupportedToolName[];
  readonly runGroundedToolTurnCoordinator: ConversationCoreRuntimeDepsGroundedToolTurnRunner;
}

export interface ConversationCoreRuntimeDepsUnavailable {
  readonly kind: "unavailable";
  readonly reasonCode: ConversationCoreRuntimeDepsReasonCode;
}

export type ConversationCoreRuntimeDepsResult =
  | ConversationCoreRuntimeDepsReady
  | ConversationCoreRuntimeDepsUnavailable;

const INPUT_ALLOWED_KEYS = new Set([
  "activation",
  "readEnv",
  "inventoryRepository",
  "createSdkSeam",
  "mintRequestId",
  "resolveGeminiConfig",
  "observabilitySink",
]);

const ACTIVATION_ALLOWED_KEYS = new Set([
  "killSwitchEnabled",
  "coreEnabled",
  "geminiEnabled",
  "toolsEnabled",
  "serverStagedToolNames",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasUnknownKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>
): boolean {
  return Object.keys(value).some((key) => !allowed.has(key));
}

function freezeUnavailable(
  reasonCode: ConversationCoreRuntimeDepsReasonCode
): ConversationCoreRuntimeDepsUnavailable {
  return Object.freeze({
    kind: "unavailable" as const,
    reasonCode,
  });
}

function freezeReady(
  runGroundedToolTurnCoordinator: ConversationCoreRuntimeDepsGroundedToolTurnRunner
): ConversationCoreRuntimeDepsReady {
  return Object.freeze({
    kind: "ready" as const,
    supportedToolNames: Object.freeze([...CONVERSATION_CORE_RUNTIME_DEPS_SUPPORTED_TOOL_NAMES]),
    runGroundedToolTurnCoordinator,
  });
}

function freezeCoordinatorUnavailable(
  reasonCode: ConversationCoreGroundedToolTurnCoordinatorReasonCode
): ConversationCoreGroundedToolTurnCoordinatorUnavailable {
  return Object.freeze({
    kind: "unavailable" as const,
    reasonCode,
    assistantText: CONVERSATION_CORE_GROUNDED_TOOL_TURN_COORDINATOR_UNAVAILABLE_TEXT,
    providerCallCount: 0,
    toolExecutionCount: 0,
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

function parseStagedToolNames(
  raw: unknown
): readonly ConversationCoreToolName[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  const seen = new Set<string>();
  const normalized: ConversationCoreToolName[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      return null;
    }
    const trimmed = entry.trim();
    if (!isPhase1ReadOnlyToolName(trimmed)) {
      return null;
    }
    if (seen.has(trimmed)) {
      return null;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return Object.freeze(normalized);
}

function validateActivationInput(
  raw: unknown
): ConversationCoreRuntimeDepsActivationSnapshot | null {
  if (!isPlainObject(raw) || hasUnknownKeys(raw, ACTIVATION_ALLOWED_KEYS)) {
    return null;
  }
  const {
    killSwitchEnabled,
    coreEnabled,
    geminiEnabled,
    toolsEnabled,
    serverStagedToolNames,
  } = raw;
  if (
    typeof killSwitchEnabled !== "boolean" ||
    typeof coreEnabled !== "boolean" ||
    typeof geminiEnabled !== "boolean" ||
    typeof toolsEnabled !== "boolean"
  ) {
    return null;
  }
  const staged = parseStagedToolNames(serverStagedToolNames);
  if (staged === null) {
    return null;
  }
  return Object.freeze({
    killSwitchEnabled,
    coreEnabled,
    geminiEnabled,
    toolsEnabled,
    serverStagedToolNames: staged,
  });
}

function validateRuntimeDepsInput(
  raw: unknown
): ConversationCoreRuntimeDepsInput | null {
  if (!isPlainObject(raw) || hasUnknownKeys(raw, INPUT_ALLOWED_KEYS)) {
    return null;
  }
  const activation = validateActivationInput(raw.activation);
  if (!activation) {
    return null;
  }
  if (raw.readEnv !== undefined && typeof raw.readEnv !== "function") {
    return null;
  }
  if (
    raw.inventoryRepository !== undefined &&
    raw.inventoryRepository !== null &&
    !hasInventoryRepository(raw.inventoryRepository)
  ) {
    return null;
  }
  if (raw.createSdkSeam !== undefined && typeof raw.createSdkSeam !== "function") {
    return null;
  }
  if (raw.mintRequestId !== undefined && typeof raw.mintRequestId !== "function") {
    return null;
  }
  if (
    raw.resolveGeminiConfig !== undefined &&
    typeof raw.resolveGeminiConfig !== "function"
  ) {
    return null;
  }
  if (
    raw.observabilitySink !== undefined &&
    typeof raw.observabilitySink !== "function"
  ) {
    return null;
  }
  return Object.freeze({
    activation,
    readEnv:
      typeof raw.readEnv === "function"
        ? (raw.readEnv as ConversationCoreRuntimeDepsInput["readEnv"])
        : undefined,
    inventoryRepository:
      raw.inventoryRepository === undefined
        ? undefined
        : (raw.inventoryRepository as InventoryRepository | null),
    createSdkSeam:
      typeof raw.createSdkSeam === "function"
        ? (raw.createSdkSeam as NonNullable<ConversationCoreRuntimeDepsInput["createSdkSeam"]>)
        : undefined,
    mintRequestId:
      typeof raw.mintRequestId === "function"
        ? (raw.mintRequestId as NonNullable<ConversationCoreRuntimeDepsInput["mintRequestId"]>)
        : undefined,
    resolveGeminiConfig:
      typeof raw.resolveGeminiConfig === "function"
        ? (raw.resolveGeminiConfig as NonNullable<ConversationCoreRuntimeDepsInput["resolveGeminiConfig"]>)
        : undefined,
    observabilitySink:
      typeof raw.observabilitySink === "function"
        ? (raw.observabilitySink as ConversationCoreRuntimeObservabilitySink)
        : undefined,
  }) satisfies ConversationCoreRuntimeDepsInput;
}

function stagedHasBlockedTool(
  stagedToolNames: readonly ConversationCoreToolName[]
): boolean {
  return stagedToolNames.some((toolName) => RUNTIME_BLOCKED_TOOL_NAMES.has(toolName));
}

function stagedHasSupportedTool(
  stagedToolNames: readonly ConversationCoreToolName[]
): boolean {
  return stagedToolNames.some((toolName) => SUPPORTED_TOOL_SET.has(toolName));
}

function extractRequestedToolName(rawRequest: unknown): ConversationCoreToolName | null {
  const validation = validateToolRequest(rawRequest);
  if (!validation.ok) {
    return null;
  }
  return validation.value.toolName;
}

function createMintRequestIdFactory(
  mintRequestId?: () => string
): () => string {
  if (typeof mintRequestId === "function") {
    return mintRequestId;
  }
  let counter = 0;
  return () => {
    counter += 1;
    return `runtime-req-${counter}`;
  };
}

function buildRunner(input: {
  readonly effectiveStagedToolNames: readonly ConversationCoreRuntimeDepsSupportedToolName[];
  readonly sdkSeam: ConversationCoreGeminiToolTransportSdkSeam;
  readonly registry: ConversationCoreToolRegistry;
  readonly mintRequestId: () => string;
  readonly observabilitySink?: ConversationCoreRuntimeObservabilitySink;
}): ConversationCoreRuntimeDepsGroundedToolTurnRunner {
  const effectiveStagedSet = new Set<string>(input.effectiveStagedToolNames);
  const sink = input.observabilitySink;

  const coordinatorDeps = Object.freeze({
    mintRequestId: input.mintRequestId,
    observabilitySink: sink,
    generateInitialTurn: async (callInput: Parameters<typeof generateStructuredInitialTurn>[0]) =>
      generateStructuredInitialTurn({
        ...callInput,
        transport: input.sdkSeam,
        observabilitySink: sink,
      }),
    generateFollowUp: async (callInput: Parameters<typeof generateFinalAnswerFromToolResult>[0]) =>
      generateFinalAnswerFromToolResult({
        ...callInput,
        transport: input.sdkSeam,
        observabilitySink: sink,
      }),
    executeTool: async (executorInput: Parameters<typeof executeConversationCoreTool>[0]) => {
      const requestedTool = extractRequestedToolName(executorInput.rawRequest);
      if (
        requestedTool === null ||
        !SUPPORTED_TOOL_SET.has(requestedTool) ||
        RUNTIME_BLOCKED_TOOL_NAMES.has(requestedTool)
      ) {
        return {
          kind: "rejected" as const,
          reasonCode: "malformed_request" as const,
          issues: [],
        };
      }
      return executeConversationCoreTool(executorInput, {
        registry: input.registry,
      });
    },
    validateGrounding: (groundingInput: Parameters<typeof validateConversationCoreAuthoritativeGrounding>[0]) =>
      validateConversationCoreAuthoritativeGrounding(groundingInput),
    buildDeterministicGroundedAnswer: (
      toolResult: Parameters<typeof buildConversationCoreAuthoritativeGroundedAnswer>[0],
      userAssumptions?: Parameters<typeof buildConversationCoreAuthoritativeGroundedAnswer>[1]
    ) => buildConversationCoreAuthoritativeGroundedAnswer(toolResult, userAssumptions ?? []),
  });

  return async (coordinatorInput) => {
    if (coordinatorInput.allowedToolNames.length !== 1) {
      return freezeCoordinatorUnavailable("tool-not-allowed");
    }
    const [allowedTool] = coordinatorInput.allowedToolNames;
    if (
      !SUPPORTED_TOOL_SET.has(allowedTool) ||
      RUNTIME_BLOCKED_TOOL_NAMES.has(allowedTool) ||
      !effectiveStagedSet.has(allowedTool)
    ) {
      return freezeCoordinatorUnavailable("tool-not-allowed");
    }
    return runConversationCoreGroundedToolTurnCoordinator(coordinatorInput, coordinatorDeps);
  };
}

function extractObservabilitySink(raw: unknown): ConversationCoreRuntimeObservabilitySink | undefined {
  if (!isPlainObject(raw) || typeof raw.observabilitySink !== "function") {
    return undefined;
  }
  return raw.observabilitySink as ConversationCoreRuntimeObservabilitySink;
}

function finishRuntimeDeps(
  sink: ConversationCoreRuntimeObservabilitySink | undefined,
  result: ConversationCoreRuntimeDepsResult
): ConversationCoreRuntimeDepsResult {
  emitConversationCoreRuntimeObservability(sink, {
    event: "runtime_deps_outcome",
    kind: result.kind,
    ...(result.kind === "unavailable" ? { reasonCode: result.reasonCode } : {}),
  });
  return result;
}

/**
 * Lazily compose grounded tool-turn runtime dependencies when activation snapshot is ready.
 * No import-time side effects. No production caller in this work package.
 */
export function createConversationCoreRuntimeDeps(
  rawInput: unknown
): ConversationCoreRuntimeDepsResult {
  const sink = extractObservabilitySink(rawInput);
  const input = validateRuntimeDepsInput(rawInput);
  if (!input) {
    return finishRuntimeDeps(sink, freezeUnavailable("invalid-runtime-deps-input"));
  }

  const { activation } = input;

  if (activation.killSwitchEnabled) {
    return finishRuntimeDeps(sink, freezeUnavailable("kill-switch-active"));
  }
  if (!activation.coreEnabled) {
    return finishRuntimeDeps(sink, freezeUnavailable("core-disabled"));
  }
  if (!activation.geminiEnabled) {
    return finishRuntimeDeps(sink, freezeUnavailable("gemini-disabled"));
  }
  if (!activation.toolsEnabled) {
    return finishRuntimeDeps(sink, freezeUnavailable("tools-disabled"));
  }

  if (activation.serverStagedToolNames.length === 0) {
    return finishRuntimeDeps(sink, freezeUnavailable("empty-staged-tool-set"));
  }
  if (stagedHasBlockedTool(activation.serverStagedToolNames)) {
    return finishRuntimeDeps(sink, freezeUnavailable("unsupported-staged-tool"));
  }
  if (!stagedHasSupportedTool(activation.serverStagedToolNames)) {
    return finishRuntimeDeps(sink, freezeUnavailable("unsupported-staged-tool"));
  }

  if (!hasInventoryRepository(input.inventoryRepository ?? null)) {
    return finishRuntimeDeps(sink, freezeUnavailable("inventory-repository-unavailable"));
  }

  const resolveConfig = input.resolveGeminiConfig ?? resolveConversationCoreGeminiConfig;
  const geminiConfig = resolveConfig({
    readEnv: input.readEnv ?? (() => undefined),
    apiKeyReady: true,
  });
  if (geminiConfig.status !== "ready") {
    return finishRuntimeDeps(sink, freezeUnavailable("gemini-config-unavailable"));
  }

  const readEnv = input.readEnv ?? (() => undefined);
  const apiKey = String(readEnv(CONVERSATION_CORE_GEMINI_API_KEY_ENV) ?? "").trim();
  if (!apiKey) {
    return finishRuntimeDeps(sink, freezeUnavailable("gemini-config-unavailable"));
  }

  const createSdkSeam = input.createSdkSeam;
  if (typeof createSdkSeam !== "function") {
    return finishRuntimeDeps(sink, freezeUnavailable("sdk-seam-unavailable"));
  }

  let sdkSeam: ConversationCoreGeminiToolTransportSdkSeam;
  try {
    sdkSeam = createSdkSeam({ apiKey });
  } catch {
    return finishRuntimeDeps(sink, freezeUnavailable("runtime-deps-construction-failed"));
  }

  const registry = createConversationCoreBusinessToolRegistry({
    vehicle: {
      inventoryRepository: input.inventoryRepository as InventoryRepository,
      trustedContextProvider: null,
    },
    finance: null,
  });
  if (!registry) {
    return finishRuntimeDeps(sink, freezeUnavailable("runtime-deps-construction-failed"));
  }

  const effectiveStagedToolNames = activation.serverStagedToolNames.filter(
    (toolName): toolName is ConversationCoreRuntimeDepsSupportedToolName =>
      SUPPORTED_TOOL_SET.has(toolName)
  );

  const runner = buildRunner({
    effectiveStagedToolNames,
    sdkSeam,
    registry,
    mintRequestId: createMintRequestIdFactory(input.mintRequestId),
    observabilitySink: input.observabilitySink ?? sink,
  });

  return finishRuntimeDeps(sink, freezeReady(runner));
}
