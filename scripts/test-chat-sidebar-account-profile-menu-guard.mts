/**
 * Guard: Chat sidebar account avatar + canonical profile menu follow-up
 * (Freeze prior chat-ui PASS: account at A, desktop hamburger hidden, theme
 *  toggle, light mode tokens. New: real avatar, logout only inside menu,
 *  nongbot.org footer link removed.)
 *
 * Run: npm run test:chat-sidebar-account-profile-menu-guard
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function count(src: string, needle: string): number {
  return src.split(needle).length - 1;
}

console.log("=== Chat sidebar account profile menu guard ===\n");

const sidebar = readFileSync("src/components/chat/ChatSidebar.tsx", "utf8");
const account = readFileSync(
  "src/components/chat/ChatSidebarAccount.tsx",
  "utf8"
);
const container = readFileSync("src/components/chat/ChatContainer.tsx", "utf8");
const menu = readFileSync(
  "src/components/profile/AccountProfileMenu.tsx",
  "utf8"
);
const avatar = readFileSync("src/components/profile/ProfileAvatar.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");

ok(
  "package script registered",
  pkg.includes("test:chat-sidebar-account-profile-menu-guard")
);

// --- Freeze prior Owner-PASS chat UI ---
const headerIdx = sidebar.indexOf('id="sidebar-header"');
const headerBlock = sidebar.slice(
  headerIdx,
  sidebar.indexOf('id="sidebar-action"')
);
ok(
  "freeze: Account block still at sidebar header (A)",
  headerIdx !== -1 && headerBlock.includes("<ChatSidebarAccount")
);
ok(
  "freeze: Account block still mounted exactly once",
  count(sidebar, "<ChatSidebarAccount") === 1
);
ok(
  "freeze: desktop hamburger still md:hidden",
  /onClick=\{onToggleSidebar\}[\s\S]{0,600}?md:hidden/.test(container) ||
    /md:hidden[\s\S]{0,200}?onClick=\{onToggleSidebar\}/.test(container)
);
ok(
  "freeze: theme toggle still before marketplace button",
  container.includes('data-testid="chat-theme-toggle"') &&
    container.indexOf('data-testid="chat-theme-toggle"') <
      container.indexOf('title="ไปที่ตลาดรถ"')
);

// --- Avatar ---
ok(
  "uses shared ProfileAvatar (same Header photo source)",
  account.includes('from "../profile/ProfileAvatar"') &&
    account.includes("<ProfileAvatar") &&
    account.includes("user?.photoURL")
);
ok(
  "avatar is circular (rounded-full) in sidebar slot",
  account.includes("rounded-full") && account.includes('id="sidebar-account-avatar"')
);
ok(
  "fallback to Profile/User icon when no photo or load fails",
  account.includes("hasRealProfilePhoto") &&
    account.includes("onUnresolved") &&
    account.includes("<User") &&
    avatar.includes("onUnresolved")
);
ok(
  "no hard-coded Thor Auto / dealer-specific avatar URL",
  !/Thor Auto/i.test(account) &&
    !/firebasestorage\.googleapis\.com/.test(account)
);

// --- Logout only inside menu ---
ok(
  "no inline logout button on account block",
  !account.includes('id="sidebar-logout-btn"') &&
    !account.includes("<LogOut") &&
    !/title="ออกจากระบบ"/.test(account)
);
ok(
  "account trigger opens canonical AccountProfileMenu",
  account.includes("AccountProfileMenu") &&
    account.includes('data-testid="chat-sidebar-account-control"') &&
    account.includes("setIsProfileOpen")
);
ok(
  "logout exists once inside shared menu only",
  menu.includes("ออกจากระบบเสร็จสรรพ") &&
    menu.includes('data-testid="account-profile-menu-logout"') &&
    count(menu, "ออกจากระบบเสร็จสรรพ") === 1 &&
    !account.includes("ออกจากระบบเสร็จสรรพ")
);
ok(
  "menu reuses Header role gates (admin/dealer/sandbox)",
  menu.includes("isAdmin &&") &&
    menu.includes("(isDealer || isAdmin)") &&
    menu.includes("showSandboxNavigation") &&
    account.includes("isAdmin") &&
    account.includes("isDealer") &&
    account.includes("showSandboxNavigation")
);
ok(
  "menu dismiss: Escape, outside pointer, toggle",
  account.includes('e.key === "Escape"') &&
    account.includes("pointerdown") &&
    account.includes("setIsProfileOpen((open) => !open)")
);

// --- Chat logout stays on /chat (do not inherit Header post-logout navigation) ---
const chatLogoutMatch = account.match(
  /onLogout=\{\(\)\s*=>\s*\{([\s\S]*?)\}\s*\}/
);
const chatLogoutBody = chatLogoutMatch?.[1] ?? "";
ok(
  "chat logout calls canonical logout action",
  /void\s+logout\(\)|logout\(\)/.test(chatLogoutBody)
);
ok(
  "chat logout does NOT navigate away (no setView home/marketplace/login)",
  Boolean(chatLogoutMatch) &&
    !chatLogoutBody.includes('setView("home")') &&
    !chatLogoutBody.includes('setView("marketplace")') &&
    !chatLogoutBody.includes('setView("login")') &&
    !chatLogoutBody.includes("setView('home')")
);
const header = readFileSync("src/components/Header.tsx", "utf8");
const headerLogoutMatch = header.match(
  /onLogout=\{\(\)\s*=>\s*\{([\s\S]*?)\}\s*\}/
);
const headerLogoutBody = headerLogoutMatch?.[1] ?? "";
ok(
  "Header logout still navigates home (unchanged other-page behavior)",
  headerLogoutBody.includes("logout()") &&
    headerLogoutBody.includes('setView("home")')
);

// --- Footer ---
const footerIdx = sidebar.indexOf('id="sidebar-footer"');
const footerBlock = sidebar.slice(footerIdx, footerIdx + 400);
ok(
  "footer keeps Branding by NongBot Group",
  footerBlock.includes("Branding by NongBot Group")
);
ok(
  "footer nongbot.org link removed",
  !footerBlock.includes("nongbot.org") &&
    !footerBlock.includes("www.nongbot.org")
);

// --- Guest path preserved ---
ok(
  "guest still has login affordance",
  account.includes('id="sidebar-login-btn"') &&
    account.includes("requestChatLoginModal")
);

console.log(
  process.exitCode && process.exitCode !== 0
    ? "\nRESULT: FAIL"
    : "\nRESULT: PASS"
);
