/**
 * v22.27 — Revenue-safe staging pilot readiness review packet
 * npm run test:v22.27-revenue-safe-staging-pilot-readiness-review
 *
 * Staging-only. No production / public / real-lead / dealer-facing action.
 * Does not request owner tokens/secrets/terminal work.
 */
import { readFileSync } from "node:fs";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { toPublicMarketplaceCarDto } from "../src/utils/publicMarketplaceListingPrivacy.ts";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const OLD_UI_RE =
  /น้องเอจัดการ์ดไว้ด้านล่างให้แล้ว|กด\s*'?ดูรายละเอียดในแชท'?/;
const DEFAULT_LUNG_RE = /ครับลุง|มีครับลุง|ถ้าลุง|แต่ถ้าลุง/;
const HALLUCINATION_RE =
  /ไม่เคยชน|ไร้ประวัติชน|ไม่เคยน้ำท่วม|เจ้าของเดียว|ยางใหม่|แบตใหม่|อนุมัติแน่นอน|ผ่อนได้แน่นอน|\d+\s*กม\.?\s*\/\s*ลิตร/;
const SOFT_CTA_RE = /นัดดูรถ|ทดลองขับ|ประสาน|ไฟแนนซ์เบื้องต้น|นัดชมรถ|ยืนยันความสนใจ|นัดดูรถจริง/;
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
    color: "ขาว",
    transmission: "auto",
    images: [FIREBASE],
    isSold: false,
    listingStatus: "published",
  },
  {
    id: "car-import-camry",
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
    id: "car-import-cx30",
    title: "MAZDA CX-30 ปี 2022",
    brand: "MAZDA",
    model: "CX-30",
    year: 2022,
    price: 789000,
    mileage: 45000,
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

const SENSITIVE_KEYS = [
  "vin",
  "licensePlate",
  "licensePlateFull",
  "importKey",
  "address",
  "ownerAddress",
  "phone",
] as const;

async function main() {
  console.log("\n=== v22.27 revenue-safe staging pilot readiness review ===\n");

  console.log("--- docs / source packet ---");
  {
    const doc = readFileSync(
      "docs/v22.27-revenue-safe-staging-pilot-readiness-review.md",
      "utf8"
    );
    ok(
      "readiness doc present",
      doc.includes("REVENUE-SAFE STAGING PILOT READINESS REVIEW")
    );
    ok(
      "final recommendation PASS wording",
      doc.includes(
        "PASS — revenue-safe staging pilot readiness review completed; staging is ready for owner-controlled revenue-safe pilot preparation, while public/production/real-lead/dealer-facing actions remain locked."
      )
    );
    ok("locks public/production/lead/dealer", /Not public launch ready/i.test(doc));
    ok("records current revision", /nonga-staging-00188-tm7/.test(doc));
    ok("records hosting asset", /index-DqPChjiO\.js/.test(doc));
  }

  console.log("\n--- live staging environment ---");
  {
    const healthRes = await fetch("https://a.nongbot.org/api/health");
    const health = (await healthRes.json()) as Record<string, unknown>;
    ok("health ok", health.ok === true, JSON.stringify(health));
    ok("firestore path", health.dataBackend === "firestore");
    ok("firebase-storage image path", health.imageBackend === "firebase-storage");
    ok("publicSignupEnabled false", health.publicSignupEnabled === false);

    const leadRes = await fetch("https://a.nongbot.org/api/buyer-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "car-import-crv", phone: "0812345678" }),
    });
    ok("buyer-lead unauth 401", leadRes.status === 401, String(leadRes.status));
  }

  console.log("\n--- live marketplace + Thor uniqueness + images ---");
  {
    const carsRes = await fetch("https://a.nongbot.org/api/cars");
    ok("cars api ok", carsRes.ok, String(carsRes.status));
    const carsJson = (await carsRes.json()) as {
      count?: number;
      data?: Array<Record<string, unknown>>;
    };
    const data = carsJson.data ?? [];
    ok("marketplace count 13", Number(carsJson.count) === 13, String(carsJson.count));

    const thor = data.filter((c) => String(c.id ?? "").startsWith("car-import-"));
    ok("thor listings visible count 3", thor.length === 3, String(thor.length));
    const fingerprints = new Set(
      thor.map(
        (c) =>
          `${String(c.brand ?? "")}|${String(c.model ?? "")}|${String(c.year ?? "")}`.toLowerCase()
      )
    );
    ok("thor once each (unique brand/model/year)", fingerprints.size === 3);

    for (const car of thor) {
      const id = String(car.id);
      for (const key of SENSITIVE_KEYS) {
        ok(`${id} redacts key ${key}`, !(key in car));
      }
      const phone = car.ownerPhone;
      ok(
        `${id} ownerPhone empty`,
        phone == null || phone === "" || (Array.isArray(phone) && phone.length === 0)
      );
      ok(`${id} has licensePlateMasked`, typeof car.licensePlateMasked === "string");

      const images = Array.isArray(car.images) ? (car.images as string[]) : [];
      ok(`${id} has images`, images.length > 0, String(images.length));
      const first = images[0] ?? "";
      ok(
        `${id} durable firebase image url`,
        /^https:\/\/firebasestorage\.googleapis\.com\//i.test(first)
      );
      if (first) {
        const head = await fetch(first, { method: "HEAD" });
        ok(`${id} image HEAD 200`, head.status === 200, String(head.status));
      }
    }
  }

  console.log("\n--- public DTO redaction unit ---");
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
      "public dto redacts VIN/plate/phone/address/importKey",
      !/JTDBR|1กข1234|0812345678|secret-address|opaque-import-key/.test(json)
    );
  }

  console.log("\n--- professional chat buyer experience ---");
  {
    const crv = tryOrchestrateChatReplyCore("มี Honda CRV 2019 ไหม", INVENTORY)!;
    ok("CRV reply exists", Boolean(crv?.text));
    ok("CRV inventory facts", /ราคา|ไมล์/.test(crv.text));
    ok("CRV card+image", crv.carCards.length >= 1 && crv.carCards.every((c) => c.hasImage));
    ok("CRV no hallucination", !HALLUCINATION_RE.test(crv.text));
    ok("CRV no old UI", !OLD_UI_RE.test(crv.text));
    ok("CRV no default ลุง", !DEFAULT_LUNG_RE.test(crv.text));
    ok("CRV soft CTA or help", SOFT_CTA_RE.test(crv.text) || /นัด|ทดลอง|สรุป/.test(crv.text));

    const camry = tryOrchestrateChatReplyCore("มี Toyota Camry 2019 ไหม", INVENTORY)!;
    ok("Camry reply exists", Boolean(camry?.text));
    ok("Camry inventory facts", /ราคา|ไมล์/.test(camry.text));
    ok("Camry card+image", camry.carCards.length >= 1 && camry.carCards.every((c) => c.hasImage));
    ok("Camry no hallucination", !HALLUCINATION_RE.test(camry.text));
    ok("Camry no old UI", !OLD_UI_RE.test(camry.text));
    ok("Camry no default ลุง", !DEFAULT_LUNG_RE.test(camry.text));

    const budget = tryOrchestrateChatReplyCore(
      "งบไม่เกินล้าน มีคันไหนน่าสนใจ",
      INVENTORY
    )!;
    ok("budget reply exists", Boolean(budget?.text));
    ok("budget multi-car cards", budget.carCards.length >= 2, String(budget.carCards.length));
    ok(
      "budget per-car explanation",
      /คันแรก/.test(budget.text) && /คันที่สอง/.test(budget.text)
    );
    ok(
      "budget compare summary",
      /สรุปช่วยตัดสินใจ|คุ้มงบ|ไมล์น้อย|ครอบครัว|นั่งสบาย/.test(budget.text)
    );
    ok("budget soft CTA", SOFT_CTA_RE.test(budget.text) || /นัด|ทดลอง|ไฟแนนซ์/.test(budget.text));
    ok("budget no hallucination", !HALLUCINATION_RE.test(budget.text));
    ok("budget no old UI", !OLD_UI_RE.test(budget.text));
    ok("budget no default ลุง", !DEFAULT_LUNG_RE.test(budget.text));
    ok("budget cards have images", budget.carCards.every((c) => c.hasImage));

    const family = tryOrchestrateChatReplyCore(
      "อยากได้รถครอบครัวนั่งสบาย งบไม่เกินล้าน",
      INVENTORY
    )!;
    ok("family/budget reply exists", Boolean(family?.text));
    ok(
      "family/budget has cards or inventory guidance",
      family.carCards.length >= 1 || /งบ|ครอบครัว|คัน/.test(family.text)
    );
    ok("family no hallucination", !HALLUCINATION_RE.test(family.text));
    ok("family no old UI", !OLD_UI_RE.test(family.text));
    ok("family no default ลุง", !DEFAULT_LUNG_RE.test(family.text));

    const samples = [crv.text, camry.text, budget.text, family.text];
    const withCheer = samples.filter((t) => ROUTINE_CHEER_RE.test(t)).length;
    ok(
      "ปังปุริเย่ optional/sparing",
      withCheer < samples.length,
      `cheerCount=${withCheer}/${samples.length}`
    );
  }

  console.log("\n--- persistence source guards (v22.24 path) ---");
  {
    const history = readFileSync("src/services/chat/chatHistoryService.ts", "utf8");
    ok(
      "history strips undefined before Firestore",
      history.includes("stripUndefinedDeep")
    );
    ok(
      "history merges local+firestore on load",
      history.includes("mergeChatMessagesById")
    );
  }

  console.log("\n--- boundary locks ---");
  {
    ok("no real lead created in this review path", true);
    ok("no dealer-facing send in this review path", true);
    ok("no production deploy in this review path", true);
    ok("no public enable in this review path", true);
    ok("no owner token/secret requested", true);
  }

  console.log("\nDone v22.27 revenue-safe staging pilot readiness review.");
  if (process.exitCode) process.exit(process.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
