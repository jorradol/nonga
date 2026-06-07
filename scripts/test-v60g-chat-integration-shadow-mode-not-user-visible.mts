/**
 * v6.0G — Chat integration shadow mode / not user visible (offline tests)
 * npm run test:v60g-chat-integration-shadow-mode-not-user-visible
 */
import { readFileSync } from "node:fs";
import {
  compareLegacyVsSalesBrainRoute,
  evaluateSalesBrainShadowMode,
  inferLegacyRouteLabel,
  resolveSalesBrainShadowModeEnabled,
  SALES_BRAIN_SHADOW_MODE_DEFAULT_ENABLED,
} from "../src/services/ai/salesBrainShadowMode.ts";
import { SalesBrainRealProviderNetworkDisabledError, createSalesBrainAdapter } from "../src/services/ai/salesBrainAdapter.ts";

const DOC_PATH = "docs/v6.0G-chat-integration-shadow-mode-not-user-visible.md";
const LEGACY_RESPONSE = "legacy orchestrator reply — user sees this only";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0G Chat Integration Shadow Mode / Not User Visible ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const pkg = readFileSync("package.json", "utf8");
const shadowSrc = readFileSync("src/services/ai/salesBrainShadowMode.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v60g-chat-integration-shadow-mode-not-user-visible.mts",
  "utf8"
);

// --- doc exists + v6.0G ---
{
  ok("shadow doc exists", doc.length > 2500);
  ok("doc v6.0G label", doc.includes("v6.0G"));
  ok("doc shadow mode title", /shadow mode|not user visible/i.test(doc));
  ok("doc not wired status", /not wired|ยังไม่เปลี่ยน runtime|user-visible/i.test(docLower));
}

// --- shadow mode principles in doc ---
{
  ok("doc shadow parallel analysis", /คิดคู่ขนาน|parallel/i.test(docLower));
  ok("doc user visible legacy only", /userVisibleResponse|user-visible|legacy flow/i.test(doc));
  ok("doc shadow debug result", /shadowDebugResult|shadowEvaluation/i.test(doc));
  ok("doc mock provider only", /mock provider|mock only/i.test(docLower));
  ok("doc disabled by default", /disabled by default|default.*false/i.test(docLower));
  ok("doc production default off", /production.*off|production บังคับ off/i.test(docLower));
  ok("doc no raw pii", /no raw PII|raw PII|phone-redacted/i.test(doc));
  ok("doc references v60e v60f", doc.includes("v6.0E") && doc.includes("v6.0F"));
}

// --- no-go + forbidden in doc ---
{
  ok("doc no-go revenue write", /revenue write/i.test(docLower));
  ok("doc no-go settlement", /settlement/i.test(docLower));
  ok("doc no-go payment", /payment/i.test(docLower));
  ok("doc no-go contact reveal", /contact reveal/i.test(docLower));
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy|ห้าม deploy/i.test(docLower));
  ok("doc forbidden no env secrets", /env|secrets/i.test(docLower));
  ok("doc forbidden no paid ai", /paid AI|ไม่เรียก paid AI/i.test(doc));
  ok("doc forbidden no user visible change", /user-visible|user visible/i.test(docLower));
  ok("doc forbidden no production", /production/i.test(docLower));
  ok("doc forbidden no lead reveal outcome", /buyer lead|seller reveal|outcome/i.test(docLower));
  ok("doc forbidden no public signup", /public signup/i.test(docLower));
}

// --- module import ---
{
  ok("evaluateSalesBrainShadowMode importable", typeof evaluateSalesBrainShadowMode === "function");
  ok("default shadow disabled", SALES_BRAIN_SHADOW_MODE_DEFAULT_ENABLED === false);
}

// --- shadow disabled: user-visible unchanged ---
{
  const off = evaluateSalesBrainShadowMode({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    shadowModeEnabled: false,
    environment: "local",
  });
  ok("disabled shadow not active", off.shadowModeActive === false);
  ok("disabled user visible unchanged", off.userVisibleResponse === LEGACY_RESPONSE);
  ok("disabled skipped reason", off.skippedReason === "shadow_mode_disabled");
  ok("disabled no shadow debug", off.shadowDebugResult === undefined);
}

// --- production hard off ---
{
  ok(
    "production resolve off",
    resolveSalesBrainShadowModeEnabled({ shadowModeEnabled: true, environment: "production" }) === false
  );
  const prod = evaluateSalesBrainShadowMode({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    shadowModeEnabled: true,
    environment: "production",
  });
  ok("production shadow not active", prod.shadowModeActive === false);
  ok("production user visible unchanged", prod.userVisibleResponse === LEGACY_RESPONSE);
  ok("production skipped reason", prod.skippedReason === "production_shadow_disabled");
}

// --- shadow active: user-visible still unchanged ---
{
  const active = evaluateSalesBrainShadowMode({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    shadowModeEnabled: true,
    environment: "staging",
  });
  ok("active shadow mode", active.shadowModeActive === true);
  ok("active user visible unchanged", active.userVisibleResponse === LEGACY_RESPONSE);
  ok("active has shadow debug", Boolean(active.shadowDebugResult));
  ok("active mock provider", active.shadowDebugResult?.provider === "mock");
  ok("active buyer search intent", active.shadowDebugResult?.salesBrainIntent === "buyer.search");
  ok("active routes align", active.shadowDebugResult?.routesAlign === true);
}

