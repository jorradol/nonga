/**
 * v22.70 — Recovery Track B1:
 * Existing buyer discovery memory reconnection (minimal wiring only).
 *
 * npm run test:v22.70
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
  getConversationalLeadMemory,
  resetConversationalLeadMemoryForTests,
  setConversationalLeadMemoryForTest,
  updateConversationalLeadMemory,
} from "../src/services/leads/conversationalLeadMemory.ts";

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
  {
    id: "hrv-2019",
    title: "Honda HR-V 2019",
    brand: "Honda",
    model: "HR-V",
    year: 2019,
    price: 739000,
    mileage: 69000,
    showroomName: "Thor Auto",
    bodyType: "SUV",
    images: ["https://example.com/hrv-2019.webp"],
  },
];

function resetSession(sessionId: string): void {
  memoryStore.clear();
  resetConversationalLeadMemoryForTests();
  void sessionId;
}

console.log("=== v22.70 buyer discovery memory reconnection ===\n");

// T1 usage-first
{
  const sessionId = "v2270-t1";
  resetSession(sessionId);
  const r = tryOrchestrateChatReplyCore("อยากซื้อรถครับ", inventory, { chatSessionId: sessionId });
  ok("T1 deterministic no inventory", Boolean(r?.skipGemini) && (r?.carCards.length ?? 0) === 0);
  ok("T1 asks usage first", /ใช้รถแบบไหนเป็นหลัก|ใช้รถในเมือง|ใช้กับครอบครัว|ใช้ทำงาน/.test(r?.text ?? ""));
}

// T2 no repeated usage -> ask budget naturally
{
  const sessionId = "v2270-t2";
  resetSession(sessionId);
  updateConversationalLeadMemory(sessionId, "อยากซื้อรถไว้ใช้เดินทางไปทำงาน");
  const r = tryOrchestrateChatReplyCore("อยากซื้อรถไว้ใช้เดินทางไปทำงาน", inventory, { chatSessionId: sessionId });
  ok("T2 does not repeat usage question", !/ใช้รถแบบไหนเป็นหลัก|ใช้รถทำอะไร/i.test(r?.text ?? ""));
  ok("T2 asks budget naturally", /งบประมาณ|สะดวกบอกงบ/.test(r?.text ?? ""));
}

// T3 no repeated budget + route search/recommendation
{
  const sessionId = "v2270-t3";
  resetSession(sessionId);
  updateConversationalLeadMemory(sessionId, "งบไม่เกิน 700,000 ใช้ขับไปทำงาน");
  const r = tryOrchestrateChatReplyCore("งบไม่เกิน 700,000 ใช้ขับไปทำงาน", inventory, { chatSessionId: sessionId });
  ok("T3 no repeated budget ask", !/สะดวกบอกงบ|งบประมาณ.*ไหม/.test(r?.text ?? ""));
  ok("T3 reaches search route", (r?.carCards.length ?? 0) > 0);
}

// T4 latest budget wins
{
  const sessionId = "v2270-t4";
  resetSession(sessionId);
  updateConversationalLeadMemory(sessionId, "งบ 600,000");
  updateConversationalLeadMemory(sessionId, "ขอเปลี่ยนเป็นไม่เกิน 750,000");
  setConversationalLeadMemoryForTest(sessionId, {
    ...(getConversationalLeadMemory(sessionId) ?? { updatedAt: new Date().toISOString() }),
    usageTags: ["city"],
    updatedAt: new Date().toISOString(),
  });
  const mem = getConversationalLeadMemory(sessionId);
  const r = tryOrchestrateChatReplyCore("อยากซื้อรถครับ", inventory, { chatSessionId: sessionId });
  ok("T4 memory budget updated to latest", mem?.budgetMax === 750000, String(mem?.budgetMax));
  ok("T4 vague message can continue to search from memory", (r?.carCards.length ?? 0) > 0);
  ok("T4 no stale 600k mention", !/600,000|600000/.test(r?.text ?? ""));
}

// T5 latest brand/model wins
{
  const sessionId = "v2270-t5";
  resetSession(sessionId);
  updateConversationalLeadMemory(sessionId, "สนใจ Toyota");
  updateConversationalLeadMemory(sessionId, "เปลี่ยนเป็น Honda ดีกว่า");
  const mem = getConversationalLeadMemory(sessionId);
  ok("T5 latest explicit brand wins", (mem?.brands ?? [])[0] === "Honda", JSON.stringify(mem?.brands ?? []));
}

// T6 respect refusal
{
  const sessionId = "v2270-t6";
  resetSession(sessionId);
  updateConversationalLeadMemory(sessionId, "ใช้ขับไปทำงานเป็นหลัก");
  const r = tryOrchestrateChatReplyCore(
    "ยังไม่อยากบอกงบ แนะนำจากการใช้งานก่อนได้ไหม",
    inventory,
    { chatSessionId: sessionId }
  );
  ok("T6 no repeated budget question", !/งบประมาณ.*ไหม|สะดวกบอกงบ.*ไหม/.test(r?.text ?? ""));
  ok("T6 no contact request", !/เบอร์|ติดต่อกลับ|ไลน์/.test(r?.text ?? ""));
  ok("T6 no lead forcing", !/ยืนยันส่ง|ส่งให้ผู้ขาย/.test(r?.text ?? ""));
}

// T7 direct browse request
{
  const sessionId = "v2270-t7";
  resetSession(sessionId);
  const r = tryOrchestrateChatReplyCore("ขอดูรถที่มีเลย", inventory, { chatSessionId: sessionId });
  ok("T7 no forced questionnaire", !/ใช้รถแบบไหน|สะดวกบอกงบ/.test(r?.text ?? ""));
  ok("T7 direct browse reaches listings", (r?.carCards.length ?? 0) > 0);
}

// T8 explicit model request (Q1 freeze entry)
{
  const sessionId = "v2270-t8";
  resetSession(sessionId);
  const r = tryOrchestrateChatReplyCore("มีรถ โตโยต้า Corolla 2020 ไหม", inventory, { chatSessionId: sessionId });
  ok("T8 explicit model returns Corolla 2020", (r?.carCards?.[0]?.id ?? "") === "corolla-2020");
}

console.log(`\n=== v22.70 result: ${pass} passed, ${fail} failed ===`);
if (process.exitCode) process.exit(process.exitCode);
