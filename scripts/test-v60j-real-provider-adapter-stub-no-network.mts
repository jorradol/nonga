/**
 * v6.0J — Real provider adapter stub / no network (offline tests)
 * npm run test:v60j-real-provider-adapter-stub-no-network
 */
import { readFileSync } from "node:fs";
import { createSalesBrainAdapter, routeWithSalesBrainAdapter } from "../src/services/ai/salesBrainAdapter.ts";
import {
  buildProviderRequest,
  defaultApiKeySecretName,
  invokeRealProviderCall,
  prepareProviderPayload,
  resolveRealProviderConfig,
  routeRealProviderStub,
  SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED,
  validateProviderConfig,
  SalesBrainOpenAiFutureOnlyError,
  SalesBrainRealProviderNetworkDisabledError,
} from "../src/services/ai/salesBrainRealProvider.ts";

const mockReadEnv = () => "sm-configured-via-secret-ref";

const geminiConfig = {
  paidProvider: "gemini" as const,
  apiKeySecretName: "GEMINI_API_KEY",
  smResourceName: "gemini-api-key",
  networkEnabled: false,
};

const realProviderSrc = readFileSync("src/services/ai/salesBrainRealProvider.ts", "utf8");
const adapterSrc = readFileSync("src/services/ai/salesBrainAdapter.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v60j-real-provider-adapter-stub-no-network.mts", "utf8");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0J Real Provider Adapter Stub / No Network ===\n");

// --- imports ---
{
  ok("validateProviderConfig importable", typeof validateProviderConfig === "function");
  ok("buildProviderRequest importable", typeof buildProviderRequest === "function");
  ok("network disabled constant", SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED === false);
}

// --- gemini config validate (no secret value) ---
{
  validateProviderConfig(geminiConfig);
  ok("gemini config validates", true);

  let badSecret = false;
  try {
    validateProviderConfig({ ...geminiConfig, apiKeySecretName: "WRONG_KEY" });
  } catch {
    badSecret = true;
  }
  ok("gemini rejects wrong secret name", badSecret);
}

// --- openai future-only (v6.0N) ---
{
  let openaiNoop = false;
  try {
    validateProviderConfig({
      paidProvider: "openai",
      apiKeySecretName: "OPENAI_API_KEY",
      smResourceName: "openai-api-key",
      networkEnabled: false,
    });
  } catch (e) {
    openaiNoop = (e as SalesBrainOpenAiFutureOnlyError).code === "SALES_BRAIN_OPENAI_FUTURE_ONLY_NOOP";
  }
  ok("openai config future-only noop", openaiNoop);
  ok("default secret gemini", defaultApiKeySecretName("gemini") === "GEMINI_API_KEY");
  ok("default secret openai", defaultApiKeySecretName("openai") === "OPENAI_API_KEY");
}

// --- buildProviderRequest PII redaction ---
{
  const req = buildProviderRequest(
    {
      userMessage: "งบ 4 แสน โทร 0812345678",
      userRole: "buyer",
      aiMode: "high",
    },
    { paidProvider: "gemini", apiKeySecretName: "GEMINI_API_KEY", smResourceName: "gemini-api-key", networkEnabled: false }
  );
  ok("request gemini provider", req.paidProvider === "gemini");
  ok("request no raw phone", !req.redactedUserMessage.includes("0812345678"));
  ok("request has hash", req.requestIdHash.length === 16);
}

// --- missing listing facts ---
{
  let missingListing = false;
  try {
    buildProviderRequest(
      { userMessage: "คันนี้ผ่อนได้ไหม", userRole: "buyer" },
      geminiConfig
    );
  } catch (e) {
    missingListing = (e as Error).message.includes("Missing listing facts");
  }
  ok("finance no listing throws askFollowUp guard", missingListing);
}

// --- no-go zones ---
{
  let nogo = false;
  try {
    buildProviderRequest(
      { userMessage: "process payment for this lead", userRole: "admin" },
      { paidProvider: "gemini", apiKeySecretName: "GEMINI_API_KEY", smResourceName: "gemini-api-key", networkEnabled: false }
    );
  } catch {
    nogo = true;
  }
  ok("no-go payment blocked in payload", nogo);
}

