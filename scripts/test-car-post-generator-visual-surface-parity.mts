/**
 * Car Post Generator — P0B Hosting-only Visual Surface Parity
 * Asserts page shell/surfaces align with App shell + real-page tokens.
 *
 * Run: npx tsx scripts/test-car-post-generator-visual-surface-parity.mts
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const dashPath = path.join(
  root,
  "src/components/ai/post-generator/PostGeneratorDashboard.tsx"
);
const appPath = path.join(root, "src/App.tsx");
const dash = fs.readFileSync(dashPath, "utf8");
const app = fs.readFileSync(appPath, "utf8");

console.log("--- Car Post Generator visual surface parity ---");

ok(
  "app-shell-canonical-bg",
  app.includes('bg-[#0a0a0a]'),
  "App.tsx dark shell"
);

ok(
  "page-uses-shell-bg",
  /className="w-full bg-\[#0a0a0a\]/.test(dash),
  "outer wrapper"
);

ok(
  "page-no-slate-950-shell",
  !/className="w-full bg-slate-950 text-slate-100 min-h-screen/.test(dash),
  "removed navy shell on page wrapper"
);

ok(
  "cards-use-home-surface",
  dash.includes('bg-[#0c0c0e]/90 border border-white/[0.06]'),
  "section cards"
);

ok(
  "nested-panels-use-home-panel",
  dash.includes('bg-[#111113]') && dash.includes("border-white/[0.06]"),
  "inner panels"
);

ok(
  "orange-brand-preserved",
  dash.includes("text-orange-400") &&
    dash.includes("bg-orange-600") &&
    dash.includes("border-orange-"),
  "orange accents"
);

ok(
  "form-fields-structure-preserved",
  dash.includes("ยี่ห้อรถยนต์ (Brand)") &&
    dash.includes('type="text"') &&
    (dash.match(/<input/g) || []).length >= 6,
  "inputs present"
);

ok(
  "steps-copy-preserved",
  dash.includes("สเป็คตัวรถโฉมปัง") &&
    dash.includes("บอทสัมภาษณ์เจาะข้อมูล") &&
    dash.includes("โพสต์ขายและคอนเทนต์นำไปใช้")
);

ok(
  "honesty-gate-files-untouched-in-this-patch-scope",
  !dash.includes("evaluatePostGenerateHonesty") &&
    !dash.includes("triggerUsage"),
  "dashboard remains presentation-only"
);

// Layout/spacing contract — padding/classes must remain on outer wrapper
ok(
  "outer-spacing-unchanged",
  /bg-\[#0a0a0a\] text-slate-100 min-h-screen px-4 py-8/.test(dash)
);

if (process.exitCode && process.exitCode !== 0) {
  console.log("\nVisual surface parity FAILED");
} else {
  console.log("\nVisual surface parity PASSED");
}
