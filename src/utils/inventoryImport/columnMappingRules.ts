import type { InventoryImportFieldKey } from "./inventoryImportSchema";

export interface ColumnMappingRule {
  field: InventoryImportFieldKey;
  /** คำที่ใช้จับคู่ (ไทย/อังกฤษ) — เปรียบเทียบแบบ normalize แล้ว */
  aliases: string[];
  /** คะแนนเมื่อ alias ตรงทั้งคอลัมน์ (สูงกว่า contains) */
  priority?: number;
}

/**
 * กฎ Auto Mapping แบบ local (ไม่ใช้ AI)
 * เรียงจากเฉพาะเจาะจง → ทั่วไป
 */
export const COLUMN_MAPPING_RULES: ColumnMappingRule[] = [
  {
    field: "brand",
    aliases: [
      "ยี่ห้อ",
      "ยี่ห้อรถ",
      "brand",
      "make",
      "manufacturer",
      "car brand",
      "brands",
    ],
    priority: 10,
  },
  {
    field: "subModel",
    aliases: [
      "รุ่นย่อย",
      "sub model",
      "submodel",
      "sub-model",
      "trim",
      "grade",
      "แกรด",
    ],
    priority: 9,
  },
  {
    field: "model",
    aliases: ["รุ่น", "รุ่นรถ", "model", "car model", "series", "โมเดล"],
    priority: 8,
  },
  {
    field: "year",
    aliases: [
      "ปี",
      "ปีรถ",
      "ปีจด",
      "ปีที่จด",
      "year",
      "model year",
      "car year",
      "yom",
    ],
    priority: 10,
  },
  {
    field: "price",
    aliases: [
      "ราคา",
      "ราคาขาย",
      "ราคาตั้ง",
      "price",
      "selling price",
      "list price",
      "amount",
      "ราคา(บาท)",
    ],
    priority: 10,
  },
  {
    field: "mileage",
    aliases: [
      "เลขไมล์",
      "ไมล์",
      "ไมล์สะสม",
      "mileage",
      "odo",
      "odometer",
      "km",
      "กม",
      "กิโลเมตร",
    ],
    priority: 10,
  },
  {
    field: "color",
    aliases: ["สี", "สีรถ", "color", "colour", "exterior color"],
    priority: 10,
  },
  {
    field: "fuelType",
    aliases: [
      "เชื้อเพลิง",
      "น้ำมัน",
      "fuel",
      "fuel type",
      "fueltype",
      "ประเภทเชื้อเพลิง",
    ],
    priority: 10,
  },
  {
    field: "gear",
    aliases: [
      "เกียร์",
      "gear",
      "transmission",
      "เกียร์/ส่งกำลัง",
      "ชนิดเกียร์",
    ],
    priority: 10,
  },
  {
    field: "engineSize",
    aliases: [
      "cc",
      "engine",
      "engine size",
      "enginesize",
      "ขนาดเครื่อง",
      "ความจุ",
      "engine cc",
    ],
    priority: 9,
  },
  {
    field: "licensePlate",
    aliases: [
      "ทะเบียน",
      "เลขทะเบียน",
      "plate",
      "license",
      "license plate",
      "ทะเบียนรถ",
    ],
    priority: 10,
  },
  {
    field: "province",
    aliases: ["จังหวัด", "province", "จ.", "ที่จอด", "location province"],
    priority: 9,
  },
  {
    field: "status",
    aliases: ["สถานะ", "status", "สถานะรถ", "listing status", "car status"],
    priority: 7,
  },
  {
    field: "financeStatus",
    aliases: [
      "ไฟแนนซ์",
      "finance",
      "finance status",
      "สถานะไฟแนนซ์",
      "ผ่อน",
      "loan status",
    ],
    priority: 9,
  },
  {
    field: "qcStatus",
    aliases: ["qc", "qc status", "สถานะ qc", "ตรวจ qc", "quality"],
    priority: 9,
  },
  {
    field: "repairStatus",
    aliases: [
      "ซ่อม",
      "repair",
      "repair status",
      "สถานะซ่อม",
      "ประวัติซ่อม",
    ],
    priority: 9,
  },
  {
    field: "source",
    aliases: ["แหล่งที่มา", "source", "channel", "ที่มา", "lead source"],
    priority: 8,
  },
  {
    field: "description",
    aliases: [
      "รายละเอียด",
      "description",
      "desc",
      "หมายเหตุรถ",
      "รายละเอียดรถ",
      "details",
      "remark car",
    ],
    priority: 8,
  },
  {
    field: "imageUrls",
    aliases: [
      "รูป",
      "รูปภาพ",
      "รูปรถ",
      "ลิงก์รูป",
      "ลิงก์รูปภาพ",
      "ลิงก์ภาพ",
      "image",
      "images",
      "image url",
      "image urls",
      "imageurl",
      "image link",
      "photo",
      "photos",
      "photo url",
      "picture",
      "url รูป",
      "urlรูป",
      "link รูป",
      "img",
      "img url",
      "อัลบั้มรถ",
      "อัลบั้ม",
      "รูปกราฟฟิค",
      "รูปกราฟิก",
      "ลิ้งค์เว็บ",
      "ลิ้งค์เว็บไซต์",
      "ลิงก์เว็บ",
      "website link",
      "photo album",
    ],
    priority: 10,
  },
  {
    field: "youtubeUrl",
    aliases: ["youtube", "youtube url", "yt", "ลิงก์ youtube", "url youtube"],
    priority: 10,
  },
  {
    field: "tiktokUrl",
    aliases: ["tiktok", "tiktok url", "ลิงก์ tiktok", "url tiktok"],
    priority: 10,
  },
  {
    field: "notes",
    aliases: [
      "notes",
      "note",
      "หมายเหตุ",
      "memo",
      "comment",
      "comments",
      "internal note",
    ],
    priority: 6,
  },
];
