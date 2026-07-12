/**
 * v22.75 — Signed-in active vehicle context contract (owner-browser regression guard)
 * npm run test:v22.75
 *
 * Focus:
 * - Q1→Q4 same-session active vehicle continuity
 * - no budget/no-context regressions on Q2/Q3 when active context exists
 * - readiness/hydration guard contract in useChat lifecycle wiring
 */

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

import { readFileSync } from "node:fs";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  tryOrchestrateChatReplyCore,
} from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  clearPilotChatSessionContext,
  loadChatCarContext,
  loadLastSelectedCarId,
  saveChatCarContext,
  saveLastSelectedCarId,
  setActivePilotChatSessionId,
} from "../src/utils/chatCarContext.ts";

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

const NO_CONTEXT_COMPARE_FALLBACK_RE =
  /ยังไม่เห็นชุดรถล่าสุดให้เทียบในแชทนี้|เทียบคันที่\s*1\s*กับ\s*2/i;

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
    images: ["https://example.com/corolla-2020.webp"],
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
    images: ["https://example.com/corolla-2021.webp"],
  },
];

function assertUseChatLifecycleContract(): void {
  const src = readFileSync("src/hooks/chat/useChat.ts", "utf8");
  const newScopeSegmentStart = src.indexOf("resetChatState();");
  const newScopeSegmentEnd = src.indexOf("if (claimOutcome?.claimed)");
  const newScopeSegment =
    newScopeSegmentStart >= 0 && newScopeSegmentEnd > newScopeSegmentStart
      ? src.slice(newScopeSegmentStart, newScopeSegmentEnd)
      : "";
  ok("lifecycle has hydrate run ref", src.includes("const hydrateRunRef = useRef(0);"));
  ok("lifecycle has stale-run guard", src.includes("const isHydrateRunStale = () =>"));
  ok(
    "loadSessions runs before profile readiness in new-scope hydrate",
    newScopeSegment.indexOf("await loadSessions(chatScope);") >= 0 &&
      newScopeSegment.indexOf("await userService.ensureProfileReady(user.uid);") >= 0 &&
      newScopeSegment.indexOf("await loadSessions(chatScope);") <
        newScopeSegment.indexOf("await userService.ensureProfileReady(user.uid);")
  );
  ok(
    "new-scope hydrate checks stale after loadSessions",
    /await loadSessions\(chatScope\);\s+if \(isHydrateRunStale\(\)\) return;/.test(
      newScopeSegment
    )
  );
  ok(
    "new-scope hydrate checks stale after readiness",
    /await userService\.ensureProfileReady\(user\.uid\);\s+\}\s+if \(isHydrateRunStale\(\)\) return;/.test(
      newScopeSegment
    )
  );
  ok("hydrate callback deps no activePresetId reset trigger", !/\bactivePresetId\b/.test(src.split("], [")[1] ?? ""));
  ok("hydrate callback depends on user uid only", src.includes("user?.uid,"));
}

function runSignedInSequentialContract(): void {
  const sessionId = "v2275-signed-in-seq";
  memoryStore.clear();
  clearPilotChatSessionContext();
  setActivePilotChatSessionId(sessionId);

  const q1 = tryOrchestrateChatReplyCore("มีรถ โตโยต้า Corolla 2020 ไหม", inventory, {
    chatSessionId: sessionId,
  });
  ok("Q1 has deterministic Corolla 2020 text", /Corolla/.test(q1?.text ?? "") && /2020/.test(q1?.text ?? "") && /399,000|399000/.test(q1?.text ?? "") && /88,000|88000/.test(q1?.text ?? ""));
  ok("Q1 has one Corolla 2020 card", (q1?.carCards?.length ?? 0) === 1 && q1?.carCards?.[0]?.id === "corolla-2020");
  saveChatCarContext(q1?.carCards ?? [], sessionId);
  if (q1?.carCards?.[0]?.id) saveLastSelectedCarId(q1.carCards[0].id);
  ok("state after Q1 active vehicle = Corolla 2020", loadLastSelectedCarId() === "corolla-2020");
  ok("state after Q1 session context contains one card", loadChatCarContext(sessionId).length === 1);

  const q2 = tryOrchestrateChatReplyCore("คันนี้เหมาะกับใช้ครอบครัวไหม", inventory, {
    chatSessionId: sessionId,
    contextCarsOverride: loadChatCarContext(sessionId),
  });
  ok("Q2 reuses active Corolla 2020 card", (q2?.carCards?.length ?? 0) === 1 && q2?.carCards?.[0]?.id === "corolla-2020");
  ok("Q2 family branch no budget re-ask", /ครอบครัว/.test(q2?.text ?? "") && !/สะดวกบอกงบประมาณคร่าว ๆ ไหม/.test(q2?.text ?? ""));
  ok("Q2 no no-context compare fallback", !NO_CONTEXT_COMPARE_FALLBACK_RE.test(q2?.text ?? ""));
  ok("Q2 keeps skipGemini deterministic path", q2?.skipGemini === true);
  saveChatCarContext(q2?.carCards ?? [], sessionId);
  ok("state after Q2 active vehicle still Corolla 2020", loadLastSelectedCarId() === "corolla-2020");

  const q3 = tryOrchestrateChatReplyCore("ไมล์ 88,000 เยอะไปไหม", inventory, {
    chatSessionId: sessionId,
    contextCarsOverride: loadChatCarContext(sessionId),
  });
  ok("Q3 reuses active Corolla 2020 card", (q3?.carCards?.length ?? 0) >= 1 && (q3?.carCards ?? []).some((c) => c.id === "corolla-2020"));
  ok("Q3 grounded mileage answer", /88,000|88000|ไมล์/.test(q3?.text ?? "") && !/สะดวกบอกงบประมาณคร่าว ๆ ไหม/.test(q3?.text ?? ""));
  ok("Q3 no no-context compare fallback", !NO_CONTEXT_COMPARE_FALLBACK_RE.test(q3?.text ?? ""));
  saveChatCarContext((q3?.carCards ?? []).slice(0, 1), sessionId);
  ok("state after Q3 active vehicle still Corolla 2020", loadLastSelectedCarId() === "corolla-2020");

  const q4 = tryOrchestrateChatReplyCore("เทียบกับ Corolla 2021 ให้หน่อย", inventory, {
    chatSessionId: sessionId,
    contextCarsOverride: loadChatCarContext(sessionId),
  });
  ok("Q4 compare has 2020 and 2021 cards", (q4?.carCards?.length ?? 0) === 2 && (q4?.carCards ?? []).some((c) => c.id === "corolla-2020") && (q4?.carCards ?? []).some((c) => c.id === "corolla-2021"));
  ok("Q4 compare text has both facts", /2020/.test(q4?.text ?? "") && /2021/.test(q4?.text ?? "") && /399,000|399000/.test(q4?.text ?? "") && /429,000|429000/.test(q4?.text ?? ""));
}

