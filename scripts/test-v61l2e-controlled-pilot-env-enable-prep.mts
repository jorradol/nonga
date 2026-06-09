/**
 * v6.1L.2e — Controlled Pilot Env Enable Prep (static validation only)
 * npm run test:v61l2e-controlled-pilot-env-enable-prep
 */
import { readFileSync } from "node:fs";
import { SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import { SALES_BRAIN_USER_VISIBLE_PILOT_MARKER } from "../src/services/ai/salesBrainUserVisibleChatPath.ts";

const DOC_PATH = "docs/v6.1L.2e-controlled-pilot-env-enable-prep.md";
const L2D_DOC_PATH = "docs/v6.1L.2d-controlled-pilot-server-bridge-staging-deploy-record.md";
const L2_DOC_PATH = "docs/v6.1L.2-controlled-pilot-preflight-command-review.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "7ffa52b3c4dee8e1980691e5559f3845083c0fc2";
const LIVE_REV = "nonga-staging-00068-2qr";
const PREV_REV = "nonga-staging-00067-f6v";
const LIVE_IMAGE = "v6.1L.2d-controlled-pilot-server-bridge";
const ROLLBACK_IMAGE = "v6.1L.1-user-visible-allowlist-gate";
const DEEP_ROLLBACK_IMAGE = "v6.1K.5-chat-shadow-kill-switch-fix";
const PRIMARY_URL = "https://a.nongbot.org";
const HOSTING_URL = "https://nonga-ce93c.web.app";
const LIVE_JS = "index-BZNOnRfe.js";
const LIVE_CSS = "index-BzbRjXCL.css";
const PLACEHOLDER_UID = "<ALLOWLIST_TESTER_UID>";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const APPROVAL_PHRASE =
  "อนุมัติให้เปิด user-visible AI แบบ controlled pilot บน staging เท่านั้น ตาม v6.1L";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1L.2e Controlled Pilot Env Enable Prep ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61l2e-controlled-pilot-env-enable-prep.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const bridgeSrc = readFileSync(
  "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts",
  "utf8"
);

// --- doc exists ---
{
  ok("prep doc exists", doc.length > 6000);
  ok("doc v6.1L.2e label", doc.includes("v6.1L.2e"));
  ok("doc env enable prep", /env enable.*prep|controlled pilot env enable/i.test(doc));
  ok("doc DO NOT RUN", /DO NOT RUN/i.test(doc));
  ok("doc HEAD 7ffa52b", doc.includes(HEAD_SHA) || doc.includes("7ffa52b"));
  ok("doc references v6.1L.2d", doc.includes("v6.1L.2d"));
  ok("doc env update not executed", /env update.*not executed|not executed.*env update/i.test(docLower));
}

// --- preflight executed ---
{
  ok("preflight section", /Preflight.*Executed/i.test(doc));
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD 7ffa52b", doc.includes(HEAD_SHA) || doc.includes("7ffa52b"));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight live revision 00068-2qr", doc.includes(LIVE_REV));
  ok("preflight live image v6.1L.2d", doc.includes(LIVE_IMAGE));
  ok("preflight previous revision 00067-f6v", doc.includes(PREV_REV));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("no secrets versions access preflight", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- hosting bundle ---
{
  ok("smoke base a.nongbot.org", doc.includes(PRIMARY_URL));
  ok("hosting URL web.app", doc.includes(HOSTING_URL) || doc.includes("nonga-ce93c.web.app"));
  ok("live JS bundle", doc.includes(LIVE_JS));
  ok("live CSS bundle", doc.includes(LIVE_CSS));
  ok("bridge bundle marker", /chat-user-visible-orchestrate/.test(doc));
  ok("bridge route documented", doc.includes(SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE));
}

// --- current env ---
{
  ok("env user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*\*\*`false`\*\*|USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("env chat shadow false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`false`\*\*|CHAT_SHADOW.*false/i.test(doc));
  ok("env allowlist absent", /ALLOWLIST_UIDS.*absent|ALLOWLIST.*absent/i.test(doc));
  ok("env kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*\*\*`false`\*\*|EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("env budget 5 50", /BUDGET_DAILY.*5/.test(doc) && /BUDGET_MONTHLY.*50/.test(doc));
  ok("env no secret dump", /no secret dump|metadata only/i.test(docLower));
}

// --- live smoke preflight ---
{
  ok("smoke health 200", /health.*200|GET \/api\/health.*200/i.test(doc));
  ok("smoke unauth bridge 401", /chat-user-visible-orchestrate.*401|bridge.*401/i.test(docLower));
  ok("smoke fake uid rejected", /fake UID rejected|fake uid rejected/i.test(docLower));
  ok("smoke admin revenue 401", /revenue.*401|admin\/revenue.*401/i.test(doc));
  ok("smoke start over exact", doc.includes(LEGACY_START_OVER));
  ok("smoke public AI not shown", /user-visible AI.*none|none.*env off/i.test(docLower));
  ok("smoke no provider", /no provider|none observed/i.test(docLower));
}

// --- env update command ---
{
  ok("env update section", /Env Update Command/i.test(doc));
  ok("env update DO NOT RUN", /DO NOT RUN YET/i.test(doc));
  ok("powershell quoted update-env-vars", /--update-env-vars="NONGA_AI_USER_VISIBLE_ENABLED=true/.test(doc));
  ok("env update user visible true proposed", /USER_VISIBLE_ENABLED.*\*\*`true`\*\*/.test(doc));
  ok("env update allowlist placeholder", doc.includes(PLACEHOLDER_UID));
  ok("env update chat shadow stays false", /CHAT_SHADOW_REAL_PROVIDER_ENABLED=false/.test(doc));
  ok("env update emergency false", /EMERGENCY_KILL_SWITCH=false/.test(doc));
  ok("powershell anti-pattern documented", /BROKEN.*comma splits/i.test(doc));
  ok("redacted command template", /<REDACTED>/.test(doc));
  ok("doc no real firebase uid", !/[a-zA-Z0-9]{28}(?!\.)/.test(doc.replace(/7ffa52b3c4dee8e1980691e5559f3845083c0fc2/g, "").replace(/78a4b9402ae30ac741696a5c7bce676b3811e3a8/g, "")));
}

// --- post-env smoke checklist ---
{
  ok("post-env smoke section", /Post-env Smoke/i.test(doc));
  ok("smoke guest legacy", /Guest.*legacy/i.test(doc));
  ok("smoke non-allowlisted legacy", /Non-allowlisted.*legacy/i.test(doc));
  ok("smoke allowlisted pilot", new RegExp(SALES_BRAIN_USER_VISIBLE_PILOT_MARKER.replace(":", "\\:")).test(doc));
  ok("smoke kill switch", /Kill Switch/i.test(doc));
  ok("smoke no raw uid", /raw UID|No raw UID/i.test(doc));
  ok("smoke no pii secret dump", /PII.*secret|secret.*dump/i.test(doc));
  ok("smoke payment lead reveal", /payment.*lead.*reveal|lead.*reveal.*outcome/i.test(docLower));
}

// --- rollback ---
{
  ok("rollback section", /Rollback Plan/i.test(doc));
  ok("rollback disable user visible", /USER_VISIBLE_ENABLED=false/.test(doc));
  ok("rollback clear allowlist", /ALLOWLIST_UIDS=,/.test(doc));
  ok("rollback chat shadow false", /CHAT_SHADOW_REAL_PROVIDER_ENABLED=false/.test(doc));
  ok("rollback emergency kill switch", /EMERGENCY_KILL_SWITCH=true/.test(doc));
  ok("rollback v6.1L.1 image", doc.includes(ROLLBACK_IMAGE));
  ok("rollback revision 00067-f6v", doc.includes(PREV_REV));
  ok("deep rollback v6.1K.5", doc.includes(DEEP_ROLLBACK_IMAGE));
  ok("rollback readiness prepared", /rollback readiness|commands prepared/i.test(docLower));
}

// --- approval phrase ---
{
  ok("approval phrase documented", doc.includes(APPROVAL_PHRASE));
  ok("prep not execution approval", /ยังไม่ใช่ approval phrase|not.*approval phrase.*env update/i.test(doc));
  ok("tester uid procedure", /Tester UID Procedure/i.test(doc));
  ok("uid not in git", /not git|ops channel/i.test(docLower));
}

// --- forbidden ---
{
  ok("forbidden section", /Forbidden.*v6.1L.2e/i.test(doc));
  ok("forbidden no deploy", /Hosting deploy|Cloud Run.*deploy.*not done/i.test(doc));
  ok("forbidden no chat shadow true", /CHAT_SHADOW_REAL_PROVIDER_ENABLED=true.*not set|not set.*CHAT_SHADOW/i.test(docLower));
  ok("forbidden no secret access", /secrets versions access.*not done|not done.*secrets/i.test(docLower));
}

// --- runtime bridge unchanged ---
{
  ok("bridge uses getServerAuthContext", bridgeSrc.includes("getServerAuthContext"));
  ok("bridge no body uid", !bridgeSrc.includes("body?.firebaseUid"));
}

// --- related docs ---
{
  const l2d = readFileSync(L2D_DOC_PATH, "utf8");
  const l2 = readFileSync(L2_DOC_PATH, "utf8");
  ok("v6.1L.2d deploy record exists", l2d.length > 8000);
  ok("v6.1L.2 preflight review exists", l2.length > 8000);
}

// --- doc no secrets ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- test script static ---
{
  const selfCode = selfSrc.split("// --- test script static ---")[0] ?? selfSrc;
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package ---
{
  ok("package script", pkg.includes("test:v61l2e-controlled-pilot-env-enable-prep"));
  ok("package points to mts", pkg.includes("scripts/test-v61l2e-controlled-pilot-env-enable-prep.mts"));
}

console.log("\nDone v6.1L.2e Controlled Pilot Env Enable Prep tests.");
if (process.exitCode) process.exit(process.exitCode);
