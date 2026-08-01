/**
 * WP-VD01 — Hard-match inventory against discovery criteria.
 * Uses only published/visible listings and real listing fields.
 */

import type { ChatInventoryCar } from "./marketplaceChatSearch";
import { resolveChatListingTransmission } from "./marketplaceChatSearch";
import {
  inferVehicleBodyClass,
  type VehicleBodyClass,
} from "./vehicleBodyClassifier";
import type {
  VehicleDiscoveryBodyHint,
  VehicleDiscoveryCandidate,
  VehicleDiscoveryCriteria,
  VehicleDiscoveryMatchDiff,
  VehicleDiscoveryTransmission,
} from "./vehicleDiscoveryTypes";

export function isPublishedDiscoveryListing(car: ChatInventoryCar): boolean {
  if (car.isSold) return false;
  if (car.listingStatus === "hidden") return false;
  if (car.listingStatus === "pending_review") return false;
  if (car.saleStatus === "pending_sale" || car.saleStatus === "sold") {
    return false;
  }
  // Explicit unpublished gate — only published (or legacy unset) may surface
  if (
    car.listingStatus != null &&
    car.listingStatus !== "" &&
    car.listingStatus !== "published"
  ) {
    return false;
  }
  return true;
}

function transmissionMatches(
  car: ChatInventoryCar,
  want: VehicleDiscoveryTransmission
): boolean | "unverifiable" {
  const raw = resolveChatListingTransmission(car) ?? car.transmission ?? "";
  if (!raw.trim()) return "unverifiable";
  const t = raw.toLowerCase();
  const isAuto = /ออโต|อัตโนมัติ|\bat\b|cvt|automatic|auto/.test(t);
  const isManual = /ธรรมดา|แมนนวล|\bmt\b|manual/.test(t);
  if (want === "auto") {
    if (isAuto) return true;
    if (isManual) return false;
    return "unverifiable";
  }
  if (isManual) return true;
  if (isAuto) return false;
  return "unverifiable";
}

function bodyMatchesHint(
  body: VehicleBodyClass,
  hints: VehicleDiscoveryBodyHint[]
): boolean {
  for (const h of hints) {
    if (h === "sedan" && (body === "sedan" || body === "hatchback")) return true;
    if (h === "hatchback" && (body === "hatchback" || body === "sedan")) {
      return true;
    }
    if (h === body) return true;
  }
  return false;
}

export interface DiscoveryHardFilterResult {
  passed: boolean;
  failedConstraints: string[];
  unverifiableOnCar: string[];
  differences: VehicleDiscoveryMatchDiff[];
}

