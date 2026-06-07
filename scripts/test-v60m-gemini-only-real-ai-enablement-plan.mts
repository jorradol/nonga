/**
 * v6.0M — Gemini-only Real AI Enablement Plan (static validation only)
 * npm run test:v60m-gemini-only-real-ai-enablement-plan
 *
 * Validates enablement doc — does NOT call AI API, fetch network, gcloud, or Firebase.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0M-gemini-only-real-ai-enablement-plan.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const APPROVAL_PHRASE =
  "อนุมัติให้เปิด Gemini real paid AI provider บน staging closed pilot เท่านั้น ตาม v6.0M";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0M Gemini-only Real AI Enablement Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60m-gemini-only-real-ai-enablement-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.0M ---
{
  ok("enablement doc exists", doc.length > 4000);
  ok("doc v6.0M label", doc.includes("v6.0M"));
  ok("doc gemini-only title", /gemini-only|Gemini only/i.test(doc));
  ok("doc no runtime change", /ยังไม่เปลี่ยน runtime|user-visible runtime behavior/i.test(docLower));
}

// --- Gemini-only provider ---
{
  ok("provider round 1 Gemini only", /Gemini.*only|only provider.*Gemini|Provider รอบแรก.*Gemini/i.test(doc));
  ok("not use OpenAI round 1", /ไม่ใช้ OpenAI.*รอบแรก|not used in round 1|OpenAI.*not used/i.test(doc));
  ok("OpenAI optional future no-op", /optional future-only|future-only.*no-op|no-op.*future/i.test(docLower));
  ok("target NONGA_AI_PROVIDER gemini", /NONGA_AI_PROVIDER.*gemini/i.test(doc));
  ok("no openai in round 1 enablement", /do not set.*openai|ไม่.*openai.*round 1/i.test(docLower));
}

// --- secret mapping no values ---
{
  ok("GEMINI_API_KEY env name", doc.includes("GEMINI_API_KEY"));
  ok("gemini-api-key SM resource", doc.includes("gemini-api-key"));
  ok("mapping GEMINI_API_KEY to gemini-api-key", /GEMINI_API_KEY.*gemini-api-key|gemini-api-key.*GEMINI_API_KEY/i.test(doc));
  ok("latest version ref", /gemini-api-key:latest|latest/i.test(doc));
  ok("doc no secret value in repo", /ห้ามใส่ค่า secret|no secret value/i.test(docLower));
  ok("forbid secrets versions access", /gcloud secrets versions access|ห้าม.*secrets versions access/i.test(docLower));
  ok("openai secret not needed round 1", /openai-api-key.*NOT_FOUND|not needed round 1/i.test(docLower));
}

// --- target staging env future ---
{
  ok("target NONGA_AI_MODE high", /NONGA_AI_MODE.*high/i.test(doc));
  ok("target NONGA_AI_FIRST_ENABLED true", /NONGA_AI_FIRST_ENABLED.*true/i.test(doc));
  ok("target kill switch false when enabling", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("target budget daily must define", /NONGA_AI_BUDGET_DAILY_LIMIT.*ต้องกำหนด|must define before enable/i.test(docLower));
  ok("target budget monthly must define", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*ต้องกำหนด|must define before enable/i.test(docLower));
  ok("production default off", /production default.*off|production.*off/i.test(docLower));
  ok("DO NOT RUN YET", /DO NOT RUN YET/i.test(doc));
}

// --- approval phrase ---
{
  ok("approval phrase exact v60m", doc.includes(APPROVAL_PHRASE));
  ok("approval gemini-only staging", /Gemini.*staging closed pilot/i.test(doc));
  ok("v60k phrase not substitute", /v6\.0K phrase.*ไม่แทน|does not substitute/i.test(docLower));
}

// --- no-go zones ---
{
  ok("no-go revenue write", /revenue write|ห้าม AI ใน revenue write/i.test(docLower));
  ok("no-go settlement write", /settlement write|ห้าม AI ใน settlement write/i.test(docLower));
  ok("no-go payment invoice", /payment.*invoice|ห้าม AI ใน payment/i.test(docLower));
  ok("no-go contact reveal consent", /reveal contact.*consent|ห้าม reveal contact/i.test(docLower));
  ok("no-go listing hallucination", /แต่งข้อมูลรถ|listing hallucination|ไม่มีใน listing/i.test(docLower));
  ok("no-go credit bureau", /ติดบูโร|credit bureau/i.test(docLower));
  ok("no-go financial legal advice", /การเงิน.*กฎหมาย|financial.*legal advice/i.test(docLower));
}

// --- budget kill switch superadmin ---
{
  ok("budget daily limit before enable", /NONGA_AI_BUDGET_DAILY_LIMIT|daily budget/i.test(docLower));
  ok("budget monthly limit before enable", /NONGA_AI_BUDGET_MONTHLY_LIMIT|monthly budget/i.test(docLower));
  ok("emergency kill switch", /NONGA_AI_EMERGENCY_KILL_SWITCH|emergency kill switch/i.test(doc));
  ok("superadmin downshift ladder", /high.*standard.*low.*off|SuperAdmin downshift/i.test(docLower));
  ok("budget hit fallback downshift", /budget hit.*downshift|budget.*fallback/i.test(docLower));
  ok("provider error legacy fallback", /provider error.*legacy|chatSearchOrchestrator/i.test(docLower));
}

// --- enablement sequence M to R ---
{
  ok("stage M v60m", /Stage.*\*\*M\*\*|v6\.0M.*this doc/i.test(doc));
  ok("stage N wiring disabled flag", /Stage.*\*\*N\*\*|disabled flag/i.test(doc));
  ok("stage O shadow gemini", /Stage.*\*\*O\*\*|shadow Gemini/i.test(doc));
  ok("stage P closed pilot", /Stage.*\*\*P\*\*|closed pilot/i.test(doc));
  ok("stage Q measure", /Stage.*\*\*Q\*\*|measure cost/i.test(doc));
  ok("stage R downshift", /Stage.*\*\*R\*\*|downshift.*cost/i.test(doc));
  ok("stock import gate AI conversation smoke", /นำเข้าสต๊อกจริง.*AI conversation smoke|staging AI conversation smoke/i.test(doc));
  ok("not ready stock until smoke", /ยังไม่พร้อมนำเข้าสต๊อก|not ready.*stock/i.test(docLower));
}

// --- staging scope ---
{
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("service nonga-staging", doc.includes("nonga-staging"));
  ok("region asia-southeast1", doc.includes("asia-southeast1"));
}

// --- references ---
{
  ok("references v60l", doc.includes("v6.0L"));
  ok("references v60k", doc.includes("v6.0K"));
  ok("references v60h v60j", doc.includes("v6.0H") && doc.includes("v6.0J"));
}

// --- forbidden section ---
{
  ok("forbidden no deploy", /ไม่ deploy|ห้าม deploy|Deploy Cloud Run/i.test(doc));
  ok("forbidden no services update", /gcloud run services update/i.test(doc));
  ok("forbidden no env secrets", /ไม่เปิด.*env|modify env/i.test(docLower));
  ok("forbidden no paid ai", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("forbidden no production", /แตะ production|touch production/i.test(docLower));
  ok("forbidden no payment settlement", /payment.*invoice.*settlement|settlement write/i.test(docLower));
  ok("forbidden no lead reveal outcome", /buyer lead.*seller reveal|outcome flow/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
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
  ok("package v60m script", pkg.includes("test:v60m-gemini-only-real-ai-enablement-plan"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60m-gemini-only-real-ai-enablement-plan.mts")
  );
}

console.log("\nDone v6.0M Gemini-only Real AI Enablement Plan tests.");
if (process.exitCode) process.exit(process.exitCode);
