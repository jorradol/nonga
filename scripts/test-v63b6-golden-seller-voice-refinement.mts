/**
 * v6.3B.6 — Golden Seller Voice Refinement
 * npm run test:v63b6-golden-seller-voice-refinement
 */
import { readFileSync } from "node:fs";
import {
  buildBuyerFriendlyListingCopy,
  buildCompactInChatSalesWeave,
  BUYER_FRIENDLY_SAFETY_DISCLAIMER,
  containsGoldenSellerHook,
  GOLDEN_SELLER_HOOK_MARKERS,
  passesOutputGuard,
  sanitizeListingCopyText,
  softenOmitOverclaims,
  STEERING_WHEEL_MULTIFUNCTION_DISPLAY,
  containsForbiddenSteeringGarble,
} from "../src/utils/buyerFriendlyListingCopy.ts";
import {
  buildInChatCuratedAnalysis,
  buildInChatCuratedSpeakableText,
  assertInChatCuratedSafe,
} from "../src/services/ai/chat/buildInChatCuratedAnalysis.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
  type ChatInventoryCar,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";

const DOC_PATH = "docs/v6.3B.6-golden-seller-voice-refinement.md";
const MODULE_PATH = "src/utils/buyerFriendlyListingCopy.ts";

const SYNTHETIC_BRAND = "ยี่ห้อตัวอย่าง";
const SYNTHETIC_MODEL = "รุ่นตัวอย่าง";

const JARGON_SAMPLE =
  "AB2 + บ.หนัง + พวงมาลัยมัลติฟังก์ชั่น + Cruise Control + Engine Start + Smart Keyless + จอทัชสกรีน + Bluetooth + วิทยุ FM/AM + AM + CD + USB + กล้องถอย /k controlled pilot source package";

const richInv: ChatInventoryCar = {
  id: "car-synthetic-golden-voice",
  title: "BrandX ModelY",
  brand: SYNTHETIC_BRAND,
  model: SYNTHETIC_MODEL,
  year: 2021,
  price: 890_000,
  mileage: 48_000,
  color: "เทา",
  type: "used",
  fuelType: "hybrid",
  bodyType: "suv",
  images: ["/storage/listings/sample/01.webp"],
  isSold: false,
  listingStatus: "published",
  transmission: "AT",
  description: JARGON_SAMPLE,
};

const richCard = summaryToChatCarCardData(toChatCarSummary(richInv), "exact");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function firstParagraph(text: string): string {
  return text.split(/\n\n+/)[0]?.trim() ?? "";
}

console.log("=== v6.3B.6 Golden Seller Voice Refinement ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const moduleSrc = readFileSync(MODULE_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc ---
{
  ok("doc exists", doc.length > 2000);
  ok("doc v6.3B.6 label", doc.includes("v6.3B.6"));
  ok("doc no deploy", /no deploy|NO-GO.*deploy/i.test(doc));
  ok("doc golden seller", /golden seller|Golden Seller/i.test(doc));
  ok("doc before after", /Before.*After|before.*after/i.test(doc));
  ok("doc deterministic", /deterministic|template/i.test(doc));
}

// --- module guards ---
{
  ok("module no fetch", !/fetch\s*\(/.test(moduleSrc));
  ok("module no gemini", !/generateContent|gemini/i.test(moduleSrc));
  ok("module golden voice layer", /buildGoldenSellerDetailParagraphs|composeGoldenInChatWeave/.test(moduleSrc));
  ok("module stable hash", /pickStableVariant|buildStableSeed/.test(moduleSrc));
  ok("module hype guard", /HYPE_FORBIDDEN_PATTERNS/.test(moduleSrc));
  ok("module hook markers export", moduleSrc.includes("GOLDEN_SELLER_HOOK_MARKERS"));
}

// --- detail golden voice ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2021,
    fuelType: "hybrid",
    bodyType: "SUV",
    description: JARGON_SAMPLE,
    province: "ขฐ",
    price: 890000,
    mileage: 48000,
  });
  const lead = firstParagraph(result.text);
  ok("GS-D01 guard pass", result.guardPass);
  ok("GS-D02 golden hook in lead", containsGoldenSellerHook(lead));
  ok("GS-D03 lead not from listing report", !/^จากข้อมูลประกาศ/.test(lead));
  ok("GS-D04 no category header", !/จุดเด่นด้านความสะดวกในการขับ/.test(result.text));
  ok("GS-D05 soft benefit language", /สะดวก|พอสมควร|น่าดู/i.test(result.text));
  ok("GS-D06 facts line at end", /จากข้อมูลประกาศ.*ไมล์|จากข้อมูลประกาศ.*ราคา/.test(result.text));
  ok("GS-D07 single disclaimer", (result.text.match(/ข้อมูลนี้เป็นการเรียบเรียง/g) ?? []).length === 1);
  ok("GS-D08 no AB2", !/\bAB2\b/i.test(result.text));
  ok("GS-D09 no hype", !/รีบจัด|ห้ามพลาด|จบแน่นอน/i.test(result.text));
  ok("GS-D10 steering safe", !containsForbiddenSteeringGarble(result.text));
  ok("GS-D11 deterministic", buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2021,
    fuelType: "hybrid",
    bodyType: "SUV",
    description: JARGON_SAMPLE,
    price: 890000,
    mileage: 48000,
  }).text === result.text);
}

