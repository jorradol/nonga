/**
 * v22.56 — Active vehicle conversation context + mileage follow-up bugfix.
 * npm run test:v22.56
 *
 * No live Lead / no network Gemini / no Pilot counter mutation.
 */

// Node has no sessionStorage — polyfill for chatCarContext session scoping.
const memoryStore = new Map<string, string>();
(
  globalThis as unknown as {
    sessionStorage: Storage;
  }
).sessionStorage = {
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

import {
  BUYER_ASK_SELECT_CAR_FIRST,
  buildMileageEvaluationReply,
  extractStatedMileageFromMessage,
  isBuyerMileageEvaluationQuestion,
  resolveCarsByMileageFact,
  resolveTargetBuyerCarDetailed,
} from "../src/services/ai/chat/chatBuyerFactsQa.ts";
import {
  isPilotBuyerFollowUpMessage,
  isPilotBuyerMileageFollowUp,
} from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  detectOwnerControlledGeminiUxZone,
  evaluateRealProviderOutputSafety,
  hasDeterministicBoundaryBlock,
  hasUngroundedVehicleModelMention,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  buildBuyerMileageEvaluationPilotCopy,
  buildPilotBuyerUserVisibleCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import { redactPiiForSalesBrainLog } from "../src/services/ai/salesBrainMock.ts";
import {
  saveChatCarContext,
  setActivePilotChatSessionId,
  clearPilotChatSessionContext,
  loadLastSelectedCarId,
  saveLastSelectedCarId,
} from "../src/utils/chatCarContext.ts";
import type { ChatCarCardData } from "../src/types.ts";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

const inventory: ChatInventoryCar[] = [
  {
    id: "corolla-2020",
    title: "Toyota Corolla 2020",
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 459000,
    mileage: 88000,
  },
  {
    id: "corolla-2021",
    title: "Toyota Corolla 2021",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    price: 499000,
    mileage: 41000,
  },
  {
    id: "camry-2019",
    title: "Toyota Camry 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 689000,
    mileage: 88000,
  },
];

function toCard(
  inv: ChatInventoryCar,
  overrides: Partial<ChatCarCardData> = {}
): ChatCarCardData {
  return {
    id: inv.id,
    brand: inv.brand,
    model: inv.model,
    year: inv.year,
    price: inv.price,
    mileage: inv.mileage ?? 0,
    bodyClass: "sedan",
    bodyClassLabel: "Sedan",
    hasImage: false,
    detailPath: `/cars/${inv.id}`,
    matchKind: "exact",
    ...overrides,
  };
}

const corolla2020 = toCard(inventory[0]!);
const corolla2021 = toCard(inventory[1]!);
const camrySameMileage = toCard(inventory[2]!);

const SESSION = "v2256-active-vehicle-test";

function withSessionContext(cars: ChatCarCardData[], fn: () => void): void {
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  saveChatCarContext(cars, SESSION);
  if (cars.length === 1) saveLastSelectedCarId(cars[0]!.id);
  try {
    fn();
  } finally {
    clearPilotChatSessionContext();
    setActivePilotChatSessionId(null);
  }
}

function run(): void {
  console.log("=== v22.56 active vehicle + mileage follow-up ===\n");

  // --- Detection / zone ---
  ok(
    "mileage follow-up detected (comma)",
    isPilotBuyerMileageFollowUp("ไมล์ 88,000 เยอะไปไหม")
  );
  ok(
    "mileage follow-up detected (no comma)",
    isPilotBuyerMileageFollowUp("วิ่ง 88000 เยอะไหม")
  );
  ok(
    "mileage follow-up is pilot follow-up",
    isPilotBuyerFollowUpMessage("ไมล์ 88,000 เยอะไปไหม")
  );
  ok(
    "evaluation question classified",
    isBuyerMileageEvaluationQuestion("เลขไมล์คันนี้โอเคไหม")
  );
  ok(
    "zone opens for Owner mileage phrasing",
    detectOwnerControlledGeminiUxZone("ไมล์ 88,000 เยอะไปไหม") === "car_fit_reason"
  );
  ok(
    "zone still opens for short mileage ask",
    detectOwnerControlledGeminiUxZone("ไมล์เยอะไปไหม") === "car_fit_reason"
  );

  // --- Mileage parse / fact match ---
  ok("parse comma mileage", extractStatedMileageFromMessage("ไมล์ 88,000 เยอะไปไหม") === 88000);
  ok("parse no-comma", extractStatedMileageFromMessage("วิ่ง 88000 เยอะไหม") === 88000);
  ok(
    "parse Thai digits",
    extractStatedMileageFromMessage("ไมล์ ๘๘,๐๐๐ เยอะไหม") === 88000
  );
  ok(
    "parse Thai word แปดหมื่น",
    extractStatedMileageFromMessage("รถหกปีวิ่งแปดหมื่นเยอะไหม") === 80000
  );
  ok(
    "unique mileage fact → Corolla 2020",
    resolveCarsByMileageFact(88000, [corolla2020, corolla2021]).length === 1 &&
      resolveCarsByMileageFact(88000, [corolla2020, corolla2021])[0]?.id ===
        "corolla-2020"
  );
  ok(
    "ambiguous mileage → two matches",
    resolveCarsByMileageFact(88000, [corolla2020, camrySameMileage]).length === 2
  );

  // --- Context sequence (Owner-observed) ---
  withSessionContext([corolla2020], () => {
    ok(
      "1 exact single context sets last selected",
      loadLastSelectedCarId() === "corolla-2020"
    );

    const family = tryOrchestrateChatReplyCore(
      "คันนี้เหมาะกับใช้ครอบครัวไหม",
      inventory,
      { chatSessionId: SESSION }
    );
    ok("2 family follow-up has reply", Boolean(family?.text?.trim()));
    ok(
      "2b family not select-car-first",
      !family?.text?.includes(BUYER_ASK_SELECT_CAR_FIRST)
    );

    const mileage = tryOrchestrateChatReplyCore(
      "ไมล์ 88,000 เยอะไปไหม",
      inventory,
      { chatSessionId: SESSION }
    );
    ok("3 mileage follow-up has reply", Boolean(mileage?.text?.trim()));
    ok(
      "3b no select-car-first when active car exists",
      !mileage?.text?.includes(BUYER_ASK_SELECT_CAR_FIRST)
    );
    ok(
      "3c mentions Corolla / 2020 / mileage guidance",
      /Corolla|2020/i.test(mileage?.text ?? "") &&
        /88,?000|88 000|88000/.test(mileage?.text ?? "") &&
        /สมุดเช็ค|ประวัติ|สภาพ|ประมาณ/.test(mileage?.text ?? "")
    );
    ok(
      "3d grounded card returned",
      mileage?.carCards?.some((c) => c.id === "corolla-2020") === true
    );

    const compare = tryOrchestrateChatReplyCore(
      "เทียบกับ Corolla 2021 ให้หน่อย",
      inventory,
      { chatSessionId: SESSION }
    );
    // Compare may need both cars in context — seed both for this check
    ok(
      "4 compare zone still opens",
      detectOwnerControlledGeminiUxZone("เทียบกับ Corolla 2021 ให้หน่อย") ===
        "compare_car_types"
    );
    void compare;
  });

  withSessionContext([corolla2020, corolla2021], () => {
    const compare = tryOrchestrateChatReplyCore(
      "เทียบกับ Corolla 2021 ให้หน่อย",
      inventory,
      { chatSessionId: SESSION }
    );
    ok("4b compare reply exists with two grounded cars", Boolean(compare?.text?.trim()));
    ok(
      "4c compare mentions both years or Corolla",
      /Corolla/i.test(compare?.text ?? "") &&
        !compare?.text?.includes(BUYER_ASK_SELECT_CAR_FIRST)
    );
  });

  // --- Mileage variants ---
  withSessionContext([corolla2020], () => {
    for (const q of [
      "วิ่ง 88000 เยอะไหม",
      "เลขไมล์คันนี้โอเคไหม",
      "ไมล์เท่านี้น่ากลัวไหม",
      "คันนี้วิ่งเยอะไปหรือเปล่า",
    ]) {
      const r = tryOrchestrateChatReplyCore(q, inventory, { chatSessionId: SESSION });
      ok(
        `variant: ${q}`,
        Boolean(r?.text) && !r!.text.includes(BUYER_ASK_SELECT_CAR_FIRST)
      );
    }
  });

  withSessionContext([corolla2020], () => {
    const missing = tryOrchestrateChatReplyCore(
      "ไมล์ 999999 เยอะไหม",
      inventory,
      { chatSessionId: SESSION }
    );
    // Stated mileage not on listing — still answer from listing truth / active car, do not invent Camry
    ok(
      "mileage not matching other model → no Camry invent",
      !/Camry/i.test(missing?.text ?? "")
    );
    ok(
      "uses listing / active car path",
      Boolean(missing?.text) && !missing!.text.includes(BUYER_ASK_SELECT_CAR_FIRST)
    );
  });

  withSessionContext([corolla2020, camrySameMileage], () => {
    const amb = resolveTargetBuyerCarDetailed(
      "ไมล์ 88,000 เยอะไปไหม",
      inventory,
      [corolla2020, camrySameMileage],
      { allowSessionFallback: true }
    );
    ok(
      "ambiguous mileage clarification",
      (amb.ambiguousMileageMatches?.length ?? 0) >= 2
    );
    const ambReply = tryOrchestrateChatReplyCore(
      "ไมล์ 88,000 เยอะไปไหม",
      inventory,
      { chatSessionId: SESSION }
    );
    ok(
      "ambiguous asks clarification",
      /หลายคัน|ระบุคัน|คันที่หมายถึง/i.test(ambReply?.text ?? "")
    );
  });

  withSessionContext([corolla2020], () => {
    const conflict = buildMileageEvaluationReply(corolla2020, {
      statedMileage: 120000,
      referenceYear: 2026,
    });
    ok(
      "stated vs listing conflict uses listing truth",
      /ประกาศ/.test(conflict) && /88,?000|88000/.test(conflict.replace(/\s/g, ""))
    );
  });

  // --- Lifecycle ---
  withSessionContext([corolla2020], () => {
    ok("card/single search active id", loadLastSelectedCarId() === "corolla-2020");
  });
  withSessionContext([corolla2021], () => {
    ok("new exact search replaces active", loadLastSelectedCarId() === "corolla-2021");
  });
  withSessionContext([corolla2020, corolla2021], () => {
    // Broad multi-result: do not auto-pick wrong vehicle for mileage without unique fact
    const r = resolveTargetBuyerCarDetailed(
      "เลขไมล์คันนี้โอเคไหม",
      inventory,
      [corolla2020, corolla2021],
      { allowSessionFallback: true }
    );
    ok(
      "multi-result pronoun/session uses first or selected — not invent",
      r.car != null && (r.car.id === "corolla-2020" || r.car.id === "corolla-2021")
    );
  });

  // --- Pilot deterministic fallback + Gemini guards ---
  const pilotCards = [
    {
      index: 1,
      brand: "Toyota",
      model: "Corolla",
      year: 2020,
      price: 459000,
      mileage: 88000,
    },
  ];
  const pilotCopy = buildBuyerMileageEvaluationPilotCopy(
    pilotCards,
    "ไมล์ 88,000 เยอะไปไหม"
  );
  ok(
    "20 deterministic mileage pilot copy useful",
    /Corolla|2020/i.test(pilotCopy) &&
      /ประมาณ|สมุดเช็ค|ประวัติ|สภาพ/.test(pilotCopy) &&
      !pilotCopy.includes(BUYER_ASK_SELECT_CAR_FIRST)
  );

  const polished = buildPilotBuyerUserVisibleCopy({
    userMessage: "ไมล์ 88,000 เยอะไปไหม",
    intent: "buyer.search",
    carCardCount: 1,
    recentCarCards: pilotCards,
  });
  ok("20b pilot buyer copy path active", polished?.pilotPathActive === true);
  ok(
    "20c pilot copy not select-first",
    !polished?.text.includes(BUYER_ASK_SELECT_CAR_FIRST)
  );

  const safeGemini = evaluateRealProviderOutputSafety(
    [
      "ไมล์ 88,000 กม. สำหรับ Toyota Corolla ปี 2020 ถือว่าอยู่ในระดับที่ควรดูประกอบกับอายุรถและประวัติการใช้งานครับ",
      "ถ้าประมาณจากปีรถ เฉลี่ยราว 14,000–15,000 กม. ต่อปี ซึ่งเป็นค่าประมาณเท่านั้น",
      "เลขไมล์อย่างเดียวพิสูจน์สภาพไม่ได้ครับ ควรตรวจสมุดเช็กระยะ ประวัติซ่อม สภาพเครื่องยนต์ ช่วงล่าง และความสอดคล้องของเลขไมล์ก่อนตัดสินใจครับ",
    ].join(" "),
    "ไมล์ 88,000 เยอะไปไหม",
    1,
    {
      allowedVehicleTerms: ["toyota", "corolla"],
      pilotOrchestration: { carCardCount: 1, recentCarCards: pilotCards },
    }
  );
  ok(
    "21 grounded mileage wording can be safe",
    safeGemini.safe === true,
    safeGemini.safe ? "" : String(safeGemini.unsafeReason ?? "")
  );

  ok(
    "23 ungrounded Camry discarded",
    hasUngroundedVehicleModelMention(
      "แนะนำ Camry ปี 2019 น่าสนใจกว่า",
      { carCardCount: 1, recentCarCards: pilotCards }
    ) === true
  );

  ok(
    "25 no PII in provider log helper",
    redactPiiForSalesBrainLog("เบอร์ 0812345678 ชื่อ สมชาย").includes(
      "[phone-redacted]"
    )
  );
  ok(
    "25b lead-intent still blocked",
    hasDeterministicBoundaryBlock(
      "ชื่อ จิตประสงค์ ต้องการจัดไฟแนนซ์ ตั้งงบเอาไว้ที่ 350,000 ติดต่อได้ตลอดเวลา"
    )
  );

  // Capture OFF fail-closed (env override for unit check)
  const prev = process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = "false";
  ok("35 Capture OFF fail-closed helper", isLeadCaptureEnabled() === false);
  if (prev === undefined) delete process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  else process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = prev;

  // Exact-query regression smoke
  const exact = tryOrchestrateChatReplyCore(
    "มีรถ โตโยต้า Corolla 2020 ไหม",
    inventory,
    { chatSessionId: SESSION }
  );
  ok(
    "26 exact Corolla 2020 still returns card",
    exact?.carCards?.some((c) => /corolla/i.test(c.model) && c.year === 2020) ===
      true
  );

  console.log(`\n=== v22.56 done: ${pass} passed, ${fail} failed ===`);
}

run();
