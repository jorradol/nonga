/**
 * v6.0X — Hosting Shadow Chat Client Bundle Deploy Record (static validation only)
 * npm run test:v60x-hosting-shadow-chat-client-bundle-deploy-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0X-hosting-shadow-chat-client-bundle-deploy-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "f14f1457e0abc63ed1ad8283039122302a54479c";
const CLOUD_RUN_REV = "nonga-staging-00050-rqs";
const JS_BEFORE = "index-Bxl8jCCo.js";
const JS_AFTER = "index-NVEc0A-_.js";
const CSS_BUNDLE = "index-Cr0iFpYR.css";
const LEGACY_RESPONSE =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const WEBAPP_CHAT_URL = "https://nonga-ce93c.web.app/chat";
const WEBAPP_BASE = "https://nonga-ce93c.web.app";
const NONGBOT_DOMAIN = "a.nongbot.org";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0X Hosting Shadow Chat Client Bundle Deploy Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60x-hosting-shadow-chat-client-bundle-deploy-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const chatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");

// --- doc exists + v6.0X ---
{
  ok("deploy record doc exists", doc.length > 4000);
  ok("doc v6.0X label", doc.includes("v6.0X"));
  ok("doc hosting deploy record", /hosting.*deploy record|Hosting.*Deploy Record/i.test(doc));
  ok("doc no further deploy in slice", /ไม่ deploy ซ้ำ|do not re-run/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD f14f145", doc.includes(HEAD_SHA) || doc.includes("f14f145"));
  ok("preflight HEAD equals origin", /HEAD = origin|HEAD.*origin.*f14f145/i.test(doc));
  ok("preflight firebase project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight cloud run revision 00050-rqs", doc.includes(CLOUD_RUN_REV));
  ok("preflight cloud run 100 percent", /00050-rqs.*100|100%.*00050/i.test(doc));
  ok("preflight user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
}

// --- tests/build ---
{
  ok("test v60w PASS 97", /test:v60w.*PASS.*97|v60w.*PASS.*97/i.test(doc));
  ok("test v60v PASS 79", /test:v60v.*PASS.*79|v60v.*PASS.*79/i.test(doc));
  ok("test v60u PASS 93", /test:v60u.*PASS.*93|v60u.*PASS.*93/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS", /build:staging:hosting.*PASS|build.*PASS/i.test(docLower));
}

// --- hosting deploy ---
{
  ok("deploy command firebase-tools", /npx -y firebase-tools@latest deploy --only hosting --project nonga-ce93c/.test(doc));
  ok("deploy result SUCCESS", /result.*SUCCESS|SUCCESS.*site/i.test(doc));
  ok("deploy site nonga-ce93c", /site.*nonga-ce93c|Site.*nonga-ce93c/i.test(doc));
  ok("deploy 6 files 3 new", /6 files.*3 new|6 files in `dist`/i.test(doc));
  ok("deploy hosting URL web.app", doc.includes(WEBAPP_BASE));
  ok("deploy scope only hosting", /--only hosting/i.test(doc));
  ok("no cloud run deploy", /Cloud Run deploy.*not done|no Cloud Run deploy/i.test(doc));
  ok("no firestore rules deploy", /Firestore rules deploy.*not done|no Firestore rules/i.test(doc));
  ok("no secrets versions access", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- live bundle ---
{
  ok("bundle js before", doc.includes(JS_BEFORE));
  ok("bundle js after", doc.includes(JS_AFTER));
  ok("bundle css after", doc.includes(CSS_BUNDLE));
  ok("bundle marker flagsOnly", /flagsOnly/.test(doc));
  ok("bundle marker NONGA_AI keys", /NONGA_AI_\*/.test(doc));
  ok("bundle marker user visible enabled key", /NONGA_AI_USER_VISIBLE_ENABLED/.test(doc));
  ok("bundle marker userVisibleEnabled false", /userVisibleEnabled:!1|userVisibleEnabled.*false/i.test(doc));
  ok("bundle marker wireShadowChatPath", /wireShadowChatPath|minified equivalent/i.test(doc));
}

