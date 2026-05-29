import { useChatStore } from "../../stores/chat/chatStore";
import type { ChatStorageScope } from "../../utils/chatStorageScope";
import {
  finalizePendingDraftAfterRestore,
  hasPendingChatDraftSnapshotInStorage,
  isPendingDraftRestoreFallbackShown,
  isPendingDraftRestoreFailed,
  isPendingDraftSnapshotRestored,
  isPendingSnapshotReadFailure,
  markPendingDraftRestoreFailed,
  markPendingDraftRestoreFallbackShown,
  markPendingDraftRestoreInProgress,
  markPendingDraftRestoreWaitingForProfile,
  readPendingChatDraftSnapshot,
  readPendingDraftRestoreMeta,
  POST_LOGIN_DRAFT_RESTORE_FAILED_NOTE,
  POST_LOGIN_IMAGES_REATTACH_NOTE,
  POST_LOGIN_PENDING_CARD_RESTORE_NOTE,
  type PendingChatDraftSnapshot,
  type PendingSnapshotFailureReason,
} from "../../utils/chatPendingDraftSnapshot";
import { chatRestoreLog } from "../../utils/chatRestoreDebug";
import {
  readGuestChatClaimPointer,
} from "../../utils/chatGuestClaim";
import { shouldSkipSnapshotRestoreAfterClaim } from "./claimGuestChatAfterLogin";
import {
  appendMemberPendingListingCardMessage,
  findLatestPendingListingCardMessage,
  normalizeExtractedCarFields,
  normalizeVisionObservationSummary,
} from "./chatMemberPendingListing";
import {
  buildDraftCopyReadyReply,
  restorePrecheckContext,
  setPrecheckStage,
} from "../ai/chat/chatPrecheckLayer";
import type { ChatMessageAttachment } from "../../types";
import {
  collectChatImagesForDraft,
  collectDraftPreviewDisplayAttachments,
  countSnapshotAttachmentsWithDisplayablePreview,
  prepareSnapshotImageAttachmentsForDisplay,
  recoverChatImagesFromMessageHistory,
  registerSnapshotAttachmentsForDraftSave,
} from "../../features/chat-image-attachment-v1/chatImageAttachmentStore";
import {
  buildPostLoginPartialImageRestoreNote,
} from "../../utils/chatPendingDraftSnapshot";

let restoreInFlight = false;

function buildRestoreFallbackText(reason: PendingDraftRestoreFailureReason): string {
  const suffix =
    reason === "invalid_payload"
      ? "\n\n(ข้อมูลร่างไม่ครบหรือหมดอายุ — ลองสร้างประกาศใหม่จากแชทได้ครับ)"
      : reason === "not_member_flow"
        ? "\n\n(บัญชีนี้ไม่ใช่ flow สมาชิกขายรถบ้าน — ใช้เมนูประกาศของฉันหรือแชทใหม่ได้ครับ)"
        : "";
  return `${POST_LOGIN_DRAFT_RESTORE_FAILED_NOTE}${suffix}`;
}

/** แสดงข้อความ fallback ครั้งเดียวใน active session — ไม่สร้าง session ใหม่ */
export async function appendPendingRestoreFallbackMessage(
  chatScope: ChatStorageScope,
  reason: PendingDraftRestoreFailureReason,
  snapshotId?: string
): Promise<void> {
  const ref = snapshotId ?? readPendingDraftRestoreMeta()?.snapshotId ?? "unknown";
  if (isPendingDraftRestoreFallbackShown(ref)) {
    chatRestoreLog("appendPendingRestoreFallbackMessage: skipped (already shown)", {
      snapshotId: ref,
    });
    return;
  }

  const store = useChatStore.getState();
  let sessionId = store.activeSessionId;
  if (!sessionId || !store.sessions.some((session) => session.id === sessionId)) {
    if (store.sessions[0]?.id) {
      sessionId = store.sessions[0].id;
    } else {
      sessionId = await store.createSession(chatScope, "งานประกาศค้าง");
    }
  }
  await store.selectSession(chatScope, sessionId);
  await store.addMessage(sessionId, "ai", buildRestoreFallbackText(reason));
  markPendingDraftRestoreFallbackShown(ref);
  markPendingDraftRestoreFailed(ref);
  chatRestoreLog("appendPendingRestoreFallbackMessage: shown", {
    snapshotId: ref,
    reason,
    sessionId,
    messageCount: (store.messages[sessionId] ?? []).length + 1,
  });
}

export interface PostLoginDraftContinuationDeps {
  storageScopeKey: string;
  isDealer: () => boolean;
  isAdmin: () => boolean;
  isMemberConsumerSeller: () => boolean;
}

export type PendingDraftRestoreFailureReason =
  | PendingSnapshotFailureReason
  | "in_flight"
  | "deferred"
  | "already_restored"
  | "not_member_flow"
  | "claimed"
  | "error";

