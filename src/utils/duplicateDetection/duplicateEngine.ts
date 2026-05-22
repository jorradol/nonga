import { compareImageSets } from "./imageSignals";
import {
  jaccardSimilarity,
  normalizePhone,
  normalizePlate,
  normalizeVin,
  extractVinFromText,
} from "./textSimilarity";
import type {
  DuplicateMatch,
  DuplicateScanResult,
  DuplicateStatus,
  VehicleFingerprint,
} from "./types";
import {
  DUPLICATE_SCORE_POSSIBLE,
  DUPLICATE_SCORE_STRONG,
} from "./types";

export interface ScoreBreakdown {
  total: number;
  reasons: string[];
}

function withinPercent(a: number, b: number, pct: number): boolean {
  if (a <= 0 && b <= 0) return true;
  const max = Math.max(a, b, 1);
  return Math.abs(a - b) / max <= pct / 100;
}

function scoreVehiclePair(
  a: VehicleFingerprint,
  b: VehicleFingerprint
): ScoreBreakdown {
  if (a.id === b.id) return { total: 0, reasons: [] };

  let total = 0;
  const reasons: string[] = [];

  const vinA = a.vin || extractVinFromText(a.description);
  const vinB = b.vin || extractVinFromText(b.description);
  if (vinA && vinB && vinA === vinB) {
    total += 40;
    reasons.push("vin_exact");
  }

  const plateA = normalizePlate(a.licensePlate);
  const plateB = normalizePlate(b.licensePlate);
  if (plateA.length >= 4 && plateA === plateB) {
    total += 35;
    reasons.push("license_plate_exact");
  }

  const phoneA = normalizePhone(a.phone);
  const phoneB = normalizePhone(b.phone);
  if (phoneA.length >= 9 && phoneA === phoneB) {
    total += a.dealerId === b.dealerId ? 12 : 18;
    reasons.push(
      a.dealerId === b.dealerId ? "phone_same_dealer" : "phone_cross_dealer"
    );
  }

  const brandMatch =
    a.brand &&
    b.brand &&
    a.brand.toLowerCase() === b.brand.toLowerCase();
  const modelMatch =
    a.model &&
    b.model &&
    a.model.toLowerCase() === b.model.toLowerCase();
  const yearMatch = a.year > 0 && a.year === b.year;

  if (brandMatch && modelMatch && yearMatch) {
    total += 15;
    reasons.push("brand_model_year");
  } else if (brandMatch && modelMatch) {
    total += 8;
    reasons.push("brand_model");
  }

  if (a.mileage > 0 && b.mileage > 0) {
    const diff = Math.abs(a.mileage - b.mileage);
    if (diff <= 500 || withinPercent(a.mileage, b.mileage, 1)) {
      total += 10;
      reasons.push("mileage_close");
    }
  }

  if (a.price > 0 && b.price > 0 && withinPercent(a.price, b.price, 2)) {
    total += 8;
    reasons.push("price_close");
  }

  if (a.dealerId && b.dealerId && a.dealerId === b.dealerId) {
    total += 3;
    reasons.push("same_dealer");
  }

  const img = compareImageSets(a.images, b.images);
  if (img.score >= 75) {
    total += 25;
    reasons.push(...img.reasons);
  } else if (img.score >= 50) {
    total += 12;
    reasons.push("image_partial_match");
  }

  const titleSim = jaccardSimilarity(a.title, b.title);
  if (titleSim >= 0.85) {
    total += 12;
    reasons.push("title_similar");
  } else if (titleSim >= 0.65) {
    total += 5;
    reasons.push("title_partial");
  }

  const descSim = jaccardSimilarity(a.description, b.description);
  if (descSim >= 0.8) {
    total += 8;
    reasons.push("description_similar");
  }

  return { total: Math.min(100, total), reasons: [...new Set(reasons)] };
}

