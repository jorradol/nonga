/**
 * Guard: Chat page light-mode + header account block micro-scope
 * (Owner directive: account block moved from sidebar footer (B) to sidebar
 *  header (A), desktop hamburger removed, theme toggle added before the
 *  marketplace button, chat surfaces converted to nonga theme tokens.)
 *
 * Run: npm run test:chat-light-mode-header-account-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function count(src: string, needle: string): number {
  return src.split(needle).length - 1;
}

console.log("=== Chat light-mode + header account guard ===\n");

const sidebar = readFileSync("src/components/chat/ChatSidebar.tsx", "utf8");
const account = readFileSync("src/components/chat/ChatSidebarAccount.tsx", "utf8");
const container = readFileSync("src/components/chat/ChatContainer.tsx", "utf8");
const aiView = readFileSync("src/components/AIChatView.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok(
  "package script registered",
  pkg.includes("test:chat-light-mode-header-account-guard")
);

// 1) Account block lives in the sidebar header (position A), single mount only
const headerIdx = sidebar.indexOf('id="sidebar-header"');
const headerBlock = sidebar.slice(headerIdx, sidebar.indexOf('id="sidebar-action"'));
ok(
  "ChatSidebarAccount mounted inside sidebar header (A)",
  headerIdx !== -1 && headerBlock.includes("<ChatSidebarAccount")
);
ok(
  "ChatSidebarAccount mounted exactly once (no duplicate at B)",
  count(sidebar, "<ChatSidebarAccount") === 1
);
ok(
  "old branding N-avatar block removed from sidebar header",
  !headerBlock.includes("AI Sales") && !/>\s*N\s*</.test(headerBlock)
);
ok(
  "account block keeps real identity + role + interactions",
  account.includes("displayName") &&
    account.includes("shortRoleLabel(role)") &&
    account.includes('id="sidebar-login-btn"') &&
    account.includes('id="sidebar-logout-btn"') &&
    account.includes("truncate")
);
ok(
  "account block uses profile icon (no letter avatar)",
  account.includes("<User") && !account.includes("ProfileAvatar")
);

// 2) Hamburger hidden on desktop, preserved for mobile drawer
const hamburgerMatch = container.match(
  /<button[\s\S]{0,60}?onClick=\{onToggleSidebar\}[\s\S]{0,600}?<\/button>/
);
ok(
  "hamburger toggle still exists for mobile",
  Boolean(hamburgerMatch) && container.includes('id="sidebar-toggle-trigger"')
);
ok(
  "hamburger is md:hidden (desktop shows no 3-line icon)",
  Boolean(hamburgerMatch && hamburgerMatch[0].includes("md:hidden"))
);

// 3) Theme toggle before marketplace button, reusing central store semantics
ok(
  "chat theme toggle exists with test id",
  container.includes('data-testid="chat-theme-toggle"')
);
ok(
  "theme toggle uses central store (no bespoke theme persistence)",
  container.includes("toggleDarkMode") &&
    container.includes("isDarkMode") &&
    !container.includes("nonga_runtime_theme")
);
ok(
  "theme toggle uses next-action labels matching Header",
  container.includes('title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}') &&
    container.includes('aria-label={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}')
);
ok(
  "theme toggle shows Sun in dark / Moon in light",
  /isDarkMode\s*\?\s*\(\s*<Sun[\s\S]*?<Moon/.test(container)
);
ok(
  "theme toggle rendered before marketplace button",
  container.indexOf('data-testid="chat-theme-toggle"') <
    container.indexOf('title="ไปที่ตลาดรถ"')
);

// 4) Light-mode: chat shell uses theme tokens, not fixed dark slate
ok(
  "chat root uses nonga-bg-app token",
  aiView.includes("nonga-bg-app") && !aiView.includes("bg-slate-950")
);
ok(
  "chat container uses token surfaces",
  container.includes("nonga-bg-app") &&
    container.includes("nonga-text-primary") &&
    !container.includes('bg-slate-950 text-slate-100')
);
ok(
  "sidebar uses token surfaces",
  sidebar.includes("bg-(--nonga-bg-app)/90") &&
    sidebar.includes("border-(--nonga-border)/80")
);
ok(
  "no unpaired fixed dark header/composer left in container",
  !container.includes("border-slate-800/80 bg-slate-900/10") &&
    !container.includes("bg-slate-900/98")
);

console.log(
  process.exitCode && process.exitCode !== 0 ? "\nRESULT: FAIL" : "\nRESULT: PASS"
);
