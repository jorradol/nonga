/**
 * v6.3B — Buyer-Friendly Listing Copy Deterministic Helper (static + runtime tests)
 * npm run test:v63b-buyer-friendly-listing-copy-deterministic-helper
 */
import { readFileSync } from "node:fs";
import {
  buildBuyerFriendlyListingCopy,
  BUYER_FRIENDLY_SAFETY_DISCLAIMER,
  parseBuyerSpecTokens,
  passesOutputGuard,
  sanitizeListingCopyText,
  softenOmitOverclaims,
} from "../src/utils/buyerFriendlyListingCopy.ts";

const DOC_PATH =
  "docs/v6.3B-buyer-friendly-listing-copy-deterministic-helper.md";
const V63A_DOC = "docs/v6.3A-buyer-friendly-listing-copy-readiness.md";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
];

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b0[689]\d{8}\b/,
];

const LINE_ID_PATTERNS = [/@line[a-z0-9._-]{2,}/i, /line\.me\/ti\/p\//i];

const FULL_PLATE_PATTERNS = [/\b[ก-ฮ]{2}\s?\d{1,4}\s?[ก-ฮ]{1,2}\b/];

const RAW_IMAGE_URL_PATTERNS = [
  /firebasestorage\.googleapis\.com/i,
  /storage\.googleapis\.com/i,
];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner|Yaris|Vios|Altis|Revo|Vigo)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V|Jazz|CR-V|Accord)\b/i,
];

const HEAD_SHA = "9bbc7fc5b8265f7dc0a4504eaf978ea57c13ecc3";

const SYNTHETIC_BRAND = "ยี่ห้อตัวอย่าง";
const SYNTHETIC_MODEL = "รุ่นตัวอย่าง";
const RAW_SPEC_SAMPLE = "บ.+จอทัช+ฝาท้ายไฟฟ้า+ล้อแม็ก";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assertNoForbiddenOutput(text: string, label: string) {
  ok(`${label} no phone`, !REAL_PHONE_PATTERNS.some((p) => p.test(text)));
  ok(`${label} no plate`, !FULL_PLATE_PATTERNS.some((p) => p.test(text)));
  ok(`${label} no LINE`, !LINE_ID_PATTERNS.some((p) => p.test(text)));
  ok(`${label} no raw storage URL`, !RAW_IMAGE_URL_PATTERNS.some((p) => p.test(text)));
  ok(`${label} no never crashed claim`, !/ไม่เคยช/i.test(text));
  ok(`${label} no genuine mileage claim`, !/ไมล์แท้/i.test(text));
  ok(`${label} no fuel certainty`, !/ประหยัดแน่นอน/i.test(text));
  ok(`${label} no km/l invented`, !/\d+(?:\.\d+)?\s*km\/l/i.test(text));
  ok(`${label} no warranty`, !/รับประกัน|warranty/i.test(text));
  ok(`${label} output guard`, passesOutputGuard(text).pass);
}

console.log(
  "=== v6.3B Buyer-Friendly Listing Copy Deterministic Helper ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v63b-buyer-friendly-listing-copy-deterministic-helper.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v63aDoc = readFileSync(V63A_DOC, "utf8");
const moduleSrc = readFileSync("src/utils/buyerFriendlyListingCopy.ts", "utf8");

// --- doc exists + v6.3B ---
{
  ok("readiness doc exists", doc.length > 5000);
  ok("doc v6.3B label", doc.includes("v6.3B"));
  ok(
    "doc deterministic helper",
    /deterministic.*helper|deterministic\/template/i.test(doc)
  );
  ok("doc references v63a", /v6\.3A/i.test(doc));
  ok("doc HEAD 9bbc7fc", doc.includes(HEAD_SHA) || doc.includes("9bbc7fc"));
  ok("doc no UI wire", /no UI wire|not in v6\.3B/i.test(docLower));
  ok("doc no deploy", /no deploy|not in v6\.3B/i.test(docLower));
  ok("doc soften omit overclaim", /soften.*omit/i.test(docLower));
  ok("doc duplicated SPEC_MAP", /duplicate.*SPEC_MAP|Duplicated from listingDescriptionHelper/i.test(doc));
}

// --- module static guards ---
{
  ok("module no fetch", !/fetch\s*\(/.test(moduleSrc));
  ok("module no generateContent", !/generateContent/.test(moduleSrc));
  ok("module no gemini import", !/gemini/i.test(moduleSrc));
  ok("module has buildBuyerFriendlyListingCopy", moduleSrc.includes("buildBuyerFriendlyListingCopy"));
  ok("module has safety disclaimer constant", moduleSrc.includes("BUYER_FRIENDLY_SAFETY_DISCLAIMER"));
}

// --- parseBuyerSpecTokens ---
{
  const tokens = parseBuyerSpecTokens(RAW_SPEC_SAMPLE);
  ok("parse raw spec tokens count", tokens.length >= 3);
  ok("parse expands seat token", tokens.some((t) => /เบาะหนัง/i.test(t)));
  ok("parse expands tailgate", tokens.some((t) => /ฝาท้ายไฟฟ้า/i.test(t)));
}

// --- softenOmitOverclaims ---
{
  const over = softenOmitOverclaims(
    "รถสภาพดี ไม่เคยชน ไมล์แท้ 100% ประหยัดแน่นอน รับประกัน 1 ปี"
  );
  ok("overclaim omitted flag", over.omitted);
  ok("overclaim strip never crashed", !/ไม่เคยช/i.test(over.text));
  ok("overclaim strip genuine mileage", !/ไมล์แท้/i.test(over.text));
  ok("overclaim strip fuel certainty", !/ประหยัดแน่นอน/i.test(over.text));
  ok("overclaim strip warranty", !/รับประกัน/i.test(over.text));
}

// --- sanitizeListingCopyText ---
{
  const cleaned = sanitizeListingCopyText(
    "ติดต่อ 0812345678 ป้าย กก 9999 กก https://storage.example/x.jpg"
  );
  ok("sanitize strips phone", !/0812345678/.test(cleaned));
  ok("sanitize strips plate", !/กก\s*9999/.test(cleaned));
  ok("sanitize strips url", !/https?:\/\//.test(cleaned));
}

// --- BH-01 rich raw spec ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2020,
    description: RAW_SPEC_SAMPLE,
    price: 450000,
    mileage: 55000,
    color: "ขาว",
    fuelType: "petrol",
  });
  ok("BH-01 source rich or structured", /template-rich|template-structured/.test(result.source));
  ok("BH-01 guard pass", result.guardPass);
  ok("BH-01 has highlights", /จุดเด่น/i.test(result.text));
  ok("BH-01 has expanded spec", /เบาะหนัง|จอทัชสกรีน/i.test(result.text));
  ok("BH-01 has disclaimer", result.text.includes(BUYER_FRIENDLY_SAFETY_DISCLAIMER));
  ok("BH-01 suitable for line", /เหมาะสำหรับผู้ที่มองหา/i.test(result.text));
  assertNoForbiddenOutput(result.text, "BH-01");
}

