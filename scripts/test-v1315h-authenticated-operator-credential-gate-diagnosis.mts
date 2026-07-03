/**
 * v13.15H authenticated operator credential gate diagnosis validator
 * Presence-only/masked-only checks. No runtime mutation, no provider call.
 *
 * npm run test:v13.15H
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

const DOC_PATH =
  "docs/v13.15H-authenticated-operator-credential-gate-diagnosis.md";
const SELF_PATH =
  "scripts/test-v1315h-authenticated-operator-credential-gate-diagnosis.mts";

const SYNTHETIC_UID = "synthetic-owner-v1315h";
const SAFE_FOLLOW_UP =
  "ช่วยอธิบายแบบเป็นธรรมชาติว่ารถแนวนี้เหมาะกับใคร และควรถามอะไรต่อดี";
const PRIMING_MESSAGE =
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

console.log(
  "=== v13.15H Authenticated Operator Credential Gate Diagnosis Validation ===\n"
);

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ok("doc has substantial content", doc.length > 5800, `${doc.length} chars`);
ok("doc states presence-only masked-only approach", /presence-only|masked-only/i.test(doc));
ok(
  "doc classifies protected route auth requirement",
  /Protected route auth requirement/i.test(doc)
);
ok(
  "doc classifies gemini provider credential requirement",
  /Gemini provider credential requirement/i.test(doc)
);
ok(
  "doc final recommendation allowed",
  doc.includes(
    "READY FOR OWNER ACTION TO PROVIDE/CONFIRM SECURE CREDENTIAL PATH BEFORE v13.15I ONE-RUN RETRY"
  )
);
ok("doc run count unconsumed", /run count executed:\s*`?0\/1`?/i.test(doc));
ok("doc authorization consumed no", /consumed:\s*no/i.test(doc));

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

ok("safe follow-up is classified", isPilotBuyerFollowUpMessage(SAFE_FOLLOW_UP));
ok("safe follow-up no phone/plate/vin", !hasPhonePlateVin(SAFE_FOLLOW_UP));

const sanitized = sanitizePilotSessionContext({
  recentCarCards: [
    { index: 1, brand: "Toyota", model: "Yaris", year: 2020, price: 399000 },
    { index: 2, brand: "Honda", model: "City", year: 2020, price: 415000 },
  ],
  lastSearchBudgetMax: 420000,
});
ok("sanitized synthetic context present", Boolean(sanitized));

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  throw new Error("Gemini call should not happen in v13.15H diagnosis");
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
  ok("pilotPathActive true remains valid", pilotBridge.payload.pilotPathActive === true);
  ok("pilot bridge fallback false", pilotBridge.payload.fallbackToLegacy === false);

  const missingContextBridge = runUserVisibleOrchestrationBridge({
    userMessage: PRIMING_MESSAGE,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: ENV_WITH_KEY,
  });
  const missingContextGate = await maybeApplyUserVisibleRealProvider({
    bridgeResult: missingContextBridge,
    userMessage: PRIMING_MESSAGE,
    firebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: ENV_WITH_KEY,
    readEnv: (key) => ENV_WITH_KEY[key],
  });
  ok(
    "missing-context classified as pilot_path_inactive",
    missingContextGate.payload.realProviderGateReason === "pilot_path_inactive"
  );
  if (missingContextGate.payload.realProviderNetwork) {
    providerNetworkCount += 1;
  }

  const credentialMissingGate = await maybeApplyUserVisibleRealProvider({
    bridgeResult: {
      orchestrated: {
        text: "synthetic pilot response",
        carCards: [],
        skipGemini: true,
      },
      payload: {
        sliceId: "v13.15H",
        userVisibleText: "synthetic pilot response",
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
    "missing credential classified separately",
    credentialMissingGate.payload.realProviderGateReason === "missing_gemini_key"
  );
  ok(
    "missing credential not pilot_path_inactive",
    credentialMissingGate.payload.realProviderGateReason !== "pilot_path_inactive"
  );
  if (credentialMissingGate.payload.realProviderNetwork) {
    providerNetworkCount += 1;
  }
} finally {
  resetUserVisibleGeminiCallerForTests();
}

ok("gemini call count zero", geminiCallCount === 0, `calls=${geminiCallCount}`);
ok("provider network count zero", providerNetworkCount === 0, `network=${providerNetworkCount}`);

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

console.log(`\nDone v13.15H validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
