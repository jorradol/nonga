/**
 * v22.68 — Controlled guarded Gemini reachability recovery (Candidate S only)
 * npm run test:v22.68
 */
import {
  evaluateUserVisibleRealProviderEligibility,
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_SHADOW_MODE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainUserVisibleGate.ts";

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

const ALLOWLISTED_UID = "pilot-allowlisted-uid-v2268";
const NON_ALLOWLISTED_UID = "pilot-not-allowlisted-v2268";
const INSIDE_ZONE_MESSAGE = "มีรถ Toyota Corolla 2020 ไหม";
const OUTSIDE_ZONE_MESSAGE = "สวัสดี";
const DETERMINISTIC_BOUNDARY_MESSAGE = "ส่งเบอร์โทรของผมให้ผู้ขายได้เลย";

function env(overrides: Record<string, string | undefined> = {}): Record<string, string | undefined> {
  return {
    [NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV]: "true",
    [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "true",
    [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
    [NONGA_AI_PROVIDER_ENV]: "gemini",
    [NONGA_AI_FIRST_ENABLED_ENV]: "true",
    [NONGA_AI_MODE_ENV]: "high",
    [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
    [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "100",
    [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "1000",
    [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: ALLOWLISTED_UID,
    [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
    GEMINI_API_KEY: "test-gemini-key-present",
    ...overrides,
  };
}

function readFrom(map: Record<string, string | undefined>) {
  return (key: string): string | undefined => map[key];
}

function bridgeResult(text = "deterministic fallback text") {
  return {
    orchestrated: {
      text,
      carCards: [{ id: "corolla-2020-card" }],
      skipGemini: true,
    },
    payload: {
      userVisibleText: text,
      pilotPathActive: true,
      fallbackToLegacy: false,
      skipGemini: true,
      carCardCount: 1,
      sliceId: "test-v22.68",
    },
  };
}

async function run(): Promise<void> {
  console.log("=== v22.68 Candidate S guarded reachability recovery ===\n");

  const baseEnv = env();

  {
    const eligibility = evaluateUserVisibleRealProviderEligibility({
      firebaseUid: ALLOWLISTED_UID,
      userRole: "buyer",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
    });
    ok("1 allowlisted signed-in non-owner staging user is eligible", eligibility.eligible);
    ok(
      "1b allowlisted signed-in non-owner reason is real_provider_eligible",
      eligibility.gateReason === "real_provider_eligible"
    );
  }

  {
    const eligibility = evaluateUserVisibleRealProviderEligibility({
      firebaseUid: NON_ALLOWLISTED_UID,
      userRole: "buyer",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
    });
    ok("2 non-allowlisted signed-in non-owner remains blocked", !eligibility.eligible);
    ok("2b non-allowlisted reason is uid_not_allowlisted", eligibility.gateReason === "uid_not_allowlisted");
  }

  {
    const eligibility = evaluateUserVisibleRealProviderEligibility({
      firebaseUid: null,
      userRole: "buyer",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
    });
    ok("3 unauthenticated request remains blocked", !eligibility.eligible);
    ok("3b unauthenticated reason is guest_uid_missing", eligibility.gateReason === "guest_uid_missing");
  }

  {
    const eligibility = evaluateUserVisibleRealProviderEligibility({
      userRole: "buyer",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
    });
    ok("4 missing trusted UID remains blocked", !eligibility.eligible);
    ok("4b missing trusted UID reason is guest_uid_missing", eligibility.gateReason === "guest_uid_missing");
  }

  {
    const eligibility = evaluateUserVisibleRealProviderEligibility({
      firebaseUid: ALLOWLISTED_UID,
      userRole: "buyer",
      environment: "production",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
    });
    ok("5 production remains blocked", !eligibility.eligible);
    ok("5b production reason is production_environment", eligibility.gateReason === "production_environment");
  }

  {
    const featureOffEnv = env({ [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "false" });
    const eligibility = evaluateUserVisibleRealProviderEligibility({
      firebaseUid: ALLOWLISTED_UID,
      userRole: "buyer",
      environment: "staging",
      env: featureOffEnv,
      readEnv: readFrom(featureOffEnv),
    });
    ok("6 feature flag disabled remains blocked", !eligibility.eligible);
    ok("6b feature flag disabled reason is real_provider_flag_off", eligibility.gateReason === "real_provider_flag_off");
  }

  {
    const killSwitchEnv = env({ [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" });
    const eligibility = evaluateUserVisibleRealProviderEligibility({
      firebaseUid: ALLOWLISTED_UID,
      userRole: "buyer",
      environment: "staging",
      env: killSwitchEnv,
      readEnv: readFrom(killSwitchEnv),
    });
    ok("7 emergency kill switch remains blocked", !eligibility.eligible);
    ok("7b emergency kill switch reason is emergency_kill_switch", eligibility.gateReason === "emergency_kill_switch");
  }

  {
    let invoked = 0;
    setUserVisibleGeminiCallerForTests(async () => {
      invoked += 1;
      return {
        providerNetworkUsed: true,
        providerOutputFull: '{"finalAnswerTh":"สวัสดีครับ"}',
        redactedProviderOutput: '{"finalAnswerTh":"สวัสดีครับ"}',
        requestIdHash: "outside-zone",
        modelId: "gemini-test",
      };
    });
    const blocked = await maybeApplyUserVisibleRealProvider({
      bridgeResult: bridgeResult("outside-zone deterministic text"),
      userMessage: OUTSIDE_ZONE_MESSAGE,
      firebaseUid: ALLOWLISTED_UID,
      userRole: "buyer",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
      pilotOrchestration: { carCardCount: 1 },
    });
    ok("8 outside approved Gemini UX zone remains blocked", blocked.payload.realProviderGateReason === "owner_controlled_zone_not_allowed");
    ok("8b outside zone does not invoke provider", invoked === 0);
    resetUserVisibleGeminiCallerForTests();
  }

  {
    let invoked = 0;
    setUserVisibleGeminiCallerForTests(async () => {
      invoked += 1;
      return {
        providerNetworkUsed: true,
        providerOutputFull: '{"finalAnswerTh":"ok"}',
        redactedProviderOutput: '{"finalAnswerTh":"ok"}',
        requestIdHash: "deterministic-boundary",
        modelId: "gemini-test",
      };
    });
    const blocked = await maybeApplyUserVisibleRealProvider({
      bridgeResult: bridgeResult("deterministic-boundary fallback text"),
      userMessage: DETERMINISTIC_BOUNDARY_MESSAGE,
      firebaseUid: ALLOWLISTED_UID,
      userRole: "buyer",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
      pilotOrchestration: { carCardCount: 1 },
    });
    ok("9 deterministic boundary-sensitive request remains blocked", blocked.payload.realProviderGateReason === "deterministic_boundary_blocked");
    ok("9b deterministic boundary block does not invoke provider", invoked === 0);
    resetUserVisibleGeminiCallerForTests();
  }

  {
    setUserVisibleGeminiCallerForTests(async () => ({
      providerNetworkUsed: true,
      providerOutputFull:
        '{"finalAnswerTh":"ส่งเบอร์โทรไว้ได้เลย เดี๋ยวให้ผู้ขายติดต่อกลับทันทีครับ"}',
      redactedProviderOutput:
        '{"finalAnswerTh":"ส่งเบอร์โทรไว้ได้เลย เดี๋ยวให้ผู้ขายติดต่อกลับทันทีครับ"}',
      requestIdHash: "unsafe-provider-output",
      modelId: "gemini-test",
    }));

    const legacyText = "unsafe-output deterministic fallback";
    const blockedUnsafe = await maybeApplyUserVisibleRealProvider({
      bridgeResult: bridgeResult(legacyText),
      userMessage: INSIDE_ZONE_MESSAGE,
      firebaseUid: ALLOWLISTED_UID,
      userRole: "buyer",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
      pilotOrchestration: { carCardCount: 1 },
    });
    ok("10 unsafe Gemini output is discarded", blockedUnsafe.payload.realProviderGateReason === "real_provider_output_unsafe");
    ok("10b unsafe output keeps deterministic text", blockedUnsafe.payload.userVisibleText === legacyText);
    ok(
      "10c unsafe output keeps deterministic cards",
      Array.isArray(blockedUnsafe.orchestrated?.carCards) && blockedUnsafe.orchestrated?.carCards.length === 1
    );
    resetUserVisibleGeminiCallerForTests();
  }

  {
    setUserVisibleGeminiCallerForTests(async () => {
      throw new Error("simulated provider error");
    });
    const legacyText = "provider-error deterministic fallback";
    const providerError = await maybeApplyUserVisibleRealProvider({
      bridgeResult: bridgeResult(legacyText),
      userMessage: INSIDE_ZONE_MESSAGE,
      firebaseUid: ALLOWLISTED_UID,
      userRole: "buyer",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
      pilotOrchestration: { carCardCount: 1 },
    });
    ok("11 provider error falls back deterministically", providerError.payload.realProviderGateReason === "real_provider_call_failed");
    ok("11b provider error keeps deterministic text", providerError.payload.userVisibleText === legacyText);
    ok(
      "11c provider error keeps deterministic cards",
      Array.isArray(providerError.orchestrated?.carCards) && providerError.orchestrated?.carCards.length === 1
    );
    resetUserVisibleGeminiCallerForTests();
  }

  console.log(`\n=== v22.68 result: ${pass} passed, ${fail} failed ===`);
}

run().catch((error) => {
  resetUserVisibleGeminiCallerForTests();
  console.error(error);
  process.exitCode = 1;
});
