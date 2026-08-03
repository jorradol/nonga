/**
 * WP-VD01A — Signed-in bridge must not overwrite Hosting discovery with ask-select.
 * Owner FAIL: "อยากได้ Toyota เกียร์ออโต้" → stale Cloud Run "กดดูรายละเอียดรถ…"
 *
 * npm run test:wp-vd01a-signed-in-bridge-discovery-precedence
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

import {
  tryOrchestrateChatReplyCore,
  type OrchestratedChatReply,
} from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { BUYER_ASK_SELECT_CAR_FIRST } from "../src/services/ai/chat/chatBuyerFactsQa.ts";
import { shouldApplyBridgeUserVisibleText } from "../src/services/ai/chat/chatUserVisibleOrchestrateClient.ts";
import { saveChatCarContext } from "../src/utils/chatCarContext.ts";

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

const INVENTORY: ChatInventoryCar[] = [
  {
    id: "hrv-2014",
    title: "Honda HR-V",
    brand: "Honda",
    model: "HR-V",
    year: 2014,
    price: 429000,
    mileage: 120000,
    transmission: "AT",
    bodyType: "SUV",
    listingStatus: "published",
    images: ["https://example.com/hrv14.jpg"],
  },
  {
    id: "hrv-2020",
    title: "Honda HR-V",
    brand: "Honda",
    model: "HR-V",
    year: 2020,
    price: 589000,
    mileage: 55000,
    transmission: "AT",
    bodyType: "SUV",
    listingStatus: "published",
    images: ["https://example.com/hrv20.jpg"],
  },
  {
    id: "vios-2019",
    title: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    year: 2019,
    price: 389000,
    mileage: 80000,
    transmission: "เกียร์ออโต้",
    bodyType: "sedan",
    listingStatus: "published",
    images: ["https://example.com/vios.jpg"],
  },
];

const LEGACY_ASK_SELECT = BUYER_ASK_SELECT_CAR_FIRST;
const MSG = "อยากได้ Toyota เกียร์ออโต้";

function oldMerge(
  orchestrated: OrchestratedChatReply,
  bridgedUserVisibleText: string
): OrchestratedChatReply {
  return { ...orchestrated, text: bridgedUserVisibleText };
}

function guardedMerge(
  userMessage: string,
  orchestrated: OrchestratedChatReply,
  bridgedUserVisibleText: string
): OrchestratedChatReply {
  if (
    shouldApplyBridgeUserVisibleText({
      userMessage,
      orchestratedText: orchestrated.text,
      bridgedText: bridgedUserVisibleText,
    })
  ) {
    return { ...orchestrated, text: bridgedUserVisibleText };
  }
  return orchestrated;
}

function runOwnerPrefix(sessionId: string): void {
  memoryStore.clear();
  const s1 = tryOrchestrateChatReplyCore(
    "มีงบไม่เกิน 600,000 บาท อยากได้รถครอบครัว",
    INVENTORY,
    { chatSessionId: sessionId }
  );
  if (s1?.carCards?.length) saveChatCarContext(s1.carCards);
  const s2 = tryOrchestrateChatReplyCore(
    "อยากได้ SUV ปีใหม่ งบประมาณหกแสน",
    INVENTORY,
    { chatSessionId: sessionId }
  );
  if (s2?.carCards?.length) saveChatCarContext(s2.carCards);
}

console.log("=== WP-VD01A signed-in bridge discovery precedence ===\n");

// T1 — Hosting client discovery for Toyota + AT
{
  runOwnerPrefix("vd01a-bridge-t1");
  const client = tryOrchestrateChatReplyCore(MSG, INVENTORY, {
    chatSessionId: "vd01a-bridge-t1",
  });
  const text = client?.text ?? "";
  ok("T1 client skipGemini", Boolean(client?.skipGemini), text.slice(0, 80));
  ok("T1 client discovery copy", /เข้าใจเงื่อนไข/.test(text), text.slice(0, 120));
  ok(
    "T1 client not ask-select",
    !/กดดูรายละเอียดรถคันที่สนใจ/.test(text),
    text.slice(0, 120)
  );
  ok("T1 client labels Toyota", /Toyota|โตโยต้า/i.test(text), text.slice(0, 120));
  ok("T1 client labels auto", /เกียร์อัตโนมัติ|ออโต้/i.test(text), text.slice(0, 120));
}

// T2 — Unguarded bridge overwrite reproduces Owner FAIL
{
  runOwnerPrefix("vd01a-bridge-t2");
  const client = tryOrchestrateChatReplyCore(MSG, INVENTORY, {
    chatSessionId: "vd01a-bridge-t2",
  });
  const merged = client ? oldMerge(client, LEGACY_ASK_SELECT) : null;
  ok(
    "T2 old merge overwrites with ask-select",
    (merged?.text ?? "") === LEGACY_ASK_SELECT
  );
}

// T3 — Guarded merge keeps Hosting discovery
{
  runOwnerPrefix("vd01a-bridge-t3");
  const client = tryOrchestrateChatReplyCore(MSG, INVENTORY, {
    chatSessionId: "vd01a-bridge-t3",
  });
  const merged = client ? guardedMerge(MSG, client, LEGACY_ASK_SELECT) : null;
  const text = merged?.text ?? "";
  ok("T3 keeps เข้าใจเงื่อนไข", /เข้าใจเงื่อนไข/.test(text), text.slice(0, 120));
  ok(
    "T3 does not ask-select",
    !/กดดูรายละเอียดรถคันที่สนใจ/.test(text),
    text.slice(0, 120)
  );
  ok("T3 text unchanged from client", text === (client?.text ?? ""));
}

// T4 — Guard unit: discovery reply + ask-select bridge → false
{
  ok(
    "T4 guard blocks ask-select over discovery",
    shouldApplyBridgeUserVisibleText({
      userMessage: MSG,
      orchestratedText:
        "เข้าใจเงื่อนไข: ยี่ห้อ Toyota, เกียร์อัตโนมัติ\nพบรถที่ตรงเงื่อนไข 1 คัน",
      bridgedText: LEGACY_ASK_SELECT,
    }) === false
  );
}

// T5 — Guard unit: discovery intent message alone blocks ask-select even if copy varies
{
  ok(
    "T5 guard blocks ask-select on discovery userMessage",
    shouldApplyBridgeUserVisibleText({
      userMessage: MSG,
      orchestratedText: "น้องเอค้นจาก Inventory ตามยี่ห้อและเกียร์ที่บอกมาครับ",
      bridgedText: LEGACY_ASK_SELECT,
    }) === false
  );
}

// T6 — Non-discovery polish still allowed
{
  ok(
    "T6 greeting polish still applies",
    shouldApplyBridgeUserVisibleText({
      userMessage: "สวัสดีครับ",
      orchestratedText: "สวัสดีครับ",
      bridgedText: "สวัสดีครับ น้องเอพร้อมช่วยเรื่องรถครับ",
    }) === true
  );
}

// T7 — Which-car bridge also blocked over discovery
{
  ok(
    "T7 which-car bridge blocked over discovery",
    shouldApplyBridgeUserVisibleText({
      userMessage: MSG,
      orchestratedText: "เข้าใจเงื่อนไข: ยี่ห้อ Toyota\nไม่พบรถที่ตรงครบทุกเงื่อนไข",
      bridgedText:
        "หมายถึงรถคันไหนครับ กดเลือกรถจากการ์ด หรือส่งลิงก์รถมาให้น้องเอได้เลยครับ",
    }) === false
  );
}

console.log(
  `\n=== WP-VD01A bridge precedence result: ${pass} passed, ${fail} failed ===`
);
if (process.exitCode) process.exit(process.exitCode);