export type PendingDraftRestoreResult =
  | { restored: true; sessionId: string }
  | { restored: false; reason: PendingDraftRestoreFailureReason };


export function shouldDeferPendingDraftRestore(deps: {
  isSignedIn: boolean;
  isDealer: boolean;
  isAdmin: boolean;
  isMemberConsumerSeller: boolean;
}): boolean {
  if (!deps.isSignedIn) return true;
  if (deps.isDealer || deps.isAdmin) return false;
  return !deps.isMemberConsumerSeller;
}

function sessionHasPendingCardForRef(
  sessionId: string,
  publicRefCode: string
): boolean {
  const messages = useChatStore.getState().messages[sessionId] ?? [];
  return messages.some(
    (message) =>
      message.isPendingListingCard &&
      message.pendingListingCard?.publicRefCode === publicRefCode
  );
}

function findSessionIdWithPendingCardForRef(publicRefCode: string): string | null {
  const store = useChatStore.getState();
  for (const session of store.sessions) {
    if (sessionHasPendingCardForRef(session.id, publicRefCode)) {
      return session.id;
    }
  }
  return null;
}

export function countPendingListingCardsForRef(publicRefCode: string): number {
  const store = useChatStore.getState();
  let count = 0;
  for (const session of store.sessions) {
    const messages = store.messages[session.id] ?? [];
    count += messages.filter(
      (message) =>
        message.isPendingListingCard &&
        message.pendingListingCard?.publicRefCode === publicRefCode
    ).length;
  }
  return count;
}

function resolveDisplayAttachmentsForRestore(
  storageScopeKey: string,
  sessionId: string,
  snap: PendingChatDraftSnapshot
): ChatMessageAttachment[] {
  const fromSnapshot = prepareSnapshotImageAttachmentsForDisplay(
    snap.draftPreviewAttachments
  );
  const messages = useChatStore.getState().messages[sessionId] ?? [];
  const fromStore = collectDraftPreviewDisplayAttachments(
    storageScopeKey,
    sessionId,
    messages
  );
  return fromStore.length > 0 ? fromStore : fromSnapshot;
}

function applyDisplayAttachmentsToRestoredSession(
  sessionId: string,
  displayAttachments: ChatMessageAttachment[]
): void {
  if (!displayAttachments.length) return;
  useChatStore.setState((state) => {
    const messages = state.messages[sessionId];
    if (!messages?.length) return state;
    const next = messages.map((message) => {
      if (message.isPendingListingCard) {
        return { ...message, attachments: displayAttachments };
      }
      if (message.isDraftPreview) {
        return { ...message, attachments: displayAttachments };
      }
      if (
        message.sender === "user" &&
        (message.attachments?.some((att) => att.kind === "image") ||
          message.text.includes("แนบรูป"))
      ) {
        return { ...message, attachments: displayAttachments };
      }
      return message;
    });
    return {
      messages: {
        ...state.messages,
        [sessionId]: next,
      },
    };
  });
}

async function registerSnapshotImagesOnce(
  storageScopeKey: string,
  sessionId: string,
  snap: PendingChatDraftSnapshot,
  displayAttachments: ChatMessageAttachment[]
): Promise<void> {
  const persistable =
    snap.draftPreviewAttachments?.filter(
      (att) => att.kind === "image" && att.previewDataUrl?.startsWith("data:")
    ) ?? [];
  if (!persistable.length) return;

  const store = useChatStore.getState();
  const messages = store.messages[sessionId] ?? [];
  const anchor =
    messages.find(
      (message) =>
        message.sender === "user" &&
        message.attachments?.some((attachment) => attachment.kind === "image")
    ) ??
    (await store.addMessage(
      sessionId,
      "user",
      "(แนบรูปจากงานค้าง)",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      displayAttachments.length > 0 ? displayAttachments : persistable
    ));

  await registerSnapshotAttachmentsForDraftSave(
    storageScopeKey,
    sessionId,
    anchor.id,
    persistable
  );
}

