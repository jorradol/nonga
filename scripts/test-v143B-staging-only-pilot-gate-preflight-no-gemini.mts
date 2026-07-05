/**
 * v14.3B staging-only pilot gate preflight validator
 * Static checks only. No runtime/provider call.
 *
 * npm run test:v14.3B
 */
import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v14.3B-staging-only-pilot-gate-preflight-no-gemini.md";
const FIXTURE_PATH = "docs/examples/v14.3B-staging-only-pilot-gate-preflight.synthetic.json";
const FIREBASE_JSON_PATH = "firebase.json";
const OWNER_GATE_PATH = "src/config/ownerFirebaseTokenHelperGate.ts";
const OWNER_PANEL_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const BRIDGE_PATH = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const CLIENT_PATH = "src/services/ai/chat/chatUserVisibleOrchestrateClient.ts";
const PROVIDER_PATH = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const V143A_DOC_PATH = "docs/v14.3A-limited-staging-pilot-checklist-validator.md";
const V142C_DOC_PATH = "docs/v14.2C-owner-manual-gemini-quality-retest-pass-closure.md";
const SELF_PATH = "scripts/test-v143B-staging-only-pilot-gate-preflight-no-gemini.mts";

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

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

console.log("=== v14.3B Staging-only Pilot Gate Preflight Validation ===\n");

