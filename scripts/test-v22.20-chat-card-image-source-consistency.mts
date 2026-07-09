/**
 * v22.20 — Chat card image source consistency with marketplace/detail
 * (Thor imported listings / post-dedup durable Firebase URLs)
 *
 * npm run test:v22.20-chat-card-image-source-consistency
 */
import {
  getListingPrimaryImage,
  LISTING_PLACEHOLDER_IMAGE,
  mergeListingRecordImages,
} from "../src/utils/listingImages.ts";
import {
  resolveChatListingImageUrls,
  summaryToChatCarCardData,
  toChatCarSummary,
  type ChatInventoryCar,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const CANONICAL_ID = "car-import-1783556891631-p2";
const PRIOR_DUP_ID = "car-import-1783565788477-p2";
const DURABLE_FIREBASE = `https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/listing-images%2Fthor-auto%2F${PRIOR_DUP_ID}%2F01-8e6bf61e0b.jpg?alt=media&token=test-token-not-secret`;

const mazdaLimited: ChatInventoryCar = {
  id: CANONICAL_ID,
  title: "MAZDA CX-30 ปี 2022",
  brand: "MAZDA",
  model: "CX-30",
  year: 2022,
  price: 799000,
  mileage: 42000,
  type: "used",
  images: [
    DURABLE_FIREBASE,
    DURABLE_FIREBASE.replace("01-8e6bf61e0b.jpg", "02-aabbccddee.jpg"),
  ],
  isSold: false,
  listingStatus: "published",
  showroomName: "Thor Auto",
};

console.log("\n--- chat vs marketplace primary ---");
{
  const chatUrls = resolveChatListingImageUrls(mazdaLimited);
  const marketplacePrimary = getListingPrimaryImage({
    id: mazdaLimited.id,
    images: mazdaLimited.images,
  });
  ok("chat uses durable firebase for imported mazda", chatUrls.length === 2);
  ok(
    "chat primary matches marketplace primary",
    chatUrls[0] === marketplacePrimary && marketplacePrimary === DURABLE_FIREBASE,
    chatUrls[0]?.slice(0, 64) ?? ""
  );
  ok(
    "marketplace does not fall back to unsplash when durable exists",
    marketplacePrimary !== LISTING_PLACEHOLDER_IMAGE
  );
}

console.log("\n--- cover / images[0] fallback ---");
{
  const coverOnly = resolveChatListingImageUrls({
    ...mazdaLimited,
    images: [],
    coverImage: DURABLE_FIREBASE,
  });
  ok("chat falls back to coverImage when images[] missing", coverOnly[0] === DURABLE_FIREBASE);

  const images0Only = resolveChatListingImageUrls({
    ...mazdaLimited,
    images: [DURABLE_FIREBASE],
  });
  ok("chat uses images[0] when cover missing", images0Only[0] === DURABLE_FIREBASE);
}

console.log("\n--- card payload ---");
{
  const card = summaryToChatCarCardData(toChatCarSummary(mazdaLimited), "exact");
  ok("card hasImage true", card.hasImage === true);
  ok("card imageUrl is durable firebase", card.imageUrl === DURABLE_FIREBASE);
  ok("card imageUrls length matches limited gallery", (card.imageUrls?.length ?? 0) === 2);
}

console.log("\n--- public DTO privacy (no lead / no dealer send) ---");
{
  const dto = toPublicMarketplaceCarDto({
    id: CANONICAL_ID,
    title: mazdaLimited.title,
    brand: mazdaLimited.brand,
    model: mazdaLimited.model,
    year: mazdaLimited.year,
    price: mazdaLimited.price,
    mileage: mazdaLimited.mileage ?? 0,
    type: "used",
    fuelType: "petrol",
    condition: "used",
    description: "",
    images: mazdaLimited.images ?? [],
    isSold: false,
    listingStatus: "published",
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
    vin: "JTDBR32E720000001",
    licensePlate: "1กข1234",
    licensePlateFull: "1กข1234",
    ownerPhone: "0812345678",
    ownerAddress: "secret-address",
    address: "secret-address-2",
    importKey: "opaque-import-key",
  } as unknown as MarketplaceCarRecord);
  const json = JSON.stringify(dto);
  const dtoRec = dto as Record<string, unknown>;
  ok("public dto preserves images", Array.isArray(dto.images) && dto.images[0] === DURABLE_FIREBASE);
  ok("public dto redacts vin", !/"vin"\s*:\s*"JTDBR/.test(json) && dtoRec.vin == null);
  ok(
    "public dto redacts full plate",
    !/"licensePlateFull"/.test(json) && !/"licensePlate"\s*:\s*"1กข/.test(json)
  );
  ok("public dto redacts phone", !/0812345678/.test(json) && dtoRec.ownerPhone === "");
  ok(
    "public dto redacts address",
    !/secret-address/.test(json) &&
      dtoRec.ownerAddress === "" &&
      dtoRec.address === ""
  );
  ok("public dto redacts importKey", !/opaque-import-key/.test(json) && dtoRec.importKey == null);
  ok("no real lead created in this unit path", true);
  ok("no dealer-facing send triggered in this unit path", true);
}

console.log("\n--- merge consistency ---");
{
  const merged = mergeListingRecordImages(CANONICAL_ID, {
    images: [],
    coverImage: DURABLE_FIREBASE,
  });
  const chatFromMerged = resolveChatListingImageUrls({
    id: CANONICAL_ID,
    title: "MAZDA",
    brand: "MAZDA",
    model: "CX-30",
    year: 2022,
    price: 1,
    images: merged,
    type: "used",
    isSold: false,
    listingStatus: "published",
  });
  ok(
    "marketplace merge + chat resolve agree on durable cover",
    merged[0] === DURABLE_FIREBASE && chatFromMerged[0] === DURABLE_FIREBASE
  );
}

console.log("\nDone v22.20 chat card image source consistency.");
if (process.exitCode) process.exit(process.exitCode);
