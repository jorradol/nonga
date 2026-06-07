/**
 * v6.0Q — Gemini Shadow Live Preflight Read-only (static validation only)
 * npm run test:v60q-gemini-shadow-live-preflight-read-only
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DOC_PATH = "docs/v6.0Q-gemini-shadow-live-preflight-read-only.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const APPROVAL_PHRASE =
  "อนุมัติให้เปิด Gemini shadow mode บน staging แบบไม่แสดงคำตอบ AI ให้ผู้ใช้ ตาม v6.0P";

const HEAD_SHA = "eaee8869a01df7ff03b82da1403275c930739c75";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function fileHasShadowEnv(dir: string): boolean {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules" && !ent.name.startsWith(".")) {
      if (fileHasShadowEnv(p)) return true;
    } else if (ent.isFile() && /\.(ts|tsx|mts)$/.test(ent.name)) {
      const t = readFileSync(p, "utf8");
      if (/NONGA_AI_SHADOW|NONGA_AI_USER_VISIBLE/.test(t)) return true;
    }
  }
  return false;
}

console.log("=== v6.0Q Gemini Shadow Live Preflight Read-only ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60q-gemini-shadow-live-preflight-read-only.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const useChatSrc = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const realProviderSrc = readFileSync("src/services/ai/salesBrainRealProvider.ts", "utf8");
const srcHasShadowEnv = fileHasShadowEnv("src");

// --- doc exists + v6.0Q ---
{
  ok("execution doc exists", doc.length > 5000);
  ok("doc v6.0Q label", doc.includes("v6.0Q"));
  ok("doc live preflight title", /live preflight|Live Preflight/i.test(doc));
  ok("doc no runtime change", /ยังไม่เปลี่ยน runtime|user-visible runtime behavior/i.test(docLower));
}

// --- git baseline ---
{
  ok("git clean recorded", /git status.*clean|working tree clean/i.test(docLower));
  ok("branch feature/chat-image-attachment-v1", doc.includes("feature/chat-image-attachment-v1"));
  ok("HEAD sha eaee886", doc.includes(HEAD_SHA) || doc.includes("eaee886"));
  ok("HEAD equals origin", /HEAD = origin|HEAD.*origin.*eaee886/i.test(doc));
}

// --- cloud run staging ---
{
  ok("project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("service nonga-staging", doc.includes("nonga-staging"));
  ok("region asia-southeast1", doc.includes("asia-southeast1"));
  ok("revision nonga-staging-00047-7xc", doc.includes("nonga-staging-00047-7xc"));
  ok("public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("NONGA_DATA_BACKEND firestore", /NONGA_DATA_BACKEND.*firestore/i.test(doc));
  ok("NONGA_IMAGE_BACKEND firebase-storage", /NONGA_IMAGE_BACKEND.*firebase-storage/i.test(doc));
  ok("GEMINI_API_KEY maps gemini-api-key latest", /GEMINI_API_KEY.*gemini-api-key.*latest|gemini-api-key.*latest/i.test(doc));
}

// --- AI flags absent ---
{
  ok("NONGA_AI_PROVIDER absent", /NONGA_AI_PROVIDER.*absent/i.test(doc));
  ok("NONGA_AI_MODE absent", /NONGA_AI_MODE.*absent/i.test(doc));
  ok("NONGA_AI_FIRST_ENABLED absent", /NONGA_AI_FIRST_ENABLED.*absent/i.test(doc));
  ok("NONGA_AI_SHADOW_MODE_ENABLED absent", /NONGA_AI_SHADOW_MODE_ENABLED.*absent/i.test(doc));
  ok("NONGA_AI_USER_VISIBLE_ENABLED absent", /NONGA_AI_USER_VISIBLE_ENABLED.*absent/i.test(doc));
  ok("NONGA_AI_EMERGENCY_KILL_SWITCH absent", /NONGA_AI_EMERGENCY_KILL_SWITCH.*absent/i.test(doc));
  ok("NONGA_AI_BUDGET_DAILY_LIMIT absent", /NONGA_AI_BUDGET_DAILY_LIMIT.*absent/i.test(doc));
  ok("NONGA_AI_BUDGET_MONTHLY_LIMIT absent", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*absent/i.test(doc));
  ok("shadow not enabled summary", /shadow.*ยังไม่เปิด|shadow.*not enabled/i.test(docLower));
}

// --- secret metadata ---
{
  ok("gemini-api-key exists", /gemini-api-key.*exists|exists.*gemini-api-key/i.test(docLower));
  ok("created 2026-05-26T00:28:19", doc.includes("2026-05-26T00:28:19"));
  ok("replication automatic", /replication.*automatic|automatic.*replication/i.test(docLower));
  ok("no secrets versions access", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
  ok("no secret values in record", /no secret values|ไม่มีค่า secret/i.test(docLower));
}

// --- API smoke ---
{
  ok("health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("publicSignupEnabled false in smoke", /publicSignupEnabled.*false/i.test(doc));
}

// --- budget recommendation ---
{
  ok("budget daily 5", /NONGA_AI_BUDGET_DAILY_LIMIT.*`5`|BUDGET_DAILY_LIMIT=5|daily=5/i.test(doc));
  ok("budget monthly 50", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*`50`|BUDGET_MONTHLY_LIMIT=50|monthly=50/i.test(doc));
  ok("budget not applied v60q", /not set in v6\.0Q|not applied|ยังไม่ set env จริง/i.test(docLower));
  ok("no budget no enable", /ไม่มี budget.*ห้ามเปิด|no budget.*no enable|ไม่มี budget = ห้ามเปิด/i.test(docLower));
}

// --- approval gate ---
{
  ok("approval phrase v60p", doc.includes(APPROVAL_PHRASE));
  ok("phrase not received", /not received|ยังไม่ได้รับ/i.test(docLower));
  ok("block enablement until phrase", /ห้ามรัน enablement|blocked.*until phrase/i.test(docLower));
}

// --- DO NOT RUN YET enable ---
{
  ok("enable DO NOT RUN YET", /Enablement Command.*DO NOT RUN YET|DO NOT RUN YET.*Gemini shadow/i.test(doc));
  ok("enable gcloud run services update", /gcloud run services update nonga-staging/.test(doc));
  ok("enable project region", doc.includes("--project=nonga-ce93c") && doc.includes("--region=asia-southeast1"));
  ok("enable NONGA_AI_PROVIDER gemini", /NONGA_AI_PROVIDER=gemini/.test(doc));
  ok("enable NONGA_AI_MODE high", /NONGA_AI_MODE=high/.test(doc));
  ok("enable NONGA_AI_FIRST_ENABLED true", /NONGA_AI_FIRST_ENABLED=true/.test(doc));
  ok("enable NONGA_AI_SHADOW_MODE_ENABLED true", /NONGA_AI_SHADOW_MODE_ENABLED=true/.test(doc));
  ok("enable NONGA_AI_USER_VISIBLE_ENABLED false", /NONGA_AI_USER_VISIBLE_ENABLED=false/.test(doc));
  ok("enable kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH=false/.test(doc));
  ok("enable budget daily 5", /NONGA_AI_BUDGET_DAILY_LIMIT=5/.test(doc));
  ok("enable budget monthly 50", /NONGA_AI_BUDGET_MONTHLY_LIMIT=50/.test(doc));
}

// --- DO NOT RUN YET rollback ---
{
  ok("rollback DO NOT RUN YET", /Rollback Command.*DO NOT RUN YET/i.test(doc));
  ok("rollback kill switch true", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/.test(doc));
  ok("rollback shadow false", /NONGA_AI_SHADOW_MODE_ENABLED=false/.test(doc));
  ok("rollback AI first false", /NONGA_AI_FIRST_ENABLED=false/.test(doc));
  ok("rollback mode off", /NONGA_AI_MODE=off/.test(doc));
  ok("rollback user visible false", /NONGA_AI_USER_VISIBLE_ENABLED=false/.test(doc));
}

// --- readiness gaps ---
{
  ok("gap approval phrase not received", /approval phrase.*ยังไม่ได้รับ|phrase.*not received/i.test(docLower));
  ok("gap budget env absent", /budget env.*absent|BUDGET.*still.*absent|budget env on cloud run/i.test(docLower));
  ok("gap shadow flags expected absent", /shadow env flags absent.*expected|expected pre-enable/i.test(docLower));
  ok("gap runtime shadow wiring", /runtime shadow wiring|NONGA_AI_SHADOW.*not read in src/i.test(docLower));
  ok("gap slice wiring deploy separate", /slice wiring.*deploy|wiring \+ deploy/i.test(docLower));
  ok("gap real stock blocked", /real stock import.*blocked|stock import.*blocked/i.test(docLower));
  ok("gap shadow smoke conversation smoke", /shadow smoke.*AI conversation smoke/i.test(docLower));
}

// --- forbidden section ---
{
  ok("forbidden no deploy", /ไม่ deploy|Deploy Cloud Run/i.test(doc));
  ok("forbidden no gcloud update in slice", /gcloud run services update.*not done|❌ not done/i.test(doc));
  ok("forbidden no paid ai", /ไม่เรียก paid AI|paid AI API/i.test(doc));
  ok("forbidden no production", /Touch production|แตะ production/i.test(docLower));
  ok("forbidden no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("forbidden no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbid secrets versions access doc", /secrets versions access/i.test(doc));
}

// --- references ---
{
  ok("references v60p", doc.includes("v6.0P"));
  ok("references v60o v60n", doc.includes("v6.0O") && doc.includes("v6.0N"));
}

// --- code runtime checks ---
{
  ok("realProvider network disabled", /SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED\s*=\s*false/.test(realProviderSrc));
  ok("useChat no salesBrain", !/salesBrain/i.test(useChatSrc));
  ok("src no NONGA_AI_SHADOW reader yet", !srcHasShadowEnv);
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
  ok("package v60q script", pkg.includes("test:v60q-gemini-shadow-live-preflight-read-only"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60q-gemini-shadow-live-preflight-read-only.mts")
  );
}

console.log("\nDone v6.0Q Gemini Shadow Live Preflight Read-only tests.");
if (process.exitCode) process.exit(process.exitCode);
