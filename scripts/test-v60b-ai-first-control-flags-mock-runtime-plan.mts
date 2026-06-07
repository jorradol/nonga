/**
 * v6.0B — AI First Control Flags & Mock Runtime Plan (static validation only)
 * npm run test:v60b-ai-first-control-flags-mock-runtime-plan
 *
 * Validates plan doc — does NOT call AI API, fetch network, or Firebase/gcloud.
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0B-ai-first-control-flags-mock-runtime-plan.md";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0B AI First Control Flags & Mock Runtime Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60b-ai-first-control-flags-mock-runtime-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.0B label ---
{
  ok("plan doc exists", doc.length > 2000);
  ok("doc v6.0B label", doc.includes("v6.0B"));
  ok("doc control flags mock runtime title", /control flags|mock runtime/i.test(doc));
  ok("doc readiness status", /docs\/tests readiness|ยังไม่เปลี่ยน runtime/i.test(docLower));
}

// --- AI mode flags (complete set) ---
{
  ok("flag NONGA_AI_MODE", doc.includes("NONGA_AI_MODE"));
  ok("flag NONGA_AI_MODE values", /off.*low.*standard.*high|off\s*\|\s*low/i.test(doc));
  ok("flag NONGA_AI_FIRST_ENABLED", doc.includes("NONGA_AI_FIRST_ENABLED"));
  ok("flag NONGA_AI_PROVIDER", doc.includes("NONGA_AI_PROVIDER"));
  ok("flag NONGA_AI_PROVIDER mock gemini openai", /mock.*gemini.*openai|mock\s*\|\s*gemini/i.test(docLower));
  ok("flag NONGA_AI_BUDGET_DAILY_LIMIT", doc.includes("NONGA_AI_BUDGET_DAILY_LIMIT"));
  ok("flag NONGA_AI_BUDGET_MONTHLY_LIMIT", doc.includes("NONGA_AI_BUDGET_MONTHLY_LIMIT"));
  ok("flag NONGA_AI_EMERGENCY_KILL_SWITCH", doc.includes("NONGA_AI_EMERGENCY_KILL_SWITCH"));
}

// --- safe defaults ---
{
  ok("doc production default off", /production.*default.*off|production default = off/i.test(docLower));
  ok("doc staging closed pilot target high", /staging.*closed pilot.*target.*high|closed pilot.*target.*\*\*high\*\*/i.test(docLower));
  ok("doc open later not now", /เปิดภายหลัง|เปิดภายหลังเท่านั้น/i.test(doc));
  ok("doc local mock default", /local.*mock default|local\/mock default.*mock/i.test(docLower));
}

// --- SuperAdmin controls ---
{
  ok("doc superadmin global ai mode", /global AI mode|Global AI mode/i.test(doc));
  ok("doc superadmin per-flow", /per-flow|Per-flow/i.test(doc));
  ok("doc superadmin emergency kill switch", /emergency kill switch|Emergency kill switch/i.test(doc));
  ok("doc superadmin downshift ladder", /high.*standard.*low.*off|downshift ladder/i.test(docLower));
  ok("doc superadmin brake downshift", /brake|downshift/i.test(docLower));
}

// --- budget warning / stop ---
{
  ok("doc budget warning", /budget warning|Daily budget warning/i.test(doc));
  ok("doc budget stop", /budget stop/i.test(docLower));
  ok("doc auto-downshift on budget", /auto-downshift|budget stop.*downshift/i.test(docLower));
}

// --- mock runtime concept ---
{
  ok("doc mock runtime section", /Mock Runtime|mock runtime/i.test(doc));
  ok("doc mock buyer seller dealer", /buyer.*seller.*dealer|buyerMock|sellerMock|dealerMock/i.test(doc));
  ok("doc mock no paid api", /no paid API|ไม่เรียก paid/i.test(doc));
  ok("doc mock no network", /no network|ไม่ fetch/i.test(docLower));
  ok("doc mock no pii logging", /no PII logging|ไม่เก็บ PII/i.test(docLower));
  ok("doc mock deterministic", /deterministic/i.test(docLower));
}