async function resolveRestoreSessionId(
  chatScope: ChatStorageScope,
  snap: PendingChatDraftSnapshot
): Promise<string> {
  const store = useChatStore.getState();
  const meta = readPendingDraftRestoreMeta();
  const snapshotId = snap.publicRefCode;

  if (shouldSkipSnapshotRestoreAfterClaim(chatScope.storageKey)) {
    const claim = readGuestChatClaimPointer();
    if (
      claim?.guestSessionId &&
      store.sessions.some((session) => session.id === claim.guestSessionId)
    ) {
      await store.selectSession(chatScope, claim.guestSessionId);
      return claim.guestSessionId;
    }
  }

  const existingCardSession = findSessionIdWithPendingCardForRef(snapshotId);
  if (existingCardSession) {
    await store.selectSession(chatScope, existingCardSession);
    return existingCardSession;
  }

  if (
    meta?.sessionId &&
    meta.snapshotId === snapshotId &&
    (meta.status === "restored" || meta.status === "restoring") &&
    store.sessions.some((session) => session.id === meta.sessionId)
  ) {
    await store.selectSession(chatScope, meta.sessionId);
    return meta.sessionId;
  }

  const activeId = store.activeSessionId;
  if (activeId && store.sessions.some((session) => session.id === activeId)) {
    await store.selectSession(chatScope, activeId);
    return activeId;
  }

  chatRestoreLog("resolveRestoreSessionId: no session to reuse — fallback only", {
    snapshotId,
  });
  throw new Error("restore_session_unavailable_use_guest_claim");
}

async function restoreSinglePendingListingCard(
  chatScope: ChatStorageScope,
  deps: PostLoginDraftContinuationDeps,
  snap: PendingChatDraftSnapshot
): Promise<string> {
  const fields = normalizeExtractedCarFields(snap.fields);
  const visionSummary = normalizeVisionObservationSummary(snap.visionSummary);
  const sessionId = await resolveRestoreSessionId(chatScope, snap);
  markPendingDraftRestoreInProgress(snap.publicRefCode, sessionId);
  const store = useChatStore.getState();

  if (sessionHasPendingCardForRef(sessionId, snap.publicRefCode)) {
    restorePrecheckContext(sessionId, {
      fields,
      visionSummary,
      publicRefCode: snap.publicRefCode,
      stage: "confirmed_create_draft",
    });
    await registerSnapshotImagesOnce(
      deps.storageScopeKey,
      sessionId,
      snap,
      prepareSnapshotImageAttachmentsForDisplay(snap.draftPreviewAttachments)
    );
    await recoverChatImagesFromMessageHistory(
      deps.storageScopeKey,
      sessionId,
      store.messages[sessionId] ?? []
    );
    const displayAttachments = resolveDisplayAttachmentsForRestore(
      deps.storageScopeKey,
      sessionId,
      snap
    );
    applyDisplayAttachmentsToRestoredSession(sessionId, displayAttachments);
    await store.selectSession(chatScope, sessionId);
    return sessionId;
  }

  restorePrecheckContext(sessionId, {
    fields,
    visionSummary,
    publicRefCode: snap.publicRefCode,
    stage: "confirmed_create_draft",
  });

  const draftPreviewText =
    snap.draftPreviewText ||
    buildDraftCopyReadyReply(
      fields,
      snap.publicRefCode,
      "ยืนยันสร้างประกาศ",
      visionSummary,
      snap.imageCount
    );

  const snapshotDisplay = prepareSnapshotImageAttachmentsForDisplay(
    snap.draftPreviewAttachments
  );

  if (draftPreviewText.trim()) {
    const existingDraftPreview = (store.messages[sessionId] ?? []).some(
      (message) => message.isDraftPreview
    );
    if (!existingDraftPreview) {
      await store.addMessage(
        sessionId,
        "ai",
        draftPreviewText,
        undefined,
        undefined,
        true,
        fields as Record<string, unknown>,
        undefined,
        snapshotDisplay.length > 0 ? snapshotDisplay : undefined
      );
    }
  }

  await registerSnapshotImagesOnce(
    deps.storageScopeKey,
    sessionId,
    snap,
    snapshotDisplay
  );

  const displayAttachments = resolveDisplayAttachmentsForRestore(
    deps.storageScopeKey,
    sessionId,
    snap
  );

  await appendMemberPendingListingCardMessage(sessionId, {
    fields,
    visionSummary,
    publicRefCode: snap.publicRefCode,
    draftPreviewText,
    attachments: displayAttachments.length > 0 ? displayAttachments : snapshotDisplay,
    introText: POST_LOGIN_PENDING_CARD_RESTORE_NOTE,
  });

  await recoverChatImagesFromMessageHistory(
    deps.storageScopeKey,
    sessionId,
    useChatStore.getState().messages[sessionId] ?? []
  );

  const displayAfterRecover = resolveDisplayAttachmentsForRestore(
    deps.storageScopeKey,
    sessionId,
    snap
  );
  applyDisplayAttachmentsToRestoredSession(
    sessionId,
    displayAfterRecover.length > 0 ? displayAfterRecover : snapshotDisplay
  );

  const persistedPreviewCount =
    snap.persistedPreviewCount ??
    countSnapshotAttachmentsWithDisplayablePreview(snap.draftPreviewAttachments);
  const partialImageNote = buildPostLoginPartialImageRestoreNote(
    snap.imageCount,
    persistedPreviewCount
  );
  const needsImages = snap.imageCount > 0;
  const imagesReady =
    !needsImages ||
    collectChatImagesForDraft(
      deps.storageScopeKey,
      sessionId,
      useChatStore.getState().messages[sessionId] ?? []
    ).length > 0;

  if (partialImageNote) {
    await store.addMessage(sessionId, "ai", partialImageNote);
  } else if (needsImages && !imagesReady) {
    await store.addMessage(sessionId, "ai", POST_LOGIN_IMAGES_REATTACH_NOTE);
  }

  chatRestoreLog("restoreSinglePendingListingCard: images", {
    imageCount: snap.imageCount,
    persistedPreviewCount,
    displayAttachmentCount: displayAfterRecover.length || snapshotDisplay.length,
    imagesReady,
  });

  setPrecheckStage(sessionId, "confirmed_create_draft");
  await store.selectSession(chatScope, sessionId);
  return sessionId;
}

