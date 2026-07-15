/**
 * Priority 5A — Public Chat Entry Point Consolidation
 * - Remove global floating chat FAB
 * - Header menu "คุยกับน้องเอ" after "ตลาดรถยนต์" for all roles
 * - Hero Home CTA destination unchanged (setView("chat"))
 *
 * Run: npx tsx scripts/test-priority-5a-public-chat-entry.mts
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const root = process.cwd();
const appTsx = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");
const headerTsx = fs.readFileSync(
  path.join(root, "src/components/Header.tsx"),
  "utf8"
);
const homeView = fs.readFileSync(
  path.join(root, "src/components/HomeView.tsx"),
  "utf8"
);

console.log("--- Floating FAB ---");
ok(
  "no-showFloatingChatButton",
  !appTsx.includes("showFloatingChatButton"),
  ""
);
ok("no-openFloatingChat", !appTsx.includes("openFloatingChat"), "");
ok(
  "no-hideFloatingChatViews",
  !appTsx.includes("hideFloatingChatViews"),
  ""
);
ok(
  "no-fixed-bottom-right-fab-class",
  !appTsx.includes("fixed bottom-5 right-4"),
  ""
);
ok(
  "no-floating-aria-label-in-app",
  !/aria-label="คุยกับน้องเอ"/.test(appTsx),
  ""
);

console.log("\n--- Shared Header chat nav ---");
const navBlockMatch = headerTsx.match(
  /const navItems: HeaderNavItem\[\] = \[([\s\S]*?)\];/
);
ok("navItems-block-found", Boolean(navBlockMatch), "");
const navBlock = navBlockMatch?.[1] ?? "";
ok(
  "order-home-marketplace-chat",
  /id: "home"[\s\S]*id: "marketplace"[\s\S]*id: "chat"/.test(navBlock),
  ""
);
ok(
  "label-is-คุยกับน้องเอ",
  navBlock.includes('label: "คุยกับน้องเอ"'),
  ""
);
const dealerBlockMatch = headerTsx.match(
  /const dealerNavItems: HeaderNavItem\[\] =[\s\S]*?\];/
);
const dealerBlock = dealerBlockMatch?.[0] ?? "";
ok(
  "chat-not-dealer-gated",
  !headerTsx.includes('label: "คุยกับน้องเอ AI"') &&
    !dealerBlock.includes('id: "chat"') &&
    navBlock.includes('id: "chat"'),
  ""
);
ok(
  "exactly-one-chat-nav-id",
  (headerTsx.match(/id: "chat"/g) || []).length === 1,
  ""
);

console.log("\n--- Hero CTA preserved ---");
ok(
  "hero-cta-present",
  homeView.includes('data-testid="home-cta-start-chat"') &&
    homeView.includes("เริ่มคุยกับน้องเอ"),
  ""
);
ok(
  "hero-destination-setView-chat",
  /const goToFullChat =[\s\S]*?setView\("chat"\)/.test(homeView),
  ""
);
ok(
  "hero-headline-preserved",
  homeView.includes("คุยรถยนต์สับๆ กับ"),
  ""
);

console.log("\nDone Priority 5A public chat entry tests.");
