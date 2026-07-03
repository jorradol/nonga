/**
 * v13.15M-A owner Firebase ID token acquisition guide validator
 * Guide/static validation only. No runtime mutation and no provider dispatch.
 *
 * npm run test:v13.15M-A
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

const DOC_PATH = "docs/v13.15M-A-owner-firebase-id-token-acquisition-guide.md";
const SELF_PATH = "scripts/test-v1315ma-owner-firebase-id-token-acquisition-guide.mts";

const SYNTHETIC_UID = "synthetic-owner-v1315ma";
const SAFE_FOLLOW_UP =
  "ช่วยอธิบายแบบเป็นธรรมชาติว่ารถแนวนี้เหมาะกับใคร และควรถามอะไรต่อดี";
const PRIMING_MISSING_CONTEXT =
  "ลุงมองหา Toyota Yaris ปี 2020 งบไม่แรง ใช้ในเมืองแถวรังสิต-คูคต";

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

const MISSING_KEY_ENV: Record<string, string> = { ...BASE_ENV };
delete MISSING_KEY_ENV.GEMINI_API_KEY;

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

console.log("=== v13.15M-A Owner Firebase ID Token Acquisition Guide Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ok("doc has substantial content", doc.length > 3500, `${doc.length} chars`);
ok("doc manual guide only", /manual guide only:\s*yes/i.test(doc));
ok("doc no gemini execution", /no Gemini execution:\s*yes/i.test(doc));
ok("doc no provider network", /no provider network call:\s*yes/i.test(doc));
ok("doc one-run unconsumed", /run count remains:\s*`?0\/1`?/i.test(doc));
ok("doc has acquisition method section", /Firebase ID token acquisition method/i.test(doc));
ok("doc has owner manual steps section", /Owner manual steps/i.test(doc));
ok("doc has env var section", /Recommended env var names/i.test(doc));
ok("doc has secret rule section", /Secret handling rules/i.test(doc));
ok("doc has probe plan section", /Boundary probe plan after token present/i.test(doc));
ok("doc has warning no paste token", /ห้าม paste token ลง chat/i.test(doc));
ok(
  "doc includes required operator instruction line",
  doc.includes(
    "ให้ตั้งค่า token ใน local shell/operator environment เท่านั้น แล้วรายงานกลับมาแค่ present/missing หรือ status code"
  )
);
ok(
  "doc has required env vars listed",
  /NONGA_OWNER_FIREBASE_ID_TOKEN/.test(doc) &&
    /NONGA_OPERATOR_FIREBASE_ID_TOKEN/.test(doc) &&
    /NONGA_FIREBASE_ID_TOKEN/.test(doc) &&
    /FIREBASE_ID_TOKEN/.test(doc)
);
ok(
  "doc final recommendation ready for owner setup",
  doc.includes("READY FOR OWNER TO SET FIREBASE ID TOKEN IN LOCAL OPERATOR SESSION BEFORE AUTH PROBE")
);

const forbiddenValuePatterns: Array<[string, RegExp]> = [
  ["google api key value", /\bAIza[0-9A-Za-z\-_]{20,}\b/],
  ["openai key value", /\bsk-[0-9A-Za-z\-_]{20,}\b/],
  ["bearer token value", /\bBearer\s+[A-Za-z0-9\-_\.]{20,}\b/],
  ["id token assignment", /\b(FIREBASE_ID_TOKEN|NONGA_OWNER_FIREBASE_ID_TOKEN|NONGA_OPERATOR_FIREBASE_ID_TOKEN)\b\s*[:=]\s*["'`]?[A-Za-z0-9\-_\.]{16,}/],
  ["admin token assignment", /\b(NONGA_ADMIN_API_TOKEN|VITE_NONGA_ADMIN_API_TOKEN)\b\s*[:=]\s*["'`]?[A-Za-z0-9\-_\.]{8,}/],
  ["gemini key assignment", /\bGEMINI_API_KEY\b\s*[:=]\s*["'`]?[A-Za-z0-9\-_\.]{8,}/],
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
ok("sanitized no phone/plate/vin", !hasPhonePlateVin(JSON.stringify(sanitized)));

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  throw new Error("Gemini call should not happen in v13.15M-A guide validation");
});

try {
  const prequalified = runUserVisibleOrchestrationBridge({
    userMessage: SAFE_FOLLOW_UP,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: BASE_ENV,
    pilotSessionContext: sanitized,
  });
  ok("prequal pilotPathActive true", prequalified.payload.pilotPathActive === true);
  ok("prequal fallbackToLegacy false", prequalified.payload.fallbackToLegacy === false);

  const missingContext = runUserVisibleOrchestrationBridge({
    userMessage: PRIMING_MISSING_CONTEXT,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: BASE_ENV,
  });
  const missingContextGate = await maybeApplyUserVisibleRealProvider({
    bridgeResult: missingContext,
    userMessage: PRIMING_MISSING_CONTEXT,
    firebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: BASE_ENV,
    readEnv: (key) => BASE_ENV[key],
  });
  ok(
    "missing context gate reason pilot_path_inactive",
    missingContextGate.payload.realProviderGateReason === "pilot_path_inactive"
  );
  if (missingContextGate.payload.realProviderNetwork) {
    providerNetworkCount += 1;
  }

  const missingKeyGate = await maybeApplyUserVisibleRealProvider({
    bridgeResult: {
      orchestrated: { text: "synthetic", carCards: [], skipGemini: true },
      payload: {
        sliceId: "v13.15M-A",
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
    env: MISSING_KEY_ENV,
    readEnv: (key) => MISSING_KEY_ENV[key],
    pilotOrchestration: {
      carCardCount: 2,
      recentCarCards: sanitized?.recentCarCards ?? [],
    },
  });
  ok("missing key gate reason", missingKeyGate.payload.realProviderGateReason === "missing_gemini_key");
  if (missingKeyGate.payload.realProviderNetwork) {
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
  ["second run yes", /second run:\s*yes/i],
  ["retry yes", /\bretry\b:\s*yes/i],
];
for (const [name, re] of unsafeDocClaims) {
  const hasUnsafe = lines.some(
    (line) => re.test(line) && !/\b(no|not|ยังไม่|ห้าม)\b/i.test(line)
  );
  ok(`doc no unsafe claim ${name}`, !hasUnsafe);
}

// --- static safety for guide-only script ---
const selfCode = self.split("// --- static safety for guide-only script ---")[0] ?? self;
ok("script no HTTP fetch", !/fetch\s*\(\s*[`'"]https?:/i.test(selfCode));
ok("script no deploy commands", !/firebase\s+deploy|gcloud|cloud\s+run/i.test(selfCode));
ok("script no child_process exec", !/execSync|spawnSync|child_process/i.test(selfCode));

console.log(`\nDone v13.15M-A validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
