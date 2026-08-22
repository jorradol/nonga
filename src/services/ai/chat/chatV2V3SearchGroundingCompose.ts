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

export interface SearchVehicleAnalysis {
  readonly listingId: string;
  readonly analysisText: string;
}

export interface SearchVehicleSectionsOutput {
  readonly introText: string;
  readonly vehicleAnalyses: readonly SearchVehicleAnalysis[];
  readonly closingText: string;
}

export const SEARCH_READABLE_FALLBACK_NOTICE =
  "ระบบสามารถแสดงข้อเท็จจริงที่ตรวจแล้วของประกาศได้ แต่การวิเคราะห์โดยละเอียดจากเอไม่พร้อมใช้งานชั่วคราวครับ";

export const SEARCH_COUNT_CLAIM_DISPOSITIONS = [
  "none",
  "intro-replaced",
  "vehicle-analysis-rejected",
  "closing-replaced",
  "multiple-segments-normalized",
] as const;

export type SearchCountClaimDisposition =
  (typeof SEARCH_COUNT_CLAIM_DISPOSITIONS)[number];

export const SEARCH_ZERO_RESULT_NO_MATCH_CUE =
  /ไม่พบ|ยังไม่พบ|ไม่มี(?:รถ)?ที่ตรง|ไม่ตรงตามเงื่อนไข/;

function formatBaht(price: number): string {
  return `${price.toLocaleString("th-TH")} บาท`;
}

