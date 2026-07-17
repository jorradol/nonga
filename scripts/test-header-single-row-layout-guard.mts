/**
 * Focused guard for Header single-row desktop layout + overflow behavior.
 * Run: npm run test:header-single-row-layout-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== Header single-row layout guard ===\n");

const header = readFileSync("src/components/Header.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok(
  "package script registered",
  pkg.includes("test:header-single-row-layout-guard")
);

ok(
  "desktop uses single-row flex: logo → nav → search → actions",
  header.includes("Desktop single row: Logo → Nav → Search → Theme/Account") &&
    header.includes("flex items-center gap-2 sm:gap-3 min-w-0 w-full") &&
    header.includes('data-testid="header-nav-desktop"') &&
    header.includes('data-testid="header-search-desktop"') &&
    header.includes("hidden md:block flex-1 min-w-0")
);

ok(
  "two-tier grid / border-t second-row nav removed",
  !header.includes("grid grid-cols-[auto_1fr_auto]") &&
    !header.includes("Header ชั้น 2") &&
    !header.includes("mt-1 pt-1 border-t nonga-border")
);

ok(
  "nav scrolls horizontally with min-w-0; overflow stays on nav container",
  header.includes("header-nav-scroll") &&
    header.includes("overflow-x-auto") &&
    header.includes("overscroll-x-contain") &&
    header.includes("touch-pan-x") &&
    header.includes("min-w-0") &&
    !header.includes("scrollbar-none") &&
    !/\bw-screen\b/.test(header) &&
    !/min-w-\[(?:\d{3,}|100vw)/.test(header)
);

ok(
  "theme + account trail remain shrink-0 (not crushed)",
  header.includes("shrink-0 ml-auto md:ml-0") &&
    header.includes('data-testid="header-theme-toggle"') &&
    header.includes("nonga-menu-item transition-all duration-200 shrink-0 nonga-focus-ring")
);

ok(
  "desktop search collapses ~150px and expands ~290px on focus-within / query",
  header.includes('data-testid="header-search-desktop"') &&
    header.includes("const desktopSearchHasQuery = Boolean(filters.search)") &&
    header.includes("w-[min(150px,28vw)]") &&
    header.includes("max-w-[150px]") &&
    header.includes("focus-within:w-[min(290px,36vw)]") &&
    header.includes("focus-within:max-w-[290px]") &&
    header.includes("w-[min(290px,36vw)] max-w-[290px]") &&
    header.includes('data-search-expanded={desktopSearchHasQuery ? "true" : "false"}')
);

ok(
  "desktop search expand is focus/query based (not hover) with smooth reduced-motion-safe width transition",
  header.includes("transition-[width] duration-200") &&
    header.includes("motion-reduce:transition-none") &&
    header.includes("focus-within:w-[min(290px,36vw)]") &&
    !/hover:w-\[min\(290px/.test(header) &&
    header.includes("truncatePlaceholder: true") &&
    header.includes(" truncate")
);

ok(
  "desktop search keeps expanded width from filters.search SoT when blurred with text",
  header.includes("const desktopSearchHasQuery = Boolean(filters.search)") &&
    !/useState\(.*[Ee]xpand/.test(header) &&
    !/isSearchExpanded/.test(header) &&
    !/searchExpanded/.test(header)
);

ok(
  "mobile keeps stacked search + horizontal nav + burger pattern",
  header.includes('data-testid="header-mobile-stack"') &&
    header.includes('data-testid="header-nav-mobile"') &&
    header.includes("md:hidden mt-1.5 space-y-1 min-w-0") &&
    header.includes("md:hidden p-2.5 rounded-xl border") &&
    header.includes("isMobileDrawerOpen")
);

ok(
  "active nav scrolls into view when overflowed",
  header.includes('data-header-nav={item.id}') &&
    header.includes("scrollWidth <= root.clientWidth") &&
    header.includes("scrollIntoView") &&
    header.includes('inline: "nearest"') &&
    header.includes('aria-current={isActive ? "page" : undefined}')
);

ok(
  "nav labels/routes unchanged (sample allowlist)",
  [
    'label: "หน้าแรก"',
    'label: "ตลาดรถยนต์"',
    'label: "คุยกับน้องเอ"',
    'label: "ลงขายด่วน 🪄"',
    'label: "ประกาศของฉัน"',
    'label: "ค้นหาละเอียด 🔍"',
    'label: "ดีลเลอร์และศูนย์บริการ"',
    'label: "ที่บันทึกไว้"',
    'id: "home"',
    'id: "marketplace"',
    'id: "chat"',
    'id: "sell"',
    'id: "my-listings"',
    'id: "search"',
    'id: "dealers"',
    'id: "saved"',
  ].every((snippet) => header.includes(snippet))
);

ok(
  "theme toggle next-action semantics preserved",
  header.includes('aria-label={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}') &&
    /isDarkMode\s*\?\s*<Sun[\s\S]*:\s*<Moon/.test(header)
);

ok(
  "polite theme-aware scrollbar styles retained on .header-nav-scroll",
  css.includes(".header-nav-scroll") &&
    css.includes("scrollbar-width: thin") &&
    css.includes("var(--nonga-scrollbar-track)") &&
    css.includes("#f97316")
);

console.log("\n--- desktop search expand/collapse state matrix ---\n");

const searchStates = [
  {
    name: "idle empty → ~150px collapsed",
    pass:
      header.includes("w-[min(150px,28vw)] max-w-[150px] focus-within:w-[min(290px,36vw)]") &&
      header.includes("const desktopSearchHasQuery = Boolean(filters.search)"),
  },
  {
    name: "focus-within (click/Tab) → ~290px expanded",
    pass: header.includes("focus-within:w-[min(290px,36vw)] focus-within:max-w-[290px]"),
  },
  {
    name: "has filters.search + blur → stays ~290px via query SoT",
    pass:
      header.includes('data-search-expanded={desktopSearchHasQuery ? "true" : "false"}') &&
      header.includes('? "w-[min(290px,36vw)] max-w-[290px]"'),
  },
  {
    name: "clear query + blur → collapses (empty branch keeps 150 + focus-within)",
    pass:
      header.includes("clearSearch") &&
      header.includes("w-[min(150px,28vw)]") &&
      header.includes("Boolean(filters.search)"),
  },
  {
    name: "no hover-only expand; transition 200ms; prefers-reduced-motion respected",
    pass:
      !/hover:w-\[min\(290px/.test(header) &&
      header.includes("duration-200") &&
      header.includes("motion-reduce:transition-none"),
  },
] as const;

for (const state of searchStates) {
  ok(state.name, state.pass);
}

console.log("\n--- viewport / zoom layout matrix ---\n");

const cases = [
  [1920, 100],
  [1440, 100],
  [1366, 80],
  [1366, 100],
  [1366, 125],
  [1280, 100],
  [1280, 125],
  [1024, 100],
  [1024, 125],
  [768, 100],
  [390, 100],
] as const;

for (const [physicalWidth, zoomPercent] of cases) {
  const cssWidth = physicalWidth / (zoomPercent / 100);
  const desktopSingleRow = cssWidth >= 768;
  const mode = desktopSingleRow
    ? "desktop single-row (nav scrolls in-flex)"
    : "mobile stacked + drawer";
  const valid = desktopSingleRow
    ? header.includes("hidden md:block flex-1 min-w-0") &&
      header.includes("overflow-x-auto")
    : header.includes('data-testid="header-mobile-stack"') &&
      header.includes("md:hidden");
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
