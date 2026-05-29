import { extractCarFieldsFromMessage, isSellIntent, buildDraftPreviewCopy } from "../src/services/ai/chat/sellIntentParser";
import { buildDealerDraftPayloadFromChat } from "../src/services/ai/chat/chatDraftActions";
import {
  getPublishMissingLabelsThai,
  validateDraftForPublish,
} from "../src/utils/dealerPublishGuard";
import {
  getChatDraftSaveMissingLabels,
  resolveMissingFieldsAfterChatImageUpload,
} from "../src/services/ai/chat/chatDraftSaveResult";
import {
  bootstrapPrecheckFields,
  buildDraftCopyReadyReply,
  clearPrecheckContext,
  getMissingCoreFieldLabels,
  getPrecheckContext,
  hasCoreFieldsComplete,
  mergeEffectivePrecheckFields,
  isConfirmCreateListingIntent,
  setPrecheckStage,
  upsertPrecheckFromMessage,
  restorePrecheckContext,
} from "../src/services/ai/chat/chatPrecheckLayer";
import {
  clearPendingChatDraftSnapshot,
  consumePendingChatDraftSnapshot,
  peekPendingChatDraftSnapshot,
  savePendingChatDraftSnapshot,
  serializeMessagesForSnapshot,
  buildPostLoginDraftSavedText,
} from "../src/utils/chatPendingDraftSnapshot";
import {
  buildPendingListingCardData,
  extractMarketingCopyFromDraftText,
  isMemberConsumerSellerFlow,
  isMemberListingChatAction,
  CHAT_MEMBER_PENDING_CARD_INTRO,
} from "../src/services/chat/chatMemberPendingListing";
import {
  buildMemberListingApiPayload,
  buildMemberListingSuccessMessage,
  chatFlowExpectsListingImages,
  CHAT_MEMBER_NEED_IMAGES_BEFORE_SAVE_MESSAGE,
} from "../src/services/chat/saveMemberListingFromChat";
import {
  buildSavedMemberListingCardData,
  listingImageUrlsToChatAttachments,
  SAVED_MEMBER_LISTING_STATUS_LABEL,
  CHAT_MEMBER_PUBLISH_COMING_SOON_ACK,
} from "../src/services/chat/chatSavedMemberListing";
import {
  collectAllChatImageFilesForMemberListing,
  registerChatImageMessageFiles,
  toChatImageMessageAttachments,
} from "../src/features/chat-image-attachment-v1/chatImageAttachmentStore";
import type { PendingChatImageAttachment } from "../src/features/chat-image-attachment-v1/types";

function assertEqual(actual: any, expected: any, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`❌ FAIL: ${message}`);
    console.error(`   Expected:`, expected);
    console.error(`   Actual:  `, actual);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("--- Testing Chat to Draft Phase 3 ---");

// Test 1: Detect Sell Intent
assertEqual(isSellIntent("ช่วยลงขาย Honda CRV ปี 2019"), true, "Detect 'ช่วยลงขาย'");
assertEqual(isSellIntent("อยากขายรถครับ"), true, "Detect 'อยากขายรถ'");
assertEqual(isSellIntent("มีรถไม่เกิน 7 แสนไหม"), false, "Should not detect search intent as sell intent");

// Test 2: Extract Full Fields
const msg1 = "ช่วยลงขาย Honda CRV ปี 2019 สีดำ ราคา 389000 ไมล์ 88000 มีเบาะหนัง จอทัชสกรีน ฝาท้ายไฟฟ้า";
const fields1 = extractCarFieldsFromMessage(msg1);
assertEqual(fields1.brand, "Honda", "Extract brand");
assertEqual(fields1.model, "CR-V", "Extract model");
assertEqual(fields1.year, 2019, "Extract year");
assertEqual(fields1.color, "ดำ", "Extract color");
assertEqual(fields1.price, 389000, "Extract price");
assertEqual(fields1.mileage, 88000, "Extract mileage");
assertEqual(fields1.description, "เบาะหนัง, จอทัชสกรีน, ฝาท้ายไฟฟ้า", "Extract description");

