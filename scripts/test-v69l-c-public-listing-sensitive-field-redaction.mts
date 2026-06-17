/**
 * v6.9L-C — Public listing sensitive field redaction
 * npm run test:v69l-c-public-listing-sensitive-field-redaction
 */
import fs from "node:fs";
import path from "node:path";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";
import {
  PUBLIC_LISTING_REDACTED_CONTACT_FIELDS,
  PUBLIC_LISTING_REDACTED_DUPLICATE_FIELDS,
  PUBLIC_LISTING_REDACTED_PRICE_INTERNAL_FIELDS,
  PUBLIC_LISTING_REDACTED_SENSITIVE_VEHICLE_FIELDS,
  sanitizePublicListingDescription,
  toPublicMarketplaceCarDto,
  toPublicMarketplaceCarDtoList,
} from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { normalizePublicMarketplaceCar } from "../src/utils/marketplaceCarMapper.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";

const FAKE_VIN = "ZZZZZZZZZZZZZZZZZ";
const FAKE_PLATE = "กข-9999";
const FAKE_WHOLESALE = 750_000;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assertAbsent(dto: Record<string, unknown>, key: string): void {
  ok(`public DTO omits ${key}`, !(key in dto));
}

console.log("=== v6.9L-C Public Listing Sensitive Field Redaction ===\n");

const baseListing = {
  id: "car-redact-test-1",
  title: "Synthetic Test Car",
  brand: "Toyota",
  model: "Corolla",
  year: 2021,
  price: 650_000,
  type: "used" as const,
  condition: "used",
  mileage: 40_000,
  fuelType: "petrol",
  images: ["https://example.com/listing/car-redact-test-1/hero.jpg"],
  description: `รถทดสอบ synthetic — VIN ${FAKE_VIN} ทะเบียน ${FAKE_PLATE} โทร 081-234-5678`,
  ownerId: "owner-synthetic-test",
  ownerName: "Synthetic Seller",
  ownerPhone: "0812345678",
  ownerEmail: "seller-synthetic@example.test",
  showroomName: "Synthetic Showroom",
  dealerId: "dealer-synthetic-test",
  isSold: false,
  listingStatus: "published" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  vin: FAKE_VIN,
  licensePlate: FAKE_PLATE,
  plate: FAKE_PLATE,
  registration: FAKE_PLATE,
  wholesalePrice: FAKE_WHOLESALE,
  wholesaleInternalPrice: FAKE_WHOLESALE,
  internalPrice: FAKE_WHOLESALE,
  cost: FAKE_WHOLESALE,
  dealerCost: FAKE_WHOLESALE,
  buyerPhone: "0891112222",
  buyerEmail: "buyer-synthetic@example.test",
  duplicateStatus: "possible_duplicate" as const,
  duplicateScore: 0.92,
  duplicateGroupId: "dup-group-synthetic",
  duplicateCanonicalId: "car-canonical-synthetic",
  duplicateMatches: [
    { id: "car-other-synthetic", source: "published" as const, score: 0.92, reasons: ["test"] },
  ],
  imageMetadata: [{ tag: "internal-only" }],
  moderationStatus: "under_review" as const,
} satisfies Record<string, unknown>;

const dto = toPublicMarketplaceCarDto(baseListing as unknown as MarketplaceCarRecord);
const raw = dto as unknown as Record<string, unknown>;

for (const key of PUBLIC_LISTING_REDACTED_SENSITIVE_VEHICLE_FIELDS) {
  assertAbsent(raw, key);
}
for (const key of PUBLIC_LISTING_REDACTED_PRICE_INTERNAL_FIELDS) {
  assertAbsent(raw, key);
}
for (const key of PUBLIC_LISTING_REDACTED_DUPLICATE_FIELDS) {
  assertAbsent(raw, key);
}

ok("imageMetadata removed", !("imageMetadata" in raw));
ok("moderationStatus removed", !("moderationStatus" in raw));

for (const key of PUBLIC_LISTING_REDACTED_CONTACT_FIELDS) {
  if (key in baseListing) {
    ok(`contact field ${key} cleared`, raw[key] === "");
  }
}
ok("buyerPhone cleared", raw.buyerPhone === "");
ok("buyerEmail cleared", raw.buyerEmail === "");

ok("safe field brand preserved", raw.brand === "Toyota");
ok("safe field model preserved", raw.model === "Corolla");
ok("safe field year preserved", raw.year === 2021);
ok("safe field price preserved", raw.price === 650_000);
ok("safe field images preserved", Array.isArray(raw.images) && raw.images.length === 1);
ok("dealerId preserved for showroom routing", raw.dealerId === "dealer-synthetic-test");

const desc = String(raw.description ?? "");
ok("description VIN fragment removed", !desc.includes(FAKE_VIN));
ok("description plate fragment removed", !desc.includes(FAKE_PLATE));
ok("description phone fragment removed", !/081/.test(desc));

ok(
  "sanitizePublicListingDescription standalone",
  !sanitizePublicListingDescription(
    `ทดสอบ ${FAKE_VIN} ${FAKE_PLATE} wholesale ราคาส่ง`
  ).match(/wholesale|ราคาส่ง|ZZZZ/i)
);

const list = toPublicMarketplaceCarDtoList([baseListing as unknown as MarketplaceCarRecord]);
ok(
  "batch DTO redacts sensitive fields",
  list.every((item) => {
    const row = item as unknown as Record<string, unknown>;
    return !("vin" in row) && !("licensePlate" in row);
  })
);

const normalized = normalizePublicMarketplaceCar({
  ...baseListing,
} as unknown as Record<string, unknown>);
ok("normalizePublicMarketplaceCar strips ownerPhone", normalized.ownerPhone === "");
ok("normalizePublicMarketplaceCar keeps public brand", normalized.brand === "Toyota");

const chatSummary = toChatCarSummary({
  ...dto,
  description: String(raw.description ?? ""),
});
const card = summaryToChatCarCardData(chatSummary, "exact");
ok("chat card has no ownerPhone key", !("ownerPhone" in card));
ok(
  "chat card description sanitized",
  !String(card.description ?? "").includes(FAKE_VIN)
);

const serverSource = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
ok(
  "GET /api/cars uses toPublicMarketplaceCarDtoList",
  serverSource.includes("toPublicMarketplaceCarDtoList")
);
ok(
  "chat inventory loader uses toPublicMarketplaceCarDtoList",
  /loadChatInventory[\s\S]{0,200}toPublicMarketplaceCarDtoList/.test(serverSource)
);

const privacySource = fs.readFileSync(
  path.join(process.cwd(), "src/utils/publicMarketplaceListingPrivacy.ts"),
  "utf8"
);
ok(
  "privacy module exports sensitive vehicle field list",
  privacySource.includes("PUBLIC_LISTING_REDACTED_SENSITIVE_VEHICLE_FIELDS")
);
ok(
  "privacy module sanitizes description",
  privacySource.includes("sanitizePublicListingDescription")
);

console.log("\n=== Done v6.9L-C ===");
