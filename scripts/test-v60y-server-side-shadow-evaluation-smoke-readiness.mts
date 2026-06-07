/**
 * v6.0Y — Server-side Shadow Evaluation Smoke Readiness (static validation only)
 * npm run test:v60y-server-side-shadow-evaluation-smoke-readiness
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0Y-server-side-shadow-evaluation-smoke-readiness.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "3239b67a1c4f0ae54fd77ff2dd0af9ecda0086e6";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const CLOUD_RUN_REV = "nonga-staging-00050-rqs";
const JS_BUNDLE = "index-NVEc0A-_.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0Y Server-side Shadow Evaluation Smoke Readiness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60y-server-side-shadow-evaluation-smoke-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const runtimeSrc = readFileSync("src/services/ai/salesBrainShadowRuntime.ts", "utf8");
const flagsSrc = readFileSync("src/services/ai/salesBrainRuntimeFlags.ts", "utf8");
const realProviderSrc = readFileSync("src/services/ai/salesBrainRealProvider.ts", "utf8");
const chatPathSrc = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");

// --- doc exists + v6.0Y ---
{
  ok("readiness doc exists", doc.length > 5000);
  ok("doc v6.0Y label", doc.includes("v6.0Y"));
  ok("doc server-side shadow readiness", /server-side shadow|Server-side Shadow/i.test(doc));
  ok("doc user-visible still legacy", /user-visible.*legacy|legacy 100%/i.test(docLower));
  ok("doc smoke not executed yet", /not yet|DO NOT RUN YET/i.test(doc));
}

// --- current status ---
{
  ok("status HEAD v60x", doc.includes(HEAD_SHA) || doc.includes("3239b67"));
  ok("status cloud run 00050-rqs", doc.includes(CLOUD_RUN_REV));
  ok("status hosting bundle ready", doc.includes(JS_BUNDLE));
  ok("status client chat path ready", /wireShadowChatPath|chat path wiring/i.test(doc));
  ok("status shadow env on", /shadow.*env.*on|Gemini shadow env/i.test(docLower));
  ok("status user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("status no live gemini", /live Gemini|paid provider call.*none|no live gemini/i.test(docLower));
  ok("status full server smoke not yet", /full server-side shadow smoke.*not yet|server-side shadow smoke executed.*not yet/i.test(docLower));
}

// --- smoke targets ---
{
  ok("target read NONGA_AI flags", /read.*NONGA_AI_\*|resolveSalesBrainRuntimeFlags/i.test(doc));
  ok("target shadow allowed gate", /shadowEvaluationAllowed|provider=gemini.*mode=high/i.test(doc));
  ok("target user visible legacy always", /userVisibleResponse.*legacy|legacy.*never replaced/i.test(docLower));
  ok("target no raw PII in logs", /no raw phone|no raw PII|redact/i.test(docLower));
  ok("target paid provider network disabled", /SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED=false|paid provider network/i.test(doc));
  ok("target fallback no user impact", /fallback.*not.*change user-visible|must not.*change user-visible/i.test(docLower));
  ok("target kill switch", /kill switch|EMERGENCY_KILL_SWITCH/i.test(doc));
  ok("target budget missing", /budget.*missing|budget_caps_missing/i.test(docLower));
  ok("target user visible blocked", /user_visible_blocked_v60r|user-visible attempted/i.test(docLower));
  ok("target production off", /production.*default off|production_default_off/i.test(docLower));
  ok("no secrets versions access", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- safe smoke cases SS-01..SS-08 ---
{
  ok("case SS-01 buyer generic search", /SS-01|buyer generic search/i.test(doc));
  ok("case SS-02 mock listing", /SS-02|mock-listing-001|mock listing/i.test(doc));
  ok("case SS-03 seller start over", /SS-03|"เริ่มใหม่"/.test(doc));
  ok("case SS-03 legacy exact text", doc.includes(LEGACY_START_OVER));
  ok("case SS-04 dealer inventory", /SS-04|dealer generic inventory/i.test(doc));
  ok("case SS-05 kill switch", /SS-05|kill switch true/i.test(docLower));
  ok("case SS-06 budget missing", /SS-06|budget missing/i.test(docLower));
  ok("case SS-07 user visible blocked", /SS-07|user-visible true attempted/i.test(docLower));
  ok("case SS-08 production off", /SS-08|production default off/i.test(docLower));
}

// --- forbidden during smoke ---
{
  ok("forbid real customer data", /real customer|ข้อมูลลูกค้าจริง/i.test(doc));
  ok("forbid real phone", /real phone|เบอร์โทรจริง/i.test(doc));
  ok("forbid real stock tent", /real stock|สต๊อกจริง/i.test(doc));
  ok("forbid AI invent car data", /AI invent|แต่งข้อมูลรถ/i.test(doc));
  ok("forbid revenue settlement payment", /revenue.*settlement.*payment|payment.*invoice/i.test(docLower));
  ok("forbid contact reveal", /contact reveal|seller reveal/i.test(docLower));
  ok("forbid paid gemini call", /paid Gemini|Paid Gemini API/i.test(doc));
}

// --- future execution plan DO NOT RUN YET ---
{
  ok("future DO NOT RUN YET", /Future Execution Plan.*DO NOT RUN YET|DO NOT RUN YET/i.test(doc));
  ok("future evaluateSalesBrainShadowRuntime harness", /evaluateSalesBrainShadowRuntime/i.test(doc));
  ok("future optional admin debug endpoint", /admin.*superadmin|admin-only/i.test(docLower));
  ok("future no public debug endpoint", /no public endpoint|No public endpoint|never.*public/i.test(docLower));
  ok("future no log raw PII", /no raw PII|redacted only/i.test(docLower));
  ok("future no show shadow to user", /never.*replace chat UI|must not.*alter rows returned to user/i.test(docLower));
  ok("future no deploy in v60y", /no deploy in v6\.0Y|Deploy Cloud Run.*not done/i.test(docLower));
}

// --- staging baseline ---
{
  ok("baseline project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("baseline user visible false", /\| \*\*`NONGA_AI_USER_VISIBLE_ENABLED`\*\* \| \*\*`false`\*\*/.test(doc));
  ok(
    "baseline budget 5 50",
    /\| `NONGA_AI_BUDGET_DAILY_LIMIT` \| `5`/.test(doc) &&
      /\| `NONGA_AI_BUDGET_MONTHLY_LIMIT` \| `50`/.test(doc)
  );
  ok("baseline public signup false", /public signup.*false|Public signup.*false/i.test(doc));
  ok("baseline gemini secret ref metadata", /gemini-api-key:latest.*metadata/i.test(docLower));
}

