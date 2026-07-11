/**
 * v22.71 — Owner-browser two-gap correction (narrow scope)
 *
 * npm run test:v22.71
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

import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  resetConversationalLeadMemoryForTests,
  updateConversationalLeadMemory,
} from "../src/services/leads/conversationalLeadMemory.ts";
import { tryBuyerIntentGateReply } from "../src/services/ai/chat/chatBuyerIntentGate.ts";

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
    images: ["https://example.com/corolla-2020.webp"],
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
    images: ["https://example.com/corolla-2021.webp"],
  },
  {
    id: "city-2021",
    title: "Honda City 2021",
    brand: "Honda",
    model: "City",
    year: 2021,
    price: 489000,
    mileage: 58000,
    showroomName: "Thor Auto",
    bodyType: "Sedan",
    images: ["https://example.com/city-2021.webp"],
  },
];

function resetSession(): void {
  memoryStore.clear();
  resetConversationalLeadMemoryForTests();
}

function questionCount(text: string): number {
  const hits = text.match(/[?？]|ไหม|มั้ย|หรือเปล่า/g);
  return hits?.length ?? 0;
}

function containsLeadOrPiiCue(text: string): boolean {
  return /เบอร์|โทร|ติดต่อกลับ|ไลน์|ยืนยันส่ง|ส่งให้ผู้ขาย|Lead/i.test(text);
}

console.log("=== v22.71 owner-browser two-gap correction ===\n");

// T1 Usage continuity
{
  resetSession();
  const sessionId = "v2271-t1";
  const step1 = tryOrchestrateChatReplyCore("อยากซื้อรถครับ", inventory, { chatSessionId: sessionId });
  ok("T1 step1 asks usage first", /ใช้รถแบบไหนเป็นหลัก/.test(step1?.text ?? ""));

  const step2 = tryOrchestrateChatReplyCore("ใช้ขับไปทำงานเป็นหลัก", inventory, {
    chatSessionId: sessionId,
  });
  const text = step2?.text ?? "";
  ok("T1 usage acknowledged", /ไปทำงาน|ขับไปทำงาน|ใช้งาน/.test(text));
  ok("T1 no usage re-ask", !/ใช้รถแบบไหนเป็นหลัก/.test(text));
  ok("T1 max one follow-up question", questionCount(text) <= 1, text);
  ok("T1 no marketplace count boilerplate", !/ตลาดมีรถจริง/.test(text));
  ok("T1 no internal /api/cars copy", !/\/api\/cars/.test(text));
  ok("T1 no internal fallback phrase", !/โหมดสำรอง/.test(text));
  ok("T1 no lead/pii cues", !containsLeadOrPiiCue(text));
}

// T2 Natural budget follow-up
{
  resetSession();
  const sessionId = "v2271-t2";
  updateConversationalLeadMemory(sessionId, "อยากซื้อรถไว้ใช้เดินทางไปทำงาน");
  const r = tryOrchestrateChatReplyCore("ใช้ขับไปทำงานเป็นหลัก", inventory, {
    chatSessionId: sessionId,
  });
  const text = r?.text ?? "";
  ok("T2 budget asked naturally when unknown", /งบประมาณ|สะดวกบอกงบ/.test(text), text);
  ok("T2 no example wall", !/5–7 แสน|SUV ครอบครัว|กระบะ Toyota/.test(text), text);
  ok("T2 no diagnostic copy", !/โหมดสำรอง|\/api\/cars|ตลาดมีรถจริง/.test(text));
  ok("T2 single question maximum", questionCount(text) <= 1, text);
}

// T3 Budget refusal respected
{
  resetSession();
  const sessionId = "v2271-t3";
  updateConversationalLeadMemory(sessionId, "ใช้ขับไปทำงานเป็นหลัก");
  const r = tryOrchestrateChatReplyCore(
    "ยังไม่อยากบอกงบ แนะนำจากการใช้งานก่อนได้ไหม",
    inventory,
    { chatSessionId: sessionId }
  );
  const text = r?.text ?? "";
  ok("T3 no budget re-ask", !/งบประมาณ.*ไหม|สะดวกบอกงบ.*ไหม|ดูจากงบประมาณ.*ดีไหม/.test(text), text);
  ok("T3 no budget examples", !/5–7 แสน|งบไม่เกิน/.test(text), text);
  ok("T3 uses known usage context", /ไปทำงาน|ใช้งาน/.test(text), text);
  ok("T3 max one non-budget follow-up", questionCount(text) <= 1, text);
  ok("T3 no lead/pii cues", !containsLeadOrPiiCue(text), text);
}

// T4 Refusal deterministic without Gemini
{
  resetSession();
  const gate = tryBuyerIntentGateReply("ยังไม่อยากบอกงบ แนะนำจากการใช้งานก่อนได้ไหม", {
    discoveryContext: { usageTags: ["city"] },
  });
  const text = gate?.text ?? "";
  ok("T4 deterministic gate reply exists", Boolean(gate?.skipGemini), text);
  ok("T4 deterministic no budget re-ask", !/งบประมาณ.*ไหม|สะดวกบอกงบ.*ไหม/.test(text), text);
  ok("T4 deterministic no internal copy", !/\/api\/cars|โหมดสำรอง/.test(text), text);
}

// T5 Direct browse frozen
{
  resetSession();
  const r = tryOrchestrateChatReplyCore("ขอดูรถที่มีเลย", inventory, { chatSessionId: "v2271-t5" });
  ok("T5 still reaches direct browse", (r?.carCards.length ?? 0) > 0);
}

// T6 Budget supplied frozen
{
  resetSession();
  const r = tryOrchestrateChatReplyCore("งบไม่เกิน 700,000 บาท ใช้ขับไปทำงาน", inventory, {
    chatSessionId: "v2271-t6",
  });
  ok("T6 budget supplied still returns listings", (r?.carCards.length ?? 0) > 0);
}

// T7 Q1-Q4 frozen smoke (entry checks only)
{
  resetSession();
  const q1 = tryOrchestrateChatReplyCore("มีรถ โตโยต้า Corolla 2020 ไหม", inventory, {
    chatSessionId: "v2271-t7",
  });
  ok("T7 explicit model path still works", (q1?.carCards?.[0]?.id ?? "") === "corolla-2020");
}

// T8 B1+B2 frozen
{
  resetSession();
  const greet = tryOrchestrateChatReplyCore("สวัสดีครับ", inventory, { chatSessionId: "v2271-t8a" });
  const thanks = tryOrchestrateChatReplyCore("ขอบคุณครับ", inventory, { chatSessionId: "v2271-t8b" });
  ok("T8 greeting still handled deterministically", Boolean(greet?.skipGemini), greet?.text ?? "");
  ok("T8 thanks still handled deterministically", Boolean(thanks?.skipGemini), thanks?.text ?? "");
}

// T9 Candidate S frozen (guard: still deterministic for targeted flows)
{
  resetSession();
  const r = tryOrchestrateChatReplyCore("ใช้ขับไปทำงานเป็นหลัก", inventory, { chatSessionId: "v2271-t9" });
  ok("T9 no Candidate S dependency in two-gap flow", Boolean(r?.skipGemini), r?.text ?? "");
}

// T10 Lead frozen
{
  resetSession();
  const r = tryOrchestrateChatReplyCore("ใช้ขับไปทำงานเป็นหลัก", inventory, { chatSessionId: "v2271-t10" });
  ok("T10 no lead trigger in two-gap flow", !containsLeadOrPiiCue(r?.text ?? ""), r?.text ?? "");
}

console.log(`\n=== v22.71 result: ${pass} passed, ${fail} failed ===`);
if (process.exitCode) process.exit(process.exitCode);
