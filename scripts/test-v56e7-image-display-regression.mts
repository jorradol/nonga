/**
 * v5.6E.7 — Image display regression (marketplace, drafts, my listings, chat card)
 * npm run test:v56e7-image-display-regression
 */
import { readFileSync } from "node:fs";
import {
  collectListingImageCandidates,
  getListingPrimaryImage,
  LISTING_PLACEHOLDER_IMAGE,
  mergeListingRecordImages,
} from "../src/utils/listingImages.ts";
import { normalizeMarketplaceCar } from "../src/utils/marketplaceCarMapper.ts";
import { resolveChatListingImageUrls } from "../src/services/ai/chat/marketplaceChatSearch.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const FIREBASE =
  "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/listing-images%2Fdealer%2Fcar-test-e7%2Fphoto.jpg?alt=media&token=abc";
const LOCAL = "/storage/listings/car-test-e7/01.webp";

// --- helper: multi-field merge ---
{
  const merged = mergeListingRecordImages("car-test-e7", {
    images: [],
    coverImage: LOCAL,
    imageUrl: FIREBASE,
  });
  ok("merge prefers cover then imageUrl", merged.length >= 1);
  ok("merge keeps local path", merged.includes(LOCAL));
}

{
  const primary = getListingPrimaryImage({
    id: "car-mp-e7",
    images: [FIREBASE],
  });
  ok("marketplace card with firebase images", primary === FIREBASE, primary.slice(0, 40));
}

{
  const empty = getListingPrimaryImage({ id: "car-empty-e7", images: [] });
  ok(
    "marketplace without images uses placeholder",
    empty === LISTING_PLACEHOLDER_IMAGE,
    empty.slice(0, 30)
  );
}

{
  const draftPrimary = getListingPrimaryImage({
    id: "draft-e7",
    images: [FIREBASE],
  });
  ok("dealer draft with images", draftPrimary === FIREBASE);
}

{
  const myLocal = "/storage/listings/mine-e7/01.webp";
  const myPrimary = getListingPrimaryImage({
    id: "mine-e7",
    images: [myLocal],
  });
  ok("my listings local storage image", myPrimary === myLocal, myPrimary);
}

{
  const chatUrls = resolveChatListingImageUrls({
    id: "car-staging-camry",
    title: "Camry",
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 1,
    images: [FIREBASE.replace("car-test-e7", "car-staging-camry")],
    type: "used",
    isSold: false,
    listingStatus: "published",
  });
  ok("chat car firebase gallery", chatUrls.length === 1, String(chatUrls.length));
}

{
  const legacyLocal = "/storage/listings/car-legacy-fields/01.webp";
  const norm = normalizeMarketplaceCar({
    id: "car-legacy-fields",
    title: "Legacy",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 400000,
    coverImage: legacyLocal,
    images: [],
  });
  ok("normalize merges coverImage into images", norm.images.includes(legacyLocal));
}

// --- UI wiring ---
{
  const mp = readFileSync("src/components/MarketplaceView.tsx", "utf8");
  const drafts = readFileSync("src/components/dealer-portal/DealerDraftsPage.tsx", "utf8");
  const my = readFileSync("src/components/MyListingsView.tsx", "utf8");
  const chat = readFileSync("src/components/chat/ChatCarCard.tsx", "utf8");
  const panel = readFileSync("src/components/leads/ListingLeadQueueSection.tsx", "utf8");

  ok("marketplace uses ListingCoverImage", mp.includes("ListingCoverImage"));
  ok("marketplace cover testid", mp.includes("marketplace-card-cover-image"));
  ok("dealer draft card cover", drafts.includes("dealer-draft-card-cover-image"));
  ok("my listings cover testid", my.includes("my-listings-card-image"));
  ok("chat gallery intact", chat.includes("ChatCarImageGallery"));
  ok("lead queue section separate", panel.includes("listing-lead-queue-below-card"));
  ok("queue panel does not import cover image", !panel.includes("ListingCoverImage"));
}

console.log("\nDone v5.6E.7 image display regression tests.");
if (process.exitCode) process.exit(process.exitCode);
