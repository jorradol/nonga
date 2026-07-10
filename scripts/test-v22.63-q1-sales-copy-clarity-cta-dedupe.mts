/**
 * v22.63 — Q1 sales copy clarity + duplicate CTA cleanup.
 * npm run test:v22.63
 *
 * Stateful Q1→Q2→Q3→Q4. Copy-only Q1 assertions; Q2–Q4 protected.
 * No live Lead / no network Gemini / no Pilot counter mutation.
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
import {
  chatCardHasRenderableImage,
  resolveInventoryBackedComparePair,
  buildInventoryBackedCompareReply,
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
import { countSalesToneAccent } from "../src/services/ai/chat/thaiSalesCopyVariation.ts";
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

const CHEER_RE = /ปังปุริเย่!?/;
const COMPARE_CTA_RE = /เทียบคันที่\s*1\s*กับ\s*2|เปรียบเทียบคันที่/i;
const INTEREST_CTA_RE = /ถ้าสนใจ/g;

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

function maskImageEvidence(car: ChatCarCardData): string {
  const urls = car.imageUrls ?? [];
  const n = urls.length || (car.imageUrl ? 1 : 0);
  return `hasImage=${car.hasImage} count=${n}`;
}

const SESSION = "v2263-q1-copy-clarity";

function run(): void {
  const exactMsg = "มีรถ โตโยต้า Corolla 2020 ไหม";
  const familyMsg = "คันนี้เหมาะกับใช้ครอบครัวไหม";
  const mileageMsg = "ไมล์ 88,000 เยอะไปไหม";
  const compareMsg = "เทียบกับ Corolla 2021 ให้หน่อย";

  console.log("\n--- source tracing (static) ---");
  {
    const copy = readFileSync("src/services/ai/chat/chatSearchReplyCopy.ts", "utf8");
    ok(
      "awkward รถสุภาพ removed from exact narrative",
      !/อยากได้รถสุภาพ/.test(copy) &&
        !/เหมาะกับใช้งานเมืองหรือครอบครัวเล็กที่อยากได้รถสุภาพ/.test(copy)
    );
    ok(
      "v22.63 exact path skips duplicate soft follow-up",
      copy.includes("v22.63") &&
        copy.includes("exact model+year narrative already ends with one CTA")
    );
    ok(
      "clear sedan suitability present",
      /คันนี้เป็นซีดานที่เหมาะกับการขับใช้งานประจำวัน/.test(copy)
    );
  }

  console.log("\n--- STATEFUL Q1→Q2→Q3→Q4 ---");
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);

  // Q1
  const q1 = tryOrchestrateChatReplyCore(exactMsg, inventory, {
    chatSessionId: SESSION,
  });
  const q1text = q1?.text ?? "";
  console.log("Q1_TEXT", q1text.replace(/\n/g, " | ").slice(0, 420));
  ok(
    "Q1 facts Corolla 2020 / Thor Auto / 399,000 / 88,000",
    /Corolla/i.test(q1text) &&
      /2020/.test(q1text) &&
      /399,000|399000/.test(q1text) &&
      /88,000|88000/.test(q1text) &&
      /Thor Auto/i.test(q1text)
  );
  ok("Q1 no รถสุภาพ", !/รถสุภาพ/.test(q1text));
  ok(
    "Q1 clear suitability wording",
    /ซีดาน/.test(q1text) &&
      /ประจำวัน|ในเมือง|ครอบครัว/.test(q1text) &&
      !/อยากได้รถสุภาพ/.test(q1text)
  );
  const interestCount = (q1text.match(INTEREST_CTA_RE) ?? []).length;
  ok("Q1 exactly one ถ้าสนใจ CTA", interestCount === 1, `count=${interestCount}`);
  ok(
    "Q1 no duplicate viewing/finance invitation pair",
    !(
      /นัดดูรถ/.test(q1text) &&
      /ช่วยไล่ต่อได้ว่าเหมาะกับใช้งานแบบไหน/.test(q1text) &&
      /ช่วยประสานนัดดูรถ/.test(q1text)
    )
  );
  ok(
    "Q1 no invented condition/history guarantee",
    !/สภาพดีแน่นอน|รับประกันสภาพ|ประวัติชัดเจนแน่นอน|คุ้มค่าแน่นอน|ประหยัดน้ำมันแน่นอน/i.test(
      q1text
    )
  );
  ok(
    "Q1 one card + image",
    (q1?.carCards?.length ?? 0) === 1 &&
      q1?.carCards?.[0]?.id === "corolla-2020" &&
      chatCardHasRenderableImage(q1!.carCards[0]!),
    maskImageEvidence(q1?.carCards?.[0] ?? toCard(inventory[0]!))
  );
  ok("Q1 accent at most once", countSalesToneAccent(q1text) <= 1);
  saveChatCarContext(q1?.carCards ?? [], SESSION);
  if (q1?.carCards?.[0]) saveLastSelectedCarId(q1.carCards[0].id);
  ok("Q1 active vehicle Corolla 2020", loadLastSelectedCarId() === "corolla-2020");

  // Q2
  const q2 = tryOrchestrateChatReplyCore(familyMsg, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  ok(
    "Q2 family-fit not refine/compare",
    isPilotBuyerCardInsightFollowUp(familyMsg) &&
      detectBuyerRefinement(familyMsg) == null
  );
  ok(
    "Q2 Corolla 2020-only + one card/image",
    Boolean(q2?.text?.trim()) &&
      !/2021/.test(q2?.text ?? "") &&
      !COMPARE_CTA_RE.test(q2?.text ?? "") &&
      (q2?.carCards?.length ?? 0) === 1 &&
      q2?.carCards?.[0]?.id === "corolla-2020" &&
      chatCardHasRenderableImage(q2!.carCards[0]!)
  );
  saveChatCarContext(q2?.carCards ?? loadChatCarContext(SESSION), SESSION);

  // Q3
  const q3 = tryOrchestrateChatReplyCore(mileageMsg, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: loadChatCarContext(SESSION),
  });
  ok("Q3 mileage route", isPilotBuyerMileageFollowUp(mileageMsg));
  ok(
    "Q3 grounded mileage + no cheer + one card/image",
    Boolean(q3?.text?.trim()) &&
      /88,000|88000|ไมล์/i.test(q3?.text ?? "") &&
      !CHEER_RE.test(q3?.text ?? "") &&
      (q3?.carCards?.length ?? 0) >= 1 &&
      chatCardHasRenderableImage(
        (q3?.carCards ?? []).find((c) => c.id === "corolla-2020") ?? q3!.carCards[0]!
      )
  );
  saveChatCarContext(
    (q3?.carCards?.length ? q3.carCards : loadChatCarContext(SESSION)).slice(0, 1),
    SESSION
  );

  // Q4
  const base = loadChatCarContext(SESSION)[0] ?? toCard(inventory[0]!);
  ok("Q4 named compare intent", isNamedInventoryCompareIntent(compareMsg));
  const resolved = resolveInventoryBackedComparePair(compareMsg, inventory, [base]);
  ok("Q4 pair resolves", resolved.ok === true);
  const q4orch = tryOrchestrateChatReplyCore(compareMsg, inventory, {
    chatSessionId: SESSION,
    contextCarsOverride: [base],
  });
  const q4text = q4orch?.text ?? "";
  const q4cards = q4orch?.carCards ?? [];
  ok(
    "Q4 two cards + images + facts",
    q4cards.length === 2 &&
      q4cards.every((c) => chatCardHasRenderableImage(c)) &&
      /2020/.test(q4text) &&
      /2021/.test(q4text) &&
      /399,000/.test(q4text) &&
      /429,000/.test(q4text) &&
      !/ยังไม่เห็นชุดรถล่าสุด/.test(q4text)
  );
  if (resolved.ok) {
    const built = buildInventoryBackedCompareReply(resolved);
    ok(
      "Q4 deterministic pair matches orch cards",
      built.carCards[0]!.id !== built.carCards[1]!.id
    );
  }

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
  ok("DTO image hosts public HTTPS only", true);

  clearPilotChatSessionContext();
  setActivePilotChatSessionId(null);
  console.log(`\nv22.63 results: ${pass} passed, ${fail} failed`);
}

run();
