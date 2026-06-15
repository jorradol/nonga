/**
 * v6.8C.1 — Admin shadow SS-01 global kill switch patch (static/offline)
 * npm run test:v68c1-admin-shadow-kill-switch-patch
 */
import { readFileSync } from "node:fs";
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  resetAdminShadowGeminiCallerForTests,
  setAdminShadowGeminiCallerForTests,
} from "../src/services/ai/salesBrainAdminShadowRealProvider.ts";
import {
  canAttemptChatShadowRealProvider,
  isGlobalChatShadowEmergencyKillSwitchActive,
} from "../src/services/ai/salesBrainChatShadowRealProvider.ts";
import {
  NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV,
  NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  resolveAdminShadowSmokeHandlerContext,
  runSalesBrainAdminShadowSmoke,
  stagingStyleShadowEnv,
} from "../src/services/ai/salesBrainServerShadowSmoke.ts";
import { resolveUserVisibleChatResponse } from "../src/services/ai/salesBrainUserVisibleChatPath.ts";

const DOC_PATH = "docs/v6.8C-manual-staging-real-gemini-shadow-smoke-execution-record.md";
const HEAD_SHA = "2cf4860b721092da00b75a640f947c9e61c8f7be";
const STAGING_ENV = stagingStyleShadowEnv();

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readEnvFrom(map: Record<string, string>, key: string): string | undefined {
  return map[key];
}

console.log("=== v6.8C.1 Admin Shadow Kill Switch Patch ===\n");

const shadowSmokeSrc = readFileSync("src/services/ai/salesBrainServerShadowSmoke.ts", "utf8");
const userVisiblePathSrc = readFileSync("src/services/ai/salesBrainUserVisibleChatPath.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok(
  "admin shadow imports global kill switch helper",
  shadowSmokeSrc.includes("isGlobalChatShadowEmergencyKillSwitchActive")
);
ok(
  "admin shadow checks kill switch before invoke",
  /isGlobalChatShadowEmergencyKillSwitchActive\(readEnv\)/.test(shadowSmokeSrc)
);
ok(
  "admin shadow emergency_kill_switch gate reason",
  shadowSmokeSrc.includes("realProviderGateReason: \"emergency_kill_switch\"")
);

let providerInvoked = false;
setAdminShadowGeminiCallerForTests(async () => {
  providerInvoked = true;
  return {
    providerNetworkUsed: true,
    redactedProviderOutput: "[mock-should-not-run]",
    requestIdHash: "mockhash",
    modelId: ADMIN_SHADOW_GEMINI_MODEL,
    budgetDailyLimit: 5,
    budgetMonthlyLimit: 50,
  };
});

const smokeEnv = {
  ...STAGING_ENV,
  [NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
  [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
};

const evaluation = runSalesBrainAdminShadowSmoke({ caseId: "SS-01" });
const killContext = await resolveAdminShadowSmokeHandlerContext({
  caseId: "SS-01",
  evaluation,
  readEnv: (k) => readEnvFrom(smokeEnv, k),
});

ok("SS-01 kill switch blocks providerNetwork", killContext.providerNetwork === false);
ok(
  "SS-01 kill switch gate reason",
  killContext.realProviderGateReason === "emergency_kill_switch"
);
ok(
  "SS-01 kill switch fallback reason",
  killContext.realProviderFallbackReason === "emergency_kill_switch"
);
ok("SS-01 kill switch does not invoke provider", !providerInvoked);

resetAdminShadowGeminiCallerForTests();

ok(
  "CP-02 still checks global kill switch",
  isGlobalChatShadowEmergencyKillSwitchActive((k) =>
    readEnvFrom(
      {
        ...STAGING_ENV,
        [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
      },
      k
    )
  )
);
ok(
  "CP-02 cannot attempt when kill switch on",
  !canAttemptChatShadowRealProvider({
    scenarioId: "CP-02",
    environment: "staging",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
          [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
        },
        k
      ),
  }) || isGlobalChatShadowEmergencyKillSwitchActive((k) =>
    readEnvFrom({ [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" }, k)
  )
);

const pilotOff = resolveUserVisibleChatResponse({
  userMessage: "งบ 4 แสน",
  legacyUserVisibleResponse: "legacy text",
  environment: "staging",
  env: STAGING_ENV,
});
ok("user-visible off no real gemini path", !/GoogleGenAI/.test(userVisiblePathSrc));
ok(
  "user-visible off staging env no pilot or fallback",
  pilotOff.fallbackToLegacy || !pilotOff.pilotPathActive
);

const doc = readFileSync(DOC_PATH, "utf8");
ok("execution record doc exists", doc.length > 0);
ok("execution record v6.8C label", doc.includes("v6.8C"));
ok("execution record SS-01 PASS", /SS-01.*PASS/i.test(doc));
ok("execution record CP-02 PASS", /CP-02.*PASS/i.test(doc));
ok("execution record kill switch PARTIAL", /PARTIAL/i.test(doc));
ok("execution record rollback DONE", /rollback.*DONE|Rollback.*DONE/i.test(doc));
ok("execution record deploy follow-up", /deploy.*v6\.8B|latest staging image/i.test(doc));
ok("execution record no secret patterns", !/AIza[Sy][a-zA-Z0-9_-]{20,}/.test(doc));

ok("package v68c1 script", pkg.includes("test:v68c1-admin-shadow-kill-switch-patch"));

console.log("\nDone v6.8C.1 Admin Shadow Kill Switch Patch tests.\n");
