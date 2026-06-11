/**
 * v6.3B.2 — Staging UI Preview Implementation (static + runtime tests)
 * npm run test:v63b2-buyer-friendly-listing-copy-staging-ui-preview
 */
import { readFileSync } from "node:fs";
import type { Car } from "../src/types.ts";
import {
  carToBuyerFriendlyListingInput,
  isAllowedBuyerFriendlyInputKey,
  listBuyerFriendlyListingInputKeys,
} from "../src/utils/carToBuyerFriendlyListingInput.ts";
import { buildBuyerFriendlyListingCopy, passesOutputGuard } from "../src/utils/buyerFriendlyListingCopy.ts";
import {
  BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV,
  BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV,
  GUEST_SIMULATED_UID,
  isBuyerFriendlyCopyPreviewFlagEnabled,
  isStagingBuyerFriendlyCopyHost,
  isUidAllowlistedForBuyerFriendlyCopyPreview,
  shouldShowBuyerFriendlyCopyPreview,
} from "../src/config/buyerFriendlyCopyPreviewGate.ts";
import {
  BUYER_FRIENDLY_PREVIEW_FALLBACK_BANNER,
  BUYER_FRIENDLY_PREVIEW_TITLE,
} from "../src/components/listings/BuyerFriendlyListingCopyPreview.tsx";

const DOC_PATH =
  "docs/v6.3B.2-buyer-friendly-listing-copy-staging-ui-preview.md";
const CAR_DETAILS_PATH = "src/components/cars/details/CarDetailsView.tsx";
const LISTING_DESC_PATH = "src/components/listings/ListingDescription.tsx";
const PREVIEW_COMPONENT_PATH =
  "src/components/listings/BuyerFriendlyListingCopyPreview.tsx";

const SYNTHETIC_BRAND = "ยี่ห้อตัวอย่าง";
const SYNTHETIC_MODEL = "รุ่นตัวอย่าง";
const SYNTHETIC_UID = "allowlisted-preview-tester-uid";

const FORBIDDEN_OUTPUT_KEYS = [
  "ownerPhone",
  "ownerId",
  "licensePlate",
  "wholesale",
  "images",
  "id",
];

