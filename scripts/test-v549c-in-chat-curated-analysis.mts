/**
 * v5.4.9C — in-chat curated analysis + no full-page escape from chat card
 * npm run test:v549c-in-chat-curated-analysis
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildInChatCuratedAnalysis,
  assertInChatCuratedSafe,
  IN_CHAT_CURATED_TITLE,
  IN_CHAT_CURATED_FORBIDDEN,
} from "../src/services/ai/chat/buildInChatCuratedAnalysis.ts";
import { summaryToChatCarCardData, toChatCarSummary } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  saveInChatBuyerContext,
  saveChatSearchContext,
} from "../src/utils/chatCarContext.ts";

if (typeof global !== "undefined" && !(global as { sessionStorage?: Storage }).sessionStorage) {
  const store = new Map<string, string>();
  (global as { sessionStorage: Storage }).sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const camryInv: ChatInventoryCar = {
  id: "car-toyota-camry",
  title: "Toyota Camry",
  brand: "Toyota",
  model: "Camry",
  year: 2019,
  price: 819_000,
  mileage: 120_384,
  color: "เทา",
  type: "used",
  images: ["/storage/listings/car-toyota-camry/01.webp"],
  isSold: false,
  listingStatus: "published",
  transmission: "AT",
};

const ertigaInv: ChatInventoryCar = {
  id: "car-suzuki-ertiga",
  title: "Suzuki Ertiga",
  brand: "Suzuki",
  model: "Ertiga",
  year: 2022,
  price: 589_000,
  mileage: 45_200,
  color: "เทา",
  type: "used",
  images: ["/a.webp", "/b.webp", "/c.webp"],
  isSold: false,
  listingStatus: "published",
  bodyType: "mpv",
};

const camryCard = summaryToChatCarCardData(toChatCarSummary(camryInv), "exact");
const ertigaCard = summaryToChatCarCardData(toChatCarSummary(ertigaInv), "exact");

console.log("--- v5.4.9C ChatCarCard UI ---");
const cardSource = fs.readFileSync(
  path.resolve("src/components/chat/ChatCarCard.tsx"),
  "utf8"
);
ok("no-full-page-button", !cardSource.includes("chat-car-card-full-detail-btn"), "");
ok("no-window-open", !cardSource.includes("window.open"), "");
ok("no-setview", !cardSource.includes("setView"), "");
ok("has-expand-btn", cardSource.includes("chat-car-card-expand-btn"), "");
ok("has-curated-panel", cardSource.includes("chat-car-curated-analysis"), "");
ok("curated-title-in-ui", cardSource.includes("ChatCarCuratedAnalysisPanel") && cardSource.includes("analysis.title"), "");

console.log("\n--- v5.4.9C curated analysis copy ---");
const camryAnalysis = buildInChatCuratedAnalysis(camryCard);
const ertigaAnalysis = buildInChatCuratedAnalysis(ertigaCard);

ok("title-constant", camryAnalysis.title === IN_CHAT_CURATED_TITLE, "");
ok("uses-nong-a", camryAnalysis.paragraphs.join(" ").includes("น้องเอ"), "");
ok("no-mouse", !/\bหนู\b/.test(camryAnalysis.paragraphs.join(" ")), "");
ok("camry-mentions-brand", camryAnalysis.opening.includes("Toyota"), camryAnalysis.opening);
ok("ertiga-differs", camryAnalysis.opening !== ertigaAnalysis.opening, "");
ok("ertiga-mentions-brand", ertigaAnalysis.opening.includes("Suzuki"), "");

for (const forbidden of [
  "ล้านเปอร์เซ็นต์",
  "ทนทานที่สุด",
  "พละกำลังเหนือระดับ",
  "ไม่เคยชน",
  "ไม่จุกจิกแน่นอน",
  "คันนี้มีคนทัก",
]) {
  ok(
    `forbidden-absent-${forbidden.slice(0, 8)}`,
    !camryAnalysis.paragraphs.join(" ").includes(forbidden) &&
      !ertigaAnalysis.paragraphs.join(" ").includes(forbidden),
    forbidden
  );
}

ok(
  "assert-helper-catches-forbidden",
  (() => {
    try {
      assertInChatCuratedSafe("คันนี้มีคนทักชัวร์");
      return false;
    } catch {
      return true;
    }
  })(),
  ""
);

console.log("\n--- v5.4.9C buyer context weave ---");
saveInChatBuyerContext({
  message: "หารถครอบครัว 7 ที่นั่ง",
  usageTags: ["family"],
  seatsMin: 7,
});
const familyWeave = buildInChatCuratedAnalysis(ertigaCard);
ok(
  "family-context-weave",
  familyWeave.opening.includes("ครอบครัว") || familyWeave.opening.includes("มุมครอบครัว"),
  familyWeave.opening.slice(0, 80)
);

saveInChatBuyerContext({
  message: "อยากได้รถคันแรก งบไม่เกิน 600000",
  usageTags: ["firstCar"],
  budgetMax: 600_000,
});
const firstCarWeave = buildInChatCuratedAnalysis(camryCard);
ok(
  "first-car-context-weave",
  firstCarWeave.opening.includes("คันแรก") || firstCarWeave.opening.includes("โจทย์"),
  firstCarWeave.opening.slice(0, 80)
);

console.log("\n--- v5.4.9C pitch line reuse ---");
saveChatSearchContext({
  allCars: [camryCard, ertigaCard],
  offset: 0,
  pitchLines: ["คันแรก Toyota Camry ราคา 819,000 บาท — มุมใช้งานจริง", "pitch-two"],
});
const withPitch = buildInChatCuratedAnalysis(camryCard);
ok(
  "reuses-stored-pitch",
  withPitch.opening.includes("819") || withPitch.opening.includes("Toyota Camry"),
  withPitch.opening.slice(0, 100)
);

console.log("\n--- samples ---");
console.log("\n[Camry sample opening]\n", camryAnalysis.opening);
console.log("\n[Ertiga sample opening]\n", ertigaAnalysis.opening);

console.log("\nDone v5.4.9C in-chat curated analysis tests.");
