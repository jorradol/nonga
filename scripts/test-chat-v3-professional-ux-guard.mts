import { readFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();

const shellPath = path.join(root, "src", "components", "chat-v3", "ChatV3Shell.tsx");
const pagePath = path.join(root, "src", "components", "chat-v3", "ChatV3Page.tsx");
const headerPath = path.join(root, "src", "components", "chat-v3", "ChatV3ExpertModeBar.tsx");
const sidebarPath = path.join(root, "src", "components", "chat-v3", "ChatV3Sidebar.tsx");
const conversationPath = path.join(root, "src", "components", "chat-v3", "ChatV3Conversation.tsx");
const workspacePath = path.join(root, "src", "components", "chat-v3", "ChatV3Workspace.tsx");
const presentationPath = path.join(root, "src", "components", "chat-v3", "chatV3Presentation.ts");
const cssPath = path.join(root, "src", "components", "chat-v3", "chat-v3.css");
const indexCssPath = path.join(root, "src", "index.css");

const shellText = readFileSync(shellPath, "utf8");
const pageText = readFileSync(pagePath, "utf8");
const headerText = readFileSync(headerPath, "utf8");
const sidebarText = readFileSync(sidebarPath, "utf8");
const conversationText = readFileSync(conversationPath, "utf8");
const workspaceText = readFileSync(workspacePath, "utf8");
const presentationText = readFileSync(presentationPath, "utf8");
const cssText = readFileSync(cssPath, "utf8");
const indexCssText = readFileSync(indexCssPath, "utf8");
const hasDeveloperLiteralLabels =
  /["'`]ASSISTANT["'`]/.test(conversationText) ||
  /["'`]USER["'`]/.test(conversationText) ||
  /["'`]SYSTEM["'`]/.test(conversationText);
const indexCssDiff = execSync("git diff -- src/index.css", { cwd: root, encoding: "utf8" });

const selectorHeaders = Array.from(cssText.matchAll(/(^|\n)\s*([^@\n][^\{]+)\{/g)).map(
  (match) => match[2],
);
const classSelectors = selectorHeaders
  .flatMap((header) => header.split(","))
  .flatMap((selector) => Array.from(selector.matchAll(/(^|[^a-zA-Z0-9_-])\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)).map((m) => m[2]));
const hasNonChatV3ClassSelector = classSelectors.some((name) => !name.startsWith("chat-v3-"));

const hasForbiddenGlobalSelectors =
  /(^|\n)\s*(html|body|:root|button|input|textarea|\*)\b/m.test(cssText) ||
  /(^|\n)\s*\.chat-v2/m.test(cssText);

const runtimeSignals =
  shellText + conversationText + workspaceText + sidebarText + presentationText;

const checks: Array<{ name: string; ok: boolean; detail: string }> = [
  {
    name: "chat-v3 css imported from page",
    ok:
      pageText.includes('import "./chat-v3.css"') &&
      pageText.includes("chat-v3-page"),
    detail: "ChatV3Page must import chat-v3.css so style ownership is isolated",
  },
  {
    name: "index css baseline restored",
    ok:
      indexCssDiff.trim().length === 0 &&
      !indexCssText.includes("WP-V3-03A: Chat V3 route-scoped styles only") &&
      !indexCssText.includes(".chat-v3-page"),
    detail: "src/index.css must match HEAD with no chat-v3 block retained",
  },
  {
    name: "chat-v3 css selectors are scoped",
    ok:
      cssText.includes(".chat-v3-page") &&
      !hasNonChatV3ClassSelector &&
      !hasForbiddenGlobalSelectors,
    detail: "chat-v3.css must use only chat-v3 scoped selectors and no global/chat-v2 selectors",
  },
  {
    name: "compact thai header present",
    ok:
      headerText.includes("พร้อมช่วยคุณ") &&
      headerText.includes("chat-v3-header") &&
      headerText.includes("chat-v3-expert-trigger") &&
      !headerText.includes("chat-v3-expert-mode-compact"),
    detail: "header should present assistant identity with compact expert dropdown",
  },
  {
    name: "thai expert mode labels",
    ok:
      presentationText.includes('AUTO: "ยานยนต์ทั่วไป"') &&
      presentationText.includes('BUYING: "รถยนต์"') &&
      presentationText.includes('FINANCE: "สินเชื่อรถ"'),
    detail: "expert mode labels should be Thai-first chat-first wording",
  },
  {
    name: "sidebar has thai nav actions",
    ok:
      sidebarText.includes("+ แชทใหม่") &&
      sidebarText.includes("บทสนทนาที่ผ่านมา") &&
      sidebarText.includes("ค้นหาประวัติแชท") &&
      sidebarText.includes("ลบบทสนทนานี้"),
    detail: "sidebar should include Thai history UX, search, and accessible delete",
  },
  {
    name: "conversation is thai-first",
    ok:
      conversationText.includes("chatV3WelcomeTitle") &&
      conversationText.includes("พิมพ์คุยกับน้องเอ") &&
      !conversationText.includes("Live Chat Thread") &&
      !hasDeveloperLiteralLabels &&
      !conversationText.includes("message.role.toUpperCase()"),
    detail: "conversation should remove developer wording and use Thai copy",
  },
  {
    name: "workspace hides debug metadata",
    ok:
      !workspaceText.includes("creation:") &&
      !workspaceText.includes("confirm:") &&
      !workspaceText.includes("UNSUPPORTED_REPORT") &&
      workspaceText.includes("รายการนี้ยังไม่รองรับการแสดงผลเต็มรูปแบบ"),
    detail: "workspace must hide system metadata and show polite unsupported fallback",
  },
  {
    name: "composer and mobile nav accessible labels",
    ok:
      conversationText.includes('aria-label="กล่องพิมพ์ข้อความ"') &&
      conversationText.includes('aria-label="ส่งข้อความ"') &&
      shellText.includes('aria-label="เปิดประวัติการสนทนา"') &&
      shellText.includes('aria-label="เปิดหน้าสนทนา"') &&
      shellText.includes('aria-label="เปิดงานของฉัน"'),
    detail: "composer and mobile navigation controls must expose Thai accessible labels",
  },
  {
    name: "chat-first desktop proportions",
    ok:
      cssText.includes("--chat-v3-read-max: 860px") &&
      cssText.includes("chat-v3-grid-workspace-open") &&
      cssText.includes("chat-v3-grid-workspace-collapsed") &&
      cssText.includes("chat-v3-grid-sidebar-collapsed") &&
      !cssText.includes("grid-template-columns: 272px minmax(0, 1fr) 360px;"),
    detail: "desktop should prioritize chat column and open workspace on demand",
  },
  {
    name: "mobile single-pane controls",
    ok:
      shellText.includes("ตัวนำทางมือถือ") &&
      shellText.includes("ประวัติ") &&
      shellText.includes("Workspace") &&
      cssText.includes(".chat-v3-sidebar.chat-v3-is-mobile-active") &&
      cssText.includes("@media (max-width: 767px)"),
    detail: "mobile should provide non-overlay navigation for history/chat/workspace",
  },
  {
    name: "responsive css scoped to chat-v3",
    ok:
      cssText.includes(".chat-v3-page") &&
      cssText.includes(".chat-v3-mobile-panels") &&
      !cssText.includes(".chat-v2") &&
      !cssText.includes(".chat-container"),
    detail: "chat-v3 responsive rules must remain route-scoped and avoid cross-route selectors",
  },
  {
    name: "disabled placeholders retained",
    ok:
      conversationText.includes("ยังไม่พร้อมใช้งาน") &&
      conversationText.includes("disabled") &&
      !conversationText.includes("fetch("),
    detail: "composer placeholder controls must remain disabled local UI",
  },
  {
    name: "local-only behavior has no runtime or persistence wiring",
    ok:
      !runtimeSignals.includes("fetch(") &&
      !runtimeSignals.includes("axios") &&
      !runtimeSignals.includes("firestore") &&
      !runtimeSignals.includes("localStorage") &&
      !runtimeSignals.includes("sessionStorage") &&
      !runtimeSignals.includes("indexedDB") &&
      !runtimeSignals.includes("navigator.mediaDevices"),
    detail: "approved local-only behavior must not call API/runtime/firestore/persistence",
  },
  {
    name: "no size restore control",
    ok:
      !shellText.includes("คืนขนาดเดิม") &&
      !workspaceText.includes("คืนขนาดเดิม") &&
      !headerText.includes("คืนขนาดเดิม"),
    detail: "chat-first redesign must not reintroduce size restore controls",
  },
];

const failed = checks.filter((item) => !item.ok);

if (failed.length > 0) {
  console.error("[FAIL] chat-v3 professional ux guard failed");
  for (const item of failed) {
    console.error(` - ${item.name}: ${item.detail}`);
  }
  process.exit(1);
}

console.log("[PASS] chat-v3 professional ux guard");
for (const item of checks) {
  console.log(` - ${item.name}`);
}
