/**
 * v6.1J — Admin Shadow Conversation Smoke / Full Matrix / User-visible Off
 * npm run test:v61j-admin-shadow-conversation-smoke-full-matrix
 */
import type { NextFunction, Request, Response } from "express";
import { readFileSync } from "node:fs";
import { adminApiAuth } from "../src/server/apiAuth.ts";
import {
  ADMIN_SHADOW_CONVERSATION_SCENARIO_IDS,
  ADMIN_SHADOW_CONVERSATION_SCENARIOS,
  ADMIN_SHADOW_FULL_MATRIX_CASE_IDS,
  ADMIN_SHADOW_MATRIX_EXPECTATIONS,
  runAdminShadowConversationScenario,
  runAdminShadowFullMatrix,
} from "../src/services/ai/salesBrainAdminShadowConversationHarness.ts";
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  resetAdminShadowGeminiCallerForTests,
  setAdminShadowGeminiCallerForTests,
} from "../src/services/ai/salesBrainAdminShadowRealProvider.ts";
import { ADMIN_SHADOW_SMOKE_SLICE_ID } from "../src/services/ai/salesBrainAdminShadowDiagnostics.ts";
import {
  NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES,
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE,
  handleAdminSalesBrainShadowSmokePost,
  stagingStyleShadowEnv,
} from "../src/services/ai/salesBrainServerShadowSmoke.ts";
import { wireShadowChatPath } from "../src/services/ai/salesBrainShadowChatPath.ts";

const DOC_PATH = "docs/v6.1J-admin-shadow-conversation-smoke-full-matrix.md";
const I_DOC_PATH = "docs/v6.1I-staging-ai-conversation-smoke-readiness.md";
const H4_DOC_PATH =
  "docs/v6.1H.4-admin-shadow-gemini-model-fix-staging-deploy-record.md";
const APPROVAL_PHRASE =
  "อนุมัติให้ทดสอบ admin shadow conversation smoke บน staging โดยไม่แสดงผลให้ผู้ใช้ทั่วไป ตาม v6.1J";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
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

