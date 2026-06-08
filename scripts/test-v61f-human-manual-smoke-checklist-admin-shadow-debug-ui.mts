/**
 * v6.1F — Human Manual Smoke Checklist / Decision Gate (static validation only)
 * npm run test:v61f-human-manual-smoke-checklist-admin-shadow-debug-ui
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.1F-human-manual-smoke-checklist-admin-shadow-debug-ui.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "f780a519b5f74b34a384742579d783b4613e2309";
const WEBAPP_BASE = "https://nonga-ce93c.web.app";
const ADMIN_UI_PATH = "/admin/shadow-smoke";
const CHAT_PATH = "/chat";
const ADMIN_ROUTE = "/api/admin/sales-brain-shadow-smoke";
const GUEST_GATE_MSG = "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const APPROVAL_PHRASE =
  "อนุมัติให้ทดสอบ real Gemini shadow call เฉพาะ admin-only บน staging โดยไม่แสดงผลให้ผู้ใช้ทั่วไป ตาม v6.1G";
const SS_CASE_IDS = [
  "SS-01",
  "SS-02",
  "SS-03",
  "SS-04",
  "SS-05",
  "SS-06",
  "SS-07",
  "SS-08",
] as const;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.1F Human Manual Smoke Checklist / Decision Gate ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v61f-human-manual-smoke-checklist-admin-shadow-debug-ui.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.1F ---
{
  ok("checklist doc exists", doc.length > 4000);
  ok("doc v6.1F label", doc.includes("v6.1F"));
  ok(
    "doc human manual smoke checklist",
    /human manual smoke checklist|manual smoke checklist/i.test(doc)
  );
  ok("doc decision gate", /decision gate/i.test(doc));
  ok("doc docs tests only", /docs\/tests only|docs tests only/i.test(docLower));
  ok("doc HEAD f780a51", doc.includes(HEAD_SHA) || doc.includes("f780a51"));
  ok("doc references v61e", doc.includes("v6.1E"));
}

// --- guest checklist ---
{
  ok("guest section", /4\.1 Guest|Guest.*admin\/shadow-smoke/i.test(doc));
  ok("guest admin shadow smoke URL", doc.includes(ADMIN_UI_PATH));
  ok("guest gate message", doc.includes(GUEST_GATE_MSG));
  ok(
    "guest login admin gate",
    /login\/admin gate|admin gate/i.test(docLower)
  );
  ok(
    "guest not public debug",
    /not.*public debug|ไม่ใช่.*public debug/i.test(docLower)
  );
}

// --- dealer checklist ---
{
  ok("dealer section", /4\.2 Dealer|Dealer.*Member/i.test(doc));
  ok("dealer no admin menu", /ไม่เห็น.*Admin menu|ไม่เห็น.*เมนู/i.test(doc));
  ok("dealer block shadow smoke", /block|403/i.test(doc));
  ok("dealer 403 API", /dealer.*403|403.*dealer/i.test(docLower));
  ok("dealer route documented", doc.includes(ADMIN_ROUTE));
}

// --- admin checklist ---
{
  ok("admin section", /4\.3 Admin|Admin.*Superadmin/i.test(doc));
  ok(
    "admin menu AI Shadow Smoke",
    /AI Shadow Smoke.*Read-only|เมนู.*AI Shadow Smoke/i.test(doc)
  );
  ok("admin dashboard sidebar", /Admin Dashboard|sidebar/i.test(doc));
  ok("admin shadow smoke panel", /admin\/shadow-smoke|AI Shadow Smoke/i.test(doc));
  for (const caseId of SS_CASE_IDS) {
    ok(`doc fixed case ${caseId}`, doc.includes(caseId));
  }
  ok("admin SS-01 success fields", /SS-01.*success|success.*readOnly/i.test(doc));
  ok("admin SS-01 readOnly", /readOnly.*true/i.test(docLower));
  ok("admin SS-01 userVisibleOff", /userVisibleOff.*true/i.test(docLower));
  ok(
    "admin SS-01 providerNetwork false",
    /providerNetwork.*false/i.test(docLower)
  );
  ok("admin SS-01 mock provider", /provider.*mock|mock provider/i.test(docLower));
  ok("admin SS-05 guardrail", /SS-05.*guardrail|Kill switch blocked/i.test(doc));
  ok("admin SS-06 guardrail", /SS-06.*guardrail|Budget missing blocked/i.test(doc));
  ok("admin SS-07 guardrail", /SS-07.*guardrail|User-visible blocked/i.test(doc));
  ok("admin SS-08 guardrail", /SS-08.*guardrail|Production off/i.test(doc));
  ok(
    "admin no PII secret dump",
    /no.*PII|raw PII|secret.*dump|env dump/i.test(docLower)
  );
}

// --- no custom prompt / PII / real stock ---
{
  ok(
    "no textarea custom prompt",
    /ไม่มี.*textarea|no.*textarea|custom prompt/i.test(docLower)
  );
  ok(
    "no phone input",
    /ไม่มี.*phone|no.*phone input/i.test(docLower)
  );
  ok(
    "no file upload",
    /ไม่มี.*file upload|no.*file upload/i.test(docLower)
  );
  ok(
    "no listing stock input",
    /ไม่มี.*listing|listing input|stock input|real stock/i.test(docLower)
  );
  ok(
    "no real customer data",
    /ข้อมูลลูกค้าจริง|เบอร์โทรจริง|ข้อมูลรถเต็นท์จริง/i.test(doc)
  );
}

// --- chat checklist ---
{
  ok("chat section", /4\.4 Public Chat|\/chat/i.test(doc));
  ok("chat path", doc.includes(CHAT_PATH));
  ok('chat message เริ่มใหม่', /"เริ่มใหม่"/.test(doc));
  ok("chat legacy response exact", doc.includes(LEGACY_START_OVER));
  ok(
    "chat no AI gemini public",
    /ไม่มี.*AI\/Gemini|no.*AI\/Gemini|legacy 100%/i.test(docLower)
  );
  ok("chat primary URL", doc.includes(WEBAPP_BASE));
}

// --- decision gate ---
{
  ok("decision gate section", /## 5\. Decision Gate|Decision Gate/i.test(doc));
  ok("gate PASS only proceed", /PASS.*เท่านั้น|PASS ทั้งหมด|ต้องผ่านทั้งหมด/i.test(doc));
  ok("gate FAIL stop", /FAIL.*หยุด|STOP.*real Gemini|อย่าเปิด real Gemini/i.test(doc));
  ok("gate fix specific point", /แก้เฉพาะจุด/i.test(doc));
  ok("gate v61g path A dry-run", /v6\.1G.*dry-run|dry-run readiness/i.test(doc));
  ok(
    "gate v61g path B admin-only",
    /v6\.1G.*admin-only|real Gemini shadow call.*admin-only/i.test(doc)
  );
  ok(
    "gate path B needs approval phrase",
    /approval phrase/i.test(docLower)
  );
}

// --- approval phrase ---
{
  ok("approval phrase section", /Future Real Gemini Approval Phrase|approval phrase/i.test(doc));
  ok("approval phrase exact text", doc.includes(APPROVAL_PHRASE));
  ok("approval phrase v61g only", /v6\.1G path B|v6\.1G.*เท่านั้น/i.test(doc));
  ok("v61f must not run real gemini", /v6\.1F.*ห้ามรัน|ไม่รัน.*real Gemini/i.test(doc));
}

// --- real stock import blocked ---
{
  ok(
    "real stock import section",
    /Real Stock Import.*Still Blocked|สต๊อกจริง/i.test(doc)
  );
  ok(
    "stock blocked no real import",
    /ห้ามนำสต๊อกจริง|still blocked/i.test(docLower)
  );
  ok(
    "stock gate manual smoke first",
    /admin shadow UI manual smoke|v6\.1F checklist/i.test(doc)
  );
  ok(
    "stock gate real gemini smoke",
    /real Gemini shadow admin-only smoke/i.test(doc)
  );
  ok(
    "stock gate AI conversation smoke",
    /AI conversation smoke/i.test(doc)
  );
}

// --- no deploy / no env / no paid Gemini in v6.1F ---
{
  ok("forbidden no deploy", /Cloud Run.*not done|ยังไม่ deploy|not done.*deploy/i.test(docLower));
  ok(
    "forbidden no gcloud env update",
    /gcloud run services update.*not done|services update.*not done/i.test(docLower)
  );
  ok(
    "forbidden no NONGA_AI changes",
    /NONGA_AI_\*.*not done|NONGA_AI_\* env changes.*not/i.test(docLower)
  );
  ok(
    "forbidden user visible not true",
    /NONGA_AI_USER_VISIBLE_ENABLED=true.*not|remains \*\*false\*\*/i.test(doc)
  );
  ok("forbidden no paid gemini", /paid Gemini|paid AI API/i.test(doc));
  ok(
    "forbidden no fetch AI provider",
    /fetch.*AI provider|fetch to AI provider/i.test(docLower)
  );
  ok(
    "forbidden no secrets access",
    /secrets versions access/i.test(doc)
  );
  ok(
    "forbidden no user visible chat change",
    /user-visible chat.*not changed|legacy 100%/i.test(docLower)
  );
  ok("forbidden no production", /production.*not touched/i.test(docLower));
  ok(
    "forbidden no payment settlement",
    /payment.*invoice.*settlement/i.test(docLower)
  );
  ok(
    "forbidden no lead reveal outcome",
    /buyer lead.*seller reveal|outcome/i.test(docLower)
  );
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok(
    "forbidden no real stock import",
    /real stock import.*not done|still blocked/i.test(docLower)
  );
}

