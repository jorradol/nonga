/**
 * v6.2E.4 — Real Stock Refine Intent Fuel Economy Smoke Fix
 * npm run test:v62e4-real-stock-refine-intent-fuel-economy-smoke-fix
 */
import { readFileSync } from "node:fs";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { detectBuyerRefinement } from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import {
  buildFuelEconomyRefineReplyCopy,
  buildRefinementFollowUpReplyCopy,
  buildRefinementNoContextCopy,
  hasFuelListingSignals,
  scoreFuelRefineCandidate,
} from "../src/services/ai/chat/chatRefinementReplyCopy.ts";
import { buildFollowUpReplyCopy } from "../src/services/ai/chat/chatSearchReplyCopy.ts";
import {
  buildBuyerRefinementPilotCopy,
  buildPilotBuyerUserVisibleCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import { saveChatCarContext } from "../src/utils/chatCarContext.ts";
import type { ChatCarCardData } from "../src/types.ts";

const DOC_PATH =
  "docs/v6.2E.4-real-stock-refine-intent-fuel-economy-smoke-fix.md";
const V62E_DOC =
  "docs/v6.2E-pilot-monitoring-feedback-loop-readiness-plan.md";

const REFINE_MSG = "เอาประหยัดน้ำมัน";
const HEAD_SHA = "3b7c13921ea84aec2f4acae17ffc4848e435888e";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
];

const RAW_IMAGE_URL_PATTERNS = [
  /https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i,
  /drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]{10,}/i,
  /firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/[^"'\s]{30,}/i,
];

function hasPositiveInventedFuelClaim(text: string): boolean {
  if (/\d+\s*(?:km\/l|กม\.\/ลิตร)/i.test(text)) return true;
  if (/กิโลเมตรต่อลิตร/.test(text)) return true;
  if (/กินน้ำมันน้อยแน่นอน/.test(text)) return true;
  const withoutNegation = text.replace(/ไม่[^\n]*ประหยัดแน่นอน/g, "");
  if (/ประหยัดแน่นอน/.test(withoutNegation)) return true;
  return false;
}

const SAMPLE_CARDS: ChatCarCardData[] = [
  {
    id: "card-a",
    brand: "BrandA",
    model: "ModelSedan",
    year: 2016,
    price: 385000,
    mileage: 72000,
    fuelType: "petrol",
    bodyClass: "sedan",
    bodyClassLabel: "Sedan B",
    hasImage: true,
    detailPath: "",
    matchKind: "exact",
  },
  {
    id: "card-b",
    brand: "BrandB",
    model: "ModelSuv",
    year: 2014,
    price: 399000,
    mileage: 95000,
    fuelType: "petrol",
    bodyClass: "suv",
    bodyClassLabel: "SUV B",
    hasImage: true,
    detailPath: "",
    matchKind: "exact",
  },
];

const PILOT_CARDS = SAMPLE_CARDS.map((c, i) => ({
  index: i + 1,
  brand: c.brand,
  model: c.model,
  year: c.year,
  price: c.price,
  mileage: c.mileage,
  fuelType: c.fuelType,
  bodyClassLabel: c.bodyClassLabel,
}));

if (typeof globalThis.sessionStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as { sessionStorage: Storage }).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2E.4 Real Stock Refine Intent Fuel Economy Smoke Fix ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync(
  "scripts/test-v62e4-real-stock-refine-intent-fuel-economy-smoke-fix.mts",
  "utf8"
);
const pkg = readFileSync("package.json", "utf8");
const v62eDoc = readFileSync(V62E_DOC, "utf8");
const refineSrc = readFileSync(
  "src/services/ai/chat/chatRefinementReplyCopy.ts",
  "utf8"
);
const replySrc = readFileSync(
  "src/services/ai/chat/chatSearchReplyCopy.ts",
  "utf8"
);

// --- doc ---
{
  ok("doc exists", doc.length > 4000);
  ok("doc v6.2E.4 label", doc.includes("v6.2E.4"));
  ok("doc fuel economy refine", /fuel economy|ประหยัดน้ำมัน/i.test(doc));
  ok("doc HEAD 3b7c139", doc.includes(HEAD_SHA) || doc.includes("3b7c139"));
  ok("doc root cause section", /Root Cause/i.test(doc));
  ok("doc fix applied", /Fix Applied/i.test(doc));
  ok("doc deploy hosting backend", /Hosting.*backend|hosting \+ backend/i.test(docLower));
  ok("doc no per-car in repo", /no per-car|Per-car details/i.test(doc));
}

// --- intent detection ---
{
  ok("detect fuel refinement", detectBuyerRefinement(REFINE_MSG) === "fuel");
  ok("detect fuel variant", detectBuyerRefinement("เอาแบบประหยัดน้ำมัน") === "fuel");
}

