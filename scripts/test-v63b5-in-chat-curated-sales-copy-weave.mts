/**
 * v6.3B.5 — In-Chat Curated Analysis Sales Copy Weave
 * npm run test:v63b5-in-chat-curated-sales-copy-weave
 */
import { readFileSync } from "node:fs";
import {
  buildCompactInChatSalesWeave,
  buildBuyerFriendlyListingCopy,
  passesOutputGuard,
  isCorruptedMixedThaiLatinSpecLabel,
  containsThaiLatinMixedCorruption,
  containsForbiddenSteeringGarble,
  parseBuyerSpecTokens,
  STEERING_WHEEL_MULTIFUNCTION_DISPLAY,
  FORBIDDEN_STEERING_GARBLE_FRAGMENTS,
} from "../src/utils/buyerFriendlyListingCopy.ts";
import {
  buildInChatCuratedAnalysis,
  buildInChatCuratedSpeakableText,
  assertInChatCuratedSafe,
  IN_CHAT_CURATED_TITLE,
} from "../src/services/ai/chat/buildInChatCuratedAnalysis.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
  type ChatInventoryCar,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  saveChatSearchContext,
  setActivePilotChatSessionId,
} from "../src/utils/chatCarContext.ts";

/** Pure-Thai canonical literal — must match STEERING_WHEEL_MULTIFUNCTION_DISPLAY exactly */
const PURE_THAI_STEERING_MULTIFUNCTION =
  "\u0E1E\u0E27\u0E07\u0E21\u0E32\u0E25\u0E31\u0E22\u0E21\u0E31\u0E25\u0E15\u0E34\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19";

function assertNoForbiddenSteeringGarble(text: string): boolean {
  if (containsForbiddenSteeringGarble(text)) return false;
  for (const frag of FORBIDDEN_STEERING_GARBLE_FRAGMENTS) {
    if (text.includes(frag)) return false;
  }
  return !/[\u0E1E\u0E27\u0E07\u0E21][a-z]{1,4}/i.test(text);
}

function printSteeringEvidence(tag: string, sample: string) {
  const canonical = STEERING_WHEEL_MULTIFUNCTION_DISPLAY;
  const allThaiBlock = [...canonical].every((ch) => {
    const cp = ch.codePointAt(0)!;
    return cp >= 0x0e00 && cp <= 0x0e7f;
  });
  console.log(`\n--- steering evidence (${tag}) ---`);
  console.log("CANONICAL_DISPLAY=", canonical);
  console.log("PURE_LITERAL_MATCH=", canonical === PURE_THAI_STEERING_MULTIFUNCTION);
  console.log("CANONICAL_ALL_THAI_UNICODE_BLOCK=", allThaiBlock);
  console.log("SAMPLE_HAS_CANONICAL=", sample.includes(canonical));
  console.log("SAMPLE_NO_FORBIDDEN_GARBLE=", assertNoForbiddenSteeringGarble(sample));
  if (sample.trim()) {
    console.log("SAMPLE_SNIPPET=", sample);
  }
}

const TEST_SESSION = "test-v635-weave-session";
setActivePilotChatSessionId(TEST_SESSION);

