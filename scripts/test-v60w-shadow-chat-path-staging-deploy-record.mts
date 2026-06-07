/**
 * v6.0W — Shadow Chat Path Staging Deploy Record (static validation only)
 * npm run test:v60w-shadow-chat-path-staging-deploy-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0W-shadow-chat-path-staging-deploy-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "d4cecd6855c7aff1b500c80529c54bb077e96842";
const BUILD_ID = "2a8f8699-1356-4fe4-aa0a-1ec6278cc50d";
const IMAGE_URI =
  "asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v6.0W-shadow-chat-path-legacy-visible-d4cecd6";
const DIGEST = "sha256:887a7c7d7ec346c96d0e8d6d871a57d05e89ccd4c9613f743e98954d7a845639";
const PREV_REV = "nonga-staging-00049-nsd";
const NEW_REV = "nonga-staging-00050-rqs";
const PREV_IMAGE = "v6.0T-shadow-runtime-reader-db29970";
const LEGACY_RESPONSE =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const CLOUD_RUN_CHAT_URL =
  "https://nonga-staging-265743710806.asia-southeast1.run.app/chat";
const JS_BUNDLE = "index-D1gO2JxF.js";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0W Shadow Chat Path Staging Deploy Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60w-shadow-chat-path-staging-deploy-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const chatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");

// --- doc exists + v6.0W ---
{
  ok("deploy record doc exists", doc.length > 5000);
  ok("doc v6.0W label", doc.includes("v6.0W"));
  ok("doc staging deploy record", /staging deploy record|Deploy Record/i.test(doc));
  ok("doc no further deploy in slice", /ไม่ deploy ซ้ำ|do not re-run/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD d4cecd6", doc.includes(HEAD_SHA) || doc.includes("d4cecd6"));
  ok("preflight HEAD equals origin", /HEAD = origin|HEAD.*origin.*d4cecd/i.test(doc));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight previous revision 00049-nsd", doc.includes(PREV_REV));
  ok("preflight previous image v6.0T", doc.includes(PREV_IMAGE));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("preflight gemini secret ref metadata", /GEMINI_API_KEY.*gemini-api-key:latest|gemini-api-key:latest.*metadata/i.test(doc));
  ok("preflight NONGA_AI flags from v6.0U", /unchanged from v6\.0U|before deploy.*v6\.0U/i.test(doc));
  ok("preflight NONGA_AI_PROVIDER gemini", /NONGA_AI_PROVIDER.*gemini/.test(doc));
  ok("preflight NONGA_AI_USER_VISIBLE_ENABLED false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/.test(doc));
}

// --- tests/build ---
{
  ok("test v60v PASS recorded", /test:v60v.*PASS|v60v.*PASS/i.test(doc));
  ok("test v60r PASS recorded", /test:v60r.*PASS|v60r.*PASS/i.test(doc));
  ok("test v60u PASS recorded", /test:v60u.*PASS|v60u.*PASS/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS local only", /build:staging:hosting.*PASS|build.*PASS/i.test(docLower));
  ok("build not hosting deploy", /not deployed to Hosting|local Vite only/i.test(doc));
}

// --- cloud build ---
{
  ok("build ID recorded", doc.includes(BUILD_ID));
  ok("build status SUCCESS", /status.*SUCCESS|SUCCESS.*~2m/i.test(doc));
  ok("image tag v6.0W", doc.includes("v6.0W-shadow-chat-path-legacy-visible-d4cecd6"));
  ok("image URI recorded", doc.includes(IMAGE_URI));
  ok("digest recorded", doc.includes(DIGEST));
  ok("no secrets versions access build", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- cloud run deploy ---
{
  ok("deploy image-only", /image-only|image only/i.test(docLower));
  ok("new revision 00050-rqs", doc.includes(NEW_REV));
  ok("previous revision in deploy section", doc.includes(PREV_REV));
  ok("traffic 100 percent", /100%.*new revision|traffic.*100/i.test(docLower));
  ok("env secrets preserved", /env\/secrets.*preserved|preserved.*env/i.test(docLower));
  ok("no set-env-vars", /no `--set-env-vars`|no --set-env-vars/i.test(doc));
  ok("no update-env-vars", /no `--update-env-vars`|no --update-env-vars/i.test(doc));
  ok("service account staging runner", doc.includes("nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com"));
}

// --- env flags after deploy ---
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
  ok("after gemini secret ref unchanged", /GEMINI_API_KEY.*gemini-api-key:latest.*unchanged|unchanged.*gemini-api-key:latest/i.test(docLower));
}

// --- post-deploy API smoke ---
{
  ok("smoke via web.app", doc.includes("nonga-ce93c.web.app"));
  ok("smoke health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health publicSignup false", /publicSignupEnabled:false/i.test(doc));
  ok("smoke cars 200", /\/api\/cars.*200|cars.*200/i.test(docLower));
  ok("smoke admin revenue 401", /admin\/revenue\/preview.*401|401.*admin/i.test(docLower));
  ok("smoke my revenue 401", /my\/revenue\/preview.*401|401.*my revenue/i.test(docLower));
}

// --- chat smoke ---
{
  ok("chat smoke cloud run URL", doc.includes(CLOUD_RUN_CHAT_URL));
  ok("chat page loads", /หน้า chat โหลดได้|chat.*โหลด/i.test(doc));
  ok("chat safe message เริ่มใหม่", /"เริ่มใหม่"/.test(doc));
  ok("chat legacy response exact text", doc.includes(LEGACY_RESPONSE));
  ok("chat no AI gemini shown to user", /AI\/Gemini response.*none|ไม่มี.*AI|none/i.test(docLower));
  ok("chat bundle index-D1gO2JxF", doc.includes(JS_BUNDLE));
  ok("chat bundle flagsOnly", /flagsOnly/.test(doc));
  ok("chat bundle NONGA_AI keys", /NONGA_AI_\*/.test(doc));
  ok("chat bundle userVisibleEnabled false", /userVisibleEnabled:false|userVisibleEnabled.*false/i.test(doc));
  ok("chat bundle wireShadowChatPath", /wireShadowChatPath/.test(doc));
  ok("chat no raw PII", /raw PII.*not observed|ไม่พบ raw PII/i.test(doc));
}

