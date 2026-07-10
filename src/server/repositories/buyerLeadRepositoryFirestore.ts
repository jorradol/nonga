/**
 * v5.6F / v22.49 / v22.52 — Firestore buyer lead + contact log persistence (server Admin SDK only).
 * Enable with NONGA_LEAD_DATA_BACKEND=firestore.
 * Emulator: set FIRESTORE_EMULATOR_HOST (no live credentials required).
 *
 * v22.52 — createBuyerLeadAtomic uses a Firestore transaction + durable active-slot
 * doc so concurrent / multi-instance identical creates yield one Lead.
 */

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import {
  getFirestore,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import type { BuyerLead, LeadContactLog } from "../../services/leads/leadTypes";
import { LEAD_ENGINE_COLLECTIONS } from "../../services/leads/leadTypes";
import {
  assertNoBuyerPiiInActiveSlotRecord,
  buildBuyerLeadActiveSlotDocId,
  buildBuyerLeadActiveSlotDraft,
  resolveActiveSlotTransactionDecision,
  type BuyerLeadActiveSlotRecord,
} from "../../services/leads/buyerLeadIdempotencyModel";
import { computeNextQueuePosition } from "../../services/leads/buyerLeadQueuePolicy";
import { isQueueLeadActive } from "../../services/leads/buyerLeadQueuePolicy";
import { sanitizeFirestoreDocument } from "../firestoreDocumentSanitize";
import type {
  AtomicBuyerLeadCreateParams,
  AtomicBuyerLeadCreateResult,
  BuyerLeadRepository,
} from "./buyerLeadRepository";

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

function asFirestore(db: FirestoreDbLike): Firestore {
  return db as unknown as Firestore;
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
   * v22.52 / v22.53 — Atomic Lead + consent contact-log + active-slot create.
   * Concurrent identical intents (multi-instance safe) produce one Lead.
   * Optional Pilot counter increments only on new create (not duplicate).
   * Fail closed: transaction abort does not report success / partial writes.
   */
  async createBuyerLeadAtomic(
    params: AtomicBuyerLeadCreateParams
  ): Promise<AtomicBuyerLeadCreateResult> {
    const firestore = asFirestore(this.db);
    const listingId = params.lead.listingId.trim();
    const buyerUserId = params.lead.buyerUserId.trim();
    const slotId = buildBuyerLeadActiveSlotDocId(listingId, buyerUserId);
    const slotRef = firestore
      .collection(LEAD_ENGINE_COLLECTIONS.buyerLeadIdempotencyRecords)
      .doc(slotId) as DocumentReference;
    const leadsCol = firestore.collection(LEAD_ENGINE_COLLECTIONS.buyerLeads);
    const logsCol = firestore.collection(LEAD_ENGINE_COLLECTIONS.leadContactLogs);
    const counterRef = params.pilotLimit
      ? (firestore
          .collection(LEAD_ENGINE_COLLECTIONS.buyerLeadPilotCounters)
          .doc(params.pilotLimit.counterId.trim()) as DocumentReference)
      : null;

    return firestore.runTransaction(async (tx) => {
      const slotSnap = await tx.get(slotRef);
      const existingSlot = slotSnap.exists
        ? (slotSnap.data() as BuyerLeadActiveSlotRecord)
        : null;
      const decision = resolveActiveSlotTransactionDecision(existingSlot);

      if (decision.kind === "duplicate") {
        const leadRef = leadsCol.doc(decision.leadId);
        const leadSnap = await tx.get(leadRef);
        if (leadSnap.exists) {
          const lead = toBuyerLead(leadSnap);
          if (isQueueLeadActive(lead)) {
            return { kind: "duplicate" as const, lead };
          }
        }
        // Stale active slot → fall through and reuse slot for a new Lead.
      }

      let nextPilotCount: number | null = null;
      if (counterRef && params.pilotLimit) {
        const counterSnap = await tx.get(counterRef);
        const current = counterSnap.exists
          ? Number((counterSnap.data() as { createdCount?: unknown }).createdCount ?? 0)
          : 0;
        const safeCurrent = Number.isFinite(current) && current >= 0 ? current : 0;
        if (safeCurrent >= params.pilotLimit.maxCreated) {
          return { kind: "pilot_limit" as const };
        }
        nextPilotCount = safeCurrent + 1;
      }

      // Queue position from current listing leads (transactional read).
      const listingQuery = leadsCol.where("listingId", "==", listingId);
      const listingSnap = await tx.get(listingQuery);
      const existingLeads = listingSnap.docs.map((d) => toBuyerLead(d));
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

      if (
        !assertNoBuyerPiiInActiveSlotRecord(
          slot as unknown as Record<string, unknown>
        )
      ) {
        throw new Error("active-slot draft contains disallowed PII");
      }

      const leadData = sanitizeFirestoreDocument(
        lead as unknown as Record<string, unknown>
      );
      const logData = sanitizeFirestoreDocument(
        contactLog as unknown as Record<string, unknown>
      );
      const slotData = sanitizeFirestoreDocument(
        slot as unknown as Record<string, unknown>
      );

      tx.set(leadsCol.doc(lead.id), leadData);
      tx.set(logsCol.doc(contactLog.id), logData);
      tx.set(slotRef, slotData);
      if (counterRef && nextPilotCount != null) {
        tx.set(
          counterRef,
          sanitizeFirestoreDocument({
            id: params.pilotLimit!.counterId.trim(),
            createdCount: nextPilotCount,
            maxCreated: params.pilotLimit!.maxCreated,
            updatedAt: lead.createdAt,
          }),
          { merge: true }
        );
      }

      return { kind: "created" as const, lead, contactLog };
    });
  }

  async getPilotCreatedCount(counterId: string): Promise<number> {
    const firestore = asFirestore(this.db);
    const snap = await firestore
      .collection(LEAD_ENGINE_COLLECTIONS.buyerLeadPilotCounters)
      .doc(counterId.trim())
      .get();
    if (!snap.exists) return 0;
    const n = Number((snap.data() as { createdCount?: unknown }).createdCount ?? 0);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  async releaseBuyerLeadActiveSlot(params: {
    listingId: string;
    buyerUserId: string;
  }): Promise<void> {
    const firestore = asFirestore(this.db);
    const slotId = buildBuyerLeadActiveSlotDocId(
      params.listingId,
      params.buyerUserId
    );
    const slotRef = firestore
      .collection(LEAD_ENGINE_COLLECTIONS.buyerLeadIdempotencyRecords)
      .doc(slotId);
    const snap = await slotRef.get();
    if (!snap.exists) return;
    const now = new Date().toISOString();
    await slotRef.set(
      sanitizeFirestoreDocument({
        ...(snap.data() as Record<string, unknown>),
        status: "released",
        updatedAt: now,
      }),
      { merge: true }
    );
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

  /**
   * Emulator / controlled cleanup: delete active-slot + contact logs for one Lead.
   * Does not scan unrelated collections beyond listingId/buyerLeadId equality.
   */
  async deleteBuyerLeadFixturesForControlledCleanup(params: {
    leadId: string;
    listingId: string;
    buyerUserId: string;
  }): Promise<{ leadDeleted: boolean; logsDeleted: number; slotReleased: boolean }> {
    assertBuyerLeadTestCleanupAllowed();
    const leadDeleted = await this.deleteBuyerLeadByIdForControlledCleanup(
      params.leadId
    );
    const firestore = asFirestore(this.db);
    const logsSnap = await firestore
      .collection(LEAD_ENGINE_COLLECTIONS.leadContactLogs)
      .where("buyerLeadId", "==", params.leadId.trim())
      .get();
    let logsDeleted = 0;
    for (const doc of logsSnap.docs) {
      await doc.ref.delete();
      logsDeleted += 1;
    }
    const slotId = buildBuyerLeadActiveSlotDocId(
      params.listingId,
      params.buyerUserId
    );
    const slotRef = firestore
      .collection(LEAD_ENGINE_COLLECTIONS.buyerLeadIdempotencyRecords)
      .doc(slotId);
    const slotSnap = await slotRef.get();
    let slotReleased = false;
    if (slotSnap.exists) {
      await slotRef.delete();
      slotReleased = true;
    }
    return { leadDeleted, logsDeleted, slotReleased };
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
