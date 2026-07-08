import {
  processSmartInventoryImport,
  type CommitImportRowInput,
} from "../src/server/inventoryImportCommit.ts";
import {
  getPublishedMarketplaceCars,
  removeMarketplaceCar,
} from "../src/server/marketplaceInventory.ts";
import {
  getDealerDraftById,
  removeDealerDraft,
} from "../src/server/dealerDraftInventory.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevForceHidden = process.env.NONGA_THOR_IMPORT_FORCE_HIDDEN;
  process.env.NODE_ENV = "development";
  delete process.env.NONGA_THOR_IMPORT_FORCE_HIDDEN;

  const owner = {
    dealerId: "thor-auto",
    ownerId: "owner-thor-auto-regression",
    ownerName: "สมชาย ทดสอบ",
    ownerPhone: "0800000000",
    showroomName: "Thor Auto",
    address: "Bangkok",
  };

  const publishedRow: CommitImportRowInput = {
    sourceRowIndex: 1,
    importStatus: "valid",
    brand: "Toyota",
    model: "Yaris Ativ",
    year: 2021,
    price: 399000,
    mileage: 52000,
    fuelType: "petrol",
    title: "Toyota Yaris Ativ 2021",
    description:
      "รถบ้านสภาพดี ownerPhone:0819999999 VIN JTNB11HK123456789 ที่อยู่: 99/9 ถนนทดสอบ",
    rawRow: {
      plate: "1กข1234",
      vin: "JTNB11HK123456789",
      ownerPhone: "0819999999",
      color: "ขาว",
    },
    warnings: [],
  };

  const draftRow: CommitImportRowInput = {
    sourceRowIndex: 2,
    importStatus: "warning",
    disposition: "needs_review",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 359000,
    mileage: 68000,
    fuelType: "petrol",
    title: "Honda City 2020",
    description: "รอตรวจเพิ่ม",
    rawRow: {
      licensePlate: "9ฆอ9999",
      customerPhone: "0821111111",
      note: "ต้องตรวจทับอีกครั้ง",
    },
    warnings: [],
  };

  let publishedId = "";
  let draftId = "";

  try {
    const result = await processSmartInventoryImport(
      { published: [publishedRow], drafts: [draftRow] },
      owner
    );

    assert(result.success === true, "import should succeed");
    assert(result.publishedCount === 1, "expected 1 published row");
    assert(result.draftCount === 1, "expected 1 draft row");
    assert(
      result.rowWarnings?.some((w) =>
        w.warnings.some((m) => m.includes("stripped forbidden raw key"))
      ),
      "expected forbidden raw-key warnings"
    );

    publishedId =
      result.imported.find((item) => item.bucket === "published")?.id ?? "";
    draftId = result.drafts[0]?.id ?? "";
    assert(Boolean(publishedId), "published id should be present");
    assert(Boolean(draftId), "draft id should be present");

    const visibleCars = getPublishedMarketplaceCars();
    const importedCar = visibleCars.find((car) => car.id === publishedId);
    assert(Boolean(importedCar), "thor import should be visible on staging market");
    assert(importedCar?.listingStatus === "published", "listing should be published");
    assert(!importedCar?.vin, "vin must be stripped");
    assert(!importedCar?.licensePlate, "license plate must be stripped");
    assert(importedCar?.ownerPhone === "", "owner phone must be stripped");
    assert(
      Boolean(importedCar?.ownerName) &&
        !String(importedCar?.ownerName ?? "").includes("สมชาย"),
      "owner name must not expose personal name"
    );
    assert(
      !String(importedCar?.description ?? "").includes("ที่อยู่:"),
      "owner address must not be appended"
    );
    assert(
      !/0819999999|JTNB11HK123456789/.test(String(importedCar?.description ?? "")),
      "description must redact phone and vin"
    );

    const importedDraft = getDealerDraftById(draftId);
    assert(Boolean(importedDraft), "draft record should exist");
    assert(!importedDraft?.vin, "draft vin must be stripped");
    assert(!importedDraft?.licensePlate, "draft plate must be stripped");
    assert(importedDraft?.phone === "", "draft phone must be stripped");
    assert(
      Boolean(importedDraft?.ownerName) &&
        !String(importedDraft?.ownerName ?? "").includes("สมชาย"),
      "draft owner name must not expose personal name"
    );
  } finally {
    if (publishedId) removeMarketplaceCar(publishedId);
    if (draftId) removeDealerDraft(draftId);
    process.env.NODE_ENV = prevNodeEnv;
    if (prevForceHidden == null) {
      delete process.env.NONGA_THOR_IMPORT_FORCE_HIDDEN;
    } else {
      process.env.NONGA_THOR_IMPORT_FORCE_HIDDEN = prevForceHidden;
    }
  }

  console.log("PASS test-v22-regression-intake-visibility");
}

main().catch((error) => {
  console.error("FAIL test-v22-regression-intake-visibility");
  console.error(error);
  process.exit(1);
});
