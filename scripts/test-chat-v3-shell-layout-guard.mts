import { readFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();

const shellPath = path.join(root, "src", "components", "chat-v3", "ChatV3Shell.tsx");
const pagePath = path.join(root, "src", "components", "chat-v3", "ChatV3Page.tsx");
const cssPath = path.join(root, "src", "components", "chat-v3", "chat-v3.css");
const adapterPath = path.join(root, "src", "components", "chat-v3", "adapters", "useChatV3LayoutState.ts");
const indexCssPath = path.join(root, "src", "index.css");

const shellText = readFileSync(shellPath, "utf8");
const pageText = readFileSync(pagePath, "utf8");
const cssText = readFileSync(cssPath, "utf8");
const adapterText = readFileSync(adapterPath, "utf8");
const indexCssText = readFileSync(indexCssPath, "utf8");
const indexCssDiff = execSync("git diff -- src/index.css", { cwd: root, encoding: "utf8" });

const checks: Array<{ name: string; ok: boolean; detail: string }> = [
  {
    name: "page renders shell",
    ok: pageText.includes("<ChatV3Shell />") && pageText.includes('import "./chat-v3.css"'),
    detail: "ChatV3Page must render ChatV3Shell",
  },
  {
    name: "shell has three panels",
    ok:
      shellText.includes("<ChatV3Sidebar") &&
      shellText.includes("<ChatV3Conversation") &&
      shellText.includes("<ChatV3Workspace"),
    detail: "ChatV3Shell must include Sidebar/Conversation/Workspace",
  },
  {
    name: "shell has expert mode bar",
    ok: shellText.includes("<ChatV3ExpertModeBar"),
    detail: "ChatV3Shell must include expert mode selector",
  },
  {
    name: "shell uses local adapter",
    ok: shellText.includes("useChatV3LayoutState"),
    detail: "ChatV3Shell state must come from local adapter",
  },
  {
    name: "adapter uses mock data",
    ok:
      adapterText.includes("chatV3MockConversations") &&
      adapterText.includes("chatV3MockMessages") &&
      adapterText.includes("chatV3MockWorkspaceItems"),
    detail: "layout adapter should be backed by local mock data",
  },
  {
    name: "css defines chat-v3 grid",
    ok: cssText.includes(".chat-v3-grid") && cssText.includes("grid-template-columns"),
    detail: "chat-v3.css must include chat-v3 shell grid style",
  },
  {
    name: "index css baseline no diff",
    ok:
      indexCssDiff.trim().length === 0 &&
      !indexCssText.includes("WP-V3-03A: Chat V3 route-scoped styles only") &&
      !indexCssText.includes(".chat-v3-page"),
    detail: "src/index.css should be restored to baseline while chat-v3 styles live in chat-v3.css",
  },
  {
    name: "shell exposes mobile panel controls",
    ok: shellText.includes("chat-v3-mobile-panels") && shellText.includes("openWorkspace"),
    detail: "ChatV3Shell must expose non-overlay mobile panel navigation",
  },
  {
    name: "mobile nav keeps pointer events enabled",
    ok:
      !/\.chat-v3-mobile-panels[^{]*\{[^}]*pointer-events\s*:\s*none/m.test(cssText) &&
      !/\.chat-v3-mobile-panels\s+button[^{]*\{[^}]*pointer-events\s*:\s*none/m.test(cssText) &&
      cssText.includes(".chat-v3-mobile-panels button") &&
      cssText.includes("pointer-events: auto"),
    detail: "Chat V3 mobile navigation must remain clickable (no pointer-events:none on nav/buttons)",
  },
  {
    name: "mobile nav uses document-flow relative stacking",
    ok:
      /@media\s*\(max-width:\s*767px\)[\s\S]*\.chat-v3-mobile-panels\s*\{[\s\S]*?position:\s*relative/.test(cssText) &&
      !/@media\s*\(max-width:\s*767px\)[\s\S]*\.chat-v3-mobile-panels\s*\{[\s\S]*?position:\s*sticky/.test(cssText),
    detail: "Mobile nav should stay in document flow (relative) instead of sticky overlay interception",
  },
  {
    name: "workspace closed by default",
    ok: adapterText.includes("useState(true)") && adapterText.includes("Chat-first: Workspace is on-demand"),
    detail: "Workspace must initialize closed for chat-first layout",
  },
  {
    name: "chat-first main column present",
    ok: shellText.includes("chat-v3-main") && cssText.includes(".chat-v3-main"),
    detail: "Conversation must live in a dedicated main column as the primary surface",
  },
  {
    name: "workspace open grid mode",
    ok:
      cssText.includes("chat-v3-grid-workspace-open") &&
      cssText.includes("chat-v3-grid-workspace-collapsed") &&
      cssText.includes(".chat-v3-workspace.chat-v3-is-collapsed:not(.chat-v3-is-mobile-active)"),
    detail: "Desktop workspace must expand on demand and fully hide when closed",
  },
];

const failed = checks.filter((item) => !item.ok);

if (failed.length > 0) {
  console.error("[FAIL] chat-v3 shell layout guard failed");
  for (const item of failed) {
    console.error(` - ${item.name}: ${item.detail}`);
  }
  process.exit(1);
}

console.log("[PASS] chat-v3 shell layout guard");
for (const item of checks) {
  console.log(` - ${item.name}`);
}
