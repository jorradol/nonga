/**
 * WP-NVB-04D / WP-NVB-04D-R1 — Selected Vehicle Grounded Next-Turn Context
 * tsx scripts/test-wp-nvb-04d-selected-vehicle-context.mts
 */
import fs from "node:fs";
import path from "node:path";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  buildAuthoritativeSelectedVehicleContext,
  isSelectedVehicleSaleReady,
  resolveAuthoritativeSelectedVehicleContext,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import {
  detectExplicitSelectedVehicleReference,
  executeChatV2V3GeneralBridgeTurn,
  NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV,
  NONGA_CHAT_V2_V3_GENERAL_PILOT_UIDS_ENV,
  SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE,
  shouldFailClosedExplicitSelectedVehicleReference,
} from "../src/services/ai/chat/chatV2V3GeneralConversationBridge.ts";
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

const PILOT_UID = "wp-04d-pilot-uid";

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

function readPilotEnv(key: string): string | undefined {
  const env: Record<string, string> = {
    [NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV]: "true",
    [NONGA_CHAT_V2_V3_GENERAL_PILOT_UIDS_ENV]: PILOT_UID,
    [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
  };
  return env[key];
}

async function runGeneralBridgeMock(input: {
  userMessage: string;
  selectedListingId?: string;
  inventory?: ChatInventoryCar[];
  inventoryLoadFailed?: boolean;
}): Promise<{ v3Calls: number; text: string; kind: string }> {
  const inventory = input.inventory ?? [sampleInventory({ id: "ready-1" })];
  const grounding = resolveAuthoritativeSelectedVehicleContext(
    input.selectedListingId,
    inventory,
    {
      inventoryLoadFailed:
        input.inventoryLoadFailed === true &&
        input.selectedListingId != null &&
        input.selectedListingId !== "",
    }
  );
  let v3Calls = 0;
  const turn = await executeChatV2V3GeneralBridgeTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: input.userMessage,
    readEnv: readPilotEnv,
    environment: "local",
    authoritativeVehicleContext: grounding.context,
    selectedListingIdRequested:
      input.selectedListingId != null && input.selectedListingId !== "",
    selectedVehicleGroundingOutcome: grounding.outcome,
    runChatV3Conversation: async () => {
      v3Calls += 1;
      return { success: true, data: { content: "v3-ok" } } as const;
    },
  });
  const text =
    turn.kind === "success" ||
    turn.kind === "failed-closed" ||
    turn.kind === "kill-switch-fail-closed" ||
    turn.kind === "selected-reference-fail-closed"
      ? turn.userVisibleText
      : "";
  return { v3Calls, text, kind: turn.kind };
}