// --- hosting vs cloud run ---
{
  ok("note cloud run has v6.0V wiring", /Cloud Run direct URL.*v6\.0V|v6\.0V client wiring/i.test(doc));
  ok("note hosting not redeployed", /Hosting.*Not redeployed|web\.app.*Not redeployed/i.test(doc));
  ok("note web.app older bundle", /older client bundle/i.test(docLower));
  ok("note api proxy to cloud run", /proxy.*Cloud Run|API routes.*proxy/i.test(doc));
  ok("note future hosting slice", /Hosting deploy.*future|future slice.*Hosting/i.test(docLower));
}

// --- rollback prepared not run ---
{
  ok("rollback not needed", /rollback.*not needed|not needed.*smoke|NOT RUN in v6\.0W/i.test(doc));
  ok("rollback update-traffic command", /gcloud run services update-traffic nonga-staging/.test(doc));
  ok("rollback to 00049-nsd", /nonga-staging-00049-nsd=100/.test(doc));
}

// --- forbidden section ---
{
  ok("forbidden user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("forbidden no gcloud env update", /gcloud run services update.*for env.*not done|services update.*for env/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no paid ai", /paid AI API|paid ai/i.test(docLower));
  ok("forbidden no user visible ai", /user-visible AI|AI response shown/i.test(docLower));
  ok("forbidden no production", /production.*not touched|not touched/i.test(docLower));
  ok("forbidden no firestore rules", /Firestore rules.*not done/i.test(doc));
  ok("forbidden no hosting deploy", /Hosting deploy.*not done/i.test(doc));
  ok("forbidden no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("forbidden no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no real stock", /real stock import.*not done|still blocked/i.test(docLower));
}

// --- references ---
{
  ok("references v60v", doc.includes("v6.0V"));
  ok("references v60u v60t v60r", doc.includes("v6.0U") && doc.includes("v6.0T") && doc.includes("v6.0R"));
}

// --- v6.0W: shadow chat path wired in code ---
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
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v60w script", pkg.includes("test:v60w-shadow-chat-path-staging-deploy-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60w-shadow-chat-path-staging-deploy-record.mts")
  );
}

console.log("\nDone v6.0W Shadow Chat Path Staging Deploy Record tests.");
if (process.exitCode) process.exit(process.exitCode);
