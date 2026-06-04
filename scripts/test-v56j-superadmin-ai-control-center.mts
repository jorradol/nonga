/**
 * v5.6J — SuperAdmin AI Control Center foundation + regression guards
 * npm run test:v56j-superadmin-ai-control-center
 */
import { readFileSync, existsSync } from "node:fs";
import {
  assertAiControlSafeForFlow,
  canUseSmartSalesAi,
  getDefaultAiControlConfig,
  isFullAiControlMode,
  resolveAiControlConfig,
  shouldFallbackToTemplate,
} from "../src/services/ai/aiControlConfig.ts";
import {
  assertNoFrontendApiKeyLeak,
  containsBuyerCommissionLanguage,
  containsCreditRiskLabel,
  isWithinDailyUserCallLimit,
  isWithinSessionCallLimit,
  redactPiiForAiLog,
} from "../src/services/ai/aiControlGuardrails.ts";
import {
  isBuyerLeadAiTextParseEnabled,
  isSmartSalesAiEnabled,
  BUYER_LEAD_AI_TEXT_PARSE_ENABLED,
  NONGA_SMART_SALES_MODE,
} from "../src/services/leads/smartSalesMode.ts";
import { trySmartSalesAiBuyerLeadParse } from "../src/services/leads/smartSalesAiHooks.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

// --- default config ---
{
  const def = getDefaultAiControlConfig();
  ok("default mode economy", def.mode === "economy");
  ok("full_ai not default", def.mode !== "full_ai");
  ok("fallback template default", def.fallbackToTemplate === true);
  ok("lead parse off default", def.allowLeadAiParsing === false);
  ok("max tokens set", def.maxTokensPerReply >= 64);
  ok("max calls per session", def.maxAiCallsPerSession >= 1);
  ok("max calls per day", def.maxAiCallsPerUserPerDay >= 1);
}

// --- smart_sales only when env set ---
{
  const eco = resolveAiControlConfig({});
  ok("env default economy", eco.mode === "economy");
  ok("economy no smart sales parse", !canUseSmartSalesAi("buyerLeadTextParse", eco));

  const smart = resolveAiControlConfig({ NONGA_AI_CONTROL_MODE: "smart_sales" });
  ok("smart_sales mode resolves", smart.mode === "smart_sales");
  ok(
    "smart_sales allows parse flow",
    canUseSmartSalesAi("buyerLeadTextParse", smart)
  );
  ok(
    "buyer lead capture blocked",
    assertAiControlSafeForFlow("buyerLeadCapture", smart).ok === false
  );
}

// --- full_ai blocked in v5.6J ---
{
  const full = resolveAiControlConfig({ NONGA_AI_CONTROL_MODE: "full_ai" });
  ok("full_ai config exists", isFullAiControlMode(full));
  ok("full_ai cannot use parse", !canUseSmartSalesAi("buyerLeadTextParse", full));
  ok(
    "full_ai assert blocked",
    assertAiControlSafeForFlow("buyerLeadTextParse", full).ok === false
  );
}

// --- missing config fallback ---
{
  const bad = resolveAiControlConfig({ NONGA_AI_CONTROL_MODE: "not-a-real-mode" });
  ok("unknown mode -> economy", bad.mode === "economy");
}

// --- no Gemini when flags off ---
{
  ok("compile parse flag false", BUYER_LEAD_AI_TEXT_PARSE_ENABLED === false);
  ok("compile smart sales economy", NONGA_SMART_SALES_MODE === "economy");
  ok("runtime smart sales off", !isSmartSalesAiEnabled({}));
  ok("runtime parse off", !isBuyerLeadAiTextParseEnabled({}));
  const ai = await trySmartSalesAiBuyerLeadParse({
    message: "สนใจรถ งบ 8 แสน",
    existingFields: { listingId: "x" },
  });
  ok("trySmartSalesAi returns null when off", ai === null);
}

// --- guardrails ---
{
  ok("credit risk label blocked", containsCreditRiskLabel("ผู้ซื้อติดบูโร"));
  ok("commission buyer blocked", containsBuyerCommissionLanguage("ค่าคอมเท่าไหร่"));
  const redacted = redactPiiForAiLog("โทร 0812345678 หรือ a@b.com");
  ok("pii redact phone", redacted.includes("[phone-redacted]"));
  ok("pii redact email", redacted.includes("[email-redacted]"));
  ok("session limit", isWithinSessionCallLimit(0, getDefaultAiControlConfig()));
  ok("daily limit", isWithinDailyUserCallLimit(0, getDefaultAiControlConfig()));
  ok("should fallback template", shouldFallbackToTemplate());
}

// --- buyer modal / routes untouched ---
{
  const modal = readFileSync("src/components/chat/BuyerLeadConsentModal.tsx", "utf8");
  const host = readFileSync("src/components/chat/BuyerLeadConsentModalHost.tsx", "utf8");
  ok("buyer modal exists", modal.includes("buyer-lead-consent-modal"));
  ok("modal host submit", host.includes("submitBuyerLeadConsent"));
  const routes = readFileSync("src/server/buyerLeadQueueRoutes.ts", "utf8");
  ok("reveal route intact", routes.includes("reveal"));
  ok("outcome route intact", routes.includes("outcome"));
  ok("routes no ai control persist", !routes.includes("resolveAiControlConfig"));
}

// --- my listings / marketplace not touched ---
{
  const my = readFileSync("src/components/MyListingsView.tsx", "utf8");
  ok("my listings pending badge", my.includes("PENDING_SALE_OWNER_BADGE"));
  ok("my listings no ai control", !my.includes("aiControlConfig"));
  const cover = readFileSync("src/components/listings/ListingCoverImage.tsx", "utf8");
  ok("listing cover intact", cover.includes("ListingCoverImage"));
}

// --- preview component read-only, not wired ---
{
  const preview = readFileSync(
    "src/components/admin/ai/SmartSalesAiControlPreview.tsx",
    "utf8"
  );
  ok("preview read-only flag", preview.includes('data-readonly="true"'));
  ok("preview testid", preview.includes("smart-sales-ai-control-preview"));
  const dash = readFileSync("src/components/admin/AdminDashboardView.tsx", "utf8");
  ok(
    "preview not imported in dashboard v56j",
    !dash.includes("SmartSalesAiControlPreview")
  );
}

// --- bundle no API key in client env pattern ---
{
  const guardPath = "src/lib/firebase/firebaseConfigGuard.ts";
  ok("firebase guard exists", existsSync(guardPath));
  ok(
    "detect fake key in sample",
    !assertNoFrontendApiKeyLeak(
      "const key = 'AIzaSyAltRqML5pWDsz0MGb9Qwp9xP_wcwYRaT8';"
    )
  );
  ok("clean text passes leak check", assertNoFrontendApiKeyLeak("no secrets here"));
}

// --- docs ---
{
  const doc = readFileSync("docs/v5.6J-superadmin-ai-control-center.md", "utf8");
  ok("doc default economy", doc.includes("economy"));
  ok("doc rollback", doc.includes("rollback"));
  ok("doc audit section", doc.includes("Existing controls audit"));
}

console.log("\nDone v5.6J SuperAdmin AI Control Center tests.");
if (process.exitCode) process.exit(process.exitCode);
