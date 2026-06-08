/**
 * v6.1K.3 — Budget, Kill-switch, and Rollback Exercise (static validation only)
 * npm run test:v61k3-budget-kill-switch-rollback-exercise
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.1K.3-budget-kill-switch-rollback-exercise.md";
const K2_DOC_PATH = "docs/v6.1K.2-chat-shadow-real-provider-flag-pilot.md";
const K1_DOC_PATH = "docs/v6.1K.1-chat-shadow-sink-staging-deploy-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "07ba67f63ce9a49d5f935b55960749be40ec123b";
const IMAGE_TAG = "v6.1K.1-chat-path-shadow-sink";
const DIGEST = "sha256:0cf221536c2fea79215cd26aa793214e8ce3f9f42b9a747f8ef3bae46900f84e";
const REV_BEFORE = "nonga-staging-00059-lvx";
const REV_KILL_ON = "nonga-staging-00060-t2f";
const REV_KILL_OFF = "nonga-staging-00061-7wz";
const REV_FINAL = "nonga-staging-00062-5sr";
const CHAT_URL = "https://a.nongbot.org/chat";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";

const CMD_KILL_ON =
  "gcloud run services update nonga-staging --project=nonga-ce93c --region=asia-southeast1 --update-env-vars=NONGA_AI_EMERGENCY_KILL_SWITCH=true";
const CMD_KILL_OFF =
  "gcloud run services update nonga-staging --project=nonga-ce93c --region=asia-southeast1 --update-env-vars=NONGA_AI_EMERGENCY_KILL_SWITCH=false";
const CMD_CHAT_FLAG_OFF =
  "gcloud run services update nonga-staging --project=nonga-ce93c --region=asia-southeast1 --update-env-vars=NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=false";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1K.3 Budget Kill-switch Rollback Exercise ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61k3-budget-kill-switch-rollback-exercise.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const shadowSmoke = readFileSync("src/services/ai/salesBrainServerShadowSmoke.ts", "utf8");

// --- doc exists + v6.1K.3 / G-07 ---
{
  ok("exercise record doc exists", doc.length > 5000);
  ok("doc v6.1K.3 label", doc.includes("v6.1K.3"));
  ok("doc G-07 label", /G-07|budget.*kill-switch.*rollback/i.test(doc));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc references v6.1K.2", doc.includes("v6.1K.2"));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD 07ba67f", doc.includes(HEAD_SHA) || doc.includes("07ba67f"));
  ok("preflight origin 07ba67f", /origin.*07ba67f|HEAD = origin/i.test(doc));
  ok("preflight revision before 00059-lvx", doc.includes(REV_BEFORE));
  ok("preflight image tag v6.1K.1", doc.includes(IMAGE_TAG));
  ok("preflight digest", doc.includes(DIGEST));
  ok("preflight health 200", /\/api\/health.*200|200.*\/api\/health/i.test(docLower));
  ok("preflight publicSignup false", /publicSignupEnabled.*false/i.test(doc));
  ok("preflight CP-02 baseline providerNetwork true", /CP-02.*providerNetwork.*true|providerNetwork:true/i.test(doc));
  ok("preflight CP-02 baseline gemini", /CP-02.*gemini|provider:gemini/i.test(doc));
  ok("preflight CP-02 baseline real_provider_call_ok", /baseline.*real_provider_call_ok|CP-02.*real_provider_call_ok/i.test(doc));
  ok("preflight chat shadow flag true before exercise", /CHAT_SHADOW.*\*\*`true`\*\*|CHAT_SHADOW_REAL_PROVIDER_ENABLED.*`true`/i.test(doc));
  ok("preflight kill switch false", /before exercise[\s\S]*EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("no secrets versions access preflight", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- revisions chain ---
{
  ok("revision 00059-lvx documented", doc.includes(REV_BEFORE));
  ok("revision 00060-t2f documented", doc.includes(REV_KILL_ON));
  ok("revision 00061-7wz documented", doc.includes(REV_KILL_OFF));
  ok("final revision 00062-5sr", doc.includes(REV_FINAL));
  ok("revision chain 00059 to 00060", /00059-lvx.*00060-t2f|00059-lvx[\s\S]*00060-t2f/i.test(doc));
  ok("revision chain 00060 to 00061", /00060-t2f.*00061-7wz|00060-t2f[\s\S]*00061-7wz/i.test(doc));
  ok("revision chain 00061 to 00062", /00061-7wz.*00062-5sr|00061-7wz[\s\S]*00062-5sr/i.test(doc));
  ok("image unchanged", /image.*unchanged|unchanged.*image/i.test(docLower));
  ok("no image deploy", /image deploy.*not done|not done.*image|no `--image=`/i.test(docLower));
}

// --- env commands ---
{
  ok("env cmd kill switch true", doc.includes(CMD_KILL_ON) || doc.includes("NONGA_AI_EMERGENCY_KILL_SWITCH=true"));
  ok("env cmd kill switch false", doc.includes(CMD_KILL_OFF) || doc.includes("NONGA_AI_EMERGENCY_KILL_SWITCH=false"));
  ok("env cmd chat flag false", doc.includes(CMD_CHAT_FLAG_OFF) || doc.includes("NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=false"));
}

// --- important finding: global kill switch gap ---
{
  ok("finding global kill did not block CP-02", /global kill switch.*did not block|did not block.*CP-02|ยังเรียก real Gemini/i.test(doc));
  ok("finding CP-02 observed providerNetwork true kill ON", /EMERGENCY_KILL_SWITCH=true[\s\S]*providerNetwork.*\*\*`true`\*\*|providerNetwork.*true[\s\S]*real_provider_call_ok/i.test(doc));
  ok("finding expected providerNetwork false", /Expected.*providerNetwork.*false|Expected \(exercise spec\)[\s\S]*false/i.test(doc));
  ok("finding root cause stagingStyleShadowEnv", /stagingStyleShadowEnv\(\)/.test(doc));
  ok("finding hardcode kill switch false", /hardcode[\s\S]*EMERGENCY_KILL_SWITCH.*false|EMERGENCY_KILL_SWITCH_ENV\].*false/i.test(doc));
  ok("finding global kill not flow to CP-02 gate", /global.*kill switch.*ไม่ไหล|does not flow|ยังไม่ไหล/i.test(doc));
  ok("partially passed conclusion", /partially passed|PARTIAL/i.test(doc));
}

// --- CP-03 scenario-local guard ---
{
  ok("CP-03 providerNetwork false", /CP-03[\s\S]*providerNetwork.*false|CP-03.*\*\*`false`\*\*/i.test(doc));
  ok("CP-03 enablement emergency_kill_switch", /CP-03[\s\S]*emergency_kill_switch|enablementBlockedReason.*emergency_kill_switch/i.test(doc));
  ok("CP-03 scenario-local kill PASS", /CP-03.*PASS|scenario-local kill.*PASS/i.test(doc));
}

