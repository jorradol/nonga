/**
 * v5.6F — Buyer purchase profile repository (memory default; optional Firestore).
 */

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { BuyerPurchaseProfile } from "../../services/leads/buyerPurchaseProfile";
import { LEAD_ENGINE_COLLECTIONS } from "../../services/leads/leadTypes";
import { sanitizeFirestoreDocument } from "../firestoreDocumentSanitize";

export type BuyerPurchaseProfileDataBackend = "memory" | "firestore";

export interface BuyerPurchaseProfileRepository {
  get(buyerUserId: string): Promise<BuyerPurchaseProfile | null>;
  save(buyerUserId: string, profile: BuyerPurchaseProfile): Promise<BuyerPurchaseProfile>;
  deleteForTest?(buyerUserId: string): Promise<void>;
  clearForTest?(): Promise<void>;
}

export function resolveBuyerPurchaseProfileDataBackend(
  env: Partial<NodeJS.ProcessEnv> = process.env
): BuyerPurchaseProfileDataBackend {
  const v = String(env.NONGA_LEAD_DATA_BACKEND ?? "memory").toLowerCase();
  return v === "firestore" ? "firestore" : "memory";
}

export class InMemoryBuyerPurchaseProfileRepository implements BuyerPurchaseProfileRepository {
  private readonly profiles = new Map<string, BuyerPurchaseProfile>();

  getSync(buyerUserId: string): BuyerPurchaseProfile | null {
    return this.profiles.get(buyerUserId.trim()) ?? null;
  }

  saveSync(buyerUserId: string, profile: BuyerPurchaseProfile): BuyerPurchaseProfile {
    this.profiles.set(buyerUserId.trim(), profile);
    return profile;
  }

  async get(buyerUserId: string): Promise<BuyerPurchaseProfile | null> {
    return this.getSync(buyerUserId);
  }

  async save(buyerUserId: string, profile: BuyerPurchaseProfile): Promise<BuyerPurchaseProfile> {
    return this.saveSync(buyerUserId, profile);
  }

  async deleteForTest(buyerUserId: string): Promise<void> {
    this.profiles.delete(buyerUserId.trim());
  }

  async clearForTest(): Promise<void> {
    this.profiles.clear();
  }
}

interface FirestoreDocLike {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(data: Record<string, unknown>, opts?: { merge?: boolean }): Promise<void>;
  delete(): Promise<void>;
}

interface FirestoreDbLike {
  collection(name: string): { doc(id: string): FirestoreDocLike };
}

class FirestoreBuyerPurchaseProfileRepository implements BuyerPurchaseProfileRepository {
  constructor(private readonly db: FirestoreDbLike) {}

  private docRef(buyerUserId: string): FirestoreDocLike {
    return this.db.collection(LEAD_ENGINE_COLLECTIONS.buyerPurchaseProfiles).doc(buyerUserId.trim());
  }

  async get(buyerUserId: string): Promise<BuyerPurchaseProfile | null> {
    const snap = await this.docRef(buyerUserId).get();
    if (!snap.exists) return null;
    return snap.data() as unknown as BuyerPurchaseProfile;
  }

  async save(buyerUserId: string, profile: BuyerPurchaseProfile): Promise<BuyerPurchaseProfile> {
    const data = sanitizeFirestoreDocument({ ...profile, buyerUserId: buyerUserId.trim() });
    await this.docRef(buyerUserId).set(data as unknown as Record<string, unknown>, { merge: true });
    return profile;
  }
}

function initializeProfileAdminApp() {
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
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
    });
  }
  throw new Error("Firebase Admin credentials are required for profile Firestore backend");
}

let profileSingleton: BuyerPurchaseProfileRepository | null = null;
let profileSingletonBackend: BuyerPurchaseProfileDataBackend | null = null;

export function createBuyerPurchaseProfileRepository(
  backend: BuyerPurchaseProfileDataBackend = resolveBuyerPurchaseProfileDataBackend()
): BuyerPurchaseProfileRepository {
  if (!profileSingleton || profileSingletonBackend !== backend) {
    profileSingleton =
      backend === "firestore"
        ? new FirestoreBuyerPurchaseProfileRepository(
            getFirestore(initializeProfileAdminApp()) as unknown as FirestoreDbLike
          )
        : new InMemoryBuyerPurchaseProfileRepository();
    profileSingletonBackend = backend;
  }
  return profileSingleton;
}

export function resetBuyerPurchaseProfileRepositoryForTests(): void {
  profileSingleton = new InMemoryBuyerPurchaseProfileRepository();
  profileSingletonBackend = "memory";
}