// Test 3: Extract "7 แสน"
const msg2 = "ขายรถ Toyota Yaris ปี 2020 ราคา 7 แสน";
const fields2 = extractCarFieldsFromMessage(msg2);
assertEqual(fields2.price, 700000, "Extract price '7 แสน'");

// Test 4: Extract "1.2 ล้าน"
const msg3 = "ปล่อย Civic ปี 2022 1.2 ล้าน";
const fields3 = extractCarFieldsFromMessage(msg3);
assertEqual(fields3.price, 1200000, "Extract price '1.2 ล้าน'");

// Test 5: Build Preview Copy
const preview = buildDraftPreviewCopy(fields1);
if (preview.includes("ยี่ห้อ: Honda") && preview.includes("ราคา: 389,000 บาท") && preview.includes("ก่อนลงขายครับ")) {
  console.log("✅ PASS: Build preview copy looks correct");
} else {
  console.error("❌ FAIL: Build preview copy");
  console.error(preview);
  process.exit(1);
}

// Test 6: Missing Info
const msg4 = "ช่วยขายรถหน่อย";
const fields4 = extractCarFieldsFromMessage(msg4);
const preview4 = buildDraftPreviewCopy(fields4);
if (preview4.includes("ยังขาดข้อมูล ยี่ห้อ/รุ่น, ปี, ราคา, เลขไมล์")) {
  console.log("✅ PASS: Missing info message is correct");
} else {
  console.error("❌ FAIL: Missing info message");
  console.error(preview4);
  process.exit(1);
}

const incompleteDraft = buildDealerDraftPayloadFromChat(fields4);
if (
  incompleteDraft.payload &&
  incompleteDraft.payload.title === "ร่างประกาศจากแชท" &&
  incompleteDraft.missing.includes("เลขไมล์")
) {
  console.log("✅ PASS: Incomplete chat-to-draft still builds draft payload");
} else {
  console.error("❌ FAIL: Incomplete chat-to-draft payload");
  console.error(incompleteDraft);
  process.exit(1);
}

const missingMileageNoImageFields = extractCarFieldsFromMessage(
  "ช่วยลงขาย Honda Civic ปี 2020 ราคา 350000"
);
const missingMileageNoImageDraft = buildDealerDraftPayloadFromChat(
  missingMileageNoImageFields
);
const missingMileageNoImageCheck = validateDraftForPublish({
  id: "draft-chat-missing-image",
  ...missingMileageNoImageDraft.payload,
  images: [],
});
const missingMileageNoImageLabels = getPublishMissingLabelsThai(
  missingMileageNoImageCheck.missingFields
);
if (
  missingMileageNoImageCheck.missingFields.includes("mileage") &&
  missingMileageNoImageCheck.missingFields.includes("image") &&
  missingMileageNoImageLabels.includes("ขาดเลขไมล์") &&
  missingMileageNoImageLabels.includes("ขาดรูปภาพสินค้า")
) {
  console.log("✅ PASS: Chat draft checklist includes missing mileage and image");
} else {
  console.error("❌ FAIL: Chat draft checklist should include mileage and image");
  console.error(missingMileageNoImageCheck);
  process.exit(1);
}

const afterChatImageUpload = resolveMissingFieldsAfterChatImageUpload(
  ["image"],
  ["https://firebasestorage.googleapis.com/v0/b/nonga-ce93c.firebasestorage.app/o/draft-images%2Fdealer%2Fdraft%2F01.webp?alt=media"]
);
const afterChatImageLabels = getChatDraftSaveMissingLabels(afterChatImageUpload);
assertEqual(
  afterChatImageUpload,
  [],
  "Chat save removes missing image after successful upload"
);
assertEqual(
  afterChatImageLabels,
  [],
  "Chat save should not show missing image label after successful upload"
);

const partialInfoAfterUpload = resolveMissingFieldsAfterChatImageUpload(
  ["image", "mileage"],
  ["/storage/listings/draft-chat/01.webp"]
);
assertEqual(
  partialInfoAfterUpload,
  ["mileage"],
  "Chat save preserves non-image missing fields after image upload"
);

