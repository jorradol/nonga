/**
 * v6.1B — Server-side Shadow Evaluation / Admin-only Debug / User-visible Off
 * npm run test:v61b-server-side-shadow-evaluation-admin-debug-user-visible-off
 */
import type { NextFunction, Request, Response } from "express";
import { readFileSync } from "node:fs";
import { adminApiAuth } from "../src/server/apiAuth.ts";
import {
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES,
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE,
  buildRedactedAdminShadowSmokePayload,
  handleAdminSalesBrainShadowSmokePost,
  registerSalesBrainAdminShadowSmokeRoutes,
  runSalesBrainAdminShadowSmoke,
  stagingStyleShadowEnv,
} from "../src/services/ai/salesBrainServerShadowSmoke.ts";
import {
  evaluateSalesBrainShadowRuntime,
  summarizeShadowRuntimeFlags,
} from "../src/services/ai/salesBrainShadowRuntime.ts";
import {
  SalesBrainRealProviderNetworkDisabledError,
  createSalesBrainAdapter,
} from "../src/services/ai/salesBrainAdapter.ts";
import { SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED } from "../src/services/ai/salesBrainRealProvider.ts";
import {
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";

const DOC_PATH = "docs/v6.1B-server-side-shadow-evaluation-admin-debug-user-visible-off.md";
const HEAD_SHA = "28a2ffd1ee9e7852cea1699c6ba6026e8563e2bb";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const PII_PHONE = "0812345678";
const PII_EMAIL = "customer.real@example.com";

const TOKEN_ADMIN = "dev-firebase-token-admin";
const TOKEN_DEALER = "dev-firebase-token-dealer-a";
const UID_ADMIN = "firebase-admin";
const UID_DEALER = "firebase-dealer-a";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [TOKEN_ADMIN]: {
    uid: UID_ADMIN,
    email: "admin@example.test",
    displayName: "Admin",
  },
  [TOKEN_DEALER]: {
    uid: UID_DEALER,
    email: "dealer-a@example.test",
    displayName: "Dealer A",
  },
});
process.env.NONGA_DEV_USER_PROFILE_MAP = JSON.stringify({
  [UID_ADMIN]: {
    uid: UID_ADMIN,
    email: "admin@example.test",
    displayName: "Admin",
    role: "admin",
    status: "active",
  },
  [UID_DEALER]: {
    uid: UID_DEALER,
    email: "dealer-a@example.test",
    displayName: "Dealer A",
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
): Promise<{ statusCode: number; body: unknown; calledNext: boolean }> {
  const { res, out } = mockRes();
  return new Promise((resolve) => {
    const next: NextFunction = () => {
      resolve({ calledNext: true, statusCode: out.statusCode, body: out.body });
    };
    guard(req, res, next);
    setTimeout(() => {
      resolve({ calledNext: false, statusCode: out.statusCode, body: out.body });
    }, 1000);
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

function assertNoRawPii(label: string, blob: string) {
  ok(`${label} no raw phone`, !blob.includes(PII_PHONE));
  ok(`${label} no raw email`, !blob.includes(PII_EMAIL));
  ok(`${label} no bare phone pattern`, !/\b0[689]\d{8}\b/.test(blob));
}

console.log("=== v6.1B Server-side Shadow Evaluation / Admin Debug / User-visible Off ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61b-server-side-shadow-evaluation-admin-debug-user-visible-off.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const moduleSrc = readFileSync("src/services/ai/salesBrainServerShadowSmoke.ts", "utf8");
const shadowRuntimeSrc = readFileSync("src/services/ai/salesBrainShadowRuntime.ts", "utf8");
const chatPathSrc = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");

// --- doc exists ---
{
  ok("doc v61b exists", doc.length > 4000);
  ok("doc v6.1B label", doc.includes("v6.1B"));
  ok("doc admin debug user visible off", /admin.*debug.*user-visible off/i.test(doc));
  ok("doc no deploy in slice", /no deploy|ไม่ deploy/i.test(docLower));
}

// --- doc preflight baseline ---
{
  ok("doc HEAD 28a2ffd", doc.includes(HEAD_SHA) || doc.includes("28a2ffd"));
  ok("doc references v61a", doc.includes("v6.1A"));
  ok("doc user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("doc no secrets versions access", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- doc route + auth ---
{
  ok("doc admin route path", doc.includes(SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE));
  ok("doc unauth 401", /401.*unauth|unauth.*401/i.test(docLower));
  ok("doc non-admin 403", /403.*non-admin|non-admin.*403|dealer.*403/i.test(docLower));
  ok("doc no public endpoint", /no public|not public|admin.*superadmin only/i.test(docLower));
  ok("doc synthetic cases SS-01 SS-08", doc.includes("SS-01") && doc.includes("SS-08"));
}

// --- doc forbidden ---
{
  ok("doc forbidden no user visible true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("doc forbidden no paid gemini shadow", /paid Gemini.*shadow|no paid Gemini/i.test(docLower));
  ok("doc forbidden no deploy", /Cloud Run deploy.*not done|no Cloud Run deploy/i.test(docLower));
}

// --- module wiring ---
{
  ok("module exports runSalesBrainAdminShadowSmoke", moduleSrc.includes("runSalesBrainAdminShadowSmoke"));
  ok("module exports buildRedactedAdminShadowSmokePayload", moduleSrc.includes("buildRedactedAdminShadowSmokePayload"));
  ok("module uses evaluateSalesBrainShadowRuntime", moduleSrc.includes("evaluateSalesBrainShadowRuntime"));
  ok("module synthetic cases only", moduleSrc.includes("SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES"));
  ok("module redact PII", moduleSrc.includes("redactPiiForSalesBrainLog"));
  ok("module userVisibleOff response flag", moduleSrc.includes("userVisibleOff: true"));
  ok("module providerNetwork false flag", moduleSrc.includes("providerNetwork: false"));
}

// --- server route registered behind admin guard ---
{
  ok("server imports registerSalesBrainAdminShadowSmokeRoutes", serverTs.includes("registerSalesBrainAdminShadowSmokeRoutes"));
  ok("server registers route", serverTs.includes("registerSalesBrainAdminShadowSmokeRoutes(app)"));
  ok("admin guard before route registration", /app\.use\("\/api\/admin", adminApiAuth\)[\s\S]*registerSalesBrainAdminShadowSmokeRoutes\(app\)/.test(serverTs));
  ok("route path in server module import", moduleSrc.includes(SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE));
}

// --- chat path unchanged (user-visible legacy) ---
{
  ok("useChat no evaluateSalesBrainShadowRuntime", !useChat.includes("evaluateSalesBrainShadowRuntime"));
  ok("orchestrator no evaluateSalesBrainShadowRuntime", !orch.includes("evaluateSalesBrainShadowRuntime"));
  ok("chat path legacy only", /legacyUserVisibleText|legacyUserVisibleResponse/i.test(chatPathSrc));
}

// --- provider network disabled ---
{
  ok("network disabled constant", SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED === false);
  let realThrew = false;
  try {
    createSalesBrainAdapter({
      provider: "real",
      readEnv: () => "sm-configured-via-secret-ref",
    }).route({ userMessage: "test", userRole: "buyer" });
  } catch (e) {
    realThrew = e instanceof SalesBrainRealProviderNetworkDisabledError;
  }
  ok("real provider throws network disabled", realThrew);
}

// --- staging-style shadow allowed ---
{
  const ev = runSalesBrainAdminShadowSmoke({ caseId: "SS-01" });
  ok("SS-01 shadow active", ev.shadowModeActive === true);
  ok("SS-01 shadow allowed", ev.runtimeFlags.shadowEvaluationAllowed === true);
  ok("SS-01 user visible false effective", ev.runtimeFlags.userVisibleEnabled === false);
  ok("SS-01 legacy unchanged", ev.userVisibleResponse === SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES["SS-01"].legacyUserVisibleResponse);
  assertNoRawPii("SS-01", JSON.stringify(ev));
}

// --- SS-03 exact legacy start over ---
{
  const ev = runSalesBrainAdminShadowSmoke({ caseId: "SS-03" });
  ok("SS-03 exact legacy text", ev.userVisibleResponse === LEGACY_START_OVER);
  ok("SS-03 mock provider only", ev.shadowDebugResult?.provider === "mock");
}

// --- redacted payload ---
{
  const ev = runSalesBrainAdminShadowSmoke({ caseId: "SS-02" });
  const payload = buildRedactedAdminShadowSmokePayload(ev);
  const blob = JSON.stringify(payload);
  ok("payload has runtimeFlagsSummary", payload.runtimeFlagsSummary.length > 10);
  ok("payload mock provider only", payload.shadowDebugResult?.provider === "mock");
  ok("payload no GEMINI_API_KEY value", !blob.includes("AIza"));
  ok("payload no env key dump", !blob.includes("NONGA_AI_BUDGET_DAILY_LIMIT"));
  assertNoRawPii("payload SS-02", blob);
}

// --- guard rails SS-05..SS-08 ---
{
  const ss05 = runSalesBrainAdminShadowSmoke({ caseId: "SS-05" });
  ok("SS-05 kill switch inactive", ss05.shadowModeActive === false);
  ok("SS-05 legacy unchanged", ss05.userVisibleResponse === SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES["SS-05"].legacyUserVisibleResponse);

  const ss06 = runSalesBrainAdminShadowSmoke({ caseId: "SS-06" });
  ok("SS-06 budget missing blocked", ss06.runtimeFlags.shadowEvaluationAllowed === false);

  const ss07 = runSalesBrainAdminShadowSmoke({ caseId: "SS-07" });
  ok("SS-07 user visible blocked v60r", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === true);
  ok("SS-07 shadow inactive", ss07.shadowModeActive === false);
  ok("SS-07 blocked reason present", ss07.runtimeFlags.enablementBlockedReason === "user_visible_blocked_v60r");

  const ss08 = runSalesBrainAdminShadowSmoke({ caseId: "SS-08" });
  ok("SS-08 production off", ss08.runtimeFlags.shadowEvaluationAllowed === false);
}

// --- PII input redaction path ---
{
  const flags = summarizeShadowRuntimeFlags(
    evaluateSalesBrainShadowRuntime({
      userMessage: `call ${PII_PHONE} or ${PII_EMAIL}`,
      userRole: "buyer",
      legacyUserVisibleResponse: "legacy unchanged",
      env: stagingStyleShadowEnv(),
      environment: "staging",
    }).runtimeFlags
  );
  assertNoRawPii("flag summary PII input", flags);
}

// --- admin route handler (no HTTP) ---
{
  const missing = mockRes();
  handleAdminSalesBrainShadowSmokePost(reqWith({}, {}), missing.res);
  ok("handler missing caseId 400", missing.out.statusCode === 400);

  const unknown = mockRes();
  handleAdminSalesBrainShadowSmokePost(reqWith({}, { caseId: "CUSTOM-PII" }), unknown.res);
  ok("handler unknown caseId 400", unknown.out.statusCode === 400);

  const okCase = mockRes();
  handleAdminSalesBrainShadowSmokePost(reqWith({}, { caseId: "SS-01" }), okCase.res);
  ok("handler SS-01 200", okCase.out.statusCode === 200);
  const body = okCase.out.body as { success?: boolean; data?: { userVisibleResponse?: string } };
  ok("handler success true", body.success === true);
  ok("handler legacy in data", body.data?.userVisibleResponse === SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES["SS-01"].legacyUserVisibleResponse);
  assertNoRawPii("handler SS-01 body", JSON.stringify(okCase.out.body));
}

// --- adminApiAuth 401 / 403 ---
{
  const unauth = await runGuard(adminApiAuth, reqWith({}));
  ok("admin guard unauth 401", unauth.statusCode === 401 && !unauth.calledNext);

  const dealer = await runGuard(
    adminApiAuth,
    reqWith({ authorization: `Bearer ${TOKEN_DEALER}` })
  );
  ok("admin guard dealer 403", dealer.statusCode === 403 && !dealer.calledNext);

  const admin = await runGuard(
    adminApiAuth,
    reqWith({ authorization: "Bearer nonga-v4-dev-admin-token", "x-user-role": "admin" })
  );
  ok("admin guard admin passes", admin.calledNext === true);
}

// --- register function exists ---
{
  ok("registerSalesBrainAdminShadowSmokeRoutes exported", moduleSrc.includes("registerSalesBrainAdminShadowSmokeRoutes"));
  ok("register posts admin route", moduleSrc.includes(`app.post(SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE`));
}

// --- no forbidden imports in module ---
{
  ok("module no buyerLeadCaptureHandler", !moduleSrc.includes("buyerLeadCapture"));
  ok("module no sellerReveal", !moduleSrc.includes("sellerReveal"));
  ok("module no settlement write", !/settlement.*write|invoice.*write|payment.*write/i.test(moduleSrc));
  ok("module no publicSignup", !moduleSrc.includes("publicSignup"));
  ok("module no generateContent", !/generateContent\s*\(/.test(moduleSrc));
  ok("module no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(moduleSrc));
}

// --- doc no secret values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret pattern ${pat.source.slice(0, 20)}`, !pat.test(doc));
  }
}

// --- test script static only (no external AI/gcloud) ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
  ok("script uses module harness", selfCode.includes("runSalesBrainAdminShadowSmoke"));
}

// --- package.json ---
{
  ok(
    "package v61b script",
    pkg.includes("test:v61b-server-side-shadow-evaluation-admin-debug-user-visible-off")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61b-server-side-shadow-evaluation-admin-debug-user-visible-off.mts")
  );
}

console.log("\nDone v6.1B Server-side Shadow Evaluation / Admin Debug / User-visible Off tests.");
if (process.exitCode) process.exit(process.exitCode);
