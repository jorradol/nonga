/**
 * v5.4.10B — floating chat button resume (no auto-inject / no auto-send)
 * npm run test:v5410b-floating-chat-resume
 */
import fs from "node:fs";
import path from "node:path";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const appTsx = fs.readFileSync(path.resolve("src/App.tsx"), "utf8");
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

console.log("--- Floating button: no auto-inject ---");
ok(
  "app-open-floating-no-queue-pending",
  appTsx.includes("openFloatingChat") &&
    !appTsx.includes("queuePendingChatMessage") &&
    !appTsx.includes(FLOATING_DEFAULT_PROMPT),
  ""
);
ok(
  "app-open-floating-navigates-chat",
  /openFloatingChat[\s\S]*setView\("chat"\)/.test(appTsx),
  ""
);
ok(
  "app-open-floating-saves-car-context",
  appTsx.includes("saveLastSelectedCarId") &&
    appTsx.includes('currentView === "car-details"'),
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
  chatContainer.includes('onClick={handleAskAboutContextualCar}') &&
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

console.log("\nDone v5.4.10B floating chat resume tests.");