async function main(): Promise<void> {
  console.log("=== WP-NVB-04D / 04D-R1 Selected Vehicle Context ===\n");

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

  // Server resolver + sale-readiness parity
  mustInclude(bridge, "resolveAuthoritativeSelectedVehicleContext", "server-resolver-exported");
  mustInclude(bridge, "isSelectedVehicleSaleReady", "server-sale-readiness-gate");
  mustInclude(bridge, "isPublishedDiscoveryListing", "server-visibility-helper");
  mustInclude(bridge, "inventoryLoadFailed", "server-inventory-failure-boundary");
  mustInclude(generalBridge, "detectExplicitSelectedVehicleReference", "explicit-reference-detector");
  mustInclude(generalBridge, "SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE", "status-cue-exported");
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
  pass("parity-published-resolved");
  if (resolved.context.vehicles[0]?.facts?.price !== "650000") {
    fail("context-from-inventory-not-client");
  }
  pass("context-from-inventory-not-client");

  const legacyMissing = resolveAuthoritativeSelectedVehicleContext(
    "legacy-1",
    [
      sampleInventory({
        id: "legacy-1",
        listingStatus: undefined,
        saleStatus: undefined,
      }),
    ]
  );
  if (legacyMissing.outcome !== "resolved") fail("parity-legacy-missing-status", legacyMissing.outcome);
  pass("parity-legacy-missing-status");

  const explicitSalePublished = resolveAuthoritativeSelectedVehicleContext(
    "sale-published",
    [sampleInventory({ id: "sale-published", saleStatus: "published" })]
  );
  if (explicitSalePublished.outcome !== "resolved") {
    fail("parity-explicit-sale-published", explicitSalePublished.outcome);
  }
  pass("parity-explicit-sale-published");

  const noImage = resolveAuthoritativeSelectedVehicleContext(
    "no-image",
    [sampleInventory({ id: "no-image", images: [] })]
  );
  if (noImage.outcome !== "resolved") fail("follow-up-no-image-required", noImage.outcome);
  pass("follow-up-no-image-required");

  const assertUnavailable = (label: string, car: ChatInventoryCar, id = car.id) => {
    const result = resolveAuthoritativeSelectedVehicleContext(id, [car]);
    if (result.outcome !== "unavailable-blocking-status") {
      fail(label, result.outcome);
    }
    pass(label);
  };

  assertUnavailable("parity-hidden", sampleInventory({ id: "hidden-1", listingStatus: "hidden" }));
  assertUnavailable(
    "parity-pending-review",
    sampleInventory({ id: "pending-review", listingStatus: "pending_review" })
  );
  assertUnavailable(
    "parity-unknown-listing-status",
    sampleInventory({ id: "unknown-listing", listingStatus: "withdrawn" as ChatInventoryCar["listingStatus"] })
  );
  assertUnavailable(
    "parity-malformed-listing-status",
    sampleInventory({ id: "bad-listing", listingStatus: 123 as unknown as ChatInventoryCar["listingStatus"] })
  );
  assertUnavailable(
    "parity-pending-sale",
    sampleInventory({ id: "pending-sale", saleStatus: "pending_sale" })
  );
  assertUnavailable(
    "parity-sale-sold",
    sampleInventory({ id: "sale-sold", saleStatus: "sold" })
  );
  assertUnavailable(
    "parity-sale-hidden",
    sampleInventory({ id: "sale-hidden", saleStatus: "hidden" })
  );
  assertUnavailable(
    "parity-sale-cancelled",
    sampleInventory({ id: "sale-cancelled", saleStatus: "sale_cancelled" })
  );
  assertUnavailable(
    "parity-sale-cancelled-alt",
    sampleInventory({ id: "cancelled", saleStatus: "cancelled" as ChatInventoryCar["saleStatus"] })
  );
  assertUnavailable(
    "parity-sale-reserved",
    sampleInventory({ id: "reserved", saleStatus: "reserved" as ChatInventoryCar["saleStatus"] })
  );
  assertUnavailable(
    "parity-sale-withdrawn",
    sampleInventory({ id: "withdrawn", saleStatus: "withdrawn" as ChatInventoryCar["saleStatus"] })
  );
  assertUnavailable(
    "parity-unknown-sale-status",
    sampleInventory({ id: "unknown-sale", saleStatus: "unknown" as ChatInventoryCar["saleStatus"] })
  );
  assertUnavailable("parity-isSold", sampleInventory({ id: "sold-1", isSold: true }));

  if (isSelectedVehicleSaleReady(sampleInventory({ id: "tampered", listingStatus: "hidden" }))) {
    fail("client-tampered-status-no-effect");
  }
  pass("client-tampered-status-no-effect");

  const missing = resolveAuthoritativeSelectedVehicleContext("missing-1", [ready]);
  if (missing.outcome !== "not-found") fail("not-found", missing.outcome);
  pass("not-found");

  const malformed = resolveAuthoritativeSelectedVehicleContext("bad\u0001", [ready]);
  if (malformed.outcome !== "malformed-id") fail("malformed-id", malformed.outcome);
  pass("malformed-id");

  const none = resolveAuthoritativeSelectedVehicleContext(undefined, [ready]);
  if (none.outcome !== "no-selection") fail("no-selection", none.outcome);
  pass("no-selection");

  const resolverFailure = resolveAuthoritativeSelectedVehicleContext("ready-1", [ready], {
    inventoryLoadFailed: true,
  });
  if (resolverFailure.outcome !== "resolver-failure") {
    fail("resolver-failure-outcome", resolverFailure.outcome);
  }
  pass("resolver-failure-outcome");

  const ctx = buildAuthoritativeSelectedVehicleContext(ready);
  if (ctx.vehicles[0]?.facts?.brand !== "Toyota") fail("build-from-inventory");
  pass("build-from-inventory");

  // Explicit reference detection
  const refCases: Array<[string, boolean, string]> = [
    ["คันนี้เป็นอย่างไร", true, "ref-thai-kan-ni"],
    ["รถคันนี้ราคาเท่าไร", true, "ref-thai-rot-kan-ni"],
    ["ช่วยดูคันที่เลือก", true, "ref-thai-kan-thi-leuak"],
    ["รถที่เลือกดีไหม", true, "ref-thai-rot-thi-leuak"],
    ["สรุปคันดังกล่าว", true, "ref-thai-kan-dang-klao"],
    ["How is this car?", true, "ref-en-this-car"],
    ["Tell me about this vehicle", true, "ref-en-this-vehicle"],
    ["selected car price", true, "ref-en-selected-car"],
    ["selected vehicle details", true, "ref-en-selected-vehicle"],
    ["อยากได้รถ", false, "ref-no-rot-alone"],
    ["คันไหนดีกว่า", false, "ref-no-kan-nai"],
    ["เบรกคืออะไร", false, "ref-no-unrelated-general"],
  ];
  for (const [message, expected, label] of refCases) {
    if (detectExplicitSelectedVehicleReference(message) !== expected) {
      fail(label, message);
    }
    pass(label);
  }

  // Behavior matrix
  {
    const ok = await runGeneralBridgeMock({
      userMessage: "คันนี้เป็นอย่างไร",
      selectedListingId: "ready-1",
      inventory: [ready],
    });
    if (ok.v3Calls !== 1) fail("resolved-explicit-v3-once", String(ok.v3Calls));
    pass("resolved-explicit-v3-once");
  }

  {
    const blocked = await runGeneralBridgeMock({
      userMessage: "คันนี้เป็นอย่างไร",
      selectedListingId: "hidden-1",
      inventory: [sampleInventory({ id: "hidden-1", listingStatus: "hidden" })],
    });
    if (blocked.v3Calls !== 0) fail("unavailable-explicit-v3-zero", String(blocked.v3Calls));
    if (blocked.text !== SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE) fail("unavailable-status-cue");
    pass("unavailable-explicit-v3-zero");
  }

  {
    const blocked = await runGeneralBridgeMock({
      userMessage: "คันนี้เป็นอย่างไร",
      selectedListingId: "missing-1",
      inventory: [ready],
    });
    if (blocked.v3Calls !== 0) fail("not-found-explicit-v3-zero", String(blocked.v3Calls));
    if (blocked.text !== SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE) fail("not-found-status-cue");
    pass("not-found-explicit-v3-zero");
  }

  {
    const blocked = await runGeneralBridgeMock({
      userMessage: "คันนี้เป็นอย่างไร",
      selectedListingId: "bad\u0001",
      inventory: [ready],
    });
    if (blocked.v3Calls !== 0) fail("malformed-explicit-v3-zero", String(blocked.v3Calls));
    if (blocked.text !== SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE) fail("malformed-status-cue");
    pass("malformed-explicit-v3-zero");
  }

  {
    const blocked = await runGeneralBridgeMock({
      userMessage: "คันนี้เป็นอย่างไร",
      selectedListingId: "ready-1",
      inventory: [ready],
      inventoryLoadFailed: true,
    });
    if (blocked.v3Calls !== 0) fail("resolver-failure-explicit-v3-zero", String(blocked.v3Calls));
    if (blocked.text !== SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE) fail("resolver-failure-status-cue");
    pass("resolver-failure-explicit-v3-zero");
  }

  {
    const hidden = resolveAuthoritativeSelectedVehicleContext(
      "private-1",
      [sampleInventory({ id: "private-1", listingStatus: "hidden" })]
    );
    if (hidden.outcome !== "unavailable-blocking-status") fail("permission-denied-outcome");
    if (SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE.includes("ซ่อน") || SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE.includes("private")) {
      fail("permission-denied-no-leak");
    }
    pass("permission-denied-no-private-leak");
  }

  {
    const general = await runGeneralBridgeMock({
      userMessage: "เบรกคืออะไร",
      selectedListingId: "missing-1",
      inventory: [ready],
    });
    if (general.v3Calls !== 1) fail("unrelated-general-continues", String(general.v3Calls));
    pass("unrelated-general-continues");
  }

  {
    const clarify = await runGeneralBridgeMock({
      userMessage: "คันนี้เป็นอย่างไร",
      inventory: [ready],
    });
    if (clarify.v3Calls !== 0) fail("no-selection-explicit-v3-zero", String(clarify.v3Calls));
    if (clarify.text !== SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE) fail("no-selection-clarification");
    pass("no-selection-explicit-clarification");
  }

  mustInclude(
    bridge,
    "searchGroundingRouting.kind === \"selected\"",
    "search-lane-precedence-before-general"
  );
  mustInclude(bridge, "resolveChatV2V3SearchGroundingRouting", "search-routing-unchanged");
  pass("search-lane-order-unchanged");

  // Routing / tool boundaries
  mustInclude(generalBridge, "STAGED_LANE_TOOLS", "general-staged-tools-guard");
  mustInclude(generalBridge, "hasDisallowedAuthoritativeTools", "general-blocks-search-inventory-tools");
  mustInclude(bridge, "inventoryFetchExecutionCount: 0", "bridge-keeps-inventory-fetch-zero");
  mustNotInclude(useChat, "saveChatCarContext", "v2-bridge-no-saveChatCarContext-in-useChat");
  mustNotInclude(generalBridge, "functionCall", "general-no-function-calling");

  // Status cue privacy / neutrality
  if (/ครับ|ค่ะ/.test(SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE)) {
    fail("status-cue-gender-neutral");
  }
  pass("status-cue-gender-neutral");
  if (/650000|Toyota|Camry|sold|hidden|stock/i.test(SELECTED_VEHICLE_UNCONFIRMED_STATUS_CUE)) {
    fail("status-cue-no-fabricated-facts");
  }
  pass("status-cue-no-fabricated-facts");

  // Diagnostics privacy
  mustInclude(bridge, "selectedVehicleReferenceFailClosed", "diagnostic-reference-fail-closed");
  mustInclude(bridge, "selectedVehicleGeneralContextWithheld", "diagnostic-context-withheld");
  const diagnosticInterface = bridge.slice(
    bridge.indexOf("export interface UserVisibleRuntimeAttributionDiagnostic"),
    bridge.indexOf("export interface UserVisibleRuntimeAttributionDiagnostic") + 2800
  );
  mustNotInclude(diagnosticInterface, "selectedListingId", "diagnostic-interface-no-raw-listing-id");
  const groundingEvidenceFn = bridge.slice(
    bridge.indexOf("function selectedVehicleGroundingLaneEvidence"),
    bridge.indexOf("function selectedVehicleGroundingLaneEvidence") + 700
  );
  mustNotInclude(groundingEvidenceFn, "userMessage", "grounding-evidence-no-user-text");
  mustNotInclude(groundingEvidenceFn, "selectedListingId", "grounding-evidence-no-raw-id");
  pass("diagnostic-privacy-bounded");

  // Session isolation
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

  if (
    !shouldFailClosedExplicitSelectedVehicleReference({
      userMessage: "คันนี้",
      selectedListingIdRequested: true,
      groundingOutcome: "not-found",
    })
  ) {
    fail("should-fail-closed-selected-unresolved");
  }
  pass("should-fail-closed-selected-unresolved");
  if (
    shouldFailClosedExplicitSelectedVehicleReference({
      userMessage: "เบรกคืออะไร",
      selectedListingIdRequested: true,
      groundingOutcome: "not-found",
    })
  ) {
    fail("should-not-fail-closed-unrelated");
  }
  pass("should-not-fail-closed-unrelated");

  console.log(`\n=== WP-NVB-04D / 04D-R1 — OK (${passCount} assertions) ===`);
}

await main();
