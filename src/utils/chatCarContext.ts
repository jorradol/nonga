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

interface SessionScopedPayload<T> {
  chatSessionId: string;
  savedAt: number;
  payload: T;
}

const IN_CHAT_BUYER_HINT_KEY = "nonga_chat_in_chat_buyer_hint";
const SEARCH_CTX_KEY = "nonga_chat_search_context";
const STORAGE_KEY = "nonga_chat_last_car_results";
const LAST_SELECTED_CAR_KEY = "nonga_chat_last_selected_car";
const RECENTLY_VIEWED_CARS_KEY = "nonga_chat_recently_viewed_cars";

/** Active chat session for scoped pilot car context (v6.1L.2i) */
let activePilotChatSessionId: string | null = null;

export function setActivePilotChatSessionId(sessionId: string | null): void {
  activePilotChatSessionId = sessionId;
}

export function getActivePilotChatSessionId(): string | null {
  return activePilotChatSessionId;
}

function resolveChatSessionId(explicit?: string | null): string | null {
  const sid = explicit ?? activePilotChatSessionId;
  return sid && sid.trim().length > 0 ? sid : null;
}

function readSessionScopedPayload<T>(
  key: string,
  chatSessionId: string
): T | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionScopedPayload<T> & {
      cars?: ChatCarCardData[];
      allCars?: ChatCarCardData[];
    };
    if (!parsed || typeof parsed !== "object") return null;
    // v6.1L.2i — legacy unscoped payloads must not leak across chats
    if (typeof parsed.chatSessionId !== "string" || parsed.chatSessionId !== chatSessionId) {
      return null;
    }
    if ("payload" in parsed && parsed.payload != null) {
      return parsed.payload as T;
    }
    // Legacy shape migration guard — treat as stale if missing payload wrapper
    return null;
  } catch {
    return null;
  }
}

function writeSessionScopedPayload<T>(
  key: string,
  chatSessionId: string,
  payload: T
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        chatSessionId,
        savedAt: Date.now(),
        payload,
      } satisfies SessionScopedPayload<T>)
    );
  } catch {
    /* quota */
  }
}

/** Clear pilot buyer car context (new chat / scope reset) — v6.1L.2i */
export function clearPilotChatSessionContext(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(IN_CHAT_BUYER_HINT_KEY);
    sessionStorage.removeItem(SEARCH_CTX_KEY);
  } catch {
    /* ignore */
  }
}

export function saveInChatBuyerContext(
  ctx: InChatBuyerContext,
  chatSessionId?: string | null
): void {
  const sid = resolveChatSessionId(chatSessionId);
  if (!sid) return;
  writeSessionScopedPayload(IN_CHAT_BUYER_HINT_KEY, sid, ctx);
}

export function loadInChatBuyerContext(
  chatSessionId?: string | null
): InChatBuyerContext | null {
  const sid = resolveChatSessionId(chatSessionId);
  if (!sid) return null;
  return readSessionScopedPayload<InChatBuyerContext>(IN_CHAT_BUYER_HINT_KEY, sid);
}

export function saveChatSearchContext(
  data: ChatSearchContextData,
  chatSessionId?: string | null
): void {
  const sid = resolveChatSessionId(chatSessionId);
  if (!sid) return;
  writeSessionScopedPayload(SEARCH_CTX_KEY, sid, data);
}

export function loadChatSearchContext(
  chatSessionId?: string | null
): ChatSearchContextData | null {
  const sid = resolveChatSessionId(chatSessionId);
  if (!sid) return null;
  const parsed = readSessionScopedPayload<ChatSearchContextData>(SEARCH_CTX_KEY, sid);
  if (
    parsed &&
    Array.isArray(parsed.allCars) &&
    typeof parsed.offset === "number"
  ) {
    return parsed;
  }
  return null;
}

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
    viewed = viewed.filter((id) => id !== carId);
    viewed.unshift(carId);
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

export function saveChatCarContext(
  cars: ChatCarCardData[],
  chatSessionId?: string | null
): void {
  const sid = resolveChatSessionId(chatSessionId);
  if (!sid) return;
  writeSessionScopedPayload(STORAGE_KEY, sid, { cars });
}

export function loadChatCarContext(
  chatSessionId?: string | null
): ChatCarCardData[] {
  const sid = resolveChatSessionId(chatSessionId);
  if (!sid) return [];
  const parsed = readSessionScopedPayload<{ cars?: ChatCarCardData[] }>(
    STORAGE_KEY,
    sid
  );
  return Array.isArray(parsed?.cars) ? parsed.cars : [];
}

export function resolveCarsFromContextHint(
  hint: string,
  contextCars: ChatCarCardData[]
): ChatCarCardData[] {
  const text = hint.toLowerCase();
  if (contextCars.length === 0) return [];

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

  const numberedPair = text.match(
    /(?:ช่วย)?(?:เปรียบเทียบ|เทียบ)(?:คันที่)?\s*(\d+)\s*(?:กับ|และ)\s*(\d+)/i
  );
  if (numberedPair) {
    const a = Number(numberedPair[1]);
    const b = Number(numberedPair[2]);
    const picked = [uniqueContextCars[a - 1], uniqueContextCars[b - 1]].filter(
      Boolean
    );
    if (picked.length > 0) return picked;
  }

  if (/คันแรก|คันที่\s*1/.test(text)) {
    return uniqueContextCars.slice(0, 1);
  }

  const byBrandModel = uniqueContextCars.filter((c) => {
    const blob = `${c.brand} ${c.model}`.toLowerCase();
    return (
      text.includes(c.brand.toLowerCase()) && text.includes(c.model.toLowerCase())
    );
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
  return /เปรียบเทียบ|เทียบ|คันไหนดีกว่า|คันไหนน่าสนใจกว่า|คันไหนไมล์น้อยกว่า/i.test(
    message
  );
}

export function isSelectedCarIntent(message: string): boolean {
  return (
    /\[SELECTED_CAR_ID:([^\]]+)\]/.test(message) ||
    /คันนี้|คันนั้น|สรุปรถคันนี้|รถคันนี้เหมาะกับใคร/i.test(message)
  );
}

export function extractSelectedCarId(message: string): string | null {
  const match = message.match(/\[SELECTED_CAR_ID:([^\]]+)\]/);
  return match ? match[1] : null;
}
