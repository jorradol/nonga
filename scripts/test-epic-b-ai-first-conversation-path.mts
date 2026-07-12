/**
 * Epic B — AI-first buyer conversation path guard (offline/static)
 * npm run test:epic-b-ai-first-conversation-path
 */
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainUserVisibleGate.ts";
import {
  evaluateBuyerAiFirstEligibility,
  shouldInvokeBuyerConversationServerBridge,
  BUYER_AI_FIRST_CONVERSATION_SLICE_ID,
} from "../src/services/ai/buyerAiFirstConversationPath.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  maybeApplyUserVisibleRealProvider,
  setUserVisibleGeminiCallerForTests,
  resetUserVisibleGeminiCallerForTests,
  buildUserVisibleStructuredOutputJson,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";

const TEST_UID = "epic-b-allowlisted-owner-uid";

const AI_FIRST_ENV: Record<string, string> = {
  [NONGA_AI_PROVIDER_ENV]: "gemini",
  [NONGA_AI_MODE_ENV]: "high",
  [NONGA_AI_FIRST_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
  [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
  [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
  [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: TEST_UID,
  [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "true",
  [NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV]: "true",
  GEMINI_API_KEY: "mounted-secret-present",
};

const SAMPLE_CARDS = [
  {
    index: 1,
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 589000,
    mileage: 45000,
    fuelType: "เบนซิน",
    bodyClassLabel: "Sedan",
    description: "สภาพตามประกาศ",
  },
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function testEligibility() {
  const on = evaluateBuyerAiFirstEligibility({
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: AI_FIRST_ENV,
  });
  assert(on.aiFirstPathActive, "AI-first should be active for allowlisted buyer");
  assert(on.skipMockPilotCopy, "mock pilot copy must be skipped when AI-first");
  assert(on.realProviderAttemptAllowed, "real provider attempt should be allowed");

  const off = evaluateBuyerAiFirstEligibility({
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: { ...AI_FIRST_ENV, [NONGA_AI_FIRST_ENABLED_ENV]: "false" },
  });
  assert(!off.aiFirstPathActive, "AI-first off when flag disabled");
}

function testClientBridgeInvocation() {
  assert(
    shouldInvokeBuyerConversationServerBridge({
      isSignedIn: true,
      userRole: "buyer",
      userMessage: "หารถ SUV งบ 5 แสน",
    }),
    "signed-in buyer should invoke server bridge"
  );
  assert(
    !shouldInvokeBuyerConversationServerBridge({
      isSignedIn: false,
      userRole: "buyer",
      userMessage: "หารถ SUV",
    }),
    "guest should not invoke server bridge"
  );
  assert(
    !shouldInvokeBuyerConversationServerBridge({
      isSignedIn: true,
      userRole: "dealer",
      userMessage: "หารถ SUV",
    }),
    "dealer role should not invoke buyer bridge"
  );
}

async function testAiFirstSkipsMockPilotAndUsesProvider() {
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    providerOutputFull: buildUserVisibleStructuredOutputJson(
      "ได้ครับ จากข้อมูลประกาศ Toyota Corolla ปี 2020 ราคา 589,000 บาท ไมล์ 45,000 กม. เป็นรถเก๋งที่เหมาะกับใช้งานในเมืองและครอบครัวเล็กครับ โดยทั่วไปรุ่นนี้เน้นความคุ้มค่าและดูแลง่าย — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้งครับ ถ้าสนใจคันนี้ เดี๋ยวน้องเอพาไปขั้นตอนยืนยันความสนใจอย่างปลอดภัยก่อนนะครับ"
    ),
    redactedProviderOutput: "[redacted]",
    requestIdHash: "epic-b-test",
    modelId: "gemini-3.5-flash",
  }));

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: "หารถ Toyota Corolla 2020",
    inventory: [
      {
        id: "car-1",
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        price: 589000,
        mileage: 45000,
        fuelType: "เบนซิน",
        title: "Toyota Corolla 2020",
      },
    ],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: AI_FIRST_ENV,
    pilotSessionContext: { recentCarCards: SAMPLE_CARDS },
  });

  assert(bridge.orchestrated != null, "bridge should return orchestrated grounding");
  assert(
    !/ปังปุริเย่|เทียบคันที่ 1 กับ 2/.test(bridge.orchestrated!.text) ||
      bridge.payload.pilotPathActive,
    "AI-first path should not force mock pilot templates before provider"
  );

  const upgraded = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridge,
    userMessage: "หารถ Toyota Corolla 2020",
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: {
      carCardCount: 1,
      recentCarCards: SAMPLE_CARDS,
    },
    environment: "staging",
    env: AI_FIRST_ENV,
    readEnv: (key) => AI_FIRST_ENV[key],
  });

  assert(
    upgraded.payload.realProviderNetwork === true,
    `provider path expected, got ${upgraded.payload.realProviderGateReason}`
  );
  assert(
    upgraded.payload.realProviderGateReason === "real_provider_call_ok",
    "gate reason should be real_provider_call_ok"
  );
  assert(
    upgraded.orchestrated?.text.includes("Corolla"),
    "AI answer should reference grounded vehicle"
  );

  resetUserVisibleGeminiCallerForTests();
}

async function main() {
  console.log(`[epic-b] slice=${BUYER_AI_FIRST_CONVERSATION_SLICE_ID}`);
  testEligibility();
  testClientBridgeInvocation();
  await testAiFirstSkipsMockPilotAndUsesProvider();
  console.log("[epic-b] PASS — AI-first conversation path guards");
}

main().catch((err) => {
  console.error("[epic-b] FAIL", err);
  process.exit(1);
});
