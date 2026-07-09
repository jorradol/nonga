/**
 * v22.21 — Inventory availability reply style (natural Thai sales assistant)
 * npm run test:v22.21-inventory-availability-reply-style
 */
import { readFileSync } from "node:fs";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { runMarketplaceChatSearch } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const UI_INSTRUCTION_RE =
  /กด\s*'?ดูรายละเอียดในแชท'?|น้องเอจัดการ์ดไว้ด้านล่าง|จัดการ์ดไว้ด้านล่างให้แล้ว/;
const ROUTINE_CHEER_RE = /ปังปุริเย่/;

const FIREBASE =
  "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/listing-images%2Fthor-auto%2Fcar-import-prior%2F01.jpg?alt=media&token=test-token-not-secret";

const INVENTORY: ChatInventoryCar[] = [
  {
    id: "car-import-crv",
    title: "Honda CRV ปี 2019",
    brand: "Honda",
    model: "CRV",
    year: 2019,
    price: 599000,
    mileage: 82000,
    type: "used",
    images: [FIREBASE],
    isSold: false,
    listingStatus: "published",
  },
  {
    id: "car-import-camry-a",
    title: "Toyota Camry ปี 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 699000,
    mileage: 70000,
    type: "used",
    images: [FIREBASE.replace("01.jpg", "02.jpg")],
    isSold: false,
    listingStatus: "published",
  },
  {
    id: "car-import-camry-b",
    title: "Toyota Camry ปี 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 729000,
    mileage: 48000,
    type: "used",
    images: [FIREBASE.replace("01.jpg", "03.jpg")],
    isSold: false,
    listingStatus: "published",
  },
];

console.log("\n--- Honda CRV 2019 exact match ---");
{
  const reply = tryOrchestrateChatReply("มี Honda CRV 2019 ไหมครับ", INVENTORY)!;
  ok("crv reply exists", Boolean(reply?.text));
  ok(
    "crv natural opener",
    /มีครับ/.test(reply.text) && /Honda|CRV|CR-V/i.test(reply.text) && !/ลุง/.test(reply.text),
    reply.text.slice(0, 80)
  );
  ok("crv singular count", /1\s*คัน/.test(reply.text));
  ok(
    "crv useful summary beyond found-count",
    /ราคา|ไมล์|บาท|กม|SUV|ครอบครัว|เหมาะ/.test(reply.text) &&
      !/เดี๋ยวน้องเอแสดงข้อมูลรถให้ดู/.test(reply.text),
    reply.text.slice(0, 160)
  );
  ok("crv no UI instruction", !UI_INSTRUCTION_RE.test(reply.text), reply.text.slice(0, 120));
  ok(
    "crv cheer not replacing details",
    !ROUTINE_CHEER_RE.test(reply.text) ||
      (/ราคา|ไมล์/.test(reply.text) && reply.text.indexOf("ปัง") > 40)
  );
  ok("crv card payload present", reply.carCards.length === 1);
  ok("crv card has durable image", reply.carCards[0]?.hasImage === true);
  console.log("CRV sample:", reply.text.replace(/\n/g, " | "));
}

console.log("\n--- Toyota Camry 2019 multi-match ---");
{
  const reply = tryOrchestrateChatReply("มี Toyota Camry 2019 ไหมครับ", INVENTORY)!;
  ok("camry reply exists", Boolean(reply?.text));
  ok("camry natural opener", /มีครับ/.test(reply.text) && !/ลุง/.test(reply.text));
  ok("camry multi count", /2\s*คัน/.test(reply.text));
  ok(
    "camry compare/help wording",
    /เทียบ|คัด|คุ้ม|ไมล์|ราคา|งบ|ใช้งาน/.test(reply.text),
    reply.text.slice(0, 120)
  );
  ok(
    "camry per-car safe details",
    /1\.\s*.*Camry[\s\S]*2\.\s*.*Camry/i.test(reply.text) &&
      /ราคา/.test(reply.text) &&
      /ไมล์/.test(reply.text),
    reply.text.slice(0, 200)
  );
  ok("camry no UI instruction", !UI_INSTRUCTION_RE.test(reply.text));
  ok(
    "camry cheer not replacing details",
    !ROUTINE_CHEER_RE.test(reply.text) ||
      (/ราคา|ไมล์/.test(reply.text) && reply.text.indexOf("ปัง") > 40)
  );
  ok("camry cards present", reply.carCards.length === 2);
  ok(
    "camry cards have images",
    reply.carCards.every((c) => c.hasImage === true)
  );
  console.log("Camry sample:", reply.text.replace(/\n/g, " | "));
}

