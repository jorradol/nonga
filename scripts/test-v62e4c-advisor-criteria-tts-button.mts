/**
 * v6.2E.4C — Advisor Criteria TTS Button (static + unit validation)
 * npm run test:v62e4c-advisor-criteria-tts-button
 */
import { readFileSync } from "node:fs";
import {
  buildInChatCuratedAnalysis,
  buildInChatCuratedSpeakableText,
  hasInChatCuratedSpeakableText,
  IN_CHAT_CURATED_SPEAK_ARIA_LABEL,
  IN_CHAT_CURATED_TITLE,
} from "../src/services/ai/chat/buildInChatCuratedAnalysis.ts";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
  type ChatInventoryCar,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";

const CARD_SRC = readFileSync("src/components/chat/ChatCarCard.tsx", "utf8");
const BUBBLE_SRC = readFileSync("src/components/chat/ChatMessageBubble.tsx", "utf8");
const CURATED_SRC = readFileSync(
  "src/services/ai/chat/buildInChatCuratedAnalysis.ts",
  "utf8"
);
const PKG = readFileSync("package.json", "utf8");

const SAMPLE_INV: ChatInventoryCar = {
  id: "car-sample-a",
  title: "BrandA ModelS",
  brand: "BrandA",
  model: "ModelS",
  year: 2018,
  price: 420_000,
  mileage: 55_000,
  color: "ขาว",
  type: "used",
  images: ["/storage/listings/sample/01.webp"],
  isSold: false,
  listingStatus: "published",
  transmission: "AT",
};

const SAMPLE_INV_B: ChatInventoryCar = {
  ...SAMPLE_INV,
  id: "car-sample-b",
  brand: "BrandB",
  model: "ModelT",
};

const cardA = summaryToChatCarCardData(toChatCarSummary(SAMPLE_INV), "exact");
const cardB = summaryToChatCarCardData(toChatCarSummary(SAMPLE_INV_B), "exact");
const analysisA = buildInChatCuratedAnalysis(cardA);
const analysisB = buildInChatCuratedAnalysis(cardB);

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.2E.4C Advisor Criteria TTS Button ===\n");

// --- speakable text helper ---
{
  const speakable = buildInChatCuratedSpeakableText(analysisA);
  ok("speakable non-empty", speakable.length > 0);
  ok("speakable includes title", speakable.includes(IN_CHAT_CURATED_TITLE));
  ok("speakable includes opening", speakable.includes(analysisA.opening));
  ok("speakable includes highlights", speakable.includes(analysisA.highlights));
  ok("speakable includes closing", speakable.includes(analysisA.closing));
  ok("has speakable helper true", hasInChatCuratedSpeakableText(analysisA));

  const emptyAnalysis = {
    title: "",
    opening: "",
    highlights: "",
    closing: "",
    paragraphs: [] as string[],
  };
  ok("empty not speakable", !hasInChatCuratedSpeakableText(emptyAnalysis));
  ok("empty speakable text", buildInChatCuratedSpeakableText(emptyAnalysis) === "");

  ok(
    "speakable excludes listing id field label",
    !speakable.includes("รหัสประกาศ")
  );
}

// --- UI wiring ---
{
  ok("card reuses useSpeech", CARD_SRC.includes("useSpeech"));
  ok("card volume icons", CARD_SRC.includes("Volume2") && CARD_SRC.includes("VolumeX"));
  ok("card tts testid", CARD_SRC.includes('data-testid="chat-car-curated-tts-btn"'));
  ok("card aria label constant", CARD_SRC.includes("IN_CHAT_CURATED_SPEAK_ARIA_LABEL"));
  ok("card speakable builder", CARD_SRC.includes("buildInChatCuratedSpeakableText"));
  ok("card canSpeak guard", CARD_SRC.includes("canSpeak"));
  ok("card unique tts id per car", CARD_SRC.includes("curated-tts-${car.id}"));
  ok("card stop propagation", CARD_SRC.includes("stopPropagation"));
  ok("card header flex layout", /flex items-start justify-between/.test(CARD_SRC));
}

// --- accessibility ---
{
  ok("aria label text", IN_CHAT_CURATED_SPEAK_ARIA_LABEL === "ฟังบทเกณฑ์คัดสรรของน้องเอ");
  ok("card aria-label attr", CARD_SRC.includes("aria-label={IN_CHAT_CURATED_SPEAK_ARIA_LABEL}"));
}

// --- multi-card isolation ---
{
  ok("card A analysis differs", analysisA.opening !== analysisB.opening);
  const speakA = buildInChatCuratedSpeakableText(analysisA);
  const speakB = buildInChatCuratedSpeakableText(analysisB);
  ok("speakable A mentions BrandA", speakA.includes("BrandA"));
  ok("speakable B mentions BrandB", speakB.includes("BrandB"));
}

// --- no new provider / AI path ---
{
  ok("curated no gemini", !/gemini|openai|anthropic/i.test(CURATED_SRC));
  ok("card no gemini import", !/gemini|openai|anthropic/i.test(CARD_SRC));
  ok("card no new fetch ai", !/chat-user-visible-orchestrate|salesBrain/i.test(CARD_SRC));
}

// --- existing message TTS unchanged ---
{
  ok("bubble still has toggleSpeak", BUBBLE_SRC.includes("toggleSpeak"));
  ok("bubble still has useSpeech", BUBBLE_SRC.includes("useSpeech"));
  ok("bubble speech toolbar intact", BUBBLE_SRC.includes("Speech synthesis controller"));
}

// --- curated module exports ---
{
  ok("module exports speak aria label", CURATED_SRC.includes("IN_CHAT_CURATED_SPEAK_ARIA_LABEL"));
  ok("module exports speakable builder", CURATED_SRC.includes("buildInChatCuratedSpeakableText"));
  ok("module exports has speakable", CURATED_SRC.includes("hasInChatCuratedSpeakableText"));
}

// --- package ---
{
  ok(
    "package v62e4c script",
    PKG.includes("test:v62e4c-advisor-criteria-tts-button")
  );
}

console.log("\nDone v6.2E.4C Advisor Criteria TTS Button tests.");
if (process.exitCode) process.exit(process.exitCode);
