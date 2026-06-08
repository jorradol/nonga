/**
 * v6.1K.5 — Chat Shadow Kill Switch Fix Staging Deploy Record (static validation only)
 * npm run test:v61k5-chat-shadow-kill-switch-fix-staging-deploy-record
 */
import { readFileSync } from "node:fs";
import { CHAT_SHADOW_SINK_SLICE_ID } from "../src/services/ai/salesBrainChatShadowSinkDiagnostics.ts";

const DOC_PATH = "docs/v6.1K.5-chat-shadow-kill-switch-fix-staging-deploy-record.md";
const K4_DOC_PATH = "docs/v6.1K.4-chat-shadow-global-kill-switch-fix.md";
const K3_DOC_PATH = "docs/v6.1K.3-budget-kill-switch-rollback-exercise.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "f56d60e832a56d1f6bde350f8808c37698187ec8";
const BUILD_ID = "cb1be068-d04c-4e83-86d4-363d5eb013e3";
const IMAGE_TAG = "v6.1K.5-chat-shadow-kill-switch-fix";
const IMAGE_URI = `asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:${IMAGE_TAG}`;
const DIGEST = "sha256:be098715d8528248d2d6a54c8e0f0c206d6382d215e3ebc141435a10a06a0711";
const PREV_REV = "nonga-staging-00062-5sr";
const PREV_IMAGE = "v6.1K.1-chat-path-shadow-sink";
const IMAGE_DEPLOY_REV = "nonga-staging-00063-tfr";
const CORRUPT_REV = "nonga-staging-00064-zgf";
const KILL_TEST_REV = "nonga-staging-00065-2lf";
const FINAL_REV = "nonga-staging-00066-hch";
const PRIMARY_URL = "https://a.nongbot.org";
const CHAT_URL = "https://a.nongbot.org/chat";
const CHAT_SHADOW_ROUTE = "/api/admin/chat-shadow-sink";
const QUOTED_KILL_ENV =
  '--update-env-vars="NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=true,NONGA_AI_EMERGENCY_KILL_SWITCH=true"';
const QUOTED_RESTORE_ENV =
  '--update-env-vars="NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=false,NONGA_AI_EMERGENCY_KILL_SWITCH=false"';
const ROLLBACK_IMAGE_URI = `asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:${PREV_IMAGE}`;
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1K.5 Chat Shadow Kill Switch Fix Staging Deploy Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61k5-chat-shadow-kill-switch-fix-staging-deploy-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const sinkModule = readFileSync("src/services/ai/salesBrainServerChatShadowSink.ts", "utf8");

