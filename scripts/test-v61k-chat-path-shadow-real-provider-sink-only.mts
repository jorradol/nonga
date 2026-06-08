/**
 * v6.1K — Chat-path Shadow + Real Provider Sink Only / User-visible Off
 * npm run test:v61k-chat-path-shadow-real-provider-sink-only
 */
import type { NextFunction, Request, Response } from "express";
import { readFileSync } from "node:fs";
import { adminApiAuth } from "../src/server/apiAuth.ts";
import {
  CHAT_SHADOW_SINK_EXPECTATIONS,
  CHAT_SHADOW_SINK_SCENARIO_IDS,
  runChatShadowSinkFullMatrix,
  runChatShadowSinkScenario,
} from "../src/services/ai/salesBrainChatShadowSinkHarness.ts";
import { CHAT_SHADOW_SINK_SLICE_ID } from "../src/services/ai/salesBrainChatShadowSinkDiagnostics.ts";
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  resetAdminShadowGeminiCallerForTests,
  setAdminShadowGeminiCallerForTests,
} from "../src/services/ai/salesBrainChatShadowRealProvider.ts";
import {
  NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  CHAT_PATH_LEGACY_START_OVER,
  handleAdminChatShadowSinkPost,
  SALES_BRAIN_CHAT_SHADOW_SINK_ROUTE,
  SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS,
} from "../src/services/ai/salesBrainServerChatShadowSink.ts";
import {
  handleAdminSalesBrainShadowSmokePost,
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE,
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES,
  stagingStyleShadowEnv,
} from "../src/services/ai/salesBrainServerShadowSmoke.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { wireShadowChatPath } from "../src/services/ai/salesBrainShadowChatPath.ts";

const DOC_PATH = "docs/v6.1K-chat-path-shadow-real-provider-sink-only.md";
const J_DOC_PATH = "docs/v6.1J-admin-shadow-conversation-smoke-full-matrix.md";
const APPROVAL_PHRASE =
  "อนุมัติให้ทดสอบ chat-path shadow sink บน staging โดยไม่แสดงผลให้ผู้ใช้ทั่วไป ตาม v6.1K";
const TOKEN_DEALER = "dev-firebase-token-dealer-a";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const PII_PHONE = "0812345678";
const PII_EMAIL = "customer.real@example.com";

