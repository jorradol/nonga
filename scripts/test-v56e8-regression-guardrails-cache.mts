/**
 * v5.6E.8 — Regression guardrails + Firebase Hosting cache headers
 * npm run test:v56e8-regression-guardrails-cache
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const firebaseJson = readFileSync("firebase.json", "utf8");
const firebase = JSON.parse(firebaseJson) as {
  hosting?: { headers?: { source: string; headers: { key: string; value: string }[] }[] };
};

// --- firebase.json cache headers ---
{
  const headers = firebase.hosting?.headers ?? [];
  const assets = headers.find((h) => h.source === "/assets/**");
  const indexHtml = headers.find((h) => h.source === "/index.html");
  ok("hosting headers block exists", headers.length >= 2);
  const assetsCc = assets?.headers?.find((h) => h.key === "Cache-Control")?.value ?? "";
  ok("assets immutable cache", assetsCc.includes("immutable") && assetsCc.includes("31536000"), assetsCc);
  const indexCc = indexHtml?.headers?.find((h) => h.key === "Cache-Control")?.value ?? "";
  ok("index.html no-cache", indexCc === "no-cache", indexCc);
  ok("rewrites still include api", firebaseJson.includes('"/api/**"'));
  ok("rewrites still include storage listings", firebaseJson.includes('"/storage/listings/**"'));
}

// --- My Listings: actions + image + queue separation ---
{
  const my = readFileSync("src/components/MyListingsView.tsx", "utf8");
  ok("my listings edit button", my.includes("แก้ไข") && my.includes("setEditingCar"));
  ok("my listings visibility handler", my.includes("handleVisibility"));
  ok("my listings delete handler", my.includes("handleDelete"));
  ok("my listings open marketplace", my.includes("openInMarketplace"));
  ok("my listings cover image", my.includes("ListingCoverImage") && my.includes("my-listings-card-image"));
  ok("my listings main row marker", my.includes("my-listings-card-main"));
  ok("my listings no flex-wrap regression", !my.includes("lg:flex-wrap"));
  ok(
    "queue component after main row in source",
    my.indexOf("my-listings-card-main") < my.indexOf("<ListingLeadQueueSection")
  );
}

// --- Marketplace ---
{
  const mp = readFileSync("src/components/MarketplaceView.tsx", "utf8");
  ok("marketplace ListingCoverImage", mp.includes("ListingCoverImage"));
  ok("marketplace aspect-video region", mp.includes("aspect-video"));
  ok("marketplace no seller queue panel", !mp.includes("SellerMaskedLeadQueuePanel"));
  ok("marketplace favorite button", mp.includes("toggleFavorite"));
}

// --- Dealer drafts + inventory thumbnails ---
{
  const drafts = readFileSync("src/components/dealer-portal/DealerDraftsPage.tsx", "utf8");
  const inv = readFileSync("src/components/dealer-portal/DealerInventoryPage.tsx", "utf8");
  ok("dealer draft thumbnail", drafts.includes("dealer-draft-card-cover-image"));
  ok("dealer draft edit still wired", drafts.includes("openEdit") && drafts.includes("DealerDraftImageSection"));
  ok("dealer inventory thumbnail", inv.includes("dealer-inventory-card-cover-image"));
}

// --- ChatCarCard: gallery before CTA ---
{
  const chat = readFileSync("src/components/chat/ChatCarCard.tsx", "utf8");
  ok("chat gallery component", chat.includes("ChatCarImageGallery"));
  ok("chat expand button", chat.includes("chat-car-card-expand-btn"));
  ok("chat actions footer", chat.includes("chat-car-card-actions"));
  ok(
    "gallery before seller callback in source",
    chat.indexOf("ChatCarImageGallery") < chat.indexOf("chat-car-card-seller-callback-btn")
  );
  ok(
    "callback before expand in footer",
    chat.indexOf("chat-car-card-seller-callback-btn") < chat.indexOf("chat-car-card-expand-btn")
  );
}

// --- Lead queue panel does not own listing cover ---
{
  const panel = readFileSync("src/components/leads/ListingLeadQueueSection.tsx", "utf8");
  const cover = readFileSync("src/components/listings/ListingCoverImage.tsx", "utf8");
  ok("queue section separate layout", panel.includes("listing-lead-queue-below-card"));
  ok("ListingCoverImage has onError fallback", cover.includes("onError") && cover.includes("LISTING_PLACEHOLDER_IMAGE"));
  ok("panel does not render ListingCoverImage", !panel.includes("ListingCoverImage"));
}

// --- Docs guardrail file ---
{
  const doc = readFileSync("docs/v5.6E.8-regression-guardrails-and-cache.md", "utf8");
  ok("doc has pre-deploy checklist", doc.includes("Pre-deploy regression checklist"));
  ok("doc documents cache headers", doc.includes("no-cache") && doc.includes("immutable"));
  ok("doc lists known visual drift", doc.includes("Known visual drift"));
}

console.log("\nDone v5.6E.8 regression guardrails & cache tests.");
if (process.exitCode) process.exit(process.exitCode);
