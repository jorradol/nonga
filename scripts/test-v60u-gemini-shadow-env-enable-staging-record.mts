/**
 * v6.0U — Gemini Shadow Env Enable Staging Record (static validation only)
 * npm run test:v60u-gemini-shadow-env-enable-staging-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0U-gemini-shadow-env-enable-staging-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "b25c2c327f0138d2a51a363fc3fb7b432563a35b";
const PREV_REV = "nonga-staging-00048-nwc";
const NEW_REV = "nonga-staging-00049-nsd";
const IMAGE_TAG = "v6.0T-shadow-runtime-reader-db29970";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0U Gemini Shadow Env Enable Staging Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60u-gemini-shadow-env-enable-staging-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");

// --- doc exists + v6.0U ---
{
  ok("env enable record doc exists", doc.length > 4000);
  ok("doc v6.0U label", doc.includes("v6.0U"));
  ok("doc staging env enable record", /env enable|Env Enable/i.test(doc));
  ok("doc no further deploy in slice", /ไม่ deploy ซ้ำ|no new.*image deploy|env-only/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD b25c2c3", doc.includes(HEAD_SHA) || doc.includes("b25c2c3"));
  ok("preflight HEAD equals origin", /HEAD = origin|HEAD.*origin.*b25c2c/i.test(doc));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight previous revision 00048-nwc", doc.includes(PREV_REV));
  ok("preflight image v6.0T", doc.includes(IMAGE_TAG));
  ok("preflight AI flags before absent", /AI flags before enable.*absent|before enable.*absent\/off/i.test(docLower));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("preflight health 200", /pre-enable.*\/api\/health.*200|\/api\/health.*200/i.test(docLower));
  ok("preflight gemini secret ref metadata", /GEMINI_API_KEY.*gemini-api-key:latest|gemini-api-key:latest.*metadata/i.test(doc));
}

// --- enable command ---
{
  ok("enable gcloud run services update", /gcloud run services update nonga-staging/.test(doc));
  ok("enable project nonga-ce93c", /--project=nonga-ce93c/.test(doc));
  ok("enable region asia-southeast1", /--region=asia-southeast1/.test(doc));
  ok("enable update-env-vars", /--update-env-vars=/.test(doc));
  ok("enable NONGA_AI_PROVIDER gemini", /NONGA_AI_PROVIDER=gemini/.test(doc));
  ok("enable NONGA_AI_MODE high", /NONGA_AI_MODE=high/.test(doc));
  ok("enable NONGA_AI_FIRST_ENABLED true", /NONGA_AI_FIRST_ENABLED=true/.test(doc));
  ok("enable NONGA_AI_SHADOW_MODE_ENABLED true", /NONGA_AI_SHADOW_MODE_ENABLED=true/.test(doc));
  ok("enable NONGA_AI_USER_VISIBLE_ENABLED false", /NONGA_AI_USER_VISIBLE_ENABLED=false/.test(doc));
  ok("enable NONGA_AI_EMERGENCY_KILL_SWITCH false", /NONGA_AI_EMERGENCY_KILL_SWITCH=false/.test(doc));
  ok("enable NONGA_AI_BUDGET_DAILY_LIMIT 5", /NONGA_AI_BUDGET_DAILY_LIMIT=5/.test(doc));
  ok("enable NONGA_AI_BUDGET_MONTHLY_LIMIT 50", /NONGA_AI_BUDGET_MONTHLY_LIMIT=50/.test(doc));
}

// --- revision change ---
{
  ok("previous revision 00048-nwc", doc.includes(PREV_REV));
  ok("new revision 00049-nsd", doc.includes(NEW_REV));
  ok("traffic 100 percent to 00049", /100%.*00049|traffic.*100.*00049/i.test(doc));
  ok("image unchanged v6.0T", /image.*unchanged|unchanged.*v6\.0T/i.test(docLower));
}

// --- AI flags after enable ---
{
  ok("after provider gemini", /\| `NONGA_AI_PROVIDER` \| `gemini`/.test(doc));
  ok("after mode high", /\| `NONGA_AI_MODE` \| `high`/.test(doc));
  ok("after ai first true", /\| `NONGA_AI_FIRST_ENABLED` \| `true`/.test(doc));
  ok("after shadow true", /\| `NONGA_AI_SHADOW_MODE_ENABLED` \| `true`/.test(doc));
  ok("after user visible false", /\| `NONGA_AI_USER_VISIBLE_ENABLED` \| \*\*`false`\*\*/.test(doc));
  ok("after kill switch false", /\| `NONGA_AI_EMERGENCY_KILL_SWITCH` \| `false`/.test(doc));
  ok("after daily budget 5", /\| `NONGA_AI_BUDGET_DAILY_LIMIT` \| `5`/.test(doc));
  ok("after monthly budget 50", /\| `NONGA_AI_BUDGET_MONTHLY_LIMIT` \| `50`/.test(doc));
  ok("after public signup false", /VITE_NONGA_PUBLIC_SIGNUP_ENABLED.*false/i.test(doc));
  ok("after gemini secret ref only", /GEMINI_API_KEY.*gemini-api-key:latest.*ref/i.test(docLower));
}

