/**
 * v6.0N — Gemini provider wiring behind disabled flag (offline tests)
 * npm run test:v60n-gemini-provider-wiring-disabled-flag
 */
import { readFileSync } from "node:fs";
import {
  createSalesBrainAdapter,
  routeWithSalesBrainAdapter,
  SALES_BRAIN_GEMINI_ENV_VAR,
  SALES_BRAIN_GEMINI_SM_RESOURCE,
  SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED,
  SALES_BRAIN_ROUND1_PAID_PROVIDER,
  geminiSecretMapping,
  shouldFallbackOnRealProviderError,
} from "../src/services/ai/salesBrainAdapter.ts";
import {
  assertGeminiApiKeyConfigured,
  assertRound1PaidProvider,
  buildProviderRequest,
  defaultApiKeySecretName,
  defaultSmResourceName,
  invokeRealProviderCall,
  isGeminiApiKeyConfigured,
  prepareProviderPayload,
  resolveRealProviderConfig,
  routeGeminiRealProviderDisabled,
  routeRealProviderStub,
  SalesBrainOpenAiFutureOnlyError,
  SalesBrainRealProviderMissingApiKeyError,
  SalesBrainRealProviderNetworkDisabledError,
  validateProviderConfig,
} from "../src/services/ai/salesBrainRealProvider.ts";

const realProviderSrc = readFileSync("src/services/ai/salesBrainRealProvider.ts", "utf8");
const adapterSrc = readFileSync("src/services/ai/salesBrainAdapter.ts", "utf8");
const typesSrc = readFileSync("src/services/ai/salesBrainTypes.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v60n-gemini-provider-wiring-disabled-flag.mts", "utf8");

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
];

const mockReadEnv = () => "sm-configured-via-secret-ref";

