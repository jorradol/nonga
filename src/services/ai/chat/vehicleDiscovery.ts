/**
 * WP-VD01 — Vehicle discovery engine: parse → match → rank → relax → cards.
 * Deterministic; inventory is the only source of listing truth.
 */

import type { ChatCarCardData } from "../../../types";
import {
  summariesToCarCards,
  toChatCarSummary,
  type ChatInventoryCar,
} from "./marketplaceChatSearch";
import { parseVehicleDiscoveryCriteria } from "./vehicleDiscoveryCriteriaParser";
import { matchDiscoveryInventory } from "./vehicleDiscoveryMatcher";
import { rankDiscoveryCandidates } from "./vehicleDiscoveryRanker";
import { findDiscoveryNearAlternatives } from "./vehicleDiscoveryRelaxation";
import type {
  VehicleDiscoveryCandidate,
  VehicleDiscoveryContext,
  VehicleDiscoveryCriteria,
  VehicleDiscoveryResult,
} from "./vehicleDiscoveryTypes";

function formatPrice(n: number): string {
  return `${n.toLocaleString("th-TH")} บาท`;
}

function formatMileage(n: number | undefined | null): string | null {
  if (n == null || !(n > 0)) return null;
  return `${n.toLocaleString("th-TH")} กม.`;
}

function candidatesToCards(
  candidates: VehicleDiscoveryCandidate[]
): ChatCarCardData[] {
  const summaries = candidates.map((c) => toChatCarSummary(c.car));
  const cards = summariesToCarCards(summaries, []);
  return cards.map((card, i) => {
    const reason = candidates[i]?.reasons?.[0];
    const caution = candidates[i]?.cautions?.[0];
    const diff = candidates[i]?.differences?.[0]?.detail;
    const fitReason = reason ?? caution ?? diff;
    // Guard: never emit a card whose id is not the inventory listing id
    if (card.id !== candidates[i]?.listingId) {
      throw new Error(
        `Discovery card id mismatch: card=${card.id} listing=${candidates[i]?.listingId}`
      );
    }
    return fitReason ? { ...card, fitReason } : card;
  });
}

function excludeSelectedListing(
  candidates: VehicleDiscoveryCandidate[],
  selectedListingId: string | null | undefined
): VehicleDiscoveryCandidate[] {
  if (!selectedListingId) return candidates;
  return candidates.filter((c) => c.listingId !== selectedListingId);
}

function formatCarFactLine(c: VehicleDiscoveryCandidate): string {
  const parts = [
    `${c.car.brand} ${c.car.model} ปี ${c.car.year}`,
    `ราคาประกาศ ${formatPrice(c.car.price)}`,
  ];
  const km = formatMileage(c.car.mileage);
  if (km) parts.push(`ไมล์ ${km}`);
  const reason = c.reasons?.[0];
  if (reason) parts.push(reason);
  if (c.differences?.length) {
    parts.push(`ต่างเงื่อนไข: ${c.differences.map((d) => d.detail).join("; ")}`);
  }
  return `• ${parts.join(" — ")}`;
}

function buildExactSummary(
  criteria: VehicleDiscoveryCriteria,
  matches: VehicleDiscoveryCandidate[],
  hasMore: boolean
): string {
  const labels = criteria.appliedLabels?.length
    ? criteria.appliedLabels.join(", ")
    : "เงื่อนไขที่ระบุ";
  const lines = [
    `เข้าใจเงื่อนไข: ${labels}`,
    `พบรถที่ตรงเงื่อนไข ${matches.length} คันจาก Inventory จริง:`,
  ];
  for (const m of matches.slice(0, 3)) {
    lines.push(formatCarFactLine(m));
  }
  if (criteria.estimatedMonthlyMax != null && criteria.financeAssumptions) {
    const a = criteria.financeAssumptions;
    lines.push(
      `หมายเหตุ: ค่างวดเป็นประมาณการจากสมมติฐานดาวน์ ${a.downPaymentPercent}% · ดอกเบี้ย flat ${a.annualFlatRatePercent}% · ผ่อน ${a.termMonths} เดือน — ไม่ใช่ผลอนุมัติสินเชื่อ และไม่ใช่เงื่อนไขไฟแนนซ์ของผู้ขาย`
    );
    lines.push(
      "ต้องการปรับเงินดาวน์หรือระยะผ่อน บอกน้องเอได้ครับ"
    );
  }
  if (criteria.unverifiableConstraints?.length) {
    lines.push(
      `ยังตรวจเงื่อนไขนี้จากข้อมูลรถไม่ได้: ${criteria.unverifiableConstraints.join("; ")}`
    );
  }
  if (hasMore) {
    lines.push("มีตัวเลือกเพิ่ม — บอก “ขออีก 3 คัน” หรือ “ดูเพิ่ม” ได้ครับ");
  }
  lines.push("สนใจคันไหน เลือกจากการ์ดได้เลยครับ");
  return lines.join("\n");
}

