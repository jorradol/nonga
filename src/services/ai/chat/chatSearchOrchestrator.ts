/** Deterministic chat replies from real inventory — Phase 2 */

import type { ChatCarCardData } from "../../../types";
import {
  isFollowUpCarQuestion,
  isCompareIntent,
  isSelectedCarIntent,
  extractSelectedCarId,
  loadChatCarContext,
  resolveCarsFromContextHint,
  saveChatCarContext,
  saveChatSearchContext,
  saveInChatBuyerContext,
  loadInChatBuyerContext,
  loadChatSearchContext,
  loadRecentlyViewedCarIds,
  resolveSelectedCarIdState,
  saveLastSelectedCarId,
} from "../../../utils/chatCarContext";
import {
  buildFollowUpReplyCopy,
  buildCompareReplyCopy,
  buildSelectedCarReplyCopy,
} from "./chatSearchReplyCopy";
import { buildChatCarFacts, CHAT_FACTS_ONLY_PROMPT } from "./chatSearchFacts";
import {
  isMarketplaceSearchIntent,
  runMarketplaceChatSearch,
  summariesToCarCards,
  summaryToChatCarCardData,
  toChatCarSummary,
  type ChatInventoryCar,
} from "./marketplaceChatSearch";
import {
  isSellIntent,
  extractCarFieldsFromMessage,
  buildDraftPreviewCopy,
  type ExtractedCarFields,
} from "./sellIntentParser";
import { isSaveListingChatAction } from "./chatDraftActions";
import {
  classifyBuyerFactsQuestion,
  buildBuyerFactsReply,
  resolveTargetBuyerCar,
  resolveTargetBuyerCarDetailed,
  buildMileageEvaluationReply,
  buildAmbiguousMileageClarification,
  extractStatedMileageFromMessage,
  isBuyerMileageEvaluationQuestion,
  BUYER_ASK_SELECT_CAR_FIRST,
} from "./chatBuyerFactsQa";
import { tryBuyerFinanceCalculatorReply, isSelectedCarFinanceIntent } from "./chatBuyerFinanceCalculator";
import { tryTroubleshootingAdvisorReply } from "./chatTroubleshootingAdvisorTemplates";
import { tryInsuranceAdvisorReply } from "./chatInsuranceAdvisorTemplates";
import { tryHelpOnboardingReply } from "./chatHelpOnboardingTemplates";
import {
  isVagueUnclearBuyerMessage,
  tryBuyerIntentGateReply,
} from "./chatBuyerIntentGate";
import {
  snapshotToPriorCriteria,
  tryBuyerScoredMarketplaceReply,
} from "./buyerScoredMarketplaceSearch.ts";
import { parseBuyerSearchIntent } from "./buyerSearchIntentParser";
import { isMonthlyAffordabilityDiscovery } from "./vehicleDiscoveryIndex";
import {
  buildSearchOpenerFromMemory,
  getConversationalLeadMemory,
} from "../../leads/conversationalLeadMemory";
import {
  buildMarketContextNote,
  buildUsedCarSafetyNudge,
} from "./chatUsedCarSafetyAdvice";
import {
  detectBuyerRefinement,
  extractNumberedComparePair,
  isPilotBuyerCardInsightFollowUp,
  isPilotBuyerDirectCompareFollowUp,
} from "./chatPilotBuyerFollowUp";
import {
  buildInventoryBackedCompareReply,
  buildInventoryCompareUnavailableReply,
  isNamedInventoryCompareIntent,
  resolveInventoryBackedComparePair,
} from "./inventoryBackedCompare";
import { wireShadowChatPath } from "../salesBrainShadowChatPath";
import {
  buildGeneralModelContextBlock,
  assertNoHallucinatedVehicleClaim,
} from "./vehicleModelContext";

export interface OrchestratedChatReply {
  text: string;
  carCards: ChatCarCardData[];
  /** ใช้ข้อความจากระบบค้นหาโดยตรง ไม่เรียก Gemini */
  skipGemini: boolean;
  hasMoreCars?: boolean;
  isDraftPreview?: boolean;
  draftFields?: ExtractedCarFields;
  savedDraftId?: string;
}

/** Prefer last-selected / first context card for active-vehicle follow-ups. */
function resolveActiveContextualCar(
  contextCars: ChatCarCardData[]
): ChatCarCardData | null {
  if (contextCars.length === 0) return null;
  const selection = resolveSelectedCarIdState();
  // Explicit deselect must fail closed — never revive via recently-viewed /
  // first context card (v22 family path previously leaked here).
  if (selection.kind === "cleared") return null;
  if (selection.kind === "selected") {
    const hit = contextCars.find((c) => c.id === selection.id);
    if (hit) return hit;
  }
  const viewed = loadRecentlyViewedCarIds();
  if (viewed.length > 0) {
    const hit = contextCars.find((c) => c.id === viewed[0]);
    if (hit) return hit;
  }
  return contextCars[0] ?? null;
}