const geminiConfig = {
  paidProvider: "gemini" as const,
  apiKeySecretName: "GEMINI_API_KEY",
  smResourceName: "gemini-api-key",
  networkEnabled: false,
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0N Gemini Provider Wiring Behind Disabled Flag ===\n");

// --- round 1 gemini only ---
{
  ok("round1 provider gemini", SALES_BRAIN_ROUND1_PAID_PROVIDER === "gemini");
  ok("network disabled constant", SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED === false);
  ok("gemini env var name", SALES_BRAIN_GEMINI_ENV_VAR === "GEMINI_API_KEY");
  ok("gemini sm resource", SALES_BRAIN_GEMINI_SM_RESOURCE === "gemini-api-key");
  const mapping = geminiSecretMapping();
  ok("mapping env GEMINI_API_KEY", mapping.envVar === "GEMINI_API_KEY");
  ok("mapping sm gemini-api-key", mapping.smResource === "gemini-api-key");
  ok("mapping version latest", mapping.smVersion === "latest");
}

// --- openai future-only no-op ---
{
  let openaiCode = "";
  try {
    assertRound1PaidProvider("openai");
  } catch (e) {
    openaiCode = (e as SalesBrainOpenAiFutureOnlyError).code;
  }
  ok("openai future-only noop", openaiCode === "SALES_BRAIN_OPENAI_FUTURE_ONLY_NOOP");

  let stubOpenai = "";
  try {
    routeRealProviderStub({ userMessage: "x", userRole: "buyer", paidProvider: "openai" });
  } catch (e) {
    stubOpenai = (e as SalesBrainOpenAiFutureOnlyError).code;
  }
  ok("routeRealProviderStub openai noop", stubOpenai === "SALES_BRAIN_OPENAI_FUTURE_ONLY_NOOP");
}

// --- gemini config validate ---
{
  validateProviderConfig(geminiConfig);
  ok("gemini config validates", true);

  let badEnv = false;
  try {
    validateProviderConfig({ ...geminiConfig, apiKeySecretName: "WRONG" });
  } catch {
    badEnv = true;
  }
  ok("gemini rejects wrong env name", badEnv);

  let badSm = false;
  try {
    validateProviderConfig({ ...geminiConfig, smResourceName: "wrong-resource" });
  } catch {
    badSm = true;
  }
  ok("gemini rejects wrong sm resource", badSm);

  ok("default secret gemini env", defaultApiKeySecretName("gemini") === "GEMINI_API_KEY");
  ok("default sm gemini", defaultSmResourceName("gemini") === "gemini-api-key");
}

// --- missing GEMINI_API_KEY fail closed ---
{
  ok("missing key not configured", !isGeminiApiKeyConfigured(() => undefined));

  let missingCode = "";
  try {
    assertGeminiApiKeyConfigured(() => undefined);
  } catch (e) {
    missingCode = (e as SalesBrainRealProviderMissingApiKeyError).code;
  }
  ok("missing key throws fail closed", missingCode === "SALES_BRAIN_REAL_PROVIDER_MISSING_API_KEY");

  let routeMissing = "";
  try {
    routeGeminiRealProviderDisabled(
      { userMessage: "งบ 4 แสน", userRole: "buyer" },
      { readEnv: () => undefined }
    );
  } catch (e) {
    routeMissing = (e as SalesBrainRealProviderMissingApiKeyError).code;
  }
  ok("routeGemini missing key fail closed", routeMissing === "SALES_BRAIN_REAL_PROVIDER_MISSING_API_KEY");
}

// --- network disabled on invoke ---
{
  let networkCode = "";
  try {
    invokeRealProviderCall({
      paidProvider: "gemini",
      redactedUserMessage: "งบ 4 แสน",
      userRole: "buyer",
      aiMode: "high",
      requestIdHash: "abc123",
    });
  } catch (e) {
    networkCode = (e as SalesBrainRealProviderNetworkDisabledError).code;
  }
  ok("invoke throws network disabled", networkCode === "SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED");

  let wiredCode = "";
  try {
    routeGeminiRealProviderDisabled(
      { userMessage: "งบ 4 แสน", userRole: "buyer" },
      { readEnv: mockReadEnv }
    );
  } catch (e) {
    wiredCode = (e as SalesBrainRealProviderNetworkDisabledError).code;
  }
  ok("gemini wiring throws network disabled", wiredCode === "SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED");
}

// --- buildProviderRequest safety ---
{
  const req = buildProviderRequest(
    { userMessage: "งบ 4 แสน โทร 0812345678", userRole: "buyer", aiMode: "high" },
    geminiConfig
  );
  ok("request gemini provider", req.paidProvider === "gemini");
  ok("request no raw phone", !req.redactedUserMessage.includes("0812345678"));
  ok("request has hash", req.requestIdHash.length === 16);
}

{
  let missingListing = false;
  try {
    buildProviderRequest({ userMessage: "คันนี้ผ่อนได้ไหม", userRole: "buyer" }, geminiConfig);
  } catch (e) {
    missingListing = (e as Error).message.includes("Missing listing facts");
  }
  ok("missing listing askFollowUp guard", missingListing);
}

{
  let nogo = false;
  try {
    buildProviderRequest(
      { userMessage: "process payment for this lead", userRole: "admin" },
      geminiConfig
    );
  } catch {
    nogo = true;
  }
  ok("no-go payment blocked", nogo);
}

// --- resolveRealProviderConfig gemini mapping ---
{
  const cfg = resolveRealProviderConfig({ userMessage: "x", userRole: "buyer" });
  ok("resolve gemini only", cfg.paidProvider === "gemini");
  ok("resolve env GEMINI_API_KEY", cfg.apiKeySecretName === "GEMINI_API_KEY");
  ok("resolve sm gemini-api-key", cfg.smResourceName === "gemini-api-key");
  ok("resolve network false", cfg.networkEnabled === false);
}

// --- adapter gemini path ---
{
  let adapterCode = "";
  try {
    createSalesBrainAdapter({ provider: "real", readEnv: mockReadEnv }).route({
      userMessage: "งบ 4 แสน",
      userRole: "buyer",
    });
  } catch (e) {
    adapterCode = (e as SalesBrainRealProviderNetworkDisabledError).code;
  }
  ok("adapter real gemini network disabled", adapterCode === "SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED");

  let routeCode = "";
  try {
    routeWithSalesBrainAdapter(
      { userMessage: "งบ 4 แสน", userRole: "buyer", provider: "real", paidProvider: "gemini" },
      { readEnv: mockReadEnv }
    );
  } catch (e) {
    routeCode = (e as SalesBrainRealProviderNetworkDisabledError).code;
  }
  ok("routeWithSalesBrainAdapter gemini disabled", routeCode === "SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED");
}

// --- mock path unchanged ---
{
  const mock = createSalesBrainAdapter({ provider: "mock" }).route({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
  });
  ok("mock path unchanged", mock.intent === "buyer.search");
  ok("mock provider field", mock.provider === "mock");
}

// --- fallback helper ---
{
  ok(
    "fallback on network disabled",
    shouldFallbackOnRealProviderError(new SalesBrainRealProviderNetworkDisabledError())
  );
  ok(
    "fallback on missing key",
    shouldFallbackOnRealProviderError(new SalesBrainRealProviderMissingApiKeyError())
  );
  ok(
    "fallback on openai noop",
    shouldFallbackOnRealProviderError(new SalesBrainOpenAiFutureOnlyError())
  );
}

// --- prepareProviderPayload PII ---
{
  const prep = prepareProviderPayload({
    userMessage: "test@test.com",
    userRole: "buyer",
    listingContext: { listingId: "L1", fieldsPresent: ["price"] },
  });
  ok("prepare redacts email", prep.redactedUserMessage.includes("[email-redacted]"));
}

// --- not wired runtime ---
{
  ok("useChat no salesBrainRealProvider", !useChat.includes("salesBrainRealProvider"));
  ok("orchestrator no salesBrainRealProvider", !orch.includes("salesBrainRealProvider"));
  ok("useChat no salesBrainAdapter", !useChat.includes("salesBrainAdapter"));
  ok("orchestrator no salesBrainAdapter", !orch.includes("salesBrainAdapter"));
  ok("useChat no routeGeminiRealProviderDisabled", !useChat.includes("routeGeminiRealProviderDisabled"));
}

// --- source static: no network / secret values / http ---
{
  ok("realProvider no fetch", !/fetch\s*\(/.test(realProviderSrc));
  ok("realProvider no generateContent", !/generateContent\s*\(/.test(realProviderSrc));
  ok("realProvider no http url", !/https?:\/\//.test(realProviderSrc));
  ok("realProvider no firebase", !/from\s+["']firebase/.test(realProviderSrc));
  ok("adapter routeGeminiRealProviderDisabled", adapterSrc.includes("routeGeminiRealProviderDisabled"));
  ok("types missing api key error", typesSrc.includes("SALES_BRAIN_REAL_PROVIDER_MISSING_API_KEY"));
  ok("types openai future only", typesSrc.includes("SALES_BRAIN_OPENAI_FUTURE_ONLY_NOOP"));
}

// --- no secret values in source ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`realProvider no secret ${pat.source.slice(0, 12)}`, !pat.test(realProviderSrc));
    ok(`adapter no secret ${pat.source.slice(0, 12)}`, !pat.test(adapterSrc));
  }
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
  ok("package v60n script", pkg.includes("test:v60n-gemini-provider-wiring-disabled-flag"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60n-gemini-provider-wiring-disabled-flag.mts")
  );
}

console.log("\nDone v6.0N Gemini Provider Wiring Behind Disabled Flag tests.");
if (process.exitCode) process.exit(process.exitCode);
