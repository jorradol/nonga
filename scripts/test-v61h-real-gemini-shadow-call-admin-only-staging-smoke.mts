/**
 * v6.1H — Real Gemini Shadow Call Admin-only / User-visible Off (static + module harness)
 * npm run test:v61h-real-gemini-shadow-call-admin-only-staging-smoke
 */
import type { NextFunction, Request, Response } from "express";
import { readFileSync } from "node:fs";
import { adminApiAuth } from "../src/server/apiAuth.ts";
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS,
  canAttemptAdminShadowRealProvider,
  isAdminShadowRealProviderEnabled,
  resetAdminShadowGeminiCallerForTests,
  setAdminShadowGeminiCallerForTests,
} from "../src/services/ai/salesBrainAdminShadowRealProvider.ts";
import {
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES,
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE,
  buildRedactedAdminShadowSmokePayload,
  handleAdminSalesBrainShadowSmokePost,
  resolveAdminShadowSmokeHandlerContext,
  runSalesBrainAdminShadowSmoke,
  stagingStyleShadowEnv,
} from "../src/services/ai/salesBrainServerShadowSmoke.ts";
import {
  NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  ADMIN_SHADOW_SMOKE_SLICE_ID,
  classifyAdminShadowProviderError,
  extractRedactedGeminiApiError,
  mapGeminiHttpStatusToFallbackReason,
} from "../src/services/ai/salesBrainAdminShadowDiagnostics.ts";
import {
  SalesBrainRealProviderMissingApiKeyError,
} from "../src/services/ai/salesBrainTypes.ts";
import {
  isGeminiApiKeyConfigured,
  isGeminiApiKeyPresent,
  SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED,
} from "../src/services/ai/salesBrainRealProvider.ts";
import { wireShadowChatPath } from "../src/services/ai/salesBrainShadowChatPath.ts";

const DOC_PATH =
  "docs/v6.1H-real-gemini-shadow-call-admin-only-staging-smoke.md";
const HEAD_SHA = "319fcc5f4c84eae425c6e4ba5bb065978573b0fc";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const APPROVAL_PHRASE =
  "อนุมัติให้ทดสอบ real Gemini shadow call เฉพาะ admin-only บน staging โดยไม่แสดงผลให้ผู้ใช้ทั่วไป ตาม v6.1H";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const PII_PHONE = "0812345678";
const TOKEN_DEALER = "dev-firebase-token-dealer-a";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  "dev-firebase-token-dealer-a": {
    uid: "firebase-dealer-a",
    email: "dealer-a@example.test",
    displayName: "Dealer A",
  },
});
process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  "firebase-dealer-a": {
    uid: "firebase-dealer-a",
    email: "dealer-a@example.test",
    role: "dealer",
    status: "active",
    dealerId: "dealer-a",
  },
});

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function reqWith(headers: Request["headers"], body: Record<string, unknown> = {}): Request {
  return { headers, query: {}, body } as Request;
}

async function runGuard(
  guard: (req: Request, res: Response, next: NextFunction) => void,
  req: Request
): Promise<{ statusCode: number; calledNext: boolean }> {
  const out = { statusCode: 200 };
  const res = {
    status(code: number) {
      out.statusCode = code;
      return res;
    },
    json() {
      return res;
    },
  } as Response;
  return new Promise((resolve) => {
    const next: NextFunction = () => {
      resolve({ calledNext: true, statusCode: out.statusCode });
    };
    guard(req, res, next);
    setTimeout(() => resolve({ calledNext: false, statusCode: out.statusCode }), 500);
  });
}

function mockRes() {
  const out = { statusCode: 200, body: undefined as unknown };
  const res = {
    status(code: number) {
      out.statusCode = code;
      return res;
    },
    json(body: unknown) {
      out.body = body;
      return res;
    },
  } as Response;
  return { res, out };
}

function readEnvOff(key: string): string | undefined {
  if (key === NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV) {
    return "false";
  }
  return stagingStyleShadowEnv()[key];
}

function readEnvOn(key: string): string | undefined {
  if (key === NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV) {
    return "true";
  }
  if (key === "GEMINI_API_KEY") {
    return "sm-configured-via-secret-ref";
  }
  return stagingStyleShadowEnv()[key];
}

