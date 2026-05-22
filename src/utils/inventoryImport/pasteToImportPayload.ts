import type { NormalizedInventoryRow } from "./inventoryImportSchema";
import { createEmptyNormalizedRow } from "./inventoryImportSchema";
import type { ParsedPasteVehicle } from "./pasteRawVehicleTypes";
import type {
  ImportOwnerContext,
  MarketplaceImportPayload,
} from "./import/types";
import { mapCleanedRowToPartialPayload } from "./import/mapToMarketplace";

export function pasteParsedToNormalizedRow(
  parsed: ParsedPasteVehicle
): NormalizedInventoryRow {
  const row = createEmptyNormalizedRow();
  row.brand = parsed.brand;
  row.model = parsed.model;
  row.subModel = parsed.subModel;
  row.year = parsed.year != null ? String(parsed.year) : "";
  row.price = parsed.price != null ? String(parsed.price) : "";
  row.mileage = parsed.mileage != null ? String(parsed.mileage) : "";
  row.color = parsed.colorNormalized || parsed.color;
  row.gear = parsed.transmissionNormalized || parsed.transmissionRaw;
  row.licensePlate = parsed.plateNumber;
  row.source = parsed.source;
  row.status = parsed.vehicleCondition;
  row.description = parsed.description;
  row.youtubeUrl = parsed.links.youtubeUrl ?? "";
  row.tiktokUrl = parsed.links.tiktokUrl ?? "";

  const notes: string[] = [];
  if (parsed.referencePrice != null) {
    notes.push(`ราคาอ้างอิง: ${parsed.referencePrice.toLocaleString()} บาท`);
  }
  if (parsed.financeSummary) notes.push(`ไฟแนนซ์: ${parsed.financeSummary}`);
  if (parsed.listedDate) notes.push(`ลงประกาศ: ${parsed.listedDate}`);
  if (parsed.parkingSlot) notes.push(`ที่จอด: ${parsed.parkingSlot}`);
  if (parsed.links.websiteUrl) notes.push(`เว็บ: ${parsed.links.websiteUrl}`);
  if (parsed.links.driveLinks.length) {
    notes.push(`Drive: ${parsed.links.driveLinks.join(", ")}`);
  }
  row.notes = notes.join(" | ");

  const imageUrls = [
    ...parsed.links.imageSourceUrls,
    ...(parsed.links.websiteUrl && parsed.links.imageSourceUrls.length === 0
      ? []
      : []),
  ];
  row.imageUrls = imageUrls.join(", ");

  return row;
}

export function pasteParsedToDraftPayload(
  parsed: ParsedPasteVehicle,
  owner: ImportOwnerContext
): MarketplaceImportPayload | null {
  const normalized = pasteParsedToNormalizedRow(parsed);
  const payload = mapCleanedRowToPartialPayload(normalized, 1, owner, {
    paste: "thor-auto",
    rawColumns: parsed.rawColumns.join("\t"),
  });
  if (!payload) return null;

  return {
    ...payload,
    disposition: "draft",
    confidenceScore: parsed.confidenceScore,
    missingFields: parsed.missingFields,
    warnings: parsed.warnings,
    importStatus: "warning",
  };
}