// --- Exercise B rollback PASS ---
{
  ok("exercise B rollback PASS", /Exercise B.*PASS|rollback chat flag.*PASS/i.test(doc));
  ok("CP-02 after flag off providerNetwork false", /CHAT_SHADOW_REAL_PROVIDER_ENABLED=false[\s\S]*providerNetwork.*false|providerNetwork.*\*\*`false`\*\*/i.test(doc));
  ok("CP-02 gate chat_shadow_real_provider_flag_off", /chat_shadow_real_provider_flag_off/.test(doc));
  ok("CP-02 not real_provider_call_ok after rollback", /not `real_provider_call_ok`|Not `real_provider_call_ok`/i.test(doc));
  ok("CP-02 userVisibleOff true after rollback", /userVisibleOff.*\*\*`true`\*\*/i.test(doc));
  ok("final chat shadow flag false", /\| `NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED` \| \*\*`false`\*\*/.test(doc));
  ok("kept chat shadow flag false safe end", /Kept.*CHAT_SHADOW.*false|safe end/i.test(doc));
}

// --- Exercise C ---
{
  ok("exercise C no budget env change", /Did not modify.*BUDGET|did not modify.*budget|ไม่แก้ budget/i.test(doc));
  ok("CP-05 production_environment", /CP-05[\s\S]*production_environment|production_environment/i.test(doc));
  ok("CP-05 providerNetwork false", /CP-05[\s\S]*providerNetwork.*false/i.test(doc));
  ok("no Gemini loop", /Gemini loop.*none|no repeated CP-02|ไม่มี Gemini loop/i.test(doc));
  ok("budget daily 5 monthly 50", /daily.*5.*monthly.*50|BUDGET_DAILY.*5[\s\S]*BUDGET_MONTHLY.*50/i.test(doc));
}