function runFreshNoContextSafetyChecks(): void {
  const fresh = "v2275-fresh";
  clearPilotChatSessionContext();
  memoryStore.clear();
  setActivePilotChatSessionId(fresh);

  const family = tryOrchestrateChatReplyCore("คันนี้เหมาะกับใช้ครอบครัวไหม", inventory, {
    chatSessionId: fresh,
  });
  ok("fresh no-context family is safe and no invented car", Boolean(family?.text?.trim()) && (family?.carCards?.length ?? 0) === 0 && !/Corolla 2020|Corolla 2021/.test(family?.text ?? ""));

  const mileage = tryOrchestrateChatReplyCore("ไมล์ 88,000 เยอะไปไหม", inventory, {
    chatSessionId: fresh,
  });
  ok("fresh no-context mileage does not invent active card", mileage == null || (mileage.carCards.length === 0 && !/Corolla 2020|Corolla 2021/.test(mileage.text)));
}

function runScopeResetContracts(): void {
  const s1 = "v2275-scope-s1";
  const s2 = "v2275-scope-s2";
  clearPilotChatSessionContext();
  memoryStore.clear();
  setActivePilotChatSessionId(s1);
  saveChatCarContext(
    [
      {
        id: "corolla-2020",
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        price: 399000,
        mileage: 88000,
        condition: "used",
        bodyClass: "sedan",
        bodyClassLabel: "Sedan",
        hasImage: true,
        imageUrls: ["https://example.com/corolla-2020.webp"],
        detailPath: "/cars/corolla-2020",
        matchKind: "exact" as const,
      },
    ],
    s1
  );
  saveLastSelectedCarId("corolla-2020");
  ok("same session keeps active context", loadChatCarContext(s1).length === 1 && loadLastSelectedCarId() === "corolla-2020");

  setActivePilotChatSessionId(s2);
  ok("account/scope switch does not leak previous session context", loadChatCarContext(s2).length === 0);

  clearPilotChatSessionContext();
  ok("new chat/logout style clear removes scoped context", loadChatCarContext(s1).length === 0);
}

async function runReadinessRaceSimulation(): Promise<void> {
  type SimState = {
    activeSessionId: string | null;
    contexts: Record<string, string[]>;
  };
  const persistedSessions = ["welcome-session"];

  const oldState: SimState = { activeSessionId: null, contexts: {} };
  const newState: SimState = { activeSessionId: null, contexts: {} };

  // Old order (v22.74D): await ensureProfileReady first, then loadSessions.
  // This allows a stale late loadSessions to overwrite a newer Q1-created active session.
  const oldHydrate = (async () => {
    await new Promise((resolve) => setTimeout(resolve, 25)); // readiness delay window
    oldState.activeSessionId = persistedSessions[0] ?? null; // late stale overwrite
  })();

  // New order (v22.75): loadSessions first, then readiness.
  // User turns after hydration starts keep their newer active session/context.
  const newHydrate = (async () => {
    newState.activeSessionId = persistedSessions[0] ?? null;
    await new Promise((resolve) => setTimeout(resolve, 25));
  })();

  await new Promise((resolve) => setTimeout(resolve, 5));
  oldState.activeSessionId = "q1-session";
  oldState.contexts["q1-session"] = ["corolla-2020"];
  newState.activeSessionId = "q1-session";
  newState.contexts["q1-session"] = ["corolla-2020"];

  await Promise.all([oldHydrate, newHydrate]);

  ok("race simulation old order overwrites active session (repro shape)", oldState.activeSessionId === "welcome-session");
  ok("race simulation old order loses Q1 context on active session", (oldState.contexts[oldState.activeSessionId ?? ""] ?? []).length === 0);
  ok("race simulation new order keeps Q1 active session", newState.activeSessionId === "q1-session");
  ok("race simulation new order keeps Q1 context", (newState.contexts[newState.activeSessionId ?? ""] ?? []).includes("corolla-2020"));
}

console.log("=== v22.75 signed-in active vehicle context contract ===\n");
assertUseChatLifecycleContract();
runSignedInSequentialContract();
runFreshNoContextSafetyChecks();
runScopeResetContracts();
await runReadinessRaceSimulation();

console.log(`\n=== v22.75 result: ${pass} passed, ${fail} failed ===`);
if (process.exitCode) process.exit(process.exitCode);
