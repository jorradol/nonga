/**
 * v5.6H — closed_won → pending_sale listing + marketplace filters
 * npm run test:v56h-deal-outcome-pending-sale
 */
import { readFileSync } from "node:fs";
import { resetBuyerLeadRepositoryForTests } from "../src/server/repositories/buyerLeadRepository.ts";
import {
  addMarketplaceCar,
  getMarketplaceCarById,
  getOwnerMarketplaceCars,
  getPublishedMarketplaceCars,
  isVisibleOnMarketplace,
  persistMarketplaceInventory,
  type MarketplaceCarRecord,
} from "../src/server/marketplaceInventory.ts";
import { createConsentedBuyerLead } from "../src/services/leads/buyerLeadService.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  sellerRecordQueueOutcome,
  sellerRevealQueueLead,
} from "../src/services/leads/buyerLeadQueueService.ts";
import { applyClosedWonPendingSaleForListing } from "../src/services/leads/listingSaleOutcome.ts";
import {
  searchMarketplaceForChat,
  type ChatInventoryCar,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { createInventoryRepository } from "../src/server/repositories/inventoryRepository.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const ownerId = "seller-h-1";
const listingId = "car-h-pending-sale";

function seedListing(): MarketplaceCarRecord {
  persistMarketplaceInventory([]);
  return addMarketplaceCar({
    id: listingId,
    title: "Honda City 2020",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 420000,
    type: "used",
    condition: "used",
    mileage: 50000,
    fuelType: "petrol",
    images: [],
    description: "test",
    ownerId,
    ownerName: "Seller H",
    ownerPhone: "0810000000",
    isSold: false,
    listingStatus: "published",
    createdAt: new Date().toISOString(),
  });
}

resetBuyerLeadRepositoryForTests();
const { createBuyerLeadRepository } = await import(
  "../src/server/repositories/buyerLeadRepository.ts"
);
const leadRepo = createBuyerLeadRepository();
const inventoryRepo = createInventoryRepository();

const listing = seedListing();
ok("listing seeded published", listing.listingStatus === "published");

const leadResult = await createConsentedBuyerLead({
  input: {
    listingId,
    displayName: "Buyer H",
    contactPhone: "0811111111",
    purchaseMethod: "cash",
    preferredContactWindow: "เช้า",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
  },
  buyerUserId: "buyer-h-1",
  listing: { id: listingId, title: listing.title, price: listing.price, ownerId },
  repository: leadRepo,
});
ok("lead created", leadResult.ok === true);
const leadId = leadResult.ok ? leadResult.lead.id : "";

const revealed = await sellerRevealQueueLead({
  repository: leadRepo,
  listingId,
  sellerId: ownerId,
  leadId,
  actorUserId: ownerId,
});
ok("reveal ok", revealed.ok === true);

// --- closed_won applies pending_sale ---
{
  const out = await sellerRecordQueueOutcome({
    repository: leadRepo,
    listingId,
    sellerId: ownerId,
    leadId,
    outcome: "closed_won",
    actorUserId: ownerId,
  });
  ok("closed_won outcome", out.ok === true);
  if (out.ok) {
    ok("lead closed_won", out.lead.status === "closed_won");
  }

  const pending = await applyClosedWonPendingSaleForListing({
    inventoryRepository: inventoryRepo,
    buyerLeadRepository: leadRepo,
    listingId,
    sellerId: ownerId,
  });
  ok("pending sale apply", pending.ok === true);
  if (pending.ok) {
    ok("listing saleStatus pending_sale", pending.listing.saleStatus === "pending_sale");
    ok("listing hidden", pending.listing.listingStatus === "hidden");
    ok("not isSold", pending.listing.isSold === false);
    ok("pendingSaleAt set", Boolean(pending.listing.pendingSaleAt));
    ok("queue supersede >= 0", pending.supersededCount >= 0);
  }
}

// --- marketplace excludes pending_sale ---
{
  const car = getMarketplaceCarById(listingId);
  ok("car loaded", Boolean(car));
  if (car) {
    ok("not visible on marketplace", !isVisibleOnMarketplace(car));
    ok("not in published list", !getPublishedMarketplaceCars().some((c) => c.id === listingId));
    ok("owner still sees", getOwnerMarketplaceCars(ownerId).some((c) => c.id === listingId));
  }
}

// --- chat search excludes ---
{
  const car = getMarketplaceCarById(listingId)!;
  const chatCars: ChatInventoryCar[] = [
    {
      id: car.id,
      title: car.title,
      brand: car.brand,
      model: car.model,
      year: car.year,
      price: car.price,
      saleStatus: car.saleStatus,
      listingStatus: car.listingStatus,
    },
    {
      id: "other",
      title: "Other",
      brand: "Toyota",
      model: "Yaris",
      year: 2019,
      price: 300000,
      listingStatus: "published",
    },
  ];
  const search = searchMarketplaceForChat(chatCars, { limit: 10 });
  const ids = [...search.primary, ...search.alternatives].map((c) => c.id);
  ok("chat search excludes pending_sale", !ids.includes(listingId));
  ok("chat search keeps published", ids.includes("other"));
}

// --- no_progress does not hide listing ---
{
  persistMarketplaceInventory([]);
  const listing2 = addMarketplaceCar({
    ...listing,
    id: "car-h-no-hide",
    listingStatus: "published",
    saleStatus: undefined,
    pendingSaleAt: undefined,
  });
  resetBuyerLeadRepositoryForTests();
  const repo2 = createBuyerLeadRepository();
  const r = await createConsentedBuyerLead({
    input: {
      listingId: listing2.id,
      displayName: "B2",
      contactPhone: "0822222222",
      purchaseMethod: "cash",
      preferredContactWindow: "x",
      consentConfirmed: true,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    },
    buyerUserId: "buyer-h-2",
    listing: { id: listing2.id, title: listing2.title, price: listing2.price, ownerId },
    repository: repo2,
  });
  ok("lead2", r.ok === true);
  if (r.ok) {
    await sellerRevealQueueLead({
      repository: repo2,
      listingId: listing2.id,
      sellerId: ownerId,
      leadId: r.lead.id,
      actorUserId: ownerId,
    });
    await sellerRecordQueueOutcome({
      repository: repo2,
      listingId: listing2.id,
      sellerId: ownerId,
      leadId: r.lead.id,
      outcome: "no_progress",
      actorUserId: ownerId,
    });
    const c2 = getMarketplaceCarById(listing2.id);
    ok("no_progress keeps published visible", c2 ? isVisibleOnMarketplace(c2) : false);
  }
}

// --- UI / route guards ---
{
  const panel = readFileSync("src/components/MyListingsView.tsx", "utf8");
  const routes = readFileSync("src/server/buyerLeadQueueRoutes.ts", "utf8");
  const buyerModal = readFileSync("src/components/chat/BuyerLeadConsentModalHost.tsx", "utf8");
  ok("my listings pending badge", panel.includes("my-listings-pending-sale-badge"));
  ok("outcome route applies pending sale", routes.includes("applyClosedWonPendingSaleForListing"));
  ok("buyer modal untouched", buyerModal.includes("submitBuyerLeadConsent"));
  ok("no payment in outcome route", !routes.includes("successFee"));
}

console.log("\nDone v5.6H deal outcome pending sale tests.");
if (process.exitCode) process.exit(process.exitCode);
