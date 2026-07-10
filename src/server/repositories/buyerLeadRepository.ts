/**
 * v5.6C / v5.6F / v22.49 / v22.52 — Buyer lead repository factory (memory default; optional Firestore).
 */

import type { BuyerLead, LeadContactLog } from "../../services/leads/leadTypes";
import { LEAD_ENGINE_COLLECTIONS } from "../../services/leads/leadTypes";
import {
  buildBuyerLeadActiveSlotDocId,
  buildBuyerLeadActiveSlotDraft,
  resolveActiveSlotTransactionDecision,
  type BuyerLeadActiveSlotRecord,
} from "../../services/leads/buyerLeadIdempotencyModel";
import { isQueueLeadActive } from "../../services/leads/buyerLeadQueuePolicy";
import { computeNextQueuePosition } from "../../services/leads/buyerLeadQueuePolicy";
import { createFirestoreBuyerLeadRepository } from "./buyerLeadRepositoryFirestore";

export type BuyerLeadDataBackend = "memory" | "firestore";

export type AtomicBuyerLeadCreateResult =
  | { kind: "created"; lead: BuyerLead; contactLog: LeadContactLog }
  | { kind: "duplicate"; lead: BuyerLead }
  | { kind: "pilot_limit" };

export interface AtomicBuyerLeadCreateParams {
  /** Lead draft without final queuePosition (computed atomically). id/createdAt set by caller. */
  lead: BuyerLead;
  contactLog: LeadContactLog;
  contactFingerprint: string;
  /**
   * v22.53 — optional durable Pilot created-count limit (increments only on new create).
   * Duplicate replay must not increment.
   */
  pilotLimit?: {
    counterId: string;
    maxCreated: number;
  };
}

export interface BuyerLeadRepository {
  createBuyerLead(lead: BuyerLead): Promise<BuyerLead>;
  getBuyerLeadById(id: string): Promise<BuyerLead | null>;
  listBuyerLeadsByListingId(listingId: string): Promise<BuyerLead[]>;
  updateBuyerLead(lead: BuyerLead): Promise<BuyerLead>;
  appendContactLog(log: LeadContactLog): Promise<LeadContactLog>;
  /**
   * v22.52 — Atomic create with durable active-slot idempotency.
   * Same buyerUserId + listingId while active → returns existing Lead (no second write).
   */
  createBuyerLeadAtomic(
    params: AtomicBuyerLeadCreateParams
  ): Promise<AtomicBuyerLeadCreateResult>;
  /** Release active slot so a later legitimate inquiry is allowed. */
  releaseBuyerLeadActiveSlot(params: {
    listingId: string;
    buyerUserId: string;
  }): Promise<void>;
  /** v22.53 — read Pilot created-count counter (no PII). */
  getPilotCreatedCount(counterId: string): Promise<number>;
}

export function resolveBuyerLeadDataBackend(
  env: Partial<NodeJS.ProcessEnv> = process.env
): BuyerLeadDataBackend {
  const v = String(env.NONGA_LEAD_DATA_BACKEND ?? "memory").toLowerCase();
  return v === "firestore" ? "firestore" : "memory";
}

class InMemoryBuyerLeadRepository implements BuyerLeadRepository {
  private readonly leads = new Map<string, BuyerLead>();
  private readonly logs: LeadContactLog[] = [];
  private readonly activeSlots = new Map<string, BuyerLeadActiveSlotRecord>();
  private readonly pilotCounters = new Map<string, number>();

  async createBuyerLead(lead: BuyerLead): Promise<BuyerLead> {
    this.leads.set(lead.id, lead);
    return lead;
  }

  async getBuyerLeadById(id: string): Promise<BuyerLead | null> {
    return this.leads.get(id) ?? null;
  }

  async listBuyerLeadsByListingId(listingId: string): Promise<BuyerLead[]> {
    const id = listingId.trim();
    return [...this.leads.values()].filter((l) => l.listingId === id);
  }

  async updateBuyerLead(lead: BuyerLead): Promise<BuyerLead> {
    this.leads.set(lead.id, lead);
    return lead;
  }

  async appendContactLog(log: LeadContactLog): Promise<LeadContactLog> {
    this.logs.push(log);
    return log;
  }

  /** Test helper — count contact logs for a lead (memory only). */
  countContactLogsForLead(buyerLeadId: string): number {
    return this.logs.filter((l) => l.buyerLeadId === buyerLeadId.trim()).length;
  }

  /** Test-only: remove one lead from memory store. */
  deleteBuyerLeadByIdForControlledCleanup(leadId: string): boolean {
    return this.leads.delete(leadId.trim());
  }

