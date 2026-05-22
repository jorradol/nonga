import type { MarketplaceCarRecord } from "./marketplaceInventory";
import {
  loadMarketplaceInventory,
  persistMarketplaceInventory,
  getMarketplaceCarById,
  updateMarketplaceCar,
  setMarketplaceCarListingStatus,
  resolveCarDealerId,
} from "./marketplaceInventory";
import type { DealerDraftRecord } from "./dealerDraftInventory";
import {
  loadDealerDraftInventory,
  persistDealerDrafts,
  getDealerDraftById,
  updateDealerDraft,
} from "./dealerDraftInventory";
import type { CommitImportRowInput } from "./inventoryImportCommit";
import type { NormalizedInventoryRow } from "../utils/inventoryImport/inventoryImportSchema";
import { extractVinFromText, normalizePlate } from "../utils/duplicateDetection/textSimilarity";
import {
  scanForDuplicates,
  buildDuplicateGroupId,
  shouldHideFromMarketplace,
} from "../utils/duplicateDetection/duplicateEngine";
import type {
  DuplicateMeta,
  DuplicateReviewAction,
  DuplicateRecordSource,
  VehicleFingerprint,
  DuplicateScanResult,
} from "../utils/duplicateDetection/types";
import { DEFAULT_DUPLICATE_META } from "../utils/duplicateDetection/types";

export type { DuplicateMeta, DuplicateReviewAction };

export function duplicateFieldsFromMeta(
  scan: DuplicateScanResult
): Partial<DuplicateMeta> {
  return {
    duplicateStatus: scan.status,
    duplicateScore: scan.score,
    duplicateGroupId: scan.groupId,
    duplicateCanonicalId: scan.canonicalId,
    duplicateMatches: scan.matches,
  };
}

function sourceFromCar(car: MarketplaceCarRecord): DuplicateRecordSource {
  if (car.listingStatus === "hidden") return "hidden";
  return "published";
}

export function fingerprintFromCar(
  car: MarketplaceCarRecord
): VehicleFingerprint {
  return {
    id: car.id,
    source: sourceFromCar(car),
    dealerId: resolveCarDealerId(car),
    vin: car.vin || extractVinFromText(car.description),
    licensePlate: car.licensePlate ?? "",
    phone: car.ownerPhone ?? "",
    brand: car.brand,
    model: car.model,
    year: car.year,
    mileage: car.mileage,
    price: car.price,
    title: car.title,
    description: car.description,
    images: car.images ?? [],
    duplicateStatus: car.duplicateStatus,
    duplicateCanonicalId: car.duplicateCanonicalId,
  };
}

export function fingerprintFromDraft(
  draft: DealerDraftRecord
): VehicleFingerprint {
  const nd = draft.normalizedData;
  const plate = normalizePlate(
    draft.licensePlate ?? String(nd?.licensePlate ?? "")
  );
  const vin =
    draft.vin ||
    extractVinFromText(String(nd?.notes ?? "")) ||
    extractVinFromText(draft.description);
  return {
    id: draft.id,
    source: draft.status === "needs_review" ? "needs_review" : "draft",
    dealerId: draft.dealerId,
    vin,
    licensePlate: plate,
    phone: draft.phone ?? "",
    brand: draft.brand,
    model: draft.model,
    year: draft.year,
    mileage: draft.mileage,
    price: draft.price,
    title: draft.title,
    description: draft.description,
    images: draft.images ?? [],
    duplicateStatus: draft.duplicateStatus,
    duplicateCanonicalId: draft.duplicateCanonicalId,
  };
}

export function fingerprintFromImportRow(
  row: CommitImportRowInput,
  id: string,
  source: DuplicateRecordSource,
  dealerId: string,
  images: string[]
): VehicleFingerprint {
  const raw = row.rawRow ?? {};
  const plate = normalizePlate(
    String(raw.licensePlate ?? raw["ทะเบียน"] ?? raw.plate ?? "")
  );
  const desc = String(row.description ?? "");
  return {
    id,
    source,
    dealerId,
    vin: extractVinFromText(desc) || extractVinFromText(JSON.stringify(raw)),
    licensePlate: plate,
    phone: String(row.ownerPhone ?? ""),
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    year: Number(row.year) || 0,
    mileage: Math.max(0, Number(row.mileage) || 0),
    price: Number(row.price) || 0,
    title: String(row.title ?? ""),
    description: desc,
    images,
  };
}

