/**
 * v13.15K owner-only Gemini UX one-run retry record validator
 * Record/static validation only. No runtime mutation and no provider dispatch.
 *
 * npm run test:v13.15K
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
import {
  sanitizePilotSessionContext,
  type PilotBuyerSessionContext,
} from "../src/services/ai/chat/chatPilotSessionContext.ts";
import { isPilotBuyerFollowUpMessage } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";

const DOC_PATH = "docs/v13.15K-owner-only-gemini-ux-one-run-retry-record.md";
const SELF_PATH = "scripts/test-v1315k-owner-only-gemini-ux-one-run-retry-record.mts";

const SYNTHETIC_UID = "synthetic-owner-v1315k";
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

console.log("=== v13.15K Owner-Only Gemini UX One-Run Retry Record Validation ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ok("doc has substantial content", doc.length > 5000, `${doc.length} chars`);
ok(
  "doc has fresh authorization phrase",
  doc.includes("FINAL EXECUTION AUTHORIZE v13.15K owner-only Gemini UX one-run retry")
);
ok("doc one-run allowed", /run count allowed:\s*`?1`?/i.test(doc));
ok("doc one-run remains 0/1", /run count executed:\s*`?0\/1`?/i.test(doc));
ok("doc no second run", /second run attempted:\s*no/i.test(doc));
ok("doc no automatic retry", /automatic retry:\s*no/i.test(doc));
ok("doc has credential readiness section", /Credential\/auth readiness evidence/i.test(doc));
ok("doc has protected route boundary section", /Protected route boundary evidence/i.test(doc));
ok("doc has key presence section", /Staging runtime `GEMINI_API_KEY` presence evidence/i.test(doc));
ok("doc has rollback section", /Rollback posture/i.test(doc));
ok("doc has final recommendation", /## 24\) Final recommendation/i.test(doc));
ok("doc final recommendation hold auth path", doc.includes("HOLD — SECURE OWNER AUTH PATH NOT READY"));

const requiredClassifications: Array<[string, RegExp]> = [
  ["secure auth required but inaccessible", /secure owner\/admin Firebase authenticated path:\s*`required but inaccessible`/i],
  ["staging key present", /staging runtime `?GEMINI_API_KEY`?:\s*`present`/i],
  ["unauth boundary 401", /unauthenticated `POST \/api\/ai\/chat-user-visible-orchestrate` -> `401`/i],
  ["health 200", /`GET \/api\/health` -> `200`/i],
  ["authenticated probe inaccessible", /authenticated owner\/operator probe -> `required but inaccessible`/i],
];
for (const [name, re] of requiredClassifications) {
  ok(`doc includes ${name}`, re.test(doc));
}

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

const rawSyntheticContext: unknown = {
  recentCarCards: [
    { index: 1, brand: "Toyota", model: "Yaris", year: 2020, price: 399000 },
    { index: 2, brand: "Honda", model: "City", year: 2020, price: 415000 },
  ],
  lastSearchBudgetMax: 420000,
};
const sanitized = sanitizePilotSessionContext(rawSyntheticContext) as
  | PilotBuyerSessionContext
  | undefined;
ok("sanitized synthetic context present", Boolean(sanitized));
ok("sanitized no phone/plate/vin", !hasPhonePlateVin(JSON.stringify(sanitized)));

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  throw new Error("Gemini call should not happen in v13.15K record validation");
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
        sliceId: "v13.15K",
        userVisibleText: "synthetic",
        pilotPathActive: true,
        fallbackToLegacy: false,
        skipGemini: true,
        carCardCount: 2,
        realProviderGateReason: "real_provider_eligible",
        realProviderNetwork: false,
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
  ["second run attempted yes", /second run attempted:\s*yes/i],
  ["automatic retry yes", /automatic retry:\s*yes/i],
];
for (const [name, re] of unsafeDocClaims) {
  const hasUnsafe = lines.some(
    (line) => re.test(line) && !/\b(no|not|ยังไม่|ห้าม)\b/i.test(line)
  );
  ok(`doc no unsafe claim ${name}`, !hasUnsafe);
}

// --- static safety for record-only script ---
const selfCode = self.split("// --- static safety for record-only script ---")[0] ?? self;
ok("script no HTTP fetch", !/fetch\s*\(\s*[`'"]https?:/i.test(selfCode));
ok("script no deploy commands", !/firebase\s+deploy|gcloud|cloud\s+run/i.test(selfCode));
ok("script no child_process exec", !/execSync|spawnSync|child_process/i.test(selfCode));

console.log(`\nDone v13.15K validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