const ASK_WHICH_CAR_REPLY =
  "หมายถึงรถคันไหนครับ กดเลือกรถจากการ์ด หรือส่งลิงก์รถมาให้น้องเอได้เลยครับ";

function askWhichCarReply(): OrchestratedChatReply {
  return {
    text: ASK_WHICH_CAR_REPLY,
    carCards: [],
    skipGemini: true,
  };
}

function cardGroundingKey(card: ChatCarCardData): string {
  const id = String(card.id ?? "").trim();
  if (id) return `id:${id}`;
  return `slot:${card.brand}|${card.model}|${card.year}|${card.price}|${card.mileage ?? 0}`;
}

/** Compare / summary turns should ground Gemini on session history + fresh orchestration. */
export function isCompareOrSummaryProviderGroundingIntent(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  if (isCompareIntent(t) || extractNumberedComparePair(t) != null) return true;
  if (isNamedInventoryCompareIntent(t)) return true;
  if (isPilotBuyerDirectCompareFollowUp(t)) return true;
  if (/สองคันแรก|2\s*คันแรก/.test(t) && /ต่างกัน|เปรียบเทียบ|เทียบ/i.test(t)) return true;
  if (/ต่างกัน(?:อย่างไร|ยังไง|ไร|หรือเปล่า)?/i.test(t) && /คันแรก|คันที่\s*\d+|สองคัน|2\s*คัน/i.test(t)) {
    return true;
  }
  if (isPilotBuyerCardInsightFollowUp(t)) return true;
  if (/สรุป(?:ข้อดี|ข้อเสีย|จุดเด่น|จุดดึง)|ข้อดี(?:และ|กับ)?ข้อเสีย|จุดเด่น(?:และ|กับ)?จุดด้อย/i.test(t)) {
    return true;
  }
  return false;
}

export type ProviderGroundingIntentKind = "compare" | "summary" | "none";

export function classifyProviderGroundingIntent(message: string): ProviderGroundingIntentKind {
  if (!isCompareOrSummaryProviderGroundingIntent(message)) return "none";
  if (
    isCompareIntent(message) ||
    extractNumberedComparePair(message) != null ||
    isNamedInventoryCompareIntent(message) ||
    isPilotBuyerDirectCompareFollowUp(message) ||
    (/สองคันแรก|2\s*คันแรก/.test(message) && /ต่างกัน|เปรียบเทียบ|เทียบ/i.test(message)) ||
    (/ต่างกัน(?:อย่างไร|ยังไง|ไร|หรือเปล่า)?/i.test(message) &&
      /คันแรก|คันที่\s*\d+|สองคัน|2\s*คัน/i.test(message))
  ) {
    return "compare";
  }
  return "summary";
}

/**
 * Merge session/history cards with orchestrated cards for real-provider grounding.
 * Summary keeps active vehicle first; compare keeps full unique session set.
 */
export function mergeProviderGroundingCarCards(input: {
  message: string;
  orchestratedCards: ChatCarCardData[];
  contextCards: ChatCarCardData[];
}): ChatCarCardData[] {
  const { message, orchestratedCards, contextCards } = input;
  if (!isCompareOrSummaryProviderGroundingIntent(message)) {
    return orchestratedCards.length > 0 ? orchestratedCards : contextCards;
  }

  const seen = new Set<string>();
  const merged: ChatCarCardData[] = [];
  const pushUnique = (card: ChatCarCardData | undefined) => {
    if (!card) return;
    const key = cardGroundingKey(card);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(card);
  };

  for (const card of contextCards) pushUnique(card);
  for (const card of orchestratedCards) pushUnique(card);

  const intent = classifyProviderGroundingIntent(message);
  if (intent === "summary") {
    const active = resolveActiveContextualCar(merged.length > 0 ? merged : contextCards);
    if (active) {
      const activeKey = cardGroundingKey(active);
      const rest = merged.filter((card) => cardGroundingKey(card) !== activeKey);
      return [active, ...rest];
    }
  }

  if (intent === "compare" && merged.length >= 2) {
    return merged;
  }

  return merged.length > 0 ? merged : orchestratedCards;
}

/**
 * v22.61 — single-car family/suitability answer (never multi-car refine/compare).
 * v22.65 — family-ask wording only: conversational salesperson Thai; non-family path unchanged.
 */
