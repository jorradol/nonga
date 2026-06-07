/**
 * v6.0P — Staging Gemini Shadow Pre-enable Final Checklist (static validation only)
 * npm run test:v60p-staging-gemini-shadow-pre-enable-final-checklist
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0P-staging-gemini-shadow-pre-enable-final-checklist.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const APPROVAL_PHRASE =
  "อนุมัติให้เปิด Gemini shadow mode บน staging แบบไม่แสดงคำตอบ AI ให้ผู้ใช้ ตาม v6.0P";

const V60O_HEAD = "adf8275aaf56c9538699c4ec5c71808fcb3d88d8";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0P Staging Gemini Shadow Pre-enable Final Checklist ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60p-staging-gemini-shadow-pre-enable-final-checklist.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.0P ---
{
  ok("checklist doc exists", doc.length > 5000);
  ok("doc v6.0P label", doc.includes("v6.0P"));
  ok("doc pre-enable final checklist", /pre-enable.*final checklist|final checklist/i.test(doc));
  ok("doc no runtime change", /ไม่เปลี่ยน user-visible|user-visible runtime behavior/i.test(docLower));
}

// --- current status v60o ---
{
  ok("v60o pushed", doc.includes("v6.0O") && /pushed|adf8275/i.test(doc));
  ok("v60o commit hash", doc.includes(V60O_HEAD) || doc.includes("adf8275"));
  ok("gemini wiring disabled", /network disabled|disabled.*no-network/i.test(docLower));
  ok("shadow not enabled yet", /shadow.*not yet|ยังไม่เปิด.*shadow/i.test(docLower));
  ok("not ready real stock", /not ready.*stock|ยังไม่พร้อมนำสต๊อก/i.test(docLower));
}

// --- pre-enable gate ---
{
  ok("gate git clean HEAD origin", /git clean.*HEAD.*origin|HEAD = origin/i.test(docLower));
  ok("gate HEAD >= adf8275", /HEAD >=.*adf8275|adf8275.*or newer/i.test(doc));
  ok("gate project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("gate service nonga-staging", doc.includes("nonga-staging"));
  ok("gate region asia-southeast1", doc.includes("asia-southeast1"));
  ok("gate production excluded", /production excluded|production.*excluded/i.test(docLower));
  ok("gate public signup false", /public signup.*false|publicSignup.*false/i.test(docLower));
  ok("gate AI flags absent before enable", /AI flags.*absent|absent.*before enable/i.test(docLower));
}

// --- target shadow env DO NOT RUN YET ---
{
  ok("DO NOT RUN YET label", /DO NOT RUN YET/i.test(doc));
  ok("env NONGA_AI_PROVIDER gemini", /NONGA_AI_PROVIDER.*gemini/i.test(doc));
  ok("env NONGA_AI_MODE high", /NONGA_AI_MODE.*high/i.test(doc));
  ok("env NONGA_AI_FIRST_ENABLED true", /NONGA_AI_FIRST_ENABLED.*true/i.test(doc));
  ok("env NONGA_AI_SHADOW_MODE_ENABLED true", /NONGA_AI_SHADOW_MODE_ENABLED.*true/i.test(doc));
  ok("env NONGA_AI_USER_VISIBLE_ENABLED false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("env kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("env budget daily placeholder", /NONGA_AI_BUDGET_DAILY_LIMIT.*explicit small staging cap/i.test(doc));
  ok("env budget monthly placeholder", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*explicit staging cap/i.test(doc));
}

// --- budget cap required ---
{
  ok("budget must set numbers", /ต้องใส่ตัวเลข|must set numbers/i.test(docLower));
  ok("no budget no enable", /ไม่ระบุ budget.*ห้ามเปิด|no budget.*no enable/i.test(docLower));
  ok("daily cap low closed pilot", /daily cap.*ต่ำ|closed pilot/i.test(docLower));
  ok("monthly cap low trial", /monthly cap.*ต่ำ|ทดลอง/i.test(docLower));
  ok("budget hit downshift fallback", /budget hit.*downshift|downshift.*fallback/i.test(docLower));
}

// --- approval phrase v60p ---
{
  ok("approval phrase exact v60p", doc.includes(APPROVAL_PHRASE));
  ok("v60o phrase not substitute", /v6\.0O phrase.*ไม่แทน/i.test(doc));
  ok("user visible off in approval", /ไม่แสดงคำตอบ AI/i.test(doc));
}

// --- rollback DO NOT RUN YET ---
{
  ok("rollback DO NOT RUN YET", /Rollback Commands.*DO NOT RUN YET|rollback.*DO NOT RUN YET/i.test(doc));
  ok("rollback kill switch true", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/i.test(doc));
  ok("rollback shadow false", /NONGA_AI_SHADOW_MODE_ENABLED=false/i.test(doc));
  ok("rollback AI first false", /NONGA_AI_FIRST_ENABLED=false/i.test(doc));
  ok("rollback mode off", /NONGA_AI_MODE=off/i.test(doc));
  ok("rollback user visible false", /NONGA_AI_USER_VISIBLE_ENABLED=false/i.test(doc));
  ok("rollback legacy fallback", /legacy deterministic|chatSearchOrchestrator/i.test(docLower));
}

// --- post-enable smoke plan ---
{
  ok("smoke health 200", /\/api\/health.*200|health.*200/i.test(docLower));
  ok("smoke legacy chat unchanged", /legacy chat response unchanged/i.test(docLower));
  ok("smoke userVisibleResponse legacy", /userVisibleResponse.*legacy/i.test(doc));
  ok("smoke shadow no raw PII", /shadow result no raw PII|no raw PII/i.test(docLower));
  ok("smoke no contact reveal", /no contact reveal/i.test(docLower));
  ok("smoke no revenue settlement write", /revenue.*settlement.*payment.*invoice/i.test(docLower));
  ok("smoke gemini cost logged", /Gemini call.*cost|call\/cost counted/i.test(docLower));
  ok("smoke budget guard", /budget guard checked/i.test(docLower));
  ok("smoke kill switch rollback", /kill switch rollback checked/i.test(docLower));
  ok("smoke buyer lead no regress", /buyer lead.*seller reveal.*outcome/i.test(docLower));
}

// --- gate before real stock ---
{
  ok("forbid stock in v60p", /ห้าม.*สต๊อก.*v6\.0P|Import real stock in v6.0P/i.test(doc));
  ok("must pass shadow smoke", /staging Gemini shadow smoke|shadow smoke/i.test(docLower));
  ok("must pass AI conversation smoke", /AI conversation smoke/i.test(docLower));
  ok("notify uncle after smoke", /หนูดี.*น้องซี|แจ้งลุง/i.test(doc));
}

// --- secret rules ---
{
  ok("secret mapping names only", /GEMINI_API_KEY.*gemini-api-key/i.test(doc));
  ok("forbid secrets versions access", /gcloud secrets versions access|ห้าม.*secrets versions access/i.test(docLower));
  ok("no secret value in repo", /ห้าม secret values|no secret value/i.test(docLower));
}

// --- forbidden section ---
{
  ok("forbidden no deploy", /ไม่ deploy|Deploy Cloud Run/i.test(doc));
  ok("forbidden no gcloud update in slice", /gcloud run services update.*not done|❌ not done/i.test(doc));
  ok("forbidden no paid ai", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("forbidden no production", /Touch production|แตะ production/i.test(doc));
  ok("forbidden no lead reveal", /buyer lead.*seller reveal/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
}

// --- references ---
{
  ok("references v60o", doc.includes("v6.0O"));
  ok("references v60n v60m", doc.includes("v6.0N") && doc.includes("v6.0M"));
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
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
  ok("script uses readFileSync only", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v60p script", pkg.includes("test:v60p-staging-gemini-shadow-pre-enable-final-checklist"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60p-staging-gemini-shadow-pre-enable-final-checklist.mts")
  );
}

console.log("\nDone v6.0P Staging Gemini Shadow Pre-enable Final Checklist tests.");
if (process.exitCode) process.exit(process.exitCode);