// Test 7: Tab-separated showroom paste (Toyota Camry)
const CAMRY_TAB =
  "Toyota\tCamry\t9กณ7385\t2.5 Hybrid\tบ.หนังไฟฟ้าคู่หน้า + AB7 + Engine Start + Smart Keyless + พวงมาลัยมัลติ + Cruise Control + จอทัชกรีน + วิทยุ FM/AM + USB + บลูธูท + กล้องถอย + ไฟDay Light + กระจกมองข้างปรับและพับไฟฟ้า + แอร์ออโต้ Dual Zone + ม่านหลังไฟฟ้า + เซ็นเซอร์หน้า2 หลัง4 + Sunroof + ล้อแม็ก + M.17/K\tเกียร์ AT\t2019\tสีเทา\tเลขไมล์ 120,384\t819,000 บาท ลงประกาศขายรายการนี้ได้ไหมครับ";

const camry = extractCarFieldsFromMessage(CAMRY_TAB);
assertEqual(camry.brand, "Toyota", "Camry tab: brand");
assertEqual(camry.model, "Camry", "Camry tab: model");
assertEqual(camry.licensePlate, "9กณ7385", "Camry tab: plate");
assertEqual(camry.trimSubModel, "2.5 Hybrid", "Camry tab: trim");
assertEqual(camry.year, 2019, "Camry tab: year");
assertEqual(camry.color, "เทา", "Camry tab: color");
assertEqual(camry.mileage, 120384, "Camry tab: mileage");
assertEqual(camry.price, 819000, "Camry tab: price");
assertEqual(camry.transmission, "เกียร์ AT", "Camry tab: transmission");
if (!camry.description?.includes("หนังไฟฟ้า") && !camry.description?.includes("Sunroof")) {
  console.error("❌ FAIL: Camry tab: description should include features");
  console.error(camry.description);
  process.exit(1);
} else {
  console.log("✅ PASS: Camry tab: description includes features");
}

const camryPreview = buildDraftPreviewCopy(camry);
if (camryPreview.includes("ปี: 2019") && camryPreview.includes("819,000 บาท")) {
  console.log("✅ PASS: Camry tab preview shows year and price");
} else {
  console.error("❌ FAIL: Camry tab preview");
  console.error(camryPreview);
  process.exit(1);
}

console.log("--- Testing precheck confirm gate ---");

const precheckSid = "test-precheck-confirm-gate";
clearPrecheckContext(precheckSid);

const coreOnly = {
  brand: "Toyota",
  model: "Camry",
  year: 2019,
  price: 819000,
  mileage: 120384,
  transmission: "เกียร์ AT",
};
assertEqual(
  getMissingCoreFieldLabels(coreOnly).length,
  0,
  "Core fields complete without color or description"
);
assertEqual(hasCoreFieldsComplete(coreOnly), true, "hasCoreFieldsComplete");

const missingDescOnly = { ...coreOnly, description: undefined };
assertEqual(
  getMissingCoreFieldLabels(missingDescOnly).length,
  0,
  "Description is optional for confirm gate"
);

assertEqual(isConfirmCreateListingIntent("ยืนยันสร้างประกาศ"), true, "Confirm: ยืนยันสร้างประกาศ");
assertEqual(isConfirmCreateListingIntent("ตกลง สร้างเลย"), true, "Confirm: ตกลง สร้างเลย");
assertEqual(isConfirmCreateListingIntent("เอาเลย"), true, "Confirm: เอาเลย");

upsertPrecheckFromMessage(
  precheckSid,
  "Toyota Camry ปี 2019 ราคา 819000 ไมล์ 120384 เกียร์ AT"
);
setPrecheckStage(precheckSid, "draft_copy_ready");
upsertPrecheckFromMessage(precheckSid, "จุดเด่น เบาะหนัง Sunroof");
const afterOptional = getPrecheckContext(precheckSid);
assertEqual(
  afterOptional?.stage,
  "draft_copy_ready",
  "Optional highlights do not revert to collecting_missing_fields"
);
assertEqual(
  getMissingCoreFieldLabels(afterOptional?.fields ?? {}).length,
  0,
  "Still core-complete after optional highlights"
);

