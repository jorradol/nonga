/**
 * Runtime attribution diagnostic contract (offline/static)
 * npm run test:runtime-attribution-diagnostic
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
  buildUserVisibleRuntimeAttributionDiagnostic,
  runUserVisibleOrchestrationBridge,
  serializeRuntimeAttributionDiagnosticForStructuredLog,
  type RedactedUserVisibleOrchestrationPayload,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  buildUserVisibleStructuredOutputJson,
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";

const TEST_UID = "runtime-attribution-allowlisted-uid";
const FULL_UID = "abcdefghijklmnopqrstuvwxyz012345";
const SECRET_TOKEN = "AIzaSyDUMMY_SECRET_TOKEN_SHOULD_NOT_LEAK_1234567890";
const USER_MESSAGE = "สองคันแรกต่างกันอย่างไร";

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
  {
    index: 2,
    brand: "Honda",
    model: "City",
    year: 2021,
    price: 599000,
    mileage: 38000,
    fuelType: "เบนซิน",
    bodyClassLabel: "Sedan",
    description: "สภาพตามประกาศ",
  },
];

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{12,}/i,
  /Authorization/i,
  /GEMINI_API_KEY/i,
  /mounted-secret-present/,
  new RegExp(FULL_UID),
  new RegExp(USER_MESSAGE),
  /conversationHistory/i,
  /userMessage/i,
];

function ok(name: string, pass: boolean, detail = ""): void {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function basePayload(
  overrides: Partial<RedactedUserVisibleOrchestrationPayload> = {}
): RedactedUserVisibleOrchestrationPayload {
  return {
    sliceId: "v6.1L.2c",
    userVisibleText: "deterministic orchestrator text",
    pilotPathActive: true,
    fallbackToLegacy: false,
    skipGemini: false,
    carCardCount: 2,
    ...overrides,
  };
}

function assertNoSensitiveLeakage(serialized: string, label: string): void {
  for (const pattern of SECRET_PATTERNS) {
    ok(`${label} no leakage ${pattern}`, !pattern.test(serialized));
  }
}

async function testProviderSuccess() {
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    providerOutputFull: buildUserVisibleStructuredOutputJson(
      "คันแรกเป็น Toyota Corolla ปี 2020 ราคา 589,000 บาท ส่วนคันที่สองเป็น Honda City ปี 2021 ราคา 599,000 บาท ครับ"
    ),
    redactedProviderOutput: "[redacted]",
    requestIdHash: "attr-success",
    modelId: "gemini-3.5-flash",
  }));

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: USER_MESSAGE,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: AI_FIRST_ENV,
    pilotSessionContext: { recentCarCards: SAMPLE_CARDS },
  });
  const upgraded = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridge,
    userMessage: USER_MESSAGE,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    environment: "staging",
    env: AI_FIRST_ENV,
    readEnv: (key) => AI_FIRST_ENV[key],
  });
  const payload = {
    ...upgraded.payload,
    userVisibleRuntimeDiagnostic: {
      runtimeMode: "high",
      provider: "gemini",
      userVisibleEnabled: true,
      realProviderEnabled: true,
      ownerControlledUxEnabled: true,
      aiFirstEnabled: true,
      aiFirstPathActive: true,
      aiFirstSliceId: "epic-b",
      pilotContextPresentServer: true,
      serverRecentCarCardsCount: 2,
      followUpMessage: true,
      pilotInactiveReason: "pilot_active",
      guardPolicyVersion: "v1",
      thaiUxTuningSliceId: "v1",
      thaiUxTuningActive: true,
      targetAnswerLengthGuidance: "short",
      leadPiiCueGuardActive: true,
      phoneEchoGuardActive: true,
      safeConfirmationStepWordingActive: true,
    },
  };
  const diagnostic = buildUserVisibleRuntimeAttributionDiagnostic({
    requestCorrelationId: "corr-provider-success",
    payload,
    userMessage: USER_MESSAGE,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    orchestratedCarCardCount: bridge.orchestrated?.carCards?.length ?? 0,
    environment: "staging",
    env: AI_FIRST_ENV,
  });

  ok("provider success invocation attempted", diagnostic.realProviderInvocationAttempted === true);
  ok("provider success network true", diagnostic.realProviderNetwork === true);
  ok("provider success textSource provider", diagnostic.textSource === "provider");
  ok("provider success fallback false", diagnostic.fallbackUsed === false);
  ok("provider success safety accepted", diagnostic.safetyResult === "accepted");

  resetUserVisibleGeminiCallerForTests();
}

function testProviderGated() {
  const diagnostic = buildUserVisibleRuntimeAttributionDiagnostic({
    requestCorrelationId: "corr-provider-gated",
    payload: basePayload({
      pilotPathActive: false,
      realProviderNetwork: false,
      realProviderGateReason: "pilot_path_inactive",
      userVisibleRuntimeDiagnostic: {
        runtimeMode: "high",
        provider: "gemini",
        userVisibleEnabled: true,
        realProviderEnabled: true,
        ownerControlledUxEnabled: true,
        aiFirstEnabled: true,
        aiFirstPathActive: false,
        aiFirstSliceId: "epic-b",
        pilotContextPresentServer: true,
        serverRecentCarCardsCount: 2,
        followUpMessage: true,
        pilotInactiveReason: "real_provider_gate_pilot_path_inactive",
        guardPolicyVersion: "v1",
        thaiUxTuningSliceId: "v1",
        thaiUxTuningActive: true,
        targetAnswerLengthGuidance: "short",
        leadPiiCueGuardActive: true,
        phoneEchoGuardActive: true,
        safeConfirmationStepWordingActive: true,
      },
    }),
    userMessage: USER_MESSAGE,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    orchestratedCarCardCount: 2,
    environment: "staging",
    env: { ...AI_FIRST_ENV, [NONGA_AI_FIRST_ENABLED_ENV]: "false" },
  });

  ok("provider gated network false", diagnostic.realProviderNetwork === false);
  ok("provider gated reason present", diagnostic.realProviderGateReason === "pilot_path_inactive");
  ok("provider gated invocation not attempted", diagnostic.realProviderInvocationAttempted === false);

  const serialized = serializeRuntimeAttributionDiagnosticForStructuredLog({
    ...diagnostic,
    requestCorrelationId: "corr-redaction-gated",
  });
  assertNoSensitiveLeakage(serialized, "provider gated");
}

async function testProviderUnsafe() {
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    providerOutputFull: buildUserVisibleStructuredOutputJson("สั้น"),
    redactedProviderOutput: "[redacted]",
    requestIdHash: "attr-unsafe",
    modelId: "gemini-3.5-flash",
  }));

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: USER_MESSAGE,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: AI_FIRST_ENV,
    pilotSessionContext: { recentCarCards: SAMPLE_CARDS },
  });
  const upgraded = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridge,
    userMessage: USER_MESSAGE,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    environment: "staging",
    env: AI_FIRST_ENV,
    readEnv: (key) => AI_FIRST_ENV[key],
  });
  const diagnostic = buildUserVisibleRuntimeAttributionDiagnostic({
    requestCorrelationId: "corr-provider-unsafe",
    payload: {
      ...upgraded.payload,
      userVisibleRuntimeDiagnostic: {
        runtimeMode: "high",
        provider: "gemini",
        userVisibleEnabled: true,
        realProviderEnabled: true,
        ownerControlledUxEnabled: true,
        aiFirstEnabled: true,
        aiFirstPathActive: true,
        aiFirstSliceId: "epic-b",
        pilotContextPresentServer: true,
        serverRecentCarCardsCount: 2,
        followUpMessage: true,
        pilotInactiveReason: "pilot_active",
        guardPolicyVersion: "v1",
        thaiUxTuningSliceId: "v1",
        thaiUxTuningActive: true,
        targetAnswerLengthGuidance: "short",
        leadPiiCueGuardActive: true,
        phoneEchoGuardActive: true,
        safeConfirmationStepWordingActive: true,
      },
    },
    userMessage: USER_MESSAGE,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    orchestratedCarCardCount: bridge.orchestrated?.carCards?.length ?? 0,
    environment: "staging",
    env: AI_FIRST_ENV,
  });

  ok("provider unsafe safety rejected", diagnostic.safetyResult === "rejected");
  ok("provider unsafe fallback true", diagnostic.fallbackUsed === true);
  ok(
    "provider unsafe textSource orchestrator or fallback",
    diagnostic.textSource === "orchestrator" || diagnostic.textSource === "fallback"
  );

  resetUserVisibleGeminiCallerForTests();
}

function testDeterministicOnly() {
  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: "วันนี้ต้องการรถไว้ขับไปทำงานครับ",
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
      {
        id: "car-2",
        brand: "Honda",
        model: "City",
        year: 2021,
        price: 599000,
        mileage: 38000,
        fuelType: "เบนซิน",
        title: "Honda City 2021",
      },
    ],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: AI_FIRST_ENV,
  });
  const diagnostic = buildUserVisibleRuntimeAttributionDiagnostic({
    requestCorrelationId: "corr-deterministic-only",
    payload: {
      ...bridge.payload,
      userVisibleRuntimeDiagnostic: {
        runtimeMode: "high",
        provider: "gemini",
        userVisibleEnabled: true,
        realProviderEnabled: true,
        ownerControlledUxEnabled: true,
        aiFirstEnabled: true,
        aiFirstPathActive: true,
        aiFirstSliceId: "epic-b",
        pilotContextPresentServer: false,
        serverRecentCarCardsCount: 0,
        followUpMessage: false,
        pilotInactiveReason: "pilot_active",
        guardPolicyVersion: "v1",
        thaiUxTuningSliceId: "v1",
        thaiUxTuningActive: true,
        targetAnswerLengthGuidance: "short",
        leadPiiCueGuardActive: true,
        phoneEchoGuardActive: true,
        safeConfirmationStepWordingActive: true,
      },
    },
    userMessage: "วันนี้ต้องการรถไว้ขับไปทำงานครับ",
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: {
      carCardCount: bridge.orchestrated?.carCards?.length ?? 0,
      recentCarCards: [],
    },
    orchestratedCarCardCount: bridge.orchestrated?.carCards?.length ?? 0,
    environment: "staging",
    env: AI_FIRST_ENV,
  });

  ok("deterministic network false", diagnostic.realProviderNetwork === false);
  ok(
    "deterministic textSource orchestrator",
    diagnostic.textSource === "orchestrator",
    `got ${diagnostic.textSource} gate=${diagnostic.realProviderGateReason}`
  );
  ok("deterministic candidate count", diagnostic.candidateCount >= 1);
  ok(
    "deterministic grounding count",
    diagnostic.groundingVehicleCount === (bridge.orchestrated?.carCards?.length ?? 0)
  );
}

function testDiagnosticSerialization() {
  const diagnostic = buildUserVisibleRuntimeAttributionDiagnostic({
    requestCorrelationId: "corr-serialization",
    payload: basePayload({
      realProviderNetwork: false,
      realProviderGateReason: "missing_gemini_key",
      userVisibleRuntimeDiagnostic: {
        runtimeMode: "high",
        provider: "gemini",
        userVisibleEnabled: true,
        realProviderEnabled: true,
        ownerControlledUxEnabled: true,
        aiFirstEnabled: true,
        aiFirstPathActive: true,
        aiFirstSliceId: "epic-b",
        pilotContextPresentServer: false,
        serverRecentCarCardsCount: 0,
        followUpMessage: false,
        pilotInactiveReason: "pilot_active",
        guardPolicyVersion: "v1",
        thaiUxTuningSliceId: "v1",
        thaiUxTuningActive: true,
        targetAnswerLengthGuidance: "short",
        leadPiiCueGuardActive: true,
        phoneEchoGuardActive: true,
        safeConfirmationStepWordingActive: true,
      },
    }),
    userMessage: USER_MESSAGE,
    firebaseUid: FULL_UID,
    userRole: "buyer",
    environment: "staging",
    env: { ...AI_FIRST_ENV, GEMINI_API_KEY: SECRET_TOKEN },
  });

  const serialized = serializeRuntimeAttributionDiagnosticForStructuredLog(diagnostic);
  ok("serialization emits event marker", serialized.includes("user_visible_runtime_attribution"));
  assertNoSensitiveLeakage(serialized, "serialization");
  ok("serialization keeps correlation id", serialized.includes("corr-serialization"));
}

async function main() {
  console.log("=== Runtime Attribution Diagnostic Contract ===\n");
  await testProviderSuccess();
  testProviderGated();
  await testProviderUnsafe();
  testDeterministicOnly();
  testDiagnosticSerialization();
  console.log("\n=== Runtime Attribution Diagnostic Contract complete ===");
}

main().catch((err) => {
  console.error("[runtime-attribution] FAIL", err);
  process.exit(1);
});
