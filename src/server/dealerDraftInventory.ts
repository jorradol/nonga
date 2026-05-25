import fs from "fs";
import path from "path";
import type { NormalizedInventoryRow } from "../utils/inventoryImport/inventoryImportSchema";
import { devMarketplaceLog } from "./marketplaceInventory";
import { normalizeDealerId } from "../utils/dealerIdentity";
import type { DuplicateMeta } from "../utils/duplicateDetection/types";

export type DraftInventoryStatus = "draft" | "needs_review";

export interface DealerDraftImageMetadata {
  dealerId: string;
  draftId: string;
  sessionId?: string;
  fileName: string;
  originalFileName?: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  imagePath: string;
  imageUrl: string;
  thumbnailPath: string;
  thumbnailUrl: string;
  createdAt: string;
  sortOrder: number;
  source?: "chat-image-attachment-v1" | "draft-upload" | string;
}

export interface DealerDraftRecord {
  id: string;
  dealerId: string;
  dealerName: string;
  ownerName: string;
  phone: string;
  showroomName?: string;
  rawRow: Record<string, string>;
  normalizedData: NormalizedInventoryRow;
  missingFields: string[];
  warnings: string[];
  confidenceScore: number;
  status: DraftInventoryStatus;
  images: string[];
  sourceImageUrls?: string[];
  imageMetadata?: DealerDraftImageMetadata[];
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  condition: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  duplicateStatus?: DuplicateMeta["duplicateStatus"];
  duplicateScore?: number;
  duplicateGroupId?: string;
  duplicateCanonicalId?: string;
  duplicateMatches?: DuplicateMeta["duplicateMatches"];
  duplicateReviewedAt?: string;
  duplicateReviewAction?: DuplicateMeta["duplicateReviewAction"];
  vin?: string;
  licensePlate?: string;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const DRAFT_FILE = path.join(DATA_DIR, "dealer-draft-inventory.json");

let draftCache: DealerDraftRecord[] | null = null;

function readDrafts(): DealerDraftRecord[] {
  try {
    if (!fs.existsSync(DRAFT_FILE)) return [];
    const raw = fs.readFileSync(DRAFT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DealerDraftRecord[]) : [];
  } catch {
    return [];
  }
}

function writeDrafts(records: DealerDraftRecord[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DRAFT_FILE, JSON.stringify(records, null, 2), "utf8");
}

export function loadDealerDraftInventory(): DealerDraftRecord[] {
  if (draftCache === null) {
    draftCache = readDrafts();
    devMarketplaceLog("draft-load", { count: draftCache.length });
  }
  return draftCache;
}

export function getDealerDraftsSorted(dealerId?: string): DealerDraftRecord[] {
  let list = [...loadDealerDraftInventory()].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  if (dealerId) {
    const target = normalizeDealerId(dealerId);
    list = list.filter((d) => normalizeDealerId(d.dealerId) === target);
  }
  return list;
}

export function persistDealerDrafts(records: DealerDraftRecord[]): void {
  draftCache = records;
  writeDrafts(records);
  devMarketplaceLog("draft-persist", { count: records.length });
}

export function bulkAddDealerDrafts(
  drafts: DealerDraftRecord[]
): DealerDraftRecord[] {
  if (drafts.length === 0) return [];
  const list = loadDealerDraftInventory();
  const next = [...drafts, ...list];
  persistDealerDrafts(next);
  return drafts;
}

export function getDealerDraftById(id: string): DealerDraftRecord | null {
  return loadDealerDraftInventory().find((d) => d.id === id) ?? null;
}

export function updateDealerDraft(
  id: string,
  patch: Partial<DealerDraftRecord>
): DealerDraftRecord | null {
  const list = loadDealerDraftInventory();
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) return null;

  const updated: DealerDraftRecord = {
    ...list[idx],
    ...patch,
    id: list[idx].id,
    updatedAt: new Date().toISOString(),
  };
  const next = [...list];
  next[idx] = updated;
  persistDealerDrafts(next);
  return updated;
}

export function removeDealerDraft(id: string): boolean {
  const list = loadDealerDraftInventory();
  const next = list.filter((d) => d.id !== id);
  if (next.length === list.length) return false;
  persistDealerDrafts(next);
  return true;
}
