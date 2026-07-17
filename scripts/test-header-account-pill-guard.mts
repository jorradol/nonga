/**
 * Guard: Header signed-in account control stays a rounded pill (not border-l bar).
 * Run: npm run test:header-account-pill-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Header account pill guard ===\n");

const header = readFileSync("src/components/Header.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");
const pkg = readFileSync("package.json", "utf8");
const singleRowGuard = readFileSync(
  "scripts/test-header-single-row-layout-guard.mts",
  "utf8"
);

ok("package script registered", pkg.includes("test:header-account-pill-guard"));

ok(
  "account control has data-testid",
  header.includes('data-testid="header-account-control"')
);

ok(
  "account pill uses full rounded border (not border-l divider bar)",
  header.includes("header-account-pill") &&
    header.includes("rounded-lg sm:rounded-xl border nonga-border") &&
    !/setIsProfileOpen[\s\S]{0,400}\bborder-l\b/.test(header)
);

ok(
  "account pill matches theme/search control sizing rhythm",
  header.includes("min-h-[36px] sm:min-h-[40px]") &&
    header.includes("transition-all duration-200 shrink-0") &&
    header.includes("nonga-focus-ring")
);

ok(
  "account accessibility preserved",
  header.includes("aria-expanded={isProfileOpen}") &&
    header.includes('aria-haspopup="true"') &&
    header.includes('type="button"')
);

ok(
  "role label uses token contrast in light; accent only in dark",
  header.includes("header-account-role") &&
    header.includes("isDarkMode") &&
    header.includes("membershipDisplay?.textColor") &&
    header.includes("nonga-text-secondary")
);

ok(
  "no fixed width that could crush nav (max-width cap only)",
  header.includes("max-w-[min(180px,28vw)]") &&
    !header.includes("w-[180px]") &&
    !header.includes("min-w-[180px]")
);

ok(
  "canonical header single-row + search widths untouched",
  header.includes("Desktop single row: Logo → Nav → Search → Theme/Account") &&
    header.includes("w-[min(150px,28vw)]") &&
    header.includes("focus-within:max-w-[290px]") &&
    header.includes('data-testid="header-search-desktop"') &&
    header.includes('data-testid="header-theme-toggle"')
);

ok(
  "css token-backed account pill styles",
  css.includes(".header-account-pill") &&
    css.includes("var(--nonga-border)") &&
    css.includes("html:not(.dark) .header-account-role")
);

ok(
  "single-row guard script still registered (no regression harness removed)",
  singleRowGuard.includes("Header single-row layout guard") &&
    pkg.includes("test:header-single-row-layout-guard")
);

console.log(
  process.exitCode && process.exitCode !== 0
    ? "\nRESULT: FAIL"
    : "\nRESULT: PASS"
);
