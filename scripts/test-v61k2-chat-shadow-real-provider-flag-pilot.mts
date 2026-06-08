/**
 * v6.1K.2 — Chat Shadow Real Provider Flag Pilot (static validation only)
 * npm run test:v61k2-chat-shadow-real-provider-flag-pilot
 */
import { readFileSync } from "node:fs";
import { CHAT_SHADOW_SINK_SLICE_ID } from "../src/services/ai/salesBrainChatShadowSinkDiagnostics.ts";

const DOC_PATH = "docs/v6.1K.2-chat-shadow-real-provider-flag-pilot.md";
const K1_DOC_PATH = "docs/v6.1K.1-chat-shadow-sink-staging-deploy-record.md";
const K_DOC_PATH = "docs/v6.1K-chat-path-shadow-real-provider-sink-only.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "e3b8278bca3d4d387a262835934c0b1dcc58273b";
const IMAGE_TAG = "v6.1K.1-chat-path-shadow-sink";
const DIGEST = "sha256:0cf221536c2fea79215cd26aa793214e8ce3f9f42b9a747f8ef3bae46900f84e";
const PREV_REV = "nonga-staging-00058-xwh";
const NEW_REV = "nonga-staging-00059-lvx";
const PRIMARY_URL = "https://a.nongbot.org";
const CHAT_URL = "https://a.nongbot.org/chat";
const CHAT_SHADOW_ROUTE = "/api/admin/chat-shadow-sink";
const ADMIN_SHADOW_ROUTE = "/api/admin/sales-brain-shadow-smoke";
const ENV_UPDATE_CMD =
  "gcloud run services update nonga-staging --project=nonga-ce93c --region=asia-southeast1 --update-env-vars=NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=true";
const ROLLBACK_CMD =
  "gcloud run services update nonga-staging --project=nonga-ce93c --region=asia-southeast1 --update-env-vars=NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=false";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1K.2 Chat Shadow Real Provider Flag Pilot ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61k2-chat-shadow-real-provider-flag-pilot.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const sinkModule = readFileSync("src/services/ai/salesBrainServerChatShadowSink.ts", "utf8");
const runtimeFlags = readFileSync("src/services/ai/salesBrainRuntimeFlags.ts", "utf8");

