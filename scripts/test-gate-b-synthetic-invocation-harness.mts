/**
 * Gate B Synthetic Invocation Harness — static validation (no network, no Gemini)
 * npm run test:gate-b-synthetic-invocation-harness
 */
import { existsSync, readFileSync } from "node:fs";
import {
  GATE_B_HARNESS_VERSION,
  GATE_B_INVOCATION_CAP,
  GATE_B_SCENARIO_ID,
  GATE_B_SYNTHETIC_PROMPT,
  HARNESS_NETWORK_EXECUTION_ENABLED,
  buildGateBSyntheticPayload,
  evaluateGateBHardStopConditions,
  runGateBHarness,
  validateGateBPayloadBeforeSend,
} from "./gate-b-synthetic-invocation-exec.mts";
import {
  DEFAULT_AI_PROVIDER_STATUS,
  adminCanEnableRealProvider,
  isProductionRealProviderForbidden,
} from "../src/config/aiControl/aiControlDefaults.ts";
import {
  REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED,
  invokeRealProviderAdapterSkeleton,
} from "../src/services/ai/realProviderAdapter.ts";

const HARNESS_PATH = "scripts/gate-b-synthetic-invocation-exec.mts";
const APP_PATH = "src/App.tsx";
const USE_CHAT_PATH = "src/hooks/chat/useChat.ts";
const ADMIN_SHADOW_PATH = "src/services/ai/salesBrainAdminShadowRealProvider.ts";
const ORCHESTRATOR_PATH = "src/services/ai/chat/chatSearchOrchestrator.ts";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Gate B Synthetic Invocation Harness (v6.5S.EXEC) ===\n");