const REAL_PHONE_PATTERNS = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/,
  /\b0[689]\d{8}\b/,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function makeSyntheticCar(overrides: Partial<Car> = {}): Car {
  return {
    id: "synthetic-listing-id",
    title: `${SYNTHETIC_BRAND} ${SYNTHETIC_MODEL}`,
    brand: SYNTHETIC_BRAND,
    model: SYNTHETIC_MODEL,
    year: 2020,
    price: 420000,
    type: "used",
    condition: "สภาพดี",
    mileage: 62000,
    fuelType: "petrol",
    images: ["https://storage.example/synthetic.webp"],
    description: "บ.+จอทัช+ฝาท้ายไฟฟ้า รายละเอียดทดสอบ",
    ownerId: "owner-internal-id",
    ownerName: "ผู้ขายตัวอย่าง",
    ownerPhone: "0812345678",
    isSold: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function envReader(values: Record<string, string | undefined>) {
  return (key: string) => values[key];
}

console.log(
  "=== v6.3B.2 Buyer-Friendly Listing Copy Staging UI Preview ===\n"
);

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const carDetailsSrc = readFileSync(CAR_DETAILS_PATH, "utf8");
const listingDescSrc = readFileSync(LISTING_DESC_PATH, "utf8");
const previewSrc = readFileSync(PREVIEW_COMPONENT_PATH, "utf8");
const pkg = readFileSync("package.json", "utf8");
const envExample = readFileSync(".env.staging.example", "utf8");
const gateSrc = readFileSync("src/config/buyerFriendlyCopyPreviewGate.ts", "utf8");

// --- doc ---
{
  ok("doc exists", doc.length > 4000);
  ok("doc v6.3B.2 label", doc.includes("v6.3B.2"));
  ok("doc flag default false", /default.*false|false.*default/i.test(docLower));
  ok("doc no deploy v63b2", /v6\.3B\.2.*NO deploy|no deploy.*v6\.3B\.2/i.test(doc));
  ok("doc separate allowlist key", doc.includes(BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV));
  ok("doc fallback banner policy", doc.includes(BUYER_FRIENDLY_PREVIEW_FALLBACK_BANNER));
  ok("doc guest no preview", /guest.*NO|guest = NO/i.test(docLower));
}

// --- gate: flag default off ---
{
  ok(
    "GT-01 flag off default",
    !isBuyerFriendlyCopyPreviewFlagEnabled(envReader({}))
  );
  ok(
    "GT-01 flag off explicit false",
    !isBuyerFriendlyCopyPreviewFlagEnabled(
      envReader({ [BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV]: "false" })
    )
  );
  ok(
    "GT-02 guest signed-in false",
    !shouldShowBuyerFriendlyCopyPreview({
      isSignedIn: false,
      uid: SYNTHETIC_UID,
      hostname: "a.nongbot.org",
      projectId: "nonga-ce93c",
      readEnv: envReader({
        [BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV]: "true",
        [BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV]: SYNTHETIC_UID,
      }),
    })
  );
  ok(
    "GT-03 empty allowlist deny",
    !shouldShowBuyerFriendlyCopyPreview({
      isSignedIn: true,
      uid: SYNTHETIC_UID,
      hostname: "a.nongbot.org",
      projectId: "nonga-ce93c",
      readEnv: envReader({
        [BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV]: "true",
        [BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV]: "",
      }),
    })
  );
  ok(
    "GT-04 allowlisted staging pass",
    shouldShowBuyerFriendlyCopyPreview({
      isSignedIn: true,
      uid: SYNTHETIC_UID,
      hostname: "a.nongbot.org",
      projectId: "nonga-ce93c",
      readEnv: envReader({
        [BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV]: "true",
        [BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV]: SYNTHETIC_UID,
      }),
    })
  );
  ok(
    "GT-05 non-staging host deny",
    !shouldShowBuyerFriendlyCopyPreview({
      isSignedIn: true,
      uid: SYNTHETIC_UID,
      hostname: "www.nongbot.org",
      projectId: "production-project",
      readEnv: envReader({
        [BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV]: "true",
        [BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV]: SYNTHETIC_UID,
      }),
    })
  );
  ok(
    "GT-06 guest simulated uid deny",
    !shouldShowBuyerFriendlyCopyPreview({
      isSignedIn: true,
      uid: GUEST_SIMULATED_UID,
      hostname: "a.nongbot.org",
      projectId: "nonga-ce93c",
      readEnv: envReader({
        [BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV]: "true",
        [BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV]: GUEST_SIMULATED_UID,
      }),
    })
  );
  ok(
    "staging host by project id",
    isStagingBuyerFriendlyCopyHost({
      hostname: "localhost",
      projectId: "nonga-ce93c",
    })
  );
  ok(
    "allowlist uid match",
    isUidAllowlistedForBuyerFriendlyCopyPreview(SYNTHETIC_UID, [
      SYNTHETIC_UID,
    ])
  );
}

// --- mapper ---
{
  const car = makeSyntheticCar();
  const input = carToBuyerFriendlyListingInput(car);
  const keys = listBuyerFriendlyListingInputKeys(input);
  ok("MP-01 mapper has whitelist keys", keys.length > 0);
  for (const key of keys) {
    ok(`MP-01 allowed key ${key}`, isAllowedBuyerFriendlyInputKey(key));
  }
  for (const forbidden of FORBIDDEN_OUTPUT_KEYS) {
    ok(`MP-01 no forbidden key ${forbidden}`, !keys.includes(forbidden));
  }
  ok("MP-02 no ownerPhone in input", !("ownerPhone" in input));
  ok("MP-02 no ownerId in input", !("ownerId" in input));
  ok("MP-02 no images in input", !("images" in input));

  const injected = makeSyntheticCar();
  (injected as Car & { licensePlate?: string }).licensePlate = "กก 9999 กก";
  const injectedInput = carToBuyerFriendlyListingInput(injected);
  ok(
    "MP-03 no licensePlate in input",
    !("licensePlate" in injectedInput)
  );
}

// --- copy integration ---
{
  const result = buildBuyerFriendlyListingCopy(
    carToBuyerFriendlyListingInput(
      makeSyntheticCar({
        description: "สภาพดี ไม่เคยชน ไมล์แท้ ประหยัดแน่นอน",
      })
    )
  );
  ok("CG-01 overclaim omitted warning", result.warnings.includes("seller-overclaim-omitted"));
  ok("CG-01 no never crashed", !/ไม่เคยช/i.test(result.text));
  ok("CG-01 no genuine mileage", !/ไมล์แท้/i.test(result.text));
  ok("CG-02 no km/l", !/\d+(?:\.\d+)?\s*km\/l/i.test(result.text));
  ok("CG output guard", passesOutputGuard(result.text).pass);
  for (const pat of REAL_PHONE_PATTERNS) {
    ok(`CG no phone ${pat.source.slice(0, 10)}`, !pat.test(result.text));
  }
}

// --- preview component source ---
{
  ok("preview fallback banner constant", previewSrc.includes(BUYER_FRIENDLY_PREVIEW_FALLBACK_BANNER));
  ok("preview guard fail no ListingDescription rewrite", /!result\.guardPass/.test(previewSrc));
  ok("preview guard pass uses ListingDescription", previewSrc.includes("<ListingDescription"));
  ok("preview title constant", previewSrc.includes(BUYER_FRIENDLY_PREVIEW_TITLE));
  ok("preview staging badge", /Preview · Staging/.test(previewSrc));
}

// --- CarDetailsView contract ---
{
  ok("UI-01 primary car.description", carDetailsSrc.includes("text={car.description}"));
  ok("UI-02 imports preview gate", carDetailsSrc.includes("evaluateBuyerFriendlyCopyPreviewGate"));
  ok("UI-02 imports detail section", carDetailsSrc.includes("BuyerFriendlyListingCopyDetailSection"));
  ok("UI-02 imports mapper", carDetailsSrc.includes("carToBuyerFriendlyListingInput"));
  ok("UI-02 imports helper", carDetailsSrc.includes("buildBuyerFriendlyListingCopy"));
  ok("UI-03 gated render", /buyerFriendlyPreviewGate/.test(carDetailsSrc));
  ok("UI-04 meta uses car.title not preview", /car\.title.*car\.mileage/s.test(carDetailsSrc));
  ok(
    "UI-04 meta effect no buyerFriendly",
    !/buyerFriendlyPreviewResult|buildBuyerFriendlyListingCopy/.test(
      carDetailsSrc.split("// 2. SEO")[1]?.split("// 3.")[0] ?? ""
    )
  );
}

// --- ListingDescription unchanged ---
{
  ok(
    "ListingDescription unchanged",
    listingDescSrc.includes("export default function ListingDescription")
  );
}

// --- gate module hygiene ---
{
  ok("gate no fetch", !/fetch\s*\(/.test(gateSrc));
  ok("gate no gemini", !/gemini/i.test(gateSrc));
  ok("gate separate allowlist env", gateSrc.includes(BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV));
}

// --- env example ---
{
  ok("env example flag false", envExample.includes(`${BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV}=false`));
  ok("env example allowlist empty", envExample.includes(`${BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV}=`));
}

// --- package ---
{
  ok(
    "package v63b2 script",
    pkg.includes("test:v63b2-buyer-friendly-listing-copy-staging-ui-preview")
  );
}

console.log("\nDone v6.3B.2 Staging UI Preview Implementation tests.");
if (process.exitCode) process.exit(process.exitCode);
