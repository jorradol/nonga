/**
 * v13.15N-S pilot_path_inactive diagnosis + owner helper surface prep guard
 * Static/in-memory checks only. No one-run. No provider execution.
 *
 * npm run test:v13.15N-S
 */
import { readFileSync } from "node:fs";
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

const HELPER_COMPONENT_PATH = "src/components/admin/OwnerFirebaseTokenHelperPanel.tsx";
const UID = "synthetic-owner-v1315ns";
const RUNTIME_ENV_SHADOW_MODE: Record<string, string> = {
  [NONGA_AI_PROVIDER_ENV]: "gemini",
  [NONGA_AI_MODE_ENV]: "shadow",
  [NONGA_AI_FIRST_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
  [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "1",
  [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "10",
  [NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: UID,
  GEMINI_API_KEY: "masked-present-only",
};

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

console.log("=== v13.15N-S Pilot Path Inactive Diagnosis + Surface Prep ===\n");

const helperCode = readFileSync(HELPER_COMPONENT_PATH, "utf8");
const oneRunHandlerCode =
  helperCode.match(/const handleRunOwnerGeminiOneRun = async \(\) => \{[\s\S]*?\n  \};/)?.[0] ??
  "";

ok(
  "helper synthetic prompt aligns admin route + allowed owner zone",
  /SYNTHETIC_ONE_RUN_PROMPT/.test(helperCode) &&
    /สถานะ AI/.test(helperCode) &&
    /เหมาะกับใคร/.test(helperCode) &&
    /ถามอะไรต่อดี/.test(helperCode)
);

ok(
  "helper still sends pilotSessionContext with non-empty cards",
  /pilotSessionContext:\s*SYNTHETIC_ONE_RUN_PILOT_SESSION_CONTEXT/.test(oneRunHandlerCode) &&
    /recentCarCards:\s*\[/.test(helperCode) &&
    /brand:\s*"Toyota"/.test(helperCode) &&
    /brand:\s*"Honda"/.test(helperCode)
);

ok(
  "helper keeps one-run no-retry lock and single route",
  /isOneRunConsumedInSession\(\)/.test(oneRunHandlerCode) &&
    /markOneRunConsumedInSession\(\)/.test(oneRunHandlerCode) &&
    /fetch\(OWNER_GEMINI_ONE_RUN_ROUTE,/.test(oneRunHandlerCode) &&
    !/setInterval|while\s*\(|for\s*\(/.test(oneRunHandlerCode)
);

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  throw new Error("Gemini must not execute in v13.15N-S guard");
});

try {
  const legacyPrompt = "คำถามทั่วไปที่ไม่เข้า buyer/admin route";
  const preparedPrompt =
    "สถานะ AI โหมดค้นหา: ช่วยอธิบายแบบเป็นธรรมชาติว่ารถแนวนี้เหมาะกับใคร และควรถามอะไรต่อดี";

  const pilotSessionContext = {
    recentCarCards: [
      { index: 1, brand: "Toyota", model: "Yaris Ativ", year: 2020, price: 419000 },
      { index: 2, brand: "Honda", model: "City", year: 2020, price: 449000 },
    ],
    lastSearchBudgetMax: 500000,
  } as const;

  const inactive = runUserVisibleOrchestrationBridge({
    userMessage: legacyPrompt,
    inventory: [],
    trustedFirebaseUid: UID,
    userRole: "admin",
    environment: "staging",
    env: RUNTIME_ENV_SHADOW_MODE,
    pilotSessionContext,
  });
  const inactiveApplied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: inactive,
    userMessage: legacyPrompt,
    firebaseUid: UID,
    userRole: "admin",
    environment: "staging",
    env: RUNTIME_ENV_SHADOW_MODE,
    readEnv: (key) => RUNTIME_ENV_SHADOW_MODE[key],
    pilotOrchestration: {
      carCardCount: pilotSessionContext.recentCarCards.length,
      recentCarCards: pilotSessionContext.recentCarCards,
      lastSearchBudgetMax: pilotSessionContext.lastSearchBudgetMax,
    },
  });
  ok(
    "legacy prompt remains pilot_path_inactive diagnosis",
    inactiveApplied.payload.realProviderGateReason === "pilot_path_inactive"
  );

  const preparedOnShadowMode = runUserVisibleOrchestrationBridge({
    userMessage: preparedPrompt,
    inventory: [],
    trustedFirebaseUid: UID,
    userRole: "admin",
    environment: "staging",
    env: RUNTIME_ENV_SHADOW_MODE,
    pilotSessionContext,
  });
  ok(
    "prepared prompt still inactive when NONGA_AI_MODE=shadow",
    preparedOnShadowMode.payload.pilotPathActive === false
  );

  const runtimeEnvHighMode = {
    ...RUNTIME_ENV_SHADOW_MODE,
    [NONGA_AI_MODE_ENV]: "high",
  };
  const preparedOnHighMode = runUserVisibleOrchestrationBridge({
    userMessage: preparedPrompt,
    inventory: [],
    trustedFirebaseUid: UID,
    userRole: "admin",
    environment: "staging",
    env: runtimeEnvHighMode,
    pilotSessionContext,
  });
  ok(
    "prepared prompt becomes active when NONGA_AI_MODE=high",
    preparedOnHighMode.payload.pilotPathActive === true
  );
  ok(
    "prepared prompt fallback cleared when mode is high",
    preparedOnHighMode.payload.fallbackToLegacy === false
  );
} finally {
  resetUserVisibleGeminiCallerForTests();
}

ok("gemini caller never invoked", geminiCallCount === 0, `calls=${geminiCallCount}`);

console.log(`\nDone v13.15N-S guard validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
