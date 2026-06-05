/**
 * v5.6I.5 — Firestore success fee record repository (readiness; writes gated).
 */

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { SuccessFeeRecord } from "../../services/leads/leadTypes";
import { SETTLEMENT_COLLECTIONS } from "../../services/leads/settlementPersistenceModel";
import {
  isSettlementFirestoreWritesEnabled,
} from "../../services/leads/settlementPersistenceFlags";
import { sanitizeFirestoreDocument } from "../firestoreDocumentSanitize";
import type { SuccessFeeRecordRepository } from "./successFeeRecordRepository";

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

export function createFirestoreSuccessFeeRecordRepository(): SuccessFeeRecordRepository {
  const app = initializeSettlementAdminApp();
  const db = getFirestore(app);
  const collection = SETTLEMENT_COLLECTIONS.successFeeRecords;

  return {
    async getById(id: string): Promise<SuccessFeeRecord | null> {
      const snap = await db.collection(collection).doc(id.trim()).get();
      if (!snap.exists) return null;
      return snap.data() as SuccessFeeRecord;
    },

    async getByListingId(listingId: string): Promise<SuccessFeeRecord | null> {
      const q = await db
        .collection(collection)
        .where("listingId", "==", listingId.trim())
        .limit(1)
        .get();
      if (q.empty) return null;
      return q.docs[0]!.data() as SuccessFeeRecord;
    },

    async listAll(): Promise<SuccessFeeRecord[]> {
      const q = await db.collection(collection).get();
      return q.docs.map((d) => d.data() as SuccessFeeRecord);
    },

    async upsert(record: SuccessFeeRecord): Promise<SuccessFeeRecord> {
      assertWritesAllowed();
      const data = sanitizeFirestoreDocument(record as unknown as Record<string, unknown>);
      await db.collection(collection).doc(record.id).set(data, { merge: true });
      return record;
    },
  };
}
