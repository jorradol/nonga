/**
 * v5.4.7e — persist seller publish consent metadata on publish success
 * npm run test:v547-seller-consent-persistence
 */
import { strict as assert } from "node:assert";
import {
  CHAT_MEMBER_CONFIRM_PUBLISH_ACTION,
  confirmMemberPublishListingFromChat,
  handleMemberPublishListingIntent,
} from "../src/services/chat/publishMemberListingFromChat.ts";
import { setPublishConsentAccepted } from "../src/services/chat/chatPublishConsent.ts";
import type { Car, ChatMessage } from "../src/types.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: "listing-1",
    title: "Toyota Camry",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 850000,
    type: "used",
    condition: "ดี",
    mileage: 120000,
    fuelType: "petrol",
    transmission: "AT",
    images: ["https://example.com/a.jpg"],
    description: "รถบ้าน",
    ownerId: "owner-1",
    ownerName: "Somchai",
    ownerPhone: "",
    showroomName: "",
    isSold: false,
    listingStatus: "hidden",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

console.log("=== v5.4.7e seller consent persistence ===\n");

const sessionId = "sess-consent";
const ownerId = "owner-1";

// Begin pending publish context from a saved card message (minimal shape).
const savedCardMsg: ChatMessage = {
  id: "m1",
  sender: "ai",
  text: "",
  createdAt: new Date().toISOString(),
  isSavedMemberListingCard: true,
  savedMemberListingCard: {
    listingId: "listing-1",
    publicRefCode: "PUB-1",
    statusLabel: "รอตรวจทาน",
    fields: {
      brand: "Toyota",
      model: "Camry",
      year: 2019,
      price: 850000,
      mileage: 120000,
      fuelType: "petrol",
      transmission: "AT",
    },
    visionSummary: {},
    marketingCopy: "",
    imageUrls: ["https://example.com/a.jpg"],
  },
};

const began = handleMemberPublishListingIntent({
  sessionId,
  messages: [savedCardMsg],
});
ok("begin-publish-summary", began.kind === "summary", began.kind);

// 1) Without consent → blocked, must not call setListingVisible.
let called = false;
const depsBlocked = {
  fetchMyListings: async () => [makeCar()],
  setListingVisible: async () => {
    called = true;
    return makeCar({ listingStatus: "published" });
  },
};
const blocked = await confirmMemberPublishListingFromChat(
  { sessionId, ownerId, canPublish: true },
  depsBlocked
);
ok("blocked-without-consent", blocked.kind === "blocked", blocked.kind);
ok("no-call-without-consent", called === false, String(called));

// 2) With consent → success + patch includes required metadata.
setPublishConsentAccepted(sessionId, true);
let patchCaptured: Record<string, unknown> | undefined;
const depsOk = {
  fetchMyListings: async () => [makeCar()],
  setListingVisible: async (_ownerId: string, _listingId: string, patch?: Record<string, unknown>) => {
    patchCaptured = patch;
    return makeCar({
      listingStatus: "published",
      sellerConsentAccepted: true,
      sellerConsentAcceptedAt: String(patch?.sellerConsentAcceptedAt ?? ""),
      sellerConsentVersion: String(patch?.sellerConsentVersion ?? ""),
      sellerConsentSource: String(patch?.sellerConsentSource ?? ""),
      sellerConsentTextKey: String(patch?.sellerConsentTextKey ?? ""),
    });
  },
};
const okResult = await confirmMemberPublishListingFromChat(
  { sessionId, ownerId, canPublish: true },
  depsOk
);
ok("success-with-consent", okResult.kind === "success", okResult.kind);
ok("patch-captured", Boolean(patchCaptured), "");
if (patchCaptured) {
  ok("patch-accepted", patchCaptured.sellerConsentAccepted === true, String(patchCaptured.sellerConsentAccepted));
  ok(
    "patch-acceptedAt-iso",
    typeof patchCaptured.sellerConsentAcceptedAt === "string" &&
      /\d{4}-\d{2}-\d{2}T/.test(String(patchCaptured.sellerConsentAcceptedAt)),
    String(patchCaptured.sellerConsentAcceptedAt)
  );
  ok("patch-version", typeof patchCaptured.sellerConsentVersion === "string" && String(patchCaptured.sellerConsentVersion).length > 0, String(patchCaptured.sellerConsentVersion));
  ok("patch-source", patchCaptured.sellerConsentSource === "chat-publish", String(patchCaptured.sellerConsentSource));
  ok("patch-textKey", patchCaptured.sellerConsentTextKey === "seller-publish-consent-v1", String(patchCaptured.sellerConsentTextKey));
}

// 3) Failed publish must not imply persistence (server update fails).
const sessionFail = "sess-consent-fail";
const beganFail = handleMemberPublishListingIntent({
  sessionId: sessionFail,
  messages: [savedCardMsg],
});
ok("begin-publish-summary-fail", beganFail.kind === "summary", beganFail.kind);
setPublishConsentAccepted(sessionFail, true);
const depsFail = {
  fetchMyListings: async () => [makeCar()],
  setListingVisible: async () => {
    throw new Error("network");
  },
};
const failed = await confirmMemberPublishListingFromChat(
  { sessionId: sessionFail, ownerId, canPublish: true },
  depsFail
);
ok("failed-publish-blocked", failed.kind === "blocked", failed.kind);

// Sanity: no prompt/chat persisted in patch schema (we only send metadata keys).
if (patchCaptured) {
  assert(!("messages" in patchCaptured), "patch must not include chat messages");
}

console.log("\n=== v5.4.7e seller consent persistence — done ===\n");

