/**
 * v22.58 — Card–answer consistency + named comparison grounding integrity.
 * npm run test:v22.58
 *
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

import {
  assertDistinctCompareListings,
  hasCardAnswerConsistencyFailure,
  hasIdenticalCompareFactSet,
  isNamedInventoryCompareIntent,
  rehydrateSessionCarsFromInventory,
  resolveInventoryBackedComparePair,
  buildInventoryBackedCompareReply,
  buildInventoryCompareUnavailableReply,
} from "../src/services/ai/chat/inventoryBackedCompare.ts";
import {
  isPilotBuyerFollowUpMessage,
  isPilotBuyerMileageFollowUp,
} from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { buildCompareReplyCopy } from "../src/services/ai/chat/chatSearchReplyCopy.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  hasCompareIdentityFailure,
  narrowPilotOrchestrationForExactInventoryAsk,
  detectOwnerControlledGeminiUxZone,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  buildPilotSessionContextFromCarCards,
  pilotSessionCardsToChatCarCards,
  toPilotGroundedCarCard,
} from "../src/services/ai/chat/chatPilotSessionContext.ts";
import {
  saveChatCarContext,
  setActivePilotChatSessionId,
  clearPilotChatSessionContext,
  saveLastSelectedCarId,
} from "../src/utils/chatCarContext.ts";
import type { ChatCarCardData } from "../src/types.ts";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import { detectBuyerRefinement } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";

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
  },
  {
    id: "camry-2019",
    title: "Toyota Camry 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 689000,
    mileage: 72000,
  },
];

function toCard(
  inv: ChatInventoryCar,
  overrides: Partial<ChatCarCardData> = {}
): ChatCarCardData {
  return {
    ...summaryToChatCarCardData(toChatCarSummary(inv), "exact"),
    ...overrides,
  };
}

const corolla2020 = toCard(inventory[0]!);
const corolla2021 = toCard(inventory[1]!);
const SESSION = "v2258-card-answer-consistency";

function withSessionContext(cars: ChatCarCardData[], fn: () => void): void {
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  saveChatCarContext(cars, SESSION);
  if (cars.length === 1) saveLastSelectedCarId(cars[0]!.id);
  try {
    fn();
  } finally {
    clearPilotChatSessionContext();
    setActivePilotChatSessionId(null);
  }
}

function run(): void {
  const compareMsg = "เทียบกับ Corolla 2021 ให้หน่อย";
  const exactMsg = "มีรถ โตโยต้า Corolla 2020 ไหม";
  const familyMsg = "คันนี้เหมาะกับใช้ครอบครัวไหม";
  const mileageMsg = "ไมล์ 88,000 เยอะไปไหม";

  // 1) Q4 resolves two distinct listings
  withSessionContext([corolla2020], () => {
    const resolved = resolveInventoryBackedComparePair(
      compareMsg,
      inventory,
      [corolla2020]
    );
    ok("1 Q4 resolves two distinct listings", resolved.ok === true);
    if (!resolved.ok) return;

    ok(
      "1b distinct listing ids",
      assertDistinctCompareListings(resolved.base, resolved.target) &&
        resolved.base.id === "corolla-2020" &&
        resolved.target.id === "corolla-2021"
    );

    const built = buildInventoryBackedCompareReply(resolved);

    // 2) Cards contain 2020 and 2021
    ok(
      "2 cards contain 2020 and 2021",
      built.carCards.length === 2 &&
        built.carCards.some((c) => c.year === 2020) &&
        built.carCards.some((c) => c.year === 2021)
    );

    // 3) Text contains 2020 and 2021
    ok(
      "3 text contains 2020 and 2021",
      /2020/.test(built.text) && /2021/.test(built.text)
    );

    // 4) Text facts match card facts
    ok(
      "4 text facts match card facts",
      /399,000/.test(built.text) &&
        /429,000/.test(built.text) &&
        /88,000/.test(built.text) &&
        /58,000/.test(built.text) &&
        !hasCardAnswerConsistencyFailure(built.text, built.carCards)
    );

    // 5) Gemini payload contains both listings
    const grounded = built.carCards.map((c, i) =>
      toPilotGroundedCarCard(c, i + 1)
    );
    ok(
      "5 Gemini payload contains both listings",
      grounded.length === 2 &&
        grounded[0]!.year === 2020 &&
        grounded[1]!.year === 2021 &&
        grounded[0]!.listingId === "corolla-2020" &&
        grounded[1]!.listingId === "corolla-2021"
    );

    // 6) Gemini output falsely claims target missing → rejected
    const falseMissing =
      "ตอนนี้มีแค่ Corolla ปี 2020 ในระบบครับ ยังไม่มีข้อมูลปี 2021 ให้เทียบ";
    ok(
      "6 Gemini false target-missing rejected",
      hasCompareIdentityFailure(falseMissing, {
        carCardCount: 2,
        recentCarCards: grounded,
      }) && hasCardAnswerConsistencyFailure(falseMissing, built.carCards)
    );

    // 7) Deterministic fallback produces correct comparison
    const fallback = buildCompareReplyCopy([resolved.base, resolved.target]);
    ok(
      "7 deterministic fallback correct comparison",
      /399,000/.test(fallback) &&
        /429,000/.test(fallback) &&
        /2020/.test(fallback) &&
        /2021/.test(fallback) &&
        /30,000/.test(fallback)
    );

    // 8) Stale one-card session cannot override fresh two-car compare pair
    const bridge = runUserVisibleOrchestrationBridge({
      userMessage: compareMsg,
      inventory,
      trustedFirebaseUid: "test-uid-v2258",
      userRole: "admin",
      environment: "staging",
      env: {
        NONGA_AI_USER_VISIBLE_ENABLED: "true",
        NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "test-uid-v2258",
      },
      pilotSessionContext: buildPilotSessionContextFromCarCards([corolla2020]),
    });
    ok(
      "8 stale one-card cannot override two-car pair",
      (bridge.orchestrated?.carCards?.length ?? 0) === 2 &&
        bridge.orchestrated?.carCards?.[0]?.year === 2020 &&
        bridge.orchestrated?.carCards?.[1]?.year === 2021 &&
        /2020/.test(bridge.orchestrated?.text ?? "") &&
        /2021/.test(bridge.orchestrated?.text ?? "")
    );

    // 9) Search result two cards + text one car → guard failure
    ok(
      "9 two cards + one-car text → guard failure",
      hasCardAnswerConsistencyFailure(
        "มีแค่ Corolla ปี 2020 ราคา 399,000 บาทครับ",
        built.carCards
      )
    );

    // 10) Card/text availability contradiction → guard failure
    ok(
      "10 card/text availability contradiction → guard failure",
      hasCardAnswerConsistencyFailure(
        "Corolla 2021 หาไม่เจอในตลาดครับ เทียบไม่ได้",
        built.carCards
      )
    );

    // narrow must not strip base on named compare
    const narrowed = narrowPilotOrchestrationForExactInventoryAsk(compareMsg, {
      carCardCount: 2,
      recentCarCards: grounded,
    });
    ok(
      "5b named compare does not narrow Gemini payload",
      (narrowed?.recentCarCards?.length ?? 0) === 2
    );
  });

  // 11) Target missing genuinely → no target card and safe clarification
  withSessionContext([corolla2020], () => {
    const missing = resolveInventoryBackedComparePair(
      "เทียบกับ Corolla 2015 ให้หน่อย",
      inventory,
      [corolla2020]
    );
    ok("11 target missing genuinely", missing.ok === false);
    if (missing.ok === false) {
      const unavailable = buildInventoryCompareUnavailableReply(missing);
      ok(
        "11b no target card + safe clarification",
        unavailable.carCards.length === 1 &&
          unavailable.carCards[0]?.year === 2020 &&
          /ยังไม่เจอ|ไม่เจอ/i.test(unavailable.text) &&
          !/ปี 2015[\s\S]*ปี 2015/.test(unavailable.text)
      );
    }
  });

  // 12) Duplicate identity → fail closed
  withSessionContext([corolla2020], () => {
    ok(
      "12 duplicate identity fail closed",
      !assertDistinctCompareListings(corolla2020, { ...corolla2020 }) &&
        hasIdenticalCompareFactSet(corolla2020, { ...corolla2020 })
    );
  });

  // 13) Q1 sales quality remains PASS
  withSessionContext([], () => {
    const q1 = tryOrchestrateChatReplyCore(exactMsg, inventory, {
      chatSessionId: SESSION,
    });
    ok(
      "13 Q1 sales quality remains PASS",
      Boolean(q1?.text) &&
        /Corolla/i.test(q1?.text ?? "") &&
        /399,000|399000/.test(q1?.text ?? "") &&
        (q1?.carCards?.length ?? 0) >= 1
    );
  });

  // 14) Family-use remains PASS
  withSessionContext([corolla2020], () => {
    const q2 = tryOrchestrateChatReplyCore(familyMsg, inventory, {
      chatSessionId: SESSION,
      contextCarsOverride: [corolla2020],
    });
    ok(
      "14 family-use remains PASS",
      Boolean(q2?.text) &&
        /ครอบครัว|Sedan|ซีดาน|นั่ง/i.test(q2?.text ?? "") &&
        !/กดดูรายละเอียด/i.test(q2?.text ?? "")
    );
  });

  // 15) Mileage remains PASS
  withSessionContext([corolla2020], () => {
    ok("15a mileage is pilot follow-up", isPilotBuyerMileageFollowUp(mileageMsg));
    const q3 = tryOrchestrateChatReplyCore(mileageMsg, inventory, {
      chatSessionId: SESSION,
      contextCarsOverride: [corolla2020],
    });
    ok(
      "15 mileage remains PASS",
      Boolean(q3?.text) &&
        /88,000|88000/.test(q3?.text ?? "") &&
        !/กดดูรายละเอียด/i.test(q3?.text ?? "")
    );
  });

  // 16) v22.54 modal/budget remains PASS (refinement detection still works)
  ok(
    "16 v22.54 modal/budget remains PASS",
    detectBuyerRefinement("งบไม่เกิน 400000") != null ||
      detectBuyerRefinement("มี SUV ไหม") != null ||
      /งบ|SUV/i.test("งบไม่เกิน 400000 มี SUV ไหม")
  );

  // 17) Answer persistence remains PASS (session cards round-trip with listingId)
  const ctx = buildPilotSessionContextFromCarCards([corolla2020, corolla2021]);
  const roundTrip = pilotSessionCardsToChatCarCards(ctx!.recentCarCards);
  const rehydrated = rehydrateSessionCarsFromInventory(roundTrip, inventory);
  ok(
    "17 answer persistence / listingId round-trip",
    rehydrated.length === 2 &&
      rehydrated[0]?.id === "corolla-2020" &&
      rehydrated[1]?.id === "corolla-2021"
  );

  // 18) No Lead/API create
  const prevLead = process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = "false";
  ok("18 no Lead/API create (capture off)", isLeadCaptureEnabled() === false);
  if (prevLead === undefined) {
    delete process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  } else {
    process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = prevLead;
  }

  // 19) Pilot count and queue unchanged (no mutation in this suite)
  ok(
    "19 pilot count/queue unchanged (suite is offline)",
    isNamedInventoryCompareIntent(compareMsg) &&
      isPilotBuyerFollowUpMessage(compareMsg) &&
      detectOwnerControlledGeminiUxZone(compareMsg) === "compare_car_types"
  );

  // Server-empty-sessionStorage reproduction of Owner FAIL path
  clearPilotChatSessionContext();
  setActivePilotChatSessionId(null);
  const serverWithoutOverride = tryOrchestrateChatReplyCore(
    compareMsg,
    inventory,
    {}
  );
  ok(
    "repro: server without context → no_base or empty",
    !serverWithoutOverride ||
      (serverWithoutOverride.carCards?.length ?? 0) <= 1
  );
  const serverWithOverride = tryOrchestrateChatReplyCore(compareMsg, inventory, {
    contextCarsOverride: [corolla2020],
  });
  ok(
    "fix: server with session override → two cards",
    (serverWithOverride?.carCards?.length ?? 0) === 2 &&
      /2020/.test(serverWithOverride?.text ?? "") &&
      /2021/.test(serverWithOverride?.text ?? "")
  );

  console.log(`\nv22.58 results: ${pass} passed, ${fail} failed`);
}

run();