export function scoreDuplicatePair(
  candidate: VehicleFingerprint,
  existing: VehicleFingerprint
): { score: number; reasons: string[] } {
  const { total, reasons } = scoreVehiclePair(candidate, existing);
  return { score: total, reasons };
}

export function findDuplicateMatches(
  candidate: VehicleFingerprint,
  corpus: VehicleFingerprint[],
  minScore = DUPLICATE_SCORE_POSSIBLE
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  for (const item of corpus) {
    if (item.id === candidate.id) continue;
    const { total, reasons } = scoreVehiclePair(candidate, item);
    if (total >= minScore) {
      matches.push({
        id: item.id,
        source: item.source,
        score: total,
        reasons,
        title: item.title,
        brand: item.brand,
        model: item.model,
        year: item.year,
        dealerId: item.dealerId,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function resolveStatusFromScore(
  score: number,
  importMode: boolean
): DuplicateStatus {
  if (score >= DUPLICATE_SCORE_STRONG) {
    return importMode ? "possible_duplicate" : "possible_duplicate";
  }
  if (score >= DUPLICATE_SCORE_POSSIBLE) {
    return "possible_duplicate";
  }
  return "unique";
}

export function buildDuplicateGroupId(ids: string[]): string {
  const sorted = [...ids].sort();
  let h = 0;
  const key = sorted.join("|");
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `dup-${h.toString(16)}`;
}

export function pickCanonicalId(
  candidateId: string,
  matches: DuplicateMatch[],
  corpus: VehicleFingerprint[]
): string {
  const allIds = [candidateId, ...matches.map((m) => m.id)];
  const byDate = allIds
    .map((id) => corpus.find((c) => c.id === id))
    .filter(Boolean) as VehicleFingerprint[];
  if (byDate.length === 0) return candidateId;
  return byDate[0]?.id ?? candidateId;
}

export function scanForDuplicates(
  candidate: VehicleFingerprint,
  corpus: VehicleFingerprint[],
  options?: { importMode?: boolean; minScore?: number }
): DuplicateScanResult {
  const importMode = options?.importMode ?? false;
  const minScore = options?.minScore ?? DUPLICATE_SCORE_POSSIBLE;
  const matches = findDuplicateMatches(candidate, corpus, minScore);
  const topScore = matches[0]?.score ?? 0;
  const status = resolveStatusFromScore(topScore, importMode);

  const warnings: string[] = [];
  if (status === "possible_duplicate" && matches.length > 0) {
    const top = matches[0];
    warnings.push(
      `พบรถที่อาจซ้ำ (คะแนน ${top.score}): ${top.brand ?? ""} ${top.model ?? ""} [${top.source}] id=${top.id}`
    );
    if (top.reasons.includes("vin_exact")) {
      warnings.push("VIN ตรงกัน — ตรวจสอบก่อนเผยแพร่");
    }
    if (top.reasons.some((r) => r.startsWith("image_"))) {
      warnings.push("รูปภาพอาจซ้ำกับรายการอื่น");
    }
  }

  let groupId: string | undefined;
  let canonicalId: string | undefined;
  if (matches.length > 0) {
    groupId = buildDuplicateGroupId([candidate.id, ...matches.map((m) => m.id)]);
    canonicalId = pickCanonicalId(candidate.id, matches, corpus);
  }

  return {
    status,
    score: topScore,
    groupId,
    canonicalId,
    matches,
    warnings,
  };
}

/** ซ่อนจาก marketplace เมื่อ confirmed/merged และไม่ใช่ canonical */
export function shouldHideFromMarketplace(meta: {
  duplicateStatus?: DuplicateStatus;
  duplicateCanonicalId?: string;
  id: string;
}): boolean {
  const st = meta.duplicateStatus ?? "unique";
  if (st !== "duplicate_confirmed" && st !== "merged") return false;
  const canonical = meta.duplicateCanonicalId;
  if (!canonical) return true;
  return meta.id !== canonical;
}