if (typeof global !== "undefined" && !(global as { sessionStorage?: Storage }).sessionStorage) {
  const store = new Map<string, string>();
  (global as { sessionStorage: Storage }).sessionStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

const RICH_DESC =
  "AB2 + บ.หนัง + พวงมาลัยมัลติฟังก์ชั่น + Cruise Control + Engine Start + Smart Keyless + จอทัชสกรีน + Bluetooth + วิทยุ FM/AM + AM + CD + USB + กล้องถอย /k controlled pilot source package";

const richInv: ChatInventoryCar = {
  id: "car-synthetic-rich-weave",
  title: "BrandX ModelY",
  brand: "BrandX",
  model: "ModelY",
  year: 2021,
  price: 750_000,
  mileage: 62_000,
  color: "เทา",
  type: "used",
  fuelType: "hybrid",
  bodyType: "suv",
  images: ["/storage/listings/sample/01.webp", "/storage/listings/sample/02.webp", "/storage/listings/sample/03.webp"],
  isSold: false,
  listingStatus: "published",
  transmission: "AT",
  description: RICH_DESC,
};

/** Garbled latin-injected steering token (charset corruption pattern) */
const GARBLED_STEERING_DESC =
  "AB2 + บ.หนัง + \u0E1E\u0E27\u0E07\u0E21al\u0E17i + Cruise Control + Engine Start + Smart Keyless + จอทัชสกรีn + Bluetooth + USB + กล้องถอย";

const garbledSteeringInv: ChatInventoryCar = {
  ...richInv,
  id: "car-synthetic-garbled-steering",
  description: GARBLED_STEERING_DESC,
};

const sparseInv: ChatInventoryCar = {
  ...richInv,
  id: "car-synthetic-sparse",
  description: "รถสภาพดี ใช้งานจริง",
};

const overclaimInv: ChatInventoryCar = {
  ...richInv,
  id: "car-synthetic-overclaim",
  description: `${RICH_DESC} ไมล์แท้ 100% 15 km/l รับประกัน 1 ปี`,
};

const richCard = summaryToChatCarCardData(toChatCarSummary(richInv), "exact");
const garbledSteeringCard = summaryToChatCarCardData(
  toChatCarSummary(garbledSteeringInv),
  "exact"
);
const sparseCard = summaryToChatCarCardData(toChatCarSummary(sparseInv), "exact");
const overclaimCard = summaryToChatCarCardData(toChatCarSummary(overclaimInv), "exact");

const CARD_SRC = readFileSync("src/components/chat/ChatCarCard.tsx", "utf8");
const CURATED_SRC = readFileSync(
  "src/services/ai/chat/buildInChatCuratedAnalysis.ts",
  "utf8"
);
const COPY_SRC = readFileSync("src/utils/buyerFriendlyListingCopy.ts", "utf8");
const PKG = readFileSync("package.json", "utf8");
const DOC = readFileSync(
  "docs/v6.3B.5-in-chat-curated-analysis-sales-copy-weave.md",
  "utf8"
);

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.3B.5 In-Chat Curated Analysis Sales Copy Weave ===\n");

// --- compact helper ---
{
  const weave = buildCompactInChatSalesWeave({
    description: RICH_DESC,
    fuelType: "hybrid",
    bodyClassLabel: "SUV",
  });
  ok("W-01 weave non-empty", weave.text.length > 0);
  ok("W-01 weave guard pass", weave.guardPass);
  ok("W-02 sales tone phrase", /ขับสบาย|สะดวก/i.test(weave.text));
  ok("W-02 has eg connector", weave.text.includes("เช่น"));
  ok("W-02 feature leather", /เบาะหนัง/i.test(weave.text));
  ok("W-02 feature cruise", /Cruise Control/i.test(weave.text));
  ok("W-03 no AB2", !/\bAB2\b/i.test(weave.text));
  ok("W-03 no junk k", !/(?:^|\s)k(?:\s|$)/i.test(weave.text));
  ok("W-03 no pilot noise", !/controlled pilot/i.test(weave.text));
  ok("W-04 length cap", weave.text.length <= 220, String(weave.text.length));
  ok("W-04 not bullet list", !weave.text.includes("•"));
  ok("W-05 sparse omit", buildCompactInChatSalesWeave({ description: "รถดี" }).text === "");
  ok("W-08 output guard", passesOutputGuard(weave.text).pass);
  ok(
    "W-13 proper steering label",
    weave.text.includes(PURE_THAI_STEERING_MULTIFUNCTION) &&
      weave.text.includes(STEERING_WHEEL_MULTIFUNCTION_DISPLAY) &&
      !containsThaiLatinMixedCorruption(weave.text)
  );
  ok("W-14 no corrupted mixed latin in weave", assertNoForbiddenSteeringGarble(weave.text));
  ok(
    "W-18 canonical equals pure thai literal",
    STEERING_WHEEL_MULTIFUNCTION_DISPLAY === PURE_THAI_STEERING_MULTIFUNCTION
  );
  ok("W-19 output excludes forbidden al-i stem", !weave.text.includes(FORBIDDEN_STEERING_GARBLE_FRAGMENTS[0]));
  ok(
    "W-20 output excludes forbidden al-i full garble",
    !weave.text.includes(FORBIDDEN_STEERING_GARBLE_FRAGMENTS[1])
  );
}

// --- garbled steering repair ---
{
  ok("W-15 detects garbled steering", isCorruptedMixedThaiLatinSpecLabel("\u0E1E\u0E27\u0E07\u0E21al\u0E17i"));
  const tokens = parseBuyerSpecTokens(GARBLED_STEERING_DESC);
  ok("W-15 repairs garbled token", tokens.includes(STEERING_WHEEL_MULTIFUNCTION_DISPLAY));
  ok("W-15 no raw garbled token", !tokens.some((t) => /\u0E1E\u0E27\u0E07\u0E21al\u0E17i/.test(t)));
  const garbledWeave = buildCompactInChatSalesWeave({
    description: GARBLED_STEERING_DESC,
    fuelType: "hybrid",
    bodyClassLabel: "SUV",
  });
  ok("W-16 garbled weave has canonical steering", garbledWeave.text.includes(PURE_THAI_STEERING_MULTIFUNCTION));
  ok("W-16 garbled weave no corruption", assertNoForbiddenSteeringGarble(garbledWeave.text));
  const garbledAnalysis = buildInChatCuratedAnalysis(garbledSteeringCard);
  ok(
    "W-16 curated weave canonical steering",
    (garbledAnalysis.featureWeave ?? "").includes(PURE_THAI_STEERING_MULTIFUNCTION)
  );
  ok(
    "W-16 curated no corruption",
    assertNoForbiddenSteeringGarble(garbledAnalysis.featureWeave ?? "")
  );
  const garbledSpeakable = buildInChatCuratedSpeakableText(garbledAnalysis);
  ok("W-21 TTS garbled path has canonical steering", garbledSpeakable.includes(PURE_THAI_STEERING_MULTIFUNCTION));
  ok("W-21 TTS garbled path no forbidden garble", assertNoForbiddenSteeringGarble(garbledSpeakable));
  const detailPreview = buildBuyerFriendlyListingCopy({
    brand: "BrandX",
    model: "ModelY",
    year: 2021,
    fuelType: "hybrid",
    bodyType: "SUV",
    description: GARBLED_STEERING_DESC,
  });
  ok("W-22 detail preview has canonical steering", detailPreview.text.includes(PURE_THAI_STEERING_MULTIFUNCTION));
  ok("W-22 detail preview no forbidden garble", assertNoForbiddenSteeringGarble(detailPreview.text));
  const otherCategoryCopy = buildBuyerFriendlyListingCopy({
    brand: "BrandX",
    model: "ModelY",
    year: 2021,
    fuelType: "hybrid",
    bodyType: "SUV",
    description:
      "Cruise Control + Engine Start + Smart Keyless + ม่านไฟฟ้า + \u0E1E\u0E27\u0E07\u0E21zz99xx + จอทัชสกรีน + Bluetooth",
    price: 750_000,
    mileage: 62_000,
  });
  ok("W-23 other category keeps displayable token", /ม่านไฟฟ้า/.test(otherCategoryCopy.text));
  ok("W-23 other category omits garbled token", !/[\u0E1E\u0E27\u0E07\u0E21][a-z0-9]{1,4}/i.test(otherCategoryCopy.text));
  ok("W-23 other category no forbidden garble", assertNoForbiddenSteeringGarble(otherCategoryCopy.text));
  const unrepairable = buildCompactInChatSalesWeave({
    description: "AB2 + \u0E1E\u0E27\u0E07\u0E21zz99xx + Cruise Control + Engine Start",
    fuelType: "hybrid",
    bodyClassLabel: "SUV",
  });
  ok("W-17 unrepairable no corruption", assertNoForbiddenSteeringGarble(unrepairable.text));
  ok("W-17 unrepairable no garbled steering token", !/[\u0E1E\u0E27\u0E07\u0E21][a-z]{1,4}/.test(unrepairable.text));
  ok(
    "W-17 unrepairable omits forbidden al-i stem",
    !unrepairable.text.includes(FORBIDDEN_STEERING_GARBLE_FRAGMENTS[0])
  );
  printSteeringEvidence("garbled-repair-after", garbledWeave.text);
  printSteeringEvidence("garbled-unrepairable-after", unrepairable.text);
}

// --- curated analysis integration ---
{
  const analysis = buildInChatCuratedAnalysis(richCard);
  ok("W-06 opening preserved", analysis.opening.length > 0);
  ok("W-06 highlights preserved", analysis.highlights.length > 0);
  ok("W-06 closing preserved", analysis.closing.length > 0);
  ok("W-06 has featureWeave", Boolean(analysis.featureWeave?.trim()));
  ok("W-07 no desc bullet dup", !analysis.highlights.includes("จากรายละเอียดประกาศ:"));
  ok("W-10 deterministic", buildInChatCuratedAnalysis(richCard).featureWeave === analysis.featureWeave);

  const sparse = buildInChatCuratedAnalysis(sparseCard);
  ok("W-04 sparse no weave", !sparse.featureWeave);
  ok("W-04 sparse still works", sparse.paragraphs.length === 3);

  const over = buildInChatCuratedAnalysis(overclaimCard);
  ok("W-05 overclaim no forbidden", !/(?:ไมล์แท้|km\/l|รับประกัน)/i.test(over.featureWeave ?? ""));

  for (const forbidden of ["ไม่เคยชน", "ดีที่สุด", "ล้านเปอร์เซ็นต์", "ประหยัดแน่นอน"]) {
    ok(`W-08 no ${forbidden.slice(0, 6)}`, !analysis.paragraphs.join(" ").includes(forbidden));
  }

  assertInChatCuratedSafe(analysis.featureWeave ?? "");
  ok("W-08 assert safe", true);
}

// --- stored pitch + weave ---
{
  saveChatSearchContext({
    allCars: [richCard],
    offset: 0,
    pitchLines: ["BrandX ModelY 750,000 บาท — มุมใช้งานจริง"],
  });
  const withPitch = buildInChatCuratedAnalysis(richCard);
  ok("pitch path keeps weave", Boolean(withPitch.featureWeave?.trim()));
  ok("pitch path opening uses pitch", withPitch.opening.includes("750") || withPitch.opening.includes("BrandX"));
}

// --- TTS ---
{
  const analysis = buildInChatCuratedAnalysis(richCard);
  const speakable = buildInChatCuratedSpeakableText(analysis);
  ok("W-09 speakable includes weave", speakable.includes(analysis.featureWeave ?? "MISSING"));
  ok("W-09 speakable title", speakable.includes(IN_CHAT_CURATED_TITLE));
  ok("W-09 no hidden fields", !speakable.includes("รหัสประกาศ"));
  ok("W-24 TTS rich path no forbidden garble", assertNoForbiddenSteeringGarble(speakable));
  ok(
    "W-24 TTS rich path has canonical steering when weave present",
    !analysis.featureWeave || speakable.includes(PURE_THAI_STEERING_MULTIFUNCTION)
  );
}

// --- UI static ---
{
  ok("W-11 single panel", CARD_SRC.includes('data-testid="chat-car-curated-analysis"'));
  ok("W-11 featureWeave render", CARD_SRC.includes("analysis.featureWeave"));
  ok("W-11 no new panel", !CARD_SRC.includes("buyer-friendly-copy-preview"));
  ok("module imports compact weave", CURATED_SRC.includes("buildCompactInChatSalesWeave"));
  ok("module buildFeatureWeave", CURATED_SRC.includes("buildFeatureWeave"));
  ok("copy exports compact weave", COPY_SRC.includes("export function buildCompactInChatSalesWeave"));
}

// --- doc + package ---
{
  ok("doc v635 label", DOC.includes("v6.3B.5"));
  ok("doc featureWeave", DOC.includes("featureWeave"));
  ok("doc no deploy", /ไม่ deploy|no deploy/i.test(DOC));
  ok("package script", PKG.includes("test:v63b5-in-chat-curated-sales-copy-weave"));
}

console.log("\n--- synthetic after sample (rich card) ---");
const sample = buildInChatCuratedAnalysis(richCard);
console.log("\n[opening]\n", sample.opening);
console.log("\n[featureWeave]\n", sample.featureWeave ?? "(omitted)");
console.log("\n[highlights intro]\n", sample.highlights.split("\n")[0]);
printSteeringEvidence("rich-featureWeave", sample.featureWeave ?? "");

console.log("\nDone v6.3B.5 In-Chat Curated Analysis Sales Copy Weave tests.");
if (process.exitCode) process.exit(process.exitCode);
