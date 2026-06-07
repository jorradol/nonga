/**
 * v6.0I — AI Secret & Env Preflight Readiness (static validation only)
 * npm run test:v60i-ai-secret-env-preflight-readiness
 *
 * Validates preflight doc — does NOT call AI API, fetch network, gcloud, or Firebase.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0I-ai-secret-env-preflight-readiness.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0I AI Secret & Env Preflight Readiness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync("scripts/test-v60i-ai-secret-env-preflight-readiness.mts", "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.0I ---
{
  ok("preflight doc exists", doc.length > 3000);
  ok("doc v6.0I label", doc.includes("v6.0I"));
  ok("doc preflight title", /preflight|secret.*env/i.test(doc));
  ok("doc read-only status", /read-only|ยังไม่เปิด.*env/i.test(docLower));
}

// --- staging scope: project / service / region ---
{
  ok("scope project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("scope service nonga-staging", doc.includes("nonga-staging"));
  ok("scope region asia-southeast1", doc.includes("asia-southeast1"));
  ok("production excluded from scope", /production.*excluded|ไม่อยู่ใน scope|out of scope/i.test(docLower));
  ok("production not in preflight scope", /production.*not in scope|ห้าม preflight production/i.test(docLower));
}

// --- secret names only ---
{
  ok("secret name GEMINI_API_KEY", doc.includes("GEMINI_API_KEY"));
  ok("secret name OPENAI_API_KEY", doc.includes("OPENAI_API_KEY"));
  ok("doc server-only secrets", /server-only|never `VITE_\*`/i.test(doc));
  ok("doc no secret value in repo", /ห้ามใส่.*secret value|no secret values/i.test(docLower));
  ok("doc no secret value in log", /ห้าม log ค่า secret|no secret values in log/i.test(docLower));
}

// --- target env future ---
{
  ok("target NONGA_AI_PROVIDER gemini openai", /NONGA_AI_PROVIDER.*gemini.*openai|gemini.*or.*openai/i.test(docLower));
  ok("target staging NONGA_AI_MODE high", /NONGA_AI_MODE.*high|staging closed pilot.*high/i.test(docLower));
  ok("target NONGA_AI_FIRST_ENABLED true", doc.includes("NONGA_AI_FIRST_ENABLED"));
  ok("target kill switch false when enabling", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("target NONGA_AI_BUDGET_DAILY_LIMIT", doc.includes("NONGA_AI_BUDGET_DAILY_LIMIT"));
  ok("target NONGA_AI_BUDGET_MONTHLY_LIMIT", doc.includes("NONGA_AI_BUDGET_MONTHLY_LIMIT"));
  ok("production default off", /production default.*off|production default = off/i.test(docLower));
}

// --- readiness checklist ---
{
  ok("checklist secret exists", /secret.*exists|existence/i.test(docLower));
  ok("checklist service account IAM", /service account|get-iam-policy/i.test(docLower));
  ok("checklist budget limits before real AI", /budget limits.*before|budget.*set before/i.test(docLower));
  ok("checklist kill switch ready", /kill switch.*ready|NONGA_AI_EMERGENCY_KILL_SWITCH/i.test(doc));
  ok("checklist superadmin brake downshift", /superadmin.*brake|downshift/i.test(docLower));
  ok("checklist no-go zones", /no-go zones/i.test(docLower));
  ok("checklist fallback deterministic", /fallback.*deterministic|chatSearchOrchestrator/i.test(docLower));
}

// --- read-only commands ---
{
  ok("cmd gcloud config get-value project", doc.includes("gcloud config get-value project"));
  ok("cmd run services describe staging", /gcloud run services describe nonga-staging/.test(doc));
  ok("cmd secrets describe GEMINI", /gcloud secrets describe GEMINI_API_KEY/.test(doc));
  ok("cmd project flag in describe", /--project=nonga-ce93c/.test(doc));
  ok("cmd region flag in describe", /--region=asia-southeast1/.test(doc));
}

// --- forbidden commands ---
{
  ok("forbid secrets versions access", /gcloud secrets versions access/i.test(doc));
  ok("doc forbids versions access", /ห้าม.*versions access|ไม่.*access versions/i.test(docLower));
  ok("forbid run services update", /gcloud run services update/i.test(doc));
  ok("doc forbids services update", /ห้าม.*services update|Forbidden Commands/i.test(doc));
  ok("forbid run deploy in doc", /gcloud run deploy/i.test(doc));
}

// --- budget / kill switch / superadmin ---
{
  ok("doc budget guard", /budget/i.test(docLower));
  ok("doc emergency kill switch", /emergency kill switch|NONGA_AI_EMERGENCY_KILL_SWITCH/i.test(doc));
  ok("doc superadmin", /superadmin/i.test(docLower));
}

// --- no-go and fallback ---
{
  ok("no-go revenue write", /revenue write/i.test(docLower));
  ok("no-go settlement write", /settlement write/i.test(docLower));
  ok("no-go payment", /payment/i.test(docLower));
  ok("no-go contact reveal", /contact reveal/i.test(docLower));
  ok("no-go hallucination", /hallucinated listing/i.test(docLower));
  ok("fallback orchestrator", doc.includes("chatSearchOrchestrator"));
}

// --- v6.0I no runtime / forbidden ---
{
  ok("doc v60i no runtime change", /v6\.0I ยังไม่เปลี่ยน runtime|ยังไม่เปลี่ยน user-visible/i.test(doc));
  ok("doc forbidden no deploy", /ไม่ deploy|ห้าม deploy|firebase deploy/i.test(docLower));
  ok("doc forbidden no env secrets change", /ไม่เปิด.*env|ไม่แก้ env/i.test(docLower));
  ok("doc forbidden no create secret", /สร้าง secret ใหม่|create secret/i.test(docLower));
  ok("doc forbidden no paid ai", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("doc forbidden no production touch", /แตะ production|production excluded/i.test(docLower));
  ok("doc forbidden no payment settlement", /payment.*invoice.*settlement|settlement write/i.test(docLower));
  ok("doc forbidden no lead reveal outcome", /buyer lead.*seller reveal.*outcome|ไม่แตะ/i.test(docLower));
  ok("doc forbidden no public signup", /public signup/i.test(docLower));
}

// --- references v6.0H ---
{
  ok("references v60h", doc.includes("v6.0H"));
  ok("references stage I", /stage.*\*\*I\*\*|v6\.0H stage I/i.test(doc));
}

// --- no secret values in doc ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret pattern ${pat.source.slice(0, 22)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no ai api fetch", !/fetch\s*\(\s*[`'"]\/api\//.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
  ok("script uses readFileSync only", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v60i script", pkg.includes("test:v60i-ai-secret-env-preflight-readiness"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60i-ai-secret-env-preflight-readiness.mts")
  );
}

console.log("\nDone v6.0I AI Secret & Env Preflight Readiness tests.");
if (process.exitCode) process.exit(process.exitCode);
