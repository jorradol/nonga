/**
 * v6.3B.2A — Staging Preview Deploy Readiness Plan (static validation only)
 * npm run test:v63b2a-buyer-friendly-listing-copy-staging-preview-deploy-readiness
 */
import { readFileSync } from "node:fs";
import {
  BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV,
  BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV,
} from "../src/config/buyerFriendlyCopyPreviewGate.ts";
import { BUYER_FRIENDLY_PREVIEW_FALLBACK_BANNER } from "../src/components/listings/BuyerFriendlyListingCopyPreview.tsx";

const DOC_PATH =
  "docs/v6.3B.2A-buyer-friendly-listing-copy-staging-preview-deploy-readiness-plan.md";
const V63B2_DOC =
  "docs/v6.3B.2-buyer-friendly-listing-copy-staging-ui-preview.md";
const V63B1_DOC =
  "docs/v6.3B.1-buyer-friendly-listing-copy-staging-ui-preview-readiness.md";
const CAR_DETAILS_PATH = "src/components/cars/details/CarDetailsView.tsx";
const PREVIEW_COMPONENT_PATH =
  "src/components/listings/BuyerFriendlyListingCopyPreview.tsx";

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

const HEAD_SHA = "3f2ebeb93bea6df347fe2fd1f9c4611a6a3960b1";
const STAGING_URL = "https://a.nongbot.org";
const MASKED_UID_A = "abc1…xyz9";
const MASKED_UID_B = "def2…uvw8";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log(
  "=== v6.3B.2A Buyer-Friendly Listing Copy Staging Preview Deploy Readiness ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v63b2a-buyer-friendly-listing-copy-staging-preview-deploy-readiness.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v63b2Doc = readFileSync(V63B2_DOC, "utf8");
const v63b1Doc = readFileSync(V63B1_DOC, "utf8");
const carDetailsSrc = readFileSync(CAR_DETAILS_PATH, "utf8");
const previewSrc = readFileSync(PREVIEW_COMPONENT_PATH, "utf8");

const docForPlateScan = doc.replace(
  /Forbidden in preview[\s\S]*?## 9\./,
  "## 9."
);

const docForUidScan = doc
  .replace(/[0-9a-f]{40}/gi, "REDACTED_SHA")
  .replace(/`[^`]+`/g, "CODE")
  .replace(/abc1…xyz9|def2…uvw8/g, "MASKED_UID")
  .replace(/[a-z][a-zA-Z0-9]{18,}/g, "IDENT");

// --- doc exists + v6.3B.2A ---
{
  ok("readiness doc exists", doc.length > 9000);
  ok("doc v6.3B.2A label", doc.includes("v6.3B.2A"));
  ok(
    "doc deploy readiness plan",
    /deploy readiness plan/i.test(doc)
  );
  ok(
    "doc docs tests package only",
    /docs\/tests\/package only/i.test(docLower)
  );
  ok("doc HEAD 3f2ebeb", doc.includes(HEAD_SHA) || doc.includes("3f2ebeb"));
  ok("doc references v63b2", /v6\.3B\.2/i.test(doc));
  ok("doc references v63b1", /v6\.3B\.1/i.test(doc));
  ok("doc readiness only not deploy", /not in this slice|readiness plan/i.test(docLower));
  ok("doc no deploy this slice", /NO deploy|not in this slice/i.test(doc));
}

// --- problem + goal ---
{
  ok("problem statement section", /Problem Statement/i.test(doc));
  ok("problem flag default off", /flag default.*off|default.*false/i.test(docLower));
  ok("goal section", /^## 2\. Goal/m.test(doc));
  ok("goal hosting only", /Firebase Hosting only|hosting only/i.test(doc));
  ok("goal staging url", doc.includes(STAGING_URL));
  ok("goal guest no preview", /guest.*NO|guest = NO/i.test(doc));
  ok("goal rollback", /rollback/i.test(docLower));
}

// --- non-goals this slice ---
{
  ok("non-goals section", /Non-goals/i.test(doc));
  ok("non-goal no deploy", /not in this slice/i.test(docLower));
  ok("non-goal no flag enable", /not in this slice|not done/i.test(docLower));
  ok("non-goal no uid in repo", /forbidden|ห้าม commit/i.test(docLower));
  ok("non-goal no cloud run", /Cloud Run.*forbidden|Cloud Run.*not/i.test(doc));
  ok("non-goal no firestore", /Firestore.*forbidden|Firestore.*not/i.test(doc));
  ok("non-goal no ai", /AI.*Gemini|Gemini.*not/i.test(doc));
  ok("non-goal no guest preview", /Guest preview.*forbidden|guest.*NO/i.test(doc));
}

// --- deploy scope future ---
{
  ok("deploy scope section", /Deploy Scope/i.test(doc));
  ok("deploy firebase hosting only", /Firebase Hosting.*only|hosting only/i.test(doc));
  ok("deploy project nonga-ce93c", /nonga-ce93c/i.test(doc));
  ok("deploy staging url", doc.includes(STAGING_URL));
  ok("deploy command firebase hosting", /deploy --only hosting/i.test(doc));
  ok("deploy cloud run unchanged", /Cloud Run.*unchanged|must not change/i.test(doc));
  ok("deploy production excluded", /production.*not touch|Production.*excluded/i.test(doc));
  ok("deploy no firestore rules", /Firestore rules.*must not|Firestore rules deploy.*❌/i.test(doc));
  ok("deploy no ai gemini", /AI.*Gemini.*must not|shadow provider.*❌/i.test(doc));
}

// --- env update plan ---
{
  ok("env update section", /Env Update Plan/i.test(doc));
  ok("env flag key", doc.includes(BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV));
  ok("env allowlist key", doc.includes(BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV));
  ok("env flag true at deploy", /ENABLED.*true|flag.*true/i.test(doc));
  ok("env not in this slice", /not in this slice|not done/i.test(docLower));
  ok("env masked uid a", doc.includes(MASKED_UID_A));
  ok("env masked uid b", doc.includes(MASKED_UID_B));
  ok("env no full uid commit", /ห้าม commit|forbidden.*full UID/i.test(doc));
  ok("env separate allowlist key", /แยกจาก AI allowlist|separate.*allowlist/i.test(doc));
}

// --- preview gates visibility ---
{
  ok("preview gates section", /Preview Gates/i.test(doc));
  ok("gate compile flag", doc.includes(BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV));
  ok("gate staging hostname", /a\.nongbot\.org|nonga-ce93c/i.test(doc));
  ok("visibility matrix section", /Visibility matrix|Visibility Policy/i.test(doc));
  ok("visibility guest hidden", /Guest.*hidden|guest.*❌/i.test(doc));
  ok("visibility non-allowlisted hidden", /non-allowlisted.*hidden/i.test(doc));
  ok("visibility allowlisted visible", /allowlisted.*visible|allowlisted.*✅/i.test(doc));
}

// --- ui contract ---
{
  ok("ui contract section", /UI Contract/i.test(doc));
  ok("contract original primary", /primary|unchanged/i.test(docLower));
  ok("contract additive below", /additive.*below|below original/i.test(docLower));
  ok("contract car description", /car\.description/i.test(doc));
  ok("contract listing description", /ListingDescription/i.test(doc));
  ok("contract no replace", /ไม่แทนที่|forbidden.*Replace/i.test(doc));
}

// --- data boundary forbidden ---
{
  ok("data boundary section", /Data Boundary/i.test(doc));
  ok("forbidden ownerPhone", /ownerPhone/i.test(doc));
  ok("forbidden licensePlate", /licensePlate|plate/i.test(docLower));
  ok("forbidden wholesale", /wholesale/i.test(docLower));
  ok("forbidden raw image url", /raw image URL/i.test(doc));
  ok("forbidden phone line uid", /phone.*LINE.*UID|LINE.*UID/i.test(doc));
  ok("forbidden km/l", /km\/l/i.test(docLower));
  ok("forbidden never crashed", /ไม่เคยช/i.test(doc));
  ok("forbidden genuine mileage", /ไมล์แท้/i.test(doc));
  ok("forbidden warranty", /รับประกัน|warranty/i.test(doc));
  ok("forbidden fuel certainty", /ประหยัดแน่นอน/i.test(doc));
}

// --- guardrails fallback ---
{
  ok("guardrails fallback section", /Guardrails.*Fallback/i.test(doc));
  ok("fallback banner constant", doc.includes(BUYER_FRIENDLY_PREVIEW_FALLBACK_BANNER));
  ok("fallback guard fail no rewrite", /no rewritten text|banner only/i.test(docLower));
  ok("fallback guardPass false", /guardPass: false/i.test(doc));
}

// --- rollback ---
{
  ok("rollback section", /Rollback Plan/i.test(doc));
  ok("rollback flag off", /flag off|ENABLED=false/i.test(doc));
  ok("rollback redeploy hosting only", /redeploy hosting|hosting only/i.test(docLower));
  ok("rollback no cloud run", /must NOT touch.*Cloud Run|Rollback must NOT touch/i.test(doc));
}

// --- preflight ---
{
  ok("preflight section", /Preflight Gates/i.test(doc));
  ok("preflight v63b2a test", /test:v63b2a-buyer-friendly-listing-copy-staging-preview-deploy-readiness/i.test(doc));
  ok("preflight v63b2 test", /test:v63b2-buyer-friendly-listing-copy-staging-ui-preview/i.test(doc));
  ok("preflight build staging hosting", /build:staging:hosting/i.test(doc));
}

// --- manual smoke ---
{
  ok("manual smoke section", /Manual Smoke Plan/i.test(doc));
  ok("smoke staging url", doc.includes(STAGING_URL));
  ok("smoke guest hidden", /Guest session.*hidden|Guest.*hidden/i.test(doc));
  ok("smoke non-allowlisted hidden", /non-allowlisted.*hidden/i.test(doc));
  ok("smoke allowlisted visible", /allowlisted.*visible/i.test(doc));
  ok("smoke original unchanged", /Original text unchanged|original.*primary/i.test(doc));
  ok("smoke overclaim omit", /ไม่เคยชน|ไมล์แท้|km\/l/i.test(doc));
  ok("smoke execution record", /v6\.3B\.2A-staging-hosting-deploy-execution-record/i.test(doc));
}

// --- acceptance criteria ---
{
  ok("acceptance criteria section", /Acceptance Criteria/i.test(doc));
  ok("ac no deploy this slice", /NO deploy.*this slice|not in this slice/i.test(doc));
  ok("ac future deploy separate", /separate approval|Future deploy/i.test(doc));
}

// --- forbidden actions compliance ---
{
  ok("forbidden actions section", /Forbidden Actions.*v6\.3B\.2A/i.test(doc));
  ok("forbidden no firestore writes", /Firestore.*writes/i.test(doc));
  ok("forbidden no payment lead reveal", /lead.*payment.*reveal|payment.*reveal/i.test(docLower));
  ok("compliance section", /Compliance.*v6\.3B\.2A/i.test(doc));
}

// --- v6.3B.2 implementation present ---
{
  ok(
    "CarDetailsView uses car.description primary",
    carDetailsSrc.includes("text={car.description}")
  );
  ok(
    "CarDetailsView has preview wire",
    /BuyerFriendlyListingCopyPreview|shouldShowBuyerFriendlyCopyPreview/i.test(
      carDetailsSrc
    )
  );
  ok(
    "preview component fallback banner",
    previewSrc.includes(BUYER_FRIENDLY_PREVIEW_FALLBACK_BANNER)
  );
  ok(
    "preview component staging badge",
    /Preview · Staging · Deterministic/i.test(previewSrc)
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
    "doc no firebase uid full length",
    !/\b[a-zA-Z0-9]{28}\b/.test(docForUidScan)
  );
}

// --- cross-ref v63b2 v63b1 ---
{
  ok("v63b2 wired flag off", /flag default.*false|NO deploy/i.test(v63b2Doc));
  ok("v63b1 defers to v63b2a", /v6\.3B\.2A/i.test(v63b1Doc));
  ok("v63b2 references buildBuyerFriendlyListingCopy", /buildBuyerFriendlyListingCopy/i.test(v63b2Doc));
}

// --- test script static only ---
{
  const selfCode =
    selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no firebase deploy", !/firebase deploy/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok(
    "package v63b2a script",
    pkg.includes(
      "test:v63b2a-buyer-friendly-listing-copy-staging-preview-deploy-readiness"
    )
  );
  ok(
    "package points to mts",
    pkg.includes(
      "scripts/test-v63b2a-buyer-friendly-listing-copy-staging-preview-deploy-readiness.mts"
    )
  );
}

console.log(
  "\nDone v6.3B.2A Staging Preview Deploy Readiness tests."
);
if (process.exitCode) process.exit(process.exitCode);
