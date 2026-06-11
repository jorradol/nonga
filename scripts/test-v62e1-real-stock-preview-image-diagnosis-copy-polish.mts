/**
 * v6.2E.1 — Real Stock Preview Image Diagnosis + Copy Polish (static + unit checks)
 * npm run test:v62e1-real-stock-preview-image-diagnosis-copy-polish
 */
import { readFileSync } from "node:fs";
import type { Car } from "../src/types.ts";
import {
  getListingPrimaryImage,
  normalizeListingImageDisplayUrl,
} from "../src/utils/listingImages.ts";
import {
  buildSidebarNewCarsQueue,
  isPublishedCarWithRealImage,
} from "../src/utils/chatSidebarNewCarsQueue.ts";
import { resolveChatListingImageUrls } from "../src/services/ai/chat/marketplaceChatSearch.ts";

const DOC_PATH =
  "docs/v6.2E.1-real-stock-preview-image-diagnosis-copy-polish.md";
const V62E_DOC =
  "docs/v6.2E-pilot-monitoring-feedback-loop-readiness-plan.md";
const V62B15_DOC =
  "docs/v6.2B.15-real-stock-pilot-acceptance-go-no-go-review.md";

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
  /drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]{10,}/i,
  /firebasestorage\.googleapis\.com/i,
];

const PRODUCTION_URL_PATTERNS = [/https?:\/\/(?:www\.)?nongbot\.org\b/i];

const REAL_CAR_DATA_PATTERNS = [
  /\bToyota\s+(?:Camry|Corolla|Fortuner)\b/i,
  /\bHonda\s+(?:City|Civic|HR-V)\b/i,
  /\b\d{3,7}\s*(?:บาท|baht)\b/i,
];