export function buildFullCorpus(
  excludeId?: string
): VehicleFingerprint[] {
  const cars = loadMarketplaceInventory().map(fingerprintFromCar);
  const drafts = loadDealerDraftInventory().map(fingerprintFromDraft);
  const all = [...cars, ...drafts];
  return excludeId ? all.filter((f) => f.id !== excludeId) : all;
}

export function scanCarAgainstCorpus(
  car: MarketplaceCarRecord,
  importMode = false
): DuplicateScanResult {
  const fp = fingerprintFromCar(car);
  const corpus = buildFullCorpus(car.id);
  return scanForDuplicates(fp, corpus, { importMode });
}

export function scanDraftAgainstCorpus(
  draft: DealerDraftRecord,
  importMode = false
): DuplicateScanResult {
  const fp = fingerprintFromDraft(draft);
  const corpus = buildFullCorpus(draft.id);
  return scanForDuplicates(fp, corpus, { importMode });
}

export function applyScanToCar(
  car: MarketplaceCarRecord,
  scan: DuplicateScanResult
): MarketplaceCarRecord {
  return {
    ...car,
    ...duplicateFieldsFromMeta(scan),
  };
}

export function applyScanToDraft(
  draft: DealerDraftRecord,
  scan: DuplicateScanResult
): DealerDraftRecord {
  const extraWarnings = scan.warnings;
  return {
    ...draft,
    ...duplicateFieldsFromMeta(scan),
    warnings: [...new Set([...draft.warnings, ...extraWarnings])],
  };
}

/** รันหลัง build ก่อน persist — import mode ไม่ block */
export function runImportDuplicateChecks(
  cars: MarketplaceCarRecord[],
  drafts: DealerDraftRecord[]
): {
  cars: MarketplaceCarRecord[];
  drafts: DealerDraftRecord[];
  duplicateWarnings: { id: string; bucket: string; warnings: string[] }[];
} {
  const corpus = buildFullCorpus();
  const duplicateWarnings: {
    id: string;
    bucket: string;
    warnings: string[];
  }[] = [];

  const scannedCars = cars.map((car) => {
    const scan = scanForDuplicates(fingerprintFromCar(car), corpus, {
      importMode: true,
    });
    corpus.push(fingerprintFromCar({ ...car, ...duplicateFieldsFromMeta(scan) }));
    if (scan.warnings.length) {
      duplicateWarnings.push({
        id: car.id,
        bucket: "published",
        warnings: scan.warnings,
      });
    }
    return applyScanToCar(car, scan);
  });

  const scannedDrafts = drafts.map((draft) => {
    const scan = scanForDuplicates(fingerprintFromDraft(draft), corpus, {
      importMode: true,
    });
    corpus.push(
      fingerprintFromDraft({ ...draft, ...duplicateFieldsFromMeta(scan) })
    );
    if (scan.warnings.length) {
      duplicateWarnings.push({
        id: draft.id,
        bucket: "draft",
        warnings: scan.warnings,
      });
    }
    return applyScanToDraft(draft, scan);
  });

  return { cars: scannedCars, drafts: scannedDrafts, duplicateWarnings };
}

export interface DuplicateGroupSummary {
  groupId: string;
  canonicalId?: string;
  members: {
    id: string;
    source: DuplicateRecordSource;
    title: string;
    duplicateStatus: string;
    score: number;
    dealerId: string;
  }[];
}

export function listDuplicateGroups(dealerId?: string): DuplicateGroupSummary[] {
  const map = new Map<string, DuplicateGroupSummary>();

  const add = (
    id: string,
    source: DuplicateRecordSource,
    title: string,
    status: string,
    score: number,
    groupId: string | undefined,
    canonicalId: string | undefined,
    dId: string
  ) => {
    if (!groupId || status === "unique") return;
    if (dealerId && dId !== dealerId) return;
    let g = map.get(groupId);
    if (!g) {
      g = { groupId, canonicalId, members: [] };
      map.set(groupId, g);
    }
    if (canonicalId) g.canonicalId = canonicalId;
    g.members.push({
      id,
      source,
      title,
      duplicateStatus: status,
      score,
      dealerId: dId,
    });
  };

  for (const car of loadMarketplaceInventory()) {
    add(
      car.id,
      sourceFromCar(car),
      car.title,
      car.duplicateStatus ?? "unique",
      car.duplicateScore ?? 0,
      car.duplicateGroupId,
      car.duplicateCanonicalId,
      resolveCarDealerId(car)
    );
  }
  for (const d of loadDealerDraftInventory()) {
    add(
      d.id,
      d.status === "needs_review" ? "needs_review" : "draft",
      d.title,
      d.duplicateStatus ?? "unique",
      d.duplicateScore ?? 0,
      d.duplicateGroupId,
      d.duplicateCanonicalId,
      d.dealerId
    );
  }

  return [...map.values()].filter((g) => g.members.length > 1);
}

