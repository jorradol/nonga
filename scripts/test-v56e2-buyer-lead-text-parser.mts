/**
 * v5.6E.2 — Smart buyer lead natural Thai text parsing
 * npm run test:v56e2-buyer-lead-text-parser
 */
import {
  clearBuyerLeadCaptureContext,
  draftToCreateInput,
  getBuyerLeadCaptureContext,
  hasPartialBuyerLeadDraftFields,
  isActiveBuyerLeadCaptureSession,
  listMissingBuyerLeadFields,
  mergeBuyerLeadFieldsFromMessage,
  processBuyerLeadCaptureTurn,
  shouldRunBuyerLeadCaptureTurn,
  startBuyerLeadCaptureFromCar,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import { handleBuyerLeadCaptureTurn } from "../src/services/leads/buyerLeadCaptureHandler.ts";
import {
  BUYER_LEAD_AI_TEXT_PARSE_ENABLED,
  describeBuyerLeadAiParseGuardrails,
  shouldAttemptAiBuyerLeadParse,
} from "../src/services/leads/buyerLeadAiParseFallback.ts";
import {
  parseBahtFromThaiText,
  parseNaturalBuyerLeadText,
} from "../src/services/leads/buyerLeadTextParser.ts";
import type { ChatCarCardData } from "../src/types.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const car: ChatCarCardData = {
  id: "car-smart-parse-1",
  brand: "Honda",
  model: "City",
  year: 2020,
  price: 420000,
  mileage: 40000,
  bodyClass: "sedan",
  bodyClassLabel: "รถเก๋ง",
  hasImage: false,
  detailPath: "/cars/car-smart-parse-1",
  matchKind: "exact",
};

function assertParse(
  name: string,
  message: string,
  expected: {
    displayName?: string;
    purchaseMethod?: "cash" | "finance" | "undecided";
    offeredPrice?: number;
    budgetMax?: number;
    preferredContactWindow?: string;
    confidence?: number;
  }
) {
  const r = parseNaturalBuyerLeadText(message);
  if (expected.displayName != null) {
    ok(`${name} displayName`, r.displayName === expected.displayName, r.displayName);
  }
  if (expected.purchaseMethod != null) {
    ok(`${name} purchaseMethod`, r.purchaseMethod === expected.purchaseMethod, r.purchaseMethod);
  }
  if (expected.offeredPrice != null) {
    ok(`${name} offeredPrice`, r.offeredPrice === expected.offeredPrice, String(r.offeredPrice));
  }
  if (expected.budgetMax != null) {
    ok(`${name} budgetMax`, r.budgetMax === expected.budgetMax, String(r.budgetMax));
  }
  if (expected.preferredContactWindow != null) {
    ok(
      `${name} contactWindow`,
      r.preferredContactWindow === expected.preferredContactWindow,
      r.preferredContactWindow
    );
  }
  if (expected.confidence != null) {
    ok(`${name} confidence`, r.confidence === expected.confidence, String(r.confidence));
  }
}

// --- manual smoke sentence ---
assertParse("smoke dl finance offer contact", "ชื่อ ดล จัดไฟแนนซ์ เสนอราคา 4 แสน ติดต่อได้ตลอดเวลา", {
  displayName: "ดล",
  purchaseMethod: "finance",
  offeredPrice: 400000,
  preferredContactWindow: "ติดต่อได้ตลอดเวลา",
  confidence: 1,
});

assertParse("dl finance budget evening call", "ดล ขอจัดไฟแนนซ์ งบ 4 แสน โทรได้หลังห้าโมง", {
  displayName: "ดล",
  purchaseMethod: "finance",
  budgetMax: 400000,
  preferredContactWindow: "โทรได้หลังห้าโมง",
  confidence: 1,
});

assertParse("name ae cash offer evening", "ชื่อเอ ซื้อสด เสนอ 480,000 สะดวกช่วงเย็น", {
  displayName: "เอ",
  purchaseMethod: "cash",
  offeredPrice: 480000,
  preferredContactWindow: "สะดวกช่วงเย็น",
  confidence: 1,
});

assertParse("finance 1.2m weekend", "ขอไฟแนนซ์ครับ ราคา 1.2 ล้าน ติดต่อเสาร์อาทิตย์", {
  purchaseMethod: "finance",
  offeredPrice: 1200000,
  preferredContactWindow: "ติดต่อเสาร์อาทิตย์",
});

{
  const partial = parseNaturalBuyerLeadText("ขอไฟแนนซ์ครับ ราคา 1.2 ล้าน ติดต่อเสาร์อาทิตย์");
  ok("partial missing name", partial.missingFields.includes("ชื่อหรือชื่อเล่น"));
  ok("partial confidence below full", partial.confidence === 0.75);
}

// --- Thai price helpers ---
ok("3 saen ha", parseBahtFromThaiText("3 แสนห้า") === 350000);
ok("1.2 million", parseBahtFromThaiText("1.2 ล้าน") === 1200000);
ok("480k comma", parseBahtFromThaiText("480,000") === 480000);

// --- incomplete asks only missing via handler ---
{
  const sid = "sess-partial-missing";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, car);
  processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ขอไฟแนนซ์ครับ ราคา 1.2 ล้าน ติดต่อเสาร์อาทิตย์",
  });
  const handler = await handleBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ขอไฟแนนซ์ครับ ราคา 1.2 ล้าน ติดต่อเสาร์อาทิตย์",
    isSignedIn: true,
  });
  ok("handler partial reply", handler.handled === true);
  if (handler.handled) {
    ok("asks only missing name", handler.reply.includes("ชื่อหรือชื่อเล่น"));
    ok("compact partial prompt", handler.reply.includes("เกือบครบแล้ว"));
    ok("not full checklist", !handler.reply.includes("ขอข้อมูลในแชท"));
  }
}

// --- active session stays in lead flow (not search) ---
{
  const sid = "sess-active";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, car);
  ok("active after car", isActiveBuyerLeadCaptureSession(sid));
  ok(
    "should run for member when active",
    shouldRunBuyerLeadCaptureTurn(sid, true)
  );
}

// --- phone not in chat draft ---
{
  const sid = "sess-no-phone-chat";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, car);
  const merged = mergeBuyerLeadFieldsFromMessage(
    getBuyerLeadCaptureContext(sid)!.fields,
    "ชื่อ ดล จัดไฟแนนซ์ เสนอราคา 4 แสน ติดต่อได้ตลอดเวลา 0812345678"
  );
  ok("chat merge ignores phone in draft", !merged.contactPhone);
  ok("ready without phone", listMissingBuyerLeadFields(merged).length === 0);
  ok("modal still needs phone", draftToCreateInput(merged, true) === null);
}

// --- AI fallback off ---
ok("AI parse disabled", BUYER_LEAD_AI_TEXT_PARSE_ENABLED === false);
ok(
  "no AI when disabled",
  shouldAttemptAiBuyerLeadParse({ confidence: 0.25, missingFields: ["ชื่อหรือชื่อเล่น"] }) ===
    false
);
ok("guardrails doc", describeBuyerLeadAiParseGuardrails().includes("OFF"));

console.log("\nDone v5.6E.2 buyer lead text parser tests.");
if (process.exitCode) process.exit(process.exitCode);