function readEnvOn(key: string): string | undefined {
  if (key === NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV) {
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

console.log("=== v6.1J Admin Shadow Conversation Smoke / Full Matrix ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61j-admin-shadow-conversation-smoke-full-matrix.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const harnessSrc = readFileSync(
  "src/services/ai/salesBrainAdminShadowConversationHarness.ts",
  "utf8"
);
const shadowSmoke = readFileSync("src/services/ai/salesBrainServerShadowSmoke.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const chatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");

// --- doc exists + approval ---
{
  ok("doc exists", doc.length > 5000);
  ok("doc v6.1J label", doc.includes("v6.1J"));
  ok("doc approval phrase", doc.includes(APPROVAL_PHRASE));
  ok("doc full matrix", /full matrix|SS-01\.\.SS-08/i.test(doc));
  ok("doc conversation smoke", /conversation smoke/i.test(docLower));
  ok("doc user visible off", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("doc no deploy required", /no deploy|ไม่ deploy|docs\/tests/i.test(docLower));
  ok("doc references v6.1H.4", doc.includes("v6.1H.4"));
  ok("doc references v6.1I", doc.includes("v6.1I"));
  ok("doc budget 5/50", /budget.*5.*50|5.*\/.*50/i.test(doc));
  ok("doc rollback command", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/.test(doc));
  ok("doc no secrets versions access", /secrets versions access/i.test(docLower));
}

// --- harness module ---
{
  ok("harness exports full matrix ids", harnessSrc.includes("ADMIN_SHADOW_FULL_MATRIX_CASE_IDS"));
  ok("harness exports conversation scenarios", harnessSrc.includes("ADMIN_SHADOW_CONVERSATION_SCENARIOS"));
  ok("harness exports runAdminShadowFullMatrix", harnessSrc.includes("runAdminShadowFullMatrix"));
  ok("harness exports runAdminShadowConversationScenario", harnessSrc.includes("runAdminShadowConversationScenario"));
  ok("harness no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(harnessSrc));
  ok("harness no generateContent", !/generateContent\s*\(/.test(harnessSrc));
  ok("harness no custom prompt input", !harnessSrc.includes("userPrompt"));
  ok("harness fixed scenario ids only", harnessSrc.includes('"SC-01"') && harnessSrc.includes('"SC-03"'));
  ok("harness uses existing SS cases", harnessSrc.includes("runSalesBrainAdminShadowSmoke"));
}

// --- slice id v6.1J ---
{
  ok("slice id v6.1J", ADMIN_SHADOW_SMOKE_SLICE_ID === "v6.1J");
}

// --- injected SS-01 real provider success ---
{
  setAdminShadowGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: "synthetic admin shadow conversation turn [redacted]",
    requestIdHash: "conv1234567890ab",
    modelId: ADMIN_SHADOW_GEMINI_MODEL,
    budgetDailyLimit: 5,
    budgetMonthlyLimit: 50,
  }));

  const matrix = await runAdminShadowFullMatrix({ readEnv: readEnvOn });
  ok("full matrix 8 cases", matrix.length === 8);

  const ss01 = matrix.find((r) => r.caseId === "SS-01");
  ok("SS-01 providerNetwork true", ss01?.providerNetwork === true);
  ok("SS-01 real_provider_call_ok", ss01?.realProviderGateReason === "real_provider_call_ok");
  ok("SS-01 provider gemini in payload", ss01?.payload.shadowDebugResult?.provider === "gemini");
  ok("SS-01 userVisibleOff true", ss01?.userVisibleOff === true);
  ok("SS-01 legacy unchanged", ss01?.userVisibleResponse === SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES["SS-01"].legacyUserVisibleResponse);
  assertNoRawPii("SS-01 matrix", JSON.stringify(ss01));

  for (const caseId of ["SS-02", "SS-03", "SS-04", "SS-05", "SS-06", "SS-07", "SS-08"] as const) {
    const row = matrix.find((r) => r.caseId === caseId);
    ok(`${caseId} no real provider network`, row?.providerNetwork === false);
    ok(`${caseId} not gemini provider`, row?.payload.shadowDebugResult?.provider !== "gemini");
    if (row?.shadowModeActive && row.shadowEvaluationAllowed) {
      ok(`${caseId} mock provider`, row.payload.shadowDebugResult?.provider === "mock");
    } else {
      ok(`${caseId} shadow inactive or guardrail`, !row?.shadowModeActive || row?.shadowEvaluationAllowed === false);
    }
    ok(`${caseId} userVisibleOff true`, row?.userVisibleOff === true);
    ok(`${caseId} legacy exact`, row?.userVisibleResponse === SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES[caseId].legacyUserVisibleResponse);
  }

  ok("SS-02 gate case_not_allowed", matrix.find((r) => r.caseId === "SS-02")?.realProviderGateReason === "case_not_allowed_for_real_provider");
  ok("SS-08 gate production", matrix.find((r) => r.caseId === "SS-08")?.realProviderGateReason === "production_environment");

  resetAdminShadowGeminiCallerForTests();
}

// --- guardrails SS-05..SS-08 ---
{
  const matrix = await runAdminShadowFullMatrix({ readEnv: readEnvOn });

  const ss05 = matrix.find((r) => r.caseId === "SS-05");
  ok("SS-05 shadow inactive", ss05?.shadowModeActive === false);
  ok("SS-05 kill switch guardrail", ADMIN_SHADOW_MATRIX_EXPECTATIONS["SS-05"].guardrail === "kill_switch");

  const ss06 = matrix.find((r) => r.caseId === "SS-06");
  ok("SS-06 shadow eval blocked", ss06?.shadowEvaluationAllowed === false);
  ok("SS-06 budget guardrail", ADMIN_SHADOW_MATRIX_EXPECTATIONS["SS-06"].guardrail === "budget_missing");

  const ss07 = matrix.find((r) => r.caseId === "SS-07");
  ok("SS-07 shadow inactive", ss07?.shadowModeActive === false);
  ok("SS-07 v60r lifted v61l2b", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === false);
  ok("SS-07 guardrail meta", ADMIN_SHADOW_MATRIX_EXPECTATIONS["SS-07"].guardrail === "user_visible_blocked");

  const ss08 = matrix.find((r) => r.caseId === "SS-08");
  ok("SS-08 production off", ss08?.shadowEvaluationAllowed === false);
  ok("SS-08 guardrail meta", ADMIN_SHADOW_MATRIX_EXPECTATIONS["SS-08"].guardrail === "production_off");
}

// --- conversation scenarios (synthetic multi-turn) ---
{
  setAdminShadowGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: "conversation turn ok [redacted]",
    requestIdHash: "scen1234567890ab",
    modelId: ADMIN_SHADOW_GEMINI_MODEL,
    budgetDailyLimit: 5,
    budgetMonthlyLimit: 50,
  }));

  for (const scenarioId of ADMIN_SHADOW_CONVERSATION_SCENARIO_IDS) {
    const result = await runAdminShadowConversationScenario({
      scenarioId,
      readEnv: readEnvOn,
    });
    ok(`${scenarioId} label present`, result.label.length > 3);
    ok(`${scenarioId} turns match definition`, result.turns.length === ADMIN_SHADOW_CONVERSATION_SCENARIOS[scenarioId].turnCaseIds.length);
    for (const turn of result.turns) {
      ok(`${scenarioId} turn ${turn.turnIndex} userVisibleOff`, turn.userVisibleOff === true);
      assertNoRawPii(`${scenarioId} turn ${turn.caseId}`, JSON.stringify(turn));
    }
  }

  const sc01 = await runAdminShadowConversationScenario({ scenarioId: "SC-01", readEnv: readEnvOn });
  ok("SC-01 turn0 SS-01 gemini", sc01.turns[0]?.providerNetwork === true);
  ok("SC-01 turn1 SS-02 mock", sc01.turns[1]?.providerNetwork === false);

  const sc03 = await runAdminShadowConversationScenario({ scenarioId: "SC-03", readEnv: readEnvOn });
  ok("SC-03 turn1 SS-05 kill switch inactive", sc03.turns[1]?.payload.shadowModeActive === false);

  resetAdminShadowGeminiCallerForTests();
}

