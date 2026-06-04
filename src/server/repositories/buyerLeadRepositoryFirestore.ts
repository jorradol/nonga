/**
 * v5.6F — Firestore buyer lead + contact log persistence (server Admin SDK only).
 * Enable with NONGA_LEAD_DATA_BACKEND=firestore. Does not change firestore.rules in v5.6F.
 */

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { BuyerLead, LeadContactLog } from "../../services/leads/leadTypes";
import { LEAD_ENGINE_COLLECTIONS } from "../../services/leads/leadTypes";
import { sanitizeFirestoreDocument } from "../firestoreDocumentSanitize";
import type { BuyerLeadRepository } from "./buyerLeadRepository";

interface FirestoreCollectionLike {
  doc(id?: string): {
    id: string;
    set(data: Record<string, unknown>, opts?: { merge?: boolean }): Promise<void>;
    get(): Promise<{ exists: boolean; id: string; data(): Record<string, unknown> | undefined }>;
  };
  where(
    field: string,
    op: "==",
    value: string
  ): {
    get(): Promise<{ docs: Array<{ id: string; data(): Record<string, unknown> }> }>;
  };
}

interface FirestoreDbLike {
  collection(name: string): FirestoreCollectionLike;
}

function initializeBuyerLeadAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NONGA_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim();
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      ...(projectId ? { projectId } : {}),
    });
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  }
  throw new Error("Firebase Admin credentials are required for NONGA_LEAD_DATA_BACKEND=firestore");
}

function toBuyerLead(doc: { id: string; data(): Record<string, unknown> | undefined }): BuyerLead {
  return { id: doc.id, ...(doc.data() as object) } as BuyerLead;
}

function toContactLog(doc: { id: string; data(): Record<string, unknown> | undefined }): LeadContactLog {
  return { id: doc.id, ...(doc.data() as object) } as LeadContactLog;
}

export class FirestoreBuyerLeadRepository implements BuyerLeadRepository {
  constructor(private readonly db: FirestoreDbLike) {}

  private leadsCol(): FirestoreCollectionLike {
    return this.db.collection(LEAD_ENGINE_COLLECTIONS.buyerLeads);
  }

  private logsCol(): FirestoreCollectionLike {
    return this.db.collection(LEAD_ENGINE_COLLECTIONS.leadContactLogs);
  }

  async createBuyerLead(lead: BuyerLead): Promise<BuyerLead> {
    const data = sanitizeFirestoreDocument(lead);
    await this.leadsCol().doc(lead.id).set(data as unknown as Record<string, unknown>);
    return lead;
  }

  async getBuyerLeadById(id: string): Promise<BuyerLead | null> {
    const snap = await this.leadsCol().doc(id.trim()).get();
    if (!snap.exists) return null;
    return toBuyerLead(snap);
  }

  async listBuyerLeadsByListingId(listingId: string): Promise<BuyerLead[]> {
    const snap = await this.leadsCol().where("listingId", "==", listingId.trim()).get();
    return snap.docs.map(toBuyerLead).sort((a, b) => a.queuePosition - b.queuePosition);
  }

  async updateBuyerLead(lead: BuyerLead): Promise<BuyerLead> {
    const data = sanitizeFirestoreDocument(lead);
    await this.leadsCol().doc(lead.id).set(data as unknown as Record<string, unknown>, { merge: true });
    return lead;
  }

  async appendContactLog(log: LeadContactLog): Promise<LeadContactLog> {
    const data = sanitizeFirestoreDocument(log);
    await this.logsCol().doc(log.id).set(data as unknown as Record<string, unknown>);
    return log;
  }
}

export function createFirestoreBuyerLeadRepository(): BuyerLeadRepository {
  const app = initializeBuyerLeadAdminApp();
  return new FirestoreBuyerLeadRepository(getFirestore(app) as unknown as FirestoreDbLike);
}
