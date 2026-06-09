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
  loadChatSearchContext,
  loadLastSelectedCarId,
  loadRecentlyViewedCarIds
} from "../../../utils/chatCarContext";
import { buildFollowUpReplyCopy, buildCompareReplyCopy, buildSelectedCarReplyCopy } from "./chatSearchReplyCopy";
import { buildChatCarFacts, CHAT_FACTS_ONLY_PROMPT } from "./chatSearchFacts";
import {
  isMarketplaceSearchIntent,
  runMarketplaceChatSearch,
  summariesToCarCards,
  summaryToChatCarCardData,
  toChatCarSummary,
  type ChatInventoryCar,
} from "./marketplaceChatSearch";

import { isSellIntent, extractCarFieldsFromMessage, buildDraftPreviewCopy, type ExtractedCarFields } from "./sellIntentParser";
import { isSaveListingChatAction } from "./chatDraftActions";
import {
  classifyBuyerFactsQuestion,
  buildBuyerFactsReply,
  resolveTargetBuyerCar,
  BUYER_ASK_SELECT_CAR_FIRST,
} from "./chatBuyerFactsQa";
import { tryBuyerFinanceCalculatorReply } from "./chatBuyerFinanceCalculator";
import { tryTroubleshootingAdvisorReply } from "./chatTroubleshootingAdvisorTemplates";
import { tryInsuranceAdvisorReply } from "./chatInsuranceAdvisorTemplates";
import { tryHelpOnboardingReply } from "./chatHelpOnboardingTemplates";
import { tryBuyerIntentGateReply } from "./chatBuyerIntentGate";
import { tryBuyerScoredMarketplaceReply } from "./buyerScoredMarketplaceSearch";
import { parseBuyerSearchIntent } from "./buyerSearchIntentParser";
import {
  detectBuyerRefinement,
  extractNumberedComparePair,
} from "./chatPilotBuyerFollowUp";
import { wireShadowChatPath } from "../salesBrainShadowChatPath";

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