// --- handler per-case SS-01..SS-08 ---
{
  setAdminShadowGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: "handler matrix [redacted]",
    requestIdHash: "handler123456789",
    modelId: ADMIN_SHADOW_GEMINI_MODEL,
    budgetDailyLimit: 5,
    budgetMonthlyLimit: 50,
  }));

  process.env[NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV] = "true";
  process.env.GEMINI_API_KEY = "sm-configured-via-secret-ref";

  for (const caseId of ADMIN_SHADOW_FULL_MATRIX_CASE_IDS) {
    const { res, out } = mockRes();
    await handleAdminSalesBrainShadowSmokePost(reqWith({}, { caseId }), res);
    ok(`handler ${caseId} 200`, out.statusCode === 200);
    const body = out.body as {
      success?: boolean;
      readOnly?: boolean;
      userVisibleOff?: boolean;
      providerNetwork?: boolean;
      realProviderGateReason?: string;
      adminShadowDiag?: { sliceId?: string };
      data?: { userVisibleResponse?: string; shadowDebugResult?: { provider?: string } };
    };
    ok(`handler ${caseId} success`, body.success === true);
    ok(`handler ${caseId} readOnly`, body.readOnly === true);
    ok(`handler ${caseId} userVisibleOff`, body.userVisibleOff === true);
    ok(`handler ${caseId} sliceId`, body.adminShadowDiag?.sliceId === "v6.1J");
    assertNoRawPii(`handler ${caseId}`, JSON.stringify(out.body));

    if (caseId === "SS-01") {
      ok("handler SS-01 providerNetwork true", body.providerNetwork === true);
      ok("handler SS-01 real_provider_call_ok", body.realProviderGateReason === "real_provider_call_ok");
      ok("handler SS-01 gemini provider", body.data?.shadowDebugResult?.provider === "gemini");
    } else {
      ok(`handler ${caseId} providerNetwork false`, body.providerNetwork === false);
      ok(`handler ${caseId} not gemini provider`, body.data?.shadowDebugResult?.provider !== "gemini");
      if (body.data?.shadowDebugResult?.provider) {
        ok(`handler ${caseId} mock provider when shadow active`, body.data.shadowDebugResult.provider === "mock");
      }
    }
  }

  delete process.env[NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV];
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
  await handleAdminSalesBrainShadowSmokePost(reqWith({}, { caseId: "CUSTOM-PROMPT" }), custom.res);
  ok("custom caseId 400", custom.out.statusCode === 400);

  const freeform = mockRes();
  await handleAdminSalesBrainShadowSmokePost(
    reqWith({}, { caseId: "SS-01", userMessage: "real PII prompt" }),
    freeform.res
  );
  ok("freeform body ignored SS-01 still 200", freeform.out.statusCode === 200);
  const freeBody = freeform.out.body as { data?: { userVisibleResponse?: string } };
  ok(
    "freeform body does not change legacy",
    freeBody.data?.userVisibleResponse === SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES["SS-01"].legacyUserVisibleResponse
  );
}

