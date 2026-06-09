/**
 * v6.1L — Controlled User-visible AI Pilot Execution Closure Record (static validation only)
 * npm run test:v61l-controlled-user-visible-ai-pilot-execution-closure-record
 */
import { readFileSync } from "node:fs";
import { SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const DOC_PATH =
  "docs/v6.1L-controlled-user-visible-ai-pilot-execution-closure-record.md";
const PLAN_DOC_PATH = "docs/v6.1L-controlled-user-visible-ai-pilot-plan.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const FINAL_COMMIT = "166f639ad0af6429fbf86301bede5e48e171ce19";
const FINAL_REV = "nonga-staging-00075-rpg";
const FINAL_IMAGE = "v6.1L.2j-a-pilot-new-chat-no-response-permission-fallback";
const FINAL_DIGEST = "sha256:c9b0e38bbc6277e0ff47220dd657ec7480934b380d815fe41cb270908ba4ca40";
const FINAL_BUILD = "125e0d59-05b6-428f-a828-12ba9b8e5023";
const FINAL_JS = "index--RQAkV1v.js";
const REV_2E = "nonga-staging-00071-ck7";
const REV_2F = "nonga-staging-00072-5vs";
const REV_2H = "nonga-staging-00073-f4w";
const REV_2I = "nonga-staging-00074-lbq";
const ROLLBACK_IMAGE_2I = "v6.1L.2i-a-pilot-car-context-session-scope";
const ROLLBACK_JS_2I = "index-27CYGqRu.js";
const DEEP_ROLLBACK_IMAGE = "v6.1K.5-chat-shadow-kill-switch-fix";
const DEEP_ROLLBACK_REV = "nonga-staging-00066-hch";
const PRIMARY_URL = "https://a.nongbot.org";
const HOSTING_URL = "https://nonga-ce93c.web.app";
const OPENING_PHRASE =
  "อนุมัติให้เปิด user-visible AI แบบ controlled pilot บน staging เท่านั้น ตาม v6.1L";
const CLOSURE_PHRASE =
  "ลุงอนุมัติให้ทำ execution record เพื่อปิด v6.1L Controlled User-visible AI Pilot ได้ครับ";
const NO_CONTEXT_SNIPPET = "น้องเอยังไม่เห็นชุดรถล่าสุดให้เทียบในแชทนี้ครับ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1L Controlled User-visible AI Pilot Execution Closure Record ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61l-controlled-user-visible-ai-pilot-execution-closure-record.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const planDoc = readFileSync(PLAN_DOC_PATH, "utf8");

// --- doc exists + closed ---
{
  ok("closure doc exists", doc.length > 6000);
  ok("doc v6.1L label", doc.includes("v6.1L"));
  ok("doc execution closure", /execution closure|ปิดแล้ว|CLOSED/i.test(doc));
  ok("doc manual retest PASS", /manual retest.*PASS|PASS ทั้ง 4/i.test(doc));
  ok("doc final commit 166f639", doc.includes(FINAL_COMMIT) || doc.includes("166f639"));
  ok("doc branch feature/chat", doc.includes("feature/chat-image-attachment-v1"));
}

// --- approval phrases ---
{
  ok("opening approval phrase", doc.includes(OPENING_PHRASE));
  ok("closure approval phrase", doc.includes(CLOSURE_PHRASE));
}

// --- revision history ---
{
  ok("rev 2e 00071-ck7", doc.includes(REV_2E));
  ok("rev 2f-a 00072-5vs", doc.includes(REV_2F));
  ok("rev 2h-a 00073-f4w", doc.includes(REV_2H));
  ok("rev 2i-a 00074-lbq", doc.includes(REV_2I));
  ok("rev 2j-a 00075-rpg", doc.includes(FINAL_REV));
  ok("image 2f-a tag", doc.includes("v6.1L.2f-a-pilot-buyer-recommendation-copy-polish"));
  ok("image 2h-a tag", doc.includes("v6.1L.2h-a-pilot-buyer-followup-hard-guard"));
  ok("image 2i-a tag", doc.includes(ROLLBACK_IMAGE_2I));
  ok("image 2j-a tag", doc.includes(FINAL_IMAGE));
  ok("build 2j recorded", doc.includes(FINAL_BUILD));
  ok("digest 2j recorded", doc.includes(FINAL_DIGEST));
}

// --- final live state ---
{
  ok("smoke base a.nongbot.org", doc.includes(PRIMARY_URL));
  ok("hosting URL web.app", doc.includes(HOSTING_URL) || doc.includes("nonga-ce93c.web.app"));
  ok("final JS bundle", doc.includes(FINAL_JS));
  ok("bridge route documented", doc.includes(SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE));
  ok("public signup false", /publicSignupEnabled.*false/i.test(docLower));
}

// --- final env metadata ---
{
  ok("env user visible true", /NONGA_AI_USER_VISIBLE_ENABLED.*\*\*`true`\*\*|USER_VISIBLE_ENABLED.*true/i.test(doc));
  ok("env allowlist masked", /allowlist.*masked|masked only|1 entry/i.test(docLower));
  ok("env chat shadow false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`false`\*\*|CHAT_SHADOW.*false/i.test(doc));
  ok("env kill switch false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*\*\*`false`\*\*|EMERGENCY_KILL_SWITCH.*false/i.test(doc));
  ok("env no secret dump", /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower));
  const docSansShas = doc.replace(/\b[a-f0-9]{40}\b/g, "");
  ok(
    "doc no raw firebase uid",
    !/\b[A-Za-z0-9]{28}\b/.test(docSansShas)
  );
}

// --- manual retest cases ---
{
  ok("retest case 1 search budget", /งบ 4 แสน มีรถอะไรน่าเล่น.*PASS|case 1.*PASS/i.test(doc));
  ok("retest case 2 compare", /เทียบคันที่ 1 กับ 2.*PASS|case 2.*PASS/i.test(doc));
  ok("retest case 3 refine", /เอาประหยัดน้ำมัน.*PASS|case 3.*PASS/i.test(doc));
  ok("retest case 4 new chat", /แชทใหม่.*PASS|case 4.*PASS/i.test(doc));
  ok("no context copy snippet", doc.includes(NO_CONTEXT_SNIPPET));
  ok("no nonga-pilot marker pass", /ไม่มี `nonga-pilot:`|ไม่มี nonga-pilot/i.test(doc));
  ok("no zero cars pass", /ไม่ตอบ “0 คัน”|ไม่ตอบ .0 คัน/i.test(doc));
  ok("no stale corolla altis", /Corolla|Altis/.test(doc) && /ไม่ดึง/i.test(doc));
}

// --- rollback ---
{
  ok("rollback disable user visible", /NONGA_AI_USER_VISIBLE_ENABLED=false/i.test(doc));
  ok("rollback clear allowlist", /ALLOWLIST_UIDS=/i.test(doc));
  ok("rollback emergency kill switch", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/i.test(doc));
  ok("rollback cloud run image", /gcloud run services update nonga-staging/i.test(doc));
  ok("rollback hosting firebase", /firebase-tools deploy --only hosting/i.test(doc));
  ok("rollback image 2i-a", doc.includes(ROLLBACK_IMAGE_2I));
  ok("rollback js 2i-a", doc.includes(ROLLBACK_JS_2I));
  ok("deep rollback v6.1K.5", doc.includes(DEEP_ROLLBACK_IMAGE));
  ok("deep rollback rev 00066", doc.includes(DEEP_ROLLBACK_REV));
}

// --- limitations ---
{
  ok("limitation mock only", /mock only/i.test(docLower));
  ok("limitation no public AI", /ไม่เปิด public AI|not enabled/i.test(docLower));
  ok("limitation no real stock", /real stock.*not|ยังไม่ real stock/i.test(docLower));
  ok("limitation no production", /production.*excluded|ไม่ production/i.test(docLower));
  ok("limitation no payment lead", /payment|lead|reveal|outcome/i.test(doc) && /not done|not mutated|ไม่/i.test(docLower));
}

// --- v6.2 next phase ---
{
  ok("next v6.2 phase", doc.includes("v6.2"));
  ok("v6.2 docs readiness first", /docs\/readiness|readiness first/i.test(docLower));
  ok("v6.2 batch 5-10", /5.{0,3}10 คัน|5–10/i.test(doc));
  ok("v6.2 data rights", /data rights|image rights|PII guard|seller consent|stale listing/i.test(docLower));
}

// --- closure slice compliance ---
{
  ok("closure no runtime changes", /runtime code.*none|runtime.*❌.*none/i.test(docLower));
  ok("closure no deploy", /deploy.*none|❌.*none/i.test(docLower));
  ok("closure no env update", /env update.*none|ไม่ env update/i.test(docLower));
  ok("gate G-10 closed", /G-10.*CLOSED|G-10.*closed/i.test(doc));
  ok("gate G-11 blocked", /G-11.*blocked/i.test(doc));
}

// --- pilot plan cross-ref ---
{
  ok("plan doc references closure or closed", /closure record|CLOSED|ปิดแล้ว/i.test(planDoc));
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
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
}

// --- package ---
{
  ok(
    "package closure script",
    pkg.includes("test:v61l-controlled-user-visible-ai-pilot-execution-closure-record")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v61l-controlled-user-visible-ai-pilot-execution-closure-record.mts"
    )
  );
}

console.log("\nDone v6.1L Controlled User-visible AI Pilot Execution Closure Record tests.");
if (process.exitCode) process.exit(process.exitCode);
