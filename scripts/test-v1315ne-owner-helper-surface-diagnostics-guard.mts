/**
 * v13.15N-E owner helper surface diagnostics guard validation
 * Updated for Priority 2 containment: Owner Helper must not be mounted on Admin Dashboard.
 * Diagnosis/prepare-only checks. No Gemini execution.
 *
 * npm run test:v13.15N-E
 */
import { readFileSync } from "node:fs";
import {
  evaluateOwnerFirebaseTokenHelperGate,
  OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV,
  OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
} from "../src/config/ownerFirebaseTokenHelperGate.ts";

const HELPER_COMPONENT_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const DASHBOARD_PATH = "src/components/admin/AdminDashboardView.tsx";

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

console.log("=== v13.15N-E Owner Helper Surface Diagnostics Guard Validation ===\n");

const helperCode = readFileSync(HELPER_COMPONENT_PATH, "utf8");
const dashboardCode = readFileSync(DASHBOARD_PATH, "utf8");
const oneRunHandlerMatch = helperCode.match(
  /const handleRunOwnerGeminiOneRun = async \(\) => \{[\s\S]*?\n  \};/
);
const oneRunHandlerCode = oneRunHandlerMatch?.[0] ?? "";

ok(
  "AdminDashboardView does not import Owner Helper",
  !/OwnerFirebaseTokenHelperPanel/.test(dashboardCode) &&
    !/from\s+["']\.\/OwnerFirebaseTokenHelperPanel["']/.test(dashboardCode)
);

ok(
  "AdminDashboardView does not mount Owner Helper",
  !/<OwnerFirebaseTokenHelperPanel\s*\/>/.test(dashboardCode) &&
    !/<OwnerFirebaseTokenHelperPanel[\s>]/.test(dashboardCode)
);

ok(
  "Dashboard has no active or inactive Owner Helper surface",
  !/owner-firebase-token-helper/.test(dashboardCode) &&
    !/Owner helper hidden/i.test(dashboardCode) &&
    !/OWNER-ONLY FIREBASE AUTH HELPER/i.test(dashboardCode) &&
    !/helperFlag=/.test(dashboardCode) &&
    !/oneRunFlag=/.test(dashboardCode)
);

ok(
  "test does not expect legacy diagnostic panel on dashboard/helper inactive branch",
  !/owner-firebase-token-helper-gate-diagnostic/.test(dashboardCode) &&
    !/reason=\{gate\.reason\}/.test(dashboardCode)
);

const gateProd = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "admin",
  status: "active",
  hostname: "www.nongbot.org",
  projectId: "nonga-prod",
  readEnv: envReader({
    [OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV]: "true",
  }),
});
ok("helper remains disabled in production", !gateProd.enabled && gateProd.reason === "non-staging");

const gateStaging = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "superadmin",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: envReader({
    [OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV]: "true",
  }),
});
ok("helper gate logic remains staging-only and owner/admin signed-in", gateStaging.enabled);

ok(
  "helper source file retained unmounted (no dashboard coupling)",
  /export function OwnerFirebaseTokenHelperPanel\(/.test(helperCode)
);

ok(
  "one-run button remains manual-click and no auto-run in retained source",
  /onClick=\{handleRunOwnerGeminiOneRun\}/.test(helperCode) &&
    !/useEffect\(/.test(helperCode)
);

ok(
  "no retry second-run or lead path introduced",
  /isOneRunConsumedInSession\(\)/.test(oneRunHandlerCode) &&
    !/createLead|lead/i.test(oneRunHandlerCode) &&
    !/setInterval|while\s*\(|for\s*\(/.test(oneRunHandlerCode)
);

ok(
  "inactive gate branch returns null (no diagnostic residue in helper source)",
  /if\s*\(\s*!gate\.enabled\s*\)\s*\{\s*return null;\s*\}/.test(helperCode) &&
    !/owner-firebase-token-helper-gate-diagnostic/.test(helperCode)
);

console.log(`\nDone v13.15N-E guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
