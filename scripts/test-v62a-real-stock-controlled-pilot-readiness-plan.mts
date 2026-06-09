/**
 * v6.2A — Real Stock Controlled Pilot Readiness Plan (static validation only)
 * npm run test:v62a-real-stock-controlled-pilot-readiness-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2A-real-stock-controlled-pilot-readiness-plan.md";
const CLOSURE_DOC = "docs/v6.1L-controlled-user-visible-ai-pilot-execution-closure-record.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "40dae31aabb53e8585c53ab51c3ec0985c29cb39";
const FINAL_REV = "nonga-staging-00075-rpg";
const APPROVAL_PHRASE_V62B =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";
const INSUFFICIENT_DATA_PHRASE = "ข้อมูลประกาศยังไม่พอ";
const GROUNDING_DISCLAIMER = "คำแนะนำเบื้องต้นจากข้อมูลประกาศ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2A Real Stock Controlled Pilot Readiness Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62a-real-stock-controlled-pilot-readiness-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");

// --- doc exists + v6.2A ---
{
  ok("readiness doc exists", doc.length > 8000);
  ok("doc v6.2A label", doc.includes("v6.2A"));
  ok("doc real stock controlled pilot", /real stock controlled pilot/i.test(doc));
  ok("doc docs tests only", /docs\/tests\/package only|docs\/tests only/i.test(docLower));
  ok("doc HEAD 40dae31", doc.includes(HEAD_SHA) || doc.includes("40dae31"));
  ok("doc references v61l closure", /v6\.1L.*CLOSED|execution closure/i.test(doc));
  ok("doc not approval to import", /ไม่ใช่การอนุมัติ|not granted|planning only/i.test(docLower));
}

// --- baseline staging ---
{
  ok("baseline revision 00075-rpg", doc.includes(FINAL_REV));
  ok("baseline chat shadow flag false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`false`\*\*/.test(doc));
  ok("baseline user visible allowlist only", /allowlisted tester only|allowlist only/i.test(docLower));
  ok("baseline mock only user visible", /mock only.*user-visible|user-visible.*mock only/i.test(docLower));
  ok("no secrets versions access baseline", /did not run.*secrets versions access/i.test(docLower));
}

// --- real stock import blocked ---
{
  ok("real stock import blocked", /real stock import.*blocked|still blocked/i.test(docLower));
  ok("G-11 blocked", /G-11.*blocked|real stock import approval/i.test(doc));
  ok("no real stock import in v62a", /real stock import in v6\.2A.*blocked|not in v6\.2A/i.test(doc));
  ok("next step requires explicit approval", /next step requires explicit approval|requires explicit approval/i.test(docLower));
}

// --- pilot scope ---
{
  ok("pilot scope section", /Pilot Scope/i.test(doc));
  ok("staging only", /staging only/i.test(docLower));
  ok("closed pilot only", /closed pilot only/i.test(docLower));
  ok("allowlisted tester only", /allowlisted tester only/i.test(docLower));
  ok("batch 5-10 cars", /5.*10.*คัน|5–10/i.test(doc));
  ok("guest legacy 100", /guest.*legacy 100%|legacy 100%.*guest/i.test(docLower));
  ok("non-allowlisted legacy", /non-allowlisted.*legacy/i.test(docLower));
  ok("no production", /production.*excluded|not touched/i.test(docLower));
  ok("no public AI", /public ai.*not|ไม่เปิด public ai/i.test(docLower));
  ok("no public signup", /public signup.*false|signup.*not done/i.test(docLower));
}

// --- real stock data readiness ---
{
  ok("data readiness section", /Real Stock Data Readiness/i.test(doc));
  ok("vehicle data source", /แหล่งที่มาของข้อมูลรถ|Vehicle Data Source/i.test(doc));
  ok("data rights", /สิทธิ์ใช้ข้อมูล|Data Rights/i.test(doc));
  ok("image rights", /สิทธิ์ใช้รูป|Image Rights/i.test(doc));
  ok("seller consent", /Seller Consent|seller consent/i.test(doc));
  ok("allowed display fields", /ข้อมูลที่อนุญาตให้แสดง|Allowed Display Fields/i.test(doc));
  ok("masked forbidden fields", /mask.*ห้ามแสดง|Masked.*Forbidden/i.test(doc));
  ok("written consent required", /written consent|consent เป็นลายลักษณ์อักษร/i.test(docLower));
}

// --- PII guard ---
{
  ok("PII guard section", /PII Guard/i.test(doc));
  ok("PII phone", /เบอร์โทร/i.test(doc));
  ok("PII owner name", /ชื่อเจ้าของรถ/i.test(doc));
  ok("PII LINE ID", /LINE ID/i.test(doc));
  ok("PII address", /ที่อยู่/i.test(doc));
  ok("PII license plate full", /เลขทะเบียนเต็ม/i.test(doc));
  ok("PII documents", /เอกสาร.*ใบเล่ม.*บัตรประชาชน|บัตรประชาชน/i.test(doc));
  ok("PII plate in photo", /ป้ายทะเบียนในรูป/i.test(doc));
  ok("no raw UID in git", /no raw UID|raw UID.*blocked/i.test(docLower));
  ok("no raw prompt in git", /no raw prompt|raw prompt.*blocked/i.test(docLower));
}

