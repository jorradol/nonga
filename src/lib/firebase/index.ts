import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../../firebase-applet-config.json";
import {
  FIREBASE_AUTH_UNAVAILABLE_THAI,
  detectFirebaseClientConfig,
  reportFirebaseClientConfig,
  shouldAllowMockAuth,
  shouldAllowSandboxTools,
} from "./firebaseConfigGuard";

// Lazy / safe initialization of Firebase services to prevent startup crashes
let app;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

const firebaseClientConfigReport = detectFirebaseClientConfig(firebaseConfig);
reportFirebaseClientConfig(firebaseClientConfigReport);

const firebaseClientAuthMode = firebaseClientConfigReport.mode;
const isFirebaseAuthReady = firebaseClientConfigReport.isUsableForFirebaseAuth;
const isMockConfig = shouldAllowMockAuth(firebaseClientConfigReport);
const isMockAuthStorageEnabled = shouldAllowMockAuth(firebaseClientConfigReport);
const isSandboxAuthToolsEnabled = shouldAllowSandboxTools(firebaseClientConfigReport);
const firebaseAuthUnavailableMessage = FIREBASE_AUTH_UNAVAILABLE_THAI;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("⚠️ Firebase fell back to lazy initialization or mock states due to config issues:", error);
}

export {
  app,
  auth,
  db,
  firebaseAuthUnavailableMessage,
  firebaseClientAuthMode,
  firebaseClientConfigReport,
  isFirebaseAuthReady,
  isMockAuthStorageEnabled,
  isMockConfig,
  isSandboxAuthToolsEnabled,
};
