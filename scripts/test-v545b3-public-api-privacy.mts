/**
 * Nong A v5.4.5-beta.3 — Public API Privacy Guard for Owner Contact
 * npm run test:v545b3-public-api-privacy
 */
import fs from "node:fs";
import path from "node:path";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";
import {
  PUBLIC_LISTING_REDACTED_CONTACT_FIELDS,
  redactListingPrivateContactFields,
  toPublicMarketplaceCarDto,
  toPublicMarketplaceCarDtoList,
} from "../src/utils/publicMarketplaceListingPrivacy.ts";
import { normalizePublicMarketplaceCar } from "../src/utils/marketplaceCarMapper.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

console.log("=== Nong A v5.4.5-beta.3 Public API Privacy Guard ===");

const sampleMemberListing: MarketplaceCarRecord = {
  id: "car-privacy-member-1",
  title: "Toyota Vios 2020",
  brand: "Toyota",
  model: "Vios",
  year: 2020,
  price: 420000,
  type: "used",
  condition: "used",
  mileage: 55000,
  fuelType: "petrol",
  images: [],
  description: "รถบ้านมือเดียว",
  ownerId: "member-owner-001",
  ownerName: "คุณสมชาย",
  ownerPhone: "0812345678",
  isSold: false,
  listingStatus: "published",
  createdAt: new Date().toISOString(),
};

const sampleDealerListing: MarketplaceCarRecord = {
  ...sampleMemberListing,
  id: "car-privacy-dealer-1",
  ownerId: "dealer-thor-auto",
  dealerId: "dealer-thor-auto",
  ownerPhone: "0829998888",
  showroomName: "Thor Auto Premium",
};

const rawWithExtraContact = {
  ...sampleMemberListing,
  ownerEmail: "seller@example.com",
  ownerLine: "@sellerline",
  contactPhone: "0891112222",
  contactName: "Secret Contact",
  contactNote: "call after 6pm",
};

const redacted = toPublicMarketplaceCarDto(rawWithExtraContact as MarketplaceCarRecord);
ok(
  "member listing ownerPhone redacted",
  redacted.ownerPhone === "",
  `got=${redacted.ownerPhone}`
);
for (const field of PUBLIC_LISTING_REDACTED_CONTACT_FIELDS) {
  if (field === "ownerPhone") continue;
  if (!(field in rawWithExtraContact)) continue;
  ok(
    `extra contact field ${field} redacted`,
    (redacted as unknown as Record<string, unknown>)[field] === ""
  );
}

const dealerDto = toPublicMarketplaceCarDto(sampleDealerListing);
ok(
  "dealer listing ownerPhone also redacted on public API",
  dealerDto.ownerPhone === "",
  "dealer showroom contact stays on DealerShowroom, not listing.ownerPhone"
);
ok(
  "dealer showroomName preserved",
  dealerDto.showroomName === "Thor Auto Premium"
);
ok(
  "dealerId preserved for showroom routing",
  dealerDto.dealerId === "dealer-thor-auto"
);

const list = toPublicMarketplaceCarDtoList([
  sampleMemberListing,
  sampleDealerListing,
]);
ok(
  "batch DTO redacts all listings",
  list.every((c) => c.ownerPhone === "")
);

const normalized = normalizePublicMarketplaceCar({
  ...sampleMemberListing,
  ownerPhone: "0998887777",
});
ok(
  "normalizePublicMarketplaceCar strips ownerPhone",
  normalized.ownerPhone === ""
);
ok(
  "normalizePublicMarketplaceCar keeps ownerName for display",
  normalized.ownerName === "คุณสมชาย"
);

const chatSummary = toChatCarSummary(normalized);
const card = summaryToChatCarCardData(chatSummary, "exact");
ok(
  "ChatCarCardData has no ownerPhone key",
  !("ownerPhone" in card)
);
ok("ChatCarCardData keeps listing id", card.id === normalized.id);

const serverSource = fs.readFileSync(
  path.join(process.cwd(), "server.ts"),
  "utf8"
);
ok(
  "GET /api/cars uses toPublicMarketplaceCarDtoList",
  serverSource.includes("toPublicMarketplaceCarDtoList")
);
ok(
  "GET /api/cars logs contactRedacted",
  serverSource.includes("contactRedacted: true")
);

const storeSource = fs.readFileSync(
  path.join(process.cwd(), "src/store.ts"),
  "utf8"
);
ok(
  "store fetchCars uses normalizePublicMarketplaceCar",
  storeSource.includes("normalizePublicMarketplaceCar")
);

const myListingsApi = fs.readFileSync(
  path.join(process.cwd(), "src/services/listings/myListingsApi.ts"),
  "utf8"
);
ok(
  "myListingsApi still uses normalizeMarketplaceCar for owner scope",
  myListingsApi.includes("normalizeMarketplaceCar")
);

const inquireModal = fs.readFileSync(
  path.join(process.cwd(), "src/components/cars/details/InquireModal.tsx"),
  "utf8"
);
ok(
  "InquireModal still simulated (setTimeout)",
  inquireModal.includes("setTimeout")
);
ok(
  "InquireModal pilot disclaimer present",
  inquireModal.includes("ยังไม่ส่ง lead") || inquireModal.includes("ยังไม่มีระบบส่ง lead")
);

assert(
  redactListingPrivateContactFields({ ownerPhone: "x" }).ownerPhone === "",
  "redact helper should clear ownerPhone"
);

console.log("=== Done ===");
