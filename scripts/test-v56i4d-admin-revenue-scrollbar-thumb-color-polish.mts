/**
 * v5.6I.4d — Global orange scrollbar thumb (color only)
 * npm run test:v56i4d-admin-revenue-scrollbar-thumb-color-polish
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const css = readFileSync("src/index.css", "utf8");
const revenue = readFileSync(
  "src/components/admin/revenue/AdminRevenueDashboardPreview.tsx",
  "utf8"
);
const modal = readFileSync(
  "src/components/admin/revenue/AdminRevenueAdjustmentModal.tsx",
  "utf8"
);
const chat = readFileSync("src/components/chat/ChatContainer.tsx", "utf8");
const chatSidebar = readFileSync("src/components/chat/ChatSidebar.tsx", "utf8");

const globalBlock =
  css.match(/\/\* Premium scrollbar styling[\s\S]*?\/\* Glassmorphism/)?.[0] ?? "";

// --- global orange thumb ---
{
  ok("global firefox scrollbar-color", css.includes("scrollbar-color: #f97316 transparent"));
  ok("global webkit thumb orange-500", globalBlock.includes("background: #f97316"));
  ok("global webkit hover orange-600", globalBlock.includes("background: #ea580c"));
  ok("global webkit active orange-700", globalBlock.includes("background: #c2410c"));
  ok("global thumb selector", css.includes("::-webkit-scrollbar-thumb"));
  ok("no scoped admin-revenue class", !css.includes(".admin-revenue-scrollbar"));
}

// --- sizes unchanged ---
{
  ok("global width still 6px", globalBlock.includes("width: 6px"));
  ok("global height still 6px", globalBlock.includes("height: 6px"));
  ok(
    "header nav height still 5px",
    css.includes(".header-nav-scroll::-webkit-scrollbar") &&
      css.includes("height: 5px")
  );
  ok(
    "global block did not add new width on thumb",
    !/::-webkit-scrollbar-thumb[\s\S]*width\s*:/.test(globalBlock)
  );
}

// --- chat uses global (no slate thumb override) ---
{
  ok("chat no slate thumb override", !chat.includes("scrollbar-thumb-slate"));
  ok("chat sidebar no slate thumb", !chatSidebar.includes("scrollbar-thumb-slate"));
  ok("revenue no scoped scrollbar class", !revenue.includes("admin-revenue-scrollbar"));
  ok("modal no scoped scrollbar class", !modal.includes("admin-revenue-scrollbar"));
}

// --- v5.6I.4c / v5.6I.4b layout preserved ---
{
  ok("table wrap overflow-x-auto", revenue.includes("overflow-x-auto"));
  ok("table wrap min-w-0", revenue.includes("min-w-0"));
  ok("table min-w unchanged", revenue.includes("min-w-[720px]"));
  ok("modal overflow-x-hidden", modal.includes("overflow-x-hidden"));
  ok("modal max height pattern", modal.includes("90vh"));
}

// --- no business logic ---
{
  ok("still fetches api", revenue.includes("fetchAdminRevenuePreview"));
  ok("no payment gateway", !revenue.toLowerCase().includes("stripe"));
}

// --- docs ---
{
  const doc = readFileSync(
    "docs/v5.6I.4d-admin-revenue-scrollbar-thumb-color-polish.md",
    "utf8"
  );
  ok("doc global scope", doc.includes("ทั้งระบบ") || doc.includes("Global"));
  ok("doc color only", doc.includes("สีเท่านั้น") || doc.includes("color only"));
  ok("doc sizes unchanged", doc.includes("6px"));
}

console.log("\nDone v5.6I.4d global scrollbar thumb color tests.");
if (process.exitCode) process.exit(process.exitCode);
