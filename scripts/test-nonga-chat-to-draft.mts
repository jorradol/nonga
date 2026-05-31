import { extractCarFieldsFromMessage, isSellIntent, buildDraftPreviewCopy } from "../src/services/ai/chat/sellIntentParser";
import { buildDealerDraftPayloadFromChat } from "../src/services/ai/chat/chatDraftActions";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator";
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
  isListingCreateWithImagesMessage,
  isConfirmCreateListingIntent,
  setPrecheckStage,
  upsertPrecheckFromMessage,
  restorePrecheckContext,
} from "../src/services/ai/chat/chatPrecheckLayer";
import {
  clearPendingChatDraftSnapshot,
  clearPendingDraftRestoreMeta,
  finalizePendingDraftAfterRestore,
  hasPendingChatDraftSnapshotInStorage,
  isPendingDraftRestoreFailed,
  isPendingDraftRestoreFallbackShown,
  isPendingDraftSnapshotRestored,
  markPendingDraftRestoreFailed,
  peekPendingChatDraftSnapshot,
  readPendingChatDraftSnapshot,
  readPendingDraftRestoreMeta,
  savePendingChatDraftSnapshot,
  buildPostLoginPartialImageRestoreNote,
  serializeMessagesForSnapshot,
  buildPostLoginDraftSavedText,
  POST_LOGIN_DRAFT_RESTORE_FAILED_NOTE,
  POST_LOGIN_PENDING_CARD_RESTORE_NOTE,
  persistAttachmentsForSnapshot,
  MAX_PERSISTED_SNAPSHOT_IMAGES,
} from "../src/utils/chatPendingDraftSnapshot";
import {
  readChatHistorySnapshot,
  setChatHistoryStorageForTest,
  appendChatMessage,
  loadChatMessages,
  createChatSession,
} from "../src/services/chat/chatHistoryService";
import {
  tryClaimGuestChatAfterLogin,
  shouldSkipSnapshotRestoreAfterClaim,
  rehydrateClaimedGuestChatImageStore,
} from "../src/services/chat/claimGuestChatAfterLogin";
import {
  resetGuestConfirmedAutoSaveStateForTest,
  sessionHasSavedListingForRef,
  tryContinueGuestConfirmedMemberListingSave,
  type ContinueGuestConfirmedSaveDeps,
} from "../src/services/chat/continueGuestConfirmedMemberListingSave";
import {
  hasGuestConfirmedPendingHandoff,
  resetGuestConfirmedLoginHandoffStateForTest,
  shouldDeferGuestImageScopeClear,
  tryRunGuestConfirmedLoginHandoff,
} from "../src/services/chat/guestConfirmedLoginHandoff";
import {
  saveGuestChatClaimPointer,
  readGuestChatClaimPointer,
  clearGuestChatClaimPointer,
} from "../src/utils/chatGuestClaim";
import {
  appendPendingRestoreFallbackMessage,
  countPendingListingCardsForRef,
  tryRestorePendingChatDraftAfterLogin,
} from "../src/services/chat/restorePendingChatDraft";
import {
  prepareSnapshotImageAttachmentsForDisplay,
  collectAllChatImageFilesForMemberListing,
  collectAllChatImageFilesForMemberListingCapInfo,
  collectChatImagesForDraft,
  capStoredChatImagesForListing,
  collectDraftPreviewDisplayAttachments,
  clearChatImageAttachmentScope,
  countChatImageAttachmentsInSession,
  markChatImageMessageForPendingListing,
  migrateChatImageAttachmentScope,
  registerChatImageMessageFiles,
  toChatImageMessageAttachments,
} from "../src/features/chat-image-attachment-v1/chatImageAttachmentStore";
import { CHAT_IMAGE_ATTACHMENT_MAX_FILES } from "../src/features/chat-image-attachment-v1/types";
import {
  LISTING_MAX_IMAGES_PER_LISTING,
  LISTING_MIN_IMAGES_FOR_PUBLISH,
  LISTING_IMAGE_UPLOAD_BATCH_SIZE,
  LISTING_CARD_MAX_THUMBNAILS,
  SNAPSHOT_MAX_PREVIEW_IMAGES,
  buildChatListingImageCapTruncatedNote,
} from "../src/constants/listingImagePolicy";
import { useChatStore } from "../src/stores/chat/chatStore";
import {
  buildPendingListingCardData,
  extractMarketingCopyFromDraftText,
  isMemberConsumerSellerFlow,
  isMemberListingChatAction,
  CHAT_MEMBER_PENDING_CARD_INTRO,
  normalizeExtractedCarFields,
  normalizePendingListingCardData,
  resolveMemberPendingListingSaveContext,
} from "../src/services/chat/chatMemberPendingListing";
import {
  sanitizeChatMessageForStorage,
} from "../src/services/chat/chatHistoryService";
import { sanitizeFirestoreDocument } from "../src/server/firestoreDocumentSanitize.ts";
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
  buildPublishedMemberListingCardData,
  normalizePublishedMemberListingCardData,
  PUBLISHED_MEMBER_LISTING_STATUS_LABEL,
  resolveSavedCardForPublishedListing,
} from "../src/services/chat/chatPublishedMemberListing";
import {
  beginPendingPublishListingFromSavedCard,
  buildPublishAwaitingConfirmMessage,
  buildPublishBlockedMessage,
  buildPublishMissingCoreFieldsMessage,
  buildPublishSuccessMessage,
  carRecordToExtractedFields,
  buildPublishSummaryMessage,
  canEnterMemberPublishInChatFlow,
  CHAT_MEMBER_CANCEL_PUBLISH_ACTION,
  CHAT_MEMBER_CONFIRM_PUBLISH_ACTION,
  CHAT_PUBLISH_ALREADY_PUBLISHED_MESSAGE,
  CHAT_PUBLISH_MEMBER_ONLY_MESSAGE,
  confirmMemberPublishListingFromChat,
  findLatestSavedMemberListingCardMessage,
  handleMemberCancelPublishIntent,
  handleMemberPublishListingIntent,
  isMemberCancelPublishListingChatAction,
  isMemberConfirmPublishListingChatAction,
  preflightMemberListingRecordForChatPublish,
  validateMemberListingReadyToPublish,
} from "../src/services/chat/publishMemberListingFromChat";
import {
  clearAllPendingPublishListingContextsForTest,
  clearPendingPublishListingContext,
  getPendingPublishListingContext,
  setPendingPublishListingContext,
} from "../src/services/chat/chatPendingPublishListing";
import type { PendingChatImageAttachment } from "../src/features/chat-image-attachment-v1/types";
import fs from "node:fs";
import path from "node:path";

import type { Car } from "../src/types";