function buildActiveVehicleFitReplyCopy(
  car: ChatCarCardData,
  userMessage: string
): string {
  const familyAsk = /ครอบครัว|ใช้ครอบครัว/i.test(userMessage);
  const mileage =
    car.mileage > 0 ? ` ไมล์ ${car.mileage.toLocaleString("th-TH")} กม.` : "";
  const body = car.bodyClassLabel ? ` (${car.bodyClassLabel})` : "";
  const price = car.price.toLocaleString("th-TH");
  const label = `${car.brand} ${car.model} ปี ${car.year}`;
  const bodyHint = car.bodyClassLabel || "";

  // v22.65 — Q2 family-use only: natural spoken sales guidance for the active car.
  if (familyAsk) {
    const mileageLine =
      car.mileage > 0
        ? `ส่วนเลขไมล์ ${car.mileage.toLocaleString("th-TH")} กม. ยังต้องดูคู่กับปีรถ ประวัติการเช็กระยะ และสภาพจริงตอนชมรถครับ`
        : "";
    const bodyLine = /suv|crossover|mpv|pickup|อเนกประสงค์/i.test(bodyHint)
      ? `จากประเภทรถในประกาศ คันนี้ช่วยเรื่องพื้นที่ใช้สอยได้ดีในมุมครอบครัว แต่ก่อนตัดสินใจแนะนำให้ลองนั่งครบทุกตำแหน่ง ดูพื้นที่สัมภาระ ช่วงล่าง และการขับขี่ว่าเข้ากับการใช้งานจริงไหมครับ`
      : /sedan|ซีดาน|hatch/i.test(bodyHint)
        ? `ตัวรถเป็นซีดาน จึงใช้งานประจำวันได้ค่อนข้างลงตัว โดยเฉพาะบ้านที่ใช้นั่งกันประมาณ 3–4 คน ขับไปทำงาน รับส่งลูก หรือเดินทางในเมืองเป็นหลัก แต่ก่อนตัดสินใจแนะนำให้ลองนั่งครบทุกตำแหน่ง ดูพื้นที่เบาะหลังและที่เก็บสัมภาระว่าพอกับการใช้งานจริงของครอบครัวไหมครับ`
        : `จากข้อมูลประกาศ คันนี้น่าพิจารณาสำหรับใช้งานครอบครัว แต่ก่อนตัดสินใจแนะนำให้ลองนั่งครบทุกตำแหน่ง ดูพื้นที่สัมภาระ และทดลองขับให้เข้ากับการใช้งานจริงครับ`;

    const text = [
      `ถ้าใช้กับครอบครัว คันนี้ถือว่าเป็นตัวเลือกที่น่าดูครับ — ${label} ราคา ${price} บาท${
        car.mileage > 0
          ? ` ไมล์ตามประกาศ ${car.mileage.toLocaleString("th-TH")} กม.`
          : ""
      }`,
      bodyLine,
      mileageLine,
      "ถ้าบอกได้ว่าปกตินั่งกี่คนและใช้เดินทางแบบไหน น้องเอช่วยประเมินให้เจาะจงขึ้นได้ครับ",
    ]
      .filter(Boolean)
      .join("\n\n");
    assertNoHallucinatedVehicleClaim(text);
    return text;
  }

  const familyAngle = /suv|crossover|mpv|pickup|อเนกประสงค์/i.test(bodyHint)
    ? "จากประเภทรถในระบบ เหมาะกับมุมครอบครัว/พื้นที่ใช้สอยได้ดี"
    : /sedan|ซีดาน|hatch/i.test(bodyHint)
      ? "เป็นซีดานจากข้อมูลประกาศ — เหมาะกับครอบครัวเล็กหรือใช้งานประจำวันได้ ถ้าต้องการพื้นที่ท้าย/ที่นั่งเยอะมาก แนะนำดูสภาพจริงและทดลองขับก่อนครับ"
      : "จากสเปกในประกาศ เหมาะกับผู้ที่มองหารถในกลุ่มนี้สำหรับใช้งานจริง";

  const modelCtx = buildGeneralModelContextBlock({
    brand: car.brand,
    model: car.model,
    year: car.year,
    bodyClassLabel: car.bodyClassLabel,
  });

  const text = [
    `จากข้อมูลประกาศของ ${label} น้องเอประเมินว่า`,
    "",
    `${label} — ราคา ${price} บาท${mileage}${body}`,
    `เหมาะกับผู้ที่มองหารถในกลุ่มนี้ — ${familyAngle}`,
    modelCtx,
    "",
    "ข้อมูลนี้มาจากประกาศในระบบเท่านั้น ควรดูสภาพจริงก่อนตัดสินใจครับ",
    "นี่เป็นการแนะนำเบื้องต้นจากข้อมูลประกาศในระบบนะครับ ยังไม่ได้ตรวจสภาพรถจริง และไม่ได้ฟันธงว่าคันไหนเหมาะที่สุดโดยไม่มีข้อมูลเพิ่ม",
  ]
    .filter(Boolean)
    .join("\n");
  assertNoHallucinatedVehicleClaim(text);
  return text;
}

