/**
 * v5.6I.5 — Success fee record repository (memory default; optional Firestore readiness).
 */

import type { SuccessFeeRecord } from "../../services/leads/leadTypes";
import {
  resolveSettlementDataBackend,
  type SettlementDataBackend,
} from "../../services/leads/settlementPersistenceFlags";
import { createFirestoreSuccessFeeRecordRepository } from "./successFeeRecordRepositoryFirestore";

export interface SuccessFeeRecordRepository {
  getById(id: string): Promise<SuccessFeeRecord | null>;
  getByListingId(listingId: string): Promise<SuccessFeeRecord | null>;
  listAll(): Promise<SuccessFeeRecord[]>;
  /** Writes disabled unless NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED=true. */
  upsert(record: SuccessFeeRecord): Promise<SuccessFeeRecord>;
}

class InMemorySuccessFeeRecordRepository implements SuccessFeeRecordRepository {
  private readonly records = new Map<string, SuccessFeeRecord>();
  private readonly byListingId = new Map<string, string>();

  async getById(id: string): Promise<SuccessFeeRecord | null> {
    return this.records.get(id.trim()) ?? null;
  }

  async getByListingId(listingId: string): Promise<SuccessFeeRecord | null> {
    const recordId = this.byListingId.get(listingId.trim());
    if (!recordId) return null;
    return this.records.get(recordId) ?? null;
  }

  async listAll(): Promise<SuccessFeeRecord[]> {
    return [...this.records.values()];
  }

  async upsert(record: SuccessFeeRecord): Promise<SuccessFeeRecord> {
    this.records.set(record.id, record);
    this.byListingId.set(record.listingId, record.id);
    return record;
  }
}

let singleton: SuccessFeeRecordRepository | null = null;
let singletonBackend: SettlementDataBackend | null = null;

export function createSuccessFeeRecordRepository(
  backend: SettlementDataBackend = resolveSettlementDataBackend()
): SuccessFeeRecordRepository {
  if (!singleton || singletonBackend !== backend) {
    singleton =
      backend === "firestore"
        ? createFirestoreSuccessFeeRecordRepository()
        : new InMemorySuccessFeeRecordRepository();
    singletonBackend = backend;
  }
  return singleton;
}

export function resetSuccessFeeRecordRepositoryForTests(): void {
  singleton = new InMemorySuccessFeeRecordRepository();
  singletonBackend = "memory";
}
