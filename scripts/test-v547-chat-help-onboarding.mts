/**
 * v5.4.7b — in-chat help & onboarding
 * npm run test:v547-chat-help-onboarding
 */
import {
  detectHelpOnboardingTopic,
  buildHelpOnboardingReply,
  tryHelpOnboardingReply,
} from "../src/services/ai/chat/chatHelpOnboardingTemplates.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { isFinanceCalculatorIntent } from "../src/services/ai/chat/chatBuyerFinanceCalculator.ts";
import { detectTroubleshootingTopic } from "../src/services/ai/chat/chatTroubleshootingAdvisorTemplates.ts";
import { detectInsuranceAdvisorTopic } from "../src/services/ai/chat/chatInsuranceAdvisorTemplates.ts";
import { detectBuyerAdvisorTopic } from "../src/services/ai/chat/chatBuyerAdvisorTemplates.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";

const INVENTORY: ChatInventoryCar[] = [
  {
    id: "car-camry",
    title: "Toyota Camry",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 850000,
    mileage: 120000,
    transmission: "AT",
    fuelType: "gasoline",
    bodyType: "sedan",
    images: [],
  },
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v5.4.7b chat help & onboarding ===\n");

const cases: {
  q: string;
  topic: NonNullable<ReturnType<typeof detectHelpOnboardingTopic>>;
  expectSnippet: RegExp;
  noMax10?: boolean;
  threeCore?: boolean;
  optionalNotRequired?: boolean;
  privacyWarning?: boolean;
}[] = [
  {
    q: "ใช้งานยังไง",
    topic: "generalHelp",
    expectSnippet: /ค้นหารถ|คำนวณค่างวด/,
  },
  {
    q: "น้องเอทำอะไรได้บ้าง",
    topic: "generalHelp",
    expectSnippet: /ช่วยสร้างประกาศ|คัดลอกโพสต์/,
  },
  {
    q: "อยากขายรถต้องทำยังไง",
    topic: "sellerOnboarding",
    expectSnippet: /3\s*มุม|ร่างประกาศ|ลงตลาด/,
  },
  {
    q: "ต้องส่งรูปกี่รูป",
    topic: "sellerPhotos",
    expectSnippet: /3\s*มุม|หน้ารถ|ร่างประกาศ/,
    noMax10: true,
    threeCore: true,
    optionalNotRequired: true,
    privacyWarning: true,
  },
  {
    q: "อยากซื้อรถต้องถามอะไรได้บ้าง",
    topic: "buyerOnboarding",
    expectSnippet: /Camry|ค่างวด|ซื้อรถมือสอง/,
  },
  {
    q: "ต้องสมัครสมาชิกไหม",
    topic: "accountPilot",
    expectSnippet: /รอบทดลอง|ยังไม่เปิดสมัคร/,
  },
];

for (const { q, topic, expectSnippet, noMax10, threeCore, optionalNotRequired, privacyWarning } of cases) {
  ok(`detect-${topic}`, detectHelpOnboardingTopic(q) === topic, q);
  const body = buildHelpOnboardingReply(topic);
  ok(`body-${topic}`, expectSnippet.test(body), body.slice(0, 80));
  if (noMax10) {
    ok(`no-max-10-selling-${topic}`, !/10\s*รูป|สูงสุด\s*10|max\s*10/i.test(body), body);
  }
  if (threeCore) {
    ok(
      `three-core-draft-${topic}`,
      /3\s*มุม/.test(body) && /หน้ารถ/.test(body) && /ด้านข้าง/.test(body) && /ด้านหลัง/.test(body) && /ร่างประกาศ/.test(body),
      body.slice(0, 120)
    );
    ok(
      `clear-full-car-${topic}`,
      /ชัด|เต็ม/.test(body),
      body.slice(0, 120)
    );
  }
  if (optionalNotRequired) {
    ok(
      `optional-not-required-${topic}`,
      /ไม่บังคับ/.test(body) && /น่าเชื่อถือ/.test(body),
      body.slice(0, 120)
    );
    ok(
      `no-mandatory-5-6-${topic}`,
      !/(?:ต้อง|ควร).{0,20}(?:5.?6|ห้า.?หก)\s*รูป|ครบ\s*5.?6/i.test(body),
      body.slice(0, 120)
    );
    ok(
      `accept-more-than-3-${topic}`,
      /มากกว่า\s*3|ส่ง(?:รูป)?มาได้เลย/.test(body),
      body.slice(0, 120)
    );
  }
  if (privacyWarning) {
    ok(
      `privacy-soft-${topic}`,
      /เอกสาร|ใบหน้า/.test(body) && /ป้ายทะเบียน/.test(body),
      body.slice(0, 120)
    );
  }
  const orch = tryOrchestrateChatReply(q, INVENTORY);
  ok(`orch-${topic}-skip`, orch?.skipGemini === true, "");
  ok(`orch-${topic}-no-cards`, (orch?.carCards.length ?? 0) === 0, "");
}

ok(
  "advisor-not-help",
  detectHelpOnboardingTopic("ซื้อรถมือสองต้องดูอะไร") == null &&
    detectBuyerAdvisorTopic("ซื้อรถมือสองต้องดูอะไร") === "prePurchase",
  ""
);

const orchSearch = tryOrchestrateChatReply(
  "มี Camry ไม่เกิน 1 ล้านไหม",
  INVENTORY
);
ok("search-still", (orchSearch?.carCards.length ?? 0) >= 1, "");

ok(
  "finance-still",
  isFinanceCalculatorIntent(
    "รถราคา 500,000 ดาวน์ 20% ผ่อน 60 เดือน ดอก 5% ผ่อนเท่าไหร่"
  ),
  ""
);
ok(
  "troubleshoot-still",
  detectTroubleshootingTopic("รถสตาร์ทไม่ติดทำไง") === "wontStart",
  ""
);
ok(
  "insurance-still",
  detectInsuranceAdvisorTopic("พ.ร.บ. คืออะไร") === "compulsoryInsurance",
  ""
);

ok("try-reply", tryHelpOnboardingReply("สอนใช้หน่อย") != null, "");

const sellerPhotosBody = buildHelpOnboardingReply("sellerPhotos");
ok(
  "no-legal-claim-sellerPhotos",
  !/กฎหมายกำหนด|ตามกฎหมาย/.test(sellerPhotosBody),
  sellerPhotosBody.slice(0, 80)
);

const sellerOnboardingBody = buildHelpOnboardingReply("sellerOnboarding");
ok(
  "no-legal-claim-sellerOnboarding",
  !/กฎหมายกำหนด|ตามกฎหมาย/.test(sellerOnboardingBody),
  sellerOnboardingBody.slice(0, 80)
);
ok(
  "seller-onboarding-more-than-3",
  /มากกว่า\s*3|ส่งมาได้เลย/.test(sellerOnboardingBody),
  sellerOnboardingBody.slice(0, 120)
);

const namedPhotos = buildHelpOnboardingReply("sellerPhotos", { displayName: "สมชาย" });
ok(
  "display-name-greeting",
  /คุณพี่สมชาย/.test(namedPhotos),
  namedPhotos.slice(0, 80)
);

console.log("\n=== v5.4.7b chat help & onboarding — done ===\n");
