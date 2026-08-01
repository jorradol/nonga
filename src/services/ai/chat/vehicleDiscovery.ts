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

function buildExactSummary(
  criteria: VehicleDiscoveryCriteria,
  count: number,
  hasMore: boolean
): string {
  const labels = criteria.appliedLabels?.length
    ? criteria.appliedLabels.join(", ")
    : "เงื่อนไขที่ระบุ";
  const lines = [
    `น้องเอพบรถที่ตรงเงื่อนไข ${count} คันจาก Inventory จริงครับ (ใช้เงื่อนไข: ${labels})`,
  ];
  if (criteria.estimatedMonthlyMax != null && criteria.financeAssumptions) {
    const a = criteria.financeAssumptions;
    lines.push(
      `หมายเหตุ: งบประมาณค่างวดเป็นประมาณการจากสมมติฐานดาวน์ ${a.downPaymentPercent}% ดอกเบี้ย flat ${a.annualFlatRatePercent}% ผ่อน ${a.termMonths} เดือน — ไม่ใช่ผลอนุมัติสินเชื่อ`
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
  lines.push(
    "ถ้าสนใจคันไหน เลือกรถจากการ์ดได้เลยครับ น้องเอช่วยสรุปจุดเด่น หรือเทียบคันอื่นให้ต่อได้"
  );
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
    `น้องเอไม่พบรถที่ตรงเงื่อนไขทั้งหมดจาก Inventory จริงครับ (เงื่อนไข: ${labels})`,
  ];
  if (blocking.length) {
    lines.push(
      `เงื่อนไขที่ทำให้ไม่พบผลลัพธ์ตรงส่วนใหญ่คือ: ${blocking.join(", ")}`
    );
  }
  if (criteria.unverifiableConstraints?.length) {
    lines.push(
      `ยังตรวจเงื่อนไขนี้จากข้อมูลรถไม่ได้: ${criteria.unverifiableConstraints.join("; ")}`
    );
  }
  if (alternatives.length === 0) {
    lines.push(
      "ตอนนี้ยังไม่มีตัวเลือกใกล้เคียงในระบบ — ลองขยายงบ เปลี่ยนปี เปลี่ยนยี่ห้อ หรือบอกประเภทอื่นที่รับได้ครับ"
    );
    return lines.join("\n");
  }
  lines.push(
    `น้องเอมีตัวเลือกใกล้เคียง ${alternatives.length} คันจาก Inventory จริง (ไม่ตรงทุกเงื่อนไข) — แต่ละคันต่างจากเงื่อนไขเดิมดังนี้:`
  );
  for (const alt of alternatives.slice(0, 3)) {
    const diffs =
      alt.differences?.map((d) => d.detail).join("; ") ||
      alt.cautions?.join("; ") ||
      "ใกล้เคียงแต่ไม่ตรงทุกเงื่อนไข";
    lines.push(
      `• ${alt.car.brand} ${alt.car.model} ปี ${alt.car.year} (${formatPrice(alt.car.price)}): ${diffs}`
    );
  }
  if (relaxationNotes.length) {
    lines.push(`ทางเลือกใกล้เคียงได้จากการผ่อนคลาย: ${relaxationNotes.join(" → ")}`);
  }
  lines.push(
    "ต้องการขยายงบ เปลี่ยนปี เปลี่ยนยี่ห้อ หรือดูตัวเลือกใกล้เคียงเหล่านี้ต่อ บอกน้องเอได้เลยครับ"
  );
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

  if (criteria.needsClarification && !criteria.budgetMax && !criteria.brand) {
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
  const ranked = rankDiscoveryCandidates(criteria, exact);
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
      summaryText: buildExactSummary(criteria, all.length, hasMoreCars),
      carCards,
      allCarCards,
      hasMoreCars,
      isRelaxed: false,
    };
  }

  const { alternatives, blockingConstraints, relaxationNotes } =
    findDiscoveryNearAlternatives(inventory, criteria, 3);
  const allCarCards = candidatesToCards(alternatives);
  return {
    criteria,
    exactMatches: [],
    nearAlternatives: alternatives,
    blockingConstraints,
    summaryText: buildNoExactSummary(
      criteria,
      blockingConstraints,
      alternatives,
      relaxationNotes
    ),
    carCards: allCarCards,
    allCarCards,
    hasMoreCars: false,
    isRelaxed: true,
  };
}
