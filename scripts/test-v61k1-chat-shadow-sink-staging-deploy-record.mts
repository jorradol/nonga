/**
 * v6.1K.1 — Chat Shadow Sink Staging Deploy Record (static validation only)
 * npm run test:v61k1-chat-shadow-sink-staging-deploy-record
 */
import { readFileSync } from "node:fs";
import { CHAT_SHADOW_SINK_SLICE_ID } from "../src/services/ai/salesBrainChatShadowSinkDiagnostics.ts";

const DOC_PATH = "docs/v6.1K.1-chat-shadow-sink-staging-deploy-record.md";
const K_DOC_PATH = "docs/v6.1K-chat-path-shadow-real-provider-sink-only.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "952a42f56fd1fd1905baa3a6918d38d14b79256e";
const BUILD_ID = "9644dd35-9299-44d8-b736-857f77540f41";
const IMAGE_TAG = "v6.1K.1-chat-path-shadow-sink";
const IMAGE_URI = `asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:${IMAGE_TAG}`;
const DIGEST = "sha256:0cf221536c2fea79215cd26aa793214e8ce3f9f42b9a747f8ef3bae46900f84e";
const PREV_REV = "nonga-staging-00057-bq2";
const NEW_REV = "nonga-staging-00058-xwh";
const PREV_IMAGE = "v6.1H.4-admin-shadow-gemini-model-fix";
const PRIMARY_URL = "https://a.nongbot.org";
const CHAT_URL = "https://a.nongbot.org/chat";
const CHAT_SHADOW_ROUTE = "/api/admin/chat-shadow-sink";
const ADMIN_SHADOW_ROUTE = "/api/admin/sales-brain-shadow-smoke";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1K.1 Chat Shadow Sink Staging Deploy Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61k1-chat-shadow-sink-staging-deploy-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const sinkModule = readFileSync("src/services/ai/salesBrainServerChatShadowSink.ts", "utf8");

