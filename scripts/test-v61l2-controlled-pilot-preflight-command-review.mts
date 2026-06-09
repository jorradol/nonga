/**
 * v6.1L.2 — Controlled Pilot Pre-pilot Command Review (static validation only)
 * npm run test:v61l2-controlled-pilot-preflight-command-review
 */
import { readFileSync } from "node:fs";
import { SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED } from "../src/services/ai/salesBrainRuntimeFlags.ts";

const DOC_PATH = "docs/v6.1L.2-controlled-pilot-preflight-command-review.md";
const HEAD_SHA = "c512dd3cc49e457233958bb5fee05c41638bed24";
const LIVE_REV = "nonga-staging-00067-f6v";
const LIVE_IMAGE = "v6.1L.1-user-visible-allowlist-gate";
const ROLLBACK_IMAGE_L1 = "v6.1L.1-user-visible-allowlist-gate";
const ROLLBACK_IMAGE_K5 = "v6.1K.5-chat-shadow-kill-switch-fix";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const APPROVAL_PHRASE =
  "อนุมัติให้เปิด user-visible AI แบบ controlled pilot บน staging เท่านั้น ตาม v6.1L";
const PLACEHOLDER_UID = "<ALLOWLIST_TESTER_UID>";
const ALLOWLIST_ENV = "NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1L.2 Controlled Pilot Pre-pilot Command Review ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61l2-controlled-pilot-preflight-command-review.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists ---
{
  ok("preflight doc exists", doc.length > 8000);
  ok("doc v6.1L.2 label", doc.includes("v6.1L.2"));
  ok("doc pre-pilot command review", /pre-pilot command review/i.test(doc));
  ok("doc DO NOT RUN", /DO NOT RUN/i.test(doc));
  ok("doc HEAD c512dd3", doc.includes(HEAD_SHA) || doc.includes("c512dd3"));
  ok("doc references v61l1a", doc.includes("v6.1L.1a"));
  ok("doc not approval to open", /ยังไม่ใช่ approval phrase|not in this slice/i.test(doc));
}

