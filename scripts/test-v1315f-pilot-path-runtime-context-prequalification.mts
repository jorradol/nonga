/**
 * v13.15F pilot-path runtime context prequalification validator
 * Prepare-only/static-test-only. No deploy, no runtime mutation, no provider dispatch.
 *
 * npm run test:v13.15F
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
  isPilotBuyerFollowUpMessage,
} from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import {
  sanitizePilotSessionContext,
  type PilotBuyerSessionContext,
} from "../src/services/ai/chat/chatPilotSessionContext.ts";

const DOC_PATH = "docs/v13.15F-pilot-path-runtime-context-prequalification-record.md";
const SELF_PATH = "scripts/test-v1315f-pilot-path-runtime-context-prequalification.mts";

const SYNTHETIC_UID = "synthetic-owner-v1315f";
const PREQUAL_FOLLOW_UP =
  "ช่วยอธิบายแบบเป็นธรรมชาติว่ารถแนวนี้เหมาะกับใคร และควรถามอะไรต่อดี";
const MISSING_CONTEXT_PRIMING =
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

function hasPhonePlateVin(text: string): boolean {
  const phone = /\b0[689]\d{8}\b/;
  const plate = /\b\d{1,4}[ก-ฮ]{2,4}\d{0,4}\b/;
  const vin = /\b[A-HJ-NPR-Z0-9]{17}\b/;
  return phone.test(text) || plate.test(text) || vin.test(text);
}

console.log("=== v13.15F Pilot-Path Runtime Context Prequalification ===\n");

ok("doc exists", existsSync(DOC_PATH));
const doc = normalize(readFileSync(DOC_PATH, "utf8"));
const self = normalize(readFileSync(SELF_PATH, "utf8"));
const lines = doc
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ok("doc has substantial content", doc.length > 4500, `${doc.length} chars`);
ok("doc has runtime-shaped harness section", /Runtime-shaped prequalification harness/i.test(doc));
ok("doc has synthetic recentCarCards evidence", /Synthetic `recentCarCards` evidence/i.test(doc));
ok("doc has pilotPathActive true evidence", /`pilotPathActive=true` evidence/i.test(doc));
ok(
  "doc final recommendation allowed",
  doc.includes(
    "READY FOR OWNER APPROVAL TO EXECUTE v13.15G OWNER-ONLY GEMINI UX ONE-RUN WITH PILOT-PATH CONTEXT"
  )
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

ok("follow-up message classified", isPilotBuyerFollowUpMessage(PREQUAL_FOLLOW_UP));
ok("follow-up prompt has no phone/plate/vin", !hasPhonePlateVin(PREQUAL_FOLLOW_UP));
ok("follow-up prompt no lead request", !/เบอร์|โทร|line|ติดต่อกลับ|submit lead/i.test(PREQUAL_FOLLOW_UP));

const rawSyntheticSession: unknown = {
  recentCarCards: [
    {
      index: 1,
      brand: "Toyota",
      model: "Yaris",
      year: 2020,
      price: 399000,
      description: "รถใช้งานในเมือง synthetic only ".repeat(20),
    },
    {
      index: 2,
      brand: "Honda",
      model: "City",
      year: 2020,
      price: 415000,
      fuelType: "petrol",
      bodyClassLabel: "sedan",
    },
  ],
  lastSearchBudgetMax: 420000,
};

const sanitized = sanitizePilotSessionContext(rawSyntheticSession) as
  | PilotBuyerSessionContext
  | undefined;
ok("sanitized context present", Boolean(sanitized));
ok("sanitized has cards", (sanitized?.recentCarCards.length ?? 0) >= 2);
ok("sanitized synthetic cards no phone/plate/vin", !hasPhonePlateVin(JSON.stringify(sanitized)));
ok(
  "sanitized description truncated",
  (sanitized?.recentCarCards[0]?.description?.length ?? 0) <= 201
);

const envSnapshotBefore = JSON.stringify(BASE_ENV);

setUserVisibleGeminiCallerForTests(async () => {
  geminiCallCount += 1;
  throw new Error("Gemini call is not allowed in v13.15F prepare-only");
});

try {
  const missingContextBridge = runUserVisibleOrchestrationBridge({
    userMessage: MISSING_CONTEXT_PRIMING,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: BASE_ENV,
  });

  ok("missing context pilot inactive", missingContextBridge.payload.pilotPathActive === false);
  ok("missing context fallback true", missingContextBridge.payload.fallbackToLegacy === true);

  const missingContextGate = await maybeApplyUserVisibleRealProvider({
    bridgeResult: missingContextBridge,
    userMessage: MISSING_CONTEXT_PRIMING,
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
  ok("missing context provider network false", missingContextGate.payload.realProviderNetwork === false);

  const prequalifiedBridge = runUserVisibleOrchestrationBridge({
    userMessage: PREQUAL_FOLLOW_UP,
    inventory: [],
    trustedFirebaseUid: SYNTHETIC_UID,
    userRole: "admin",
    environment: "staging",
    env: BASE_ENV,
    pilotSessionContext: sanitized,
  });
  ok("runtime-shaped prequal pilot active true", prequalifiedBridge.payload.pilotPathActive === true);
  ok("runtime-shaped prequal fallback false", prequalifiedBridge.payload.fallbackToLegacy === false);
  ok(
    "prequal response no lead request",
    !/ฝากชื่อเบอร์|ส่งเบอร์|ติดต่อกลับ|submit lead/i.test(prequalifiedBridge.payload.userVisibleText)
  );
  ok(
    "prequal response no phone/plate/vin",
    !hasPhonePlateVin(prequalifiedBridge.payload.userVisibleText)
  );
} finally {
  resetUserVisibleGeminiCallerForTests();
}

const envSnapshotAfter = JSON.stringify(BASE_ENV);
ok("gemini call count remains zero", geminiCallCount === 0, `calls=${geminiCallCount}`);
ok("runtime env map not mutated", envSnapshotBefore === envSnapshotAfter);

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

// --- static safety for prepare-only script ---
const selfCode = self.split("// --- static safety for prepare-only script ---")[0] ?? self;
ok("script no HTTP fetch", !/fetch\s*\(\s*[`'"]https?:/i.test(selfCode));
ok("script no deploy commands", !/firebase\s+deploy|gcloud|cloud\s+run/i.test(selfCode));
ok("script no child_process exec", !/execSync|spawnSync|child_process/i.test(selfCode));

console.log(`\nDone v13.15F validation - ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