// --- public chat legacy regression ---
{
  ok("useChat wires shadow only", useChat.includes("wireShadowChatPath"));
  ok("chat path legacy unchanged", /legacy user-visible text unchanged/i.test(chatPath));
  const wired = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: LEGACY_START_OVER,
    source: "useChat.orchestrated",
    environment: "staging",
    env: stagingStyleShadowEnv(),
  });
  ok("chat legacy exact start over", wired.legacyUserVisibleText === LEGACY_START_OVER);
  ok("chat no AI replacement", wired.legacyUserVisibleText !== "gemini");
  const wiredBlocked = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: LEGACY_START_OVER,
    source: "useChat.orchestrated",
    environment: "staging",
    env: { [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true" },
  });
  ok("chat user-visible attempted still legacy", wiredBlocked.legacyUserVisibleText === LEGACY_START_OVER);
}

// --- admin route behind guard only ---
{
  ok("server admin guard", /app\.use\("\/api\/admin", adminApiAuth\)/.test(serverTs));
  ok("server registers shadow smoke", serverTs.includes("registerSalesBrainAdminShadowSmokeRoutes"));
  ok("single admin shadow route", shadowSmoke.includes(SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE));
  ok("no second public shadow route", !serverTs.includes('app.post("/api/sales-brain-shadow-smoke"'));
}

// --- forbidden paths ---
{
  ok("no payment write", !shadowSmoke.includes("buyerLeadCapture") && !/settlement.*write/i.test(shadowSmoke));
  ok("no public signup", !shadowSmoke.includes("publicSignupEnabled"));
  ok("no production deploy note in harness", !harnessSrc.includes("nonga-production"));
  ok("mock listing synthetic only", SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES["SS-02"].listingContext?.listingId === "mock-listing-001");
}

// --- matrix expectations metadata ---
{
  for (const caseId of ADMIN_SHADOW_FULL_MATRIX_CASE_IDS) {
    ok(`expectations ${caseId} defined`, ADMIN_SHADOW_MATRIX_EXPECTATIONS[caseId] !== undefined);
  }
  ok("SS-01 real provider allowed meta", ADMIN_SHADOW_MATRIX_EXPECTATIONS["SS-01"].realProviderAllowed === true);
  ok("SS-02 real provider not allowed meta", ADMIN_SHADOW_MATRIX_EXPECTATIONS["SS-02"].realProviderAllowed === false);
}

// --- secret scan docs ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 16)}`, !pat.test(doc));
    ok(`harness src no secret ${pat.source.slice(0, 16)}`, !pat.test(harnessSrc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses harness", selfCode.includes("runAdminShadowFullMatrix"));
}

// --- package.json ---
{
  ok("package v61j script", pkg.includes("test:v61j-admin-shadow-conversation-smoke-full-matrix"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61j-admin-shadow-conversation-smoke-full-matrix.mts")
  );
}

// --- companion docs still valid ---
{
  ok("v6.1I doc exists", readFileSync(I_DOC_PATH, "utf8").includes("v6.1J"));
  ok("v6.1H.4 doc exists", readFileSync(H4_DOC_PATH, "utf8").includes("v6.1H.4"));
}

console.log("\nDone v6.1J Admin Shadow Conversation Smoke / Full Matrix tests.");
if (process.exitCode) process.exit(process.exitCode);
