/**
 * v5.4.6.3 — buyer chat finance calculator
 * npm run test:v546-finance-calculator-chat
 */
import {
  calculateFlatRateFinance,
  compareFlatRateTerms,
  resolveDownPayment,
  estimateCarPriceFromMaxMonthly,
} from "../src/utils/financeCalculator.ts";
import {
  isFinanceCalculatorIntent,
  parseFinanceQuery,
  buildBuyerFinanceCalculatorReply,
  CHAT_FINANCE_DISCLAIMER,
} from "../src/services/ai/chat/chatBuyerFinanceCalculator.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { detectBuyerAdvisorTopic } from "../src/services/ai/chat/chatBuyerAdvisorTemplates.ts";
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

console.log("=== v5.4.6.3 finance calculator chat ===\n");

// --- unit: flat rate math ---
const downPct = resolveDownPayment(500_000, { downPaymentPercent: 20 });
ok("down-20pct-amount", downPct.downPaymentBaht === 100_000, String(downPct.downPaymentBaht));
ok("down-20pct-loan", downPct.loanAmount === 400_000, String(downPct.loanAmount));

const downAmt = resolveDownPayment(650_000, { downPaymentBaht: 100_000 });
ok("down-100k-amount", downAmt.downPaymentBaht === 100_000, "");
ok("down-100k-loan", downAmt.loanAmount === 550_000, "");

const inst = calculateFlatRateFinance({
  carPrice: 500_000,
  downPaymentPercent: 20,
  annualFlatRatePercent: 5,
  termMonths: 60,
});
ok(
  "flat-monthly-60m",
  inst.monthlyInstallment === 8333,
  String(inst.monthlyInstallment)
);
ok("flat-total-interest", inst.totalInterest === 100_000, String(inst.totalInterest));

const compared = compareFlatRateTerms(
  {
    carPrice: 500_000,
    downPaymentPercent: 20,
    annualFlatRatePercent: 5,
  },
  [48, 60, 72]
);
ok("compare-3-terms", compared.length === 3, "");
ok(
  "compare-48-lt-72",
  compared[0].monthlyInstallment > compared[2].monthlyInstallment,
  `${compared[0].monthlyInstallment} vs ${compared[2].monthlyInstallment}`
);

const maxPrice = estimateCarPriceFromMaxMonthly({
  maxMonthlyBaht: 10_000,
  termMonths: 60,
  annualFlatRatePercent: 5,
  downPaymentPercent: 20,
});
ok("max-price-estimate", maxPrice != null && maxPrice > 400_000, String(maxPrice));

// --- parser ---
ok(
  "intent-full-calc",
  isFinanceCalculatorIntent(
    "รถราคา 500,000 ดาวน์ 20% ผ่อน 60 เดือน ดอก 5% ผ่อนเท่าไหร่"
  ),
  ""
);
ok(
  "intent-not-finance-prep",
  !isFinanceCalculatorIntent("ไฟแนนซ์ต้องเตรียมอะไร"),
  ""
);
ok(
  "intent-selected-car-needs-trusted-price",
  !isFinanceCalculatorIntent("คันนี้ผ่อนประมาณเท่าไร"),
  ""
);
ok(
  "intent-selected-car-with-trusted-price",
  isFinanceCalculatorIntent("คันนี้ผ่อนประมาณเท่าไร", {
    trustedSelectedCarPrice: 639_000,
  }),
  ""
);
ok(
  "advisor-finance-prep-still",
  detectBuyerAdvisorTopic("ไฟแนนซ์ต้องเตรียมอะไร") === "financePrep",
  ""
);

const missingDown = buildBuyerFinanceCalculatorReply("รถ 500,000 ผ่อนเท่าไหร่");
ok("missing-down-asks", missingDown != null && /ดาวน์|20%|60 เดือน/.test(missingDown), missingDown?.slice(0, 80));

const selectedMissing = buildBuyerFinanceCalculatorReply("คันนี้ผ่อนประมาณเท่าไร", {
  trustedSelectedCarPrice: 639_000,
});
ok(
  "selected-trusted-price-in-follow-up",
  selectedMissing != null && /639,?000|639000/.test(selectedMissing),
  selectedMissing?.slice(0, 100)
);
ok(
  "selected-asks-down-or-term",
  selectedMissing != null && /ดาวน์|ระยะผ่อน|เดือน/.test(selectedMissing),
  ""
);

const missingTerm = buildBuyerFinanceCalculatorReply("รถ 650,000 ดาวน์ 100,000 ดอก 4.5");
ok("missing-term-asks", missingTerm != null && /ระยะผ่อน|เดือน/.test(missingTerm), "");

const fullReply = buildBuyerFinanceCalculatorReply(
  "รถราคา 500,000 ดาวน์ 20% ผ่อน 60 เดือน ดอก 5% ผ่อนเท่าไหร่"
);
ok("full-reply-has-monthly", /8,?333|8333/.test(fullReply ?? ""), fullReply?.slice(0, 120));
ok("full-reply-disclaimer", fullReply?.includes(CHAT_FINANCE_DISCLAIMER.slice(0, 20)) ?? false, "");

const compareReply = buildBuyerFinanceCalculatorReply(
  "รถ 650,000 ดาวน์ 100,000 ดาวน์ 20% ผ่อน 48 กับ 60 กับ 72 เดือน ดอก 4.5 ต่างกันเท่าไหร่"
);
// fix test message - use clean compare message
const compareReply2 = buildBuyerFinanceCalculatorReply(
  "รถราคา 650,000 ดาวน์ 20% ผ่อน 48 กับ 60 กับ 72 เดือน ดอก 4.5 ต่างกันเท่าไหร่"
);
ok("compare-reply-list", compareReply2 != null && /48 เดือน/.test(compareReply2) && /72 เดือน/.test(compareReply2), compareReply2?.slice(0, 100));

// --- orchestrator ---
const orchFinance = tryOrchestrateChatReply(
  "รถราคา 500,000 ดาวน์ 20% ผ่อน 60 เดือน ดอก 5% ผ่อนเท่าไหร่",
  INVENTORY_CAMRY
);
ok("orch-finance-skip-gemini", orchFinance?.skipGemini === true, "");
ok("orch-finance-no-cards", (orchFinance?.carCards.length ?? 0) === 0, "");
ok("orch-finance-disclaimer", /ประเมินเบื้องต้น/.test(orchFinance?.text ?? ""), "");

const orchSearch = tryOrchestrateChatReply(
  "มี Camry ไม่เกิน 1 ล้านไหม",
  INVENTORY_CAMRY
);
ok(
  "orch-search-still-cards",
  (orchSearch?.carCards.length ?? 0) >= 1,
  String(orchSearch?.carCards.length)
);

const orchAdvisor = tryOrchestrateChatReply("ไฟแนนซ์ต้องเตรียมอะไร", INVENTORY_CAMRY);
ok("orch-advisor-prep", orchAdvisor != null && /บัตรประชาชน/.test(orchAdvisor.text), "");

console.log("\n=== v5.4.6.3 finance calculator chat — done ===\n");
