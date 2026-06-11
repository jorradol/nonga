/**
 * v6.3B.4 — Buyer-Friendly Sales Copy Tone Refinement
 * npm run test:v63b4-buyer-friendly-sales-copy-tone-refinement
 */
import { readFileSync } from "node:fs";
import {
  buildBuyerFriendlyListingCopy,
  BUYER_FRIENDLY_SAFETY_DISCLAIMER,
  isDisplayableProvince,
  isJunkSpecToken,
  parseBuyerSpecTokens,
  passesOutputGuard,
  sanitizeListingCopyText,
} from "../src/utils/buyerFriendlyListingCopy.ts";
import { BUYER_FRIENDLY_PREVIEW_SUBTITLE } from "../src/components/listings/BuyerFriendlyListingCopyPreview.tsx";

const DOC_PATH = "docs/v6.3B.4-buyer-friendly-sales-copy-tone-refinement.md";
const MODULE_PATH = "src/utils/buyerFriendlyListingCopy.ts";
const PREVIEW_PATH = "src/components/listings/BuyerFriendlyListingCopyPreview.tsx";

const SYNTHETIC_BRAND = "ยี่ห้อตัวอย่าง";
const SYNTHETIC_MODEL = "รุ่นตัวอย่าง";

const JARGON_SAMPLE =
  "AB2 + บ.หนัง + พวงมalทi + Cruise Control + Engine Start + Smart Keyless + จอทัชสกรีน + Bluetooth + วิทยุ FM/AM + AM + CD + USB + /k ต้องตรวจสภาพจริง — controlled pilot source package";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.3B.4 Buyer-Friendly Sales Copy Tone Refinement ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const moduleSrc = readFileSync(MODULE_PATH, "utf8");
const previewSrc = readFileSync(PREVIEW_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc ---
{
  ok("doc exists", doc.length > 2000);
  ok("doc v6.3B.4 label", doc.includes("v6.3B.4"));
  ok("doc no deploy", /no deploy|NO-GO.*deploy/i.test(doc));
  ok("doc deterministic", /deterministic|template/i.test(doc));
  ok("doc before after", /Before.*After|before.*after/i.test(doc));
  ok("doc guest future only", /guest.*future consideration|future consideration only/i.test(doc));
}

// --- module guards ---
{
  ok("module no fetch", !/fetch\s*\(/.test(moduleSrc));
  ok("module no gemini", !/generateContent|gemini/i.test(moduleSrc));
  ok("module sales tone helpers", /buildSalesFeatureParagraphs|groupSpecsForSalesCopy/.test(moduleSrc));
  ok("module junk token filter", moduleSrc.includes("isJunkSpecToken"));
  ok("module province guard", moduleSrc.includes("isDisplayableProvince"));
  ok("module internal noise strip", /INTERNAL_NOISE_PATTERNS|controlled\s*pilot/i.test(moduleSrc));
}

// --- preview UX ---
{
  ok("preview sales subtitle", previewSrc.includes(BUYER_FRIENDLY_PREVIEW_SUBTITLE));
  ok("preview no duplicate disclaimer import", !previewSrc.includes("BUYER_FRIENDLY_SAFETY_DISCLAIMER"));
}

// --- token hygiene ---
{
  ok("junk AB2", isJunkSpecToken("AB2"));
  ok("junk k", isJunkSpecToken("k"));
  ok("keep cruise token", !isJunkSpecToken("Cruise Control"));
  const tokens = parseBuyerSpecTokens(JARGON_SAMPLE);
  ok("parse omits AB2", !tokens.some((t) => /^AB2$/i.test(t)));
  ok("parse omits standalone k", !tokens.some((t) => /^k$/i.test(t)));
  ok("parse expands seat", tokens.some((t) => /เบาะหนัง/i.test(t)));
  const cleaned = sanitizeListingCopyText(JARGON_SAMPLE);
  ok("sanitize strips pilot package", !/controlled pilot source package/i.test(cleaned));
}

// --- province omit ---
{
  ok("province garbled omit", !isDisplayableProvince("ขฐ"));
  ok("province valid", isDisplayableProvince("กรุงเทพมหานคร"));
}

// --- tone output ---
{
  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2021,
    fuelType: "hybrid",
    bodyType: "SUV",
    description: JARGON_SAMPLE,
    province: "ขฐ",
    price: 890000,
    mileage: 48000,
  });
  ok("ST-01 guard pass", result.guardPass);
  ok("ST-02 prose not raw bullets", !/^-\s/m.test(result.text));
  ok("ST-03 has sales intro", /จากข้อมูลประกาศ/.test(result.text));
  ok("ST-04 has benefit grouping", /ความสะดวกในการขับ|การเข้าใช้งาน|Bluetooth|FM\/AM/i.test(result.text));
  ok("ST-05 no AB2 in output", !/\bAB2\b/i.test(result.text));
  ok("ST-06 no pilot package", !/controlled pilot/i.test(result.text));
  ok("ST-07 no garbled province", !/จังหวัดขฐ/.test(result.text));
  ok("ST-08 consolidated entertainment", !/\bAM\b.*\bCD\b.*\bUSB\b.*\bAM\b/m.test(result.text));
  ok("ST-09 single disclaimer", (result.text.match(/ข้อมูลนี้เป็นการเรียบเรียง/g) ?? []).length === 1);
  ok("ST-10 disclaimer constant", result.text.includes(BUYER_FRIENDLY_SAFETY_DISCLAIMER));
  ok("ST-11 suitable for line", /เหมาะสำหรับผู้ที่มองหา/i.test(result.text));
  ok("ST-12 no superlative claim", !/ดีที่สุด|คุ้มที่สุด/i.test(result.text));
  ok("ST-13 output guard", passesOutputGuard(result.text).pass);
  ok("ST-14 no overclaim", !/ไม่เคยช|ไมล์แท้|ประหยัดแน่นอน|รับประกัน/i.test(result.text));
}

// --- sparse fallback ---
{
  const sparse = buildBuyerFriendlyListingCopy({ brand: SYNTHETIC_BRAND });
  ok("FB-01 sparse has disclaimer", sparse.text.includes(BUYER_FRIENDLY_SAFETY_DISCLAIMER));
  ok("FB-02 sparse polite", /ข้อมูลประกาศ|สอบถาม/i.test(sparse.text));
}

// --- package ---
{
  ok(
    "package v63b4 script",
    pkg.includes("test:v63b4-buyer-friendly-sales-copy-tone-refinement")
  );
}

console.log("\nDone v6.3B.4 Buyer-Friendly Sales Copy Tone Refinement tests.");
if (process.exitCode) process.exit(process.exitCode);
