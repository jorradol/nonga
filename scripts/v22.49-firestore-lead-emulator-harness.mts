/**
 * v22.49 — Isolated Firestore Emulator harness for existing buyer-lead repository.
 * Never connects to live Staging/Production. Requires FIRESTORE_EMULATOR_HOST + demo project.
 */
import { getApps, deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  assertBuyerLeadFirestoreEmulatorIsolation,
  createFirestoreBuyerLeadRepositoryFromDb,
  type FirestoreBuyerLeadRepository,
} from "../src/server/repositories/buyerLeadRepositoryFirestore.ts";
import { setBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";

const DEMO_PROJECT = "demo-nonga-v2249";

export function assertNoLiveFirestoreProject(): void {
  assertBuyerLeadFirestoreEmulatorIsolation(process.env);
  const host = String(process.env.FIRESTORE_EMULATOR_HOST ?? "").trim();
  if (!host) {
    throw new Error("FIRESTORE_EMULATOR_HOST missing — refusing to continue");
  }
  const blob = [
    process.env.FIREBASE_PROJECT_ID,
    process.env.GOOGLE_CLOUD_PROJECT,
    process.env.GCLOUD_PROJECT,
    process.env.NONGA_FIREBASE_PROJECT_ID,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (blob.includes("nonga-ce93c") || blob.includes("nonga-prod")) {
    throw new Error("Live project marker in env — abort");
  }
}

function prepareEmulatorEnv(): void {
  process.env.FIREBASE_PROJECT_ID = DEMO_PROJECT;
  process.env.GCLOUD_PROJECT = DEMO_PROJECT;
  process.env.GOOGLE_CLOUD_PROJECT = DEMO_PROJECT;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  delete process.env.FIREBASE_CLIENT_EMAIL;
  delete process.env.FIREBASE_PRIVATE_KEY;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

export async function createIsolatedEmulatorLeadRepository(): Promise<{
  repository: FirestoreBuyerLeadRepository;
  app: App;
  dispose: () => Promise<void>;
}> {
  assertNoLiveFirestoreProject();
  prepareEmulatorEnv();

  const app = initializeApp({ projectId: DEMO_PROJECT }, `v2249-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const db = getFirestore(app);
  const repository = createFirestoreBuyerLeadRepositoryFromDb(db as never);
  setBuyerLeadRepositoryForTests(repository, "firestore");

  return {
    repository,
    app,
    dispose: async () => {
      try {
        await deleteApp(app);
      } catch {
        /* ignore */
      }
    },
  };
}

/** Optional full wipe of Admin apps at end of suite. */
export async function disposeAllAdminApps(): Promise<void> {
  for (const app of getApps()) {
    try {
      await deleteApp(app);
    } catch {
      /* ignore */
    }
  }
}