clearPrecheckContext(precheckSid);
bootstrapPrecheckFields(precheckSid, coreOnly);
const bootstrapped = getPrecheckContext(precheckSid);
assertEqual(bootstrapped?.stage, "draft_copy_ready", "Bootstrap with core fields reaches draft_copy_ready");

const marketingCopy = buildDraftCopyReadyReply(
  {
    brand: "Honda",
    model: "CR-V",
    year: 2020,
    price: 789000,
    mileage: 58000,
    transmission: "ออโต้",
    color: "ดำ",
  },
  "NA-2026-TEST",
  "ยืนยันสร้างประกาศ",
  { bodyType: "SUV" },
  1
);
if (
  marketingCopy.includes("[โพสต์ตัวอย่าง]") &&
  marketingCopy.includes("[ข้อมูลสำหรับตรวจสอบก่อนยืนยัน]") &&
  marketingCopy.includes("ใครกำลังมองหา SUV") &&
  marketingCopy.includes("Honda CR-V") &&
  marketingCopy.includes("789,000") &&
  marketingCopy.includes("• ยี่ห้อ/รุ่น: Honda CR-V") &&
  marketingCopy.includes("• รูปภาพ: แนบ 1 รูป") &&
  !marketingCopy.includes("ข้อมูลชุดนี้พร้อมนำไปต่อยอด") &&
  !marketingCopy.includes("เจ้าของมือเดียว") &&
  !marketingCopy.includes("น้ำท่วม")
) {
  console.log("✅ PASS: Draft preview has sales copy + verification sections");
} else {
  console.error("❌ FAIL: Draft preview dual sections");
  console.error(marketingCopy);
  process.exit(1);
}

const visionOnlyBrand = mergeEffectivePrecheckFields(
  { year: 2020, price: 789000, mileage: 58000, transmission: "ออโต้" },
  { brand: "Honda", model: "CR-V", color: "ดำ" }
);
assertEqual(
  getMissingCoreFieldLabels(visionOnlyBrand).includes("ยี่ห้อ"),
  false,
  "Vision brand/model does not trigger missing brand/model prompts"
);
assertEqual(
  hasCoreFieldsComplete(
    { year: 2020, price: 789000, mileage: 58000, transmission: "ออโต้" },
    { brand: "Honda", model: "CR-V" }
  ),
  true,
  "Core complete when vision supplies brand/model"
);

console.log("--- Testing pending draft snapshot (post-login restore) ---");

const sessionStore = new Map<string, string>();
const mockSessionStorage = {
  getItem: (key: string) => sessionStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    sessionStore.set(key, value);
  },
  removeItem: (key: string) => {
    sessionStore.delete(key);
  },
  clear: () => sessionStore.clear(),
  length: 0,
  key: () => null,
} as Storage;

(globalThis as { sessionStorage?: Storage }).sessionStorage = mockSessionStorage;

const snapFields = {
  brand: "Honda",
  model: "HR-V",
  year: 2020,
  price: 789000,
  mileage: 58000,
  transmission: "ออโต้",
};

savePendingChatDraftSnapshot({
  publicRefCode: "NA-2026-SNAP",
  fields: snapFields,
  visionSummary: { bodyType: "SUV", color: "ดำ" },
  draftPreviewText: "[โพสต์ตัวอย่าง]\nHonda HR-V",
  messages: serializeMessagesForSnapshot([
    {
      id: "u1",
      sender: "user",
      text: "ช่วยสร้างประกาศ",
      timestamp: Date.now(),
    },
  ] as any),
  imageCount: 2,
  thumbnailsPersisted: true,
  userAlreadyConfirmedCreateDraft: true,
  draftPreviewAttachments: [
    {
      id: "img-1",
      kind: "image",
      name: "car.jpg",
      size: 1000,
      mimeType: "image/jpeg",
      previewDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
    },
  ],
});

