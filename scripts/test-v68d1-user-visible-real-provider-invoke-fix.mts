/**
 * v6.8D.1 — User-visible real Gemini invoke fix (offline/static)
 * npm run test:v68d1-user-visible-real-provider-invoke-fix
 */
import { readFileSync } from "node:fs";
import {
  buildProviderRequest,
  resolveRealProviderConfig,
} from "../src/services/ai/salesBrainRealProvider.ts";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_SHADOW_MODE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainUserVisibleGate.ts";
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  ADMIN_SHADOW_GEMINI_REQUEST_SHAPE,
} from "../src/services/ai/salesBrainAdminShadowRealProvider.ts";
import {
  buildUserVisibleGeminiCombinedPrompt,
  enrichUserVisibleAdapterInputWithListingContext,
  evaluateUserVisibleRealProviderEligibility,
  maybeApplyUserVisibleRealProvider,
  redactUserVisibleRealProviderError,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
  USER_VISIBLE_GEMINI_REQUEST_SHAPE,
  USER_VISIBLE_REAL_GEMINI_MODEL,
  USER_VISIBLE_FINAL_ANSWER_MARKER,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  resolvePilotOrchestrationHint,
  runUserVisibleOrchestrationBridge,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const DOC_PATH = "docs/v6.8D-manual-staging-allowlist-pilot-partial-execution-record.md";
const REAL_PROVIDER_SRC = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const BRIDGE_SRC = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const TEST_UID = "synthetic-allowlisted-uid-v68d1";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const FINANCE_MSG = "ผ่อนประมาณเท่าไหร่ได้ไหม";

const STAGING_PILOT_ENV: Record<string, string> = {
  [NONGA_AI_PROVIDER_ENV]: "gemini",
  [NONGA_AI_MODE_ENV]: "high",
  [NONGA_AI_FIRST_ENABLED_ENV]: "true",
  [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
  [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
  [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
  [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: TEST_UID,
  [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "true",
  GEMINI_API_KEY: "mounted-secret-present",
};

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readEnvFrom(map: Record<string, string>, key: string): string | undefined {
  return map[key];
}

console.log("=== v6.8D.1 User-visible Real Provider Invoke Fix ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const realProviderSrc = readFileSync(REAL_PROVIDER_SRC, "utf8");
const bridgeSrc = readFileSync(BRIDGE_SRC, "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v68d1-user-visible-real-provider-invoke-fix.mts", "utf8");

// --- partial execution record ---
{
  ok("partial record doc exists", doc.length > 800);
  ok("partial record v6.8D label", doc.includes("v6.8D"));
  ok("partial record PARTIAL result", /PARTIAL/i.test(doc));
  ok("partial record rollback", /rollback/i.test(doc));
  ok("partial record v68d1 next", /v6\.8D\.1/i.test(doc));
}

// --- request shape aligned with admin shadow ---
{
  ok("user-visible request shape constant", USER_VISIBLE_GEMINI_REQUEST_SHAPE.includes("merged"));
  ok("same model as admin shadow", USER_VISIBLE_REAL_GEMINI_MODEL === ADMIN_SHADOW_GEMINI_MODEL);
  ok("source no config.systemInstruction", !/config:\s*\{[^}]*systemInstruction/s.test(realProviderSrc));
  ok("source merged prompt helper", realProviderSrc.includes("buildUserVisibleGeminiCombinedPrompt"));
  ok("admin shadow shape documented", ADMIN_SHADOW_GEMINI_REQUEST_SHAPE.includes("sdk_contents"));
}

// --- combined prompt ---
{
  const prompt = buildUserVisibleGeminiCombinedPrompt(BUYER_MSG, { carCardCount: 2 });
  ok("combined prompt includes listing guard copy", prompt.includes("ข้อมูล listing"));
  ok("combined prompt includes user message", prompt.includes("ข้อความผู้ใช้"));
  ok("combined prompt thai system role", prompt.includes("น้องเอ"));
}

// --- finance preflight listing context ---
{
  const base = {
    userMessage: FINANCE_MSG,
    userRole: "buyer" as const,
    aiMode: "high" as const,
    provider: "real" as const,
    paidProvider: "gemini" as const,
  };
  const config = {
    ...resolveRealProviderConfig(base, "gemini"),
    networkEnabled: true,
    userVisibleRouteOnly: true,
  };
  try {
    buildProviderRequest(base, config);
    ok("finance without listing throws", false);
  } catch {
    ok("finance without listing throws", true);
  }

  const enriched = enrichUserVisibleAdapterInputWithListingContext(base, {
    carCardCount: 2,
    recentCarCards: [
      {
        index: 1,
        brand: "Toyota",
        model: "Vios",
        year: 2020,
        price: 350000,
      },
    ],
  });
  try {
    buildProviderRequest(enriched, config);
    ok("finance with pilot cards preflight ok", true);
  } catch (e) {
    ok("finance with pilot cards preflight ok", false, e instanceof Error ? e.message : "");
  }
}

// --- redacted error diagnostics ---
{
  const diag = redactUserVisibleRealProviderError(
    new Error("Gemini failed AIzaSyFAKEKEY1234567890abcdef for Bearer tok_live_secret")
  );
  ok("diag slice id", diag.sliceId === "v6.8D");
  ok("diag route user-visible", diag.route === "user-visible");
  ok("diag model id", diag.modelId === USER_VISIBLE_REAL_GEMINI_MODEL);
  ok("diag redacts api key", !diag.errorMessageRedacted.includes("AIzaSy"));
  ok("diag redacts bearer", !/Bearer\s+tok/i.test(diag.errorMessageRedacted));
  ok("source logs redacted failure", realProviderSrc.includes("logUserVisibleRealProviderFailure"));
  ok("source exports redact helper", realProviderSrc.includes("redactUserVisibleRealProviderError"));
}

// --- bridge passes orchestrated card count to real provider ---
{
  ok("bridge exports resolvePilotOrchestrationHint", bridgeSrc.includes("export function resolvePilotOrchestrationHint"));
  ok("bridge merges orchestrated hint", bridgeSrc.includes("pilotOrchestrationForRealProvider"));
  const sampleCard = {
    id: "c1",
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 350000,
    mileage: 50000,
    bodyClass: "sedan",
    bodyClassLabel: "รถเก๋ง",
    hasImage: true,
    detailPath: "/cars/c1",
    matchKind: "exact" as const,
  };
  const hint = resolvePilotOrchestrationHint(
    {
      text: "mock",
      carCards: [sampleCard, { ...sampleCard, id: "c2" }],
      skipGemini: true,
    },
    undefined
  );
  ok("orchestrated hint car count", hint.carCardCount === 2);
}

// --- eligibility gates unchanged ---
{
  const e = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("allowlisted eligible", e.eligible === true);

  const guest = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: undefined,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("guest blocked", !guest.eligible && guest.gateReason === "guest_uid_missing");

  const kill = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_PILOT_ENV, [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" },
    readEnv: (k) => readEnvFrom({ ...STAGING_PILOT_ENV, [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" }, k),
  });
  ok("kill switch blocked", !kill.eligible);
}

// --- maybeApply success + fallback ---
{
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: `${USER_VISIBLE_FINAL_ANSWER_MARKER} สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ`,
    requestIdHash: "mockhashv68d1",
    modelId: USER_VISIBLE_REAL_GEMINI_MODEL,
  }));

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: BUYER_MSG,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });
  const pilotBridge = {
    ...bridge,
    payload: {
      ...bridge.payload,
      pilotPathActive: true,
      fallbackToLegacy: false,
      userVisibleText: bridge.payload.userVisibleText || "น้องเอช่วยหารถในงบที่คุยกันครับ",
      carCardCount: 2,
    },
  };

  const applied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: pilotBridge,
    userMessage: BUYER_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
    pilotOrchestration: { carCardCount: 2 },
  });
  ok("caller success network true", applied.payload.realProviderNetwork === true);
  ok("caller success gate ok", applied.payload.realProviderGateReason === "real_provider_call_ok");
  resetUserVisibleGeminiCallerForTests();
}

{
  setUserVisibleGeminiCallerForTests(async () => {
    throw new Error("simulated provider failure");
  });

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: BUYER_MSG,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });
  const pilotBridge = {
    ...bridge,
    payload: {
      ...bridge.payload,
      pilotPathActive: true,
      fallbackToLegacy: false,
      userVisibleText: "น้องเอช่วยหารถในงบที่คุยกันครับ",
      carCardCount: 2,
    },
  };

  const applied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: pilotBridge,
    userMessage: BUYER_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("caller throw fallback mock", applied.payload.userVisibleText.includes("น้องเอ"));
  ok("caller throw network false", applied.payload.realProviderNetwork === false);
  ok("caller throw gate failed", applied.payload.realProviderGateReason === "real_provider_call_failed");
  resetUserVisibleGeminiCallerForTests();
}

// --- no secrets in touched sources ---
{
  for (const src of [doc, realProviderSrc, bridgeSrc]) {
    for (const pat of SECRET_PATTERNS) {
      ok(`no secret pattern ${pat.source.slice(0, 12)}`, !pat.test(src));
    }
  }
}

// --- static script ---
{
  const selfCode = selfSrc.split("// --- static script ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package ---
{
  ok("package v68d1 script", pkg.includes("test:v68d1-user-visible-real-provider-invoke-fix"));
}

console.log("\nDone v6.8D.1 User-visible Real Provider Invoke Fix tests.\n");
if (process.exitCode) process.exit(process.exitCode);
