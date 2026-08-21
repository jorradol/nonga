/**
 * WP-NVB-03B — Trusted Search grounding packet, V.2 cards, deterministic
 * summary, and grounding/safety validation. Cards only from validated ToolResult IDs.
 */
import type { ChatCarCardData } from "../../../types";
import type { MarketplaceSearchToolResult } from "../../conversation-core/toolEnvelope";
import type { ChatV3AutomotiveVehicleContext } from "../chat-v3/chatV3AutomotiveReasoning";
import {
  collectListingImageCandidates,
  isValidListingImageUrl,
  normalizeListingImageDisplayUrl,
} from "../../../utils/listingImages";
import type { ChatInventoryCar } from "./marketplaceChatSearch";
import {
  BODY_CLASS_LABEL_TH,
  inferVehicleBodyClass,
  type VehicleBodyClass,
} from "./vehicleBodyClassifier";
import type {
  ServerDirectedSearchBodyClass,
  ServerDirectedSearchCriteria,
} from "./chatV2V3SearchGroundingCriteria";

export const SEARCH_GROUNDING_FACT_SCOPE = "returned-toolresult-page" as const;
export const SEARCH_GROUNDING_MARKETPLACE_REMAINDER = "unknown" as const;

export interface SearchGroundingListingFacts {
  readonly id: string;
  readonly brand: string;
  readonly model: string;
  readonly year: number;
  readonly price: number;
  readonly mileage?: number;
  readonly transmission?: string;
  readonly bodyClass?: ServerDirectedSearchBodyClass;
}

export interface SearchGroundingPacket {
  readonly requestId: string;
  readonly conversationId: string;
  readonly query: string;
  readonly criteria: ServerDirectedSearchCriteria;
  readonly returnedListingIds: readonly string[];
  readonly returnedCount: number;
  readonly displayedListingIds: readonly string[];
  readonly displayedCount: number;
  readonly hasMoreCars: false;
  readonly marketplaceRemainder: typeof SEARCH_GROUNDING_MARKETPLACE_REMAINDER;
  readonly displayedListings: readonly SearchGroundingListingFacts[];
  readonly provenance: "marketplace-search";
  readonly factScope: typeof SEARCH_GROUNDING_FACT_SCOPE;
}

const BODY_TYPE_EXPLICIT_MAP: ReadonlyArray<
  readonly [RegExp, ServerDirectedSearchBodyClass]
> = [
  [/กระบะ|pickup|pick-up/i, "pickup"],
  [/\bsuv\b|crossover|อเนกประสงค์/i, "suv"],
  [/\bmpv\b|รถตู้ครอบครัว/i, "mpv"],
  [/แวน|\bvan\b/i, "van"],
  [/\bcoupe\b|คูเป้/i, "coupe"],
  [/แฮทช์|hatchback/i, "hatchback"],
  [/เก๋ง|ซีดาน|\bsedan\b/i, "sedan"],
];

export function explicitBodyClassFromSourceField(
  bodyType: string | undefined
): ServerDirectedSearchBodyClass | undefined {
  const raw = String(bodyType ?? "").trim();
  if (!raw) return undefined;
  for (const [pattern, bodyClass] of BODY_TYPE_EXPLICIT_MAP) {
    if (pattern.test(raw)) return bodyClass;
  }
  return undefined;
}

function isPublishedTrustedListing(car: ChatInventoryCar): boolean {
  if (!car || typeof car.id !== "string" || car.id.trim().length === 0) {
    return false;
  }
  if (car.isSold) return false;
  if (car.listingStatus === "hidden" || car.listingStatus === "pending_review") {
    return false;
  }
  if (car.saleStatus === "pending_sale" || car.saleStatus === "sold") {
    return false;
  }
  if (
    car.listingStatus != null &&
    car.listingStatus !== "" &&
    car.listingStatus !== "published"
  ) {
    return false;
  }
  return true;
}

function requiredFactsPresent(car: ChatInventoryCar): boolean {
  return (
    typeof car.brand === "string" &&
    car.brand.trim().length > 0 &&
    typeof car.model === "string" &&
    car.model.trim().length > 0 &&
    Number.isFinite(car.year) &&
    car.year > 0 &&
    Number.isFinite(car.price) &&
    car.price >= 0
  );
}

