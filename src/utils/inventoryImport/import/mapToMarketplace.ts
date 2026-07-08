/**
 * Field mapping: Inventory Import schema → MarketplaceCarRecord
 *
 * | Import field   | Marketplace field |
 * |----------------|-------------------|
 * | brand          | brand             |
 * | model          | model             |
 * | subModel       | title (suffix)    |
 * | year           | year              |
 * | price          | price             |
 * | mileage        | mileage           |
 * | color          | description note  |
 * | fuelType       | fuelType + type   |
 * | gear           | description note  |
 * | imageUrls      | sourceImageUrls[] (server → storage) |
 * | description    | description       |
 * | notes          | description       |
 * | youtubeUrl     | description       |
 * | tiktokUrl      | description       |
 * | status/qc/...  | condition         |
 * | province       | description       |
 * | owner context  | ownerId/Name/Phone|
 */

import { inferMarketplaceCategoryType } from "../../marketplaceCarMapper";
import type { NormalizedInventoryRow } from "../inventoryImportSchema";
import type {
  ImportOwnerContext,
  MarketplaceImportPayload,
} from "./types";
import { extractRegistrationFields } from "../../vehicleRegistrationPrivacy";
import {
  googleDriveFileDownloadUrl,
  parseGoogleDriveFileId,
} from "../imageLinkExtractor";

