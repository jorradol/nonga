/**
 * v6.1A — Staging Shadow Integration Smoke / User-visible Still Off (static validation only)
 * npm run test:v61a-staging-shadow-integration-smoke-user-visible-still-off
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.1A-staging-shadow-integration-smoke-user-visible-still-off.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "5a72d87d85b16727f231cc61cf7d29ebb45fd5b6";
const CLOUD_RUN_REV = "nonga-staging-00050-rqs";
const PRIMARY_BUNDLE = "index-NVEc0A-_.js";
const CLOUD_RUN_BUNDLE = "index-D1gO2JxF.js";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const DEALER_CLARIFY =
  "ได้ครับคุณพี่ ขอรายละเอียดเพิ่มนิดนึงก่อนนะครับ";
const WEBAPP_BASE = "https://nonga-ce93c.web.app";
const WEBAPP_CHAT_URL = "https://nonga-ce93c.web.app/chat";
const CLOUD_RUN_BASE = "https://nonga-staging-dpf3rexexq-as.a.run.app";
const CLOUD_RUN_CHAT_URL = "https://nonga-staging-dpf3rexexq-as.a.run.app/chat";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1A Staging Shadow Integration Smoke / User-visible Still Off ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61a-staging-shadow-integration-smoke-user-visible-still-off.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const chatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");

// --- doc exists + v6.1A ---
{
  ok("smoke record doc exists", doc.length > 5000);
  ok("doc v6.1A label", doc.includes("v6.1A"));
  ok("doc staging shadow integration smoke", /staging shadow integration smoke/i.test(doc));
  ok("doc user-visible still off", /user-visible still off|user-visible response ยัง legacy/i.test(docLower));
  ok("doc smoke-only slice", /smoke-only|read-only smoke/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD 5a72d87", doc.includes(HEAD_SHA) || doc.includes("5a72d87"));
  ok("preflight HEAD equals origin", /HEAD = origin|HEAD.*origin.*5a72d87/i.test(doc));
  ok("preflight firebase project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight cloud run revision 00050-rqs", doc.includes(CLOUD_RUN_REV));
  ok("preflight cloud run 100 percent", /00050-rqs.*100|100%.*00050/i.test(doc));
  ok("preflight primary bundle NVEc0A", doc.includes(PRIMARY_BUNDLE));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("preflight user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
}

// --- NONGA_AI flags read-only ---
{
  ok("flag provider gemini", /NONGA_AI_PROVIDER.*gemini|`gemini`/i.test(doc));
  ok("flag mode high", /NONGA_AI_MODE.*high|`high`/i.test(doc));
  ok("flag ai first true", /NONGA_AI_FIRST_ENABLED.*true/i.test(doc));
  ok("flag shadow true", /NONGA_AI_SHADOW_MODE_ENABLED.*true/i.test(doc));
  ok("flag kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("flag daily budget 5", /NONGA_AI_BUDGET_DAILY_LIMIT.*5/i.test(doc));
  ok("flag monthly budget 50", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*50/i.test(doc));
  ok("gemini secret ref metadata only", /secret ref.*gemini-api-key|gemini-api-key.*secret ref/i.test(docLower));
  ok("no secrets versions access", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- tests/build ---
{
  ok("test v60z PASS", /test:v60z.*PASS|v60z.*PASS/i.test(doc));
  ok("test v60y PASS", /test:v60y.*PASS|v60y.*PASS/i.test(doc));
  ok("test v60v PASS", /test:v60v.*PASS|v60v.*PASS/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS", /build:staging:hosting.*PASS|build.*PASS/i.test(docLower));
  ok("local build matches primary bundle", new RegExp(`${PRIMARY_BUNDLE}.*matches live primary|matches live primary.*${PRIMARY_BUNDLE}`, "i").test(doc));
}

// --- bundle / revision notes ---
{
  ok("primary hosting bundle", doc.includes(PRIMARY_BUNDLE));
  ok("cloud run direct bundle D1gO2JxF", doc.includes(CLOUD_RUN_BUNDLE));
  ok("bundle difference expected note", /bundle difference.*expected|ต่างกันคาดหวัง/i.test(docLower));
  ok("v61a no cloud run deploy", /did not deploy Cloud Run|v6\.1A did \*\*not\*\* deploy Cloud Run|ไม่ deploy Cloud Run/i.test(doc));
}

// --- API smoke primary ---
{
  ok("smoke via web.app", doc.includes(WEBAPP_BASE));
  ok("smoke health 200 ok true", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health publicSignup false", /publicSignupEnabled:false|ok:true.*publicSignupEnabled:false/i.test(doc));
  ok("smoke cars 200 count 17", /\/api\/cars.*200|cars.*200/i.test(docLower) && /count:17|count.*17/i.test(doc));
  ok("smoke admin revenue 401", /admin\/revenue\/preview.*401|401.*admin/i.test(docLower));
  ok("smoke my revenue 401", /my\/revenue\/preview.*401|401.*my revenue/i.test(docLower));
}

// --- API smoke cloud run direct ---
{
  ok("cloud run direct base URL", doc.includes(CLOUD_RUN_BASE));
  ok("cloud run health 200", /cloud run direct.*200|nonga-staging-dpf3rexexq.*200/i.test(docLower));
  ok("cloud run cars 200", /cloud run direct.*cars|nonga-staging-dpf3rexexq.*cars/i.test(docLower));
}

// --- chat smoke case 1 ---
{
  ok("chat smoke web.app URL", doc.includes(WEBAPP_CHAT_URL));
  ok("chat case 1 message เริ่มใหม่", /"เริ่มใหม่"/.test(doc));
  ok("chat case 1 legacy response exact", doc.includes(LEGACY_START_OVER));
  ok("chat no shadow AI replacement", /shadow.*replacement.*none|AI\/Gemini shadow replacement.*none|ไม่มี shadow AI/i.test(docLower));
  ok("chat no raw PII", /raw PII.*not observed|ไม่พบ raw PII/i.test(doc));
}

// --- chat smoke case 2 buyer ---
{
  ok("chat case 2 buyer message", /"งบ 4 แสน มีรถอะไรน่าเล่น"/.test(doc));
  ok("chat case 2 legacy buyer orchestrator", /legacy buyer search orchestrator|buyer search orchestrator/i.test(docLower));
  ok("chat case 2 staging cars listed", /Toyota Corolla|Corolla.*Altis.*Camry/i.test(doc));
  ok("chat case 2 no shadow AI answer", /shadow AI answer replacement.*none|no shadow AI answer/i.test(docLower));
}

// --- chat smoke case 3 dealer ---
{
  ok("chat case 3 dealer message", /"มีไฟล์รถหลายคันอยากเอาเข้าระบบ"/.test(doc));
  ok("chat case 3 legacy clarifying response", doc.includes(DEALER_CLARIFY));
  ok("chat case 3 asks budget brand type", /งบประมาณ.*ยี่ห้อ|ยี่ห้อ\/รุ่น/i.test(doc));
  ok("chat case 3 legacy acceptable", /legacy acceptable/i.test(docLower));
  ok("chat case 3 no shadow output", /shadow AI output replacement.*none|no shadow AI output/i.test(docLower));
}

// --- optional cloud run direct chat ---
{
  ok("cloud run chat URL", doc.includes(CLOUD_RUN_CHAT_URL));
  ok("cloud run case 1 same legacy", /same text as primary URL|exact legacy.*primary URL/i.test(doc));
}

// --- shadow/log/network safety ---
{
  ok("safety no AI shown to user", /AI response shown to user.*none|legacy 100%/i.test(docLower));
  ok("safety zero direct provider requests", /0 requests|generativelanguage.*0/i.test(docLower));
  ok("safety no secret value access", /secret value access.*not done|not done.*secret value/i.test(docLower));
  ok("safety shadow user-visible not shown", /shadow sales-brain user-visible.*not shown|flags-only/i.test(docLower));
  ok("memory sidebar legacy note", /\/api\/gemini\/analyze-memory/.test(doc));
  ok("memory sidebar not shadow replacement", /memory sidebar.*legacy|legacy memory sidebar|not.*shadow chat replacement/i.test(docLower));
  ok("no paid gemini from shadow path", /no paid Gemini.*shadow chat path|paid Gemini API from shadow chat path.*not/i.test(docLower));
}

// --- git status ---
{
  ok("git up to date origin", /up to date with.*origin/i.test(docLower));
  ok("git working tree clean after smoke", /working tree clean/i.test(docLower));
}

// --- rollback not needed ---
{
  ok("rollback not needed", /rollback.*not needed|not needed.*smoke/i.test(docLower));
  ok("no rollback run", /no rollback was run|no rollback run/i.test(docLower));
  ok("no regression user-visible AI", /no regression user-visible AI/i.test(docLower));
}

// --- forbidden section ---
{
  ok("forbidden no cloud run deploy", /Cloud Run deploy.*not done|no Cloud Run deploy/i.test(docLower));
  ok("forbidden no hosting deploy", /Hosting deploy.*not done|Firebase Hosting deploy.*not done/i.test(docLower));
  ok("forbidden no firestore rules", /Firestore rules.*not done/i.test(doc));
  ok("forbidden no gcloud env update", /gcloud run services update.*not done|services update.*for env/i.test(docLower));
  ok("forbidden no NONGA_AI changes", /NONGA_AI_\*.*not done|NONGA_AI_\*.*changes/i.test(docLower));
  ok("forbidden user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no paid gemini shadow path", /paid Gemini.*shadow|shadow chat path.*not done/i.test(docLower));
  ok("forbidden no fetch to ai provider shadow", /fetch to AI provider.*shadow|fetch network/i.test(docLower));
  ok("forbidden no user visible ai", /user-visible AI|AI response shown to user/i.test(docLower));
  ok("forbidden no production", /production.*not touched|not touched/i.test(docLower));
  ok("forbidden no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("forbidden no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no real stock", /real stock import.*not done|still blocked/i.test(docLower));
  ok("forbidden no user-visible runtime change", /user-visible runtime behavior change.*not done/i.test(docLower));
}

// --- references ---
{
  ok("references v60z", doc.includes("v6.0Z"));
  ok("references v60y v60x", doc.includes("v6.0Y") && doc.includes("v6.0X"));
  ok("references v60w v60v v60u", doc.includes("v6.0W") && doc.includes("v6.0V") && doc.includes("v6.0U"));
}

// --- shadow chat path code unchanged ---
{
  ok("chat path returns legacy unchanged", /legacyUserVisibleText|legacyUserVisibleResponse/i.test(chatPath));
  ok("chat path flagsOnly debug", /flagsOnly/i.test(chatPath));
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
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v61a script",
    pkg.includes("test:v61a-staging-shadow-integration-smoke-user-visible-still-off")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61a-staging-shadow-integration-smoke-user-visible-still-off.mts")
  );
}

console.log("\nDone v6.1A Staging Shadow Integration Smoke / User-visible Still Off tests.");
if (process.exitCode) process.exit(process.exitCode);
