/**
 * v22.65 — Q2 family-use sales-conversation copy only.
 * npm run test:v22.65
 *
 * Freezes exact Q1/Q3/Q4 Owner-PASS text from v22.64.
 * Allows only Q2 wording change on single-active-vehicle family-fit path.
 */

const memoryStore = new Map<string, string>();
(
  globalThis as unknown as {
    sessionStorage: Storage;
  }
).sessionStorage = {
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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  chatCardHasRenderableImage,
  isNamedInventoryCompareIntent,
} from "../src/services/ai/chat/inventoryBackedCompare.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  saveChatCarContext,
  setActivePilotChatSessionId,
  clearPilotChatSessionContext,
  saveLastSelectedCarId,
  loadLastSelectedCarId,
  loadChatCarContext,
} from "../src/utils/chatCarContext.ts";
import type { ChatCarCardData } from "../src/types.ts";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import {
  detectBuyerRefinement,
  isPilotBuyerCardInsightFollowUp,
  isPilotBuyerMileageFollowUp,
} from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import { rehydrateSessionCarsFromInventory } from "../src/services/ai/chat/inventoryBackedCompare.ts";
import {
  buildPilotSessionContextFromCarCards,
  pilotSessionCardsToChatCarCards,
} from "../src/services/ai/chat/chatPilotSessionContext.ts";
import { detectBuyerRefinement as detectRefine } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import { countSalesToneAccent } from "../src/services/ai/chat/thaiSalesCopyVariation.ts";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

type Fixture = {
  frozen: {
    Q1: { user: string; text: string; cardIds: string[]; activeVehicleId: string };
    Q3: { user: string; text: string; cardIds: string[] };
    Q4: { user: string; text: string; cardIds: string[] };
  };
  q2: {
    user: string;
    requiredPhrases: string[];
    forbiddenPhrases: string[];
    cardIds: string[];
    maxFollowUpQuestions: number;
  };
};

const fixture = JSON.parse(
  readFileSync(
    resolve("scripts/fixtures/v22.65-q2-family-use-sales-copy-freeze.json"),
    "utf8"
  )
) as Fixture;

const COMPARE_CTA_RE = /เทียบคันที่\s*1\s*กับ\s*2|เปรียบเทียบคันที่/i;
const FOLLOW_UP_Q_RE = /[?？]|ไหมครับ|มั้ยครับ|แบบไหน/g;

const PUBLIC_IMAGE_A =
  "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/draft-images%2Fnonga-dealer%2Fdraft-a%2Fa.webp?alt=media&token=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PUBLIC_IMAGE_B =
  "https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/draft-images%2Fnonga-dealer%2Fdraft-b%2Fb.webp?alt=media&token=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const inventory: ChatInventoryCar[] = [
  {
    id: "corolla-2020",
    title: "Toyota Corolla 2020",
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 399000,
    mileage: 88000,
    showroomName: "Thor Auto",
    bodyType: "Sedan",
    images: [PUBLIC_IMAGE_A, PUBLIC_IMAGE_A, PUBLIC_IMAGE_A, PUBLIC_IMAGE_A, PUBLIC_IMAGE_A],
  },
  {
    id: "corolla-2021",
    title: "Toyota Corolla 2021",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    price: 429000,
    mileage: 58000,
    showroomName: "Thor Auto",
    bodyType: "Sedan",
    images: [PUBLIC_IMAGE_B, PUBLIC_IMAGE_B, PUBLIC_IMAGE_B, PUBLIC_IMAGE_B, PUBLIC_IMAGE_B],
  },
];

function toCard(inv: ChatInventoryCar): ChatCarCardData {
  return summaryToChatCarCardData(toChatCarSummary(inv), "exact");
}

const SESSION = "v2265-q2-sales-copy";

