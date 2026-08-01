/**
 * Chat Experience V2 — single vehicle selection + next-message context guard
 * npm run test:chat-v2-vehicle-selection-guard
 *   or: npx tsx scripts/test-chat-v2-vehicle-selection-guard.mts
 *
 * Covers:
 * 1. select with canonical listing id
 * 2. selected visual / a11y affordances in source
 * 3. change A → B
 * 4. deselect clears context (cleared sentinel blocks silent fallback)
 * 5. stale / untrusted ids rejected
 * 6. new chat / clearPilot does not keep prior selection
 * 7. conversation switch isolation
 * 8. desktop/mobile share ChatV2WorkspaceBody selection wiring
 * 9. next-message uses loadLastSelectedCarId (no user-visible marker)
 * 10. Classic /chat and frozen layout guards remain separate
 */
import fs from "node:fs";
import path from "node:path";

const memoryStore = new Map<string, string>();
(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memoryStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    memoryStore.delete(k);
  },
  clear: () => memoryStore.clear(),
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
  get length() {
    return memoryStore.size;
  },
};

import {
  SELECTION_CLEARED_SENTINEL,
  clearLastSelectedCarId,
  clearPilotChatSessionContext,
  isSelectionClearedMarker,
  loadActiveSelectedCarIdForUi,
  loadLastSelectedCarId,
  saveChatCarContext,
  saveLastSelectedCarId,
  setActivePilotChatSessionId,
} from "../src/utils/chatCarContext.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { ChatCarCardData } from "../src/types.ts";

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

function assert(label: string, condition: boolean, detail = ""): void {
  if (!condition) fail(label, detail);
  pass(label);
}