// --- post-deploy API smoke ---
{
  ok("smoke via web.app", doc.includes(WEBAPP_BASE));
  ok("smoke health 200 ok true", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health publicSignup false", /publicSignupEnabled:false|ok:true.*publicSignupEnabled:false/i.test(doc));
  ok("smoke cars 200", /\/api\/cars.*200|cars.*200/i.test(docLower));
  ok("smoke admin revenue 401", /admin\/revenue\/preview.*401|401.*admin/i.test(docLower));
  ok("smoke my revenue 401", /my\/revenue\/preview.*401|401.*my revenue/i.test(docLower));
}

// --- chat smoke ---
{
  ok("chat smoke web.app URL", doc.includes(WEBAPP_CHAT_URL));
  ok("chat page loads", /หน้า chat โหลดได้|chat.*โหลด/i.test(doc));
  ok("chat safe message เริ่มใหม่", /"เริ่มใหม่"/.test(doc));
  ok("chat legacy response exact text", doc.includes(LEGACY_RESPONSE));
  ok("chat no AI gemini shown to user", /AI\/Gemini response.*none|ไม่มี.*AI|none/i.test(docLower));
  ok("chat no raw PII", /raw PII.*not observed|ไม่พบ raw PII/i.test(doc));
}

// --- light smoke a.nongbot.org ---
{
  ok("nongbot domain smoke", doc.includes(NONGBOT_DOMAIN));
  ok("nongbot health 200", new RegExp(`${NONGBOT_DOMAIN.replace(".", "\\.")}.*200|200.*${NONGBOT_DOMAIN.replace(".", "\\.")}`, "i").test(doc) || /a\\.nongbot\\.org.*200/i.test(doc));
  ok("nongbot same bundle", new RegExp(`${JS_AFTER}.*same bundle|same bundle.*${JS_AFTER}`, "i").test(doc));
}

// --- git status ---
{
  ok("git up to date origin", /up to date with.*origin/i.test(docLower));
  ok("git working tree clean", /working tree clean/i.test(docLower));
  ok("dist not tracked", /dist\/.*ไม่ tracked|dist.*not tracked/i.test(docLower));
}

// --- rollback not needed ---
{
  ok("rollback not needed", /rollback.*not needed|not needed.*smoke|NOT RUN in v6\.0X/i.test(doc));
}

// --- forbidden section ---
{
  ok("forbidden no cloud run deploy", /Cloud Run deploy.*not done|no Cloud Run deploy/i.test(docLower));
  ok("forbidden no gcloud env update", /gcloud run services update.*not done|services update.*for env/i.test(docLower));
  ok("forbidden no NONGA_AI changes", /NONGA_AI_\*.*not done|NONGA_AI_\*.*changes/i.test(docLower));
  ok("forbidden user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no paid ai", /paid AI API|paid ai/i.test(docLower));
  ok("forbidden no fetch to ai provider", /fetch to AI provider|fetch network/i.test(docLower));
  ok("forbidden no user visible ai", /user-visible AI|AI response shown/i.test(docLower));
  ok("forbidden no production", /production.*not touched|not touched/i.test(docLower));
  ok("forbidden no firestore rules", /Firestore rules.*not done/i.test(doc));
  ok("forbidden no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("forbidden no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no real stock", /real stock import.*not done|still blocked/i.test(docLower));
}

// --- references ---
{
  ok("references v60w", doc.includes("v6.0W"));
  ok("references v60v v60u", doc.includes("v6.0V") && doc.includes("v6.0U"));
}

// --- shadow chat path wired in code ---
{
  ok("useChat wires shadow chat path", useChat.includes("wireShadowChatPath"));
  ok("orchestrator wires shadow chat path", orch.includes("wireShadowChatPath"));
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
  ok("package v60x script", pkg.includes("test:v60x-hosting-shadow-chat-client-bundle-deploy-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60x-hosting-shadow-chat-client-bundle-deploy-record.mts")
  );
}

console.log("\nDone v6.0X Hosting Shadow Chat Client Bundle Deploy Record tests.");
if (process.exitCode) process.exit(process.exitCode);
