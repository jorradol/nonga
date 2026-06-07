/**
 * v6.1C — Admin Shadow Smoke Debug Staging Deploy Record (static validation only)
 * npm run test:v61c-admin-shadow-smoke-debug-staging-deploy-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.1C-admin-shadow-smoke-debug-staging-deploy-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "0883faf9a1282120f548c9440c4bead5eaf2f533";
const BUILD_ID = "fb226e64-cc7a-4fe7-96bb-8cdf29e37164";
const IMAGE_URI =
  "asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v6.1C-admin-shadow-smoke-debug-0883faf";
const DIGEST = "sha256:70cb1e4ab85f15eadc5dae41f631bd2997bb589ab8e8af8ab2528bd84a9bce15";
const PREV_REV = "nonga-staging-00050-rqs";
const NEW_REV = "nonga-staging-00051-fbd";
const PREV_IMAGE = "v6.0W-shadow-chat-path-legacy-visible-d4cecd6";
const PRIMARY_BUNDLE = "index-NVEc0A-_.js";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const WEBAPP_BASE = "https://nonga-ce93c.web.app";
const WEBAPP_CHAT_URL = "https://nonga-ce93c.web.app/chat";
const ADMIN_ROUTE = "/api/admin/sales-brain-shadow-smoke";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1C Admin Shadow Smoke Debug Staging Deploy Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61c-admin-shadow-smoke-debug-staging-deploy-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const shadowSmoke = readFileSync("src/services/ai/salesBrainServerShadowSmoke.ts", "utf8");

// --- doc exists + v6.1C ---
{
  ok("deploy record doc exists", doc.length > 5000);
  ok("doc v6.1C label", doc.includes("v6.1C"));
  ok("doc admin shadow smoke debug staging deploy", /admin shadow smoke debug staging deploy/i.test(doc));
  ok("doc no further deploy in slice", /ไม่ deploy ซ้ำ|do not re-run/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD 0883faf", doc.includes(HEAD_SHA) || doc.includes("0883faf"));
  ok("preflight HEAD equals origin", /HEAD = origin|HEAD.*origin.*0883faf/i.test(doc));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight previous revision 00050-rqs", doc.includes(PREV_REV));
  ok("preflight previous revision 100 percent", /00050-rqs.*100|100%.*00050/i.test(doc));
  ok("preflight previous image v6.0W", doc.includes(PREV_IMAGE));
  ok("preflight primary bundle NVEc0A unchanged", doc.includes(PRIMARY_BUNDLE));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("preflight gemini secret ref metadata", /GEMINI_API_KEY.*gemini-api-key:latest|gemini-api-key:latest.*metadata/i.test(doc));
  ok("preflight NONGA_AI_PROVIDER gemini", /NONGA_AI_PROVIDER.*gemini/.test(doc));
  ok("preflight NONGA_AI_MODE high", /NONGA_AI_MODE.*high/.test(doc));
  ok("preflight NONGA_AI_FIRST_ENABLED true", /NONGA_AI_FIRST_ENABLED.*true/.test(doc));
  ok("preflight NONGA_AI_SHADOW_MODE_ENABLED true", /NONGA_AI_SHADOW_MODE_ENABLED.*true/.test(doc));
  ok("preflight NONGA_AI_USER_VISIBLE_ENABLED false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/.test(doc));
  ok("preflight NONGA_AI_EMERGENCY_KILL_SWITCH false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/.test(doc));
  ok("preflight NONGA_AI_BUDGET_DAILY_LIMIT 5", /NONGA_AI_BUDGET_DAILY_LIMIT.*5/.test(doc));
  ok("preflight NONGA_AI_BUDGET_MONTHLY_LIMIT 50", /NONGA_AI_BUDGET_MONTHLY_LIMIT.*50/.test(doc));
  ok("no secrets versions access preflight", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- tests/build ---
{
  ok("test v61b PASS recorded", /test:v61b.*PASS|v61b.*PASS/i.test(doc));
  ok("test v61a PASS recorded", /test:v61a.*PASS|v61a.*PASS/i.test(doc));
  ok("test v60z PASS recorded", /test:v60z.*PASS|v60z.*PASS/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS local only", /build:staging:hosting.*PASS|build.*PASS/i.test(docLower));
  ok("build not hosting deploy", /not deployed to Hosting|local Vite only/i.test(doc));
}

// --- cloud build ---
{
  ok("build ID recorded", doc.includes(BUILD_ID));
  ok("build status SUCCESS", /status.*SUCCESS|SUCCESS.*~2m/i.test(doc));
  ok("image tag v6.1C", doc.includes("v6.1C-admin-shadow-smoke-debug-0883faf"));
  ok("image URI recorded", doc.includes(IMAGE_URI));
  ok("digest recorded", doc.includes(DIGEST));
  ok("no secrets versions access build", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- cloud run deploy ---
{
  ok("deploy image-only", /image-only|image only/i.test(docLower));
  ok("new revision 00051-fbd", doc.includes(NEW_REV));
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
  ok("smoke via web.app", doc.includes(WEBAPP_BASE));
  ok("smoke health 200 ok true", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health publicSignup false", /publicSignupEnabled:false/i.test(doc));
  ok("smoke cars 200 count 17", /\/api\/cars.*200|cars.*200/i.test(docLower) && /count=.*17|count.*17/i.test(doc));
  ok("smoke admin revenue 401", /admin\/revenue\/preview.*401|401.*admin/i.test(docLower));
  ok("smoke my revenue 401", /my\/revenue\/preview.*401|401.*my revenue/i.test(docLower));
}

// --- admin shadow route smoke ---
{
  ok("admin route path documented", doc.includes(ADMIN_ROUTE));
  ok("admin unauth 401 PASS", /unauth.*401.*PASS|401.*PASS/i.test(doc) && /SS-01/.test(doc));
  ok("admin dealer 403 PASS", /dealer.*403.*PASS|403.*PASS/i.test(docLower));
  ok("admin SS-01 200 PASS", /SS-01.*200.*PASS|200.*PASS/i.test(doc));
  ok("admin UNKNOWN 400 PASS", /UNKNOWN.*400.*PASS|400.*PASS/i.test(doc));
  ok("admin missing caseId 400 PASS", /missing caseId.*400|{}.*400/i.test(doc));
  ok("admin SS-05 safe PASS", /SS-05.*200.*PASS|SS-05.*kill switch/i.test(doc));
  ok("admin SS-06 safe PASS", /SS-06.*200.*PASS|SS-06.*budget missing/i.test(doc));
  ok("admin SS-07 safe PASS", /SS-07.*200.*PASS|SS-07.*user-visible blocked/i.test(doc));
  ok("admin SS-08 safe PASS", /SS-08.*200.*PASS|SS-08.*production off/i.test(doc));
  ok("admin SS-01 success true", /success.*\*\*`true`\*\*|success.*true/i.test(doc));
  ok("admin SS-01 readOnly true", /readOnly.*\*\*`true`\*\*|readOnly.*true/i.test(doc));
  ok("admin SS-01 userVisibleOff true", /userVisibleOff.*\*\*`true`\*\*|userVisibleOff.*true/i.test(doc));
  ok("admin SS-01 providerNetwork false", /providerNetwork.*\*\*`false`\*\*|providerNetwork.*false/i.test(doc));
  ok("admin SS-01 mock provider", /shadowDebugResult\.provider.*mock|provider.*mock/i.test(docLower));
  ok("admin no paid gemini", /paid Gemini.*none|mock provider only/i.test(docLower));
  ok("admin no raw phone email", /raw phone.*none|email.*none/i.test(docLower));
  ok("admin no secret env dump", /secret.*env dump.*none|no `GEMINI_API_KEY`/i.test(docLower));
  ok("admin no AI response user can see", /AI response shown to end user.*none|no AI response/i.test(docLower));
}

// --- chat smoke ---
{
  ok("chat smoke web.app URL", doc.includes(WEBAPP_CHAT_URL));
  ok("chat case message เริ่มใหม่", /"เริ่มใหม่"/.test(doc));
  ok("chat legacy response exact", doc.includes(LEGACY_START_OVER));
  ok("chat no AI gemini replacing legacy", /AI\/Gemini response.*none|ไม่มี.*AI|legacy 100%/i.test(docLower));
  ok("chat hosting bundle unchanged", doc.includes(PRIMARY_BUNDLE));
  ok("chat no raw PII", /raw PII.*not observed|not observed/i.test(docLower));
}

// --- hosting vs cloud run ---
{
  ok("note new revision 00051-fbd", doc.includes(NEW_REV));
  ok("note hosting not redeployed", /Hosting.*Not redeployed|web\.app.*Not redeployed/i.test(doc));
  ok("note api proxy admin route", /admin route reachable|API routes.*proxy/i.test(docLower));
}

// --- rollback prepared not run ---
{
  ok("rollback not needed", /rollback.*not needed|not needed.*smoke|NOT RUN in v6\.1C/i.test(doc));
  ok("rollback update-traffic command", /gcloud run services update-traffic nonga-staging/.test(doc));
  ok("rollback to 00050-rqs", /nonga-staging-00050-rqs=100/.test(doc));
}

// --- git status ---
{
  ok("git branch after deploy", doc.includes("feature/chat-image-attachment-v1"));
  ok("git up to date origin", /up to date with.*origin/i.test(docLower));
  ok("git working tree clean", /working tree.*clean/i.test(docLower));
  ok("no docs auto-commit deploy slice", /no docs auto-commit|docs auto-commit.*not done/i.test(docLower));
}

// --- forbidden section ---
{
  ok("forbidden no further cloud run deploy", /further Cloud Run deploy.*not done|ไม่ deploy ซ้ำ/i.test(docLower));
  ok("forbidden user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("forbidden no gcloud env update", /gcloud run services update.*for env.*not done|services update.*for env/i.test(docLower));
  ok("forbidden no NONGA_AI env changes", /NONGA_AI_\*.*env changes.*not done/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no paid ai", /paid AI API|paid ai|provider network/i.test(docLower));
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
  ok("references v61b", doc.includes("v6.1B"));
  ok("references v61a v60z v60w", doc.includes("v6.1A") && doc.includes("v6.0Z") && doc.includes("v6.0W"));
}

// --- v6.1B code wired ---
{
  ok("server registers admin shadow route", serverTs.includes("registerSalesBrainAdminShadowSmokeRoutes"));
  ok("shadow smoke module route constant", shadowSmoke.includes(ADMIN_ROUTE));
  ok("shadow smoke SS cases", shadowSmoke.includes("SS-01") && shadowSmoke.includes("SS-08"));
  ok("shadow smoke mock provider redacted", /buildRedactedAdminShadowSmokePayload|provider.*mock/i.test(shadowSmoke));
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
  ok("package v61c script", pkg.includes("test:v61c-admin-shadow-smoke-debug-staging-deploy-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61c-admin-shadow-smoke-debug-staging-deploy-record.mts")
  );
}

console.log("\nDone v6.1C Admin Shadow Smoke Debug Staging Deploy Record tests.");
if (process.exitCode) process.exit(process.exitCode);
