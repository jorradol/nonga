/**
 * Nong A v5.4.5-beta.5 / 5b — Seller Copy & Share Pack
 * npm run test:v545-seller-copy-share-pack
 */
import fs from "node:fs";
import path from "node:path";
import {
  assertSellerShareCopySafe,
  buildSellerShareInputFromPublishedCard,
  countPangPuriyeInText,
  generateSellerFullPost,
  generateSellerShareCopy,
  generateSellerShortPost,
  generateSellerSpecsText,
  inferSellerShareStyle,
  PUBLIC_NONGA_BASE_URL,
  sanitizeSellerShareText,
  shareCopySeed,
} from "../src/services/chat/sellerShareCopy.ts";
import { buildPublicListingDetailUrl } from "../src/utils/publicNongaUrl.ts";

const FIREBASE_HOSTING_URL = "https://nonga-ce93c.web.app";

const HALLUCINATION_PHRASES =
  /มือเดียว|ไม่เคยชน|เข้าศูนย์ตลอด|ฟรีดาวน์|ไฟแนนซ์ผ่านง่าย|สภาพนางฟ้า/i;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Nong A v5.4.5-beta.5b Seller Copy & Share Pack ===");

const sampleInput = {
  brand: "Toyota",
  model: "Camry",
  year: 2018,
  price: 888000,
  mileage: 88800,
  transmission: "ออโต้",
  color: "ขาว",
  fuelType: "petrol",
  marketingCopy:
    "ภาพลักษณ์เรียบหรู ใช้งานได้ทั้งในเมืองและเดินทางไกล เหมาะกับคนที่อยากได้รถซีดานขับสบาย",
  description: "ยางและแบตเปลี่ยนแล้ว",
  listingId: "car-toyota-camry-pilot",
  detailPath: "/cars/car-toyota-camry-pilot",
};

const full = generateSellerFullPost(sampleInput);
ok("generate full sales post", full.includes("Toyota") && full.includes("888,000"));
ok("full post has headline section feel", /^🚗|—|ปล่อย|มองหา|รถบ้าน/m.test(full.split("\n")[0] ?? ""));
ok("full post has spec section", full.includes("รายละเอียดเบื้องต้น:"));
ok("full post has highlights section", full.includes("จุดที่น่าสนใจ:"));
ok("full post not generic one-liner", full.length > 380);
ok("full post has multiple paragraphs", full.split("\n\n").length >= 4);
ok("full post has disclaimer", full.includes("ตรวจสอบ"));
ok("full post max one pang puriye", countPangPuriyeInText(full) <= 1);
ok(
  "full post uses public domain",
  full.includes(PUBLIC_NONGA_BASE_URL) &&
    full.includes(buildPublicListingDetailUrl(sampleInput.listingId))
);
ok("full post has no firebase hosting url", !full.includes(FIREBASE_HOSTING_URL));
ok("full post no unverified claims", !HALLUCINATION_PHRASES.test(full));

const short = generateSellerShortPost(sampleInput);
ok("generate short post", short.includes("Camry") && short.includes("888,000"));
ok("short post is shorter than full", short.length < full.length);
ok("short post has caption lines", short.includes("🚗") && short.includes("ดูประกาศบน Nong A:"));
ok("short post max one pang puriye", countPangPuriyeInText(short) <= 1);
ok("short post no unverified claims", !HALLUCINATION_PHRASES.test(short));

const specs = generateSellerSpecsText(sampleInput);
ok("generate specs text", specs.includes("สเปกรถเบื้องต้น"));
ok("specs has brand line", specs.includes("• ยี่ห้อ: Toyota"));
ok("specs has mileage", specs.includes("88,800"));
ok("specs has listing link", specs.includes("ลิงก์ประกาศ:") && specs.includes(PUBLIC_NONGA_BASE_URL));
ok("specs has no pang puriye", countPangPuriyeInText(specs) === 0);

const luckForbidden =
  /ซื้อแล้วรวย|รวยแน่นอน|รับประกันเฮง|โชคลาภแน่นอน|รับประกันโชค/i;

for (const text of [full, short, specs]) {
  ok(`no ownerPhone in copy`, !/ownerPhone|0812345678|contactPhone/i.test(text));
  ok(`no forbidden sales phrase`, !/ค่าคอม|รับประกันขาย|รับประกันสภาพรถ|ขายได้แน่นอน/i.test(text));
  ok(`no luck guarantee phrase`, !luckForbidden.test(text));
  ok(`no firebase hosting url in output`, !text.includes(FIREBASE_HOSTING_URL));
  try {
    assertSellerShareCopySafe(text, {
      allowPangPuriye: text === specs ? false : true,
      maxPangPuriye: text === specs ? 0 : 1,
    });
    ok(`assertSellerShareCopySafe passes`, true);
  } catch (e) {
    ok(`assertSellerShareCopySafe passes`, false, String(e));
  }
}

const dirtyMarketing = sanitizeSellerShareText(
  "รถดี โทร 081-234-5678 รับประกันขายแน่นอน ค่าคอมถูก ซื้อแล้วรวยแน่นอน มือเดียว ไม่เคยชน"
);
ok(
  "sanitize strips phone forbidden and unverified",
  !/081|รับประกันขาย|ค่าคอม|ซื้อแล้วรวย|มือเดียว|ไม่เคยชน/.test(dirtyMarketing)
);