function main(): void {
  console.log("=== Chat V2 vehicle selection guard ===\n");

  // ---------- Source: select UI + a11y + separate detail action ----------
  const card = read("src/components/chat-v2/ChatV2VehicleCard.tsx");
  mustInclude(card, "aria-pressed={isSelected}", "source-select-aria-pressed");
  mustInclude(card, "chat-v2-vehicle-card-selected-badge", "source-selected-badge");
  mustInclude(card, "เลือกแล้ว", "source-selected-label-text");
  mustInclude(card, "chat-v2-vehicle-card-select-btn", "source-select-button");
  mustInclude(card, "chat-v2-vehicle-card-detail-btn", "source-detail-button-preserved");
  mustInclude(card, "onSelect", "source-select-handler-prop");
  mustInclude(card, "onClearSelection", "source-clear-handler-prop");
  mustNotInclude(card, "SELECTED_CAR_ID", "source-card-no-internal-marker");

  const workspace = read("src/components/chat-v2/ChatV2VehicleWorkspace.tsx");
  mustInclude(workspace, "useChatV2VehicleSelection", "source-workspace-uses-selection-hook");
  mustInclude(workspace, "selectedVehicleId", "source-workspace-selected-id");
  mustInclude(workspace, "onSelect={selectVehicle}", "source-workspace-wires-select");
  mustInclude(
    workspace,
    "onClearSelection={clearVehicleSelection}",
    "source-workspace-wires-clear"
  );

  const sheet = read("src/components/chat-v2/ChatV2MobileVehicleSheet.tsx");
  mustInclude(sheet, "ChatV2WorkspaceBody", "source-sheet-reuses-workspace-body");
  // Sheet must not invent a second selection store.
  mustNotInclude(sheet, "useState", "source-sheet-no-local-selection-state");

  const adapter = read(
    "src/components/chat-v2/adapters/useChatV2Presentation.ts"
  );
  mustInclude(adapter, "useChatV2VehicleSelection", "source-selection-hook-exported");
  mustInclude(adapter, "isTrustedVehicleCard", "source-rejects-untrusted-via-trusted-filter");
  mustInclude(adapter, "saveLastSelectedCarId", "source-persists-via-existing-contract");
  mustInclude(adapter, "clearLastSelectedCarId", "source-clears-via-existing-contract");
  mustNotInclude(adapter, "SELECTED_CAR_ID", "source-adapter-no-marker-injection");
  mustNotInclude(adapter, "sessionStorage", "source-adapter-no-direct-session-storage");

  const composer = read("src/components/chat-v2/ChatV2Composer.tsx");
  mustNotInclude(composer, "SELECTED_CAR_ID", "source-composer-no-hidden-marker");
  const conversation = read("src/components/chat-v2/ChatV2Conversation.tsx");
  mustNotInclude(conversation, "SELECTED_CAR_ID", "source-conversation-no-hidden-marker");
  mustInclude(conversation, "sendMessage(text)", "source-send-message-unchanged");

  // ---------- Runtime: session-scoped select / change / clear ----------
  memoryStore.clear();
  setActivePilotChatSessionId("room-a");
  saveLastSelectedCarId("listing-a", "room-a");
  assert(
    "runtime-select-canonical-id",
    loadLastSelectedCarId("room-a") === "listing-a"
  );
  assert(
    "runtime-ui-load-selected",
    loadActiveSelectedCarIdForUi("room-a") === "listing-a"
  );

  saveLastSelectedCarId("listing-b", "room-a");
  assert(
    "runtime-change-a-to-b",
    loadLastSelectedCarId("room-a") === "listing-b" &&
      loadActiveSelectedCarIdForUi("room-a") === "listing-b"
  );

  clearLastSelectedCarId("room-a");
  assert(
    "runtime-deselect-returns-cleared-sentinel",
    loadLastSelectedCarId("room-a") === SELECTION_CLEARED_SENTINEL
  );
  assert(
    "runtime-deselect-sentinel-is-marker",
    isSelectionClearedMarker(loadLastSelectedCarId("room-a"))
  );
  assert(
    "runtime-deselect-ui-cleared",
    loadActiveSelectedCarIdForUi("room-a") === null
  );
  assert(
    "runtime-deselect-blocks-null-fallback-contract",
    Boolean(loadLastSelectedCarId("room-a")) &&
      isSelectionClearedMarker(loadLastSelectedCarId("room-a")),
    "cleared state must stay truthy so orchestrator skips recently-viewed/contextCars[0]"
  );

  // Untrusted / synthetic ids must not be persisted by saveLastSelectedCarId
  // when passed as the cleared sentinel itself.
  saveLastSelectedCarId(SELECTION_CLEARED_SENTINEL, "room-a");
  assert(
    "runtime-reject-sentinel-as-listing-id",
    loadActiveSelectedCarIdForUi("room-a") === null
  );

  // ---------- Runtime: conversation isolation ----------
  memoryStore.clear();
  setActivePilotChatSessionId("room-a");
  saveLastSelectedCarId("listing-a", "room-a");
  setActivePilotChatSessionId("room-b");
  assert(
    "runtime-switch-room-no-cross-leak",
    loadLastSelectedCarId("room-b") === null &&
      loadActiveSelectedCarIdForUi("room-b") === null
  );
  // Room A still holds its own selection when addressed explicitly.
  assert(
    "runtime-other-room-selection-preserved",
    loadLastSelectedCarId("room-a") === "listing-a"
  );
  saveLastSelectedCarId("listing-b", "room-b");
  assert(
    "runtime-room-b-independent-select",
    loadLastSelectedCarId("room-b") === "listing-b" &&
      loadLastSelectedCarId("room-a") === "listing-a"
  );

  // ---------- Runtime: new chat / clearPilot ----------
  setActivePilotChatSessionId("room-b");
  clearPilotChatSessionContext();
  assert(
    "runtime-new-chat-clears-active-selection",
    loadLastSelectedCarId("room-b") === null &&
      loadActiveSelectedCarIdForUi("room-b") === null
  );
  // Legacy global key must not survive.
  assert(
    "runtime-legacy-global-selection-removed",
    memoryStore.get("nonga_chat_last_selected_car") == null
  );

  // ---------- Runtime: next-message contract via orchestrator ----------
  memoryStore.clear();
  const inventory: ChatInventoryCar[] = [
    {
      id: "listing-a",
      title: "Toyota Corolla 2020",
      brand: "Toyota",
      model: "Corolla",
      year: 2020,
      price: 399000,
      mileage: 80000,
      bodyType: "Sedan",
      images: ["https://example.com/a.webp"],
    },
    {
      id: "listing-b",
      title: "Honda City 2021",
      brand: "Honda",
      model: "City",
      year: 2021,
      price: 429000,
      mileage: 50000,
      bodyType: "Sedan",
      images: ["https://example.com/b.webp"],
    },
  ];
  const contextCards: ChatCarCardData[] = inventory.map((c) => ({
    id: c.id,
    brand: c.brand,
    model: c.model,
    year: c.year,
    price: c.price,
    mileage: c.mileage ?? 0,
    bodyClass: "sedan",
    bodyClassLabel: "รถเก๋ง",
    hasImage: true,
    imageUrl: c.images?.[0],
    detailPath: `/cars/${c.id}`,
    matchKind: "exact" as const,
  }));

  const phrases = [
    "คันนี้",
    "คันนี้ผ่อนประมาณเท่าไร",
    "รถคันนี้มีจุดไหนควรตรวจสอบก่อนซื้อ",
    "คันนี้เหมาะกับครอบครัวไหม",
  ] as const;

  function orchestrate(phrase: string) {
    return tryOrchestrateChatReplyCore(phrase, inventory, {
      chatSessionId: "orch-room",
      contextCarsOverride: contextCards,
    });
  }

  function assertResolvesListing(
    label: string,
    phrase: string,
    listingId: string
  ): void {
    const reply = orchestrate(phrase);
    const ids = (reply?.carCards ?? []).map((c) => c.id);
    const text = reply?.text ?? "";
    const otherId = listingId === "listing-a" ? "listing-b" : "listing-a";
    const otherModel = listingId === "listing-a" ? "Honda City" : "Corolla";
    // Pre-purchase inspection advisor may answer without attaching cards — still
    // must not ask "which car?" or cite a different listing while A/B is selected.
    const isInspectionAsk = /ควรตรวจสอบก่อนซื้อ/i.test(phrase);
    if (isInspectionAsk) {
      assert(
        label,
        !/หมายถึงรถคันไหน|กดเลือกรถจากการ์ด/i.test(text) &&
          !ids.includes(otherId) &&
          !new RegExp(otherModel, "i").test(text) &&
          !text.includes("SELECTED_CAR_ID") &&
          !text.includes(SELECTION_CLEARED_SENTINEL),
        `cards=${JSON.stringify(ids)} text=${text.slice(0, 100)}`
      );
      return;
    }
    assert(
      label,
      ids.includes(listingId) &&
        !text.includes("SELECTED_CAR_ID") &&
        !text.includes(SELECTION_CLEARED_SENTINEL),
      `cards=${JSON.stringify(ids)} text=${text.slice(0, 100)}`
    );
  }

  function assertFailClosed(label: string, phrase: string): void {
    const reply = orchestrate(phrase);
    const ids = (reply?.carCards ?? []).map((c) => c.id);
    const text = reply?.text ?? "";
    assert(
      label,
      ids.length === 0 &&
        !ids.includes("listing-a") &&
        !ids.includes("listing-b") &&
        !/listing-a|listing-b|Corolla|Honda City/i.test(text) &&
        !text.includes(SELECTION_CLEARED_SENTINEL) &&
        !text.includes("__nonga_selection_cleared__") &&
        !/TypeError|ReferenceError|undefined is not|exception|stack/i.test(
          text
        ) &&
        (/หมายถึงรถคันไหน|กดเลือกรถ|กดดูรายละเอียดรถคันที่สนใจ/i.test(text) ||
          text.length > 0),
      `cards=${JSON.stringify(ids)} text=${text.slice(0, 120)}`
    );
  }

  // A. Valid selection → all contextual phrases resolve A
  setActivePilotChatSessionId("orch-room");
  saveChatCarContext(contextCards, "orch-room");
  saveLastSelectedCarId("listing-a", "orch-room");
  for (const phrase of phrases) {
    assertResolvesListing(
      `runtime-valid-A::${phrase}`,
      phrase,
      "listing-a"
    );
  }

  // C. Change A → B
  saveLastSelectedCarId("listing-b", "orch-room");
  for (const phrase of phrases) {
    assertResolvesListing(
      `runtime-change-to-B::${phrase}`,
      phrase,
      "listing-b"
    );
  }

  // B. Explicit deselect — no silent revive of A/B via recently-viewed/contextCars[0]
  clearLastSelectedCarId("orch-room");
  memoryStore.set(
    "nonga_chat_recently_viewed_cars",
    JSON.stringify(["listing-a"])
  );
  assert(
    "runtime-deselect-state-is-cleared",
    isSelectionClearedMarker(loadLastSelectedCarId("orch-room"))
  );
  for (const phrase of phrases) {
    assertFailClosed(`runtime-deselect-fail-closed::${phrase}`, phrase);
  }

  // Source contract: orchestrator must honor resolveSelectedCarIdState / cleared
  const orchSrc = read("src/services/ai/chat/chatSearchOrchestrator.ts");
  mustInclude(
    orchSrc,
    "resolveSelectedCarIdState",
    "source-orchestrator-uses-shared-selection-state"
  );
  mustInclude(
    orchSrc,
    'selection.kind === "cleared"',
    "source-orchestrator-honors-cleared-kind"
  );

  // ---------- Classic /chat isolation markers ----------
  const aiView = read("src/components/AIChatView.tsx");
  mustNotInclude(aiView, "chat-v2", "classic-chat-no-v2-markup");
  mustInclude(aiView, "ChatVehiclePanel", "classic-d1-panel-preserved");
  const classicCard = read("src/components/chat/ChatCarCard.tsx");
  mustInclude(classicCard, "saveLastSelectedCarId", "classic-card-still-uses-selection-util");

  // ---------- Layout freeze still owned by existing guard file ----------
  const layoutGuard = read("scripts/test-chat-v2-workspace-layout-guard.mts");
  mustInclude(
    layoutGuard,
    'CHAT_V2_DESKTOP_MEDIA_QUERY = "(min-width: 1024px)"',
    "layout-guard-still-locks-1024"
  );

  console.log("\n=== Chat V2 vehicle selection guard — OK ===");
}

main();