/** v6.1L.2g — keep last shown cards for compare/refine follow-ups (client sessionStorage) */
function tryContextualBuyerFollowUp(
  message: string,
  contextCars: ChatCarCardData[]
): OrchestratedChatReply | null {
  if (contextCars.length === 0) return null;

  const comparePair = extractNumberedComparePair(message);
  const refinement = detectBuyerRefinement(message);
  const isCompare = isCompareIntent(message) || comparePair != null;

  if (!isCompare && !refinement) return null;

  if (isCompare) {
    let picked: ChatCarCardData[] = [];
    if (comparePair) {
      picked = [contextCars[comparePair.a - 1], contextCars[comparePair.b - 1]].filter(
        Boolean
      );
    } else {
      picked = resolveCarsFromContextHint(message, contextCars);
    }
    if (picked.length >= 2) {
      return {
        text: buildCompareReplyCopy(picked),
        carCards: picked,
        skipGemini: true,
      };
    }
    if (contextCars.length >= 2 && /เทียบ|เปรียบเทียบ|ช่วยเทียบ/i.test(message)) {
      const fallback = contextCars.slice(0, 2);
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

  const contextCars = loadChatCarContext(chatSessionId);

  const contextualFollowUp = tryContextualBuyerFollowUp(message, contextCars);
  if (contextualFollowUp) {
    return contextualFollowUp;
  }

  const financeCalc = tryBuyerFinanceCalculatorReply(message);
  if (financeCalc) {
    return {
      text: financeCalc.text,
      carCards: [],
      skipGemini: true,
    };
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
    allowSessionFallback: /คันนี้|รถคันนี้|คันนั้น/i.test(message),
  });

  const intentGate = tryBuyerIntentGateReply(message, {
    hasTargetCarForFacts: Boolean(
      resolveTargetBuyerCar(message, inventory, contextCars, {
        allowSessionFallback:
          /คันนี้|รถคันนี้|ไมล์|เลขไมล์/i.test(message) ||
          Boolean(extractSelectedCarId(message)),
      })
    ),
    selectedCarForAdvisor: selectedForAdvisor,
  });
  if (intentGate) {
    return {
      text: intentGate.text,
      carCards: [],
      skipGemini: true,
    };
  }

  const factsKind = classifyBuyerFactsQuestion(message);
  if (factsKind !== "none") {
    const targetCar = resolveTargetBuyerCar(message, inventory, contextCars, {
      allowSessionFallback:
        /คันนี้|รถคันนี้|คันนั้น/i.test(message) ||
        Boolean(extractSelectedCarId(message)),
    });
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

  if (isFollowUpCarQuestion(message) && contextCars.length > 0) {
    const isCompare = isCompareIntent(message);
    const isSelected = isSelectedCarIntent(message);
    let selectedId = extractSelectedCarId(message);
    
    if (isSelected && !selectedId) {
      selectedId = loadLastSelectedCarId();
      if (!selectedId) {
        const viewed = loadRecentlyViewedCarIds();
        if (viewed.length > 0) {
          selectedId = viewed[0];
        }
      }
    }

    if (isSelected) {
      if (!selectedId && contextCars.length > 0) {
        selectedId = contextCars[0].id;
      }
      
      if (selectedId) {
        // Find the specific car from context or inventory
        let picked = contextCars.find(c => c.id === selectedId);
        
        // If not in context, try to find it in inventory and convert to ChatCarCardData
        if (!picked) {
          const invCar = inventory.find(c => c.id === selectedId);
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
      return {
        text: "หมายถึงรถคันไหนครับ กดเลือกรถจากการ์ด หรือส่งลิงก์รถมาให้น้องเอได้เลยครับ",
        carCards: [],
        skipGemini: true,
      };
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
      selectedId = loadLastSelectedCarId();
      if (!selectedId) {
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
      const invCar = inventory.find(c => c.id === selectedId);
      if (invCar) {
        const picked = summaryToChatCarCardData(toChatCarSummary(invCar), "exact");
        return {
          text: buildSelectedCarReplyCopy(picked),
          carCards: [picked],
          skipGemini: true,
        };
      }
    }
    
    return {
      text: "หมายถึงรถคันไหนครับ กดเลือกรถจากการ์ด หรือส่งลิงก์รถมาให้น้องเอได้เลยครับ",
      carCards: [],
      skipGemini: true,
    };
  }

  const isShowMore = /ดูเพิ่ม|ขอดูเพิ่ม|ดูต่อ|ขออีก|มีอีกไหม/.test(message);
  if (isShowMore) {
    const searchCtx = loadChatSearchContext(chatSessionId);
    if (searchCtx) {
      if (searchCtx.allCars.length > searchCtx.offset) {
        const nextOffset = searchCtx.offset + 3;
        const nextCars = searchCtx.allCars.slice(searchCtx.offset, nextOffset);
        const hasMore = searchCtx.allCars.length > nextOffset;
        const nextPitches = searchCtx.pitchLines?.slice(
          searchCtx.offset,
          nextOffset
        );

        saveChatSearchContext(
          {
            allCars: searchCtx.allCars,
            offset: nextOffset,
            pitchLines: searchCtx.pitchLines,
          },
          chatSessionId
        );
        if (nextCars.length > 0) saveChatCarContext(nextCars, chatSessionId);

        const pitchBlock =
          nextPitches && nextPitches.length > 0
            ? nextPitches.join("\n\n")
            : "";
        const text = pitchBlock
          ? `ต่อด้วยอีก ${nextCars.length} คันที่น่าสนใจครับ\n\n${pitchBlock}`
          : `ต่อด้วยอีก ${nextCars.length} คันที่น่าสนใจครับ`;

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

  const buyerScored = tryBuyerScoredMarketplaceReply(message, inventory);
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
        },
        chatSessionId
      );
      saveChatCarContext(initialCards, chatSessionId);
      const intent = parseBuyerSearchIntent(message);
      saveInChatBuyerContext(
        {
          message,
          usageTags: intent.usageTags,
          budgetMax: intent.budgetMax,
          seatsMin: intent.seatsMin,
        },
        chatSessionId
      );
    }

    return {
      text: buyerScored.text,
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
