/**
 * Nong A Chat First Phase 1
 * npm run test:nonga-chat-first-phase1
 */
import {
  buildListingDescriptionFromSpecs,
  buildListingDescriptionReply,
  isListingDescriptionIntent,
  looksLikeRawSpecText,
} from "../src/services/ai/chat/listingDescriptionHelper.ts";
import {
  formatMarketplaceSearchReply,
  isMarketplaceSearchIntent,
  parseMarketplaceSearchQuery,
  searchMarketplaceForChat,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { buildMockChatReply } from "../src/services/ai/chatMockFallback.ts";
import {
  carSellingFormSchema,
  carSellingPublishSchema,
  isDescriptionReadyForPublish,
} from "../src/validators/carForm.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const MOCK_CARS: ChatInventoryCar[] = [
  {
    id: "car-honda-crv-2019",
    title: "Honda CR-V 2019",
    brand: "Honda",
    model: "CR-V",
    year: 2019,
    price: 699000,
    type: "used",
    mileage: 161392,
    fuelType: "petrol",
    color: "ดำ",
    images: ["/storage/listings/car-honda-crv-2019/01-a.webp"],
    ownerName: "Dealer",
    showroomName: "Thor Auto",
    isSold: false,
    listingStatus: "published",
  },
  {
    id: "car-toyota-fortuner",
    title: "Toyota Fortuner",
    brand: "Toyota",
    model: "Fortuner",
    year: 2020,
    price: 1200000,
    type: "used",
    mileage: 80000,
    fuelType: "diesel",
    color: "ขาว",
    images: [],
    ownerName: "Seller",
    isSold: false,
    listingStatus: "published",
  },
];

const RAW_SPEC =
  "บ.หนังปรับไfiฟ้า + จอทัชสกรีn + ฝาท้ายไfiฟ้า";

async function main() {
  console.log("=== Nong A Chat First Phase 1 ===\n");

  // Case 1: raw spec → sales copy
  ok("1-intent-raw-spec", looksLikeRawSpecText(RAW_SPEC), "");
  const desc = buildListingDescriptionFromSpecs({ rawSpecs: RAW_SPEC });
  ok("1-not-raw-only", desc.length > 40 && !desc.includes("+"), desc.slice(0, 80));
  ok(
    "1-professional-tone",
    /ออปชัน|ใช้งาน|พร้อม/.test(desc),
    ""
  );
  const reply = buildListingDescriptionReply({ rawSpecs: RAW_SPEC });
  ok("1-closing-pang", reply.includes("ปังปุริเย่"), "");

  // Case 2: empty description publish UX
  const draftForm = {
    brand: "Honda",
    model: "City",
    year: 2020,
    province: "กรุงเทพมหานคร",
    mileage: 40000,
    bodyType: "Sedan",
    transmission: "auto" as const,
    fuelType: "petrol" as const,
    color: "ขาว",
    condition: "excellent" as const,
    price: 450000,
    negotiable: true,
    description: "",
    features: [],
    tags: [],
    images: ["https://example.com/a.jpg"],
    coverImage: "https://example.com/a.jpg",
    contactName: "ทดสอบ",
    contactPhone: "0812345678",
    contactEmail: "",
    sellerType: "private" as const,
  };
  ok("2-form-no-harsh-desc", carSellingFormSchema.safeParse(draftForm).success, "");
  ok("2-publish-needs-desc", !isDescriptionReadyForPublish(""), "");
  const pub = carSellingPublishSchema.safeParse(draftForm);
  ok(
    "2-soft-publish-message",
    !pub.success && pub.error.issues[0]?.message.includes("น้องเอ"),
    pub.success ? "" : pub.error.issues[0]?.message ?? ""
  );
  const templateDesc = buildListingDescriptionFromSpecs({
    ...draftForm,
    rawSpecs: "บ.หนัง + จอทัช",
  });
  ok("2-template-fill", templateDesc.length >= 10, String(templateDesc.length));

  // Case 3: Honda CR-V search
  const q3 = "มี Honda CR-V ไหม";
  ok("3-search-intent", isMarketplaceSearchIntent(q3), "");
  const c3 = parseMarketplaceSearchQuery(q3)!;
  const r3 = searchMarketplaceForChat(MOCK_CARS, c3);
  ok(
    "3-found-real",
    r3.primary.length >= 1 && r3.primary[0].id === "car-honda-crv-2019",
    r3.primary[0]?.id ?? ""
  );

  // Case 4: car not in database
  const q4 = "มี Ferrari F40 ไหม";
  const c4 = parseMarketplaceSearchQuery(q4)!;
  const r4 = searchMarketplaceForChat(MOCK_CARS, c4);
  const mock4 = buildMockChatReply(q4, MOCK_CARS);
  ok("4-not-found", r4.primary.length === 0, "");
  ok("4-no-fabricate", /ไม่พบ|ไม่มี|ยังไม่เจอ/.test(mock4), mock4.slice(0, 60));

  // Case 5: detail links
  const formatted = formatMarketplaceSearchReply(r3.primary, "Honda CR-V");
  ok("5-detail-link", formatted.includes("Honda CR-V"), formatted.slice(0, 80));

  // Mock chat listing intent
  ok(
    "mock-described-desc",
    isListingDescriptionIntent("ช่วยเขียนคำอธิบายขายรถ"),
    ""
  );
  const mockDesc = buildMockChatReply(
    "ช่วยเขียนคำอธิบายจาก บ.หนัง + จอทัช",
    MOCK_CARS
  );
  ok("mock-desc-not-raw", !mockDesc.startsWith("บ."), mockDesc.slice(0, 50));

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
