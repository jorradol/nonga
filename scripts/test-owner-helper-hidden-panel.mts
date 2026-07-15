/**
 * Focused guard: Owner Helper inactive branch must render nothing.
 *
 * When Existing Owner Helper visibility gate is off, Admin must not render
 * debug residue (OWNER HELPER HIDDEN / reason= / helperFlag= / oneRunFlag= /
 * diagnostic container). Active helper branch and gate calculation stay intact.
 *
 * Run: npx tsx scripts/test-owner-helper-hidden-panel.mts
 */
import { readFileSync } from "node:fs";
import {
  evaluateOwnerFirebaseTokenHelperGate,
  OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV,
  OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
} from "../src/config/ownerFirebaseTokenHelperGate.ts";

const HELPER_COMPONENT_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const GATE_CONFIG_PATH = "src/config/ownerFirebaseTokenHelperGate.ts";

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

console.log("=== Owner Helper Hidden Panel (gate OFF → return null) ===\n");

const helperCode = readFileSync(HELPER_COMPONENT_PATH, "utf8");
const gateConfigCode = readFileSync(GATE_CONFIG_PATH, "utf8");

const inactiveBranch =
  helperCode.match(/if\s*\(\s*!gate\.enabled\s*\)\s*\{[\s\S]*?\n  \}/)?.[0] ?? "";

ok(
  "gate OFF inactive branch returns null (no JSX)",
  /if\s*\(\s*!gate\.enabled\s*\)\s*\{\s*return null;\s*\}/.test(helperCode),
  inactiveBranch.slice(0, 120).replace(/\s+/g, " ")
);

ok(
  "gate OFF does not render OWNER HELPER HIDDEN / Owner helper hidden",
  !/OWNER HELPER HIDDEN/i.test(helperCode) && !/Owner helper hidden/i.test(helperCode)
);

ok(
  "gate OFF does not render reason= / helperFlag= / oneRunFlag= debug lines",
  !/reason=\{gate\.reason\}/.test(helperCode) &&
    !/helperFlag=/.test(helperCode) &&
    !/oneRunFlag=/.test(helperCode)
);

ok(
  "gate OFF has no hidden debug container or placeholder",
  !/owner-firebase-token-helper-gate-diagnostic/.test(helperCode) &&
    !/data-testid="owner-firebase-token-helper-gate-diagnostic"/.test(inactiveBranch) &&
    !/<section[\s\S]*Owner helper hidden/i.test(helperCode)
);

ok(
  "active helper branch remains (panel + token copy button)",
  /data-testid="owner-firebase-token-helper-panel"/.test(helperCode) &&
    /data-testid="owner-firebase-token-helper-copy-button"/.test(helperCode) &&
    /handleCopyToken/.test(helperCode) &&
    /getCurrentUserIdToken/.test(helperCode)
);

ok(
  "existing gate evaluation call site unchanged",
  /evaluateOwnerFirebaseTokenHelperGate\(\{/.test(helperCode) &&
    /isSignedIn,/.test(helperCode) &&
    /uid:\s*user\?\.uid/.test(helperCode)
);

const gateFlagOff = evaluateOwnerFirebaseTokenHelperGate({
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
ok(
  "gate still evaluates flag-off as disabled (calculation unchanged)",
  !gateFlagOff.enabled && gateFlagOff.reason === "flag-off"
);

const gateDefaultOff = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "admin",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: envReader({}),
});
ok(
  "gate still defaults closed when flag env missing",
  !gateDefaultOff.enabled && gateDefaultOff.reason === "flag-off"
);

ok(
  "source does not flip feature flag defaults or production env values",
  /return raw === "true"/.test(gateConfigCode) &&
    !/OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV[\s\S]{0,80}=\s*"true"/.test(helperCode) &&
    !/VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ENABLED\s*[:=]\s*true/.test(helperCode) &&
    !/VITE_NONGA_OWNER_GEMINI_ONE_RUN_HELPER_ENABLED\s*[:=]\s*true/.test(helperCode)
);

ok(
  "no token / secret interpolation added in inactive path",
  !/token|authorization|bearer|api[_-]?key|password|session/i.test(inactiveBranch)
);

console.log(`\nDone - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