// --- BH-02 structured only ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2019,
    price: 320000,
    mileage: 80000,
    color: "ดำ",
    fuelType: "diesel",
  });
  ok("BH-02 source structured or minimal", /template-structured|fallback-minimal/.test(result.source));
  ok("BH-02 guard pass", result.guardPass);
  ok("BH-02 has identity", result.text.includes(SYNTHETIC_BRAND));
  ok("BH-02 has price mileage", /ราคา|ไมล์/i.test(result.text));
  ok("BH-02 has disclaimer", result.text.includes(BUYER_FRIENDLY_SAFETY_DISCLAIMER));
  assertNoForbiddenOutput(result.text, "BH-02");
}

// --- BH-03 empty ---
{
  const result = buildBuyerFriendlyListingCopy({});
  ok("BH-03 empty source", result.source === "empty");
  ok("BH-03 empty text", result.text === "");
  ok("BH-03 guard pass", result.guardPass);
}

// --- BH-04 rich description + features ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2021,
    description:
      "รถใช้งานประจำวัน ดูแลศูนย์ตามระยะ ภายในสะอาด พร้อมอุปกรณ์ครบตามที่ระบุ",
    features: ["กล้องถอยหลัง", "เซ็นเซอร์ถอย"],
    price: 510000,
  });
  ok("BH-04 template rich", result.source === "template-rich");
  ok("BH-04 guard pass", result.guardPass);
  ok("BH-04 includes feature", /กล้องถอยหลัง/i.test(result.text));
  assertNoForbiddenOutput(result.text, "BH-04");
}

// --- GR-01 phone in description ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    description: "สอบถาม 0891234567 รายละเอียดเพิ่มเติม",
  });
  ok("GR-01 guard pass", result.guardPass);
  assertNoForbiddenOutput(result.text, "GR-01");
}

// --- GR-04 no km/l invented ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    description: "รถประหยัดน้ำมันดี ใช้งานจริง",
    fuelType: "hybrid",
  });
  ok("GR-04 no km/l", !/\d+(?:\.\d+)?\s*km\/l/i.test(result.text));
  assertNoForbiddenOutput(result.text, "GR-04");
}

// --- GR-05 seller overclaim soften omit ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    description: "สภาพสวย ไม่เคยชน ไมล์แท้ ประหยัดแน่นอน",
  });
  ok("GR-05 warning overclaim", result.warnings.includes("seller-overclaim-omitted"));
  ok("GR-05 no never crashed in output", !/ไม่เคยช/i.test(result.text));
  ok("GR-05 no genuine mileage in output", !/ไมล์แท้/i.test(result.text));
  assertNoForbiddenOutput(result.text, "GR-05");
}

// --- GR-06 wholesale keyword ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    description: "ราคาส่งพิเศษ รายละเอียดครบ",
  });
  ok("GR-06 no wholesale in output", !/wholesale|ราคาส่ง/i.test(result.text));
  assertNoForbiddenOutput(result.text, "GR-06");
}

// --- FB-02 sparse structured ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
  });
  ok("FB-02 minimal or structured", /fallback-minimal|template-structured/.test(result.source));
  ok("FB-02 has disclaimer", result.text.includes(BUYER_FRIENDLY_SAFETY_DISCLAIMER));
  assertNoForbiddenOutput(result.text, "FB-02");
}

// --- doc / repo hygiene ---
{
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`doc no phone ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- cross-ref v63a ---
{
  ok("v63a phase 1 deterministic", /Phase 1.*Deterministic|deterministic.*template/i.test(v63aDoc));
  ok("v63a public-safe fields", /Public-safe sources/i.test(v63aDoc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
}

// --- package.json ---
{
  ok(
    "package v63b script",
    pkg.includes(
      "test:v63b-buyer-friendly-listing-copy-deterministic-helper"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v63b-buyer-friendly-listing-copy-deterministic-helper.mts"
    )
  );
}

console.log(
  "\nDone v6.3B Buyer-Friendly Listing Copy Deterministic Helper tests."
);
if (process.exitCode) process.exit(process.exitCode);
