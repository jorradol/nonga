/**
 * v6.0S — Shadow Runtime Wiring Smoke Readiness / Not Deployed (static validation only)
 * npm run test:v60s-shadow-runtime-wiring-smoke-readiness-not-deployed
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0S-shadow-runtime-wiring-smoke-readiness-not-deployed.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const V60R_HEAD = "de1a4573540b688a5bb4219fd28ee109a6610781";
const APPROVAL_PHRASE =
  "อนุมัติให้เปิด Gemini shadow mode บน staging แบบไม่แสดงคำตอบ AI ให้ผู้ใช้ ตาม v6.0P";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0S Shadow Runtime Wiring Smoke Readiness / Not Deployed ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60s-shadow-runtime-wiring-smoke-readiness-not-deployed.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const flagsSrc = readFileSync("src/services/ai/salesBrainRuntimeFlags.ts", "utf8");
const runtimeSrc = readFileSync("src/services/ai/salesBrainShadowRuntime.ts", "utf8");
const realProviderSrc = readFileSync("src/services/ai/salesBrainRealProvider.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");

// --- doc exists + v6.0S ---
{
  ok("readiness doc exists", doc.length > 5000);
  ok("doc v6.0S label", doc.includes("v6.0S"));
  ok("doc smoke readiness title", /smoke readiness|not deployed/i.test(doc));
  ok("doc no runtime change", /ไม่เปลี่ยน user-visible|user-visible runtime behavior/i.test(docLower));
  ok("doc not deployed", /not deployed|ยังไม่ deploy/i.test(docLower));
}

// --- v6.0R status ---
{
  ok("v60r pushed", doc.includes("v6.0R") && /pushed|de1a457/i.test(doc));
  ok("v60r commit hash", doc.includes(V60R_HEAD) || doc.includes("de1a457"));
  ok("runtime flag reader exists", doc.includes("salesBrainRuntimeFlags"));
  ok("shadow runtime mock only", /mock-only|mock only/i.test(docLower));
  ok("user visible off status", /user-visible.*off|user visible.*off/i.test(docLower));
  ok("network disabled status", /network.*disabled|SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED=false/i.test(doc));
  ok("real stock blocked", /stock.*blocked|blocked.*stock|ห้าม.*สต๊อก|สต๊อก.*blocked/i.test(docLower));
}

// --- pre-deploy readiness gate ---
{
  ok("gate git clean HEAD origin", /git clean.*HEAD.*origin|HEAD = origin/i.test(docLower));
  ok("gate HEAD >= de1a457", /HEAD >=.*de1a457|de1a457.*or newer/i.test(doc));
  ok("gate project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("gate service nonga-staging", doc.includes("nonga-staging"));
  ok("gate region asia-southeast1", doc.includes("asia-southeast1"));
  ok("gate production excluded", /production excluded|production.*excluded/i.test(docLower));
  ok("gate public signup false", /public signup.*false|publicSignup.*false/i.test(docLower));
  ok("gate gemini only", /gemini-only|Gemini-only|gemini only/i.test(doc));
  ok("gate user visible off", /user-visible AI off|user visible.*off/i.test(docLower));
  ok("gate network disabled", /real provider network disabled|network disabled/i.test(docLower));
  ok("gate budget required", /budget caps required|no budget.*no enable/i.test(docLower));
}

// --- DO NOT RUN YET deploy plan ---
{
  ok("deploy DO NOT RUN YET", /Future Deploy Plan.*DO NOT RUN YET|Deploy Plan.*DO NOT RUN YET/i.test(doc));
  ok("deploy cloud run staging", /gcloud run deploy nonga-staging|Cloud Run.*nonga-staging/i.test(doc));
  ok("deploy image from branch", /image.*branch|built from current branch|de1a457/i.test(docLower));
  ok("deploy preserve env secrets", /preserve.*env|preserve existing env/i.test(docLower));
  ok("deploy no hosting unless needed", /no Hosting deploy|No Hosting deploy/i.test(doc));
  ok("deploy no firestore rules", /no Firestore rules|No Firestore rules/i.test(docLower));
  ok("deploy flags remain absent", /AI flags remain.*absent|absent\/off until/i.test(docLower));
}

// --- DO NOT RUN YET env enable plan ---
{
  ok("env enable DO NOT RUN YET", /Future Env Enable Plan.*DO NOT RUN YET|Env Enable Plan.*DO NOT RUN YET/i.test(doc));
  ok("enable gcloud run services update", /gcloud run services update nonga-staging/.test(doc));
  ok("enable NONGA_AI_PROVIDER gemini", /NONGA_AI_PROVIDER=gemini/.test(doc));
  ok("enable NONGA_AI_MODE high", /NONGA_AI_MODE=high/.test(doc));
  ok("enable NONGA_AI_FIRST_ENABLED true", /NONGA_AI_FIRST_ENABLED=true/.test(doc));
  ok("enable NONGA_AI_SHADOW_MODE_ENABLED true", /NONGA_AI_SHADOW_MODE_ENABLED=true/.test(doc));
  ok("enable NONGA_AI_USER_VISIBLE_ENABLED false", /NONGA_AI_USER_VISIBLE_ENABLED=false/.test(doc));
  ok("enable kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH=false/.test(doc));
  ok("enable budget daily 5", /NONGA_AI_BUDGET_DAILY_LIMIT=5|BUDGET_DAILY_LIMIT.*`5`/i.test(doc));
  ok("enable budget monthly 50", /NONGA_AI_BUDGET_MONTHLY_LIMIT=50|BUDGET_MONTHLY_LIMIT.*`50`/i.test(doc));
}

// --- smoke checklist ---
{
  ok("smoke checklist section", /Post-deploy.*Smoke|smoke checklist/i.test(doc));
  ok("smoke health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke publicSignup false", /publicSignupEnabled.*false/i.test(doc));
  ok("smoke legacy chat unchanged", /legacy chat.*unchanged|legacy chat response unchanged/i.test(docLower));
  ok("smoke user visible off", /user-visible AI.*off|User-visible AI.*off/i.test(doc));
  ok("smoke shadow runtime allowed mode", /shadow runtime.*only|evaluates.*only/i.test(docLower));
  ok("smoke no raw PII", /no raw PII|raw phone/i.test(doc));
  ok("smoke no contact reveal", /no contact reveal|Contact reveal/i.test(doc));
  ok("smoke no revenue settlement payment", /revenue.*settlement.*payment|payment\/invoice/i.test(docLower));
  ok("smoke budget flags readable", /budget flags.*present|Budget flags/i.test(doc));
  ok("smoke kill switch drill", /kill switch.*true|Kill switch drill/i.test(doc));
  ok("smoke buyer lead no regress", /buyer lead.*seller reveal.*outcome|no regression/i.test(docLower));
}

// --- rollback ---
{
  ok("rollback DO NOT RUN YET", /Rollback.*DO NOT RUN YET/i.test(doc));
  ok("rollback kill switch true", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/.test(doc));
  ok("rollback shadow false", /NONGA_AI_SHADOW_MODE_ENABLED=false/.test(doc));
  ok("rollback AI first false", /NONGA_AI_FIRST_ENABLED=false/.test(doc));
  ok("rollback mode off", /NONGA_AI_MODE=off/.test(doc));
  ok("rollback user visible false", /NONGA_AI_USER_VISIBLE_ENABLED=false/.test(doc));
  ok("rollback legacy fallback", /legacy deterministic|legacy fallback/i.test(docLower));
  ok("rollback cloud run revision", /rollback Cloud Run|previous known-good revision|nonga-staging-00047-7xc/i.test(doc));
}

// --- gate before real stock ---
{
  ok("gate stock forbidden v60s", /ห้าม.*สต๊อก.*v6\.0S|Real stock import in v6\.0S.*ห้าม/i.test(doc));
  ok("gate shadow smoke first", /shadow runtime smoke|shadow smoke.*first/i.test(docLower));
  ok("gate AI conversation smoke", /AI conversation smoke/i.test(doc));
  ok("gate notify uncle", /แจ้งลุง|notify.*ลุง/i.test(doc));
}

// --- approval phrase reference ---
{
  ok("approval phrase v60p referenced", doc.includes(APPROVAL_PHRASE));
}

// --- forbidden section ---
{
  ok("forbidden no deploy done", /not done.*DO NOT RUN YET|Deploy.*not done/i.test(doc));
  ok("forbidden no gcloud update", /gcloud run services update.*not done|not done/i.test(docLower));
  ok("forbidden no paid ai", /paid AI API|ไม่เรียก paid/i.test(doc));
  ok("forbidden no user visible", /Show AI response|user-visible runtime/i.test(doc));
  ok("forbidden no production", /Touch production|production.*not done/i.test(docLower));
  ok("forbidden no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("forbidden no lead reveal", /buyer lead.*seller reveal/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbid secrets versions access", /secrets versions access|did not run.*secrets versions access/i.test(docLower));
  ok("no secret values in doc", /no secret values|did not run.*secrets versions access/i.test(docLower));
}

// --- references ---
{
  ok("references v60r", doc.includes("v6.0R"));
  ok("references v60q v60p", doc.includes("v6.0Q") && doc.includes("v6.0P"));
}

// --- code runtime checks (v6.0R present, not wired) ---
{
  ok("flags module exists", flagsSrc.includes("resolveSalesBrainRuntimeFlags"));
  ok("shadow runtime module exists", runtimeSrc.includes("evaluateSalesBrainShadowRuntime"));
  ok("realProvider network disabled", /SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED\s*=\s*false/.test(realProviderSrc));
  ok("useChat no salesBrainShadowRuntime", !useChat.includes("salesBrainShadowRuntime"));
  ok("useChat no salesBrainRuntimeFlags", !useChat.includes("salesBrainRuntimeFlags"));
  ok("orchestrator no shadow runtime", !orch.includes("salesBrainShadowRuntime"));
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
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v60s script", pkg.includes("test:v60s-shadow-runtime-wiring-smoke-readiness-not-deployed"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60s-shadow-runtime-wiring-smoke-readiness-not-deployed.mts")
  );
}

console.log("\nDone v6.0S Shadow Runtime Wiring Smoke Readiness / Not Deployed tests.");
if (process.exitCode) process.exit(process.exitCode);
