/**
 * Gate B Synthetic Invocation Harness — static validation
 * npm run test:gate-b-synthetic-invocation-harness
 */
import { existsSync, readFileSync } from "node:fs";
import {
  GATE_B_GEMINI_MODEL,
  GATE_B_INVOCATION_CAP,
  GATE_B_SCENARIO_ID,
  GATE_B_SYNTHETIC_PROMPT,
  HARNESS_NETWORK_EXECUTION_ENABLED,
  buildGateBSyntheticPayload,
  evaluateGateBHardStopConditions,
  latencyBucket,
  resetGateBGeminiCallerForTests,
  runGateBHarness,
  setGateBGeminiCallerForTests,
  tokenEstimateBucketFromUsage,
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

console.log("=== Gate B Synthetic Invocation Harness (v6.5S.EXEC live patch) ===\n");

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
  ok("harness live patch label", harnessSrc.includes("harness-live"));
  ok("network execution enabled constant", HARNESS_NETWORK_EXECUTION_ENABLED === true);
  ok(
    "harness constant enabled in source",
    /HARNESS_NETWORK_EXECUTION_ENABLED\s*=\s*true/.test(harnessSrc)
  );
  ok("invocation cap is 1", GATE_B_INVOCATION_CAP === 1);
  ok("scenario id", GATE_B_SCENARIO_ID === "SYNTH_REDACTION_SCENARIO_001");
  ok("model id gemini-3.5-flash", GATE_B_GEMINI_MODEL === "gemini-3.5-flash");
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

// --- live path present; no fetch; genai only in harness ---
{
  ok("harness has google genai import", /@google\/genai/.test(harnessSrc));
  ok("harness has generateContent", /generateContent\s*\(/.test(harnessSrc));
  ok("harness no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(harnessSrc));
  ok("harness no firestore write", !/\b(setDoc|getDocs|writeBatch)\b/.test(harnessSrc));
  ok("harness no analytics persist", !/analytics\.track|logEvent|persistAiLog/.test(harnessSrc));
  ok(
    "harness discards raw response",
    /Response text intentionally discarded|metadata-only reporting/i.test(harnessSrc)
  );
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

// --- metadata helpers ---
{
  ok("latency bucket under 500", latencyBucket(100) === "<500ms");
  ok("token bucket unknown", tokenEstimateBucketFromUsage() === "unknown-minimal");
  ok(
    "token bucket from usage",
    tokenEstimateBucketFromUsage({ promptTokenCount: 10, candidatesTokenCount: 5 }) ===
      "10-5"
  );
}

// --- hard stop conditions ---
{
  const capStop = evaluateGateBHardStopConditions({ invocationCount: 2 });
  ok("cap exceeded stops", capStop.pass === false && capStop.stopReason === "invocation_cap_exceeded");
}

// --- dry-run harness (no network) ---
{
  const dryRun = await runGateBHarness({ mode: "dry-run" });
  ok("dry-run not stopped", dryRun.stopped === false);
  ok("dry-run validation pass", dryRun.validation.pass === true);
  ok("dry-run no network", dryRun.metadataReport?.networkCallMade === false);
  ok("dry-run category", dryRun.metadataReport?.successFailureCategory === "dry-run");
}

// --- execute-approved gates (no real network in tests) ---
{
  const noApproval = await runGateBHarness({ mode: "execute-approved" });
  ok("execute without approval env stopped", noApproval.stopped === true);
  ok(
    "execute without approval reason",
    noApproval.stopReason === "missing_execution_approval_env"
  );

  const noKey = await runGateBHarness({
    mode: "execute-approved",
    readEnv: (key) =>
      key === "GATE_B_SYNTHETIC_EXECUTION_APPROVED" ? "true" : undefined,
  });
  ok("execute without api key stopped", noKey.stopped === true);
  ok("execute without api key reason", noKey.stopReason === "missing_api_key");

  setGateBGeminiCallerForTests(async () => ({
    successFailureCategory: "success",
    modelId: GATE_B_GEMINI_MODEL,
    latencyBucket: "<500ms",
    tokenEstimateBucket: "10-5",
    costBucket: "minimal-single-call",
    networkCallMade: true,
    invocationCount: 1,
    redactionApplied: true,
  }));

  const mockExec = await runGateBHarness({
    mode: "execute-approved",
    readEnv: (key) => {
      if (key === "GATE_B_SYNTHETIC_EXECUTION_APPROVED") return "true";
      if (key === "GEMINI_API_KEY") return "test-key-not-real";
      return undefined;
    },
  });
  ok("mock execute not stopped", mockExec.stopped === false);
  ok("mock execute network true", mockExec.metadataReport?.networkCallMade === true);
  ok("mock execute invocation 1", mockExec.metadataReport?.invocationCount === 1);

  resetGateBGeminiCallerForTests();
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
  ok(
    "package execute-approved script",
    pkg.includes("gate-b-synthetic-invocation-exec:execute-approved")
  );
  ok("package harness test script", pkg.includes("test:gate-b-synthetic-invocation-harness"));
}

console.log("\nDone Gate B Synthetic Invocation Harness tests.");
if (process.exitCode) process.exit(process.exitCode);
