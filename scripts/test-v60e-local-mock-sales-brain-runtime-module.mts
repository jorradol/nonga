/**
 * v6.0E — Local mock Sales Brain runtime module (offline tests)
 * npm run test:v60e-local-mock-sales-brain-runtime-module
 */
import { readFileSync } from "node:fs";
import { routeSalesBrainMock } from "../src/services/ai/salesBrainMock.ts";

const NO_GO_WRITE_TOOL_IDS =
  /settlement.*write|payment\.|invoice\.|revenueWrite|contactReveal/i;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0E Local Mock Sales Brain Runtime Module ===\n");

const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v60e-local-mock-sales-brain-runtime-module.mts",
  "utf8"
);

// --- module import ---
{
  ok("routeSalesBrainMock importable", typeof routeSalesBrainMock === "function");
}

// --- buyer scenarios ---
{
  const b01 = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "high",
    aiFirstEnabled: true,
    aiProvider: "mock",
  });
  ok("SC-B01 buyer search intent", b01.intent === "buyer.search");
  ok("SC-B01 caps include CAP-04 CAP-05", b01.selectedCapabilities.includes("CAP-04"));
  ok("SC-B01 mock tool calls", b01.mockToolCalls.length >= 3);

  const b02 = routeSalesBrainMock({
    userMessage: "คันนี้ผ่อนได้ไหม ลดได้ไหม",
    userRole: "buyer",
    listingContext: { listingId: "L1", price: 450000, fieldsPresent: ["price"] },
    aiMode: "high",
  });
  ok("SC-B02 finance negotiate", b02.intent === "buyer.finance_negotiate");
  ok("SC-B02 consent path CAP-09", b02.selectedCapabilities.includes("CAP-09"));

  const b03 = routeSalesBrainMock({
    userMessage: "คันนี้ผ่อนได้ไหม",
    userRole: "buyer",
    aiMode: "high",
  });
  ok("SC-B03 askFollowUp no listing", b03.safetyDecision === "askFollowUp");
  ok("SC-B03 no hallucination ask text", Boolean(b03.askFollowUp?.includes("คันไหน")));
  ok("SC-B03 no mock tools when askFollowUp", b03.mockToolCalls.length === 0);
}

// --- seller scenarios ---
{
  const s01 = routeSalesBrainMock({
    userMessage: "ช่วยลงขายจากรูปให้หน่อย",
    userRole: "seller",
    flowContext: { attachedImageCount: 2 },
  });
  ok("SC-S01 image draft", s01.intent === "seller.image_draft");
  ok("SC-S01 CAP-01", s01.selectedCapabilities.includes("CAP-01"));

  const s02 = routeSalesBrainMock({
    userMessage: "ช่วยเขียนโพสต์ขาย",
    userRole: "seller",
    listingContext: { listingId: "L2", brand: "Toyota", fieldsPresent: ["brand"] },
  });
  ok("SC-S02 marketing copy", s02.intent === "seller.marketing_copy");
  ok("SC-S02 CAP-03", s02.selectedCapabilities.includes("CAP-03"));
}

// --- dealer scenarios ---
{
  const d01 = routeSalesBrainMock({
    userMessage: "มีไฟล์รถหลายคันจะเอาเข้า",
    userRole: "dealer",
  });
  ok("SC-D01 dealer import", d01.intent === "dealer.import");
  ok("SC-D01 CAP-11", d01.selectedCapabilities.includes("CAP-11"));

  const d02 = routeSalesBrainMock({
    userMessage: "ช่วยตอบลูกค้าคันนี้",
    userRole: "dealer",
    listingContext: { listingId: "L3", fieldsPresent: ["carTitle"] },
  });
  ok("SC-D02 suggested reply", d02.intent === "dealer.suggested_reply");
  ok("SC-D02 draft only", /Draft reply|no contact reveal/i.test(d02.responsePlan));
}

