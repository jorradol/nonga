/**
 * v6.1D — Admin Shadow Debug UI / Read-only Panel / User-visible Off (static validation only)
 * npm run test:v61d-admin-shadow-debug-ui-read-only-panel
 */
import { readFileSync } from "node:fs";
import {
  ADMIN_SHADOW_SMOKE_CASE_IDS,
  ADMIN_SHADOW_SMOKE_ROUTE,
} from "../src/services/ai/adminShadowSmokeApi.ts";
import {
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES,
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE,
} from "../src/services/ai/salesBrainServerShadowSmoke.ts";
import { NONGA_AI_USER_VISIBLE_ENABLED_ENV } from "../src/services/ai/salesBrainRuntimeFlags.ts";

const DOC_PATH = "docs/v6.1D-admin-shadow-debug-ui-read-only-panel.md";
const HEAD_SHA = "1d2a4dc8b1d2c5959392624b5eca1545ede26700";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1D Admin Shadow Debug UI / Read-only Panel ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61d-admin-shadow-debug-ui-read-only-panel.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const appTsx = readFileSync("src/App.tsx", "utf8");
const routeSync = readFileSync("src/utils/appRouteSync.ts", "utf8");
const storeTs = readFileSync("src/store.ts", "utf8");
const headerTsx = readFileSync("src/components/Header.tsx", "utf8");
const adminDash = readFileSync("src/components/admin/AdminDashboardView.tsx", "utf8");
const uiView = readFileSync("src/components/admin/AdminShadowSmokeDebugView.tsx", "utf8");
const apiClient = readFileSync("src/services/ai/adminShadowSmokeApi.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const chatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");
const routeGuard = readFileSync("src/components/auth/RouteGuard.tsx", "utf8");

// --- doc exists + v6.1D ---
{
  ok("doc v61d exists", doc.length > 2000);
  ok("doc v6.1D label", doc.includes("v6.1D"));
  ok("doc read-only panel", /read-only panel|read-only shadow smoke ui/i.test(doc));
  ok("doc no deploy in slice", /ยังไม่ deploy|not done/i.test(docLower));
  ok("doc HEAD 1d2a4dc", doc.includes(HEAD_SHA) || doc.includes("1d2a4dc"));
  ok("doc references v61c v61b", doc.includes("v6.1C") && doc.includes("v6.1B"));
}

// --- routing / guard ---
{
  ok("app view admin-shadow-smoke", appTsx.includes('"admin-shadow-smoke"'));
  ok("app RequireAdmin wraps view", /admin-shadow-smoke[\s\S]*RequireAdmin|RequireAdmin[\s\S]*AdminShadowSmokeDebugView/.test(appTsx));
  ok("app imports AdminShadowSmokeDebugView", appTsx.includes("AdminShadowSmokeDebugView"));
  ok("route sync pathname", routeSync.includes("/admin/shadow-smoke"));
  ok("route sync view id", routeSync.includes("admin-shadow-smoke"));
  ok("store view id", storeTs.includes("admin-shadow-smoke"));
  ok("admin dashboard menu link", adminDash.includes('setView("admin-shadow-smoke")'));
  ok("header no shadow smoke public link", !headerTsx.includes("admin-shadow-smoke"));
  ok("header no shadow-smoke pathname", !headerTsx.includes("/admin/shadow-smoke"));
  ok("route guard canAccessAdmin", routeGuard.includes("canAccessAdmin"));
}

// --- fixed case buttons SS-01..SS-08 ---
{
  ok("ui maps case buttons", /ADMIN_SHADOW_SMOKE_CASE_IDS\.map/.test(uiView));
  ok("ui runAdminShadowSmokeCase", uiView.includes("runAdminShadowSmokeCase"));
  for (const caseId of ADMIN_SHADOW_SMOKE_CASE_IDS) {
    ok(`api case id ${caseId}`, apiClient.includes(`"${caseId}"`));
  }
  ok("api 8 case ids", ADMIN_SHADOW_SMOKE_CASE_IDS.length === 8);
  ok(
    "api case ids match server module",
    ADMIN_SHADOW_SMOKE_CASE_IDS.every((id) =>
      Object.prototype.hasOwnProperty.call(SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES, id)
    )
  );
}