console.log("=== v6.1H Real Gemini Shadow Call Admin-only Staging Smoke ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61h-real-gemini-shadow-call-admin-only-staging-smoke.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverModule = readFileSync("src/services/ai/salesBrainServerShadowSmoke.ts", "utf8");
const adminProvider = readFileSync(
  "src/services/ai/salesBrainAdminShadowRealProvider.ts",
  "utf8"
);
const runtimeFlags = readFileSync("src/services/ai/salesBrainRuntimeFlags.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const chatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");

// --- doc ---
{
  ok("doc exists", doc.length > 4000);
  ok("doc v6.1H label", doc.includes("v6.1H"));
  ok("doc approval phrase", doc.includes(APPROVAL_PHRASE));
  ok("doc HEAD 319fcc5", doc.includes(HEAD_SHA) || doc.includes("319fcc5"));
  ok("doc user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("doc no secrets versions access", /secrets versions access/i.test(docLower));
}

// --- flag default off ---
{
  ok("flag env constant exported", runtimeFlags.includes(NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV));
  ok("flag default off", !isAdminShadowRealProviderEnabled(readEnvOff));
  ok("global network disabled", SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED === false);
  ok("SS-01 off providerNetwork false", !canAttemptAdminShadowRealProvider({
    caseId: "SS-01",
    environment: "staging",
    readEnv: readEnvOff,
  }));
  const ev = runSalesBrainAdminShadowSmoke({ caseId: "SS-01" });
  const payload = buildRedactedAdminShadowSmokePayload(ev, { providerNetwork: false });
  ok("default mock provider", payload.shadowDebugResult?.provider === "mock");
}

// --- flag on + SS-01 allowed (harness mock, no live network in test) ---
{
  setAdminShadowGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: "synthetic admin shadow reply [redacted]",
    requestIdHash: "abc123def4567890",
    modelId: "gemini-3.5-flash",
    budgetDailyLimit: 5,
    budgetMonthlyLimit: 50,
  }));

  ok("flag on enabled", isAdminShadowRealProviderEnabled(readEnvOn));
  ok("SS-01 allowed staging", canAttemptAdminShadowRealProvider({
    caseId: "SS-01",
    environment: "staging",
    readEnv: readEnvOn,
  }));
  ok("SS-02 not allowed real provider", !canAttemptAdminShadowRealProvider({
    caseId: "SS-02",
    environment: "staging",
    readEnv: readEnvOn,
  }));
  ok("only SS-01 in allowlist", ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS.length === 1);

  const evaluation = runSalesBrainAdminShadowSmoke({ caseId: "SS-01" });
  const ctx = await resolveAdminShadowSmokeHandlerContext({
    caseId: "SS-01",
    evaluation,
    readEnv: readEnvOn,
  });
  ok("harness providerNetwork true", ctx.providerNetwork === true);
  ok("harness gemini provider output", ctx.realProviderResult?.redactedProviderOutput.includes("synthetic"));

  const data = buildRedactedAdminShadowSmokePayload(evaluation, ctx);
  ok("payload provider gemini", data.shadowDebugResult?.provider === "gemini");
  ok("payload legacy unchanged", data.userVisibleResponse === SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES["SS-01"].legacyUserVisibleResponse);
  ok("payload no raw phone", !JSON.stringify(data).includes(PII_PHONE));

  resetAdminShadowGeminiCallerForTests();
}

// --- Cloud Run runtime key mount (AIza prefix must not block admin shadow) ---
{
  const runtimeKey = "AIzaSyFakeRuntimeKeyForHarnessOnly";
  const readEnvRuntimeKey = (key: string): string | undefined => {
    if (key === NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV) {
      return "true";
    }
    if (key === "GEMINI_API_KEY") {
      return runtimeKey;
    }
    return stagingStyleShadowEnv()[key];
  };

  ok("general key check rejects AIza prefix", !isGeminiApiKeyConfigured(readEnvRuntimeKey));
  ok("runtime presence accepts mounted secret", isGeminiApiKeyPresent(readEnvRuntimeKey));

  setAdminShadowGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: "runtime secret mount path ok",
    requestIdHash: "runtime1234567890",
    modelId: "gemini-3.5-flash",
    budgetDailyLimit: 5,
    budgetMonthlyLimit: 50,
  }));

  const evaluation = runSalesBrainAdminShadowSmoke({ caseId: "SS-01" });
  const ctx = await resolveAdminShadowSmokeHandlerContext({
    caseId: "SS-01",
    evaluation,
    readEnv: readEnvRuntimeKey,
  });
  ok("runtime AIza key providerNetwork true", ctx.providerNetwork === true);
  ok("runtime AIza gate reason ok", ctx.realProviderGateReason === "real_provider_call_ok");

  const blocked = await resolveAdminShadowSmokeHandlerContext({
    caseId: "SS-02",
    evaluation: runSalesBrainAdminShadowSmoke({ caseId: "SS-02" }),
    readEnv: readEnvRuntimeKey,
  });
  ok("SS-02 gate case_not_allowed", blocked.realProviderGateReason === "case_not_allowed_for_real_provider");

  resetAdminShadowGeminiCallerForTests();
}

