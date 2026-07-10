/**
 * v5.6F / v22.49 — Firestore buyer lead + contact log persistence (server Admin SDK only).
 * Enable with NONGA_LEAD_DATA_BACKEND=firestore.
 * Emulator: set FIRESTORE_EMULATOR_HOST (no live credentials required).
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
    delete(): Promise<void>;
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

/** Live / production project ids that must never be used without Emulator host. */
const BLOCKED_LIVE_PROJECT_MARKERS = [
  "nonga-ce93c",
  "nonga-prod",
  "nonga-production",
] as const;

export function assertBuyerLeadFirestoreEmulatorIsolation(
  env: Partial<NodeJS.ProcessEnv> = process.env
): void {
  const host = String(env.FIRESTORE_EMULATOR_HOST ?? "").trim();
  if (!host) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is required for isolated buyer-lead Firestore tests"
    );
  }
  const project =
    env.FIREBASE_PROJECT_ID?.trim() ||
    env.NONGA_FIREBASE_PROJECT_ID?.trim() ||
    env.GOOGLE_CLOUD_PROJECT?.trim() ||
    env.GCLOUD_PROJECT?.trim() ||
    "";
  const lower = project.toLowerCase();
  for (const marker of BLOCKED_LIVE_PROJECT_MARKERS) {
    if (lower === marker || lower.includes(marker)) {
      throw new Error(
        "Refusing buyer-lead Firestore access: live project marker detected without isolation"
      );
    }
  }
  if (project && !/^demo[-_]/i.test(project) && env.NONGA_LEAD_ALLOW_NON_DEMO_EMULATOR !== "1") {
    throw new Error(
      "Refusing buyer-lead Firestore access: project must be demo-* for Emulator tests"
    );
  }
}

function initializeBuyerLeadAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST?.trim();
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NONGA_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    (emulatorHost ? "demo-nonga-v2249" : undefined);

  // Emulator path: no service-account secrets required; Admin SDK talks to local emulator.
  if (emulatorHost) {
    assertBuyerLeadFirestoreEmulatorIsolation();
    return initializeApp({ projectId: projectId || "demo-nonga-v2249" });
  }

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

  /**
   * Internal / Emulator / controlled-operator cleanup only.
   * Deletes exactly one Lead document by id. Does not cascade unrelated docs.
   * Gated by assertBuyerLeadTestCleanupAllowed().
   */
  async deleteBuyerLeadByIdForControlledCleanup(leadId: string): Promise<boolean> {
    assertBuyerLeadTestCleanupAllowed();
    const id = leadId.trim();
    if (!id) return false;
    const snap = await this.leadsCol().doc(id).get();
    if (!snap.exists) return false;
    await this.leadsCol().doc(id).delete();
    return true;
  }
}

/**
 * Cleanup gate: Emulator host, or explicit NONGA_LEAD_TEST_CLEANUP=1 (never default-on).
 * Production must not set the cleanup flag.
 */
export function assertBuyerLeadTestCleanupAllowed(
  env: Partial<NodeJS.ProcessEnv> = process.env
): void {
  const emulator = Boolean(env.FIRESTORE_EMULATOR_HOST?.trim());
  const explicit = env.NONGA_LEAD_TEST_CLEANUP === "1";
  if (!emulator && !explicit) {
    throw new Error(
      "Buyer-lead targeted cleanup is disabled (requires Emulator or NONGA_LEAD_TEST_CLEANUP=1)"
    );
  }
  if (emulator) {
    assertBuyerLeadFirestoreEmulatorIsolation(env);
  }
}

export function createFirestoreBuyerLeadRepository(): BuyerLeadRepository {
  const app = initializeBuyerLeadAdminApp();
  return new FirestoreBuyerLeadRepository(getFirestore(app) as unknown as FirestoreDbLike);
}

/** Test helper — inject Emulator Firestore without re-init races. */
export function createFirestoreBuyerLeadRepositoryFromDb(db: FirestoreDbLike): FirestoreBuyerLeadRepository {
  return new FirestoreBuyerLeadRepository(db);
}