process.env.NONGA_DEV_FIREBASE_TOKEN_MAP = JSON.stringify({
  [TOKEN_DEALER]: {
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

function readEnvChatOn(key: string): string | undefined {
  if (key === NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV) {
    return "true";
  }
  if (key === "GEMINI_API_KEY") {
    return "sm-configured-via-secret-ref";
  }
  return stagingStyleShadowEnv()[key];
}

function assertNoRawPii(label: string, blob: string) {
  ok(`${label} no raw phone`, !blob.includes(PII_PHONE));
  ok(`${label} no raw email`, !blob.includes(PII_EMAIL));
  ok(`${label} no bare phone pattern`, !/\b0[689]\d{8}\b/.test(blob));
}

console.log("=== v6.1K Chat-path Shadow + Real Provider Sink Only ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61k-chat-path-shadow-real-provider-sink-only.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const sinkModule = readFileSync("src/services/ai/salesBrainServerChatShadowSink.ts", "utf8");
const harnessSrc = readFileSync("src/services/ai/salesBrainChatShadowSinkHarness.ts", "utf8");
const chatRealProvider = readFileSync(
  "src/services/ai/salesBrainChatShadowRealProvider.ts",
  "utf8"
);
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const chatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");

// --- doc exists + approval ---
{
  ok("doc exists", doc.length > 5000);
  ok("doc v6.1K label", doc.includes("v6.1K"));
  ok("doc approval phrase", doc.includes(APPROVAL_PHRASE));
  ok("doc chat path shadow sink", /chat-path shadow|chat shadow sink/i.test(docLower));
  ok("doc user visible off", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("doc sink only", /sink.?only|sink-only/i.test(docLower));
  ok("doc references v6.1J", doc.includes("v6.1J"));
  ok("doc no secrets versions access", /secrets versions access/i.test(docLower));
  ok("doc no browser provider", /no browser|ห้าม.*browser/i.test(docLower));
}

// --- module structure ---
{
  ok("sink route constant", sinkModule.includes(SALES_BRAIN_CHAT_SHADOW_SINK_ROUTE));
  ok("sink CP-01 start over", sinkModule.includes(CHAT_PATH_LEGACY_START_OVER));
  ok("sink no custom prompt", !sinkModule.includes("userPrompt"));
  ok("sink no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(sinkModule));
  ok("sink no generateContent in server module", !/generateContent\s*\(/.test(sinkModule));
  ok("real provider reuses admin invoke", chatRealProvider.includes("invokeAdminShadowRealProvider"));
  ok("real provider CP-02 only", chatRealProvider.includes('"CP-02"'));
  ok("harness exports full matrix", harnessSrc.includes("runChatShadowSinkFullMatrix"));
  ok("slice id v6.1K", CHAT_SHADOW_SINK_SLICE_ID === "v6.1K");
}

// --- injected CP-02 real provider success ---
{
  setAdminShadowGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: "synthetic chat shadow sink [redacted]",
    requestIdHash: "chat1234567890ab",
    modelId: ADMIN_SHADOW_GEMINI_MODEL,
    budgetDailyLimit: 5,
    budgetMonthlyLimit: 50,
  }));

  const matrix = await runChatShadowSinkFullMatrix({ readEnv: readEnvChatOn });
  ok("full matrix 5 scenarios", matrix.length === 5);

  const cp02 = matrix.find((r) => r.scenarioId === "CP-02");
  ok("CP-02 providerNetwork true", cp02?.providerNetwork === true);
  ok("CP-02 real_provider_call_ok", cp02?.realProviderGateReason === "real_provider_call_ok");
  ok("CP-02 provider gemini", cp02?.payload.shadowDebugResult?.provider === "gemini");
  ok("CP-02 userVisibleOff true", cp02?.userVisibleOff === true);
  ok(
    "CP-02 legacy unchanged",
    cp02?.userVisibleResponse === SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS["CP-02"].legacyUserVisibleResponse
  );
  assertNoRawPii("CP-02 matrix", JSON.stringify(cp02));

  const cp01 = matrix.find((r) => r.scenarioId === "CP-01");
  ok("CP-01 no real provider", cp01?.providerNetwork === false);
  ok("CP-01 legacy start over exact", cp01?.userVisibleResponse === CHAT_PATH_LEGACY_START_OVER);
  ok(
    "CP-01 gate scenario_not_allowed",
    cp01?.realProviderGateReason === "scenario_not_allowed_for_real_provider"
  );

  for (const scenarioId of ["CP-03", "CP-04", "CP-05"] as const) {
    const row = matrix.find((r) => r.scenarioId === scenarioId);
    ok(`${scenarioId} no real provider network`, row?.providerNetwork === false);
    ok(`${scenarioId} not gemini provider`, row?.payload.shadowDebugResult?.provider !== "gemini");
    ok(`${scenarioId} userVisibleOff true`, row?.userVisibleOff === true);
    ok(
      `${scenarioId} legacy exact`,
      row?.userVisibleResponse === SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS[scenarioId].legacyUserVisibleResponse
    );
  }

  ok("CP-05 gate production", matrix.find((r) => r.scenarioId === "CP-05")?.realProviderGateReason === "production_environment");

  resetAdminShadowGeminiCallerForTests();
}

// --- guardrails CP-03..CP-05 ---
{
  const matrix = await runChatShadowSinkFullMatrix({ readEnv: readEnvChatOn });

  const cp03 = matrix.find((r) => r.scenarioId === "CP-03");
  ok("CP-03 shadow inactive", cp03?.shadowModeActive === false);
  ok("CP-03 kill switch guardrail", CHAT_SHADOW_SINK_EXPECTATIONS["CP-03"].guardrail === "kill_switch");

  const cp04 = matrix.find((r) => r.scenarioId === "CP-04");
  ok("CP-04 shadow inactive", cp04?.shadowModeActive === false);
  ok("CP-04 user visible blocked", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === true);
  ok("CP-04 guardrail meta", CHAT_SHADOW_SINK_EXPECTATIONS["CP-04"].guardrail === "user_visible_blocked");

  const cp05 = matrix.find((r) => r.scenarioId === "CP-05");
  ok("CP-05 production off", cp05?.shadowEvaluationAllowed === false);
  ok("CP-05 guardrail meta", CHAT_SHADOW_SINK_EXPECTATIONS["CP-05"].guardrail === "production_off");
}

// --- flag off fallback ---
{
  const readEnvOff = (key: string) => stagingStyleShadowEnv()[key];
  const cp02Off = await runChatShadowSinkScenario({
    scenarioId: "CP-02",
    readEnv: readEnvOff,
  });
  ok("CP-02 flag off no network", cp02Off.providerNetwork === false);
  ok(
    "CP-02 flag off gate reason",
    cp02Off.realProviderGateReason === "chat_shadow_real_provider_flag_off"
  );
}

// --- handler per-scenario ---
{
  setAdminShadowGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: "handler chat sink [redacted]",
    requestIdHash: "handler123456789",
    modelId: ADMIN_SHADOW_GEMINI_MODEL,
    budgetDailyLimit: 5,
    budgetMonthlyLimit: 50,
  }));

  process.env[NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV] = "true";
  process.env.GEMINI_API_KEY = "sm-configured-via-secret-ref";

  for (const scenarioId of CHAT_SHADOW_SINK_SCENARIO_IDS) {
    const { res, out } = mockRes();
    await handleAdminChatShadowSinkPost(reqWith({}, { scenarioId }), res);
    ok(`handler ${scenarioId} 200`, out.statusCode === 200);
    const body = out.body as {
      success?: boolean;
      readOnly?: boolean;
      userVisibleOff?: boolean;
      sinkOnly?: boolean;
      providerNetwork?: boolean;
      realProviderGateReason?: string;
      chatShadowDiag?: { sliceId?: string };
      data?: { userVisibleResponse?: string; shadowDebugResult?: { provider?: string } };
    };
    ok(`handler ${scenarioId} success`, body.success === true);
    ok(`handler ${scenarioId} readOnly`, body.readOnly === true);
    ok(`handler ${scenarioId} userVisibleOff`, body.userVisibleOff === true);
    ok(`handler ${scenarioId} sinkOnly`, body.sinkOnly === true);
    ok(`handler ${scenarioId} sliceId`, body.chatShadowDiag?.sliceId === "v6.1K");
    assertNoRawPii(`handler ${scenarioId}`, JSON.stringify(out.body));

    if (scenarioId === "CP-02") {
      ok("handler CP-02 providerNetwork true", body.providerNetwork === true);
      ok("handler CP-02 real_provider_call_ok", body.realProviderGateReason === "real_provider_call_ok");
      ok("handler CP-02 gemini provider", body.data?.shadowDebugResult?.provider === "gemini");
    } else {
      ok(`handler ${scenarioId} providerNetwork false`, body.providerNetwork === false);
      ok(`handler ${scenarioId} not gemini provider`, body.data?.shadowDebugResult?.provider !== "gemini");
    }
  }

  delete process.env[NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV];
  delete process.env.GEMINI_API_KEY;
  resetAdminShadowGeminiCallerForTests();
}

// --- route guards + no custom prompt ---
{
  const unauth = await runGuard(adminApiAuth, reqWith({}));
  ok("unauth 401", unauth.statusCode === 401 && !unauth.calledNext);

  const dealer = await runGuard(
    adminApiAuth,
    reqWith({ authorization: `Bearer ${TOKEN_DEALER}` })
  );
  ok("dealer 403", dealer.statusCode === 403 && !dealer.calledNext);

  const custom = mockRes();
  await handleAdminChatShadowSinkPost(reqWith({}, { scenarioId: "CUSTOM-PROMPT" }), custom.res);
  ok("custom scenarioId 400", custom.out.statusCode === 400);

  const freeform = mockRes();
  await handleAdminChatShadowSinkPost(
    reqWith({}, { scenarioId: "CP-01", userMessage: "real PII prompt" }),
    freeform.res
  );
  ok("freeform body ignored CP-01 still 200", freeform.out.statusCode === 200);
  const freeBody = freeform.out.body as { data?: { userVisibleResponse?: string } };
  ok(
    "freeform body does not change legacy",
    freeBody.data?.userVisibleResponse === CHAT_PATH_LEGACY_START_OVER
  );
}

// --- public chat legacy regression ---
{
  ok("useChat wires shadow only", useChat.includes("wireShadowChatPath"));
  ok("useChat no evaluateSalesBrainShadowRuntime", !useChat.includes("evaluateSalesBrainShadowRuntime"));
  ok("orchestrator wires shadow only", orch.includes("wireShadowChatPath"));
  ok("orchestrator no evaluateSalesBrainShadowRuntime", !orch.includes("evaluateSalesBrainShadowRuntime"));
  ok("chat path legacy unchanged comment", /legacy user-visible text unchanged/i.test(chatPath));

  const orchestrated = tryOrchestrateChatReply("เริ่มใหม่", [], {});
  ok("orchestrator start over hit", orchestrated !== null);
  ok("orchestrator start over exact", orchestrated?.text === CHAT_PATH_LEGACY_START_OVER);

  const wired = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    source: "useChat.orchestrated",
    environment: "staging",
    env: stagingStyleShadowEnv(),
  });
  ok("wireShadowChatPath legacy exact", wired.legacyUserVisibleText === CHAT_PATH_LEGACY_START_OVER);
  ok("wireShadowChatPath no AI replacement", wired.legacyUserVisibleText !== "gemini");

  const wiredBlocked = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    source: "useChat.orchestrated",
    environment: "staging",
    env: { [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true" },
  });
  ok("user-visible attempted still legacy", wiredBlocked.legacyUserVisibleText === CHAT_PATH_LEGACY_START_OVER);
}