function validMileage(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return undefined;
  }
  return raw;
}

function validTransmission(car: ChatInventoryCar): string | undefined {
  const direct = String(car.transmission ?? "").trim();
  if (direct) return direct;
  return undefined;
}

export function mapTrustedListingFacts(
  car: ChatInventoryCar
): SearchGroundingListingFacts | null {
  if (!isPublishedTrustedListing(car) || !requiredFactsPresent(car)) {
    return null;
  }
  const mileage = validMileage(car.mileage);
  const transmission = validTransmission(car);
  const bodyClass = explicitBodyClassFromSourceField(car.bodyType);
  return {
    id: car.id.trim(),
    brand: car.brand.trim(),
    model: car.model.trim(),
    year: car.year,
    price: car.price,
    ...(mileage != null ? { mileage } : {}),
    ...(transmission ? { transmission } : {}),
    ...(bodyClass ? { bodyClass } : {}),
  };
}

function listingImageUrls(car: ChatInventoryCar): string[] {
  const urls: string[] = [];
  for (const raw of collectListingImageCandidates(car)) {
    const url = String(raw ?? "").trim();
    if (!isValidListingImageUrl(url, car.id)) continue;
    const normalized = normalizeListingImageDisplayUrl(url);
    if (normalized && !urls.includes(normalized)) {
      urls.push(normalized);
    }
  }
  return urls;
}

export function mapTrustedListingToCarCard(
  car: ChatInventoryCar
): ChatCarCardData | null {
  const facts = mapTrustedListingFacts(car);
  if (!facts) return null;
  const inferred = inferVehicleBodyClass(car);
  const bodyClass = (facts.bodyClass ?? inferred) as VehicleBodyClass;
  const imageUrls = listingImageUrls(car);
  const heroUrl = imageUrls[0];
  return {
    id: facts.id,
    brand: facts.brand,
    model: facts.model,
    year: facts.year,
    price: facts.price,
    mileage: facts.mileage ?? 0,
    ...(car.color ? { color: String(car.color) } : {}),
    ...(car.fuelType ? { fuelType: String(car.fuelType) } : {}),
    ...(car.condition ? { condition: String(car.condition) } : {}),
    ...(facts.transmission ? { transmission: facts.transmission } : {}),
    ...(car.description ? { description: String(car.description).trim() } : {}),
    bodyClass,
    bodyClassLabel: BODY_CLASS_LABEL_TH[bodyClass] ?? BODY_CLASS_LABEL_TH.unknown,
    ...(car.showroomName ? { showroomName: String(car.showroomName) } : {}),
    ...(heroUrl ? { imageUrl: heroUrl } : {}),
    ...(imageUrls.length > 0 ? { imageUrls } : {}),
    hasImage: imageUrls.length > 0,
    detailPath: `/cars/${facts.id}`,
    matchKind: "exact",
  };
}

export function buildSearchGroundingPacket(input: {
  readonly requestId: string;
  readonly conversationId: string;
  readonly criteria: ServerDirectedSearchCriteria;
  readonly toolResult: MarketplaceSearchToolResult;
  readonly inventory: readonly ChatInventoryCar[];
}):
  | { readonly ok: true; readonly packet: SearchGroundingPacket; readonly carCards: ChatCarCardData[] }
  | { readonly ok: false; readonly reason: "unmapped-listing" | "invalid-tool-result" } {
  if (input.toolResult.status !== "ok" || !input.toolResult.data) {
    return { ok: false, reason: "invalid-tool-result" };
  }
  const returnedListingIds = input.toolResult.data.listingIds;
  const byId = new Map<string, ChatInventoryCar>();
  for (const car of input.inventory) {
    if (typeof car.id === "string" && car.id.trim()) {
      byId.set(car.id.trim(), car);
    }
  }

  const displayedListings: SearchGroundingListingFacts[] = [];
  const carCards: ChatCarCardData[] = [];
  for (const listingId of returnedListingIds) {
    const car = byId.get(listingId);
    if (!car) return { ok: false, reason: "unmapped-listing" };
    const facts = mapTrustedListingFacts(car);
    const card = mapTrustedListingToCarCard(car);
    if (!facts || !card) return { ok: false, reason: "unmapped-listing" };
    displayedListings.push(facts);
    carCards.push(card);
  }

  const packet: SearchGroundingPacket = {
    requestId: input.requestId,
    conversationId: input.conversationId,
    query: input.toolResult.data.query,
    criteria: input.criteria,
    returnedListingIds,
    returnedCount: returnedListingIds.length,
    displayedListingIds: displayedListings.map((item) => item.id),
    displayedCount: displayedListings.length,
    hasMoreCars: false,
    marketplaceRemainder: SEARCH_GROUNDING_MARKETPLACE_REMAINDER,
    displayedListings,
    provenance: "marketplace-search",
    factScope: SEARCH_GROUNDING_FACT_SCOPE,
  };

  return { ok: true, packet, carCards };
}