export function normalizeSearchNarrativeWhitespace(text: string): string {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function escapeHtmlLayoutChars(text: string): string {
  return text.replace(/[<>]/g, (ch) => (ch === "<" ? "&lt;" : "&gt;"));
}

function escapeInlineMarkdownControls(text: string): string {
  return text.replace(/[\\`*_\[\]()#!|{}~]/g, (ch) => `\\${ch}`);
}

function neutralizeLeadingBlockMarkup(text: string): string {
  return text
    .replace(/^(\d{1,2})\.\s+/, "$1\\. ")
    .replace(/^([-+])\s+/, "\\$1 ");
}

/** Provider intro/analysis/closing enter Server Markdown only through this seam. */
export function prepareSearchNarrativeForMarkdown(text: string): string {
  const collapsed = normalizeSearchNarrativeWhitespace(text);
  if (!collapsed) return "";
  return neutralizeLeadingBlockMarkup(
    escapeInlineMarkdownControls(escapeHtmlLayoutChars(collapsed))
  );
}

function escapeTrustedMarkdownFragment(text: string): string {
  return escapeInlineMarkdownControls(escapeHtmlLayoutChars(String(text ?? "")));
}

export function formatTrustedVehicleTitle(
  listing: SearchGroundingListingFacts
): string {
  return escapeTrustedMarkdownFragment(
    `${listing.year} ${listing.brand} ${listing.model}`.trim()
  );
}

export function formatTrustedPrice(price: number): string {
  return formatBaht(price);
}

export function formatTrustedMileage(mileage: number | undefined): string {
  if (mileage == null) return "ไม่ระบุในประกาศ";
  return `${mileage.toLocaleString("th-TH")} กม.`;
}

function renderTrustedVehicleSection(input: {
  readonly index: number;
  readonly listing: SearchGroundingListingFacts;
  readonly analysisText?: string;
}): string {
  const lines = [
    `${input.index}. **${formatTrustedVehicleTitle(input.listing)}**`,
    "",
    `- **ราคา:** ${formatTrustedPrice(input.listing.price)}`,
    `- **เลขไมล์:** ${formatTrustedMileage(input.listing.mileage)}`,
  ];
  const analysis = prepareSearchNarrativeForMarkdown(input.analysisText ?? "");
  if (analysis) {
    lines.push(`- **มุมมองของเอ:** ${analysis}`);
  }
  return lines.join("\n");
}

function joinMarkdownBlocks(blocks: readonly string[]): string {
  return blocks
    .map((block) => String(block ?? "").trim())
    .filter((block) => block.length > 0)
    .join("\n\n");
}

export function renderSearchVehicleSectionsMarkdown(input: {
  readonly introText: string;
  readonly closingText: string;
  readonly orderedListings: readonly SearchGroundingListingFacts[];
  readonly analysesByListingId: ReadonlyMap<string, string>;
}): string {
  const sections = input.orderedListings.map((listing, index) =>
    renderTrustedVehicleSection({
      index: index + 1,
      listing,
      analysisText: input.analysesByListingId.get(listing.id),
    })
  );
  return joinMarkdownBlocks([
    prepareSearchNarrativeForMarkdown(input.introText),
    ...sections,
    prepareSearchNarrativeForMarkdown(input.closingText),
  ]);
}

export function renderReadableSearchFallbackMarkdown(
  packet: SearchGroundingPacket,
  orderedListings: readonly SearchGroundingListingFacts[] = packet.displayedListings
): string {
  if (orderedListings.length === 0) {
    return "ไม่พบรถที่ตรงตามเงื่อนไขที่ระบุในรอบนี้ครับ";
  }
  const sections = orderedListings.map((listing, index) =>
    renderTrustedVehicleSection({
      index: index + 1,
      listing,
    })
  );
  return joinMarkdownBlocks([SEARCH_READABLE_FALLBACK_NOTICE, ...sections]);
}

export function renderZeroResultSearchMarkdown(input: {
  readonly introText: string;
  readonly closingText?: string;
}): string {
  return joinMarkdownBlocks([
    prepareSearchNarrativeForMarkdown(input.introText),
    prepareSearchNarrativeForMarkdown(input.closingText ?? ""),
  ]);
}

export function buildDeterministicSearchGroundingSummary(
  packet: SearchGroundingPacket
): string {
  return renderReadableSearchFallbackMarkdown(packet);
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
    "ส่งผลลัพธ์เป็น JSON ตาม schema เท่านั้น",
    "introText คือบทนำภาษาไทยตามธรรมชาติ ห้ามใส่รหัสประกาศดิบ และห้ามสร้างรายชื่อรถสำรอง",
    "vehicleAnalyses คือลำดับการแสดงผลเดียว ทั้งหัวข้อรถและการ์ด ต้องใช้ listingId จาก trustedListings ให้ครบทุกคัน ไม่ซ้ำ ไม่เกิน 10 และห้ามเพิ่มคันที่ไม่มีในรายการ",
    "analysisText ของแต่ละคันเป็นการวิเคราะห์ประกอบการตัดสินใจ ห้ามตั้งชื่อรถใหม่ ห้ามเปลี่ยนรุ่นย่อย ห้ามระบุราคาหรือเลขไมล์ซ้ำเป็นข้อเท็จจริง และห้ามแต่งสเปกที่ไม่มีใน trustedListings",
    "closingText คือบทปิดหรือคำแนะนำตามธรรมชาติ ห้ามใส่รหัสประกาศดิบ และห้ามสร้างรายชื่อรถสำรอง",
    "เมื่อ displayedCount เป็น 0 ให้ส่ง vehicleAnalyses เป็นอาเรย์ว่าง พร้อม introText ที่บอกตามจริงว่าไม่พบรถที่ตรงในรอบนี้ โดยไม่กล่าวว่าตลาดทั้งหมดว่าง",
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

const VEHICLE_COUNT_TOKEN_RE = /(\d+)\s*คัน/g;
const MARKETPLACE_WIDE_TOTAL_RE = /ทั้งตลาด|ทั่วตลาด|ในตลาดมี|มีรถในระบบ/;
const AGGREGATE_RESULT_COUNT_CUE_RE =
  /พบ|เจอ|คัด|แนะนำ|ตัวเลือก|ผลลัพธ์|รถที่พบ|ทั้งหมด|ผลการค้นหา/;
const LOCAL_VEHICLE_COUNT_WINDOW_RE =
  /(?:เป็น)?รถ\s*\d+\s*คัน(?:สำหรับ|ของ)|อยู่แล้ว\s*\d+\s*คัน|มีรถอยู่แล้ว|คันที่\s*\d+|คันแรก|คันที่สอง|คันที่สาม/;

function splitCountClaimClauses(text: string): string[] {
  const normalized = normalizeForGrounding(text);
  if (!normalized) return [];
  return normalized
    .split(/(?:ครับ|[.!?。;]|[\n\r])+/)
    .map((clause) => clause.trim())
    .filter((clause) => clause.length > 0);
}

function isLocalVehicleCountWindow(window: string): boolean {
  return LOCAL_VEHICLE_COUNT_WINDOW_RE.test(window);
}

function clauseHasAggregateResultCountCue(clause: string): boolean {
  if (AGGREGATE_RESULT_COUNT_CUE_RE.test(clause)) return true;
  const withoutOwnership = clause.replace(/มีรถอยู่แล้ว/g, "");
  return /(?<!ไม่)มี/.test(withoutOwnership);
}

function inspectClauseAggregateCountClaims(
  clause: string,
  authoritativeTotal: number
): "ok" | "incorrect-aggregate" {
  VEHICLE_COUNT_TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null = VEHICLE_COUNT_TOKEN_RE.exec(clause);
  while (match) {
    const count = Number(match[1]);
    const index = match.index ?? 0;
    const window = clause.slice(
      Math.max(0, index - 24),
      Math.min(clause.length, index + match[0].length + 24)
    );
    if (!isLocalVehicleCountWindow(window) && clauseHasAggregateResultCountCue(clause)) {
      if (!Number.isFinite(count) || count !== authoritativeTotal) {
        return "incorrect-aggregate";
      }
    }
    match = VEHICLE_COUNT_TOKEN_RE.exec(clause);
  }
  return "ok";
}

function inspectSegmentAggregateCountClaims(
  text: string,
  authoritativeTotal: number
): "ok" | "incorrect-aggregate" {
  const clauses = splitCountClaimClauses(text);
  const targets = clauses.length > 0 ? clauses : [normalizeForGrounding(text)];
  for (const clause of targets) {
    if (inspectClauseAggregateCountClaims(clause, authoritativeTotal) === "incorrect-aggregate") {
      return "incorrect-aggregate";
    }
  }
  return "ok";
}

/**
 * Grounding-only repair: drop incorrect aggregate Search-total phrases/tokens.
 * Keeps remaining V.3 wording. Never invents Server replacement prose.
 */
function stripIncorrectAggregateCountClaims(
  text: string,
  authoritativeTotal: number
): { readonly text: string; readonly changed: boolean } {
  const normalized = normalizeForGrounding(text);
  if (!normalized) {
    return { text: "", changed: false };
  }
  if (inspectSegmentAggregateCountClaims(normalized, authoritativeTotal) === "ok") {
    return { text: normalized, changed: false };
  }

  const clauses = splitCountClaimClauses(normalized);
  const targets = clauses.length > 0 ? clauses : [normalized];
  const kept: string[] = [];
  let changed = false;

  for (const clause of targets) {
    if (inspectClauseAggregateCountClaims(clause, authoritativeTotal) === "ok") {
      kept.push(clause);
      continue;
    }
    changed = true;
    let cleaned = clause.replace(/ทั้งหมด\s*(\d+)\s*คัน/g, (full, rawCount: string) => {
      const count = Number(rawCount);
      return Number.isFinite(count) && count === authoritativeTotal ? full : "";
    });
    cleaned = cleaned.replace(VEHICLE_COUNT_TOKEN_RE, (full, rawCount: string, offset: number) => {
      const count = Number(rawCount);
      if (Number.isFinite(count) && count === authoritativeTotal) {
        return full;
      }
      const window = clause.slice(
        Math.max(0, offset - 24),
        Math.min(clause.length, offset + full.length + 24)
      );
      if (isLocalVehicleCountWindow(window)) {
        return full;
      }
      if (clauseHasAggregateResultCountCue(clause)) {
        return "";
      }
      return full;
    });
    cleaned = normalizeForGrounding(cleaned);
    if (cleaned) {
      kept.push(cleaned);
    }
  }

  return {
    text: normalizeForGrounding(kept.join(" ")),
    changed,
  };
}

function resolveCountClaimDisposition(input: {
  readonly introReplaced: boolean;
  readonly closingReplaced: boolean;
  readonly analysisRejected: boolean;
}): SearchCountClaimDisposition {
  const flags = [
    input.introReplaced,
    input.closingReplaced,
    input.analysisRejected,
  ].filter(Boolean).length;
  if (flags === 0) return "none";
  if (flags > 1) return "multiple-segments-normalized";
  if (input.introReplaced) return "intro-replaced";
  if (input.closingReplaced) return "closing-replaced";
  return "vehicle-analysis-rejected";
}

function hasUnsupportedMarketplaceTotalClaim(text: string): boolean {
  const normalized = normalizeForGrounding(text);
  if (!normalized) return false;
  if (MARKETPLACE_WIDE_TOTAL_RE.test(normalized)) return true;
  const withoutBoundedAllCount = normalized.replace(/ทั้งหมด\s*\d+\s*คัน/g, "");
  return /ทั้งหมด/.test(withoutBoundedAllCount);
}

export function validateSearchGroundingComposition(input: {
  readonly text: string;
  readonly packet: SearchGroundingPacket;
}): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const text = normalizeForGrounding(input.text);
  if (!text) {
    return { ok: false, reason: "empty-text" };
  }
  if (hasUnsupportedMarketplaceTotalClaim(text)) {
    return { ok: false, reason: "marketplace-total-claim" };
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
    if (listing.mileage == null && extractListingMileageClaims(window).length > 0) {
      return { ok: false, reason: "omitted-mileage-stated" };
    }
    if (
      !listing.transmission &&
      (mentionsAutomaticTransmission(window) || mentionsManualTransmission(window))
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

function textContainsRawListingId(
  text: string,
  listingIds: readonly string[]
): boolean {
  const haystack = String(text ?? "");
  for (const id of listingIds) {
    if (id && haystack.includes(id)) return true;
  }
  return false;
}

function countTrustedIdentitiesInText(
  text: string,
  listings: readonly SearchGroundingListingFacts[]
): number {
  const haystack = String(text ?? "");
  let count = 0;
  for (const listing of listings) {
    const identityRe = new RegExp(
      `${escapeRegExp(listing.brand)}.{0,24}${escapeRegExp(listing.model)}`,
      "i"
    );
    if (identityRe.test(haystack)) count += 1;
  }
  return count;
}

function analysisRenamesTrustedModel(
  analysisText: string,
  listing: SearchGroundingListingFacts
): boolean {
  const model = listing.model.trim();
  if (!model) return false;
  const extraRe = new RegExp(
    `${escapeRegExp(model)}\\s+([A-Za-z][A-Za-z0-9-]{1,24})`,
    "i"
  );
  const match = extraRe.exec(analysisText);
  if (!match) return false;
  const extra = match[1] ?? "";
  if (!extra) return false;
  return !model.toLowerCase().includes(extra.toLowerCase());
}

const LISTING_PRICE_CUE_RE = /ราคา(?:ขาย)?|ค่าตัว/;
const LISTING_MILEAGE_CUE_RE = /เลขไมล์|ไมล์รถ|วิ่งมา|ระยะทางสะสม/;
const MANUAL_TRANSMISSION_RE =
  /เกียร์\s*(?:ธรรมดา|แมนนวล|manual)|เกียร์กระปุก|manual\s+(?:transmission|gear)|transmission\s*manual/i;
const AUTOMATIC_TRANSMISSION_RE =
  /เกียร์\s*(?:ออโต้|อัตโนมัติ|auto)|อัตโนมัติ|\bautomatic\b|ออโต้/i;

function extractCuedAmounts(
  text: string,
  unitPattern: string,
  cue: RegExp
): number[] {
  const amounts: number[] = [];
  const pattern = new RegExp(`(\\d[\\d,]*)\\s*(?:${unitPattern})`, "g");
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    const index = match.index ?? 0;
    const lookbehind = text.slice(Math.max(0, index - 28), index);
    const lookahead = text.slice(
      index + match[0].length,
      index + match[0].length + 16
    );
    if (cue.test(lookbehind) || cue.test(lookahead)) {
      const value = Number(String(match[1]).replace(/,/g, ""));
      if (Number.isFinite(value)) amounts.push(value);
    }
    match = pattern.exec(text);
  }
  return amounts;
}

function extractListingPriceClaims(text: string): number[] {
  return extractCuedAmounts(text, "บาท", LISTING_PRICE_CUE_RE);
}

function extractListingMileageClaims(text: string): number[] {
  return extractCuedAmounts(text, "(?:กม|กิโลเมตร)", LISTING_MILEAGE_CUE_RE);
}

function mentionsManualTransmission(text: string): boolean {
  return MANUAL_TRANSMISSION_RE.test(text);
}

function mentionsAutomaticTransmission(text: string): boolean {
  return AUTOMATIC_TRANSMISSION_RE.test(text);
}

function analysisConflictsWithTrustedFacts(
  analysisText: string,
  listing: SearchGroundingListingFacts
): boolean {
  const prices = extractListingPriceClaims(analysisText);
  for (const price of prices) {
    if (price !== listing.price) return true;
  }
  const mileages = extractListingMileageClaims(analysisText);
  for (const mileage of mileages) {
    if (listing.mileage == null || mileage !== listing.mileage) return true;
  }
  const transmission = String(listing.transmission ?? "").toLowerCase();
  const mentionsAuto = mentionsAutomaticTransmission(analysisText);
  const mentionsManual = mentionsManualTransmission(analysisText);
  if (transmission) {
    const isAuto = /auto|ออโต้|อัตโนมัติ/.test(transmission);
    const isManual = /manual|ธรรมดา|แมนนวล/.test(transmission);
    if (isAuto && mentionsManual && !mentionsAuto) return true;
    if (isManual && mentionsAuto && !mentionsManual) return true;
  } else if (mentionsAuto || mentionsManual) {
    return true;
  }
  return false;
}

const UNSUPPORTED_LISTING_CLAIM_RE =
  /ไม่เคยชน|ประวัติ(?:ซ่อม|ศูนย์|เจ้าของ)|อุบัติเหตุ|เจ้าของเดียว|รถศูนย์|เลขไมล์แท้|รับรองสภาพ|กม\.\s*\/\s*ลิตร|km\s*\/\s*l/i;

export function validateSearchVehicleSections(input: {
  readonly sections: SearchVehicleSectionsOutput;
  readonly packet: SearchGroundingPacket;
}):
  | {
      readonly ok: true;
      readonly orderedListingIds: readonly string[];
      readonly introText: string;
      readonly closingText: string;
      readonly vehicleAnalyses: readonly SearchVehicleAnalysis[];
      readonly countClaimDisposition: SearchCountClaimDisposition;
    }
  | { readonly ok: false; readonly reason: string } {
  const intro = normalizeSearchNarrativeWhitespace(input.sections.introText);
  const closing = normalizeSearchNarrativeWhitespace(input.sections.closingText);
  const analyses = input.sections.vehicleAnalyses;
  const listingIds = input.packet.returnedListingIds;
  const authoritativeTotal = listingIds.length;

  if (!Array.isArray(analyses)) {
    return { ok: false, reason: "invalid-listing-ids" };
  }
  if (!intro) {
    return { ok: false, reason: "empty-text" };
  }

  const orderCheck = validateSearchGroundingOrderedListingIds({
    orderedListingIds: analyses.map((item) => item.listingId),
    returnedListingIds: listingIds,
  });
  if (!orderCheck.ok) {
    return { ok: false, reason: "invalid-listing-ids" };
  }

  if (
    textContainsRawListingId(intro, listingIds) ||
    textContainsRawListingId(closing, listingIds)
  ) {
    return { ok: false, reason: "unsupported-listing-claim" };
  }
  if (countTrustedIdentitiesInText(intro, input.packet.displayedListings) >= 2) {
    return { ok: false, reason: "unsupported-listing-claim" };
  }
  if (countTrustedIdentitiesInText(closing, input.packet.displayedListings) >= 2) {
    return { ok: false, reason: "unsupported-listing-claim" };
  }

  if (input.packet.displayedCount === 0) {
    if (analyses.length !== 0) {
      return { ok: false, reason: "invalid-listing-ids" };
    }
    if (!SEARCH_ZERO_RESULT_NO_MATCH_CUE.test(intro)) {
      return { ok: false, reason: "empty-text" };
    }
  }

  const factsById = new Map(
    input.packet.displayedListings.map((listing) => [listing.id, listing])
  );
  const acceptedAnalyses: SearchVehicleAnalysis[] = [];
  for (const item of analyses) {
    const analysisText = normalizeSearchNarrativeWhitespace(item.analysisText);
    if (!analysisText) {
      return { ok: false, reason: "empty-text" };
    }
    if (textContainsRawListingId(analysisText, listingIds)) {
      return { ok: false, reason: "unsupported-listing-claim" };
    }
    const listing = factsById.get(item.listingId);
    if (!listing) {
      return { ok: false, reason: "invalid-listing-ids" };
    }
    if (analysisRenamesTrustedModel(analysisText, listing)) {
      return { ok: false, reason: "identity-rename" };
    }
    if (analysisConflictsWithTrustedFacts(analysisText, listing)) {
      return { ok: false, reason: "unsupported-listing-claim" };
    }
    if (UNSUPPORTED_LISTING_CLAIM_RE.test(analysisText)) {
      return { ok: false, reason: "unsupported-listing-claim" };
    }
    acceptedAnalyses.push({ listingId: item.listingId, analysisText });
  }

  if (hasUnsupportedMarketplaceTotalClaim(intro) || hasUnsupportedMarketplaceTotalClaim(closing)) {
    return { ok: false, reason: "marketplace-total-claim" };
  }
  for (const item of acceptedAnalyses) {
    if (hasUnsupportedMarketplaceTotalClaim(item.analysisText)) {
      return { ok: false, reason: "marketplace-total-claim" };
    }
  }

  let introText = intro;
  let closingText = closing;
  let introReplaced = false;
  let closingReplaced = false;
  let analysisRejected = false;
  const normalizeCounts = input.packet.displayedCount > 0;
  let renderedAnalyses = acceptedAnalyses;

  if (normalizeCounts) {
    const introStrip = stripIncorrectAggregateCountClaims(introText, authoritativeTotal);
    introText = introStrip.text;
    introReplaced = introStrip.changed;

    const closingStrip = stripIncorrectAggregateCountClaims(closingText, authoritativeTotal);
    closingText = closingStrip.text;
    closingReplaced = closingStrip.changed;

    renderedAnalyses = acceptedAnalyses.map((item) => {
      const analysisStrip = stripIncorrectAggregateCountClaims(
        item.analysisText,
        authoritativeTotal
      );
      if (analysisStrip.changed) {
        analysisRejected = true;
      }
      return { listingId: item.listingId, analysisText: analysisStrip.text };
    });
  }

  const composed = [
    introText,
    ...renderedAnalyses.map((item) => item.analysisText),
    closingText,
  ]
    .filter(Boolean)
    .join("\n\n");
  const grounded = validateSearchGroundingComposition({
    text: composed,
    packet: input.packet,
  });
  if (grounded.ok === false) {
    return { ok: false, reason: grounded.reason };
  }

  return {
    ok: true,
    orderedListingIds: orderCheck.orderedListingIds,
    introText,
    closingText,
    vehicleAnalyses: renderedAnalyses,
    countClaimDisposition: resolveCountClaimDisposition({
      introReplaced,
      closingReplaced,
      analysisRejected,
    }),
  };
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
    introText: { type: "string" as const },
    vehicleAnalyses: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          listingId: { type: "string" as const },
          analysisText: { type: "string" as const },
        },
        required: ["listingId", "analysisText"],
        additionalProperties: false,
      },
    },
    closingText: { type: "string" as const },
  },
  required: ["introText", "vehicleAnalyses", "closingText"],
  additionalProperties: false,
};

export const SEARCH_GROUNDING_MAX_ORDERED_LISTING_IDS = 10;

export type SearchDisplayOrderClassification =
  | "structured-accepted"
  | "deterministic-fallback"
  | "zero-result"
  | "failed-closed";

export type SearchGroundingProviderUnwrap =
  | {
      readonly kind: "structured";
      readonly introText: string;
      readonly vehicleAnalyses: readonly SearchVehicleAnalysis[];
      readonly closingText: string;
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
    /"introText"\s*:/.test(trimmed) ||
    /"vehicleAnalyses"\s*:/.test(trimmed) ||
    /"closingText"\s*:/.test(trimmed) ||
    /"replyText"\s*:/.test(trimmed) ||
    /"orderedListingIds"\s*:/.test(trimmed) ||
    trimmed.endsWith("}")
  );
}

function parseVehicleAnalyses(
  value: unknown
): readonly SearchVehicleAnalysis[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed: SearchVehicleAnalysis[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
    const record = item as Record<string, unknown>;
    if (typeof record.listingId !== "string" || typeof record.analysisText !== "string") {
      return undefined;
    }
    parsed.push({
      listingId: record.listingId,
      analysisText: record.analysisText,
    });
  }
  return parsed;
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
  const introRaw = record.introText;
  const closingRaw = record.closingText;
  const analyses = parseVehicleAnalyses(record.vehicleAnalyses);
  if (typeof introRaw !== "string" || !introRaw.trim()) {
    return { kind: "json-leak" };
  }
  if (typeof closingRaw !== "string") {
    return { kind: "json-leak" };
  }
  if (analyses == null) {
    return { kind: "json-leak" };
  }
  const introText = introRaw.trim();
  const closingText = closingRaw.trim();
  if (
    looksLikeSearchGroundingJsonEnvelope(introText) ||
    looksLikeSearchGroundingJsonEnvelope(closingText) ||
    analyses.some((item) => looksLikeSearchGroundingJsonEnvelope(item.analysisText))
  ) {
    return { kind: "json-leak" };
  }

  return {
    kind: "structured",
    introText,
    vehicleAnalyses: analyses.map((item) => ({
      listingId: item.listingId,
      analysisText: item.analysisText.trim(),
    })),
    closingText,
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

export function orderSearchGroundingListings(
  listings: readonly SearchGroundingListingFacts[],
  orderedListingIds: readonly string[]
): SearchGroundingListingFacts[] {
  const byId = new Map<string, SearchGroundingListingFacts>();
  for (const listing of listings) {
    byId.set(listing.id, listing);
  }
  const ordered: SearchGroundingListingFacts[] = [];
  for (const id of orderedListingIds) {
    const listing = byId.get(id);
    if (listing) ordered.push(listing);
  }
  return ordered;
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