const harnessSrc = readFileSync(HARNESS_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-gate-b-synthetic-invocation-harness.mts",
  "utf8"
);
const appSrc = readFileSync(APP_PATH, "utf8");
const useChatSrc = readFileSync(USE_CHAT_PATH, "utf8");
const adminShadowSrc = readFileSync(ADMIN_SHADOW_PATH, "utf8");
const orchestratorSrc = readFileSync(ORCHESTRATOR_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

const selfCodeOnly = selfSrc
  .split("\n")
  .filter((line) => {
    const t = line.trimStart();
    if (t.startsWith("ok(") || t.startsWith('ok("')) return false;
    return true;
  })
  .join("\n");

// --- harness exists ---
{
  ok("harness file exists", existsSync(HARNESS_PATH));
  ok("harness v6.5S.EXEC label", harnessSrc.includes("v6.5S.EXEC"));
  ok("network execution disabled", HARNESS_NETWORK_EXECUTION_ENABLED === false);
  ok("harness constant disabled in source", /HARNESS_NETWORK_EXECUTION_ENABLED\s*=\s*false/.test(harnessSrc));
  ok("invocation cap is 1", GATE_B_INVOCATION_CAP === 1);
  ok("scenario id", GATE_B_SCENARIO_ID === "SYNTH_REDACTION_SCENARIO_001");
}

// --- isolation from runtime paths ---
{
  ok("app no harness import", !appSrc.includes("gate-b-synthetic-invocation"));
  ok("useChat no harness import", !useChatSrc.includes("gate-b-synthetic-invocation"));
  ok("admin shadow no harness import", !adminShadowSrc.includes("gate-b-synthetic-invocation"));
  ok("orchestrator no harness import", !orchestratorSrc.includes("gate-b-synthetic-invocation"));
  ok("harness not import admin shadow", !harnessSrc.includes("salesBrainAdminShadowRealProvider"));
  ok("harness not import useChat", !harnessSrc.includes("useChat"));
  ok("harness not import App", !/from\s+['"].*App/.test(harnessSrc));
}

// --- no network / gemini in harness ---
{
  ok("harness no google genai import", !/@google\/genai|GoogleGenAI/.test(harnessSrc));
  ok("harness no generateContent", !/generateContent\s*\(/.test(harnessSrc));
  ok("harness no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(harnessSrc));
  ok("harness no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(harnessSrc));
  ok("harness no analytics persist", !/analytics\.track|logEvent|persistAiLog/.test(harnessSrc));
  ok("self no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCodeOnly));
  ok("self no generateContent", !/generateContent\s*\(/.test(selfCodeOnly));
}

// --- payload validation ---
{
  const payload = buildGateBSyntheticPayload();
  ok("payload scenario", payload.scenarioId === GATE_B_SCENARIO_ID);
  ok("payload uses synthetic prompt", payload.prompt === GATE_B_SYNTHETIC_PROMPT);
  ok("payload has allowed labels", payload.allowedLabels.length >= 3);
  const validation = validateGateBPayloadBeforeSend(payload);
  ok("payload validation pass", validation.pass === true);
  ok(
    "prompt includes SYNTH labels",
    /SYNTH_INTENT_BUDGET_SEARCH/.test(GATE_B_SYNTHETIC_PROMPT) &&
      /SYNTH_VEHICLE_SEDAN/.test(GATE_B_SYNTHETIC_PROMPT)
  );
}

// --- hard stop conditions ---
{
  const capStop = evaluateGateBHardStopConditions({ invocationCount: 2 });
  ok("cap exceeded stops", capStop.pass === false && capStop.stopReason === "invocation_cap_exceeded");
  const uvStop = evaluateGateBHardStopConditions({
    invocationCount: 0,
    runtime: { userVisibleEnabled: true },
  });
  ok("user visible stop", uvStop.stopReason === "user_visible_path_enabled");
  const adminStop = evaluateGateBHardStopConditions({
    invocationCount: 0,
    runtime: { adminShadowRealProviderEnabled: true },
  });
  ok("admin shadow stop", adminStop.stopReason === "admin_shadow_real_provider_enabled");
  const killStop = evaluateGateBHardStopConditions({
    invocationCount: 0,
    runtime: { emergencyKillSwitch: true },
  });
  ok("kill switch stop", killStop.stopReason === "emergency_kill_switch_active");
  const prodStop = evaluateGateBHardStopConditions({
    invocationCount: 0,
    runtime: { productionTarget: true },
  });
  ok("production stop", prodStop.stopReason === "production_target");
}

// --- dry-run harness ---
{
  const dryRun = await runGateBHarness({ mode: "dry-run" });
  ok("dry-run not stopped", dryRun.stopped === false);
  ok("dry-run validation pass", dryRun.validation.pass === true);
  ok("dry-run no network", dryRun.metadataReport?.networkCallMade === false);
  ok("dry-run category", dryRun.metadataReport?.successFailureCategory === "dry-run");
}

// --- execute-approved blocked in harness slice ---
{
  const execAttempt = await runGateBHarness({
    mode: "execute-approved",
    readEnv: (key) => (key === "GATE_B_SYNTHETIC_EXECUTION_APPROVED" ? "true" : undefined),
  });
  ok("execute-approved stopped", execAttempt.stopped === true);
  ok(
    "execute-approved network disabled reason",
    execAttempt.stopReason === "missing_execution_approval_env" ||
      execAttempt.stopReason === "network_execution_disabled"
  );
}

// --- runtime contract ---
{
  ok("default provider OFF", DEFAULT_AI_PROVIDER_STATUS === "OFF");
  ok("adapter default disabled", REAL_PROVIDER_ADAPTER_DEFAULT_ENABLED === false);
  ok("production forbidden", isProductionRealProviderForbidden("production") === true);
  ok("admin cannot enable", adminCanEnableRealProvider() === false);
  const adapter = invokeRealProviderAdapterSkeleton({
    surfaceId: "buyerFriendlyDetailPreview",
  });
  ok("adapter blocked", adapter.blocked === true);
  ok("adapter no network", adapter.metadata.networkCallMade === false);
}

// --- no secrets in harness source ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`harness no secret ${pat.source.slice(0, 12)}`, !pat.test(harnessSrc));
  }
}

// --- package scripts ---
{
  ok("package dry-run script", pkg.includes("gate-b-synthetic-invocation-exec:dry-run"));
  ok("package harness test script", pkg.includes("test:gate-b-synthetic-invocation-harness"));
  ok("package points to exec mts", pkg.includes("scripts/gate-b-synthetic-invocation-exec.mts"));
}

console.log("\nDone Gate B Synthetic Invocation Harness tests.");
if (process.exitCode) process.exit(process.exitCode);