// --- AI no-go zones ---
{
  ok("doc no-go zones section", /AI No-Go Zones|no-go zones/i.test(doc));
  ok("doc no-go revenue write", /revenue write/i.test(docLower));
  ok("doc no-go settlement", /settlement/i.test(docLower));
  ok("doc no-go payment", /payment/i.test(docLower));
  ok("doc no-go invoice", /invoice/i.test(docLower));
  ok("doc no-go contact consent", /contact reveal without consent|consent/i.test(docLower));
  ok("doc no-go listing facts", /listing facts not in source|ไม่มีใน listing/i.test(docLower));
}

// --- deterministic fallback ---
{
  ok("doc deterministic fallback section", /Deterministic Fallback|deterministic fallback/i.test(doc));
  ok("doc fallback orchestrator template", /orchestrator.*template|chatSearchOrchestrator/i.test(docLower));
  ok("doc fallback ai fails", /AI fails|error.*timeout/i.test(docLower));
  ok("doc kill switch immediate off", /kill switch.*off|AI off immediately/i.test(docLower));
}

// --- evaluation metrics ---
{
  ok("doc evaluation metrics section", /Evaluation Metrics|evaluation metrics/i.test(doc));
  ok("doc metric engagement", /engagement/i.test(docLower));
  ok("doc metric lead conversion", /lead conversion/i.test(docLower));
  ok("doc metric hallucination", /hallucination reports/i.test(docLower));
  ok("doc metric cost per useful", /cost per useful conversation/i.test(docLower));
  ok("doc metric downgrade events", /SuperAdmin downgrade events|downgrade events/i.test(docLower));
}

// --- staged rollout ---
{
  ok("doc staged rollout section", /Staged Rollout|staged rollout/i.test(docLower));
  ok("doc stage docs tests", /docs\/tests|docs\/tests readiness/i.test(docLower));
  ok("doc stage mock runtime", /mock runtime/i.test(docLower));
  ok("doc stage local flag", /local flag/i.test(docLower));
  ok("doc stage staging mock high", /staging mock high/i.test(docLower));
  ok("doc stage staging real high", /staging real high/i.test(docLower));
  ok("doc stage closed pilot", /closed pilot/i.test(docLower));
  ok("doc stage measure", /\*\*measure\*\*|stage.*measure/i.test(docLower));
  ok("doc stage downshift optimize", /downshift.*cost optimize/i.test(docLower));
}

// --- v6.0B no runtime change ---
{
  ok("doc no runtime change statement", /v6\.0B ยังไม่เปลี่ยน runtime behavior|ยังไม่เปลี่ยน runtime behavior/i.test(doc));
  ok("doc forbidden no deploy", /ไม่ deploy|no deploy|ห้าม deploy/i.test(docLower));
  ok("doc forbidden no env secrets", /ไม่เปิด env|secrets/i.test(docLower));
  ok("doc forbidden no paid ai api", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("doc forbidden no production", /ไม่แตะ production|no production/i.test(docLower));
  ok("doc forbidden no payment settlement", /payment.*invoice.*settlement|settlement logic/i.test(docLower));
  ok("doc forbidden no lead reveal outcome", /buyer lead.*seller reveal.*outcome|ห้ามแตะ/i.test(docLower));
  ok("doc forbidden no public signup", /public signup/i.test(docLower));
}

// --- references v6.0A ---
{
  ok("references v60a", doc.includes("v6.0A"));
  ok("references v56j", doc.includes("v5.6J"));
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
  ok("package v60b script", pkg.includes("test:v60b-ai-first-control-flags-mock-runtime-plan"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60b-ai-first-control-flags-mock-runtime-plan.mts")
  );
}

console.log("\nDone v6.0B AI First Control Flags & Mock Runtime Plan tests.");
if (process.exitCode) process.exit(process.exitCode);