const peeked = peekPendingChatDraftSnapshot();
assertEqual(peeked?.publicRefCode, "NA-2026-SNAP", "Snapshot save/load ref code");
assertEqual(peeked?.fields.brand, "Honda", "Snapshot save/load fields");

const consumed = consumePendingChatDraftSnapshot();
assertEqual(consumed?.publicRefCode, "NA-2026-SNAP", "Snapshot consume");
assertEqual(peekPendingChatDraftSnapshot(), null, "Snapshot cleared after consume");

const restoreSid = "restore-precheck-session";
restorePrecheckContext(restoreSid, {
  fields: snapFields,
  publicRefCode: "NA-2026-RESTORE",
  stage: "draft_copy_ready",
});
const restoredCtx = getPrecheckContext(restoreSid);
assertEqual(restoredCtx?.stage, "draft_copy_ready", "restorePrecheckContext stage");
assertEqual(restoredCtx?.publicRefCode, "NA-2026-RESTORE", "restorePrecheckContext ref");

assertEqual(
  peeked?.userAlreadyConfirmedCreateDraft,
  true,
  "Snapshot stores userAlreadyConfirmedCreateDraft"
);

const savedMsg = buildPostLoginDraftSavedText("NA-2026-TEST");
if (
  savedMsg.includes("บันทึกเป็นประกาศร่างเรียบร้อยแล้ว") &&
  savedMsg.includes("NA-2026-TEST") &&
  savedMsg.includes("ตรวจทานประกาศ")
) {
  console.log("✅ PASS: Post-login draft saved message format");
} else {
  console.error("❌ FAIL: Post-login draft saved message");
  process.exit(1);
}

clearPendingChatDraftSnapshot();
sessionStore.clear();

console.log("--- Testing member in-chat pending listing card ---");

const draftText =
  "[โพสต์ตัวอย่าง]\nHonda HR-V 2020 สภาพดี\n\n[ข้อมูลสำหรับตรวจสอบก่อนยืนยัน]\nปี: 2020";
const marketing = extractMarketingCopyFromDraftText(draftText);
assertEqual(
  marketing.includes("Honda HR-V 2020"),
  true,
  "extractMarketingCopyFromDraftText"
);
assertEqual(
  marketing.includes("[ข้อมูลสำหรับตรวจสอบ"),
  false,
  "extractMarketingCopy strips verification section"
);

const card = buildPendingListingCardData({
  fields: snapFields,
  publicRefCode: "NA-2026-CARD",
  draftPreviewText: draftText,
  visionSummary: { color: "ดำ" },
});
assertEqual(card.publicRefCode, "NA-2026-CARD", "pending card ref code");
assertEqual(card.statusLabel, "ร่างประกาศ รอตรวจทาน", "pending card status");
assertEqual(card.fields.brand, "Honda", "pending card fields");

assertEqual(
  isMemberConsumerSellerFlow({
    isSignedIn: true,
    isDealer: false,
    isAdmin: false,
    chatScopeMode: "consumer",
  }),
  true,
  "member consumer seller flow"
);
assertEqual(
  isMemberConsumerSellerFlow({
    isSignedIn: true,
    isDealer: true,
    isAdmin: false,
    chatScopeMode: "consumer",
  }),
  false,
  "dealer excluded from member consumer flow"
);

assertEqual(isMemberListingChatAction("ยืนยันบันทึกประกาศ"), true, "member confirm action");
assertEqual(isMemberListingChatAction("ยังไม่ลงตลาดตอนนี้"), true, "member not-now action");
assertEqual(
  CHAT_MEMBER_PENDING_CARD_INTRO.includes("ไม่ต้องย้ายหน้า"),
  true,
  "member card intro stays in chat"
);

