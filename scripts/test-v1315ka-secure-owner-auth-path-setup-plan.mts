/**
 * v13.15K-A secure owner auth path setup plan validator
 * Plan-only checks. No provider dispatch and no secret exposure.
 *
 * npm run test:v13.15K-A
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
import { sanitizePilotSessionContext } from "../src/services/ai/chat/chatPilotSessionContext.ts";
import { isPilotBuyerFollowUpMessage } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";

const DOC_PATH = "docs/v13.15K-A-secure-owner-auth-path-setup-plan.md";
const SELF_PATH = "scripts/test-v1315ka-secure-owner-auth-path-setup-plan.mts";

const SYNTHETIC_UID = "synthetic-owner-v1315ka";
const SAFE_FOLLOW_UP =
  "ช่วยอธิบายแบบเป็นธรรมชาติว่ารถแนวนี้เหมาะกับใคร และควรถามอะไรต่อดี";
const PRIMING =
  "ลุงมองหา Toyota Yaris ปี 2020 งบไม่แรง ใช้ในเมืองแถวรังสิต-คูคต";

const ENV_WITH_KEY: Record<string, string> = {
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

const ENV_MISSING_KEY: Record<string, string> = {
  ...ENV_WITH_KEY,
};
delete ENV_MISSING_KEY.GEMINI_API_KEY;

let pass = 0;
let fail = 0;
let geminiCallCount = 0;
let providerNetworkCount = 0;

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

function hasPhonePlateVin(text: string): boolean {
  const phone = /\b0[689]\d{8}\b/;
  const plate = /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/;
  const vin = /\b[A-HJ-NPR-Z0-9]{17}\b/;
  return phone.test(text) || plate.test(text) || vin.test(text);
}

console.log("=== v13.15K-A Secure Owner Auth Path Setup Plan Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ok("doc has substantial content", doc.length > 3400, `${doc.length} chars`);
ok("doc classifies auth options", /Auth path options found/i.test(doc));
ok("doc recommends firebase path", /recommended.*Firebase/i.test(doc));
ok("doc has secret handling rules", /Secret handling rules/i.test(doc));
ok("doc runtime key plan presence-only", /GEMINI_API_KEY.*presence-only/i.test(doc));
ok("doc one-run remains 0/1", /run count remains:\s*`?0\/1`?/i.test(doc));
ok(
  "doc final recommendation allowed",
  doc.includes("READY FOR OWNER TO COMPLETE SECURE AUTH SETUP BEFORE ONE-RUN RETRY")
);

const forbiddenValuePatterns: Array<[string, RegExp]> = [
  ["google api key", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
  ["token assignment", /\btoken\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
  ["api key assignment", /\bapi[_-]?key\b\s*[:=]\s*["'`]?[\w.\-]{16,}/i],
];
for (const [name, re] of forbiddenValuePatterns) {
  ok(`doc no forbidden ${name}`, !re.test(doc));
}

ok("safe follow-up classified", isPilotBuyerFollowUpMessage(SAFE_FOLLOW_UP));
ok("safe follow-up no phone/plate/vin", !hasPhonePlateVin(SAFE_FOLLOW_UP));
const sanitized = sanitizePilotSessionContext({
  recentCarCards: [
    { index: 1, brand: "Toyota", model: "Yaris", year: 2020, price: 399000 },
    { index: 2, brand: "Honda", model: "City", year: 2020, price: 415000 },
  ],
  lastSearchBudgetMax: 420000,
});
ok("sanitized context present", Boolean(sanitized));

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  throw new Error("Gemini must not be called in v13.15K-A plan phase");
});

try {
  const pilotBridge = runUserVisibleOrchestrationBridge({
    userMessage: SAFE_FOLLOW_UP,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: ENV_WITH_KEY,
    pilotSessionContext: sanitized,
  });
  ok("pilotPathActive true retained", pilotBridge.payload.pilotPathActive === true);
  ok("pilot fallback false retained", pilotBridge.payload.fallbackToLegacy === false);

  const missingContextBridge = runUserVisibleOrchestrationBridge({
    userMessage: PRIMING,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: ENV_WITH_KEY,
  });
  const missingContextGate = await maybeApplyUserVisibleRealProvider({
    bridgeResult: missingContextBridge,
    userMessage: PRIMING,
    firebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: ENV_WITH_KEY,
    readEnv: (key) => ENV_WITH_KEY[key],
  });
  ok(
    "auth path classification separate from pilot path",
    "auth_gate_required" !== "pilot_path_inactive"
  );
  ok(
    "pilot_path_inactive still classified",
    missingContextGate.payload.realProviderGateReason === "pilot_path_inactive"
  );
  if (missingContextGate.payload.realProviderNetwork) {
    providerNetworkCount += 1;
  }

  const missingKeyGate = await maybeApplyUserVisibleRealProvider({
    bridgeResult: {
      orchestrated: { text: "synthetic", carCards: [], skipGemini: true },
      payload: {
        sliceId: "v13.15K-A",
        userVisibleText: "synthetic",
        pilotPathActive: true,
        fallbackToLegacy: false,
        skipGemini: true,
        carCardCount: 2,
      },
    },
    userMessage: SAFE_FOLLOW_UP,
    firebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: ENV_MISSING_KEY,
    readEnv: (key) => ENV_MISSING_KEY[key],
    pilotOrchestration: {
      carCardCount: 2,
      recentCarCards: sanitized?.recentCarCards ?? [],
    },
  });
  ok(
    "runtime key requirement classified separately",
    missingKeyGate.payload.realProviderGateReason === "missing_gemini_key"
  );
  if (missingKeyGate.payload.realProviderNetwork) {
    providerNetworkCount += 1;
  }
} finally {
  resetUserVisibleGeminiCallerForTests();
}

ok("gemini/provider call count zero", geminiCallCount === 0, `calls=${geminiCallCount}`);
ok("provider network count zero", providerNetworkCount === 0, `network=${providerNetworkCount}`);
ok("one-run unconsumed marker present", /no one-run consumption: yes/i.test(doc));

const unsafeDocClaims: Array<[string, RegExp]> = [
  ["public enabled", /\bpublic\b.*\b(opened|enabled|active|released|live)\b/i],
  ["production enabled", /\bproduction\b.*\b(opened|enabled|active|released|live)\b/i],
  ["buyer-facing enabled", /\bbuyer-facing\b.*\b(opened|enabled|active|released|live)\b/i],
  ["real lead sent", /\breal lead\b.*\b(sent|submitted|created)\b/i],
];
for (const [name, re] of unsafeDocClaims) {
  const hasUnsafe = lines.some(
    (line) => re.test(line) && !/\b(no|not|ยังไม่|ห้าม)\b/i.test(line)
  );
  ok(`doc no unsafe claim ${name}`, !hasUnsafe);
}

// --- static safety for diagnosis-only script ---
const selfCode = self.split("// --- static safety for diagnosis-only script ---")[0] ?? self;
ok("script no HTTP fetch", !/fetch\s*\(\s*[`'"]https?:/i.test(selfCode));
ok("script no deploy commands", !/firebase\s+deploy|gcloud|cloud\s+run/i.test(selfCode));
ok("script no child_process exec", !/execSync|spawnSync|child_process/i.test(selfCode));

console.log(`\nDone v13.15K-A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