  async getPilotCreatedCount(counterId: string): Promise<number> {
    return this.pilotCounters.get(counterId.trim()) ?? 0;
  }

  async createBuyerLeadAtomic(
    params: AtomicBuyerLeadCreateParams
  ): Promise<AtomicBuyerLeadCreateResult> {
    const listingId = params.lead.listingId.trim();
    const buyerUserId = params.lead.buyerUserId.trim();
    const slotId = buildBuyerLeadActiveSlotDocId(listingId, buyerUserId);
    const existingSlot = this.activeSlots.get(slotId);
    const decision = resolveActiveSlotTransactionDecision(existingSlot);

    if (decision.kind === "duplicate") {
      const existingLead = this.leads.get(decision.leadId);
      if (existingLead && isQueueLeadActive(existingLead)) {
        return { kind: "duplicate", lead: existingLead };
      }
      // Stale slot pointing at withdrawn/missing lead → fall through to create.
    }

    if (params.pilotLimit) {
      const current =
        this.pilotCounters.get(params.pilotLimit.counterId.trim()) ?? 0;
      if (current >= params.pilotLimit.maxCreated) {
        return { kind: "pilot_limit" };
      }
    }

    const existingLeads = [...this.leads.values()].filter(
      (l) => l.listingId === listingId
    );
    const queuePosition = computeNextQueuePosition(existingLeads, listingId);
    const lead: BuyerLead = { ...params.lead, queuePosition };
    const contactLog: LeadContactLog = {
      ...params.contactLog,
      buyerLeadId: lead.id,
      listingId: lead.listingId,
      sellerId: lead.sellerId,
    };

    const slot = buildBuyerLeadActiveSlotDraft({
      listingId,
      buyerUserId,
      contactFingerprint: params.contactFingerprint,
      leadId: lead.id,
      contactLogId: contactLog.id,
      createdAt: lead.createdAt,
      status: "active",
    });

    this.leads.set(lead.id, lead);
    this.logs.push(contactLog);
    this.activeSlots.set(slotId, slot);
    if (params.pilotLimit) {
      const id = params.pilotLimit.counterId.trim();
      this.pilotCounters.set(id, (this.pilotCounters.get(id) ?? 0) + 1);
    }
    return { kind: "created", lead, contactLog };
  }

  async releaseBuyerLeadActiveSlot(params: {
    listingId: string;
    buyerUserId: string;
  }): Promise<void> {
    const slotId = buildBuyerLeadActiveSlotDocId(
      params.listingId,
      params.buyerUserId
    );
    const existing = this.activeSlots.get(slotId);
    if (!existing) return;
    const now = new Date().toISOString();
    this.activeSlots.set(slotId, {
      ...existing,
      status: "released",
      updatedAt: now,
    });
  }
}

let singleton: BuyerLeadRepository | null = null;
let singletonBackend: BuyerLeadDataBackend | null = null;

export function createBuyerLeadRepository(
  backend: BuyerLeadDataBackend = resolveBuyerLeadDataBackend()
): BuyerLeadRepository {
  if (!singleton || singletonBackend !== backend) {
    singleton =
      backend === "firestore"
        ? createFirestoreBuyerLeadRepository()
        : new InMemoryBuyerLeadRepository();
    singletonBackend = backend;
  }
  return singleton;
}

/** Safe health/diagnostic value — never secrets. Reflects resolved backend selection. */
export function getActiveBuyerLeadDataBackend(): BuyerLeadDataBackend {
  if (singletonBackend) return singletonBackend;
  return resolveBuyerLeadDataBackend();
}

/** For tests — reset in-memory store (forces memory backend). */
export function resetBuyerLeadRepositoryForTests(): void {
  singleton = new InMemoryBuyerLeadRepository();
  singletonBackend = "memory";
}

/** For Emulator tests — inject a pre-built repository (e.g. Firestore Emulator). */
export function setBuyerLeadRepositoryForTests(
  repository: BuyerLeadRepository,
  backend: BuyerLeadDataBackend
): void {
  singleton = repository;
  singletonBackend = backend;
}

export function buyerLeadsCollectionName(): string {
  return LEAD_ENGINE_COLLECTIONS.buyerLeads;
}

/** Test helper — access memory contact-log count when backend is memory. */
export function getMemoryBuyerLeadContactLogCountForTests(
  buyerLeadId: string
): number | null {
  if (!(singleton instanceof InMemoryBuyerLeadRepository)) return null;
  return singleton.countContactLogsForLead(buyerLeadId);
}