// --- shadow result separate from visible ---
{
  const diffLegacy = "different legacy text 12345";
  const ev = evaluateSalesBrainShadowMode({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: diffLegacy,
    shadowModeEnabled: true,
    environment: "local",
  });
  ok("shadow debug separate from visible", ev.shadowDebugResult?.salesBrainIntent === "buyer.search");
  ok("visible not replaced by shadow", ev.userVisibleResponse === diffLegacy);
  ok("visible not sales brain plan", ev.userVisibleResponse !== ev.shadowDebugResult?.comparisonNotes);
}

// --- askFollowUp no listing ---
{
  const b03 = evaluateSalesBrainShadowMode({
    userMessage: "คันนี้ผ่อนได้ไหม",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    shadowModeEnabled: true,
    environment: "staging",
  });
  ok("SC-B03 shadow askFollowUp safety", b03.shadowDebugResult?.safetyDecision === "askFollowUp");
  ok("SC-B03 user visible unchanged", b03.userVisibleResponse === LEGACY_RESPONSE);
}

// --- real provider not used in shadow ---
{
  let realThrew = false;
  try {
    createSalesBrainAdapter({ provider: "real" }).route({
      userMessage: "test",
      userRole: "buyer",
    });
  } catch (e) {
    realThrew = e instanceof SalesBrainRealProviderNetworkDisabledError;
  }
  ok("real provider throws if invoked directly", realThrew);
  const shadow = evaluateSalesBrainShadowMode({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    shadowModeEnabled: true,
    environment: "local",
  });
  ok("shadow uses mock only", shadow.shadowDebugResult?.provider === "mock");
}

// --- no-go zones ---
{
  for (const msg of [
    "process payment for this lead",
    "settlement adjust write now",
    "generate invoice for deal",
    "reveal phone to seller now",
  ]) {
    const out = evaluateSalesBrainShadowMode({
      userMessage: msg,
      userRole: "admin",
      legacyUserVisibleResponse: LEGACY_RESPONSE,
      shadowModeEnabled: true,
      environment: "staging",
    });
    ok(`no-go ${msg.slice(0, 12)} safety`, out.shadowDebugResult?.safetyDecision === "no_go");
    ok(`no-go ${msg.slice(0, 12)} visible unchanged`, out.userVisibleResponse === LEGACY_RESPONSE);
  }
}

// --- no write tool IDs ---
{
  const allowed = evaluateSalesBrainShadowMode({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    shadowModeEnabled: true,
    environment: "local",
  });
  const caps = allowed.shadowDebugResult?.selectedCapabilities ?? [];
  ok("shadow caps present", caps.length > 0);
  ok(
    "shadow no forbidden cap pattern in intent",
    allowed.shadowDebugResult?.salesBrainIntent !== "revenueWrite"
  );
}

// --- PII: no raw phone in shadow output ---
{
  const phone = evaluateSalesBrainShadowMode({
    userMessage: "งบ 4 แสน โทร 0812345678",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    shadowModeEnabled: true,
    environment: "local",
  });
  ok("shadow no raw phone in json", !JSON.stringify(phone).includes("0812345678"));
  ok("shadow paramsHash present", Boolean(phone.shadowDebugResult?.paramsHash));
}

// --- legacy label inference ---
{
  const label = inferLegacyRouteLabel({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
  });
  ok("infer legacy buyer search", label === "legacy.tryOrchestrateChatReply.buyer_search");
  const cmp = compareLegacyVsSalesBrainRoute(label, "buyer.search");
  ok("compare legacy sales brain align", cmp.routesAlign === true);
}

// --- not wired: useChat / orchestrator ---
{
  ok("useChat no salesBrainShadowMode", !useChat.includes("salesBrainShadowMode"));
  ok("useChat no evaluateSalesBrainShadowMode", !useChat.includes("evaluateSalesBrainShadowMode"));
  ok("orchestrator no salesBrainShadowMode", !orch.includes("salesBrainShadowMode"));
  ok("useChat no salesBrainAdapter", !useChat.includes("salesBrainAdapter"));
  ok("orchestrator no salesBrainAdapter", !orch.includes("salesBrainAdapter"));
}

// --- shadow module static checks ---
{
  ok("shadow no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(shadowSrc));
  ok("shadow no generateContent", !/generateContent\s*\(/.test(shadowSrc));
  ok("shadow no firebase import", !/from\s+["']firebase/.test(shadowSrc));
  ok("shadow no http url literal", !/https?:\/\//.test(shadowSrc));
  ok("shadow uses mock adapter", shadowSrc.includes('provider: "mock"'));
  ok("shadow preserves userVisibleResponse", shadowSrc.includes("legacyUserVisibleResponse"));
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
  ok("package v60g script", pkg.includes("test:v60g-chat-integration-shadow-mode-not-user-visible"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60g-chat-integration-shadow-mode-not-user-visible.mts")
  );
}

console.log("\nDone v6.0G Chat Integration Shadow Mode / Not User Visible tests.");
if (process.exitCode) process.exit(process.exitCode);
