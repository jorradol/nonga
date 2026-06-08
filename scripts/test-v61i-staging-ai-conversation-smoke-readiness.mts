/**
 * v6.1I — Staging AI Conversation Smoke Readiness (static validation only)
 * npm run test:v61i-staging-ai-conversation-smoke-readiness
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.1I-staging-ai-conversation-smoke-readiness.md";
const H4_DOC_PATH = "docs/v6.1H.4-admin-shadow-gemini-model-fix-staging-deploy-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const BASELINE_SHA = "f878972";
const WEBAPP_BASE = "https://nonga-ce93c.web.app";
const ADMIN_ROUTE = "/api/admin/sales-brain-shadow-smoke";
const ADMIN_UI_PATH = "/admin/shadow-smoke";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const APPROVAL_PHRASE_V61J =
  "อนุมัติให้ทดสอบ admin shadow conversation smoke บน staging โดยไม่แสดงผลให้ผู้ใช้ทั่วไป ตาม v6.1J";
const APPROVAL_PHRASE_V61L =
  "อนุมัติให้เปิด user-visible AI แบบ controlled pilot บน staging เท่านั้น ตาม v6.1L";
const SS_CASE_IDS = [
  "SS-01",
  "SS-02",
  "SS-03",
  "SS-04",
  "SS-05",
  "SS-06",
  "SS-07",
  "SS-08",
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1I Staging AI Conversation Smoke Readiness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const h4Doc = readFileSync(H4_DOC_PATH, "utf8");
const selfSrc = readFileSync(
  "scripts/test-v61i-staging-ai-conversation-smoke-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const shadowSmoke = readFileSync("src/services/ai/salesBrainServerShadowSmoke.ts", "utf8");
const realProvider = readFileSync("src/services/ai/salesBrainAdminShadowRealProvider.ts", "utf8");
const shadowChatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");

// --- doc exists + v6.1I ---
{
  ok("readiness doc exists", doc.length > 5000);
  ok("doc v6.1I label", doc.includes("v6.1I"));
  ok("doc conversation smoke readiness", /conversation smoke readiness/i.test(doc));
  ok("doc docs tests only", /docs\/tests only|readiness only/i.test(docLower));
  ok("doc baseline f878972", doc.includes(BASELINE_SHA) || doc.includes("v6.1H.4"));
  ok("doc references v6.1H.4", doc.includes("v6.1H.4"));
  ok("h4 companion doc exists", h4Doc.length > 5000);
}

// --- shadow vs conversation distinction ---
{
  ok("shadow smoke section", /shadow smoke/i.test(doc));
  ok("conversation smoke section", /conversation smoke/i.test(doc));
  ok("internal staging clarified", /internal.*staging|staging only/i.test(docLower));
  ok("not public user visible", /ไม่แสดงต่อ public|public user/i.test(doc));
  ok("public chat legacy", /public.*chat.*legacy|legacy.*public/i.test(docLower));
}

// --- v6.1H.4 achievements ---
{
  ok("h4 SS-01 pass recorded", /real_provider_call_ok|SS-01.*PASS/i.test(h4Doc));
  ok("h4 gemini-3.5-flash", h4Doc.includes("gemini-3.5-flash"));
  ok("doc h4 achieved milestone", /v6\.1H\.4|real Gemini admin SS-01/i.test(doc));
}

// --- roadmap ---
{
  ok("roadmap v6.1J proposed", doc.includes("v6.1J"));
  ok("roadmap v6.1K proposed", doc.includes("v6.1K"));
  ok("roadmap v6.1L user-visible gate", doc.includes("v6.1L"));
  ok("user-visible OFF in roadmap", /user-visible OFF|user-visible off/i.test(doc));
}

// --- v6.1J scope preview ---
{
  ok("v6.1J SS-01..SS-08 matrix", /SS-01\.\.SS-08|SS-01..SS-08/i.test(doc));
  for (const id of SS_CASE_IDS) {
    ok(`v6.1J case ${id} mentioned`, doc.includes(id));
  }
  ok("v6.1J multi-turn harness", /multi-turn/i.test(docLower));
  ok("v6.1J no custom prompt", /custom prompt.*blocked|no custom prompt/i.test(docLower));
}

// --- decision gate ---
{
  ok("decision gate section", /decision gate/i.test(doc));
  ok("gate G-01 v6.1F", doc.includes("v6.1F"));
  ok("gate G-03 v6.1H.4", doc.includes("v6.1H.4"));
  ok("gate G-04 v6.1J pending", /v6\.1J.*pending|pending.*v6\.1J/i.test(doc));
  ok("gate user-visible separate approval", /separate approval|approval phrase/i.test(docLower));
  ok("gate blocks user visible true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*ห้าม|ห้ามเปิด.*NONGA_AI_USER_VISIBLE/i.test(doc));
}

// --- approval phrases ---
{
  ok("v6.1J approval phrase exact", doc.includes(APPROVAL_PHRASE_V61J));
  ok("v6.1L approval phrase exact", doc.includes(APPROVAL_PHRASE_V61L));
  ok("v6.1I does not run phrases", /v6\.1I ห้ามใช้ phrase|not v6\.1I/i.test(doc));
}

// --- real stock gate ---
{
  ok("real stock still blocked", /real stock.*blocked|still blocked/i.test(docLower));
  ok("real stock gate updated", /real stock import gate/i.test(doc));
  ok("sanitized dataset", /sanitized|approved dataset/i.test(docLower));
}

// --- compliance ---
{
  ok("compliance docs tests only", /docs\/tests only/i.test(docLower));
  ok("compliance no deploy", /ไม่ deploy|not done/i.test(docLower));
  ok("compliance user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("compliance no production", /production.*not touched|not touched/i.test(docLower));
  ok("compliance no payment", /payment.*settlement/i.test(docLower));
  ok("compliance no lead reveal", /lead.*reveal|outcome/i.test(docLower));
  ok("compliance no public signup", /public signup/i.test(docLower));
  ok("compliance no secrets access", /secrets versions access/i.test(doc));
}

// --- code invariants (no user-visible change) ---
{
  ok("shadow chat path legacy unchanged", shadowChatPath.includes("legacy user-visible text unchanged"));
  ok("real provider SS-01 only", realProvider.includes('"SS-01"'));
  ok("shadow smoke cases SS-01..SS-08", shadowSmoke.includes("SS-01") && shadowSmoke.includes("SS-08"));
  ok("admin route path", doc.includes(ADMIN_ROUTE) || shadowSmoke.includes(ADMIN_ROUTE));
  ok("admin UI path", doc.includes(ADMIN_UI_PATH));
  ok("legacy start over string", doc.includes(LEGACY_START_OVER) || h4Doc.includes(LEGACY_START_OVER));
}

// --- what is NOT user-visible ---
{
  ok("table user sees AI", /User sees AI|user sees ai/i.test(doc));
  ok("v6.1H.4 admin debug not public", /admin panel only|admin debug/i.test(docLower));
  ok("public chat AI blocked until gate", /Public.*chat.*AI|public.*user-visible/i.test(doc));
}

// --- references prior docs ---
{
  ok("references v6.1F", doc.includes("v6.1F"));
  ok("references v6.1G", doc.includes("v6.1G"));
  ok("references v6.0W", doc.includes("v6.0W"));
  ok("references v6.0Y", doc.includes("v6.0Y"));
}

// --- no secret values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret pattern ${pat.source.slice(0, 20)}`, !pat.test(doc));
    ok(`h4 doc no secret pattern ${pat.source.slice(0, 20)}`, !pat.test(h4Doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v61i script", pkg.includes("test:v61i-staging-ai-conversation-smoke-readiness"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61i-staging-ai-conversation-smoke-readiness.mts")
  );
}

console.log("\nDone v6.1I Staging AI Conversation Smoke Readiness tests.");
if (process.exitCode) process.exit(process.exitCode);
