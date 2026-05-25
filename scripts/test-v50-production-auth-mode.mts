import fs from "fs";
import path from "path";
import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };
import {
  detectFirebaseClientConfig,
  firebaseAuthEnvironment,
  shouldAllowMockAuth,
  shouldAllowSandboxTools,
} from "../src/lib/firebase/firebaseConfigGuard.ts";
import {
  resolveClientAdminToken,
  resolveClientDealerToken,
} from "../src/utils/apiAuthHeaders.ts";
import { getStubTokensForDev } from "../src/server/apiAuth.ts";
import { isDealerDemoToolsEnabled } from "../src/utils/dealerDemoSession.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

console.log("=== Nong A v5.0 Production Auth Mode Smoke ===");

const prodReport = detectFirebaseClientConfig(firebaseConfig, {
  dev: false,
  prod: true,
  betaToken: false,
});
const prodEnv = firebaseAuthEnvironment(prodReport, { dev: false, prod: true });
assert(
  prodReport.mode === "invalid-production-config",
  "production + fake Firebase config must be invalid-production-config"
);
assert(prodEnv.isProduction, "prod environment flag should be true");
assert(
  prodEnv.isInvalidProductionConfig,
  "invalid production config flag should be true"
);
assert(!shouldAllowMockAuth(prodReport), "production fake config must not allow mock auth");
assert(
  !shouldAllowSandboxTools(prodReport),
  "production fake config must not allow sandbox tools"
);
console.log("PASS production fake config is invalid and blocks mock/sandbox");

assert(
  resolveClientDealerToken({ DEV: false, PROD: true }) === "",
  "client dealer helper must not use default dev token in production"
);
assert(
  resolveClientAdminToken({ DEV: false, PROD: true }) === "",
  "client admin helper must not use default dev token in production"
);
assert(
  resolveClientDealerToken({
    DEV: false,
    PROD: true,
    VITE_NONGA_DEALER_API_TOKEN: "real-beta-token",
  }) === "real-beta-token",
  "production/beta client helper should use explicit dealer env token"
);
console.log("PASS client token helper blocks defaults but accepts explicit env");

const originalNodeEnv = process.env.NODE_ENV;
const originalDealerToken = process.env.NONGA_DEALER_API_TOKEN;
const originalAdminToken = process.env.NONGA_ADMIN_API_TOKEN;
process.env.NODE_ENV = "production";
delete process.env.NONGA_DEALER_API_TOKEN;
delete process.env.NONGA_ADMIN_API_TOKEN;
const prodStubTokens = getStubTokensForDev();
assert(
  prodStubTokens.dealerToken === "" && prodStubTokens.adminToken === "",
  "server getStubTokensForDev must not return hardcoded defaults in production"
);
process.env.NONGA_DEALER_API_TOKEN = "configured-dealer-token";
process.env.NONGA_ADMIN_API_TOKEN = "configured-admin-token";
const configuredProdTokens = getStubTokensForDev();
assert(
  configuredProdTokens.dealerToken === "configured-dealer-token" &&
    configuredProdTokens.adminToken === "configured-admin-token",
  "server helper should use explicit production env tokens"
);
process.env.NODE_ENV = originalNodeEnv;
if (originalDealerToken === undefined) {
  delete process.env.NONGA_DEALER_API_TOKEN;
} else {
  process.env.NONGA_DEALER_API_TOKEN = originalDealerToken;
}
if (originalAdminToken === undefined) {
  delete process.env.NONGA_ADMIN_API_TOKEN;
} else {
  process.env.NONGA_ADMIN_API_TOKEN = originalAdminToken;
}
console.log("PASS server stub token helper blocks production defaults");

const betaReport = detectFirebaseClientConfig(firebaseConfig, {
  dev: false,
  prod: false,
  betaToken: true,
});
const noBetaReport = detectFirebaseClientConfig(firebaseConfig, {
  dev: false,
  prod: false,
  betaToken: false,
});
assert(betaReport.mode === "beta-token", "beta mode must require explicit beta token flag");
assert(noBetaReport.mode !== "beta-token", "missing beta env must not become beta mode");
console.log("PASS beta mode requires explicit env signal");

assert(isDealerDemoToolsEnabled(), "local dev/mock should still allow Thor Auto Demo tools");
console.log("PASS local dev/mock still supports Thor Auto Demo");

const profileView = read("src/components/UserProfileView.tsx");
assert(
  profileView.includes("{demoToolsEnabled && (") &&
    profileView.includes("if (!demoToolsEnabled)") &&
    profileView.includes("handleDemoDealerLogin"),
  "UserProfileView must guard sandbox UI and handlers with demoToolsEnabled"
);
assert(
  profileView.includes("onClick={() => handleSandboxRoleChange(\"dealer\")}") &&
    profileView.includes("{demoToolsEnabled &&"),
  "dealer panel sandbox upgrade button must be hidden behind demoToolsEnabled"
);
console.log("PASS sandbox role switcher is hidden and handler-guarded");
