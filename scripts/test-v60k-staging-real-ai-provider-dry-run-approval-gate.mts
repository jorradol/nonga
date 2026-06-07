/**
 * v6.0K — Staging real AI provider dry-run / approval gate (static validation only)
 * npm run test:v60k-staging-real-ai-provider-dry-run-approval-gate
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0K-staging-real-ai-provider-dry-run-approval-gate.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const APPROVAL_PHRASE =
  "อนุมัติให้เปิด real paid AI provider บน staging closed pilot เท่านั้น ตาม v6.0K";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0K Staging Real AI Provider Dry-run / Approval Gate ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60k-staging-real-ai-provider-dry-run-approval-gate.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.0K ---
{
  ok("dry-run doc exists", doc.length > 3500);
  ok("doc v6.0K label", doc.includes("v6.0K"));
  ok("doc dry-run approval title", /dry-run|approval gate/i.test(doc));
  ok("doc no runtime change", /ยังไม่เปลี่ยน runtime|user-visible runtime behavior/i.test(docLower));
}

// --- current status stub network disabled ---
{
  ok("status real provider stub", /real provider stub|salesBrainRealProvider/i.test(doc));
  ok("status network disabled", /network disabled|SALES_BRAIN_REAL_PROVIDER_NETWORK_DISABLED/i.test(doc));
}

// --- staging scope ---
{
  ok("staging project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("service nonga-staging", doc.includes("nonga-staging"));
  ok("region asia-southeast1", doc.includes("asia-southeast1"));
  ok("production default AI off", /production.*AI off|production default.*off/i.test(docLower));
  ok("staging target AI First high", /AI First high|closed pilot.*high/i.test(docLower));
}

// --- provider candidates & secrets ---
{
  ok("provider gemini", /\*\*gemini\*\*|provider.*gemini/i.test(docLower));
  ok("provider openai", /\*\*openai\*\*|provider.*openai/i.test(docLower));
  ok("secret GEMINI_API_KEY", doc.includes("GEMINI_API_KEY"));
  ok("secret OPENAI_API_KEY", doc.includes("OPENAI_API_KEY"));
  ok("doc no secret value in repo log", /ห้ามใส่ secret value|no secret values/i.test(docLower));
}

// --- dry-run checklist ---
{
  ok("checklist git clean HEAD origin", /git clean.*HEAD.*origin|HEAD = origin/i.test(docLower));
  ok("checklist describe env redacted", /describe Cloud Run env.*redacted|redacted/i.test(docLower));
  ok("checklist secret metadata only", /secret metadata|describe secret/i.test(docLower));
  ok("checklist budget limits", /NONGA_AI_BUDGET_DAILY_LIMIT|budget limits defined/i.test(doc));
  ok("checklist kill switch", /emergency kill switch|NONGA_AI_EMERGENCY_KILL_SWITCH/i.test(doc));
  ok("checklist superadmin downshift", /superadmin downshift|downshift plan/i.test(docLower));
  ok("checklist no-go zones", /no-go zones/i.test(docLower));
  ok("checklist fallback deterministic", /fallback.*deterministic|chatSearchOrchestrator/i.test(docLower));
  ok("checklist no user-visible before approval", /no user-visible|user-visible change/i.test(docLower));
}

// --- approval phrase ---
{
  ok("approval phrase exact", doc.includes(APPROVAL_PHRASE));
  ok("approval gate section", /approval gate|Approval Gate/i.test(doc));
}

// --- DO NOT RUN YET ---
{
  ok("DO NOT RUN YET label", /DO NOT RUN YET/i.test(doc));
  ok("future gcloud run services update", /gcloud run services update nonga-staging/.test(doc));
  ok("future env NONGA_AI_PROVIDER", doc.includes("NONGA_AI_PROVIDER"));
  ok("future env NONGA_AI_MODE high", /NONGA_AI_MODE.*high/i.test(doc));
  ok("future env NONGA_AI_FIRST_ENABLED true", /NONGA_AI_FIRST_ENABLED.*true/i.test(doc));
  ok("future env kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("future env budget daily", doc.includes("NONGA_AI_BUDGET_DAILY_LIMIT"));
  ok("future env budget monthly", doc.includes("NONGA_AI_BUDGET_MONTHLY_LIMIT"));
}

// --- rollback kill switch ---
{
  ok("rollback kill switch true", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/i.test(doc));
  ok("rollback NONGA_AI_MODE off", /NONGA_AI_MODE=off/i.test(doc));
  ok("rollback NONGA_AI_FIRST_ENABLED false", /NONGA_AI_FIRST_ENABLED=false/i.test(doc));
  ok("rollback fallback legacy", /legacy deterministic|chatSearchOrchestrator/i.test(docLower));
}

// --- forbid secrets versions access ---
{
  ok("forbid secrets versions access", /gcloud secrets versions access|ห้าม.*secrets versions access/i.test(docLower));
}

// --- guards budget superadmin no-go ---
{
  ok("doc budget guard", /budget monitor|budget limits/i.test(docLower));
  ok("doc superadmin brake", /superadmin brake|SuperAdmin brake/i.test(doc));
  ok("no-go revenue write", /revenue write/i.test(docLower));
  ok("no-go settlement write", /settlement write/i.test(docLower));
  ok("no-go payment", /payment/i.test(docLower));
  ok("no-go contact reveal", /contact reveal/i.test(docLower));
}

// --- v6.0K forbidden ---
{
  ok("doc forbidden no deploy", /ไม่ deploy|ห้าม deploy|firebase deploy/i.test(docLower));
  ok("doc forbidden no env secrets", /ไม่เปิด.*env|ไม่แก้ env/i.test(docLower));
  ok("doc forbidden no paid ai", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("doc forbidden no production", /แตะ production|production off/i.test(docLower));
  ok("doc forbidden no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("doc forbidden no public signup", /public signup/i.test(docLower));
}

// --- references ---
{
  ok("references v60h stage K", doc.includes("v6.0H") && /stage K|Stage K/i.test(doc));
  ok("references v60i v60j", doc.includes("v6.0I") && doc.includes("v6.0J"));
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
  ok("package v60k script", pkg.includes("test:v60k-staging-real-ai-provider-dry-run-approval-gate"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60k-staging-real-ai-provider-dry-run-approval-gate.mts")
  );
}

console.log("\nDone v6.0K Staging Real AI Provider Dry-run / Approval Gate tests.");
if (process.exitCode) process.exit(process.exitCode);