function formatBaht(price: number): string {
  return `${price.toLocaleString("th-TH")} บาท`;
}

export function buildDeterministicSearchGroundingSummary(
  packet: SearchGroundingPacket
): string {
  if (packet.displayedCount === 0) {
    return "ไม่พบรถที่ตรงตามเงื่อนไขที่ระบุในรอบนี้ครับ";
  }
  const lines = packet.displayedListings.map((listing, index) => {
    return `${index + 1}. ${listing.year} ${listing.brand} ${listing.model} — ${formatBaht(listing.price)}`;
  });
  return [
    `พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว ${packet.displayedCount} คันในรอบนี้ครับ`,
    ...lines,
  ].join("\n");
}

export function buildSearchGroundingAppendix(packet: SearchGroundingPacket): string {
  const listings = packet.displayedListings.map((listing) => {
    const facts: Record<string, string | number> = {
      id: listing.id,
      brand: listing.brand,
      model: listing.model,
      year: listing.year,
      price: listing.price,
    };
    if (listing.mileage != null) facts.mileage = listing.mileage;
    if (listing.transmission) facts.transmission = listing.transmission;
    if (listing.bodyClass) facts.bodyClass = listing.bodyClass;
    return facts;
  });
  return [
    "[Search Grounding — server-owned, returned ToolResult page only]",
    `displayedCount=${packet.displayedCount}`,
    `returnedCount=${packet.returnedCount}`,
    `factScope=${packet.factScope}`,
    `marketplaceRemainder=${packet.marketplaceRemainder}`,
    "พูดถึงได้เฉพาะรถในรายการด้านล่าง ห้ามเพิ่มรถที่ไม่มีในรายการ",
    "ห้ามแต่งราคา ไมล์ เกียร์ สต็อก หรือสถานะ",
    "ห้ามอ้างจำนวนทั้งตลาดหรือคำว่า ทั้งหมด ในความหมายของจำนวนตลาด",
    "แยกงบผู้ใช้ออกจากราคาประกาศ",
    "ห้ามอ้างว่าบันทึกความจำถาวรแล้ว",
    "ถ้าข้อเท็จจริงไม่มีในรายการ ห้ามพูดถึงข้อเท็จจริงนั้น",
    "ส่งผลลัพธ์เป็น JSON ตาม schema เท่านั้น: replyText คือข้อความภาษาไทยที่ผู้ใช้เห็น และ orderedListingIds คือลำดับการแสดงผล",
    "orderedListingIds ต้องใช้เฉพาะ id จาก trustedListings ให้ครบทุกคัน ไม่ซ้ำ และห้ามเพิ่มคันที่ไม่มีในรายการ",
    "เรียง orderedListingIds ให้ตรงกับลำดับที่นำเสนอรถใน replyText",
    "ห้ามใส่รหัสประกาศดิบใน replyText",
    `trustedListings=${JSON.stringify(listings)}`,
  ].join("\n");
}

export function buildSearchGroundingVehicleContext(
  packet: SearchGroundingPacket
): ChatV3AutomotiveVehicleContext {
  return {
    vehicles: packet.displayedListings.map((listing) => {
      const facts: Record<string, string> = {
        brand: listing.brand,
        model: listing.model,
        year: String(listing.year),
        price: String(listing.price),
      };
      if (listing.mileage != null) facts.mileage = String(listing.mileage);
      if (listing.transmission) facts.transmission = listing.transmission;
      if (listing.bodyClass) facts.bodyClass = listing.bodyClass;
      return {
        id: listing.id,
        label: `${listing.year} ${listing.brand} ${listing.model}`,
        facts,
      };
    }),
  };
}

