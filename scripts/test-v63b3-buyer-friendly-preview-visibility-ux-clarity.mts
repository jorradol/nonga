/**
 * v6.3B.3 — Buyer-Friendly Preview Visibility & UX Clarity Refinement
 * npm run test:v63b3-buyer-friendly-preview-visibility-ux-clarity
 */
import { readFileSync } from "node:fs";
import {
  buildBuyerFriendlyListingCopy,
  parseBuyerSpecTokens,
  passesOutputGuard,
} from "../src/utils/buyerFriendlyListingCopy.ts";
import {
  BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV,
  BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV,
  GUEST_SIMULATED_UID,
  evaluateBuyerFriendlyCopyPreviewGate,
  shouldShowBuyerFriendlyCopyPreview,
} from "../src/config/buyerFriendlyCopyPreviewGate.ts";
import {
  BUYER_FRIENDLY_PREVIEW_TITLE,
} from "../src/components/listings/BuyerFriendlyListingCopyPreview.tsx";
import {
  BUYER_FRIENDLY_PREVIEW_STAGING_SIGNED_IN_NOTICE,
} from "../src/components/listings/BuyerFriendlyListingCopyDetailSection.tsx";

const DOC_PATH =
  "docs/v6.3B.3-buyer-friendly-preview-visibility-ux-clarity-refinement.md";
const CAR_DETAILS_PATH = "src/components/cars/details/CarDetailsView.tsx";
const DETAIL_SECTION_PATH =
  "src/components/listings/BuyerFriendlyListingCopyDetailSection.tsx";
const PREVIEW_PATH = "src/components/listings/BuyerFriendlyListingCopyPreview.tsx";
const GATE_PATH = "src/config/buyerFriendlyCopyPreviewGate.ts";
const EXEC_RECORD_PATH =
  "docs/v6.3B.2A-staging-hosting-deploy-execution-record.md";

const SYNTHETIC_BRAND = "ยี่ห้อตัวอย่าง";
const SYNTHETIC_MODEL = "รุ่นตัวอย่าง";
const SYNTHETIC_UID = "allowlisted-preview-tester-uid";
const NON_ALLOWLISTED_UID = "signed-in-non-allowlisted-uid";

const JARGON_DESCRIPTION =
  "AB2 + บ.หนัง + พวงมาลัยมัลติ + Cruise Control + Engine Start + Smart Keyless + ไฟตัดหมอก + จอทัชสกรีน + Bluetooth + วิทยุ FM/AM";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function envReader(values: Record<string, string | undefined>) {
  return (key: string) => values[key];
}

function stagingGateEnv(uid: string) {
  return envReader({
    [BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV]: "true",
    [BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV]: SYNTHETIC_UID,
    VITE_FIREBASE_PROJECT_ID: "nonga-ce93c",
  });
}

