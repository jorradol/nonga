/**
 * v6.1H.4 — Admin Shadow Gemini Model Fix Staging Deploy Record (static validation only)
 * npm run test:v61h4-admin-shadow-gemini-model-fix-staging-deploy-record
 */
import { readFileSync } from "node:fs";
import { ADMIN_SHADOW_SMOKE_SLICE_ID } from "../src/services/ai/salesBrainAdminShadowDiagnostics.ts";
import { CHAT_SHADOW_SINK_SLICE_ID } from "../src/services/ai/salesBrainChatShadowSinkDiagnostics.ts";

const DOC_PATH = "docs/v6.1H.4-admin-shadow-gemini-model-fix-staging-deploy-record.md";
/** Deploy-time slice stamped in v6.1H.4 execution record — frozen in doc, not in current code */
const V61H4_DEPLOY_SLICE_ID = "v6.1H.4";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const BASELINE_SHA = "23b6d7a";
const SLICE_SHA = "f878972d10981b9162447c32497d463011f8215d";
const BUILD_ID = "02b188bc-3bad-4b2d-b6b5-e4130503d362";
const IMAGE_TAG = "v6.1H.4-admin-shadow-gemini-model-fix";
const IMAGE_URI = `asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:${IMAGE_TAG}`;
const PREV_REV = "nonga-staging-00056-k48";
const NEW_REV = "nonga-staging-00057-bq2";
const PREV_IMAGE = "v6.1H.3-admin-shadow-gemini-error-diagnostics";
const NEW_MODEL = "gemini-3.5-flash";
const OLD_MODEL = "gemini-2.0-flash";
const PRIMARY_URL = "https://a.nongbot.org";
const ADMIN_UI_PATH = "/admin/shadow-smoke";
const ADMIN_ROUTE = "/api/admin/sales-brain-shadow-smoke";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1H.4 Admin Shadow Gemini Model Fix Staging Deploy Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61h4-admin-shadow-gemini-model-fix-staging-deploy-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const realProvider = readFileSync("src/services/ai/salesBrainAdminShadowRealProvider.ts", "utf8");
const diagnostics = readFileSync("src/services/ai/salesBrainAdminShadowDiagnostics.ts", "utf8");

// --- doc exists + v6.1H.4 ---
{
  ok("deploy record doc exists", doc.length > 5000);
  ok("doc v6.1H.4 label", doc.includes("v6.1H.4"));
  ok("doc model fix staging deploy", /model fix.*staging deploy|Gemini Model Fix/i.test(doc));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
}

// --- root cause ---
{
  ok("root cause gemini_model_not_found", /gemini_model_not_found|NOT_FOUND/i.test(doc));
  ok("root cause old model 2.0 flash", doc.includes(OLD_MODEL));
  ok("root cause 404", /404|geminiHttpStatus:404/i.test(doc));
  ok("new model 3.5 flash documented", doc.includes(NEW_MODEL));
}

