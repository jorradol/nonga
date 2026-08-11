/**
 * WP-V3-09R — Prove vehicleContext reaches system instruction via thin runtime.
 * Run: npx tsx scripts/test-chat-v3-vehicle-context-runtime.mts
 * Does NOT call Live Gemini.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildChatV3VehicleContextFromWorkspace } from "../src/components/chat-v3/adapters/useChatV3LayoutState.ts";
import type { ChatV3WorkspaceItem } from "../src/components/chat-v3/contracts/chatV3Contracts.ts";
import { runChatV3Conversation } from "../src/services/ai/chat-v3/chatV3ConversationService.ts";
import {
  createFakeChatV3Provider,
  getLastFakeChatV3ProviderRequest,
  resetLastFakeChatV3ProviderRequest,
} from "../src/services/ai/chat-v3/chatV3ProviderAdapter.ts";
import {
  getChatV3GeminiSdkNetworkCallCount,
  resetChatV3GeminiSdkNetworkCallCount,
} from "../src/services/ai/chat-v3/chatV3GeminiClient.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS — ${message}`);
    return;
  }
  failed += 1;
  console.error(`FAIL — ${message}`);
}

function workspaceVehicle(
  id: string,
  conversationId: string,
  title: string,
  order: number,
  payload: Record<string, unknown> = {}
): ChatV3WorkspaceItem {
  const now = new Date().toISOString();
  return {
    id,
    conversationId,
    type: "VEHICLE",
    title,
    summary: `สรุป ${title}`,
    payload,
    sourceMessageIds: [],
    order,
    creationMode: "AUTO_CREATE",
    confirmationState: "NOT_REQUIRED",
    editable: true,
    createdAt: now,
    updatedAt: now,
  };
}

resetChatV3GeminiSdkNetworkCallCount();
resetLastFakeChatV3ProviderRequest();

const convId = "conv-v3-09r";
const fortuner = workspaceVehicle("veh-a", convId, "Toyota Fortuner 2019", 1, {
  year: "2019",
  fuel: "diesel",
});
const crv = workspaceVehicle("veh-b", convId, "Honda CR-V 2020", 2, {
  year: "2020",
});

// Layout helper: selected vehicle context
{
  const ctx = buildChatV3VehicleContextFromWorkspace(
    [fortuner, crv],
    convId,
    "veh-a"
  );
  assert(
    ctx?.selectedVehicleId === "veh-a" &&
      ctx.vehicles.length === 2 &&
      ctx.vehicles[0].label === "Toyota Fortuner 2019" &&
      ctx.vehicles[0].facts?.year === "2019",
    "layout maps workspace VEHICLE + selection into vehicleContext"
  );
}

// Layout helper: multi vehicle, no selection
{
  const ctx = buildChatV3VehicleContextFromWorkspace([fortuner, crv], convId, null);
  assert(
    ctx?.selectedVehicleId === null && ctx.vehicles.length === 2,
    "layout keeps multiple vehicles without inventing a selection"
  );
}

// Layout helper: no VEHICLE cards
{
  const nonVehicle: ChatV3WorkspaceItem = {
    ...fortuner,
    id: "ws-cmp",
    type: "COMPARISON",
    title: "ตารางเทียบ",
  };
  const ctx = buildChatV3VehicleContextFromWorkspace([nonVehicle], convId, "ws-cmp");
  assert(
    ctx === undefined,
    "layout emits no vehicleContext when workspace has no VEHICLE cards"
  );
}

async function captureInstruction(input: {
  message: string;
  vehicleContext?: {
    selectedVehicleId?: string | null;
    vehicles: Array<{
      id: string;
      label: string;
      summary?: string;
      facts?: Record<string, string>;
    }>;
  };
}): Promise<string> {
  resetLastFakeChatV3ProviderRequest();
  const provider = createFakeChatV3Provider({
    behavior: "success",
    contentPrefix: "คำตอบทดสอบ",
  });
  const result = await runChatV3Conversation({
    rawRequest: {
      conversationId: convId,
      message: input.message,
      history: [],
      expertMode: "BUYING",
      ...(input.vehicleContext ? { vehicleContext: input.vehicleContext } : {}),
    },
    environment: "test",
    provider,
    allowFakeProvider: true,
  });
  assert(result.success === true, `service succeeds for: ${input.message.slice(0, 24)}`);
  const captured = getLastFakeChatV3ProviderRequest();
  return captured?.systemInstruction ?? "";
}

// 1) Selected vehicle reaches system instruction
{
  const instruction = await captureInstruction({
    message: "คันนี้เหมาะกับครอบครัวไหม",
    vehicleContext: {
      selectedVehicleId: "veh-a",
      vehicles: [
        {
          id: "veh-a",
          label: "Toyota Fortuner 2019",
          summary: "SUV 7 ที่นั่ง",
          facts: { year: "2019", fuel: "diesel" },
        },
        {
          id: "veh-b",
          label: "Honda CR-V 2020",
          facts: { year: "2020" },
        },
      ],
    },
  });
  assert(
    instruction.includes("Toyota Fortuner 2019") &&
      instruction.includes("veh-a") &&
      instruction.includes("year: 2019") &&
      /รถที่คำอ้างอิงน่าจะหมายถึง: Toyota Fortuner 2019/.test(instruction),
    "1) selected vehicle + คันนี้ lands in system instruction"
  );
}

// 2) Single vehicle — คันนี้ resolves without guessing extra specs
{
  const instruction = await captureInstruction({
    message: "คันนี้กินน้ำมันไหม",
    vehicleContext: {
      selectedVehicleId: null,
      vehicles: [
        {
          id: "veh-a",
          label: "Toyota Fortuner 2019",
          facts: { year: "2019" },
        },
      ],
    },
  });
  assert(
    instruction.includes("Toyota Fortuner 2019") &&
      /resolved|รถที่คำอ้างอิงน่าจะหมายถึง: Toyota Fortuner 2019/.test(instruction) &&
      !/2\.8|cc 2800|ราคาตลาด 1,/.test(instruction),
    "2) single-vehicle คันนี้ has correct context without invented specs"
  );
}

// 3) Multi vehicle, no selection — do not auto-pick
{
  const instruction = await captureInstruction({
    message: "คันนี้ราคาเท่าไหร่",
    vehicleContext: {
      selectedVehicleId: null,
      vehicles: [
        { id: "veh-a", label: "Toyota Fortuner 2019" },
        { id: "veh-b", label: "Honda CR-V 2020" },
      ],
    },
  });
  assert(
    /กำกวม|คันใด|รถคันใด/.test(instruction) &&
      !/รถที่คำอ้างอิงน่าจะหมายถึง:/.test(instruction),
    "3) multi-vehicle without selection does not resolve a car by itself"
  );
}

// 4) No vehicle workspace — do not invent vehicles
{
  const instruction = await captureInstruction({
    message: "แนะนำรถครอบครัวหน่อย",
  });
  assert(
    /ยังไม่มีรายการรถในบริบท|ห้ามสมมติคันเฉพาะ/.test(instruction) &&
      !/Toyota Fortuner 2019|Honda CR-V 2020|id=veh-/.test(instruction),
    "4) without vehicleContext instruction does not invent vehicle rows"
  );
}

// 5) chat-v2 isolation (structural)
{
  const service = fs.readFileSync(
    path.join(root, "src/services/ai/chat-v3/chatV3ConversationService.ts"),
    "utf8"
  );
  const client = fs.readFileSync(
    path.join(root, "src/components/chat-v3/adapters/chatV3ConversationClient.ts"),
    "utf8"
  );
  const layout = fs.readFileSync(
    path.join(root, "src/components/chat-v3/adapters/useChatV3LayoutState.ts"),
    "utf8"
  );
  assert(
    !service.includes("chat-v2") &&
      !client.includes("/chat-v2") &&
      !layout.includes('from "../../chat/') &&
      !layout.includes("chatSearchOrchestrator") &&
      layout.includes("buildChatV3VehicleContextFromWorkspace") &&
      layout.includes("vehicleContext"),
    "5) V.3 vehicleContext path stays isolated from chat-v2"
  );
}

// 6) No Live Gemini / network
{
  assert(
    getChatV3GeminiSdkNetworkCallCount() === 0,
    "6) Gemini SDK network call count remains 0"
  );
}

console.log("");
console.log(`WP-V3-09R vehicleContext runtime: ${passed} passed, ${failed} failed`);
console.log("Confirmed: no Live Gemini call in this script.");
if (failed > 0) {
  process.exitCode = 1;
}
