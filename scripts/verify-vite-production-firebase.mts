import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };
import {
  detectFirebaseClientConfig,
  resolveFirebaseClientConfig,
  type FirebaseWebConfigEnv,
} from "../src/lib/firebase/firebaseConfigGuard.ts";

const viteEnv: FirebaseWebConfigEnv = {
  VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_MEASUREMENT_ID: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  VITE_FIREBASE_FIRESTORE_DATABASE_ID: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};

const resolved = resolveFirebaseClientConfig(firebaseConfig, viteEnv);
const report = detectFirebaseClientConfig(resolved, {
  dev: false,
  prod: true,
  betaToken: Boolean(
    process.env.VITE_NONGA_DEALER_API_TOKEN || process.env.VITE_NONGA_ADMIN_API_TOKEN
  ),
});

if (report.mode !== "firebase-auth") {
  console.error(
    `[vite-firebase-guard] blocked production build: mode=${report.mode}; ${report.warnings.join("; ")}`
  );
  process.exit(1);
}

console.log("[vite-firebase-guard] PASS production Firebase web config");
