import type { ChatMessage, ChatMessageAttachment } from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import { useChatStore } from "../../stores/chat/chatStore";
import {
  clearPendingChatDraftSnapshot,
  finalizePendingDraftAfterRestore,
  POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE,
  readPendingChatDraftSnapshot,
} from "../../utils/chatPendingDraftSnapshot";
import { chatRestoreLog } from "../../utils/chatRestoreDebug";
import {
  extractMarketingCopyFromDraftText,
  normalizeExtractedCarFields,
  normalizeVisionObservationSummary,
} from "./chatMemberPendingListing";
import {
  clearPrecheckContext,
  getMissingCoreFieldLabels,
  mergeEffectivePrecheckFields,
  restorePrecheckContext,
} from "../ai/chat/chatPrecheckLayer";
import {
  CHAT_MEMBER_SAVE_IN_PROGRESS_MESSAGE,
  saveMemberListingFromChat,
  type SaveMemberListingFromChatResult,
} from "./saveMemberListingFromChat";
import { appendSavedMemberListingCardMessage } from "./chatSavedMemberListing";
import {
  collectChatImagesForDraft,
  collectDraftPreviewDisplayAttachments,
} from "../../features/chat-image-attachment-v1/chatImageAttachmentStore";

export type ContinueGuestConfirmedSaveResult =
  | { kind: "skipped"; reason: string }
  | { kind: "already_saved"; sessionId: string }
  | { kind: "in_flight" }
  | { kind: "need_images"; sessionId: string; message: string }
  | { kind: "missing_fields"; sessionId: string; message: string }
  | { kind: "error"; sessionId: string; message: string }
  | { kind: "success"; sessionId: string; listingId: string };

export type ContinueGuestConfirmedSaveDeps = {
  saveListing?: (params: Parameters<typeof saveMemberListingFromChat>[0]) => Promise<SaveMemberListingFromChatResult>;
};

let autoSaveInFlight = false;
const autoSaveCompletedRefs = new Set<string>();

export function resetGuestConfirmedAutoSaveStateForTest(): void {
  autoSaveInFlight = false;
  autoSaveCompletedRefs.clear();
}

export function sessionHasSavedListingForRef(
  messages: ChatMessage[],
  publicRefCode: string
): boolean {
  const ref = publicRefCode.trim();
  if (!ref) return false;
  return messages.some(
    (message) =>
      message.isSavedMemberListingCard &&
      message.savedMemberListingCard?.publicRefCode?.trim() === ref
  );
}

function sessionAlreadyHasReattachNote(messages: ChatMessage[]): boolean {
  const needle = POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE.slice(0, 24);
  return messages.some((message) => message.sender === "ai" && message.text.includes(needle));
}

function resolveCardAttachments(
  storageScopeKey: string,
  sessionId: string,
  messages: ChatMessage[],
  snapshotAttachments?: ChatMessageAttachment[]
): ChatMessageAttachment[] | undefined {
  const fromStore = collectDraftPreviewDisplayAttachments(
    storageScopeKey,
    sessionId,
    messages
  );
  if (fromStore.length > 0) return fromStore;

  const fromMessages = messages
    .filter((message) => message.isPendingListingCard || message.isDraftPreview)
    .flatMap((message) => message.attachments ?? [])
    .filter((attachment) => attachment.kind === "image");
  if (fromMessages.length > 0) return fromMessages;

  const fromSnapshot =
    snapshotAttachments?.filter((attachment) => attachment.kind === "image") ?? [];
  return fromSnapshot.length > 0 ? fromSnapshot : undefined;
}

function resolveMarketingCopy(
  messages: ChatMessage[],
  draftPreviewText: string
): string {
  const draftMessage = messages.find((message) => message.isDraftPreview);
  if (draftMessage?.text?.trim()) {
    return extractMarketingCopyFromDraftText(draftMessage.text);
  }
  return extractMarketingCopyFromDraftText(draftPreviewText);
}

