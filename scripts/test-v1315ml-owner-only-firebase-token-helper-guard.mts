/**
 * v13.15M-L owner-only Firebase token helper guard validation
 * Prepare-only static/runtime guard checks. No deploy. No provider calls.
 *
 * npm run test:v13.15M-L
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

console.log("=== v13.15M-L Owner-only Firebase Helper Guard Validation ===\n");

const prodDisabled = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "superadmin",
  status: "active",
  hostname: "www.nongbot.org",
  projectId: "nonga-prod",
  readEnv: baseEnv,
});
ok("helper disabled in production/non-staging", !prodDisabled.enabled);
ok("helper production block reason non-staging", prodDisabled.reason === "non-staging");

const stagingEnabled = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "admin",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: baseEnv,
});
ok("helper allowed on staging gate", stagingEnabled.enabled);

const signedOut = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: false,
  uid: "owner-uid-001",
  role: "admin",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: baseEnv,
});
ok("helper requires signed-in user", !signedOut.enabled);
ok("signed-out reason", signedOut.reason === "not-signed-in");

const nonOwnerRole = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "member-uid-001",
  role: "member",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: baseEnv,
});
ok("helper blocks non-owner/non-admin", !nonOwnerRole.enabled);
ok("non-owner reason", nonOwnerRole.reason === "not-admin");

const flagOff = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "admin",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: envReader({
    [OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV]: "false",
  }),
});
ok("helper can be disabled by runtime flag", !flagOff.enabled);
ok("flag-off reason", flagOff.reason === "flag-off");

const allowlistBlocked = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "superadmin",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: envReader({
    [OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV]: "true",
    VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ALLOWLIST_UIDS: "another-uid",
  }),
});
ok("allowlist blocks unknown uid", !allowlistBlocked.enabled);
ok("allowlist block reason", allowlistBlocked.reason === "uid-not-allowlisted");

const helperCode = readFileSync(HELPER_COMPONENT_PATH, "utf8");

ok(
  "helper uses force-refresh token helper path",
  /getCurrentUserIdToken\s*\(\s*true\s*\)/.test(helperCode)
);
ok(
  "helper copy happens only from button click handler",
  /onClick=\{handleCopyToken\}/.test(helperCode) &&
    /navigator\.clipboard\.writeText\(token\)/.test(helperCode)
);
ok("helper does not render token to UI", !/\{token\}/.test(helperCode));
ok("helper does not log token", !/console\.(log|debug|info|warn|error)\(/.test(helperCode));
ok("helper does not build Authorization header", !/Authorization|Bearer\s+/i.test(helperCode));
ok("helper has no Gemini/provider call", !/gemini|provider/i.test(helperCode));
ok("helper has no one-run mutation", !/one-run|oneRun|consume/i.test(helperCode));

console.log(`\nDone v13.15M-L guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
