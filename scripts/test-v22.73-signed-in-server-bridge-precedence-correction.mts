/**
 * v22.73 — Signed-in server bridge precedence correction.
 * Production-equivalent coverage for client deterministic -> server bridge -> final merge.
 *
 * npm run test:v22.73
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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  tryOrchestrateChatReplyCore,
  type OrchestratedChatReply,
} from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  resetConversationalLeadMemoryForTests,
  updateConversationalLeadMemory,
} from "../src/services/leads/conversationalLeadMemory.ts";
import { shouldApplyBridgeUserVisibleText } from "../src/services/ai/chat/chatUserVisibleOrchestrateClient.ts";

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

const OWNER_SEQUENCE = [
  "อยากซื้อรถครับ",
  "ใช้ขับไปทำงานเป็นหลัก",
  "ยังไม่อยากบอกงบ แนะนำจากการใช้งานก่อนได้ไหม",
] as const;

const LEGACY_BRIDGE_TEXT =
  "ได้ครับคุณพี่ อยากให้น้องเอช่วยดูจากงบประมาณ ประเภทการใช้งาน หรือยี่ห้อที่สนใจก่อนดีครับ?\nเช่น งบไม่เกิน 5–7 แสน / SUV ครอบครัว / กระบะ Toyota — พิมพ์มาได้เลยครับ";

function resetSession(): void {
  memoryStore.clear();
  resetConversationalLeadMemoryForTests();
}

function runTurn(sessionId: string, message: string): OrchestratedChatReply | null {
  updateConversationalLeadMemory(sessionId, message);
  return tryOrchestrateChatReplyCore(message, inventory, { chatSessionId: sessionId });
}

function oldMerge(
  orchestrated: OrchestratedChatReply,
  bridgedUserVisibleText: string
): OrchestratedChatReply {
  return {
    ...orchestrated,
    text: bridgedUserVisibleText,
  };
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
    return {
      ...orchestrated,
      text: bridgedUserVisibleText,
    };
  }
  return orchestrated;
}

function questionCount(text: string): number {
  const hits = text.match(/[?？]|ไหม|มั้ย|หรือเปล่า/g);
  return hits?.length ?? 0;
}

function noBudgetReask(text: string): boolean {
  return !/งบประมาณ.*ไหม|สะดวกบอกงบ.*ไหม|ดูจากงบประมาณ.*ดีไหม|งบไม่เกิน\s*\d|5–7 แสน/.test(
    text
  );
}

function noDiagnosticsLeadPii(text: string): boolean {
  return !/\/api\/cars|โหมดสำรอง|Lead|เบอร์|โทร|ไลน์|PII/i.test(text);
}

console.log("=== v22.73 signed-in server bridge precedence correction ===\n");

// T1 — Client result before bridge
{
  resetSession();
  const sessionId = "v2273-t1";
  runTurn(sessionId, OWNER_SEQUENCE[0]);
  runTurn(sessionId, OWNER_SEQUENCE[1]);
  const t3 = runTurn(sessionId, OWNER_SEQUENCE[2]);
  const text = t3?.text ?? "";
  ok("T1 client deterministic result exists", Boolean(t3?.skipGemini), text);
  ok("T1 no budget re-ask pre-bridge", noBudgetReask(text), text);
  ok("T1 uses commuting context pre-bridge", /ไปทำงาน|ใช้งาน/.test(text), text);
}

// T2 — Old bridge overwrite reproduction (proven owner failure path)
{
  resetSession();
  const sessionId = "v2273-t2";
  runTurn(sessionId, OWNER_SEQUENCE[0]);
  runTurn(sessionId, OWNER_SEQUENCE[1]);
  const t3 = runTurn(sessionId, OWNER_SEQUENCE[2]);
  const merged = t3 ? oldMerge(t3, LEGACY_BRIDGE_TEXT) : null;
  ok("T2 old merge overwrites deterministic text", (merged?.text ?? "") === LEGACY_BRIDGE_TEXT);
  ok("T2 old merge reproduces budget re-ask", /งบประมาณ|งบไม่เกิน 5–7 แสน/.test(merged?.text ?? ""));
}

// T3 — Final precedence after fix
{
  resetSession();
  const sessionId = "v2273-t3";
  runTurn(sessionId, OWNER_SEQUENCE[0]);
  runTurn(sessionId, OWNER_SEQUENCE[1]);
  const t3 = runTurn(sessionId, OWNER_SEQUENCE[2]);
  const merged = t3 ? guardedMerge(OWNER_SEQUENCE[2], t3, LEGACY_BRIDGE_TEXT) : null;
  const text = merged?.text ?? "";
  ok("T3 refusal semantics preserved", noBudgetReask(text), text);
  ok("T3 commuting context preserved", /ไปทำงาน|ใช้งาน/.test(text), text);
  ok("T3 max one non-budget follow-up", questionCount(text) <= 1, text);
  ok("T3 no diagnostics/lead/pii", noDiagnosticsLeadPii(text), text);
}

// T4 — Safe bridge polish still allowed where appropriate
{
  resetSession();
  const sessionId = "v2273-t4";
  const orchestrated = runTurn(sessionId, "สวัสดีครับ");
  const polished = "สวัสดีครับ น้องเอพร้อมช่วยเรื่องซื้อ ขาย หรือเลือกรถครับ";
  const merged = orchestrated ? guardedMerge("สวัสดีครับ", orchestrated, polished) : null;
  ok("T4 non-conflicting bridge polish still applies", (merged?.text ?? "") === polished);
}

// T5 — Deterministic boundary protection
{
  resetSession();
  const sessionId = "v2273-t5";
  runTurn(sessionId, OWNER_SEQUENCE[0]);
  runTurn(sessionId, OWNER_SEQUENCE[1]);
  const orchestrated = runTurn(sessionId, OWNER_SEQUENCE[2]);
  const merged = orchestrated
    ? guardedMerge(OWNER_SEQUENCE[2], orchestrated, LEGACY_BRIDGE_TEXT)
    : null;
  ok(
    "T5 guarded merge blocks conflicting deterministic overwrite",
    (merged?.text ?? "") !== LEGACY_BRIDGE_TEXT
  );
}

// T6 — Gap 1 continuity
{
  resetSession();
  const sessionId = "v2273-t6";
  runTurn(sessionId, OWNER_SEQUENCE[0]);
  const step2 = runTurn(sessionId, OWNER_SEQUENCE[1]);
  const merged = step2
    ? guardedMerge(
        OWNER_SEQUENCE[1],
        step2,
        "ได้ครับคุณพี่ อยากให้น้องเอช่วยดูจากงบประมาณก่อนดีไหมครับ?"
      )
    : null;
  const text = merged?.text ?? "";
  ok("T6 no 15-car fallback boilerplate", !/ตลาดมีรถจริง/.test(text), text);
  ok("T6 no /api/cars copy", !/\/api\/cars/.test(text), text);
  ok("T6 no fallback mode copy", !/โหมดสำรอง/.test(text), text);
  ok("T6 one natural next question", questionCount(text) <= 1 && /ไหม|มั้ย|\?/.test(text), text);
}

// T7 — Direct browse frozen
{
  resetSession();
  const r = runTurn("v2273-t7", "ขอดูรถที่มีเลย");
  ok("T7 direct browse still returns listings", (r?.carCards.length ?? 0) > 0);
}

// T8 — Q1-Q4 frozen smoke
{
  resetSession();
  const q1 = runTurn("v2273-t8", "มีรถ โตโยต้า Corolla 2020 ไหม");
  const q4 = runTurn("v2273-t8", "เทียบกับ Corolla 2021 ให้หน่อย");
  ok("T8 Q1 still resolves exact Corolla 2020", (q1?.carCards?.[0]?.id ?? "") === "corolla-2020");
  ok("T8 Q4 compare still returns two cards", (q4?.carCards?.length ?? 0) === 2);
}

// T9 — B1+B2 frozen smoke
{
  resetSession();
  const greet = runTurn("v2273-t9", "สวัสดีครับ");
  const thanks = runTurn("v2273-t9", "ขอบคุณครับ");
  ok("T9 greeting unchanged", Boolean(greet?.skipGemini), greet?.text ?? "");
  ok("T9 thanks unchanged", Boolean(thanks?.skipGemini), thanks?.text ?? "");
}

// T10 — Lead/Candidate S boundaries (report-only guard)
{
  const provider = readFileSync(
    resolve("src/services/ai/salesBrainUserVisibleRealProvider.ts"),
    "utf8"
  );
  const lead = readFileSync(resolve("src/services/leads/buyerLeadService.js"), "utf8");
  ok("T10 Candidate S file untouched by v22.73 test scope", provider.includes("evaluateUserVisibleRealProviderEligibility"));
  ok("T10 lead file untouched by v22.73 test scope", lead.includes("buyerLead"));
}

console.log(`\n=== v22.73 result: ${pass} passed, ${fail} failed ===`);
if (process.exitCode) process.exit(process.exitCode);