const HEAD_SHA = "129cdaf05bef3e5f868f090588fb08e0d1511a58";
const DRIVE_SAMPLE_ID = "AbCdEfGhIjKlMnOpQrStUvWx";
const DRIVE_SHARE_SAMPLE = `https://drive.google.com/file/d/${DRIVE_SAMPLE_ID}/view?usp=sharing`;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function sampleCar(overrides: Partial<Car> & Pick<Car, "id">): Car {
  return {
    title: "Test Listing",
    brand: "BrandX",
    model: "ModelY",
    year: 2020,
    price: 400000,
    type: "used",
    condition: "good",
    mileage: 50000,
    fuelType: "petrol",
    images: [`/storage/listings/${overrides.id}/01-a.webp`],
    description: "",
    ownerId: "owner-test",
    ownerName: "Owner",
    ownerPhone: "",
    isSold: false,
    listingStatus: "published",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

console.log(
  "=== v6.2E.1 Real Stock Preview Image Diagnosis + Copy Polish ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62e1-real-stock-preview-image-diagnosis-copy-polish.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const sliderSrc = readFileSync(
  "src/components/chat/ChatSidebarNewCarsSlider.tsx",
  "utf8"
);
const listingImagesSrc = readFileSync("src/utils/listingImages.ts", "utf8");
const v62eDoc = readFileSync(V62E_DOC, "utf8");
const v62b15Doc = readFileSync(V62B15_DOC, "utf8");

// --- doc exists ---
{
  ok("diagnosis doc exists", doc.length > 5000);
  ok("doc v6.2E.1 label", doc.includes("v6.2E.1"));
  ok("doc preview image diagnosis", /preview image diagnosis/i.test(doc));
  ok("doc HEAD 129cdaf", doc.includes(HEAD_SHA) || doc.includes("129cdaf"));
  ok("doc references v62e", /v6\.2E/i.test(doc));
  ok("doc root cause section", /Root Cause/i.test(doc));
  ok("doc drive share not img-safe", /not img-safe|share page URLs/i.test(doc));
  ok("doc api count 10", /count.*\*\*10\*\*|count=10/i.test(doc));
  ok("doc images 10/10", /10\/10/i.test(doc));
  ok("doc public plate zero", /licensePlate.*\*\*0\*\*|publicPlate=0/i.test(doc));
  ok("doc copy รถมาใหม่", doc.includes("รถมาใหม่"));
  ok("doc hosting deploy required", /hosting deploy.*YES|Hosting deploy/i.test(doc));
  ok("doc no firestore writes", /Firestore writes.*none|no Firestore writes/i.test(docLower));
}

// --- display URL normalization ---
{
  const normalized = normalizeListingImageDisplayUrl(DRIVE_SHARE_SAMPLE);
  ok(
    "normalize drive share to uc view",
    normalized.includes("uc?export=view&id=") &&
      normalized.includes(DRIVE_SAMPLE_ID)
  );
  ok(
    "normalize preserves local storage path",
    normalizeListingImageDisplayUrl("/storage/listings/car-a/01.webp") ===
      "/storage/listings/car-a/01.webp"
  );
  ok(
    "listingImages exports normalizeListingImageDisplayUrl",
    listingImagesSrc.includes("normalizeListingImageDisplayUrl")
  );
  ok(
    "getListingPrimaryImage normalizes drive",
    getListingPrimaryImage({
      id: "pilot-car-01",
      images: [DRIVE_SHARE_SAMPLE],
    }).includes("uc?export=view&id=")
  );
}

// --- sidebar queue + chat image resolver ---
{
  const driveCar = sampleCar({
    id: "pilot-car-drive-01",
    images: [DRIVE_SHARE_SAMPLE],
  });
  ok("drive car has real image flag", isPublishedCarWithRealImage(driveCar));
  const urls = resolveChatListingImageUrls({
    id: driveCar.id,
    title: driveCar.title,
    brand: driveCar.brand,
    model: driveCar.model,
    year: driveCar.year,
    price: driveCar.price,
    images: driveCar.images,
    isSold: false,
    listingStatus: "published",
  });
  ok(
    "resolveChatListingImageUrls returns uc view",
    urls[0]?.includes("uc?export=view&id=") ?? false
  );
  const queue = buildSidebarNewCarsQueue([driveCar]);
  ok("sidebar queue has slide", queue.length === 1);
  ok(
    "sidebar slide preview candidate",
    queue[0]?.imageUrl.includes("uc?export=view&id=") ?? false
  );
}

// --- UI copy + fallback ---
{
  ok("slider label รถมาใหม่", sliderSrc.includes("รถมาใหม่"));
  ok("slider no legacy รถเข้าใหม่", !sliderSrc.includes("รถเข้าใหม่"));
  ok("slider onError fallback", sliderSrc.includes("onError"));
  ok("slider placeholder import", sliderSrc.includes("LISTING_PLACEHOLDER_IMAGE"));
  ok("slider referrerPolicy", sliderSrc.includes('referrerPolicy="no-referrer"'));
}

// --- safety / scope ---
{
  ok("no deploy in slice doc", /awaiting approval|no deploy in this slice/i.test(docLower));
  ok("no import", /import.*not done|ไม่ import/i.test(docLower));
  ok("no production", /production.*not touched/i.test(docLower));
  ok("forbidden no secrets", /secrets versions access/i.test(doc));
  ok("compliance section", /Compliance.*v6\.2E\.1/i.test(doc));
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
    ok(`doc no raw image ${pat.source.slice(0, 15)}`, !pat.test(doc));
  }
  for (const pat of PRODUCTION_URL_PATTERNS) {
    ok("doc no production URL", !pat.test(doc));
  }
  for (const pat of FULL_PLATE_DATA_PATTERNS) {
    ok(`doc no plate ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  for (const pat of REAL_CAR_DATA_PATTERNS) {
    ok(`doc no real car ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
}

// --- cross-ref ---
{
  ok("v62e image issue taxonomy", /image issue/i.test(v62eDoc));
  ok("v62b15 images 10/10", /10\/10/i.test(v62b15Doc));
}

// --- script static guard ---
{
  const selfCode = selfSrc.split("// --- script static guard ---")[0] ?? selfSrc;
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase admin", !/firebase-admin/.test(selfCode));
}

// --- package.json ---
{
  ok(
    "package v62e1 script",
    pkg.includes("test:v62e1-real-stock-preview-image-diagnosis-copy-polish")
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v62e1-real-stock-preview-image-diagnosis-copy-polish.mts"
    )
  );
}

console.log(
  "\nDone v6.2E.1 Real Stock Preview Image Diagnosis + Copy Polish tests."
);
if (process.exitCode) process.exit(process.exitCode);
