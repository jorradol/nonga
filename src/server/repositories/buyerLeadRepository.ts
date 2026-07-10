/**
 * v5.6C / v5.6F / v22.49 — Buyer lead repository factory (memory default; optional Firestore).
 */

import type { BuyerLead, LeadContactLog } from "../../services/leads/leadTypes";
import { LEAD_ENGINE_COLLECTIONS } from "../../services/leads/leadTypes";
import { createFirestoreBuyerLeadRepository } from "./buyerLeadRepositoryFirestore";

export type BuyerLeadDataBackend = "memory" | "firestore";

export interface BuyerLeadRepository {
  createBuyerLead(lead: BuyerLead): Promise<BuyerLead>;
  getBuyerLeadById(id: string): Promise<BuyerLead | null>;
  listBuyerLeadsByListingId(listingId: string): Promise<BuyerLead[]>;
  updateBuyerLead(lead: BuyerLead): Promise<BuyerLead>;
  appendContactLog(log: LeadContactLog): Promise<LeadContactLog>;
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

  /** Test-only: remove one lead from memory store. */
  deleteBuyerLeadByIdForControlledCleanup(leadId: string): boolean {
    return this.leads.delete(leadId.trim());
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
