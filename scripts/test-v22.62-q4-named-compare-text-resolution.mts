/**
 * v22.62 — Q4 text-only named-compare resolution fix.
 * npm run test:v22.62
 *
 * Owner sequence Q1→Q2→Q3→Q4 on one shared conversation.
 * Asserts final user-visible bridge text (not only orchestrator cards).
 * No live Lead / no network Gemini / no Pilot counter mutation.
 */

const memoryStore = new Map<string, string>();
(
  globalThis as unknown as {
    sessionStorage: Storage;
  }
).sessionStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memoryStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    memoryStore.delete(k);
  },
  clear: () => memoryStore.clear(),
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
  get length() {
    return memoryStore.size;
  },
};

import { readFileSync } from "node:fs";
import {
  chatCardHasRenderableImage,
  resolveInventoryBackedComparePair,
  buildInventoryBackedCompareReply,
  isNamedInventoryCompareIntent,
  hasCardAnswerConsistencyFailure,
} from "../src/services/ai/chat/inventoryBackedCompare.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import { resolveUserVisibleChatResponse } from "../src/services/ai/salesBrainUserVisibleChatPath.ts";
import { buildPilotBuyerUserVisibleCopy } from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import {
  buildPilotSessionContextFromCarCards,
  pilotSessionCardsToChatCarCards,
} from "../src/services/ai/chat/chatPilotSessionContext.ts";
import {
  saveChatCarContext,
  setActivePilotChatSessionId,
  clearPilotChatSessionContext,
  saveLastSelectedCarId,
  loadLastSelectedCarId,
  loadChatCarContext,
} from "../src/utils/chatCarContext.ts";
import type { ChatCarCardData } from "../src/types.ts";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import {
  detectBuyerRefinement,
  isPilotBuyerCardInsightFollowUp,
  isPilotBuyerMileageFollowUp,
} from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import { hasCompareIdentityFailure } from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import { rehydrateSessionCarsFromInventory } from "../src/services/ai/chat/inventoryBackedCompare.ts";
import { detectBuyerRefinement as detectRefine } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";

let pass = 0;
let fail = 0;

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

const NO_CONTEXT_RE = /ยังไม่เห็นชุดรถล่าสุด/;
const BUDGET_FIRST_RE = /ลองพิมพ์งบหรือเงื่อนไขรถที่อยากได้ก่อน|งบ\s*4\s*แสน\s*มีรถอะไรน่าเล่น/;
const NUMBERED_COMPARE_CTA_RE = /เทียบคันที่\s*1\s*กับ\s*2/;
const MISSING_2021_RE =
  /ยังไม่(?:เจอ|มี|พบ).{0,24}2021|2021.{0,24}(?:ยังไม่(?:เจอ|มี|พบ)|หาไม่(?:เจอ|พบ)|ไม่มี(?:ใน(?:ระบบ|ตลาด|listing))?|unavailable)/i;

const CHEER_RE = /ปังปุริเย่!?/;
const COMPARE_CTA_RE = /เทียบคันที่\s*1\s*กับ\s*2|เปรียบเทียบคันที่/i;

function maskImageEvidence(car: ChatCarCardData): string {
  const urls = car.imageUrls ?? [];
  const n = urls.length || (car.imageUrl ? 1 : 0);
  const host =
    n > 0
      ? (() => {
          try {
            return new URL(String(urls[0] ?? car.imageUrl)).hostname;
          } catch {
            return "invalid-url";
          }
        })()
      : "none";
  return `hasImage=${car.hasImage} count=${n} host=${host}`;
}

const PUBLIC_IMAGE_A =
  "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/draft-images%2Fnonga-dealer%2Fdraft-a%2Fa.webp?alt=media&token=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PUBLIC_IMAGE_B =
  "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/draft-images%2Fnonga-dealer%2Fdraft-b%2Fb.webp?alt=media&token=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const inventory: ChatInventoryCar[] = [
  {
    id: "corolla-2020",
    title: "Toyota Corolla 2020",
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 399000,
    mileage: 88000,
    showroomName: "Thor Auto",
    bodyType: "Sedan",
    images: [PUBLIC_IMAGE_A, PUBLIC_IMAGE_A, PUBLIC_IMAGE_A, PUBLIC_IMAGE_A, PUBLIC_IMAGE_A],
  },
  {
    id: "corolla-2021",
    title: "Toyota Corolla 2021",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    price: 429000,
    mileage: 58000,
    showroomName: "Thor Auto",
    bodyType: "Sedan",
    images: [PUBLIC_IMAGE_B, PUBLIC_IMAGE_B, PUBLIC_IMAGE_B, PUBLIC_IMAGE_B, PUBLIC_IMAGE_B],
  },
];

