/**
 * Focused guard: car-detail SellerCard must not render client mock dealer fixtures.
 * Run: npx tsx scripts/test-car-detail-seller-card-no-mock.mts
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Car-detail SellerCard mock dealer cleanup guard ===\n");

const sellerPath = "src/components/cars/details/SellerCard.tsx";
const source = readFileSync(sellerPath, "utf8");

const forbiddenMockStrings = [
  "NongBot Certified Space",
  "20 Thai SaaS Avenue",
  "DBD Verified",
  "dealer-001",
  "Nong A Selected Dealer Service",
  "5.0 • 42",
  "42 รีวิว",
  "ดีลเลอร์สิริพรีเมียมพันธมิตร",
  "โชว์รูมพระราม 9",
];

ok(
  "SellerCard does not read AppStore dealers list",
  !source.includes("useAppStore") &&
    !/\bdealers\b/.test(source) &&
    !source.includes("linkedDealer")
);

ok(
  "SellerCard does not fallback to mock dealer-001",
  !source.includes("dealer-001") && !source.includes('d.id === "dealer-001"')
);

for (const value of forbiddenMockStrings) {
  ok(`SellerCard does not contain mock string: ${value}`, !source.includes(value));
}

ok(
  "SellerCard resolves name from listing canonical display fields",
  source.includes("dealerDisplayName") &&
    source.includes("sellerDisplayName") &&
    source.includes("showroomName") &&
    source.includes("ownerName")
);

ok(
  "SellerCard disables phone when public phone missing",
  source.includes("listingHasPublicContactPhone") &&
    source.includes("disabled={!hasPhone}") &&
    source.includes("ยังไม่มีเบอร์โทร")
);

ok(
  "SellerCard hides fabricated ratings/reviews/DBD block",
  !source.includes("from \"lucide-react\"")
    ? false
    : !/\bStar\b/.test(source) &&
        !source.includes("DBD Verified") &&
        !source.includes("42 รีวิว") &&
        !source.includes("fill-current") &&
        !/\[\s*1,\s*2,\s*3,\s*4,\s*5\s*\]/.test(source)
);

ok(
  "SellerCard keeps car-detail seller card test id",
  source.includes('data-testid="car-detail-seller-card"') &&
    source.includes('data-testid="car-detail-seller-name"')
);

ok(
  "SellerCard still exports default component",
  /export default function SellerCard/.test(source)
);

console.log(
  process.exitCode && process.exitCode !== 0
    ? "\nRESULT: FAIL"
    : "\nRESULT: PASS"
);
