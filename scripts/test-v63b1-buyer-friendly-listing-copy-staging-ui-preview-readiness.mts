/**
 * v6.3B.1 — Staging UI Preview Readiness (static validation only)
 * npm run test:v63b1-buyer-friendly-listing-copy-staging-ui-preview-readiness
 */
import { readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v6.3B.1-buyer-friendly-listing-copy-staging-ui-preview-readiness.md";
const V63A_DOC = "docs/v6.3A-buyer-friendly-listing-copy-readiness.md";
const V63B_DOC =
  "docs/v6.3B-buyer-friendly-listing-copy-deterministic-helper.md";
const CAR_DETAILS_PATH = "src/components/cars/details/CarDetailsView.tsx";
const LISTING_DESC_PATH = "src/components/listings/ListingDescription.tsx";

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
];

const HEAD_SHA = "bb252cb3472c8423bcf1ef67b4948d65691c0397";
const SAFETY_DISCLAIMER =
  "จากข้อมูลประกาศ — ควรตรวจสอบสภาพรถจริง เอกสาร และทดลองขับก่อนตัดสินใจซื้อ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.3B.1 Staging UI Preview Readiness ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v63b1-buyer-friendly-listing-copy-staging-ui-preview-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v63aDoc = readFileSync(V63A_DOC, "utf8");
const v63bDoc = readFileSync(V63B_DOC, "utf8");
const carDetailsSrc = readFileSync(CAR_DETAILS_PATH, "utf8");
const listingDescSrc = readFileSync(LISTING_DESC_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Privacy prohibited in preview output[\s\S]*?## 9\./,
  "## 9."
);

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc exists + v6.3B.1 ---
{
  ok("readiness doc exists", doc.length > 9000);
  ok("doc v6.3B.1 label", doc.includes("v6.3B.1"));
  ok(
    "doc staging ui preview readiness",
    /staging ui preview readiness/i.test(doc)
  );
  ok(
    "doc docs tests package only",
    /docs\/tests\/package only/i.test(docLower)
  );
  ok("doc HEAD bb252cb", doc.includes(HEAD_SHA) || doc.includes("bb252cb"));
  ok("doc references v63b", /v6\.3B/i.test(doc));
  ok("doc references v63a", /v6\.3A/i.test(doc));
  ok("doc planning not ui wire", /not in v6\.3B\.1|no UI wire/i.test(docLower));
  ok("doc readiness only", /readiness-only|readiness plan/i.test(docLower));
}

