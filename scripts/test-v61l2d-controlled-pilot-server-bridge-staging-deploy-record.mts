/**
 * v6.1L.2d — Controlled Pilot Server Bridge Staging Deploy Record (static validation only)
 * npm run test:v61l2d-controlled-pilot-server-bridge-staging-deploy-record
 */
import { readFileSync } from "node:fs";
import { SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const DOC_PATH = "docs/v6.1L.2d-controlled-pilot-server-bridge-staging-deploy-record.md";
const L2C_DOC_PATH = "docs/v6.1L.2c-controlled-pilot-server-orchestration-bridge.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "78a4b9402ae30ac741696a5c7bce676b3811e3a8";
const BUILD_ID = "58cd2a20-1b69-46d8-88f4-5ae9859bf10c";
const IMAGE_TAG = "v6.1L.2d-controlled-pilot-server-bridge";
const IMAGE_URI = `asia-southeast1-docker.pkg.dev/nonga-ce93c/nonga-staging/nonga-staging:${IMAGE_TAG}`;
const DIGEST = "sha256:7ea9644dc092e9299a9fadb9510eb44c8845b6b5b7b916536b1f18437d586c80";
const PREV_REV = "nonga-staging-00067-f6v";
const PREV_IMAGE = "v6.1L.1-user-visible-allowlist-gate";
const NEW_REV = "nonga-staging-00068-2qr";
const PRIMARY_URL = "https://a.nongbot.org";
const HOSTING_URL = "https://nonga-ce93c.web.app";
const LIVE_JS = "index-BZNOnRfe.js";
const LIVE_CSS = "index-BzbRjXCL.css";
const ROLLBACK_IMAGE = "v6.1L.1-user-visible-allowlist-gate";
const DEEP_ROLLBACK_IMAGE = "v6.1K.5-chat-shadow-kill-switch-fix";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const APPROVAL_PHRASE =
  "อนุมัติให้เปิด user-visible AI แบบ controlled pilot บน staging เท่านั้น ตาม v6.1L";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1L.2d Controlled Pilot Server Bridge Staging Deploy Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61l2d-controlled-pilot-server-bridge-staging-deploy-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const bridgeSrc = readFileSync(
  "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts",
  "utf8"
);

// --- doc exists ---
{
  ok("deploy record doc exists", doc.length > 8000);
  ok("doc v6.1L.2d label", doc.includes("v6.1L.2d"));
  ok("doc staging deploy record", /staging deploy record/i.test(doc));
  ok("doc execution record", /execution record|บันทึกผล/i.test(doc));
  ok("doc references v6.1L.2c", doc.includes("v6.1L.2c"));
}

// --- preflight ---
{
  ok("preflight git clean", /git status.*clean|working tree clean/i.test(docLower));
  ok("preflight branch", doc.includes("feature/chat-image-attachment-v1"));
  ok("preflight HEAD 78a4b94", doc.includes(HEAD_SHA) || doc.includes("78a4b94"));
  ok("preflight project nonga-ce93c", doc.includes("nonga-ce93c"));
  ok("preflight service nonga-staging", doc.includes("nonga-staging"));
  ok("preflight region asia-southeast1", doc.includes("asia-southeast1"));
  ok("preflight previous revision 00067-f6v", doc.includes(PREV_REV));
  ok("preflight previous image v6.1L.1", doc.includes(PREV_IMAGE));
  ok("preflight public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("no secrets versions access preflight", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
}

// --- tests/build before deploy ---
{
  ok("test v61l2c PASS recorded", /test:v61l2c.*PASS|v61l2c.*PASS/i.test(doc));
  ok("test v61l2b PASS recorded", /test:v61l2b.*PASS|v61l2b.*PASS/i.test(doc));
  ok("test v61l2 PASS recorded", /test:v61l2.*PASS|v61l2.*PASS/i.test(doc));
  ok("test v61l1 PASS recorded", /test:v61l1.*PASS|v61l1.*PASS/i.test(doc));
  ok("test v60v PASS recorded", /test:v60v.*PASS|v60v.*PASS/i.test(doc));
  ok("test v61k4 PASS recorded", /test:v61k4.*PASS|v61k4.*PASS/i.test(doc));
  ok("lint PASS recorded", /npm run lint.*PASS|lint.*PASS/i.test(docLower));
  ok("build staging hosting PASS", /build:staging:hosting.*PASS/i.test(docLower));
}

// --- cloud build ---
{
  ok("build ID recorded", doc.includes(BUILD_ID));
  ok("build status SUCCESS", /status.*SUCCESS|SUCCESS.*~2m/i.test(doc));
  ok("image tag v6.1L.2d", doc.includes(IMAGE_TAG));
  ok("image URI recorded", doc.includes(IMAGE_URI) || doc.includes(IMAGE_TAG));
  ok("digest recorded", doc.includes(DIGEST));
}

// --- cloud run ---
{
  ok("deploy image-only", /image-only|image only/i.test(docLower));
  ok("new revision 00068-2qr", doc.includes(NEW_REV));
  ok("previous revision 00067-f6v", doc.includes(PREV_REV));
  ok("no update-env-vars", /no.*--update-env-vars|no env update/i.test(docLower));
  ok("smoke base a.nongbot.org", doc.includes(PRIMARY_URL));
  ok("bridge route documented", doc.includes(SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE));
}

// --- hosting ---
{
  ok("hosting deploy success", /hosting deploy.*SUCCESS|Firebase Hosting.*SUCCESS/i.test(doc));
  ok("hosting URL web.app", doc.includes(HOSTING_URL) || doc.includes("nonga-ce93c.web.app"));
  ok("live JS bundle", doc.includes(LIVE_JS));
  ok("live CSS bundle", doc.includes(LIVE_CSS));
  ok("bridge bundle markers", /applyChatUserVisibleServerBridge|chat-user-visible-orchestrate/.test(doc));
}

// --- final env ---
{
  ok("env user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*\*\*`false`\*\*|NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("env chat shadow false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`false`\*\*|CHAT_SHADOW.*false/i.test(doc));
  ok("env allowlist absent", /ALLOWLIST_UIDS.*absent|ALLOWLIST.*absent/i.test(doc));
  ok("env kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*\*\*`false`\*\*|EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("env no secret dump", /did not dump.*secret|ไม่ dump secret/i.test(docLower));
}

// --- smoke ---
{
  ok("smoke health 200", /health.*200|GET \/api\/health.*200/i.test(doc));
  ok("smoke unauth bridge 401", /chat-user-visible-orchestrate.*401|bridge.*401/i.test(docLower));
  ok("smoke fake uid rejected", /fake UID rejected|fake uid rejected/i.test(docLower));
  ok("smoke admin revenue 401", /revenue.*401|admin\/revenue.*401/i.test(doc));
  ok("smoke start over exact", doc.includes(LEGACY_START_OVER));
  ok("smoke public AI not shown", /user-visible AI.*none|public AI.*none|ไม่แสดง/i.test(docLower));
  ok("smoke no provider public chat", /no provider|none observed/i.test(docLower));
  ok("smoke no raw uid", /raw UID.*none|Raw UID/i.test(doc));
  ok("smoke no pii secret dump", /Secret \/ env dump.*none|ไม่ dump/i.test(docLower));
}

// --- rollback ---
{
  ok("rollback v6.1L.1 image", doc.includes(ROLLBACK_IMAGE));
  ok("rollback revision 00067-f6v", doc.includes(PREV_REV));
  ok("deep rollback v6.1K.5", doc.includes(DEEP_ROLLBACK_IMAGE));
  ok("rollback not needed", /rollback not needed|Rollback not needed/i.test(doc));
}

// --- next steps env separate ---
{
  ok("approval phrase documented", doc.includes(APPROVAL_PHRASE));
  ok("env enable separate slice", /env enable.*separate|แยกจาก deploy|separate from this deploy/i.test(docLower));
  ok("env update not done", /env update.*not done|ไม่ env update/i.test(docLower));
}

// --- runtime unchanged in this slice ---
{
  ok("route constant matches runtime", SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE === "/api/ai/chat-user-visible-orchestrate");
  ok("server registers bridge", serverTs.includes("registerSalesBrainUserVisibleOrchestrationBridgeRoutes"));
  ok("bridge uses getServerAuthContext", bridgeSrc.includes("getServerAuthContext"));
  ok("bridge no body uid", !bridgeSrc.includes("body?.firebaseUid"));
}

// --- doc no secrets ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- l2c impl doc exists ---
{
  const l2c = readFileSync(L2C_DOC_PATH, "utf8");
  ok("v6.1L.2c impl doc exists", l2c.length > 1500);
}

// --- test script static ---
{
  const selfCode = selfSrc.split("// --- test script static ---")[0] ?? selfSrc;
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package ---
{
  ok("package script", pkg.includes("test:v61l2d-controlled-pilot-server-bridge-staging-deploy-record"));
  ok("package points to mts", pkg.includes("scripts/test-v61l2d-controlled-pilot-server-bridge-staging-deploy-record.mts"));
}

console.log("\nDone v6.1L.2d Controlled Pilot Server Bridge Staging Deploy Record tests.");
if (process.exitCode) process.exit(process.exitCode);
