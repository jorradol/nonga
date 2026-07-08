import { evaluateMappingContinueGate } from "../src/utils/inventoryImport/import/mappingContinueGate.ts";
import type { ColumnMappingEntry } from "../src/utils/inventoryImport/columnMapping.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function buildEntries(fields: string[]): ColumnMappingEntry[] {
  return fields.map((field, idx) => ({
    originalColumn: `col-${idx}`,
    sampleValue: `value-${idx}`,
    suggestedMapping: field as ColumnMappingEntry["finalMapping"],
    finalMapping: field as ColumnMappingEntry["finalMapping"],
  }));
}

function main() {
  const missingRequired = evaluateMappingContinueGate(
    buildEntries(["brand", "model", "mileage"]),
    3,
    true
  );
  assert(missingRequired.canContinue === false, "should block when required mapping is missing");
  assert(
    missingRequired.reasons.includes("ยังต้องจับคู่คอลัมน์ ปี"),
    "must explain missing year mapping"
  );
  assert(
    missingRequired.reasons.includes("ยังต้องจับคู่คอลัมน์ ราคา"),
    "must explain missing price mapping"
  );

  const noRows = evaluateMappingContinueGate(
    buildEntries(["brand", "model", "year", "price"]),
    0,
    true
  );
  assert(noRows.canContinue === false, "should block when CSV has no rows");
  assert(
    noRows.reasons.includes("ยังไม่พบข้อมูลรถในไฟล์"),
    "must explain empty file reason"
  );

  const permissionLimited = evaluateMappingContinueGate(
    buildEntries(["brand", "model", "year", "price"]),
    2,
    false
  );
  assert(permissionLimited.canContinue === true, "mapping can continue even when commit is disabled");
  assert(
    permissionLimited.reasons.includes("บัญชีนี้ยังไม่มีสิทธิ์ commit staging import"),
    "must surface commit permission note"
  );

  const complete = evaluateMappingContinueGate(
    buildEntries(["brand", "model", "year", "price", "mileage"]),
    3,
    true
  );
  assert(complete.canContinue === true, "should allow continue when required fields are mapped");
  assert(complete.missingRequiredFields.length === 0, "no missing required fields expected");

  console.log("PASS test-import-mapping-continue-gate");
}

main();
