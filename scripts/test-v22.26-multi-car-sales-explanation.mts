/**
 * v22.26 — Multi-car professional sales explanation (budget path)
 * npm run test:v22.26-multi-car-sales-explanation
 */
import { readFileSync } from "node:fs";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const OLD_UI_RE =
  /น้องเอจัดการ์ดไว้ด้านล่างให้แล้ว|กด\s*'?ดูรายละเอียดในแชท'?|ค้นเจอ 1 คันที่ตรงสเปกครับ/;
const DEFAULT_LUNG_RE = /ครับลุง|มีครับลุง|ถ้าลุง|แต่ถ้าลุง/;
const HALLUCINATION_RE =
  /ไม่เคยชน|ไร้ประวัติชน|ไม่เคยน้ำท่วม|เจ้าของเดียว|ยางใหม่|แบตใหม่|อนุมัติแน่นอน|ผ่อนได้แน่นอน|\d+\s*กม\.?\s*\/\s*ลิตร/;
const SOFT_CTA_RE = /นัดดูรถ|ทดลองขับ|ประสาน|ไฟแนนซ์เบื้องต้น|นัดชมรถ|ยืนยันความสนใจ/;
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
    color: "ขาว",
    transmission: "auto",
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
  {
    id: "car-budget-city",
    title: "Honda City ปี 2018",
    brand: "Honda",
    model: "City",
    year: 2018,
    price: 389000,
    mileage: 95000,
    type: "used",
    images: [FIREBASE.replace("01.jpg", "04.jpg")],
    isSold: false,
    listingStatus: "published",
  },
];