// --- admin / superadmin scenarios ---
{
  const a01 = routeSalesBrainMock({
    userMessage: "ดูสถานะ AI mode",
    userRole: "admin",
  });
  ok("SC-A01 admin ai mode", a01.intent === "admin.ai_control_readonly");

  const sa01 = routeSalesBrainMock({
    userMessage: "ดูสถานะ AI mode",
    userRole: "superadmin",
  });
  ok("SC-A01 superadmin ai mode", sa01.intent === "admin.ai_control_readonly");

  const a02 = routeSalesBrainMock({
    userMessage: "รายได้เดือนนี้เท่าไหร่",
    userRole: "admin",
  });
  ok("SC-A02 revenue readonly", a02.intent === "admin.revenue_readonly");
  ok("SC-A02 read-only plan", /read-only|no settlement write/i.test(a02.responsePlan));
}

// --- fallback: aiMode off ---
{
  const off = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "off",
  });
  ok("aiMode off fallback", off.fallback === true);
  ok("aiMode off CAP-15", off.selectedCapabilities.includes("CAP-15"));
  ok("aiMode off no mock calls", off.mockToolCalls.length === 0);
}

// --- fallback: aiFirstEnabled false ---
{
  const noFirst = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "high",
    aiFirstEnabled: false,
  });
  ok("aiFirstEnabled false fallback", noFirst.fallback === true);
}

// --- emergency kill switch ---
{
  const kill = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "high",
    emergencyKillSwitch: true,
  });
  ok("kill switch fallback", kill.fallback === true);
  ok("kill switch intent", kill.intent === "fallback.emergency_kill_switch");
  ok("kill switch no mock calls", kill.mockToolCalls.length === 0);
}

// --- no-go zones ---
{
  for (const [label, msg] of [
    ["payment", "process payment for this lead"],
    ["settlement write", "settlement adjust write now"],
    ["invoice", "generate invoice for deal"],
    ["contact reveal", "reveal phone to seller now"],
    ["revenue write", "revenue write record fee"],
  ] as const) {
    const out = routeSalesBrainMock({ userMessage: msg, userRole: "admin" });
    ok(`no-go ${label} safety`, out.safetyDecision === "no_go");
    ok(`no-go ${label} fallback`, out.fallback === true);
    ok(`no-go ${label} empty tools`, out.mockToolCalls.length === 0);
  }
}

// --- no write tools in allowed responses ---
{
  const allowed = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
  });
  const badTool = allowed.mockToolCalls.some((t) => NO_GO_WRITE_TOOL_IDS.test(t.toolId));
  ok("allowed route no write tool ids", !badTool);
}

// --- PII logging ---
{
  const phone = routeSalesBrainMock({
    userMessage: "งบ 4 แสน โทร 0812345678",
    userRole: "buyer",
  });
  ok("logRecord no raw phone", !JSON.stringify(phone.logRecord).includes("0812345678"));
}

// --- deterministic ---
{
  const input = {
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer" as const,
    aiMode: "high" as const,
  };
  const a = routeSalesBrainMock(input);
  const b = routeSalesBrainMock(input);
  ok(
    "deterministic output",
    a.intent === b.intent &&
      a.logRecord.paramsHash === b.logRecord.paramsHash &&
      JSON.stringify(a.mockToolCalls) === JSON.stringify(b.mockToolCalls)
  );
}

// --- no runtime chat wiring ---
{
  const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
  const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
  ok("useChat no salesBrainMock import", !useChat.includes("salesBrainMock"));
  ok("orchestrator no salesBrainMock import", !orch.includes("salesBrainMock"));
  ok("useChat no routeSalesBrainMock", !useChat.includes("routeSalesBrainMock"));
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no ai api fetch", !/fetch\s*\(\s*[`'"]\/api\//.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
}

// --- package.json ---
{
  ok("package v60e script", pkg.includes("test:v60e-local-mock-sales-brain-runtime-module"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60e-local-mock-sales-brain-runtime-module.mts")
  );
}

console.log("\nDone v6.0E Local Mock Sales Brain Runtime Module tests.");
if (process.exitCode) process.exit(process.exitCode);