/** v6.1L.2g — keep last shown cards for compare/refine follow-ups (client sessionStorage) */
function tryContextualBuyerFollowUp(
  message: string,
  contextCars: ChatCarCardData[]
): OrchestratedChatReply | null {
  if (contextCars.length === 0) return null;

  const comparePair = extractNumberedComparePair(message);
  const refinement = detectBuyerRefinement(message);
  const isCompare = isCompareIntent(message) || comparePair != null;

  // v22.61 — active-vehicle fit/suitability must beat multi-car family refine.
  // "คันนี้เหมาะกับใช้ครอบครัวไหม" → one Corolla 2020 card, never compare mode.
  if (!isCompare && isPilotBuyerCardInsightFollowUp(message)) {
    const selection = resolveSelectedCarIdState();
    if (selection.kind === "cleared") {
      return askWhichCarReply();
    }
    const active = resolveActiveContextualCar(contextCars);
    if (active) {
      return {
        text: buildActiveVehicleFitReplyCopy(active, message),
        carCards: [active],
        skipGemini: true,
      };
    }
  }

  if (!isCompare && !refinement) return null;

  if (isCompare) {
    // v22.57 — named inventory target (e.g. เทียบกับ Corolla 2021) must not
    // fall back to session-only / duplicate-card compare here.
    if (isNamedInventoryCompareIntent(message)) {
      return null;
    }
    let picked: ChatCarCardData[] = [];
    if (comparePair) {
      picked = [contextCars[comparePair.a - 1], contextCars[comparePair.b - 1]].filter(
        Boolean
      );
    } else {
      picked = resolveCarsFromContextHint(message, contextCars);
    }
    // Reject duplicate listing identities (self-compare).
    if (picked.length >= 2) {
      const ids = picked.map((c) => c.id).filter(Boolean);
      const unique = new Set(ids);
      if (ids.length >= 2 && unique.size < 2) {
        return {
          text: "เทียบคันเดิมกับตัวเองไม่ได้ครับ อยากให้เทียบกับรุ่นหรือปีไหนเป็นพิเศษ บอกน้องเอได้เลยครับ",
          carCards: picked.slice(0, 1),
          skipGemini: true,
        };
      }
      return {
        text: buildCompareReplyCopy(picked),
        carCards: picked,
        skipGemini: true,
      };
    }
    if (contextCars.length >= 2 && /เทียบ|เปรียบเทียบ|ช่วยเทียบ/i.test(message)) {
      const fallback = contextCars.slice(0, 2);
      if (fallback[0]?.id && fallback[0].id === fallback[1]?.id) {
        return {
          text: "เทียบคันเดิมกับตัวเองไม่ได้ครับ อยากให้เทียบกับรุ่นหรือปีไหนเป็นพิเศษ บอกน้องเอได้เลยครับ",
          carCards: fallback.slice(0, 1),
          skipGemini: true,
        };
      }
      return {
        text: buildCompareReplyCopy(fallback),
        carCards: fallback,
        skipGemini: true,
      };
    }
  }

  if (refinement) {
    const cards = contextCars.slice(0, 3);
    return {
      text: buildFollowUpReplyCopy(cards, message),
      carCards: cards,
      skipGemini: true,
    };
  }

  return null;
}

