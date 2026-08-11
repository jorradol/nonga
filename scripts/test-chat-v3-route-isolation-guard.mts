import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const appPath = path.join(root, "src", "App.tsx");
const routePath = path.join(root, "src", "utils", "appRouteSync.ts");
const storePath = path.join(root, "src", "store.ts");

const appText = readFileSync(appPath, "utf8");
const routeText = readFileSync(routePath, "utf8");
const storeText = readFileSync(storePath, "utf8");

const checks: Array<{ name: string; ok: boolean; detail: string }> = [
  {
    name: "route resolve /chat-v3",
    ok: routeText.includes('if (path === "/chat-v3") return "chat-v3";'),
    detail: "resolveViewFromPathname must map /chat-v3",
  },
  {
    name: "route reverse chat-v3",
    ok: routeText.includes('case "chat-v3":') && routeText.includes('return "/chat-v3";'),
    detail: "resolvePathnameForView must reverse-map chat-v3",
  },
  {
    name: "store union includes chat-v3",
    ok: storeText.includes('"chat-v3"'),
    detail: "AppState currentView union must include chat-v3",
  },
  {
    name: "app imports ChatV3Page",
    ok: appText.includes('import ChatV3Page from "./components/chat-v3/ChatV3Page";'),
    detail: "App route dispatcher must wire ChatV3Page",
  },
  {
    name: "app switch handles chat-v3",
    ok: appText.includes('case "chat-v3":') && appText.includes('return <ChatV3Page />;'),
    detail: "renderActiveView must include chat-v3 case",
  },
  {
    name: "full screen includes chat-v3",
    ok:
      appText.includes('currentView === "chat-v3"') &&
      appText.includes('const isFullScreenChatView'),
    detail: "chat-v3 must use fullscreen shell container",
  },
];

const failed = checks.filter((item) => !item.ok);

if (failed.length > 0) {
  console.error("[FAIL] chat-v3 route isolation guard failed");
  for (const item of failed) {
    console.error(` - ${item.name}: ${item.detail}`);
  }
  process.exit(1);
}

console.log("[PASS] chat-v3 route isolation guard");
for (const item of checks) {
  console.log(` - ${item.name}`);
}
