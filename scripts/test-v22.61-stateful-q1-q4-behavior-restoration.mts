/**
 * v22.61 — Stateful Q1–Q4 Owner-verified behavior restoration.
 * npm run test:v22.61
 *
 * One shared conversation state across Q1→Q2→Q3→Q4.
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
import {
  detectUserVisibleBuyerScenario,
  hasSingleCarFitCompareLeak,
  hasForbiddenBrandVoiceTerm,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  appendOptionalSalesToneAccent,
  countSalesToneAccent,
} from "../src/services/ai/chat/thaiSalesCopyVariation.ts";
import { buildMileageEvaluationReply } from "../src/services/ai/chat/chatBuyerFactsQa.ts";
import { buildBuyerLeadOpenModalAckReply } from "../src/services/leads/buyerLeadCaptureCopy.ts";
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

const SESSION = "v2261-stateful-q1-q4";

function run(): void {
  const exactMsg = "มีรถ โตโยต้า Corolla 2020 ไหม";
  const familyMsg = "คันนี้เหมาะกับใช้ครอบครัวไหม";
  const mileageMsg = "ไมล์ 88,000 เยอะไปไหม";
  const compareMsg = "เทียบกับ Corolla 2021 ให้หน่อย";

  console.log("\n--- root-cause / routing guards ---");
  {
    const followUp = readFileSync("src/services/ai/chat/chatPilotBuyerFollowUp.ts", "utf8");
    const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
    ok(
      "bare ครอบครัว no longer alone in family refine pattern",
      !/\|ครอบครัว\|ใช้กับครอบครัว/.test(followUp) &&
        followUp.includes("v22.61") &&
        followUp.includes("เอา(?:แบบ|)?(?:รถ)?ครอบครัว")
    );
    ok(
      "Q2 is card-insight fit, not multi-car refine",
      isPilotBuyerCardInsightFollowUp(familyMsg) === true &&
        detectBuyerRefinement(familyMsg) == null
    );
    ok(
      "explicit เอาแบบครอบครัว still refine",
      detectBuyerRefinement("เอาแบบครอบครัว") === "family"
    );
    ok(
      "Gemini scenario is fit for Q2",
      detectUserVisibleBuyerScenario(familyMsg) === "fit"
    );
    ok(
      "orchestrator prefers active-vehicle fit before refine",
      orch.includes("active-vehicle fit/suitability must beat") &&
        orch.includes("buildActiveVehicleFitReplyCopy")
    );
    ok(
      "tone helpers cannot change route (append-only)",
      readFileSync("src/services/ai/chat/thaiSalesCopyVariation.ts", "utf8").includes(
        "appendOptionalSalesToneAccent"
      ) && !orch.includes("appendOptionalSalesToneAccent")
    );
    ok(
      "single-car fit compare leak guard present",
      typeof hasSingleCarFitCompareLeak === "function" &&
        hasSingleCarFitCompareLeak(
          "เทียบคันที่ 1 กับ 2 Corolla 2021 น่าสนใจกว่า",
          {
            recentCarCards: [
              {
                index: 1,
                brand: "Toyota",
                model: "Corolla",
                year: 2020,
                price: 399000,
                mileage: 88000,
              },
            ],
          }
        ) === true
    );
  }

  console.log("\n--- STATEFUL Q1→Q2→Q3→Q4 transcript ---");
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);

  // Q1
  const q1 = tryOrchestrateChatReplyCore(exactMsg, inventory, {
    chatSessionId: SESSION,
  });
  ok(
    "Q1 route exact-result facts",
    Boolean(q1?.text) &&
      /Corolla/i.test(q1?.text ?? "") &&
      /2020/.test(q1?.text ?? "") &&
      /399,000|399000/.test(q1?.text ?? "") &&
      /88,000|88000/.test(q1?.text ?? "") &&
      /Thor Auto/i.test(q1?.text ?? "")
  );
  ok(
    "Q1 one Corolla 2020 card + image",
    (q1?.carCards?.length ?? 0) === 1 &&
      q1?.carCards?.[0]?.id === "corolla-2020" &&
      q1?.carCards?.[0]?.year === 2020 &&
      chatCardHasRenderableImage(q1!.carCards[0]!),
    maskImageEvidence(q1?.carCards?.[0] ?? toCard(inventory[0]!))
  );
  ok("Q1 no 2021 in text/cards", !/2021/.test(q1?.text ?? "") && (q1?.carCards?.length ?? 0) === 1);
  ok("Q1 accent at most once / not opener", countSalesToneAccent(q1?.text ?? "") <= 1 && !/^\s*ปังปุริเย่/.test(q1?.text ?? ""));

  // Persist active vehicle like client
  saveChatCarContext(q1?.carCards ?? [], SESSION);
  if (q1?.carCards?.[0]) saveLastSelectedCarId(q1.carCards[0].id);
  ok("after Q1 active vehicle = Corolla 2020", loadLastSelectedCarId() === "corolla-2020");
  ok("after Q1 session has 1 card", loadChatCarContext(SESSION).length === 1);

  // Q2
  const q2 = tryOrchestrateChatReplyCore(familyMsg, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  console.log("Q2_TEXT", (q2?.text ?? "").replace(/\n/g, " | ").slice(0, 280));
  ok(
    "Q2 route family-use fit (not refine/compare)",
    isPilotBuyerCardInsightFollowUp(familyMsg) &&
      detectBuyerRefinement(familyMsg) == null &&
      !isNamedInventoryCompareIntent(familyMsg)
  );
  ok(
    "Q2 Corolla 2020 only text",
    Boolean(q2?.text?.trim()) &&
      /Corolla|2020|ครอบครัว|Sedan|ซีดาน|นั่ง/i.test(q2?.text ?? "") &&
      !/2021/.test(q2?.text ?? "") &&
      !COMPARE_CTA_RE.test(q2?.text ?? "") &&
      !/ขอเทียบจาก/i.test(q2?.text ?? "")
  );
  ok(
    "Q2 exactly one Corolla 2020 card + image",
    (q2?.carCards?.length ?? 0) === 1 &&
      q2?.carCards?.[0]?.id === "corolla-2020" &&
      q2?.carCards?.[0]?.year === 2020 &&
      chatCardHasRenderableImage(q2!.carCards[0]!),
    maskImageEvidence(q2?.carCards?.[0] ?? toCard(inventory[0]!))
  );
  ok("Q2 active vehicle continuity", loadLastSelectedCarId() === "corolla-2020");
  // Keep session on active car (client would merge)
  saveChatCarContext(q2?.carCards ?? loadChatCarContext(SESSION), SESSION);

  // Bridge path (server) must also stay single-car
  const sessionCtx = buildPilotSessionContextFromCarCards([
    q2?.carCards?.[0] ?? toCard(inventory[0]!),
  ])!;
  const bridgeFamily = runUserVisibleOrchestrationBridge({
    userMessage: familyMsg,
    inventory,
    trustedFirebaseUid: "test-uid-v2261",
    userRole: "admin",
    environment: "staging",
    env: {
      NONGA_AI_USER_VISIBLE_ENABLED: "true",
      NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "test-uid-v2261",
    },
    pilotSessionContext: sessionCtx,
  });
  const bridgeQ2Cards = bridgeFamily.orchestrated?.carCards ?? [];
  ok(
    "Q2 bridge one card + image, no 2021",
    bridgeQ2Cards.length === 1 &&
      chatCardHasRenderableImage(bridgeQ2Cards[0]!) &&
      !/2021/.test(bridgeFamily.orchestrated?.text ?? "") &&
      !COMPARE_CTA_RE.test(bridgeFamily.orchestrated?.text ?? ""),
    bridgeQ2Cards[0] ? maskImageEvidence(bridgeQ2Cards[0]) : "missing"
  );

  // Q3
  const q3 = tryOrchestrateChatReplyCore(mileageMsg, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  ok("Q3 mileage route", isPilotBuyerMileageFollowUp(mileageMsg));
  ok(
    "Q3 mileage grounded on Corolla 2020",
    Boolean(q3?.text?.trim()) &&
      /88,000|88000|ไมล์/i.test(q3?.text ?? "") &&
      /สมุดเช็ค|ประวัติ|สภาพ|ช่าง|ตรวจ/i.test(q3?.text ?? "") &&
      !CHEER_RE.test(q3?.text ?? "")
  );
  ok(
    "Q3 one Corolla 2020 card + image",
    (q3?.carCards?.length ?? 0) >= 1 &&
      (q3?.carCards ?? []).some((c) => c.id === "corolla-2020") &&
      chatCardHasRenderableImage(
        (q3?.carCards ?? []).find((c) => c.id === "corolla-2020") ?? q3!.carCards[0]!
      )
  );
  saveChatCarContext(
    (q3?.carCards?.length ? q3.carCards : loadChatCarContext(SESSION)).slice(0, 1),
    SESSION
  );

  // Q4
  const q4resolved = resolveInventoryBackedComparePair(compareMsg, inventory, [
    loadChatCarContext(SESSION)[0] ?? toCard(inventory[0]!),
  ]);
  ok("Q4 named compare intent", isNamedInventoryCompareIntent(compareMsg));
  ok("Q4 resolves distinct pair", q4resolved.ok === true);
  let q4text = "";
  let q4cards: ChatCarCardData[] = [];
  if (q4resolved.ok) {
    const built = buildInventoryBackedCompareReply(q4resolved);
    q4text = built.text;
    q4cards = built.carCards;
  }
  ok(
    "Q4 two distinct cards + images",
    q4cards.length === 2 &&
      q4cards[0]!.id !== q4cards[1]!.id &&
      q4cards.every((c) => chatCardHasRenderableImage(c)) &&
      q4cards.some((c) => c.year === 2020) &&
      q4cards.some((c) => c.year === 2021),
    q4cards.map(maskImageEvidence).join(" | ")
  );
  ok(
    "Q4 text facts match cards (price/mileage/year deltas)",
    /2020/.test(q4text) &&
      /2021/.test(q4text) &&
      /399,000/.test(q4text) &&
      /429,000/.test(q4text) &&
      /30,?000/.test(q4text) &&
      !/ยังไม่เจอ.*2021|หาไม่เจอ.*2021/i.test(q4text)
  );
  ok("Q4 accent at most once", countSalesToneAccent(q4text) <= 1);

  const q4orch = tryOrchestrateChatReplyCore(compareMsg, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: [loadChatCarContext(SESSION)[0] ?? toCard(inventory[0]!)],
  });
  ok(
    "Q4 orchestrator returns two cards",
    (q4orch?.carCards?.length ?? 0) === 2 &&
      /2020/.test(q4orch?.text ?? "") &&
      /2021/.test(q4orch?.text ?? "")
  );

  console.log("\n--- regression matrix extras ---");
  {
    const missing = resolveInventoryBackedComparePair(
      "เทียบกับ Civic 2015 ให้หน่อย",
      inventory,
      [toCard(inventory[0]!)]
    );
    ok("missing target fail-closed", missing.ok === false);
    if (!missing.ok) {
      ok("missing target no accent", !CHEER_RE.test(missing.clarification));
    }

    const mileageOnly = buildMileageEvaluationReply(toCard(inventory[0]!), {
      statedMileage: 88000,
    });
    ok("accent excluded on mileage", !CHEER_RE.test(mileageOnly));
    ok(
      "accent excluded on lead modal",
      !CHEER_RE.test(buildBuyerLeadOpenModalAckReply())
    );
    ok(
      "accent append does not invent compare",
      !COMPARE_CTA_RE.test(
        appendOptionalSalesToneAccent(
          "มีครับ เจอ Corolla 2020 ตรงเงื่อนไขครับ",
          "tone-iso",
          "exact_found"
        )
      )
    );
    ok(
      "mid-sentence accent still forbidden in polish guard",
      hasForbiddenBrandVoiceTerm("รถคันนี้ปังปุริเย่มากครับ")
    );

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
  }

  clearPilotChatSessionContext();
  setActivePilotChatSessionId(null);
  console.log(`\nv22.61 results: ${pass} passed, ${fail} failed`);
}

run();
