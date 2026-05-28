import { useChatStore } from "../../stores/chat/chatStore";
import type { ChatStorageScope } from "../../utils/chatStorageScope";
import {
  clearPendingChatDraftSnapshot,
  consumePendingChatDraftSnapshot,
  buildPostLoginDraftSavedText,
  POST_LOGIN_DRAFT_RESTORED_NOTE,
  POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE,
  type PendingChatDraftSnapshot,
} from "../../utils/chatPendingDraftSnapshot";
import {
  appendMemberPendingListingCardMessage,
} from "./chatMemberPendingListing";
import {
  buildDraftCopyReadyReply,
  clearPrecheckContext,
  restorePrecheckContext,
  setPrecheckStage,
} from "../ai/chat/chatPrecheckLayer";
import {
  collectChatImagesForDraft,
  registerSnapshotAttachmentsForDraftSave,
} from "../../features/chat-image-attachment-v1/chatImageAttachmentStore";

let restoreInFlight = false;

export interface PostLoginDraftContinuationDeps {
  storageScopeKey: string;
  saveDraft: (params: {
    sessionId: string;
    fields: Record<string, unknown>;
  }) => Promise<{ text: string; savedDraftId?: string }>;
  resolveBlock: () => string | null;
  isMemberConsumerSeller: () => boolean;
}

export function buildPostLoginRestoreWelcomeText(
  snap: PendingChatDraftSnapshot
): string {
  return POST_LOGIN_DRAFT_RESTORED_NOTE;
}

async function replaySnapshotMessages(
  sessionId: string,
  snap: PendingChatDraftSnapshot
): Promise<void> {
  const store = useChatStore.getState();

  for (const msg of snap.messages) {
    const attachments =
      msg.isDraftPreview && snap.draftPreviewAttachments?.length
        ? snap.draftPreviewAttachments
        : msg.attachments;

    await store.addMessage(
      sessionId,
      msg.sender,
      msg.text,
      undefined,
      undefined,
      msg.isDraftPreview,
      msg.draftFields,
      undefined,
      attachments?.length ? attachments : undefined
    );
  }

  const hasDraftPreview = snap.messages.some((m) => m.isDraftPreview);
  if (!hasDraftPreview && snap.draftPreviewText) {
    await store.addMessage(
      sessionId,
      "ai",
      snap.draftPreviewText,
      undefined,
      undefined,
      true,
      snap.fields,
      undefined,
      snap.draftPreviewAttachments?.length
        ? snap.draftPreviewAttachments
        : undefined
    );
  }
}

async function tryRegisterImagesFromSnapshot(
  storageScopeKey: string,
  sessionId: string,
  snap: PendingChatDraftSnapshot
): Promise<number> {
  if (!snap.draftPreviewAttachments?.length) return 0;

  const store = useChatStore.getState();
  const messages = store.messages[sessionId] || [];
  let anchor = messages.find(
    (m) =>
      m.sender === "user" &&
      m.attachments?.some((a) => a.kind === "image")
  );

  if (!anchor) {
    anchor = await store.addMessage(
      sessionId,
      "user",
      "(แนบรูป)",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      snap.draftPreviewAttachments
    );
  }

  return registerSnapshotAttachmentsForDraftSave(
    storageScopeKey,
    sessionId,
    anchor.id,
    snap.draftPreviewAttachments
  );
}

function imagesReadyForDraftSave(
  storageScopeKey: string,
  sessionId: string
): boolean {
  const messages = useChatStore.getState().messages[sessionId] || [];
  return collectChatImagesForDraft(storageScopeKey, sessionId, messages).length > 0;
}

