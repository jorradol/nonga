/**
 * v6.0O — Staging Gemini Shadow Enablement Dry-run (static validation only)
 * npm run test:v60o-staging-gemini-shadow-enablement-dry-run
 *
 * Validates shadow dry-run doc — does NOT call AI API, fetch network, gcloud, or Firebase.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0O-staging-gemini-shadow-enablement-dry-run.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const APPROVAL_PHRASE =
  "อนุมัติให้เปิด Gemini shadow mode บน staging closed pilot เท่านั้น ตาม v6.0O โดยยังไม่แสดงคำตอบ AI ให้ผู้ใช้";

const V60N_HEAD = "58aafb44b49ee7536b93d130b914c470a50963b3";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0O Staging Gemini Shadow Enablement Dry-run ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60o-staging-gemini-shadow-enablement-dry-run.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const useChatSrc = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orchestratorSrc = readFileSync(
  "src/services/ai/chat/chatSearchOrchestrator.ts",
  "utf8"
);
const realProviderSrc = readFileSync("src/services/ai/salesBrainRealProvider.ts", "utf8");

// --- doc exists + v6.0O ---
{
  ok("dry-run doc exists", doc.length > 4500);
  ok("doc v6.0O label", doc.includes("v6.0O"));
  ok("doc shadow enablement title", /shadow.*dry-run|Gemini shadow/i.test(doc));
  ok("doc no user-visible change", /ไม่เปลี่ยน user-visible|user-visible runtime behavior/i.test(docLower));
}

// --- current status ---
{
  ok("v60n pushed", doc.includes("v6.0N") && /pushed|58aafb4/i.test(doc));
  ok("v60n commit hash", doc.includes(V60N_HEAD) || doc.includes("58aafb4"));
  ok("network disabled", /network disabled|SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED/i.test(doc));
  ok("real Gemini call not yet", /real Gemini call.*ไม่|Gemini call ยังไม่/i.test(docLower));
  ok("useChat no sales brain display", /useChat\.ts.*ไม่|ไม่ import.*salesBrain/i.test(docLower));
  ok("orchestrator no sales brain", /chatSearchOrchestrator.*ไม่|ไม่ import Sales Brain/i.test(docLower));
  ok("production default off", /production default.*off|production.*off/i.test(docLower));
}

// --- shadow vs user-visible ---
{
  ok("shadow mode described", /shadow mode|NONGA_AI_SHADOW_MODE_ENABLED/i.test(doc));
  ok("user-visible legacy only", /user-visible.*legacy|legacy flow.*userVisible/i.test(docLower));
  ok("target NONGA_AI_USER_VISIBLE_ENABLED false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("gemini only provider", /NONGA_AI_PROVIDER.*gemini|Gemini only/i.test(doc));
}

// --- future staging shadow target env ---
{
  ok("target NONGA_AI_MODE high", /NONGA_AI_MODE.*high/i.test(doc));
  ok("target NONGA_AI_FIRST_ENABLED true", /NONGA_AI_FIRST_ENABLED.*true/i.test(doc));
  ok("target NONGA_AI_SHADOW_MODE_ENABLED true", /NONGA_AI_SHADOW_MODE_ENABLED.*true/i.test(doc));
  ok("target kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("budget daily before enable", /NONGA_AI_BUDGET_DAILY_LIMIT.*ต้องกำหนด|must define before enable/i.test(docLower));
  ok("budget monthly before enable", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*ต้องกำหนด/i.test(docLower));
  ok("secret mapping gemini-api-key", /GEMINI_API_KEY.*gemini-api-key|gemini-api-key:latest/i.test(doc));
}

// --- approval phrase ---
{
  ok("approval phrase exact", doc.includes(APPROVAL_PHRASE));
  ok("approval shadow staging only", /shadow.*staging closed pilot/i.test(docLower));
  ok("v60m phrase not substitute", /v6\.0M phrase.*ไม่แทน|does not substitute/i.test(docLower));
}

// --- dry-run checklist ---
{
  ok("checklist git clean HEAD origin", /git clean.*HEAD.*origin|HEAD = origin/i.test(docLower));
  ok("checklist project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("checklist service nonga-staging", doc.includes("nonga-staging"));
  ok("checklist region asia-southeast1", doc.includes("asia-southeast1"));
  ok("checklist describe env redacted", /describe.*env.*redacted|redacted/i.test(docLower));
  ok("checklist gemini-api-key metadata", /gemini-api-key.*exists|describe gemini-api-key/i.test(docLower));
  ok("checklist budget ready", /budget.*ก่อน enable|budget.*before enable/i.test(docLower));
  ok("checklist kill switch", /kill switch.*ready|NONGA_AI_EMERGENCY_KILL_SWITCH/i.test(doc));
  ok("checklist no-go zones", /no-go zones/i.test(docLower));
  ok("checklist legacy fallback", /fallback.*legacy|chatSearchOrchestrator/i.test(docLower));
  ok("checklist user-visible legacy only", /user-visible.*legacy|legacy only/i.test(docLower));
}

// --- DO NOT RUN YET ---
{
  ok("DO NOT RUN YET label", /DO NOT RUN YET/i.test(doc));
  ok("future gcloud run services update staging", /gcloud run services update nonga-staging/.test(doc));
  ok("future env shadow enabled", doc.includes("NONGA_AI_SHADOW_MODE_ENABLED"));
  ok("future env user visible false", doc.includes("NONGA_AI_USER_VISIBLE_ENABLED"));
  ok("forbid secrets versions access", /gcloud secrets versions access|ห้าม.*secrets versions access/i.test(docLower));
}

// --- rollback kill switch ---
{
  ok("rollback kill switch true", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/i.test(doc));
  ok("rollback shadow false", /NONGA_AI_SHADOW_MODE_ENABLED=false/i.test(doc));
  ok("rollback AI first false", /NONGA_AI_FIRST_ENABLED=false/i.test(doc));
  ok("rollback mode off", /NONGA_AI_MODE=off/i.test(doc));
  ok("rollback legacy fallback", /legacy deterministic|chatSearchOrchestrator/i.test(docLower));
}

// --- guards budget no-go fallback ---
{
  ok("doc budget guard", /budget guard|NONGA_AI_BUDGET/i.test(docLower));
  ok("no-go revenue write", /revenue write/i.test(docLower));
  ok("no-go settlement write", /settlement write/i.test(docLower));
  ok("no-go payment invoice", /payment.*invoice/i.test(docLower));
}

// --- smoke before real stock ---
{
  ok("smoke health 200", /health.*200|GET \/api\/health.*200/i.test(docLower));
  ok("smoke legacy chat unchanged", /legacy chat response.*unchanged|legacy.*ไม่เปลี่ยน/i.test(docLower));
  ok("smoke shadow no raw PII", /shadow.*no raw PII|no raw PII/i.test(docLower));
  ok("smoke no-go zones", /no-go zones not touched|no-go zones/i.test(docLower));
  ok("smoke gemini cost monitor", /Gemini call count|cost monitored/i.test(docLower));
  ok("smoke budget guard works", /budget guard works/i.test(docLower));
  ok("smoke kill switch test", /kill switch test/i.test(docLower));
  ok("gate before real stock import", /นำเข้าสต๊อกจริง|real stock import/i.test(doc));
  ok("not allow stock until smoke", /ยังไม่อนุญาต.*สต๊อก|not until smoke/i.test(docLower));
}

// --- references ---
{
  ok("references v60g shadow", doc.includes("v6.0G"));
  ok("references v60m v60n", doc.includes("v6.0M") && doc.includes("v6.0N"));
}

// --- forbidden section ---
{
  ok("forbidden no deploy", /ไม่ deploy|Deploy Cloud Run/i.test(doc));
  ok("forbidden no paid ai", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("forbidden no production", /แตะ production|touch production/i.test(docLower));
  ok("forbidden no lead reveal", /buyer lead.*seller reveal|outcome flow/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
}

// --- no secret values in doc ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret pattern ${pat.source.slice(0, 20)}`, !pat.test(doc));
  }
}

// --- runtime still not wired (code check) ---
{
  ok("useChat no salesBrainAdapter import", !/salesBrainAdapter/i.test(useChatSrc));
  ok("useChat no salesBrainRealProvider import", !/salesBrainRealProvider/i.test(useChatSrc));
  ok("orchestrator no salesBrainAdapter", !/salesBrainAdapter/i.test(orchestratorSrc));
  ok("realProvider network disabled", /SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED\s*=\s*false/.test(realProviderSrc));
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
  ok("package v60o script", pkg.includes("test:v60o-staging-gemini-shadow-enablement-dry-run"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60o-staging-gemini-shadow-enablement-dry-run.mts")
  );
}

console.log("\nDone v6.0O Staging Gemini Shadow Enablement Dry-run tests.");
if (process.exitCode) process.exit(process.exitCode);
