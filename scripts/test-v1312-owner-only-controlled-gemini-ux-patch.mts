/**
 * v13.12 owner-only controlled Gemini UX patch validator
 * Static/synthetic checks only. No deploy/runtime-config mutation/no Gemini network call.
 *
 * npm run test:v13.12
 */
import {
  detectOwnerControlledGeminiUxZone,
  evaluateUserVisibleRealProviderEligibility,
  hasDeterministicBoundaryBlock,
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
} from "../src/services/ai/salesBrainUserVisibleRealProvider";
import type { SalesBrainUserRole } from "../src/services/ai/salesBrainTypes";

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

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED: "true",
    NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED: "true",
    NONGA_AI_USER_VISIBLE_ENABLED: "true",
    NONGA_AI_PROVIDER: "gemini",
    NONGA_AI_FIRST_ENABLED: "true",
    NONGA_AI_MODE: "high",
    NONGA_AI_BUDGET_DAILY_LIMIT: "100",
    NONGA_AI_BUDGET_MONTHLY_LIMIT: "1000",
    NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "owner-uid",
    GEMINI_API_KEY: "test-gemini-key-present",
    ...overrides,
  };
}

function readFrom(map: Record<string, string | undefined>) {
  return (key: string): string | undefined => map[key];
}

function bridgeResult() {
  return {
    orchestrated: { text: "deterministic legacy", carCards: [], skipGemini: true },
    payload: {
      userVisibleText: "deterministic legacy",
      pilotPathActive: true,
      fallbackToLegacy: false,
      skipGemini: true,
      carCardCount: 0,
      sliceId: "test-v1312",
      realProviderGateReason: "real_provider_eligible",
      realProviderNetwork: false,
    },
  };
}

