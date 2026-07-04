/**
 * v13.15N-V pilot-path active runtime integration guard
 * In-memory integration checks only. No provider execution.
 *
 * npm run test:v13.15N-V
 */
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
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

const uid = "synthetic-owner-v1315nv";
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

const deployedHelperPrompt =
  "ลูกค้าทดลองถามแบบไม่มีข้อมูลจริง: ช่วยสรุปจุดเด่นของคันที่ 1 และ 2 แบบสุภาพสำหรับครอบครัวหน่อยครับ";
const inactivePrompt = "คำถามทั่วไปที่ไม่เข้า follow-up หรือ admin route";

console.log("=== v13.15N-V Pilot Path Active Runtime Integration Guard ===\n");

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  throw new Error("Gemini must not execute in v13.15N-V");
});

try {
  const deployedBridge = runUserVisibleOrchestrationBridge({
    userMessage: deployedHelperPrompt,
    inventory: [],
    trustedFirebaseUid: uid,
    userRole: "admin",
    environment: "staging",
    env,
    pilotSessionContext,
  });
  ok(
    "deployed helper prompt activates pilot path in high mode",
    deployedBridge.payload.pilotPathActive === true
  );
  ok("deployed helper prompt clears fallback", deployedBridge.payload.fallbackToLegacy === false);
  ok("deployed helper prompt emits non-zero car cards", deployedBridge.payload.carCardCount > 0);

  const deployedNoContextBridge = runUserVisibleOrchestrationBridge({
    userMessage: deployedHelperPrompt,
    inventory: [],
    trustedFirebaseUid: uid,
    userRole: "admin",
    environment: "staging",
    env,
  });
  ok(
    "deployed helper prompt without pilot context returns zero cards",
    deployedNoContextBridge.payload.carCardCount === 0
  );
  ok(
    "deployed helper prompt without pilot context still keeps pilot active",
    deployedNoContextBridge.payload.pilotPathActive === true &&
      deployedNoContextBridge.payload.fallbackToLegacy === false
  );

  const inactiveBridge = runUserVisibleOrchestrationBridge({
    userMessage: inactivePrompt,
    inventory: [],
    trustedFirebaseUid: uid,
    userRole: "admin",
    environment: "staging",
    env,
  });
  ok("inactive prompt keeps pilot inactive", inactiveBridge.payload.pilotPathActive === false);
  ok("inactive prompt keeps fallback true", inactiveBridge.payload.fallbackToLegacy === true);
  ok("inactive prompt returns zero car cards", inactiveBridge.payload.carCardCount === 0);

  const inactiveApplied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: inactiveBridge,
    userMessage: inactivePrompt,
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
    "inactive prompt maps to pilot_path_inactive gate reason",
    inactiveApplied.payload.realProviderGateReason === "pilot_path_inactive"
  );
  ok("inactive prompt keeps provider network false", inactiveApplied.payload.realProviderNetwork === false);
} finally {
  resetUserVisibleGeminiCallerForTests();
}

ok("gemini caller never invoked", geminiCallCount === 0, `calls=${geminiCallCount}`);

console.log(`\nDone v13.15N-V guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