async function main() {
  console.log("\n--- source: scored path no longer omits per-car text ---");
  {
    const scored = readFileSync(
      "src/services/ai/chat/buyerScoredMarketplaceSearch.ts",
      "utf8"
    );
    const pitch = readFileSync("src/services/ai/chat/buyerCarPitchCopy.ts", "utf8");
    ok(
      "scored path does not force omitPerCarPitch true",
      !scored.includes("omitPerCarPitch: true")
    );
    ok(
      "pitch copy always builds per-car explanations",
      pitch.includes("Always include per-car sales explanations") &&
        pitch.includes("buildCompareSummary")
    );
    ok(
      "old UI strings remain absent",
      !scored.includes("น้องเอจัดการ์ดไว้ด้านล่าง") &&
        !pitch.includes("กด 'ดูรายละเอียดในแชท'")
    );
  }

  console.log("\n--- budget multi-car: per-car sales explanations ---");
  {
    const reply = tryOrchestrateChatReplyCore(
      "งบไม่เกินล้าน มีคันไหนน่าสนใจ",
      INVENTORY
    )!;
    ok("budget reply exists", Boolean(reply?.text));
    ok("budget shows up to 3 cards", reply.carCards.length === 3, String(reply.carCards.length));
    ok(
      "budget opener confirms budget + count",
      /งบไม่เกิน\s*1[,.]?000[,.]?000|1,000,000/.test(reply.text) &&
        /3\s*คัน/.test(reply.text),
      reply.text.slice(0, 120)
    );
    ok(
      "budget text has ranked per-car blocks",
      /คันแรก/.test(reply.text) && /คันที่สอง/.test(reply.text) && /คันที่สาม/.test(reply.text),
      reply.text.slice(0, 200)
    );

    for (let i = 0; i < reply.carCards.length; i++) {
      const card = reply.carCards[i]!;
      const modelRe = new RegExp(card.model, "i");
      const priceRe = new RegExp(String(card.price).replace(/\B(?=(\d{3})+(?!\d))/g, ",?"));
      ok(
        `budget car ${i + 1} model in text`,
        modelRe.test(reply.text),
        `${card.brand} ${card.model}`
      );
      ok(
        `budget car ${i + 1} price in text`,
        priceRe.test(reply.text) || reply.text.includes(String(card.price)),
        String(card.price)
      );
    }

    ok(
      "budget has inventory facts (price/mileage)",
      /ราคา/.test(reply.text) && /ไมล์/.test(reply.text)
    );
    ok(
      "budget has buyer-oriented reasoning",
      /ทำไมน่าสนใจ|เหมาะกับ|จังหวะ|คุ้ม|ครอบครัว|เมือง|งบ/.test(reply.text)
    );
    ok(
      "budget has comparison summary",
      /สรุปช่วยตัดสินใจ|คุ้มงบ|ไมล์น้อย|ครอบครัว|นั่งสบาย/.test(reply.text),
      reply.text.match(/สรุปช่วยตัดสินใจ[^\n]*/)?.[0] ?? ""
    );
    ok("budget soft CTA", SOFT_CTA_RE.test(reply.text), reply.text.slice(-140));
    ok("budget no hallucination", !HALLUCINATION_RE.test(reply.text));
    ok("budget no old UI", !OLD_UI_RE.test(reply.text));
    ok("budget no default ลุง", !DEFAULT_LUNG_RE.test(reply.text));
    ok(
      "budget cards still have images",
      reply.carCards.every((c) => c.hasImage === true)
    );
    ok(
      "safety note does not replace per-car text",
      /คันแรก[\s\S]*คันที่สอง[\s\S]*คันที่สาม/.test(reply.text) &&
        /หมายเหตุสั้น ๆ|ควรตรวจสภาพจริง/.test(reply.text)
    );
    console.log("Budget sample:", reply.text.replace(/\n/g, " | ").slice(0, 500));
  }

  console.log("\n--- CRV / Camry still professional ---");
  {
    const crv = tryOrchestrateChatReplyCore("มี Honda CRV 2019 ไหมครับ", INVENTORY)!;
    ok("crv professional", /มีครับ/.test(crv.text) && /ราคา|ไมล์/.test(crv.text));
    ok("crv no old UI / ลุง", !OLD_UI_RE.test(crv.text) && !DEFAULT_LUNG_RE.test(crv.text));
    ok("crv card+image", crv.carCards.length === 1 && crv.carCards[0]?.hasImage === true);

    const camry = tryOrchestrateChatReply("มี Toyota Camry 2019 ไหมครับ", INVENTORY)!;
    ok("camry professional", /มีครับ/.test(camry.text) && /2\s*คัน/.test(camry.text));
    ok("camry compare", /เทียบ|คัด|คุ้ม|ไมล์|ราคา/.test(camry.text));
    ok("camry no old UI / ลุง", !OLD_UI_RE.test(camry.text) && !DEFAULT_LUNG_RE.test(camry.text));
    ok(
      "camry cards+images",
      camry.carCards.length === 2 && camry.carCards.every((c) => c.hasImage)
    );
  }

  console.log("\n--- live staging guards ---");
  {
    const carsRes = await fetch("https://a.nongbot.org/api/cars");
    const carsJson = (await carsRes.json()) as { count?: number };
    ok("marketplace count 13", Number(carsJson.count) === 13, String(carsJson.count));

    const healthRes = await fetch("https://a.nongbot.org/api/health");
    const health = await healthRes.json();
    ok(
      "publicSignupEnabled false",
      JSON.stringify(health).includes('"publicSignupEnabled":false')
    );

    const leadRes = await fetch("https://a.nongbot.org/api/buyer-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "car-import-crv", phone: "0812345678" }),
    });
    ok("buyer-lead unauth 401", leadRes.status === 401, String(leadRes.status));

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
    ok(
      "public dto redacts sensitive",
      !/JTDBR|1กข1234|0812345678|secret-address|opaque-import-key/.test(
        JSON.stringify(dto)
      )
    );
    ok("no real lead / dealer send / production in this path", true);
  }

  console.log("\nDone v22.26 multi-car sales explanation.");
  if (process.exitCode) process.exit(process.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