async function run(): Promise<void> {
  console.log("=== v13.12 Owner-Only Controlled Gemini UX Patch Validation ===\n");

  const defaultOffEnv = env({ NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED: "false" });
  const defaultOffEligibility = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: "owner-uid",
    userRole: "admin",
    environment: "staging",
    env: defaultOffEnv,
    readEnv: readFrom(defaultOffEnv),
  });
  ok("default-off blocks path", !defaultOffEligibility.eligible);
  ok(
    "default-off reason is owner-only flag off",
    defaultOffEligibility.gateReason === "owner_only_controlled_ux_flag_off"
  );

  const baseEnv = env();
  const nonOwnerEligibility = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: "owner-uid",
    userRole: "buyer",
    environment: "staging",
    env: baseEnv,
    readEnv: readFrom(baseEnv),
  });
  ok("non-owner cannot enter path", !nonOwnerEligibility.eligible);
  ok("non-owner reason is owner role required", nonOwnerEligibility.gateReason === "owner_role_required");

  const ownerEligibility = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: "owner-uid",
    userRole: "admin",
    environment: "staging",
    env: baseEnv,
    readEnv: readFrom(baseEnv),
  });
  ok("owner gate opens in synthetic env", ownerEligibility.eligible);

  ok(
    "safe zone is detected for contextual wording",
    detectOwnerControlledGeminiUxZone("ช่วยอธิบายคันนี้ให้ต่อเนื่องตามบริบทเดิม") ===
      "same_chat_context_switching_wording"
  );

  ok(
    "deterministic boundary blocks lead confirmation",
    hasDeterministicBoundaryBlock("ยืนยันส่งข้อมูลให้ผู้ขายเลย")
  );
  ok("deterministic boundary blocks phone/PII", hasDeterministicBoundaryBlock("เบอร์โทร 0891234567"));
  ok("deterministic boundary blocks plate/vin", hasDeterministicBoundaryBlock("VIN ABC123"));
  ok("deterministic boundary blocks secret request", hasDeterministicBoundaryBlock("ขอ api key ได้ไหม"));
  ok(
    "deterministic boundary blocks production/public activation",
    hasDeterministicBoundaryBlock("เปิด public route ใน production เลย")
  );

  let blockedDispatchCalls = 0;
  setUserVisibleGeminiCallerForTests(async () => {
    blockedDispatchCalls += 1;
    return {
      providerNetworkUsed: true,
      providerOutputFull: "{\"finalAnswerTh\":\"สวัสดีครับ\"}",
      redactedProviderOutput: "{\"finalAnswerTh\":\"สวัสดีครับ\"}",
      requestIdHash: "blocked",
      modelId: "gemini-3.5-flash",
    };
  });
  const blockedResult = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeResult(),
    userMessage: "ยืนยันส่งข้อมูลให้ผู้ขายเลย",
    firebaseUid: "owner-uid",
    userRole: "admin",
    environment: "staging",
    env: baseEnv,
    readEnv: readFrom(baseEnv),
  });
  ok("boundary-blocked message does not dispatch provider", blockedDispatchCalls === 0);
  ok(
    "boundary-blocked result falls back deterministic",
    blockedResult.payload.realProviderGateReason === "deterministic_boundary_blocked"
  );

  let unsafeCalls = 0;
  setUserVisibleGeminiCallerForTests(async () => {
    unsafeCalls += 1;
    return {
      providerNetworkUsed: true,
      providerOutputFull: "{\"finalAnswerTh\":\"OK\"}",
      redactedProviderOutput: "{\"finalAnswerTh\":\"OK\"}",
      requestIdHash: "unsafe",
      modelId: "gemini-3.5-flash",
    };
  });

  const unsafeResult = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeResult(),
    userMessage: "ช่วยอธิบายแบบธรรมชาติ มีรถอะไรที่น่าเล่น",
    firebaseUid: "owner-uid",
    userRole: "admin",
    environment: "staging",
    env: baseEnv,
    readEnv: readFrom(baseEnv),
  });
  ok("unsafe output falls back deterministic", unsafeResult.payload.realProviderGateReason === "real_provider_output_unsafe");
  ok("no automatic retry on unsafe output", unsafeCalls === 1, `calls=${unsafeCalls}`);

  let safeCalls = 0;
  setUserVisibleGeminiCallerForTests(async () => {
    safeCalls += 1;
    return {
      providerNetworkUsed: true,
      providerOutputFull:
        "{\"finalAnswerTh\":\"น้องเอสรุปให้แบบสั้นนะครับ คันนี้เหมาะกับการใช้งานในเมืองและเดินทางประจำวันจากข้อมูลในประกาศครับ ถ้าสะดวกน้องเอช่วยเทียบกับอีกคันให้ต่อได้ครับ\"}",
      redactedProviderOutput:
        "{\"finalAnswerTh\":\"น้องเอสรุปให้แบบสั้นนะครับ คันนี้เหมาะกับการใช้งานในเมืองและเดินทางประจำวันจากข้อมูลในประกาศครับ ถ้าสะดวกน้องเอช่วยเทียบกับอีกคันให้ต่อได้ครับ\"}",
      requestIdHash: "safe",
      modelId: "gemini-3.5-flash",
    };
  });
  const safeResult = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeResult(),
    userMessage: "ช่วยสรุปคันนี้ให้เหมาะกับใครหน่อย",
    firebaseUid: "owner-uid",
    userRole: "admin",
    environment: "staging",
    env: baseEnv,
    readEnv: readFrom(baseEnv),
    pilotOrchestration: {
      carCardCount: 1,
      recentCarCards: [
        {
          index: 1,
          brand: "Toyota",
          model: "Yaris",
          year: 2021,
          price: 499000,
          mileage: 42000,
          fuelType: "petrol",
        },
      ],
    },
  });
  ok("safe output passes post-check", safeResult.payload.realProviderGateReason === "real_provider_call_ok");
  ok("safe output path still no retry", safeCalls === 1, `calls=${safeCalls}`);

  resetUserVisibleGeminiCallerForTests();

  console.log(`\nDone v13.12 validation - ${pass} PASS, ${fail} FAIL.\n`);
  if (process.exitCode) process.exit(process.exitCode);
}

run().catch((error) => {
  console.error("v13.12 validator crashed", error);
  process.exit(1);
});