// --- post-enable smoke ---
{
  ok("smoke new revision 100%", /00049-nsd.*100|100%.*00049/i.test(doc));
  ok("smoke health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke publicSignup false", /publicSignupEnabled:false/i.test(doc));
  ok("smoke cars 200", /\/api\/cars.*200|cars.*200/i.test(docLower));
  ok("smoke admin revenue 401", /admin\/revenue\/preview.*401|401.*admin/i.test(docLower));
  ok("smoke my revenue 401", /my\/revenue\/preview.*401|401.*my revenue/i.test(docLower));
  ok("smoke v60r test PASS", /test:v60r.*PASS|v60r.*PASS/i.test(doc));
  ok("smoke no gemini provider call", /ไม่เรียก Gemini provider|no.*gemini provider/i.test(docLower));
  ok("smoke no rollback needed", /rollback not needed|no rollback needed|ไม่จำเป็น/i.test(docLower));
}

// --- guardrails ---
{
  ok("guardrail no user visible ai", /user-visible AI response.*none|no AI response shown/i.test(docLower));
  ok("guardrail shadow not wired useChat", /useChat.*orchestrator|not wired.*useChat/i.test(docLower));
  ok("guardrail no paid ai call", /paid AI API.*not called|no paid ai/i.test(docLower));
  ok("guardrail no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("guardrail no lead reveal regression", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("guardrail no real stock import", /real stock import.*not done|still blocked/i.test(docLower));
  ok("guardrail public signup false", /public signup.*false/i.test(docLower));
}

// --- important notes ---
{
  ok("note env flags ready staging", /Env flags พร้อมแล้วบน staging/i.test(doc));
  ok("note v60r mock shadow not wired", /v6\.0R.*mock shadow.*ไม่ wired|mock shadow.*chat path/i.test(doc));
  ok("note runtime reader preparation", /เตรียม runtime reader/i.test(doc));
  ok("note no user visible ai response yet", /ยังไม่หมายความว่าผู้ใช้จะเห็น AI response/i.test(doc));
  ok("note no live gemini call yet", /ยังไม่หมายความว่ามี live Gemini call/i.test(doc));
  ok("note wiring slice separate", /slice wiring.*real provider enable/i.test(docLower));
}

// --- rollback prepared not run ---
{
  ok("rollback prepared not needed", /Prepared.*Not Needed|not needed|NOT RUN in v6\.0U/i.test(doc));
  ok("rollback update command documented", /gcloud run services update nonga-staging/.test(doc));
}

// --- forbidden section ---
{
  ok("forbidden no image deploy", /image.*deploy.*not done|no new.*image/i.test(docLower));
  ok("forbidden no hosting deploy", /Hosting deploy.*not done/i.test(doc));
  ok("forbidden no firestore rules", /Firestore rules.*not done/i.test(doc));
  ok("forbidden user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no paid ai", /paid AI API|paid ai/i.test(docLower));
  ok("forbidden no user visible ai", /user-visible AI|AI response shown/i.test(docLower));
  ok("forbidden no production", /production.*not touched|not touched/i.test(docLower));
  ok("forbidden no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("forbidden no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no real stock", /real stock import.*not done|still blocked/i.test(docLower));
}

// --- references ---
{
  ok("references v60p", doc.includes("v6.0P"));
  ok("references v60t v60r v60q", doc.includes("v6.0T") && doc.includes("v6.0R") && doc.includes("v6.0Q"));
}

// --- v6.0U record: shadow not wired at enable time (doc only) ---
{
  ok("doc shadow not wired at v60u", /not wired.*useChat|ยังไม่ wired/i.test(docLower));
  ok("doc no user visible ai at v60u", /user-visible AI response.*none|no AI response shown/i.test(docLower));
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
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v60u script", pkg.includes("test:v60u-gemini-shadow-env-enable-staging-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60u-gemini-shadow-env-enable-staging-record.mts")
  );
}

console.log("\nDone v6.0U Gemini Shadow Env Enable Staging Record tests.");
if (process.exitCode) process.exit(process.exitCode);
