/**
 * v6.0H — Real AI Provider Readiness & Staging Enablement Plan (static validation only)
 * npm run test:v60h-real-ai-provider-readiness-staging-enablement-plan
 *
 * Validates plan doc — does NOT call AI API, fetch network, Firebase/gcloud, or read secrets.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0H-real-ai-provider-readiness-staging-enablement-plan.md";

/** Reject doc/test if literal secret-like values appear */
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

console.log("=== v6.0H Real AI Provider Readiness & Staging Enablement Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60h-real-ai-provider-readiness-staging-enablement-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.0H ---
{
  ok("readiness doc exists", doc.length > 3500);
  ok("doc v6.0H label", doc.includes("v6.0H"));
  ok("doc real ai provider title", /real AI provider|provider readiness/i.test(doc));
  ok("doc readiness status", /docs\/tests readiness|ยังไม่เปลี่ยน runtime/i.test(docLower));
}

// --- provider candidates ---
{
  ok("provider candidate gemini", /\*\*gemini\*\*|provider.*gemini/i.test(docLower));
  ok("provider candidate openai", /\*\*openai\*\*|provider.*openai/i.test(docLower));
  ok("provider mock current", doc.includes("mock"));
  ok("staging target high", /staging closed pilot.*\*\*high\*\*|closed pilot.*high/i.test(docLower));
  ok("production default off", /production.*\*\*off\*\*|production default.*off/i.test(docLower));
}

// --- env flag names (no values) ---
{
  ok("flag NONGA_AI_PROVIDER", doc.includes("NONGA_AI_PROVIDER"));
  ok("flag NONGA_AI_MODE", doc.includes("NONGA_AI_MODE"));
  ok("flag NONGA_AI_FIRST_ENABLED", doc.includes("NONGA_AI_FIRST_ENABLED"));
  ok("flag NONGA_AI_EMERGENCY_KILL_SWITCH", doc.includes("NONGA_AI_EMERGENCY_KILL_SWITCH"));
  ok("flag NONGA_AI_BUDGET_DAILY_LIMIT", doc.includes("NONGA_AI_BUDGET_DAILY_LIMIT"));
  ok("flag NONGA_AI_BUDGET_MONTHLY_LIMIT", doc.includes("NONGA_AI_BUDGET_MONTHLY_LIMIT"));
  ok("secret name GEMINI_API_KEY", doc.includes("GEMINI_API_KEY"));
  ok("secret name OPENAI_API_KEY", doc.includes("OPENAI_API_KEY"));
  ok("doc server-only secret", /server-only|server-side/i.test(docLower));
  ok("doc no secret in repo", /ห้าม.*secret.*repo|never in client|ห้าม commit ค่า secret/i.test(doc));
}

// --- staged enablement H through M ---
{
  ok("stage H readiness", /\*\*H\*\*.*v6\.0H|stage.*\*\*H\*\*/i.test(doc));
  ok("stage I secret preflight", /\*\*I\*\*.*secret|preflight read-only/i.test(docLower));
  ok("stage J real adapter stub", /\*\*J\*\*.*real provider adapter/i.test(docLower));
  ok("stage K shadow dry-run", /\*\*K\*\*.*shadow.*dry-run|staging shadow real-provider/i.test(docLower));
  ok("stage L closed pilot high", /\*\*L\*\*.*AI First.*high|closed pilot/i.test(docLower));
  ok("stage M measure downshift", /\*\*M\*\*.*measure|downshift/i.test(docLower));
  ok("stage K not user visible", /stage K[\s\S]{0,200}user-visible|shadow[\s\S]{0,80}legacy/i.test(docLower));
}

// --- hard no-go zones ---
{
  ok("no-go revenue write", /revenue write/i.test(docLower));
  ok("no-go settlement write", /settlement write/i.test(docLower));
  ok("no-go payment", /payment/i.test(docLower));
  ok("no-go invoice", /invoice/i.test(docLower));
  ok("no-go contact reveal without consent", /contact reveal without consent/i.test(docLower));
  ok("no-go hallucinated listing facts", /hallucinated listing facts|ไม่เดา/i.test(docLower));
  ok("no-go credit risk label", /credit-risk|ติดบูโร/i.test(doc));
  ok("no-go legal financial advice", /legal\/financial advice|final truth/i.test(docLower));
}

// --- budget / cost guard ---
{
  ok("budget daily limit", /daily limit|NONGA_AI_BUDGET_DAILY_LIMIT/i.test(doc));
  ok("budget monthly limit", /monthly limit|NONGA_AI_BUDGET_MONTHLY_LIMIT/i.test(doc));
  ok("budget per-conversation turns", /per-conversation max turns/i.test(docLower));
  ok("budget per-flow quota", /per-flow quota/i.test(docLower));
  ok("auto downshift ladder", /high.*standard.*low.*off|downshift ladder/i.test(docLower));
  ok("emergency kill switch budget", /emergency kill switch/i.test(docLower));
  ok("cost per useful conversation", /cost per useful conversation/i.test(docLower));
}

// --- privacy / logging ---
{
  ok("privacy no raw phone", /no raw phone|raw phone\/contact/i.test(docLower));
  ok("privacy redact before provider", /redact PII before provider/i.test(docLower));
  ok("privacy no buyer phone without consent", /do not send buyer phone|unless explicit consent/i.test(docLower));
  ok("privacy log metadata not full content", /prompt metadata|not.*full sensitive/i.test(docLower));
  ok("privacy retention concept", /retention policy/i.test(docLower));
}

// --- fallback ---
{
  ok("fallback provider error", /provider error.*legacy|legacy deterministic/i.test(docLower));
  ok("fallback budget hit", /budget hit.*downshift|budget.*fallback/i.test(docLower));
  ok("fallback kill switch", /kill switch.*off immediately|AI off immediately/i.test(docLower));
  ok("fallback missing listing facts", /missing listing facts.*ask follow-up|ask follow-up.*no guessing/i.test(docLower));
  ok("fallback chatSearchOrchestrator", doc.includes("chatSearchOrchestrator"));
}

// --- SuperAdmin ---
{
  ok("doc superadmin brake downshift", /superadmin.*brake|downshift/i.test(docLower));
  ok("doc superadmin kill switch", /emergency kill switch/i.test(docLower));
}

// --- v6.0H no runtime change ---
{
  ok("doc v60h no runtime change", /v6\.0H ยังไม่เปลี่ยน runtime|ยังไม่เปลี่ยน user-visible/i.test(doc));
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy|ห้าม deploy/i.test(docLower));
  ok("doc forbidden no env secrets real", /ไม่เปิด env\/secrets จริง|ไม่เปิด env\/secrets/i.test(doc));
  ok("doc forbidden no paid ai this round", /ยังไม่เรียก paid AI|ไม่เรียก paid AI API จริง/i.test(doc));
  ok("doc forbidden no production", /ไม่แตะ production|production.*blocked/i.test(docLower));
  ok("doc forbidden no payment settlement", /payment.*invoice.*settlement|settlement write/i.test(docLower));
  ok("doc forbidden no lead reveal outcome", /buyer lead.*seller reveal.*outcome|ไม่แตะใน v6\.0H/i.test(docLower));
  ok("doc forbidden no public signup", /public signup/i.test(docLower));
}

// --- references prior slices ---
{
  ok("references v60a v60b", doc.includes("v6.0A") && doc.includes("v6.0B"));
  ok("references v60e-g", doc.includes("v6.0E") && doc.includes("v6.0G"));
}

// --- no secret values in doc ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret pattern ${pat.source.slice(0, 24)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no ai api fetch", !/fetch\s*\(\s*[`'"]\/api\//.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase deploy exec", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script no firebase import", !/from\s+["']firebase/.test(selfCode));
  ok("script no spawn network", !/spawn\s*\(\s*[`'"]curl/.test(selfCode));
  ok("script uses readFileSync only", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v60h script", pkg.includes("test:v60h-real-ai-provider-readiness-staging-enablement-plan"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60h-real-ai-provider-readiness-staging-enablement-plan.mts")
  );
}

console.log("\nDone v6.0H Real AI Provider Readiness & Staging Enablement Plan tests.");
if (process.exitCode) process.exit(process.exitCode);