// --- stale listing guard ---
{
  ok("stale listing section", /Stale Listing Guard/i.test(doc));
  ok("stale sold", /รถขายแล้ว|sold/i.test(doc));
  ok("stale reserved", /รถจองแล้ว|reserved/i.test(doc));
  ok("stale price change", /ราคาเปลี่ยน/i.test(doc));
  ok("stale photo mismatch", /รูปไม่ตรง/i.test(doc));
  ok("stale incomplete data", /เลขไมล์.*ปี.*รุ่น.*ไม่ครบ|ข้อมูล.*ไม่ครบ/i.test(doc));
  ok("delist procedure", /delist|ถอด.*ปิดสถานะ/i.test(docLower));
}

// --- data quality checklist ---
{
  ok("data quality section", /Data Quality Checklist/i.test(doc));
  ok("DQ model", /DQ-01.*รุ่น|รุ่น.*model/i.test(doc));
  ok("DQ year", /DQ-02.*ปี|ปี.*year/i.test(doc));
  ok("DQ price", /DQ-03.*ราคา|ราคา.*price/i.test(doc));
  ok("DQ mileage", /DQ-04.*เลขไมล์|เลขไมล์.*mileage/i.test(doc));
  ok("DQ gear", /DQ-05.*เกียร์|เกียร์.*gear/i.test(doc));
  ok("DQ fuel", /DQ-06.*เชื้อเพลิง|เชื้อเพลิง.*fuel/i.test(doc));
  ok("DQ color", /DQ-07.*สี|สี.*color/i.test(doc));
  ok("DQ province", /DQ-08.*จังหวัด|จังหวัด.*province/i.test(doc));
  ok("DQ photos", /DQ-09.*รูปภาพ|รูปภาพ.*photos/i.test(doc));
  ok("DQ highlights", /DQ-10.*จุดเด่น|จุดเด่น.*highlights/i.test(doc));
  ok("DQ caveats", /DQ-11.*ข้อควรตรวจ|ข้อควรตรวจ/i.test(doc));
  ok("DQ status", /DQ-12.*สถานะประกาศ|สถานะประกาศ/i.test(doc));
}

// --- AI grounding ---
{
  ok("AI grounding section", /AI Grounding Rules/i.test(doc));
  ok("ground from listing first", /ตอบจากข้อมูลประกาศจริงก่อน|listing fields/i.test(doc));
  ok("no hallucination", /ห้ามแต่งข้อมูลนอกประกาศ|no hallucinated/i.test(docLower));
  ok("insufficient data phrase", doc.includes(INSUFFICIENT_DATA_PHRASE));
  ok("no overpromise", /ห้าม overpromise|no overpromise/i.test(docLower));
  ok("no condition verdict", /ห้ามฟันธงสภาพรถ/i.test(doc));
  ok("grounding disclaimer", doc.includes(GROUNDING_DISCLAIMER));
  ok("AG rules numbered", /AG-01|AG-02/i.test(doc));
}

// --- Thai sales persona ---
{
  ok("Thai persona section", /Thai Sales Persona|น้องเอ/i.test(doc));
  ok("persona warm trustworthy", /อบอุ่น.*น่าเชื่อถือ|warm.*trustworthy/i.test(docLower));
  ok("no fortune default", /โชคชะตา.*off|ยังไม่ใส่โชคชะตา/i.test(docLower));
  ok("color plate belief opt-in", /opt-in|opt-in only/i.test(docLower));
  ok("no forbidden tone", /คุณพี่คร้าบ|กราบขออภัย/i.test(doc));
}

// --- forbidden / compliance ---
{
  ok("forbidden no deploy", /Deploy.*not done|ยังไม่ deploy/i.test(docLower));
  ok("forbidden no env update", /env update.*not done|gcloud run services update.*not done/i.test(docLower));
  ok(
    "forbidden chat shadow not true",
    /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED=true.*not done|remains \*\*false\*\*/i.test(doc)
  );
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no production", /production.*not touched|excluded/i.test(docLower));
  ok(
    "forbidden no payment settlement",
    /payment.*settlement|lead.*reveal.*outcome/i.test(docLower)
  );
  ok("forbidden no firestore rules deploy", /firestore.*not done|Firestore rules/i.test(docLower));
  ok("forbidden no real customer data", /real customer data.*blocked|no real customer data/i.test(docLower));
  ok("forbidden no public debug endpoint", /public debug endpoint.*blocked|custom public prompt/i.test(docLower));
  ok("import approval not granted", /not granted|ไม่ใช่การอนุมัติ/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2A/i.test(doc));
}

// --- approval phrase ---
{
  ok("approval phrase section", /Approval Phrase/i.test(doc));
  ok("v62a no phrase required", /v6\.2A.*ไม่ต้องการ approval|ไม่ต้องการ approval phrase/i.test(doc));
  ok("v62b approval phrase", doc.includes(APPROVAL_PHRASE_V62B));
  ok("slice roadmap v62b", /v6\.2B|v6\.2C|v6\.2D/.test(doc));
}

// --- pre-import checklist ---
{
  ok("pre-import checklist", /Pre-import Readiness Checklist/i.test(doc));
  ok("checklist test command", /test:v62a-real-stock-controlled-pilot-readiness-plan/.test(doc));
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
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
}

// --- package.json ---
{
  ok(
    "package v62a script",
    pkg.includes("test:v62a-real-stock-controlled-pilot-readiness-plan")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v62a-real-stock-controlled-pilot-readiness-plan.mts")
  );
}

// --- closure doc cross-reference ---
{
  const closure = readFileSync(CLOSURE_DOC, "utf8");
  ok("closure doc G-11 blocked", /G-11.*blocked/i.test(closure));
  ok("closure doc v62 next phase", /v6\.2.*Real Stock/i.test(closure));
}

console.log("\nDone v6.2A Real Stock Controlled Pilot Readiness Plan tests.");
if (process.exitCode) process.exit(process.exitCode);
