/**
 * v6.3A — Buyer-Friendly Listing Copy Readiness (static validation only)
 * npm run test:v63a-buyer-friendly-listing-copy-readiness
 */
import { readFileSync } from "node:fs";

const DOC_PATH = "docs/v6.3A-buyer-friendly-listing-copy-readiness.md";
const V62D_DOC =
  "docs/v6.2D-thailand-used-car-legal-compliance-readiness-plan.md";
const V62E_DOC =
  "docs/v6.2E-pilot-monitoring-feedback-loop-readiness-plan.md";

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

const HEAD_SHA = "9b45197919700713c77dcfbd78d7d175e94d4415";
const FROM_LISTING_MSG = "จากข้อมูลประกาศ";
const SUITABLE_FOR_MSG = "เหมาะสำหรับผู้ที่มองหา";
const INSPECT_BEFORE_BUY_MSG = "ควรตรวจสอบสภาพรถจริงก่อนตัดสินใจ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.3A Buyer-Friendly Listing Copy Readiness ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v63a-buyer-friendly-listing-copy-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62dDoc = readFileSync(V62D_DOC, "utf8");
const v62eDoc = readFileSync(V62E_DOC, "utf8");

const docForPlateScan = doc.replace(
  /Privacy prohibited fields[\s\S]*?### Unsupported claim guard/,
  "### Unsupported claim guard"
);

// --- doc exists + v6.3A ---
{
  ok("readiness doc exists", doc.length > 8000);
  ok("doc v6.3A label", doc.includes("v6.3A"));
  ok(
    "doc buyer-friendly listing copy readiness",
    /buyer-friendly listing copy readiness/i.test(doc)
  );
  ok(
    "doc docs tests package only",
    /docs\/tests\/package only/i.test(docLower)
  );
  ok("doc HEAD 9b45197", doc.includes(HEAD_SHA) || doc.includes("9b45197"));
  ok("doc references v62d", /v6\.2D/i.test(doc));
  ok("doc planning not runtime", /planning only|not implemented/i.test(docLower));
  ok("doc no runtime rewrite", /no runtime rewrite|not in v6\.3A/i.test(docLower));
}