function tryOrchestrateChatReplyCore(
  message: string,
  inventory: ChatInventoryCar[],
  options?: {
    attachedImageCount?: number;
    displayName?: string;
    firebaseUid?: string;
    /** v6.1L.2i — scope sessionStorage car context to this chat session */
    chatSessionId?: string | null;
    /**
     * v22.58 — server bridge injects rehydrated pilot session cards
     * (Node has no browser sessionStorage).
     */
    contextCarsOverride?: ChatCarCardData[];
  }
): OrchestratedChatReply | null {
  const chatSessionId = options?.chatSessionId ?? null;
  if (isSellIntent(message)) {
    const fields = extractCarFieldsFromMessage(message);
    return {
      text: buildDraftPreviewCopy(fields, {
        attachedImageCount: options?.attachedImageCount,
      }),
      carCards: [],
      skipGemini: true,
      isDraftPreview: true,
      draftFields: fields
    };
  }

  if (isSaveListingChatAction(message)) {
    return {
      text: "กำลังบันทึกประกาศให้ครับ...",
      carCards: [],
      skipGemini: true,
    };
  }

  const isEditDraft = message.trim() === "แก้ไขข้อมูล";
  if (isEditDraft) {
    return {
      text: "พิมพ์ข้อมูลที่ต้องการแก้ไขมาได้เลยครับ เช่น 'เปลี่ยนราคาเป็น 400000' หรือ 'เพิ่มจุดเด่น: ยางใหม่'",
      carCards: [],
      skipGemini: true,
    };
  }

  const isAddPhoto = message.trim() === "เพิ่มรูปภาพ";
  if (isAddPhoto) {
    return {
      text: "กดปุ่มแนบรูปในช่องแชทนี้ได้เลยครับ ถ้ามีประกาศที่กำลังเตรียมอยู่ น้องเอจะผูกภาพเข้ากับประกาศนั้นให้ครับ",
      carCards: [],
      skipGemini: true,
    };
  }

  const isRestartDraft = message.trim() === "เริ่มใหม่";
  if (isRestartDraft) {
    return {
      text: "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ",
      carCards: [],
      skipGemini: true,
    };
  }

  const contextCars =
    options?.contextCarsOverride && options.contextCarsOverride.length > 0
      ? options.contextCarsOverride
      : loadChatCarContext(chatSessionId);
  const conversationalMemory = getConversationalLeadMemory(chatSessionId ?? "");
  const inChatBuyerContext = loadInChatBuyerContext(chatSessionId);

  const contextualFollowUp = tryContextualBuyerFollowUp(message, contextCars);
  if (contextualFollowUp) {
    return contextualFollowUp;
  }

  // v22.57 — named inventory compare: base = active vehicle, target = inventory search
  if (isNamedInventoryCompareIntent(message)) {
    const resolved = resolveInventoryBackedComparePair(
      message,
      inventory,
      contextCars
    );
    if (resolved.ok === false) {
      const unavailable = buildInventoryCompareUnavailableReply(resolved);
      return {
        text: unavailable.text,
        carCards: unavailable.carCards,
        skipGemini: true,
      };
    }
    const built = buildInventoryBackedCompareReply(resolved);
    return {
      text: built.text,
      carCards: built.carCards,
      skipGemini: true,
    };
  }

  // v22.56 — grounded mileage judgment before advisor/facts "select car first" trap
  if (isBuyerMileageEvaluationQuestion(message) && contextCars.length > 0) {
    const mileageResolved = resolveTargetBuyerCarDetailed(
      message,
      inventory,
      contextCars,
      { allowSessionFallback: true }
    );
    if (mileageResolved.ambiguousMileageMatches?.length) {
      return {
        text: buildAmbiguousMileageClarification(
          mileageResolved.ambiguousMileageMatches
        ),
        carCards: mileageResolved.ambiguousMileageMatches.slice(0, 3),
        skipGemini: true,
      };
    }
    if (mileageResolved.car) {
      return {
        text: buildMileageEvaluationReply(mileageResolved.car, {
          statedMileage: extractStatedMileageFromMessage(message),
        }),
        carCards: [mileageResolved.car],
        skipGemini: true,
      };
    }
  }

  // WP-VD01 — inventory search by monthly affordability must not be stolen
  // by the generic finance calculator (selected-car ผ่อน path stays below).
  const financeCalc = isMonthlyAffordabilityDiscovery(message)
    ? null
    : tryBuyerFinanceCalculatorReply(message);
  if (financeCalc) {
    return {
      text: financeCalc.text,
      carCards: [],
      skipGemini: true,
    };
  }

  // Selected-car finance / installment BEFORE buyer-facts so ผ่อน/ไฟแนนซ์
  // never fall into unknownHistory. Uses trusted inventory price only.
  if (isSelectedCarFinanceIntent(message)) {
    const embeddedId = extractSelectedCarId(message);
    const selection = resolveSelectedCarIdState(chatSessionId);

    if (!embeddedId && selection.kind === "cleared") {
      return askWhichCarReply();
    }

    const selectedId =
      embeddedId ?? (selection.kind === "selected" ? selection.id : null);

    if (!selectedId) {
      if (/คันนี้|รถคันนี้|คันนั้น/i.test(message)) {
        return askWhichCarReply();
      }
    } else {
      const invCar = inventory.find((c) => c.id === selectedId);
      if (!invCar || !(invCar.price > 0)) {
        return askWhichCarReply();
      }
      const financeSelected = tryBuyerFinanceCalculatorReply(message, {
        trustedSelectedCarPrice: invCar.price,
      });
      if (financeSelected) {
        const trustedCard = summaryToChatCarCardData(
          toChatCarSummary(invCar),
          "exact"
        );
        return {
          text: financeSelected.text,
          carCards: [trustedCard],
          skipGemini: true,
        };
      }
    }
  }

  // Buyer facts (history / inspection / specs) BEFORE intent gate — soft-search
  // cues like "มี..." must not steal unknownHistory or prePurchaseCheck.
  {
    const factsKind = classifyBuyerFactsQuestion(message);
    if (factsKind !== "none") {
      const selection = resolveSelectedCarIdState(chatSessionId);
      const contextualAsk = /คันนี้|รถคันนี้|คันนั้น/i.test(message);
      if (
        selection.kind === "cleared" &&
        (contextualAsk ||
          factsKind === "unknownHistory" ||
          factsKind === "prePurchaseCheck")
      ) {
        return askWhichCarReply();
      }
      // No explicit selection + multi-car context + contextual pronoun:
      // fail closed (do not silent-pick first card).
      if (
        selection.kind === "none" &&
        !extractSelectedCarId(message) &&
        contextualAsk &&
        contextCars.length !== 1
      ) {
        return {
          text: BUYER_ASK_SELECT_CAR_FIRST,
          carCards: [],
          skipGemini: true,
        };
      }
      const targetResolved = resolveTargetBuyerCarDetailed(
        message,
        inventory,
        contextCars,
        {
          allowSessionFallback:
            selection.kind === "selected" ||
            contextualAsk ||
            isBuyerMileageEvaluationQuestion(message) ||
            Boolean(extractSelectedCarId(message)) ||
            contextCars.length === 1,
        }
      );
      if (targetResolved.ambiguousMileageMatches?.length) {
        return {
          text: buildAmbiguousMileageClarification(
            targetResolved.ambiguousMileageMatches
          ),
          carCards: targetResolved.ambiguousMileageMatches.slice(0, 3),
          skipGemini: true,
        };
      }
      const targetCar = targetResolved.car;
      if (!targetCar) {
        return {
          text: BUYER_ASK_SELECT_CAR_FIRST,
          carCards: [],
          skipGemini: true,
        };
      }
      return {
        text: buildBuyerFactsReply(targetCar, factsKind, {
          peerCars: contextCars,
          userMessage: message,
        }),
        carCards: [targetCar],
        skipGemini: true,
      };
    }
  }

  const troubleshooting = tryTroubleshootingAdvisorReply(message);
  if (troubleshooting) {
    return {
      text: troubleshooting.text,
      carCards: [],
      skipGemini: true,
    };
  }

  const insuranceAdvisor = tryInsuranceAdvisorReply(message);
  if (insuranceAdvisor) {
    return {
      text: insuranceAdvisor.text,
      carCards: [],
      skipGemini: true,
    };
  }

  const helpOnboarding = tryHelpOnboardingReply(message, {
    displayName: options?.displayName,
  });
  if (helpOnboarding) {
    return {
      text: helpOnboarding.text,
      carCards: [],
      skipGemini: true,
    };
  }

  const selectedForAdvisor = resolveTargetBuyerCar(message, inventory, contextCars, {
    allowSessionFallback:
      /คันนี้|รถคันนี้|คันนั้น/i.test(message) ||
      isBuyerMileageEvaluationQuestion(message),
  });

  const intentGate = tryBuyerIntentGateReply(message, {
    hasTargetCarForFacts: Boolean(
      resolveTargetBuyerCar(message, inventory, contextCars, {
        allowSessionFallback:
          /คันนี้|รถคันนี้|ไมล์|เลขไมล์|วิ่ง/i.test(message) ||
          isBuyerMileageEvaluationQuestion(message) ||
          Boolean(extractSelectedCarId(message)) ||
          contextCars.length === 1,
      })
    ),
    selectedCarForAdvisor: selectedForAdvisor,
    discoveryContext: {
      usageTags: [
        ...(conversationalMemory?.usageTags ?? []),
        ...(inChatBuyerContext?.usageTags ?? []),
      ],
      budgetMax:
        conversationalMemory?.budgetMax ??
        inChatBuyerContext?.budgetMax ??
        undefined,
      brands: conversationalMemory?.brands,
      models: conversationalMemory?.models,
    },
  });
  if (intentGate) {
    return {
      text: intentGate.text,
      carCards: [],
      skipGemini: true,
    };
  }

  if (isFollowUpCarQuestion(message) && contextCars.length > 0) {
    const isCompare = isCompareIntent(message);
    const isSelected = isSelectedCarIntent(message);
    let selectedId = extractSelectedCarId(message);
    let selectionCleared = false;

    if (isSelected && !selectedId) {
      const selection = resolveSelectedCarIdState(chatSessionId);
      if (selection.kind === "cleared") {
        selectionCleared = true;
      } else if (selection.kind === "selected") {
        selectedId = selection.id;
      } else {
        const viewed = loadRecentlyViewedCarIds();
        if (viewed.length > 0) {
          selectedId = viewed[0];
        }
      }
    }

    if (isSelected) {
      if (selectionCleared) {
        return askWhichCarReply();
      }
      if (!selectedId && contextCars.length > 0) {
        selectedId = contextCars[0].id;
      }

      if (selectedId) {
        // Find the specific car from context or inventory
        let picked = contextCars.find((c) => c.id === selectedId);

        // If not in context, try to find it in inventory and convert to ChatCarCardData
        if (!picked) {
          const invCar = inventory.find((c) => c.id === selectedId);
          if (invCar) {
            picked = summaryToChatCarCardData(toChatCarSummary(invCar), "exact");
          }
        }

        if (picked) {
          return {
            text: buildSelectedCarReplyCopy(picked),
            carCards: [picked],
            skipGemini: true,
          };
        }
      }

      // If we couldn't find the car by ID, ask the user
      return askWhichCarReply();
    }

    const picked = resolveCarsFromContextHint(message, contextCars);
    if (picked.length > 0) {
      if (isCompare) {
        if (picked.length < 2) {
          return {
            text: "ตอนนี้มีรถในบริบทแค่ 1 คัน อยากให้เปรียบเทียบกับคันไหนเพิ่มครับ?",
            carCards: picked,
            skipGemini: true,
          };
        }
        return {
          text: buildCompareReplyCopy(picked),
          carCards: picked,
          skipGemini: true,
        };
      } else if (isSelected) {
        return {
          text: buildSelectedCarReplyCopy(picked[0]),
          carCards: [picked[0]],
          skipGemini: true,
        };
      } else {
        return {
          text: buildFollowUpReplyCopy(picked, message),
          carCards: picked,
          skipGemini: true,
        };
      }
    }
  }

  if (isSelectedCarIntent(message)) {
    let selectedId = extractSelectedCarId(message);
    if (!selectedId) {
      const selection = resolveSelectedCarIdState(chatSessionId);
      if (selection.kind === "cleared") {
        return askWhichCarReply();
      }
      if (selection.kind === "selected") {
        selectedId = selection.id;
      } else {
        const viewed = loadRecentlyViewedCarIds();
        if (viewed.length > 0) {
          selectedId = viewed[0];
        }
      }
    }

    if (!selectedId) {
      const contextCars = loadChatCarContext(chatSessionId);
      if (contextCars.length > 0) {
        selectedId = contextCars[0].id;
      }
    }

    if (selectedId) {
      const invCar = inventory.find((c) => c.id === selectedId);
      if (invCar) {
        const picked = summaryToChatCarCardData(toChatCarSummary(invCar), "exact");
        return {
          text: buildSelectedCarReplyCopy(picked),
          carCards: [picked],
          skipGemini: true,
        };
      }
    }

    return askWhichCarReply();
  }

  const isShowMore = /ดูเพิ่ม|ขอดูเพิ่ม|ดูต่อ|ขออีก|มีอีกไหม/.test(message);
  if (isShowMore) {
    const searchCtx = loadChatSearchContext(chatSessionId);
    if (searchCtx) {
      if (searchCtx.allCars.length > searchCtx.offset) {
        const nextOffset = searchCtx.offset + 3;
        const nextCars = searchCtx.allCars.slice(searchCtx.offset, nextOffset);
        const hasMore = searchCtx.allCars.length > nextOffset;

        saveChatSearchContext(
          {
            allCars: searchCtx.allCars,
            offset: nextOffset,
            pitchLines: searchCtx.pitchLines,
          },
          chatSessionId
        );
        if (nextCars.length > 0) saveChatCarContext(nextCars, chatSessionId);

        // v7.4 — narrative fusion: the per-car reason now lives on each card
        // (fitReason), so the show-more text stays a short, natural connector.
        const text = `ต่อด้วยอีก ${nextCars.length} คันที่น่าสนใจครับ ดูเหตุผลที่เข้ากับโจทย์ได้บนการ์ดแต่ละคันเลยครับ`;

        return {
          text,
          carCards: nextCars,
          skipGemini: true,
          hasMoreCars: hasMore,
        };
      } else {
        return {
          text: "รายการค้นหาชุดนี้แสดงครบแล้วครับ ลองปรับเงื่อนไขการค้นหาใหม่ หรือบอกน้องเอว่าต้องการรถแบบไหนได้เลยครับ",
          carCards: [],
          skipGemini: true,
        };
      }
    } else {
      return {
        text: "ยังไม่มีรายการค้นหาก่อนหน้าให้ดูเพิ่มครับ ลองบอกน้องเอว่าต้องการรถแบบไหนก่อนนะครับ",
        carCards: [],
        skipGemini: true,
      };
    }
  }

  const scopedBuyerSearchMessage = (() => {
    if (!isVagueUnclearBuyerMessage(message)) return message;
    const mem = conversationalMemory;
    if (!mem) return message;
    const budget = mem.budgetMax;
    const usage = mem.usageTags?.[0];
    if (budget == null || !usage) return message;
    const usagePrompt: Record<string, string> = {
      family: "ใช้กับครอบครัว",
      city: "ขับในเมือง",
      fuelEfficient: "เน้นประหยัดน้ำมัน",
      firstCar: "รถคันแรก",
      easyMaintenance: "ดูแลง่าย",
      lowMaintenance: "ไม่จุกจิก",
    };
    const usageText = usagePrompt[usage] ?? usage;
    // Reuse explicit buyer-stated memory to continue search without re-asking.
    return `${message} งบไม่เกิน ${budget} บาท ${usageText}`;
  })();

  const priorSearchCtx = loadChatSearchContext(chatSessionId);
  const priorBuyerCtx = loadInChatBuyerContext(chatSessionId);
  const selectionForDiscovery = resolveSelectedCarIdState(chatSessionId);
  const discoveryContext = {
    priorCriteria: snapshotToPriorCriteria(
      priorSearchCtx?.discoveryCriteria ?? priorBuyerCtx?.discoveryCriteria
    ),
    selectedListingId:
      selectionForDiscovery.kind === "selected"
        ? selectionForDiscovery.id
        : null,
    contextCars:
      contextCars.length > 0
        ? contextCars
        : loadChatCarContext(chatSessionId),
  };

  const buyerScored = tryBuyerScoredMarketplaceReply(
    scopedBuyerSearchMessage,
    inventory,
    { discoveryContext }
  );
  if (buyerScored) {
    const initialCards = buyerScored.carCards;
    const hasMore =
      buyerScored.hasMoreCars ?? buyerScored.allCarCards.length > 3;

    if (buyerScored.allCarCards.length > 0) {
      saveChatSearchContext(
        {
          allCars: buyerScored.allCarCards,
          offset: 3,
          pitchLines: buyerScored.pitchLines,
          ...(buyerScored.discoveryCriteria
            ? { discoveryCriteria: buyerScored.discoveryCriteria }
            : {}),
        },
        chatSessionId
      );
      saveChatCarContext(initialCards, chatSessionId);
      // v22.56 — exact single result establishes active vehicle without card click
      if (initialCards.length === 1) {
        saveLastSelectedCarId(initialCards[0]!.id);
      }
      const intent = parseBuyerSearchIntent(message);
      saveInChatBuyerContext(
        {
          message,
          usageTags:
            buyerScored.discoveryCriteria?.usageTags ?? intent.usageTags,
          budgetMax:
            buyerScored.discoveryCriteria?.budgetMax ?? intent.budgetMax,
          seatsMin: intent.seatsMin,
          discoveryCriteria: buyerScored.discoveryCriteria ?? null,
        },
        chatSessionId
      );
    }

    // v7.4 — soft, display-only recall of remembered interest so the answer feels
    // continuous. Never sends a lead, never implies consent, never claims a car
    // HAS these traits — it only recalls the buyer's own stated preferences.
    let text = buyerScored.text;
    if (initialCards.length > 0) {
      const opener = buildSearchOpenerFromMemory(
        getConversationalLeadMemory(chatSessionId ?? "")
      );
      if (opener) {
        text = `${opener}\n\n${text}`;
      }
      // v7.5 — light market-context note (only with a budget/finance signal)
      const marketNote = buildMarketContextNote(
        parseBuyerSearchIntent(message),
        message
      );
      if (marketNote) {
        text = `${text}\n\n${marketNote}`;
      }
    }
    // v7.5.1 — safety nudge is woven centrally in tryOrchestrateChatReply so it
    // also covers the no-results path; not appended here to avoid duplication.

    return {
      text,
      carCards: initialCards,
      skipGemini: true,
      hasMoreCars: hasMore,
    };
  }

  if (!isMarketplaceSearchIntent(message)) return null;

  const result = runMarketplaceChatSearch(message, inventory);
  if (!result) return null;

  const allCarCards = summariesToCarCards(result.primary, result.alternatives);
  const initialCards = allCarCards.slice(0, 3);
  const hasMore = allCarCards.length > 3;

  if (allCarCards.length > 0) {
    saveChatSearchContext({ allCars: allCarCards, offset: 3 }, chatSessionId);
    saveChatCarContext(initialCards, chatSessionId);
    // v22.56 — exact single result establishes active vehicle without card click
    if (initialCards.length === 1) {
      saveLastSelectedCarId(initialCards[0]!.id);
    }
  }

  return {
    text: result.introText,
    carCards: initialCards,
    skipGemini: true,
    hasMoreCars: hasMore,
  };
}

