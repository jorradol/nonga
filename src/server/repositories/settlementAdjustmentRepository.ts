/**
 * v5.6I.4 — Settlement adjustment repository (memory default; no Firestore in this slice).
 */

import type {
  SettlementAdjustmentAuditEntry,
  SettlementAdjustmentState,
} from "../../services/leads/leadTypes";

export interface SettlementAdjustmentRepository {
  getStateByListingId(listingId: string): Promise<SettlementAdjustmentState | null>;
  listAllStates(): Promise<SettlementAdjustmentState[]>;
  upsertState(state: SettlementAdjustmentState): Promise<SettlementAdjustmentState>;
  appendAudit(entry: SettlementAdjustmentAuditEntry): Promise<SettlementAdjustmentAuditEntry>;
  listAuditByListingId(listingId: string): Promise<SettlementAdjustmentAuditEntry[]>;
}

class InMemorySettlementAdjustmentRepository implements SettlementAdjustmentRepository {
  private readonly states = new Map<string, SettlementAdjustmentState>();
  private readonly audits: SettlementAdjustmentAuditEntry[] = [];

  async getStateByListingId(
    listingId: string
  ): Promise<SettlementAdjustmentState | null> {
    return this.states.get(listingId.trim()) ?? null;
  }

  async listAllStates(): Promise<SettlementAdjustmentState[]> {
    return [...this.states.values()];
  }

  async upsertState(
    state: SettlementAdjustmentState
  ): Promise<SettlementAdjustmentState> {
    this.states.set(state.listingId, state);
    return state;
  }

  async appendAudit(
    entry: SettlementAdjustmentAuditEntry
  ): Promise<SettlementAdjustmentAuditEntry> {
    this.audits.push(entry);
    return entry;
  }

  async listAuditByListingId(
    listingId: string
  ): Promise<SettlementAdjustmentAuditEntry[]> {
    const id = listingId.trim();
    return this.audits.filter((a) => a.listingId === id);
  }
}

let singleton: SettlementAdjustmentRepository | null = null;

export function createSettlementAdjustmentRepository(): SettlementAdjustmentRepository {
  if (!singleton) {
    singleton = new InMemorySettlementAdjustmentRepository();
  }
  return singleton;
}

/** For tests — reset in-memory store. */
export function resetSettlementAdjustmentRepositoryForTests(): void {
  singleton = new InMemorySettlementAdjustmentRepository();
}