// --- doc exists + v6.1K.1 ---
{
  ok("deploy record doc exists", doc.length > 5000);
  ok("doc v6.1K.1 label", doc.includes("v6.1K.1"));
  ok("doc chat shadow sink staging deploy", /chat shadow sink.*staging deploy/i.test(doc));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc references v6.1K", doc.includes("v6.1K"));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD 952a42f", doc.includes(HEAD_SHA) || doc.includes("952a42f"));
  ok("preflight origin 952a42f", /origin.*952a42f|HEAD = origin/i.test(doc));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight previous revision 00057-bq2", doc.includes(PREV_REV));
  ok("preflight previous image v6.1H.4", doc.includes(PREV_IMAGE));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("preflight user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("preflight chat shadow flag absent", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*absent|default off/i.test(docLower));
  ok("preflight admin shadow real provider true", /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*true/i.test(doc));
  ok("no secrets versions access preflight", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- tests/build before deploy ---
{
  ok("test v61k PASS recorded", /test:v61k.*PASS|v61k.*PASS/i.test(doc));
  ok("test v61j PASS recorded", /test:v61j.*PASS|v61j.*PASS/i.test(doc));
  ok("test v61h4 PASS recorded", /test:v61h4.*PASS|v61h4.*PASS/i.test(doc));
  ok("test v61h PASS recorded", /test:v61h.*PASS|v61h.*PASS/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS", /build:staging:hosting.*PASS|build.*PASS/i.test(docLower));
  ok("build not hosting deploy", /not deployed to Hosting|Hosting.*SKIPPED|local Vite only/i.test(doc));
}

// --- cloud build ---
{
  ok("build ID recorded", doc.includes(BUILD_ID));
  ok("build status SUCCESS", /status.*SUCCESS|SUCCESS.*~2m/i.test(doc));
  ok("image tag v6.1K.1", doc.includes(IMAGE_TAG));
  ok("image URI recorded", doc.includes(IMAGE_URI) || doc.includes(IMAGE_TAG));
  ok("digest recorded", doc.includes(DIGEST));
  ok("no secrets versions access build", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- cloud run deploy ---
{
  ok("deploy image-only", /image-only|image only/i.test(docLower));
  ok("new revision 00058-xwh", doc.includes(NEW_REV));
  ok("previous revision in deploy section", doc.includes(PREV_REV));
  ok("traffic 100 percent", /100%.*new revision|traffic.*100|00058-xwh.*100/i.test(docLower));
  ok("env secrets preserved", /env\/secrets.*preserved|preserved.*env/i.test(docLower));
  ok("no set-env-vars", /no `--set-env-vars`|no --set-env-vars/i.test(doc));
  ok("no update-env-vars", /no `--update-env-vars`|no --update-env-vars|did not run.*update-env-vars/i.test(doc));
  ok("smoke base a.nongbot.org", doc.includes(PRIMARY_URL) || doc.includes("a.nongbot.org"));
}

// --- env flags after deploy ---
{
  ok("after user visible false", /\| `NONGA_AI_USER_VISIBLE_ENABLED` \| \*\*`false`\*\*/.test(doc));
  ok("after chat shadow flag absent", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*absent|default off/i.test(docLower));
  ok("after admin shadow real provider true", /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`true`\*\*|NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*`true`/i.test(doc));
  ok("after public signup false", /VITE_NONGA_PUBLIC_SIGNUP_ENABLED.*false/i.test(doc));
  ok("after gemini secret ref unchanged", /GEMINI_API_KEY.*gemini-api-key:latest|gemini-api-key:latest.*unchanged/i.test(docLower));
}

// --- post-deploy API smoke ---
{
  ok("smoke health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health publicSignup false", /publicSignupEnabled:false/i.test(doc));
  ok("chat shadow route documented", doc.includes(CHAT_SHADOW_ROUTE));
  ok("unauth chat shadow 401 PASS", /unauth.*401.*PASS|401.*PASS/i.test(doc) && /CP-01/.test(doc));
  ok("dealer chat shadow 403 PASS", /dealer.*403.*PASS|403.*PASS/i.test(docLower));
  ok("admin CP-01 PASS", /CP-01.*200.*PASS|CP-01.*PASS/i.test(doc));
  ok("admin CP-02 PASS", /CP-02.*200.*PASS|CP-02.*PASS/i.test(doc));
  ok("admin CP-03 PASS", /CP-03.*PASS/i.test(doc));
  ok("admin CP-04 PASS", /CP-04.*PASS/i.test(doc));
  ok("admin CP-05 PASS", /CP-05.*PASS/i.test(doc));
  ok("admin sinkOnly documented", /sinkOnly/i.test(doc));
  ok("admin readOnly documented", /readOnly/i.test(doc));
  ok("admin userVisibleOff documented", /userVisibleOff/i.test(doc));
  ok("admin sliceId v6.1K", /sliceId.*v6\.1K|sliceId:v6\.1K/i.test(doc));
  ok("CP-02 providerNetwork false", /CP-02.*providerNetwork.*false|providerNetwork:false/i.test(doc));
  ok("CP-02 gate not real_provider_call_ok", /gate.*≠.*real_provider_call_ok|gate ≠ `real_provider_call_ok`|not.*real_provider_call_ok/i.test(doc));
  ok("SS-01 admin 200 PASS", /SS-01.*200|sales-brain-shadow-smoke.*200/i.test(doc));
  ok("SS-01 userVisibleOff true", /SS-01.*userVisibleOff.*true|userVisibleOff:true/i.test(doc));
  ok("no raw phone email", /raw phone.*none|email.*none|no raw phone/i.test(docLower));
  ok("no secret env dump", /secret.*env dump.*none|no `GEMINI_API_KEY`/i.test(docLower));
}

// --- public chat ---
{
  ok("chat smoke URL", doc.includes(CHAT_URL) || doc.includes("/chat"));
  ok("chat message เริ่มใหม่", /"เริ่มใหม่"/.test(doc));
  ok("chat legacy response exact", doc.includes(LEGACY_START_OVER));
  ok("chat no AI replacing legacy", /AI\/Gemini.*none|legacy 100%|ไม่มี.*AI/i.test(docLower));
  ok("chat no raw PII", /raw PII.*not observed|not observed/i.test(docLower));
}

// --- hosting vs cloud run ---
{
  ok("note new revision 00058-xwh", doc.includes(NEW_REV));
  ok("note hosting not redeployed", /Hosting.*Not redeployed|Hosting.*SKIPPED/i.test(doc));
  ok("note chat shadow route reachable", /chat-shadow-sink.*reachable|reachable.*chat-shadow-sink/i.test(docLower));
}

// --- rollback prepared not run ---
{
  ok("rollback not needed", /rollback.*not needed|not needed.*smoke/i.test(docLower));
  ok("rollback image v6.1H.4", doc.includes(PREV_IMAGE));
  ok("rollback command prepared", /gcloud run services update nonga-staging/.test(doc));
  ok("rollback not executed", /prepared only|not run unless/i.test(docLower));
}

// --- compliance ---
{
  ok("compliance user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("compliance chat shadow flag not true", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=true.*not|absent.*default off/i.test(docLower));
  ok("compliance no production", /production deploy.*not done|not done.*production/i.test(docLower));
  ok("compliance no firestore rules", /Firestore rules.*not done/i.test(doc));
  ok("compliance no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("compliance no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("compliance no public signup", /public signup/i.test(docLower));
  ok("compliance no real stock", /real stock import.*blocked|still blocked/i.test(docLower));
  ok("compliance no v6.1L approval phrase", !/อนุมัติ.*v6\.1L|approval phrase.*v6\.1L/i.test(doc));
  ok("compliance no secrets access", /secrets versions access/i.test(doc));
}

// --- code alignment ---
{
  ok("server registers chat shadow sink", serverTs.includes("registerSalesBrainChatShadowSinkRoutes"));
  ok("sink route constant", sinkModule.includes(CHAT_SHADOW_ROUTE));
  ok("slice id v6.1K in code", CHAT_SHADOW_SINK_SLICE_ID === "v6.1K");
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
  ok(
    "script no gcloud secrets access command",
    !/(?:execSync|spawn)\s*\(\s*[`'"]gcloud[^`']*secrets/.test(selfCode)
  );
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- forbidden in doc ---
{
  ok(
    "doc forbids user visible true",
    /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|not set.*remains \*\*false\*\*/i.test(doc)
  );
  ok(
    "doc forbids chat shadow flag true",
    /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=true.*not|absent.*default off/i.test(docLower)
  );
  ok("doc no production deploy command", !/gcloud run deploy nonga-production/i.test(doc));
}

// --- package.json ---
{
  ok("package v61k1 script", pkg.includes("test:v61k1-chat-shadow-sink-staging-deploy-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61k1-chat-shadow-sink-staging-deploy-record.mts")
  );
}

// --- companion docs ---
{
  ok("v6.1K doc exists", readFileSync(K_DOC_PATH, "utf8").includes("v6.1K"));
}

console.log("\nDone v6.1K.1 Chat Shadow Sink Staging Deploy Record tests.");
if (process.exitCode) process.exit(process.exitCode);
