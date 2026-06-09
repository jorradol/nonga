/**
 * v6.1L — Controlled User-visible AI Pilot Plan (static validation only)
 * npm run test:v61l-controlled-user-visible-ai-pilot-plan
 */
import { readFileSync } from "node:fs";
import {
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import { SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY } from "../src/services/ai/salesBrainShadowChatPath.ts";

const DOC_PATH = "docs/v6.1L-controlled-user-visible-ai-pilot-plan.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "fcdd655ec71a9cb88ff7f53ed3b983e6db65bfc6";
const PRIMARY_URL = "https://a.nongbot.org";
const CHAT_URL = "https://a.nongbot.org/chat";
const CHAT_SHADOW_ROUTE = "/api/admin/chat-shadow-sink";
const ADMIN_SHADOW_ROUTE = "/api/admin/sales-brain-shadow-smoke";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const APPROVAL_PHRASE_V61L =
  "อนุมัติให้เปิด user-visible AI แบบ controlled pilot บน staging เท่านั้น ตาม v6.1L";
const ALLOWLIST_ENV = "NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS";
const IMAGE_TAG = "v6.1K.5-chat-shadow-kill-switch-fix";
const FINAL_REV = "nonga-staging-00066-hch";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1L Controlled User-visible AI Pilot Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61l-controlled-user-visible-ai-pilot-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const runtimeFlags = readFileSync("src/services/ai/salesBrainRuntimeFlags.ts", "utf8");
const chatPath = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");

// --- doc exists + v6.1L ---
{
  ok("pilot plan doc exists", doc.length > 8000);
  ok("doc v6.1L label", doc.includes("v6.1L"));
  ok("doc controlled user-visible pilot", /controlled user-visible ai pilot/i.test(doc));
  ok("doc docs tests only", /docs\/tests only|pilot plan.*docs/i.test(docLower));
  ok("doc HEAD fcdd655", doc.includes(HEAD_SHA) || doc.includes("fcdd655"));
  ok("doc references v61k5", doc.includes("v6.1K.5"));
  ok("doc not approval to enable", /ไม่ใช่การอนุมัติ|not granted|planning only/i.test(docLower));
}

// --- v6.1K.5 baseline ---
{
  ok("baseline revision 00066-hch", doc.includes(FINAL_REV));
  ok("baseline image v6.1K.5", doc.includes(IMAGE_TAG));
  ok("baseline user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*\*\*`false`\*\*/.test(doc));
  ok("baseline chat shadow flag false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`false`\*\*/.test(doc));
  ok("baseline kill switch validated", /global kill switch|CP-02.*emergency_kill_switch/i.test(doc));
  ok("no secrets versions access baseline", /did not run.*secrets versions access/i.test(docLower));
}

// --- gate status ---
{
  ok("gate table G-01 v61f pass", /G-01.*v6\.1F.*PASS/i.test(doc));
  ok("gate table G-07 v61k pass", /G-07.*PASS/i.test(doc));
  ok("gate table G-09 v61l this doc", /G-09.*v6\.1L/i.test(doc));
  ok("gate G-10 requires approval", /G-10.*approval phrase|requires.*approval/i.test(doc));
}

// --- multi-layer guardrail ---
{
  ok("guardrail design section", /Multi-layer Guardrail Design/i.test(doc));
  ok("guardrail L2 kill switch", /L2.*EMERGENCY_KILL_SWITCH/i.test(doc));
  ok("guardrail L3 user visible enabled", /L3.*USER_VISIBLE_ENABLED/i.test(doc));
  ok("guardrail L4 v60r block", /L4.*SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED/i.test(doc));
  ok("guardrail L6 allowlist", /L6.*Allowlist/i.test(doc));
  ok("guardrail fallback legacy", /legacy user-visible response|fallback legacy/i.test(docLower));
}

// --- allowlist design ---
{
  ok("allowlist section", /Allowlist.*Tester-only Gate Design/i.test(doc));
  ok("allowlist env key", doc.includes(ALLOWLIST_ENV));
  ok("allowlist default deny", /default-deny|absent or empty/i.test(docLower));
  ok("allowlist guest always legacy", /guest.*always legacy|never in allowlist/i.test(docLower));
  ok("allowlist no phone in env", /no phone numbers|ไม่มี phone/i.test(docLower));
  ok("allowlist max testers", /≤ 5|max testers/i.test(docLower));
  ok("allowlist server-side only", /server-only|server env only/i.test(docLower));
  ok("no hardcoded tester UIDs client", /no hardcoded tester UIDs/i.test(docLower));
}

// --- pre-pilot checklist ---
{
  ok("pre-pilot checklist section", /Pre-pilot Smoke Checklist/i.test(doc));
  ok("pre-pilot P-01 v61l test", /test:v61l-controlled-user-visible-ai-pilot-plan/.test(doc));
  ok("pre-pilot P-10 legacy start over", /P-10.*เริ่มใหม่|เริ่มใหม่.*exact legacy/i.test(doc));
  ok("pre-pilot P-15 approval phrase", /P-15.*approval phrase/i.test(doc));
  ok("pre-pilot P-16 synthetic only", /synthetic test accounts|no real PII/i.test(docLower));
  ok("pre-pilot v60v command", /test:v60v-shadow-chat-path-wiring-user-visible-legacy/.test(doc));
  ok("pre-pilot v61k4 command", /test:v61k4-chat-shadow-global-kill-switch-fix/.test(doc));
}

// --- post-pilot checklist ---
{
  ok("post-pilot checklist section", /Post-pilot Smoke Checklist/i.test(doc));
  ok("post-pilot A-02 guest legacy", /A-02.*เริ่มใหม่|exact legacy/i.test(doc));
  ok("post-pilot A-03 non-allowlisted legacy", /A-03.*non-allowlisted.*legacy/i.test(doc));
  ok("post-pilot A-06 kill switch", /A-06.*Kill switch/i.test(doc));
  ok("post-pilot R-04 rollback legacy", /R-04.*เริ่มใหม่|exact legacy/i.test(doc));
}

// --- kill switch rollback ---
{
  ok("kill switch rollback section", /Kill Switch.*Rollback Plan/i.test(doc));
  ok("tier 1 emergency kill switch command", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/.test(doc));
  ok("tier 2 user visible false", /NONGA_AI_USER_VISIBLE_ENABLED=false/.test(doc));
  ok("tier 3 clear allowlist", new RegExp(`${ALLOWLIST_ENV}=`).test(doc));
  ok("tier 4 image rollback", doc.includes(IMAGE_TAG));
  ok("powershell quoting lesson", /PowerShell.*quote|quoted.*update-env-vars/i.test(doc));
  ok("rollback decision matrix", /Rollback decision matrix/i.test(doc));
}

// --- public chat legacy ---
{
  ok("legacy preservation section", /Public Chat Legacy Preservation/i.test(doc));
  ok("legacy exact string", doc.includes(LEGACY_START_OVER));
  ok("legacy guest 100 percent", /guest.*legacy 100%|legacy 100%.*guest/i.test(docLower));
  ok("legacy non-allowlisted 100 percent", /non-allowlisted.*legacy 100%/i.test(docLower));
  ok("chat smoke URL", doc.includes(CHAT_URL) || doc.includes(PRIMARY_URL));
}

// --- approval phrase ---
{
  ok("approval phrase section", /Approval Phrase/i.test(doc));
  ok("approval phrase exact v61l", doc.includes(APPROVAL_PHRASE_V61L));
  ok(
    "v61l planning no phrase required",
    /v6\.1L planning.*ไม่ต้องการ approval|ไม่ต้องการ approval phrase/i.test(doc)
  );
  ok("execution requires phrase", /v6\.1L\.2.*approval|requires.*approval phrase/i.test(docLower));
  ok("slice roadmap v61l1 v61l2", /v6\.1L\.1|v6\.1L\.2/.test(doc));
}

// --- DO NOT RUN YET ---
{
  ok("DO NOT RUN YET label", /DO NOT RUN YET/i.test(doc));
  ok("DO NOT RUN in v6.1L planning", /v6\.1L planning ห้ามรัน|not done in v6\.1L/i.test(doc));
  ok("future enable command documented", /gcloud run services update nonga-staging/.test(doc));
  ok("future allowlist in enable command", doc.includes(ALLOWLIST_ENV));
}

// --- acceptance criteria ---
{
  ok("acceptance criteria section", /Future v6\.1L\.1 Acceptance Criteria/i.test(doc));
  ok("acceptance L1-07 legacy start over", /L1-07.*เริ่มใหม่|exact legacy string/i.test(doc));
  ok("acceptance no payment lead", /payment.*lead.*reveal|L1-08/i.test(doc));
}

// --- forbidden / compliance ---
{
  ok("forbidden no deploy", /Deploy.*not done|ยังไม่ deploy/i.test(docLower));
  ok("forbidden no env update", /env update.*not done|gcloud run services update.*not done/i.test(docLower));
  ok(
    "forbidden user visible not true",
    /NONGA_AI_USER_VISIBLE_ENABLED=true.*not done|remains \*\*false\*\*/i.test(doc)
  );
  ok("forbidden no public AI", /public ai.*not done|ไม่เปิด public ai/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no production", /production.*not touched|excluded/i.test(docLower));
  ok(
    "forbidden no payment settlement",
    /payment.*settlement|lead.*reveal.*outcome/i.test(docLower)
  );
  ok("forbidden no real stock", /real stock.*blocked|still blocked/i.test(docLower));
  ok("forbidden no real phone", /real phone|real customer data/i.test(docLower));
  ok("execution approval not granted", /not granted|ไม่ใช่การอนุมัติ/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.1L/i.test(doc));
}

// --- routes documented ---
{
  ok("chat shadow route", doc.includes(CHAT_SHADOW_ROUTE));
  ok("admin shadow route", doc.includes(ADMIN_SHADOW_ROUTE));
}

// --- code gates still blocked (current state) ---
{
  ok("v60r user visible still blocked in code", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === true);
  ok("v60v legacy user visible only", SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY === true);
  ok("runtime flags env key exported", runtimeFlags.includes(NONGA_AI_USER_VISIBLE_ENABLED_ENV));
  ok("chat path legacy constant", chatPath.includes("SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY"));
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
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v61l script",
    pkg.includes("test:v61l-controlled-user-visible-ai-pilot-plan")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v61l-controlled-user-visible-ai-pilot-plan.mts")
  );
}

console.log("\nDone v6.1L Controlled User-visible AI Pilot Plan tests.");
if (process.exitCode) process.exit(process.exitCode);
