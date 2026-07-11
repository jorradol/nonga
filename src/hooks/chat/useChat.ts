import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ChatMessage } from "../../types";
import { useChatStore } from "../../stores/chat/chatStore";
import { useAppStore } from "../../store";
import { aiService } from "../../services/ai/aiService";
import {
  buildMockChatReply,
  chunkTextForStream,
} from "../../services/ai/chatMockFallback";
import { tryOrchestrateChatReply } from "../../services/ai/chat/chatSearchOrchestrator";
import {
  applyChatUserVisibleServerBridge,
  shouldApplyBridgeUserVisibleText,
} from "../../services/ai/chat/chatUserVisibleOrchestrateClient";
import {
  resolvePilotSessionContextForFollowUp,
  pilotSessionCardsToChatCarCards,
} from "../../services/ai/chat/chatPilotSessionContext";
import { mergeChatCarCardsPreferImages } from "../../services/ai/chat/inventoryBackedCompare";
import { isPilotBuyerFollowUpMessage } from "../../services/ai/chat/chatPilotBuyerFollowUp";
import { buildPilotFollowUpNoContextCopy } from "../../services/ai/salesBrainUserVisiblePilotBuyerCopy";
import {
  mapChatRoleToSalesBrainUserRole,
  wireShadowChatPath,
} from "../../services/ai/salesBrainShadowChatPath";
import {
  handleBuyerLeadCaptureFromCarCard,
  handleBuyerLeadCaptureTurn,
  submitBuyerLeadFromModal,
} from "../../services/leads/buyerLeadCaptureHandler";
import {
  pauseBuyerLeadCapture,
  shouldRunBuyerLeadCaptureTurn,
} from "../../services/leads/buyerLeadCaptureFlow";
import { resolveBuyerLeadFlowEscape } from "../../services/leads/buyerLeadFlowEscape";
import { updateConversationalLeadMemory } from "../../services/leads/conversationalLeadMemory";
import type { ChatCarCardData } from "../../types";
import { useBuyerLeadCaptureStore } from "../../stores/buyerLeadCaptureStore";
import type { ChatInventoryCar } from "../../services/ai/chat/marketplaceChatSearch";
import {
  getChatStorageScope,
  GUEST_FALLBACK_UID,
  isEphemeralGuestChatScope,
  logChatStorageDebug,
  resolveChatActorDisplay,
} from "../../utils/chatStorageScope";
import { resetEphemeralGuestChatMemory } from "../../services/chat/chatHistoryService";
import { logDealerDraftEditUrl } from "../../utils/dealer/dealerDraftNavigation";
import { resolveDealerInventoryScopeId } from "../../utils/dealerIdentity";
import {
  resolveChatDealerDraftScopeBlockMessage,
} from "../../services/ai/chat/chatDraftAccess";
import { dealerAuthHeadersAsync } from "../../utils/apiAuthHeaders";
import { useAuth } from "../auth/useAuth";
import { useRole } from "../auth/useRole";
import {
  isSaveListingChatAction,
  CHAT_CONFIRM_CREATE_DRAFT_ACTION,
  buildDealerDraftPayloadFromChat,
  logChatDraftSave,
} from "../../services/ai/chat/chatDraftActions";
import {
  getChatDraftSaveMissingLabels,
  resolveMissingFieldsAfterChatImageUpload,
} from "../../services/ai/chat/chatDraftSaveResult";
import {
  isSellIntent,
  type ExtractedCarFields,
} from "../../services/ai/chat/sellIntentParser";
import { uploadListingImagesApi } from "../../services/dealer/dealerListingImageApi";
import {
  attachmentsForSavedDealerDraft,
  buildDealerChatImageUploadNote,
} from "../../services/chat/dealerChatDraftImageSave";
import { fileToPasteUploadPayload } from "../../utils/inventoryImport/pasteUploadedImageQueue";
import {
  clearChatImageAttachmentScope,
  clearChatImagesForDraft,
  collectChatImagesForDraft,
  getChatImagesForMessage,
  collectDraftPreviewDisplayAttachments,
  countChatImageAttachmentsInSession,
  markChatImageMessageForPendingListing,
  registerChatImageMessageFiles,
  toChatImageMessageAttachments,
  type StoredChatImageAttachment,
} from "../../features/chat-image-attachment-v1/chatImageAttachmentStore";
import type { PendingChatImageAttachment } from "../../features/chat-image-attachment-v1/types";
import {
  buildNoListingImageAckReply,
  buildPendingListingImageAckReply,
  buildSavedDraftImageAckReply,
  findLatestPendingListingContext,
  findLatestSavedDraftId,
} from "../../features/chat-image-attachment-v1/followUpImageIntent";
import { aiVisionService } from "../../services/ai/vision/visionEngine";
import { requireGuestLoginFromChat } from "../../utils/requestChatLogin";
import {
  clearPendingChatDraftSnapshot,
  hasPendingChatDraftSnapshot,
  hasPendingChatDraftSnapshotInStorage,
  isPendingDraftSnapshotRestored,
  isPendingSnapshotReadFailure,
  persistAttachmentsForSnapshot,
  readPendingChatDraftSnapshot,
  readPendingDraftRestoreMeta,
  savePendingChatDraftSnapshot,
  serializeMessagesForSnapshot,
  buildPostLoginDraftSavedText,
  POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE,
} from "../../utils/chatPendingDraftSnapshot";
import {
  applyClaimedGuestSessionToChatStore,
  shouldSkipSnapshotRestoreAfterClaim,
  tryClaimGuestChatAfterLogin,
} from "../../services/chat/claimGuestChatAfterLogin";
import {
  appendPendingRestoreFallbackMessage,
  tryRestorePendingChatDraftAfterLogin,
} from "../../services/chat/restorePendingChatDraft";
import { userService } from "../../services/user/userService";
import { chatRestoreLog } from "../../utils/chatRestoreDebug";
import { readGuestChatClaimPointer, saveGuestChatClaimPointer } from "../../utils/chatGuestClaim";
import {
  appendMemberPendingListingCardMessage,
  CHAT_MEMBER_CONFIRM_SAVE_LISTING_ACTION,
  resolveMemberPendingListingSaveContext,
  CHAT_MEMBER_NOT_NOW_LISTING_ACTION,
  CHAT_MEMBER_NOT_NOW_ACK,
  findLatestPendingListingCardMessage,
  isMemberConsumerSellerFlow,
  isMemberListingChatAction,
} from "../../services/chat/chatMemberPendingListing";
import {
  appendSavedMemberListingCardMessage,
  isMemberPublishListingChatAction,
  listingImageUrlsToChatAttachments,
} from "../../services/chat/chatSavedMemberListing";
import {
  buildPublishedMemberListingCardData,
  resolveSavedCardForPublishedListing,
} from "../../services/chat/chatPublishedMemberListing";
import {
  handleMemberCancelPublishIntent,
  confirmMemberPublishListingFromChat,
  handleMemberPublishListingIntent,
  isMemberCancelPublishListingChatAction,
  isMemberConfirmPublishListingChatAction,
} from "../../services/chat/publishMemberListingFromChat";
import {
  buildMemberReattachSaveParams,
} from "../../services/chat/continueGuestConfirmedMemberListingSave";
import type { PersonalityPresetId } from "../../types/ai";
import {
  hasGuestConfirmedPendingHandoff,
  shouldDeferGuestImageScopeClear,
  tryRunGuestConfirmedLoginHandoff,
} from "../../services/chat/guestConfirmedLoginHandoff";
import { guestConfirmAutoSaveLog } from "../../utils/guestConfirmAutoSaveDebug";
import {
  CHAT_MEMBER_SAVE_IN_PROGRESS_MESSAGE,
  saveMemberListingFromChat,
} from "../../services/chat/saveMemberListingFromChat";
import {
  bootstrapPrecheckFields,
  buildDraftCopyReadyReply,
  buildKnownVisionHints,
  buildMissingFieldsPrompt,
  buildPrecheckVisionReply,
  clearPrecheckContext,
  ensurePublicRefCode,
  getMissingCoreFieldLabels,
  getPrecheckContext,
  hasCoreFieldsComplete,
  mergeEffectivePrecheckFields,
  isConfirmCreateListingIntent,
  isPrecheckAwaitingConfirm,
  isListingCreateWithImagesMessage,
  isStartCreateListingIntent,
  setPrecheckStage,
  setPrecheckVisionSummary,
  upsertPrecheckFromMessage,
  type VisionObservationSummary,
} from "../../services/ai/chat/chatPrecheckLayer";

let lastHydratedChatScopeKey: string | null = null;

async function fetchInventoryForChat(): Promise<ChatInventoryCar[]> {
  try {
    const res = await fetch(`/api/cars?_=${Date.now()}`, { cache: "no-store" });
    const json = await res.json();
    return (json?.data ?? []) as ChatInventoryCar[];
  } catch {
    return [];
  }
}

async function fetchMockChatReply(userText: string): Promise<string> {
  const cars = await fetchInventoryForChat();
  return buildMockChatReply(userText, cars);
}

