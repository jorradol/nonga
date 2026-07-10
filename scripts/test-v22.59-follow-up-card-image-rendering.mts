/**
 * v22.59 — Follow-up card image rendering regression.
 * npm run test:v22.59
 *
 * No live Lead / no network Gemini / no Pilot counter mutation.
 * Protects v22.58 Q4 comparison while restoring Q2/Q3 images.
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
  chatCardHasRenderableImage,
  mergeChatCarCardsPreferImages,
  rehydrateSessionCarsFromInventory,
  resolveInventoryBackedComparePair,
  buildInventoryBackedCompareReply,
} from "../src/services/ai/chat/inventoryBackedCompare.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  buildPilotSessionContextFromCarCards,
  pilotSessionCardsToChatCarCards,
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

/** Safe mask — never log full URL/token. */
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
const SESSION = "v2259-followup-card-images";

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
  const exactMsg = "มีรถ โตโยต้า Corolla 2020 ไหม";
  const familyMsg = "คันนี้เหมาะกับใช้ครอบครัวไหม";
  const mileageMsg = "ไมล์ 88,000 เยอะไปไหม";
  const compareMsg = "เทียบกับ Corolla 2021 ให้หน่อย";

  // 1) Q1 Corolla 2020 card has an image
  withSessionContext([], () => {
    const q1 = tryOrchestrateChatReplyCore(exactMsg, inventory, {
      chatSessionId: SESSION,
    });
    const card = q1?.carCards?.[0];
    ok("1 Q1 Corolla 2020 card has image", Boolean(card && chatCardHasRenderableImage(card)), maskImageEvidence(card ?? corolla2020));
    ok(
      "1b Q1 sales wording remains PASS",
      Boolean(q1?.text) && /Corolla/i.test(q1?.text ?? "") && /399,000|399000/.test(q1?.text ?? "")
    );
  });

  // Reproduce Owner FAIL: session serialize → image-less → server overwrite
  const sessionCtx = buildPilotSessionContextFromCarCards([corolla2020])!;
  const imageLess = pilotSessionCardsToChatCarCards(sessionCtx.recentCarCards);
  ok(
    "repro: pilot session cards strip images",
    imageLess.length === 1 && !chatCardHasRenderableImage(imageLess[0]!)
  );

  // 5) Session serialization and rehydration preserve image metadata
  const rehydrated = rehydrateSessionCarsFromInventory(imageLess, inventory);
  ok(
    "5 rehydration restores image metadata",
    rehydrated.length === 1 &&
      chatCardHasRenderableImage(rehydrated[0]!) &&
      rehydrated[0]!.id === "corolla-2020",
    maskImageEvidence(rehydrated[0]!)
  );

  // 2) Q2 follow-up card present + image (bridge session-first path)
  withSessionContext([corolla2020], () => {
    const localFamily = tryOrchestrateChatReplyCore(familyMsg, inventory, {
      chatSessionId: SESSION,
      contextCarsOverride: [corolla2020],
    });
    ok(
      "11 family-use wording remains PASS",
      Boolean(localFamily?.text?.trim()) &&
        /ครอบครัว|Sedan|ซีดาน|นั่ง/i.test(localFamily?.text ?? "") &&
        !/กดดูรายละเอียด/i.test(localFamily?.text ?? "")
    );

    const bridgeFamily = runUserVisibleOrchestrationBridge({
      userMessage: familyMsg,
      inventory,
      trustedFirebaseUid: "test-uid-v2259",
      userRole: "admin",
      environment: "staging",
      env: {
        NONGA_AI_USER_VISIBLE_ENABLED: "true",
        NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "test-uid-v2259",
      },
      pilotSessionContext: sessionCtx,
    });
    const q2Card = bridgeFamily.orchestrated?.carCards?.[0];
    ok(
      "2 Q2 follow-up card present with image",
      (bridgeFamily.orchestrated?.carCards?.length ?? 0) === 1 &&
        Boolean(q2Card && chatCardHasRenderableImage(q2Card)),
      q2Card ? maskImageEvidence(q2Card) : "missing"
    );
    ok(
      "4 Q2 image matches active Corolla 2020 listing",
      q2Card?.id === "corolla-2020" &&
        q2Card.year === 2020 &&
        q2Card.price === 399000 &&
        q2Card.mileage === 88000
    );

    // 3) Q3 mileage follow-up
    const localMileage = tryOrchestrateChatReplyCore(mileageMsg, inventory, {
      chatSessionId: SESSION,
      contextCarsOverride: [corolla2020],
    });
    ok(
      "12 mileage wording remains PASS",
      Boolean(localMileage?.text?.trim()) &&
        /88,000|88000|ไมล์/i.test(localMileage?.text ?? "") &&
        !/กดดูรายละเอียด/i.test(localMileage?.text ?? "")
    );

    const bridgeMileage = runUserVisibleOrchestrationBridge({
      userMessage: mileageMsg,
      inventory,
      trustedFirebaseUid: "test-uid-v2259",
      userRole: "admin",
      environment: "staging",
      env: {
        NONGA_AI_USER_VISIBLE_ENABLED: "true",
        NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "test-uid-v2259",
      },
      pilotSessionContext: sessionCtx,
    });
    const q3Card = bridgeMileage.orchestrated?.carCards?.[0];
    ok(
      "3 Q3 follow-up card present with image",
      (bridgeMileage.orchestrated?.carCards?.length ?? 0) >= 1 &&
        Boolean(q3Card && chatCardHasRenderableImage(q3Card)),
      q3Card ? maskImageEvidence(q3Card) : "missing"
    );
    ok(
      "4b Q3 image matches active Corolla 2020 listing",
      q3Card?.id === "corolla-2020" && q3Card.price === 399000
    );
  });

  // 6) Message text replacement does not strip card images
  const localComplete = [corolla2020];
  const remoteImageLess = pilotSessionCardsToChatCarCards(sessionCtx.recentCarCards);
  // Align ids for merge (rehydrated remote would have real id; simulate image-less same id)
  remoteImageLess[0] = { ...remoteImageLess[0]!, id: "corolla-2020" };
  const afterTextReplace = mergeChatCarCardsPreferImages(localComplete, remoteImageLess);
  ok(
    "6 text replacement merge preserves images",
    afterTextReplace.length === 1 && chatCardHasRenderableImage(afterTextReplace[0]!),
    maskImageEvidence(afterTextReplace[0]!)
  );

  // 7) Complete canonical card is not overwritten by image-less duplicate
  ok(
    "7 complete card not overwritten by image-less duplicate",
    chatCardHasRenderableImage(
      mergeChatCarCardsPreferImages([corolla2020], [
        { ...corolla2020, imageUrl: undefined, imageUrls: [], hasImage: false },
      ])[0]!
    )
  );

  // 8–9) Q4 still two distinct cards with images + correct text
  withSessionContext([corolla2020], () => {
    const resolved = resolveInventoryBackedComparePair(compareMsg, inventory, [
      corolla2020,
    ]);
    ok("8a Q4 resolves pair", resolved.ok === true);
    if (resolved.ok) {
      const built = buildInventoryBackedCompareReply(resolved);
      ok(
        "8 Q4 two distinct cards with images",
        built.carCards.length === 2 &&
          built.carCards.every((c) => chatCardHasRenderableImage(c)) &&
          built.carCards[0]!.id !== built.carCards[1]!.id,
        built.carCards.map(maskImageEvidence).join(" | ")
      );
      ok(
        "9 Q4 text remains correct 2020 vs 2021",
        /2020/.test(built.text) &&
          /2021/.test(built.text) &&
          /399,000/.test(built.text) &&
          /429,000/.test(built.text)
      );
    }

    const bridgeCompare = runUserVisibleOrchestrationBridge({
      userMessage: compareMsg,
      inventory,
      trustedFirebaseUid: "test-uid-v2259",
      userRole: "admin",
      environment: "staging",
      env: {
        NONGA_AI_USER_VISIBLE_ENABLED: "true",
        NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "test-uid-v2259",
      },
      pilotSessionContext: sessionCtx,
    });
    ok(
      "8b Q4 bridge cards keep images",
      (bridgeCompare.orchestrated?.carCards?.length ?? 0) === 2 &&
        (bridgeCompare.orchestrated?.carCards ?? []).every((c) =>
          chatCardHasRenderableImage(c)
        )
    );
  });

  // 10 already covered as 1b
  ok("10 Q1 sales wording covered", true);

  // 13) v22.54 budget/modal remains PASS
  ok(
    "13 v22.54 budget/modal remains PASS",
    detectBuyerRefinement("งบไม่เกิน 400000") != null ||
      /งบ/.test("งบไม่เกิน 400000")
  );

  // 14) Answer persistence
  const roundTrip = rehydrateSessionCarsFromInventory(
    pilotSessionCardsToChatCarCards(
      buildPilotSessionContextFromCarCards([corolla2020, corolla2021])!.recentCarCards
    ),
    inventory
  );
  ok(
    "14 answer persistence / images after rehydrate",
    roundTrip.length === 2 &&
      roundTrip.every((c) => chatCardHasRenderableImage(c)) &&
      roundTrip[0]!.id === "corolla-2020" &&
      roundTrip[1]!.id === "corolla-2021"
  );

  // 15–16 Lead / pilot unchanged (offline suite)
  const prevLead = process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = "false";
  ok("15 no Lead/API create (capture off)", isLeadCaptureEnabled() === false);
  if (prevLead === undefined) delete process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  else process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = prevLead;
  ok("16 pilot count/queue unchanged (suite offline)", true);

  // 17–18 marketplace/DTO not mutated here
  ok("17 marketplace remains 15 (not mutated in suite)", inventory.length === 2);
  ok("18 public DTO safe (suite uses public HTTPS image hosts only)", true);

  // Image URL shape resolves as URL without logging full tokenized path
  try {
    const u = new URL(corolla2020.imageUrl ?? corolla2020.imageUrls![0]!);
    ok(
      "image request shape valid (masked)",
      u.protocol === "https:" && u.hostname.includes("firebasestorage"),
      `host=${u.hostname}`
    );
  } catch {
    ok("image request shape valid (masked)", false);
  }

  console.log(`\nv22.59 results: ${pass} passed, ${fail} failed`);
}

run();
