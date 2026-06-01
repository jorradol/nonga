/**
 * v5.4.6.4 — troubleshooting advisor in buyer chat
 * npm run test:v546-troubleshooting-advisor
 */
import {
  detectTroubleshootingTopic,
  buildTroubleshootingAdvisorReply,
  resolveTroubleshootingTier,
  TROUBLESHOOTING_GUIDES,
  TROUBLESHOOTING_DISCLAIMER,
  tryTroubleshootingAdvisorReply,
  shouldDeferTroubleshootingForSearch,
} from "../src/services/ai/chat/chatTroubleshootingAdvisorTemplates.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { detectBuyerAdvisorTopic } from "../src/services/ai/chat/chatBuyerAdvisorTemplates.ts";
import { isFinanceCalculatorIntent } from "../src/services/ai/chat/chatBuyerFinanceCalculator.ts";
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

console.log("=== v5.4.6.4 troubleshooting advisor ===\n");

const cases: {
  q: string;
  topic: ReturnType<typeof detectTroubleshootingTopic>;
  expectWarning?: boolean;
  expectHigh?: boolean;
}[] = [
  { q: "รถสตาร์ทไม่ติดทำไง", topic: "wontStart" },
  { q: "เครื่องสั่นเกิดจากอะไร", topic: "engineVibration" },
  { q: "เบรกดังอันตรายไหม", topic: "brakeNoise", expectWarning: true },
  { q: "แอร์ไม่เย็นเกิดจากอะไร", topic: "acNotCold" },
  { q: "ไฟ engine โชว์", topic: "checkEngine", expectWarning: true },
  { q: "รถควันขาว", topic: "whiteSmoke", expectHigh: true },
  { q: "รถกินน้ำมันผิดปกติ", topic: "fuelConsumption" },
  { q: "มีเสียงช่วงล่าง", topic: "suspensionNoise" },
  { q: "รถความร้อนขึ้น", topic: "overheating", expectHigh: true },
];

for (const { q, topic, expectWarning, expectHigh } of cases) {
  ok(`detect-${topic}`, detectTroubleshootingTopic(q) === topic, q);
  const reply = buildTroubleshootingAdvisorReply(topic!, q);
  ok(`reply-${topic}-disclaimer`, reply.includes(TROUBLESHOOTING_DISCLAIMER.slice(0, 15)), "");
  ok(`reply-${topic}-causes`, /•/.test(reply), "");
  if (expectWarning) {
    ok(`reply-${topic}-warning`, /ช่าง|หยุด|อันตราย|ความเสี่ยง/.test(reply), reply.slice(0, 80));
  }
  if (expectHigh) {
    const guide = TROUBLESHOOTING_GUIDES.find((g) => g.topic === topic)!;
    ok(
      `tier-${topic}-high`,
      resolveTroubleshootingTier(guide, q) === "high",
      resolveTroubleshootingTier(guide, q)
    );
  }
  const orch = tryOrchestrateChatReply(q, INVENTORY_CAMRY);
  ok(`orch-${topic}-skip-gemini`, orch?.skipGemini === true, "");
  ok(`orch-${topic}-no-cards`, (orch?.carCards.length ?? 0) === 0, "");
}

ok(
  "search-not-deferred",
  !shouldDeferTroubleshootingForSearch("มี Camry ไม่เกิน 1 ล้านไหม") === false,
  ""
);
const orchSearch = tryOrchestrateChatReply(
  "มี Camry ไม่เกิน 1 ล้านไหม",
  INVENTORY_CAMRY
);
ok("orch-search-still", (orchSearch?.carCards.length ?? 0) >= 1, "");

ok(
  "advisor-prep-still",
  detectBuyerAdvisorTopic("ไฟแนนซ์ต้องเตรียมอะไร") === "financePrep",
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
  "try-reply-wont-start",
  tryTroubleshootingAdvisorReply("รถสตาร์ทไม่ติดทำไง") != null,
  ""
);
ok(
  "defer-search-no-troubleshoot",
  tryTroubleshootingAdvisorReply("มี Camry ไม่เกิน 1 ล้านไหม") == null,
  ""
);

console.log("\n=== v5.4.6.4 troubleshooting advisor — done ===\n");
