/**
 * v6.2B.2 — Data Package Review Checklist / Ops Intake Guide (static validation only)
 * npm run test:v62b2-data-package-review-checklist-ops-intake-guide
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2B.2-data-package-review-checklist-ops-intake-guide.md";
const V62B1_DOC = "docs/v6.2B.1-pre-import-data-package-template.md";
const MANIFEST_PATH =
  "docs/examples/v6.2B.1-real-stock-sample-manifest.placeholder.json";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "3942c9b67fad65f07033eacb513ef2fa06d96b45";
const APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2B.2 Data Package Review Checklist / Ops Intake Guide ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b2-data-package-review-checklist-ops-intake-guide.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b1Doc = readFileSync(V62B1_DOC, "utf8");
const manifestRaw = readFileSync(MANIFEST_PATH, "utf8");

// --- doc exists + v6.2B.2 ---
{
  ok("ops guide doc exists", doc.length > 8000);
  ok("doc v6.2B.2 label", doc.includes("v6.2B.2"));
  ok("doc ops intake guide", /ops intake guide|review checklist/i.test(doc));
  ok("doc docs tests only", /docs\/tests\/package only|ops guide only/i.test(docLower));
  ok("doc HEAD 3942c9b", doc.includes(HEAD_SHA) || doc.includes("3942c9b"));
  ok("doc references v62b1", /v6\.2B\.1/i.test(doc));
  ok("doc not import step", /ไม่ใช่ import step|not import/i.test(docLower));
}

// --- intake workflow ---
{
  ok("intake workflow section", /Intake Workflow/i.test(doc));
  ok("intake secure channel", /ช่องทางที่ปลอดภัย|secure channel/i.test(doc));
  ok("forbid commit raw real data", /ห้าม commit raw real data|raw real data.*repo/i.test(docLower));
  ok("forbid real customer data send", /ห้ามส่งข้อมูลลูกค้าจริง|customer data/i.test(doc));
  ok("review outside repo", /นอก repo|outside repo/i.test(docLower));
  ok("review before import", /review.*ก่อน.*ไม่ใช่ import|review before import/i.test(docLower));
}

// --- rights and consent ---
{
  ok("rights consent section", /Rights and Consent Checklist/i.test(doc));
  ok("consent listing use", /อนุญาตให้ใช้ประกาศ|use.*listing/i.test(docLower));
  ok("consent image rights", /สิทธิ์ใช้รูป|image rights/i.test(doc));
  ok("consent no unauthorized copy", /ไม่ได้คัดลอกจากแหล่งที่ไม่มีสิทธิ์/i.test(doc));
  ok("consent seller every car", /seller consent.*ทุกคัน|sellerConsent/i.test(doc));
  ok("consent reviewer named", /คนรับผิดชอบ review|reviewer/i.test(docLower));
  ok("consent review datetime", /วันเวลาที่ review|review datetime/i.test(docLower));
}

// --- PII forbidden ---
{
  ok("PII review section", /PII and Forbidden Data Review/i.test(doc));
  ok("PII phone", /เบอร์โทรจริง/i.test(doc));
  ok("PII owner name", /ชื่อเจ้าของจริง/i.test(doc));
  ok("PII LINE", /LINE ID จริง/i.test(doc));
  ok("PII address", /ที่อยู่จริง/i.test(doc));
  ok("PII plate", /เลขทะเบียนเต็ม/i.test(doc));
  ok("PII uid", /UID จริง/i.test(doc));
  ok("PII prompt", /prompt จริง/i.test(doc));
  ok("PII secret env", /secret.*env dump/i.test(docLower));
  ok("PII documents", /เอกสาร.*บัตร.*ใบเล่ม|สัญญา.*หลักฐาน/i.test(doc));
  ok("PII customer data", /customer data จริง/i.test(doc));
  ok("PII in photos", /รูปที่มีเบอร์|เบอร์.*LINE.*ที่อยู่.*เอกสาร/i.test(doc));
}

// --- data quality ---
{
  ok("data quality section", /Vehicle Data Quality Review/i.test(doc));
  ok("DQ make model year trim", /make.*model.*year.*trim/i.test(docLower));
  ok("DQ price", /\bprice\b/i.test(doc));
  ok("DQ mileage", /mileage/i.test(docLower));
  ok("DQ transmission", /transmission/i.test(docLower));
  ok("DQ fuel", /\bfuel\b/i.test(doc));
  ok("DQ color", /\bcolor\b/i.test(docLower));
  ok("DQ province", /province/i.test(docLower));
  ok("DQ photos", /photos/i.test(docLower));
  ok("DQ highlights", /highlights/i.test(docLower));
  ok("DQ check notes", /check notes/i.test(docLower));
  ok("DQ listing status", /listing status/i.test(docLower));
  ok("DQ sourceUpdatedAt", /sourceUpdatedAt/i.test(doc));
  ok("DQ sellerDisplayName non-pii", /sellerDisplayName.*non-PII|non-PII/i.test(doc));
}

// --- stale listing ---
{
  ok("stale listing section", /Stale Listing Review/i.test(doc));
  ok("stale still for sale", /รถยังขายอยู่/i.test(doc));
  ok("stale not reserved", /ไม่ได้จองแล้ว/i.test(doc));
  ok("stale current price", /ราคาเป็นปัจจุบัน/i.test(doc));
  ok("stale photo match", /รูปตรงรถจริง/i.test(doc));
  ok("stale ready to show", /สถานะพร้อมแสดง/i.test(doc));
  ok("stale contact channel", /contact channel.*แจ้งปิด|owner\/dealer contact/i.test(docLower));
  ok("stale delist hide batch", /delist.*hide batch|hide batch/i.test(docLower));
}

// --- AI grounding readiness ---
{
  ok("AI grounding section", /AI Grounding Readiness Review/i.test(doc));
  ok("grounding insufficient phrase", /ข้อมูลประกาศยังไม่พอ/.test(doc));
  ok("grounding no overpromise", /overpromise/i.test(docLower));
  ok("grounding guest legacy", /guest.*legacy|legacy 100%/i.test(docLower));
  ok("grounding mock only", /mock only|no real gemini user-visible/i.test(docLower));
  ok("grounding chat shadow false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
}

// --- go no-go ---
{
  ok("go no-go section", /Import Go.*No-go Decision/i.test(doc));
  ok("go rights consent pii", /rights.*consent.*PII|GO-02.*GO-03/i.test(doc));
  ok("go image safety", /image safety|GO-04/i.test(doc));
  ok("go stale rollback", /stale.*rollback|GO-06.*GO-08/i.test(docLower));
  ok("go reviewer sign-off", /reviewer sign-off/i.test(docLower));
  ok("no-go PII", /NG-01.*PII|PII found/i.test(doc));
  ok("no-go image rights", /NG-02|สิทธิ์รูปไม่ชัด/i.test(doc));
  ok("no-go sold reserved", /NG-03|ขายแล้ว.*จอง/i.test(doc));
  ok("no-go incomplete", /NG-04|ข้อมูลไม่ครบ/i.test(doc));
  ok("no-go rollback", /NG-05|rollback.*ไม่พร้อม/i.test(doc));
  ok("no-go production public ai", /NG-08|NG-09|production.*public ai/i.test(doc));
}

// --- approval and execution record ---
{
  ok("approval gate section", /Approval and Execution Record Gate/i.test(doc));
  ok("approval phrase required", doc.includes(APPROVAL_PHRASE));
  ok("separate execution record", /separate execution record|execution record.*separate/i.test(docLower));
  ok("v62b2 no phrase required", /v6\.2B\.2.*ไม่ต้องการ approval|ไม่ต้องการ approval phrase/i.test(doc));
  ok("import blocked v62b2", /import in v6\.2B\.2.*blocked|import blocked/i.test(docLower));
  ok("real stock import remains blocked", /real stock import remains blocked|import remains blocked/i.test(docLower));
}

// --- pilot scope ---
{
  ok("pilot scope section", /Pilot Scope Reminder/i.test(doc));
  ok("staging only", /staging only/i.test(docLower));
  ok("closed pilot only", /closed pilot only/i.test(docLower));
  ok("allowlist only", /allowlisted tester only|allowlist only/i.test(docLower));
  ok("batch 5-10", /5.*10/i.test(doc));
  ok("no production", /production.*excluded|not touched/i.test(docLower));
  ok("no public AI", /public ai.*not|public AI/i.test(docLower));
}

// --- no real stock data in repo ---
{
  const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
  const meta = manifest._meta as Record<string, unknown>;
  ok("manifest still placeholder only", meta?.placeholderOnly === true);
  ok("manifest no real stock in repo", meta?.realStockImportBlocked === true);
  ok("v62b1 forbids real data commit", /ห้าม commit.*ข้อมูลจริง|raw real data/i.test(v62b1Doc));
}

// --- forbidden slice compliance ---
{
  ok("forbidden no runtime", /runtime code.*not done|not in this slice/i.test(docLower));
  ok("forbidden no deploy", /deploy.*not done|ไม่ deploy/i.test(docLower));
  ok("forbidden no env update", /env update.*not done/i.test(docLower));
  ok("forbidden no production", /production.*not touched|excluded/i.test(docLower));
  ok("forbidden no firestore rules", /firestore rules.*not done/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no payment lead", /payment.*settlement|lead.*reveal/i.test(docLower));
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no real gemini", /real gemini user-visible.*not/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2B\.2/i.test(doc));
}

// --- no secret values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
}

// --- package.json ---
{
  ok(
    "package v62b2 script",
    pkg.includes("test:v62b2-data-package-review-checklist-ops-intake-guide")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62b2-data-package-review-checklist-ops-intake-guide.mts"
    )
  );
}

console.log("\nDone v6.2B.2 Data Package Review Checklist / Ops Intake Guide tests.");
if (process.exitCode) process.exit(process.exitCode);