function normalizeForGrounding(text: string): string {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function extractCountClaims(text: string): number[] {
  const counts: number[] = [];
  const pattern = /(\d+)\s*คัน/g;
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    counts.push(Number(match[1]));
    match = pattern.exec(text);
  }
  return counts;
}

export function validateSearchGroundingComposition(input: {
  readonly text: string;
  readonly packet: SearchGroundingPacket;
}): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const text = normalizeForGrounding(input.text);
  if (!text) {
    return { ok: false, reason: "empty-text" };
  }
  if (/ทั้งหมด/.test(text)) {
    return { ok: false, reason: "marketplace-total-claim" };
  }
  if (/ทั้งตลาด|ทั่วตลาด|ในตลาดมี\s*\d+|มีรถในระบบ\s*\d+/.test(text)) {
    return { ok: false, reason: "marketplace-total-claim" };
  }

  const counts = extractCountClaims(text);
  for (const count of counts) {
    if (count !== input.packet.displayedCount && count !== input.packet.returnedCount) {
      return { ok: false, reason: "incorrect-count" };
    }
    if (count !== input.packet.displayedCount) {
      return { ok: false, reason: "displayed-count-mismatch" };
    }
  }

  const knownIds = new Set(input.packet.displayedListingIds);
  for (const listing of input.packet.displayedListings) {
    knownIds.add(listing.id);
  }

  for (const listing of input.packet.displayedListings) {
    const identity = `${listing.brand} ${listing.model}`;
    const identityRe = new RegExp(
      `${escapeRegExp(listing.brand)}.{0,24}${escapeRegExp(listing.model)}`,
      "i"
    );
    for (const other of input.packet.displayedListings) {
      if (other.id === listing.id) continue;
      const otherIdentityRe = new RegExp(
        `${escapeRegExp(other.brand)}.{0,24}${escapeRegExp(other.model)}`,
        "i"
      );
      if (!otherIdentityRe.test(text)) continue;
      const otherWindow = windowAroundMatch(text, otherIdentityRe);
      if (otherWindow.includes(String(listing.price)) && listing.price !== other.price) {
        return { ok: false, reason: "cross-listing-price" };
      }
      if (
        listing.mileage != null &&
        otherWindow.includes(String(listing.mileage)) &&
        listing.mileage !== other.mileage
      ) {
        return { ok: false, reason: "cross-listing-mileage" };
      }
    }
    void identity;
    void identityRe;
  }

  for (const listing of input.packet.displayedListings) {
    const identityRe = new RegExp(
      `${escapeRegExp(listing.brand)}.{0,40}${escapeRegExp(listing.model)}`,
      "i"
    );
    const window = windowAroundMatch(text, identityRe);
    if (!window) continue;
    if (listing.mileage == null && /\d[\d,]*\s*(?:กม|กิโลเมตร)/.test(window)) {
      return { ok: false, reason: "omitted-mileage-stated" };
    }
    if (
      !listing.transmission &&
      /เกียร์|ออโต้|อัตโนมัติ|ธรรมดา|แมนนวล/.test(window)
    ) {
      return { ok: false, reason: "omitted-transmission-stated" };
    }
    if (
      !listing.bodyClass &&
      /เก๋ง|ซีดาน|sedan|suv|กระบะ|mpv|แฮทช์/.test(window)
    ) {
      return { ok: false, reason: "omitted-body-stated" };
    }
  }

  return { ok: true };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function windowAroundMatch(text: string, pattern: RegExp): string {
  const match = pattern.exec(text);
  if (!match || match.index == null) return "";
  const start = Math.max(0, match.index - 24);
  const end = Math.min(text.length, match.index + match[0].length + 48);
  return text.slice(start, end);
}

/** Search-only Gemini JSON schema. Do not reuse the buyer structured-output field. */
export const SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    replyText: { type: "string" as const },
    orderedListingIds: {
      type: "array" as const,
      items: { type: "string" as const },
    },
  },
  required: ["replyText", "orderedListingIds"],
  additionalProperties: false,
};

export const SEARCH_GROUNDING_MAX_ORDERED_LISTING_IDS = 10;