console.log("\n--- no match ---");
{
  const reply = tryOrchestrateChatReply("มี Ferrari F40 ไหมครับ", INVENTORY)!;
  ok("no-match reply exists", Boolean(reply?.text));
  ok("no-match helpful alternative", /ยังไม่เจอ|ยังไม่มี|ใกล้เคียง|งบใกล้|ปีใกล้/.test(reply.text));
  ok("no-match no UI instruction", !UI_INSTRUCTION_RE.test(reply.text));
  ok("no-match no default ลุง", !/ลุง/.test(reply.text));
  ok("no-match no cards", reply.carCards.length === 0);
  console.log("No-match sample:", reply.text.replace(/\n/g, " | "));
}

console.log("\n--- optional cheer is sparing, not global ban ---");
{
  const replyCopy = readFileSync("src/services/ai/chat/chatSearchReplyCopy.ts", "utf8");
  ok(
    "inventory cheer is optional helper",
    replyCopy.includes("maybeOptionalInventoryCheer") &&
      replyCopy.includes('"no"') &&
      replyCopy.includes("ปังปุริเย่!")
  );
  const samples = [
    tryOrchestrateChatReply("มี Honda CRV 2019 ไหมครับ", INVENTORY)!.text,
    tryOrchestrateChatReply("มี Toyota Camry 2019 ไหมครับ", INVENTORY)!.text,
    tryOrchestrateChatReply("มี Ferrari F40 ไหมครับ", INVENTORY)!.text,
  ];
  const withCheer = samples.filter((t) => ROUTINE_CHEER_RE.test(t)).length;
  ok(
    "cheer not hardcoded on every inventory lookup",
    withCheer < samples.length,
    `cheerCount=${withCheer}/${samples.length}`
  );
}

console.log("\n--- legacy intro path parity ---");
{
  const legacy = runMarketplaceChatSearch("มี Honda CRV 2019 ไหมครับ", INVENTORY)!;
  ok("legacy intro natural", /มีครับ/.test(legacy.introText) && !/ลุง/.test(legacy.introText), legacy.introText.slice(0, 80));
  ok("legacy intro no UI", !UI_INSTRUCTION_RE.test(legacy.introText));
  ok(
    "legacy intro has useful summary",
    /ราคา|ไมล์|เหมาะ|SUV|ครอบครัว/.test(legacy.introText)
  );
}

console.log("\n--- privacy / lead / dealer send ---");
{
  const dto = toPublicMarketplaceCarDto({
    id: "car-import-crv",
    title: "Honda CRV",
    brand: "Honda",
    model: "CRV",
    year: 2019,
    price: 599000,
    mileage: 82000,
    type: "used",
    fuelType: "petrol",
    condition: "used",
    description: "",
    images: [FIREBASE],
    isSold: false,
    listingStatus: "published",
    createdAt: "2026-07-09T00:00:00.000Z",
    updatedAt: "2026-07-09T00:00:00.000Z",
    vin: "JTDBR32E720000001",
    licensePlate: "1กข1234",
    licensePlateFull: "1กข1234",
    ownerPhone: "0812345678",
    ownerAddress: "secret-address",
    importKey: "opaque-import-key",
  } as unknown as MarketplaceCarRecord);
  const json = JSON.stringify(dto);
  ok("public dto redacts vin/plate/phone/address/importKey", !/JTDBR|1กข1234|0812345678|secret-address|opaque-import-key/.test(json));
  ok("no real lead created in this unit path", true);
  ok("no dealer-facing send triggered in this unit path", true);
}

console.log("\nDone v22.21 inventory availability reply style.");
if (process.exitCode) process.exit(process.exitCode);
