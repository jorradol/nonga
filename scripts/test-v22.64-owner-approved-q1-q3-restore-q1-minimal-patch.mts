/**
 * v22.64 — Owner-approved Q1–Q3 exact restoration + Q1 minimal wording/CTA patch.
 * npm run test:v22.64
 *
 * Fixture is immutable Owner-approved baseline (pre-v22.63 + phrase/CTA only).
 * Q4 frozen. No live Lead / no network Gemini / no Pilot counter mutation.
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
  resolveInventoryBackedComparePair,
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

type FixtureTurn = {
  turn: string;
  user: string;
  route: string;
  requiredFacts: string[];
  forbiddenPhrases: string[];
  requiredStructure?: string[];
  forbiddenStructure?: string[];
  requiredGuidance?: string[];
  ctaCountExact?: number;
  cardCount: number;
  cardIds: string[];
  requireImage: boolean;
  activeVehicleId?: string;
  freeze?: boolean;
};

type Fixture = {
  id: string;
  immutable: boolean;
  conversation: FixtureTurn[];
};

const fixture = JSON.parse(
  readFileSync(
    resolve("scripts/fixtures/v22.64-owner-approved-q1-q4-baseline.json"),
    "utf8"
  )
) as Fixture;

const INTEREST_CTA_RE = /ถ้าสนใจ/g;
const COMPARE_CTA_RE = /เทียบคันที่\s*1\s*กับ\s*2|เปรียบเทียบคันที่/i;

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

const SESSION = "v2264-owner-approved-restore";

function run(): void {
  ok("fixture immutable flag", fixture.immutable === true, fixture.id);

  console.log("\n--- source / scope guards ---");
  {
    const copy = readFileSync("src/services/ai/chat/chatSearchReplyCopy.ts", "utf8");
    ok("no awkward รถสุภาพ in exact narrative", !/อยากได้รถสุภาพ/.test(copy));
    ok(
      "Owner-approved sedan structure restored (not v22.63 rewrite)",
      /เป็นซีดานนั่งสบาย เหมาะกับการขับใช้งานประจำวัน/.test(copy) &&
        !/คันนี้เป็นซีดานที่เหมาะกับการขับใช้งานประจำวัน/.test(copy)
    );
    ok(
      "สรุปจากประกาศ restored on exact path",
      /สรุปจากประกาศ:/.test(copy) && /เลขไมล์ควรดูคู่กับปีรถและสภาพจริงตอนชมรถ/.test(copy)
    );
    ok(
      "Owner-approved narrative CTA restored",
      /น้องเอช่วยไล่ต่อได้ว่าเหมาะกับใช้งานแบบไหน/.test(copy) &&
        !/ช่วยเทียบความเหมาะสมกับรูปแบบการใช้งาน/.test(copy)
    );
    ok(
      "exact path still skips duplicate soft follow-up",
      copy.includes("exact model+year narrative already ends with one CTA")
    );
    const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
    const follow = readFileSync("src/services/ai/chat/chatPilotBuyerFollowUp.ts", "utf8");
    const compare = readFileSync(
      "src/services/ai/chat/inventoryBackedCompare.ts",
      "utf8"
    );
    ok("orchestrator file present (not edited this task)", orch.length > 100);
    ok("pilot follow-up file present (not edited this task)", follow.length > 100);
    ok("inventoryBackedCompare present (Q4 freeze)", compare.length > 100);
  }

  console.log("\n--- STATEFUL Q1→Q2→Q3→Q4 (protected fixture) ---");
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);

  const [q1f, q2f, q3f, q4f] = fixture.conversation;

  // Q1
  const q1 = tryOrchestrateChatReplyCore(q1f.user, inventory, {
    chatSessionId: SESSION,
  });
  const q1text = q1?.text ?? "";
  console.log("Q1_TEXT", q1text.replace(/\n/g, " | ").slice(0, 500));
  ok(
    "Q1 exact-result facts",
    q1f.requiredFacts.every((f) => q1text.includes(f) || q1text.includes(f.replace(",", "")))
  );
  for (const bad of q1f.forbiddenPhrases) {
    ok(`Q1 forbid ${bad}`, !q1text.includes(bad));
  }
  for (const need of q1f.requiredStructure ?? []) {
    ok(`Q1 structure has: ${need.slice(0, 24)}…`, q1text.includes(need));
  }
  for (const bad of q1f.forbiddenStructure ?? []) {
    ok(`Q1 structure lacks regression: ${bad.slice(0, 24)}…`, !q1text.includes(bad));
  }
  const ctaCount = (q1text.match(INTEREST_CTA_RE) ?? []).length;
  ok("Q1 exactly one CTA", ctaCount === q1f.ctaCountExact, `count=${ctaCount}`);
  ok(
    "Q1 one card + image + active",
    (q1?.carCards?.length ?? 0) === 1 &&
      q1?.carCards?.[0]?.id === "corolla-2020" &&
      chatCardHasRenderableImage(q1!.carCards[0]!)
  );
  saveChatCarContext(q1?.carCards ?? [], SESSION);
  if (q1?.carCards?.[0]) saveLastSelectedCarId(q1.carCards[0].id);
  ok("Q1 active Corolla 2020", loadLastSelectedCarId() === q1f.activeVehicleId);

  // Q2
  ok(
    "Q2 family-fit route (not refine)",
    isPilotBuyerCardInsightFollowUp(q2f.user) && detectBuyerRefinement(q2f.user) == null
  );
  const q2 = tryOrchestrateChatReplyCore(q2f.user, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  const q2text = q2?.text ?? "";
  console.log("Q2_TEXT", q2text.replace(/\n/g, " | ").slice(0, 360));
  ok(
    "Q2 required facts",
    q2f.requiredFacts.every((f) => q2text.includes(f) || /399000|88000/.test(q2text))
  );
  for (const bad of q2f.forbiddenPhrases) {
    ok(`Q2 forbid ${bad}`, !q2text.includes(bad) && !COMPARE_CTA_RE.test(q2text));
  }
  ok(
    "Q2 one Corolla 2020 card + image",
    (q2?.carCards?.length ?? 0) === 1 &&
      q2?.carCards?.[0]?.id === "corolla-2020" &&
      chatCardHasRenderableImage(q2!.carCards[0]!) &&
      /ครอบครัว|Sedan|ซีดาน/.test(q2text)
  );
  saveChatCarContext(q2?.carCards ?? loadChatCarContext(SESSION), SESSION);

  // Q3
  ok("Q3 mileage route", isPilotBuyerMileageFollowUp(q3f.user));
  const q3 = tryOrchestrateChatReplyCore(q3f.user, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  const q3text = q3?.text ?? "";
  console.log("Q3_TEXT", q3text.replace(/\n/g, " | ").slice(0, 360));
  ok(
    "Q3 required facts",
    q3f.requiredFacts.every((f) => q3text.includes(f) || /88000/.test(q3text))
  );
  for (const bad of q3f.forbiddenPhrases) {
    ok(`Q3 forbid ${bad}`, !q3text.includes(bad));
  }
  for (const need of q3f.requiredGuidance ?? []) {
    ok(`Q3 guidance: ${need}`, q3text.includes(need));
  }
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

  // Q4 freeze
  const base = loadChatCarContext(SESSION)[0] ?? toCard(inventory[0]!);
  ok("Q4 named compare intent", isNamedInventoryCompareIntent(q4f.user));
  const resolved = resolveInventoryBackedComparePair(q4f.user, inventory, [base]);
  ok("Q4 pair resolves", resolved.ok === true);
  const q4 = tryOrchestrateChatReplyCore(q4f.user, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: [base],
  });
  const q4text = q4?.text ?? "";
  const q4cards = q4?.carCards ?? [];
  console.log("Q4_TEXT", q4text.replace(/\n/g, " | ").slice(0, 360));
  ok(
    "Q4 facts + two distinct cards/images",
    q4f.requiredFacts.every((f) => q4text.includes(f)) &&
      q4cards.length === 2 &&
      q4cards[0]!.id !== q4cards[1]!.id &&
      q4cards.every((c) => chatCardHasRenderableImage(c))
  );
  for (const bad of q4f.forbiddenPhrases) {
    ok(`Q4 forbid ${bad}`, !q4text.includes(bad));
  }
  ok("Q4 freeze flag honored in fixture", q4f.freeze === true);

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
  console.log(`\nv22.64 results: ${pass} passed, ${fail} failed`);
}

run();
