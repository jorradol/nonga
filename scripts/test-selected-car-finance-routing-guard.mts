/**
 * Selected-car finance vs accident-history routing regression guard
 * npx tsx scripts/test-selected-car-finance-routing-guard.mts
 *
 * Proves:
 * A. Selected vehicle + finance → calculator path (trusted inventory price)
 * B. Selected vehicle + accident history → unknownHistory fail-closed
 * C. Selected vehicle + inspection → prePurchaseCheck (not finance/history)
 * D. No selection + contextual finance/history → ask which car
 * E. Explicit deselect → askWhichCarReply (no silent A/B fallback)
 * F. Classic brain = same orchestrator (no accident copy on finance)
 */
const memoryStore = new Map<string, string>();
(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memoryStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    memoryStore.delete(k);
  },
  clear: () => memoryStore.clear(),
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
  get length() {
    return memoryStore.size;
  },
};

import type { ChatCarCardData } from "../src/types";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  classifyBuyerFactsQuestion,
} from "../src/services/ai/chat/chatBuyerFactsQa.ts";
import {
  CHAT_FINANCE_DISCLAIMER,
  isFinanceCalculatorIntent,
  isSelectedCarFinanceIntent,
  buildBuyerFinanceCalculatorReply,
} from "../src/services/ai/chat/chatBuyerFinanceCalculator.ts";
import {
  tryOrchestrateChatReplyCore,
} from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  clearLastSelectedCarId,
  saveChatCarContext,
  saveLastSelectedCarId,
  setActivePilotChatSessionId,
} from "../src/utils/chatCarContext.ts";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail ? detail.slice(0, 120) : "");
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail.slice(0, 200));
  process.exitCode = 1;
}

const HISTORY_LEAK =
  /ประวัติชน|อุบัติเหตุ|เคยชน|ระบบยังไม่มี(?:ข้อมูล)?ประวัติชน|ประวัติเคลม/;
const ASK_WHICH =
  /หมายถึงรถคันไหน|กดเลือกรถจากการ์ด|กดดูรายละเอียดรถคันที่สนใจ/;
const FINANCE_MARK =
  /ประเมินเบื้องต้น|ค่างวด|ดาวน์|ผ่อน|ไฟแนนซ์|ดอกเบี้ย/;

const inventory: ChatInventoryCar[] = [
  {
    id: "mazda-cx30-2022",
    title: "MAZDA CX-30 2022",
    brand: "MAZDA",
    model: "CX-30",
    year: 2022,
    price: 639000,
    mileage: 42000,
    bodyType: "SUV",
    images: ["https://example.com/cx30.webp"],
  },
  {
    id: "listing-b",
    title: "Honda City 2021",
    brand: "Honda",
    model: "City",
    year: 2021,
    price: 429000,
    mileage: 50000,
    bodyType: "Sedan",
    images: ["https://example.com/city.webp"],
  },
];

const contextCards: ChatCarCardData[] = inventory.map((c) => ({
  id: c.id,
  brand: c.brand,
  model: c.model,
  year: c.year,
  price: c.price,
  mileage: c.mileage ?? 0,
  bodyClass: "suv",
  bodyClassLabel: "รถ SUV",
  hasImage: true,
  imageUrl: c.images?.[0],
  detailPath: `/cars/${c.id}`,
  matchKind: "exact" as const,
}));

const SESSION = "finance-routing-room";

function orch(message: string) {
  return tryOrchestrateChatReplyCore(message, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: contextCards,
  });
}

function setupSelected(id: string) {
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);
  saveChatCarContext(contextCards, SESSION);
  saveLastSelectedCarId(id, SESSION);
}

console.log("=== selected-car finance routing guard ===\n");

// --- Classifier unit ---
ok(
  "classify-finance-installment-not-history",
  classifyBuyerFactsQuestion("คันนี้ผ่อนประมาณเท่าไร") === "none"
);
ok(
  "classify-finance-arrange-not-history",
  classifyBuyerFactsQuestion("คันนี้จัดไฟแนนซ์ได้ไหม") === "none"
);
ok(
  "classify-crash-still-history",
  classifyBuyerFactsQuestion("รถคันนี้เคยชนไหม") === "unknownHistory"
);
ok(
  "classify-accident-history",
  classifyBuyerFactsQuestion("มีประวัติอุบัติเหตุหรือเปล่า") === "unknownHistory"
);
ok(
  "classify-claim-history",
  classifyBuyerFactsQuestion("เคยเคลมหนักไหม") === "unknownHistory"
);
ok(
  "classify-inspection-prepurchase",
  classifyBuyerFactsQuestion("รถคันนี้มีจุดไหนควรตรวจสอบก่อนซื้อ") ===
    "prePurchaseCheck"
);

ok(
  "intent-selected-finance-without-price-text",
  isSelectedCarFinanceIntent("คันนี้ผ่อนประมาณเท่าไร")
);
ok(
  "intent-calc-with-trusted-price",
  isFinanceCalculatorIntent("คันนี้ผ่อนประมาณเท่าไร", {
    trustedSelectedCarPrice: 639000,
  })
);
ok(
  "intent-calc-without-trusted-still-false",
  !isFinanceCalculatorIntent("คันนี้ผ่อนประมาณเท่าไร")
);

const sampleReply = buildBuyerFinanceCalculatorReply("คันนี้ผ่อนประมาณเท่าไร", {
  trustedSelectedCarPrice: 639000,
});
ok(
  "sample-uses-trusted-639000",
  sampleReply != null && /639,?000|639000/.test(sampleReply),
  sampleReply?.slice(0, 160) ?? "null"
);
ok(
  "sample-has-disclaimer",
  sampleReply != null && sampleReply.includes(CHAT_FINANCE_DISCLAIMER.slice(0, 24)),
  sampleReply?.slice(0, 80) ?? "null"
);
ok(
  "sample-no-approval-guarantee",
  sampleReply != null && !/อนุมัติแน่นอน|ผ่านชัวร์|การันตี/.test(sampleReply)
);

