/**
 * Focused guard: public `/dealers` (DealersView) must not render client mock dealers.
 * Run: npx tsx scripts/test-public-dealers-view-no-mock.mts
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Public /dealers mock dealer cleanup guard ===\n");

const viewPath = "src/components/DealersView.tsx";
const source = readFileSync(viewPath, "utf8");

const forbiddenMockNames = [
  "NongBot Certified Space",
  "Super EV Thailand",
  "Luxury Wheels Elite",
];

ok(
  "DealersView does not read or map store dealers list",
  !/\bdealers\s*,/.test(source) &&
    !/\bdealers\s*\}/.test(source) &&
    !/\bdealers\.map\b/.test(source) &&
    !/\bdealers\s*=/.test(source)
);

for (const name of forbiddenMockNames) {
  ok(`DealersView does not contain mock name: ${name}`, !source.includes(name));
}

ok(
  "DealersView includes honest empty message",
  source.includes("ขณะนี้ยังไม่มีรายชื่อผู้ขายที่ยืนยันสำหรับแสดงในหน้านี้")
);

ok(
  "DealersView has empty-state test id",
  source.includes('data-testid="public-dealers-empty-state"')
);

ok(
  "DealersView does not render tel: links for mock phones",
  !/tel:/.test(source)
);

ok(
  "DealersView still owns public dealers page component",
  /export default function DealersView/.test(source)
);

console.log(
  process.exitCode && process.exitCode !== 0
    ? "\nRESULT: FAIL"
    : "\nRESULT: PASS"
);
