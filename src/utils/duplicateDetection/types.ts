/** สถานะรถซ้ำ — ไม่มีการลบ/merge อัตโนมัติ */
export type DuplicateStatus =
  | "unique"
  | "possible_duplicate"
  | "duplicate_confirmed"
  | "merged";

export type DuplicateRecordSource =
  | "published"
  | "hidden"
  | "draft"
  | "needs_review";

export interface DuplicateMatch {
  id: string;
  source: DuplicateRecordSource;
  score: number;
  reasons: string[];
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  dealerId?: string;
}

export interface DuplicateMeta {
  duplicateStatus: DuplicateStatus;
  duplicateScore: number;
  duplicateGroupId?: string;
  /** รถหลักในกลุ่ม — แสดงใน marketplace เมื่อ confirmed */
  duplicateCanonicalId?: string;
  duplicateMatches: DuplicateMatch[];
  duplicateReviewedAt?: string;
  duplicateReviewAction?: DuplicateReviewAction;
}

export type DuplicateReviewAction =
  | "keep_both"
  | "merge"
  | "hide_duplicate"
  | "mark_unique";

export const DUPLICATE_SCORE_POSSIBLE = 55;
export const DUPLICATE_SCORE_STRONG = 85;

export const DEFAULT_DUPLICATE_META: DuplicateMeta = {
  duplicateStatus: "unique",
  duplicateScore: 0,
  duplicateMatches: [],
};

/** Fingerprint สำหรับเปรียบเทียบ */
export interface VehicleFingerprint {
  id: string;
  source: DuplicateRecordSource;
  dealerId: string;
  vin: string;
  licensePlate: string;
  phone: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  title: string;
  description: string;
  images: string[];
  duplicateStatus?: DuplicateStatus;
  duplicateCanonicalId?: string;
}

export interface DuplicateScanResult {
  status: DuplicateStatus;
  score: number;
  groupId?: string;
  canonicalId?: string;
  matches: DuplicateMatch[];
  warnings: string[];
}
