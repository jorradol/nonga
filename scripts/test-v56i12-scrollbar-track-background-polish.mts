/**
 * v5.6I.12 — Global scrollbar track background polish (thumb orange unchanged)
 * npm run test:v56i12-scrollbar-track-background-polish
 */
import { readFileSync } from "node:fs";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const css = readFileSync("src/index.css", "utf8");
const chat = readFileSync("src/components/chat/ChatContainer.tsx", "utf8");
const chatSidebar = readFileSync("src/components/chat/ChatSidebar.tsx", "utf8");
const revenue = readFileSync(
  "src/components/admin/revenue/AdminRevenueDashboardPreview.tsx",
  "utf8"
);
const modal = readFileSync(
  "src/components/admin/revenue/AdminRevenueAdjustmentModal.tsx",
  "utf8"
);

const globalBlock =
  css.match(
    /\/\* Premium scrollbar styling[\s\S]*?\/\* Glassmorphism custom components \*\//
  )?.[0] ?? "";

const srcBlob = [chat, chatSidebar, revenue, modal].join("\n");

// --- v5.6I.4d thumb polish preserved ---
{
  ok("global webkit thumb orange-500", globalBlock.includes("background: #f97316"));
  ok("global webkit hover orange-600", globalBlock.includes("background: #ea580c"));
  ok("global webkit active orange-700", globalBlock.includes("background: #c2410c"));
  ok("global width still 6px", globalBlock.includes("width: 6px"));
  ok("global height still 6px", globalBlock.includes("height: 6px"));
  ok(
    "firefox thumb in scrollbar-color",
    css.includes("scrollbar-color: #f97316 var(--nonga-scrollbar-track)")
  );
}

// --- v5.6I.12 track polish ---
{
  ok("track css variable defined", css.includes("--color-scrollbar-track:"));
  ok("track uses slate subtle rgba", css.includes("rgba(148, 163, 184, 0.18)"));
  ok("webkit track not transparent", globalBlock.includes("background: var(--nonga-scrollbar-track)"));
  ok("global track not transparent literal", !globalBlock.includes("background: transparent"));
  ok(
    "firefox track not transparent literal",
    !css.includes("scrollbar-color: #f97316 transparent")
  );
  ok(
    "header nav track uses variable",
    css.includes(".header-nav-scroll::-webkit-scrollbar-track")
  );
}

// --- no white track overrides in key scroll areas ---
{
  ok("no scrollbar-track-white in src scan", !/scrollbar-track-white/.test(srcBlob));
  ok("chat no scrollbar-track-transparent", !chat.includes("scrollbar-track-transparent"));
  ok("no scrollbar-track-white project-wide chat/revenue", !srcBlob.includes("scrollbar-track-white"));
}

// --- scope guard: no settlement/persistence touches ---
{
  ok("index.css only scrollbar scope", !css.includes("settlementIdempotency"));
  ok("revenue still fetches api", revenue.includes("fetchAdminRevenuePreview"));
  ok("no firestore rules in css", !css.includes("firestore.rules"));
}

console.log("\nDone v5.6I.12 scrollbar track background polish tests.");
if (process.exitCode) process.exit(process.exitCode);
