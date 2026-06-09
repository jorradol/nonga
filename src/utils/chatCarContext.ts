import type { ChatCarCardData } from "../types";

export interface ChatSearchContextData {
  allCars: ChatCarCardData[];
  offset: number;
  /** Parallel warm pitch lines for show-more (buyer scored search) */
  pitchLines?: string[];
}

/** Last buyer search hint for in-chat curated analysis weaving */
export interface InChatBuyerContext {
  message?: string;
  usageTags?: string[];
  budgetMax?: number | null;
  seatsMin?: number | null;
}

const IN_CHAT_BUYER_HINT_KEY = "nonga_chat_in_chat_buyer_hint";

export function saveInChatBuyerContext(ctx: InChatBuyerContext): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(IN_CHAT_BUYER_HINT_KEY, JSON.stringify(ctx));
  } catch {
    /* quota */
  }
}

export function loadInChatBuyerContext(): InChatBuyerContext | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(IN_CHAT_BUYER_HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InChatBuyerContext;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveChatSearchContext(data: ChatSearchContextData): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem("nonga_chat_search_context", JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function loadChatSearchContext(): ChatSearchContextData | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("nonga_chat_search_context");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatSearchContextData;
    if (Array.isArray(parsed.allCars) && typeof parsed.offset === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

const STORAGE_KEY = "nonga_chat_last_car_results";
const LAST_SELECTED_CAR_KEY = "nonga_chat_last_selected_car";
const RECENTLY_VIEWED_CARS_KEY = "nonga_chat_recently_viewed_cars";

export function saveLastSelectedCarId(carId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(LAST_SELECTED_CAR_KEY, carId);
  } catch {
    /* quota */
  }
}

export function loadLastSelectedCarId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(LAST_SELECTED_CAR_KEY);
  } catch {
    return null;
  }
}

export function addRecentlyViewedCarId(carId: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(RECENTLY_VIEWED_CARS_KEY);
    let viewed: string[] = [];
    if (raw) {
      viewed = JSON.parse(raw);
    }
    // Remove if exists to move to top
    viewed = viewed.filter(id => id !== carId);
    viewed.unshift(carId);
    // Keep only last 10
    if (viewed.length > 10) viewed = viewed.slice(0, 10);
    sessionStorage.setItem(RECENTLY_VIEWED_CARS_KEY, JSON.stringify(viewed));
  } catch {
    /* quota */
  }
}

export function loadRecentlyViewedCarIds(): string[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(RECENTLY_VIEWED_CARS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveChatCarContext(cars: ChatCarCardData[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), cars })
    );
  } catch {
    /* quota */
  }
}

export function loadChatCarContext(): ChatCarCardData[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { cars?: ChatCarCardData[] };
    return Array.isArray(parsed.cars) ? parsed.cars : [];
  } catch {
    return [];
  }
}

export function resolveCarsFromContextHint(
  hint: string,
  contextCars: ChatCarCardData[]
): ChatCarCardData[] {
  const text = hint.toLowerCase();
  if (contextCars.length === 0) return [];

  // Dedupe logic
  const dedupe = (cars: ChatCarCardData[]) => {
    const seen = new Set<string>();
    return cars.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  };

  const uniqueContextCars = dedupe(contextCars);

  if (/2\s*คันแรก|สองคันแรก|เทียบคันแรกกับคันที่สอง/.test(text)) {
    return uniqueContextCars.slice(0, 2);
  }

  const numberedPair = text.match(/(?:ช่วย)?(?:เปรียบเทียบ|เทียบ)(?:คันที่)?\s*(\d+)\s*(?:กับ|และ)\s*(\d+)/i);
  if (numberedPair) {
    const a = Number(numberedPair[1]);
    const b = Number(numberedPair[2]);
    const picked = [uniqueContextCars[a - 1], uniqueContextCars[b - 1]].filter(Boolean);
    if (picked.length > 0) return picked;
  }

  if (/คันแรก|คันที่\s*1/.test(text)) {
    return uniqueContextCars.slice(0, 1);
  }

  const byBrandModel = uniqueContextCars.filter((c) => {
    const blob = `${c.brand} ${c.model}`.toLowerCase();
    return text.includes(c.brand.toLowerCase()) && text.includes(c.model.toLowerCase());
  });
  if (byBrandModel.length > 0) return byBrandModel;

  if (/คันนี้|คันนั้น|คันแรก/.test(text)) {
    return uniqueContextCars.slice(0, 1);
  }

  return uniqueContextCars;
}

export function isFollowUpCarQuestion(message: string): boolean {
  return /คันนี้|คันนั้น|คันแรก|2\s*คันแรก|สองคันแรก|เปรียบเทียบ|ช่วยเทียบ|เทียบคันที่|เทียบ(?:คันที่)?\s*\d+|ดีไหม|น่าสนใจไหม|สรุป|เหมาะกับใคร|เอา(?:แบบ|)?(?:ประหยัด|รถครอบครัว|ผ่อนถูก)/i.test(
    message
  );
}

export function isCompareIntent(message: string): boolean {
  return /เปรียบเทียบ|เทียบ|คันไหนดีกว่า|คันไหนน่าสนใจกว่า|คันไหนไมล์น้อยกว่า/i.test(message);
}

export function isSelectedCarIntent(message: string): boolean {
  return /\[SELECTED_CAR_ID:([^\]]+)\]/.test(message) || /คันนี้|คันนั้น|สรุปรถคันนี้|รถคันนี้เหมาะกับใคร/i.test(message);
}

export function extractSelectedCarId(message: string): string | null {
  const match = message.match(/\[SELECTED_CAR_ID:([^\]]+)\]/);
  return match ? match[1] : null;
}
