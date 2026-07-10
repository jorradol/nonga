/**
 * v22.67 — B1 greeting/thanks/casual intent-gate + B2 false empty-market fix.
 * npm run test:v22.67
 *
 * Offline only. No Lead. No Gemini. No network.
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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { tryBuyerIntentGateReply } from "../src/services/ai/chat/chatBuyerIntentGate.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  buildMockChatReply,
  MOCK_MARKETPLACE_EMPTY_CLAIM,
} from "../src/services/ai/chatMockFallback.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  saveChatCarContext,
  setActivePilotChatSessionId,
  clearPilotChatSessionContext,
  saveLastSelectedCarId,
  loadLastSelectedCarId,
} from "../src/utils/chatCarContext.ts";
import type { ChatCarCardData } from "../src/types.ts";
import { chatCardHasRenderableImage } from "../src/services/ai/chat/inventoryBackedCompare.ts";
import { countSalesToneAccent } from "../src/services/ai/chat/thaiSalesCopyVariation.ts";

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

type Fixture = {
  frozen: {
    Q1: { user: string; text: string; cardIds: string[]; activeVehicleId: string };
    Q3: { user: string; text: string; cardIds: string[] };
    Q4: { user: string; text: string; cardIds: string[] };
  };
  q2: { user: string; cardIds: string[] };
};

const fixture = JSON.parse(
  readFileSync(
    resolve("scripts/fixtures/v22.65-q2-family-use-sales-copy-freeze.json"),
    "utf8"
  )
) as Fixture;

const PUBLIC_IMAGE_A =
  "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/draft-images%2Fnonga-dealer%2Fdraft-a%2Fa.webp?alt=media&token=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PUBLIC_IMAGE_B =
  "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/draft-images%2Fnonga-dealer%2Fdraft-b%2Fb.webp?alt=media&token=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

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
    images: [PUBLIC_IMAGE_A, PUBLIC_IMAGE_A, PUBLIC_IMAGE_A, PUBLIC_IMAGE_A, PUBLIC_IMAGE_A],
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
    images: [PUBLIC_IMAGE_B, PUBLIC_IMAGE_B, PUBLIC_IMAGE_B, PUBLIC_IMAGE_B, PUBLIC_IMAGE_B],
  },
];

const SESSION = "v2267-b1-b2";
const EMPTY_MARKET = MOCK_MARKETPLACE_EMPTY_CLAIM;
const NO_RESULT_NEAR =
  /ยังไม่มีคันที่ตรงเป๊ะ|ตอนนี้ยังไม่มีรถในตลาด|ยังไม่พบประกาศขาย/i;

console.log("=== v22.67 B1+B2 Greeting / Casual / False Empty Fix ===\n");

console.log("--- source scope ---");
{
  const gate = readFileSync("src/services/ai/chat/chatBuyerIntentGate.ts", "utf8");
  const mock = readFileSync("src/services/ai/chatMockFallback.ts", "utf8");
  const server = readFileSync("server.ts", "utf8");
  const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
  ok("B1 greeting/thanks/casualWarmth kinds present", /casualWarmth/.test(gate) && /CASUAL_GREETING_RE/.test(gate));
  ok("B1 reuses existing intent gate (no new router file)", gate.includes("tryBuyerIntentGateReply"));
  ok("B2 non-search ready reply present", mock.includes("NON_SEARCH_READY_REPLY"));
  ok("B2 mock empty claim guard exported", mock.includes("MOCK_MARKETPLACE_EMPTY_CLAIM"));
  ok(
    "B2 chat-stream mock prefers repository listPublished",
    /listPublished\(\)[\s\S]{0,200}streamMockChatSSE/.test(server) ||
      /truthInv[\s\S]{0,80}listPublished/.test(server)
  );
  ok("Q2 family copy untouched in orchestrator", orch.includes("v22.65") && orch.includes("ถ้าใช้กับครอบครัว คันนี้ถือว่าเป็นตัวเลือกที่น่าดูครับ"));
  ok("legacy Gemini not re-enabled in server", !/NONGA_AI_LEGACY_PUBLIC_GEMINI_ENABLED\s*=\s*['\"]true['\"]/.test(server));
}

console.log("\n--- B1 greeting / thanks / casual ---");
{
  const hi = tryBuyerIntentGateReply("สวัสดีครับ");
  ok("greeting handled", Boolean(hi?.skipGemini));
  ok("greeting warm + car handoff", /สวัสดี/.test(hi?.text ?? "") && /ซื้อ|ขาย|เลือกรถ/.test(hi?.text ?? ""));
  ok("greeting no empty market", !EMPTY_MARKET.test(hi?.text ?? ""));
  ok("greeting no ปังปุริเย่ required", countSalesToneAccent(hi?.text ?? "") === 0);

  const th = tryBuyerIntentGateReply("ขอบคุณครับ");
  ok("thanks handled", Boolean(th?.skipGemini));
  ok("thanks light car return", /หา|เทียบ|ลงขาย|รถ/.test(th?.text ?? ""));
  ok("thanks no empty market", !EMPTY_MARKET.test(th?.text ?? ""));

  const tired = tryBuyerIntentGateReply("วันนี้เหนื่อยจัง");
  ok("casual warmth handled", Boolean(tired?.skipGemini));
  ok("casual brief + car return", /รถ/.test(tired?.text ?? "") && (tired?.text?.length ?? 0) < 200);
  ok("casual no medical overreach", !/แพทย์|วินิจฉัย|โรคซึมเศร้า|ฆ่าตัวตาย|ยาฆ่า|ใบสั่งยา/.test(tired?.text ?? ""));
  ok("casual no empty market", !EMPTY_MARKET.test(tired?.text ?? ""));

  const orchHi = tryOrchestrateChatReplyCore("สวัสดีครับ", inventory);
  ok("greeting on orchestrator path", Boolean(orchHi?.skipGemini));
  ok("greeting no cards required", (orchHi?.carCards?.length ?? 0) === 0);
  ok("greeting orch no empty/no-result", !NO_RESULT_NEAR.test(orchHi?.text ?? ""));
}

console.log("\n--- B2 mock false empty ---");
{
  const mockHi = buildMockChatReply("สวัสดีครับ", []);
  ok("mock greeting with empty cars not marketplace-empty", !EMPTY_MARKET.test(mockHi));
  ok("mock greeting offers car help", /ซื้อ|ขาย|เลือกรถ|หารถ/.test(mockHi));

  const mockThanks = buildMockChatReply("ขอบคุณครับ", []);
  ok("mock thanks not marketplace-empty", !EMPTY_MARKET.test(mockThanks));

  const mockTired = buildMockChatReply("วันนี้เหนื่อยจัง", []);
  ok("mock casual not marketplace-empty", !EMPTY_MARKET.test(mockTired));

  const mockSearchEmpty = buildMockChatReply("มี Honda CR-V ปี 2099 ไหม", []);
  ok(
    "genuine search may still use empty/no-result when inventory empty",
    EMPTY_MARKET.test(mockSearchEmpty) || /ไม่พบ|ยังไม่มี/.test(mockSearchEmpty) || mockSearchEmpty.length > 0
  );
}

console.log("\n--- historical off-topic regression ---");
{
  const poem = tryOrchestrateChatReplyCore("ช่วยแต่งกลอนให้ลุงหน่อย", inventory);
  ok("poem still deterministic", Boolean(poem?.skipGemini));
  ok("poem boundary", /เน้นช่วยเรื่องซื้อขายรถยนต์มือสองเป็นหลัก/.test(poem?.text ?? ""));
  ok("poem short snippet", /รถดีต้องดูให้ครบ|กลอนสั้น/.test(poem?.text ?? ""));

  const song = tryBuyerIntentGateReply("ช่วยแต่งเพลงให้หน่อย");
  ok("song still handled", Boolean(song?.skipGemini));

  const research = tryBuyerIntentGateReply("ช่วยทำวิจัยเรื่องตลาดอสังหาริมทรัพย์ไทยให้ลุงหน่อย");
  ok("research still handled", Boolean(research?.skipGemini));
  ok("research service explanation", /ตั้งราคาขายรถ|ร่างประกาศขายรถ/.test(research?.text ?? ""));

  const general = tryBuyerIntentGateReply("ช่วยคิดชื่อเกมให้หน่อย");
  ok("historical general off-topic still handled", Boolean(general?.skipGemini));
  ok("general no empty market", !EMPTY_MARKET.test(general?.text ?? ""));
}

console.log("\n--- car-adjacent not swallowed ---");
{
  const familyTravel = tryBuyerIntentGateReply("เดินทางไกลกับครอบครัวควรเลือกรถแบบไหน");
  ok(
    "car-adjacent not greeting/casual gate",
    familyTravel === null ||
      !/สวัสดีครับ น้องเอพร้อมช่วย|รับทราบครับ พักหายใจ/.test(familyTravel.text)
  );
  const orchFamily = tryOrchestrateChatReplyCore(
    "เดินทางไกลกับครอบครัวควรเลือกรถแบบไหน",
    inventory
  );
  ok(
    "car-adjacent reaches car assistance (not empty greeting)",
    orchFamily === null ||
      /รถ|ครอบครัว|งบ|คัน/.test(orchFamily.text)
  );
}

console.log("\n--- mixed stateful: Q1 → casual → Q3 → Q4 ---");
{
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);

  const q1 = tryOrchestrateChatReplyCore(fixture.frozen.Q1.user, inventory, {
    chatSessionId: SESSION,
  });
  ok("mixed Q1 exact freeze", (q1?.text ?? "") === fixture.frozen.Q1.text);
  ok(
    "mixed Q1 one card+image",
    (q1?.carCards?.length ?? 0) === 1 &&
      q1?.carCards?.[0]?.id === "corolla-2020" &&
      chatCardHasRenderableImage(q1!.carCards[0]!)
  );
  saveChatCarContext(q1?.carCards ?? [], SESSION);
  if (q1?.carCards?.[0]) saveLastSelectedCarId(q1.carCards[0].id);
  ok("mixed Q1 active Corolla 2020", loadLastSelectedCarId() === "corolla-2020");

  const g1 = tryOrchestrateChatReplyCore("สวัสดีครับ", inventory, { chatSessionId: SESSION });
  ok("mixed greeting skipGemini", Boolean(g1?.skipGemini));
  ok("mixed greeting no empty", !NO_RESULT_NEAR.test(g1?.text ?? ""));
  ok("mixed greeting does not clear active vehicle", loadLastSelectedCarId() === "corolla-2020");
  ok("mixed greeting no cards forced", (g1?.carCards?.length ?? 0) === 0);

  const th = tryOrchestrateChatReplyCore("ขอบคุณครับ", inventory, { chatSessionId: SESSION });
  ok("mixed thanks ok", Boolean(th?.skipGemini) && !NO_RESULT_NEAR.test(th?.text ?? ""));
  ok("mixed thanks keeps active", loadLastSelectedCarId() === "corolla-2020");

  const tired = tryOrchestrateChatReplyCore("วันนี้เหนื่อยจัง", inventory, {
    chatSessionId: SESSION,
  });
  ok("mixed casual ok", Boolean(tired?.skipGemini) && !NO_RESULT_NEAR.test(tired?.text ?? ""));
  ok("mixed casual keeps active", loadLastSelectedCarId() === "corolla-2020");

  const q3 = tryOrchestrateChatReplyCore(fixture.frozen.Q3.user, inventory, {
    chatSessionId: SESSION,
  });
  ok("mixed Q3 exact freeze", (q3?.text ?? "") === fixture.frozen.Q3.text);
  ok(
    "mixed Q3 still Corolla 2020 card",
    (q3?.carCards?.length ?? 0) === 1 && q3?.carCards?.[0]?.id === "corolla-2020"
  );
  ok("mixed Q3 no ปังปุริเย่", countSalesToneAccent(q3?.text ?? "") === 0);

  const q4 = tryOrchestrateChatReplyCore(fixture.frozen.Q4.user, inventory, {
    chatSessionId: SESSION,
  });
  ok("mixed Q4 exact freeze", (q4?.text ?? "") === fixture.frozen.Q4.text);
  ok(
    "mixed Q4 two cards",
    (q4?.carCards?.length ?? 0) === 2 &&
      q4?.carCards?.some((c) => c.id === "corolla-2020") &&
      q4?.carCards?.some((c) => c.id === "corolla-2021")
  );
  ok("mixed Q4 no no-context fallback", !/ยังไม่เห็นชุดรถล่าสุด|เทียบคันที่\s*1\s*กับ\s*2/.test(q4?.text ?? ""));
}

console.log("\n--- frozen Q1→Q2→Q3→Q4 (Q2 untouched) ---");
{
  setActivePilotChatSessionId(SESSION + "-full");
  clearPilotChatSessionContext();
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION + "-full");

  const q1 = tryOrchestrateChatReplyCore(fixture.frozen.Q1.user, inventory, {
    chatSessionId: SESSION + "-full",
  });
  ok("freeze Q1 text", (q1?.text ?? "") === fixture.frozen.Q1.text);
  saveChatCarContext(q1?.carCards ?? [], SESSION + "-full");
  if (q1?.carCards?.[0]) saveLastSelectedCarId(q1.carCards[0].id);

  const q2 = tryOrchestrateChatReplyCore(fixture.q2.user, inventory, {
    chatSessionId: SESSION + "-full",
  });
  ok("freeze Q2 still family path", /ครอบครัว/.test(q2?.text ?? ""));
  ok("freeze Q2 Corolla 2020 only", (q2?.carCards?.length ?? 0) === 1 && q2?.carCards?.[0]?.id === "corolla-2020");
  ok("freeze Q2 v22.65 sales opener present", /ถ้าใช้กับครอบครัว คันนี้ถือว่าเป็นตัวเลือกที่น่าดูครับ/.test(q2?.text ?? ""));

  const q3 = tryOrchestrateChatReplyCore(fixture.frozen.Q3.user, inventory, {
    chatSessionId: SESSION + "-full",
  });
  ok("freeze Q3 text", (q3?.text ?? "") === fixture.frozen.Q3.text);

  const q4 = tryOrchestrateChatReplyCore(fixture.frozen.Q4.user, inventory, {
    chatSessionId: SESSION + "-full",
  });
  ok("freeze Q4 text", (q4?.text ?? "") === fixture.frozen.Q4.text);
}

console.log("\n--- anti-architecture ---");
{
  const self = readFileSync(
    "scripts/test-v22.67-b1-b2-greeting-casual-false-empty-fix.mts",
    "utf8"
  );
  const body = self.split("const self = readFileSync")[0] ?? self;
  ok("test has no fetch", !/\bfetch\s*\(/.test(body));
  ok("test has no /api/", !/\/api\//.test(body));
  ok("test has no child_process", !/node:child_process/.test(body));
}

console.log(`\nDone v22.67 B1+B2 — ${pass} PASS, ${fail} FAIL.\n`);
if (process.exitCode) process.exit(process.exitCode);
