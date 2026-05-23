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
  toChatCarSummary,
  type ChatInventoryCar,
} from "./marketplaceChatSearch";

export interface OrchestratedChatReply {
  text: string;
  carCards: ChatCarCardData[];
  /** ใช้ข้อความจากระบบค้นหาโดยตรง ไม่เรียก Gemini */
  skipGemini: boolean;
  hasMoreCars?: boolean;
}

export function tryOrchestrateChatReply(
  message: string,
  inventory: ChatInventoryCar[]
): OrchestratedChatReply | null {
  const contextCars = loadChatCarContext();

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
            const summary = toChatCarSummary(invCar);
            picked = {
              id: summary.id,
              brand: summary.brand,
              model: summary.model,
              year: summary.year,
              price: summary.price,
              mileage: summary.mileage,
              color: summary.color,
              fuelType: summary.fuelType,
              condition: summary.condition,
              bodyClass: summary.bodyClass,
              bodyClassLabel: summary.bodyClassLabel,
              showroomName: summary.showroomName,
              imageUrl: summary.hasImage ? summary.image : undefined,
              hasImage: summary.hasImage,
              detailPath: `/cars/${summary.id}`,
              matchKind: "exact"
            };
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
        text: "ลุงหมายถึงรถคันไหนครับ กดเลือกรถจากการ์ด หรือส่งลิงก์รถมาให้น้องเอได้เลยครับ",
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
      const contextCars = loadChatCarContext();
      if (contextCars.length > 0) {
        selectedId = contextCars[0].id;
      }
    }
    
    if (selectedId) {
      const invCar = inventory.find(c => c.id === selectedId);
      if (invCar) {
        const summary = toChatCarSummary(invCar);
        const picked: ChatCarCardData = {
          id: summary.id,
          brand: summary.brand,
          model: summary.model,
          year: summary.year,
          price: summary.price,
          mileage: summary.mileage,
          color: summary.color,
          fuelType: summary.fuelType,
          condition: summary.condition,
          bodyClass: summary.bodyClass,
          bodyClassLabel: summary.bodyClassLabel,
          showroomName: summary.showroomName,
          imageUrl: summary.hasImage ? summary.image : undefined,
          hasImage: summary.hasImage,
          detailPath: `/cars/${summary.id}`,
          matchKind: "exact"
        };
        return {
          text: buildSelectedCarReplyCopy(picked),
          carCards: [picked],
          skipGemini: true,
        };
      }
    }
    
    return {
      text: "ลุงหมายถึงรถคันไหนครับ กดเลือกรถจากการ์ด หรือส่งลิงก์รถมาให้น้องเอได้เลยครับ",
      carCards: [],
      skipGemini: true,
    };
  }

  const isShowMore = /ดูเพิ่ม|ขอดูเพิ่ม|ดูต่อ|ขออีก|มีอีกไหม/.test(message);
  if (isShowMore) {
    const searchCtx = loadChatSearchContext();
    if (searchCtx) {
      if (searchCtx.allCars.length > searchCtx.offset) {
        const nextOffset = searchCtx.offset + 3;
        const nextCars = searchCtx.allCars.slice(searchCtx.offset, nextOffset);
        const hasMore = searchCtx.allCars.length > nextOffset;
        
        saveChatSearchContext({ allCars: searchCtx.allCars, offset: nextOffset });
        if (nextCars.length > 0) saveChatCarContext(nextCars);

        return {
          text: `ต่อด้วยอีก ${nextCars.length} คันที่น่าสนใจครับ`,
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

  if (!isMarketplaceSearchIntent(message)) return null;

  const result = runMarketplaceChatSearch(message, inventory);
  if (!result) return null;

  const allCarCards = summariesToCarCards(result.primary, result.alternatives);
  const initialCards = allCarCards.slice(0, 3);
  const hasMore = allCarCards.length > 3;

  if (allCarCards.length > 0) {
    saveChatSearchContext({ allCars: allCarCards, offset: 3 });
    saveChatCarContext(initialCards);
  }

  return {
    text: result.introText,
    carCards: initialCards,
    skipGemini: true,
    hasMoreCars: hasMore,
  };
}

export { CHAT_FACTS_ONLY_PROMPT, buildChatCarFacts };
