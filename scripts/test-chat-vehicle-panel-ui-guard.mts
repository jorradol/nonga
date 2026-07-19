/**
 * Chat UI Phase D1 — Vehicle Results Panel guard (source checks)
 * npm run test:chat-vehicle-panel-ui-guard
 *
 * Guards:
 * 1. Panel/hook are UI-only: no fetch, no inventory mutation, no mock vehicles.
 * 2. discoveredVehicles is derived from session messages (real carCards with
 *    stable listing IDs; synthetic pilot-session IDs excluded).
 * 3. Panel reuses ChatCarCard, has a11y names, and no dealer/lead actions.
 * 4. Responsive contract: inline at xl, overlay sheet below xl, safe area,
 *    reduced-motion support, own scroll region.
 * 5. Chat brain untouched: composer/frozen-layout markers preserved; no
 *    orchestrator/routing imports from the new UI files.
 */
import fs from "node:fs";
import path from "node:path";

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail = ""): never {
  console.error(`FAIL: ${label}`, detail);
  process.exit(1);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function mustInclude(src: string, needle: string, label: string): void {
  if (!src.includes(needle)) fail(label, `missing: ${needle}`);
  pass(label);
}

function mustNotInclude(src: string, needle: string, label: string): void {
  if (src.includes(needle)) fail(label, `unexpected: ${needle}`);
  pass(label);
}

function main(): void {
  console.log("=== Chat Vehicle Panel UI guard (Phase D1) ===\n");

  const hook = read("src/hooks/chat/useVehiclePanel.ts");
  const panel = read("src/components/chat/ChatVehiclePanel.tsx");
  const aiView = read("src/components/AIChatView.tsx");
  const container = read("src/components/chat/ChatContainer.tsx");

  // --- hook: derived state, no persistence, no synthetic/mock vehicles ---
  mustInclude(hook, "deriveDiscoveredVehicles", "hook-derives-from-messages");
  mustInclude(hook, "pilot-session-", "hook-excludes-synthetic-pilot-ids");
  mustInclude(hook, "msg.carCards", "hook-reads-real-carcards-only");
  mustInclude(hook, "activeSessionId", "hook-resets-on-session-change");
  mustNotInclude(hook, "fetch(", "hook-no-network");
  mustNotInclude(hook, "localStorage", "hook-no-local-persistence");
  mustNotInclude(hook, "setItem", "hook-no-storage-writes");
  mustNotInclude(hook, "saveLastSelectedCarId", "hook-does-not-mutate-selected-car");
  mustNotInclude(hook, "brand:", "hook-no-inline-mock-vehicle");

  // --- panel: reuse ChatCarCard, a11y, no lead/dealer actions, no data invention ---
  mustInclude(panel, "ChatCarCard", "panel-reuses-chat-car-card");
  mustInclude(panel, 'role="complementary"', "panel-has-landmark-role");
  mustInclude(panel, "aria-label={`รถที่พบ", "panel-aria-label-with-count");
  mustInclude(panel, 'aria-label="ปิดแผงรถที่พบ"', "panel-close-accessible-name");
  mustInclude(panel, '"Escape"', "panel-escape-closes");
  mustInclude(panel, "overflow-y-auto", "panel-own-scroll-region");
  mustInclude(panel, "xl:static", "panel-inline-at-desktop");
  mustInclude(panel, "max-xl:fixed", "panel-overlay-below-desktop");
  mustInclude(panel, "env(safe-area-inset-bottom)", "panel-mobile-safe-area");
  mustInclude(panel, "motion-reduce:transition-none", "panel-reduced-motion");
  mustInclude(panel, "vehicle-panel-count", "panel-shows-count");
  mustInclude(panel, "vehicle-panel-loading", "panel-loading-state");
  mustNotInclude(panel, "PhoneCall", "panel-no-contact-action");
  mustNotInclude(panel, "onRequestSellerCallback", "panel-no-lead-callback");
  mustNotInclude(panel, "fetch(", "panel-no-network");
  mustNotInclude(panel, "brand:", "panel-no-inline-mock-vehicle");

  // --- layout wiring: three areas + triggers ---
  mustInclude(aiView, "ChatVehiclePanel", "aiview-mounts-vehicle-panel");
  mustInclude(aiView, "useVehiclePanel", "aiview-uses-panel-state-hook");
  mustInclude(aiView, "min-h-0", "aiview-min-h-0-preserved");
  mustInclude(aiView, 'matchMedia("(min-width: 768px)")', "aiview-sidebar-viewport-sync-preserved");
  mustInclude(container, 'id="vehicle-panel-trigger-navbar"', "container-navbar-trigger");
  mustInclude(container, 'id="vehicle-panel-trigger-mobile"', "container-mobile-trigger");
  mustInclude(container, "ดูรถที่พบ", "container-mobile-trigger-copy");
  mustInclude(container, "vehiclePanel.count > 0 && !vehiclePanel.isOpen", "container-trigger-only-when-closed-with-results");

  // --- frozen/composer behaviors preserved (spot markers) ---
  mustInclude(container, "chat-composer-safe-bottom", "container-composer-safe-area-preserved");
  mustInclude(container, "max-md:fixed", "container-composer-mobile-fixed-preserved");
  mustInclude(container, 'title="ไปที่ตลาดรถ"', "container-marketplace-entry-preserved");
  mustInclude(container, 'id="sidebar-toggle-trigger"', "container-mobile-hamburger-preserved");

  // --- brain isolation: new UI files must not import routing/orchestration ---
  for (const [name, src] of [
    ["hook", hook],
    ["panel", panel],
  ] as const) {
    mustNotInclude(src, "chatSearchOrchestrator", `${name}-no-orchestrator-import`);
    mustNotInclude(src, "aiService", `${name}-no-ai-service-import`);
    mustNotInclude(src, "chatUserVisibleOrchestrateClient", `${name}-no-bridge-import`);
    mustNotInclude(src, "marketplaceChatSearch", `${name}-no-search-import`);
  }

  console.log("\n=== Chat Vehicle Panel UI guard — OK ===");
}

main();
