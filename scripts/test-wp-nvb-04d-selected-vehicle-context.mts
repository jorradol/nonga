/**
 * WP-NVB-04D — Selected Vehicle Grounded Next-Turn Context
 * tsx scripts/test-wp-nvb-04d-selected-vehicle-context.mts
 */
import fs from "node:fs";
import path from "node:path";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  buildAuthoritativeSelectedVehicleContext,
  resolveAuthoritativeSelectedVehicleContext,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  CHAT_SELECTED_LISTING_ID_MAX_LENGTH,
  parseBoundedSelectedListingId,
  resolveActiveSessionSelectedListingId,
  resolveSelectedCarIdState,
  saveLastSelectedCarId,
  clearLastSelectedCarId,
  setActivePilotChatSessionId,
  SELECTION_CLEARED_SENTINEL,
} from "../src/utils/chatCarContext.ts";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
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

function sampleInventory(
  overrides: Partial<ChatInventoryCar> & Pick<ChatInventoryCar, "id">
): ChatInventoryCar {
  return {
    id: overrides.id,
    title: "Test",
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    price: 650000,
    mileage: 45000,
    fuelType: "petrol",
    type: "used",
    condition: "good",
    description: "",
    images: [`/storage/listings/${overrides.id}/01-a.webp`],
    ownerName: "Owner",
    isSold: false,
    listingStatus: "published",
    ...overrides,
  };
}

