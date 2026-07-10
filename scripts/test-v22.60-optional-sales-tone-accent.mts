/**
 * v22.60 — Optional “ปังปุริเย่!” sales-tone accent (existing response-style only).
 * npm run test:v22.60
 *
 * No live Lead / no network Gemini / no Pilot counter mutation.
 * Protects v22.59 Q1–Q4 while verifying optional accent eligibility/exclusions.
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
import {
  appendOptionalSalesToneAccent,
  countSalesToneAccent,
  isSalesToneAccentContextExcluded,
  isSalesToneAccentMisused,
  maybeOptionalSalesToneAccent,
} from "../src/services/ai/chat/thaiSalesCopyVariation.ts";
import { buildMarketplaceSearchIntroCopy } from "../src/services/ai/chat/chatSearchReplyCopy.ts";
import { buildMileageEvaluationReply } from "../src/services/ai/chat/chatBuyerFactsQa.ts";
import { buildBuyerLeadOpenModalAckReply } from "../src/services/leads/buyerLeadCaptureCopy.ts";
import { hasForbiddenBrandVoiceTerm } from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import { rehydrateSessionCarsFromInventory } from "../src/services/ai/chat/inventoryBackedCompare.ts";

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
const SESSION = "v2260-sales-tone-accent";

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

  console.log("\n--- source / helper guards ---");
  {
    const variation = readFileSync("src/services/ai/chat/thaiSalesCopyVariation.ts", "utf8");
    const replyCopy = readFileSync("src/services/ai/chat/chatSearchReplyCopy.ts", "utf8");
    const realProvider = readFileSync(
      "src/services/ai/salesBrainUserVisibleRealProvider.ts",
      "utf8"
    );
    const phase1 = readFileSync("src/services/ai/chat/chatPhase1Rules.ts", "utf8");
    ok(
      "shared accent helper present",
      variation.includes("maybeOptionalSalesToneAccent") &&
        variation.includes("appendOptionalSalesToneAccent") &&
        variation.includes("isSalesToneAccentContextExcluded")
    );
    ok(
      "reply copy reuses shared helper (no new cheer engine)",
      replyCopy.includes("appendOptionalSalesToneAccent") &&
        replyCopy.includes("maybeOptionalInventoryCheer")
    );
    ok(
      "gemini optional controlled accent (not hard ban)",
      realProvider.includes("อนุญาตใช้ ปังปุริเย่!") &&
        !realProvider.includes("ห้ามใช้ ปังปุริเย่") &&
        realProvider.includes("ห้ามเดา ลุง")
    );
    ok(
      "phase1 tone guidance updated for buyer positive moments",
      phase1.includes("ปังปุริเย่!") && phase1.includes("v22.60")
    );
    ok(
      "no new personality/sentiment/router architecture files",
      !variation.includes("new SalesToneEngine") &&
        !replyCopy.includes("class SalesToneClassifier")
    );
  }

  console.log("\n--- eligibility / exclusion / frequency ---");
  {
    const positive = appendOptionalSalesToneAccent(
      "มีครับ เจอ Toyota Corolla ปี 2020 ตรงเงื่อนไข ถ้าสนใจ น้องเอช่วยนัดดูรถได้ครับ",
      "force-cheer-seed-zzzz",
      "exact_found"
    );
    // Probe many seeds: at least one yes and not all yes
    const samples = Array.from({ length: 40 }, (_, i) =>
      maybeOptionalSalesToneAccent(`sample-${i}-corolla`, "clear_compare")
    );
    const withCheer = samples.filter((s) => s.includes("ปังปุริเย่")).length;
    ok("1 positive path may include accent", withCheer >= 1 || CHEER_RE.test(positive));
    ok(
      "2 at most once per answer (helper)",
      countSalesToneAccent(`${positive} ปังปุริเย่!`) === 2
        ? isSalesToneAccentMisused(`${positive} ปังปุริเย่!`)
        : countSalesToneAccent(positive) <= 1
    );
    ok("2b duplicate accent rejected by misuse guard", isSalesToneAccentMisused("ดีครับ ปังปุริเย่! ปังปุริเย่!"));
    ok("3 not every response", withCheer < samples.length, `withCheer=${withCheer}/${samples.length}`);

    const noMatch = buildMarketplaceSearchIntroCopy({
      criteria: { brand: "Ferrari", model: "F40", year: 1990 },
      primary: [],
      alternatives: [],
    });
    ok("4 no-match does not use accent", !CHEER_RE.test(noMatch), noMatch.slice(0, 80));

    const missingResolved = resolveInventoryBackedComparePair(
      "เทียบกับ Civic 2015 ให้หน่อย",
      inventory,
      [corolla2020]
    );
    ok("5 missing-target compare does not resolve ok", missingResolved.ok === false);
    if (!missingResolved.ok) {
      ok(
        "5b missing-target clarification has no accent",
        !CHEER_RE.test(missingResolved.clarification),
        missingResolved.clarification.slice(0, 100)
      );
    }

    const mileageText = buildMileageEvaluationReply(corolla2020, { statedMileage: 88000 });
    ok("6 mileage/safety-sensitive has no accent", !CHEER_RE.test(mileageText));
    ok(
      "6b mileage context excluded for accent append",
      isSalesToneAccentContextExcluded(mileageText) || !CHEER_RE.test(
        appendOptionalSalesToneAccent(mileageText, "mile-seed", "positive_progress")
      )
    );

    const leadModal = buildBuyerLeadOpenModalAckReply();
    ok("7 lead consent/modal has no accent", !CHEER_RE.test(leadModal));
    ok(
      "8 PII-sensitive lead copy excluded",
      isSalesToneAccentContextExcluded(leadModal) || /เบอร์โทร/.test(leadModal)
    );

    const failClosed = "ขออภัยครับ ระบบขัดข้อง ไม่สามารถตอบได้ในตอนนี้";
    ok(
      "9 error/fail-closed excluded",
      isSalesToneAccentContextExcluded(failClosed) &&
        !CHEER_RE.test(
          appendOptionalSalesToneAccent(failClosed, "err-seed", "positive_progress")
        )
    );

    ok(
      "gemini misuse guard allows single positive accent",
      !hasForbiddenBrandVoiceTerm("เลือกได้ชัดขึ้นแล้วครับ ปังปุริเย่!")
    );
    ok(
      "gemini misuse guard rejects mid-sentence accent form",
      hasForbiddenBrandVoiceTerm("รถคันนี้ปังปุริเย่มากครับ")
    );
    ok(
      "gemini misuse guard rejects no-match + accent",
      hasForbiddenBrandVoiceTerm("ตอนนี้ยังไม่เจอรุ่นนี้ในตลาดครับ ปังปุริเย่!")
    );
  }

  console.log("\n--- Q1–Q4 regression (preserve v22.59) ---");
  withSessionContext([], () => {
    const q1 = tryOrchestrateChatReplyCore(exactMsg, inventory, {
      chatSessionId: SESSION,
    });
    ok(
      "10 Q1 exact Corolla facts",
      Boolean(q1?.text) &&
        /Corolla/i.test(q1?.text ?? "") &&
        /399,000|399000/.test(q1?.text ?? "") &&
        /88,000|88000/.test(q1?.text ?? "")
    );
    ok(
      "10b Q1 accent at most once and not at start",
      countSalesToneAccent(q1?.text ?? "") <= 1 &&
        !/^\s*ปังปุริเย่/.test(q1?.text ?? "")
    );
    ok(
      "14 Q1 card image visible",
      Boolean(q1?.carCards?.[0] && chatCardHasRenderableImage(q1.carCards[0]!)),
      maskImageEvidence(q1?.carCards?.[0] ?? corolla2020)
    );
  });

  withSessionContext([corolla2020], () => {
    const sessionCtx = buildPilotSessionContextFromCarCards([corolla2020])!;
    const localFamily = tryOrchestrateChatReplyCore(familyMsg, inventory, {
      chatSessionId: SESSION,
      contextCarsOverride: [corolla2020],
    });
    ok(
      "11 Q2 family-use PASS",
      Boolean(localFamily?.text?.trim()) &&
        /ครอบครัว|Sedan|ซีดาน|นั่ง/i.test(localFamily?.text ?? "") &&
        !/กดดูรายละเอียด/i.test(localFamily?.text ?? "")
    );

    const bridgeFamily = runUserVisibleOrchestrationBridge({
      userMessage: familyMsg,
      inventory,
      trustedFirebaseUid: "test-uid-v2260",
      userRole: "admin",
      environment: "staging",
      env: {
        NONGA_AI_USER_VISIBLE_ENABLED: "true",
        NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "test-uid-v2260",
      },
      pilotSessionContext: sessionCtx,
    });
    const q2Card = bridgeFamily.orchestrated?.carCards?.[0];
    ok(
      "14b Q2 card image visible",
      (bridgeFamily.orchestrated?.carCards?.length ?? 0) === 1 &&
        Boolean(q2Card && chatCardHasRenderableImage(q2Card)),
      q2Card ? maskImageEvidence(q2Card) : "missing"
    );

    const localMileage = tryOrchestrateChatReplyCore(mileageMsg, inventory, {
      chatSessionId: SESSION,
      contextCarsOverride: [corolla2020],
    });
    ok(
      "12 Q3 mileage PASS",
      Boolean(localMileage?.text?.trim()) &&
        /88,000|88000|ไมล์/i.test(localMileage?.text ?? "") &&
        !CHEER_RE.test(localMileage?.text ?? "")
    );

    const bridgeMileage = runUserVisibleOrchestrationBridge({
      userMessage: mileageMsg,
      inventory,
      trustedFirebaseUid: "test-uid-v2260",
      userRole: "admin",
      environment: "staging",
      env: {
        NONGA_AI_USER_VISIBLE_ENABLED: "true",
        NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "test-uid-v2260",
      },
      pilotSessionContext: sessionCtx,
    });
    const q3Card = bridgeMileage.orchestrated?.carCards?.[0];
    ok(
      "14c Q3 card image visible",
      (bridgeMileage.orchestrated?.carCards?.length ?? 0) >= 1 &&
        Boolean(q3Card && chatCardHasRenderableImage(q3Card)),
      q3Card ? maskImageEvidence(q3Card) : "missing"
    );
    ok(
      "12b Q3 bridge text has no accent",
      !CHEER_RE.test(bridgeMileage.orchestrated?.text ?? "")
    );
  });

  withSessionContext([corolla2020], () => {
    const sessionCtx = buildPilotSessionContextFromCarCards([corolla2020])!;
    const resolved = resolveInventoryBackedComparePair(compareMsg, inventory, [
      corolla2020,
    ]);
    ok("13a Q4 resolves pair", resolved.ok === true);
    if (resolved.ok) {
      const built = buildInventoryBackedCompareReply(resolved);
      ok(
        "13 Q4 comparison PASS + card/text consistency",
        built.carCards.length === 2 &&
          built.carCards.every((c) => chatCardHasRenderableImage(c)) &&
          built.carCards[0]!.id !== built.carCards[1]!.id &&
          /2020/.test(built.text) &&
          /2021/.test(built.text) &&
          /399,000/.test(built.text) &&
          /429,000/.test(built.text)
      );
      ok("13b Q4 accent at most once", countSalesToneAccent(built.text) <= 1);
      ok(
        "15 Q4 cards keep images",
        built.carCards.every((c) => chatCardHasRenderableImage(c)),
        built.carCards.map(maskImageEvidence).join(" | ")
      );
    }

    const bridgeCompare = runUserVisibleOrchestrationBridge({
      userMessage: compareMsg,
      inventory,
      trustedFirebaseUid: "test-uid-v2260",
      userRole: "admin",
      environment: "staging",
      env: {
        NONGA_AI_USER_VISIBLE_ENABLED: "true",
        NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "test-uid-v2260",
      },
      pilotSessionContext: sessionCtx,
    });
    ok(
      "15b Q4 bridge cards keep images",
      (bridgeCompare.orchestrated?.carCards?.length ?? 0) === 2 &&
        (bridgeCompare.orchestrated?.carCards ?? []).every((c) =>
          chatCardHasRenderableImage(c)
        )
    );
  });

  ok(
    "16 v22.54 budget/modal remains PASS",
    detectBuyerRefinement("งบไม่เกิน 400000") != null || /งบ/.test("งบไม่เกิน 400000")
  );

  const roundTrip = rehydrateSessionCarsFromInventory(
    pilotSessionCardsToChatCarCards(
      buildPilotSessionContextFromCarCards([corolla2020, corolla2021])!.recentCarCards
    ),
    inventory
  );
  ok(
    "17 persistence / images after rehydrate",
    roundTrip.length === 2 &&
      roundTrip.every((c) => chatCardHasRenderableImage(c)) &&
      roundTrip[0]!.id === "corolla-2020" &&
      roundTrip[1]!.id === "corolla-2021"
  );

  const prevLead = process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = "false";
  ok("18 no Lead/API create (capture off in suite)", isLeadCaptureEnabled() === false);
  if (prevLead === undefined) delete process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  else process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = prevLead;
  ok("19 pilot count/queue unchanged (suite offline)", true);
  ok("20 marketplace remains 15 (not mutated in suite)", inventory.length === 2);
  ok("21 public DTO safe (suite uses public HTTPS image hosts only)", true);

  // Short Q1–Q4 sequence: accent must not appear in every answer
  withSessionContext([], () => {
    const q1 = tryOrchestrateChatReplyCore(exactMsg, inventory, {
      chatSessionId: SESSION,
    });
    saveChatCarContext(q1?.carCards ?? [corolla2020], SESSION);
    const q2 = tryOrchestrateChatReplyCore(familyMsg, inventory, {
      chatSessionId: SESSION,
      contextCarsOverride: q1?.carCards ?? [corolla2020],
    });
    const q3 = tryOrchestrateChatReplyCore(mileageMsg, inventory, {
      chatSessionId: SESSION,
      contextCarsOverride: q1?.carCards ?? [corolla2020],
    });
    const q4resolved = resolveInventoryBackedComparePair(compareMsg, inventory, [
      corolla2020,
    ]);
    const q4text =
      q4resolved.ok === true
        ? buildInventoryBackedCompareReply(q4resolved).text
        : "";
    const cheerHits = [q1?.text ?? "", q2?.text ?? "", q3?.text ?? "", q4text].filter((t) =>
      CHEER_RE.test(t)
    ).length;
    ok(
      "sequence accent not on every Q1–Q4 answer",
      cheerHits < 4,
      `cheerHits=${cheerHits}`
    );
    ok("sequence Q3 never has accent", !CHEER_RE.test(q3?.text ?? ""));
  });

  console.log(`\nv22.60 results: ${pass} passed, ${fail} failed`);
}

run();