// --- doc exists + v6.1K.2 ---
{
  ok("pilot record doc exists", doc.length > 4000);
  ok("doc v6.1K.2 label", doc.includes("v6.1K.2"));
  ok("doc chat shadow real provider flag pilot", /chat shadow real provider flag pilot/i.test(doc));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc references v6.1K.1", doc.includes("v6.1K.1"));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD e3b8278", doc.includes(HEAD_SHA) || doc.includes("e3b8278"));
  ok("preflight origin e3b8278", /origin.*e3b8278|HEAD = origin/i.test(doc));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight previous revision 00058-xwh", doc.includes(PREV_REV));
  ok("preflight image tag v6.1K.1", doc.includes(IMAGE_TAG));
  ok("preflight digest recorded", doc.includes(DIGEST));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("preflight user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("preflight chat shadow flag absent", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*absent|default off/i.test(docLower));
  ok("preflight admin shadow real provider true", /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*true/i.test(doc));
  ok("preflight kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("preflight budget daily 5", /BUDGET_DAILY.*5|daily.*5/i.test(docLower));
  ok("preflight budget monthly 50", /BUDGET_MONTHLY.*50|monthly.*50/i.test(docLower));
  ok("preflight CP-02 providerNetwork false", /CP-02.*providerNetwork.*false|providerNetwork:false/i.test(doc));
  ok("no secrets versions access preflight", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- env update executed ---
{
  ok("env update command recorded", doc.includes(ENV_UPDATE_CMD) || doc.includes("NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=true"));
  ok("env-only update documented", /env-only|env only/i.test(docLower));
  ok("no image deploy new", /no new image deploy|no image deploy|image deploy.*none|not done.*image/i.test(docLower));
  ok("new revision 00059-lvx", doc.includes(NEW_REV));
  ok("previous revision 00058-xwh in update section", doc.includes(PREV_REV));
  ok("traffic 100 percent", /100%.*new revision|traffic.*100|00059-lvx.*100/i.test(docLower));
  ok("image unchanged documented", /image.*unchanged|unchanged.*image/i.test(docLower));
  ok("digest unchanged", doc.includes(DIGEST));
  ok("smoke base a.nongbot.org", doc.includes(PRIMARY_URL) || doc.includes("a.nongbot.org"));
  ok("no gcloud builds submit", /did not run.*gcloud builds submit|not run.*builds submit/i.test(docLower));
}

// --- env flags after update ---
{
  ok("after user visible false", /\| `NONGA_AI_USER_VISIBLE_ENABLED` \| \*\*`false`\*\*/.test(doc));
  ok("after chat shadow flag true", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`true`\*\*|NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*`true`/i.test(doc));
  ok("after admin shadow real provider true", /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`true`\*\*|NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*`true`/i.test(doc));
  ok("did not set user visible true", /did not set.*NONGA_AI_USER_VISIBLE_ENABLED=true/i.test(doc));
}

// --- post-update API smoke ---
{
  ok("smoke health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health publicSignup false", /publicSignupEnabled:false/i.test(doc));
  ok("chat shadow route documented", doc.includes(CHAT_SHADOW_ROUTE));
  ok("unauth chat shadow 401 PASS", /unauth.*401.*PASS|401.*PASS/i.test(doc) && /CP-02/.test(doc));
  ok("dealer chat shadow 403 PASS", /dealer.*403.*PASS|403.*PASS/i.test(docLower));
  ok("admin CP-01 PASS no real provider", /CP-01.*providerNetwork.*false|CP-01.*no real provider/i.test(doc));
  ok("admin CP-02 PASS", /CP-02.*200.*PASS|CP-02.*PASS/i.test(doc));
  ok("admin CP-03 PASS no real provider", /CP-03.*providerNetwork.*false|CP-03.*no real provider|kill switch/i.test(doc));
  ok("admin CP-04 PASS no real provider", /CP-04.*providerNetwork.*false|CP-04.*no real provider/i.test(doc));
  ok("admin CP-05 PASS no real provider", /CP-05.*providerNetwork.*false|CP-05.*no real provider/i.test(doc));
  ok("CP-02 sinkOnly true", /CP-02.*sinkOnly.*true|sinkOnly.*\*\*`true`\*\*/i.test(doc));
  ok("CP-02 userVisibleOff true", /CP-02.*userVisibleOff|userVisibleOff.*\*\*`true`\*\*/i.test(doc));
  ok("CP-02 readOnly true", /CP-02.*readOnly|readOnly.*\*\*`true`\*\*/i.test(doc));
  ok("CP-02 providerNetwork true", /CP-02.*providerNetwork.*true|providerNetwork.*\*\*`true`\*\*/i.test(doc));
  ok("CP-02 provider gemini", /CP-02.*provider.*gemini|provider.*\*\*`gemini`\*\*/i.test(doc));
  ok("CP-02 real_provider_call_ok", /real_provider_call_ok/i.test(doc));
  ok("CP-01 no real provider table", /CP-01.*false.*none|CP-01.*providerNetwork.*false/i.test(doc));
  ok("CP-03 no real provider table", /CP-03.*false|kill switch scenario/i.test(doc));
  ok("CP-04 no real provider table", /CP-04.*false/i.test(doc));
  ok("CP-05 no real provider table", /CP-05.*false/i.test(doc));
  ok("SS-01 admin 200 PASS", /SS-01.*200|sales-brain-shadow-smoke.*200/i.test(doc));
  ok("SS-01 userVisibleOff true", /SS-01.*userVisibleOff.*true|userVisibleOff:true/i.test(doc));
  ok("budget kill switch guardrail PASS", /budget.*kill switch|kill switch.*PASS|CP-03 kill switch/i.test(docLower));
  ok("no raw phone email", /raw phone.*none|email.*none|no raw phone/i.test(docLower));
  ok("no secret env dump", /secret.*env dump.*none|no `GEMINI_API_KEY`/i.test(docLower));
  ok("no AI response public user", /AI response.*public user.*none|none.*public user/i.test(docLower));
}

// --- public chat ---
{
  ok("chat smoke URL", doc.includes(CHAT_URL) || doc.includes("/chat"));
  ok("chat message เริ่มใหม่", /"เริ่มใหม่"/.test(doc));
  ok("chat legacy response exact", doc.includes(LEGACY_START_OVER));
  ok("chat no AI replacing legacy", /AI\/Gemini.*none|legacy 100%|ไม่มี.*AI/i.test(docLower));
  ok("chat no raw PII", /raw PII.*not observed|not observed/i.test(docLower));
}

// --- image unchanged section ---
{
  ok("image tag v6.1K.1 in image section", doc.includes(IMAGE_TAG));
  ok("image digest in image section", doc.includes(DIGEST));
  ok("env-only revision stated", /env-only revision/i.test(docLower));
}

// --- rollback prepared not run ---
{
  ok("rollback not needed", /rollback.*not needed|not needed.*smoke/i.test(docLower));
  ok("rollback env flag false", doc.includes("NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=false"));
  ok("rollback command prepared", doc.includes(ROLLBACK_CMD) || /gcloud run services update nonga-staging/.test(doc));
  ok("rollback not executed", /prepared only|not run unless/i.test(docLower));
}

// --- compliance ---
{
  ok("compliance user visible not true", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("compliance no public AI", /public AI response.*not changed|not changed.*legacy/i.test(docLower));
  ok("compliance no production", /production deploy.*not done|not done.*production/i.test(docLower));
  ok("compliance no hosting deploy", /Firebase Hosting deploy.*not done|Hosting.*SKIPPED/i.test(doc));
  ok("compliance no firestore rules", /Firestore rules.*not done/i.test(doc));
  ok("compliance no image deploy", /image deploy.*not done|not done.*image/i.test(docLower));
  ok("compliance no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("compliance no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("compliance no public signup", /public signup/i.test(docLower));
  ok("compliance no real stock", /real stock import.*blocked|still blocked/i.test(docLower));
  ok("compliance no custom prompt", /custom prompt/i.test(docLower));
  ok("compliance no v6.1L approval phrase", !/อนุมัติ.*v6\.1L|approval phrase.*v6\.1L/i.test(doc));
  ok("compliance no secrets access", /secrets versions access/i.test(doc));
}

// --- code alignment ---
{
  ok("server registers chat shadow sink", serverTs.includes("registerSalesBrainChatShadowSinkRoutes"));
  ok("sink route constant", sinkModule.includes(CHAT_SHADOW_ROUTE));
  ok("slice id v6.1K in code", CHAT_SHADOW_SINK_SLICE_ID === "v6.1K");
  ok("runtime flag chat shadow exists", runtimeFlags.includes("NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED"));
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
  ok("doc no production deploy command", !/gcloud run deploy nonga-production/i.test(doc));
  ok(
    "doc secrets access only as did-not-run",
    /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower) &&
      !/executed.*gcloud secrets versions access/i.test(docLower)
  );
}

// --- package.json ---
{
  ok("package v61k2 script", pkg.includes("test:v61k2-chat-shadow-real-provider-flag-pilot"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61k2-chat-shadow-real-provider-flag-pilot.mts")
  );
}

// --- companion docs ---
{
  ok("v6.1K.1 doc exists", readFileSync(K1_DOC_PATH, "utf8").includes("v6.1K.1"));
  ok("v6.1K doc exists", readFileSync(K_DOC_PATH, "utf8").includes("v6.1K"));
}

console.log("\nDone v6.1K.2 Chat Shadow Real Provider Flag Pilot tests.");
if (process.exitCode) process.exit(process.exitCode);
