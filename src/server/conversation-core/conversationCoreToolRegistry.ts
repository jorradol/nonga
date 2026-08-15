/**
 * WP-V2U-03D1 — Server-owned read-only tool registry foundation.
 * No business adapters, no network, no default production handlers.
 */
import {
  PHASE1_READ_ONLY_TOOLS,
  isPhase1ReadOnlyToolName,
  type ConversationCoreToolName,
  type ToolRequest,
} from "../../services/conversation-core/index";

export type ConversationCoreToolHandlerOutput =
  | { readonly status: "ok"; readonly data: unknown }
  | { readonly status: "error"; readonly errorCode: string }
  | { readonly status: "fallback"; readonly errorCode: string };

export type ConversationCoreToolHandler = (
  request: ToolRequest
) => ConversationCoreToolHandlerOutput | Promise<ConversationCoreToolHandlerOutput>;

export interface ConversationCoreToolRegistration {
  readonly toolName: ConversationCoreToolName;
  readonly handler: ConversationCoreToolHandler;
}

export interface ConversationCoreToolRegistry {
  readonly canonicalToolNames: readonly ConversationCoreToolName[];
  readonly registeredToolNames: readonly ConversationCoreToolName[];
  isCanonicalToolName(toolName: string): toolName is ConversationCoreToolName;
  isRegistered(toolName: ConversationCoreToolName): boolean;
  resolveHandler(toolName: ConversationCoreToolName): ConversationCoreToolHandler | undefined;
}

export class ConversationCoreToolRegistryDuplicateError extends Error {
  readonly toolName: ConversationCoreToolName;

  constructor(toolName: ConversationCoreToolName) {
    super(`Duplicate tool handler registration: ${toolName}`);
    this.name = "ConversationCoreToolRegistryDuplicateError";
    this.toolName = toolName;
  }
}

function freezeRegistry(registry: ConversationCoreToolRegistry): ConversationCoreToolRegistry {
  return Object.freeze(registry);
}

/**
 * Create an immutable registry from explicit registrations.
 * Duplicate tool names throw — handlers are never silently replaced.
 */
export function createConversationCoreToolRegistry(
  registrations: readonly ConversationCoreToolRegistration[]
): ConversationCoreToolRegistry {
  const handlers = new Map<ConversationCoreToolName, ConversationCoreToolHandler>();
  const registeredToolNames: ConversationCoreToolName[] = [];

  for (const entry of registrations) {
    if (!isPhase1ReadOnlyToolName(entry.toolName)) {
      throw new Error(`Tool name is not in the Phase 1 read-only allowlist: ${entry.toolName}`);
    }
    if (typeof entry.handler !== "function") {
      throw new Error(`Tool handler must be a function: ${entry.toolName}`);
    }
    if (handlers.has(entry.toolName)) {
      throw new ConversationCoreToolRegistryDuplicateError(entry.toolName);
    }
    handlers.set(entry.toolName, entry.handler);
    registeredToolNames.push(entry.toolName);
  }

  const canonicalToolNames = Object.freeze([...PHASE1_READ_ONLY_TOOLS]);

  return freezeRegistry({
    canonicalToolNames,
    registeredToolNames: Object.freeze(registeredToolNames),
    isCanonicalToolName(toolName: string): toolName is ConversationCoreToolName {
      return isPhase1ReadOnlyToolName(toolName);
    },
    isRegistered(toolName: ConversationCoreToolName): boolean {
      return handlers.has(toolName);
    },
    resolveHandler(toolName: ConversationCoreToolName): ConversationCoreToolHandler | undefined {
      return handlers.get(toolName);
    },
  });
}

/**
 * Empty registry — all canonical tools are known but unavailable until registered.
 */
export function createEmptyConversationCoreToolRegistry(): ConversationCoreToolRegistry {
  return createConversationCoreToolRegistry([]);
}
