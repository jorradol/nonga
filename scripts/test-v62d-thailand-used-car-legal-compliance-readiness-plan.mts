/**
 * v6.2D — Thailand Used-car Legal Compliance Readiness Plan (static validation only)
 * npm run test:v62d-thailand-used-car-legal-compliance-readiness-plan
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.2D-thailand-used-car-legal-compliance-readiness-plan.md";
const V62B15_DOC =
  "docs/v6.2B.15-real-stock-pilot-acceptance-go-no-go-review.md";
const V62C_DOC =
  "docs/v6.2C-privacy-safe-auto-redaction-readiness-plan.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*[=:]\s*['"][^'"]{8,}['"]/i,
];

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b0[689]\d{8}\b/,
];

const LINE_ID_PATTERNS = [/@line[a-z0-9._-]{2,}/i, /line\.me\/ti\/p\//i];

const FULL_PLATE_DATA_PATTERNS = [/\b[ก-ฮ]{2}\s?\d{1,4}\s?[ก-ฮ]{1,2}\b/];

const RAW_IMAGE_URL_PATTERNS = [
  /https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i,
  /firebasestorage\.googleapis\.com/i,
  /storage\.googleapis\.com/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Yaris|Vios|Altis|Revo|Vigo)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V|Jazz|CR-V|Accord)\b/i,
  /\bFord\s+Everest\b/i,
  /\bMitsubishi\s+Pajero\b/i,
  /\bIsuzu\s+(?:D-Max|Mu-X)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const FIREBASE_UID_PATTERNS = [/\b[a-zA-Z0-9]{28}\b/];

const HEAD_SHA = "191668fde970fd41bb651eabbc305a55802e1d47";
const INSUFFICIENT_DATA_MSG = "ข้อมูลประกาศยังไม่พอ";
const DISCLAIMER_MSG = "ข้อมูลเบื้องต้น";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.2D Thailand Used-car Legal Compliance Readiness Plan ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62d-thailand-used-car-legal-compliance-readiness-plan.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62b15Doc = readFileSync(V62B15_DOC, "utf8");
const v62cDoc = readFileSync(V62C_DOC, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in repo[\s\S]*?## 10\./,
  "## 10."
);

// --- doc exists + v6.2D ---
{
  ok("readiness doc exists", doc.length > 10000);
  ok("doc v6.2D label", doc.includes("v6.2D"));
  ok(
    "doc thailand used-car legal compliance",
    /thailand used-car legal compliance/i.test(doc)
  );
  ok(
    "doc docs tests only",
    /docs\/tests\/package only|docs\/tests only/i.test(docLower)
  );
  ok("doc HEAD 191668f", doc.includes(HEAD_SHA) || doc.includes("191668f"));
  ok("doc references v62b15", /v6\.2B\.15/i.test(doc));
  ok("doc planning not runtime", /planning only|not implemented/i.test(docLower));
  ok("doc checklist requirements only", /checklist\/requirements only/i.test(docLower));
}

// --- product goal ---
{
  ok("product goal section", /Product Goal/i.test(doc));
  ok("goal ocpb used car label", /สคบ|ฉลากรถ/i.test(doc));
  ok("goal PDPA privacy", /PDPA.*privacy|PDPA \/ privacy/i.test(doc));
  ok("goal DOT transfer", /กรมการขนส่งทางบก/i.test(doc));
  ok("goal transaction docs", /เอกสารธุรกรรม/i.test(doc));
  ok("goal AI grounding", /AI Grounding|AI grounding/i.test(doc));
}

// --- สคบ. / ฉลากรถใช้แล้ว ---
{
  ok("ocpb section", /สคบ.*ฉลากรถยนต์ใช้แล้ว/i.test(doc));
  ok("ocpb required fields", /ข้อมูลประกาศที่ต้องมี/i.test(doc));
  ok("ocpb brand model year", /ยี่ห้อ.*รุ่น|ปีจดทะเบียน/i.test(doc));
  ok("ocpb price mileage", /ราคาขาย|เลขไมล์/i.test(doc));
  ok("ocpb no misleading", /ห้ามทำให้ผู้บริโภคเข้าใจผิด/i.test(doc));
  ok("ocpb no warranty claim", /ห้าม.*รับประกัน|ไม่รับประกัน/i.test(doc));
  ok("ocpb disclaimer preliminary", doc.includes(DISCLAIMER_MSG));
  ok("ocpb verify before buy", /ตรวจสอบรถ.*เอกสาร|ตรวจสอบรถจริง/i.test(doc));
}

// --- PDPA / privacy ---
{
  ok("PDPA section", /PDPA.*Privacy/i.test(doc));
  ok("public vs internal fields", /public fields vs internal|Public fields vs Internal/i.test(doc));
  ok("plate internal-only masked", /ทะเบียนเต็ม.*internal-only|internal-only.*masked/i.test(doc));
  ok("no public licensePlate", /licensePlate|public.*plate/i.test(docLower));
  ok("phone LINE address forbidden public", /เบอร์.*LINE.*ที่อยู่|ห้าม public/i.test(doc));
  ok("docs id book contract finance forbidden", /เอกสาร.*บัตร.*ใบเล่ม|สัญญา.*หลักฐานการเงิน/i.test(doc));
  ok("consent seller dealer", /consent.*ผู้ขาย|เจ้าของข้อมูล/i.test(doc));
}

// --- กรมการขนส่งทางบก ---
{
  ok("DOT section", /กรมการขนส่งทางบก/i.test(doc));
  ok("DOT transfer checklist", /checklist.*โอนกรรมสิทธิ์|โอนกรรมสิทธิ์/i.test(doc));
  ok("DOT no floating transfer", /ไม่สนับสนุนโอนลอย|โอนลอย/i.test(doc));
  ok("DOT check book tax status", /ตรวจเล่ม|ภาษี|สถานะรถ/i.test(doc));
  ok("DOT post sale steps", /ขั้นตอนหลังตกลงซื้อขาย/i.test(doc));
}

// --- เอกสารธุรกรรม ---
{
  ok("transaction docs section", /เอกสารธุรกรรม/i.test(doc));
  ok("payment receipt evidence", /หลักฐานรับเงิน/i.test(doc));
  ok("sales contract", /สัญญาซื้อขาย/i.test(doc));
  ok("deposit reservation", /ใบจอง|มัดจำ/i.test(doc));
  ok("private internal storage future", /private\/internal|private.*internal/i.test(docLower));
  ok("payment settlement NO-GO", /payment.*NO-GO|settlement.*NO-GO/i.test(doc));
}

// --- AI grounding / seller claims ---
{
  ok("AI grounding section", /AI Grounding.*Seller Claims/i.test(doc));
  ok("AI no condition warranty", /ห้ามน้องเอฟันธง|ไม่รับประกันสภาพรถ/i.test(doc));
  ok("AI no flood crash guarantee", /ชนหนัก|น้ำท่วม/i.test(doc));
  ok("AI no mileage guarantee", /เลขไมล์/i.test(doc));
  ok("AI insufficient data message", doc.includes(INSUFFICIENT_DATA_MSG));
  ok("AI advise inspect test drive", /ตรวจรถจริง|ทดลองขับ|ตรวจศูนย์/i.test(doc));
  ok("AI no real gemini public", /real Gemini.*not enabled|no real Gemini/i.test(docLower));
}

// --- seller / dealer checklist ---
{
  ok("seller dealer checklist section", /Seller.*Dealer Compliance/i.test(doc));
  ok("seller pre-listing checks", /ก่อนลงประกา฽|ก่อนลงประกาศ/i.test(doc));
  ok("dealer wholesale internal", /wholesale.*internal-only/i.test(docLower));
  ok("ops review gate", /ops review gate/i.test(docLower));
}

// --- pilot gate ---
{
  ok("pilot gate section", /Pilot Gate/i.test(doc));
  ok("pilot GO controlled staging", /GO.*controlled staging|controlled staging pilot.*GO/i.test(doc));
  ok("pilot lung allowlisted", /ลุง.*allowlisted|allowlisted tester/i.test(doc));
  ok("pilot NO-GO public launch", /NO-GO.*public launch|public launch.*NO-GO/i.test(docLower));
  ok("pilot NO-GO production", /NO-GO.*production|production.*NO-GO/i.test(docLower));
  ok("pilot NO-GO payment settlement", /payment.*NO-GO|settlement.*NO-GO/i.test(docLower));
}

// --- go/no-go ---
{
  ok("go no-go section", /Go\/No-go/i.test(doc));
  ok("go legal criteria ocpb", /สคบ.*listing fields|LG-01/i.test(doc));
  ok("go PDPA consent", /PDPA.*consent|LG-02/i.test(doc));
  ok("go DOT no floating", /no โอนลอย|LG-04/i.test(doc));
  ok("no-go public without legal", /public launch without legal/i.test(docLower));
  ok("no-go full plate public", /full plate public/i.test(docLower));
  ok("no-go nong a warrants", /Nong A warrants|น้องเอ.*รับประกัน/i.test(doc));
}

// --- docs-first / scope guards ---
{
  ok("docs-first only", /docs\/tests\/package only/i.test(docLower));
  ok("no runtime code", /runtime.*not|not in v6\.2D|not implemented/i.test(docLower));
  ok("no deploy", /deploy.*not done|no deploy/i.test(docLower));
  ok("no env update", /env update.*not done|env update/i.test(docLower));
  ok("no import additional", /import.*not done|ไม่ import/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*not done|no Firestore writes/i.test(docLower));
}

// --- forbidden / compliance ---
{
  ok("forbidden no firestore rules", /Firestore rules deploy|firestore rules deploy/i.test(doc));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok(
    "forbidden no payment settlement lead reveal outcome",
    /payment.*settlement|lead.*reveal.*outcome/i.test(docLower)
  );
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("forbidden no public AI", /public AI|public ai/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.2D/i.test(doc));
}

// --- no PII/secrets/real car data in doc ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of LINE_ID_PATTERNS) {
    ok(`doc no LINE ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of RAW_IMAGE_URL_PATTERNS) {
    ok(`doc no raw image URL ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(
      `doc no plate data ${pat.source.slice(0, 12)}`,
      !pat.test(docForPlateScan)
    );
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car data ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of FIREBASE_UID_PATTERNS) {
    ok(`doc no firebase uid ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- cross-ref v62b15 / v62c ---
{
  ok("v62b15 GO controlled staging", /GO.*controlled staging pilot/i.test(v62b15Doc));
  ok("v62b15 legal slice pending", /legal.*PDPA|dedicated compliance slice/i.test(v62b15Doc));
  ok("v62c plate redaction", /ป้ายทะเบียน/i.test(v62cDoc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no runtime imports", !/from\s+["']\.\.\/src\//.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v62d script",
    pkg.includes(
      "test:v62d-thailand-used-car-legal-compliance-readiness-plan"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62d-thailand-used-car-legal-compliance-readiness-plan.mts"
    )
  );
}

console.log(
  "\nDone v6.2D Thailand Used-car Legal Compliance Readiness Plan tests."
);
if (process.exitCode) process.exit(process.exitCode);
