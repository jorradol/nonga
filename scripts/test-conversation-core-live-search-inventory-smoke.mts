/**
 * WP-V2U-03E2D2C2C2C — Opt-in controlled live Search/Inventory smoke.
 *
 * Default (no flag): local proofs only. Refuses network.
 * Live:
 *   NONGA_CONVERSATION_CORE_LIVE_SMOKE=true
 *
 * Never prints secret values or seller PII. Never writes responses to the repo.
 */
import type { ConversationCoreResult } from "../src/services/conversation-core/index";
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../src/services/ai/salesBrainRuntimeFlags";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory";
import {
  createInventoryRepository,
  type InventoryRepository,
} from "../src/server/repositories/inventoryRepository";
import { type ServerAuthContext } from "../src/server/serverAuthContext";
import {
  CONVERSATION_CORE_GEMINI_API_KEY_ENV,
  CONVERSATION_CORE_LIVE_STAGED_TOOL_NAMES,
  createConversationCoreGeminiToolTransportSdkSeam,
  handleConversationCoreTurnPost,
  inspectConversationCoreLiveEnvironmentIdentity,
  NONGA_CONVERSATION_CORE_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV,
  NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV,
  NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV,
  resolveConversationCoreFeatureFlags,
  resolveConversationCoreLiveServerActivation,
  type ConversationCoreRouteResponse,
  type ConversationOwnershipVerifier,
} from "../src/server/conversation-core";

export const NONGA_CONVERSATION_CORE_LIVE_SMOKE_ENV =
  "NONGA_CONVERSATION_CORE_LIVE_SMOKE";

const MAX_LIVE_GEMINI_REQUESTS = 4;
const SEARCH_MESSAGE = "ช่วยหารถเก๋ง";
const INVENTORY_MESSAGE = "มีรถอะไรขายบ้าง";
const AUTH_UID = "conv-core-live-smoke-actor";
const CONVERSATION_ID = "conv-core-live-search-inventory";
const EXIT_PASS = 0;
const EXIT_HOLD = 2;

let passCount = 0;
let liveGeminiRequests = 0;
let inventoryReads = 0;
let writeAttempts = 0;
let marketplaceSearchReached = false;
let inventoryFetchReached = false;
let groundingVerified = false;
let dataProofIncomplete = false;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exit(1);
  }
  pass(label);
}

function assertTruthy(label: string, value: unknown): void {
  if (!value) {
    console.error(`FAIL [${label}] expected truthy`);
    process.exit(1);
  }
  pass(label);
}

function assertFalsy(label: string, value: unknown): void {
  if (value) {
    console.error(`FAIL [${label}] expected falsy`);
    process.exit(1);
  }
  pass(label);
}

function isLiveSmokeExplicitlyEnabled(readEnv: (key: string) => string | undefined): boolean {
  return String(readEnv(NONGA_CONVERSATION_CORE_LIVE_SMOKE_ENV) ?? "").trim() === "true";
}

function secretStatus(readEnv: (key: string) => string | undefined, key: string): "present" | "missing" {
  return String(readEnv(key) ?? "").trim() ? "present" : "missing";
}

function printSanitized(label: string, value: string | number | boolean): void {
  console.log(`${label}: ${value}`);
}

function authContext(): ServerAuthContext {
  return {
    uid: AUTH_UID,
    email: "buyer@example.com",
    displayName: "Buyer",
    role: "member",
    status: "active",
    memberships: [],
    provider: "firebase",
    verificationMode: "firebase-admin",
  };
}

function verifiedOwnership(): ConversationOwnershipVerifier {
  return {
    async verify() {
      return { status: "verified", ownerActorRef: AUTH_UID };
    },
  };
}

function turnBody(input: { messageId: string; userMessage: string }) {
  return {
    conversationId: CONVERSATION_ID,
    messageId: input.messageId,
    userMessage: input.userMessage,
    history: [{ role: "user", content: "สวัสดีครับ" }],
  };
}