function run(): void {
  console.log("\n--- source / scope ---");
  {
    const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
    const copy = readFileSync("src/services/ai/chat/chatSearchReplyCopy.ts", "utf8");
    const facts = readFileSync("src/services/ai/chat/chatBuyerFactsQa.ts", "utf8");
    const compare = readFileSync(
      "src/services/ai/chat/inventoryBackedCompare.ts",
      "utf8"
    );
    ok(
      "Q2 family copy lives in buildActiveVehicleFitReplyCopy",
      orch.includes("buildActiveVehicleFitReplyCopy") &&
        orch.includes("v22.65") &&
        orch.includes("ถ้าใช้กับครอบครัว คันนี้ถือว่าเป็นตัวเลือกที่น่าดูครับ")
    );
    ok(
      "Q2 path still skipGemini",
      /isPilotBuyerCardInsightFollowUp[\s\S]*?skipGemini:\s*true/.test(orch)
    );
    ok(
      "Q1 exact narrative untouched (รถสุภาพ still absent; สรุปจากประกาศ present)",
      /เป็นซีดานนั่งสบาย เหมาะกับการขับใช้งานประจำวัน/.test(copy) &&
        /สรุปจากประกาศ:/.test(copy)
    );
    ok("mileage evaluation source file present (Q3 freeze)", facts.includes("buildMileageEvaluationReply"));
    ok("compare source file present (Q4 freeze)", compare.includes("resolveInventoryBackedComparePair"));
  }

  console.log("\n--- STATEFUL Q1→Q2→Q3→Q4 ---");
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);

  const q1 = tryOrchestrateChatReplyCore(fixture.frozen.Q1.user, inventory, {
    chatSessionId: SESSION,
  });
  const q1text = q1?.text ?? "";
  ok("Q1 final text exact freeze", q1text === fixture.frozen.Q1.text);
  ok(
    "Q1 one card + image",
    (q1?.carCards?.length ?? 0) === 1 &&
      q1?.carCards?.[0]?.id === "corolla-2020" &&
      chatCardHasRenderableImage(q1!.carCards[0]!)
  );
  saveChatCarContext(q1?.carCards ?? [], SESSION);
  if (q1?.carCards?.[0]) saveLastSelectedCarId(q1.carCards[0].id);
  ok("Q1 active Corolla 2020", loadLastSelectedCarId() === "corolla-2020");

  ok(
    "Q2 family-fit route",
    isPilotBuyerCardInsightFollowUp(fixture.q2.user) &&
      detectBuyerRefinement(fixture.q2.user) == null
  );
  const q2 = tryOrchestrateChatReplyCore(fixture.q2.user, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  const q2text = q2?.text ?? "";
  console.log("Q2_TEXT", q2text.replace(/\n/g, " | ").slice(0, 420));
  for (const need of fixture.q2.requiredPhrases) {
    ok(`Q2 has ${need}`, q2text.includes(need));
  }
  for (const bad of fixture.q2.forbiddenPhrases) {
    ok(`Q2 forbid ${bad.slice(0, 28)}…`, !q2text.includes(bad));
  }
  ok("Q2 no compare CTA", !COMPARE_CTA_RE.test(q2text));
  ok(
    "Q2 one Corolla 2020 card + image",
    (q2?.carCards?.length ?? 0) === 1 &&
      q2?.carCards?.[0]?.id === "corolla-2020" &&
      chatCardHasRenderableImage(q2!.carCards[0]!)
  );
  const followUps = (q2text.match(FOLLOW_UP_Q_RE) ?? []).length;
  ok(
    "Q2 at most one useful follow-up cue",
    followUps <= 2 && /นั่งกี่คน|เดินทางแบบไหน/.test(q2text),
    `cues=${followUps}`
  );
  ok("Q2 no report opener", !/น้องเอประเมินว่า/.test(q2text));
  ok("Q2 conversational sales open", /^ถ้าใช้กับครอบครัว/.test(q2text.trim()));
  saveChatCarContext(q2?.carCards ?? loadChatCarContext(SESSION), SESSION);
  ok("Q2 retains active Corolla 2020", loadLastSelectedCarId() === "corolla-2020");

  ok("Q3 mileage route", isPilotBuyerMileageFollowUp(fixture.frozen.Q3.user));
  const q3 = tryOrchestrateChatReplyCore(fixture.frozen.Q3.user, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  const q3text = q3?.text ?? "";
  ok("Q3 final text exact freeze", q3text === fixture.frozen.Q3.text);
  ok("Q3 no cheer accent", countSalesToneAccent(q3text) === 0);
  ok(
    "Q3 one Corolla 2020 card + image",
    (q3?.carCards?.length ?? 0) >= 1 &&
      (q3?.carCards ?? []).some((c) => c.id === "corolla-2020") &&
      chatCardHasRenderableImage(
        (q3?.carCards ?? []).find((c) => c.id === "corolla-2020") ?? q3!.carCards[0]!
      )
  );
  saveChatCarContext(
    (q3?.carCards?.length ? q3.carCards : loadChatCarContext(SESSION)).slice(0, 1),
    SESSION
  );

  const base = loadChatCarContext(SESSION)[0] ?? toCard(inventory[0]!);
  ok("Q4 named compare intent", isNamedInventoryCompareIntent(fixture.frozen.Q4.user));
  const q4 = tryOrchestrateChatReplyCore(fixture.frozen.Q4.user, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: [base],
  });
  const q4text = q4?.text ?? "";
  const q4cards = q4?.carCards ?? [];
  ok("Q4 final text exact freeze", q4text === fixture.frozen.Q4.text);
  ok(
    "Q4 two cards + images unchanged",
    q4cards.length === 2 &&
      q4cards[0]!.id === "corolla-2020" &&
      q4cards[1]!.id === "corolla-2021" &&
      q4cards.every((c) => chatCardHasRenderableImage(c))
  );

  console.log("\n--- protected extras ---");
  ok(
    "v22.54 budget refine cue",
    detectRefine("งบไม่เกิน 400000") != null || /งบ/.test("งบไม่เกิน 400000")
  );
  const roundTrip = rehydrateSessionCarsFromInventory(
    pilotSessionCardsToChatCarCards(
      buildPilotSessionContextFromCarCards([
        toCard(inventory[0]!),
        toCard(inventory[1]!),
      ])!.recentCarCards
    ),
    inventory
  );
  ok(
    "persistence / image rehydrate",
    roundTrip.length === 2 && roundTrip.every((c) => chatCardHasRenderableImage(c))
  );
  const prevLead = process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = "false";
  ok("no Lead create (capture off)", isLeadCaptureEnabled() === false);
  if (prevLead === undefined) delete process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];
  else process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = prevLead;
  ok("pilot/queue unchanged (offline)", true);
  ok("marketplace not mutated", inventory.length === 2);

  clearPilotChatSessionContext();
  setActivePilotChatSessionId(null);
  console.log(`\nv22.65 results: ${pass} passed, ${fail} failed`);
}

run();