export function applyDuplicateReview(
  recordId: string,
  action: DuplicateReviewAction,
  options?: { keepId?: string; hideId?: string }
): { ok: boolean; message?: string } {
  const car = getMarketplaceCarById(recordId);
  const draft = getDealerDraftById(recordId);

  const clearMeta: Partial<DuplicateMeta> = {
    duplicateStatus: "unique",
    duplicateScore: 0,
    duplicateGroupId: undefined,
    duplicateCanonicalId: undefined,
    duplicateMatches: [],
    duplicateReviewedAt: new Date().toISOString(),
    duplicateReviewAction: action,
  };

  if (action === "keep_both" || action === "mark_unique") {
    if (car) {
      updateMarketplaceCar(recordId, clearMeta);
      return { ok: true };
    }
    if (draft) {
      updateDealerDraft(recordId, clearMeta);
      return { ok: true };
    }
    return { ok: false, message: "ไม่พบรายการ" };
  }

  if (action === "hide_duplicate") {
    const targetId = options?.hideId ?? recordId;
    const c = getMarketplaceCarById(targetId);
    if (!c) return { ok: false, message: "ซ่อนได้เฉพาะรถ published" };
    const groupId = c.duplicateGroupId ?? buildDuplicateGroupId([targetId]);
    const canonical = options?.keepId ?? c.duplicateCanonicalId ?? targetId;
    updateMarketplaceCar(targetId, {
      duplicateStatus: "duplicate_confirmed",
      duplicateGroupId: groupId,
      duplicateCanonicalId: canonical,
      duplicateReviewedAt: new Date().toISOString(),
      duplicateReviewAction: action,
    });
    setMarketplaceCarListingStatus(targetId, "hidden");
    return { ok: true };
  }

  if (action === "merge") {
    const hideId = options?.hideId ?? recordId;
    const keepId = options?.keepId;
    if (!keepId) return { ok: false, message: "ต้องระบุ keepId" };
    const groupId = buildDuplicateGroupId([hideId, keepId]);
    const cHide = getMarketplaceCarById(hideId);
    const dHide = getDealerDraftById(hideId);

    const mergedMeta: Partial<DuplicateMeta> = {
      duplicateStatus: "merged",
      duplicateGroupId: groupId,
      duplicateCanonicalId: keepId,
      duplicateReviewedAt: new Date().toISOString(),
      duplicateReviewAction: action,
    };

    if (cHide) {
      updateMarketplaceCar(hideId, mergedMeta);
      setMarketplaceCarListingStatus(hideId, "hidden");
    } else if (dHide) {
      updateDealerDraft(hideId, mergedMeta);
    } else {
      return { ok: false, message: "ไม่พบรายการที่จะ merge" };
    }

    const cKeep = getMarketplaceCarById(keepId);
    if (cKeep) {
      updateMarketplaceCar(keepId, {
        duplicateCanonicalId: keepId,
        duplicateGroupId: groupId,
      });
    }
    return { ok: true };
  }

  return { ok: false, message: "action ไม่รองรับ" };
}

export function rescanRecord(id: string): DuplicateScanResult | null {
  const car = getMarketplaceCarById(id);
  if (car) {
    const scan = scanCarAgainstCorpus(car, false);
    updateMarketplaceCar(id, duplicateFieldsFromMeta(scan));
    return scan;
  }
  const draft = getDealerDraftById(id);
  if (draft) {
    const scan = scanDraftAgainstCorpus(draft, false);
    updateDealerDraft(id, duplicateFieldsFromMeta(scan));
    return scan;
  }
  return null;
}

export function isCarHiddenByDuplicate(car: MarketplaceCarRecord): boolean {
  return shouldHideFromMarketplace({
    duplicateStatus: car.duplicateStatus,
    duplicateCanonicalId: car.duplicateCanonicalId,
    id: car.id,
  });
}

export function withDefaultDuplicateMeta<
  T extends Partial<DuplicateMeta>,
>(record: T): T & DuplicateMeta {
  return {
    ...DEFAULT_DUPLICATE_META,
    ...record,
    duplicateMatches: record.duplicateMatches ?? [],
  };
}
