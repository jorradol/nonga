/**
 * v14.4D pilot path inactive diagnosis validator
 * Static + in-memory checks only. No owner one-run/provider network call.
 *
 * npm run test:v14.4D
 */
import { existsSync, readFileSync } from "node:fs";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import { isPilotBuyerFollowUpMessage } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";

const DOC_PATH = "docs/v14.4D-pilot-path-inactive-diagnosis.md";
const FIXTURE_PATH = "docs/examples/v14.4D-pilot-path-inactive-diagnosis.synthetic.json";
const WRAPPER_PATH = "scripts/owner-local-user-visible-one-run-gate-v143ac.mts";
const PACKAGE_PATH = "package.json";

const INACTIVE_PROMPT =
  "ช่วยอธิบายแบบสั้นและสุภาพว่ารถ 2 คันนี้ต่างกันอย่างไรในภาพรวม โดยไม่ขอข้อมูลติดต่อครับ";
const ACTIVE_PROMPT =
  "ลูกค้าทดลองถามแบบไม่มีข้อมูลจริง: ช่วยเปรียบเทียบคันที่ 1 กับ 2 แบบสุภาพสำหรับครอบครัวหน่อยครับ";

const uid = "synthetic-owner-v144d";
const env: Record<string, string> = {
  [NONGA_AI_PROVIDER_ENV]: "gemini",
  [NONGA_AI_MODE_ENV]: "high",
  [NONGA_AI_FIRST_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "true",
  [NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV]: "true",
  [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "1",
  [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "10",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: uid,
  GEMINI_API_KEY: "masked-present-only",
};

const pilotSessionContext = {
  recentCarCards: [
    {
      index: 1,
      brand: "Toyota",
      model: "Yaris Ativ",
      year: 2020,
      price: 419000,
      mileage: 56000,
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
      description: "รถครอบครัวขนาดกะทัดรัด เน้นใช้งานในเมือง",
    },
    {
      index: 2,
      brand: "Honda",
      model: "City",
      year: 2020,
      price: 449000,
      mileage: 61000,
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
      description: "ห้องโดยสารนั่งสบาย เหมาะใช้เดินทางครอบครัว",
    },
  ],
  lastSearchBudgetMax: 500000,
} as const;

let pass = 0;
let fail = 0;
let geminiCallCount = 0;

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

console.log("=== v14.4D Pilot Path Inactive Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
ok("fixture exists", existsSync(FIXTURE_PATH));
ok("wrapper exists", existsSync(WRAPPER_PATH));
ok("package exists", existsSync(PACKAGE_PATH));

const doc = read(DOC_PATH);
const fixtureRaw = read(FIXTURE_PATH);
const wrapper = read(WRAPPER_PATH);
const packageRaw = read(PACKAGE_PATH);

ok(
  "doc states static diagnosis no-run boundary",
  /one-run execution by agent: no/i.test(doc) &&
    /retry by agent: no/i.test(doc) &&
    /second run by agent: no/i.test(doc) &&
    /provider\/Gemini\/runtime call by agent: no/i.test(doc)
);

ok(
  "wrapper prompt uses follow-up-safe active message",
  wrapper.includes(ACTIVE_PROMPT) && !wrapper.includes(INACTIVE_PROMPT)
);

ok(
  "wrapper evidence extraction reads expected success.data paths",
  /const pilotPathActive = readBoolean\(data\.pilotPathActive\);/.test(wrapper) &&
    /const fallbackToLegacy = readBoolean\(data\.fallbackToLegacy\);/.test(wrapper) &&
    /const skipGemini = readBoolean\(data\.skipGemini\);/.test(wrapper) &&
    /readBooleanFromCandidates\(data\.realProviderNetwork, data\.providerNetwork\)/.test(wrapper) &&
    /const gateReason = readTrimmedString\(data\.realProviderGateReason \?\? data\.gateReason\);/.test(
      wrapper
    ) &&
    /gateDiag\?\.allowlistMatch/.test(wrapper) &&
    /runtimeDiag\?\.userVisibleEnabled/.test(wrapper)
);

ok("inactive prompt is not follow-up classified", isPilotBuyerFollowUpMessage(INACTIVE_PROMPT) === false);
ok("active prompt is follow-up classified", isPilotBuyerFollowUpMessage(ACTIVE_PROMPT) === true);

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  throw new Error("Gemini must not execute in v14.4D diagnosis");
});

try {
  const inactiveBridge = runUserVisibleOrchestrationBridge({
    userMessage: INACTIVE_PROMPT,
    inventory: [],
    trustedFirebaseUid: uid,
    userRole: "admin",
    environment: "staging",
    env,
    pilotSessionContext,
  });
  ok("inactive prompt keeps pilot inactive", inactiveBridge.payload.pilotPathActive === false);
  ok("inactive prompt keeps fallback true", inactiveBridge.payload.fallbackToLegacy === true);

  const inactiveApplied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: inactiveBridge,
    userMessage: INACTIVE_PROMPT,
    firebaseUid: uid,
    userRole: "admin",
    environment: "staging",
    env,
    readEnv: (key) => env[key],
    pilotOrchestration: {
      carCardCount: pilotSessionContext.recentCarCards.length,
      recentCarCards: pilotSessionContext.recentCarCards,
      lastSearchBudgetMax: pilotSessionContext.lastSearchBudgetMax,
    },
  });
  ok(
    "inactive prompt maps to pilot_path_inactive",
    inactiveApplied.payload.realProviderGateReason === "pilot_path_inactive"
  );
  ok("inactive prompt keeps provider network false", inactiveApplied.payload.realProviderNetwork === false);

  const activeBridge = runUserVisibleOrchestrationBridge({
    userMessage: ACTIVE_PROMPT,
    inventory: [],
    trustedFirebaseUid: uid,
    userRole: "admin",
    environment: "staging",
    env,
    pilotSessionContext,
  });
  ok("active prompt activates pilot path", activeBridge.payload.pilotPathActive === true);
  ok("active prompt clears fallback", activeBridge.payload.fallbackToLegacy === false);
} finally {
  resetUserVisibleGeminiCallerForTests();
}

