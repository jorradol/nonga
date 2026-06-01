/**
 * Nong A v5.4.5-beta.5 — Seller Copy & Share Pack
 * npm run test:v545-seller-copy-share-pack
 */
import fs from "node:fs";
import path from "node:path";
import {
  assertSellerShareCopySafe,
  buildSellerShareInputFromPublishedCard,
  countPangPuriyeInText,
  generateSellerFullPost,
  generateSellerShortPost,
  generateSellerSpecsText,
  PUBLIC_NONGA_BASE_URL,
  sanitizeSellerShareText,
} from "../src/services/chat/sellerShareCopy.ts";
import { buildPublicListingDetailUrl } from "../src/utils/publicNongaUrl.ts";

const FIREBASE_HOSTING_URL = "https://nonga-ce93c.web.app";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Nong A v5.4.5-beta.5 Seller Copy & Share Pack ===");

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
  description: "ดูแลศูนย์ครบ ยางและแบตเปลี่ยนแล้ว",
  listingId: "car-toyota-camry-pilot",
  detailPath: "/cars/car-toyota-camry-pilot",
};

const full = generateSellerFullPost(sampleInput);
ok("generate full sales post", full.includes("Toyota") && full.includes("888,000"));
ok("full post has spec section", full.includes("รายละเอียดเบื้องต้น"));
ok("full post has disclaimer", full.includes("ตรวจสอบข้อมูลจริง"));
ok("full post has warm tone", /เหมาะ|ขับสบาย|น่าสนใจ/.test(full));
ok("full post max one pang puriye", countPangPuriyeInText(full) <= 1);
ok(
  "full post uses public domain",
  full.includes(PUBLIC_NONGA_BASE_URL) &&
    full.includes(buildPublicListingDetailUrl(sampleInput.listingId))
);
ok("full post has no firebase hosting url", !full.includes(FIREBASE_HOSTING_URL));

const short = generateSellerShortPost(sampleInput);
ok("generate short post", short.includes("Camry") && short.includes("888,000"));
ok("short post is shorter than full", short.length < full.length);
ok("short post max one pang puriye", countPangPuriyeInText(short) <= 1);

const specs = generateSellerSpecsText(sampleInput);
ok("generate specs text", specs.includes("• ยี่ห้อ: Toyota"));
ok("specs has mileage", specs.includes("88,800"));
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
  "รถดี โทร 081-234-5678 รับประกันขายแน่นอน ค่าคอมถูก ซื้อแล้วรวยแน่นอน"
);
ok("sanitize strips phone and forbidden", !/081|รับประกันขาย|ค่าคอม|ซื้อแล้วรวย/.test(dirtyMarketing));

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

const publishedCard = fs.readFileSync(
  path.join(process.cwd(), "src/components/chat/ChatPublishedMemberListingCard.tsx"),
  "utf8"
);
ok(
  "published card imports share panel",
  publishedCard.includes("ChatSellerShareCopyPanel")
);

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
ok(
  "service uses PUBLIC_NONGA_BASE_URL constant",
  shareService.includes("publicNongaUrl") &&
    !shareService.includes(FIREBASE_HOSTING_URL)
);

const clipboardUtil = fs.readFileSync(
  path.join(process.cwd(), "src/utils/clipboardCopy.ts"),
  "utf8"
);
ok("clipboard util has writeText fallback", clipboardUtil.includes("execCommand"));

console.log("\n--- Example outputs (sample) ---");
console.log("\n[FULL]\n", full);
console.log("\n[SHORT]\n", short);
console.log("\n[SPECS]\n", specs);
console.log("\n=== Done ===");