// --- A. Selected + finance ---
const financeQs = [
  "คันนี้ผ่อนประมาณเท่าไร",
  "ค่างวดคันนี้เท่าไร",
  "ดาวน์ 20% ผ่อน 60 เดือนเท่าไร",
  "คันนี้จัดไฟแนนซ์ได้ไหม",
] as const;

setupSelected("mazda-cx30-2022");
for (const q of financeQs) {
  const reply = orch(q);
  const text = reply?.text ?? "";
  const ids = (reply?.carCards ?? []).map((c) => c.id);
  ok(
    `A-finance::${q}`,
    reply?.skipGemini === true &&
      ids.includes("mazda-cx30-2022") &&
      !ids.includes("listing-b") &&
      FINANCE_MARK.test(text) &&
      !HISTORY_LEAK.test(text) &&
      /639,?000|639000/.test(text) &&
      /ประเมินเบื้องต้น|ไม่ใช่ผลอนุมัติ/.test(text),
    `ids=${JSON.stringify(ids)} text=${text.slice(0, 140)}`
  );
}

// --- B. Selected + accident history ---
setupSelected("mazda-cx30-2022");
for (const q of [
  "รถคันนี้เคยชนไหม",
  "มีประวัติอุบัติเหตุหรือเปล่า",
  "เคยเคลมหนักไหม",
] as const) {
  const reply = orch(q);
  const text = reply?.text ?? "";
  ok(
    `B-history::${q}`,
    reply?.skipGemini === true &&
      HISTORY_LEAK.test(text) &&
      !/ค่างวดโดยประมาณ|ยอดจัดประมาณ/.test(text) &&
      !ASK_WHICH.test(text),
    text.slice(0, 140)
  );
}

// --- C. Inspection ---
setupSelected("mazda-cx30-2022");
{
  const reply = orch("รถคันนี้มีจุดไหนควรตรวจสอบก่อนซื้อ");
  const text = reply?.text ?? "";
  ok(
    "C-inspection-prepurchase",
    reply?.skipGemini === true &&
      /ตรวจ|เล่ม|ช่าง|ช่วงล่าง|เครื่อง/.test(text) &&
      !HISTORY_LEAK.test(text) &&
      !/ค่างวดโดยประมาณ|ยอดจัดประมาณ/.test(text),
    text.slice(0, 140)
  );
}

// --- D. No selection ---
memoryStore.clear();
setActivePilotChatSessionId(SESSION);
saveChatCarContext(contextCards, SESSION);
for (const q of [
  "คันนี้ผ่อนประมาณเท่าไร",
  "ค่างวดคันนี้เท่าไร",
  "รถคันนี้เคยชนไหม",
] as const) {
  const reply = orch(q);
  const text = reply?.text ?? "";
  const ids = (reply?.carCards ?? []).map((c) => c.id);
  ok(
    `D-no-selection::${q}`,
    ids.length === 0 &&
      !/mazda-cx30-2022|listing-b|CX-30|Honda City/i.test(text) &&
      ASK_WHICH.test(text) &&
      !/TypeError|ReferenceError|undefined is not/i.test(text),
    `ids=${JSON.stringify(ids)} text=${text.slice(0, 120)}`
  );
}

// --- E. Explicit deselect ---
setupSelected("mazda-cx30-2022");
clearLastSelectedCarId(SESSION);
memoryStore.set(
  "nonga_chat_recently_viewed_cars",
  JSON.stringify(["mazda-cx30-2022", "listing-b"])
);
for (const q of [
  "คันนี้ผ่อนประมาณเท่าไร",
  "ค่างวดคันนี้เท่าไร",
  "คันนี้จัดไฟแนนซ์ได้ไหม",
] as const) {
  const reply = orch(q);
  const text = reply?.text ?? "";
  const ids = (reply?.carCards ?? []).map((c) => c.id);
  ok(
    `E-deselect::${q}`,
    ids.length === 0 &&
      !/mazda-cx30-2022|listing-b|CX-30|Honda City|Corolla/i.test(text) &&
      /หมายถึงรถคันไหน|กดเลือกรถจากการ์ด/.test(text),
    `ids=${JSON.stringify(ids)} text=${text.slice(0, 120)}`
  );
}

// --- F. Classic brain (same orchestrator) — finance must not leak history ---
setupSelected("mazda-cx30-2022");
{
  const reply = orch("คันนี้ผ่อนประมาณเท่าไร");
  ok(
    "F-classic-finance-not-history",
    reply != null &&
      FINANCE_MARK.test(reply.text) &&
      !HISTORY_LEAK.test(reply.text)
  );
  const hist = orch("รถคันนี้เคยชนไหม");
  ok(
    "F-classic-history-still-fail-closed",
    hist != null && HISTORY_LEAK.test(hist.text)
  );
}

// Change A → B still uses B price
setupSelected("mazda-cx30-2022");
saveLastSelectedCarId("listing-b", SESSION);
{
  const reply = orch("ค่างวดคันนี้เท่าไร");
  const text = reply?.text ?? "";
  const ids = (reply?.carCards ?? []).map((c) => c.id);
  ok(
    "change-A-to-B-uses-B-price",
    ids.includes("listing-b") &&
      /429,?000|429000/.test(text) &&
      !/639,?000|639000/.test(text),
    text.slice(0, 120)
  );
}

console.log(`\n=== selected-car finance routing guard — ${pass} PASS / ${fail} FAIL ===\n`);
if (fail > 0) process.exitCode = 1;
