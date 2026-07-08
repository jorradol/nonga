import { parseCsvTextToObjects } from "../src/utils/inventoryImport/csvParser.ts";
import {
  buildSmartColumnMappings,
} from "../src/utils/inventoryImport/smartFieldDetection.ts";
import { evaluateMappingContinueGate } from "../src/utils/inventoryImport/import/mappingContinueGate.ts";
import { normalizeColumnKey } from "../src/utils/inventoryImport/columnMapping.ts";
import {
  isForbiddenRawKey,
  isSensitiveRegistrationKey,
} from "../src/utils/inventoryImport/import/forbiddenRawKeys.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function main() {
  const csv = [
    '"ทะเบียน/จังหวัด\n(License Plate)","ยี่ห้อ\n(Make)","รุ่นหลัก/รุ่นย่อย\n(Model/Trim)","ปีรถ (ค.ศ.)\n(Year)","เกียร์\n(Gear)","สีรถ\n(Color)","เลขไมล์ (กม.)\n(Mileage)","ราคาหน้าร้าน (บาท)\n[ราคาสูงสุด - สำหรับลูกค้าทั่วไป]","ราคาส่งเต้นท์ (บาท)\n[ราคาต่ำสุด - สำหรับตัดสด/พันธมิตร]","จุดเด่น/ข้อมูลสภาพรถสำหรับทำคอนเทนต์\n(Selling Points & Condition)"',
    '"2ขร3120","Toyota","Vios","2021","AT","เทา","127,101","369,000","355,000","รถสวยพร้อมขาย"',
  ].join("\n");

  const rows = parseCsvTextToObjects(csv);
  const columns = Object.keys(rows[0] ?? {});
  const mappings = buildSmartColumnMappings(columns, rows);

  const byColumn = new Map(mappings.map((m) => [m.originalColumn, m.finalMapping]));
  const modelHeader = "รุ่นหลัก/รุ่นย่อย\n(Model/Trim)";
  const brandHeader = "ยี่ห้อ\n(Make)";
  const yearHeader = "ปีรถ (ค.ศ.)\n(Year)";
  const priceHeader = "ราคาหน้าร้าน (บาท)\n[ราคาสูงสุด - สำหรับลูกค้าทั่วไป]";
  const plateHeader = "ทะเบียน/จังหวัด\n(License Plate)";

  assert(byColumn.get(brandHeader) === "brand", "expected make header -> brand");
  assert(byColumn.get(modelHeader) === "model", "expected model/trim header -> model");
  assert(byColumn.get(yearHeader) === "year", "expected year header -> year");
  assert(byColumn.get(priceHeader) === "price", "expected retail price header -> price");

  const plateMapping = byColumn.get(plateHeader);
  assert(
    plateMapping === "licensePlateFull" || plateMapping === "registrationProvince",
    "expected plate/province header to map to sensitive registration field"
  );

  assert(
    !isForbiddenRawKey(plateHeader),
    "plate/province header must not be hard-forbidden"
  );
  assert(
    isSensitiveRegistrationKey(plateHeader),
    "plate/province header must be treated as sensitive registration key"
  );

  const gate = evaluateMappingContinueGate(mappings, rows.length, true);
  assert(gate.canContinue, "mapping gate should pass when brand/model/year/price exist");
  assert(
    !gate.reasons.some((reason) => reason.includes("ยังต้องจับคู่คอลัมน์ รุ่น")),
    "mapping gate must not block on missing model"
  );

  assert(
    normalizeColumnKey('"เกียร์\n(Gear)"') === "เกียร์ gear",
    "normalize should handle newline + quoted header"
  );
  assert(
    normalizeColumnKey("รุ่นหลัก/รุ่นย่อย\n(Model/Trim)") ===
      "รุ่นหลัก รุ่นย่อย model trim",
    "normalize should keep slash groups matchable"
  );
  assert(
    normalizeColumnKey("ปีรถ (ค.ศ.)\n(Year)") === "ปีรถ ค ศ year",
    "normalize should remove parentheses and keep tokens"
  );

  console.log("PASS test-thor-csv-column-mapping");
}

main();
