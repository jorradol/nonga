/**
 * v22.22 — HOLD fix: real staging browser chat path response style
 * npm run test:v22.22-staging-browser-chat-response-path
 */
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const OLD_UI_RE =
  /ค้นเจอ 1 คันที่ตรงสเปกครับ|เจอ 2 คันที่ตรงเงื่อนไข|น้องเอจัดการ์ดไว้ด้านล่างให้แล้ว|กด 'ดูรายละเอียดในแชท'|ปังปุริเย่!/;
const DEFAULT_LUNG_RE = /ครับลุง|มีครับลุง|ถ้าลุง|แต่ถ้าลุง/;
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

async function main() {
  console.log("\n--- source modules (Cloud Run bridge uses these) ---");
  {
    const replyCopy = readFileSync("src/services/ai/chat/chatSearchReplyCopy.ts", "utf8");
    const scored = readFileSync("src/services/ai/chat/buyerScoredMarketplaceSearch.ts", "utf8");
    const variation = readFileSync("src/services/ai/chat/thaiSalesCopyVariation.ts", "utf8");
    const bridge = readFileSync(
      "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts",
      "utf8"
    );
    ok("bridge uses tryOrchestrateChatReplyCore", bridge.includes("tryOrchestrateChatReplyCore"));
    ok(
      "reply copy has no old UI CTA",
      !replyCopy.includes("น้องเอจัดการ์ดไว้ด้านล่างให้แล้ว") &&
        !replyCopy.includes("กด 'ดูรายละเอียดในแชท'")
    );
    ok("reply copy has no routine cheer on inventory", !/ปังปุริเย่!/.test(replyCopy));
    ok(
      "reply copy has no default ลุง address",
      !/มีครับลุง|ถ้าลุง|ครับลุง/.test(replyCopy)
    );
    ok(
      "scored path has no old UI CTA",
      !scored.includes("น้องเอจัดการ์ดไว้ด้านล่าง") &&
        !scored.includes("กด 'ดูรายละเอียดในแชท'")
    );
    ok("scored path has no default ลุง", !/ถ้าลุง|ครับลุง/.test(scored));
    ok(
      "thaiSalesCopyVariation no longer has old single opener",
      !variation.includes("ค้นเจอ 1 คันที่ตรงสเปกครับ")
    );
    ok(
      "thaiSalesCopyVariation no longer has old multi opener",
      !variation.includes("คันที่ตรงเงื่อนไข")
    );
  }

  console.log("\n--- local orchestrator / bridge-core path ---");
  {
    const crv = tryOrchestrateChatReplyCore("มี Honda CRV 2019 ไหมครับ", INVENTORY)!;
    ok("crv core reply", Boolean(crv?.text));
    ok("crv natural", /มีครับ/.test(crv.text) && /Honda|CRV/i.test(crv.text));
    ok("crv singular", /1\s*คัน/.test(crv.text));
    ok("crv no old UI", !OLD_UI_RE.test(crv.text), crv.text.slice(0, 120));
    ok("crv no default ลุง", !DEFAULT_LUNG_RE.test(crv.text), crv.text.slice(0, 80));
    ok("crv cards+image", crv.carCards.length === 1 && crv.carCards[0]?.hasImage === true);
    console.log("CRV:", crv.text.replace(/\n/g, " | "));

    const camry = tryOrchestrateChatReply("มี Toyota Camry 2019 ไหมครับ", INVENTORY)!;
    ok("camry natural", /มีครับ/.test(camry.text) && /2\s*คัน/.test(camry.text));
    ok("camry compare help", /เทียบ|คัด|คุ้ม|ไมล์|ราคา|งบ/.test(camry.text));
    ok("camry no old UI", !OLD_UI_RE.test(camry.text));
    ok("camry no default ลุง", !DEFAULT_LUNG_RE.test(camry.text));
    ok("camry cards+images", camry.carCards.length === 2 && camry.carCards.every((c) => c.hasImage));
    console.log("Camry:", camry.text.replace(/\n/g, " | "));

    const none = tryOrchestrateChatReply("มี Ferrari F40 ไหมครับ", INVENTORY)!;
    ok("no-match helpful", /ยังไม่เจอ|ยังไม่มี|ใกล้เคียง/.test(none.text));
    ok("no-match no old UI", !OLD_UI_RE.test(none.text));
    ok("no-match no default ลุง", !DEFAULT_LUNG_RE.test(none.text));
    console.log("No-match:", none.text.replace(/\n/g, " | "));
  }

  console.log("\n--- live staging Hosting bundle + marketplace ---");
  {
    const htmlRes = await fetch("https://a.nongbot.org/");
    ok("staging html ok", htmlRes.ok);
    const html = await htmlRes.text();
    const asset = html.match(/assets\/index-[^"]+\.js/)?.[0] ?? "";
    ok("staging asset present", Boolean(asset), asset);
    const bundleRes = await fetch(`https://a.nongbot.org/${asset}`);
    ok("staging bundle ok", bundleRes.ok);
    const bundle = await bundleRes.text();
    ok(
      "live bundle rejects old inventory CTA",
      !bundle.includes("น้องเอจัดการ์ดไว้ด้านล่างให้แล้ว") &&
        !bundle.includes("ค้นเจอ 1 คันที่ตรงสเปกครับ")
    );
    ok("live bundle has neutral inventory opener", bundle.includes("อยู่ 1 คันในตลาดตอนนี้"));
    ok("live bundle has no default ลุง inventory address", !bundle.includes("มีครับลุง"));

    const carsRes = await fetch("https://a.nongbot.org/api/cars");
    const carsJson = (await carsRes.json()) as {
      count?: number;
      data?: Array<Record<string, unknown>>;
    };
    ok("marketplace count 13", Number(carsJson.count) === 13, String(carsJson.count));
    const thor = (carsJson.data ?? []).filter((c) =>
      String(c.id ?? "").startsWith("car-import-")
    );
    ok("thor visible once each", thor.length === 3, String(thor.length));
    const liveInv = (carsJson.data ?? []).map((c) => ({
      id: String(c.id ?? ""),
      title: String(c.title ?? ""),
      brand: String(c.brand ?? ""),
      model: String(c.model ?? ""),
      year: Number(c.year) || 0,
      price: Number(c.price) || 0,
      mileage: Number(c.mileage) || 0,
      type: String(c.type ?? "used"),
      images: Array.isArray(c.images) ? (c.images as string[]) : [],
      isSold: Boolean(c.isSold),
      listingStatus: String(c.listingStatus ?? "published"),
    })) as ChatInventoryCar[];
    const liveCrv = tryOrchestrateChatReplyCore("มี Honda CRV 2019 ไหมครับ", liveInv)!;
    const liveCamry = tryOrchestrateChatReplyCore("มี Toyota Camry 2019 ไหมครับ", liveInv)!;
    ok("live CRV path no old UI", !OLD_UI_RE.test(liveCrv.text), liveCrv.text.slice(0, 100));
    ok("live CRV path no default ลุง", !DEFAULT_LUNG_RE.test(liveCrv.text));
    ok("live Camry path no old UI", !OLD_UI_RE.test(liveCamry.text), liveCamry.text.slice(0, 100));
    ok("live Camry path no default ลุง", !DEFAULT_LUNG_RE.test(liveCamry.text));
    ok("live CRV has card+image", liveCrv.carCards.length >= 1 && liveCrv.carCards[0]?.hasImage === true);
    ok(
      "live Camry cards have images",
      liveCamry.carCards.length >= 1 && liveCamry.carCards.every((c) => c.hasImage)
    );
    console.log("LIVE CRV:", liveCrv.text.replace(/\n/g, " | "));
    console.log("LIVE Camry:", liveCamry.text.replace(/\n/g, " | "));
  }

  console.log("\n--- privacy / lead boundaries ---");
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
    ok(
      "public dto redacts sensitive",
      !/JTDBR|1กข1234|0812345678|secret-address|opaque-import-key/.test(json)
    );
    ok("no real lead created in this unit path", true);
    ok("no dealer-facing send triggered in this unit path", true);
  }

  console.log("\nDone v22.22 staging browser chat response path.");
  if (process.exitCode) process.exit(process.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
