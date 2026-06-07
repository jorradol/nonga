/**
 * v6.0L — Real AI Provider Read-only Preflight Execution (static validation only)
 * npm run test:v60l-real-ai-provider-read-only-preflight-execution
 *
 * Validates execution record doc — does NOT call AI API, fetch network, gcloud, or Firebase.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0L-real-ai-provider-read-only-preflight-execution.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const APPROVAL_PHRASE =
  "อนุมัติให้เปิด real paid AI provider บน staging closed pilot เท่านั้น ตาม v6.0K";

const HEAD_SHA = "453202a33cdedc94b7090d19b92bf695db9255f6";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0L Real AI Provider Read-only Preflight Execution ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60l-real-ai-provider-read-only-preflight-execution.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const realProviderSrc = readFileSync("src/services/ai/salesBrainRealProvider.ts", "utf8");
const useChatSrc = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orchestratorSrc = readFileSync(
  "src/services/ai/chat/chatSearchOrchestrator.ts",
  "utf8"
);

// --- doc exists + v6.0L ---
{
  ok("execution doc exists", doc.length > 4000);
  ok("doc v6.0L label", doc.includes("v6.0L"));
  ok("doc preflight execution title", /preflight execution|read-only preflight/i.test(doc));
  ok("doc no runtime change", /ยังไม่เปลี่ยน runtime|user-visible runtime behavior/i.test(docLower));
}

// --- git baseline recorded ---
{
  ok("git clean recorded", /git status.*clean|working tree clean/i.test(docLower));
  ok("branch feature/chat-image-attachment-v1", doc.includes("feature/chat-image-attachment-v1"));
  ok("HEAD sha recorded", doc.includes(HEAD_SHA));
  ok("HEAD equals origin", /HEAD = origin|HEAD.*origin.*453202a/i.test(doc));
}

// --- cloud run staging scope ---
{
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("service nonga-staging", doc.includes("nonga-staging"));
  ok("region asia-southeast1", doc.includes("asia-southeast1"));
  ok("revision nonga-staging-00047-7xc", doc.includes("nonga-staging-00047-7xc"));
  ok("public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("NONGA_DATA_BACKEND firestore", /NONGA_DATA_BACKEND.*firestore/i.test(doc));
  ok("NONGA_IMAGE_BACKEND firebase-storage", /NONGA_IMAGE_BACKEND.*firebase-storage/i.test(doc));
}

// --- AI flags absent ---
{
  ok("NONGA_AI_PROVIDER absent", /NONGA_AI_PROVIDER.*absent/i.test(doc));
  ok("NONGA_AI_MODE absent", /NONGA_AI_MODE.*absent/i.test(doc));
  ok("NONGA_AI_FIRST_ENABLED absent", /NONGA_AI_FIRST_ENABLED.*absent/i.test(doc));
  ok("NONGA_AI_EMERGENCY_KILL_SWITCH absent", /NONGA_AI_EMERGENCY_KILL_SWITCH.*absent/i.test(doc));
  ok("NONGA_AI_BUDGET_DAILY_LIMIT absent", /NONGA_AI_BUDGET_DAILY_LIMIT.*absent/i.test(doc));
  ok("NONGA_AI_BUDGET_MONTHLY_LIMIT absent", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*absent/i.test(doc));
  ok("NONGA_AI_CONTROL_MODE absent economy default", /NONGA_AI_CONTROL_MODE.*absent|runtime default.*economy/i.test(docLower));
  ok("AI First not enabled summary", /AI First ยังไม่เปิดจริง|AI First.*not enabled/i.test(doc));
}

// --- secret metadata no values ---
{
  ok("GEMINI_API_KEY refs gemini-api-key", /GEMINI_API_KEY.*gemini-api-key|gemini-api-key.*GEMINI_API_KEY/i.test(doc));
  ok("gemini-api-key exists", /gemini-api-key.*exists|exists.*gemini-api-key/i.test(docLower));
  ok("gemini-api-key created 2026-05-26", doc.includes("2026-05-26"));
  ok("gemini replication automatic", /replication.*automatic|automatic.*replication/i.test(docLower));
  ok("openai-api-key NOT_FOUND", /openai-api-key.*NOT_FOUND|NOT_FOUND.*openai-api-key/i.test(doc));
  ok("SM GEMINI_API_KEY NOT_FOUND", /GEMINI_API_KEY.*NOT_FOUND|NOT_FOUND.*GEMINI_API_KEY/i.test(doc));
  ok("SM OPENAI_API_KEY NOT_FOUND", /OPENAI_API_KEY.*NOT_FOUND|NOT_FOUND.*OPENAI_API_KEY/i.test(doc));
  ok("doc gap logical mapping", /doc gap|logical.*GEMINI_API_KEY.*gemini-api-key/i.test(docLower));
  ok("no secrets versions access executed", /did not run.*secrets versions access|not executed.*secrets versions access|was not executed/i.test(docLower));
  ok("forbid secrets versions access section", /gcloud secrets versions access/i.test(doc));
}

// --- API smoke ---
{
  ok("health 200", /\/api\/health.*200|200.*\/api\/health/i.test(doc));
  ok("admin revenue preview 401", /admin\/revenue\/preview.*401|401.*admin\/revenue\/preview/i.test(doc));
  ok("my revenue preview 401", /my\/revenue\/preview.*401|401.*my\/revenue\/preview/i.test(doc));
  ok("revenue guardrails intact", /revenue.*guardrail|guardrail.*intact/i.test(docLower));
}

// --- AI runtime status ---
{
  ok("doc SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED false", /SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED.*false/i.test(doc));
  ok("doc invokeRealProviderCall throws", /invokeRealProviderCall.*SalesBrainRealProviderNetworkDisabledError/i.test(doc));
  ok("doc not wired useChat", /useChat\.ts.*no|no.*useChat\.ts|not wired.*useChat/i.test(docLower));
  ok("doc not wired chatSearchOrchestrator", /chatSearchOrchestrator.*no|no.*chatSearchOrchestrator|not wired.*orchestrator/i.test(docLower));
  ok("doc no user-visible AI First", /user-visible AI First.*none|no user-visible AI First/i.test(docLower));
  ok("doc shadow not user-visible", /shadow.*not wired|not wired.*shadow/i.test(docLower));
  ok("code network enabled false", /SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED\s*=\s*false/.test(realProviderSrc));
  ok("code invoke throws network disabled", /invokeRealProviderCall[\s\S]*SalesBrainRealProviderNetworkDisabledError/.test(realProviderSrc));
  ok("useChat no salesBrain import", !/salesBrain/i.test(useChatSrc));
  ok("orchestrator no salesBrain import", !/salesBrain/i.test(orchestratorSrc));
}

// --- readiness gaps ---
{
  ok("gap approval phrase v60k", doc.includes(APPROVAL_PHRASE));
  ok("gap openai secret missing", /openai.*missing|OPENAI.*NOT_FOUND/i.test(doc));
  ok("gap budget env absent", /budget.*absent|NONGA_AI_BUDGET.*absent/i.test(docLower));
  ok("gap kill switch absent", /kill switch.*absent|NONGA_AI_EMERGENCY_KILL_SWITCH.*absent/i.test(docLower));
  ok("gap AI flags expected absent", /AI flags absent.*expected|expected now/i.test(docLower));
  ok("gap secret name mapping", /GEMINI_API_KEY.*gemini-api-key|secret name mapping/i.test(docLower));
  ok("gap sales brain not wired", /Sales Brain not wired|sales brain not wired/i.test(docLower));
}

// --- forbidden actions section ---
{
  ok("forbidden no deploy", /ไม่ deploy|ห้าม deploy|Deploy Cloud Run/i.test(doc));
  ok("forbidden no services update", /gcloud run services update/i.test(doc));
  ok("forbidden no env secrets", /ไม่เปิด.*env|ไม่แก้ env|modify env/i.test(docLower));
  ok("forbidden no secret value access", /secrets versions access|access secret values/i.test(docLower));
  ok("forbidden no paid ai", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("forbidden no production", /แตะ production|touch production/i.test(docLower));
  ok("forbidden no payment settlement write", /payment.*invoice.*settlement|settlement write/i.test(docLower));
  ok("forbidden no lead reveal outcome", /buyer lead.*seller reveal|outcome flow/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
}

// --- references ---
{
  ok("references v60h stage L", doc.includes("v6.0H") && /stage L|Stage L/i.test(doc));
  ok("references v60i v60j v60k", doc.includes("v6.0I") && doc.includes("v6.0J") && doc.includes("v6.0K"));
}

// --- no secret values in doc ---
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
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
  ok("script uses readFileSync only", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v60l script", pkg.includes("test:v60l-real-ai-provider-read-only-preflight-execution"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60l-real-ai-provider-read-only-preflight-execution.mts")
  );
}

console.log("\nDone v6.0L Real AI Provider Read-only Preflight Execution tests.");
if (process.exitCode) process.exit(process.exitCode);