// --- forbidden this slice ---
{
  ok("slice no cloud run deploy", /Deploy Cloud Run.*not done|Cloud Run deploy.*not done/i.test(docLower));
  ok("slice no hosting deploy", /Hosting.*not done|Deploy.*Hosting.*not done/i.test(docLower));
  ok("slice no firestore rules", /Firestore rules.*not done/i.test(doc));
  ok("slice no gcloud env update", /gcloud run services update.*not done/i.test(docLower));
  ok("slice no user visible true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not/i.test(doc));
  ok("slice no real stock import", /real stock import.*not done|still blocked/i.test(docLower));
}

// --- references ---
{
  ok("references v60x", doc.includes("v6.0X"));
  ok("references v60w v60v v60u v60r", doc.includes("v6.0W") && doc.includes("v6.0V") && doc.includes("v6.0U") && doc.includes("v6.0R"));
}

// --- code: server shadow runtime exists, client flags-only ---
{
  ok("runtime evaluateSalesBrainShadowRuntime", runtimeSrc.includes("evaluateSalesBrainShadowRuntime"));
  ok("runtime legacy never replaced", /userVisibleResponse: legacyUserVisibleResponse/.test(runtimeSrc));
  ok("runtime summarizeShadowRuntimeFlags", runtimeSrc.includes("summarizeShadowRuntimeFlags"));
  ok("runtime redact PII", runtimeSrc.includes("redactPiiForSalesBrainLog"));
  ok("flags resolveSalesBrainRuntimeFlags", flagsSrc.includes("resolveSalesBrainRuntimeFlags"));
  ok("flags SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED", flagsSrc.includes("SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED"));
  ok("real provider network disabled", /SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED = false/.test(realProviderSrc));
  ok("chat path flags only client", chatPathSrc.includes("flagsOnly"));
  ok("chat path legacy only constant", chatPathSrc.includes("SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY"));
  ok("useChat wireShadowChatPath not full runtime", useChat.includes("wireShadowChatPath") && !useChat.includes("evaluateSalesBrainShadowRuntime"));
  ok("orchestrator wireShadowChatPath not full runtime", orch.includes("wireShadowChatPath") && !orch.includes("evaluateSalesBrainShadowRuntime"));
}

// --- no secret values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret pattern ${pat.source.slice(0, 20)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v60y script", pkg.includes("test:v60y-server-side-shadow-evaluation-smoke-readiness"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60y-server-side-shadow-evaluation-smoke-readiness.mts")
  );
}

console.log("\nDone v6.0Y Server-side Shadow Evaluation Smoke Readiness tests.");
if (process.exitCode) process.exit(process.exitCode);