// --- in-chat golden weave ---
{
  const weave = buildCompactInChatSalesWeave({
    description: JARGON_SAMPLE,
    fuelType: "hybrid",
    bodyClassLabel: "SUV",
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2021,
  });
  ok("GS-C01 weave non-empty", weave.text.length > 0);
  ok("GS-C02 weave guard pass", weave.guardPass);
  ok("GS-C03 golden hook", containsGoldenSellerHook(weave.text));
  ok("GS-C04 length cap", weave.text.length <= 220, String(weave.text.length));
  ok("GS-C05 soft close or benefit", /สะดวก|น่าดู|เหมาะกับ/i.test(weave.text));
  ok("GS-C06 has specs", /เบาะหนัง|Cruise Control/i.test(weave.text));
  ok("GS-C07 no old report lead", !/^เป็น SUV.*ขับสบายขึ้น เช่น/.test(weave.text));
  ok("GS-C08 deterministic weave", buildCompactInChatSalesWeave({
    description: JARGON_SAMPLE,
    fuelType: "hybrid",
    bodyClassLabel: "SUV",
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2021,
  }).text === weave.text);
}

// --- hype / overclaim strip ---
{
  const hypeInput = `${JARGON_SAMPLE} รีบจัดเลย ห้ามพลาด ดีที่สุด สภาพสวยจัด`;
  const cleaned = sanitizeListingCopyText(hypeInput);
  const softened = softenOmitOverclaims(cleaned);
  ok("GS-H01 hype stripped from input", !/รีบจัด|ห้ามพลาด|ดีที่สุด|สภาพสวยจัด/i.test(softened.text));
  const weave = buildCompactInChatSalesWeave({
    description: hypeInput,
    fuelType: "hybrid",
    bodyClassLabel: "SUV",
  });
  ok("GS-H02 hype not in weave output", !/รีบจัด|ห้ามพลาด|ดีที่สุด/i.test(weave.text));
  ok("GS-H03 weave output guard", passesOutputGuard(weave.text).pass);
}

// --- TTS path ---
{
  const analysis = buildInChatCuratedAnalysis(richCard);
  const speakable = buildInChatCuratedSpeakableText(analysis);
  ok("GS-T01 speakable includes weave", Boolean(analysis.featureWeave && speakable.includes(analysis.featureWeave)));
  ok("GS-T02 golden hook in speakable", containsGoldenSellerHook(speakable));
  assertInChatCuratedSafe(speakable);
  ok("GS-T03 assert safe speakable", true);
}

// --- hook markers ---
{
  ok("GS-V01 hook markers defined", GOLDEN_SELLER_HOOK_MARKERS.length >= 3);
}

// --- package ---
{
  ok("package v63b6 script", pkg.includes("test:v63b6-golden-seller-voice-refinement"));
}

console.log("\n--- synthetic after (detail lead) ---");
const detailSample = buildBuyerFriendlyListingCopy({
  brand: SYNTHETIC_BRAND,
  model: SYNTHETIC_MODEL,
  year: 2021,
  fuelType: "hybrid",
  bodyType: "SUV",
  description: JARGON_SAMPLE,
  price: 890000,
  mileage: 48000,
});
console.log(firstParagraph(detailSample.text));

console.log("\n--- synthetic after (in-chat weave) ---");
console.log(
  buildCompactInChatSalesWeave({
    description: JARGON_SAMPLE,
    fuelType: "hybrid",
    bodyClassLabel: "SUV",
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2021,
  }).text
);

console.log("\nDone v6.3B.6 Golden Seller Voice Refinement tests.");
if (process.exitCode) process.exit(process.exitCode);
