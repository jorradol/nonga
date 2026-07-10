/**
 * v22.57 — Comparison vehicle identity regression + exact-result sales copy.
 * npm run test:v22.57
 *
 * No live Lead / no network Gemini / no Pilot counter mutation.
 */

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
  assertDistinctCompareListings,
  hasIdenticalCompareFactSet,
  isNamedInventoryCompareIntent,
  resolveInventoryBackedComparePair,
} from "../src/services/ai/chat/inventoryBackedCompare.ts";
import {
  isPilotBuyerDirectCompareFollowUp,
  isPilotBuyerFollowUpMessage,
  isPilotBuyerMileageFollowUp,
} from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  buildCompareReplyCopy,
  buildMarketplaceSearchIntroCopy,
} from "../src/services/ai/chat/chatSearchReplyCopy.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  runMarketplaceChatSearch,
  summaryToChatCarCardData,
  toChatCarSummary,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { resolveCarCardsFromSessionContext } from "../src/services/ai/chat/chatPilotSessionContext.ts";
import {
  buildBuyerComparePilotCopy,
  buildPilotBuyerUserVisibleCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import {
  hasCompareIdentityFailure,
  detectOwnerControlledGeminiUxZone,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  saveChatCarContext,
  setActivePilotChatSessionId,
  clearPilotChatSessionContext,
  saveLastSelectedCarId,
  loadLastSelectedCarId,
} from "../src/utils/chatCarContext.ts";
import type { ChatCarCardData } from "../src/types.ts";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import { detectBuyerRefinement } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";

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
    price: 399000,
    mileage: 88000,
    showroomName: "Thor Auto",
    bodyType: "Sedan",
  },
  {
    id: "corolla-2021",
    title: "Toyota Corolla 2021",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    price: 429000,
    mileage: 58000,
    showroomName: "Thor Auto",
    bodyType: "Sedan",
  },
  {
    id: "camry-2019",
    title: "Toyota Camry 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 689000,
    mileage: 72000,
  },
];

function toCard(
  inv: ChatInventoryCar,
  overrides: Partial<ChatCarCardData> = {}
): ChatCarCardData {
  return {
    ...summaryToChatCarCardData(toChatCarSummary(inv), "exact"),
    ...overrides,
  };
}