function buildNoExactSummary(
  criteria: VehicleDiscoveryCriteria,
  blocking: string[],
  alternatives: VehicleDiscoveryCandidate[],
  relaxationNotes: string[]
): string {
  const labels = criteria.appliedLabels?.length
    ? criteria.appliedLabels.join(", ")
    : "เงื่อนไขที่ระบุ";
  const lines = [
    `เข้าใจเงื่อนไข: ${labels}`,
    "ไม่พบรถที่ตรงครบทุกเงื่อนไขจาก Inventory จริงครับ",
  ];
  if (blocking.length) {
    lines.push(`เงื่อนไขที่มักทำให้ไม่ตรง: ${blocking.join(", ")}`);
  }
  if (criteria.estimatedMonthlyMax != null && criteria.financeAssumptions) {
    const a = criteria.financeAssumptions;
    lines.push(
      `หมายเหตุ: ค่างวดเป็นประมาณการจากสมมติฐานดาวน์ ${a.downPaymentPercent}% · ดอกเบี้ย flat ${a.annualFlatRatePercent}% · ผ่อน ${a.termMonths} เดือน — ไม่ใช่ผลอนุมัติสินเชื่อ และไม่ใช่เงื่อนไขไฟแนนซ์ของผู้ขาย`
    );
    lines.push(
      "ต้องการปรับเงินดาวน์หรือระยะผ่อน บอกน้องเอได้ครับ"
    );
  }
  if (criteria.unverifiableConstraints?.length) {
    lines.push(
      `ยังตรวจเงื่อนไขนี้จากข้อมูลรถไม่ได้: ${criteria.unverifiableConstraints.join("; ")}`
    );
  }
  if (alternatives.length === 0) {
    lines.push(
      "ยังไม่มีตัวเลือกใกล้เคียงในระบบ — ลองขยายงบ เปลี่ยนปี เปลี่ยนยี่ห้อ หรือบอกประเภทอื่นที่รับได้ครับ"
    );
    return lines.join("\n");
  }
  lines.push(
    `ตัวเลือกใกล้เคียง ${alternatives.length} คัน (ไม่ตรงทุกเงื่อนไข):`
  );
  for (const alt of alternatives.slice(0, 3)) {
    lines.push(formatCarFactLine(alt));
  }
  if (relaxationNotes.length) {
    lines.push(`ผ่อนคลายเงื่อนไข: ${relaxationNotes.join(" → ")}`);
  }
  lines.push("ต้องการปรับเงื่อนไขต่อ บอกน้องเอได้เลยครับ");
  return lines.join("\n");
}

/**
 * Run full vehicle discovery against real inventory.
 * Returns null when message is not a discovery intent.
 */
export function runVehicleDiscovery(
  message: string,
  inventory: ChatInventoryCar[],
  context: VehicleDiscoveryContext = {}
): VehicleDiscoveryResult | null {
  const criteria = parseVehicleDiscoveryCriteria(message, context);
  if (!criteria.isDiscovery) return null;
  if (criteria.refineKind === "showMore") {
    // Pagination is handled by orchestrator search context — signal only
    return {
      criteria,
      exactMatches: [],
      nearAlternatives: [],
      blockingConstraints: [],
      summaryText: "",
      carCards: [],
      allCarCards: [],
      hasMoreCars: false,
      isRelaxed: false,
    };
  }

  if (
    criteria.needsClarification &&
    !criteria.budgetMax &&
    !criteria.brand &&
    !criteria.transmission &&
    !criteria.estimatedMonthlyMax
  ) {
    return {
      criteria,
      exactMatches: [],
      nearAlternatives: [],
      blockingConstraints: [],
      summaryText:
        criteria.clarificationQuestion ??
        "ช่วยบอกงบประมาณหรือประเภทรถที่สนใจเพิ่มได้ไหมครับ",
      carCards: [],
      allCarCards: [],
      hasMoreCars: false,
      isRelaxed: false,
    };
  }

  const { exact } = matchDiscoveryInventory(inventory, criteria);
  const ranked = excludeSelectedListing(
    rankDiscoveryCandidates(criteria, exact),
    context.selectedListingId
  );
  const limit = criteria.limit ?? 5;

  if (ranked.length > 0) {
    const all = ranked.slice(0, limit);
    const allCarCards = candidatesToCards(all);
    const carCards = allCarCards.slice(0, 3);
    const hasMoreCars = allCarCards.length > 3;
    return {
      criteria,
      exactMatches: all,
      nearAlternatives: [],
      blockingConstraints: [],
      summaryText: buildExactSummary(criteria, all, hasMoreCars),
      carCards,
      allCarCards,
      hasMoreCars,
      isRelaxed: false,
    };
  }

  const { alternatives, blockingConstraints, relaxationNotes } =
    findDiscoveryNearAlternatives(inventory, criteria, 3);
  const near = excludeSelectedListing(alternatives, context.selectedListingId);
  const allCarCards = candidatesToCards(near);
  return {
    criteria,
    exactMatches: [],
    nearAlternatives: near,
    blockingConstraints,
    summaryText: buildNoExactSummary(
      criteria,
      blockingConstraints,
      near,
      relaxationNotes
    ),
    carCards: allCarCards,
    allCarCards,
    hasMoreCars: false,
    isRelaxed: true,
  };
}
