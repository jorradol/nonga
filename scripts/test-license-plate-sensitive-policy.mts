import { evaluateMappingContinueGate } from "../src/utils/inventoryImport/import/mappingContinueGate.ts";
import { extractRegistrationFields, maskLicensePlate } from "../src/utils/vehicleRegistrationPrivacy.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { isForbiddenRawKey } from "../src/utils/inventoryImport/import/forbiddenRawKeys.ts";
import { buildDraftPreviewCopy, extractCarFieldsFromMessage } from "../src/services/ai/chat/sellIntentParser.ts";
import { buildDealerDraftPayloadFromChat } from "../src/services/ai/chat/chatDraftActions.ts";
import type { ColumnMappingEntry } from "../src/utils/inventoryImport/columnMapping.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function mappingEntry(col: string, field: ColumnMappingEntry["finalMapping"]): ColumnMappingEntry {
  return {
    originalColumn: col,
    sampleValue: "sample",
    suggestedMapping: field,
    finalMapping: field,
  };
}

function main() {
  const gate = evaluateMappingContinueGate(
    [
      mappingEntry("ยี่ห้อ", "brand"),
      mappingEntry("รุ่น", "model"),
      mappingEntry("ปีรถ", "year"),
      mappingEntry("ราคา", "price"),
      mappingEntry("ทะเบียน/จังหวัด", "licensePlateFull"),
    ],
    5,
    true
  );
  assert(gate.canContinue, "continue must stay enabled with plate/province column");

  assert(maskLicensePlate("1กก1234", "กรุงเทพฯ") === "1กก**** กรุงเทพฯ", "thai mixed plate mask");
  assert(maskLicensePlate("กท1234") === "กท****", "thai short plate mask");
  assert(maskLicensePlate("AB1234", "Bangkok") === "AB**** Bangkok", "english plate mask");

  const reg = extractRegistrationFields({ plateValue: "1กก1234 กรุงเทพฯ" });
  assert(reg.registrationProvince === "กรุงเทพฯ", "should extract registration province");
  assert(reg.licensePlateMasked === "1กก**** กรุงเทพฯ", "should create masked plate");
  assert(reg.licensePlateFull === "1กก1234", "should keep full plate in sensitive field");

  const listing: MarketplaceCarRecord = {
    id: "car-sensitive-policy",
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2021,
    price: 399000,
    type: "used",
    condition: "มือสอง",
    mileage: 60000,
    fuelType: "petrol",
    images: [],
    description: "รถบ้านสภาพดี",
    ownerId: "owner-1",
    ownerName: "Owner",
    ownerPhone: "0812345678",
    isSold: false,
    createdAt: new Date().toISOString(),
    registrationProvince: "กรุงเทพฯ",
    licensePlateMasked: "1กก**** กรุงเทพฯ",
    licensePlateFull: "1กก1234",
    licensePlate: "1กก1234",
  };
  const publicDto = toPublicMarketplaceCarDto(
    listing
  ) as unknown as Record<string, unknown>;
  assert(!("licensePlateFull" in publicDto), "public dto must not expose full plate");
  assert(!("licensePlate" in publicDto), "public dto must not expose legacy full plate");
  assert(publicDto.licensePlateMasked === "1กก**** กรุงเทพฯ", "public dto keeps masked plate");
  assert(publicDto.registrationProvince === "กรุงเทพฯ", "public dto keeps registration province");

  const fields = extractCarFieldsFromMessage("Honda City 2020 ทะเบียน 9กณ7385 ราคา 399000 ไมล์ 60000");
  const preview = buildDraftPreviewCopy(fields);
  assert(!preview.includes("9กณ7385"), "chat preview must not echo full plate");
  assert(preview.includes("9กณ****"), "chat preview should show masked plate");

  const payload = buildDealerDraftPayloadFromChat(fields);
  const payloadDesc = String(payload.payload.description ?? "");
  assert(!payloadDesc.includes("9กณ7385"), "chat draft payload must not include full plate");
  assert(payloadDesc.includes("9กณ****"), "chat draft payload should include masked plate");

  assert(isForbiddenRawKey("VIN"), "vin must remain forbidden");
  assert(isForbiddenRawKey("ownerPhone"), "phone must remain forbidden");
  assert(!isForbiddenRawKey("ทะเบียน"), "license plate must no longer be hard-forbidden");
  assert(!isForbiddenRawKey("registration province"), "registration province must be allowed");

  console.log("PASS test-license-plate-sensitive-policy");
}

main();
