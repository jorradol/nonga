/**
 * v5.6I.4 / v5.6I.5 / v5.6I.9 — Settlement adjustment repository (memory default; atomic apply).
 */

import type {
  SettlementAdjustmentAuditEntry,
  SettlementAdjustmentState,
} from "../../services/leads/leadTypes";
import {
  computeAdjustmentWithAuditDraft,
  type ApplyAdjustmentWithAuditResult,
} from "../../services/leads/settlementAdjustmentApply";
import type { ApplySettlementAdjustmentInput } from "../../services/leads/settlementAdjustmentService";
import {
  buildAdjustmentPayloadFingerprint,
  buildSettlementIdempotencyCompositeKey,
  SettlementAdjustmentIdempotencyConflictError,
  type SettlementAdjustmentIdempotencyRecord,
} from "../../services/leads/settlementIdempotency";
import {
  resolveSettlementDataBackend,
  type SettlementDataBackend,
} from "../../services/leads/settlementPersistenceFlags";
import { createFirestoreSettlementAdjustmentRepository } from "./settlementAdjustmentRepositoryFirestore";

export type ApplyAdjustmentWithAuditRepositoryParams = {
  current: SettlementAdjustmentState;
  input: ApplySettlementAdjustmentInput;
  requestId: string;
};

export interface SettlementAdjustmentRepository {
  getStateByListingId(listingId: string): Promise<SettlementAdjustmentState | null>;
  listAllStates(): Promise<SettlementAdjustmentState[]>;
  upsertState(state: SettlementAdjustmentState): Promise<SettlementAdjustmentState>;
  appendAudit(entry: SettlementAdjustmentAuditEntry): Promise<SettlementAdjustmentAuditEntry>;
  listAuditByListingId(listingId: string): Promise<SettlementAdjustmentAuditEntry[]>;
  /** v5.6I.9 — atomic state + audit with idempotency (preferred for POST adjustments). */
  applyAdjustmentWithAudit(
    params: ApplyAdjustmentWithAuditRepositoryParams
  ): Promise<ApplyAdjustmentWithAuditResult>;
}

class InMemorySettlementAdjustmentRepository implements SettlementAdjustmentRepository {
  private readonly states = new Map<string, SettlementAdjustmentState>();
  private readonly audits: SettlementAdjustmentAuditEntry[] = [];
  private readonly idempotency = new Map<string, SettlementAdjustmentIdempotencyRecord>();

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

  async applyAdjustmentWithAudit(
    params: ApplyAdjustmentWithAuditRepositoryParams
  ): Promise<ApplyAdjustmentWithAuditResult> {
    const compositeKey = buildSettlementIdempotencyCompositeKey(
      params.input.listingId,
      params.input.updatedBy,
      params.requestId
    );
    const payloadFingerprint = buildAdjustmentPayloadFingerprint(params.input);
    const existing = this.idempotency.get(compositeKey);

    if (existing) {
      if (existing.payloadFingerprint !== payloadFingerprint) {
        throw new SettlementAdjustmentIdempotencyConflictError();
      }
      const state = this.states.get(params.input.listingId.trim());
      const audit = this.audits.find((a) => a.id === existing.auditId);
      if (!state || !audit) {
        throw new Error("idempotency record corrupt — state or audit missing");
      }
      return {
        state,
        audit,
        outcome: "duplicate",
        requestId: params.requestId,
        payloadFingerprint,
      };
    }

    const { next, audit } = computeAdjustmentWithAuditDraft({
      current: params.current,
      input: params.input,
      requestId: params.requestId,
    });

    this.states.set(next.listingId, next);
    this.audits.push(audit);
    this.idempotency.set(compositeKey, {
      compositeKey,
      listingId: params.input.listingId.trim(),
      updatedBy: params.input.updatedBy.trim(),
      requestId: params.requestId,
      payloadFingerprint,
      auditId: audit.id,
      processedAt: audit.createdAt,
    });

    return {
      state: next,
      audit,
      outcome: "processed",
      requestId: params.requestId,
      payloadFingerprint,
    };
  }
}

let singleton: SettlementAdjustmentRepository | null = null;
let singletonBackend: SettlementDataBackend | null = null;

export function createSettlementAdjustmentRepository(
  backend: SettlementDataBackend = resolveSettlementDataBackend()
): SettlementAdjustmentRepository {
  if (!singleton || singletonBackend !== backend) {
    singleton =
      backend === "firestore"
        ? createFirestoreSettlementAdjustmentRepository()
        : new InMemorySettlementAdjustmentRepository();
    singletonBackend = backend;
  }
  return singleton;
}

/** For tests — reset in-memory store (forces memory backend). */
export function resetSettlementAdjustmentRepositoryForTests(): void {
  singleton = new InMemorySettlementAdjustmentRepository();
  singletonBackend = "memory";
}

export { resolveSettlementDataBackend };