// --- no browser direct provider ---
{
  ok("useChat no GoogleGenAI", !useChat.includes("GoogleGenAI"));
  ok("useChat no GEMINI_API_KEY", !useChat.includes("GEMINI_API_KEY"));
  ok("chatPath no generateContent", !chatPath.includes("generateContent"));
  ok("orch no generateContent", !orch.includes("generateContent"));
  ok("orch no GEMINI_API_KEY", !orch.includes("GEMINI_API_KEY"));
}

// --- admin SS-01 route unaffected ---
{
  const { res, out } = mockRes();
  await handleAdminSalesBrainShadowSmokePost(reqWith({}, { caseId: "SS-01" }), res);
  ok("SS-01 admin route still 200", out.statusCode === 200);
  const body = out.body as { success?: boolean; userVisibleOff?: boolean };
  ok("SS-01 admin route success", body.success === true);
  ok("SS-01 admin route userVisibleOff", body.userVisibleOff === true);
}

// --- server registration ---
{
  ok("server admin guard", /app\.use\("\/api\/admin", adminApiAuth\)/.test(serverTs));
  ok("server registers chat shadow sink", serverTs.includes("registerSalesBrainChatShadowSinkRoutes"));
  ok("server still registers admin shadow smoke", serverTs.includes("registerSalesBrainAdminShadowSmokeRoutes"));
  ok("chat shadow route admin only", sinkModule.includes(SALES_BRAIN_CHAT_SHADOW_SINK_ROUTE));
  ok("no public chat shadow route", !serverTs.includes('app.post("/api/chat-shadow-sink"'));
  ok("no public shadow debug route", !serverTs.includes('app.post("/api/sales-brain-shadow'));
}