const memberPayload = buildMemberListingApiPayload({
  fields: snapFields,
  visionSummary: { bodyType: "SUV", color: "ดำ" },
  ownerId: "member-uid-1",
  ownerName: "ลุงทดสอบ",
  ownerPhone: "0812345678",
});
assertEqual(memberPayload.missing.length, 0, "member payload core fields complete");
assertEqual(memberPayload.payload.brand, "Honda", "member payload brand");

assertEqual(
  chatFlowExpectsListingImages(
    [
      {
        id: "m1",
        sender: "user",
        text: "x",
        createdAt: "",
        attachments: [
          {
            id: "a1",
            kind: "image",
            name: "c.jpg",
            size: 1000,
            mimeType: "image/jpeg",
          },
        ],
      },
    ],
    undefined
  ),
  true,
  "chat flow expects images when user attached"
);

const successMsg = buildMemberListingSuccessMessage({
  publicRefCode: "NA-2026-CARD",
  listingId: "car-123",
});
assertEqual(successMsg.includes("บันทึกประกาศร่างเรียบร้อยแล้ว"), true, "member success message");
assertEqual(successMsg.includes("NA-2026-CARD"), true, "member success ref code");
assertEqual(
  CHAT_MEMBER_NEED_IMAGES_BEFORE_SAVE_MESSAGE.includes("แนบรูป"),
  true,
  "need-images message asks re-attach"
);

const savedCard = buildSavedMemberListingCardData({
  listingId: "car-1780010831953",
  publicRefCode: "NA-2026-8FD9",
  fields: snapFields,
  marketingCopy: "Honda HR-V 2020",
  imageUrls: ["/storage/listings/car-1780010831953/photo-1.jpg"],
});
assertEqual(savedCard.listingId, "car-1780010831953", "saved card listing id");
assertEqual(savedCard.statusLabel, SAVED_MEMBER_LISTING_STATUS_LABEL, "saved card status");
assertEqual(savedCard.imageUrls.length, 1, "saved card image urls");

const savedAttachments = listingImageUrlsToChatAttachments(savedCard.imageUrls);
assertEqual(savedAttachments[0]?.imageUrl?.includes("car-1780010831953"), true, "saved attachment url");
assertEqual(
  CHAT_MEMBER_PUBLISH_COMING_SOON_ACK.includes("รอบถัดไป"),
  true,
  "publish coming soon ack"
);

console.log("--- Testing collect all member listing images ---");

function makePending(id: string): PendingChatImageAttachment {
  const blob = new Blob([`fake-${id}`], { type: "image/jpeg" });
  const file = new File([blob], `${id}.jpg`, { type: "image/jpeg" });
  return {
    id,
    kind: "image",
    originalFileName: `${id}.jpg`,
    fileName: `${id}.jpg`,
    optimizedFile: file,
    previewUrl: `blob:fake-${id}`,
    mimeType: "image/jpeg",
    size: file.size,
    width: 100,
    height: 100,
  };
}

const scopeKey = "test-member-images";
const sid = "session-member-images";
const msgA = "msg-images-a";
const msgB = "msg-images-b";
const pendingA = [makePending("img-a1"), makePending("img-a2"), makePending("img-a3")];
const pendingB = [makePending("img-b1"), makePending("img-b2")];
registerChatImageMessageFiles(
  scopeKey,
  sid,
  msgA,
  pendingA,
  toChatImageMessageAttachments(pendingA)
);
registerChatImageMessageFiles(
  scopeKey,
  sid,
  msgB,
  pendingB,
  toChatImageMessageAttachments(pendingB)
);

const collected = collectAllChatImageFilesForMemberListing(scopeKey, sid, [
  {
    id: msgA,
    sender: "user",
    text: "รูปชุดแรก",
    createdAt: new Date().toISOString(),
    attachments: toChatImageMessageAttachments(pendingA),
  },
  {
    id: msgB,
    sender: "user",
    text: "รูปชุดสอง",
    createdAt: new Date().toISOString(),
    attachments: toChatImageMessageAttachments(pendingB),
  },
] as any);

assertEqual(collected.length, 5, "collectAllChatImageFilesForMemberListing all messages");

console.log("--- All Chat to Draft tests passed! ---");
