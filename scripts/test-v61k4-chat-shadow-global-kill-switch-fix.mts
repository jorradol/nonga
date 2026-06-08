/**
 * v6.1K.4 — Global Kill Switch Fix for Chat Shadow Sink (offline harness)
 * npm run test:v61k4-chat-shadow-global-kill-switch-fix
 */
import type { Request, Response } from "express";
import { readFileSync } from "node:fs";
import {
  CHAT_SHADOW_SINK_EXPECTATIONS,
  runChatShadowSinkScenario,
} from "../src/services/ai/salesBrainChatShadowSinkHarness.ts";
import { CHAT_SHADOW_SINK_SLICE_ID } from "../src/services/ai/salesBrainChatShadowSinkDiagnostics.ts";
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  isGlobalChatShadowEmergencyKillSwitchActive,
  resetAdminShadowGeminiCallerForTests,
  setAdminShadowGeminiCallerForTests,
} from "../src/services/ai/salesBrainChatShadowRealProvider.ts";
import {
  NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  CHAT_PATH_LEGACY_START_OVER,
  handleAdminChatShadowSinkPost,
  SALES_BRAIN_CHAT_SHADOW_SINK_ROUTE,
  SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS,
} from "../src/services/ai/salesBrainServerChatShadowSink.ts";
import { stagingStyleShadowEnv } from "../src/services/ai/salesBrainServerShadowSmoke.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { wireShadowChatPath } from "../src/services/ai/salesBrainShadowChatPath.ts";

const DOC_PATH = "docs/v6.1K.4-chat-shadow-global-kill-switch-fix.md";
const K3_DOC_PATH = "docs/v6.1K.3-budget-kill-switch-rollback-exercise.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const PII_PHONE = "0812345678";
const PII_EMAIL = "customer.real@example.com";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
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

function readEnvChatOnGlobalKillOff(key: string): string | undefined {
  if (key === NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV) {
    return "true";
  }
  if (key === NONGA_AI_EMERGENCY_KILL_SWITCH_ENV) {
    return "false";
  }
  if (key === "GEMINI_API_KEY") {
    return "sm-configured-via-secret-ref";
  }
  return stagingStyleShadowEnv()[key];
}

function readEnvChatOnGlobalKillOn(key: string): string | undefined {
  if (key === NONGA_AI_EMERGENCY_KILL_SWITCH_ENV) {
    return "true";
  }
  return readEnvChatOnGlobalKillOff(key);
}

function assertNoRawPii(label: string, blob: string) {
  ok(`${label} no raw phone`, !blob.includes(PII_PHONE));
  ok(`${label} no raw email`, !blob.includes(PII_EMAIL));
}