// --- forbidden paths ---
{
  ok("no payment write", !sinkModule.includes("buyerLeadCapture") && !/settlement.*write/i.test(sinkModule));
  ok("no public signup", !sinkModule.includes("publicSignupEnabled"));
  ok("no lead reveal outcome", !sinkModule.includes("sellerReveal") && !sinkModule.includes("buyerLead"));
  ok("no production deploy in harness", !harnessSrc.includes("nonga-production"));
}

// --- expectations metadata ---
{
  for (const scenarioId of CHAT_SHADOW_SINK_SCENARIO_IDS) {
    ok(`expectations ${scenarioId} defined`, CHAT_SHADOW_SINK_EXPECTATIONS[scenarioId] !== undefined);
  }
  ok("CP-02 real provider allowed meta", CHAT_SHADOW_SINK_EXPECTATIONS["CP-02"].realProviderAllowed === true);
  ok("CP-01 real provider not allowed meta", CHAT_SHADOW_SINK_EXPECTATIONS["CP-01"].realProviderAllowed === false);
}

// --- secret scan ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 16)}`, !pat.test(doc));
    ok(`sink module no secret ${pat.source.slice(0, 16)}`, !pat.test(sinkModule));
    ok(`harness no secret ${pat.source.slice(0, 16)}`, !pat.test(harnessSrc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses harness", selfCode.includes("runChatShadowSinkFullMatrix"));
}

// --- package.json ---
{
  ok("package v61k script", pkg.includes("test:v61k-chat-path-shadow-real-provider-sink-only"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61k-chat-path-shadow-real-provider-sink-only.mts")
  );
}

// --- companion docs ---
{
  ok("v6.1J doc exists", readFileSync(J_DOC_PATH, "utf8").includes("v6.1J"));
}

console.log("\nDone v6.1K Chat-path Shadow + Real Provider Sink Only tests.");
if (process.exitCode) process.exit(process.exitCode);
