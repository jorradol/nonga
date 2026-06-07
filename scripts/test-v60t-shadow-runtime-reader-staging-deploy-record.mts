/**
 * v6.0T — Shadow Runtime Reader Staging Deploy Record (static validation only)
 * npm run test:v60t-shadow-runtime-reader-staging-deploy-record
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.0T-shadow-runtime-reader-staging-deploy-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "db29970ece7c2f15d15b35d8425d2d58cb7bc46b";
const BUILD_ID = "0a847fe3-53b3-4313-a12e-40e0e923d2e9";
const IMAGE_URI =
  "asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:v6.0T-shadow-runtime-reader-db29970";
const DIGEST = "sha256:5fd0107aab9b00ae870ac1627781f759950592870d71e4425b6545867f4e46e3";
const PREV_REV = "nonga-staging-00047-7xc";
const NEW_REV = "nonga-staging-00048-nwc";
const PREV_IMAGE = "v5.6I.22-current-branch-runtime-cebc7a6";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0T Shadow Runtime Reader Staging Deploy Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v60t-shadow-runtime-reader-staging-deploy-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");

// --- doc exists + v6.0T ---
{
  ok("deploy record doc exists", doc.length > 5000);
  ok("doc v6.0T label", doc.includes("v6.0T"));
  ok("doc staging deploy record", /staging deploy record|Deploy Record/i.test(doc));
  ok("doc no further deploy in slice", /ไม่ deploy ซ้ำ|do not re-run/i.test(docLower));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD db29970", doc.includes(HEAD_SHA) || doc.includes("db29970"));
  ok("preflight HEAD equals origin", /HEAD = origin|HEAD.*origin.*db29970/i.test(doc));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight previous revision", doc.includes(PREV_REV));
  ok("preflight previous image", doc.includes(PREV_IMAGE));
  ok("preflight AI flags before absent", /AI flags before deploy.*absent|before deploy.*absent\/off/i.test(docLower));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
}

// --- tests/build ---
{
  ok("test v60s PASS recorded", /test:v60s.*PASS|v60s.*PASS/i.test(doc));
  ok("test v60r PASS recorded", /test:v60r.*PASS|v60r.*PASS/i.test(doc));
  ok("test v60q PASS recorded", /test:v60q.*PASS|v60q.*PASS/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS", /build:staging:hosting.*PASS|build.*PASS/i.test(docLower));
}

// --- cloud build ---
{
  ok("build ID recorded", doc.includes(BUILD_ID));
  ok("build status SUCCESS", /status.*SUCCESS|SUCCESS.*~2m/i.test(doc));
  ok("image tag v6.0T", doc.includes("v6.0T-shadow-runtime-reader-db29970"));
  ok("image URI recorded", doc.includes(IMAGE_URI));
  ok("digest recorded", doc.includes(DIGEST));
  ok("no secrets versions access build", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- cloud run deploy ---
{
  ok("deploy image-only", /image-only|image only/i.test(docLower));
  ok("new revision 00048-nwc", doc.includes(NEW_REV));
  ok("previous revision in deploy section", doc.includes(PREV_REV));
  ok("traffic 100 percent", /100%.*new revision|traffic.*100/i.test(docLower));
  ok("env secrets preserved", /env\/secrets.*preserved|preserved.*env/i.test(docLower));
  ok("no set-env-vars", /no `--set-env-vars`|no --set-env-vars/i.test(doc));
  ok("no update-env-vars", /no `--update-env-vars`|no --update-env-vars/i.test(doc));
  ok("service account staging runner", doc.includes("nonga-staging-runner@nonga-ce93c.iam.gserviceaccount.com"));
}

// --- post-deploy smoke ---
{
  ok("smoke health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health ok true", /ok:true.*firestore|ok:true/i.test(doc));
  ok("smoke publicSignup false", /publicSignupEnabled:false/i.test(doc));
  ok("smoke cars 200", /\/api\/cars.*200|cars.*200/i.test(docLower));
  ok("smoke cars success count", /success:true.*count:17|count:17/i.test(doc));
  ok("smoke admin revenue 401", /admin\/revenue\/preview.*401|401.*admin/i.test(docLower));
  ok("smoke my revenue 401", /my\/revenue\/preview.*401|401.*my revenue/i.test(docLower));
}

// --- AI flags after deploy ---
{
  for (const flag of [
    "NONGA_AI_PROVIDER",
    "NONGA_AI_MODE",
    "NONGA_AI_FIRST_ENABLED",
    "NONGA_AI_SHADOW_MODE_ENABLED",
    "NONGA_AI_USER_VISIBLE_ENABLED",
    "NONGA_AI_EMERGENCY_KILL_SWITCH",
    "NONGA_AI_BUDGET_DAILY_LIMIT",
    "NONGA_AI_BUDGET_MONTHLY_LIMIT",
  ]) {
    ok(`${flag} absent/off after deploy`, new RegExp(`${flag}.*absent/off|absent/off.*${flag}`, "i").test(doc));
  }
}

// --- unchanged refs/env ---
{
  ok("gemini-api-key ref", /GEMINI_API_KEY.*gemini-api-key:latest|gemini-api-key:latest/i.test(doc));
  ok("firebase sa secret ref", /FIREBASE_SERVICE_ACCOUNT_JSON.*firebase-service-account-json/i.test(doc));
  ok("settlement firestore unchanged", /NONGA_SETTLEMENT_DATA_BACKEND.*firestore/i.test(doc));
  ok("settlement writes true unchanged", /NONGA_SETTLEMENT_FIRESTORE_WRITES_ENABLED.*true/i.test(doc));
  ok("success fee true unchanged", /NONGA_SUCCESS_FEE_RECORD_ENABLED.*true/i.test(doc));
}

// --- rollback prepared not run ---
{
  ok("rollback prepared not run", /Prepared.*Not Run|prepared but not run|NOT RUN in v6\.0T/i.test(doc));
  ok("rollback update-traffic command", /gcloud run services update-traffic nonga-staging/.test(doc));
  ok("rollback to 00047-7xc", /nonga-staging-00047-7xc=100/.test(doc));
}

// --- forbidden section ---
{
  ok("forbidden no AI env enablement", /NONGA_AI_\*.*env enablement.*not done|AI env enablement/i.test(docLower));
  ok("forbidden no gcloud env update", /gcloud run services update.*env.*not done|services update.*for env/i.test(docLower));
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
  ok("references v60s", doc.includes("v6.0S"));
  ok("references v60r v60q", doc.includes("v6.0R") && doc.includes("v6.0Q"));
}

// --- runtime not wired to chat ---
{
  ok("useChat no shadow runtime", !useChat.includes("salesBrainShadowRuntime"));
  ok("orchestrator no shadow runtime", !orch.includes("salesBrainShadowRuntime"));
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
  ok("package v60t script", pkg.includes("test:v60t-shadow-runtime-reader-staging-deploy-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60t-shadow-runtime-reader-staging-deploy-record.mts")
  );
}

console.log("\nDone v6.0T Shadow Runtime Reader Staging Deploy Record tests.");
if (process.exitCode) process.exit(process.exitCode);