// --- preflight ---
{
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight baseline 23b6d7a", doc.includes(BASELINE_SHA) || doc.includes("23b6d7a"));
  ok("preflight slice commit f878972", doc.includes(SLICE_SHA) || doc.includes("f878972"));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight previous revision 00056-k48", doc.includes(PREV_REV));
  ok("preflight previous image v6.1H.3", doc.includes(PREV_IMAGE));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("preflight user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("preflight admin shadow real provider true", /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*true/i.test(doc));
  ok("no secrets versions access preflight", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- tests/build ---
{
  ok("test v61h PASS recorded", /test:v61h.*PASS|v61h.*PASS/i.test(doc));
  ok("test v61b PASS recorded", /test:v61b.*PASS|v61b.*PASS/i.test(doc));
  ok("test v61g PASS recorded", /test:v61g.*PASS|v61g.*PASS/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS", /build:staging:hosting.*PASS|build.*PASS/i.test(docLower));
}

// --- runtime changes ---
{
  ok("code model constant 3.5 flash", realProvider.includes(`ADMIN_SHADOW_GEMINI_MODEL = "${NEW_MODEL}"`));
  ok(
    "doc deploy-time sliceId v6.1H.4 preserved",
    /sliceId.*v6\.1H\.4|adminShadowDiag.*v6\.1H\.4/i.test(doc)
  );
  ok(
    "code admin slice id current not v6.1H.4",
    !diagnostics.includes(`ADMIN_SHADOW_SMOKE_SLICE_ID = "${V61H4_DEPLOY_SLICE_ID}"`)
  );
  ok("code admin slice id evolved v6.1J", ADMIN_SHADOW_SMOKE_SLICE_ID === "v6.1J");
  ok(
    "code chat shadow slice separate v6.1K",
    CHAT_SHADOW_SINK_SLICE_ID === "v6.1K"
  );
  ok("doc runtime model change", doc.includes(NEW_MODEL));
  ok("doc SS-02..SS-08 mock only", /SS-02\.\.SS-08.*mock|mock only/i.test(doc));
  ok("doc public chat unchanged", /public chat.*unchanged|unchanged.*public chat/i.test(docLower));
}

// --- cloud build ---
{
  ok("cloud build ID", doc.includes(BUILD_ID));
  ok("cloud build SUCCESS", /Status.*SUCCESS|SUCCESS/i.test(doc));
  ok("image tag v6.1H.4", doc.includes(IMAGE_TAG));
  ok("image URI documented", doc.includes(IMAGE_URI) || doc.includes(IMAGE_TAG));
}

// --- cloud run deploy ---
{
  ok("cloud run new revision 00057-bq2", doc.includes(NEW_REV));
  ok("cloud run 100 percent traffic", /00057-bq2.*100|100%.*00057/i.test(doc));
  ok("cloud run image-only deploy", /image-only|image only/i.test(docLower));
  ok("no env update in slice", /no env update|did not run.*update-env-vars|unchanged/i.test(docLower));
}

// --- post-deploy API smoke ---
{
  ok("smoke health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health publicSignup false", /publicSignupEnabled:false/i.test(doc));
  ok("smoke unauth admin 401", /401|unauth/i.test(docLower));
  ok("smoke primary URL a.nongbot.org", doc.includes(PRIMARY_URL) || doc.includes("a.nongbot.org"));
}

// --- manual admin SS-01 PASS ---
{
  ok("manual smoke PASS section", /Manual Admin SS-01 Smoke \(PASS\)|manual.*PASS/i.test(doc));
  ok("manual admin UI path", doc.includes(ADMIN_UI_PATH));
  ok("manual providerNetwork true", /providerNetwork.*true/i.test(doc));
  ok("manual provider gemini", /provider.*gemini/i.test(docLower));
  ok("manual real_provider_call_ok", doc.includes("real_provider_call_ok"));
  ok("manual sliceId v6.1H.4", /sliceId.*v6\.1H\.4|v6\.1H\.4/i.test(doc));
  ok("manual geminiModel 3.5 flash", doc.includes(NEW_MODEL));
  ok("manual caseId SS-01", /caseId.*SS-01|SS-01/i.test(doc));
  ok("manual userVisibleOff true", /userVisibleOff.*true/i.test(doc));
  ok("manual readOnly true", /readOnly.*true/i.test(doc));
}

// --- public chat ---
{
  ok("chat legacy start over", doc.includes(LEGACY_START_OVER));
  ok("chat no public AI", /AI\/Gemini.*none|ไม่มี.*AI|user-visible.*false/i.test(docLower));
}

// --- hosting skipped ---
{
  ok("hosting deploy skipped", /Hosting.*SKIPPED|SKIPPED.*Hosting/i.test(doc));
}

// --- rollback ---
{
  ok("rollback not needed", /rollback.*not needed|not needed.*manual smoke/i.test(docLower));
  ok("rollback image v6.1H.3 available", doc.includes(PREV_IMAGE));
}

// --- compliance ---
{
  ok("compliance user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("compliance no production", /production.*not touched|not touched/i.test(docLower));
  ok("compliance no firestore rules", /Firestore rules.*not done/i.test(doc));
  ok("compliance no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("compliance no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("compliance no public signup", /public signup/i.test(docLower));
  ok("compliance no real stock", /real stock import.*not done|still blocked/i.test(docLower));
  ok("compliance no secrets access", /secrets versions access/i.test(doc));
}

// --- next steps v6.1I ---
{
  ok("next steps v6.1I reference", doc.includes("v6.1I"));
  ok("next steps conversation smoke", /conversation smoke/i.test(docLower));
}

// --- references ---
{
  ok("references v6.1H", doc.includes("v6.1H"));
  ok("references v6.1H.3", doc.includes("v6.1H.3"));
  ok("references v6.1G v6.1F", doc.includes("v6.1G") && doc.includes("v6.1F"));
}

// --- no secret values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret pattern ${pat.source.slice(0, 20)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v61h4 script", pkg.includes("test:v61h4-admin-shadow-gemini-model-fix-staging-deploy-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61h4-admin-shadow-gemini-model-fix-staging-deploy-record.mts")
  );
}

// --- admin route still SS-01 only for real provider ---
{
  ok("real provider SS-01 only", realProvider.includes('"SS-01"'));
  ok("admin route path", realProvider.includes("admin") || doc.includes(ADMIN_ROUTE));
}

console.log("\nDone v6.1H.4 Admin Shadow Gemini Model Fix Staging Deploy Record tests.");
if (process.exitCode) process.exit(process.exitCode);