function parseImageUrls(raw: string): string[] {
  if (!raw?.trim()) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const parts = raw
    .split(/[\n\r|,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (!/^https?:\/\//i.test(part)) continue;
    const driveId = parseGoogleDriveFileId(part);
    const normalized = driveId
      ? googleDriveFileDownloadUrl(driveId)
      : part;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= 12) break;
  }
  return out;
}

function buildDescription(data: NormalizedInventoryRow): string {
  const parts: string[] = [];
  if (data.description?.trim()) parts.push(data.description.trim());
  if (data.notes?.trim()) parts.push(`หมายเหตุ: ${data.notes.trim()}`);
  if (data.color?.trim()) parts.push(`สี: ${data.color.trim()}`);
  if (data.gear?.trim()) parts.push(`เกียร์: ${data.gear.trim()}`);
  const legacyProvince = data.province?.trim();
  const registrationProvince = data.registrationProvince?.trim();
  if (registrationProvince) {
    parts.push(`จังหวัดทะเบียน: ${registrationProvince}`);
  } else if (legacyProvince) {
    parts.push(`จังหวัด: ${legacyProvince}`);
  }
  const maskedPlate = data.licensePlateMasked?.trim();
  if (maskedPlate) {
    parts.push(`ทะเบียน (ปิดบางส่วน): ${maskedPlate}`);
  }
  if (data.youtubeUrl?.trim()) parts.push(`YouTube: ${data.youtubeUrl.trim()}`);
  if (data.tiktokUrl?.trim()) parts.push(`TikTok: ${data.tiktokUrl.trim()}`);
  if (data.financeStatus?.trim())
    parts.push(`ไฟแนนซ์: ${data.financeStatus.trim()}`);
  return parts.join("\n").slice(0, 4000);
}

function resolveCondition(data: NormalizedInventoryRow): string {
  return (
    data.status?.trim() ||
    data.qcStatus?.trim() ||
    data.repairStatus?.trim() ||
    "มือสอง"
  );
}

export function mapCleanedRowToMarketplacePayload(
  data: NormalizedInventoryRow,
  sourceRowIndex: number,
  importStatus: "valid" | "warning",
  owner: ImportOwnerContext,
  rawRow?: Record<string, string>
): MarketplaceImportPayload | null {
  const brand = data.brand?.trim();
  const model = data.model?.trim();
  const year = parseInt(data.year ?? "", 10);
  const price = parseInt(data.price ?? "", 10);

  if (!brand || !model || Number.isNaN(year) || Number.isNaN(price) || price <= 0) {
    return null;
  }

  const sub = data.subModel?.trim();
  const title = sub
    ? `${brand} ${model} ${sub} ปี ${year}`
    : `${brand} ${model} ปี ${year}`;

  const sourceImageUrls = parseImageUrls(data.imageUrls ?? "");
  const registration = extractRegistrationFields({
    plateValue:
      data.licensePlateFull ||
      data.licensePlate ||
      rawRow?.["ทะเบียน/จังหวัด"] ||
      rawRow?.["ทะเบียน"] ||
      rawRow?.["license plate"] ||
      rawRow?.plate,
    provinceValue:
      data.registrationProvince ||
      data.province ||
      rawRow?.["จังหวัดทะเบียน"] ||
      rawRow?.["registration province"] ||
      rawRow?.province,
  });

  const fuelType = data.fuelType?.trim() || "petrol";
  const categoryType = inferMarketplaceCategoryType({
    fuelType,
    condition: resolveCondition(data),
    price,
  });

  const mileage = parseInt(data.mileage ?? "0", 10);

  return {
    sourceRowIndex,
    importStatus,
    title,
    brand,
    model,
    year,
    price,
    type: categoryType,
    condition: resolveCondition(data),
    mileage: Number.isNaN(mileage) ? 0 : mileage,
    fuelType,
    sourceImageUrls,
    images: [],
    description: buildDescription(data) || title,
    ownerId: owner.ownerId,
    ownerName: owner.ownerName,
    ownerPhone: owner.ownerPhone,
    showroomName: owner.showroomName,
    registrationProvince: registration.registrationProvince || undefined,
    licensePlateMasked: registration.licensePlateMasked || undefined,
    licensePlateFull: registration.licensePlateFull || undefined,
  };
}

/** Draft / needs_review — ไม่บังคับ year/price */
export function mapCleanedRowToPartialPayload(
  data: NormalizedInventoryRow,
  sourceRowIndex: number,
  owner: ImportOwnerContext,
  rawRow?: Record<string, string>
): MarketplaceImportPayload | null {
  const brand = data.brand?.trim();
  const model = data.model?.trim();
  if (!brand && !model) return null;

  const year = parseInt(data.year ?? "", 10);
  const price = parseInt(String(data.price ?? "").replace(/[,\s]/g, ""), 10);
  const safeYear =
    !Number.isNaN(year) && year >= 1980 && year <= new Date().getFullYear() + 2
      ? year
      : new Date().getFullYear();
  const safePrice = !Number.isNaN(price) && price > 0 ? price : 0;

  const sub = data.subModel?.trim();
  const b = brand || "?";
  const m = model || "?";
  const title = sub
    ? `${b} ${m} ${sub}${safeYear ? ` ปี ${safeYear}` : ""}`
    : `${b} ${m}${safeYear ? ` ปี ${safeYear}` : ""}`;

  const sourceImageUrls = parseImageUrls(data.imageUrls ?? "");
  const registration = extractRegistrationFields({
    plateValue:
      data.licensePlateFull ||
      data.licensePlate ||
      rawRow?.["ทะเบียน/จังหวัด"] ||
      rawRow?.["ทะเบียน"] ||
      rawRow?.["license plate"] ||
      rawRow?.plate,
    provinceValue:
      data.registrationProvince ||
      data.province ||
      rawRow?.["จังหวัดทะเบียน"] ||
      rawRow?.["registration province"] ||
      rawRow?.province,
  });
  const fuelType = data.fuelType?.trim() || "petrol";
  const mileage = parseInt(data.mileage ?? "0", 10);

  return {
    sourceRowIndex,
    importStatus: "warning",
    title,
    brand: b,
    model: m,
    year: safeYear,
    price: safePrice,
    type: inferMarketplaceCategoryType({
      fuelType,
      condition: resolveCondition(data),
      price: safePrice,
    }),
    condition: resolveCondition(data),
    mileage: Number.isNaN(mileage) ? 0 : mileage,
    fuelType,
    sourceImageUrls,
    images: [],
    description: buildDescription(data) || title,
    ownerId: owner.ownerId,
    ownerName: owner.ownerName,
    ownerPhone: owner.ownerPhone,
    showroomName: owner.showroomName,
    registrationProvince: registration.registrationProvince || undefined,
    licensePlateMasked: registration.licensePlateMasked || undefined,
    licensePlateFull: registration.licensePlateFull || undefined,
  };
}

export function buildPreviewTitle(data: NormalizedInventoryRow): string {
  const b = data.brand?.trim() ?? "?";
  const m = data.model?.trim() ?? "?";
  const y = data.year?.trim() ?? "?";
  return `${b} ${m} (${y})`;
}
