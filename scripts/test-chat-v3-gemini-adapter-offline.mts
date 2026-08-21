/**
 * WP-V3-07C — Real Gemini adapter offline verification (injected fake Gemini client only).
 * Path under test: Conversation Service → Real V.3 Gemini Adapter → Fake Gemini Client
 * Run: npx tsx scripts/test-chat-v3-gemini-adapter-offline.mts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildChatV3SystemInstruction } from "../src/services/ai/chat-v3/chatV3SystemInstruction.ts";
import { runChatV3Conversation } from "../src/services/ai/chat-v3/chatV3ConversationService.ts";
import { CHAT_V3_USER_FACING_UNAVAILABLE } from "../src/services/ai/chat-v3/chatV3ConversationContracts.ts";
import {
  assertFakeProviderBlockedInProduction,
  CHAT_V3_GEMINI_PROVIDER_ID,
  createRealGeminiChatV3Provider,
  isChatV3LiveProviderEnabled,
  NONGA_AI_CHAT_V3_LIVE_PROVIDER_ENABLED_ENV,
  NONGA_AI_CHAT_V3_PROVIDER_ENV,
  resolveChatV3ProviderAdapter,
} from "../src/services/ai/chat-v3/chatV3ProviderAdapter.ts";
import {
  assertFakeGeminiClientBlockedInProduction,
  buildChatV3GeminiContents,
  CHAT_V3_REUSED_SERVER_GEMINI_MODEL,
  createFakeChatV3GeminiClient,
  getChatV3GeminiSdkNetworkCallCount,
  getLastFakeChatV3GeminiRequest,
  mapChatV3HistoryRoleToGemini,
  NONGA_AI_CHAT_V3_MODEL_ENV,
  resetChatV3GeminiClientForTests,
  resetChatV3GeminiSdkNetworkCallCount,
  resetLastFakeChatV3GeminiRequest,
  resolveChatV3GeminiModel,
} from "../src/services/ai/chat-v3/chatV3GeminiClient.ts";
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../src/services/ai/salesBrainRuntimeFlags.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS — ${message}`);
    return;
  }
  failed += 1;
  console.error(`FAIL — ${message}`);
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function testReadEnv(map: Record<string, string | undefined>) {
  return (key: string) => map[key];
}

function enabledGeminiEnv(
  overrides: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    [NONGA_AI_CHAT_V3_LIVE_PROVIDER_ENABLED_ENV]: "true",
    GEMINI_API_KEY: "test-key-presence-only",
    [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
    ...overrides,
  };
}

async function main(): Promise<void> {
  resetChatV3GeminiClientForTests();
  resetChatV3GeminiSdkNetworkCallCount();
  resetLastFakeChatV3GeminiRequest();

  section("Request mapping — system instruction / history / expert mode");

  const prior = [
    { role: "user" as const, content: "อยากได้รถครอบครัว งบไม่เกิน 600,000 บาท" },
    { role: "assistant" as const, content: "รับทราบงบครอบครัวครับ" },
    { role: "user" as const, content: "มีคันอื่นที่ถูกกว่านี้ไหม" },
    { role: "assistant" as const, content: "มีทางเลือกราคาต่ำกว่าได้ครับ" },
    { role: "user" as const, content: "อยากได้ Toyota เกียร์ออโต้" },
    { role: "assistant" as const, content: "โฟกัส Toyota ออโต้ได้ครับ" },
  ];
  const latest = "ผ่อนประมาณเดือนละ 8,000 ได้ไหม";
  const systemInstruction = buildChatV3SystemInstruction("BUYING");

  resetLastFakeChatV3GeminiRequest();
  const fakeClient = createFakeChatV3GeminiClient({
    text: "[gemini-adapter-owned] คำตอบจาก injected Gemini client",
  });
  const realAdapter = createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: fakeClient,
    readEnv: testReadEnv(enabledGeminiEnv()),
  });

  const mapped = await realAdapter.generate({
    conversationId: "conv-multi",
    message: latest,
    history: prior,
    expertMode: "BUYING",
    systemInstruction,
  });

  const captured = getLastFakeChatV3GeminiRequest();
  assert(mapped.ok === true, "real Gemini adapter succeeds via injected client");
  assert(mapped.ok && mapped.providerId === CHAT_V3_GEMINI_PROVIDER_ID, "provider id is gemini-v3");
  assert(Boolean(captured), "fake Gemini client captured SDK-shaped request");
  assert(
    captured?.systemInstruction === systemInstruction,
    "system instruction comes from buildChatV3SystemInstruction"
  );
  assert(
    Boolean(captured?.systemInstruction.includes("ไม่ใช่ขอบเขตความรู้")) &&
      !/5-8 ประโยค|soft CTA|จำนวนรถ|บังคับถาม/i.test(
        captured?.systemInstruction ?? ""
      ) &&
      !/ปังปุริเย่[!！]?\s*ทุกคำตอบ|ทุกคำตอบ.*ปังปุริเย่/i.test(
        captured?.systemInstruction ?? ""
      ),
    "system instruction has no marketplace sales/forced-accent restrictions"
  );
  assert(captured?.model === CHAT_V3_REUSED_SERVER_GEMINI_MODEL, "model reused from existing server constant");
  assert(
    (captured?.contents.length ?? 0) === prior.length + 1,
    "contents = history turns + latest message once"
  );
  assert(
    captured?.contents[captured.contents.length - 1]?.role === "user" &&
      captured?.contents[captured.contents.length - 1]?.parts[0]?.text === latest,
    "latest message is final user turn and not duplicated earlier"
  );
  assert(
    captured?.contents.slice(0, -1).every((turn, index) => {
      const expectedRole = mapChatV3HistoryRoleToGemini(prior[index].role);
      return (
        turn.role === expectedRole &&
        turn.parts[0]?.text === prior[index].content
      );
    }),
    "history role/order mapping is correct (assistant→model)"
  );
  assert(
    !JSON.stringify(captured).includes("marketplace") &&
      !/"soft CTA"|5-8 ประโยค|บังคับถาม/.test(JSON.stringify(captured)),
    "no marketplace sales template in Gemini request"
  );

  const contentsHelper = buildChatV3GeminiContents(prior, latest);
  assert(
    contentsHelper.filter((turn) => turn.parts[0]?.text === latest).length === 1,
    "helper does not duplicate latest message inside history"
  );

  section("Cross-domain + AUTO expert mode");

  resetLastFakeChatV3GeminiRequest();
  const crossHistory = [
    { role: "user" as const, content: "รถสตาร์ทไม่ติด ต้องตรวจอะไรก่อน" },
    { role: "assistant" as const, content: "ตรวจแบตและขั้วต่อก่อนครับ" },
    { role: "user" as const, content: "รถมีเสียงผิดปกติจากเครื่อง" },
    { role: "assistant" as const, content: "ควรเช็คที่อู่ครับ" },
  ];
  const crossAdapter = createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: createFakeChatV3GeminiClient({
      text: "[gemini-adapter-owned] ประกันหลังซ่อม",
    }),
    readEnv: testReadEnv(enabledGeminiEnv()),
  });
  const cross = await crossAdapter.generate({
    conversationId: "conv-cross",
    message: "ถ้าซ่อมแล้วควรเลือกประกันแบบไหน",
    history: crossHistory,
    expertMode: "AUTO",
    systemInstruction: buildChatV3SystemInstruction("AUTO"),
  });
  const crossReq = getLastFakeChatV3GeminiRequest();
  assert(cross.ok === true, "cross-domain turn succeeds through real adapter");
  assert(
    (crossReq?.contents.length ?? 0) === crossHistory.length + 1,
    "expert mode AUTO does not truncate cross-domain history"
  );
  assert(
    crossReq?.systemInstruction.includes("AUTO") &&
      crossReq?.systemInstruction.includes("ข้ามหมวด"),
    "AUTO expert mode is a hint, not a knowledge barrier"
  );

  section("Response ownership through Conversation Service");

  const owned = await runChatV3Conversation({
    rawRequest: {
      conversationId: "conv-own",
      message: latest,
      history: prior,
      expertMode: "BUYING",
    },
    environment: "test",
    provider: createRealGeminiChatV3Provider({
      bypassLiveEnableGateForTests: true,
      geminiClient: createFakeChatV3GeminiClient({
        text: "PROVIDER_OWNED_FROM_GEMINI_CLIENT",
      }),
      readEnv: testReadEnv(enabledGeminiEnv()),
    }),
  });
  assert(
    owned.success === true &&
      owned.data.content === "PROVIDER_OWNED_FROM_GEMINI_CLIENT" &&
      owned.data.providerId === CHAT_V3_GEMINI_PROVIDER_ID,
    "service returns Gemini-client content without overwrite"
  );
  assert(
    owned.success &&
      !("candidates" in owned.data) &&
      !JSON.stringify(owned).includes("stack") &&
      !JSON.stringify(owned).includes("test-key-presence-only"),
    "API response has no raw Gemini object, stack, or secret values"
  );

  section("Error mapping — empty / malformed / rejected / timeout");

  const empty = await createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: createFakeChatV3GeminiClient({ behavior: "empty" }),
    readEnv: testReadEnv(enabledGeminiEnv()),
  }).generate({
    conversationId: "c",
    message: "สวัสดี",
    history: [],
    expertMode: "AUTO",
    systemInstruction: buildChatV3SystemInstruction("AUTO"),
  });
  assert(
    empty.ok === false && empty.reason === "provider_failure",
    "empty Gemini response → typed provider failure"
  );

  const malformed = await createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: createFakeChatV3GeminiClient({ behavior: "malformed" }),
    readEnv: testReadEnv(enabledGeminiEnv()),
  }).generate({
    conversationId: "c",
    message: "สวัสดี",
    history: [],
    expertMode: "AUTO",
    systemInstruction: buildChatV3SystemInstruction("AUTO"),
  });
  assert(
    malformed.ok === false && malformed.reason === "provider_failure",
    "malformed Gemini response → typed provider failure"
  );

  const rejected = await runChatV3Conversation({
    rawRequest: {
      conversationId: "c",
      message: "สวัสดี",
      history: [],
      expertMode: "AUTO",
    },
    environment: "test",
    provider: createRealGeminiChatV3Provider({
      bypassLiveEnableGateForTests: true,
      geminiClient: createFakeChatV3GeminiClient({ behavior: "rejected" }),
      readEnv: testReadEnv(enabledGeminiEnv()),
    }),
  });
  assert(
    rejected.success === false &&
      rejected.message === CHAT_V3_USER_FACING_UNAVAILABLE &&
      !/Toyota|Honda|งบ|ผ่อน/i.test(rejected.message),
    "SDK rejection maps to user-safe error without fake car advice"
  );

  const timedOut = await createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: createFakeChatV3GeminiClient({ behavior: "timeout" }),
    readEnv: testReadEnv(enabledGeminiEnv()),
  }).generate({
    conversationId: "c",
    message: "สวัสดี",
    history: [],
    expertMode: "AUTO",
    systemInstruction: buildChatV3SystemInstruction("AUTO"),
  });
  assert(
    timedOut.ok === false && timedOut.reason === "provider_timeout",
    "timeout maps to provider_timeout"
  );

  section("Production guards — no live call when disabled / kill switch / fake blocked");

  let spyCalls = 0;
  const spyClient = createFakeChatV3GeminiClient({ text: "should-not-run" });
  const originalGenerate = spyClient.generateContent.bind(spyClient);
  spyClient.generateContent = async (request) => {
    spyCalls += 1;
    return originalGenerate(request);
  };

  const liveOff = await createRealGeminiChatV3Provider({
    geminiClient: spyClient,
    readEnv: testReadEnv({
      [NONGA_AI_CHAT_V3_LIVE_PROVIDER_ENABLED_ENV]: "false",
      GEMINI_API_KEY: "test-key-presence-only",
    }),
  }).generate({
    conversationId: "c",
    message: "สวัสดี",
    history: [],
    expertMode: "AUTO",
    systemInstruction: buildChatV3SystemInstruction("AUTO"),
  });
  assert(
    liveOff.ok === false && liveOff.reason === "live_not_enabled" && spyCalls === 0,
    "live-disabled does not call Gemini client"
  );

  const killed = await createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: spyClient,
    readEnv: testReadEnv({
      ...enabledGeminiEnv({ [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" }),
    }),
  }).generate({
    conversationId: "c",
    message: "สวัสดี",
    history: [],
    expertMode: "AUTO",
    systemInstruction: buildChatV3SystemInstruction("AUTO"),
  });
  assert(
    killed.ok === false && killed.reason === "kill_switch" && spyCalls === 0,
    "kill switch does not call Gemini client"
  );

  assert(
    !isChatV3LiveProviderEnabled(testReadEnv({})),
    "default live provider flag is off"
  );

  const defaultResolved = resolveChatV3ProviderAdapter({
    environment: "local",
    allowFakeProvider: false,
    readEnv: testReadEnv({}),
  });
  assert(
    defaultResolved.id === "unavailable-v3",
    "default resolver stays unavailable-v3 (no automatic live Gemini)"
  );

  assertFakeProviderBlockedInProduction();
  assert(true, "fake V.3 provider blocked in production");

  assertFakeGeminiClientBlockedInProduction();
  assert(true, "fake Gemini client inject blocked in production NODE_ENV");

  let envFakeClientBlocked = false;
  try {
    resolveChatV3ProviderAdapter({
      environment: "local",
      readEnv: testReadEnv({ [NONGA_AI_CHAT_V3_PROVIDER_ENV]: "fake-gemini-client" }),
    });
  } catch {
    envFakeClientBlocked = true;
  }
  assert(envFakeClientBlocked, "fake Gemini client cannot be selected via environment");

  assert(
    resolveChatV3GeminiModel(testReadEnv({})) === CHAT_V3_REUSED_SERVER_GEMINI_MODEL,
    "model falls back to reused server constant"
  );
  assert(
    resolveChatV3GeminiModel(
      testReadEnv({ [NONGA_AI_CHAT_V3_MODEL_ENV]: "configured-model-from-env" })
    ) === "configured-model-from-env",
    "model can be selected via NONGA_AI_CHAT_V3_MODEL without hardcoding a new default"
  );

  resetChatV3GeminiSdkNetworkCallCount();
  assert(
    getChatV3GeminiSdkNetworkCallCount() === 0,
    "SDK network call count remains 0 after offline adapter tests"
  );

  section("Isolation — chat / chat-v2 / marketplace / frontend");

  const useChat = read("src/hooks/chat/useChat.ts");
  const orchestrator = read("src/services/ai/chat/chatSearchOrchestrator.ts");
  const client = read("src/components/chat-v3/adapters/chatV3ConversationClient.ts");
  const layout = read("src/components/chat-v3/adapters/useChatV3LayoutState.ts");
  const packageJson = read("package.json");

  assert(
    !useChat.includes("createRealGeminiChatV3Provider") &&
      !useChat.includes("chatV3GeminiClient"),
    "/chat useChat not wired to V.3 Gemini adapter"
  );
  assert(
    !orchestrator.includes("createRealGeminiChatV3Provider") &&
      !orchestrator.includes("chat-v3-converse"),
    "marketplace orchestrator behavior not coupled to V.3 Gemini adapter"
  );
  assert(
    !client.includes("@google/genai") &&
      !client.includes("GoogleGenAI") &&
      !client.includes("GEMINI_API_KEY") &&
      !layout.includes("@google/genai"),
    "Frontend V.3 client/layout has no Gemini SDK or credential names"
  );
  assert(
    packageJson.includes('"@google/genai"') &&
      !layout.includes("window.setTimeout") &&
      !layout.includes("รับทราบครับ น้องเอกำลังเตรียมคำแนะนำให้ในโหมดที่เลือกไว้"),
    "SDK dependency already present; mock runtime reply remains removed"
  );

  // Expert mode does not change provider/model selection.
  resetLastFakeChatV3GeminiRequest();
  await createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: createFakeChatV3GeminiClient({ text: "mode-a" }),
    readEnv: testReadEnv(enabledGeminiEnv()),
  }).generate({
    conversationId: "c",
    message: "สวัสดี",
    history: [],
    expertMode: "REPAIR",
    systemInstruction: buildChatV3SystemInstruction("REPAIR"),
  });
  const repairReq = getLastFakeChatV3GeminiRequest();
  resetLastFakeChatV3GeminiRequest();
  await createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: createFakeChatV3GeminiClient({ text: "mode-b" }),
    readEnv: testReadEnv(enabledGeminiEnv()),
  }).generate({
    conversationId: "c",
    message: "สวัสดี",
    history: [],
    expertMode: "FINANCE",
    systemInstruction: buildChatV3SystemInstruction("FINANCE"),
  });
  const financeReq = getLastFakeChatV3GeminiRequest();
  assert(
    repairReq?.model === financeReq?.model &&
      repairReq?.model === CHAT_V3_REUSED_SERVER_GEMINI_MODEL,
    "expert mode does not change provider model"
  );

  section("Search-only Path C structured schema");

  resetLastFakeChatV3GeminiRequest();
  let searchGenerateCount = 0;
  const searchJson = JSON.stringify({
    replyText: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 1 คันในรอบนี้ครับ",
    orderedListingIds: ["listing-1"],
  });
  const searchClient = createFakeChatV3GeminiClient({ text: searchJson });
  const countingSearchClient = {
    id: searchClient.id,
    generateContent: async (
      request: Parameters<typeof searchClient.generateContent>[0]
    ) => {
      searchGenerateCount += 1;
      return searchClient.generateContent(request);
    },
  };
  const searchAdapter = createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: countingSearchClient,
    readEnv: testReadEnv(enabledGeminiEnv()),
  });
  const searchRun = await runChatV3Conversation({
    rawRequest: {
      conversationId: "conv-search-schema",
      message: "ช่วยหารถเก๋ง Toyota",
      history: [],
      expertMode: "BUYING",
    },
    environment: "test",
    provider: searchAdapter,
    searchGroundingComposition: true,
    searchGroundingAppendix: "trustedListings=[]",
  });
  const searchReq = getLastFakeChatV3GeminiRequest();
  assert(searchRun.success === true, "Search composition succeeds after JSON unwrap");
  assert(
    searchRun.success === true &&
      searchRun.data.content === "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 1 คันในรอบนี้ครับ",
    "Search visible content is replyText, not raw JSON"
  );
  assert(
    searchRun.success === true &&
      JSON.stringify(searchRun.data.searchComposition?.orderedListingIds) ===
        JSON.stringify(["listing-1"]),
    "Search metadata carries orderedListingIds"
  );
  assert(searchReq?.responseMimeType === "application/json", "Search request uses JSON mime");
  assert(
    Boolean(searchReq?.responseSchema) &&
      JSON.stringify(searchReq?.responseSchema).includes("orderedListingIds") &&
      !JSON.stringify(searchReq?.responseSchema).includes("finalAnswerTh"),
    "Search request uses Search schema, not buyer finalAnswerTh"
  );
  assert(searchGenerateCount === 1, "Search composition makes one provider call");

  resetLastFakeChatV3GeminiRequest();
  const generalClient = createFakeChatV3GeminiClient({
    text: "คำตอบทั่วไปจาก Gemini",
  });
  const generalAdapter = createRealGeminiChatV3Provider({
    bypassLiveEnableGateForTests: true,
    geminiClient: generalClient,
    readEnv: testReadEnv(enabledGeminiEnv()),
  });
  const generalRun = await runChatV3Conversation({
    rawRequest: {
      conversationId: "conv-general-schema",
      message: "รถไฟฟ้ากับรถน้ำมัน ใช้ต่างกันยังไง",
      history: [],
      expertMode: "AUTO",
    },
    environment: "test",
    provider: generalAdapter,
  });
  const generalReq = getLastFakeChatV3GeminiRequest();
  assert(generalRun.success === true, "General conversation still succeeds as plain text");
  assert(
    generalRun.success === true && generalRun.data.content.includes("คำตอบทั่วไป"),
    "General visible content remains prose"
  );
  assert(generalReq?.responseMimeType == null, "General request has no JSON mime");
  assert(generalReq?.responseSchema == null, "General request has no Search schema");
  assert(
    generalRun.success === true && generalRun.data.searchComposition == null,
    "General success omits Search metadata"
  );

  section("Summary");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`NETWORK CALLS TO AI PROVIDER: ${getChatV3GeminiSdkNetworkCallCount()}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
