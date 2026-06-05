/**
 * v5.6I.5 — Firestore settlement adjustment + audit repository (readiness; writes gated).
 */

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type {
  SettlementAdjustmentAuditEntry,
  SettlementAdjustmentState,
} from "../../services/leads/leadTypes";
import { SETTLEMENT_COLLECTIONS } from "../../services/leads/settlementPersistenceModel";
import { isSettlementFirestoreWritesEnabled } from "../../services/leads/settlementPersistenceFlags";
import { sanitizeFirestoreDocument } from "../firestoreDocumentSanitize";
import type { SettlementAdjustmentRepository } from "./settlementAdjustmentRepository";

function initializeSettlementAdminApp() {
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
  throw new Error(
    "Firebase Admin credentials are required for NONGA_SETTLEMENT_DATA_BACKEND=firestore"
  );
}

function assertWritesAllowed(): void {
  if (!isSettlementFirestoreWritesEnabled()) {
    throw new Error(
      "Settlement Firestore writes are disabled (NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED!=true)"
    );
  }
}

export function createFirestoreSettlementAdjustmentRepository(): SettlementAdjustmentRepository {
  const app = initializeSettlementAdminApp();
  const db = getFirestore(app);
  const statesCollection = SETTLEMENT_COLLECTIONS.settlementAdjustments;
  const auditsCollection = SETTLEMENT_COLLECTIONS.settlementAuditLogs;

  return {
    async getStateByListingId(
      listingId: string
    ): Promise<SettlementAdjustmentState | null> {
      const q = await db
        .collection(statesCollection)
        .where("listingId", "==", listingId.trim())
        .limit(1)
        .get();
      if (q.empty) return null;
      return q.docs[0]!.data() as SettlementAdjustmentState;
    },

    async listAllStates(): Promise<SettlementAdjustmentState[]> {
      const q = await db.collection(statesCollection).get();
      return q.docs.map((d) => d.data() as SettlementAdjustmentState);
    },

    async upsertState(
      state: SettlementAdjustmentState
    ): Promise<SettlementAdjustmentState> {
      assertWritesAllowed();
      const docId = state.settlementId || state.listingId;
      const data = sanitizeFirestoreDocument(state as unknown as Record<string, unknown>);
      await db.collection(statesCollection).doc(docId).set(data, { merge: true });
      return state;
    },

    async appendAudit(
      entry: SettlementAdjustmentAuditEntry
    ): Promise<SettlementAdjustmentAuditEntry> {
      assertWritesAllowed();
      const data = sanitizeFirestoreDocument(entry as unknown as Record<string, unknown>);
      await db.collection(auditsCollection).doc(entry.id).set(data);
      return entry;
    },

    async listAuditByListingId(
      listingId: string
    ): Promise<SettlementAdjustmentAuditEntry[]> {
      const q = await db
        .collection(auditsCollection)
        .where("listingId", "==", listingId.trim())
        .get();
      return q.docs.map((d) => d.data() as SettlementAdjustmentAuditEntry);
    },
  };
}