export type SearchDisplayOrderClassification =
  | "structured-accepted"
  | "canonical-toolresult-degraded"
  | "deterministic-fallback"
  | "zero-result"
  | "failed-closed";

export type SearchGroundingProviderUnwrap =
  | {
      readonly kind: "structured";
      readonly replyText: string;
      readonly orderedListingIds: readonly string[] | undefined;
    }
  | { readonly kind: "plain-text"; readonly text: string }
  | { readonly kind: "json-leak" };

function stripSearchGroundingJsonFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function looksLikeSearchGroundingJsonEnvelope(text: string): boolean {
  const trimmed = stripSearchGroundingJsonFence(String(text ?? ""));
  if (!trimmed.startsWith("{")) return false;
  return (
    /"replyText"\s*:/.test(trimmed) ||
    /"orderedListingIds"\s*:/.test(trimmed) ||
    trimmed.endsWith("}")
  );
}

function asStringArray(value: unknown): readonly string[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return undefined;
  if (!value.every((item) => typeof item === "string")) return undefined;
  return value;
}

export function unwrapSearchGroundingProviderContent(
  raw: string
): SearchGroundingProviderUnwrap {
  const trimmed = stripSearchGroundingJsonFence(String(raw ?? ""));
  if (!trimmed) {
    return { kind: "plain-text", text: "" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    if (trimmed.startsWith("{")) {
      return { kind: "json-leak" };
    }
    return { kind: "plain-text", text: trimmed };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { kind: "json-leak" };
  }

  const record = parsed as Record<string, unknown>;
  const replyTextRaw = record.replyText;
  if (typeof replyTextRaw !== "string" || !replyTextRaw.trim()) {
    return { kind: "json-leak" };
  }
  const replyText = replyTextRaw.trim();
  if (looksLikeSearchGroundingJsonEnvelope(replyText)) {
    return { kind: "json-leak" };
  }

  const orderedListingIds =
    "orderedListingIds" in record
      ? asStringArray(record.orderedListingIds)
      : undefined;

  return {
    kind: "structured",
    replyText,
    orderedListingIds:
      "orderedListingIds" in record ? orderedListingIds ?? undefined : undefined,
  };
}

export function validateSearchGroundingOrderedListingIds(input: {
  readonly orderedListingIds: readonly string[] | undefined;
  readonly returnedListingIds: readonly string[];
}):
  | { readonly ok: true; readonly orderedListingIds: readonly string[] }
  | { readonly ok: false; readonly reason: string } {
  const ordered = input.orderedListingIds;
  const returned = input.returnedListingIds;
  if (ordered == null) {
    return { ok: false, reason: "missing-ordered-ids" };
  }
  if (ordered.length > SEARCH_GROUNDING_MAX_ORDERED_LISTING_IDS) {
    return { ok: false, reason: "exceeds-max-10" };
  }
  if (ordered.length !== returned.length) {
    return { ok: false, reason: "count-mismatch" };
  }
  const seen = new Set<string>();
  for (const id of ordered) {
    if (typeof id !== "string" || !id.trim()) {
      return { ok: false, reason: "invalid-id" };
    }
    if (seen.has(id)) {
      return { ok: false, reason: "duplicate-id" };
    }
    seen.add(id);
  }
  const returnedSet = new Set(returned);
  for (const id of ordered) {
    if (!returnedSet.has(id)) {
      return { ok: false, reason: "unknown-id" };
    }
  }
  if (seen.size !== returnedSet.size) {
    return { ok: false, reason: "omitted-id" };
  }
  for (const id of returned) {
    if (!seen.has(id)) {
      return { ok: false, reason: "omitted-id" };
    }
  }
  return { ok: true, orderedListingIds: ordered };
}

export function orderSearchGroundingCarCards(
  carCards: readonly ChatCarCardData[],
  orderedListingIds: readonly string[]
): ChatCarCardData[] {
  const byId = new Map<string, ChatCarCardData>();
  for (const card of carCards) {
    byId.set(card.id, card);
  }
  const ordered: ChatCarCardData[] = [];
  for (const id of orderedListingIds) {
    const card = byId.get(id);
    if (card) ordered.push(card);
  }
  return ordered;
}