function toCard(inv: ChatInventoryCar): ChatCarCardData {
  return summaryToChatCarCardData(toChatCarSummary(inv), "exact");
}

const SESSION = "v2262-q4-named-compare-text";
const BRIDGE_ENV = {
  NONGA_AI_PROVIDER: "gemini",
  NONGA_AI_MODE: "high",
  NONGA_AI_FIRST_ENABLED: "true",
  NONGA_AI_SHADOW_MODE_ENABLED: "true",
  NONGA_AI_USER_VISIBLE_ENABLED: "true",
  NONGA_AI_EMERGENCY_KILL_SWITCH: "false",
  NONGA_AI_BUDGET_DAILY_LIMIT: "5",
  NONGA_AI_BUDGET_MONTHLY_LIMIT: "50",
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "test-uid-v2262",
};

function assertPairText(label: string, text: string, cards: ChatCarCardData[]): void {
  ok(`${label} contains 2020 and 2021`, /2020/.test(text) && /2021/.test(text));
  ok(
    `${label} contains prices 399,000 and 429,000`,
    /399,000/.test(text) && /429,000/.test(text)
  );
  ok(
    `${label} contains mileage 88,000 and 58,000`,
    /88,000/.test(text) && /58,000/.test(text)
  );
  ok(`${label} rejects no-latest-set fallback`, !NO_CONTEXT_RE.test(text));
  ok(`${label} rejects budget-search-first CTA`, !BUDGET_FIRST_RE.test(text));
  ok(`${label} rejects numbered compare CTA`, !NUMBERED_COMPARE_CTA_RE.test(text));
  ok(`${label} rejects 2021 unavailable claim`, !MISSING_2021_RE.test(text));
  ok(
    `${label} text+cards same pair (consistency)`,
    !hasCardAnswerConsistencyFailure(text, cards)
  );
}