ok("v14.3B doc exists", existsSync(DOC_PATH));
ok("v14.3B fixture exists", existsSync(FIXTURE_PATH));
ok("firebase config exists", existsSync(FIREBASE_JSON_PATH));
ok("owner gate config exists", existsSync(OWNER_GATE_PATH));
ok("owner panel exists", existsSync(OWNER_PANEL_PATH));
ok("server bridge exists", existsSync(BRIDGE_PATH));
ok("client bridge exists", existsSync(CLIENT_PATH));
ok("provider file exists", existsSync(PROVIDER_PATH));
ok("v14.3A doc exists", existsSync(V143A_DOC_PATH));
ok("v14.2C doc exists", existsSync(V142C_DOC_PATH));
ok("self exists", existsSync(SELF_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const firebaseJson = read(FIREBASE_JSON_PATH);
const ownerGate = read(OWNER_GATE_PATH);
const ownerPanel = read(OWNER_PANEL_PATH);
const bridge = read(BRIDGE_PATH);
const client = read(CLIENT_PATH);
const provider = read(PROVIDER_PATH);
const v143aDoc = read(V143A_DOC_PATH);
const v142cDoc = read(V142C_DOC_PATH);
const self = read(SELF_PATH);

ok("doc has substantial content", doc.length > 5200, `${doc.length} chars`);
ok("fixture has substantial content", fixtureRaw.length > 2600, `${fixtureRaw.length} chars`);
ok("doc includes staging-only keyword", /staging-only/.test(doc));
ok("doc includes owner-admin only keyword", /owner-admin only/.test(doc));
ok("doc includes synthetic-sanitized only keyword", /synthetic-sanitized only/.test(doc));

const requiredExecutionNoLines: Array<[string, RegExp]> = [
  ["no Gemini run", /Gemini run:\s*no/i],
  ["no one-run click", /one-run click:\s*no/i],
  ["no provider network call", /provider network call:\s*no/i],
  ["no production deploy", /production deploy:\s*no/i],
  ["no public route activation", /public route activation:\s*no/i],
  ["no real lead sending", /real lead sending:\s*no/i],
  ["no real customer pii", /real customer data \/ PII:\s*no/i],
  ["no phone plate vin examples", /phone\/plate\/VIN examples:\s*no/i],
  ["no secret exposure", /secret\/token\/API key exposure:\s*no/i],
];
for (const [name, re] of requiredExecutionNoLines) {
  ok(`doc has boundary line ${name}`, re.test(doc));
}

const requiredMarkerLines = [
  "guardPolicyVersion=v14.1-lead-pii-cue-guard",
  "thaiUxTuningSliceId=v14.2",
  "thaiUxTuningActive=true",
  "targetAnswerLengthGuidance=4-7-sentences",
  "leadPiiCueGuardActive=true",
  "phoneEchoGuardActive=true",
  "safeConfirmationStepWordingActive=true",
];
for (const marker of requiredMarkerLines) {
  ok(`doc includes marker ${marker}`, doc.includes(marker));
}

ok(
  "doc includes owner approval and run lock controls",
  /fresh owner approval required/.test(doc) &&
    /one-run count explicit/.test(doc) &&
    /runSessionLocked required/.test(doc) &&
    /no retry/.test(doc) &&
    /no second run/.test(doc)
);
ok("doc includes stop hold rules", /Stop immediately and set HOLD/.test(doc));

const expectedFinalRecommendations = [
  "READY FOR v14.3C OWNER-ONLY PILOT DRY-RUN PLAN — NO RUNTIME EXECUTION",
  "READY FOR v14.3C CONTROLLED STAGING PILOT PREFLIGHT VISIBILITY CHECK — NO GEMINI YET",
  "HOLD — PILOT GATE PREFLIGHT INCOMPLETE",
  "HOLD — ROUTE/AUTH GATE AMBIGUITY",
  "HOLD — PUBLIC/PRODUCTION/REAL LEAD RISK DETECTED",
  "HOLD — SECRET/PII RISK DETECTED",
  "HOLD — TEST FAILURE",
];
for (const value of expectedFinalRecommendations) {
  ok(`doc includes final recommendation ${value}`, doc.includes(value));
}

ok(
  "firebase json routes point api rewrite to staging service",
  /"source": "\/api\/\*\*"/.test(firebaseJson) &&
    /"serviceId": "nonga-staging"/.test(firebaseJson) &&
    /"region": "asia-southeast1"/.test(firebaseJson)
);
ok(
  "firebase json has storage listings rewrite to staging service",
  /"source": "\/storage\/listings\/\*\*"/.test(firebaseJson) &&
    /"serviceId": "nonga-staging"/.test(firebaseJson)
);
ok(
  "firebase json has no explicit production service rewrite",
  !/"serviceId": "nonga-production"/.test(firebaseJson) &&
    !/"serviceId": "production"/.test(firebaseJson)
);

ok(
  "owner gate enforces staging and admin conditions",
  /OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST/.test(ownerGate) &&
    /OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID/.test(ownerGate) &&
    /canAccessAdmin/.test(ownerGate) &&
    /uid-not-allowlisted/.test(ownerGate)
);
ok(
  "owner panel route constants and one-run lock wording present",
  /OWNER_GEMINI_ONE_RUN_ROUTE = "\/api\/ai\/chat-user-visible-orchestrate"/.test(ownerPanel) &&
    /OWNER_GEMINI_ONE_RUN_SESSION_KEY/.test(ownerPanel) &&
    /runSessionLocked/.test(ownerPanel) &&
    /noRetry=true/.test(ownerPanel)
);
ok(
  "server bridge route and auth context are server trusted",
  /SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE =\s*"\/api\/ai\/chat-user-visible-orchestrate"/.test(
    bridge
  ) &&
    /getServerAuthContext/.test(bridge) &&
    /registerSalesBrainUserVisibleOrchestrationBridgeRoutes/.test(bridge)
);
ok(
  "client bridge points only to orchestrate route constant",
  /CHAT_USER_VISIBLE_ORCHESTRATE_ROUTE = "\/api\/ai\/chat-user-visible-orchestrate"/.test(client)
);
ok(
  "provider exports required guard and thai ux markers",
  /AI_USER_VISIBLE_GUARD_POLICY_VERSION = "v14\.1-lead-pii-cue-guard"/.test(provider) &&
    /thaiUxTuningSliceId:\s*USER_VISIBLE_THAI_UX_TUNING_SLICE_ID/.test(provider) &&
    /thaiUxTuningActive:\s*true/.test(provider) &&
    /targetAnswerLengthGuidance:\s*"4-7-sentences"/.test(provider) &&
    /leadPiiCueGuardActive/.test(provider) &&
    /phoneEchoGuardActive/.test(provider) &&
    /safeConfirmationStepWordingActive/.test(provider)
);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.3B", root.version === "v14.3B");
  ok(
    "fixture execution type flags are non-runtime",
    (root.executionType as Record<string, unknown>)?.staticMockOnly === true &&
      (root.executionType as Record<string, unknown>)?.runtimeExecution === false &&
      (root.executionType as Record<string, unknown>)?.geminiRun === false &&
      (root.executionType as Record<string, unknown>)?.providerNetworkCall === false &&
      (root.executionType as Record<string, unknown>)?.deploy === false
  );
  ok(
    "fixture scope flags include staging owner synthetic and no-risk boundaries",
    (root.scope as Record<string, unknown>)?.stagingOnly === true &&
      (root.scope as Record<string, unknown>)?.ownerAdminOnly === true &&
      (root.scope as Record<string, unknown>)?.syntheticSanitizedOnly === true &&
      (root.scope as Record<string, unknown>)?.noPublicRouteActivation === true &&
      (root.scope as Record<string, unknown>)?.noProductionDeploy === true &&
      (root.scope as Record<string, unknown>)?.noRealLeadSending === true &&
      (root.scope as Record<string, unknown>)?.noRealCustomerDataPii === true &&
      (root.scope as Record<string, unknown>)?.noPhoneCaptureInChat === true &&
      (root.scope as Record<string, unknown>)?.noPlateVinExposure === true &&
      (root.scope as Record<string, unknown>)?.noSecretTokenApiKeyExposure === true
  );
  ok(
    "fixture marker requirements include all required values",
    (root.requiredMarkers as Record<string, unknown>)?.guardPolicyVersion ===
      "v14.1-lead-pii-cue-guard" &&
      (root.requiredMarkers as Record<string, unknown>)?.thaiUxTuningSliceId === "v14.2" &&
      (root.requiredMarkers as Record<string, unknown>)?.thaiUxTuningActive === true &&
      (root.requiredMarkers as Record<string, unknown>)?.targetAnswerLengthGuidance ===
        "4-7-sentences" &&
      (root.requiredMarkers as Record<string, unknown>)?.leadPiiCueGuardActive === true &&
      (root.requiredMarkers as Record<string, unknown>)?.phoneEchoGuardActive === true &&
      (root.requiredMarkers as Record<string, unknown>)?.safeConfirmationStepWordingActive === true
  );
  ok(
    "fixture one-run controls include approval lock and no retry/second run",
    (root.oneRunControlRequirements as Record<string, unknown>)?.freshOwnerApprovalRequired === true &&
      (root.oneRunControlRequirements as Record<string, unknown>)?.oneRunCountExplicitRequired ===
        true &&
      (root.oneRunControlRequirements as Record<string, unknown>)?.runSessionLockedRequired === true &&
      (root.oneRunControlRequirements as Record<string, unknown>)?.noRetry === true &&
      (root.oneRunControlRequirements as Record<string, unknown>)?.noSecondRun === true
  );
}

ok(
  "cross-doc v14.3A references v14.3B next-step options",
  /v14\.3B STAGING-ONLY PILOT GATE PREFLIGHT — NO GEMINI YET/.test(v143aDoc) &&
    /v14\.3B OWNER-ONLY PILOT DRY-RUN PLAN/.test(v143aDoc)
);
ok("cross-doc v14.2C includes runSessionLocked", /runSessionLocked=true/.test(v142cDoc));

const combined = `${doc}\n${fixtureRaw}`;
const forbiddenSensitivePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/],
  ["full email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["thai phone style", /\b0[689]\d{8}\b/],
  ["thai plate style", /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/],
  ["vin style", /\b[A-HJ-NPR-Z0-9]{17}\b/]
];
for (const [name, re] of forbiddenSensitivePatterns) {
  ok(`no forbidden sensitive pattern ${name}`, !re.test(combined));
}

ok("validator states static checks only", /Static checks only/i.test(self));
ok("validator checks final recommendation enum", /expectedFinalRecommendations/.test(self));

console.log(`\nDone v14.3B preflight validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