/**
 * Idempotent post-login restore: one welcome line + one pending listing card.
 * Does not replay full chat history or create duplicate sidebar sessions.
 */
export async function tryRestorePendingChatDraftAfterLogin(
  chatScope: ChatStorageScope,
  deps: PostLoginDraftContinuationDeps
): Promise<PendingDraftRestoreResult> {
  if (shouldSkipSnapshotRestoreAfterClaim(deps.storageScopeKey)) {
    chatRestoreLog("tryRestorePendingChatDraftAfterLogin: skipped — guest claim");
    return { restored: false, reason: "claimed" };
  }

  chatRestoreLog("tryRestorePendingChatDraftAfterLogin: enter", {
    storageScopeKey: deps.storageScopeKey,
    restoreMeta: readPendingDraftRestoreMeta(),
    hasStorageSnapshot: hasPendingChatDraftSnapshotInStorage(),
    isDealer: deps.isDealer(),
    isAdmin: deps.isAdmin(),
    isMemberConsumerSeller: deps.isMemberConsumerSeller(),
  });

  if (restoreInFlight) {
    chatRestoreLog("tryRestore: skipped in_flight");
    return { restored: false, reason: "in_flight" };
  }

  const read = readPendingChatDraftSnapshot();
  if (isPendingSnapshotReadFailure(read)) {
    chatRestoreLog("tryRestore: read failed", { reason: read.reason });
    return { restored: false, reason: read.reason };
  }

  const snap = read.snapshot;
  const snapshotId = snap.publicRefCode;

  if (isPendingDraftRestoreFailed(snapshotId)) {
    chatRestoreLog("tryRestore: skipped prior failure", { snapshotId });
    return { restored: false, reason: "error" };
  }

  if (isPendingDraftSnapshotRestored(snapshotId)) {
    const meta = readPendingDraftRestoreMeta();
    if (meta?.sessionId) {
      await useChatStore.getState().selectSession(chatScope, meta.sessionId);
      chatRestoreLog("tryRestore: already restored", { snapshotId, sessionId: meta.sessionId });
      return { restored: true, sessionId: meta.sessionId };
    }
  }

  if (
    shouldDeferPendingDraftRestore({
      isSignedIn: true,
      isDealer: deps.isDealer(),
      isAdmin: deps.isAdmin(),
      isMemberConsumerSeller: deps.isMemberConsumerSeller(),
    })
  ) {
    markPendingDraftRestoreWaitingForProfile(snapshotId);
    chatRestoreLog("tryRestore: deferred waiting_for_profile", {
      snapshotId,
      isMemberConsumerSeller: deps.isMemberConsumerSeller(),
    });
    return { restored: false, reason: "deferred" };
  }

  if (!deps.isMemberConsumerSeller()) {
    chatRestoreLog("tryRestore: not_member_flow", { snapshotId });
    return { restored: false, reason: "not_member_flow" };
  }

  restoreInFlight = true;
  try {
    const sessionId = await restoreSinglePendingListingCard(chatScope, deps, snap);
    const messages = useChatStore.getState().messages[sessionId] ?? [];
    const cardMessage = findLatestPendingListingCardMessage(messages);
    if (!cardMessage?.pendingListingCard) {
      throw new Error("pending_listing_card_missing_after_restore");
    }

    finalizePendingDraftAfterRestore(snapshotId, sessionId);
    chatRestoreLog("tryRestore: complete", {
      snapshotId,
      sessionId,
      messageCount: messages.length,
      sidebarSessionCount: useChatStore.getState().sessions.length,
    });
    return { restored: true, sessionId };
  } catch (err) {
    console.warn("[chat-pending-draft] restore failed:", err);
    markPendingDraftRestoreFailed(snapshotId);
    chatRestoreLog("tryRestore: error", { snapshotId, error: String(err) });
    return { restored: false, reason: "error" };
  } finally {
    restoreInFlight = false;
  }
}
