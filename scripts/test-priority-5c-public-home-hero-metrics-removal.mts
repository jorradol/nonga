/**
 * Priority 5C — Public Home Unsupported Hero Metrics Removal
 * Asserts HomeView hero no longer ships the unsupported metrics showcase claims.
 * Scoped to HomeView.tsx only — does not scan the full repo/bundle for "100%".
 *
 * Run: npx tsx scripts/test-priority-5c-public-home-hero-metrics-removal.mts
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const homeViewPath = path.join(root, "src/components/HomeView.tsx");
const homeView = fs.readFileSync(homeViewPath, "utf8");

const heroMatch = homeView.match(
  /id="home-landing-hero"[\s\S]*?<\/section>/
);
const heroBlock = heroMatch?.[0] ?? "";

console.log("--- Priority 5C HomeView hero metrics removed ---");

ok("home-landing-hero-block-found", Boolean(heroMatch), "");

ok(
  "no-Floating-Metrics-Showcase",
  !homeView.includes("Floating Metrics Showcase"),
  ""
);

ok("no-99.8%-claim", !heroBlock.includes("99.8%"), "");
ok(
  "no-ai-accuracy-label",
  !heroBlock.includes("ความแม่นยำ AI"),
  ""
);

ok(
  "no-under-3-sec-claim",
  !heroBlock.includes("< 3 วิ") && !heroBlock.includes("&lt; 3 วิ"),
  ""
);
ok(
  "no-3-sec-analysis-label",
  !heroBlock.includes("วิเคราะห์คำนวณและประมวลผล"),
  ""
);

ok("no-10000+-claim", !heroBlock.includes("10,000+"), "");
ok(
  "no-registered-cars-label",
  !heroBlock.includes("รถบ้านลงทะเบียนผ่านดีลเลอร์"),
  ""
);

ok(
  "no-100%-protection-claim",
  !heroBlock.includes(">100%</") &&
    !heroBlock.includes(">100%<") &&
    !/text-orange-500">100%<\/div>/.test(heroBlock),
  ""
);
ok(
  "no-protection-safe-trade-label",
  !heroBlock.includes("คุ้มครองและปลอดภัยการซื้อขาย"),
  ""
);

ok(
  "no-marketplace-15-replacement",
  !heroBlock.includes("15 published") &&
    !heroBlock.includes(">15<") &&
    !/text-orange-500">15<\/div>/.test(heroBlock),
  ""
);

ok(
  "no-metrics-grid-container",
  !heroBlock.includes("grid-cols-2 lg:grid-cols-4") &&
    !heroBlock.includes("bg-slate-500/[0.02]"),
  ""
);

console.log("\n--- Home hero shell preserved ---");
ok(
  "home-landing-root-preserved",
  homeView.includes('id="home-landing-root"') &&
    homeView.includes('data-testid="home-landing"'),
  ""
);
ok(
  "hero-headline-preserved",
  heroBlock.includes("คุยรถยนต์สับๆ กับ") && heroBlock.includes("น้องเอ"),
  ""
);
ok(
  "hero-cta-preserved",
  heroBlock.includes('data-testid="home-cta-start-chat"') &&
    heroBlock.includes("เริ่มคุยกับน้องเอ"),
  ""
);
ok(
  "hero-marketplace-cta-preserved",
  heroBlock.includes('data-testid="home-cta-marketplace"') &&
    heroBlock.includes("ไปที่ตลาดรถ"),
  ""
);
ok(
  "buy-sell-intent-cards-preserved",
  heroBlock.includes("ฉันต้องการซื้อรถ") &&
    heroBlock.includes("ฉันต้องการขายรถ / ฝากขายรถ"),
  ""
);
ok(
  "search-sub-cta-preserved",
  heroBlock.includes("หรือเปิดค้นหารถละเอียดระบุพิกัดเกรดอัจฉริยะ"),
  ""
);

console.log("\n--- Adjacent Home sections preserved (5B freeze) ---");
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

console.log("\nDone Priority 5C public home hero metrics removal tests.");
