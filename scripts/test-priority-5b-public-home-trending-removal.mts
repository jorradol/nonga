/**
 * Priority 5B — Public Home Trending Mock Showcase Removal
 * Asserts HomeView no longer ships the hard-coded weekly trending mock gallery.
 *
 * Run: npx tsx scripts/test-priority-5b-public-home-trending-removal.mts
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const homeView = fs.readFileSync(
  path.join(root, "src/components/HomeView.tsx"),
  "utf8"
);

console.log("--- Priority 5B trending mock gallery removed ---");

ok(
  "no-TRENDING_CARS_SHOWCASE",
  !homeView.includes("TRENDING_CARS_SHOWCASE"),
  ""
);
ok(
  "no-weekly-trending-title",
  !homeView.includes("รถยนต์ยอดฮิตติดชาร์ตของสัปดาห์"),
  ""
);
ok("no-HOT-LISTING-badge", !homeView.includes("HOT LISTING"), "");
ok("no-เจาะลึกพับลิค", !homeView.includes("เจาะลึกพับลิค"), "");

ok(
  "no-mock-tesla-id",
  !homeView.includes("tesla-model-3-2023"),
  ""
);
ok(
  "no-mock-porsche-id",
  !homeView.includes("porsche-taycan-4s-2022"),
  ""
);
ok(
  "no-mock-civic-id",
  !homeView.includes("honda-civic-fe-2022"),
  ""
);

ok(
  "no-mock-tesla-title",
  !homeView.includes("Tesla Model 3 Long Range AWD"),
  ""
);
ok(
  "no-mock-porsche-title",
  !homeView.includes("Porsche Taycan 4S Sports Performance"),
  ""
);
ok(
  "no-mock-civic-title",
  !homeView.includes("Honda Civic FE 1.5 Turbo EL+"),
  ""
);

ok(
  "no-trending-mock-chat-handoff",
  !homeView.includes("รถยนต์คันยอดฮิต") &&
    !homeView.includes("นัดคุยเรื่อง ${car.brand}"),
  ""
);

ok(
  "no-exclusive-gallery-badge",
  !homeView.includes("NONG A EXCLUSIVE GALLERY"),
  ""
);

console.log("\n--- Home shell preserved ---");
ok(
  "home-landing-root-preserved",
  homeView.includes('id="home-landing-root"') &&
    homeView.includes('data-testid="home-landing"'),
  ""
);
ok(
  "hero-cta-preserved",
  homeView.includes('data-testid="home-cta-start-chat"') &&
    homeView.includes("เริ่มคุยกับน้องเอ"),
  ""
);
ok(
  "feature-cards-section-preserved",
  homeView.includes("NONG A POWERFUL UTILITIES") &&
    homeView.includes("1-Click AI Easy Posting"),
  ""
);
ok(
  "mission-banner-preserved",
  homeView.includes("ยกระดับการซื้อขายรถยนต์คู่ AI"),
  ""
);

console.log("\nDone Priority 5B public home trending removal tests.");