export function tryOrchestrateChatReply(
  message: string,
  inventory: ChatInventoryCar[],
  options?: {
    attachedImageCount?: number;
    displayName?: string;
    firebaseUid?: string;
    chatSessionId?: string | null;
  }
): OrchestratedChatReply | null {
  const reply = tryOrchestrateChatReplyCore(message, inventory, options);
  if (!reply) {
    return null;
  }

  // v7.5.1 — single safety nudge for ANY reply path (search results, no-results,
  // follow-up) when the message has a payment/scam trigger. Skip if the reply
  // already carries safety guidance (e.g. the paymentSafety advisor) so we never
  // double up, and keep it to a single appended line.
  const safetyNudge = buildUsedCarSafetyNudge(message);
  if (
    safetyNudge &&
    !reply.text.includes(safetyNudge) &&
    !/เห็นรถจริง|ดูรถจริง|ตรวจเล่มทะเบียน|ตรวจเอกสาร/.test(reply.text)
  ) {
    reply.text = `${reply.text}\n\n${safetyNudge}`;
  }

  wireShadowChatPath({
    userMessage: message,
    legacyUserVisibleResponse: reply.text,
    userRole: "buyer",
    flowContext: { attachedImageCount: options?.attachedImageCount },
    source: "chatSearchOrchestrator",
    firebaseUid: options?.firebaseUid,
  });

  return reply;
}

export { CHAT_FACTS_ONLY_PROMPT, buildChatCarFacts, tryOrchestrateChatReplyCore };