async function uploadChatImagesToDraft(
  images: StoredChatImageAttachment[],
  draftId: string,
  dealerId: string,
  role: string
): Promise<{
  storedUrls: string[];
  failed: Array<{ name: string; error: string }>;
}> {
  const payloads = await Promise.all(
    images.map((item) =>
      fileToPasteUploadPayload(item.file).then((payload) => ({
        ...payload,
        originalFileName: item.metadata.originalFileName,
        source: "chat-image-attachment-v1" as const,
      }))
    )
  );

  return uploadListingImagesApi(
    { dealerId, role },
    draftId,
    "draft",
    payloads,
    { throwIfNone: false }
  );
}

function notifyDealerDraftSaved(draftId: string | undefined): void {
  if (!draftId || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("nonga-dealer-draft-saved", {
      detail: { draftId },
    })
  );
}

export function useChat() {
  const {
    sessions,
    activeSessionId,
    messages,
    isGenerating,
    streamedReply,
    streamedCarCards,
    streamedHasMoreCars,
    userPreferences,
    isAnalyzingMemory,
    activePresetId,
    personalities,
    isLoadingPersonalities,
    resetChatState,
    loadSessions,
    createSession,
    deleteSession,
    selectSession,
    addMessage,
    editMessage,
    updateStreamedReply,
    finalizeStreamedReply,
    setGenerating,
    loadUserPreferences,
    setPresetId,
    loadPersonalitiesList,
    updatePersonalityInstruction,
  } = useChatStore();
  const hydrateRunRef = useRef(0);

  const { user, fetchCars } = useAppStore();
  const { isSignedIn } = useAuth();
  const { isDealer, isAdmin, role } = useRole();

  const chatScope = useMemo(() => getChatStorageScope(user), [user]);
  const storageScopeKey = chatScope.storageKey;
  const memberConsumerSellerFlow = useMemo(
    () =>
      isMemberConsumerSellerFlow({
        isSignedIn,
        isDealer,
        isAdmin,
        chatScopeMode: chatScope.mode === "dealer" ? "dealer" : "consumer",
      }),
    [isSignedIn, isDealer, isAdmin, chatScope.mode]
  );

  const resolveMemberOwnerProfile = useCallback(() => {
    const authUser = user as {
      uid?: string;
      displayName?: string;
      name?: string;
      phone?: string;
    } | null;
    return {
      ownerId: authUser?.uid?.trim() ?? "",
      ownerName: authUser?.displayName ?? authUser?.name ?? "",
      ownerPhone: authUser?.phone ?? "",
    };
  }, [user]);

  const runGuestConfirmedAutoSaveAfterLogin = useCallback(
    async (previousGuestScopeKey?: string | null) => {
      if (!memberConsumerSellerFlow) return null;
      const { ownerId, ownerName, ownerPhone } = resolveMemberOwnerProfile();
      if (!ownerId) {
        guestConfirmAutoSaveLog("after login: defer handoff", {
          reason: "owner_profile_not_ready",
          isSignedIn,
          role,
        });
        return null;
      }
      return tryRunGuestConfirmedLoginHandoff({
        memberScope: chatScope,
        storageScopeKey,
        isMemberConsumerSeller: memberConsumerSellerFlow,
        ownerId,
        ownerName,
        ownerPhone,
        previousGuestScopeKey,
      });
    },
    [memberConsumerSellerFlow, resolveMemberOwnerProfile, storageScopeKey, chatScope, isSignedIn, role]
  );

  const saveDraftRef = useRef<
    (params: {
      sessionId: string;
      fields: Record<string, unknown>;
    }) => Promise<{
      text: string;
      savedDraftId?: string;
      uploadedImageUrls?: string[];
    }>
  >(async () => ({
    text: "กำลังเตรียมระบบบันทึกประกาศครับ กรุณารอสักครู่",
  }));
  const runPendingLoginRestore = useCallback(async () => {
    if (shouldSkipSnapshotRestoreAfterClaim(storageScopeKey)) {
      chatRestoreLog("runPendingLoginRestore: skip — guest session already claimed");
      return true;
    }

    const inStorage = hasPendingChatDraftSnapshotInStorage();
    const read = readPendingChatDraftSnapshot();
    chatRestoreLog("runPendingLoginRestore: called", {
      isSignedIn,
      inStorage,
      readOk: read.ok,
      readReason: isPendingSnapshotReadFailure(read) ? read.reason : undefined,
      restoreMeta: readPendingDraftRestoreMeta(),
      memberConsumerSellerFlow,
      isDealer,
      isAdmin,
      storageScopeKey,
      activeSessionId: useChatStore.getState().activeSessionId,
      sessionCount: useChatStore.getState().sessions.length,
    });

    if (!isSignedIn) {
      chatRestoreLog("runPendingLoginRestore: skip — not signed in");
      return false;
    }

    if (isPendingSnapshotReadFailure(read)) {
      if (inStorage) {
        await appendPendingRestoreFallbackMessage(chatScope, read.reason);
      }
      return false;
    }

    const snapshotId = read.snapshot.publicRefCode;
    if (isPendingDraftSnapshotRestored(snapshotId)) {
      chatRestoreLog("runPendingLoginRestore: skip — already restored", { snapshotId });
      return true;
    }

    try {
      const restoreResult = await tryRestorePendingChatDraftAfterLogin(chatScope, {
        storageScopeKey,
        isDealer: () => isDealer,
        isAdmin: () => isAdmin,
        isMemberConsumerSeller: () => memberConsumerSellerFlow,
        ownerId: () => resolveMemberOwnerProfile().ownerId,
        ownerName: () => resolveMemberOwnerProfile().ownerName,
        ownerPhone: () => resolveMemberOwnerProfile().ownerPhone,
      });
      chatRestoreLog("runPendingLoginRestore: result", restoreResult);
      if (restoreResult.restored === false) {
        const { reason } = restoreResult;
        if (
          reason !== "deferred" &&
          reason !== "in_flight" &&
          reason !== "claimed"
        ) {
          await appendPendingRestoreFallbackMessage(chatScope, reason, snapshotId);
        }
      }
      return restoreResult.restored;
    } finally {
      setGenerating(false);
    }
  }, [
    chatScope,
    storageScopeKey,
    isSignedIn,
    isDealer,
    isAdmin,
    memberConsumerSellerFlow,
    setGenerating,
    resolveMemberOwnerProfile,
  ]);

  const hydrateChatForScope = useCallback(async (force = false) => {
    const hydrateRunId = ++hydrateRunRef.current;
    const isHydrateRunStale = () =>
      hydrateRunId !== hydrateRunRef.current ||
      lastHydratedChatScopeKey !== storageScopeKey;

    const guestEphemeral = isEphemeralGuestChatScope(chatScope);
    const isNewScope = lastHydratedChatScopeKey !== storageScopeKey;
    const previousScopeKey = lastHydratedChatScopeKey;
    const chatState = useChatStore.getState();
    const hasInMemoryGuestThread =
      guestEphemeral && chatState.sessions.length > 0;
    const pendingBeforeReset = hasPendingChatDraftSnapshotInStorage();

    chatRestoreLog("hydrateChatForScope: enter", {
      force,
      isNewScope,
      previousScopeKey,
      nextScopeKey: storageScopeKey,
      isSignedIn,
      guestEphemeral,
      pendingBeforeReset,
      restoreMeta: readPendingDraftRestoreMeta(),
    });

    // Same visit + scope: keep guest in-memory thread (do not wipe on every effect run).
    if (!isNewScope && !force) {
      if (isSignedIn && memberConsumerSellerFlow && hasGuestConfirmedPendingHandoff()) {
        await runGuestConfirmedAutoSaveAfterLogin(
          readGuestChatClaimPointer()?.guestStorageScopeKey ?? null
        );
      }
      chatRestoreLog("hydrateChatForScope: skip — same scope");
      return;
    }

    // Forced refresh on same scope: reload prefs/personalities only; never clear an active guest chat.
    if (!isNewScope && force) {
      if (isSignedIn && user?.uid) {
        await userService.ensureProfileReady(user.uid);
      }
      await loadUserPreferences(storageScopeKey);
      await loadPersonalitiesList();
      if (isSignedIn && user?.uid) {
        const preset = await userService.getPersonalPreset(user.uid);
        if (preset) {
          setPresetId(preset as PersonalityPresetId);
        }
      }
      chatRestoreLog("hydrateChatForScope: force prefs only");
      return;
    }

    const previousWasGuest =
      Boolean(previousScopeKey?.startsWith("user:guest-")) &&
      !previousScopeKey?.includes(GUEST_FALLBACK_UID);
    let claimOutcome: Awaited<ReturnType<typeof tryClaimGuestChatAfterLogin>> | null =
      null;

    if (
      isSignedIn &&
      isNewScope &&
      previousWasGuest &&
      previousScopeKey &&
      memberConsumerSellerFlow
    ) {
      const guestUserId = previousScopeKey.replace(/^user:/, "");
      claimOutcome = await tryClaimGuestChatAfterLogin({
        previousGuestScopeKey: previousScopeKey,
        memberScope: chatScope,
        guestScope: {
          storageKey: previousScopeKey,
          userId: guestUserId,
          dealerId: null,
          mode: "consumer",
        },
        inMemory: {
          sessions: chatState.sessions,
          messages: chatState.messages,
          activeSessionId: chatState.activeSessionId,
        },
        isMemberConsumerSeller: memberConsumerSellerFlow,
      });
      chatRestoreLog("hydrateChatForScope: claim result", claimOutcome);
    }

    const guestScopeKeyForHandoff =
      previousWasGuest && previousScopeKey?.startsWith("user:guest-")
        ? previousScopeKey
        : readGuestChatClaimPointer()?.guestStorageScopeKey ?? null;

    if (lastHydratedChatScopeKey) {
      const shouldDeferClear = shouldDeferGuestImageScopeClear({
        guestScopeKey: guestScopeKeyForHandoff ?? lastHydratedChatScopeKey,
        memberScopeKey: storageScopeKey,
      });
      if (shouldDeferClear) {
        guestConfirmAutoSaveLog("snapshot clear: deferred", {
          reason: "pending_handoff_before_migrate",
          guestScopeKey: guestScopeKeyForHandoff ?? lastHydratedChatScopeKey,
        });
      } else {
        clearChatImageAttachmentScope(lastHydratedChatScopeKey);
      }
    }
    if (guestEphemeral && !hasInMemoryGuestThread) {
      resetEphemeralGuestChatMemory();
    }
    resetChatState();
    lastHydratedChatScopeKey = storageScopeKey;

    chatRestoreLog("hydrateChatForScope: after resetChatState", {
      pendingAfterReset: hasPendingChatDraftSnapshotInStorage(),
      restoreMeta: readPendingDraftRestoreMeta(),
    });

    await loadSessions(chatScope);
    if (isHydrateRunStale()) return;

    if (isSignedIn && user?.uid) {
      await userService.ensureProfileReady(user.uid);
    }
    if (isHydrateRunStale()) return;

    await loadUserPreferences(storageScopeKey);
    if (isHydrateRunStale()) return;

    await loadPersonalitiesList();
    if (isHydrateRunStale()) return;

    if (isSignedIn && user?.uid) {
      const preset = await userService.getPersonalPreset(user.uid);
      if (preset) {
        setPresetId(preset as PersonalityPresetId);
      }
    }
    if (isHydrateRunStale()) return;

    logChatStorageDebug(chatScope, {
      draftDealerId: chatScope.dealerId,
    });

    if (claimOutcome?.claimed) {
      await applyClaimedGuestSessionToChatStore(
        chatScope,
        claimOutcome.sessionId,
        claimOutcome.messages
      );
    }

    if (isSignedIn && memberConsumerSellerFlow && hasGuestConfirmedPendingHandoff()) {
      await runGuestConfirmedAutoSaveAfterLogin(guestScopeKeyForHandoff);
    }

    chatRestoreLog("hydrateChatForScope: after loadSessions", {
      sessionCount: useChatStore.getState().sessions.length,
      activeSessionId: useChatStore.getState().activeSessionId,
      pendingInStorage: hasPendingChatDraftSnapshotInStorage(),
      isSignedIn,
      claimApplied: claimOutcome?.claimed ?? false,
    });

    if (
      isSignedIn &&
      !claimOutcome?.claimed &&
      !shouldSkipSnapshotRestoreAfterClaim(storageScopeKey) &&
      (hasPendingChatDraftSnapshot() || hasPendingChatDraftSnapshotInStorage())
    ) {
      await runPendingLoginRestore();
    } else if (hasPendingChatDraftSnapshotInStorage()) {
      chatRestoreLog("hydrateChatForScope: pending in storage but restore skipped", {
        isSignedIn,
      });
    }
  }, [
    storageScopeKey,
    chatScope,
    resetChatState,
    loadSessions,
    loadUserPreferences,
    loadPersonalitiesList,
    isSignedIn,
    memberConsumerSellerFlow,
    runPendingLoginRestore,
    runGuestConfirmedAutoSaveAfterLogin,
    setPresetId,
    user?.uid,
  ]);

  const setPresetWithServerSync = useCallback(
    (id: typeof activePresetId) => {
      setPresetId(id);
      if (!isSignedIn || !user?.uid) return;
      void userService.updatePersonalPreset(user.uid, id).catch(() => {
        console.warn("Personal preset sync skipped");
      });
    },
    [setPresetId, isSignedIn, user?.uid]
  );

  /** หลัง login / role พร้อม — restore แม้ scope hydrate ไปแล้ว (แก้ race isSignedIn ช้ากว่า scope) */
  useEffect(() => {
    if (!isSignedIn) return;

    if (hasGuestConfirmedPendingHandoff() && memberConsumerSellerFlow) {
      const snapRead = readPendingChatDraftSnapshot();
      guestConfirmAutoSaveLog("after login: post-login effect", {
        snapshotExists: snapRead.ok || hasPendingChatDraftSnapshotInStorage(),
        userAlreadyConfirmedCreateDraft: snapRead.ok
          ? snapRead.snapshot.userAlreadyConfirmedCreateDraft
          : false,
        isSignedIn,
        role,
        memberConsumerSellerFlow,
        storageScopeKey,
        claimPointerStatus: readGuestChatClaimPointer()?.status ?? null,
      });
      void runGuestConfirmedAutoSaveAfterLogin(
        readGuestChatClaimPointer()?.guestStorageScopeKey ?? null
      );
      return;
    }

    const read = readPendingChatDraftSnapshot();
    if (shouldSkipSnapshotRestoreAfterClaim(storageScopeKey)) return;
    if (!hasPendingChatDraftSnapshot() && !hasPendingChatDraftSnapshotInStorage()) {
      return;
    }
    if (read.ok && isPendingDraftSnapshotRestored(read.snapshot.publicRefCode)) {
      return;
    }

    chatRestoreLog("post-login restore effect: scheduling", {
      storageScopeKey,
      memberConsumerSellerFlow,
      isDealer,
      isAdmin,
      restoreMeta: readPendingDraftRestoreMeta(),
      lastHydratedChatScopeKey,
      readOk: read.ok,
      readReason: isPendingSnapshotReadFailure(read) ? read.reason : undefined,
    });

    void (async () => {
      if (lastHydratedChatScopeKey !== storageScopeKey) {
        return;
      }
      if (useChatStore.getState().sessions.length === 0) {
        await loadSessions(chatScope);
      }
      await runPendingLoginRestore();
    })();
  }, [
    isSignedIn,
    user,
    role,
    storageScopeKey,
    memberConsumerSellerFlow,
    isDealer,
    isAdmin,
    chatScope,
    loadSessions,
    runPendingLoginRestore,
    runGuestConfirmedAutoSaveAfterLogin,
  ]);

  useEffect(() => {
    void hydrateChatForScope();
  }, [hydrateChatForScope]);

  const initializeChat = useCallback(async () => {
    await hydrateChatForScope(true);
  }, [hydrateChatForScope]);

  const saveDealerDraftFromFields = useCallback(
    async (params: {
      sessionId: string;
      fields: Record<string, unknown>;
    }): Promise<{
      text: string;
      savedDraftId?: string;
      uploadedImageUrls?: string[];
    }> => {
      const { payload } = buildDealerDraftPayloadFromChat(
        params.fields as Parameters<typeof buildDealerDraftPayloadFromChat>[0]
      );
      const draftSaveBlock = resolveChatDealerDraftScopeBlockMessage({
        isSignedIn,
        chatScope,
        isDealer,
        isAdmin,
        user,
        role,
      });
      if (draftSaveBlock) {
        if (!isSignedIn) {
          requireGuestLoginFromChat("chat");
        }
        return { text: draftSaveBlock };
      }

      const draftDealerId = resolveDealerInventoryScopeId(user, role);
      if (!draftDealerId) {
        return { text: "ไม่พบ dealer scope สำหรับบันทึก draft" };
      }
      const apiRole = isAdmin ? "admin" : "dealer";
      const endpoint = "/api/dealer/drafts/new";
      const sessionMessages = useChatStore.getState().messages[params.sessionId] || [];

      try {
        const headers = await dealerAuthHeadersAsync(draftDealerId, apiRole);
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const responseText = await res.text();
        let result: {
          data?: { id?: string; missingFields?: string[] };
          message?: string;
        } = {};
        try {
          result = JSON.parse(responseText) as typeof result;
        } catch {
          result = { message: responseText.slice(0, 200) };
        }

        if (!res.ok) {
          logChatDraftSave("error", {
            status: res.status,
            statusText: res.statusText,
            endpoint,
            dealerId: draftDealerId,
            body: result,
          });
          return {
            text: "เกิดข้อผิดพลาดในการบันทึกประกาศครับ รบกวนลองใหม่อีกครั้ง",
          };
        }

        const newDraftId = result.data?.id;
        let missingFields = [...(result.data?.missingFields ?? [])];
        let uploadNote = "";
        let uploadedImageUrls: string[] | undefined;
        const imagesToUpload = newDraftId
          ? collectChatImagesForDraft(storageScopeKey, params.sessionId, sessionMessages)
          : [];

        if (newDraftId && imagesToUpload.length > 0) {
          try {
            const uploadResult = await uploadChatImagesToDraft(
              imagesToUpload,
              newDraftId,
              draftDealerId,
              apiRole
            );
            uploadedImageUrls = uploadResult.storedUrls;
            clearChatImagesForDraft(storageScopeKey, params.sessionId);
            missingFields = resolveMissingFieldsAfterChatImageUpload(
              missingFields,
              uploadResult.storedUrls
            );
            uploadNote = buildDealerChatImageUploadNote(
              imagesToUpload.length,
              uploadResult
            );
          } catch (uploadErr) {
            console.error("[chat-image-attachment-v1-upload]", uploadErr);
            uploadNote = buildDealerChatImageUploadNote(imagesToUpload.length, {
              storedUrls: [],
              failed: imagesToUpload.map((item) => ({
                name: item.metadata.originalFileName ?? item.metadata.name,
                error: "upload failed",
              })),
            });
          }
        }

        const missingLabels = getChatDraftSaveMissingLabels(missingFields);
        const saveText =
          missingLabels.length > 0
            ? `บันทึกฉบับร่างแล้วครับ แต่ยังต้องเติมก่อนส่งเข้าตลาด:\n${missingLabels.map((item) => `- ${item}`).join("\n")}\n\nกรุณาเติมข้อมูลเหล่านี้ในหน้าประกาศที่ยังไม่ลงขายก่อนกดลงขายครับ${uploadNote}`
            : `บันทึกประกาศสำเร็จเรียบร้อยแล้วครับ! กดปุ่ม “ดูประกาศที่บันทึกไว้” เพื่อเปิดรายการที่เพิ่งบันทึก หรือเข้าไปเพิ่มรูป แก้ไขข้อมูล และกดลงขายได้เลย\n\nถ้าต้องการนำเข้าสต๊อกแบบหน้าเว็บ ให้ไปที่เมนู “นำเข้าสต๊อก” (/dealer/import หรือ /admin/inventory-import) ได้ทันทีครับ ปังปุริเย่!${uploadNote}`;

        notifyDealerDraftSaved(newDraftId);
        clearPendingChatDraftSnapshot();
        return { text: saveText, savedDraftId: newDraftId, uploadedImageUrls };
      } catch (e) {
        logChatDraftSave("error", {
          endpoint,
          error: e instanceof Error ? e.message : String(e),
        });
        return {
          text: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบบันทึกประกาศครับ รบกวนลองใหม่อีกครั้ง",
        };
      }
    },
    [
      chatScope,
      isAdmin,
      isDealer,
      isSignedIn,
      storageScopeKey,
      user,
    ]
  );

  saveDraftRef.current = saveDealerDraftFromFields;

  const sendMessage = useCallback(
    async (
      text: string,
      pendingImages?: PendingChatImageAttachment[]
    ) => {
      const trimmed = text.trim();
      const imageAttachments = pendingImages ?? [];
      const hasImages = imageAttachments.length > 0;
      if ((!trimmed && !hasImages) || isGenerating) return;

      let sessionId = activeSessionId;
      if (!sessionId) {
        try {
          sessionId = await createSession(chatScope, "ปรึกษาซื้อขาย");
        } catch (err) {
          console.warn("[chat] unable to create local session", err);
          throw new Error("เตรียมบทสนทนาไม่สำเร็จครับ กรุณารีเฟรชหน้าแล้วลองใหม่");
        }
      }

      const sortOrderBase = countChatImageAttachmentsInSession(
        storageScopeKey,
        sessionId
      );
      const attachmentMeta = toChatImageMessageAttachments(
        imageAttachments,
        sortOrderBase
      );
      const userMsg = await addMessage(
        sessionId,
        "user",
        trimmed || "(แนบรูป)",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        attachmentMeta.length > 0 ? attachmentMeta : undefined
      );
      registerChatImageMessageFiles(
        storageScopeKey,
        sessionId,
        userMsg.id,
        imageAttachments,
        attachmentMeta
      );

      const reattachPrecheck = getPrecheckContext(sessionId);
      if (
        reattachPrecheck?.awaitingImageReattachForConfirmedDraft &&
        hasImages &&
        isSignedIn
      ) {
        markChatImageMessageForPendingListing(
          storageScopeKey,
          sessionId,
          userMsg.id
        );
        setGenerating(true);
        updateStreamedReply("");
        setPrecheckStage(sessionId, "confirmed_create_draft");

        const historyAfterReattach =
          useChatStore.getState().messages[sessionId] || [];

        if (memberConsumerSellerFlow) {
          const { ownerId, ownerName, ownerPhone } = resolveMemberOwnerProfile();
          if (!ownerId) {
            updateStreamedReply(
              "กรุณาเข้าสู่ระบบก่อนบันทึกประกาศครับ ลองรีเฟรชหน้าแล้วเข้าสู่ระบบอีกครั้งนะครับ"
            );
            await finalizeStreamedReply(sessionId);
            setGenerating(false);
            return;
          }

          updateStreamedReply(CHAT_MEMBER_SAVE_IN_PROGRESS_MESSAGE);
          await finalizeStreamedReply(sessionId);

          const saveResult = await saveMemberListingFromChat(
            buildMemberReattachSaveParams({
              sessionId,
              messages: historyAfterReattach,
              storageScopeKey,
              precheck: reattachPrecheck,
              ownerId,
              ownerName,
              ownerPhone,
              cardAttachments: attachmentMeta.length > 0 ? attachmentMeta : undefined,
            })
          );

          if (!saveResult.ok) {
            updateStreamedReply(saveResult.message);
            await finalizeStreamedReply(sessionId);
            setGenerating(false);
            return;
          }

          await appendSavedMemberListingCardMessage(sessionId, {
            card: saveResult.savedCard,
          });
          clearPrecheckContext(sessionId);
          clearPendingChatDraftSnapshot();
          setGenerating(false);
          return;
        }

        const saved = await saveDealerDraftFromFields({
          sessionId,
          fields: reattachPrecheck.fields as Record<string, unknown>,
        });
        const refCode = reattachPrecheck.publicRefCode ?? "";
        const replyText = saved.savedDraftId
          ? `${buildPostLoginDraftSavedText(refCode)}${
              saved.text.includes("แต่ยังต้องเติม")
                ? `\n\n${saved.text}`
                : saved.text.includes("แนบรูปภาพแล้ว")
                  ? `\n\n${saved.text.split("\n\n").slice(-1)[0]}`
                  : ""
            }`
          : saved.text;
        updateStreamedReply(replyText);
        await finalizeStreamedReply(
          sessionId,
          undefined,
          undefined,
          undefined,
          undefined,
          saved.savedDraftId,
          attachmentsForSavedDealerDraft(
            saved.uploadedImageUrls,
            attachmentMeta.length > 0 ? attachmentMeta : undefined
          )
        );
        clearPrecheckContext(sessionId);
        if (saved.savedDraftId) {
          clearPendingChatDraftSnapshot();
        }
        setGenerating(false);
        return;
      }

      setGenerating(true);
      updateStreamedReply("", []);

      try {
      const historyAfterUser =
        useChatStore.getState().messages[sessionId] || [];

      // v7.2 — Conversational Lead Memory (record-only): remember buyer interest
      // from this message (model/budget/area/conditions/intent) to help the
      // conversation and prepare a smarter lead draft later. Never sends a lead,
      // never implies consent, never stores phone/name. Does not change replies.
      updateConversationalLeadMemory(sessionId, trimmed);

      // v7.1 — Lead Flow Escape + Intent Re-check: if a buyer lead capture is
      // active but the latest message has a new intent, pause the lead (draft,
      // never sent) and fall back to helping with the new intent.
      const leadEscape = resolveBuyerLeadFlowEscape(sessionId, trimmed);
      if (leadEscape.kind === "hold") {
        pauseBuyerLeadCapture(sessionId);
        await addMessage(sessionId, "ai", leadEscape.reply);
        setGenerating(false);
        return;
      }
      if (leadEscape.kind === "redirect") {
        pauseBuyerLeadCapture(sessionId);
        await addMessage(sessionId, "ai", leadEscape.ack);
        // do not return — continue so the new intent is handled this turn
      }

      if (
        leadEscape.kind === "none" &&
        shouldRunBuyerLeadCaptureTurn(sessionId, memberConsumerSellerFlow)
      ) {
        const buyerLeadCapture = await handleBuyerLeadCaptureTurn({
          sessionId,
          message: trimmed,
          isSignedIn,
        });
        if (buyerLeadCapture.handled) {
          await addMessage(
            sessionId,
            "ai",
            buyerLeadCapture.reply,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            buyerLeadCapture.isBuyerLeadReady || buyerLeadCapture.isBuyerLeadProfileReuse
              ? {
                  ...(buyerLeadCapture.isBuyerLeadReady
                    ? { isBuyerLeadReady: true }
                    : {}),
                  ...(buyerLeadCapture.isBuyerLeadProfileReuse
                    ? { isBuyerLeadProfileReuse: true }
                    : {}),
                }
              : undefined
          );
          if (buyerLeadCapture.openConsentModal) {
            useBuyerLeadCaptureStore.getState().openConsentModal(sessionId);
          }
          setGenerating(false);
          return;
        }
      }

      if (memberConsumerSellerFlow) {
        if (isMemberCancelPublishListingChatAction(trimmed)) {
          const cancelled = handleMemberCancelPublishIntent(sessionId);
          await addMessage(sessionId, "ai", cancelled.message);
          setGenerating(false);
          return;
        }

        if (isMemberConfirmPublishListingChatAction(trimmed)) {
          const confirmed = await confirmMemberPublishListingFromChat({
            sessionId,
            ownerId: user?.uid?.trim() ?? "",
            canPublish: memberConsumerSellerFlow && isSignedIn,
          });
          if (
            confirmed.kind === "success" ||
            confirmed.kind === "already_published"
          ) {
            const savedCard = resolveSavedCardForPublishedListing(
              historyAfterUser,
              confirmed.listingId
            );
            const publishedCard = savedCard
              ? buildPublishedMemberListingCardData(savedCard)
              : null;
            const publishAttachments =
              publishedCard && publishedCard.imageUrls.length > 0
                ? listingImageUrlsToChatAttachments(publishedCard.imageUrls)
                : undefined;

            await addMessage(
              sessionId,
              "ai",
              confirmed.message,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              publishAttachments,
              {
                isPublishSuccess: true,
                ...(publishedCard
                  ? {
                      isPublishedMemberListingCard: true,
                      publishedMemberListingCard: publishedCard,
                    }
                  : {}),
              },
              confirmed.listingId
            );
            void fetchCars();
          } else {
            await addMessage(sessionId, "ai", confirmed.message);
          }
          setGenerating(false);
          return;
        }
      }

      const pendingListingContext =
        findLatestPendingListingContext(historyAfterUser);
      const latestSavedDraftId = findLatestSavedDraftId(historyAfterUser);

      if (
        (isMemberListingChatAction(trimmed) ||
          isMemberPublishListingChatAction(trimmed)) &&
        memberConsumerSellerFlow
      ) {
        if (isMemberPublishListingChatAction(trimmed)) {
          const publishIntent = handleMemberPublishListingIntent({
            sessionId,
            messages: historyAfterUser,
          });
          if (publishIntent.kind === "blocked") {
            await addMessage(sessionId, "ai", publishIntent.message);
          } else {
            await addMessage(
              sessionId,
              "ai",
              publishIntent.message,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              { isPublishAwaitingConfirm: true },
              publishIntent.listingId
            );
          }
          setGenerating(false);
          return;
        }
        if (trimmed === CHAT_MEMBER_CONFIRM_SAVE_LISTING_ACTION) {
          const precheck = getPrecheckContext(sessionId);
          const saveContext = resolveMemberPendingListingSaveContext({
            messages: historyAfterUser,
            precheck,
            fallbackPublicRefCode: ensurePublicRefCode(sessionId),
          });

          if (saveContext.ok === false) {
            updateStreamedReply(saveContext.message);
            await finalizeStreamedReply(sessionId);
            setGenerating(false);
            return;
          }

          if (!user?.uid?.trim()) {
            updateStreamedReply(
              "กรุณาเข้าสู่ระบบก่อนบันทึกประกาศครับ ลองรีเฟรชหน้าแล้วเข้าสู่ระบบอีกครั้งนะครับ"
            );
            await finalizeStreamedReply(sessionId);
            setGenerating(false);
            return;
          }

          updateStreamedReply(CHAT_MEMBER_SAVE_IN_PROGRESS_MESSAGE);
          await finalizeStreamedReply(sessionId);

          const saveResult = await saveMemberListingFromChat({
            fields: saveContext.fields,
            visionSummary: saveContext.visionSummary,
            publicRefCode: saveContext.publicRefCode,
            marketingCopy: saveContext.marketingCopy,
            ownerId: user.uid,
            ownerName:
              (user as { displayName?: string; name?: string } | null)?.displayName ??
              (user as { name?: string } | null)?.name ??
              "",
            ownerPhone: (user as { phone?: string } | null)?.phone ?? "",
            storageScopeKey,
            sessionId,
            messages: historyAfterUser,
            cardAttachments: saveContext.cardAttachments,
          });

          if (!saveResult.ok) {
            updateStreamedReply(saveResult.message);
            await finalizeStreamedReply(sessionId);
            setGenerating(false);
            return;
          }

          await appendSavedMemberListingCardMessage(sessionId, {
            card: saveResult.savedCard,
          });
          clearPrecheckContext(sessionId);
          clearPendingChatDraftSnapshot();
          setGenerating(false);
          return;
        }
        if (trimmed === CHAT_MEMBER_NOT_NOW_LISTING_ACTION) {
          updateStreamedReply(CHAT_MEMBER_NOT_NOW_ACK);
          await finalizeStreamedReply(sessionId);
          setGenerating(false);
          return;
        }
      }

      if (trimmed === "แก้ไขข้อมูล") {
        const cardMsg = findLatestPendingListingCardMessage(historyAfterUser);
        if (cardMsg?.pendingListingCard) {
          bootstrapPrecheckFields(
            sessionId,
            cardMsg.pendingListingCard.fields as ExtractedCarFields
          );
          if (cardMsg.pendingListingCard.visionSummary) {
            setPrecheckVisionSummary(
              sessionId,
              cardMsg.pendingListingCard.visionSummary as VisionObservationSummary
            );
          }
          setPrecheckStage(sessionId, "collecting_missing_fields");
          updateStreamedReply(
            "พิมพ์ข้อมูลที่ต้องการแก้ไขมาได้เลยครับ เช่น 'เปลี่ยนราคาเป็น 400000' หรือ 'เพิ่มจุดเด่น: ยางใหม่'"
          );
          await finalizeStreamedReply(sessionId);
          setGenerating(false);
          return;
        }
      }

      const isListingCreateWithImages =
        hasImages && trimmed && isListingCreateWithImagesMessage(trimmed);
      const activePrecheck = getPrecheckContext(sessionId);
      const precheckActive =
        activePrecheck?.stage &&
        activePrecheck.stage !== "idle" &&
        activePrecheck.stage !== "confirmed_create_draft";
      const startCreateIntent = isStartCreateListingIntent(trimmed) || isListingCreateWithImages;
      const confirmCreateIntent =
        isConfirmCreateListingIntent(trimmed) || isSaveListingChatAction(trimmed);
      const continuePrecheckIntent =
        precheckActive && !startCreateIntent && !confirmCreateIntent;

      if (startCreateIntent || confirmCreateIntent || continuePrecheckIntent) {
        const resolvePrecheckDraftAttachments = ():
          | ReturnType<typeof toChatImageMessageAttachments>
          | undefined => {
          const msgs = useChatStore.getState().messages[sessionId] || [];
          const display = collectDraftPreviewDisplayAttachments(
            storageScopeKey,
            sessionId,
            msgs
          );
          if (display.length > 0) return display;
          if (attachmentMeta.length > 0) return attachmentMeta;
          return undefined;
        };

        const isPureConfirmMessage =
          isConfirmCreateListingIntent(trimmed) ||
          trimmed === CHAT_CONFIRM_CREATE_DRAFT_ACTION ||
          trimmed === "ตกลง สร้างเลย" ||
          trimmed === "เอาเลย" ||
          trimmed === "บันทึกประกาศ";

        if (confirmCreateIntent) {
          if (
            memberConsumerSellerFlow &&
            isSignedIn &&
            hasGuestConfirmedPendingHandoff()
          ) {
            await runGuestConfirmedAutoSaveAfterLogin(
              readGuestChatClaimPointer()?.guestStorageScopeKey ?? storageScopeKey
            );
            setGenerating(false);
            return;
          }

          const awaitingReattach = getPrecheckContext(sessionId);
          if (
            memberConsumerSellerFlow &&
            isSignedIn &&
            awaitingReattach?.awaitingImageReattachForConfirmedDraft
          ) {
            const historyForReattach =
              useChatStore.getState().messages[sessionId] || [];
            const imageCount = collectChatImagesForDraft(
              storageScopeKey,
              sessionId,
              historyForReattach
            ).length;
            if (imageCount === 0) {
              updateStreamedReply(POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE);
              await finalizeStreamedReply(sessionId);
              setGenerating(false);
              return;
            }
            const { ownerId, ownerName, ownerPhone } = resolveMemberOwnerProfile();
            if (!ownerId) {
              updateStreamedReply(
                "กรุณาเข้าสู่ระบบก่อนบันทึกประกาศครับ ลองรีเฟรชหน้าแล้วเข้าสู่ระบบอีกครั้งนะครับ"
              );
              await finalizeStreamedReply(sessionId);
              setGenerating(false);
              return;
            }
            updateStreamedReply(CHAT_MEMBER_SAVE_IN_PROGRESS_MESSAGE);
            await finalizeStreamedReply(sessionId);
            const saveResult = await saveMemberListingFromChat(
              buildMemberReattachSaveParams({
                sessionId,
                messages: historyForReattach,
                storageScopeKey,
                precheck: awaitingReattach,
                ownerId,
                ownerName,
                ownerPhone,
              })
            );
            if (!saveResult.ok) {
              updateStreamedReply(saveResult.message);
              await finalizeStreamedReply(sessionId);
              setGenerating(false);
              return;
            }
            await appendSavedMemberListingCardMessage(sessionId, {
              card: saveResult.savedCard,
            });
            clearPrecheckContext(sessionId);
            clearPendingChatDraftSnapshot();
            setGenerating(false);
            return;
          }

          if (
            !hasCoreFieldsComplete(
              activePrecheck?.fields ?? {},
              activePrecheck?.visionSummary
            ) &&
            pendingListingContext?.fields
          ) {
            bootstrapPrecheckFields(sessionId, pendingListingContext.fields);
          }
          if (!isPureConfirmMessage) {
            upsertPrecheckFromMessage(sessionId, trimmed);
          }

          const confirmPrecheck = getPrecheckContext(sessionId);
          const confirmFields = confirmPrecheck?.fields ?? {};
          const confirmVision = confirmPrecheck?.visionSummary;
          const missingCore = getMissingCoreFieldLabels(
            mergeEffectivePrecheckFields(confirmFields, confirmVision)
          );

          if (missingCore.length > 0) {
            setPrecheckStage(sessionId, "collecting_missing_fields");
            updateStreamedReply(buildMissingFieldsPrompt(missingCore));
            await finalizeStreamedReply(sessionId);
            setGenerating(false);
            return;
          }

          if (!isSignedIn) {
            const refCode = ensurePublicRefCode(sessionId);
            const rawAttachments = resolvePrecheckDraftAttachments();
            const {
              attachments: draftPreviewAttachments,
              thumbnailsPersisted,
              persistedPreviewCount,
            } = await persistAttachmentsForSnapshot(rawAttachments);
            const mergedConfirmFields = mergeEffectivePrecheckFields(
              confirmFields as ExtractedCarFields,
              confirmVision
            );
            savePendingChatDraftSnapshot({
              publicRefCode: refCode,
              fields: mergedConfirmFields,
              visionSummary: confirmVision,
              draftPreviewText: buildDraftCopyReadyReply(
                confirmFields as ExtractedCarFields,
                refCode,
                CHAT_CONFIRM_CREATE_DRAFT_ACTION,
                confirmVision,
                rawAttachments?.length ?? 0
              ),
              messages: serializeMessagesForSnapshot(
                useChatStore.getState().messages[sessionId] || []
              ),
              draftPreviewAttachments,
              imageCount: rawAttachments?.length ?? 0,
              thumbnailsPersisted,
              persistedPreviewCount,
              userAlreadyConfirmedCreateDraft: true,
            });
            guestConfirmAutoSaveLog("snapshot saved", {
              publicRefCode: refCode,
              userAlreadyConfirmedCreateDraft: true,
              imageCount: rawAttachments?.length ?? 0,
              thumbnailsPersisted,
              persistedPreviewCount,
            });
            saveGuestChatClaimPointer({
              guestStorageScopeKey: storageScopeKey,
              guestSessionId: sessionId,
              publicRefCode: refCode,
            });
            requireGuestLoginFromChat("chat");
            setGenerating(false);
            return;
          }

          setPrecheckStage(sessionId, "confirmed_create_draft");
          const saved = await saveDealerDraftFromFields({
            sessionId,
            fields: confirmFields as Record<string, unknown>,
          });

          if (memberConsumerSellerFlow && !saved.savedDraftId) {
            const refCode =
              confirmPrecheck?.publicRefCode ?? ensurePublicRefCode(sessionId);
            const draftAttachments = resolvePrecheckDraftAttachments();
            await appendMemberPendingListingCardMessage(sessionId, {
              fields: confirmFields as ExtractedCarFields,
              visionSummary: confirmVision,
              publicRefCode: refCode,
              draftPreviewText: buildDraftCopyReadyReply(
                confirmFields as ExtractedCarFields,
                refCode,
                CHAT_CONFIRM_CREATE_DRAFT_ACTION,
                confirmVision,
                draftAttachments?.length ?? 0
              ),
              attachments: draftAttachments,
            });
            clearPrecheckContext(sessionId);
            if (isSignedIn) {
              clearPendingChatDraftSnapshot();
            }
            setGenerating(false);
            return;
          }

          updateStreamedReply(saved.text);
          await finalizeStreamedReply(
            sessionId,
            undefined,
            undefined,
            undefined,
            undefined,
            saved.savedDraftId,
            attachmentsForSavedDealerDraft(
              saved.uploadedImageUrls,
              resolvePrecheckDraftAttachments()
            )
          );
          clearPrecheckContext(sessionId);
          if (saved.savedDraftId) {
            clearPendingChatDraftSnapshot();
          }
          setGenerating(false);
          return;
        }

        if (startCreateIntent) {
          upsertPrecheckFromMessage(sessionId, trimmed);
          if (hasImages) {
            markChatImageMessageForPendingListing(
              storageScopeKey,
              sessionId,
              userMsg.id
            );
            setPrecheckStage(sessionId, "analyzing_images");
            try {
              const first = imageAttachments[0];
              const imageBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result ?? ""));
                reader.onerror = () => reject(new Error("image-read-failed"));
                reader.readAsDataURL(first.optimizedFile);
              });
              const analysis = await aiVisionService.analyzeCarImage(imageBase64);
              const visionSummary: VisionObservationSummary = {
                brand: analysis.brand?.trim() || undefined,
                model: analysis.model?.trim() || undefined,
                color: analysis.color?.trim() || undefined,
                bodyType: analysis.bodyType?.trim() || undefined,
                condition: analysis.condition?.trim() || undefined,
              };
              setPrecheckVisionSummary(sessionId, visionSummary);
              upsertPrecheckFromMessage(
                sessionId,
                [visionSummary.brand, visionSummary.model, visionSummary.color]
                  .filter(Boolean)
                  .join(" ")
              );
            } catch (visionErr) {
              console.warn("[chat-precheck] vision analyze skipped:", visionErr);
            }
          }
        } else if (continuePrecheckIntent) {
          upsertPrecheckFromMessage(sessionId, trimmed);
        }

        const latestPrecheck = getPrecheckContext(sessionId);
        if (!latestPrecheck) {
          setGenerating(false);
          return;
        }

        const refCode = ensurePublicRefCode(sessionId);
        const missingCore = getMissingCoreFieldLabels(
          mergeEffectivePrecheckFields(
            latestPrecheck.fields,
            latestPrecheck.visionSummary
          )
        );
        const visionHints = buildKnownVisionHints(
          latestPrecheck.fields,
          latestPrecheck.visionSummary
        );
        const visionText = buildPrecheckVisionReply(latestPrecheck.visionSummary);
        const draftPreviewAttachments = resolvePrecheckDraftAttachments();
        const imageCount = draftPreviewAttachments?.length ?? 0;
        const alreadyAwaitingConfirm = isPrecheckAwaitingConfirm(
          latestPrecheck.stage
        );

        if (missingCore.length > 0) {
          setPrecheckStage(sessionId, "collecting_missing_fields");
          const askParts = [
            buildMissingFieldsPrompt(missingCore, visionHints),
          ];
          if (startCreateIntent && hasImages && visionText) {
            askParts.unshift(visionText, "");
          }
          updateStreamedReply(askParts.join("\n"));
          await finalizeStreamedReply(sessionId);
          setGenerating(false);
          return;
        }

        if (alreadyAwaitingConfirm && continuePrecheckIntent) {
          const refreshed = buildDraftCopyReadyReply(
            latestPrecheck.fields,
            refCode,
            CHAT_CONFIRM_CREATE_DRAFT_ACTION,
            latestPrecheck.visionSummary,
            imageCount
          );
          updateStreamedReply(refreshed);
          await finalizeStreamedReply(
            sessionId,
            undefined,
            undefined,
            true,
            latestPrecheck.fields,
            undefined,
            resolvePrecheckDraftAttachments()
          );
          setGenerating(false);
          return;
        }

        setPrecheckStage(sessionId, "draft_copy_ready");
        updateStreamedReply(
          buildDraftCopyReadyReply(
            latestPrecheck.fields,
            refCode,
            CHAT_CONFIRM_CREATE_DRAFT_ACTION,
            latestPrecheck.visionSummary,
            imageCount
          )
        );
        await finalizeStreamedReply(
          sessionId,
          undefined,
          undefined,
          true,
          latestPrecheck.fields,
          undefined,
          resolvePrecheckDraftAttachments()
        );
        setGenerating(false);
        return;
      }

      if (hasImages && latestSavedDraftId && !isListingCreateWithImages) {
        const draftImageBlock = resolveChatDealerDraftScopeBlockMessage({
          isSignedIn,
          chatScope,
          isDealer,
          isAdmin,
          user,
          role,
        });
        if (draftImageBlock) {
          updateStreamedReply(draftImageBlock);
          await finalizeStreamedReply(sessionId);
          setGenerating(false);
          return;
        }
        const draftDealerId = resolveDealerInventoryScopeId(user, role);
        if (!draftDealerId) {
          updateStreamedReply(
            "บัญชีนี้ยังไม่มี dealer scope สำหรับบันทึก draft ดีลเลอร์ครับ"
          );
          await finalizeStreamedReply(sessionId);
          setGenerating(false);
          return;
        }
        const apiRole = isAdmin ? "admin" : "dealer";
        const imagesForMessage = getChatImagesForMessage(
          storageScopeKey,
          sessionId,
          userMsg.id
        );
        try {
          await uploadChatImagesToDraft(
            imagesForMessage,
            latestSavedDraftId,
            draftDealerId,
            apiRole
          );
          const ack = buildSavedDraftImageAckReply(imageAttachments.length);
          updateStreamedReply(ack);
          await finalizeStreamedReply(
            sessionId,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            attachmentMeta
          );
        } catch (uploadErr) {
          console.error("[chat-image-attachment-v1-followup-upload]", {
            draftId: latestSavedDraftId,
            dealerId: draftDealerId,
            error:
              uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
          });
          updateStreamedReply(
            "รับรูปภาพรถแล้วครับ แต่เพิ่มเข้าไปในประกาศไม่สำเร็จ กรุณาลองส่งรูปอีกครั้งครับ"
          );
          await finalizeStreamedReply(sessionId);
        }
        setGenerating(false);
        return;
      }

      if (hasImages && pendingListingContext && !isListingCreateWithImages) {
        markChatImageMessageForPendingListing(
          storageScopeKey,
          sessionId,
          userMsg.id
        );
        const ack = buildPendingListingImageAckReply(
          imageAttachments.length,
          pendingListingContext
        );
        updateStreamedReply(ack);
        await finalizeStreamedReply(
          sessionId,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          attachmentMeta
        );
        setGenerating(false);
        return;
      }

      if (hasImages && !pendingListingContext && !isListingCreateWithImages) {
        const ack = buildNoListingImageAckReply(imageAttachments.length);
        updateStreamedReply(ack);
        await finalizeStreamedReply(
          sessionId,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          attachmentMeta
        );
        setGenerating(false);
        return;
      }

      const inventory = await fetchInventoryForChat();

      let dealerSavedImageUrls: string[] | undefined;

      let orchestrated = trimmed
        ? tryOrchestrateChatReply(trimmed, inventory, {
            attachedImageCount: hasImages ? imageAttachments.length : undefined,
            firebaseUid: user?.uid,
            displayName:
              (user as { displayName?: string; name?: string } | null)?.displayName ??
              (user as { name?: string } | null)?.name ??
              undefined,
            chatSessionId: sessionId,
          })
        : null;

      const pilotSessionContext = resolvePilotSessionContextForFollowUp(
        historyAfterUser,
        sessionId
      );
      const isFollowUpPilot = isPilotBuyerFollowUpMessage(trimmed);
      const shouldCallUserVisibleBridge =
        isSignedIn && (orchestrated?.skipGemini || (isFollowUpPilot && !orchestrated));

      if (shouldCallUserVisibleBridge) {
        const bridged = await applyChatUserVisibleServerBridge({
          userMessage: trimmed,
          attachedImageCount: hasImages ? imageAttachments.length : undefined,
          orchestratedText: orchestrated?.text ?? "",
          pilotSessionContext,
        });
        if (bridged?.userVisibleText?.trim()) {
          if (orchestrated) {
            if (
              shouldApplyBridgeUserVisibleText({
                userMessage: trimmed,
                orchestratedText: orchestrated.text,
                bridgedText: bridged.userVisibleText,
              })
            ) {
              orchestrated.text = bridged.userVisibleText;
            }
            // v22.58 — keep cards and text on the same canonical server set
            // v22.59 — never let image-less server cards overwrite complete local cards
            if (bridged.carCards && bridged.carCards.length > 0) {
              orchestrated.carCards = mergeChatCarCardsPreferImages(
                orchestrated.carCards,
                bridged.carCards
              );
            }
          } else if (isFollowUpPilot) {
            const fallbackCards = pilotSessionContext
              ? pilotSessionCardsToChatCarCards(pilotSessionContext.recentCarCards)
              : [];
            orchestrated = {
              text: bridged.userVisibleText,
              carCards:
                bridged.carCards && bridged.carCards.length > 0
                  ? mergeChatCarCardsPreferImages(fallbackCards, bridged.carCards)
                  : fallbackCards,
              skipGemini: true,
            };
          }
        }
      }

      if (
        isFollowUpPilot &&
        isSignedIn &&
        (!orchestrated || !orchestrated.text.trim())
      ) {
        orchestrated = {
          text: buildPilotFollowUpNoContextCopy(),
          carCards: [],
          skipGemini: true,
        };
      }

      const salesBrainUserRole = mapChatRoleToSalesBrainUserRole({
        role,
        isAdmin,
        isDealer,
      });
      const shadowFlowContext = {
        attachedImageCount: hasImages ? imageAttachments.length : undefined,
      };

      if (!orchestrated) {
        wireShadowChatPath({
          userMessage: trimmed,
          legacyUserVisibleResponse: "",
          userRole: salesBrainUserRole,
          flowContext: shadowFlowContext,
          source: "useChat.gemini_fallback",
          firebaseUid: user?.uid,
        });
      } else if (orchestrated.skipGemini) {
        wireShadowChatPath({
          userMessage: trimmed,
          legacyUserVisibleResponse: orchestrated.text,
          userRole: salesBrainUserRole,
          flowContext: shadowFlowContext,
          source: "useChat.orchestrated",
          shadowAlreadyEvaluated: true,
          firebaseUid: user?.uid,
        });
      }

      if (orchestrated?.skipGemini) {
        if (isSaveListingChatAction(trimmed)) {
          const lastDraftMsg = historyAfterUser
            .slice()
            .reverse()
            .find((m) => m.isDraftPreview && m.draftFields);
          if (lastDraftMsg?.draftFields) {
            const { payload, missing } = buildDealerDraftPayloadFromChat(
              lastDraftMsg.draftFields
            );
            const draftSaveBlock = resolveChatDealerDraftScopeBlockMessage({
              isSignedIn,
              chatScope,
              isDealer,
              isAdmin,
              user,
              role,
            });

            if (draftSaveBlock) {
              orchestrated.text = draftSaveBlock;
              if (!isSignedIn) {
                requireGuestLoginFromChat("chat");
              }
            } else {
              const draftDealerId = resolveDealerInventoryScopeId(user, role);
              if (!draftDealerId) {
                orchestrated.text =
                  "บัญชีนี้ยังไม่มี dealer scope สำหรับบันทึก draft ดีลเลอร์ครับ";
              } else {
              const apiRole = isAdmin ? "admin" : "dealer";
              const endpoint = "/api/dealer/drafts/new";

              logChatStorageDebug(chatScope, { draftDealerId });
              logChatDraftSave("request", {
                endpoint,
                method: "POST",
                dealerId: draftDealerId,
                userId: chatScope.userId,
                chatStorageKey: chatScope.storageKey,
                headers: {
                  "X-Dealer-Id": draftDealerId,
                  "X-User-Role": apiRole,
                  Authorization: "(Bearer redacted)",
                },
                payload,
              });

              try {
                const headers = await dealerAuthHeadersAsync(draftDealerId, apiRole);
                const res = await fetch(endpoint, {
                  method: "POST",
                  headers,
                  body: JSON.stringify(payload),
                });
                const responseText = await res.text();
                let result: {
                  data?: {
                    id?: string;
                    missingFields?: string[];
                    missingLabelsThai?: string[];
                  };
                  message?: string;
                  missing?: string[];
                } =
                  {};
                try {
                  result = JSON.parse(responseText) as typeof result;
                } catch {
                  result = { message: responseText.slice(0, 200) };
                }

                if (res.ok) {
                  const newDraftId = result.data?.id;
                  if (newDraftId) {
                    logDealerDraftEditUrl(newDraftId);
                  }
                  logChatDraftSave("response", {
                    status: res.status,
                    draftId: newDraftId,
                    dealerId: draftDealerId,
                  });
                  logChatStorageDebug(chatScope, {
                    draftDealerId,
                    latestDraftId: newDraftId ?? null,
                  });

                  let missingFields = [...(result.data?.missingFields ?? [])];
                  let uploadNote = "";
                  const sessionMessages =
                    useChatStore.getState().messages[sessionId] || [];
                  const imagesToUpload = newDraftId
                    ? collectChatImagesForDraft(
                        storageScopeKey,
                        sessionId,
                        sessionMessages
                      )
                    : [];

                  if (newDraftId && imagesToUpload.length > 0) {
                    try {
                      const uploadResult = await uploadChatImagesToDraft(
                        imagesToUpload,
                        newDraftId,
                        draftDealerId,
                        apiRole
                      );
                      dealerSavedImageUrls = uploadResult.storedUrls;
                      clearChatImagesForDraft(storageScopeKey, sessionId);
                      missingFields = resolveMissingFieldsAfterChatImageUpload(
                        missingFields,
                        uploadResult.storedUrls
                      );
                      uploadNote = buildDealerChatImageUploadNote(
                        imagesToUpload.length,
                        uploadResult
                      );
                    } catch (uploadErr) {
                      console.error("[chat-image-attachment-v1-upload]", {
                        draftId: newDraftId,
                        dealerId: draftDealerId,
                        error:
                          uploadErr instanceof Error
                            ? uploadErr.message
                            : String(uploadErr),
                      });
                      uploadNote = buildDealerChatImageUploadNote(
                        imagesToUpload.length,
                        {
                          storedUrls: [],
                          failed: imagesToUpload.map((item) => ({
                            name: item.metadata.originalFileName ?? item.metadata.name,
                            error: "upload failed",
                          })),
                        }
                      );
                    }
                  }

                  const missingLabels = getChatDraftSaveMissingLabels(missingFields);
                  const saveText =
                    missingLabels.length > 0
                      ? `บันทึกฉบับร่างแล้วครับ แต่ยังต้องเติมก่อนส่งเข้าตลาด:\n${missingLabels.map((item) => `- ${item}`).join("\n")}\n\nกรุณาเติมข้อมูลเหล่านี้ในหน้าประกาศที่ยังไม่ลงขายก่อนกดลงขายครับ${uploadNote}`
                      : `บันทึกประกาศสำเร็จเรียบร้อยแล้วครับ! กดปุ่ม “ดูประกาศที่บันทึกไว้” เพื่อเปิดรายการที่เพิ่งบันทึก หรือเข้าไปเพิ่มรูป แก้ไขข้อมูล และกดลงขายได้เลย\n\nถ้าต้องการนำเข้าสต๊อกแบบหน้าเว็บ ให้ไปที่เมนู “นำเข้าสต๊อก” (/dealer/import หรือ /admin/inventory-import) ได้ทันทีครับ ปังปุริเย่!${uploadNote}`;
                  orchestrated.text = saveText;
                  orchestrated.savedDraftId = newDraftId;
                  notifyDealerDraftSaved(newDraftId);
                } else {
                  logChatDraftSave("error", {
                    status: res.status,
                    statusText: res.statusText,
                    endpoint,
                    dealerId: draftDealerId,
                    body: result,
                    raw: responseText.slice(0, 500),
                  });
                  orchestrated.text =
                    "เกิดข้อผิดพลาดในการบันทึกประกาศครับ รบกวนลองใหม่อีกครั้ง";
                }
              } catch (e) {
                logChatDraftSave("error", {
                  endpoint,
                  dealerId: draftDealerId,
                  error: e instanceof Error ? e.message : String(e),
                });
                orchestrated.text =
                  "เกิดข้อผิดพลาดในการเชื่อมต่อระบบบันทึกประกาศครับ รบกวนลองใหม่อีกครั้ง";
              }
              }
            }
          } else {
            logChatDraftSave("error", {
              reason: "no-draft-preview-in-history",
              chatStorageKey: chatScope.storageKey,
              messageCount: historyAfterUser.length,
            });
            orchestrated.text =
              "ไม่พบข้อมูลรถที่กำลังจะลงขายครับ รบกวนพิมพ์รายละเอียดรถใหม่อีกครั้งนะครับ";
          }
        }

        if (orchestrated.isDraftPreview && hasImages) {
          markChatImageMessageForPendingListing(
            storageScopeKey,
            sessionId,
            userMsg.id
          );
        }

        updateStreamedReply(
          "",
          orchestrated.carCards,
          orchestrated.hasMoreCars,
          orchestrated.isDraftPreview,
          orchestrated.draftFields
        );
        let acc = "";
        for (const chunk of chunkTextForStream(orchestrated.text, 18)) {
          acc += chunk;
          updateStreamedReply(
            acc,
            orchestrated.carCards,
            orchestrated.hasMoreCars,
            orchestrated.isDraftPreview,
            orchestrated.draftFields
          );
          await new Promise((r) => setTimeout(r, 12));
        }
        await finalizeStreamedReply(
          sessionId,
          orchestrated.carCards,
          orchestrated.hasMoreCars,
          orchestrated.isDraftPreview,
          orchestrated.draftFields,
          orchestrated.savedDraftId,
          attachmentsForSavedDealerDraft(
            dealerSavedImageUrls,
            orchestrated.isDraftPreview && hasImages ? attachmentMeta : undefined
          )
        );
        setGenerating(false);
        return;
      }

      let accumulatedString = "";

      const { analyzeSentiment } = await import(
        "../../services/ai/moods/emotionalEngine"
      );
      const sentiment = analyzeSentiment(trimmed);
      const activePersonality = personalities[activePresetId];

      const { aiSkillService } = await import(
        "../../services/ai/skills/aiSkillService"
      );
      const { chainedPrompt } = await aiSkillService.evaluateAndChainSkills(
        trimmed,
        {
          userRole: (user as { role?: string })?.role || "client",
          sentiment,
          chatId: sessionId,
        }
      );

      const modifiedPersonality = {
        ...activePersonality,
        customSystemInstruction:
          (activePersonality?.customSystemInstruction || "") +
          (chainedPrompt || ""),
      };

      await aiService.streamChat(
        trimmed,
        historyAfterUser,
        {
          presetId: activePresetId,
          customInstructionOverrides: modifiedPersonality,
          sentiment,
          convoCount: historyAfterUser.length,
          userPreferences,
        },
        (chunk) => {
          accumulatedString += chunk;
          updateStreamedReply(accumulatedString);
        },
        async () => {
          await finalizeStreamedReply(sessionId);
          setGenerating(false);
        },
        async (err) => {
          console.error("AI Streaming error callback:", err);
          const errMsg = err?.message ?? "";
          const useMock =
            /gemini|api key|missing|401|403|invalid/i.test(errMsg) ||
            errMsg.includes("status code");

          if (useMock) {
            try {
              const mockReply = await fetchMockChatReply(trimmed);
              const mockOrchestrated = tryOrchestrateChatReply(trimmed, inventory);
              if (mockOrchestrated) {
                updateStreamedReply(
                  mockOrchestrated.text,
                  mockOrchestrated.carCards,
                  mockOrchestrated.hasMoreCars,
                  mockOrchestrated.isDraftPreview,
                  mockOrchestrated.draftFields
                );
                await finalizeStreamedReply(
                  sessionId,
                  mockOrchestrated.carCards,
                  mockOrchestrated.hasMoreCars,
                  mockOrchestrated.isDraftPreview,
                  mockOrchestrated.draftFields
                );
              } else {
                updateStreamedReply(mockReply);
                await finalizeStreamedReply(sessionId);
              }
              setGenerating(false);
              return;
            } catch (mockErr) {
              console.warn("Mock chat fallback failed:", mockErr);
            }
          }

          setGenerating(false);
          updateStreamedReply("", []);

          await addMessage(
            sessionId,
            "ai",
            "ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งครับ"
          );
        }
      );
      } catch (chatSendErr) {
        console.error("[chat] sendMessage failed:", chatSendErr);
        setGenerating(false);
        updateStreamedReply("", []);
        try {
          await addMessage(
            sessionId,
            "ai",
            "ขออภัยครับ ระบบตอบไม่สำเร็จชั่วคราว กรุณาลองใหม่อีกครั้งครับ"
          );
        } catch {
          // ignore secondary persistence failure
        }
      }
    },
    [
      activeSessionId,
      activePresetId,
      personalities,
      isGenerating,
      messages,
      userPreferences,
      user,
      chatScope,
      storageScopeKey,
      isDealer,
      isAdmin,
      isSignedIn,
      role,
      addMessage,
      createSession,
      setGenerating,
      updateStreamedReply,
      finalizeStreamedReply,
      saveDealerDraftFromFields,
    ]
  );

  const createNewChat = useCallback(
    async (title?: string) => {
      return await createSession(chatScope, title);
    },
    [chatScope, createSession]
  );

  const removeChat = useCallback(
    async (sessionId: string) => {
      await deleteSession(chatScope, sessionId);
    },
    [chatScope, deleteSession]
  );

  const switchChatSession = useCallback(async (sessionId: string) => {
    const state = useChatStore.getState();
    const exists = state.sessions.some((s) => s.id === sessionId);
    if (!exists) return;
    await selectSession(chatScope, sessionId);
  }, [chatScope, selectSession]);

  const chatActor = useMemo(
    () => resolveChatActorDisplay(user, chatScope),
    [user, chatScope]
  );

  const startBuyerLeadFromCar = useCallback(
    async (car: ChatCarCardData) => {
      let sessionId = activeSessionId;
      if (!sessionId) {
        try {
          sessionId = await createSession(chatScope, "ปรึกษาซื้อขาย");
        } catch {
          return;
        }
      }
      const { reply, isBuyerLeadProfileReuse } =
        await handleBuyerLeadCaptureFromCarCard({
          sessionId,
          car,
          buyerUserId: user?.uid,
        });
      await addMessage(
        sessionId,
        "ai",
        reply,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        isBuyerLeadProfileReuse ? { isBuyerLeadProfileReuse: true } : undefined
      );
    },
    [activeSessionId, chatScope, createSession, addMessage, user?.uid]
  );

  const submitBuyerLeadConsent = useCallback(
    async (contactPhone: string): Promise<{ ok: boolean; message?: string }> => {
      const sessionId =
        useBuyerLeadCaptureStore.getState().consentModalSessionId ?? activeSessionId;
      if (!sessionId) {
        return { ok: false, message: "ไม่พบบทสนทนาที่ใช้งาน" };
      }
      const result = await submitBuyerLeadFromModal({
        sessionId,
        contactPhone,
        isSignedIn,
        buyerUserId: user?.uid,
      });
      if (result.ok === true) {
        useBuyerLeadCaptureStore.getState().closeConsentModal();
        try {
          await addMessage(sessionId, "ai", result.reply);
          return { ok: true };
        } catch {
          return {
            ok: false,
            message:
              "บันทึกข้อมูลแล้ว แต่แสดงผลในแชทไม่สำเร็จ กรุณารีเฟรชหน้าแล้วตรวจสอบคิวอีกครั้ง",
          };
        }
      }
      const failed = result;
      if (failed.requireLogin) {
        requireGuestLoginFromChat("chat");
      }
      return { ok: false, message: failed.message };
    },
    [activeSessionId, isSignedIn, user?.uid, addMessage]
  );

  return {
    sessions,
    activeSessionId,
    activeSession: sessions.find((s) => s.id === activeSessionId) || null,
    currentMessages: activeSessionId ? messages[activeSessionId] || [] : [],
    chatScope,
    chatActor,
    isGenerating,
    streamedReply,
    streamedCarCards,
    streamedHasMoreCars,
    userPreferences,
    isAnalyzingMemory,
    activePresetId,
    personalities,
    isLoadingPersonalities,
    setPresetId: setPresetWithServerSync,
    updatePersonalityInstruction,
    initializeChat,
    sendMessage,
    createNewChat,
    removeChat,
    selectSession: switchChatSession,
    editMessage,
    startBuyerLeadFromCar,
    submitBuyerLeadConsent,
  };
}