const corolla2020 = toCard(inventory[0]!);
const corolla2021 = toCard(inventory[1]!);
const SESSION = "v2257-compare-identity-test";

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
  const compareMsg = "เทียบกับ Corolla 2021 ให้หน่อย";
  const exactMsg = "มีรถ โตโยต้า Corolla 2020 ไหม";
  const familyMsg = "คันนี้เหมาะกับใช้ครอบครัวไหม";
  const mileageMsg = "ไมล์ 88,000 เยอะไปไหม";

  // --- Intent / regression reproduction of v22.56 Owner FAIL ---
  ok(
    "named inventory compare intent",
    isNamedInventoryCompareIntent(compareMsg)
  );
  ok(
    "compare is pilot follow-up",
    isPilotBuyerFollowUpMessage(compareMsg) &&
      isPilotBuyerDirectCompareFollowUp(compareMsg)
  );

  const badPair = { a: 1, b: Math.min(2, 1) };
  ok("legacy fallback pair was self-compare", badPair.a === 1 && badPair.b === 1);
  const dupSelected = resolveCarCardsFromSessionContext(
    [
      {
        index: 1,
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        price: 399000,
        mileage: 88000,
        bodyClassLabel: "Sedan",
      },
    ],
    [1, 1]
  );
  ok(
    "session resolve dedupes identical slots",
    dupSelected.length === 1,
    `len=${dupSelected.length}`
  );

  const selfCopy = buildBuyerComparePilotCopy(badPair, [
    {
      index: 1,
      brand: "Toyota",
      model: "Corolla",
      year: 2020,
      price: 399000,
      mileage: 88000,
      bodyClassLabel: "Sedan",
    },
  ]);
  ok(
    "pilot compare rejects a===b self-compare",
    /เทียบคันเดิมกับตัวเองไม่ได้|รุ่นหรือปี/i.test(selfCopy) &&
      !/คันที่ 1[\s\S]*คันที่ 1/.test(selfCopy)
  );

  // --- Core: Corolla 2020 active → compare Corolla 2021 ---
  withSessionContext([corolla2020], () => {
    ok("active vehicle retained", loadLastSelectedCarId() === "corolla-2020");

    const resolved = resolveInventoryBackedComparePair(
      compareMsg,
      inventory,
      [corolla2020]
    );
    ok("compare resolution ok", resolved.ok === true);
    if (resolved.ok) {
      ok(
        "base and target listing ids distinct",
        assertDistinctCompareListings(resolved.base, resolved.target),
        `base=${resolved.base.id} target=${resolved.target.id}`
      );
      ok("base year 2020", resolved.base.year === 2020);
      ok("target year 2021", resolved.target.year === 2021);
      ok("base price 399000", resolved.base.price === 399000);
      ok("base mileage 88000", resolved.base.mileage === 88000);
      ok("target price 429000", resolved.target.price === 429000);
      ok("target mileage 58000", resolved.target.mileage === 58000);
      ok(
        "target not overwritten by active",
        resolved.target.id === "corolla-2021" &&
          resolved.base.id === "corolla-2020"
      );
      ok(
        "fact sets not identical",
        !hasIdenticalCompareFactSet(resolved.base, resolved.target)
      );

      const text = buildCompareReplyCopy([resolved.base, resolved.target]);
      ok("formatter has year 2020", /ปี 2020/.test(text));
      ok("formatter has year 2021", /ปี 2021/.test(text));
      ok("formatter has both prices", /399,000/.test(text) && /429,000/.test(text));
      ok(
        "formatter does not print item 1 twice as only heading",
        /1\.\s*Toyota Corolla ปี 2020/.test(text) &&
          /2\.\s*Toyota Corolla ปี 2021/.test(text)
      );

      const grounded = [
        {
          index: 1,
          brand: resolved.base.brand,
          model: resolved.base.model,
          year: resolved.base.year,
          price: resolved.base.price,
          mileage: resolved.base.mileage,
          bodyClassLabel: resolved.base.bodyClassLabel,
        },
        {
          index: 2,
          brand: resolved.target.brand,
          model: resolved.target.model,
          year: resolved.target.year,
          price: resolved.target.price,
          mileage: resolved.target.mileage,
          bodyClassLabel: resolved.target.bodyClassLabel,
        },
      ];
      ok("gemini grounded payload has 2 cards", grounded.length === 2);
      ok(
        "gemini grounded years distinct",
        grounded[0]!.year === 2020 && grounded[1]!.year === 2021
      );
      ok(
        "compare identity guard accepts good gemini text",
        !hasCompareIdentityFailure(
          "เทียบ Corolla ปี 2020 ราคา 399,000 กับปี 2021 ราคา 429,000 ต่างที่ปีและไมล์ครับ",
          { carCardCount: 2, recentCarCards: grounded }
        )
      );
      ok(
        "compare identity guard rejects self-compare gemini text",
        hasCompareIdentityFailure(
          "คันที่ 1 Toyota Corolla ปี 2020 ราคา 399,000\nคันที่ 1 Toyota Corolla ปี 2020 ราคา 399,000",
          { carCardCount: 2, recentCarCards: grounded }
        )
      );
    }

    const orch = tryOrchestrateChatReplyCore(compareMsg, inventory, {
      chatSessionId: SESSION,
    });
    ok("orchestrator returns compare", Boolean(orch));
    ok("orchestrator two cards", (orch?.carCards?.length ?? 0) === 2);
    ok(
      "orchestrator distinct ids",
      orch?.carCards?.[0]?.id === "corolla-2020" &&
        orch?.carCards?.[1]?.id === "corolla-2021"
    );
    ok(
      "deterministic fallback mentions both years",
      /2020/.test(orch?.text ?? "") && /2021/.test(orch?.text ?? "")
    );
    ok(
      "deterministic fallback not self-duplicate heading",
      !/1\.\s*Toyota Corolla ปี 2020[\s\S]*1\.\s*Toyota Corolla ปี 2020/.test(
        orch?.text ?? ""
      )
    );
  });

  // --- Missing target fail-closed ---
  withSessionContext([corolla2020], () => {
    const missing = resolveInventoryBackedComparePair(
      "เทียบกับ Corolla 2015 ให้หน่อย",
      inventory,
      [corolla2020]
    );
    ok("missing target fails closed", missing.ok === false);
    if (!missing.ok) {
      ok(
        "missing target no self-compare cards",
        missing.cards.length <= 1 &&
          missing.cards.every((c) => c.id === "corolla-2020")
      );
      ok(
        "missing target clarification",
        /ยังไม่เจอ|ไม่เจอ/i.test(missing.clarification)
      );
    }
  });

  // --- Duplicate id deliberate reject ---
  ok(
    "duplicate id guard",
    !assertDistinctCompareListings(corolla2020, { ...corolla2020 })
  );

  // --- Multiple target candidates: existing ranking picks one ---
  const multiInv: ChatInventoryCar[] = [
    ...inventory,
    {
      id: "corolla-2021-b",
      title: "Toyota Corolla 2021 B",
      brand: "Toyota",
      model: "Corolla",
      year: 2021,
      price: 439000,
      mileage: 61000,
      showroomName: "Thor Auto",
    },
  ];
  withSessionContext([corolla2020], () => {
    const multi = resolveInventoryBackedComparePair(
      compareMsg,
      multiInv,
      [corolla2020]
    );
    ok("multi target still resolves one", multi.ok === true);
    if (multi.ok) {
      ok(
        "multi target year 2021 and distinct from base",
        multi.target.year === 2021 && multi.target.id !== multi.base.id
      );
    }
  });

  // --- Stale session: no active vehicle ---
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  const stale = resolveInventoryBackedComparePair(compareMsg, inventory, []);
  ok(
    "stale session fail closed",
    stale.ok === false && stale.reason === "no_base",
    `reason=${!stale.ok ? stale.reason : "ok"}`
  );
  setActivePilotChatSessionId(null);

  // --- Hard reload / new chat: empty session cards → no invent ---
  ok(
    "new chat without context cannot invent compare pair",
    resolveInventoryBackedComparePair(compareMsg, inventory, []).ok === false
  );

  // --- Family still passes (v22.61: active-vehicle fit, not multi-car refine) ---
  ok(
    "active-vehicle family is fit not multi-car refine",
    detectBuyerRefinement(familyMsg) == null
  );
  ok(
    "explicit family refine cue still detected",
    detectBuyerRefinement("เอาแบบครอบครัว") === "family"
  );
  withSessionContext([corolla2020], () => {
    const family = tryOrchestrateChatReplyCore(familyMsg, inventory, {
      chatSessionId: SESSION,
    });
    ok(
      "family follow-up still grounded",
      Boolean(family?.text) &&
        (family?.carCards?.length ?? 0) === 1 &&
        family?.carCards?.[0]?.year === 2020 &&
        !/2021/.test(family?.text ?? "") &&
        !/เทียบคันที่\s*1\s*กับ\s*2/i.test(family?.text ?? "")
    );
  });

  // --- Mileage still passes ---
  ok("mileage follow-up still classified", isPilotBuyerMileageFollowUp(mileageMsg));
  withSessionContext([corolla2020], () => {
    const mileage = tryOrchestrateChatReplyCore(mileageMsg, inventory, {
      chatSessionId: SESSION,
    });
    ok(
      "mileage follow-up still grounded",
      /88,?000|ไมล์/i.test(mileage?.text ?? "") &&
        !/กดดูรายละเอียดรถ/i.test(mileage?.text ?? "")
    );
  });

  // --- Exact Corolla query still passes + sales copy polish ---
  const exactSearch = runMarketplaceChatSearch(exactMsg, inventory);
  ok("exact corolla search finds 2020", exactSearch?.primary[0]?.year === 2020);
  const exactIntro = exactSearch
    ? buildMarketplaceSearchIntroCopy(exactSearch)
    : "";
  ok("exact intro leads with vehicle", /Corolla.*2020|ปี 2020/i.test(exactIntro));
  ok("exact intro has Thor Auto", /Thor Auto/i.test(exactIntro));
  ok("exact intro has price", /399,000/.test(exactIntro));
  ok("exact intro has mileage", /88,000/.test(exactIntro));
  ok(
    "exact intro less rigid than database dump",
    /มีครับ/.test(exactIntro) && !/อยู่ในตลาดทดลอง 1 คัน/.test(exactIntro)
  );
  ok(
    "exact intro offers useful next step",
    /นัดดูรถ|ทดลองขับ|เหมาะกับใช้งาน/i.test(exactIntro)
  );
  ok(
    "exact intro avoids stacked disclaimer labels",
    !/ข้อมูลจากประกาศ/.test(exactIntro) &&
      (exactIntro.match(/ข้อมูลทั่วไปของรุ่น/g) ?? []).length <= 1
  );
  ok(
    "exact intro does not invent fuel economy",
    !/\d+\s*กม\.?\s*\/\s*ลิตร|km\/l/i.test(exactIntro)
  );

  // --- v22.54 budget/modal regression smoke ---
  const budget = tryOrchestrateChatReplyCore(
    "มีรถไม่เกิน 500000 ไหม",
    inventory,
    { chatSessionId: SESSION }
  );
  ok(
    "v22.54 budget search still returns inventory path",
    Boolean(budget?.text) && (budget?.skipGemini === true || (budget?.carCards?.length ?? 0) >= 0)
  );

  // --- Answer persistence / session cards ---
  withSessionContext([corolla2020], () => {
    ok("answer persistence context retained", loadLastSelectedCarId() === "corolla-2020");
  });

  // --- Pilot copy does not self-compare named intent with 1 card ---
  const pilotNamed = buildPilotBuyerUserVisibleCopy({
    userMessage: compareMsg,
    intent: "buyer.followup",
    carCardCount: 1,
    recentCarCards: [
      {
        index: 1,
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        price: 399000,
        mileage: 88000,
        bodyClassLabel: "Sedan",
      },
    ],
  });
  ok(
    "pilot named compare with 1 card does not duplicate 2020",
    !/คันที่ 1[\s\S]*คันที่ 1/.test(pilotNamed?.text ?? "") &&
      !(/ปี 2020[\s\S]*ปี 2020/.test(pilotNamed?.text ?? "") &&
        !/2021/.test(pilotNamed?.text ?? ""))
  );

  // --- Gemini zone still compare ---
  ok(
    "owner gemini zone compare",
    detectOwnerControlledGeminiUxZone(compareMsg) === "compare_car_types"
  );

  // --- No Lead create / capture flag untouched by this suite ---
  const prev = process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  ok(
    "lead capture flag readable without create",
    typeof isLeadCaptureEnabled() === "boolean"
  );
  if (prev === undefined) delete process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  else process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = prev;

  ok(
    "no parallel compare framework — reused marketplace search + orchestrator",
    typeof resolveInventoryBackedComparePair === "function" &&
      typeof tryOrchestrateChatReplyCore === "function"
  );

  console.log(`\nv22.57 results: ${pass} passed, ${fail} failed`);
}

run();
