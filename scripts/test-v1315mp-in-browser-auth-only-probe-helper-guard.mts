/**
 * v13.15M-P in-browser Firebase auth-only probe helper guard validation
 * Prepare-only static/runtime guard checks. No deploy. No provider calls.
 *
 * npm run test:v13.15M-P
 */
import { readFileSync } from "node:fs";
import {
  evaluateOwnerFirebaseTokenHelperGate,
  OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV,
  OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
} from "../src/config/ownerFirebaseTokenHelperGate.ts";

const HELPER_COMPONENT_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function envReader(values: Record<string, string | undefined>) {
  return (key: string) => values[key];
}

const baseEnv = envReader({
  [OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV]: "true",
});

console.log("=== v13.15M-P In-browser Auth-only Probe Helper Guard Validation ===\n");

const prodDisabled = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "superadmin",
  status: "active",
  hostname: "www.nongbot.org",
  projectId: "nonga-prod",
  readEnv: baseEnv,
});
ok("probe helper disabled in production/non-staging", !prodDisabled.enabled);
ok("production block reason non-staging", prodDisabled.reason === "non-staging");

const stagingEnabled = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "admin",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: baseEnv,
});
ok("probe helper enabled on staging gate", stagingEnabled.enabled);

const signedOut = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: false,
  uid: "owner-uid-001",
  role: "admin",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: baseEnv,
});
ok("probe helper requires signed-in user", !signedOut.enabled);
ok("signed-in block reason", signedOut.reason === "not-signed-in");

const nonAdmin = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "member-uid-001",
  role: "member",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: baseEnv,
});
ok("probe helper requires owner/admin role", !nonAdmin.enabled);
ok("admin block reason", nonAdmin.reason === "not-admin");

const helperCode = readFileSync(HELPER_COMPONENT_PATH, "utf8");
const authOnlyProbeMatch = helperCode.match(
  /const handleRunAuthOnlyProbe = async \(\) => \{[\s\S]*?\n  \};/
);
const authOnlyProbeCode = authOnlyProbeMatch?.[0] ?? "";

ok(
  "probe helper exposes manual click probe button",
  /onClick=\{handleRunAuthOnlyProbe\}/.test(helperCode) &&
    /Run auth-only probe \(no Gemini\)/.test(helperCode)
);
ok(
  "probe helper uses canonical force-refresh auth helper path",
  /getFirebaseAuthHeaders\(\{\s*forceRefresh:\s*true\s*\}\)/.test(helperCode)
);
ok(
  "probe helper calls only runtime-proof auth-only route",
  /AUTH_ONLY_PROBE_ROUTE = "\/api\/admin\/sales-brain-runtime-proof-skeleton"/.test(
    helperCode
  ) && /fetch\(AUTH_ONLY_PROBE_ROUTE,/.test(authOnlyProbeCode)
);
ok(
  "auth-only probe path does not call Gemini UX routes",
  !/\/api\/ai\/chat-user-visible-orchestrate|\/api\/gemini\//.test(authOnlyProbeCode)
);
ok(
  "probe helper does not render token",
  !/\{token\}/.test(helperCode)
);
ok(
  "probe helper does not log token/header",
  !/console\.(log|debug|info|warn|error)\(/.test(helperCode)
);
ok(
  "probe helper does not print bearer literal",
  !/Bearer\s+/i.test(helperCode)
);
ok(
  "probe helper does not decode JWT payload",
  !/atob\(|split\(\s*["']\.[\"']\s*\)|jwt/i.test(helperCode)
);
ok(
  "auth-only probe path has no one-run/provider/lead path",
  !/one-run|oneRun|provider call|createLead|lead/i.test(authOnlyProbeCode)
);

console.log(`\nDone v13.15M-P guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