function mockHiddenMemberListing(
  id: string,
  ownerId = "member-pub-1",
  overrides: Partial<Car> = {}
): Car {
  return {
    id,
    title: "Honda HR-V",
    brand: "Honda",
    model: "HR-V",
    year: 2020,
    price: 650000,
    mileage: 42000,
    type: "used",
    condition: "good",
    fuelType: "petrol",
    transmission: "อัตโนมัติ",
    images: [`/storage/listings/${id}/photo-1.jpg`],
    description: "test listing",
    ownerId,
    ownerName: "Test Member",
    ownerPhone: "0812345678",
    isSold: false,
    listingStatus: "hidden",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

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
  (marketingCopy.includes("มุมครอบครัว/อเนกประสงค์") ||
    marketingCopy.includes("เหมาะกับคนที่มองหารถใช้งานหลายแบบ")) &&
  marketingCopy.includes("Honda CR-V") &&
  marketingCopy.includes("789,000") &&
  marketingCopy.includes("• ยี่ห้อ/รุ่น: Honda CR-V") &&
  marketingCopy.includes("• รูปภาพ: แนบ 1 รูป") &&
  !marketingCopy.includes("ข้อมูลชุดนี้พร้อมนำไปต่อยอด") &&
  !marketingCopy.includes("ใครกำลังมองหา SUV") &&
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

console.log("--- Testing image+text field extraction and precheck merge ---");

const imageListingMsg =
  "ช่วยประกาศขายรถในรูป ราคาขาย 892025 บาท เลขไมล์ 52025 เกียร์ออโต้ ปี 2025";
const imageListingFields = extractCarFieldsFromMessage(imageListingMsg);
assertEqual(imageListingFields.price, 892025, "parse price from ราคาขาย ... บาท");
assertEqual(imageListingFields.mileage, 52025, "parse mileage from เลขไมล์");
assertEqual(imageListingFields.year, 2025, "parse year from ปี 2025");
assertEqual(
  imageListingFields.transmission?.includes("ออโต้"),
  true,
  "parse transmission from เกียร์ออโต้"
);
assertEqual(
  isSellIntent(imageListingMsg),
  true,
  "sell intent matches ช่วยประกาศขาย"
);
assertEqual(
  isListingCreateWithImagesMessage(imageListingMsg),
  true,
  "listing create with images message detected"
);

const mergedUserVision = mergeEffectivePrecheckFields(imageListingFields, {
  brand: "Toyota",
  model: "Fortuner",
});
const missingAfterMerge = getMissingCoreFieldLabels(mergedUserVision);
assertEqual(
  missingAfterMerge.includes("ปี"),
  false,
  "does not ask for year already supplied"
);
assertEqual(
  missingAfterMerge.includes("ราคา"),
  false,
  "does not ask for price already supplied"
);
assertEqual(
  missingAfterMerge.includes("เลขไมล์"),
  false,
  "does not ask for mileage already supplied"
);
assertEqual(
  missingAfterMerge.includes("เกียร์"),
  false,
  "does not ask for transmission already supplied"
);
assertEqual(missingAfterMerge.length, 0, "vision+user text merge avoids duplicate questions");

const missingBrandOnly = getMissingCoreFieldLabels(
  mergeEffectivePrecheckFields(imageListingFields, undefined)
);
assertEqual(
  missingBrandOnly.includes("ยี่ห้อ") && missingBrandOnly.includes("รุ่น"),
  true,
  "asks only brand/model when other core fields supplied"
);
assertEqual(
  missingBrandOnly.includes("ปี"),
  false,
  "missing prompt skips year when in message"
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

finalizePendingDraftAfterRestore("NA-2026-SNAP", "session-test-1");
assertEqual(isPendingDraftSnapshotRestored("NA-2026-SNAP"), true, "restore meta marks restored");
assertEqual(peekPendingChatDraftSnapshot(), null, "Snapshot cleared after finalize");
assertEqual(readPendingDraftRestoreMeta()?.sessionId, "session-test-1", "restore meta keeps sessionId");

clearPendingChatDraftSnapshot();
clearPendingDraftRestoreMeta();
savePendingChatDraftSnapshot({
  publicRefCode: "NA-VISION-ONLY",
  fields: {
    year: 2020,
    price: 450000,
    mileage: 40000,
    transmission: "ออโต้",
  },
  visionSummary: { brand: "Toyota", model: "Camry" },
  draftPreviewText: "[โพสต์ตัวอย่าง]\nToyota Camry",
  messages: [],
  imageCount: 1,
  thumbnailsPersisted: false,
  userAlreadyConfirmedCreateDraft: true,
});
const visionOnlyRead = readPendingChatDraftSnapshot();
assertEqual(visionOnlyRead.ok, true, "vision-only snapshot read ok");
if (visionOnlyRead.ok) {
  assertEqual(visionOnlyRead.snapshot.fields.brand, "Toyota", "vision merged into fields");
}
const visionPeek1 = peekPendingChatDraftSnapshot();
const visionPeek2 = peekPendingChatDraftSnapshot();
assertEqual(Boolean(visionPeek1 && visionPeek2), true, "peek does not clear snapshot");
clearPendingChatDraftSnapshot();

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
clearPendingDraftRestoreMeta();
sessionStore.clear();

console.log("--- Testing idempotent post-login restore (single card, no session spam) ---");

function createMemoryStorageForChat(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  } as Storage;
}

const chatHistoryStorage = createMemoryStorageForChat();
setChatHistoryStorageForTest(chatHistoryStorage);

const restoreMemberScope = {
  storageKey: "user:uid-restore-idem",
  dealerId: null,
  userId: "uid-restore-idem",
  mode: "consumer" as const,
};

useChatStore.getState().resetChatState();
await useChatStore.getState().loadSessions(restoreMemberScope);
const sessionsBeforeRestore = useChatStore.getState().sessions.length;

savePendingChatDraftSnapshot({
  publicRefCode: "NA-IDEM-RESTORE",
  fields: snapFields,
  visionSummary: { bodyType: "SUV" },
  draftPreviewText: "[โพสต์ตัวอย่าง]\nHonda HR-V",
  messages: [],
  imageCount: 0,
  thumbnailsPersisted: false,
  userAlreadyConfirmedCreateDraft: true,
});

const restoreDeps = {
  storageScopeKey: restoreMemberScope.storageKey,
  isDealer: () => false,
  isAdmin: () => false,
  isMemberConsumerSeller: () => true,
};

const parallelResults = await Promise.all([
  tryRestorePendingChatDraftAfterLogin(restoreMemberScope, restoreDeps),
  tryRestorePendingChatDraftAfterLogin(restoreMemberScope, restoreDeps),
  tryRestorePendingChatDraftAfterLogin(restoreMemberScope, restoreDeps),
]);
const restoredOk = parallelResults.filter((result) => result.restored).length;
assertEqual(restoredOk >= 1, true, "parallel restore: at least one success");
assertEqual(
  countPendingListingCardsForRef("NA-IDEM-RESTORE"),
  1,
  "parallel restore: exactly one pending card"
);
assertEqual(
  useChatStore.getState().sessions.length,
  sessionsBeforeRestore,
  "parallel restore: no extra sidebar sessions"
);

const activeId = useChatStore.getState().activeSessionId;
const activeMessages = activeId
  ? useChatStore.getState().messages[activeId] ?? []
  : [];
const welcomeCard = activeMessages.find((message) => message.isPendingListingCard);
assertEqual(Boolean(welcomeCard?.pendingListingCard), true, "restore adds pending card");
assertEqual(
  activeMessages.some((message) => message.text.includes(POST_LOGIN_PENDING_CARD_RESTORE_NOTE)),
  true,
  "restore welcome note on card message"
);

const saveCtxAfterRestore = resolveMemberPendingListingSaveContext({
  messages: activeMessages,
});
assertEqual(saveCtxAfterRestore.ok, true, "confirm save context ok after restore");
if (saveCtxAfterRestore.ok) {
  assertEqual(
    saveCtxAfterRestore.publicRefCode,
    "NA-IDEM-RESTORE",
    "confirm save can read pending card after restore"
  );
}

clearPendingChatDraftSnapshot();
clearPendingDraftRestoreMeta();
useChatStore.getState().resetChatState();
await useChatStore.getState().loadSessions(restoreMemberScope);

console.log("--- Testing guest chat claim after login (PR1) ---");

clearGuestChatClaimPointer();
const guestScopeKey = "user:guest-claim-test";
const memberScopeKey = "user:uid-member-claim";
const guestSessionId = "chat-guest-claim-1";
const claimNowIso = new Date().toISOString();

const guestSession = {
  id: guestSessionId,
  sessionId: guestSessionId,
  userId: guestScopeKey,
  uid: "guest-claim-test",
  dealerId: null,
  scope: "user" as const,
  storageScopeKey: guestScopeKey,
  title: "งานขายรถ (guest)",
  createdAt: claimNowIso,
  updatedAt: claimNowIso,
  status: "active" as const,
};
const guestMessages = [
  {
    id: "msg-user-1",
    sender: "user" as const,
    text: "ช่วยสร้างประกาศ",
    createdAt: claimNowIso,
  },
  {
    id: "msg-ai-card",
    sender: "ai" as const,
    text: "การ์ดร่าง",
    createdAt: claimNowIso,
    isPendingListingCard: true,
    pendingListingCard: buildPendingListingCardData({
      fields: snapFields,
      publicRefCode: "NA-CLAIM",
      draftPreviewText: "preview",
    }),
  },
];

saveGuestChatClaimPointer({
  guestStorageScopeKey: guestScopeKey,
  guestSessionId,
  publicRefCode: "NA-CLAIM",
});

const memberScope = {
  storageKey: memberScopeKey,
  userId: "uid-member-claim",
  dealerId: null,
  mode: "consumer" as const,
};
const guestScope = {
  storageKey: guestScopeKey,
  userId: "guest-claim-test",
  dealerId: null,
  mode: "consumer" as const,
};

const claimStorage = createMemoryStorageForChat();
setChatHistoryStorageForTest(claimStorage);
claimStorage.setItem(
  `nong-a-chat-sessions:${memberScopeKey}`,
  JSON.stringify([
    {
      id: "chat-member-existing",
      sessionId: "chat-member-existing",
      userId: memberScopeKey,
      uid: "uid-member-claim",
      dealerId: null,
      scope: "user",
      storageScopeKey: memberScopeKey,
      title: "ประวัติเก่า",
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
      status: "active",
    },
  ])
);
claimStorage.setItem(
  `nong-a-chat-messages:${memberScopeKey}`,
  JSON.stringify({ "chat-member-existing": [] })
);

const claim1 = await tryClaimGuestChatAfterLogin({
  previousGuestScopeKey: guestScopeKey,
  memberScope,
  guestScope,
  inMemory: {
    sessions: [guestSession],
    messages: { [guestSessionId]: guestMessages },
    activeSessionId: guestSessionId,
  },
  isMemberConsumerSeller: true,
});
assertEqual(claim1.claimed, true, "guest claim succeeds");
if (claim1.claimed) {
  assertEqual(claim1.sessionId, guestSessionId, "claim keeps same session id");
}

let memberSnap = readChatHistorySnapshot(memberScope);
assertEqual(
  memberSnap.sessions.filter((s) => s.id === guestSessionId).length,
  1,
  "member history has one claimed guest session"
);
assertEqual(memberSnap.sessions.length, 2, "member keeps old history plus claimed session");

const claim2 = await tryClaimGuestChatAfterLogin({
  previousGuestScopeKey: guestScopeKey,
  memberScope,
  guestScope,
  inMemory: { sessions: [], messages: {}, activeSessionId: null },
  isMemberConsumerSeller: true,
});
assertEqual(claim2.claimed, true, "second claim is idempotent");
memberSnap = readChatHistorySnapshot(memberScope);
assertEqual(
  memberSnap.sessions.filter((s) => s.id === guestSessionId).length,
  1,
  "hydrate twice does not duplicate claimed session"
);

assertEqual(
  shouldSkipSnapshotRestoreAfterClaim(memberScopeKey),
  true,
  "snapshot restore skipped after claim"
);
const restoreAfterClaim = await tryRestorePendingChatDraftAfterLogin(memberScope, {
  storageScopeKey: memberScopeKey,
  isDealer: () => false,
  isAdmin: () => false,
  isMemberConsumerSeller: () => true,
});
assertEqual(restoreAfterClaim.restored, false, "restore not primary after claim");
if (restoreAfterClaim.restored === false) {
  assertEqual(restoreAfterClaim.reason, "claimed", "restore returns claimed reason");
}

assertEqual(readGuestChatClaimPointer()?.status, "claimed", "claim pointer marked claimed");
clearGuestChatClaimPointer();
setChatHistoryStorageForTest(chatHistoryStorage);

console.log("--- Testing guest confirmed auto-save after login ---");
resetGuestConfirmedAutoSaveStateForTest();
clearPendingChatDraftSnapshot();
clearPendingDraftRestoreMeta();
clearPrecheckContext("autosave-session");

const autoSaveScope = {
  storageKey: "user:uid-autosave-member",
  userId: "uid-autosave-member",
  dealerId: null,
  mode: "consumer" as const,
};
useChatStore.getState().resetChatState();
await useChatStore.getState().loadSessions(autoSaveScope);
const autoSaveSessionId = await useChatStore.getState().createSession(
  autoSaveScope,
  "guest confirmed auto-save"
);

savePendingChatDraftSnapshot({
  publicRefCode: "NA-AUTO-SAVE-1",
  fields: {
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 400000,
    mileage: 30000,
    transmission: "เกียร์ออโต้",
  },
  draftPreviewText: "[โพสต์ตัวอย่าง]\nHonda City",
  messages: [],
  imageCount: 0,
  thumbnailsPersisted: false,
});

const notConfirmed = await tryContinueGuestConfirmedMemberListingSave({
  storageScopeKey: autoSaveScope.storageKey,
  sessionId: autoSaveSessionId,
  messages: [],
  ownerId: "uid-autosave-member",
  ownerName: "Test Member",
  ownerPhone: "0812345678",
});
assertEqual(notConfirmed.kind, "skipped", "auto-save skipped without confirmed flag");

savePendingChatDraftSnapshot({
  publicRefCode: "NA-AUTO-SAVE-1",
  fields: {
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 400000,
    mileage: 30000,
    transmission: "เกียร์ออโต้",
  },
  draftPreviewText: "[โพสต์ตัวอย่าง]\nHonda City",
  messages: [],
  imageCount: 0,
  thumbnailsPersisted: false,
  userAlreadyConfirmedCreateDraft: true,
});

let autoSaveCalls = 0;
const mockSavedCard = buildSavedMemberListingCardData({
  listingId: "car-auto-save-1",
  publicRefCode: "NA-AUTO-SAVE-1",
  fields: {
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 400000,
    mileage: 30000,
    transmission: "เกียร์ออโต้",
  },
  marketingCopy: "Honda City",
  imageUrls: [],
});

const autoSaveOk = await tryContinueGuestConfirmedMemberListingSave(
  {
    storageScopeKey: autoSaveScope.storageKey,
    sessionId: autoSaveSessionId,
    messages: useChatStore.getState().messages[autoSaveSessionId] ?? [],
    ownerId: "uid-autosave-member",
    ownerName: "Test Member",
    ownerPhone: "0812345678",
  },
  {
    saveListing: async () => {
      autoSaveCalls += 1;
      return {
        ok: true as const,
        listingId: "car-auto-save-1",
        message: "saved",
        imageCount: 0,
        requestedImageCount: 0,
        uploadResult: {
          storedUrls: [],
          requestedCount: 0,
          uploadedCount: 0,
          failedBatches: [],
          failedFiles: [],
        },
        savedCard: mockSavedCard,
      };
    },
  }
);
assertEqual(autoSaveOk.kind, "success", "guest confirmed auto-save success");
assertEqual(autoSaveCalls, 1, "auto-save calls save once");
const autoSaveMessages = useChatStore.getState().messages[autoSaveSessionId] ?? [];
assertEqual(
  sessionHasSavedListingForRef(autoSaveMessages, "NA-AUTO-SAVE-1"),
  true,
  "auto-save success adds saved listing card"
);
assertEqual(hasPendingChatDraftSnapshotInStorage(), false, "auto-save clears pending snapshot");

const autoSaveRepeat = await tryContinueGuestConfirmedMemberListingSave(
  {
    storageScopeKey: autoSaveScope.storageKey,
    sessionId: autoSaveSessionId,
    messages: autoSaveMessages,
    ownerId: "uid-autosave-member",
    ownerName: "Test Member",
    ownerPhone: "0812345678",
  },
  {
    saveListing: async () => {
      autoSaveCalls += 1;
      return {
        ok: true as const,
        listingId: "car-auto-save-dup",
        message: "saved",
        imageCount: 0,
        requestedImageCount: 0,
        uploadResult: {
          storedUrls: [],
          requestedCount: 0,
          uploadedCount: 0,
          failedBatches: [],
          failedFiles: [],
        },
        savedCard: mockSavedCard,
      };
    },
  }
);
assertEqual(autoSaveRepeat.kind, "already_saved", "auto-save repeat is idempotent");
assertEqual(autoSaveCalls, 1, "auto-save repeat does not save again");

resetGuestConfirmedAutoSaveStateForTest();
clearPendingChatDraftSnapshot();
savePendingChatDraftSnapshot({
  publicRefCode: "NA-AUTO-SAVE-NOIMG",
  fields: {
    brand: "Toyota",
    model: "Vios",
    year: 2021,
    price: 350000,
    mileage: 40000,
    transmission: "เกียร์ออโต้",
  },
  draftPreviewText: "[โพสต์ตัวอย่าง]\nToyota Vios",
  messages: [],
  imageCount: 2,
  thumbnailsPersisted: false,
  userAlreadyConfirmedCreateDraft: true,
});
const needImagesSession = await useChatStore.getState().createSession(
  autoSaveScope,
  "need images auto-save"
);
const needImagesResult = await tryContinueGuestConfirmedMemberListingSave({
  storageScopeKey: autoSaveScope.storageKey,
  sessionId: needImagesSession,
  messages: [],
  ownerId: "uid-autosave-member",
  ownerName: "Test Member",
  ownerPhone: "0812345678",
});
assertEqual(needImagesResult.kind, "need_images", "auto-save missing images fallback");
assertEqual(
  getPrecheckContext(needImagesSession)?.awaitingImageReattachForConfirmedDraft,
  true,
  "auto-save missing images sets reattach flag"
);

console.log("--- Testing guest confirmed login handoff ---");
resetGuestConfirmedLoginHandoffStateForTest();
resetGuestConfirmedAutoSaveStateForTest();
clearPendingChatDraftSnapshot();
clearGuestChatClaimPointer();

const handoffGuestScope = "user:guest-handoff-1";
const handoffMemberScopeKey = "user:uid-handoff-member";
const handoffSessionId = "chat-handoff-session";
const handoffMsgId = "msg-handoff-images";
const handoffPending = [makeTestPending("handoff-img-1"), makeTestPending("handoff-img-2")];
const handoffMeta = toChatImageMessageAttachments(handoffPending);
const handoffUserMessages = [
  {
    id: handoffMsgId,
    sender: "user" as const,
    text: "(แนบรูป)",
    createdAt: claimNowIso,
    attachments: handoffMeta,
  },
  {
    id: "msg-handoff-preview",
    sender: "ai" as const,
    text: "[โพสต์ตัวอย่าง]\nHonda City",
    createdAt: claimNowIso,
    isDraftPreview: true,
  },
];

clearChatImageAttachmentScope(handoffGuestScope);
clearChatImageAttachmentScope(handoffMemberScopeKey);
registerChatImageMessageFiles(
  handoffGuestScope,
  handoffSessionId,
  handoffMsgId,
  handoffPending,
  handoffMeta
);
markChatImageMessageForPendingListing(handoffGuestScope, handoffSessionId, handoffMsgId);

savePendingChatDraftSnapshot({
  publicRefCode: "NA-HANDOFF-1",
  fields: {
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 400000,
    mileage: 30000,
    transmission: "เกียร์ออโต้",
  },
  draftPreviewText: "[โพสต์ตัวอย่าง]\nHonda City",
  messages: serializeMessagesForSnapshot(handoffUserMessages),
  draftPreviewAttachments: handoffMeta,
  imageCount: 2,
  thumbnailsPersisted: false,
  userAlreadyConfirmedCreateDraft: true,
});
saveGuestChatClaimPointer({
  guestStorageScopeKey: handoffGuestScope,
  guestSessionId: handoffSessionId,
  publicRefCode: "NA-HANDOFF-1",
});

assertEqual(hasGuestConfirmedPendingHandoff(), true, "confirmed handoff pending before login");
assertEqual(
  shouldDeferGuestImageScopeClear({
    guestScopeKey: handoffGuestScope,
    memberScopeKey: handoffMemberScopeKey,
  }),
  true,
  "defer guest image clear while confirmed handoff pending"
);
assertEqual(
  hasPendingChatDraftSnapshotInStorage(),
  true,
  "confirmed snapshot remains in storage before handoff"
);

const handoffMemberScope = {
  storageKey: handoffMemberScopeKey,
  userId: "uid-handoff-member",
  dealerId: null,
  mode: "consumer" as const,
};
useChatStore.getState().resetChatState();
await useChatStore.getState().loadSessions(handoffMemberScope);
useChatStore.setState({
  sessions: [
    {
      id: handoffSessionId,
      sessionId: handoffSessionId,
      userId: handoffMemberScopeKey,
      uid: "uid-handoff-member",
      dealerId: null,
      scope: "user",
      storageScopeKey: handoffMemberScopeKey,
      title: "handoff guest thread",
      createdAt: claimNowIso,
      updatedAt: claimNowIso,
      status: "active",
    },
  ],
  messages: { [handoffSessionId]: handoffUserMessages },
  activeSessionId: handoffSessionId,
});

let handoffSaveCalls = 0;
const handoffSavedCard = buildSavedMemberListingCardData({
  listingId: "car-handoff-1",
  publicRefCode: "NA-HANDOFF-1",
  fields: {
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 400000,
    mileage: 30000,
    transmission: "เกียร์ออโต้",
  },
  marketingCopy: "Honda City",
  imageUrls: ["/img/handoff-1.jpg"],
});
const mockHandoffSave: ContinueGuestConfirmedSaveDeps = {
  saveListing: async () => {
    handoffSaveCalls += 1;
    return {
      ok: true as const,
      listingId: "car-handoff-1",
      message: "saved",
      imageCount: 2,
      requestedImageCount: 2,
      uploadResult: {
        storedUrls: ["/img/handoff-1.jpg"],
        requestedCount: 2,
        uploadedCount: 2,
        failedBatches: [],
        failedFiles: [],
      },
      savedCard: handoffSavedCard,
    };
  },
};

const handoffResult = await tryRunGuestConfirmedLoginHandoff({
  memberScope: handoffMemberScope,
  storageScopeKey: handoffMemberScopeKey,
  isMemberConsumerSeller: true,
  ownerId: "uid-handoff-member",
  ownerName: "Handoff Member",
  ownerPhone: "0812345678",
  previousGuestScopeKey: handoffGuestScope,
  autoSaveDeps: mockHandoffSave,
});
assertEqual(handoffResult.kind, "completed", "handoff completes after login");
if (handoffResult.kind === "completed") {
  assertEqual(handoffResult.autoSave.kind, "success", "handoff auto-save succeeds with migrated images");
}
assertEqual(handoffSaveCalls, 1, "handoff save runs once");
assertEqual(
  countChatImageAttachmentsInSession(handoffMemberScopeKey, handoffSessionId),
  2,
  "handoff migrates guest images to member scope"
);
assertEqual(
  hasPendingChatDraftSnapshotInStorage(),
  false,
  "handoff clears snapshot after successful save"
);

const handoffRepeat = await tryRunGuestConfirmedLoginHandoff({
  memberScope: handoffMemberScope,
  storageScopeKey: handoffMemberScopeKey,
  isMemberConsumerSeller: true,
  ownerId: "uid-handoff-member",
  ownerName: "Handoff Member",
  ownerPhone: "0812345678",
  previousGuestScopeKey: handoffGuestScope,
  autoSaveDeps: mockHandoffSave,
});
assertEqual(
  handoffRepeat.kind === "skipped" ||
    (handoffRepeat.kind === "completed" && handoffRepeat.autoSave.kind === "already_saved"),
  true,
  "handoff repeat is idempotent (skipped or already_saved)"
);
assertEqual(handoffSaveCalls, 1, "handoff repeat does not save again");

resetGuestConfirmedLoginHandoffStateForTest();
resetGuestConfirmedAutoSaveStateForTest();
clearPendingChatDraftSnapshot();
clearGuestChatClaimPointer();
clearChatImageAttachmentScope(handoffGuestScope);
clearChatImageAttachmentScope(handoffMemberScopeKey);

savePendingChatDraftSnapshot({
  publicRefCode: "NA-HANDOFF-NOIMG",
  fields: {
    brand: "Toyota",
    model: "Vios",
    year: 2021,
    price: 350000,
    mileage: 40000,
    transmission: "เกียร์ออโต้",
  },
  draftPreviewText: "[โพสต์ตัวอย่าง]\nToyota Vios",
  messages: [],
  imageCount: 2,
  thumbnailsPersisted: false,
  userAlreadyConfirmedCreateDraft: true,
});
useChatStore.getState().resetChatState();
await useChatStore.getState().loadSessions(handoffMemberScope);
const handoffNoImgSessionId = await useChatStore.getState().createSession(
  handoffMemberScope,
  "handoff no images"
);
saveGuestChatClaimPointer({
  guestStorageScopeKey: handoffGuestScope,
  guestSessionId: handoffNoImgSessionId,
  publicRefCode: "NA-HANDOFF-NOIMG",
});
const handoffNoImg = await tryRunGuestConfirmedLoginHandoff({
  memberScope: handoffMemberScope,
  storageScopeKey: handoffMemberScopeKey,
  isMemberConsumerSeller: true,
  ownerId: "uid-handoff-member",
  ownerName: "Handoff Member",
  ownerPhone: "0812345678",
  previousGuestScopeKey: handoffGuestScope,
});
assertEqual(handoffNoImg.kind, "completed", "handoff without images completes");
if (handoffNoImg.kind === "completed") {
  assertEqual(handoffNoImg.autoSave.kind, "need_images", "handoff without images enters reattach state");
}
assertEqual(
  getPrecheckContext(handoffNoImgSessionId)?.awaitingImageReattachForConfirmedDraft,
  true,
  "handoff missing images sets awaiting reattach"
);

console.log("--- Testing guest image store migrate on claim (PR2) ---");

function makeTestPending(id: string): PendingChatImageAttachment {
  const blob = new Blob([`guest-image-${id}`], { type: "image/jpeg" });
  const file = new File([blob], `${id}.jpg`, { type: "image/jpeg" });
  return {
    id,
    kind: "image",
    originalFileName: `${id}.jpg`,
    fileName: `${id}.jpg`,
    optimizedFile: file,
    previewUrl: `blob:guest-${id}`,
    mimeType: "image/jpeg",
    size: file.size,
    width: 100,
    height: 100,
  };
}

const pr2GuestScope = "user:guest-pr2-images";
const pr2MemberScope = "user:uid-member-pr2";
const pr2SessionId = "chat-guest-pr2-images";
const pr2MsgId = "msg-user-images";
const pr2Pending = [
  makeTestPending("pr2-img-1"),
  makeTestPending("pr2-img-2"),
  makeTestPending("pr2-img-3"),
];
const pr2Meta = toChatImageMessageAttachments(pr2Pending);
const pr2UserMessages = [
  {
    id: pr2MsgId,
    sender: "user" as const,
    text: "(แนบรูป)",
    createdAt: claimNowIso,
    attachments: pr2Meta,
  },
];

clearChatImageAttachmentScope(pr2GuestScope);
clearChatImageAttachmentScope(pr2MemberScope);
registerChatImageMessageFiles(
  pr2GuestScope,
  pr2SessionId,
  pr2MsgId,
  pr2Pending,
  pr2Meta
);
markChatImageMessageForPendingListing(pr2GuestScope, pr2SessionId, pr2MsgId);

assertEqual(
  countChatImageAttachmentsInSession(pr2GuestScope, pr2SessionId),
  3,
  "guest scope starts with 3 images"
);

const migrate1 = migrateChatImageAttachmentScope({
  fromStorageScopeKey: pr2GuestScope,
  toStorageScopeKey: pr2MemberScope,
  sessionId: pr2SessionId,
});
assertEqual(migrate1.migratedFileCount, 3, "migrate copies all optimized files");
assertEqual(migrate1.migratedPendingIds, 3, "migrate copies pendingListingImageIds");

clearChatImageAttachmentScope(pr2GuestScope);

assertEqual(
  countChatImageAttachmentsInSession(pr2GuestScope, pr2SessionId),
  0,
  "guest scope cleared after migrate"
);
assertEqual(
  countChatImageAttachmentsInSession(pr2MemberScope, pr2SessionId),
  3,
  "member scope retains migrated images"
);

const memberCollected = collectAllChatImageFilesForMemberListing(
  pr2MemberScope,
  pr2SessionId,
  pr2UserMessages as any
);
assertEqual(memberCollected.length, 3, "member collectAll after migrate keeps image count");

const draftCollected = collectChatImagesForDraft(
  pr2MemberScope,
  pr2SessionId,
  pr2UserMessages as any
);
assertEqual(draftCollected.length, 3, "pendingListingImageIds available on member scope");

const migrate2 = migrateChatImageAttachmentScope({
  fromStorageScopeKey: pr2GuestScope,
  toStorageScopeKey: pr2MemberScope,
  sessionId: pr2SessionId,
});
assertEqual(migrate2.migratedFileCount, 0, "second migrate is idempotent for files");
assertEqual(migrate2.skippedDuplicateIds, 0, "second migrate from empty guest adds nothing");

const rehydrate1 = await rehydrateClaimedGuestChatImageStore({
  memberStorageScopeKey: pr2MemberScope,
  sessionId: pr2SessionId,
  messages: pr2UserMessages as any,
});
assertEqual(rehydrate1.skippedBecauseMemoryComplete, true, "rehydrate skips when memory complete");
assertEqual(rehydrate1.fromSnapshot, 0, "rehydrate does not use snapshot when memory complete");
assertEqual(rehydrate1.memoryCount, 3, "rehydrate reports full memory count");

clearChatImageAttachmentScope(pr2MemberScope);
assertEqual(
  countChatImageAttachmentsInSession(pr2MemberScope, pr2SessionId),
  0,
  "member memory cleared for snapshot fallback test"
);

savePendingChatDraftSnapshot({
  publicRefCode: "NA-PR2-FALLBACK",
  fields: snapFields,
  draftPreviewText: "preview",
  messages: [],
  imageCount: 2,
  persistedPreviewCount: 2,
  thumbnailsPersisted: true,
  draftPreviewAttachments: [
    {
      id: "pr2-img-1",
      kind: "image",
      name: "pr2-img-1.jpg",
      originalFileName: "pr2-img-1.jpg",
      mimeType: "image/jpeg",
      size: 120,
      previewDataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD",
    },
    {
      id: "pr2-img-2",
      kind: "image",
      name: "pr2-img-2.jpg",
      originalFileName: "pr2-img-2.jpg",
      mimeType: "image/jpeg",
      size: 120,
      previewDataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD",
    },
  ],
});

const rehydrate2 = await rehydrateClaimedGuestChatImageStore({
  memberStorageScopeKey: pr2MemberScope,
  sessionId: pr2SessionId,
  messages: pr2UserMessages as any,
});
assertEqual(rehydrate2.skippedBecauseMemoryComplete, false, "snapshot fallback runs when memory empty");
assertEqual(rehydrate2.fromSnapshot, 2, "snapshot fallback restores previewDataUrl files");
assertEqual(
  collectAllChatImageFilesForMemberListing(
    pr2MemberScope,
    pr2SessionId,
    pr2UserMessages as any
  ).length,
  2,
  "member save can collect snapshot-restored images"
);

const rehydrate3 = await rehydrateClaimedGuestChatImageStore({
  memberStorageScopeKey: pr2MemberScope,
  sessionId: pr2SessionId,
  messages: pr2UserMessages as any,
});
assertEqual(rehydrate3.fromSnapshot, 0, "repeat rehydrate does not duplicate snapshot images");
assertEqual(
  countChatImageAttachmentsInSession(pr2MemberScope, pr2SessionId),
  2,
  "repeat rehydrate keeps same image count"
);

clearPendingChatDraftSnapshot();
clearChatImageAttachmentScope(pr2MemberScope);
clearChatImageAttachmentScope(pr2GuestScope);

const sampleDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD";
const preparedPreview = prepareSnapshotImageAttachmentsForDisplay([
  {
    id: "snap-img-1",
    kind: "image",
    name: "car.jpg",
    size: 1200,
    mimeType: "image/jpeg",
    previewDataUrl: sampleDataUrl,
  },
]);
assertEqual(
  preparedPreview[0]?.previewUrl?.startsWith("data:image"),
  true,
  "prepareSnapshotImageAttachmentsForDisplay maps previewDataUrl to previewUrl"
);

savePendingChatDraftSnapshot({
  publicRefCode: "NA-IMG-RESTORE",
  fields: snapFields,
  draftPreviewText: "[โพสต์ตัวอย่าง]\nHonda HR-V",
  messages: [],
  imageCount: 2,
  persistedPreviewCount: 1,
  thumbnailsPersisted: true,
  userAlreadyConfirmedCreateDraft: true,
  draftPreviewAttachments: [
    {
      id: "snap-img-1",
      kind: "image",
      name: "car.jpg",
      size: 1200,
      mimeType: "image/jpeg",
      previewDataUrl: sampleDataUrl,
    },
  ],
});
const imgRestoreResult = await tryRestorePendingChatDraftAfterLogin(
  restoreMemberScope,
  restoreDeps
);
assertEqual(imgRestoreResult.restored, true, "restore with image snapshot succeeds");
const imgSessionId =
  imgRestoreResult.restored === true ? imgRestoreResult.sessionId : "";
const imgMessages = useChatStore.getState().messages[imgSessionId] ?? [];
const pendingWithImages = imgMessages.find((m) => m.isPendingListingCard);
assertEqual(
  (pendingWithImages?.attachments ?? []).some((a) =>
    Boolean(a.previewUrl?.startsWith("data:image") || a.previewDataUrl?.startsWith("data:image"))
  ),
  true,
  "restore pending card includes displayable image preview"
);
assertEqual(
  imgMessages.some((m) => m.isDraftPreview),
  true,
  "restore brings back draft preview message"
);
const partialNote = buildPostLoginPartialImageRestoreNote(2, 1);
assertEqual(
  partialNote?.includes("1") && partialNote?.includes("2"),
  true,
  "partial image restore note mentions counts"
);

savePendingChatDraftSnapshot({
  publicRefCode: "NA-FAIL-LOOP",
  fields: snapFields,
  draftPreviewText: "draft",
  messages: [],
  imageCount: 0,
  thumbnailsPersisted: false,
  userAlreadyConfirmedCreateDraft: true,
});
markPendingDraftRestoreFailed("NA-FAIL-LOOP");
assertEqual(
  isPendingDraftRestoreFailed("NA-FAIL-LOOP"),
  true,
  "failed restore meta is recorded"
);
const failResult = await tryRestorePendingChatDraftAfterLogin(restoreMemberScope, restoreDeps);
assertEqual(failResult.restored, false, "failed snapshot does not loop restore");
assertEqual(
  countPendingListingCardsForRef("NA-FAIL-LOOP"),
  0,
  "failed restore does not add cards"
);

savePendingChatDraftSnapshot({
  publicRefCode: "NA-INVALID-PAYLOAD",
  fields: { year: 2020, price: 100000, mileage: 10000, transmission: "ออโต้" },
  draftPreviewText: "draft",
  messages: [],
  imageCount: 0,
  thumbnailsPersisted: false,
  userAlreadyConfirmedCreateDraft: true,
});
const invalidRead = readPendingChatDraftSnapshot();
assertEqual(invalidRead.ok, false, "incomplete snapshot fails normalize");
assertEqual(
  hasPendingChatDraftSnapshotInStorage(),
  true,
  "raw snapshot still in storage when normalize fails"
);
await appendPendingRestoreFallbackMessage(restoreMemberScope, "invalid_payload", "NA-INVALID-PAYLOAD");
const fallbackSessionId = useChatStore.getState().activeSessionId;
const fallbackMessages = fallbackSessionId
  ? useChatStore.getState().messages[fallbackSessionId] ?? []
  : [];
assertEqual(
  fallbackMessages.some((message) =>
    message.text.includes(POST_LOGIN_DRAFT_RESTORE_FAILED_NOTE.slice(0, 20))
  ),
  true,
  "normalize fail shows fallback message once"
);
assertEqual(
  isPendingDraftRestoreFallbackShown("NA-INVALID-PAYLOAD"),
  true,
  "fallback shown flag set"
);

useChatStore.getState().resetChatState();
setChatHistoryStorageForTest(null);
clearPendingChatDraftSnapshot();
clearPendingDraftRestoreMeta();
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

const coercedFields = normalizeExtractedCarFields({
  brand: "Toyota",
  year: "2020",
  price: "450000",
  mileage: "50000",
});
assertEqual(coercedFields.year, 2020, "normalize fields year");
assertEqual(coercedFields.price, 450000, "normalize fields price");

const legacyCard = normalizePendingListingCardData({
  publicRefCode: "NA-LEGACY",
  statusLabel: "ร่างประกาศ รอตรวจทาน",
  marketingCopy: "โพสต์",
  fields: { brand: "Mazda", model: "2", year: "2019", price: "300000", mileage: "40000" },
});
assertEqual(legacyCard?.fields.brand, "Mazda", "normalize legacy pending card");

const saveCtx = resolveMemberPendingListingSaveContext({
  messages: [
    {
      id: "m-card",
      sender: "ai",
      text: CHAT_MEMBER_PENDING_CARD_INTRO,
      createdAt: new Date().toISOString(),
      isPendingListingCard: true,
      pendingListingCard: card,
    },
  ],
  precheck: null,
  fallbackPublicRefCode: "NA-FALLBACK",
});
assertEqual(saveCtx.ok, true, "resolve save context ok");
if (saveCtx.ok) {
  assertEqual(saveCtx.fields.brand, "Honda", "resolve save context brand");
}

const memberFirestoreRecord = sanitizeFirestoreDocument({
  id: "car-test",
  title: "Honda City",
  brand: "Honda",
  model: "City",
  year: 2020,
  price: 400000,
  type: "used",
  condition: "มือสอง",
  mileage: 50000,
  fuelType: "petrol",
  images: [],
  description: "ทดสอบ",
  ownerId: "member-uid",
  ownerName: "ลุง",
  ownerPhone: "",
  isSold: false,
  listingStatus: "published",
  createdAt: new Date().toISOString(),
  dealerId: undefined,
  showroomName: undefined,
});
assertEqual(
  "dealerId" in memberFirestoreRecord,
  false,
  "member listing firestore doc omits undefined dealerId"
);

const storedPending = sanitizeChatMessageForStorage({
  id: "m-store",
  sender: "ai",
  text: "การ์ด",
  createdAt: new Date().toISOString(),
  isPendingListingCard: true,
  pendingListingCard: card,
});
assertEqual(storedPending.pendingListingCard?.publicRefCode, "NA-2026-CARD", "sanitize keeps pending card");

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

console.log("--- Testing publish-in-chat Step 2 helpers ---");
clearAllPendingPublishListingContextsForTest();

const publishSnapFields = {
  brand: "Honda",
  model: "HR-V",
  year: 2020,
  price: 650000,
  mileage: 42000,
  transmission: "อัตโนมัติ",
};

const savedCardForPublish = buildSavedMemberListingCardData({
  listingId: "car-publish-step2",
  publicRefCode: "NA-2026-PUB1",
  fields: publishSnapFields,
  marketingCopy: "Honda HR-V 2020",
  imageUrls: ["/storage/listings/car-publish-step2/photo-1.jpg"],
});

const pendingOnlyMessages = [
  {
    id: "pending-only",
    sender: "ai",
    text: "pending",
    createdAt: "",
    isPendingListingCard: true,
    pendingListingCard: {
      publicRefCode: "NA-PENDING",
      statusLabel: "ร่างประกาศ รอตรวจทาน",
      marketingCopy: "pending",
      fields: publishSnapFields,
    },
  },
  {
    id: "saved-old",
    sender: "ai",
    text: "saved old",
    createdAt: "",
    isSavedMemberListingCard: true,
    savedMemberListingCard: {
      ...savedCardForPublish,
      listingId: "car-old",
    },
  },
  {
    id: "saved-latest",
    sender: "ai",
    text: "saved latest",
    createdAt: "",
    isSavedMemberListingCard: true,
    savedMemberListingCard: savedCardForPublish,
  },
] as any;

const latestSaved = findLatestSavedMemberListingCardMessage(pendingOnlyMessages);
assertEqual(latestSaved?.id, "saved-latest", "findLatestSavedMemberListingCardMessage picks latest saved");
assertEqual(
  latestSaved?.savedMemberListingCard?.listingId,
  "car-publish-step2",
  "findLatestSavedMemberListingCardMessage has listingId"
);

const pendingOnly = findLatestSavedMemberListingCardMessage([
  {
    id: "p1",
    sender: "ai",
    text: "x",
    createdAt: "",
    isPendingListingCard: true,
    pendingListingCard: {
      publicRefCode: "NA-X",
      statusLabel: "ร่าง",
      marketingCopy: "x",
      fields: {},
    },
  },
] as any);
assertEqual(pendingOnly, null, "findLatestSavedMemberListingCardMessage ignores pending card");

const ready = validateMemberListingReadyToPublish(savedCardForPublish);
assertEqual(ready.ok, true, "validate ready: fields + images pass");
if (ready.ok) {
  assertEqual(ready.imageCount, 1, "validate ready image count");
}

const noImages = validateMemberListingReadyToPublish({
  ...savedCardForPublish,
  imageUrls: [],
});
assertEqual(noImages.ok, false, "validate fail: no images");
if (noImages.ok === false) {
  assertEqual(noImages.reason, "missing-images", "validate fail reason no images");
}

const noListingId = validateMemberListingReadyToPublish({
  ...savedCardForPublish,
  listingId: "",
});
assertEqual(noListingId.ok, false, "validate fail: no listingId");
if (noListingId.ok === false) {
  assertEqual(noListingId.reason, "missing-listing-id", "validate fail reason no listingId");
}

assertEqual(
  isMemberConfirmPublishListingChatAction(CHAT_MEMBER_CONFIRM_PUBLISH_ACTION),
  true,
  "confirm phrase exact match"
);
assertEqual(isMemberConfirmPublishListingChatAction("ยืนยันลงตลาด"), true, "confirm phrase safe alias");
assertEqual(isMemberConfirmPublishListingChatAction("ตกลง"), false, "confirm phrase rejects generic ok");
assertEqual(isMemberConfirmPublishListingChatAction("พร้อมลงตลาด"), false, "confirm phrase rejects publish action");

const ctx1 = setPendingPublishListingContext({
  sessionId: "sess-pub-1",
  listingId: savedCardForPublish.listingId,
  publicRefCode: savedCardForPublish.publicRefCode,
  card: savedCardForPublish,
});
const ctx2 = setPendingPublishListingContext({
  sessionId: "sess-pub-1",
  listingId: savedCardForPublish.listingId,
  publicRefCode: savedCardForPublish.publicRefCode,
  card: savedCardForPublish,
});
assertEqual(ctx1 === ctx2, true, "pending publish context idempotent same listing");
assertEqual(
  getPendingPublishListingContext("sess-pub-1")?.listingId,
  "car-publish-step2",
  "pending publish context get"
);
clearPendingPublishListingContext("sess-pub-1");
assertEqual(getPendingPublishListingContext("sess-pub-1"), null, "pending publish context clear");

const began = beginPendingPublishListingFromSavedCard({
  sessionId: "sess-pub-2",
  messages: pendingOnlyMessages,
});
assertEqual(typeof began === "object" && "listingId" in began, true, "begin pending publish from saved card");
clearPendingPublishListingContext("sess-pub-2");

assertEqual(
  canEnterMemberPublishInChatFlow({
    isSignedIn: true,
    isDealer: false,
    isAdmin: false,
    chatScopeMode: "consumer",
  }),
  true,
  "member consumer can enter publish flow"
);
assertEqual(
  canEnterMemberPublishInChatFlow({
    isSignedIn: true,
    isDealer: true,
    isAdmin: false,
    chatScopeMode: "consumer",
  }),
  false,
  "dealer excluded from member publish flow"
);
assertEqual(
  canEnterMemberPublishInChatFlow({
    isSignedIn: true,
    isDealer: false,
    isAdmin: true,
    chatScopeMode: "consumer",
  }),
  false,
  "admin excluded from member publish flow"
);

const summary = buildPublishSummaryMessage(savedCardForPublish);
assertEqual(summary.includes("Honda HR-V"), true, "publish summary includes brand model");
assertEqual(summary.includes("650,000"), true, "publish summary includes price");
assertEqual(summary.includes("ยังไม่ลงตลาด"), true, "publish summary includes status");
assertEqual(
  buildPublishAwaitingConfirmMessage().includes("ยืนยันเผยแพร่ลงตลาด"),
  true,
  "awaiting confirm message mentions confirm phrase"
);
assertEqual(
  buildPublishBlockedMessage("missing-images").includes("รูป"),
  true,
  "blocked message for missing images"
);
console.log("--- Testing publish-in-chat Step 3 wiring ---");

const publishIntentOk = handleMemberPublishListingIntent({
  sessionId: "sess-step3-1",
  messages: pendingOnlyMessages,
});
assertEqual(publishIntentOk.kind, "summary", "publish intent sets summary");
if (publishIntentOk.kind === "summary") {
  assertEqual(
    publishIntentOk.message.includes("สรุปก่อนเผยแพร่"),
    true,
    "publish intent summary header"
  );
  assertEqual(
    publishIntentOk.message.includes("ยืนยันเผยแพร่ลงตลาด"),
    true,
    "publish intent awaiting confirm phrase"
  );
  assertEqual(
    getPendingPublishListingContext("sess-step3-1")?.listingId,
    "car-publish-step2",
    "publish intent sets pending context"
  );
}

const publishIntentBlocked = handleMemberPublishListingIntent({
  sessionId: "sess-step3-blocked",
  messages: [
    {
      id: "saved-no-img",
      sender: "ai",
      text: "saved",
      createdAt: "",
      isSavedMemberListingCard: true,
      savedMemberListingCard: { ...savedCardForPublish, imageUrls: [] },
    },
  ] as any,
});
assertEqual(publishIntentBlocked.kind, "blocked", "publish intent blocked without images");
assertEqual(
  getPendingPublishListingContext("sess-step3-blocked"),
  null,
  "blocked publish does not set pending context"
);

const cancelPublish = handleMemberCancelPublishIntent("sess-step3-1");
assertEqual(cancelPublish.kind, "cancelled", "cancel publish clears flow");
assertEqual(
  getPendingPublishListingContext("sess-step3-1"),
  null,
  "cancel publish clears pending context"
);
assertEqual(
  isMemberCancelPublishListingChatAction(CHAT_MEMBER_CANCEL_PUBLISH_ACTION),
  true,
  "cancel publish phrase matcher"
);

const confirmNoPending = await confirmMemberPublishListingFromChat({
  sessionId: "sess-step3-missing",
  ownerId: "member-pub-1",
  canPublish: true,
});
assertEqual(
  confirmNoPending.kind,
  "no_pending",
  "confirm without pending context"
);

const noSavedCardIntent = handleMemberPublishListingIntent({
  sessionId: "sess-step3-empty",
  messages: [{ id: "u1", sender: "user", text: "hi", createdAt: "" }] as any,
});
assertEqual(noSavedCardIntent.kind, "blocked", "publish intent blocked without saved card");

console.log("--- Testing publish-in-chat Step 4 real publish ---");

clearAllPendingPublishListingContextsForTest();

const step4ListingId = "car-publish-step2";
const step4OwnerId = "member-pub-1";
const step4Listing = mockHiddenMemberListing(step4ListingId, step4OwnerId);

setPendingPublishListingContext({
  sessionId: "sess-step4-ok",
  listingId: step4ListingId,
  publicRefCode: "NA-2026-PUB1",
  card: savedCardForPublish,
});

let step4VisibilityCalls = 0;
const step4Ok = await confirmMemberPublishListingFromChat(
  {
    sessionId: "sess-step4-ok",
    ownerId: step4OwnerId,
    canPublish: true,
  },
  {
    fetchMyListings: async () => [step4Listing],
    setListingVisible: async (ownerId, listingId) => {
      step4VisibilityCalls += 1;
      assertEqual(ownerId, step4OwnerId, "publish success ownerId");
      assertEqual(listingId, step4ListingId, "publish success listingId");
      return { ...step4Listing, listingStatus: "published" };
    },
  }
);
assertEqual(step4Ok.kind, "success", "confirm publish success");
assertEqual(step4VisibilityCalls, 1, "confirm publish calls setMyListingVisibility(false)");
if (step4Ok.kind === "success") {
  assertEqual(
    step4Ok.message.includes("เผยแพร่ประกาศลงตลาดเรียบร้อยแล้ว"),
    true,
    "publish success builds marketplace success message"
  );
  assertEqual(step4Ok.listingId, step4ListingId, "publish success listing id");
}
assertEqual(
  getPendingPublishListingContext("sess-step4-ok"),
  null,
  "publish success clears pending context"
);

const preflightOk = preflightMemberListingRecordForChatPublish({
  ownerId: step4OwnerId,
  listingId: step4ListingId,
  listings: [step4Listing],
});
assertEqual(preflightOk.ok, true, "preflight passes ready hidden listing");

const preflightNoListing = preflightMemberListingRecordForChatPublish({
  ownerId: step4OwnerId,
  listingId: "missing-listing",
  listings: [step4Listing],
});
assertEqual(preflightNoListing.ok, false, "guard fail: no listing");
if (preflightNoListing.ok === false) {
  assertEqual(
    preflightNoListing.reason,
    "listing-not-found",
    "guard fail reason no listing"
  );
}

const preflightNoImages = preflightMemberListingRecordForChatPublish({
  ownerId: step4OwnerId,
  listingId: step4ListingId,
  listings: [mockHiddenMemberListing(step4ListingId, step4OwnerId, { images: [] })],
});
assertEqual(preflightNoImages.ok, false, "guard fail: no images");
if (preflightNoImages.ok === false) {
  assertEqual(preflightNoImages.reason, "missing-images", "guard fail reason no images");
}

const preflightMissingFields = preflightMemberListingRecordForChatPublish({
  ownerId: step4OwnerId,
  listingId: step4ListingId,
  listings: [
    mockHiddenMemberListing(step4ListingId, step4OwnerId, {
      brand: "",
      model: "",
    }),
  ],
});
assertEqual(preflightMissingFields.ok, false, "guard fail: missing fields");
if (preflightMissingFields.ok === false) {
  assertEqual(
    preflightMissingFields.reason,
    "missing-core-fields",
    "guard fail reason missing fields"
  );
  assertEqual(
    preflightMissingFields.message.includes("ยังขาด:"),
    true,
    "guard fail lists missing fields in message"
  );
  assertEqual(
    preflightMissingFields.message.includes("ยี่ห้อ"),
    true,
    "guard fail names missing brand"
  );
}

const listingTransmissionInCondition = mockHiddenMemberListing(
  step4ListingId,
  step4OwnerId,
  {
    transmission: undefined,
    condition: "เกียร์ออโต้",
  }
);
const conditionFields = carRecordToExtractedFields(listingTransmissionInCondition);
assertEqual(
  conditionFields.transmission?.includes("ออโต้"),
  true,
  "carRecordToExtractedFields reads transmission from condition"
);
const preflightConditionGear = preflightMemberListingRecordForChatPublish({
  ownerId: step4OwnerId,
  listingId: step4ListingId,
  listings: [listingTransmissionInCondition],
});
assertEqual(
  preflightConditionGear.ok,
  true,
  "preflight passes when transmission only in condition field"
);

const preflightMissingGear = preflightMemberListingRecordForChatPublish({
  ownerId: step4OwnerId,
  listingId: step4ListingId,
  listings: [
    mockHiddenMemberListing(step4ListingId, step4OwnerId, {
      transmission: undefined,
      condition: "good",
      description: "รถสภาพดี",
    }),
  ],
});
assertEqual(preflightMissingGear.ok, false, "guard fail: missing transmission");
if (preflightMissingGear.ok === false) {
  assertEqual(
    preflightMissingGear.missingCoreLabels?.includes("เกียร์"),
    true,
    "guard fail names missing transmission"
  );
  assertEqual(
    buildPublishMissingCoreFieldsMessage(preflightMissingGear.missingCoreLabels ?? []).includes(
      "เกียร์"
    ),
    true,
    "buildPublishMissingCoreFieldsMessage includes gear label"
  );
}

const preflightAlreadyPublished = preflightMemberListingRecordForChatPublish({
  ownerId: step4OwnerId,
  listingId: step4ListingId,
  listings: [
    mockHiddenMemberListing(step4ListingId, step4OwnerId, {
      listingStatus: "published",
    }),
  ],
});
assertEqual(preflightAlreadyPublished.ok, false, "already published preflight");
if (preflightAlreadyPublished.ok === false) {
  assertEqual(
    preflightAlreadyPublished.message.includes("ลงตลาดแล้ว"),
    true,
    "already published friendly message"
  );
}

const preflightOwnerMismatch = preflightMemberListingRecordForChatPublish({
  ownerId: "other-user",
  listingId: step4ListingId,
  listings: [step4Listing],
});
assertEqual(preflightOwnerMismatch.ok, false, "guard fail owner mismatch");
if (preflightOwnerMismatch.ok === false) {
  assertEqual(
    preflightOwnerMismatch.reason,
    "owner-mismatch",
    "guard fail reason owner mismatch"
  );
}

setPendingPublishListingContext({
  sessionId: "sess-step4-already",
  listingId: step4ListingId,
  publicRefCode: "NA-2026-PUB1",
  card: savedCardForPublish,
});
const alreadyPublishedFlow = await confirmMemberPublishListingFromChat(
  {
    sessionId: "sess-step4-already",
    ownerId: step4OwnerId,
    canPublish: true,
  },
  {
    fetchMyListings: async () => [
      mockHiddenMemberListing(step4ListingId, step4OwnerId, {
        listingStatus: "published",
      }),
    ],
    setListingVisible: async () => {
      throw new Error("should not publish when already published");
    },
  }
);
assertEqual(
  alreadyPublishedFlow.kind,
  "already_published",
  "already published flow friendly outcome"
);
if (alreadyPublishedFlow.kind === "already_published") {
  assertEqual(
    alreadyPublishedFlow.message,
    CHAT_PUBLISH_ALREADY_PUBLISHED_MESSAGE,
    "already published message constant"
  );
}

setPendingPublishListingContext({
  sessionId: "sess-step4-forbidden",
  listingId: step4ListingId,
  publicRefCode: "NA-2026-PUB1",
  card: savedCardForPublish,
});
const forbiddenFlow = await confirmMemberPublishListingFromChat(
  {
    sessionId: "sess-step4-forbidden",
    ownerId: step4OwnerId,
    canPublish: true,
  },
  {
    fetchMyListings: async () => [
      mockHiddenMemberListing(step4ListingId, "other-owner"),
    ],
    setListingVisible: async () => {
      throw new Error("should not publish on owner mismatch");
    },
  }
);
assertEqual(forbiddenFlow.kind, "forbidden", "owner mismatch forbidden flow");

const dealerBlocked = await confirmMemberPublishListingFromChat({
  sessionId: "sess-step4-dealer",
  ownerId: "dealer-1",
  canPublish: false,
});
assertEqual(dealerBlocked.kind, "blocked", "dealer/admin blocked from publish flow");
assertEqual(
  dealerBlocked.message,
  CHAT_PUBLISH_MEMBER_ONLY_MESSAGE,
  "dealer blocked message"
);

assertEqual(
  buildPublishSuccessMessage(step4Listing, savedCardForPublish).includes(
    "เผยแพร่ประกาศลงตลาดเรียบร้อยแล้ว"
  ),
  true,
  "buildPublishSuccessMessage text"
);

const publishSource = fs.readFileSync(
  path.join(process.cwd(), "src/services/chat/publishMemberListingFromChat.ts"),
  "utf8"
);
assertEqual(
  publishSource.includes("setMyListingVisibility"),
  true,
  "publish service calls setMyListingVisibility"
);
assertEqual(
  publishSource.includes('method: "POST"') || publishSource.includes("POST /api/cars"),
  false,
  "publish step still no POST /api/cars"
);
assertEqual(
  publishSource.includes("uploadListingImagesApi"),
  false,
  "publish step still no image upload"
);

const useChatSource = fs.readFileSync(
  path.join(process.cwd(), "src/hooks/chat/useChat.ts"),
  "utf8"
);
assertEqual(
  useChatSource.includes("confirmMemberPublishListingFromChat"),
  true,
  "useChat wires confirmMemberPublishListingFromChat"
);
assertEqual(
  useChatSource.includes("isPublishSuccess"),
  true,
  "useChat sets publish success flag"
);
assertEqual(
  useChatSource.includes("resolveSavedCardForPublishedListing"),
  true,
  "useChat resolves saved card for published listing card"
);
assertEqual(
  useChatSource.includes("isPublishedMemberListingCard"),
  true,
  "useChat sets published listing card flag"
);
assertEqual(
  useChatSource.includes("handleMemberPublishListingIntent"),
  true,
  "useChat wires publish summary handler"
);
assertEqual(
  useChatSource.includes('setView("login")'),
  false,
  "useChat still avoids full-page login redirect"
);

clearAllPendingPublishListingContextsForTest();

console.log("--- Testing published listing card Phase A ---");

const publishedFromSaved = buildPublishedMemberListingCardData(savedCardForPublish);
assertEqual(
  publishedFromSaved.statusLabel,
  PUBLISHED_MEMBER_LISTING_STATUS_LABEL,
  "published card status label"
);
assertEqual(
  publishedFromSaved.listingId,
  savedCardForPublish.listingId,
  "published card listing id from saved card"
);
assertEqual(
  publishedFromSaved.imageUrls.length,
  savedCardForPublish.imageUrls.length,
  "published card keeps image urls from saved card"
);
assertEqual(
  (publishedFromSaved.fields as { brand?: string }).brand,
  "Honda",
  "published card keeps brand from saved card fields"
);

const resolvedForPublish = resolveSavedCardForPublishedListing(
  pendingOnlyMessages as any,
  "car-publish-step2"
);
assertEqual(
  resolvedForPublish?.listingId,
  "car-publish-step2",
  "resolve saved card for publish from history"
);

const storedPublishedCard = sanitizeChatMessageForStorage({
  id: "m-published-card",
  sender: "ai",
  text: "เผยแพร่แล้ว",
  createdAt: new Date().toISOString(),
  isPublishSuccess: true,
  isPublishedMemberListingCard: true,
  publishedMemberListingCard: publishedFromSaved,
  savedMemberListingId: publishedFromSaved.listingId,
  attachments: listingImageUrlsToChatAttachments(publishedFromSaved.imageUrls),
});
assertEqual(
  storedPublishedCard.isPublishedMemberListingCard,
  true,
  "sanitize keeps published card flag"
);
assertEqual(
  storedPublishedCard.publishedMemberListingCard?.statusLabel,
  PUBLISHED_MEMBER_LISTING_STATUS_LABEL,
  "sanitize keeps published card status"
);
assertEqual(
  storedPublishedCard.attachments?.length,
  publishedFromSaved.imageUrls.length,
  "sanitize keeps published card image attachments"
);

const normalizedPublished = normalizePublishedMemberListingCardData({
  listingId: "car-pub-norm",
  publicRefCode: "NA-NORM",
  statusLabel: "wrong",
  marketingCopy: "copy",
  fields: { brand: "Toyota" },
  imageUrls: ["/img.jpg"],
});
assertEqual(
  normalizedPublished?.statusLabel,
  PUBLISHED_MEMBER_LISTING_STATUS_LABEL,
  "normalize published card forces published status"
);

const pubCardHistoryStorage = createMemoryStorageForChat();
setChatHistoryStorageForTest(pubCardHistoryStorage);

const pubCardScope = {
  storageKey: "user:uid-pub-card-phase-a",
  uid: "uid-pub-card-phase-a",
  dealerId: null,
  scope: "user" as const,
};
const pubCardSession = await createChatSession(pubCardScope, "published card persistence");
const appendedPublished = await appendChatMessage(pubCardScope, pubCardSession.id, {
  sender: "ai",
  text: "เผยแพร่ประกาศลงตลาดเรียบร้อยแล้ว",
  isPublishSuccess: true,
  isPublishedMemberListingCard: true,
  publishedMemberListingCard: publishedFromSaved,
  savedMemberListingId: publishedFromSaved.listingId,
  attachments: listingImageUrlsToChatAttachments(publishedFromSaved.imageUrls),
});
assertEqual(
  appendedPublished.publishedMemberListingCard?.listingId,
  "car-publish-step2",
  "appendChatMessage stores published card metadata"
);
const loadedPublishedMessages = await loadChatMessages(pubCardScope, pubCardSession.id);
const roundTripPublished = loadedPublishedMessages.find(
  (message) => message.isPublishedMemberListingCard
);
assertEqual(
  roundTripPublished?.publishedMemberListingCard?.statusLabel,
  PUBLISHED_MEMBER_LISTING_STATUS_LABEL,
  "loadChatMessages round-trip published card"
);
assertEqual(
  roundTripPublished?.attachments?.length,
  publishedFromSaved.imageUrls.length,
  "loadChatMessages round-trip published card attachments"
);

const publishedCardComponentSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/chat/ChatPublishedMemberListingCard.tsx"),
  "utf8"
);
assertEqual(
  publishedCardComponentSource.includes('data-testid="chat-published-member-listing-card"'),
  true,
  "published card component test id"
);
assertEqual(
  publishedCardComponentSource.includes("chat-view-marketplace-btn"),
  false,
  "published card hides marketplace button"
);
assertEqual(
  publishedCardComponentSource.includes("ดูในตลาดรถ"),
  false,
  "published card hides marketplace label"
);
assertEqual(
  publishedCardComponentSource.includes("ดูรายละเอียดในแชท"),
  true,
  "published card has in-chat detail expand"
);
assertEqual(
  publishedCardComponentSource.includes("ย่อรายละเอียด"),
  true,
  "published card can collapse in-chat detail"
);
assertEqual(
  publishedCardComponentSource.includes("อ่านเพิ่มเติม"),
  true,
  "published card supports read-more for long copy"
);
assertEqual(
  publishedCardComponentSource.includes("คุยกับน้องเอ"),
  false,
  "published card must not show talk-to-ai button"
);
assertEqual(
  publishedCardComponentSource.includes("ถามน้องเอ"),
  false,
  "published card must not show ask-ai button"
);
assertEqual(
  publishedCardComponentSource.includes("ChatCarCard"),
  false,
  "published card does not reuse buyer ChatCarCard CTA"
);
assertEqual(
  publishedCardComponentSource.includes("chat-published-listing-gallery"),
  true,
  "published card uses chat-native image gallery"
);
assertEqual(
  publishedCardComponentSource.includes("max-w-full") &&
    publishedCardComponentSource.includes("overflow-hidden"),
  true,
  "published card guards against image overflow in chat bubble"
);
assertEqual(
  publishedCardComponentSource.includes("sm:grid-cols-3") &&
    publishedCardComponentSource.includes("w-full"),
  true,
  "published card includes responsive layout classes"
);
assertEqual(
  publishedCardComponentSource.includes("chat-published-listing-spec-summary"),
  true,
  "published card renders compact summary specs"
);
assertEqual(
  publishedCardComponentSource.includes("chat-published-listing-spec-detail"),
  true,
  "published card renders expanded detail specs"
);
assertEqual(
  publishedCardComponentSource.includes("chat-published-listing-expand-btn"),
  true,
  "published card keeps in-chat expand action"
);

console.log("--- Testing listing image policy (Phase 1-2 frontend) ---");

assertEqual(LISTING_MAX_IMAGES_PER_LISTING, 10, "policy max images per listing");
assertEqual(SNAPSHOT_MAX_PREVIEW_IMAGES, 10, "policy snapshot preview count");
assertEqual(LISTING_CARD_MAX_THUMBNAILS, 10, "policy card thumbnail cap");
assertEqual(MAX_PERSISTED_SNAPSHOT_IMAGES, 10, "snapshot alias uses policy 10");
assertEqual(CHAT_IMAGE_ATTACHMENT_MAX_FILES, 10, "chat attach max uses policy");
assertEqual(LISTING_MIN_IMAGES_FOR_PUBLISH, 1, "publish min images unchanged");
assertEqual(
  Math.ceil(10 / LISTING_IMAGE_UPLOAD_BATCH_SIZE),
  5,
  "10 images upload as 5 batches of 2"
);
assertEqual(LISTING_IMAGE_UPLOAD_BATCH_SIZE, 2, "upload batch size stays 2");

const perMessageSlots = CHAT_IMAGE_ATTACHMENT_MAX_FILES - 0;
const selectedFromEleven = Math.min(11, perMessageSlots);
assertEqual(selectedFromEleven, 10, "selecting 11 files caps at 10 per message");

const capTwelve = capStoredChatImagesForListing(
  Array.from({ length: 12 }, (_, i) => ({
    id: `img-${i}`,
    messageId: "msg",
    sessionId: "sess",
    file: new File(["x"], `f${i}.jpg`, { type: "image/jpeg" }),
    metadata: {
      id: `img-${i}`,
      kind: "image" as const,
      name: `f${i}.jpg`,
      sortOrder: i,
      size: 100,
      mimeType: "image/jpeg",
    },
  }))
);
assertEqual(capTwelve.items.length, 10, "cap helper keeps first 10 in input order");
assertEqual(capTwelve.truncated, true, "cap helper marks truncated");
assertEqual(
  buildChatListingImageCapTruncatedNote(12).includes("12"),
  true,
  "cap truncated note mentions total count"
);

const policyGuestScope = "user:guest-policy-cap";
const policySessionId = "chat-policy-cap";
const policyMsg1 = "msg-policy-1";
const policyMsg2 = "msg-policy-2";
clearChatImageAttachmentScope(policyGuestScope);
const policyBatch1 = Array.from({ length: 6 }, (_, i) => makeTestPending(`policy-a-${i}`));
const policyBatch2 = Array.from({ length: 6 }, (_, i) => makeTestPending(`policy-b-${i}`));
registerChatImageMessageFiles(
  policyGuestScope,
  policySessionId,
  policyMsg1,
  policyBatch1,
  toChatImageMessageAttachments(policyBatch1, 0)
);
registerChatImageMessageFiles(
  policyGuestScope,
  policySessionId,
  policyMsg2,
  policyBatch2,
  toChatImageMessageAttachments(policyBatch2, 6)
);
markChatImageMessageForPendingListing(policyGuestScope, policySessionId, policyMsg1);
markChatImageMessageForPendingListing(policyGuestScope, policySessionId, policyMsg2);
const policyMessages = [
  {
    id: policyMsg1,
    sender: "user" as const,
    text: "(แนบรูป)",
    createdAt: claimNowIso,
    attachments: toChatImageMessageAttachments(policyBatch1),
  },
  {
    id: policyMsg2,
    sender: "user" as const,
    text: "(แนบรูป)",
    createdAt: claimNowIso,
    attachments: toChatImageMessageAttachments(policyBatch2),
  },
];
assertEqual(
  countChatImageAttachmentsInSession(policyGuestScope, policySessionId),
  12,
  "session stores 12 images across two messages"
);
const policyCap = collectAllChatImageFilesForMemberListingCapInfo(
  policyGuestScope,
  policySessionId,
  policyMessages
);
assertEqual(policyCap.items.length, 10, "member save cap uses 10 across messages");
assertEqual(policyCap.truncated, true, "member save marks truncated over 10");
assertEqual(policyCap.totalBeforeCap, 12, "member save counts 12 before cap");
const cappedIds = policyCap.items.map((item) => item.id);
assertEqual(
  cappedIds.join(","),
  [
    "policy-a-0",
    "policy-a-1",
    "policy-a-2",
    "policy-a-3",
    "policy-a-4",
    "policy-a-5",
    "policy-b-0",
    "policy-b-1",
    "policy-b-2",
    "policy-b-3",
  ].join(","),
  "Case B: cap keeps first 10 images in send order (msg A then msg B)"
);
assertEqual(
  new Set(cappedIds).size,
  cappedIds.length,
  "Case B: capped ids stay unique"
);
assertEqual(
  buildChatListingImageCapTruncatedNote(policyCap.totalBeforeCap).includes("12"),
  true,
  "Case B truncated note reports total 12"
);
const policyPreview = collectDraftPreviewDisplayAttachments(
  policyGuestScope,
  policySessionId,
  policyMessages
);
assertEqual(policyPreview.length, 10, "draft preview display capped at 10");
clearChatImageAttachmentScope(policyGuestScope);

const tinyDataUrl =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z";
const snapshotTen = await persistAttachmentsForSnapshot(
  Array.from({ length: 10 }, (_, i) => ({
    id: `snap-${i}`,
    kind: "image" as const,
    name: `snap-${i}.jpg`,
    size: 120,
    mimeType: "image/jpeg",
    previewDataUrl: tinyDataUrl,
  }))
);
assertEqual(
  snapshotTen.attachments.length,
  10,
  "snapshot attempts 10 attachment slots"
);
assertEqual(
  buildPostLoginPartialImageRestoreNote(10, snapshotTen.persistedPreviewCount) == null ||
    snapshotTen.persistedPreviewCount >= 10,
  true,
  "snapshot partial note absent when all tiny previews persist"
);
const policyPartialNote = buildPostLoginPartialImageRestoreNote(10, 3);
assertEqual(
  policyPartialNote?.includes("3") && policyPartialNote.includes("10"),
  true,
  "snapshot partial note when byte budget limits restore"
);

const publishNoImg = validateMemberListingReadyToPublish({
  listingId: "car-no-img",
  publicRefCode: "NA-NOIMG",
  fields: { brand: "Honda", model: "City", year: 2020, price: 400000, mileage: 30000, transmission: "AT" },
  marketingCopy: "test",
  imageUrls: [],
  statusLabel: "draft",
});
assertEqual(publishNoImg.ok, false, "publish still blocked with zero images");
if (publishNoImg.ok === false) {
  assertEqual(publishNoImg.reason, "missing-images", "publish min 1 image guard");
}
const publishOneImg = validateMemberListingReadyToPublish({
  listingId: "car-one-img",
  publicRefCode: "NA-ONEIMG",
  fields: { brand: "Honda", model: "City", year: 2020, price: 400000, mileage: 30000, transmission: "AT" },
  marketingCopy: "test",
  imageUrls: ["/storage/listings/car-one-img/a.jpg"],
  statusLabel: "draft",
});
assertEqual(publishOneImg.ok, true, "publish passes with one image");

console.log("--- Testing guest confirm → chat login modal (UX) ---");

const useChatSourceForLoginModal = fs.readFileSync(
  path.join(process.cwd(), "src/hooks/chat/useChat.ts"),
  "utf8"
);
const requestChatLoginSource = fs.readFileSync(
  path.join(process.cwd(), "src/utils/requestChatLogin.ts"),
  "utf8"
);
const aiChatViewSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/AIChatView.tsx"),
  "utf8"
);

