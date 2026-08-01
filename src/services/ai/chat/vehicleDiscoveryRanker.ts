/**
 * WP-VD01 — Explainable ranking for discovery candidates.
 * Reasons must come from real fields or clearly labeled inference.
 */

import type { BuyerSearchIntent } from "./buyerSearchIntentParser";
import {
  scoreBuyerMarketplaceCandidate,
  type BuyerMarketplaceScoredCandidate,
} from "./buyerMarketplaceScoring";
import { inferVehicleBodyClass } from "./vehicleBodyClassifier";
import type {
  VehicleDiscoveryCandidate,
  VehicleDiscoveryCriteria,
  VehicleDiscoverySort,
} from "./vehicleDiscoveryTypes";

function toBuyerIntent(criteria: VehicleDiscoveryCriteria): BuyerSearchIntent {
  const usage = [...(criteria.usageTags ?? [])];
  if (criteria.fuelEfficient && !usage.includes("fuelEfficient")) {
    usage.push("fuelEfficient");
  }
  return {
    isVehicleSearch: true,
    ...(criteria.budgetMax != null ? { budgetMax: criteria.budgetMax } : {}),
    ...(usage.length ? { usageTags: usage } : {}),
    ...(criteria.bodyHints?.length
      ? { bodyTypeHints: [...criteria.bodyHints] }
      : {}),
  };
}

function hardBonusReasons(
  criteria: VehicleDiscoveryCriteria,
  car: VehicleDiscoveryCandidate["car"]
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (criteria.brand && car.brand.toLowerCase().includes(criteria.brand.toLowerCase())) {
    score += 25;
    reasons.push(`ยี่ห้อตรงตามที่ขอ (${car.brand})`);
  }
  if (criteria.model) {
    const m = criteria.model.toLowerCase().replace(/-/g, "");
    if (car.model.toLowerCase().replace(/-/g, "").includes(m)) {
      score += 20;
      reasons.push(`รุ่นตรงตามที่ขอ (${car.model})`);
    }
  }
  if (criteria.preferNewerYear && car.year > 0) {
    // Strong year preference — must outweigh "cheapest wins" soft scoring
    score += Math.max(0, (car.year - 2000) * 4);
    reasons.push(`ปี ${car.year} — ให้น้ำหนักปีใหม่กว่าตามที่ขอ`);
  }
  if (criteria.budgetMax != null && car.price <= criteria.budgetMax) {
    score += 15;
    if (!reasons.some((r) => /งบ|ราคา/.test(r))) {
      reasons.push(
        `ราคา ${car.price.toLocaleString("th-TH")} บาท อยู่ในงบ`
      );
    }
  }
  if (criteria.minYear != null && car.year >= criteria.minYear) {
    score += 12;
    reasons.push(`ปี ${car.year} อยู่ในช่วงอายุที่ขอ`);
  }
  if (criteria.yearExact != null && car.year === criteria.yearExact) {
    score += 18;
    reasons.push(`ปีตรงตามที่ขอ (${car.year})`);
  }
  if (criteria.transmission === "auto") {
    score += 8;
    reasons.push("เกียร์อัตโนมัติตามข้อมูลประกาศ");
  }
  if (criteria.transmission === "manual") {
    score += 8;
    reasons.push("เกียร์ธรรมดาตามข้อมูลประกาศ");
  }
  if (criteria.estimatedMonthlyMax != null && criteria.financeAssumptions) {
    reasons.push(
      `ค่างวดประมาณการจากสมมติฐานดาวน์ ${criteria.financeAssumptions.downPaymentPercent}% ดอก flat ${criteria.financeAssumptions.annualFlatRatePercent}% ${criteria.financeAssumptions.termMonths} เดือน (ไม่ใช่ผลอนุมัติ)`
    );
  }

  const body = inferVehicleBodyClass(car);
  if (criteria.bodyHints?.includes("suv") && body === "suv") {
    score += 18;
    reasons.push("ตัวถัง SUV ตามที่ขอ");
  }
  if (criteria.bodyHints?.includes("mpv") && body === "mpv") {
    score += 12;
    reasons.push("ตัวถังรถครอบครัว/MPV ตามที่ขอ");
  }
  if (criteria.bodyHints?.includes("pickup") && body === "pickup") {
    score += 12;
    reasons.push("ตัวถังกระบะตามที่ขอ");
  }
  if (
    (criteria.bodyHints?.includes("hatchback") ||
      criteria.bodyHints?.includes("sedan")) &&
    (body === "hatchback" || body === "sedan")
  ) {
    score += 8;
    reasons.push("ขนาดตัวถังกะทัดรัดตามข้อมูลประเภทตัวถัง");
  }

  return { score, reasons };
}

function applySort(
  candidates: VehicleDiscoveryCandidate[],
  sort: VehicleDiscoverySort | undefined,
  preferNewerYear?: boolean
): VehicleDiscoveryCandidate[] {
  const copy = [...candidates];
  const mode = sort ?? "relevance";
  copy.sort((a, b) => {
    if (mode === "priceAsc") return a.car.price - b.car.price;
    if (mode === "priceDesc") return b.car.price - a.car.price;
    if (mode === "yearDesc") {
      if (b.car.year !== a.car.year) return b.car.year - a.car.year;
      if (b.score !== a.score) return b.score - a.score;
      return a.car.price - b.car.price;
    }
    if (mode === "yearAsc") return a.car.year - b.car.year;
    if (preferNewerYear && b.car.year !== a.car.year) {
      return b.car.year - a.car.year;
    }
    if (b.score !== a.score) return b.score - a.score;
    if (a.car.price !== b.car.price) return a.car.price - b.car.price;
    return b.car.year - a.car.year;
  });
  return copy;
}

/** Rank exact-match candidates with explainable reasons. */
export function rankDiscoveryCandidates(
  criteria: VehicleDiscoveryCriteria,
  exact: VehicleDiscoveryCandidate[]
): VehicleDiscoveryCandidate[] {
  const intent = toBuyerIntent(criteria);
  const ranked = exact.map((c) => {
    let scored: BuyerMarketplaceScoredCandidate | null = null;
    // When preferNewerYear, skip soft price-first scoring that can bury newer cars
    if (intent.isVehicleSearch && !criteria.preferNewerYear) {
      scored = scoreBuyerMarketplaceCandidate(intent, c.car);
    }
    const hard = hardBonusReasons(criteria, c.car);
    const reasons = [
      ...(scored?.reasons ?? []),
      ...hard.reasons,
      ...(c.reasons ?? []),
    ].filter(Boolean);
    const uniqueReasons = [...new Set(reasons)];
    const cautions = [
      ...(scored?.cautions ?? []),
      ...(c.cautions ?? []),
    ].filter(Boolean);

    return {
      ...c,
      listingId: c.car.id,
      score: (scored?.score ?? 0) + hard.score,
      reasons: uniqueReasons,
      ...(cautions.length ? { cautions: [...new Set(cautions)] } : {}),
      isExactMatch: true,
    } satisfies VehicleDiscoveryCandidate;
  });

  return applySort(ranked, criteria.sort, criteria.preferNewerYear);
}
