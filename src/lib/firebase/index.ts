import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../../firebase-applet-config.json";
import { isUiFixtureBuild } from "../../fixture/uiFixtureMode";
import {
  FIREBASE_AUTH_UNAVAILABLE_THAI,
  detectFirebaseClientConfig,
  firebaseAuthEnvironment,
  reportFirebaseClientConfig,
  resolveFirebaseClientConfig,
  shouldAllowMockAuth,
  shouldAllowSandboxTools,
} from "./firebaseConfigGuard";

// Lazy / safe initialization of Firebase services to prevent startup crashes
let app;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

const emptyFixtureFirebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

const firebaseClientConfig = isUiFixtureBuild
  ? emptyFixtureFirebaseConfig
  : resolveFirebaseClientConfig(firebaseConfig);
const firebaseClientConfigReport = detectFirebaseClientConfig(firebaseClientConfig);
if (!isUiFixtureBuild) {
  reportFirebaseClientConfig(firebaseClientConfigReport);
}

const firebaseClientAuthMode = isUiFixtureBuild
  ? ("invalid-production-config" as const)
  : firebaseClientConfigReport.mode;
const firebaseClientAuthEnvironment = isUiFixtureBuild
  ? {
      isLocalDev: false,
      isProduction: true,
      isBetaMode: false,
      isFirebaseAuthMode: false,
      isInvalidProductionConfig: true,
    }
  : firebaseAuthEnvironment(firebaseClientConfigReport);
const isFirebaseAuthReady = isUiFixtureBuild
  ? false
  : firebaseClientConfigReport.isUsableForFirebaseAuth;
const isMockConfig = isUiFixtureBuild
  ? false
  : shouldAllowMockAuth(firebaseClientConfigReport);
const isMockAuthStorageEnabled = isUiFixtureBuild
  ? false
  : shouldAllowMockAuth(firebaseClientConfigReport);
const isSandboxAuthToolsEnabled = isUiFixtureBuild
  ? false
  : shouldAllowSandboxTools(firebaseClientConfigReport);
const firebaseAuthUnavailableMessage = isUiFixtureBuild
  ? "ปิดในโหมดตรวจสอบหน้าจอ"
  : FIREBASE_AUTH_UNAVAILABLE_THAI;

if (!isUiFixtureBuild) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseClientConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn("⚠️ Firebase fell back to lazy initialization or mock states due to config issues:", error);
  }
}

export {
  app,
  auth,
  db,
  firebaseAuthUnavailableMessage,
  firebaseClientConfig,
  firebaseClientAuthEnvironment,
  firebaseClientAuthMode,
  firebaseClientConfigReport,
  isFirebaseAuthReady,
  isMockAuthStorageEnabled,
  isMockConfig,
  isSandboxAuthToolsEnabled,
};
