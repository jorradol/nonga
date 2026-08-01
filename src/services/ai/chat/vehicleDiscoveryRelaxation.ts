/**
 * WP-VD01 — No-result / relaxation strategy.
 * Never claim a non-matching car "matches"; always state differences.
 */

import type { ChatInventoryCar } from "./marketplaceChatSearch";
import {
  evaluateDiscoveryHardFilters,
  isPublishedDiscoveryListing,
} from "./vehicleDiscoveryMatcher";
import { rankDiscoveryCandidates } from "./vehicleDiscoveryRanker";
import type {
  VehicleDiscoveryCandidate,
  VehicleDiscoveryCriteria,
} from "./vehicleDiscoveryTypes";

export interface RelaxationStep {
  label: string;
  relax: (c: VehicleDiscoveryCriteria) => VehicleDiscoveryCriteria;
}

const RELAXATION_PIPELINE: RelaxationStep[] = [
  {
    label: "ผ่อนคลายเงื่อนไขเกียร์",
    relax: (c) => {
      if (!c.transmission) return c;
      const { transmission: _t, ...rest } = c;
      return { ...rest, appliedLabels: c.appliedLabels };
    },
  },
  {
    label: "ขยายอายุรถ / ปีรถ",
    relax: (c) => {
      if (c.minYear == null && c.yearExact == null && c.maxAgeYears == null) {
        return c;
      }
      const next = { ...c };
      delete next.yearExact;
      if (next.minYear != null) next.minYear = Math.max(1990, next.minYear - 3);
      delete next.maxAgeYears;
      return next;
    },
  },
  {
    label: "ขยายงบประมาณเล็กน้อย (+15%)",
    relax: (c) => {
      if (c.budgetMax == null) return c;
      return {
        ...c,
        budgetMax: Math.round(c.budgetMax * 1.15),
      };
    },
  },
  {
    label: "ผ่อนคลายประเภทรถ",
    relax: (c) => {
      if (!c.bodyHints?.length) return c;
      const { bodyHints: _b, ...rest } = c;
      return rest;
    },
  },
  {
    label: "ผ่อนคลายยี่ห้อ",
    relax: (c) => {
      if (!c.brand) return c;
      const { brand: _brand, model: _model, ...rest } = c;
      return rest;
    },
  },
];

function whichConstraintsBlockMost(
  inventory: ChatInventoryCar[],
  criteria: VehicleDiscoveryCriteria
): string[] {
  const counts = new Map<string, number>();
  const visible = inventory.filter(isPublishedDiscoveryListing);
  for (const car of visible) {
    const ev = evaluateDiscoveryHardFilters(car, criteria);
    for (const f of ev.failedConstraints) {
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

/**
 * When no exact matches, find nearest published alternatives and explain diffs.
 */
export function findDiscoveryNearAlternatives(
  inventory: ChatInventoryCar[],
  criteria: VehicleDiscoveryCriteria,
  limit = 3
): {
  alternatives: VehicleDiscoveryCandidate[];
  blockingConstraints: string[];
  relaxationNotes: string[];
} {
  const blockingConstraints = whichConstraintsBlockMost(inventory, criteria);
  const relaxationNotes: string[] = [];
  let working = { ...criteria };
  const visible = inventory.filter(isPublishedDiscoveryListing);

  for (const step of RELAXATION_PIPELINE) {
    const before = JSON.stringify(working);
    working = step.relax(working);
    if (JSON.stringify(working) === before) continue;

    const exact: VehicleDiscoveryCandidate[] = [];
    for (const car of visible) {
      const ev = evaluateDiscoveryHardFilters(car, working);
      if (!ev.passed) continue;
      // Re-evaluate against ORIGINAL criteria to explain differences
      const orig = evaluateDiscoveryHardFilters(car, criteria);
      exact.push({
        car,
        listingId: car.id,
        score: 0,
        reasons: ["ตัวเลือกใกล้เคียงจาก Inventory จริง"],
        differences: orig.differences,
        isExactMatch: false,
        cautions: [
          `ต่างจากเงื่อนไขเดิม: ${
            orig.differences.map((d) => d.detail).join("; ") || step.label
          }`,
        ],
      });
    }

    if (exact.length > 0) {
      relaxationNotes.push(step.label);
      const ranked = rankDiscoveryCandidates(
        { ...working, sort: criteria.sort ?? "relevance" },
        exact
      );
      return {
        alternatives: ranked.slice(0, limit).map((c) => ({
          ...c,
          isExactMatch: false,
        })),
        blockingConstraints,
        relaxationNotes,
      };
    }
    relaxationNotes.push(step.label);
  }

  // Last resort: closest by price/year among visible (still explain diffs)
  const scored = visible
    .map((car) => {
      const orig = evaluateDiscoveryHardFilters(car, criteria);
      let score = 0;
      if (criteria.budgetMax != null) {
        score -= Math.abs(car.price - criteria.budgetMax) / 10_000;
      }
      if (criteria.minYear != null) {
        score -= Math.abs(car.year - criteria.minYear) * 2;
      }
      return {
        car,
        listingId: car.id,
        score,
        reasons: ["ตัวเลือกใกล้เคียงที่สุดจากรถที่มีในระบบ"],
        differences: orig.differences,
        isExactMatch: false as const,
        cautions: orig.differences.map((d) => d.detail),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    alternatives: scored,
    blockingConstraints,
    relaxationNotes,
  };
}