/** Evaluate one car against hard criteria (exact-match path). */
export function evaluateDiscoveryHardFilters(
  car: ChatInventoryCar,
  criteria: VehicleDiscoveryCriteria
): DiscoveryHardFilterResult {
  const failed: string[] = [];
  const unverifiableOnCar: string[] = [];
  const differences: VehicleDiscoveryMatchDiff[] = [];

  if (criteria.brand) {
    if (!car.brand.toLowerCase().includes(criteria.brand.toLowerCase())) {
      failed.push("ยี่ห้อ");
      differences.push({
        constraint: "ยี่ห้อ",
        detail: `ต้องการ ${criteria.brand} แต่คันนี้เป็น ${car.brand}`,
      });
    }
  }

  if (criteria.model) {
    const m = criteria.model.toLowerCase().replace(/-/g, "");
    const cm = car.model.toLowerCase().replace(/-/g, "");
    if (!cm.includes(m)) {
      failed.push("รุ่น");
      differences.push({
        constraint: "รุ่น",
        detail: `ต้องการ ${criteria.model} แต่คันนี้เป็น ${car.model}`,
      });
    }
  }

  if (criteria.budgetMax != null && car.price > criteria.budgetMax) {
    failed.push("งบประมาณสูงสุด");
    differences.push({
      constraint: "งบประมาณสูงสุด",
      detail: `ราคา ${car.price.toLocaleString("th-TH")} บาท เกินงบ ${criteria.budgetMax.toLocaleString("th-TH")} บาท`,
    });
  }

  if (criteria.budgetMin != null && car.price < criteria.budgetMin) {
    failed.push("งบประมาณขั้นต่ำ");
    differences.push({
      constraint: "งบประมาณขั้นต่ำ",
      detail: `ราคา ${car.price.toLocaleString("th-TH")} บาท ต่ำกว่างบขั้นต่ำ`,
    });
  }

  if (criteria.yearExact != null && car.year !== criteria.yearExact) {
    failed.push("ปีรถ");
    differences.push({
      constraint: "ปีรถ",
      detail: `ต้องการปี ${criteria.yearExact} แต่คันนี้ปี ${car.year}`,
    });
  }

  if (criteria.minYear != null && car.year < criteria.minYear) {
    failed.push(criteria.maxAgeYears != null ? "อายุรถ" : "ปีขั้นต่ำ");
    differences.push({
      constraint: criteria.maxAgeYears != null ? "อายุรถ" : "ปีขั้นต่ำ",
      detail: `ต้องการอย่างน้อยปี ${criteria.minYear} แต่คันนี้ปี ${car.year}`,
    });
  }

  if (criteria.bodyHints && criteria.bodyHints.length > 0) {
    const body = inferVehicleBodyClass(car);
    if (body === "unknown") {
      unverifiableOnCar.push("ประเภทตัวถัง");
    } else if (!bodyMatchesHint(body, criteria.bodyHints)) {
      failed.push("ประเภทรถ");
      differences.push({
        constraint: "ประเภทรถ",
        detail: `ต้องการ ${criteria.bodyHints.join("/")} แต่คันนี้อยู่กลุ่ม ${body}`,
      });
    }
  }

  if (criteria.transmission) {
    const tx = transmissionMatches(car, criteria.transmission);
    if (tx === false) {
      failed.push("เกียร์");
      differences.push({
        constraint: "เกียร์",
        detail: `ต้องการเกียร์${criteria.transmission === "auto" ? "ออโต้" : "ธรรมดา"} แต่ข้อมูลคันนี้ไม่ตรง`,
      });
    } else if (tx === "unverifiable") {
      unverifiableOnCar.push("เกียร์");
    }
  }

  if (criteria.fuelType) {
    const fuel = (car.fuelType ?? "").toLowerCase();
    if (!fuel) {
      unverifiableOnCar.push("เชื้อเพลิง");
    } else if (!fuel.includes(criteria.fuelType.toLowerCase())) {
      failed.push("เชื้อเพลิง");
      differences.push({
        constraint: "เชื้อเพลิง",
        detail: `ต้องการ ${criteria.fuelType} แต่คันนี้ระบุ ${car.fuelType}`,
      });
    }
  }

  return {
    passed: failed.length === 0,
    failedConstraints: failed,
    unverifiableOnCar,
    differences,
  };
}

/** Filter published inventory to exact hard matches. */
export function matchDiscoveryInventory(
  inventory: ChatInventoryCar[],
  criteria: VehicleDiscoveryCriteria
): {
  visible: ChatInventoryCar[];
  exact: VehicleDiscoveryCandidate[];
  rejected: Array<{
    car: ChatInventoryCar;
    failedConstraints: string[];
    differences: VehicleDiscoveryMatchDiff[];
  }>;
} {
  const visible = inventory.filter(isPublishedDiscoveryListing);
  const exact: VehicleDiscoveryCandidate[] = [];
  const rejected: Array<{
    car: ChatInventoryCar;
    failedConstraints: string[];
    differences: VehicleDiscoveryMatchDiff[];
  }> = [];

  for (const car of visible) {
    const ev = evaluateDiscoveryHardFilters(car, criteria);
    if (ev.passed) {
      exact.push({
        car,
        listingId: car.id,
        score: 0,
        reasons: [],
        isExactMatch: true,
        ...(ev.unverifiableOnCar.length
          ? {
              cautions: ev.unverifiableOnCar.map(
                (c) => `ยังตรวจเงื่อนไขนี้จากข้อมูลรถไม่ได้: ${c}`
              ),
            }
          : {}),
      });
    } else {
      rejected.push({
        car,
        failedConstraints: ev.failedConstraints,
        differences: ev.differences,
      });
    }
  }

  return { visible, exact, rejected };
}
