/**
 * v5.4.5-lite — Sidebar New Cars Visual Slider (queue + layout helpers)
 * npm run test:v545-sidebar-new-cars-slider
 */
import fs from "node:fs";
import path from "node:path";
import type { Car } from "../src/types.ts";
import {
  SIDEBAR_NEW_CARS_QUEUE_MAX,
  SIDEBAR_NEW_CARS_ROTATE_MS,
  buildSidebarCarCardFromCar,
  buildSidebarNewCarsQueue,
  isPublishedCarWithRealImage,
  sidebarCarIntroLine,
  sortCarsByRecency,
} from "../src/utils/chatSidebarNewCarsQueue.ts";

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail = ""): never {
  console.error(`FAIL: ${label}`, detail);
  process.exit(1);
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
  console.log("=== Nong A v5.4.5-lite Sidebar New Cars Slider ===\n");

  if (SIDEBAR_NEW_CARS_ROTATE_MS !== 17_000) {
    fail("rotate-interval", String(SIDEBAR_NEW_CARS_ROTATE_MS));
  }
  pass("rotate-interval-17s");

  const withImage = sampleCar({ id: "car-a" });
  const noImage = sampleCar({ id: "car-b", images: [] });
  const hidden = sampleCar({ id: "car-c", listingStatus: "hidden" });

  if (!isPublishedCarWithRealImage(withImage)) fail("has-real-image");
  if (isPublishedCarWithRealImage(noImage)) fail("reject-no-image");
  if (isPublishedCarWithRealImage(hidden)) fail("reject-hidden");
  pass("image-filter");

  const sorted = sortCarsByRecency([
    sampleCar({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" }),
    sampleCar({ id: "new", createdAt: "2026-06-01T00:00:00.000Z" }),
  ]);
  if (sorted[0]?.id !== "new") fail("sort-by-createdAt", sorted[0]?.id);
  pass("sort-by-createdAt");

  const many = Array.from({ length: 15 }, (_, i) =>
    sampleCar({
      id: `car-q-${i}`,
      createdAt: `2026-05-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    })
  );
  const queue = buildSidebarNewCarsQueue(many);
  if (queue.length !== SIDEBAR_NEW_CARS_QUEUE_MAX) {
    fail("queue-max-10", String(queue.length));
  }
  pass("queue-max-10");

  const emptyQueue = buildSidebarNewCarsQueue([noImage, hidden]);
  if (emptyQueue.length !== 0) fail("empty-queue", String(emptyQueue.length));
  pass("empty-queue-no-crash");

  const intro = sidebarCarIntroLine({ brand: "Honda", model: "CR-V", year: 2019 });
  if (intro.length > 120 || intro.includes("ถามน้องเอ")) {
    fail("intro-short-no-ask-ai", intro);
  }
  pass("intro-short-no-ask-ai");

  const card = buildSidebarCarCardFromCar(withImage);
  if (!card.hasImage || !card.imageUrl?.includes(withImage.id)) {
    fail("card-mapper", JSON.stringify(card));
  }
  if (!card.detailPath.startsWith("/cars/")) fail("card-detail-path");
  pass("card-mapper-from-car");

  const sidebarSrc = fs.readFileSync(
    path.join(process.cwd(), "src/components/chat/ChatSidebar.tsx"),
    "utf8"
  );
  if (!sidebarSrc.includes("ChatSidebarNewCarsSlider")) {
    fail("sidebar-imports-slider");
  }
  if (!sidebarSrc.includes('id="sidebar-list"')) {
    fail("sidebar-list-preserved");
  }
  if (!sidebarSrc.includes("ChatSidebarAccount")) {
    fail("sidebar-account-footer-preserved");
  }
  const actionIdx = sidebarSrc.indexOf('id="sidebar-action"');
  const sliderIdx = sidebarSrc.indexOf("<ChatSidebarNewCarsSlider");
  const listIdx = sidebarSrc.indexOf('id="sidebar-list"');
  if (actionIdx < 0 || sliderIdx < 0 || listIdx < 0 || !(actionIdx < sliderIdx && sliderIdx < listIdx)) {
    fail("layout-order-action-slider-list");
  }
  pass("sidebar-layout-order");

  const sliderSrc = fs.readFileSync(
    path.join(process.cwd(), "src/components/chat/ChatSidebarNewCarsSlider.tsx"),
    "utf8"
  );
  if (!sliderSrc.includes("รถเข้าใหม่")) fail("slider-title");
  if (sliderSrc.includes("กี่คัน") || sliderSrc.includes("queue.length")) {
    fail("slider-no-queue-count-copy");
  }
  if (!sliderSrc.includes("addMessage")) fail("click-appends-chat");
  if (sliderSrc.includes("setView") || sliderSrc.includes("car-details")) {
    fail("click-no-setView");
  }
  if (!sliderSrc.includes("sidebar-new-cars-collapsed")) {
    fail("collapsed-mode");
  }
  pass("slider-component-contract");

  console.log("\n=== v5.4.5-lite sidebar new cars slider — OK ===");
}

main();
