/**
 * Schema กลางสำหรับ Inventory Import (แยกจาก Car schema ของ marketplace)
 * Phase 2 — mapping & normalize preview เท่านั้น
 */

export const INVENTORY_IMPORT_FIELD_KEYS = [
  "brand",
  "model",
  "subModel",
  "year",
  "price",
  "mileage",
  "color",
  "fuelType",
  "gear",
  "engineSize",
  "registrationProvince",
  "licensePlateMasked",
  "licensePlateFull",
  "licensePlate",
  "province",
  "status",
  "financeStatus",
  "qcStatus",
  "repairStatus",
  "source",
  "description",
  "imageUrls",
  "youtubeUrl",
  "tiktokUrl",
  "notes",
  "ignore",
] as const;

export type InventoryImportFieldKey =
  (typeof INVENTORY_IMPORT_FIELD_KEYS)[number];

export const INVENTORY_IMPORT_FIELD_LABELS: Record<
  InventoryImportFieldKey,
  string
> = {
  brand: "ยี่ห้อ (brand)",
  model: "รุ่น (model)",
  subModel: "รุ่นย่อย (subModel)",
  year: "ปี (year)",
  price: "ราคา (price)",
  mileage: "เลขไมล์ (mileage)",
  color: "สี (color)",
  fuelType: "เชื้อเพลิง (fuelType)",
  gear: "เกียร์ (gear)",
  engineSize: "ขนาดเครื่อง (engineSize)",
  registrationProvince: "จังหวัดทะเบียน (registrationProvince)",
  licensePlateMasked: "ทะเบียนแบบปิดบางส่วน (licensePlateMasked)",
  licensePlateFull: "ทะเบียนเต็ม (licensePlateFull)",
  licensePlate: "ทะเบียน (licensePlate)",
  province: "จังหวัด (province)",
  status: "สถานะ (status)",
  financeStatus: "สถานะไฟแนนซ์ (financeStatus)",
  qcStatus: "สถานะ QC (qcStatus)",
  repairStatus: "สถานะซ่อม (repairStatus)",
  source: "แหล่งที่มา (source)",
  description: "รายละเอียด (description)",
  imageUrls: "รูปภาพ (imageUrls)",
  youtubeUrl: "YouTube (youtubeUrl)",
  tiktokUrl: "TikTok (tiktokUrl)",
  notes: "หมายเหตุ (notes)",
  ignore: "— ไม่นำเข้า (ignore)",
};

/** แถวหลัง normalize — ทุก field เป็น string สำหรับ preview */
export type NormalizedInventoryRow = Record<InventoryImportFieldKey, string>;

export function createEmptyNormalizedRow(): NormalizedInventoryRow {
  const row = {} as NormalizedInventoryRow;
  for (const key of INVENTORY_IMPORT_FIELD_KEYS) {
    row[key] = "";
  }
  return row;
}