// --- v6.1H.3 diagnostics: gate reason + redacted Gemini error codes ---
{
  const evaluation = runSalesBrainAdminShadowSmoke({ caseId: "SS-01" });
  const blocked = await resolveAdminShadowSmokeHandlerContext({
    caseId: "SS-01",
    evaluation,
    readEnv: readEnvOff,
  });
  const payload = buildRedactedAdminShadowSmokePayload(evaluation, blocked);
  ok("flag off gate reason present", payload.realProviderGateReason === "admin_shadow_real_provider_flag_off");
  ok("classify missing api key", classifyAdminShadowProviderError(new SalesBrainRealProviderMissingApiKeyError()) === "missing_api_key");
  ok("slice id exported", ADMIN_SHADOW_SMOKE_SLICE_ID === "v6.1J");

  ok("map 403 permission", mapGeminiHttpStatusToFallbackReason({ httpStatus: 403, grpcStatus: "PERMISSION_DENIED" }) === "gemini_http_403");
  ok("map 401 auth", mapGeminiHttpStatusToFallbackReason({ httpStatus: 401, grpcStatus: "UNAUTHENTICATED" }) === "gemini_auth_error");
  ok("map 404 model", mapGeminiHttpStatusToFallbackReason({ httpStatus: 404, grpcStatus: "NOT_FOUND" }) === "gemini_model_not_found");
  ok("map 429 quota", mapGeminiHttpStatusToFallbackReason({ httpStatus: 429, grpcStatus: "RESOURCE_EXHAUSTED" }) === "gemini_quota_error");
  ok("map 400 format", mapGeminiHttpStatusToFallbackReason({ httpStatus: 400, grpcStatus: "INVALID_ARGUMENT" }) === "request_format_error");

  const apiErr = new Error('{"error":{"message":"redacted","code":403,"status":"PERMISSION_DENIED"}}');
  apiErr.name = "ApiError";
  (apiErr as Error & { status: number }).status = 403;
  const redacted403 = extractRedactedGeminiApiError(apiErr);
  ok("extract 403 fallback", redacted403.fallbackReason === "gemini_http_403");
  ok("extract 403 http status", redacted403.geminiHttpStatus === 403);
  ok("extract 403 grpc code", redacted403.geminiErrorCode === "PERMISSION_DENIED");
  ok("extract no raw api key", !JSON.stringify(redacted403).includes("AIza"));

  const modelErr = new Error('{"error":{"message":"redacted","code":404,"status":"NOT_FOUND"}}');
  modelErr.name = "ApiError";
  (modelErr as Error & { status: number }).status = 404;
  const redacted404 = extractRedactedGeminiApiError(modelErr);
  ok("extract 404 model not found", redacted404.fallbackReason === "gemini_model_not_found");
  ok("admin shadow model constant", ADMIN_SHADOW_GEMINI_MODEL === "gemini-3.5-flash");

  const okCase = mockRes();
  await handleAdminSalesBrainShadowSmokePost(reqWith({}, { caseId: "SS-01" }), okCase.res);
  const body = okCase.out.body as {
    providerNetwork?: boolean;
    realProviderGateReason?: string;
    adminShadowDiag?: {
      sliceId?: string;
      geminiKeyPresent?: boolean;
      geminiModel?: string;
      geminiRequestShape?: string;
    };
    data?: { realProviderGateReason?: string };
  };
  ok("handler top-level gate reason", typeof body.realProviderGateReason === "string");
  ok("handler nested gate reason", typeof body.data?.realProviderGateReason === "string");
  ok("handler adminShadowDiag slice", body.adminShadowDiag?.sliceId === "v6.1J");
  ok("handler diag gemini model", body.adminShadowDiag?.geminiModel === "gemini-3.5-flash");
  ok("handler diag request shape", body.adminShadowDiag?.geminiRequestShape === "sdk_contents_text_part");
}