// --- invoke throws network disabled ---
{
  let code = "";
  try {
    invokeRealProviderCall({
      paidProvider: "gemini",
      redactedUserMessage: "งบ 4 แสน",
      userRole: "buyer",
      aiMode: "high",
      requestIdHash: "abc123",
    });
  } catch (e) {
    code = (e as SalesBrainRealProviderNetworkDisabledError).code;
  }
  ok("invoke throws network disabled", code === "SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED");
}

// --- routeRealProviderStub ---
{
  let stubCode = "";
  try {
    routeRealProviderStub(
      { userMessage: "งบ 4 แสน", userRole: "buyer", paidProvider: "openai" },
      "openai"
    );
  } catch (e) {
    stubCode = (e as SalesBrainOpenAiFutureOnlyError).code;
  }
  ok("routeRealProviderStub openai noop", stubCode === "SALES_BRAIN_OPENAI_FUTURE_ONLY_NOOP");
}

// --- adapter real provider path ---
{
  let adapterCode = "";
  try {
    createSalesBrainAdapter({ provider: "real", realPaidProvider: "gemini", readEnv: mockReadEnv }).route({
      userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
      userRole: "buyer",
    });
  } catch (e) {
    adapterCode = (e as SalesBrainRealProviderNetworkDisabledError).code;
  }
  ok("adapter real path network disabled", adapterCode === "SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED");

  let routeCode = "";
  try {
    routeWithSalesBrainAdapter(
      {
        userMessage: "งบ 4 แสน",
        userRole: "buyer",
        provider: "real",
        paidProvider: "gemini",
      },
      { readEnv: mockReadEnv }
    );
  } catch (e) {
    routeCode = (e as SalesBrainRealProviderNetworkDisabledError).code;
  }
  ok("routeWithSalesBrainAdapter real throws", routeCode === "SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED");
}

// --- mock path still works ---
{
  const mock = createSalesBrainAdapter({ provider: "mock" }).route({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
  });
  ok("mock path unchanged", mock.intent === "buyer.search");
  ok("mock provider field", mock.provider === "mock");
}

// --- prepareProviderPayload ---
{
  const prep = prepareProviderPayload({
    userMessage: "test@test.com",
    userRole: "buyer",
    listingContext: { listingId: "L1", fieldsPresent: ["price"] },
  });
  ok("prepare redacts email", prep.redactedUserMessage.includes("[email-redacted]"));
}

// --- resolveRealProviderConfig no secret value ---
{
  let openaiResolve = false;
  try {
    resolveRealProviderConfig({ userMessage: "x", userRole: "buyer", paidProvider: "openai" });
  } catch (e) {
    openaiResolve = (e as SalesBrainOpenAiFutureOnlyError).code === "SALES_BRAIN_OPENAI_FUTURE_ONLY_NOOP";
  }
  ok("resolve openai future-only noop", openaiResolve);

  const cfg = resolveRealProviderConfig({ userMessage: "x", userRole: "buyer" });
  ok("resolve gemini secret name only", cfg.apiKeySecretName === "GEMINI_API_KEY");
  ok("resolve gemini sm resource", cfg.smResourceName === "gemini-api-key");
  ok("resolve network false", cfg.networkEnabled === false);
}

// --- not wired runtime ---
{
  ok("useChat no salesBrainRealProvider", !useChat.includes("salesBrainRealProvider"));
  ok("orchestrator no salesBrainRealProvider", !orch.includes("salesBrainRealProvider"));
  ok("useChat no routeRealProviderStub", !useChat.includes("routeRealProviderStub"));
  ok("orchestrator no salesBrainAdapter", !orch.includes("salesBrainAdapter"));
}

// --- source static: no network / AI API ---
{
  ok("realProvider no fetch", !/fetch\s*\(/.test(realProviderSrc));
  ok("realProvider no generateContent", !/generateContent\s*\(/.test(realProviderSrc));
  ok("realProvider no http url", !/https?:\/\//.test(realProviderSrc));
  ok("realProvider no firebase", !/from\s+["']firebase/.test(realProviderSrc));
  ok("adapter delegates gemini disabled", adapterSrc.includes("routeGeminiRealProviderDisabled"));
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
}

// --- package.json ---
{
  ok("package v60j script", pkg.includes("test:v60j-real-provider-adapter-stub-no-network"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60j-real-provider-adapter-stub-no-network.mts")
  );
}

console.log("\nDone v6.0J Real Provider Adapter Stub / No Network tests.");
if (process.exitCode) process.exit(process.exitCode);