console.log(
  "=== v6.3B.3 Buyer-Friendly Preview Visibility & UX Clarity ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const carDetailsSrc = readFileSync(CAR_DETAILS_PATH, "utf8");
const detailSectionSrc = readFileSync(DETAIL_SECTION_PATH, "utf8");
const previewSrc = readFileSync(PREVIEW_PATH, "utf8");
const gateSrc = readFileSync(GATE_PATH, "utf8");
const execRecord = readFileSync(EXEC_RECORD_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- doc ---
{
  ok("doc exists", doc.length > 3000);
  ok("doc v6.3B.3 label", doc.includes("v6.3B.3"));
  ok("doc no deploy", /no deploy|not in v6\.3B\.3/i.test(docLower));
  ok("doc references v63b2", /v6\.3B\.2/i.test(doc));
  ok("doc corrective note v63b2a", /v6\.3B\.2A.*PARTIAL|corrective/i.test(doc));
  ok("doc card scope decision", /card|listing card/i.test(docLower));
  ok("doc human title", doc.includes(BUYER_FRIENDLY_PREVIEW_TITLE));
  ok("doc no masked uid leak", !/UUvg|h0xj|IcoN|IjEx/.test(doc));
}

// --- gate evaluation ---
{
  const readEnv = stagingGateEnv(SYNTHETIC_UID);
  const allowlisted = evaluateBuyerFriendlyCopyPreviewGate({
    isSignedIn: true,
    uid: SYNTHETIC_UID,
    hostname: "a.nongbot.org",
    readEnv,
  });
  ok("GE-01 allowlisted visible", allowlisted.visible);
  ok("GE-01 allowlisted reason", allowlisted.reason === "visible");
  ok("GE-01 feature active", allowlisted.featureActive);
  ok("GE-01 signed in eligible", allowlisted.signedInEligible);

  const nonAllowlisted = evaluateBuyerFriendlyCopyPreviewGate({
    isSignedIn: true,
    uid: NON_ALLOWLISTED_UID,
    hostname: "a.nongbot.org",
    readEnv,
  });
  ok("GE-02 non-allowlisted not visible", !nonAllowlisted.visible);
  ok("GE-02 non-allowlisted reason", nonAllowlisted.reason === "not-allowlisted");
  ok("GE-02 feature still active", nonAllowlisted.featureActive);
  ok("GE-02 signed in eligible", nonAllowlisted.signedInEligible);

  const guest = evaluateBuyerFriendlyCopyPreviewGate({
    isSignedIn: true,
    uid: GUEST_SIMULATED_UID,
    hostname: "a.nongbot.org",
    readEnv,
  });
  ok("GE-03 guest not visible", !guest.visible);
  ok("GE-03 guest reason", guest.reason === "guest-or-unsigned");
  ok("GE-03 guest no signed in eligible", !guest.signedInEligible);

  ok(
    "GE-04 shouldShow matches evaluate visible",
    shouldShowBuyerFriendlyCopyPreview({
      isSignedIn: true,
      uid: SYNTHETIC_UID,
      hostname: "a.nongbot.org",
      readEnv,
    }) === allowlisted.visible
  );
}

// --- jargon helper output ---
{
  const tokens = parseBuyerSpecTokens(JARGON_DESCRIPTION);
  ok("JH-01 expands seat", tokens.some((t) => /เบาะหนัง/i.test(t)));
  ok("JH-02 expands cruise", tokens.some((t) => /Cruise Control/i.test(t)));
  ok("JH-03 expands engine start", tokens.some((t) => /Engine Start/i.test(t)));
  ok("JH-04 expands smart keyless", tokens.some((t) => /Smart Keyless/i.test(t)));
  ok("JH-05 expands bluetooth", tokens.some((t) => /Bluetooth/i.test(t)));
  ok("JH-06 expands fm/am", tokens.some((t) => /FM\/AM/i.test(t)));

  const result = buildBuyerFriendlyListingCopy({
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2020,
    description: JARGON_DESCRIPTION,
    price: 420000,
    mileage: 62000,
  });
  ok("JH-07 source rich or structured", /template-rich|template-structured/.test(result.source));
  ok("JH-08 guard pass", result.guardPass);
  ok("JH-09 has highlights", /จุดเด่น/.test(result.text));
  ok("JH-10 has safety disclaimer", /ตรวจสอบรถจริง|สภาพรถ/.test(result.text));
  ok("JH-11 output guard", passesOutputGuard(result.text).pass);
  ok("JH-12 no overclaim", !/ไม่เคยช|ไมล์แท้|ประหยัดแน่นอน|รับประกัน/i.test(result.text));
}

// --- detail section wiring ---
{
  ok("DS-01 CarDetailsView uses detail section", carDetailsSrc.includes("BuyerFriendlyListingCopyDetailSection"));
  ok("DS-02 gate evaluation import", carDetailsSrc.includes("evaluateBuyerFriendlyCopyPreviewGate"));
  ok("DS-03 primary car.description unchanged", carDetailsSrc.includes("text={car.description}"));
  ok("DS-04 staging notice constant", detailSectionSrc.includes(BUYER_FRIENDLY_PREVIEW_STAGING_SIGNED_IN_NOTICE));
  ok("DS-05 not-allowlisted testid", detailSectionSrc.includes("buyer-friendly-copy-preview-staging-not-allowlisted"));
  ok("DS-06 no uid in notice", !/uid|UUID/i.test(detailSectionSrc));
}

// --- preview UX ---
{
  ok("UX-01 human title", previewSrc.includes(BUYER_FRIENDLY_PREVIEW_TITLE));
  ok("UX-02 subtitle buyer summary", /สรุปรายละเอียดสำหรับผู้ซื้อ|ภาษาคนช่วยขาย/.test(previewSrc));
  ok("UX-03 disclaimer not duplicated in header", !previewSrc.includes("BUYER_FRIENDLY_SAFETY_DISCLAIMER"));
  ok("UX-04 empty source panel", previewSrc.includes("buyer-friendly-copy-preview-empty"));
  ok("UX-05 original description not replaced", !previewSrc.includes("car.description"));
}

// --- gate module ---
{
  ok("gate evaluate export", gateSrc.includes("evaluateBuyerFriendlyCopyPreviewGate"));
  ok("gate feature active export", gateSrc.includes("isBuyerFriendlyCopyPreviewFeatureActive"));
  ok("gate no fetch", !/fetch\s*\(/.test(gateSrc));
}

// --- corrective note cross-ref ---
{
  ok("exec record exists", execRecord.length > 1000);
  ok("doc references exec record", /v6\.3B\.2A-staging-hosting-deploy-execution-record/i.test(doc));
}

// --- package ---
{
  ok(
    "package v63b3 script",
    pkg.includes("test:v63b3-buyer-friendly-preview-visibility-ux-clarity")
  );
}

console.log("\nDone v6.3B.3 Buyer-Friendly Preview Visibility & UX Clarity tests.");
if (process.exitCode) process.exit(process.exitCode);
