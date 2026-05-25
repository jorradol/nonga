import fs from "fs";
import path from "path";
import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };
import {
  detectFirebaseClientConfig,
  shouldAllowMockAuth,
  shouldAllowSandboxTools,
} from "../src/lib/firebase/firebaseConfigGuard.ts";
import {
  getCurrentUserIdToken,
  getFirebaseAuthHeaders,
} from "../src/services/auth/firebaseAuthHeaders.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

console.log("=== Nong A v5.0 Firebase Config Smoke ===");

const devReport = detectFirebaseClientConfig(firebaseConfig, {
  dev: true,
  prod: false,
  betaToken: false,
});
assert(devReport.hasFakePlaceholder, "fake placeholder should be detected");
assert(devReport.mode === "dev-mock", "fake config should be dev-mock in dev");
assert(shouldAllowMockAuth(devReport), "dev mock should allow mock auth");
console.log("PASS fake config detected and allowed in dev/mock mode");

const prodReport = detectFirebaseClientConfig(firebaseConfig, {
  dev: false,
  prod: true,
  betaToken: false,
});
assert(
  prodReport.mode === "invalid-production-config",
  "fake config must be invalid in production"
);
assert(!prodReport.isProductionSafe, "fake production config must be unsafe");
assert(!shouldAllowMockAuth(prodReport), "production fake config must not allow mock auth");
assert(
  !shouldAllowSandboxTools(prodReport),
  "production fake config must not allow sandbox tools"
);
console.log("PASS production fake config blocked by report");

const realReport = detectFirebaseClientConfig(
  {
    apiKey: "AIzaSyRealExampleKey",
    authDomain: "nonga.example.firebaseapp.com",
    projectId: "nonga-prod",
    storageBucket: "nonga-prod.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef",
  },
  { dev: false, prod: true, betaToken: false }
);
assert(realReport.mode === "firebase-auth", "real config should use firebase-auth");
assert(realReport.isProductionSafe, "real config should be production safe");
console.log("PASS real config resolves firebase-auth mode");

const token = await getCurrentUserIdToken();
assert(token === null, "auth helper should not mint a token in fake config");
const headers = await getFirebaseAuthHeaders();
assert(
  !("Authorization" in headers),
  "auth helper must not send fake Authorization headers"
);
console.log("PASS auth header helper does not send fake token");

const dealerDemoSession = read("src/utils/dealerDemoSession.ts");
assert(
  dealerDemoSession.includes("if (env?.PROD) return false"),
  "dealer demo tools must be production-disabled"
);
assert(
  dealerDemoSession.includes("isSandboxAuthToolsEnabled"),
  "dealer demo tools should use central sandbox guard"
);
console.log("PASS sandbox role switcher marked dev-only");