// --- auth matrix ---
{
  const unauth = await runGuard(adminApiAuth, reqWith({}));
  ok("unauth 401", unauth.statusCode === 401 && !unauth.calledNext);

  const dealer = await runGuard(
    adminApiAuth,
    reqWith({ authorization: `Bearer ${TOKEN_DEALER}` })
  );
  ok("dealer 403", dealer.statusCode === 403 && !dealer.calledNext);

  const missing = mockRes();
  await handleAdminSalesBrainShadowSmokePost(reqWith({}, {}), missing.res);
  ok("handler missing caseId 400", missing.out.statusCode === 400);

  const unknown = mockRes();
  await handleAdminSalesBrainShadowSmokePost(reqWith({}, { caseId: "CUSTOM" }), unknown.res);
  ok("handler unknown caseId 400", unknown.out.statusCode === 400);

  const okCase = mockRes();
  await handleAdminSalesBrainShadowSmokePost(reqWith({}, { caseId: "SS-01" }), okCase.res);
  ok("handler SS-01 200", okCase.out.statusCode === 200);
  const body = okCase.out.body as {
    userVisibleOff?: boolean;
    providerNetwork?: boolean;
    data?: { userVisibleResponse?: string };
  };
  ok("handler userVisibleOff true", body.userVisibleOff === true);
  ok("handler default providerNetwork false", body.providerNetwork === false);
}

// --- user visible blocked ---
{
  ok("v60r user visible blocked", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === true);
  ok("module never sets user visible true", !serverModule.includes('NONGA_AI_USER_VISIBLE_ENABLED=true'));
  ok("useChat wires shadow only", useChat.includes("wireShadowChatPath"));
  ok("chat path legacy", /legacyUserVisibleText|legacyUserVisibleResponse/i.test(chatPath));
  const wired = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: LEGACY_START_OVER,
    source: "useChat.orchestrated",
    environment: "staging",
    env: { [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true" },
  });
  ok("chat legacy exact start over", wired.legacyUserVisibleText === LEGACY_START_OVER);
}

// --- module safety ---
{
  ok("server module admin route only", serverModule.includes(SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE));
  ok("admin provider module exists", adminProvider.includes("invokeAdminShadowRealProvider"));
  const realProvider = readFileSync("src/services/ai/salesBrainRealProvider.ts", "utf8");
  ok("admin shadow uses runtime key presence", realProvider.includes("assertGeminiApiKeyPresentForAdminShadow"));
  ok("realProviderGateReason exported", serverModule.includes("realProviderGateReason"));
  ok("adminShadowDiag exported", serverModule.includes("adminShadowDiag"));
  ok("extractRedactedGeminiApiError exported", serverModule.includes("extractRedactedGeminiApiError"));
  ok("admin request shape constant", adminProvider.includes("sdk_contents_text_part"));
  ok("no buyer lead in server module", !serverModule.includes("buyerLeadCapture"));
  ok("no settlement write", !/settlement.*write|invoice.*write/i.test(serverModule));
  ok("providerNetwork false default comment", /providerNetwork: false/.test(serverModule));
  ok("admin module no raw prompt log", !/console\.log.*userMessage/i.test(adminProvider));
}

// --- doc compliance ---
{
  ok("doc staging only", doc.includes("nonga-ce93c") && doc.includes("asia-southeast1"));
  ok("doc rollback kill switch", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/.test(doc));
  ok("doc no production", /production.*not|excluded/i.test(docLower));
  ok("doc no real stock", /real stock.*blocked|still blocked/i.test(docLower));
}

// --- secret scan doc ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 16)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses harness mock caller", selfCode.includes("setAdminShadowGeminiCallerForTests"));
}

// --- package ---
{
  ok("package v61h script", pkg.includes("test:v61h-real-gemini-shadow-call-admin-only-staging-smoke"));
}

console.log("\nDone v6.1H Real Gemini Shadow Call Admin-only Staging Smoke tests.");
if (process.exitCode) process.exit(process.exitCode);
