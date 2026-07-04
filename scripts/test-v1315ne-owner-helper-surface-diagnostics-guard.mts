/**
 * v13.15N-E owner helper surface diagnostics guard validation
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
const oneRunHandlerMatch = helperCode.match(
  /const handleRunOwnerGeminiOneRun = async \(\) => \{[\s\S]*?\n  \};/
);
const oneRunHandlerCode = oneRunHandlerMatch?.[0] ?? "";

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
ok("helper remains staging-only and owner/admin signed-in", gateStaging.enabled);

ok(
  "diagnostic panel is status-only and sanitized",
  /owner-firebase-token-helper-gate-diagnostic/.test(helperCode) &&
    /reason=\{gate\.reason\}/.test(helperCode) &&
    /helperFlag=\{helperFlagEnabled \? "on" : "off"\}/.test(helperCode) &&
    /oneRunFlag=\{oneRunHelperEnabled \? "on" : "off"\}/.test(helperCode) &&
    !/authorization|bearer|api[_-]?key/i.test(
      helperCode.match(/owner-firebase-token-helper-gate-diagnostic[\s\S]*?<\/section>/)?.[0] ?? ""
    )
);

ok(
  "diagnostic does not expose full uid/email",
  !/user\?\.uid|user\?\.email|@/.test(
    helperCode.match(/owner-firebase-token-helper-gate-diagnostic[\s\S]*?<\/section>/)?.[0] ?? ""
  )
);

ok(
  "one-run button remains manual-click and no auto-run",
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
  "no direct Gemini/provider call at render-time",
  !/fetch\(OWNER_GEMINI_ONE_RUN_ROUTE,/.test(helperCode.match(/if \(!gate\.enabled\)[\s\S]*?return \(/)?.[0] ?? "")
);

console.log(`\nDone v13.15N-E guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
