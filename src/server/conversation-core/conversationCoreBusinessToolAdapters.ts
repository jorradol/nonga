/**
 * WP-V2U-03D4B — Composite factory for vehicle + finance business tool adapters.
 * No module-import side effects; explicit dependency injection only.
 */
import {
  createConversationCoreFinanceToolRegistrations,
  type ConversationCoreFinanceToolAdapterDeps,
} from "./conversationCoreFinanceToolAdapters";
import {
  createConversationCoreToolRegistry,
  type ConversationCoreToolRegistration,
  type ConversationCoreToolRegistry,
} from "./conversationCoreToolRegistry";
import {
  createConversationCoreVehicleToolRegistrations,
  type ConversationCoreVehicleToolAdapterDeps,
} from "./conversationCoreVehicleToolAdapters";

export interface ConversationCoreBusinessToolAdapterDependencies {
  readonly vehicle?: ConversationCoreVehicleToolAdapterDeps | null;
  readonly finance?: ConversationCoreFinanceToolAdapterDeps | null;
}

/**
 * Merge vehicle and finance registration arrays using owner-approved partial composition.
 * Returns null when no module produced registrations — never an empty registry.
 */
export function createConversationCoreBusinessToolRegistrations(
  deps: ConversationCoreBusinessToolAdapterDependencies
): ConversationCoreToolRegistration[] | null {
  const combined: ConversationCoreToolRegistration[] = [];

  if (deps.vehicle != null) {
    const vehicleRegistrations = createConversationCoreVehicleToolRegistrations(deps.vehicle);
    if (vehicleRegistrations) {
      combined.push(...vehicleRegistrations);
    }
  }

  if (deps.finance != null) {
    const financeRegistrations = createConversationCoreFinanceToolRegistrations(deps.finance);
    if (financeRegistrations) {
      combined.push(...financeRegistrations);
    }
  }

  if (combined.length === 0) {
    return null;
  }

  return combined;
}

export function createConversationCoreBusinessToolRegistry(
  deps: ConversationCoreBusinessToolAdapterDependencies
): ConversationCoreToolRegistry | null {
  const registrations = createConversationCoreBusinessToolRegistrations(deps);
  if (!registrations) {
    return null;
  }
  return createConversationCoreToolRegistry(registrations);
}