assertEqual(
  useChatSourceForLoginModal.includes('setView("login")'),
  false,
  "useChat does not redirect to full login page directly"
);
assertEqual(
  useChatSourceForLoginModal.match(/requireGuestLoginFromChat\(/g)?.length ?? 0,
  3,
  "useChat gates guest login in three places via modal helper"
);
assertEqual(
  requestChatLoginSource.includes("setChatLoginModalOpen(true)"),
  true,
  "requestChatLogin opens shared modal on chat view"
);
assertEqual(
  requestChatLoginSource.includes('setView("login")'),
  true,
  "requireGuestLoginFromChat falls back to full login when not on chat"
);
assertEqual(
  aiChatViewSource.includes("chatLoginModalOpen"),
  true,
  "AIChatView mounts shared ChatLoginModal from store"
);
assertEqual(
  aiChatViewSource.includes("ChatLoginModal"),
  true,
  "AIChatView includes ChatLoginModal"
);

const { requestChatLoginModal, requireGuestLoginFromChat } = await import(
  "../src/utils/requestChatLogin.ts"
);
const { useAppStore } = await import("../src/store.ts");

useAppStore.setState({ currentView: "chat", chatLoginModalOpen: false });
assertEqual(
  requestChatLoginModal("chat"),
  true,
  "requestChatLoginModal returns true on chat view"
);
assertEqual(
  useAppStore.getState().chatLoginModalOpen,
  true,
  "requestChatLoginModal opens store flag"
);

useAppStore.setState({ currentView: "home", chatLoginModalOpen: false });
let fallbackView: string | null = null;
const originalSetView = useAppStore.getState().setView;
useAppStore.setState({
  setView: (view: string) => {
    fallbackView = view;
  },
});
requireGuestLoginFromChat("chat");
assertEqual(fallbackView, "login", "requireGuestLoginFromChat falls back off chat view");
useAppStore.setState({ setView: originalSetView, currentView: "chat", chatLoginModalOpen: false });

console.log("--- Testing draft preview add images button (Case B UI wiring) ---");

const bubbleSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/chat/ChatMessageBubble.tsx"),
  "utf8"
);
const containerSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/chat/ChatContainer.tsx"),
  "utf8"
);
const attachmentInputSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/chat/ChatImageAttachmentInput.tsx"),
  "utf8"
);

