/**
 * v5.6E.1 — Buyer purchase profile reuse (no phone in profile)
 * npm run test:v56e1-buyer-purchase-profile-reuse
 */
import {
  clearBuyerLeadCaptureContext,
  draftToCreateInput,
  getBuyerLeadCaptureContext,
  processBuyerLeadCaptureTurn,
  setBuyerLeadCaptureContextForTest,
  startBuyerLeadCaptureFromCar,
  updateBuyerLeadDraftPhone,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import {
  CHAT_BUYER_LEAD_EDIT_SAVED_PROFILE_ACTION,
  CHAT_BUYER_LEAD_USE_SAVED_PROFILE_ACTION,
} from "../src/services/leads/buyerLeadCaptureCopy.ts";
import {
  handleBuyerLeadCaptureFromCarCard,
  handleBuyerLeadCaptureTurn,
} from "../src/services/leads/buyerLeadCaptureHandler.ts";
import {
  buyerPurchaseProfileHasNoPhone,
  getBuyerPurchaseProfile,
  profileToDraftFields,
  resetBuyerPurchaseProfilesForTests,
  saveBuyerPurchaseProfileFromDraft,
  setBuyerPurchaseProfileForTest,
} from "../src/services/leads/buyerPurchaseProfile.ts";
import {
  isBuyerLeadEditSavedProfileAction,
  isBuyerLeadUseSavedProfileAction,
} from "../src/services/leads/buyerLeadValidation.ts";
import type { ChatCarCardData } from "../src/types.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const carA: ChatCarCardData = {
  id: "car-profile-a",
  brand: "Honda",
  model: "City",
  year: 2020,
  price: 420000,
  mileage: 50000,
  bodyClass: "sedan",
  bodyClassLabel: "รถเก๋ง",
  hasImage: false,
  detailPath: "/cars/car-profile-a",
  matchKind: "exact",
};

const carB: ChatCarCardData = {
  ...carA,
  id: "car-profile-b",
  brand: "Toyota",
  model: "Yaris",
  detailPath: "/cars/car-profile-b",
};

const buyerId = "buyer-profile-uid-1";

resetBuyerPurchaseProfilesForTests();

// --- profile never stores phone ---
{
  const saved = saveBuyerPurchaseProfileFromDraft(buyerId, {
    displayName: "มานี",
    purchaseMethod: "cash",
    budgetMax: 400000,
    preferredContactWindow: "เย็น",
    contactPhone: "0812345678",
  });
  ok("profile saved", Boolean(saved));
  ok("profile has no phone field", buyerPurchaseProfileHasNoPhone(saved!));
  const loaded = getBuyerPurchaseProfile(buyerId);
  ok("profile loaded", Boolean(loaded));
  ok("loaded profile no phone", loaded ? buyerPurchaseProfileHasNoPhone(loaded) : false);
}

// --- first car without profile uses collecting flow ---
{
  const sid = "sess-no-profile";
  clearBuyerLeadCaptureContext(sid);
  resetBuyerPurchaseProfilesForTests();
  setBuyerPurchaseProfileForTest("other-user", {
    displayName: "x",
    purchaseMethod: "cash",
    budgetMax: 1,
    preferredContactWindow: "y",
    updatedAt: "",
  });
  const r = await handleBuyerLeadCaptureFromCarCard({ sessionId: sid, car: carA, buyerUserId: buyerId });
  ok("no profile: not reuse UI", !r.isBuyerLeadProfileReuse);
  ok("no profile: collecting stage", getBuyerLeadCaptureContext(sid)?.stage === "collecting");
}

// --- second car with profile shows reuse choice ---
{
  resetBuyerPurchaseProfilesForTests();
  setBuyerPurchaseProfileForTest(buyerId, {
    displayName: "มานี",
    purchaseMethod: "finance",
    offeredPrice: 380000,
    preferredContactWindow: "หลังเลิกงาน",
    updatedAt: new Date().toISOString(),
  });
  const sid = "sess-reuse";
  clearBuyerLeadCaptureContext(sid);
  const r = await handleBuyerLeadCaptureFromCarCard({ sessionId: sid, car: carB, buyerUserId: buyerId });
  ok("has profile: reuse UI flag", r.isBuyerLeadProfileReuse === true);
  ok("reuse reply mentions saved data", r.reply.includes("ข้อมูลพื้นฐาน"));
  const ctx = getBuyerLeadCaptureContext(sid);
  ok("stage reuse_profile_choice", ctx?.stage === "reuse_profile_choice");
  ok("listing is new car", ctx?.fields.listingId === carB.id);
  ok("draft has no phone", !ctx?.fields.contactPhone);
  ok("prefilled name", ctx?.fields.displayName === "มานี");
}

// --- use saved profile opens modal path, still no phone until modal ---
{
  const sid = "sess-use-profile";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, carB, buyerId);
  const turn = processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: CHAT_BUYER_LEAD_USE_SAVED_PROFILE_ACTION,
  });
  ok("use profile action detected", isBuyerLeadUseSavedProfileAction(CHAT_BUYER_LEAD_USE_SAVED_PROFILE_ACTION));
  ok("turn opens modal", turn.handled && turn.openConsentModal === true);
  const ctx = getBuyerLeadCaptureContext(sid);
  ok("ready_for_modal after use", ctx?.stage === "ready_for_modal");
  ok("still no phone in draft", !ctx?.fields.contactPhone);
  const inputBeforePhone = draftToCreateInput(ctx!.fields, true);
  ok("cannot create lead without modal phone", inputBeforePhone === null);
}

// --- edit profile returns to collecting ---
{
  const sid = "sess-edit-profile";
  clearBuyerLeadCaptureContext(sid);
  startBuyerLeadCaptureFromCar(sid, carB, buyerId);
  processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: CHAT_BUYER_LEAD_EDIT_SAVED_PROFILE_ACTION,
  });
  ok("edit action detected", isBuyerLeadEditSavedProfileAction(CHAT_BUYER_LEAD_EDIT_SAVED_PROFILE_ACTION));
  const ctx = getBuyerLeadCaptureContext(sid);
  ok("collecting after edit", ctx?.stage === "collecting");
  const handler = await handleBuyerLeadCaptureTurn({
    sessionId: sid,
    message: CHAT_BUYER_LEAD_EDIT_SAVED_PROFILE_ACTION,
    isSignedIn: true,
  });
  ok("edit handler reply", handler.handled && handler.reply.includes("ปรับข้อมูล"));
}

// --- modal phone required for submit payload ---
{
  const sid = "sess-phone-required";
  clearBuyerLeadCaptureContext(sid);
  setBuyerLeadCaptureContextForTest(sid, {
    stage: "ready_for_modal",
    fields: profileToDraftFields(getBuyerPurchaseProfile(buyerId)!, carB.id),
  });
  updateBuyerLeadDraftPhone(sid, "0898765432");
  const ctx = getBuyerLeadCaptureContext(sid);
  const input = draftToCreateInput(ctx!.fields, true);
  ok("payload after modal phone", Boolean(input?.contactPhone));
  ok("profile fields unchanged in draft", input?.displayName === "มานี");
}

// --- no auto-submit: use profile does not imply consent without modal ---
{
  ok("use profile is not consent phrase", !isBuyerLeadUseSavedProfileAction("ยืนยันส่ง"));
}

console.log("\nDone v5.6E.1 buyer purchase profile reuse tests.");
if (process.exitCode) process.exit(process.exitCode);