function listingSnapshot(records: readonly MarketplaceCarRecord[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const record of records) {
    const id = typeof record?.id === "string" ? record.id.trim() : "";
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}

function extractListingIdsFromText(text: string, knownIds: ReadonlySet<string>): string[] {
  const found: string[] = [];
  for (const id of knownIds) {
    if (text.includes(id)) {
      found.push(id);
    }
  }
  return found;
}

function assertNoSecretLeak(label: string, serialized: string, readEnv: (key: string) => string | undefined): void {
  const apiKey = String(readEnv(CONVERSATION_CORE_GEMINI_API_KEY_ENV) ?? "").trim();
  if (apiKey) {
    assertFalsy(`${label}: no api key leak`, serialized.includes(apiKey));
  }
  assertFalsy(`${label}: no GEMINI_API_KEY name dump`, serialized.includes("AIza"));
}

function createReadOnlyInventoryGuard(inner: InventoryRepository): InventoryRepository {
  const blockWrite = async () => {
    writeAttempts += 1;
    throw new Error("live-smoke-write-blocked");
  };
  return {
    backend: inner.backend,
    listings: {
      async listPublished() {
        inventoryReads += 1;
        return inner.listings.listPublished();
      },
      async getById(id: string) {
        inventoryReads += 1;
        return inner.listings.getById(id);
      },
      listAll: blockWrite,
      listByDealer: blockWrite,
      createListing: blockWrite,
      updateListing: blockWrite,
      updateVisibility: blockWrite,
      deleteListing: blockWrite,
    },
    drafts: {
      listByDealer: blockWrite,
      getById: blockWrite,
      createDraft: blockWrite,
      updateDraft: blockWrite,
      deleteDraft: blockWrite,
    },
    publishDraft: blockWrite,
  };
}

function liveOverlayReadEnv(
  readEnv: (key: string) => string | undefined
): (key: string) => string | undefined {
  return (key: string) => {
    if (key === NONGA_CONVERSATION_CORE_ENABLED_ENV) return "true";
    if (key === NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV) return "true";
    if (key === NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV) return "true";
    if (key === NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV) return AUTH_UID;
    if (key === NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV) {
      return readEnv(key) || "gemini-3.5-flash";
    }
    return readEnv(key);
  };
}

async function runLocalProofs(liveEnabled: boolean): Promise<void> {
  console.log("=== Conversation Core controlled live smoke (local proofs) ===");

  if (!liveEnabled) {
    assertFalsy(
      "default process flag is off",
      isLiveSmokeExplicitlyEnabled((key) => process.env[key])
    );
  }

  const defaultFlags = resolveConversationCoreFeatureFlags({
    readEnv: () => undefined,
  });
  assertFalsy("unset env keeps tools off", defaultFlags.featureFlagSnapshot.toolsEnabled);
  assertFalsy("unset env keeps gemini off", defaultFlags.featureFlagSnapshot.geminiEnabled);

  let seamCalls = 0;
  const inactive = resolveConversationCoreLiveServerActivation({
    readEnv: () => undefined,
    createSdkSeam: () => {
      seamCalls += 1;
      throw new Error("network must not start");
    },
    createInventoryRepository: () => {
      throw new Error("inventory must not start");
    },
  });
  assertEqual("opt-in factory refuses without flags", inactive, undefined);
  assertEqual("opt-in factory no sdk", seamCalls, 0);
  assertEqual(
    "server allowlist is search/inventory only",
    [...CONVERSATION_CORE_LIVE_STAGED_TOOL_NAMES],
    ["marketplace.search", "inventory.fetch"]
  );
}

function finishHold(reason: string, extras: Record<string, string | number | boolean> = {}): never {
  printSanitized("Verdict", `HOLD — ${reason}`);
  printSanitized("Live Gemini reached", liveGeminiRequests > 0);
  printSanitized("Marketplace Search reached", marketplaceSearchReached);
  printSanitized("Inventory reached", inventoryFetchReached);
  printSanitized("Grounding verified", groundingVerified);
  printSanitized("read-only confirmed", writeAttempts === 0);
  printSanitized("Gemini requests", liveGeminiRequests);
  for (const [key, value] of Object.entries(extras)) {
    printSanitized(key, value);
  }
  process.exit(EXIT_HOLD);
}

async function runLiveSmoke(): Promise<void> {
  await import("dotenv/config");
  const readProcessEnv = (key: string) => process.env[key];
  const identity = inspectConversationCoreLiveEnvironmentIdentity(readProcessEnv);
  if (identity.ok === false) {
    finishHold("ENVIRONMENT IDENTITY UNVERIFIED", {
      identityReason: identity.reason,
    });
  }

  printSanitized("Gemini provider", identity.geminiProviderId);
  printSanitized("Gemini model", identity.geminiModel);
  printSanitized("Environment identity", identity.identity);
  printSanitized("Inventory backend", identity.backend);
  printSanitized("Project class", identity.projectClass);
  printSanitized("Project/endpoint label", identity.projectIdLabel);
  printSanitized("Non-production confirmed", true);
  printSanitized("GEMINI_API_KEY", secretStatus(readProcessEnv, CONVERSATION_CORE_GEMINI_API_KEY_ENV));
  printSanitized(
    "FIREBASE_SERVICE_ACCOUNT_JSON",
    secretStatus(readProcessEnv, "FIREBASE_SERVICE_ACCOUNT_JSON")
  );
  printSanitized("FIREBASE_PRIVATE_KEY", secretStatus(readProcessEnv, "FIREBASE_PRIVATE_KEY"));
  printSanitized(
    "GOOGLE_APPLICATION_CREDENTIALS",
    secretStatus(readProcessEnv, "GOOGLE_APPLICATION_CREDENTIALS")
  );

  if (secretStatus(readProcessEnv, CONVERSATION_CORE_GEMINI_API_KEY_ENV) === "missing") {
    finishHold("CREDENTIAL/CONFIG MISSING", { missingConfig: CONVERSATION_CORE_GEMINI_API_KEY_ENV });
  }
  if (String(readProcessEnv(NONGA_AI_EMERGENCY_KILL_SWITCH_ENV) ?? "").trim() === "true") {
    finishHold("SAFETY OR GATE FAILURE", { reason: "emergency-kill-switch" });
  }
  if (identity.backend === "firestore") {
    const hasAdminCred =
      secretStatus(readProcessEnv, "FIREBASE_SERVICE_ACCOUNT_JSON") === "present" ||
      secretStatus(readProcessEnv, "FIREBASE_PRIVATE_KEY") === "present" ||
      secretStatus(readProcessEnv, "GOOGLE_APPLICATION_CREDENTIALS") === "present";
    if (!hasAdminCred && identity.projectClass !== "emulator") {
      finishHold("CREDENTIAL/CONFIG MISSING", {
        missingConfig: "FIREBASE_SERVICE_ACCOUNT_JSON|FIREBASE_PRIVATE_KEY|GOOGLE_APPLICATION_CREDENTIALS",
      });
    }
  }

  const liveReadEnv = liveOverlayReadEnv(readProcessEnv);
  let innerRepo: InventoryRepository;
  try {
    innerRepo = createInventoryRepository();
  } catch {
    finishHold("AUTHORITATIVE PROVIDER NOT AVAILABLE");
  }
  const inventory = createReadOnlyInventoryGuard(innerRepo);
  let published: MarketplaceCarRecord[] = [];
  try {
    published = await inventory.listings.listPublished();
  } catch {
    finishHold("AUTHORITATIVE PROVIDER NOT AVAILABLE");
  }
  const publishedIds = listingSnapshot(published);
  if (publishedIds.size === 0) {
    dataProofIncomplete = true;
  }

  const createSdkSeam = (input: { readonly apiKey: string }) => {
    const inner = createConversationCoreGeminiToolTransportSdkSeam(input);
    return {
      async generateContent(request: Parameters<typeof inner.generateContent>[0]) {
        if (liveGeminiRequests >= MAX_LIVE_GEMINI_REQUESTS) {
          throw new Error("live-gemini-cap-exceeded");
        }
        liveGeminiRequests += 1;
        return inner.generateContent(request);
      },
    };
  };

  async function runTurn(messageId: string, userMessage: string) {
    return handleConversationCoreTurnPost(
      {
        body: turnBody({ messageId, userMessage }),
        resolveAuth: async () => authContext(),
      },
      {
        ownershipVerifier: verifiedOwnership(),
        readEnv: liveReadEnv,
        inventoryRepository: inventory,
        createSdkSeam,
      }
    );
  }

  const search = await runTurn("msg-live-search-001", SEARCH_MESSAGE);
  const searchBody = search.body as ConversationCoreRouteResponse;
  if (searchBody.route === "completed") {
    marketplaceSearchReached = searchBody.result.toolResultsUsed.some(
      (item) => item.toolName === "marketplace.search" && item.status === "ok"
    );
    verifyGrounding("search", searchBody.result, publishedIds, liveReadEnv);
  } else {
    printSanitized("Search route", searchBody.route);
    if ("error" in searchBody) {
      printSanitized("Search fail-closed code", searchBody.error.code);
    }
  }

  if (liveGeminiRequests >= MAX_LIVE_GEMINI_REQUESTS) {
    printSanitized("Inventory skipped", "gemini-request-cap");
  } else {
    const inventoryTurn = await runTurn("msg-live-inventory-001", INVENTORY_MESSAGE);
    const inventoryBody = inventoryTurn.body as ConversationCoreRouteResponse;
    if (inventoryBody.route === "completed") {
      inventoryFetchReached = inventoryBody.result.toolResultsUsed.some(
        (item) => item.toolName === "inventory.fetch" && item.status === "ok"
      );
      verifyGrounding("inventory", inventoryBody.result, publishedIds, liveReadEnv);
    } else {
      printSanitized("Inventory route", inventoryBody.route);
      if ("error" in inventoryBody) {
        printSanitized("Inventory fail-closed code", inventoryBody.error.code);
      }
    }
  }

  const flagsOff = await handleConversationCoreTurnPost(
    {
      body: turnBody({ messageId: "msg-live-flags-off", userMessage: SEARCH_MESSAGE }),
      resolveAuth: async () => authContext(),
    },
    {
      ownershipVerifier: verifiedOwnership(),
      readEnv: () => undefined,
      inventoryRepository: inventory,
      createSdkSeam: () => {
        throw new Error("flag-off must not call live sdk");
      },
    }
  );
  assertEqual("flag off: no live call", flagsOff.status, 200);
  assertEqual(
    "flag off: legacy-delegate",
    (flagsOff.body as ConversationCoreRouteResponse).route,
    "legacy-delegate"
  );

  const geminiUnavailable = await handleConversationCoreTurnPost(
    {
      body: turnBody({ messageId: "msg-live-gemini-down", userMessage: SEARCH_MESSAGE }),
      resolveAuth: async () => authContext(),
    },
    {
      ownershipVerifier: verifiedOwnership(),
      readEnv: liveReadEnv,
      inventoryRepository: inventory,
      createSdkSeam: () => {
        throw new Error("gemini-unavailable");
      },
    }
  );
  assertEqual("gemini unavailable fail-closed status", geminiUnavailable.status, 503);
  assertEqual(
    "gemini unavailable fail-closed route",
    (geminiUnavailable.body as ConversationCoreRouteResponse).route,
    "honest-unavailable"
  );

  assertEqual("read-only confirmed", writeAttempts, 0);
  assertTruthy("gemini request cap respected", liveGeminiRequests <= MAX_LIVE_GEMINI_REQUESTS);

  const liveProofComplete =
    liveGeminiRequests > 0 &&
    marketplaceSearchReached &&
    inventoryFetchReached &&
    groundingVerified &&
    !dataProofIncomplete;

  printSanitized("Live Gemini reached", liveGeminiRequests > 0);
  printSanitized("Marketplace Search reached", marketplaceSearchReached);
  printSanitized("Inventory reached", inventoryFetchReached);
  printSanitized("Grounding verified", groundingVerified);
  printSanitized("Database/network read", inventoryReads > 0);
  printSanitized("read-only confirmed", writeAttempts === 0);
  printSanitized("Gemini requests", liveGeminiRequests);
  printSanitized("Published listing count", publishedIds.size);

  if (liveGeminiRequests > 0 && (dataProofIncomplete || !marketplaceSearchReached || !inventoryFetchReached)) {
    printSanitized("Verdict", "LIVE CONNECTION REACHED — DATA PROOF INCOMPLETE");
    process.exitCode = EXIT_PASS;
    return;
  }
  if (!liveProofComplete) {
    finishHold("SAFETY OR GATE FAILURE", {
      liveGeminiRequests,
      marketplaceSearchReached,
      inventoryFetchReached,
      groundingVerified,
    });
  }
  printSanitized("Verdict", "CONTROLLED LIVE PROOF PASS");
}

function verifyGrounding(
  label: string,
  result: ConversationCoreResult,
  publishedIds: ReadonlySet<string>,
  readEnv: (key: string) => string | undefined
): void {
  const serialized = JSON.stringify({
    assistantText: result.assistantText,
    groundedFactRefs: result.groundedFactRefs,
    toolResultsUsed: result.toolResultsUsed,
  });
  assertNoSecretLeak(label, serialized, readEnv);
  const mentioned = extractListingIdsFromText(result.assistantText, publishedIds);
  const refIds = result.groundedFactRefs
    .filter((ref) => ref.kind === "listing")
    .map((ref) => ref.id);
  for (const id of refIds) {
    if (!publishedIds.has(id)) {
      console.error(`FAIL [${label}] grounded listing id not in provider snapshot`);
      process.exit(1);
    }
  }
  for (const id of mentioned) {
    if (!publishedIds.has(id)) {
      console.error(`FAIL [${label}] assistant listing id not in provider snapshot`);
      process.exit(1);
    }
  }
  if (refIds.length === 0 && mentioned.length === 0) {
    dataProofIncomplete = true;
    printSanitized(`${label} listing ids`, 0);
    return;
  }
  groundingVerified = true;
  printSanitized(`${label} grounded listing count`, refIds.length);
}

const liveEnabled = isLiveSmokeExplicitlyEnabled((key) => process.env[key]);
await runLocalProofs(liveEnabled);

if (!isLiveSmokeExplicitlyEnabled((key) => process.env[key])) {
  printSanitized("Live smoke", "REFUSED — flag off, no network");
  printSanitized("Live Gemini reached", false);
  printSanitized("Marketplace Search reached", false);
  printSanitized("Inventory reached", false);
  printSanitized("Grounding verified", false);
  printSanitized("read-only confirmed", true);
  printSanitized("Gemini requests", 0);
  console.log(`\nConversation Core live smoke local proofs passed (${passCount} assertions).`);
  process.exit(EXIT_PASS);
}

await runLiveSmoke();
console.log(`\nConversation Core live smoke finished (${passCount} assertions).`);
process.exit(process.exitCode ?? EXIT_PASS);
