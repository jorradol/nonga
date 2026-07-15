/**
 * Priority 5D — Simulator Dealer Access CTA Honesty
 * Asserts Simulator CTA copy states dealer-authorized listing access only,
 * Public Signup closed, and button label no longer implies public registration.
 *
 * Run: npx tsx scripts/test-priority-5d-simulator-dealer-cta-honesty.mts
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const homeViewPath = path.join(root, "src/components/HomeView.tsx");
const homeView = fs.readFileSync(homeViewPath, "utf8");

const ctaMatch = homeView.match(
  /\{\/\* Navigation links direct help \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* Right panel/
);
const ctaBlock = ctaMatch?.[0] ?? "";

console.log("--- Priority 5D Simulator dealer CTA honesty ---");

ok("simulator-cta-block-found", Boolean(ctaMatch), "");

ok(
  "dealer-authorized-access-copy",
  ctaBlock.includes(
    "การลงประกาศใช้ได้เฉพาะบัญชีดีลเลอร์ที่ได้รับสิทธิ์และเข้าสู่ระบบแล้ว"
  ),
  ""
);

ok(
  "public-signup-closed-copy",
  ctaBlock.includes("ขณะนี้ยังไม่เปิดรับสมัครสาธารณะ"),
  ""
);

ok(
  "dealer-listing-cta-label",
  ctaBlock.includes("ไปยังพื้นที่ลงประกาศสำหรับดีลเลอร์"),
  ""
);

ok(
  "no-free-immediate-claim",
  !ctaBlock.includes("ฟรีได้ทันที"),
  ""
);

ok(
  "no-register-real-sell-label",
  !ctaBlock.includes("กดไปลงทะเบียนขายรถของจริง") &&
    !ctaBlock.includes("ลงทะเบียนขายรถของจริง"),
  ""
);

ok(
  "sell-destination-unchanged",
  /onClick=\{\(\) => setView\("sell"\)\}/.test(ctaBlock),
  ""
);

ok(
  "no-demo-demo-language-in-cta",
  !ctaBlock.includes("การสาธิต") &&
    !ctaBlock.includes("ตัวอย่าง") &&
    !ctaBlock.includes("จำลอง") &&
    !/\bDemo\b/i.test(ctaBlock),
  ""
);

ok(
  "no-not-real-upload-disclaimer",
  !ctaBlock.includes("ไม่ได้อัปโหลดรูป") &&
    !ctaBlock.includes("ไม่ได้สร้างประกาศจริง"),
  ""
);

ok(
  "no-new-role-login-signup-gate-in-cta",
  !/RequireDealer|publicSignup|PublicSignup|isLoggedIn|role\s*===/.test(
    ctaBlock
  ) && !/\bisDealer\b/.test(ctaBlock),
  ""
);

console.log("\n--- Simulator behavior shell preserved ---");
ok(
  "handleSimulatorUpload-preserved",
  homeView.includes("handleSimulatorUpload"),
  ""
);
ok("resetSimulator-preserved", homeView.includes("resetSimulator"), "");
ok(
  "simulator-step-state-preserved",
  homeView.includes("simulatorStep") && homeView.includes("setSimulatorStep"),
  ""
);

console.log("\nDone.");
