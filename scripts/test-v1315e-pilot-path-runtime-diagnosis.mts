/**
 * v13.15E pilot path runtime diagnosis validator
 * Diagnosis-only static/runtime-in-memory checks. No deploy, no runtime mutation.
 *
 * npm run test:v13.15E
 */
import { existsSync, readFileSync } from "node:fs";
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
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import type { PilotBuyerSessionContext } from "../src/services/ai/chat/chatPilotSessionContext.ts";

const DOC_PATH = "docs/v13.15E-pilot-path-runtime-diagnosis.md";
const SELF_PATH = "scripts/test-v1315e-pilot-path-runtime-diagnosis.mts";

const SYNTHETIC_UID = "synthetic-owner-v1315e";
const BASE_ENV: Record<string, string> = {
  [NONGA_AI_PROVIDER_ENV]: "gemini",
  [NONGA_AI_MODE_ENV]: "high",
  [NONGA_AI_FIRST_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
  [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
  [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
  [NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: SYNTHETIC_UID,
  [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "true",
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

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

console.log("=== v13.15E Pilot Path Runtime Diagnosis Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ok("doc has substantial content", doc.length > 5000, `${doc.length} chars`);
ok("doc includes condition chain section", /Exact condition chain/i.test(doc));
ok("doc includes missing runtime context section", /Missing runtime\/session\/orchestrated context/i.test(doc));
ok("doc includes static vs runtime difference", /Static path vs runtime path difference/i.test(doc));
ok("doc includes proposed minimal fix", /Proposed minimal fix|next retry preparation/i.test(doc));
ok("doc final recommendation allowed", doc.includes("READY FOR OWNER APPROVAL TO PREPARE v13.15F PILOT-PATH RUNTIME CONTEXT PATCH"));
ok("doc mentions no gemini execution", /no Gemini execution:\s*yes/i.test(doc));
ok("doc mentions no runtime config change", /no runtime config change:\s*yes/i.test(doc));
ok("doc mentions no public route activation", /no public route activation:\s*yes/i.test(doc));
ok("doc mentions no real lead", /no real lead:\s*yes/i.test(doc));
ok("doc mentions no real pii", /no real PII:\s*yes/i.test(doc));

const noSecretPatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
  ["token assignment", /\btoken\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["api key assignment", /\bapi[_-]?key\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["thai phone", /\b0[689]\d{8}\b/],
  ["vin", /\b[A-HJ-NPR-Z0-9]{17}\b/],
];
for (const [name, re] of noSecretPatterns) {
  ok(`doc no forbidden ${name}`, !re.test(doc));
}

// --- Runtime diagnosis assertions (no provider network) ---
const primingMessage = "ลุงมองหา Toyota Yaris ปี 2020 งบไม่แรง ใช้ในเมืองแถวรังสิต-คูคต";
const followUpMessage = "ช่วยอธิบายแบบเป็นธรรมชาติว่ารถแนวนี้เหมาะกับใคร และควรถามอะไรต่อดี";

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  throw new Error("Gemini should not be called in v13.15E diagnosis");
});

try {
  const bridgePriming = runUserVisibleOrchestrationBridge({
    userMessage: primingMessage,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: BASE_ENV,
  });

  ok("priming bridge pilot inactive", bridgePriming.payload.pilotPathActive === false);
  ok("priming bridge fallback true", bridgePriming.payload.fallbackToLegacy === true);

  const appliedPriming = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgePriming,
    userMessage: primingMessage,
    firebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: BASE_ENV,
    readEnv: (key) => BASE_ENV[key],
  });

  ok("priming gate reason is pilot_path_inactive", appliedPriming.payload.realProviderGateReason === "pilot_path_inactive");
  ok("priming provider network false", appliedPriming.payload.realProviderNetwork === false);

  const bridgeFollowUpNoSession = runUserVisibleOrchestrationBridge({
    userMessage: followUpMessage,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: BASE_ENV,
  });
  ok("follow-up no-session can be pilot active", bridgeFollowUpNoSession.payload.pilotPathActive === true);

  const pilotSessionContext: PilotBuyerSessionContext = {
    recentCarCards: [
      { index: 1, brand: "Toyota", model: "Yaris", year: 2020, price: 399000 },
      { index: 2, brand: "Honda", model: "City", year: 2020, price: 415000 },
    ],
    lastSearchBudgetMax: 420000,
  };

  const bridgeFollowUpWithSession = runUserVisibleOrchestrationBridge({
    userMessage: followUpMessage,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: BASE_ENV,
    pilotSessionContext,
  });
  ok("follow-up with session pilot active", bridgeFollowUpWithSession.payload.pilotPathActive === true);
} finally {
  resetUserVisibleGeminiCallerForTests();
}

ok("gemini caller never invoked", geminiCallCount === 0, `calls=${geminiCallCount}`);

// --- static safety for diagnosis-only script ---
const selfCode = self.split("// --- static safety for diagnosis-only script ---")[0] ?? self;
ok("script no HTTP fetch", !/fetch\s*\(\s*[`'"]https?:/i.test(selfCode));
ok("script no gcloud commands", !/gcloud|firebase\s+deploy|cloud\s+run/i.test(selfCode));
ok("script no child_process exec", !/execSync|spawnSync|child_process/i.test(selfCode));

const unsafeDocClaims: Array<[string, RegExp]> = [
  ["public enabled", /\bpublic\b.*\b(opened|enabled|active|released|live)\b/i],
  ["production enabled", /\bproduction\b.*\b(opened|enabled|active|released|live)\b/i],
  ["real lead sent", /\breal lead\b.*\b(sent|submitted|created)\b/i],
];
for (const [name, re] of unsafeDocClaims) {
  const hasUnsafe = lines.some((line) => re.test(line) && !/\b(no|not|ยังไม่|ห้าม)\b/i.test(line));
  ok(`doc no unsafe claim ${name}`, !hasUnsafe);
}

console.log(`\nDone v13.15E validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