ok("gemini caller is never invoked", geminiCallCount === 0, `calls=${geminiCallCount}`);

let fixtureParsed: unknown = null;
try {
  fixtureParsed = JSON.parse(fixtureRaw);
  ok("fixture parses json", true);
} catch (err) {
  ok("fixture parses json", false, String(err));
}

if (fixtureParsed && typeof fixtureParsed === "object") {
  const root = fixtureParsed as Record<string, unknown>;
  ok("fixture version is v14.4D", root.version === "v14.4D");
  const diagnosis = root.pilotPathInactiveDiagnosis as Record<string, unknown>;
  ok(
    "fixture captures inactive prompt root cause",
    diagnosis?.inactivePromptFollowUpClassified === false &&
      diagnosis?.inactiveBridgePilotPathActive === false &&
      diagnosis?.inactiveGateReason === "pilot_path_inactive"
  );
  const action = root.nextOwnerAction as Record<string, unknown>;
  ok(
    "fixture selects new run id v14.3AJ",
    action?.runId === "v14.3AJ" && action?.retryV143aiAllowed === false
  );
}

let packageParsed: unknown = null;
try {
  packageParsed = JSON.parse(packageRaw);
  ok("package parses json", true);
} catch (err) {
  ok("package parses json", false, String(err));
}

if (packageParsed && typeof packageParsed === "object") {
  const scripts = (packageParsed as { scripts?: Record<string, string> }).scripts ?? {};
  ok(
    "package has test:v14.4D script",
    scripts["test:v14.4D"] === "tsx scripts/test-v144D-pilot-path-inactive-diagnosis.mts"
  );
}

console.log(`\nDone v14.4D diagnosis validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