async function handleNeedImages(params: {
  sessionId: string;
  messages: ChatMessage[];
  fields: ReturnType<typeof mergeEffectivePrecheckFields>;
  visionSummary: ReturnType<typeof normalizeVisionObservationSummary>;
  publicRefCode: string;
}): Promise<ContinueGuestConfirmedSaveResult> {
  restorePrecheckContext(params.sessionId, {
    fields: params.fields,
    visionSummary: params.visionSummary,
    publicRefCode: params.publicRefCode,
    stage: "confirmed_create_draft",
    awaitingImageReattachForConfirmedDraft: true,
  });

  if (!sessionAlreadyHasReattachNote(params.messages)) {
    await useChatStore.getState().addMessage(
      params.sessionId,
      "ai",
      POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE
    );
  }

  finalizePendingDraftAfterRestore(params.publicRefCode, params.sessionId);

  return {
    kind: "need_images",
    sessionId: params.sessionId,
    message: POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE,
  };
}

/**
 * หลัง guest กดยืนยันสร้างประกาศแล้ว login — บันทึก member listing ต่ออัตโนมัติ (idempotent).
 */
export async function tryContinueGuestConfirmedMemberListingSave(
  params: {
    storageScopeKey: string;
    sessionId: string;
    messages: ChatMessage[];
    ownerId: string;
    ownerName: string;
    ownerPhone: string;
  },
  deps: ContinueGuestConfirmedSaveDeps = {}
): Promise<ContinueGuestConfirmedSaveResult> {
  const saveListing = deps.saveListing ?? saveMemberListingFromChat;
  const messages =
    useChatStore.getState().messages[params.sessionId] ?? params.messages;

  const snapRead = readPendingChatDraftSnapshot();
  const snapshotRef = snapRead.ok ? snapRead.snapshot.publicRefCode.trim() : "";

  if (snapshotRef && sessionHasSavedListingForRef(messages, snapshotRef)) {
    clearPendingChatDraftSnapshot();
    clearPrecheckContext(params.sessionId);
    autoSaveCompletedRefs.add(snapshotRef);
    return { kind: "already_saved", sessionId: params.sessionId };
  }

  if (!snapRead.ok) {
    if (messages.some((message) => message.isSavedMemberListingCard)) {
      return { kind: "already_saved", sessionId: params.sessionId };
    }
    return { kind: "skipped", reason: "no_snapshot" };
  }

  const snap = snapRead.snapshot;
  if (!snap.userAlreadyConfirmedCreateDraft) {
    return { kind: "skipped", reason: "not_confirmed" };
  }

  const publicRefCode = snap.publicRefCode.trim();

  if (
    autoSaveCompletedRefs.has(publicRefCode) ||
    sessionHasSavedListingForRef(messages, publicRefCode)
  ) {
    clearPendingChatDraftSnapshot();
    clearPrecheckContext(params.sessionId);
    return { kind: "already_saved", sessionId: params.sessionId };
  }

  if (autoSaveInFlight) {
    return { kind: "in_flight" };
  }

  if (!params.ownerId.trim()) {
    return { kind: "skipped", reason: "no_owner" };
  }

  const visionSummary = normalizeVisionObservationSummary(snap.visionSummary);
  const fields = mergeEffectivePrecheckFields(
    normalizeExtractedCarFields(snap.fields),
    visionSummary
  );
  const missingCore = getMissingCoreFieldLabels(fields);
  if (missingCore.length > 0) {
    const message = `ข้อมูลยังไม่ครบสำหรับบันทึกครับ: ${missingCore.join(", ")} — พิมพ์ข้อมูลที่ขาดมาได้เลยครับ ไม่ต้องกดยืนยันสร้างประกาศซ้ำ`;
    restorePrecheckContext(params.sessionId, {
      fields,
      visionSummary,
      publicRefCode,
      stage: "collecting_missing_fields",
    });
    await useChatStore.getState().addMessage(params.sessionId, "ai", message);
    finalizePendingDraftAfterRestore(publicRefCode, params.sessionId);
    return { kind: "missing_fields", sessionId: params.sessionId, message };
  }

  const cardAttachments = resolveCardAttachments(
    params.storageScopeKey,
    params.sessionId,
    messages,
    snap.draftPreviewAttachments
  );
  const expectsImages = snap.imageCount > 0;
  const resolvedImageCount = collectChatImagesForDraft(
    params.storageScopeKey,
    params.sessionId,
    messages
  ).length;

  if (expectsImages && resolvedImageCount === 0) {
    chatRestoreLog("guest confirmed auto-save: need images", {
      sessionId: params.sessionId,
      publicRefCode,
      imageCount: snap.imageCount,
    });
    return handleNeedImages({
      sessionId: params.sessionId,
      messages,
      fields,
      visionSummary,
      publicRefCode,
    });
  }

  autoSaveInFlight = true;
  try {
    const alreadySaving = messages.some(
      (message) =>
        message.sender === "ai" &&
        message.text.trim() === CHAT_MEMBER_SAVE_IN_PROGRESS_MESSAGE
    );
    if (!alreadySaving) {
      await useChatStore.getState().addMessage(
        params.sessionId,
        "ai",
        CHAT_MEMBER_SAVE_IN_PROGRESS_MESSAGE
      );
    }

    const saveResult = await saveListing({
      fields: snap.fields,
      visionSummary: snap.visionSummary,
      publicRefCode,
      marketingCopy: resolveMarketingCopy(messages, snap.draftPreviewText),
      ownerId: params.ownerId,
      ownerName: params.ownerName,
      ownerPhone: params.ownerPhone,
      storageScopeKey: params.storageScopeKey,
      sessionId: params.sessionId,
      messages,
      cardAttachments,
    });

    if (saveResult.ok === false) {
      if (saveResult.code === "need-images") {
        return handleNeedImages({
          sessionId: params.sessionId,
          messages,
          fields,
          visionSummary,
          publicRefCode,
        });
      }
      await useChatStore.getState().addMessage(
        params.sessionId,
        "ai",
        saveResult.message
      );
      finalizePendingDraftAfterRestore(publicRefCode, params.sessionId);
      return {
        kind: "error",
        sessionId: params.sessionId,
        message: saveResult.message,
      };
    }

    autoSaveCompletedRefs.add(publicRefCode);
    await appendSavedMemberListingCardMessage(params.sessionId, {
      card: saveResult.savedCard,
    });
    clearPrecheckContext(params.sessionId);
    finalizePendingDraftAfterRestore(publicRefCode, params.sessionId);

    chatRestoreLog("guest confirmed auto-save: success", {
      sessionId: params.sessionId,
      listingId: saveResult.listingId,
      publicRefCode,
    });

    return {
      kind: "success",
      sessionId: params.sessionId,
      listingId: saveResult.listingId,
    };
  } finally {
    autoSaveInFlight = false;
  }
}

export function buildMemberReattachSaveParams(params: {
  sessionId: string;
  messages: ChatMessage[];
  storageScopeKey: string;
  precheck: {
    fields: ExtractedCarFields;
    visionSummary?: ReturnType<typeof normalizeVisionObservationSummary>;
    publicRefCode?: string;
  };
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  cardAttachments?: ChatMessageAttachment[];
}): Parameters<typeof saveMemberListingFromChat>[0] {
  const fields = normalizeExtractedCarFields(params.precheck.fields);
  const visionSummary = normalizeVisionObservationSummary(params.precheck.visionSummary);
  const draftMessage = params.messages.find((message) => message.isDraftPreview);
  const draftPreviewText = draftMessage?.text ?? "";
  return {
    fields,
    visionSummary,
    publicRefCode: params.precheck.publicRefCode?.trim() || "NA-RESTORE",
    marketingCopy: draftPreviewText
      ? extractMarketingCopyFromDraftText(draftPreviewText)
      : "",
    ownerId: params.ownerId,
    ownerName: params.ownerName,
    ownerPhone: params.ownerPhone,
    storageScopeKey: params.storageScopeKey,
    sessionId: params.sessionId,
    messages: params.messages,
    cardAttachments: params.cardAttachments,
  };
}
