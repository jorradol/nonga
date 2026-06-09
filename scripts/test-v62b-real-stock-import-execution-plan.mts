/**
 * v6.2B — Real Stock Import Execution Plan (static validation only)
 * npm run test:v62b-real-stock-import-execution-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.2B-real-stock-import-execution-plan.md";
const V62A_DOC = "docs/v6.2A-real-stock-controlled-pilot-readiness-plan.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
  /OPENAI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const HEAD_SHA = "f3d31f724dda940bf0749ac98c48f79ed9455c5a";
const APPROVAL_PHRASE =
  "อนุมัติให้ import real stock แบบ controlled pilot บน staging เท่านั้น ตาม v6.2B ชุดเล็ก 5–10 คัน";
const INSUFFICIENT_DATA_PHRASE = "ข้อมูลประกาศยังไม่พอ";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2B Real Stock Import Execution Plan ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62b-real-stock-import-execution-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62aDoc = readFileSync(V62A_DOC, "utf8");

// --- doc exists + v6.2B ---
{
  ok("execution plan doc exists", doc.length > 8000);
  ok("doc v6.2B label", doc.includes("v6.2B"));
  ok("doc real stock import execution", /real stock import execution plan/i.test(doc));
  ok("doc docs tests only", /docs\/tests\/package only|docs\/tests only/i.test(docLower));
  ok("doc HEAD f3d31f7", doc.includes(HEAD_SHA) || doc.includes("f3d31f"));
  ok("doc references v62a pushed", /v6\.2A.*pushed|f3d31f7/i.test(doc));
  ok("doc not approval to import", /ไม่ใช่การอนุมัติ|not granted|planning only/i.test(docLower));
  ok("v62b still no real import", /real stock import in v6\.2B.*blocked|not in v6\.2B/i.test(docLower));
}

// --- import blocked without approval ---
{
  ok("import remains blocked", /import remains blocked|import blocked|still blocked/i.test(docLower));
  ok("import blocked without phrase", /without approval phrase.*blocked|import blocked/i.test(docLower));
  ok("explicit approval phrase", doc.includes(APPROVAL_PHRASE));
  ok("next step requires explicit approval", /next step requires explicit approval|requires explicit approval/i.test(docLower));
  ok("separate execution record", /separate execution record|execution record/i.test(docLower));
}

// --- pre-import gate ---
{
  ok("pre-import gate section", /Pre-import Gate/i.test(doc));
  ok("gate v62a pushed", /v6\.2A pushed|PG-01.*f3d31f/i.test(doc));
  ok("gate working tree clean", /working tree.*clean|clean.*synced/i.test(docLower));
  ok("gate staging only", /staging only/i.test(docLower));
  ok("gate closed pilot only", /closed pilot only/i.test(docLower));
  ok("gate allowlist only", /allowlisted tester only|allowlist only/i.test(docLower));
  ok("gate batch 5-10", /5.*10.*คัน|5–10/i.test(doc));
}

// --- source data package ---
{
  ok("source data package section", /Source Data Package Checklist/i.test(doc));
  ok("source per car origin", /แหล่งที่มาของรถแต่ละคัน/i.test(doc));
  ok("source seller consent", /seller\/dealer consent|seller consent/i.test(docLower));
  ok("source image rights", /สิทธิ์ใช้รูป|image rights/i.test(doc));
  ok("source allowed fields", /allowed fields/i.test(docLower));
  ok("source masked forbidden", /masked.*forbidden|forbidden fields/i.test(docLower));
  ok("source no real customer", /ไม่มีข้อมูลลูกค้าจริง|no real customer/i.test(docLower));
  ok("source no id card", /บัตรประชาชน/i.test(doc));
  ok("source no registration book", /ใบเล่ม/i.test(doc));
  ok("source no finance docs", /หลักฐานการเงิน|สัญญา/i.test(doc));
}

// --- vehicle record schema ---
{
  ok("vehicle schema section", /Vehicle Record Schema/i.test(doc));
  ok("schema listingId", /listingId|sourceId/i.test(doc));
  ok("schema make model year trim", /make.*model.*year|trim/i.test(docLower));
  ok("schema price", /price/i.test(docLower));
  ok("schema mileage", /mileage/i.test(docLower));
  ok("schema transmission", /transmission/i.test(docLower));
  ok("schema fuel", /\bfuel\b/i.test(doc));
  ok("schema color", /\bcolor\b/i.test(docLower));
  ok("schema province", /province/i.test(docLower));
  ok("schema photos", /photos/i.test(docLower));
  ok("schema highlights", /highlights/i.test(docLower));
  ok("schema known issues", /knownIssues|known issues|checkNotes|check notes/i.test(doc));
  ok("schema listing status", /listingStatus|listing status/i.test(doc));
  ok("schema updatedAt", /updatedAt|sourceUpdatedAt/i.test(doc));
  ok("schema seller display non-pii", /sellerDisplayName|seller display.*non-pii|ไม่เปิด PII/i.test(docLower));
}

// --- image safety gate ---
{
  ok("image safety section", /Image Safety Gate/i.test(doc));
  ok("image no id card", /บัตรประชาชน/i.test(doc));
  ok("image no registration doc", /ใบเล่ม.*เอกสาร|เอกสารทะเบียน/i.test(doc));
  ok("image no phone line address", /เบอร์.*LINE.*ที่อยู่|phone.*LINE/i.test(docLower));
  ok("image plate mask", /ป้ายทะเบียน.*mask|mask.*plate/i.test(docLower));
  ok("image rights required", /สิทธิ์ใช้รูป|image rights/i.test(doc));
  ok("image match actual car", /รูปต้องตรงกับรถจริง|match actual car/i.test(docLower));
}

// --- PII forbidden ---
{
  ok("PII phone forbidden", /sellerPhone|เบอร์โทร/i.test(doc));
  ok("PII LINE forbidden", /sellerLineId|LINE/i.test(doc));
  ok("PII address forbidden", /fullAddress|ที่อยู่เต็ม/i.test(doc));
  ok("PII full plate masked", /fullLicensePlate|เลขทะเบียน/i.test(doc));
}

// --- stale rollback ---
{
  ok("stale rollback section", /Stale.*Rollback Procedure/i.test(doc));
  ok("rollback sold", /ขายแล้ว|sold/i.test(doc));
  ok("rollback reserved", /จองแล้ว|reserved/i.test(doc));
  ok("rollback price change", /ราคาเปลี่ยน/i.test(doc));
  ok("rollback hide batch", /ซ่อน.*batch|hide entire pilot batch/i.test(docLower));
  ok("rollback bad import", /rollback import|ลบ.*rollback/i.test(docLower));
  ok("rollback search excludes delisted", /buyer search.*not|exclude.*delisted|ไม่โชว์รถที่ถูกปิด/i.test(docLower));
  ok("rollback execution record", /execution record.*after import|execution record/i.test(docLower));
}

// --- AI grounding smoke ---
{
  ok("AI grounding smoke section", /AI Grounding Smoke Plan/i.test(doc));
  ok("ground from listing", /ตอบจากข้อมูลประกาศจริง/i.test(doc));
  ok("no hallucination", /ห้ามแต่งข้อมูลนอกประกาศ/i.test(doc));
  ok("insufficient data phrase", doc.includes(INSUFFICIENT_DATA_PHRASE));
  ok("no condition verdict", /ห้ามฟันธงสภาพรถ/i.test(doc));
  ok("no overpromise", /ห้าม overpromise|no overpromise/i.test(docLower));
  ok("smoke search compare refine", /search.*compare.*refine|SM-01.*SM-02.*SM-03/i.test(doc));
  ok("smoke guest legacy", /guest.*legacy|SM-06/i.test(docLower));
  ok("smoke non-allowlisted legacy", /non-allowlisted.*legacy|SM-07/i.test(docLower));
  ok("no real gemini user visible", /no real gemini user-visible|real gemini user-visible.*not/i.test(docLower));
}

// --- go no-go ---
{
  ok("go no-go section", /Go.*No-go Checklist/i.test(doc));
  ok("go rights consent pii", /rights.*consent.*PII|GO-06|GO-07/i.test(doc));
  ok("go rollback ready", /rollback.*ready|GO-08/i.test(doc));
  ok("no-go PII", /NG-01.*PII|PII found/i.test(doc));
  ok("no-go image rights", /NG-02|รูปไม่มีสิทธิ์/i.test(doc));
  ok("no-go incomplete data", /NG-03|ข้อมูลไม่ครบ/i.test(doc));
  ok("no-go unclear status", /NG-04|สถานะไม่ชัด/i.test(doc));
  ok("no-go rollback not ready", /NG-05|rollback.*not ready/i.test(docLower));
  ok("no-go production public ai", /NG-08|NG-09|production.*public ai/i.test(doc));
}

// --- pilot scope ---
{
  ok("batch limit 5-10", /5.*10|batch.*10/i.test(docLower));
  ok("no production", /production.*excluded|not touched/i.test(docLower));
  ok("no public AI", /public ai.*not|ไม่เปิด public ai/i.test(docLower));
  ok("no public signup", /public signup.*false|signup.*not done/i.test(docLower));
  ok("chat shadow flag false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*\*\*`false`\*\*/.test(doc));
}

