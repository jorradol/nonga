/**
 * WP-NVB-04C — V.1 New-Car Rail Adapter into V.2 Sidebar
 * npm run test:wp-nvb-04c-new-car-rail  (or tsx scripts/test-wp-nvb-04c-new-car-rail.mts)
 */
import fs from "node:fs";
import path from "node:path";
import type { Car } from "../src/types.ts";
import {
  SIDEBAR_NEW_CARS_QUEUE_MAX,
  buildSidebarNewCarsQueue,
  isSidebarNewCarSaleReady,
  sortCarsByRecency,
} from "../src/utils/chatSidebarNewCarsQueue.ts";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail = ""): never {
  console.error(`FAIL: ${label}`, detail);
  process.exit(1);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function mustInclude(src: string, needle: string, label: string): void {
  if (!src.includes(needle)) fail(label, `missing: ${needle}`);
  pass(label);
}

function mustNotInclude(src: string, needle: string, label: string): void {
  if (src.includes(needle)) fail(label, `unexpected: ${needle}`);
  pass(label);
}

function sampleCar(overrides: Partial<Car> & Pick<Car, "id">): Car {
  return {
    title: "Test Car",
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 650000,
    type: "used",
    condition: "good",
    mileage: 45000,
    fuelType: "petrol",
    images: [`/storage/listings/${overrides.id}/01-a.webp`],
    description: "",
    ownerId: "owner-1",
    ownerName: "Owner",
    ownerPhone: "0811111111",
    isSold: false,
    listingStatus: "published",
    createdAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function main(): void {
  console.log("=== WP-NVB-04C New-Car Rail Adapter ===\n");

  const sidebar = read("src/components/chat-v2/ChatV2Sidebar.tsx");
  const shell = read("src/components/chat-v2/ChatV2Shell.tsx");
  const slider = read("src/components/chat/ChatSidebarNewCarsSlider.tsx");
  const queueSrc = read("src/utils/chatSidebarNewCarsQueue.ts");
  const presentation = read("src/components/chat-v2/adapters/useChatV2Presentation.ts");

  // 1–4. V.2 sidebar mounts rail; reuse slider/queue; expanded + collapsed
  mustInclude(sidebar, "ChatSidebarNewCarsSlider", "v2-sidebar-imports-slider");
  mustInclude(sidebar, "onRailDiscoverySelect", "v2-sidebar-rail-callback-prop");
  mustInclude(sidebar, "collapsed={false}", "v2-sidebar-expanded-rail");
  mustInclude(sidebar, "collapsed", "v2-sidebar-collapsed-rail");
  mustInclude(sidebar, "chat-v2-sidebar-rail", "v2-sidebar-rail-region");
  mustNotInclude(sidebar, "buildSidebarNewCarsQueue", "v2-sidebar-no-duplicate-queue");
  mustInclude(slider, "buildSidebarNewCarsQueue", "slider-reuses-queue-builder");
  mustInclude(slider, "useAppStore((s) => s.cars)", "slider-authoritative-cars-source");

  const newChatIdx = sidebar.indexOf('data-testid="chat-v2-new-chat"');
  const sliderIdx = sidebar.indexOf("<ChatSidebarNewCarsSlider");
  const listIdx = sidebar.indexOf('data-testid="chat-v2-session-list"');
  if (newChatIdx < 0 || sliderIdx < 0 || listIdx < 0 || !(newChatIdx < sliderIdx && sliderIdx < listIdx)) {
    fail("v2-layout-order-newchat-rail-sessions");
  }
  pass("v2-layout-order-newchat-rail-sessions");

  // 5. empty queue → rail hidden (component returns null)
  mustInclude(slider, "if (!current) return null", "empty-queue-rail-hidden");

  // 6–12. ready-to-sell gate
  const ready = sampleCar({ id: "ready-1" });
  if (!isSidebarNewCarSaleReady(ready)) fail("sale-ready-published");
  pass("sale-ready-published");

  if (isSidebarNewCarSaleReady(sampleCar({ id: "sold-flag", isSold: true }))) {
    fail("reject-isSold");
  }
  pass("reject-isSold");

  if (isSidebarNewCarSaleReady(sampleCar({ id: "hidden", listingStatus: "hidden" }))) {
    fail("reject-hidden");
  }
  pass("reject-hidden");

  if (
    isSidebarNewCarSaleReady(
      sampleCar({ id: "pending-review", listingStatus: "pending_review" })
    )
  ) {
    fail("reject-pending_review");
  }
  pass("reject-pending_review");

  if (
    isSidebarNewCarSaleReady(
      sampleCar({ id: "pending-sale", saleStatus: "pending_sale" })
    )
  ) {
    fail("reject-pending_sale");
  }
  pass("reject-pending_sale");

  if (
    isSidebarNewCarSaleReady(sampleCar({ id: "sale-sold", saleStatus: "sold" }))
  ) {
    fail("reject-saleStatus-sold");
  }
  pass("reject-saleStatus-sold");

  if (
    isSidebarNewCarSaleReady(
      sampleCar({ id: "unknown-status", listingStatus: "withdrawn" as Car["listingStatus"] })
    )
  ) {
    fail("reject-unknown-listingStatus-fail-closed");
  }
  pass("reject-unknown-listingStatus-fail-closed");

  if (isSidebarNewCarSaleReady(sampleCar({ id: "no-image", images: [] }))) {
    fail("reject-missing-image");
  }
  pass("reject-missing-image");

  // 13. duplicate listing ID
  const dupes = buildSidebarNewCarsQueue([
    sampleCar({ id: "dup", createdAt: "2026-06-02T00:00:00.000Z" }),
    sampleCar({ id: "dup", createdAt: "2026-06-01T00:00:00.000Z" }),
  ]);
  if (dupes.length !== 1) fail("dedupe-listing-id", String(dupes.length));
  pass("dedupe-listing-id");

  // 14. ordering by createdAt recency
  const ordered = sortCarsByRecency([
    sampleCar({ id: "older", createdAt: "2026-01-01T00:00:00.000Z" }),
    sampleCar({ id: "newer", createdAt: "2026-06-01T00:00:00.000Z" }),
  ]);
  if (ordered[0]?.id !== "newer") fail("recency-order", ordered[0]?.id);
  pass("recency-order");

  const queue = buildSidebarNewCarsQueue([
    sampleCar({ id: "q1", createdAt: "2026-06-03T00:00:00.000Z" }),
    sampleCar({ id: "q2", createdAt: "2026-06-02T00:00:00.000Z" }),
    sampleCar({ id: "q3", isSold: true, createdAt: "2026-06-04T00:00:00.000Z" }),
  ]);
  if (queue[0]?.id !== "q1" || queue.length !== 2) {
    fail("queue-filters-and-orders", JSON.stringify(queue.map((s) => s.id)));
  }
  pass("queue-filters-and-orders");

  // 15–16. rail isolated from room search
  mustInclude(presentation, "railDiscoveryVehicle", "presentation-rail-state");
  mustInclude(presentation, "deriveDiscoveredVehicles(currentMessages)", "search-from-messages-only");
  mustNotInclude(slider, "deriveDiscoveredVehicles", "slider-not-from-search-messages");
  mustNotInclude(slider, "carCards", "slider-not-from-carCards");
  mustInclude(presentation, "setRailDiscoveryVehicle(null)", "rail-clears-on-session-or-search");

  // 17–20. click → V.2 selection/workspace; no message/V.3/search
  mustInclude(slider, "onDiscoverySelect", "slider-discovery-callback-prop");
  mustInclude(slider, "if (onDiscoverySelect)", "slider-branches-discovery-path");
  mustNotInclude(
    slider.slice(slider.indexOf("if (onDiscoverySelect)"), slider.indexOf("return;", slider.indexOf("if (onDiscoverySelect)")) + 200),
    "addMessage",
    "discovery-path-no-addMessage"
  );
  mustNotInclude(
    slider.slice(slider.indexOf("if (onDiscoverySelect)"), slider.indexOf("return;", slider.indexOf("if (onDiscoverySelect)")) + 200),
    "saveChatCarContext",
    "discovery-path-no-saveChatCarContext"
  );
  mustInclude(shell, "openRailDiscoveryVehicle", "shell-wires-openRailDiscoveryVehicle");
  mustInclude(presentation, "openRailDiscoveryVehicle", "presentation-openRailDiscoveryVehicle");
  mustInclude(presentation, "bumpSelectionRevision", "rail-selection-bump");
  mustInclude(presentation, "setIsCollapsed(false)", "rail-opens-workspace-column");
  mustInclude(presentation, "setIsSheetOpen(true)", "rail-opens-mobile-sheet");
  mustNotInclude(
    presentation.slice(presentation.indexOf("openRailDiscoveryVehicle")),
    "addMessage",
    "presentation-rail-no-addMessage"
  );
  mustNotInclude(
    presentation.slice(presentation.indexOf("openRailDiscoveryVehicle")),
    "chatV3",
    "presentation-rail-no-v3"
  );
  mustNotInclude(
    presentation.slice(presentation.indexOf("openRailDiscoveryVehicle")),
    "chatSearch",
    "presentation-rail-no-search"
  );

  // 21. classic V.1 path preserved
  mustInclude(slider, "await addMessage(sessionId, \"ai\", sidebarCarIntroLine(car)", "classic-v1-addMessage-preserved");
  mustInclude(slider, "saveChatCarContext", "classic-v1-saveChatCarContext-preserved");

  // 22. timer cleanup + index clamp
  mustInclude(slider, "return clearTimer", "timer-cleanup-on-unmount");
  mustInclude(slider, "index % slideCount", "index-clamped-modulo");
  mustInclude(slider, "setIndex(0)", "index-reset-on-slideCount-change");

  // 23. accessibility
  mustInclude(slider, 'id="sidebar-new-cars-slider"', "expanded-slider-id");
  mustInclude(slider, 'id="sidebar-new-cars-collapsed"', "collapsed-slider-id");
  mustInclude(slider, "aria-label", "slider-aria-labels");

  // 24. no hardcoded demo listings
  mustNotInclude(queueSrc, "demo-listing", "queue-no-demo-listings");
  mustNotInclude(slider, "demo-listing", "slider-no-demo-listings");
  mustNotInclude(sidebar, "demo-listing", "sidebar-no-demo-listings");

  // 25. no secrets/PII/UID logging in changed sources
  for (const [rel, src] of [
    ["queue", queueSrc],
    ["slider", slider],
    ["sidebar", sidebar],
    ["shell", shell],
    ["presentation", presentation],
  ] as const) {
    if (/console\.(log|info|debug|warn|error)\([^)]*ownerId/.test(src)) {
      fail(`${rel}-no-ownerId-logging`);
    }
    if (/console\.(log|info|debug|warn|error)\([^)]*ownerPhone/.test(src)) {
      fail(`${rel}-no-ownerPhone-logging`);
    }
  }
  pass("no-pii-logging-in-changed-sources");

  // Authoritative source evidence
  mustInclude(queueSrc, "useAppStore.cars", "queue-doc-authoritative-source");
  mustInclude(shell, "fetchCars", "shell-bootstrap-fetchCars");
  mustInclude(queueSrc, "isSidebarNewCarSaleReady", "queue-sale-ready-gate");
  mustInclude(queueSrc, "listingStatus", "queue-listingStatus-field");
  mustInclude(queueSrc, "saleStatus", "queue-saleStatus-field");
  mustInclude(queueSrc, "resolveChatListingImageUrls", "queue-real-image-policy");

  if (SIDEBAR_NEW_CARS_QUEUE_MAX !== 10) {
    fail("queue-max-constant", String(SIDEBAR_NEW_CARS_QUEUE_MAX));
  }
  pass("queue-max-constant");

  console.log(`\n=== WP-NVB-04C — OK (${passCount} assertions) ===`);
}

main();
