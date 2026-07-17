/**
 * Focused guard for Profile settings navigation breakpoint/overflow behavior.
 * Run: npm run test:profile-navigation-responsive-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Profile navigation responsive guard ===\n");

const sidebar = readFileSync(
  "src/components/settings/SettingsSidebar.tsx",
  "utf8"
);
const profile = readFileSync("src/components/UserProfileView.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok(
  "package script registered",
  pkg.includes("test:profile-navigation-responsive-guard")
);

ok(
  "outer Profile layout creates sidebar at lg",
  profile.includes("grid grid-cols-1 lg:grid-cols-4") &&
    profile.includes("lg:col-span-1") &&
    profile.includes("lg:col-span-3")
);

ok(
  "navigation switches to vertical at same lg breakpoint",
  sidebar.includes("flex lg:flex-col") &&
    sidebar.includes("lg:w-full") &&
    !sidebar.includes("xl:flex-col") &&
    !sidebar.includes("xl:w-full")
);

ok(
  "narrow navigation remains horizontally scrollable and touch-friendly",
  sidebar.includes("overflow-x-auto") &&
    sidebar.includes("lg:overflow-x-visible") &&
    sidebar.includes("overscroll-x-contain") &&
    sidebar.includes("touch-pan-x") &&
    !sidebar.includes("scrollbar-none")
);

ok(
  "active item scrolls into view when horizontal",
  sidebar.includes("scrollWidth <= navigation.clientWidth") &&
    sidebar.includes("scrollIntoView") &&
    sidebar.includes('inline: "nearest"') &&
    sidebar.includes("data-settings-tab")
);

ok(
  "navigation has accessible landmark and active state",
  sidebar.includes('role="navigation"') &&
    sidebar.includes('aria-label="เมนูตั้งค่าโปรไฟล์"') &&
    sidebar.includes('aria-current={isActive ? "page" : undefined}')
);

ok(
  "all existing tab ids and click behavior remain present",
  [
    '"profile"',
    '"ai-preference"',
    '"saved"',
    '"dealer"',
    '"system"',
    '"history"',
  ].every((id) => sidebar.includes(id)) &&
    sidebar.includes("onClick={() => onTabChange(tab.id)}")
);

ok(
  "no fixed viewport width can create page-level horizontal overflow",
  !/\bw-screen\b/.test(sidebar) &&
    !/min-w-\[(?:\d{3,}|100vw)/.test(sidebar) &&
    sidebar.includes("min-w-0") &&
    sidebar.includes("max-w-full")
);

console.log("\n--- viewport / zoom breakpoint matrix ---\n");

const cases = [
  [1366, 80], [1366, 90], [1366, 100], [1366, 110], [1366, 125],
  [1280, 80], [1280, 90], [1280, 100], [1280, 110], [1280, 125],
  [1024, 80], [1024, 90], [1024, 100], [1024, 110], [1024, 125],
  [390, 100],
] as const;

for (const [physicalWidth, zoomPercent] of cases) {
  const cssWidth = physicalWidth / (zoomPercent / 100);
  const mode = cssWidth >= 1024 ? "vertical sidebar" : "horizontal scroll";
  const valid = cssWidth >= 1024
    ? sidebar.includes("lg:flex-col")
    : sidebar.includes("overflow-x-auto");
  ok(
    `${physicalWidth}px @ ${zoomPercent}% -> ${mode}`,
    valid,
    `effective CSS width ≈ ${Math.round(cssWidth)}px`
  );
}

console.log(
  process.exitCode && process.exitCode !== 0
    ? "\nRESULT: FAIL"
    : "\nRESULT: PASS"
);