assertEqual(
  bubbleSource.includes('sendMessage("เพิ่มรูปภาพ")'),
  false,
  "add images button does not send chat message"
);
assertEqual(
  bubbleSource.includes("openImageAttachmentPicker"),
  true,
  "add images button opens composer attachment picker"
);
assertEqual(
  bubbleSource.includes('id="chat-draft-add-images-btn"'),
  true,
  "add images button has stable id for wiring tests"
);
assertEqual(
  containerSource.includes("ChatComposerContext"),
  true,
  "ChatContainer exposes shared composer picker context"
);
assertEqual(
  containerSource.includes("attachmentFileInputRef"),
  true,
  "ChatContainer shares file input ref with composer attach button"
);
assertEqual(
  containerSource.includes("fileInputRef={attachmentFileInputRef}"),
  true,
  "ChatContainer passes shared ref to ChatImageAttachmentInput"
);
assertEqual(
  attachmentInputSource.includes("fileInputRef"),
  true,
  "ChatImageAttachmentInput accepts shared fileInputRef"
);
assertEqual(
  containerSource.includes("chat-composer-attachment-preview"),
  true,
  "composer renders pending attachment preview strip"
);

const addPhotoOrchestrated = tryOrchestrateChatReply("เพิ่มรูปภาพ", []);
assertEqual(
  addPhotoOrchestrated?.isDraftPreview === true,
  false,
  "orchestrator does not treat add-photo phrase as draft preview generation"
);
assertEqual(
  addPhotoOrchestrated?.skipGemini === true,
  true,
  "orchestrator handles typed add-photo phrase without Gemini when sent as text"
);

console.log("--- All Chat to Draft tests passed! ---");