// --- baseline ---
{
  ok("baseline revision 00067-f6v", doc.includes(LIVE_REV));
  ok("baseline image v6.1L.1", doc.includes(LIVE_IMAGE));
  ok("baseline user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*\*\*`false`\*\*/.test(doc));
  ok("baseline chat shadow false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`false`\*\*/.test(doc));
  ok("baseline allowlist absent", /ALLOWLIST_UIDS.*absent/i.test(doc));
  ok("baseline emergency kill false", /NONGA_AI_EMERGENCY_KILL_SWITCH.*\*\*`false`\*\*/.test(doc));
  ok("baseline budget 5 50", /BUDGET_DAILY.*5/.test(doc) && /BUDGET_MONTHLY.*50/.test(doc));
  ok("baseline public signup false", /publicSignupEnabled.*false|public signup.*false/i.test(docLower));
  ok("no secrets versions access", /did not run.*secrets versions access/i.test(docLower));
}

// --- prerequisites v60r ---
{
  ok("prerequisites section", /Prerequisites Before Env Enable/i.test(doc));
  ok("v60r blocked documented", doc.includes("SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED"));
  ok("v60r lifted in v61l2b code", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === false);
  ok("doc references v61l2b lift", doc.includes("v6.1L.2b"));
  ok("env alone not enough", /env-only ยังไม่เพียงพอ|env-only.*not enough/i.test(doc));
}

// --- preflight checks ---
{
  ok("preflight checks section", /Preflight Checks/i.test(doc));
  ok("preflight health 200", /GET \/api\/health.*200|health.*200/i.test(doc));
  ok("preflight signup false", /publicSignupEnabled:false|public signup false/i.test(docLower));
  ok("preflight chat start over", /"เริ่มใหม่"/.test(doc));
  ok("preflight unauth 401", /401/.test(doc));
  ok("preflight no provider public chat", /no provider.*public chat|provider call from public/i.test(docLower));
  ok("preflight v61l1 command", /test:v61l1-user-visible-allowlist-gate/.test(doc));
  ok("preflight v61l2 command", /test:v61l2-controlled-pilot-preflight-command-review/.test(doc));
}

// --- proposed env ---
{
  ok("proposed env section", /Proposed Env Update/i.test(doc));
  ok("proposed user visible true", /NONGA_AI_USER_VISIBLE_ENABLED=true/.test(doc));
  ok("proposed allowlist placeholder", doc.includes(PLACEHOLDER_UID));
  ok("proposed allowlist env key", doc.includes(ALLOWLIST_ENV));
  ok("proposed emergency kill false", /NONGA_AI_EMERGENCY_KILL_SWITCH=false/.test(doc));
  ok("proposed chat shadow false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=false/.test(doc));
  ok("powershell quoted update-env-vars", /--update-env-vars="NONGA_AI_USER_VISIBLE_ENABLED=true/i.test(doc));
  ok("powershell anti-pattern", /BROKEN|anti-pattern|comma splits/i.test(docLower));
  ok("bash gcloud run update", /gcloud run services update nonga-staging/.test(doc));
}

// --- chat shadow decision ---
{
  ok("chat shadow decision section", /CHAT_SHADOW_REAL_PROVIDER_ENABLED Decision/i.test(doc));
  ok("recommend keep false", /keep.*false|Recommended.*false/i.test(doc));
  ok("not recommended for true", /Not recommended/i.test(doc) && /`true`/.test(doc));
}

// --- allowlist procedure ---
{
  ok("allowlist server-only section", /Allowlist UID.*Server-only/i.test(doc));
  ok("no hardcoded uid in git", /not git|ไม่ git/i.test(docLower));
  ok("placeholder only in commands", doc.includes(PLACEHOLDER_UID));
}

// --- approval phrase ---
{
  ok("approval phrase section", /Approval Phrase/i.test(doc));
  ok("approval phrase exact", doc.includes(APPROVAL_PHRASE));
  ok("review slice cannot use phrase", /ห้ามใช้ phrase|not in this slice/i.test(doc));
}

// --- rollback ---
{
  ok("rollback section", /Rollback Commands/i.test(doc));
  ok("rollback emergency kill", /NONGA_AI_EMERGENCY_KILL_SWITCH=true/.test(doc));
  ok("rollback user visible false", /NONGA_AI_USER_VISIBLE_ENABLED=false/.test(doc));
  ok("rollback clear allowlist", new RegExp(`${ALLOWLIST_ENV}=`).test(doc));
  ok("rollback chat shadow false", /CHAT_SHADOW_REAL_PROVIDER_ENABLED=false/.test(doc));
  ok("rollback image v61l1", doc.includes(ROLLBACK_IMAGE_L1));
  ok("rollback image v61k5", doc.includes(ROLLBACK_IMAGE_K5));
  ok("rollback powershell quoted", /PowerShell.*quoted|quoted.*PowerShell/i.test(docLower));
}

// --- post-pilot smoke ---
{
  ok("post-pilot smoke section", /Post-pilot Smoke/i.test(doc));
  ok("smoke guest legacy", /Guest.*legacy/i.test(doc));
  ok("smoke non-allowlisted legacy", /Non-allowlisted.*legacy/i.test(doc));
  ok("smoke start over exact", doc.includes(LEGACY_START_OVER));
  ok("smoke kill switch", /Kill switch/i.test(doc));
  ok("smoke no raw uid", /No raw UID|raw UID/i.test(doc));
  ok("smoke no lead reveal", /lead.*reveal|payment.*lead/i.test(docLower));
}

// --- risk checklist ---
{
  ok("risk checklist section", /Risk Checklist/i.test(doc));
  ok("risk powershell comma", /PowerShell comma/i.test(doc));
  ok("risk v60r", /v60R|v60r/i.test(doc));
}

// --- forbidden ---
{
  ok("forbidden no deploy", /Deploy.*not done|ห้าม deploy/i.test(docLower));
  ok("forbidden no env update executed", /not done|not executed|ไม่ env update/i.test(docLower));
  ok("forbidden no user visible true on staging", /not set|ไม่ set/i.test(docLower));
  ok("forbidden no real uid in doc", /placeholders only|placeholder/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no production", /not touched|not done/i.test(docLower));
}

// --- no real uids or secrets in doc ---
{
  ok("doc uses placeholder uid only", doc.includes(PLACEHOLDER_UID));
  ok("doc no firebase uid prefix pattern", !/firebase-[a-z0-9]{10,}/i.test(doc));
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- static test only ---
{
  const selfCode = selfSrc.split("// --- static test only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package ---
{
  ok("package v61l2 script", pkg.includes("test:v61l2-controlled-pilot-preflight-command-review"));
  ok("package points to mts", pkg.includes("scripts/test-v61l2-controlled-pilot-preflight-command-review.mts"));
}

console.log("\nDone v6.1L.2 Controlled Pilot Pre-pilot Command Review tests.");
if (process.exitCode) process.exit(process.exitCode);