// --- fuel refine copy ---
{
  const copy = buildFuelEconomyRefineReplyCopy(SAMPLE_CARDS);
  ok("fuel lead thai tone", copy.includes("ถ้าเน้นประหยัดน้ำมัน"));
  ok("fuel compares multiple cards", copy.includes("BrandA") && copy.includes("BrandB"));
  ok("fuel not single-car opener", !/^จากข้อมูลที่มี [^\n]+ ตอนนี้:/m.test(copy));
  ok("fuel lists two numbered lines", /1\.\s+BrandA/.test(copy) && /2\.\s+BrandB/.test(copy));
  ok("fuel no invented stats", !hasPositiveInventedFuelClaim(copy));
  ok("fuel disclaimer present", /ข้อมูลประกาศในระบบ|ไม่ได้ฟันธง/.test(copy));

  const weakCard: ChatCarCardData = {
    ...SAMPLE_CARDS[1],
    bodyClassLabel: "Unknown",
    fuelType: "petrol",
    mileage: 0,
    description: "",
  };
  const sparse = buildFuelEconomyRefineReplyCopy([weakCard]);
  ok(
    "insufficient listing note when weak signals",
    !hasFuelListingSignals([weakCard])
      ? sparse.includes("ข้อมูลประกาศยังไม่พอ")
      : true
  );
}

// --- no context ---
{
  const noCtx = buildRefinementNoContextCopy("fuel");
  ok("no context fuel safe copy", noCtx.includes("ยังไม่เห็นชุดรถล่าสุด"));
  ok("no context suggests search first", /งบ 4 แสน|เงื่อนไขรถ/.test(noCtx));
  const followEmpty = buildFollowUpReplyCopy([], REFINE_MSG);
  ok("followUp empty uses no context", followEmpty.includes("ยังไม่เห็นชุดรถล่าสุด"));
}

// --- orchestrator path ---
{
  saveChatCarContext(SAMPLE_CARDS, "v62e4-session");
  const orch = tryOrchestrateChatReplyCore(REFINE_MSG, [], {
    chatSessionId: "v62e4-session",
  });
  ok("orchestrator refine returns", Boolean(orch?.text));
  ok("orchestrator refine multi-car copy", /BrandA.*BrandB/s.test(orch?.text ?? ""));
  ok(
    "orchestrator not legacy single opener",
    !/^จากข้อมูลที่มี BrandB/m.test(orch?.text ?? "")
  );
  ok("orchestrator keeps cards", (orch?.carCards?.length ?? 0) === 2);
}

// --- pilot copy alignment ---
{
  const pilot = buildBuyerRefinementPilotCopy("fuel", PILOT_CARDS);
  ok("pilot fuel shared builder", pilot.includes("ถ้าเน้นประหยัดน้ำมัน"));
  ok("pilot fuel multi listing", pilot.includes("BrandA") && pilot.includes("BrandB"));

  const resolved = buildPilotBuyerUserVisibleCopy({
    userMessage: REFINE_MSG,
    intent: "unknown",
    carCardCount: 0,
    recentCarCards: PILOT_CARDS,
  });
  ok("pilot resolver refine active", resolved?.pilotPathActive === true);
  ok("pilot resolver multi-car", /BrandA|BrandB/.test(resolved?.text ?? ""));
}

// --- stale cards guard (orchestrator uses session only) ---
{
  saveChatCarContext([SAMPLE_CARDS[0]], "v62e4-stale");
  const stale = tryOrchestrateChatReplyCore(REFINE_MSG, [], {
    chatSessionId: "v62e4-stale",
  });
  ok("stale session one card only", stale?.carCards?.length === 1);
  ok("stale copy one listing line", (stale?.text.match(/^1\./gm) ?? []).length === 1);
}

// --- scoring unit ---
{
  const sedan = scoreFuelRefineCandidate(SAMPLE_CARDS[0]);
  const suv = scoreFuelRefineCandidate(SAMPLE_CARDS[1]);
  ok("sedan scores higher than suv for fuel", sedan.score > suv.score);
}

// --- source wiring ---
{
  ok("reply copy imports refinement", replySrc.includes("buildRefinementFollowUpReplyCopy"));
  ok("reply copy detect refinement", replySrc.includes("detectBuyerRefinement"));
  ok("refine module exists", refineSrc.includes("buildFuelEconomyRefineReplyCopy"));
  ok("family refine exported", refineSrc.includes("buildFamilyRefineReplyCopy"));
}

// --- no secrets / PII in doc ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`doc no secret ${pat.source.slice(0, 10)}`, !pat.test(doc));
  }
  for (const pat of RAW_IMAGE_URL_PATTERNS) {
    ok(`doc no raw url ${pat.source.slice(0, 12)}`, !pat.test(doc));
  }
  ok("doc no secure ops path", !/D:\\\\secure-ops/i.test(doc));
}

// --- cross-ref v62e ---
{
  ok("v62e refine task mentioned", /เอาประหยัดน้ำมัน|refine fuel/i.test(v62eDoc));
}

// --- package ---
{
  ok(
    "package v62e4 script",
    pkg.includes("test:v62e4-real-stock-refine-intent-fuel-economy-smoke-fix")
  );
}

// --- static test only guard ---
{
  const selfCode = selfSrc.split("// --- static test only guard ---")[0] ?? selfSrc;
  ok("test uses refinement builders", selfCode.includes("buildFuelEconomyRefineReplyCopy"));
}

console.log("\nDone v6.2E.4 Real Stock Refine Intent Fuel Economy Smoke Fix tests.");
if (process.exitCode) process.exit(process.exitCode);