async function continueConfirmedDraftAfterLogin(
  sessionId: string,
  snap: PendingChatDraftSnapshot,
  deps: PostLoginDraftContinuationDeps
): Promise<void> {
  const store = useChatStore.getState();
  const block = deps.resolveBlock();

  restorePrecheckContext(sessionId, {
    fields: snap.fields,
    visionSummary: snap.visionSummary,
    publicRefCode: snap.publicRefCode,
    stage: "confirmed_create_draft",
  });

  if (block) {
    if (deps.isMemberConsumerSeller()) {
      const draftPreviewText =
        snap.draftPreviewText ||
        buildDraftCopyReadyReply(
          snap.fields,
          snap.publicRefCode,
          "ยืนยันสร้างประกาศ",
          snap.visionSummary,
          snap.imageCount
        );
      if (snap.draftPreviewAttachments?.length) {
        await tryRegisterImagesFromSnapshot(deps.storageScopeKey, sessionId, snap);
      }
      await appendMemberPendingListingCardMessage(sessionId, {
        fields: snap.fields,
        visionSummary: snap.visionSummary,
        publicRefCode: snap.publicRefCode,
        draftPreviewText,
        attachments: snap.draftPreviewAttachments,
      });
      setPrecheckStage(sessionId, "confirmed_create_draft");
      clearPendingChatDraftSnapshot();
      return;
    }
    await store.addMessage(sessionId, "ai", block);
    clearPrecheckContext(sessionId);
    clearPendingChatDraftSnapshot();
    return;
  }

  const needsImages = snap.imageCount > 0;
  if (needsImages) {
    await tryRegisterImagesFromSnapshot(deps.storageScopeKey, sessionId, snap);
  }

  const imagesReady =
    !needsImages || imagesReadyForDraftSave(deps.storageScopeKey, sessionId);

  if (needsImages && !imagesReady) {
    restorePrecheckContext(sessionId, {
      fields: snap.fields,
      visionSummary: snap.visionSummary,
      publicRefCode: snap.publicRefCode,
      stage: "draft_copy_ready",
      awaitingImageReattachForConfirmedDraft: true,
    });
    await store.addMessage(sessionId, "ai", POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE);
    return;
  }

  setPrecheckStage(sessionId, "confirmed_create_draft");
  const saved = await deps.saveDraft({
    sessionId,
    fields: snap.fields as Record<string, unknown>,
  });

  if (saved.savedDraftId) {
    let successText = buildPostLoginDraftSavedText(snap.publicRefCode);
    if (saved.text.includes("แต่ยังต้องเติม")) {
      successText = `${successText}\n\n${saved.text}`;
    } else if (saved.text.includes("แนบรูปภาพแล้ว")) {
      successText = `${successText}\n\n${saved.text.split("\n\n").slice(-1)[0]}`;
    }
    await store.addMessage(
      sessionId,
      "ai",
      successText,
      undefined,
      undefined,
      undefined,
      undefined,
      saved.savedDraftId
    );
    clearPrecheckContext(sessionId);
    clearPendingChatDraftSnapshot();
    return;
  }

  await store.addMessage(sessionId, "ai", saved.text);
}

/**
 * หลัง login + hydrate scope ใหม่ — replay snapshot และ continue pending confirm
 */
export async function tryRestorePendingChatDraftAfterLogin(
  chatScope: ChatStorageScope,
  deps: PostLoginDraftContinuationDeps
): Promise<boolean> {
  if (restoreInFlight) return false;
  const snap = consumePendingChatDraftSnapshot();
  if (!snap) return false;

  restoreInFlight = true;
  try {
    const store = useChatStore.getState();
    const sessionId = await store.createSession(
      chatScope,
      "สร้างประกาศจากแชท (ต่อหลังเข้าสู่ระบบ)"
    );

    await replaySnapshotMessages(sessionId, snap);

    if (snap.userAlreadyConfirmedCreateDraft) {
      await continueConfirmedDraftAfterLogin(sessionId, snap, deps);
      return true;
    }

    restorePrecheckContext(sessionId, {
      fields: snap.fields,
      visionSummary: snap.visionSummary,
      publicRefCode: snap.publicRefCode,
      stage: "draft_copy_ready",
    });

    await store.addMessage(
      sessionId,
      "ai",
      buildPostLoginRestoreWelcomeText(snap)
    );

    return true;
  } catch (err) {
    console.warn("[chat-pending-draft] restore failed:", err);
    return false;
  } finally {
    restoreInFlight = false;
  }
}