// --- public chat legacy ---
{
  ok("chat smoke URL", doc.includes(CHAT_URL) || doc.includes("/chat"));
  ok("chat message เริ่มใหม่", /"เริ่มใหม่"/.test(doc));
  ok("chat legacy exact", doc.includes(LEGACY_START_OVER));
  ok("preflight public chat legacy PASS", /Preflight[\s\S]*exact legacy|preflight.*legacy/i.test(docLower));
  ok("kill ON public chat legacy PASS", /Kill switch ON[\s\S]*exact legacy|during kill switch/i.test(docLower));
  ok("after rollback public chat legacy", /After rollback|after rollback flag[\s\S]*exact legacy/i.test(docLower));
}

// --- final env safe ---
{
  ok("final user visible false", /\| `NONGA_AI_USER_VISIBLE_ENABLED` \| \*\*`false`\*\*/.test(doc));
  ok("final admin shadow true", /ADMIN_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`true`\*\*/i.test(doc));
  ok("final kill switch false", /final[\s\S]*EMERGENCY_KILL_SWITCH.*\*\*`false`\*\*|Final Env[\s\S]*EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("final git clean", /git status.*clean|working tree clean/i.test(docLower));
}

// --- conclusion v6.1K.4 before v6.1L ---
{
  ok("conclusion rollback works", /Rollback flag.*Works|rollback.*works/i.test(doc));
  ok("conclusion final env safe", /Final env.*Safe|final env.*safe/i.test(doc));
  ok("conclusion fix before v6.1L", /before.*v6\.1L|before any.*v6\.1L|blocked until.*v6\.1L/i.test(doc));
  ok("recommended v6.1K.4", /v6\.1K\.4.*Global Kill Switch/i.test(doc));
  ok("no v6.1L approval phrase", !/อนุมัติ.*v6\.1L|approval phrase.*v6\.1L/i.test(doc));
}

// --- code alignment (root cause file exists) ---
{
  ok("code has stagingStyleShadowEnv", shadowSmoke.includes("stagingStyleShadowEnv"));
  ok("code hardcodes kill false in stagingStyleShadowEnv", /stagingStyleShadowEnv[\s\S]*EMERGENCY_KILL_SWITCH.*false/i.test(shadowSmoke));
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
  ok("doc forbids user visible true final", /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc));
  ok("doc no production deploy command", !/gcloud run deploy nonga-production/i.test(doc));
  ok(
    "doc secrets access only as did-not-run",
    /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower) &&
      !/executed.*gcloud secrets versions access/i.test(docLower)
  );
}

// --- compliance ---
{
  ok("compliance no public AI", /public AI response.*not changed|not changed.*legacy/i.test(docLower));
  ok("compliance no hosting deploy", /Firebase Hosting deploy.*not done|Hosting.*SKIPPED/i.test(doc));
  ok("compliance no firestore rules", /Firestore rules deploy.*not done/i.test(doc));
  ok("compliance no payment settlement", /payment.*invoice.*settlement/i.test(docLower));
  ok("compliance no lead reveal", /buyer lead.*seller reveal|outcome/i.test(docLower));
  ok("compliance no public signup", /public signup/i.test(docLower));
  ok("compliance no real stock", /real stock import.*blocked|still blocked/i.test(docLower));
}

// --- package.json ---
{
  ok("package v61k3 script", pkg.includes("test:v61k3-budget-kill-switch-rollback-exercise"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61k3-budget-kill-switch-rollback-exercise.mts")
  );
}

// --- companion docs ---
{
  ok("v6.1K.2 doc exists", readFileSync(K2_DOC_PATH, "utf8").includes("v6.1K.2"));
  ok("v6.1K.1 doc exists", readFileSync(K1_DOC_PATH, "utf8").includes("v6.1K.1"));
}

console.log("\nDone v6.1K.3 Budget Kill-switch Rollback Exercise tests.");
if (process.exitCode) process.exit(process.exitCode);