function main(): void {
  console.log("=== WP-NVB-04D Selected Vehicle Context ===\n");

  const chatCarContext = read("src/utils/chatCarContext.ts");
  const useChat = read("src/hooks/chat/useChat.ts");
  const orchestrateClient = read("src/services/ai/chat/chatUserVisibleOrchestrateClient.ts");
  const bridge = read("src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts");
  const generalBridge = read("src/services/ai/chat/chatV2V3GeneralConversationBridge.ts");
  const v3Service = read("src/services/ai/chat-v3/chatV3ConversationService.ts");
  const presentation = read("src/components/chat-v2/adapters/useChatV2Presentation.ts");

  // Session / selection seams
  mustInclude(chatCarContext, "SESSION_SELECTION_MAP_KEY", "session-scoped-selection-map");
  mustInclude(chatCarContext, "resolveActiveSessionSelectedListingId", "resolve-active-session-id");
  mustInclude(presentation, "saveLastSelectedCarId", "v2-presentation-saves-selection");
  mustInclude(presentation, "loadActiveSelectedCarIdForUi", "v2-ui-selection-load");

  // Request boundary — ID only
  mustInclude(orchestrateClient, "selectedListingId", "client-selectedListingId-field");
  mustInclude(orchestrateClient, "parseBoundedSelectedListingId", "client-bounded-id-parse");
  mustNotInclude(orchestrateClient, "vehicleContext", "client-no-vehicleContext-in-orchestrate");
  mustInclude(useChat, "resolveActiveSessionSelectedListingId", "useChat-resolves-session-id");
  mustInclude(useChat, "selectedListingId: selectedListingIdForBridge", "useChat-sends-id-only");

  const discoveryBranch = orchestrateClient.slice(
    orchestrateClient.indexOf("if (selectedListingId)"),
    orchestrateClient.indexOf("if (selectedListingId)") + 120
  );
  if (discoveryBranch.includes("price") || discoveryBranch.includes("mileage")) {
    fail("client-body-no-car-facts");
  }
  pass("client-body-no-car-facts");

  if (!parseBoundedSelectedListingId("listing-a")) fail("parse-valid-id");
  pass("parse-valid-id");
  if (parseBoundedSelectedListingId("a".repeat(CHAT_SELECTED_LISTING_ID_MAX_LENGTH + 1))) {
    fail("reject-oversized-id");
  }
  pass("reject-oversized-id");
  if (parseBoundedSelectedListingId("bad\u0001id")) fail("reject-control-chars");
  pass("reject-control-chars");

  // Server resolver
  mustInclude(bridge, "resolveAuthoritativeSelectedVehicleContext", "server-resolver-exported");
  mustInclude(bridge, "isPublishedDiscoveryListing", "server-visibility-helper");
  mustInclude(bridge, "loadChatInventory", "server-inventory-load-deps");
  mustInclude(bridge, "authoritativeVehicleContext", "general-bridge-wires-context");
  mustInclude(generalBridge, "authoritativeSelectedVehicleContext", "general-bridge-v3-option");
  mustInclude(v3Service, "authoritativeSelectedVehicleContext", "v3-service-server-context-option");
  mustInclude(
    v3Service,
    "options.authoritativeSelectedVehicleContext",
    "v3-prefers-server-context-over-client"
  );

  const ready = sampleInventory({ id: "ready-1" });
  const resolved = resolveAuthoritativeSelectedVehicleContext("ready-1", [ready]);
  if (resolved.outcome !== "resolved" || !resolved.context) {
    fail("resolver-ready-listing", JSON.stringify(resolved));
  }
  pass("resolver-ready-listing");
  if (resolved.context.vehicles[0]?.facts?.price !== "650000") {
    fail("context-from-inventory-not-client");
  }
  pass("context-from-inventory-not-client");

  const hidden = resolveAuthoritativeSelectedVehicleContext(
    "hidden-1",
    [sampleInventory({ id: "hidden-1", listingStatus: "hidden" })]
  );
  if (hidden.outcome !== "unavailable") fail("reject-hidden", hidden.outcome);
  pass("reject-hidden");

  const sold = resolveAuthoritativeSelectedVehicleContext(
    "sold-1",
    [sampleInventory({ id: "sold-1", isSold: true })]
  );
  if (sold.outcome !== "unavailable") fail("reject-sold", sold.outcome);
  pass("reject-sold");

  const missing = resolveAuthoritativeSelectedVehicleContext("missing-1", [ready]);
  if (missing.outcome !== "not-found") fail("not-found", missing.outcome);
  pass("not-found");

  const malformed = resolveAuthoritativeSelectedVehicleContext("bad\u0001", [ready]);
  if (malformed.outcome !== "malformed-id") fail("malformed-id", malformed.outcome);
  pass("malformed-id");

  const none = resolveAuthoritativeSelectedVehicleContext(undefined, [ready]);
  if (none.outcome !== "no-selection") fail("no-selection", none.outcome);
  pass("no-selection");

  // Tampered client facts cannot affect server-built context
  const ctx = buildAuthoritativeSelectedVehicleContext(ready);
  if (ctx.vehicles[0]?.facts?.brand !== "Toyota") fail("build-from-inventory");
  pass("build-from-inventory");

  // Routing / tool boundaries — staged tools blocked, not invoked on general path
  mustInclude(generalBridge, "STAGED_LANE_TOOLS", "general-staged-tools-guard");
  mustInclude(generalBridge, "hasDisallowedAuthoritativeTools", "general-blocks-search-inventory-tools");
  mustInclude(bridge, "inventoryFetchExecutionCount: 0", "bridge-keeps-inventory-fetch-zero");
  mustNotInclude(useChat, "saveChatCarContext", "v2-bridge-no-saveChatCarContext-in-useChat");

  // Diagnostics privacy — bounded booleans/classifications only
  mustInclude(bridge, "selectedVehicleGroundingOutcome", "diagnostic-outcome-class");
  const diagnosticInterface = bridge.slice(
    bridge.indexOf("export interface UserVisibleRuntimeAttributionDiagnostic"),
    bridge.indexOf("export interface UserVisibleRuntimeAttributionDiagnostic") + 2500
  );
  mustNotInclude(diagnosticInterface, "selectedListingId", "diagnostic-interface-no-raw-listing-id");
  const groundingEvidenceFn = bridge.slice(
    bridge.indexOf("function selectedVehicleGroundingLaneEvidence"),
    bridge.indexOf("function selectedVehicleGroundingLaneEvidence") + 400
  );
  mustNotInclude(groundingEvidenceFn, "userMessage", "grounding-evidence-no-user-text");
  mustNotInclude(groundingEvidenceFn, "selectedListingId", "grounding-evidence-no-raw-id");
  pass("diagnostic-privacy-bounded");

  // Session isolation (in-memory sessionStorage mock)
  if (typeof globalThis.sessionStorage === "undefined") {
    const store = new Map<string, string>();
    (globalThis as { sessionStorage?: Storage }).sessionStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
      removeItem: (k) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
  }

  setActivePilotChatSessionId("room-a");
  saveLastSelectedCarId("car-a", "room-a");
  setActivePilotChatSessionId("room-b");
  if (resolveActiveSessionSelectedListingId("room-b") != null) {
    fail("new-room-no-stale-id");
  }
  pass("new-room-no-stale-id");

  saveLastSelectedCarId("car-b", "room-b");
  if (resolveActiveSessionSelectedListingId("room-b") !== "car-b") {
    fail("room-b-has-own-selection");
  }
  pass("room-b-has-own-selection");
  if (resolveActiveSessionSelectedListingId("room-a") !== "car-a") {
    fail("room-a-keeps-own-selection-not-leaked");
  }
  pass("room-a-keeps-own-selection-not-leaked");
  saveLastSelectedCarId("car-c", "room-b");
  if (resolveActiveSessionSelectedListingId("room-b") !== "car-c") {
    fail("replace-selection-in-room");
  }
  pass("replace-selection-in-room");

  clearLastSelectedCarId("room-b");
  const cleared = resolveSelectedCarIdState("room-b");
  if (cleared.kind !== "cleared") {
    fail("deselect-cleared-state", cleared.kind);
  }
  if (resolveActiveSessionSelectedListingId("room-b") != null) {
    fail("cleared-not-sent");
  }
  pass("cleared-not-sent");

  if (parseBoundedSelectedListingId(SELECTION_CLEARED_SENTINEL)) {
    fail("sentinel-not-valid-listing-id");
  }
  pass("sentinel-not-valid-listing-id");

  setActivePilotChatSessionId(null);
  saveLastSelectedCarId("global-car");
  if (resolveActiveSessionSelectedListingId("explicit-room") != null) {
    fail("explicit-session-ignores-global-legacy");
  }
  pass("explicit-session-ignores-global-legacy");

  console.log(`\n=== WP-NVB-04D — OK (${passCount} assertions) ===`);
}

main();