// --- problem + goal ---
{
  ok("problem statement section", /Problem Statement/i.test(doc));
  ok("problem no ui preview yet", /ไม่มี UI preview|ยังไม่เห็น/i.test(doc));
  ok("goal section", /^## 2\. Goal/m.test(doc));
  ok("goal deterministic helper", /deterministic.*helper|v6\.3B/i.test(doc));
  ok("goal additive preview", /additive/i.test(docLower));
  ok("goal default deny", /default-deny|default deny/i.test(docLower));
  ok("goal guest no preview", /guest.*NO|guest = NO/i.test(doc));
}

// --- non-goals ---
{
  ok("non-goals section", /Non-goals/i.test(doc));
  ok("non-goal no car details wire", /CarDetailsView.*not in v6\.3B\.1|not in v6\.3B\.1/i.test(doc));
  ok("non-goal no persist", /persist|ไม่ persist/i.test(docLower));
  ok("non-goal no ai", /AI.*Gemini|Gemini.*not/i.test(doc));
  ok("non-goal no deploy", /not in v6\.3B\.1/i.test(docLower));
  ok("non-goal no guest preview", /guest.*NO|guest preview/i.test(docLower));
}

// --- UI preview contract ---
{
  ok("ui preview contract section", /UI Preview Contract/i.test(doc));
  ok("contract additive only", /additive/i.test(docLower));
  ok("contract original unchanged", /unchanged|ไม่แทนที่/i.test(doc));
  ok("contract listing description reference", /ListingDescription/i.test(doc));
  ok("contract car details reference", /CarDetailsView/i.test(doc));
  ok("contract seo unchanged", /SEO.*meta|meta.*unchanged|original car fields/i.test(doc));
  ok("contract preview label", /Preview.*Staging|Staging.*Preview/i.test(doc));
  ok("contract future v63b2 files", /v6\.3B\.2/i.test(doc));
}

// --- preview gates ---
{
  ok("preview gates section", /Preview Gates/i.test(doc));
  ok("gate compile flag", /VITE_NONGA_BUYER_FRIENDLY_COPY_PREVIEW_ENABLED/i.test(doc));
  ok("gate flag default false", /default.*false|false.*default/i.test(docLower));
  ok("gate staging hostname", /a\.nongbot\.org|nonga-ce93c/i.test(doc));
  ok("gate signed in", /signed-in|Signed-in/i.test(doc));
  ok("gate allowlisted", /allowlisted/i.test(docLower));
  ok("gate helper guard", /guardPass/i.test(doc));
}

// --- visibility policy ---
{
  ok("visibility policy section", /Visibility Policy/i.test(doc));
  ok("visibility guest no", /Guest.*NO|guest.*❌/i.test(doc));
  ok("visibility allowlisted yes", /allowlisted.*YES|allowlisted.*✅/i.test(doc));
  ok("visibility production no", /production.*NO|Production domain.*❌/i.test(doc));
}

// --- data boundary ---
{
  ok("data boundary section", /Data Boundary/i.test(doc));
  ok("mapper whitelist", /Whitelist|whitelist/i.test(doc));
  ok("forbidden ownerPhone", /ownerPhone/i.test(doc));
  ok("forbidden licensePlate", /licensePlate/i.test(doc));
  ok("forbidden wholesale", /wholesale/i.test(docLower));
  ok("no db persist", /ไม่เขียนกลับ|ไม่ persist|client-side derive/i.test(docLower));
}

// --- guardrails fallback ---
{
  ok("guardrails fallback section", /Guardrails.*Fallback/i.test(doc));
  ok("inherits v63b helper", /buildBuyerFriendlyListingCopy/i.test(doc));
  ok("soften omit overclaim", /soften.*omit/i.test(docLower));
  ok("fallback guard fail banner", /guardPass: false|preview ไม่พร้อม/i.test(doc));
  ok("safety disclaimer", doc.includes(SAFETY_DISCLAIMER) || /BUYER_FRIENDLY_SAFETY_DISCLAIMER/i.test(doc));
}

// --- forbidden transformations ---
{
  ok("forbidden transformations section", /Forbidden Transformations/i.test(doc));
  ok("forbidden invent spec", /แต่งสเปก/i.test(doc));
  ok("forbidden km/l", /km\/l/i.test(docLower));
  ok("forbidden never crashed", /ไม่เคยช/i.test(doc));
  ok("forbidden genuine mileage", /ไมล์แท้/i.test(doc));
  ok("forbidden fuel certainty", /ประหยัดแน่นอน/i.test(doc));
  ok("forbidden warranty", /รับประกัน|warranty/i.test(doc));
}

// --- privacy prohibited ---
{
  ok("privacy plate", /licensePlate|plate/i.test(docLower));
  ok("privacy phone", /phone|เบอร์/i.test(docLower));
  ok("privacy LINE", /LINE/i.test(doc));
  ok("privacy UID", /UID/i.test(doc));
  ok("privacy secret", /secret/i.test(docLower));
  ok("privacy raw image url", /raw image URL/i.test(doc));
}

// --- slice roadmap deploy ---
{
  ok("slice roadmap section", /Slice Roadmap|Deploy Decision/i.test(doc));
  ok("v63b1 no deploy", /v6\.3B\.1.*NO deploy|NO deploy.*v6\.3B\.1/i.test(doc));
  ok("v63b2 no deploy flag off", /v6\.3B\.2.*NO deploy|flag default off/i.test(docLower));
  ok("v63b2a staging hosting only", /v6\.3B\.2A.*staging hosting|Staging hosting ONLY/i.test(doc));
  ok("no cloud run firestore prod", /Cloud Run.*Firestore.*production|production.*not/i.test(docLower));
}

// --- manual smoke plan ---
{
  ok("manual smoke section", /Manual Smoke Plan/i.test(doc));
  ok("smoke allowlisted session", /allowlisted signed-in|allowlisted session/i.test(doc));
  ok("smoke not guest", /not guest|Guest session.*hidden/i.test(doc));
  ok("smoke original unchanged", /Original text unchanged|original unchanged/i.test(doc));
  ok("smoke staging url", /a\.nongbot\.org/i.test(doc));
  ok("smoke overclaim omit", /ไม่เคยชน|ไมล์แท้/i.test(doc));
}

// --- docs-first scope guards ---
{
  ok("docs-first only", /docs\/tests\/package only/i.test(docLower));
  ok("no ui wire v63b1", /not in v6\.3B\.1|no UI wire/i.test(docLower));
  ok("no runtime ui change", /Buyer-visible behavior change.*not|not in v6\.3B\.1/i.test(docLower));
  ok("no env update", /env update.*not|NO env update/i.test(docLower));
  ok("no firestore writes", /Firestore writes.*not|no Firestore writes/i.test(docLower));
  ok("no ai gemini shadow", /AI.*Gemini|shadow real provider/i.test(doc));
}

// --- forbidden actions compliance ---
{
  ok("forbidden actions section", /Forbidden Actions.*v6\.3B\.1/i.test(doc));
  ok("forbidden no firestore rules deploy", /Firestore rules deploy/i.test(doc));
  ok("forbidden no payment lead reveal", /payment.*lead.*reveal|lead.*reveal.*outcome/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.3B\.1/i.test(doc));
}

// --- runtime files unchanged (v6.3B.1) ---
{
  ok(
    "CarDetailsView still uses car.description",
    carDetailsSrc.includes("text={car.description}")
  );
  ok(
    "ListingDescription unchanged export",
    listingDescSrc.includes("export default function ListingDescription")
  );
  ok(
    "no BuyerFriendly import in CarDetailsView yet",
    !/buyerFriendlyListingCopy|BuyerFriendlyListingCopyPreview/i.test(
      carDetailsSrc
    )
  );
}

// --- no PII in doc ---
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
    ok("doc no production nongbot.org url", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(
      `doc no plate data ${pat.source.slice(0, 12)}`,
      !pat.test(docForPlateScan)
    );
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok(
    "doc no firebase uid",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- cross-ref v63a v63b ---
{
  ok("v63a deterministic path", /deterministic.*template|Phase 1/i.test(v63aDoc));
  ok("v63b module doc", /buyerFriendlyListingCopy/i.test(v63bDoc));
  ok("v63b no ui wire defer", /v6\.3B\.1|defer.*UI/i.test(v63bDoc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no runtime imports from src utils write", !/from\s+["']\.\.\/src\/utils\/buyerFriendlyListingCopy/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v63b1 script",
    pkg.includes(
      "test:v63b1-buyer-friendly-listing-copy-staging-ui-preview-readiness"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v63b1-buyer-friendly-listing-copy-staging-ui-preview-readiness.mts"
    )
  );
}

console.log("\nDone v6.3B.1 Staging UI Preview Readiness tests.");
if (process.exitCode) process.exit(process.exitCode);