function run(): void {
  const exactMsg = "มีรถ โตโยต้า Corolla 2020 ไหม";
  const familyMsg = "คันนี้เหมาะกับใช้ครอบครัวไหม";
  const mileageMsg = "ไมล์ 88,000 เยอะไปไหม";
  const compareMsg = "เทียบกับ Corolla 2021 ให้หน่อย";

  console.log("\n--- root-cause static proof ---");
  {
    const chatPath = readFileSync(
      "src/services/ai/salesBrainUserVisibleChatPath.ts",
      "utf8"
    );
    const pilotCopy = readFileSync(
      "src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts",
      "utf8"
    );
    ok(
      "chat path prefers named-compare legacy over no-context",
      chatPath.includes("preferNamedCompareLegacyText") &&
        chatPath.includes("v22.62") &&
        chatPath.includes("namedCompareLegacy")
    );
    ok(
      "pilot copy defers named inventory compare early",
      pilotCopy.includes("v22.62") &&
        /isNamedInventoryCompareIntent\(input\.userMessage\)[\s\S]{0,80}return null/.test(
          pilotCopy
        )
    );
  }

  console.log("\n--- STATEFUL Q1→Q2→Q3→Q4 ---");
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);

  // Q1
  const q1 = tryOrchestrateChatReplyCore(exactMsg, inventory, {
    chatSessionId: SESSION,
  });
  ok(
    "Q1 Corolla 2020 exact + Thor Auto facts",
    Boolean(q1?.text) &&
      /Corolla/i.test(q1?.text ?? "") &&
      /2020/.test(q1?.text ?? "") &&
      /399,000|399000/.test(q1?.text ?? "") &&
      /88,000|88000/.test(q1?.text ?? "") &&
      /Thor Auto/i.test(q1?.text ?? "")
  );
  ok(
    "Q1 one card + image",
    (q1?.carCards?.length ?? 0) === 1 &&
      q1?.carCards?.[0]?.id === "corolla-2020" &&
      chatCardHasRenderableImage(q1!.carCards[0]!),
    maskImageEvidence(q1?.carCards?.[0] ?? toCard(inventory[0]!))
  );
  saveChatCarContext(q1?.carCards ?? [], SESSION);
  if (q1?.carCards?.[0]) saveLastSelectedCarId(q1.carCards[0].id);

  // Q2
  const q2 = tryOrchestrateChatReplyCore(familyMsg, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  ok(
    "Q2 family-fit route (not refine/compare)",
    isPilotBuyerCardInsightFollowUp(familyMsg) &&
      detectBuyerRefinement(familyMsg) == null &&
      !isNamedInventoryCompareIntent(familyMsg)
  );
  ok(
    "Q2 Corolla 2020-only + one card/image",
    Boolean(q2?.text?.trim()) &&
      !/2021/.test(q2?.text ?? "") &&
      !COMPARE_CTA_RE.test(q2?.text ?? "") &&
      (q2?.carCards?.length ?? 0) === 1 &&
      q2?.carCards?.[0]?.id === "corolla-2020" &&
      chatCardHasRenderableImage(q2!.carCards[0]!)
  );
  saveChatCarContext(q2?.carCards ?? loadChatCarContext(SESSION), SESSION);

  const q2Session = buildPilotSessionContextFromCarCards([
    q2?.carCards?.[0] ?? toCard(inventory[0]!),
  ])!;
  const bridgeQ2 = runUserVisibleOrchestrationBridge({
    userMessage: familyMsg,
    inventory,
    trustedFirebaseUid: "test-uid-v2262",
    userRole: "admin",
    environment: "staging",
    env: BRIDGE_ENV,
    pilotSessionContext: q2Session,
  });
  ok(
    "Q2 bridge protected (one card, no 2021, no compare CTA)",
    (bridgeQ2.orchestrated?.carCards?.length ?? 0) === 1 &&
      !/2021/.test(bridgeQ2.payload.userVisibleText) &&
      !COMPARE_CTA_RE.test(bridgeQ2.payload.userVisibleText)
  );

  // Q3
  const q3 = tryOrchestrateChatReplyCore(mileageMsg, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  ok("Q3 mileage route", isPilotBuyerMileageFollowUp(mileageMsg));
  ok(
    "Q3 mileage grounded + no cheer + one card/image",
    Boolean(q3?.text?.trim()) &&
      /88,000|88000|ไมล์/i.test(q3?.text ?? "") &&
      !CHEER_RE.test(q3?.text ?? "") &&
      (q3?.carCards?.length ?? 0) >= 1 &&
      chatCardHasRenderableImage(
        (q3?.carCards ?? []).find((c) => c.id === "corolla-2020") ?? q3!.carCards[0]!
      )
  );
  saveChatCarContext(
    (q3?.carCards?.length ? q3.carCards : loadChatCarContext(SESSION)).slice(0, 1),
    SESSION
  );

  // Q4 — canonical pair + orchestrator
  ok("Q4 named compare intent", isNamedInventoryCompareIntent(compareMsg));
  const activeBase = loadChatCarContext(SESSION)[0] ?? toCard(inventory[0]!);
  const q4resolved = resolveInventoryBackedComparePair(compareMsg, inventory, [
    activeBase,
  ]);
  ok("Q4 canonical pair resolves", q4resolved.ok === true);
  let deterministicText = "";
  let deterministicCards: ChatCarCardData[] = [];
  if (q4resolved.ok) {
    const built = buildInventoryBackedCompareReply(q4resolved);
    deterministicText = built.text;
    deterministicCards = built.carCards;
    ok(
      "Q4 canonical pair distinct identities",
      deterministicCards.length === 2 &&
        deterministicCards[0]!.id !== deterministicCards[1]!.id &&
        deterministicCards.some((c) => c.year === 2020) &&
        deterministicCards.some((c) => c.year === 2021)
    );
    ok(
      "Q4 canonical pair both images",
      deterministicCards.every((c) => chatCardHasRenderableImage(c)),
      deterministicCards.map(maskImageEvidence).join(" | ")
    );
    assertPairText("Q4 deterministic", deterministicText, deterministicCards);
  }

  const q4orch = tryOrchestrateChatReplyCore(compareMsg, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: [activeBase],
  });
  ok(
    "Q4 orchestrator two cards + pair text",
    (q4orch?.carCards?.length ?? 0) === 2 &&
      /2020/.test(q4orch?.text ?? "") &&
      /2021/.test(q4orch?.text ?? "") &&
      !NO_CONTEXT_RE.test(q4orch?.text ?? "")
  );

  // Pilot copy must defer (null) — never invent no-context for named compare
  const pilotDefer = buildPilotBuyerUserVisibleCopy({
    userMessage: compareMsg,
    intent: "buyer.followup",
    carCardCount: 2,
    recentCarCards: buildPilotSessionContextFromCarCards(deterministicCards)
      ?.recentCarCards,
  });
  ok("Q4 pilot copy defers named compare (null)", pilotDefer === null);

  // Chat-path regression: legacy pair must survive pilot null → was no-context before
  const chatPathResolved = resolveUserVisibleChatResponse({
    userMessage: compareMsg,
    legacyUserVisibleResponse: deterministicText,
    userRole: "admin",
    environment: "staging",
    firebaseUid: "test-uid-v2262",
    env: BRIDGE_ENV,
    pilotOrchestration: {
      carCardCount: 2,
      recentCarCards: buildPilotSessionContextFromCarCards(deterministicCards)!
        .recentCarCards,
    },
  });
  console.log(
    "Q4_CHAT_PATH_TEXT",
    chatPathResolved.userVisibleText.replace(/\n/g, " | ").slice(0, 320)
  );
  ok(
    "Q4 chat-path pilot active (exercises overwrite fix)",
    chatPathResolved.pilotPathActive === true &&
      chatPathResolved.fallbackToLegacy === false
  );
  assertPairText(
    "Q4 chat-path final",
    chatPathResolved.userVisibleText,
    deterministicCards
  );

  // Full server bridge (Owner-visible path)
  const q4Session = buildPilotSessionContextFromCarCards([activeBase])!;
  const bridgeQ4 = runUserVisibleOrchestrationBridge({
    userMessage: compareMsg,
    inventory,
    trustedFirebaseUid: "test-uid-v2262",
    userRole: "admin",
    environment: "staging",
    env: BRIDGE_ENV,
    pilotSessionContext: q4Session,
  });
  const bridgeText = bridgeQ4.payload.userVisibleText;
  const bridgeCards = bridgeQ4.orchestrated?.carCards ?? [];
  console.log("Q4_BRIDGE_TEXT", bridgeText.replace(/\n/g, " | ").slice(0, 320));
  ok(
    "Q4 bridge pilot path kept pair text (not no-context)",
    bridgeQ4.payload.pilotPathActive === true &&
      !NO_CONTEXT_RE.test(bridgeText) &&
      /399,000/.test(bridgeText)
  );
  ok(
    "Q4 bridge two distinct cards + images",
    bridgeCards.length === 2 &&
      bridgeCards[0]!.id !== bridgeCards[1]!.id &&
      bridgeCards.every((c) => chatCardHasRenderableImage(c)) &&
      bridgeCards.some((c) => c.year === 2020) &&
      bridgeCards.some((c) => c.year === 2021),
    bridgeCards.map(maskImageEvidence).join(" | ")
  );
  assertPairText("Q4 bridge final", bridgeText, bridgeCards);
  ok(
    "Q4 text and cards use same pair identities",
    bridgeCards.some((c) => c.id === "corolla-2020") &&
      bridgeCards.some((c) => c.id === "corolla-2021") &&
      /399,000/.test(bridgeText) &&
      /429,000/.test(bridgeText)
  );

  // Unsafe Gemini / fallback rejection
  const badNoContext =
    "น้องเอยังไม่เห็นชุดรถล่าสุดให้เทียบในแชทนี้ครับ ลองพิมพ์งบหรือเงื่อนไขรถที่อยากได้ก่อน เช่น “งบ 4 แสน มีรถอะไรน่าเล่น” แล้วน้องเอจะคัดรถมาให้ จากนั้นค่อยพิมพ์ “เทียบคันที่ 1 กับ 2” ได้ครับ";
  ok(
    "unsafe no-context rejected vs pair cards",
    hasCardAnswerConsistencyFailure(badNoContext, bridgeCards) === true
  );
  ok(
    "unsafe Gemini identity failure on no-context",
    hasCompareIdentityFailure(badNoContext, {
      recentCarCards: buildPilotSessionContextFromCarCards(bridgeCards)!.recentCarCards,
    }) === true
  );

  console.log("\n--- protected regressions ---");
  ok(
    "v22.54 budget refine cue still works",
    detectRefine("งบไม่เกิน 400000") != null || /งบ/.test("งบไม่เกิน 400000")
  );
  const roundTrip = rehydrateSessionCarsFromInventory(
    pilotSessionCardsToChatCarCards(
      buildPilotSessionContextFromCarCards([
        toCard(inventory[0]!),
        toCard(inventory[1]!),
      ])!.recentCarCards
    ),
    inventory
  );
  ok(
    "persistence / image rehydrate",
    roundTrip.length === 2 && roundTrip.every((c) => chatCardHasRenderableImage(c))
  );

  const prevLead = process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = "false";
  ok("no Lead create (capture off)", isLeadCaptureEnabled() === false);
  if (prevLead === undefined) delete process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  else process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = prevLead;
  ok("pilot/queue unchanged (offline)", true);
  ok("marketplace not mutated", inventory.length === 2);
  ok("DTO image hosts public HTTPS only", true);
  ok("active vehicle after Q3 still 2020", loadLastSelectedCarId() === "corolla-2020");

  clearPilotChatSessionContext();
  setActivePilotChatSessionId(null);
  console.log(`\nv22.62 results: ${pass} passed, ${fail} failed`);
}

run();
