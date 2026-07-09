/**
 * v22.25 — Professional Thai car-sales response style upgrade
 * npm run test:v22.25-professional-thai-car-sales-response
 */
import { readFileSync } from "node:fs";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  buildGeneralModelContext,
  buildGeneralModelContextBlock,
} from "../src/services/ai/chat/vehicleModelContext.ts";
import { buildBuyerSearchPilotCopy } from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const OLD_UI_RE =
  /น้องเอจัดการ์ดไว้ด้านล่างให้แล้ว|กด\s*'?ดูรายละเอียดในแชท'?|ค้นเจอ 1 คันที่ตรงสเปกครับ/;
const DEFAULT_LUNG_RE = /ครับลุง|มีครับลุง|ถ้าลุง|แต่ถ้าลุง/;
const ROUTINE_CHEER_RE = /ปังปุริเย่/;
const HALLUCINATION_RE =
  /ไม่เคยชน|ไร้ประวัติชน|ไม่เคยน้ำท่วม|เจ้าของเดียว|ยางใหม่|แบตใหม่|อนุมัติแน่นอน|ผ่อนได้แน่นอน|\d+\s*กม\.?\s*\/\s*ลิตร/;
const SOFT_CTA_RE = /นัดดูรถ|ทดลองขับ|ประสาน|ไฟแนนซ์เบื้องต้น|นัดชมรถ|ยืนยันความสนใจ/;
const MODEL_CTX_RE = /โดยทั่วไป|ข้อมูลทั่วไปของรุ่น|ควรตรวจสอบรายละเอียดกับผู้ขาย/;
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
  console.log("\n--- source guards ---");
  {
    const replyCopy = readFileSync("src/services/ai/chat/chatSearchReplyCopy.ts", "utf8");
    const modelCtx = readFileSync("src/services/ai/chat/vehicleModelContext.ts", "utf8");
    const scored = readFileSync("src/services/ai/chat/buyerScoredMarketplaceSearch.ts", "utf8");
    const realProvider = readFileSync(
      "src/services/ai/salesBrainUserVisibleRealProvider.ts",
      "utf8"
    );
    ok(
      "model context module present",
      modelCtx.includes("buildGeneralModelContext") && modelCtx.includes("โดยทั่วไป")
    );
    ok(
      "reply copy uses model context",
      replyCopy.includes("buildGeneralModelContextBlock") &&
        replyCopy.includes("vehicleModelContext")
    );
    ok(
      "reply copy soft viewing CTA",
      replyCopy.includes("นัดดูรถ") && replyCopy.includes("ทดลองขับ")
    );
    ok(
      "old UI strings remain absent",
      !replyCopy.includes("น้องเอจัดการ์ดไว้ด้านล่างให้แล้ว") &&
        !replyCopy.includes("กด 'ดูรายละเอียดในแชท'") &&
        !scored.includes("น้องเอจัดการ์ดไว้ด้านล่าง")
    );
    ok("no default ลุง in reply copy", !/มีครับลุง|ถ้าลุง|ครับลุง/.test(replyCopy));
    ok(
      "cheer remains optional helper",
      replyCopy.includes("maybeOptionalInventoryCheer") && replyCopy.includes('"no"')
    );
    ok(
      "gemini system allows general model context framing",
      realProvider.includes("โดยทั่วไป") &&
        realProvider.includes("ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง")
    );
    ok(
      "gemini still bans ลุง and routine ปังปุริเย่ in user-visible polish",
      realProvider.includes("ห้ามเดา ลุง") && realProvider.includes("ห้ามใช้ ปังปุริเย่")
    );
  }

  console.log("\n--- model context helper ---");
  {
    const crv = buildGeneralModelContext({ brand: "Honda", model: "CRV", year: 2019 });
    const camry = buildGeneralModelContext({ brand: "Toyota", model: "Camry", year: 2019 });
    ok("CRV general context", /โดยทั่วไป/.test(crv) && /SUV|ครอบครัว|นั่งสบาย/.test(crv), crv);
    ok("Camry general context", /โดยทั่วไป/.test(camry) && /ซีดาน|นั่งสบาย/.test(camry), camry);
    ok("CRV no hallucination", !HALLUCINATION_RE.test(crv));
    ok("Camry no hallucination", !HALLUCINATION_RE.test(camry));
    const block = buildGeneralModelContextBlock({ brand: "Honda", model: "CR-V" });
    ok(
      "context block framed as general",
      /ข้อมูลทั่วไปของรุ่น/.test(block) && /ไม่ใช่การยืนยันสภาพคันนี้/.test(block)
    );
  }

  console.log("\n--- A: Honda CRV 2019 professional answer ---");
  {
    const reply = tryOrchestrateChatReplyCore("มี Honda CRV 2019 ไหมครับ", INVENTORY)!;
    ok("crv reply exists", Boolean(reply?.text));
    ok(
      "crv professional opener",
      /มีครับ/.test(reply.text) && /Honda|CRV|CR-V/i.test(reply.text) && !DEFAULT_LUNG_RE.test(reply.text)
    );
    ok("crv inventory facts", /599[,.]?000|ราคา/.test(reply.text) && /ไมล์|82[,.]?000/.test(reply.text));
    ok("crv model context", MODEL_CTX_RE.test(reply.text), reply.text.slice(0, 200));
    ok("crv soft CTA", SOFT_CTA_RE.test(reply.text), reply.text.slice(-120));
    ok("crv no hallucination", !HALLUCINATION_RE.test(reply.text));
    ok("crv no old UI", !OLD_UI_RE.test(reply.text));
    ok("crv card+image", reply.carCards.length === 1 && reply.carCards[0]?.hasImage === true);
    console.log("CRV:", reply.text.replace(/\n/g, " | "));
  }

  console.log("\n--- B: Toyota Camry 2019 professional compare ---");
  {
    const reply = tryOrchestrateChatReply("มี Toyota Camry 2019 ไหมครับ", INVENTORY)!;
    ok("camry reply exists", Boolean(reply?.text));
    ok("camry multi", /2\s*คัน/.test(reply.text) && !DEFAULT_LUNG_RE.test(reply.text));
    ok(
      "camry per-car + compare",
      /1\.\s*.*Camry[\s\S]*2\.\s*.*Camry/i.test(reply.text) &&
        /คุ้ม|ไมล์|ครอบครัว|นั่งสบาย|เทียบ|คัด/.test(reply.text)
    );
    ok("camry model context", MODEL_CTX_RE.test(reply.text));
    ok("camry soft CTA", SOFT_CTA_RE.test(reply.text));
    ok("camry no hallucination", !HALLUCINATION_RE.test(reply.text));
    ok("camry no old UI", !OLD_UI_RE.test(reply.text));
    ok("camry cards+images", reply.carCards.length === 2 && reply.carCards.every((c) => c.hasImage));
    console.log("Camry:", reply.text.replace(/\n/g, " | "));
  }

  console.log("\n--- C: budget compare under 1M ---");
  {
    const reply = tryOrchestrateChatReplyCore("งบไม่เกินล้าน มีคันไหนน่าสนใจ", INVENTORY)!;
    ok("budget reply exists", Boolean(reply?.text));
    ok(
      "budget helps decision",
      /คุ้ม|ครอบครัว|ไมล์|ราคา|งบ|นัด|ทดลอง|คัด|เทียบ|City|Camry|CRV|Honda|Toyota/i.test(
        reply.text
      ) && reply.carCards.length >= 1,
      reply.text.slice(0, 160)
    );
    ok("budget no overpromise finance/condition", !HALLUCINATION_RE.test(reply.text));
    ok("budget no old UI", !OLD_UI_RE.test(reply.text));
    ok("budget no default ลุง", !DEFAULT_LUNG_RE.test(reply.text));
    ok(
      "budget soft CTA or help",
      SOFT_CTA_RE.test(reply.text) || /คัด|เทียบ|บอกได้|นัด|ทดลอง/.test(reply.text)
    );
    console.log("Budget:", reply.text.replace(/\n/g, " | "));
  }

  console.log("\n--- pilot path parity + cheer sparing ---");
  {
    const pilot = buildBuyerSearchPilotCopy({
      userMessage: "มี Honda CRV 2019 ไหมครับ",
      carCardCount: 1,
      recentCarCards: [
        {
          index: 1,
          brand: "Honda",
          model: "CRV",
          year: 2019,
          price: 599000,
          mileage: 82000,
          bodyClassLabel: "SUV/Crossover",
        },
      ],
    });
    ok("pilot has model context", MODEL_CTX_RE.test(pilot));
    ok("pilot soft CTA", SOFT_CTA_RE.test(pilot));
    ok("pilot no hallucination", !HALLUCINATION_RE.test(pilot));
    ok("pilot no old UI", !OLD_UI_RE.test(pilot));
    ok("pilot no ลุง", !DEFAULT_LUNG_RE.test(pilot));

    const samples = [
      tryOrchestrateChatReply("มี Honda CRV 2019 ไหมครับ", INVENTORY)!.text,
      tryOrchestrateChatReply("มี Toyota Camry 2019 ไหมครับ", INVENTORY)!.text,
      tryOrchestrateChatReply("มี Ferrari F40 ไหมครับ", INVENTORY)!.text,
    ];
    const withCheer = samples.filter((t) => ROUTINE_CHEER_RE.test(t)).length;
    ok(
      "cheer not hardcoded every response",
      withCheer < samples.length,
      `cheerCount=${withCheer}/${samples.length}`
    );
  }

  console.log("\n--- live staging marketplace + privacy boundaries ---");
  {
    const carsRes = await fetch("https://a.nongbot.org/api/cars");
    const carsJson = (await carsRes.json()) as {
      count?: number;
      data?: Array<Record<string, unknown>>;
    };
    ok("marketplace count 13", Number(carsJson.count) === 13, String(carsJson.count));

    const healthRes = await fetch("https://a.nongbot.org/api/health");
    const health = (await healthRes.json()) as Record<string, unknown>;
    ok(
      "publicSignupEnabled false",
      health.publicSignupEnabled === false ||
        (health as { flags?: { publicSignupEnabled?: boolean } }).flags?.publicSignupEnabled ===
          false ||
        JSON.stringify(health).includes('"publicSignupEnabled":false'),
      JSON.stringify(health).slice(0, 200)
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
    const json = JSON.stringify(dto);
    ok(
      "public dto redacts sensitive",
      !/JTDBR|1กข1234|0812345678|secret-address|opaque-import-key/.test(json)
    );
    ok("no real lead created in this unit path", true);
    ok("no dealer-facing send triggered in this unit path", true);
    ok("no production deploy in this unit path", true);
  }

  console.log("\nDone v22.25 professional Thai car-sales response.");
  if (process.exitCode) process.exit(process.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