const cardInput = buildSellerShareInputFromPublishedCard({
  listingId: "car-x",
  publicRefCode: "ref-1",
  statusLabel: "ลงตลาดแล้ว",
  marketingCopy: "ทดสอบ",
  fields: {
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 450000,
    mileage: 50000,
    phone: "0899998888",
    ownerPhone: "0811112222",
  },
  imageUrls: [],
});
ok("card builder drops phone fields", cardInput.brand === "Honda");
const fromCard = generateSellerFullPost(cardInput);
ok("card full post no phone", !/081|089|ownerPhone/i.test(fromCard));

console.log("\n--- Variation & deterministic ---");

const camryFull = generateSellerFullPost({
  ...sampleInput,
  listingId: "car-camry-a",
});
const viosFull = generateSellerFullPost({
  brand: "Toyota",
  model: "Vios",
  year: 2019,
  price: 320000,
  mileage: 45000,
  transmission: "ออโต้",
  color: "เทา",
  listingId: "car-vios-b",
});
const hiluxFull = generateSellerFullPost({
  brand: "Toyota",
  model: "Hilux",
  year: 2017,
  price: 650000,
  mileage: 120000,
  transmission: "ธรรมดา",
  bodyType: "pickup",
  listingId: "car-hilux-c",
});

const firstLines = [camryFull, viosFull, hiluxFull].map((t) => t.split("\n")[0] ?? "");
const uniqueHeadlines = new Set(firstLines);
ok("different listings get different headlines", uniqueHeadlines.size >= 2, `got ${uniqueHeadlines.size}`);

const camryAgain = generateSellerFullPost({ ...sampleInput, listingId: "car-camry-a" });
ok("same listingId is deterministic", camryFull === camryAgain);

ok("camry style premium or gentle", ["premium", "gentleHook", "urbanWorker", "honestOwner"].includes(inferSellerShareStyle({
  brand: "Toyota",
  model: "Camry",
  price: 888000,
})));
ok("vios style valueEase", inferSellerShareStyle({ brand: "Toyota", model: "Vios", price: 320000 }) === "valueEase");

const sparseFull = generateSellerFullPost({
  listingId: "car-sparse",
  brand: "Nissan",
  model: "Almera",
});
ok("sparse listing still has structure", sparseFull.includes("รายละเอียด") || sparseFull.includes("ข้อมูลเบื้องต้น"));
ok("sparse no hallucination", !HALLUCINATION_PHRASES.test(sparseFull));

const richDesc = generateSellerFullPost({
  ...sampleInput,
  listingId: "car-rich-desc",
  description: "มือเดียว ไม่เคยชน เข้าศูนย์ตลอด ฟรีดาวน์",
});
ok("strips unverified from listing description in output", !HALLUCINATION_PHRASES.test(richDesc));

const publishedCard = fs.readFileSync(
  path.join(process.cwd(), "src/components/chat/ChatPublishedMemberListingCard.tsx"),
  "utf8"
);
ok("published card imports share panel", publishedCard.includes("ChatSellerShareCopyPanel"));

const panel = fs.readFileSync(
  path.join(process.cwd(), "src/components/chat/ChatSellerShareCopyPanel.tsx"),
  "utf8"
);
ok("panel has copy-full-post button", panel.includes("copy-full-post"));
ok("panel has copy-short-post button", panel.includes("copy-short-post"));
ok("panel has copy-specs button", panel.includes("copy-specs"));
ok("panel has success feedback testid", panel.includes("chat-seller-share-copy-feedback"));
ok("panel has pickSellerShareCopySuccessMessage", panel.includes("pickSellerShareCopySuccessMessage"));
ok("panel has fallback modal", panel.includes("chat-seller-share-copy-fallback"));

const shareService = fs.readFileSync(
  path.join(process.cwd(), "src/services/chat/sellerShareCopy.ts"),
  "utf8"
);
ok("service uses thai variation picker", shareService.includes("pickStableVariant"));
ok("service has headline variant groups", shareService.includes("headlineVariants"));
ok("service has opening variant groups", shareService.includes("openingVariants"));
ok("service infers style from listing", shareService.includes("inferSellerShareStyle"));
ok(
  "service uses PUBLIC_NONGA_BASE_URL constant",
  shareService.includes("publicNongaUrl") && !shareService.includes(FIREBASE_HOSTING_URL)
);
ok("service does not hardcode example headline only", shareService.includes("headlineVariants"));

const clipboardUtil = fs.readFileSync(
  path.join(process.cwd(), "src/utils/clipboardCopy.ts"),
  "utf8"
);
ok("clipboard util has writeText fallback", clipboardUtil.includes("execCommand"));

ok("shareCopySeed uses listingId", shareCopySeed(sampleInput) === sampleInput.listingId);
ok("generateSellerShareCopy full kind", generateSellerShareCopy("full", sampleInput).includes("Toyota"));

console.log("\n--- Example outputs (Camry pilot) ---");
console.log("\n[FULL]\n", full);
console.log("\n[SHORT]\n", short);
console.log("\n[SPECS]\n", specs);
console.log("\n--- Style samples (headlines only) ---");
console.log("Camry:", firstLines[0]);
console.log("Vios:", firstLines[1]);
console.log("Hilux:", firstLines[2]);
console.log("\n=== Done ===");