// --- doc exists + v6.1K.5 ---
{
  ok("deploy record doc exists", doc.length > 6000);
  ok("doc v6.1K.5 label", doc.includes("v6.1K.5"));
  ok("doc kill switch fix staging deploy", /kill switch fix.*staging deploy/i.test(doc));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc references v6.1K.4", doc.includes("v6.1K.4"));
  ok("doc references v6.1K.3 gap", doc.includes("v6.1K.3"));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD f56d60e", doc.includes(HEAD_SHA) || doc.includes("f56d60e"));
  ok("preflight origin f56d60e", /origin.*f56d60e|HEAD = origin/i.test(doc));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight previous revision 00062-5sr", doc.includes(PREV_REV));
  ok("preflight previous image v6.1K.1", doc.includes(PREV_IMAGE));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("preflight user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("preflight chat shadow flag false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
  ok("preflight kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("no secrets versions access preflight", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- tests/build before deploy ---
{
  ok("test v61k4 PASS recorded", /test:v61k4.*PASS|v61k4.*PASS/i.test(doc));
  ok("test v61k3 PASS recorded", /test:v61k3.*PASS|v61k3.*PASS/i.test(doc));
  ok("test v61k2 PASS recorded", /test:v61k2.*PASS|v61k2.*PASS/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS", /build:staging:hosting.*PASS|build.*PASS/i.test(docLower));
  ok("build not hosting deploy", /not deployed to Hosting|Hosting.*SKIPPED|local Vite only/i.test(doc));
}

// --- cloud build ---
{
  ok("build ID recorded", doc.includes(BUILD_ID));
  ok("build status SUCCESS", /status.*SUCCESS|SUCCESS.*~3m/i.test(doc));
  ok("image tag v6.1K.5", doc.includes(IMAGE_TAG));
  ok("image URI recorded", doc.includes(IMAGE_URI) || doc.includes(IMAGE_TAG));
  ok("digest recorded", doc.includes(DIGEST));
  ok("no secrets versions access build", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- cloud run image deploy ---
{
  ok("deploy image-only", /image-only|image only/i.test(docLower));
  ok("image deploy revision 00063-tfr", doc.includes(IMAGE_DEPLOY_REV));
  ok("previous revision in deploy section", doc.includes(PREV_REV));
  ok("traffic 100 percent", /100%|traffic.*100/i.test(docLower));
  ok("env secrets preserved", /env\/secrets.*preserved|preserved.*env/i.test(docLower));
  ok("no set-env-vars image deploy", /no `--set-env-vars`|no --set-env-vars/i.test(doc));
  ok("no update-env-vars image deploy", /no `--update-env-vars`.*image deploy|image deploy step.*no.*update-env-vars|no `--update-env-vars` in image deploy/i.test(doc));
  ok("smoke base a.nongbot.org", doc.includes(PRIMARY_URL) || doc.includes("a.nongbot.org"));
}

// --- post-deploy safe env smoke ---
{
  ok("smoke health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("smoke health publicSignup false", /publicSignupEnabled:false/i.test(doc));
  ok("chat shadow route documented", doc.includes(CHAT_SHADOW_ROUTE));
  ok("unauth chat shadow 401 PASS", /unauth.*401.*PASS|401.*PASS/i.test(doc));
  ok("dealer chat shadow 403 PASS", /dealer.*403.*PASS|403.*PASS/i.test(docLower));
  ok("CP-02 safe providerNetwork false", /CP-02.*providerNetwork.*false|providerNetwork.*\*\*`false`\*\*/i.test(doc));
  ok("CP-02 safe gate chat_shadow_real_provider_flag_off", /chat_shadow_real_provider_flag_off/i.test(doc));
  ok("CP-02 safe sinkOnly true", /sinkOnly.*\*\*`true`\*\*|sinkOnly.*true/i.test(doc));
  ok("CP-02 safe userVisibleOff true", /userVisibleOff.*\*\*`true`\*\*|userVisibleOff.*true/i.test(doc));
  ok("CP-02 safe readOnly true", /readOnly.*\*\*`true`\*\*|readOnly.*true/i.test(doc));
}

// --- powershell incident ---
{
  ok("corrupt revision 00064-zgf documented", doc.includes(CORRUPT_REV));
  ok("powershell comma split incident", /powershell.*comma|comma split/i.test(docLower));
  ok("corrupt env value documented", /true NONGA_AI_EMERGENCY_KILL_SWITCH=true/i.test(doc));
  ok("incident discarded", /discarded|invalid/i.test(docLower));
  ok("quoted fix documented", /quoted.*update-env-vars|quote.*update-env-vars/i.test(docLower));
}

// --- kill-switch re-test ---
{
  ok("quoted kill env command", doc.includes(QUOTED_KILL_ENV) || doc.includes('update-env-vars="NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=true,NONGA_AI_EMERGENCY_KILL_SWITCH=true"'));
  ok("kill test revision 00065-2lf", doc.includes(KILL_TEST_REV));
  ok("kill switch re-test PASS", /kill-switch re-test.*PASS|re-test.*PASS/i.test(doc));
  ok("CP-02 kill providerNetwork false", /CP-02.*emergency_kill_switch|emergency_kill_switch.*CP-02/i.test(doc));
  ok("CP-02 kill gate emergency_kill_switch", /realProviderGateReason.*emergency_kill_switch|emergency_kill_switch/i.test(doc));
  ok("CP-02 globalEmergencyKillSwitchActive true", /globalEmergencyKillSwitchActive.*true/i.test(doc));
  ok("CP-02 gemini not called", /gemini.*not called|not called.*gemini/i.test(docLower));
  ok("CP-02 not real_provider_call_ok", /≠.*real_provider_call_ok|not.*real_provider_call_ok/i.test(doc));
  ok("CP-03 scenario-local kill PASS", /CP-03.*PASS|scenario-local kill.*PASS/i.test(doc));
  ok(
    "CP-03 providerNetwork false",
    /### CP-03[\s\S]{0,400}providerNetwork[\s\S]{0,60}false/i.test(doc)
  );
  ok("kill ON public chat legacy", /kill.*legacy|during kill/i.test(docLower) && doc.includes(LEGACY_START_OVER));
}

// --- final restore ---
{
  ok("quoted restore env command", doc.includes(QUOTED_RESTORE_ENV) || doc.includes('update-env-vars="NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=false,NONGA_AI_EMERGENCY_KILL_SWITCH=false"'));
  ok("final revision 00066-hch", doc.includes(FINAL_REV));
  ok("final user visible false", /\| `NONGA_AI_USER_VISIBLE_ENABLED` \| \*\*`false`\*\*/.test(doc));
  ok("final chat shadow flag false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`false`\*\*/i.test(doc));
  ok("final admin shadow true", /NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`true`\*\*/i.test(doc));
  ok("final kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*\*\*`false`\*\*/i.test(doc));
  ok("final budget daily 5", /BUDGET_DAILY.*5|daily.*5/i.test(docLower));
  ok("final budget monthly 50", /BUDGET_MONTHLY.*50|monthly.*50/i.test(docLower));
  ok("final CP-02 providerNetwork false", /final.*providerNetwork.*false|CP-02.*chat_shadow_real_provider_flag_off/i.test(docLower));
  ok("final git clean", /git status.*clean|working tree clean/i.test(docLower));
}

// --- public chat ---
{
  ok("chat smoke URL", doc.includes(CHAT_URL) || doc.includes("/chat"));
  ok("chat message เริ่มใหม่", /"เริ่มใหม่"/.test(doc));
  ok("chat legacy response exact", doc.includes(LEGACY_START_OVER));
  ok("chat no AI replacing legacy", /AI\/Gemini.*none|legacy.*100%|legacy orchestrator/i.test(docLower));
}

// --- hosting vs cloud run ---
{
  ok("hosting not redeployed", /Hosting.*Not redeployed|Hosting.*SKIPPED/i.test(doc));
  ok("firestore rules not deployed", /Firestore rules.*not deployed|not deployed.*Firestore/i.test(doc));
  ok("production not deployed", /production.*not done|not deployed.*production/i.test(docLower));
}

// --- rollback prepared ---
{
  ok("rollback not needed", /rollback.*not needed|not needed.*smoke/i.test(docLower));
  ok("rollback image v6.1K.1", doc.includes(PREV_IMAGE));
  ok("rollback image command", doc.includes(ROLLBACK_IMAGE_URI) || doc.includes(PREV_IMAGE));
  ok("rollback env command prepared", /gcloud run services update nonga-staging/.test(doc));
  ok("rollback env safe final", /final env already safe|already safe/i.test(docLower));
  ok("rollback not executed", /prepared only|not executed|not needed/i.test(docLower));
}

// --- compliance ---
{
  ok("compliance user visible not true final", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*|not set.*false/i.test(doc));
  ok("compliance chat shadow flag false final", /final.*\*\*`false`\*\*|not kept.*false/i.test(docLower));
  ok("compliance no production deploy", /production deploy.*not done|not done.*production/i.test(docLower));
  ok("compliance no hosting deploy", /Hosting.*SKIPPED|not redeployed/i.test(doc));
  ok("compliance no firestore rules", /Firestore rules.*not deployed/i.test(doc));
  ok("compliance no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("compliance no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("compliance no public signup", /public signup/i.test(docLower));
  ok("compliance no real stock", /real stock import.*blocked|still blocked/i.test(docLower));
  ok("compliance no public AI", /public AI response.*none|AI response.*none/i.test(docLower));
  ok("compliance no v6.1L approval phrase", !/อนุมัติ.*v6\.1L|approval phrase.*v6\.1L/i.test(doc));
  ok("compliance no secrets access", /secrets versions access/i.test(doc));
}

// --- code alignment ---
{
  ok("server registers chat shadow sink", serverTs.includes("registerSalesBrainChatShadowSinkRoutes"));
  ok("sink route constant", sinkModule.includes(CHAT_SHADOW_ROUTE));
  ok("sink global kill check", sinkModule.includes("isGlobalChatShadowEmergencyKillSwitchActive"));
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
  ok("doc forbids user visible true final", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|not set.*false/i.test(doc));
  ok("doc no production deploy command", !/gcloud run deploy nonga-production/i.test(doc));
  ok("doc no new image deploy in kill test", /no new image deploy|image unchanged/i.test(docLower));
}

// --- package.json ---
{
  ok("package v61k5 script", pkg.includes("test:v61k5-chat-shadow-kill-switch-fix-staging-deploy-record"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61k5-chat-shadow-kill-switch-fix-staging-deploy-record.mts")
  );
}

// --- companion docs ---
{
  ok("v6.1K.4 doc exists", readFileSync(K4_DOC_PATH, "utf8").includes("v6.1K.4"));
  ok("v6.1K.3 doc exists", readFileSync(K3_DOC_PATH, "utf8").includes("v6.1K.3"));
}

console.log("\nDone v6.1K.5 Chat Shadow Kill Switch Fix Staging Deploy Record tests.");
if (process.exitCode) process.exit(process.exitCode);
