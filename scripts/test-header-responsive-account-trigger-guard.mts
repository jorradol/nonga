/**
 * Guard: narrow/mobile Header uses Account/User icon (not hamburger)
 * and opens the canonical account menu (not Navigation drawer).
 * Run: npm run test:header-responsive-account-trigger-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Header responsive account trigger guard ===\n");

const header = readFileSync("src/components/Header.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");
const singleRowGuard = readFileSync(
  "scripts/test-header-single-row-layout-guard.mts",
  "utf8"
);
const pillGuard = readFileSync(
  "scripts/test-header-account-pill-guard.mts",
  "utf8"
);

ok(
  "package script registered",
  pkg.includes("test:header-responsive-account-trigger-guard")
);

ok(
  "no Header hamburger / Menu icon import in account position",
  !header.includes("isMobileDrawerOpen") &&
    !header.includes("เปิดเมนูเพิ่มเติม") &&
    !header.includes("Mobile Burger") &&
    !header.includes("Mobile Drawer") &&
    !/, Menu[, ]/.test(header) &&
    !header.includes("<Menu ")
);

ok(
  "desktop (md+) keeps full Account pill trigger",
  header.includes('data-account-variant="pill"') &&
    header.includes("header-account-pill hidden md:flex") &&
    header.includes('data-testid="header-account-control"')
);

ok(
  "narrow/mobile uses Account icon trigger (not nav drawer)",
  header.includes('data-account-variant="icon"') &&
    header.includes('data-header-account-icon="true"') &&
    header.includes("md:hidden") &&
    header.includes('setIsProfileOpen((open) => !open)')
);

ok(
  "pill/icon flip on one shared md token (no overlap, no gap, no stale xl)",
  !/hidden xl:flex|xl:hidden|xl:inline-flex/.test(header) &&
    header.includes("header-account-pill hidden md:flex") &&
    header.includes("hidden md:inline-flex")
);

ok(
  "accessible account labels present",
  header.includes('aria-label={isProfileOpen ? "ปิดเมนูบัญชี" : "เปิดเมนูบัญชี"}') &&
    header.includes('aria-haspopup="true"') &&
    header.includes("aria-expanded={isProfileOpen}")
);

ok(
  "canonical account menu reused (auth + role gates preserved)",
  header.includes('data-testid="header-account-menu"') &&
    header.includes("user?.displayName") &&
    header.includes("user?.email") &&
    header.includes("membershipDisplay") &&
    header.includes("isAdmin &&") &&
    header.includes("(isDealer || isAdmin)") &&
    header.includes("Dealer Portal (คลังรถ)") &&
    !/Thor Auto/i.test(header)
);

ok(
  "guest narrow viewport gets login affordance (not foreign account data)",
  header.includes('data-testid="header-account-guest-login"') &&
    header.includes('aria-label="เข้าสู่ระบบ"') &&
    header.includes('setView("login")')
);

ok(
  "account icon prefers real photoURL else standard User icon",
  header.includes("hasRealProfilePhoto") &&
    header.includes("user?.photoURL?.trim()") &&
    header.includes('<User className="w-4 h-4"')
);

ok(
  "menu dismiss: toggle, outside click, Escape, item select, route change",
  header.includes('e.key === "Escape"') &&
    header.includes("setIsProfileOpen(false)") &&
    header.includes("}, [currentView]") &&
    header.includes('onClick={() => setIsProfileOpen(false)}')
);

ok(
  "menu clamped to viewport on narrow screens",
  header.includes("max-w-[min(14rem,calc(100vw-1.5rem))]") &&
    header.includes("origin-top-right")
);

ok(
  "horizontal nav + search + theme remain",
  header.includes('data-testid="header-nav-desktop"') &&
    header.includes('data-testid="header-nav-mobile"') &&
    header.includes('data-testid="header-search-desktop"') &&
    header.includes('data-testid="header-theme-toggle"') &&
    header.includes("header-nav-scroll")
);

ok(
  "sibling header guards still registered",
  singleRowGuard.includes("Header single-row layout guard") &&
    pillGuard.includes("Header account pill guard") &&
    pkg.includes("test:header-single-row-layout-guard") &&
    pkg.includes("test:header-account-pill-guard")
);

console.log("\n--- responsive acceptance matrix (source contract) ---\n");

const matrix = [
  {
    name: "1366px / 1280px / 1024px / 864px / 768px → full Account pill (md+)",
    pass: header.includes("header-account-pill hidden md:flex"),
  },
  {
    name: "742px and below (incl. 390px / 360px) → Account icon",
    pass:
      header.includes('data-account-variant="icon"') &&
      header.includes("md:hidden") &&
      !header.includes("isMobileDrawerOpen"),
  },
  {
    name: "no hamburger; account icon opens canonical menu",
    pass:
      header.includes('data-header-account-icon="true"') &&
      header.includes('data-testid="header-account-menu"') &&
      !header.includes("<Menu "),
  },
] as const;

for (const row of matrix) {
  ok(row.name, row.pass);
}

console.log(
  process.exitCode && process.exitCode !== 0
    ? "\nRESULT: FAIL"
    : "\nRESULT: PASS"
);
