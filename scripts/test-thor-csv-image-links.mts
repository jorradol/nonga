import { parseCsvTextToObjects } from "../src/utils/inventoryImport/csvParser.ts";
import { buildSmartColumnMappings } from "../src/utils/inventoryImport/smartFieldDetection.ts";
import { runInventoryCleanPipeline } from "../src/utils/inventoryImport/cleaning/cleanAndValidate.ts";
import {
  flattenSmartPrepForCommit,
  prepareSmartInventoryImport,
} from "../src/utils/inventoryImport/import/prepareSmartImport.ts";
import { mapCleanedRowToMarketplacePayload } from "../src/utils/inventoryImport/import/mapToMarketplace.ts";
import { getListingPrimaryImage } from "../src/utils/listingImages.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const COVER_FILE_ID = "AAA111bbb222CCC333";
const GALLERY_FILE_ID_1 = "DDD444eee555FFF666";
const GALLERY_FILE_ID_2 = "GGG777hhh888III999";

function main() {
  const csv = [
    '"ยี่ห้อ","รุ่น","ปี","ราคา","ลิงก์รูปภาพหลัก (Google Drive)\n(Cover Image Link)","ลิงก์รูปภาพประกอบ 4-5 รูป (Google Drive)\n(Gallery Image Links)"',
    `"Toyota","Yaris","2020","459000","https://drive.google.com/file/d/${COVER_FILE_ID}/view?usp=drive_link","https://drive.google.com/file/d/${GALLERY_FILE_ID_1}/view?usp=drive_link, https://drive.google.com/file/d/${GALLERY_FILE_ID_2}/view?usp=drive_link"`,
  ].join("\n");

  const rows = parseCsvTextToObjects(csv);
  const columns = Object.keys(rows[0] ?? {});
  const mappings = buildSmartColumnMappings(columns, rows);
  const byColumn = new Map(mappings.map((m) => [m.originalColumn, m.finalMapping]));
  const coverHeader = "ลิงก์รูปภาพหลัก (Google Drive)\n(Cover Image Link)";
  const galleryHeader =
    "ลิงก์รูปภาพประกอบ 4-5 รูป (Google Drive)\n(Gallery Image Links)";
  assert(byColumn.get(coverHeader) === "imageUrls", "cover header must map to imageUrls");
  assert(byColumn.get(galleryHeader) === "imageUrls", "gallery header must map to imageUrls");

  const clean = runInventoryCleanPipeline(rows, mappings);
  assert(clean.allRows.length === 1, "clean pipeline must produce one row");
  const cleanedRow = clean.allRows[0];

  const payload = mapCleanedRowToMarketplacePayload(
    cleanedRow.data,
    1,
    "valid",
    {
      dealerId: "thor-auto",
      ownerId: "owner-thor-auto",
      ownerName: "Thor Auto",
      ownerPhone: "",
      showroomName: "Thor Auto",
    },
    rows[0]
  );
  assert(payload !== null, "payload must be created");
  assert(payload!.sourceImageUrls?.length === 3, "must parse cover+gallery to 3 urls");
  assert(
    payload!.sourceImageUrls?.[0] ===
      `https://drive.google.com/uc?export=download&id=${COVER_FILE_ID}`,
    "cover url should be first and drive-download normalized"
  );
  assert(
    payload!.sourceImageUrls?.[1] ===
      `https://drive.google.com/uc?export=download&id=${GALLERY_FILE_ID_1}`,
    "gallery url #1 should preserve order"
  );
  assert(
    payload!.sourceImageUrls?.[2] ===
      `https://drive.google.com/uc?export=download&id=${GALLERY_FILE_ID_2}`,
    "gallery url #2 should preserve order"
  );

  const prep = prepareSmartInventoryImport(clean.allRows, {
    dealerId: "thor-auto",
    ownerId: "owner-thor-auto",
    ownerName: "Thor Auto",
    ownerPhone: "",
    showroomName: "Thor Auto",
  }, { 1: rows[0] });
  const flattened = flattenSmartPrepForCommit(prep);
  assert(flattened.published.length === 1, "one row should be ready for publish");
  assert(
    flattened.published[0].sourceImageUrls?.length === 3,
    "flattened payload must keep all image urls"
  );

  const publicDto = toPublicMarketplaceCarDto({
    id: "car-image-test",
    title: "Toyota Yaris ปี 2020",
    brand: "Toyota",
    model: "Yaris",
    year: 2020,
    price: 459000,
    type: "used",
    condition: "มือสอง",
    mileage: 90000,
    fuelType: "petrol",
    images: [
      `https://drive.google.com/uc?export=view&id=${COVER_FILE_ID}`,
      "https://images.example.com/gallery-1.jpg",
    ],
    description: "รถพร้อมขาย",
    ownerId: "owner-thor-auto",
    ownerName: "Thor Auto",
    ownerPhone: "0811111111",
    isSold: false,
    createdAt: new Date().toISOString(),
  });
  assert(Array.isArray(publicDto.images), "public dto should keep images field");
  assert(publicDto.images.length === 2, "public dto must not drop image urls");

  const primary = getListingPrimaryImage({
    id: "car-image-test",
    images: publicDto.images,
  });
  assert(primary.includes("drive.google.com/uc?export=view&id="), "cover should be used before placeholder");

  console.log("PASS test-thor-csv-image-links");
}

main();
