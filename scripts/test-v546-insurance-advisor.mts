/**
 * v5.4.6.5 — insurance advisor in buyer chat
 * npm run test:v546-insurance-advisor
 */
import {
  detectInsuranceAdvisorTopic,
  buildInsuranceAdvisorReply,
  tryInsuranceAdvisorReply,
  INSURANCE_ADVISOR_DISCLAIMER,
  shouldDeferInsuranceForSearch,
} from "../src/services/ai/chat/chatInsuranceAdvisorTemplates.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { detectBuyerAdvisorTopic } from "../src/services/ai/chat/chatBuyerAdvisorTemplates.ts";
import { isFinanceCalculatorIntent } from "../src/services/ai/chat/chatBuyerFinanceCalculator.ts";
import { detectTroubleshootingTopic } from "../src/services/ai/chat/chatTroubleshootingAdvisorTemplates.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";

const INVENTORY_CAMRY: ChatInventoryCar[] = [
  {
    id: "car-toyota-camry",
    title: "Toyota Camry",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 850000,
    mileage: 120384,
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

console.log("=== v5.4.6.5 insurance advisor ===\n");

const cases: {
  q: string;
  topic: NonNullable<ReturnType<typeof detectInsuranceAdvisorTopic>>;
  expectSnippet: RegExp;
}[] = [
  {
    q: "พ.ร.บ. คืออะไร",
    topic: "compulsoryInsurance",
    expectSnippet: /ภาคบังคับ|พรบ/,
  },
  {
    q: "ประกันชั้น 1 คืออะไร",
    topic: "class1Definition",
    expectSnippet: /ชั้น 1|คุ้มครองกว้าง/,
  },
  {
    q: "ประกันชั้น 1 กับ 2+ ต่างกันยังไง",
    topic: "class1Vs2Plus",
    expectSnippet: /ชั้น 1|2\+/,
  },
  {
    q: "2+ กับ 3+ ต่างกันยังไง",
    topic: "class2PlusVs3Plus",
    expectSnippet: /2\+|3\+/,
  },
  {
    q: "รถเก่าควรทำประกันชั้นไหน",
    topic: "oldCarInsurance",
    expectSnippet: /รถเก่|2\+|3\+/,
  },
  {
    q: "ซ่อมห้างกับซ่อมอู่ต่างกันยังไง",
    topic: "dealerVsGarageRepair",
    expectSnippet: /ห้าง|อู่/,
  },
  {
    q: "ทุนประกันคืออะไร",
    topic: "sumInsured",
    expectSnippet: /ทุนประกัน|Sum Insured/,
  },
  {
    q: "ค่าเสียหายส่วนแรกคืออะไร",
    topic: "deductible",
    expectSnippet: /ส่วนแรก|Deductible/,
  },
];

for (const { q, topic, expectSnippet } of cases) {
  ok(`detect-${topic}`, detectInsuranceAdvisorTopic(q) === topic, q);
  const body = buildInsuranceAdvisorReply(topic);
  ok(`body-${topic}`, expectSnippet.test(body), body.slice(0, 70));
  ok(`disclaimer-${topic}`, body.includes(INSURANCE_ADVISOR_DISCLAIMER.slice(0, 20)), "");
  const orch = tryOrchestrateChatReply(q, INVENTORY_CAMRY);
  ok(`orch-${topic}-skip-gemini`, orch?.skipGemini === true, "");
  ok(`orch-${topic}-no-cards`, (orch?.carCards.length ?? 0) === 0, "");
}

ok(
  "buyer-advisor-no-insurance",
  detectBuyerAdvisorTopic("พ.ร.บ. คืออะไร") == null,
  ""
);
ok(
  "finance-calc-still",
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
  "defer-search",
  tryInsuranceAdvisorReply("มี Camry ไม่เกิน 1 ล้านไหม") == null,
  ""
);
const orchSearch = tryOrchestrateChatReply(
  "มี Camry ไม่เกิน 1 ล้านไหม",
  INVENTORY_CAMRY
);
ok("orch-search-still", (orchSearch?.carCards.length ?? 0) >= 1, "");

ok(
  "try-reply-prb",
  tryInsuranceAdvisorReply("พ.ร.บ. คืออะไร") != null,
  ""
);

console.log("\n=== v5.4.6.5 insurance advisor — done ===\n");