console.log("=== v6.1K.4 Chat Shadow Global Kill Switch Fix ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61k4-chat-shadow-global-kill-switch-fix.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const sinkModule = readFileSync("src/services/ai/salesBrainServerChatShadowSink.ts", "utf8");
const realProviderModule = readFileSync(
  "src/services/ai/salesBrainChatShadowRealProvider.ts",
  "utf8"
);
const diagModule = readFileSync("src/services/ai/salesBrainChatShadowSinkDiagnostics.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const chatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");

// --- doc ---
{
  ok("doc exists", doc.length > 2000);
  ok("doc v6.1K.4 label", doc.includes("v6.1K.4"));
  ok("doc global kill switch fix", /global kill switch fix/i.test(doc));
  ok("doc references v6.1K.3 gap", doc.includes("v6.1K.3"));
  ok("doc emergency_kill_switch gate", doc.includes("emergency_kill_switch"));
  ok("doc stagingStyleShadowEnv root cause", doc.includes("stagingStyleShadowEnv"));
  ok("doc deploy required note", /deploy required|Cloud Run deploy required/i.test(doc));
  ok("doc no secrets versions access", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- code structure ---
{
  ok("real provider global kill helper", realProviderModule.includes("isGlobalChatShadowEmergencyKillSwitchActive"));
  ok("handler checks global kill before invoke", /isGlobalChatShadowEmergencyKillSwitchActive\(readEnv\)/.test(sinkModule));
  ok("gate reason emergency_kill_switch", sinkModule.includes('realProviderGateReason: "emergency_kill_switch"'));
  ok("diag globalEmergencyKillSwitchActive", diagModule.includes("globalEmergencyKillSwitchActive"));
  ok("slice id v6.1K unchanged", CHAT_SHADOW_SINK_SLICE_ID === "v6.1K");
  ok("sink no generateContent", !/generateContent\s*\(/.test(sinkModule));
  ok("sink route unchanged", sinkModule.includes(SALES_BRAIN_CHAT_SHADOW_SINK_ROUTE));
}

// --- CP-02 global kill true: no provider network, no invocation ---
{
  let invokeCount = 0;
  setAdminShadowGeminiCallerForTests(async () => {
    invokeCount += 1;
    return {
      providerNetworkUsed: true,
      redactedProviderOutput: "should-not-run",
      requestIdHash: "killblock123456",
      modelId: ADMIN_SHADOW_GEMINI_MODEL,
      budgetDailyLimit: 5,
      budgetMonthlyLimit: 50,
    };
  });

  ok(
    "helper kill on",
    isGlobalChatShadowEmergencyKillSwitchActive(readEnvChatOnGlobalKillOn)
  );
  ok(
    "helper kill off",
    !isGlobalChatShadowEmergencyKillSwitchActive(readEnvChatOnGlobalKillOff)
  );

  const cp02Kill = await runChatShadowSinkScenario({
    scenarioId: "CP-02",
    readEnv: readEnvChatOnGlobalKillOn,
  });
  ok("CP-02 global kill providerNetwork false", cp02Kill.providerNetwork === false);
  ok("CP-02 global kill gate emergency_kill_switch", cp02Kill.realProviderGateReason === "emergency_kill_switch");
  ok("CP-02 global kill no gemini provider", cp02Kill.payload.shadowDebugResult?.provider !== "gemini");
  ok("CP-02 global kill sinkOnly via userVisibleOff", cp02Kill.userVisibleOff === true);
  ok("CP-02 global kill mock not invoked", invokeCount === 0);
  assertNoRawPii("CP-02 global kill", JSON.stringify(cp02Kill));

  resetAdminShadowGeminiCallerForTests();
}

// --- CP-02 flag off unchanged ---
{
  const readEnvOff = (key: string) => stagingStyleShadowEnv()[key];
  const cp02Off = await runChatShadowSinkScenario({
    scenarioId: "CP-02",
    readEnv: readEnvOff,
  });
  ok("CP-02 flag off providerNetwork false", cp02Off.providerNetwork === false);
  ok(
    "CP-02 flag off chat_shadow_real_provider_flag_off",
    cp02Off.realProviderGateReason === "chat_shadow_real_provider_flag_off"
  );
}

// --- CP-02 flag on + global kill false: allow injected provider ---
{
  let invokeCount = 0;
  setAdminShadowGeminiCallerForTests(async () => {
    invokeCount += 1;
    return {
      providerNetworkUsed: true,
      redactedProviderOutput: "synthetic v61k4 [redacted]",
      requestIdHash: "allowpath1234567",
      modelId: ADMIN_SHADOW_GEMINI_MODEL,
      budgetDailyLimit: 5,
      budgetMonthlyLimit: 50,
    };
  });

  const cp02Allow = await runChatShadowSinkScenario({
    scenarioId: "CP-02",
    readEnv: readEnvChatOnGlobalKillOff,
  });
  ok("CP-02 allow path providerNetwork true", cp02Allow.providerNetwork === true);
  ok("CP-02 allow path real_provider_call_ok", cp02Allow.realProviderGateReason === "real_provider_call_ok");
  ok("CP-02 allow path mock invoked once", invokeCount === 1);
  ok("CP-02 allow path gemini provider", cp02Allow.payload.shadowDebugResult?.provider === "gemini");

  resetAdminShadowGeminiCallerForTests();
}

// --- CP-03 scenario-local kill still blocks ---
{
  const cp03 = await runChatShadowSinkScenario({
    scenarioId: "CP-03",
    readEnv: readEnvChatOnGlobalKillOff,
  });
  ok("CP-03 providerNetwork false", cp03.providerNetwork === false);
  ok("CP-03 shadowEvaluationAllowed false", cp03.shadowEvaluationAllowed === false);
  ok("CP-03 guardrail kill_switch", CHAT_SHADOW_SINK_EXPECTATIONS["CP-03"].guardrail === "kill_switch");
  ok(
    "CP-03 enablement emergency_kill_switch",
    cp03.payload.enablementBlockedReason === "emergency_kill_switch"
  );
}

// --- handler with process.env global kill ---
{
  let invokeCount = 0;
  setAdminShadowGeminiCallerForTests(async () => {
    invokeCount += 1;
    return {
      providerNetworkUsed: true,
      redactedProviderOutput: "handler kill block",
      requestIdHash: "handlerkill12345",
      modelId: ADMIN_SHADOW_GEMINI_MODEL,
      budgetDailyLimit: 5,
      budgetMonthlyLimit: 50,
    };
  });

  process.env[NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV] = "true";
  process.env[NONGA_AI_EMERGENCY_KILL_SWITCH_ENV] = "true";
  process.env.GEMINI_API_KEY = "sm-configured-via-secret-ref";

  const { res, out } = mockRes();
  await handleAdminChatShadowSinkPost(
    { headers: {}, query: {}, body: { scenarioId: "CP-02" } } as Request,
    res
  );
  const body = out.body as {
    success?: boolean;
    readOnly?: boolean;
    userVisibleOff?: boolean;
    sinkOnly?: boolean;
    providerNetwork?: boolean;
    realProviderGateReason?: string;
    chatShadowDiag?: { globalEmergencyKillSwitchActive?: boolean };
  };
  ok("handler CP-02 kill 200", out.statusCode === 200);
  ok("handler CP-02 kill success", body.success === true);
  ok("handler CP-02 kill readOnly", body.readOnly === true);
  ok("handler CP-02 kill userVisibleOff", body.userVisibleOff === true);
  ok("handler CP-02 kill sinkOnly", body.sinkOnly === true);
  ok("handler CP-02 kill providerNetwork false", body.providerNetwork === false);
  ok("handler CP-02 kill gate emergency_kill_switch", body.realProviderGateReason === "emergency_kill_switch");
  ok("handler CP-02 kill diag global kill true", body.chatShadowDiag?.globalEmergencyKillSwitchActive === true);
  ok("handler CP-02 kill mock not invoked", invokeCount === 0);

  delete process.env[NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV];
  delete process.env[NONGA_AI_EMERGENCY_KILL_SWITCH_ENV];
  delete process.env.GEMINI_API_KEY;
  resetAdminShadowGeminiCallerForTests();
}

// --- public chat legacy unchanged ---
{
  const orchestrated = tryOrchestrateChatReply("เริ่มใหม่", [], {});
  ok("orchestrator start over hit", orchestrated !== null);
  ok("orchestrator legacy exact", orchestrated?.text === CHAT_PATH_LEGACY_START_OVER);

  const wired = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    source: "useChat.orchestrated",
    environment: "staging",
    env: stagingStyleShadowEnv(),
  });
  ok("wireShadowChatPath legacy exact", wired.legacyUserVisibleText === CHAT_PATH_LEGACY_START_OVER);
  ok("wireShadowChatPath no AI replacement", wired.legacyUserVisibleText !== "gemini");
  ok("useChat no GoogleGenAI", !useChat.includes("GoogleGenAI"));
  ok("useChat no GEMINI_API_KEY", !useChat.includes("GEMINI_API_KEY"));
  ok("chatPath no generateContent", !/generateContent\s*\(/.test(chatPath));
}

// --- no secrets in doc/modules ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
    ok(`sink no secret ${pat.source.slice(0, 12)}`, !pat.test(sinkModule));
  }
}

// --- script static only ---
{
  const selfCode = selfSrc.split("// --- script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses harness", selfCode.includes("runChatShadowSinkScenario"));
}

// --- package + companion ---
{
  ok("package v61k4 script", pkg.includes("test:v61k4-chat-shadow-global-kill-switch-fix"));
  ok("v6.1K.3 doc exists", readFileSync(K3_DOC_PATH, "utf8").includes("v6.1K.3"));
  ok("doc no v6.1L approval", !/อนุมัติ.*v6\.1L/i.test(doc));
  ok("doc no production deploy done", !/production deploy.*done/i.test(docLower));
}

console.log("\nDone v6.1K.4 Chat Shadow Global Kill Switch Fix tests.");
if (process.exitCode) process.exit(process.exitCode);
