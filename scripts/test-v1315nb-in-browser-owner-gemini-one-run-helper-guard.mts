/**
 * v13.15N-B in-browser owner-only Gemini UX one-run helper guard validation
 * Prepare-only static/runtime checks. No deploy. No provider execution.
 *
 * npm run test:v13.15N-B
 */
import { readFileSync } from "node:fs";
import {
  evaluateOwnerFirebaseTokenHelperGate,
  isOwnerGeminiOneRunHelperEnabled,
  OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV,
  OWNER_GEMINI_ONE_RUN_HELPER_FLAG_ENV,
  OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
} from "../src/config/ownerFirebaseTokenHelperGate.ts";

const HELPER_COMPONENT_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const BRIDGE_SERVER_PATH =
  "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

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

function hasPhonePlateVin(text: string): boolean {
  const phone = /\b0[689]\d{8}\b/;
  const plate = /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/;
  const vin = /\b[A-HJ-NPR-Z0-9]{17}\b/;
  return phone.test(text) || plate.test(text) || vin.test(text);
}

console.log("=== v13.15N-B Owner-only Gemini UX one-run Helper Guard Validation ===\n");

const baseEnv = envReader({
  [OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV]: "true",
  [OWNER_GEMINI_ONE_RUN_HELPER_FLAG_ENV]: "true",
});

const prodBlocked = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "superadmin",
  status: "active",
  hostname: "www.nongbot.org",
  projectId: "nonga-prod",
  readEnv: baseEnv,
});
ok("helper disabled in production/non-staging", !prodBlocked.enabled);

const stagingAllowed = evaluateOwnerFirebaseTokenHelperGate({
  isSignedIn: true,
  uid: "owner-uid-001",
  role: "admin",
  status: "active",
  hostname: OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST,
  projectId: OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID,
  readEnv: baseEnv,
});
ok("helper gated to staging only", stagingAllowed.enabled);

const flagOff = isOwnerGeminiOneRunHelperEnabled(
  envReader({
    [OWNER_GEMINI_ONE_RUN_HELPER_FLAG_ENV]: "false",
  })
);
const flagOn = isOwnerGeminiOneRunHelperEnabled(baseEnv);
ok("one-run helper feature flag off blocks helper", !flagOff);
ok("one-run helper feature flag on enables helper", flagOn);

const helperCode = readFileSync(HELPER_COMPONENT_PATH, "utf8");
const bridgeCode = readFileSync(BRIDGE_SERVER_PATH, "utf8");
const oneRunHandlerMatch = helperCode.match(
  /const handleRunOwnerGeminiOneRun = async \(\) => \{[\s\S]*?\n  \};/
);
const oneRunHandlerCode = oneRunHandlerMatch?.[0] ?? "";

ok(
  "requires signed-in owner/admin via existing gate",
  /evaluateOwnerFirebaseTokenHelperGate\(/.test(helperCode) &&
    /if \(!gate\.enabled\) return null;/.test(helperCode)
);
ok(
  "manual click only for one-run",
  /onClick=\{handleRunOwnerGeminiOneRun\}/.test(helperCode) &&
    /Run owner-only Gemini UX one-run \(1\/1\)/.test(helperCode)
);
ok("no auto-run on page load", !/useEffect\(/.test(helperCode));

ok(
  "uses canonical Firebase auth headers with force refresh",
  /getFirebaseAuthHeaders\(\{\s*forceRefresh:\s*true\s*\}\)/.test(oneRunHandlerCode)
);
ok(
  "calls only /api/ai/chat-user-visible-orchestrate",
  /OWNER_GEMINI_ONE_RUN_ROUTE = "\/api\/ai\/chat-user-visible-orchestrate"/.test(
    helperCode
  ) && /fetch\(OWNER_GEMINI_ONE_RUN_ROUTE,/.test(oneRunHandlerCode)
);
ok(
  "route is server-side auth protected",
  /SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE/.test(bridgeCode) &&
    /getServerAuthContext\(req\)/.test(bridgeCode)
);
ok(
  "uses synthetic no-PII payload",
  /SYNTHETIC_ONE_RUN_PROMPT/.test(helperCode) &&
    !hasPhonePlateVin(helperCode)
);
ok(
  "no token/header/api key logs",
  !/console\.(log|debug|info|warn|error)\(/.test(helperCode) &&
    !/Bearer\s+/.test(helperCode) &&
    !/GEMINI_API_KEY/.test(helperCode)
);
ok(
  "does not render token/header/api key",
  !/\{token\}/.test(helperCode) &&
    !/\$\{[^}]*token[^}]*\}/i.test(helperCode) &&
    !/\$\{[^}]*authorization[^}]*\}/i.test(helperCode) &&
    !/\$\{[^}]*api[_-]?key[^}]*\}/i.test(helperCode)
);
ok("does not create lead path", !/createLead|lead/i.test(oneRunHandlerCode));
ok("no phone/plate/VIN patterns in helper code", !hasPhonePlateVin(helperCode));
ok(
  "does not auto-retry and blocks second run in session",
  /OWNER_GEMINI_ONE_RUN_SESSION_KEY/.test(helperCode) &&
    /isOneRunConsumedInSession\(\)/.test(oneRunHandlerCode) &&
    /markOneRunConsumedInSession\(\)/.test(oneRunHandlerCode) &&
    !/setInterval|while\s*\(|for\s*\(/.test(oneRunHandlerCode)
);

console.log(`\nDone v13.15N-B guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
