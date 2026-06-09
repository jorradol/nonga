/**
 * v6.1L.2j — Pilot new chat no-response + permission fallback fix
 * npm run test:v61l2j-pilot-new-chat-no-response-permission-fallback
 */
import { readFileSync } from "node:fs";
import { CHAT_PATH_LEGACY_START_OVER } from "../src/services/ai/salesBrainServerChatShadowSink.ts";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_SHADOW_MODE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainUserVisibleGate.ts";
import {
  SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID,
  resolveUserVisibleChatResponse,
} from "../src/services/ai/salesBrainUserVisibleChatPath.ts";
import {
  assertNoPilotDebugMarker,
  assertPilotFollowUpCopySafe,
  buildPilotFollowUpNoContextCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import {
  resolvePilotSessionContextForFollowUp,
  type PilotGroundedCarCard,
} from "../src/services/ai/chat/chatPilotSessionContext.ts";
import {
  orchestrateUserVisibleChatForTrustedAuth,
  runUserVisibleOrchestrationBridge,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import { applyChatUserVisibleServerBridge } from "../src/services/ai/chat/chatUserVisibleOrchestrateClient.ts";

const TEST_UID = "synthetic-tester-uid-v61l2j";
const OTHER_UID = "synthetic-other-uid-v61l2j";
const COMPARE_SHORT = "เทียบคันที่ 1 กับ 2";
const NO_CONTEXT = buildPilotFollowUpNoContextCopy();

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
};

const SAMPLE_CARDS: PilotGroundedCarCard[] = [
  {
    index: 1,
    brand: "Toyota",
    model: "Vios",
    year: 2019,
    price: 390000,
    mileage: 45000,
    bodyClassLabel: "Sedan B",
  },
  {
    index: 2,
    brand: "Honda",
    model: "City",
    year: 2018,
    price: 410000,
    mileage: 52000,
    bodyClassLabel: "Sedan B",
  },
  {
    index: 3,
    brand: "Mazda",
    model: "2",
    year: 2020,
    price: 399000,
    mileage: 38000,
    bodyClassLabel: "Hatchback B",
  },
];

const bridgeSrc = readFileSync(
  "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts",
  "utf8"
);
const historySrc = readFileSync("src/services/chat/chatHistoryService.ts", "utf8");
const useChatSrc = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const clientSrc = readFileSync("src/services/ai/chat/chatUserVisibleOrchestrateClient.ts", "utf8");
const chatStoreSrc = readFileSync("src/stores/chat/chatStore.ts", "utf8");

let passed = 0;
let failed = 0;

function ok(label: string, cond: boolean): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log("v6.1L.2j — pilot new chat no-response permission fallback\n");

ok("slice id v6.1L.2j", SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID === "v6.1L.2j");
ok("bridge follow-up when no orchestrator", /runPilotFollowUpBridgeWhenNoOrchestrator/.test(bridgeSrc));
ok("history metadata local fallback", /Firestore session metadata update failed; using local history/.test(historySrc));
ok("useChat empty follow-up guard", /!orchestrated\.text\.trim\(\)/.test(useChatSrc));
ok("useChat sendMessage catch", /\[chat\] sendMessage failed/.test(useChatSrc));
ok("client rejects empty bridge text", /!json\.data\.userVisibleText\?\.trim\(\)/.test(clientSrc));
ok("chatStore title update catch", /session title update failed; continuing chat/.test(chatStoreSrc));
ok("chatStore pref local fallback", /Firestore load user pref error/.test(chatStoreSrc));

// --- server bridge: new chat compare no orchestrator ---
{
  const bridged = runUserVisibleOrchestrationBridge({
    userMessage: COMPARE_SHORT,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });
  ok("bridge no orchestrator returns text", Boolean(bridged.payload.userVisibleText?.trim()));
  ok("bridge no-context copy", bridged.payload.userVisibleText.includes("ยังไม่เห็นชุดรถล่าสุด"));
  ok("bridge no zero cars", assertPilotFollowUpCopySafe(bridged.payload.userVisibleText, 0));
  ok("bridge skip gemini", bridged.orchestrated?.skipGemini === true);
}

// --- server auth path ---
{
  const authResult = orchestrateUserVisibleChatForTrustedAuth({
    auth: { uid: TEST_UID, role: "member", displayName: "Tester", dealerId: null },
    userMessage: COMPARE_SHORT,
    inventory: [],
    env: STAGING_PILOT_ENV,
    environment: "staging",
  });
  ok("auth path no empty payload", Boolean(authResult.payload.userVisibleText?.trim()));
  ok("auth path no-context", authResult.payload.userVisibleText.includes("ยังไม่เห็นชุดรถล่าสุด"));
}

// --- same chat compare with cards ---
{
  const messages = [
    { sender: "user" as const },
    {
      sender: "ai" as const,
      carCards: SAMPLE_CARDS.map((c, i) => ({
        id: `c-${i}`,
        brand: c.brand,
        model: c.model,
        year: c.year,
        price: c.price,
        mileage: c.mileage ?? 0,
        bodyClassLabel: c.bodyClassLabel ?? "",
        color: "",
        condition: "",
        fuelType: "petrol",
        transmission: "",
        bodyClass: "",
        imageUrl: "",
        imageUrls: [],
        hasImage: false,
        detailPath: "",
        matchKind: "exact" as const,
      })),
    },
  ];
  const ctx = resolvePilotSessionContextForFollowUp(messages, "session-with-cards");
  const bridged = runUserVisibleOrchestrationBridge({
    userMessage: COMPARE_SHORT,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    pilotSessionContext: ctx,
  });
  ok("same chat compare grounded", /Vios|City|คันที่ 1/.test(bridged.payload.userVisibleText));
  ok("same chat no zero cars", assertPilotFollowUpCopySafe(bridged.payload.userVisibleText, 3));
}

// --- resolver no context ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: COMPARE_SHORT,
    legacyUserVisibleResponse: "",
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
    pilotOrchestration: { carCardCount: 0 },
  });
  ok("resolver no context copy", resolved.userVisibleText.includes("ยังไม่เห็นชุดรถล่าสุด"));
  ok("resolver no marker", assertNoPilotDebugMarker(resolved.userVisibleText));
}

// --- guest legacy ---
{
  const guest = resolveUserVisibleChatResponse({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: OTHER_UID,
  });
  ok("guest start-over exact legacy", guest.userVisibleText === CHAT_PATH_LEGACY_START_OVER);
}

// --- client apply helper type guard (static) ---
{
  ok("applyChatUserVisibleServerBridge exported", typeof applyChatUserVisibleServerBridge === "function");
  ok("no context builder stable", NO_CONTEXT.includes("งบ 4 แสน"));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