// --- problem statement + goal ---
{
  ok("problem statement section", /Problem Statement/i.test(doc));
  ok("problem seller jargon", /ภาษาวงการรถ|สเปกดิบ/i.test(doc));
  ok("problem buyer difficulty", /ผู้ซื้อทั่วไป.*อ่าน|อ่านเข้าใจ/i.test(doc));
  ok("goal section", /^## 2\. Goal/m.test(doc));
  ok("goal readable copy", /อ่านง่าย/i.test(doc));
  ok("goal help sell", /ช่วยขาย/i.test(doc));
  ok("goal faithful to source", /ตรงกับข้อมูลเดิม|ไม่แต่งข้อมูล/i.test(doc));
}

// --- non-goals ---
{
  ok("non-goals section", /Non-goals/i.test(doc));
  ok("non-goal no new data", /สร้างข้อมูลใหม่/i.test(doc));
  ok("non-goal no real AI provider", /real AI provider/i.test(docLower));
  ok("non-goal no public AI", /public AI/i.test(doc));
  ok("non-goal no production", /production/i.test(docLower));
  ok("non-goal no lead payment reveal", /lead.*payment.*reveal|payment.*reveal.*outcome/i.test(docLower));
}

// --- allowed transformations ---
{
  ok("allowed transformations section", /Allowed Transformations/i.test(doc));
  ok("allowed rearrange language", /เรียบเรียงภาษา/i.test(doc));
  ok("allowed expand abbreviations", /ขยายคำย่อ/i.test(doc));
  ok("allowed organize highlights", /จัดหมวดจุดเด่น/i.test(doc));
  ok("allowed polite marketing", /ภาษาการตลาด.*สุภาพ/i.test(doc));
  ok("allowed caveat from listing", /caveat.*ข้อมูลประกาศ|อ้างอิง.*ประกาศ/i.test(doc));
  ok("allowed fallback original", /fallback.*ต้นฉบับ|original.*disclaimer/i.test(docLower));
}

// --- forbidden transformations ---
{
  ok("forbidden transformations section", /Forbidden Transformations/i.test(doc));
  ok("forbidden invent spec", /แต่งสเปกที่ไม่มี/i.test(doc));
  ok("forbidden invent km/l", /km\/l|กิโล.*ลitre/i.test(docLower));
  ok("forbidden never crashed", /ไม่เคยชน/i.test(doc));
  ok("forbidden genuine mileage", /ไมล์แท้/i.test(doc));
  ok("forbidden fuel certainty", /ประหยัดแน่นอน/i.test(doc));
  ok("forbidden overclaim condition", /สภาพนางฟ้า/i.test(doc));
  ok("forbidden warranty finance", /รับประกัน|warranty|ฟรีดาวน์/i.test(doc));
  ok("forbidden hidden fields", /hidden\/internal fields/i.test(docLower));
}

// --- privacy prohibited fields ---
{
  ok("privacy plate prohibited", /licensePlate|ป้ายทะเบียน/i.test(doc));
  ok("privacy wholesale prohibited", /wholesale/i.test(docLower));
  ok("privacy phone prohibited", /phone|เบอร์โทร/i.test(docLower));
  ok("privacy LINE prohibited", /LINE/i.test(doc));
  ok("privacy UID prohibited", /UID/i.test(doc));
  ok("privacy raw image URL prohibited", /raw image URL/i.test(doc));
  ok("privacy secret prohibited", /secret/i.test(docLower));
}

// --- unsupported claim guard ---
{
  ok("unsupported claim guard section", /Unsupported claim guard/i.test(doc));
  ok("claim guard never crashed", /ไม่เคยชน/i.test(doc));
  ok("claim guard genuine mileage", /ไมล์แท้/i.test(doc));
  ok("claim guard fuel certainty", /ประหยัดแน่นอน/i.test(doc));
  ok("claim guard km/l", /km\/l/i.test(docLower));
  ok("claim guard warranty", /รับประกัน/i.test(doc));
}

// --- safety copy principles ---
{
  ok("safety copy principles section", /Safety Copy Principles/i.test(doc));
  ok("safety from listing data", doc.includes(FROM_LISTING_MSG));
  ok("safety suitable for", doc.includes(SUITABLE_FOR_MSG));
  ok("safety inspect before buy", doc.includes(INSPECT_BEFORE_BUY_MSG));
  ok("safety avoid absolute", /หลีกเลี่ยงคำฟันธง/i.test(doc));
  ok("safety fallback", /fallback.*disclaimer|original.*disclaimer/i.test(docLower));
}

// --- data boundary ---
{
  ok("data boundary section", /Data Boundary/i.test(doc));
  ok("public-safe sources", /Public-safe sources/i.test(doc));
  ok("public description field", /`description`/i.test(doc));
  ok("internal-only forbidden sources", /Internal-only.*forbidden|forbidden sources/i.test(doc));
  ok("output boundary preserve original", /Original.*description.*คง|preserved/i.test(docLower));
}

// --- implementation path ---
{
  ok("implementation path section", /Recommended Implementation Path/i.test(doc));
  ok("path deterministic template first", /deterministic.*template|template-first/i.test(docLower));
  ok("path references listingDescriptionHelper", /listingDescriptionHelper/i.test(doc));
  ok("path references formatListingDescription", /formatListingDescription/i.test(doc));
  ok("path guarded AI staging only", /guarded AI.*staging|staging only/i.test(docLower));
  ok("path approval required before AI", /approval.*AI|separate approval/i.test(docLower));
  ok("path kill switch", /kill switch/i.test(docLower));
  ok("path shadow flag false", /NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED.*false/i.test(doc));
  ok("path no real gemini", /no real Gemini|real Gemini.*not/i.test(docLower));
}

// --- acceptance criteria ---
{
  ok("acceptance criteria section", /Acceptance Criteria/i.test(doc));
  ok("ac public-safe only", /public-safe fields only/i.test(docLower));
  ok("ac zero privacy leak", /Zero.*plate|plate.*wholesale.*phone/i.test(doc));
  ok("ac fallback", /Fallback.*original/i.test(doc));
  ok("ac deterministic without AI", /without.*AI provider/i.test(docLower));
  ok("ac kill switch", /Kill switch/i.test(doc));
}

// --- test plan ---
{
  ok("test plan section", /Test Plan/i.test(doc));
  ok("test privacy leak", /Privacy leak tests/i.test(doc));
  ok("test unsupported claim", /Unsupported claim tests/i.test(doc));
  ok("test overclaim", /Overclaim tests/i.test(doc));
  ok("test hidden field", /Hidden field tests/i.test(doc));
  ok("test fallback", /Fallback tests/i.test(doc));
  ok("test thai copy tone", /Thai copy tone tests/i.test(doc));
}

// --- docs-first / scope guards ---
{
  ok("docs-first only", /docs\/tests\/package only/i.test(docLower));
  ok("no runtime code", /runtime.*not|not in v6\.3A|no runtime rewrite/i.test(docLower));
  ok("no deploy", /deploy.*not done|no deploy|not in v6\.3A/i.test(docLower));
  ok("no env update", /env update.*not done|env update/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*not done|no Firestore writes/i.test(docLower));
  ok("no import cleanup", /import.*not done|cleanup.*not done/i.test(docLower));
  ok("no AI provider", /AI provider.*not|not in v6\.3A/i.test(docLower));
  ok("no public AI gemini", /public AI|real Gemini/i.test(doc));
}

// --- forbidden / compliance ---
{
  ok("forbidden actions section", /Forbidden Actions.*v6\.3A/i.test(doc));
  ok("forbidden no firestore rules", /Firestore rules deploy|firestore rules deploy/i.test(doc));
  ok("forbidden no secrets access", /secrets versions access/i.test(doc));
  ok(
    "forbidden no payment settlement lead reveal outcome",
    /payment.*settlement|lead.*reveal.*outcome/i.test(docLower)
  );
  ok("forbidden no public signup", /public signup/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.3A/i.test(doc));
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

// --- cross-ref v62d / v62e ---
{
  ok("v62d AI grounding no overclaim", /ห้ามน้องเอฟันธง|ไม่รับประกันสภาพรถ/i.test(v62dDoc));
  ok("v62d public vs internal", /public fields vs internal|Public fields vs Internal/i.test(v62dDoc));
  ok("v62e pilot GO controlled staging", /GO.*controlled staging|controlled staging pilot/i.test(v62eDoc));
  ok("v62e privacy plate wholesale", /licensePlate|wholesale/i.test(v62eDoc));
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
    "package v63a script",
    pkg.includes("test:v63a-buyer-friendly-listing-copy-readiness")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v63a-buyer-friendly-listing-copy-readiness.mts"
    )
  );
}

console.log(
  "\nDone v6.3A Buyer-Friendly Listing Copy Readiness tests."
);
if (process.exitCode) process.exit(process.exitCode);