// --- no custom prompt / upload / real data input ---
{
  ok("ui no textarea", !/<textarea/i.test(uiView));
  ok("ui no freeform message input", !/<input[^>]+type=["']text["']/i.test(uiView));
  ok("ui no custom prompt field", !/custom prompt|custom message|placeholder=.*prompt/i.test(uiView.toLowerCase()));
  ok("ui no file input", !/<input[^>]+type=["']file["']/i.test(uiView));
  ok("ui no upload", !/upload|type=\"file\"/i.test(uiView));
  ok("ui no listing id input", !/listingId|listing-id/i.test(uiView));
  ok("ui no phone input", !/phone|เบอร์/i.test(uiView));
  ok("ui safety notice fixed cases", /fixed cases|ปุ่ม fixed cases/i.test(uiView));
}

// --- API client endpoint only ---
{
  ok("api route constant", apiClient.includes(ADMIN_SHADOW_SMOKE_ROUTE));
  ok("api route matches server", ADMIN_SHADOW_SMOKE_ROUTE === SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE);
  ok("api POST only endpoint", apiClient.includes('method: "POST"'));
  ok("api body caseId only", /JSON\.stringify\(\{\s*caseId\s*\}\)/.test(apiClient));
  ok("api admin auth headers", apiClient.includes("adminAuthHeadersAsync"));
  ok("api no generateContent", !/generateContent/.test(apiClient));
  ok("api no gemini url", !/generativelanguage\.googleapis\.com/.test(apiClient));
  ok("api no openai url", !/api\.openai\.com/.test(apiClient));
}

// --- UI displays flags ---
{
  ok("ui readOnly flag", uiView.includes("readOnly"));
  ok("ui userVisibleOff flag", uiView.includes("userVisibleOff"));
  ok("ui providerNetwork flag", uiView.includes("providerNetwork"));
  ok("ui success flag", uiView.includes("success"));
  ok("ui provider mock", /provider.*mock|mock provider/i.test(uiView));
  ok("ui legacy reference label", /legacy reference|unchanged/i.test(uiView));
  ok("ui redacted result heading", /redacted result/i.test(uiView));
  ok("ui no secret env display", !/GEMINI_API_KEY\s*[:=]\s*['"][^'"]{8,}/.test(uiView));
}

// --- no user-visible AI enable ---
{
  ok("ui no user visible true env", !/NONGA_AI_USER_VISIBLE_ENABLED\s*=\s*['"]true['"]/.test(uiView));
  ok("api no user visible true", !/NONGA_AI_USER_VISIBLE_ENABLED\s*=\s*['"]true['"]/.test(apiClient));
  ok(
    "runtime flag env name exists in module",
    NONGA_AI_USER_VISIBLE_ENABLED_ENV === "NONGA_AI_USER_VISIBLE_ENABLED"
  );
}

// --- chat path unchanged ---
{
  ok("useChat wires shadow chat path", useChat.includes("wireShadowChatPath"));
  ok("useChat no evaluateSalesBrainShadowRuntime", !useChat.includes("evaluateSalesBrainShadowRuntime"));
  ok("chat path legacy only", /legacyUserVisibleText|legacyUserVisibleResponse/i.test(chatPath));
  ok("ui no wireShadowChatPath override", !uiView.includes("wireShadowChatPath"));
}

// --- no payment / lead / settlement mutation ---
{
  ok("ui no settlement write", !/settlement|invoice|payment/i.test(uiView.toLowerCase()));
  ok("api no settlement write", !/settlement|invoice|payment/i.test(apiClient.toLowerCase()));
  ok("ui no buyer lead", !/buyerLead|sellerReveal|outcome/i.test(uiView));
  ok("api no buyer lead", !/buyerLead|sellerReveal|outcome/i.test(apiClient));
}

// --- forbidden section doc ---
{
  ok("forbidden no deploy", /Cloud Run.*not done|ยังไม่ deploy/i.test(docLower));
  ok("forbidden user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|ไม่เปิด/i.test(docLower));
  ok("forbidden no paid ai", /paid.*AI|paid ai|provider network/i.test(docLower));
  ok("forbidden no public debug", /public debug|public debug page/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
}

// --- no secret values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 16)}`, !pat.test(doc));
    ok(`ui no secret ${pat.source.slice(0, 16)}`, !pat.test(uiView));
    ok(`api no secret ${pat.source.slice(0, 16)}`, !pat.test(apiClient));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v61d script", pkg.includes("test:v61d-admin-shadow-debug-ui-read-only-panel"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61d-admin-shadow-debug-ui-read-only-panel.mts")
  );
}

console.log("\nDone v6.1D Admin Shadow Debug UI / Read-only Panel tests.");
if (process.exitCode) process.exit(process.exitCode);
