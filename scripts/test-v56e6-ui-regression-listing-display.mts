/**
 * v5.6E.6 — UI regression audit: restore listing card layout, queue as add-on below
 * npm run test:v56e6-ui-regression-listing-display
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const myListings = readFileSync("src/components/MyListingsView.tsx", "utf8");
const queueSection = readFileSync("src/components/leads/ListingLeadQueueSection.tsx", "utf8");
const panel = readFileSync("src/components/leads/SellerMaskedLeadQueuePanel.tsx", "utf8");
const chatCard = readFileSync("src/components/chat/ChatCarCard.tsx", "utf8");
const marketplace = readFileSync("src/components/MarketplaceView.tsx", "utf8");

// --- My Listings: main card row restored (image + details + actions) ---
ok("my listings uses ListingCoverImage", myListings.includes("ListingCoverImage"));
ok(
  "my listings image testid wired",
  myListings.includes('testId="my-listings-card-image"')
);
ok(
  "my listings image not hidden by overflow-hidden on article",
  !myListings.match(/<article[^>]*overflow-hidden/)?.[0]
);
ok(
  "my listings main row separate from queue",
  myListings.includes('data-testid="my-listings-card-main"') &&
    myListings.includes("ListingLeadQueueSection")
);
ok(
  "queue section rendered after main row closes",
  myListings.indexOf("my-listings-card-main") <
    myListings.indexOf("<ListingLeadQueueSection")
);
ok("my listings article no lg:flex-wrap", !myListings.includes("lg:flex-wrap"));
ok("my listings no basis-full grow queue hack", !myListings.includes("basis-full shrink-0 grow"));
ok("edit button still on card", myListings.includes("แก้ไข") && myListings.includes("handleDelete"));
ok("visibility toggle still on card", myListings.includes("handleVisibility"));

// --- ListingLeadQueueSection: full-width add-on below ---
ok("queue section wrapper marker", queueSection.includes('data-testid="listing-lead-queue-section"'));
ok("queue section below-card layout marker", queueSection.includes("listing-lead-queue-below-card"));
ok("queue section uses SellerMaskedLeadQueuePanel", queueSection.includes("SellerMaskedLeadQueuePanel"));

// --- Seller panel: hidden when no lead; no clip on listing image area ---
ok("panel hidden view returns null", panel.includes('view === "hidden"') && panel.includes("return null"));
ok("panel no overflow-hidden on root", !panel.match(/seller-lead-queue-panel[^`]*overflow-hidden/));

// --- Marketplace: image card unchanged pattern ---
ok("marketplace card image uses ListingCoverImage", marketplace.includes("ListingCoverImage"));
ok(
  "marketplace aspect-video image region",
  marketplace.includes("aspect-video") && marketplace.includes("object-cover")
);
ok("marketplace no buyer-lead queue panel import", !marketplace.includes("SellerMaskedLeadQueuePanel"));

// --- Chat car card: gallery before actions; CTA does not remove expand ---
ok("chat card gallery component", chatCard.includes("ChatCarImageGallery"));
ok(
  "chat card gallery before action footer in source",
  chatCard.indexOf("ChatCarImageGallery") < chatCard.indexOf("chat-car-card-seller-callback-btn")
);
ok("chat card expand button preserved", chatCard.includes('data-testid="chat-car-card-expand-btn"'));
ok("chat card callback optional", chatCard.includes("onRequestSellerCallback"));
ok(
  "chat card actions stacked in footer",
  chatCard.includes('data-testid="chat-car-card-seller-callback-btn"') &&
    chatCard.includes("space-y-2")
);

console.log("\nDone v5.6E.6 UI regression listing display tests.");
if (process.exitCode) process.exit(process.exitCode);
