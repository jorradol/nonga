/**
 * v6.0F — Sales Brain adapter contract / not wired (offline tests)
 * npm run test:v60f-sales-brain-adapter-contract-not-wired
 */
import { readFileSync } from "node:fs";
import {
  createSalesBrainAdapter,
  resetDefaultSalesBrainAdapterForTests,
  routeWithSalesBrainAdapter,
  SalesBrainRealProviderNotAvailableError,
} from "../src/services/ai/salesBrainAdapter.ts";
import { routeSalesBrainMock } from "../src/services/ai/salesBrainMock.ts";
import { SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS } from "../src/services/ai/salesBrainTypes.ts";

const NO_GO_WRITE_TOOL_IDS = SALES_BRAIN_NO_GO_TOOL_ID_PATTERNS;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0F Sales Brain Adapter Contract / Not Wired ===\n");

const pkg = readFileSync("package.json", "utf8");
const adapterSrc = readFileSync("src/services/ai/salesBrainAdapter.ts", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v60f-sales-brain-adapter-contract-not-wired.mts",
  "utf8"
);

// --- adapter import ---
{
  ok("createSalesBrainAdapter importable", typeof createSalesBrainAdapter === "function");
  ok("routeWithSalesBrainAdapter importable", typeof routeWithSalesBrainAdapter === "function");
}

// --- default provider mock ---
{
  resetDefaultSalesBrainAdapterForTests();
  const adapter = createSalesBrainAdapter();
  ok("default provider mock", adapter.provider === "mock");

  const out = adapter.route({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "high",
  });
  ok("mock route buyer search", out.intent === "buyer.search");
  ok("mock routedVia mock", out.routedVia === "mock");
  ok("mock provider field", out.provider === "mock");
}

// --- routeWithSalesBrainAdapter delegates to mock ---
{
  resetDefaultSalesBrainAdapterForTests();
  const direct = routeSalesBrainMock({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "high",
  });
  const viaAdapter = routeWithSalesBrainAdapter({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "high",
  });
  ok("adapter matches mock intent", viaAdapter.intent === direct.intent);
  ok("adapter matches mock caps", JSON.stringify(viaAdapter.selectedCapabilities) === JSON.stringify(direct.selectedCapabilities));
  ok("adapter adds provider metadata", viaAdapter.provider === "mock");
}

// --- real provider throws, no network ---
{
  let threw = false;
  let code = "";
  try {
    createSalesBrainAdapter({ provider: "real" }).route({
      userMessage: "งบ 4 แสน",
      userRole: "buyer",
    });
  } catch (e) {
    threw = e instanceof SalesBrainRealProviderNotAvailableError;
    code = (e as SalesBrainRealProviderNotAvailableError).code;
  }
  ok("real provider throws controlled error", threw);
  ok("real provider error code", code === "SALES_BRAIN_REAL_PROVIDER_NOT_WIRED");

  resetDefaultSalesBrainAdapterForTests();
  let routeThrew = false;
  try {
    routeWithSalesBrainAdapter({
      userMessage: "งบ 4 แสน",
      userRole: "buyer",
      provider: "real",
    });
  } catch (e) {
    routeThrew = e instanceof SalesBrainRealProviderNotAvailableError;
  }
  ok("routeWithSalesBrainAdapter real throws", routeThrew);
}

// --- fallback: aiMode off ---
{
  const off = routeWithSalesBrainAdapter({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "off",
  });
  ok("aiMode off fallback", off.fallback === true);
  ok("aiMode off routedVia fallback", off.routedVia === "fallback");
  ok("aiMode off CAP-15", off.selectedCapabilities.includes("CAP-15"));
}

// --- fallback: aiFirstEnabled false ---
{
  const noFirst = routeWithSalesBrainAdapter({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "high",
    aiFirstEnabled: false,
  });
  ok("aiFirstEnabled false fallback", noFirst.fallback === true);
  ok("aiFirstEnabled false routedVia fallback", noFirst.routedVia === "fallback");
}

// --- fallback: emergency kill switch ---
{
  const kill = routeWithSalesBrainAdapter({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    aiMode: "high",
    emergencyKillSwitch: true,
  });
  ok("kill switch fallback", kill.fallback === true);
  ok("kill switch intent", kill.intent === "fallback.emergency_kill_switch");
  ok("kill switch routedVia fallback", kill.routedVia === "fallback");
}

// --- askFollowUp no listing hallucination ---
{
  const b03 = routeWithSalesBrainAdapter({
    userMessage: "คันนี้ผ่อนได้ไหม",
    userRole: "buyer",
    aiMode: "high",
  });
  ok("SC-B03 askFollowUp", b03.safetyDecision === "askFollowUp");
  ok("SC-B03 no mock tools", b03.mockToolCalls.length === 0);
  ok("SC-B03 ask text present", Boolean(b03.askFollowUp?.includes("คันไหน")));
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
    const out = routeWithSalesBrainAdapter({ userMessage: msg, userRole: "admin" });
    ok(`no-go ${label} safety`, out.safetyDecision === "no_go");
    ok(`no-go ${label} fallback`, out.fallback === true);
    ok(`no-go ${label} empty tools`, out.mockToolCalls.length === 0);
  }
}

// --- no write tool IDs in allowed route ---
{
  const allowed = routeWithSalesBrainAdapter({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
  });
  const badTool = allowed.mockToolCalls.some((t) => NO_GO_WRITE_TOOL_IDS.test(t.toolId));
  ok("allowed route no write tool ids", !badTool);
}

// --- PII logging ---
{
  const phone = routeWithSalesBrainAdapter({
    userMessage: "งบ 4 แสน โทร 0812345678",
    userRole: "buyer",
  });
  ok("logRecord no raw phone", !JSON.stringify(phone.logRecord).includes("0812345678"));
}

// --- not wired: useChat / orchestrator ---
{
  const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
  const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
  ok("useChat no salesBrainAdapter import", !useChat.includes("salesBrainAdapter"));
  ok("useChat no routeWithSalesBrainAdapter", !useChat.includes("routeWithSalesBrainAdapter"));
  ok("orchestrator no salesBrainAdapter import", !orch.includes("salesBrainAdapter"));
  ok("useChat no salesBrainMock import", !useChat.includes("salesBrainMock"));
  ok("orchestrator no salesBrainMock import", !orch.includes("salesBrainMock"));
}

// --- adapter source static checks ---
{
  ok("adapter no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(adapterSrc));
  ok("adapter no ai api fetch", !/fetch\s*\(\s*[`'"]\/api\//.test(adapterSrc));
  ok("adapter no generateContent", !/generateContent\s*\(/.test(adapterSrc));
  ok("adapter no firebase import", !/from\s+["']firebase/.test(adapterSrc));
  ok("adapter no http url literal", !/https?:\/\//.test(adapterSrc));
  ok("adapter delegates to routeSalesBrainMock", adapterSrc.includes("routeSalesBrainMock"));
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
}

// --- package.json ---
{
  ok("package v60f script", pkg.includes("test:v60f-sales-brain-adapter-contract-not-wired"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60f-sales-brain-adapter-contract-not-wired.mts")
  );
}

console.log("\nDone v6.0F Sales Brain Adapter Contract / Not Wired tests.");
if (process.exitCode) process.exit(process.exitCode);