// --- environment baseline ---
{
  ok("baseline web.app URL", doc.includes(WEBAPP_BASE));
  ok("baseline user visible false", /NONGA_AI_USER_VISIBLE_ENABLED.*false/i.test(doc));
  ok("baseline cloud run revision", /nonga-staging-00051-fbd/.test(doc));
  ok("baseline hosting bundle", /index-BpyOr2_V\.js/.test(doc));
  ok(
    "baseline gemini secret ref metadata only",
    /gemini-api-key:latest.*metadata|metadata only/i.test(docLower)
  );
  ok(
    "no secrets versions access baseline",
    /did not run.*secrets versions access|not run.*secrets versions access/i.test(docLower)
  );
}

// --- compliance section ---
{
  ok("compliance section", /Compliance.*v6\.1F|## 9\. Compliance/i.test(doc));
  ok("compliance docs tests only", /docs\/tests only|checklist.*decision gate/i.test(docLower));
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
    "package v61f script",
    pkg.includes("test:v61f-human-manual-smoke-checklist-admin-shadow-debug-ui")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v61f-human-manual-smoke-checklist-admin-shadow-debug-ui.mts"
    )
  );
}

console.log(
  "\nDone v6.1F Human Manual Smoke Checklist / Decision Gate tests."
);
if (process.exitCode) process.exit(process.exitCode);
