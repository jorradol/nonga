/**
 * v5.6C — In-memory buyer lead repository (staging-safe MVP, no Firestore rules change).
 */

import type { BuyerLead, LeadContactLog } from "../../services/leads/leadTypes";
import { LEAD_ENGINE_COLLECTIONS } from "../../services/leads/leadTypes";

export interface BuyerLeadRepository {
  createBuyerLead(lead: BuyerLead): Promise<BuyerLead>;
  getBuyerLeadById(id: string): Promise<BuyerLead | null>;
  listBuyerLeadsByListingId(listingId: string): Promise<BuyerLead[]>;
  updateBuyerLead(lead: BuyerLead): Promise<BuyerLead>;
  appendContactLog(log: LeadContactLog): Promise<LeadContactLog>;
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
}

let singleton: BuyerLeadRepository | null = null;

export function createBuyerLeadRepository(): BuyerLeadRepository {
  if (!singleton) {
    singleton = new InMemoryBuyerLeadRepository();
  }
  return singleton;
}

/** For tests — reset store between runs. */
export function resetBuyerLeadRepositoryForTests(): void {
  singleton = new InMemoryBuyerLeadRepository();
}

export function buyerLeadsCollectionName(): string {
  return LEAD_ENGINE_COLLECTIONS.buyerLeads;
}
