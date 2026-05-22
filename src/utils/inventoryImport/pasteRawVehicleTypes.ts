export type PasteConfidenceLevel = "high" | "medium" | "low";

export interface PasteVehicleLinks {
  websiteUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  driveLinks: string[];
  imageSourceUrls: string[];
  otherUrls: string[];
}

/** ผลลัพธ์หลัง parse แถวดิบ ThorAuto (1 คัน) */
export interface ParsedPasteVehicle {
  templateId: "thor-auto-row-v1";
  rawColumns: string[];
  brand: string;
  model: string;
  subModel: string;
  plateNumber: string;
  description: string;
  transmissionRaw: string;
  transmissionNormalized: string;
  year: number | null;
  color: string;
  colorNormalized: string;
  mileage: number | null;
  price: number | null;
  referencePrice: number | null;
  priceConfidence: PasteConfidenceLevel;
  source: string;
  listedDate: string;
  vehicleCondition: string;
  parkingSlot: string;
  financeSummary: string;
  links: PasteVehicleLinks;
  confidenceScore: number;
  confidenceLevel: PasteConfidenceLevel;
  warnings: string[];
  missingFields: string[];
  /** เสนอให้บันทึกเป็น draft เสมอในรอบแรก */
  suggestedDisposition: "draft";
}
