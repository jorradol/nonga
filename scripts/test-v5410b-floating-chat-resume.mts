/**
 * v5.4.10B — chat entry resume (no auto-inject / no auto-send)
 * Priority 5A: floating FAB removed; public Header owns chat entry.
 * npm run test:v5410b-floating-chat-resume
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const appTsx = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");
const headerTsx = fs.readFileSync(
  path.resolve("src/components/Header.tsx"),
  "utf8"
);
const chatContext = fs.readFileSync(
  path.resolve("src/contexts/chat/ChatContext.tsx"),
  "utf8"
);
const chatContainer = fs.readFileSync(
  path.resolve("src/components/chat/ChatContainer.tsx"),
  "utf8"
);
const pendingUtil = fs.readFileSync(
  path.resolve("src/utils/pendingChatMessage.ts"),
  "utf8"
);
const homeView = fs.readFileSync(path.resolve("src/components/HomeView.tsx"), "utf8");

const FLOATING_DEFAULT_PROMPT =
  "สวัสดีน้องเอ ช่วยแนะนำการซื้อรถ ขายรถ หรือฝากขายรถให้หน่อยครับ";

console.log("--- Floating FAB removed (Priority 5A) ---");
ok(
  "app-no-floating-chat-button",
  !appTsx.includes("showFloatingChatButton") &&
    !appTsx.includes("openFloatingChat") &&
    !appTsx.includes("hideFloatingChatViews") &&
    !appTsx.includes("fixed bottom-5 right-4"),
  ""
);

console.log("\n--- Public Header owns chat entry ---");
ok(
  "header-chat-after-marketplace",
  /\{ id: "marketplace", label: "ตลาดรถยนต์"[\s\S]*?\{ id: "chat", label: "คุยกับน้องเอ"/.test(
    headerTsx
  ),
  ""
);
ok(
  "header-chat-not-dealer-only",
  !headerTsx.includes('label: "คุยกับน้องเอ AI"') &&
    headerTsx.includes('{ id: "chat", label: "คุยกับน้องเอ"'),
  ""
);
ok(
  "header-single-chat-nav-item",
  (headerTsx.match(/id: "chat"/g) || []).length === 1,
  ""
);

console.log("\n--- Hero CTA destination unchanged ---");
ok(
  "home-hero-still-goes-to-chat",
  homeView.includes('data-testid="home-cta-start-chat"') &&
    homeView.includes('setView("chat")') &&
    /const goToFullChat[\s\S]*setView\("chat"\)/.test(homeView),
  ""
);

console.log("\n--- Pending bridge kept for explicit CTAs only ---");
ok(
  "pending-util-still-exists",
  pendingUtil.includes("queuePendingChatMessage") &&
    pendingUtil.includes("takePendingChatMessage"),
  ""
);
ok(
  "chat-context-still-consumes-explicit-pending",
  chatContext.includes("takePendingChatMessage") &&
    chatContext.includes("sendMessage(pending)"),
  ""
);
ok(
  "home-view-still-queues-explicit-sell-cta",
  homeView.includes("queuePendingChatMessage") &&
    homeView.includes("goToSellFlow"),
  ""
);
ok(
  "app-no-queue-pending-on-entry",
  !appTsx.includes("queuePendingChatMessage") &&
    !appTsx.includes(FLOATING_DEFAULT_PROMPT),
  ""
);

console.log("\n--- Case C: car context chip (user must click) ---");
ok(
  "chat-container-contextual-car-chip",
  chatContainer.includes("chat-contextual-car-chip") &&
    chatContainer.includes("loadLastSelectedCarId") &&
    chatContainer.includes("handleAskAboutContextualCar"),
  ""
);
ok(
  "contextual-car-chip-user-click-only",
  chatContainer.includes("onClick={handleAskAboutContextualCar}") &&
    chatContainer.includes("handleAskAboutContextualCar = () =>"),
  ""
);

console.log("\n--- Regression: composer placeholder is not a message ---");
ok(
  "chat-composer-placeholder-only",
  chatContainer.includes("placeholder=") &&
    !chatContainer.includes(FLOATING_DEFAULT_PROMPT),
  ""
);

console.log("\nDone v5.4.10B / Priority 5A chat entry tests.");
