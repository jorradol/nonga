import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../../firebase-applet-config.json";

// Lazy / safe initialization of Firebase services to prevent startup crashes
let app;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

const isMockConfig = firebaseConfig.apiKey.includes("FakePlaceholder");

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("⚠️ Firebase fell back to lazy initialization or mock states due to config issues:", error);
}

export { app, auth, db, isMockConfig };