// --- forbidden / compliance ---
{
  ok("forbidden no runtime", /runtime code.*not done|not in v6\.2B/i.test(docLower));
  ok("forbidden no deploy", /Deploy.*not done|ยังไม่ deploy/i.test(docLower));
  ok("forbidden no env update", /env update.*not done|gcloud run services update.*not done/i.test(docLower));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok("forbidden no production", /production.*not touched|excluded/i.test(docLower));
  ok("forbidden no firestore rules", /Firestore rules.*not done|firestore rules deploy/i.test(docLower));
  ok(
    "forbidden no payment settlement",
    /payment.*settlement|lead.*reveal.*outcome/i.test(docLower)
  );
  ok("forbidden no real customer data", /real customer data.*blocked|no real customer/i.test(docLower));
  ok("forbidden no public debug", /public debug endpoint|custom public prompt/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2B/i.test(doc));
}

// --- v62a cross-reference ---
{
  ok("v62a doc exists", v62aDoc.includes("v6.2A") && v62aDoc.length > 8000);
  ok("v62b confirms v62a pushed", doc.includes("f3d31f") && /v6\.2A.*pushed/i.test(doc));
  ok("v62a G-11 blocked", /G-11.*blocked|real stock import.*blocked/i.test(v62aDoc));
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
    "package v62b script",
    pkg.includes("test:v62b-real-stock-import-execution-plan")
  );
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v62b-real-stock-import-execution-plan.mts")
  );
}

console.log("\nDone v6.2B Real Stock Import Execution Plan tests.");
if (process.exitCode) process.exit(process.exitCode);
