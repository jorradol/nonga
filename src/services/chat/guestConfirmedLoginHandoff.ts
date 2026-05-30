import type { ChatStorageScope } from "../../utils/chatStorageScope";
import { guestConfirmAutoSaveLog } from "../../utils/guestConfirmAutoSaveDebug";
import {
  readGuestChatClaimPointer,
} from "../../utils/chatGuestClaim";
import {
  hasPendingChatDraftSnapshotInStorage,
  readPendingChatDraftSnapshot,
} from "../../utils/chatPendingDraftSnapshot";
import { useChatStore } from "../../stores/chat/chatStore";
import {
  applyClaimedGuestSessionToChatStore,
  rehydrateClaimedGuestChatImageStore,
  shouldSkipSnapshotRestoreAfterClaim,
  tryClaimGuestChatAfterLogin,
} from "./claimGuestChatAfterLogin";
import {
  clearChatImageAttachmentScope,
  countChatImageAttachmentsInSession,
  migrateChatImageAttachmentScope,
} from "../../features/chat-image-attachment-v1/chatImageAttachmentStore";
import {
  tryContinueGuestConfirmedMemberListingSave,
  type ContinueGuestConfirmedSaveDeps,
  type ContinueGuestConfirmedSaveResult,
} from "./continueGuestConfirmedMemberListingSave";

let handoffInFlight = false;

export function resetGuestConfirmedLoginHandoffStateForTest(): void {
  handoffInFlight = false;
}

export function hasGuestConfirmedPendingHandoff(): boolean {
  const snap = readPendingChatDraftSnapshot();
  if (snap.ok && snap.snapshot.userAlreadyConfirmedCreateDraft) return true;
  const pointer = readGuestChatClaimPointer();
  return pointer?.status === "pending";
}

export type GuestConfirmedLoginHandoffResult =
  | { kind: "skipped"; reason: string }
  | { kind: "in_flight" }
  | {
      kind: "completed";
      sessionId: string;
      autoSave: ContinueGuestConfirmedSaveResult;
    };

export async function tryRunGuestConfirmedLoginHandoff(params: {
  memberScope: ChatStorageScope;
  storageScopeKey: string;
  isMemberConsumerSeller: boolean;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  previousGuestScopeKey?: string | null;
  autoSaveDeps?: ContinueGuestConfirmedSaveDeps;
}): Promise<GuestConfirmedLoginHandoffResult> {
  const snapRead = readPendingChatDraftSnapshot();
  const pointer = readGuestChatClaimPointer();

  guestConfirmAutoSaveLog("after login: state", {
    snapshotExists: snapRead.ok || hasPendingChatDraftSnapshotInStorage(),
    userAlreadyConfirmedCreateDraft: snapRead.ok
      ? snapRead.snapshot.userAlreadyConfirmedCreateDraft
      : false,
    snapshotImageCount: snapRead.ok ? snapRead.snapshot.imageCount : 0,
    publicRefCode: snapRead.ok ? snapRead.snapshot.publicRefCode : pointer?.publicRefCode,
    claimPointerStatus: pointer?.status ?? null,
    storageScopeKey: params.storageScopeKey,
    isMemberConsumerSeller: params.isMemberConsumerSeller,
    ownerIdPresent: Boolean(params.ownerId.trim()),
  });

  const hasConfirmed =
    (snapRead.ok && snapRead.snapshot.userAlreadyConfirmedCreateDraft) ||
    pointer?.status === "pending";

  if (!hasConfirmed) {
    return { kind: "skipped", reason: "no_confirmed_handoff" };
  }

  if (!params.isMemberConsumerSeller) {
    return { kind: "skipped", reason: "not_member_flow" };
  }

  if (!params.ownerId.trim()) {
    return { kind: "skipped", reason: "no_owner" };
  }

  const sessionId =
    pointer?.guestSessionId?.trim() ||
    useChatStore.getState().activeSessionId ||
    "";
  if (!sessionId) {
    return { kind: "skipped", reason: "no_session" };
  }

  if (handoffInFlight) {
    return { kind: "in_flight" };
  }

  handoffInFlight = true;
  try {
    const guestScopeKey =
      pointer?.guestStorageScopeKey?.trim() ||
      params.previousGuestScopeKey?.trim() ||
      null;

    let claimApplied = shouldSkipSnapshotRestoreAfterClaim(params.storageScopeKey);

    if (!claimApplied && guestScopeKey && guestScopeKey !== params.storageScopeKey) {
      const guestUserId = guestScopeKey.replace(/^user:/, "");
      const chatState = useChatStore.getState();
      const claimResult = await tryClaimGuestChatAfterLogin({
        previousGuestScopeKey: guestScopeKey,
        memberScope: params.memberScope,
        guestScope: {
          storageKey: guestScopeKey,
          userId: guestUserId,
          dealerId: null,
          mode: "consumer",
        },
        inMemory: {
          sessions: chatState.sessions,
          messages: chatState.messages,
          activeSessionId: chatState.activeSessionId,
        },
        isMemberConsumerSeller: params.isMemberConsumerSeller,
      });

      if (claimResult.claimed === false) {
        guestConfirmAutoSaveLog("claim result", {
          claimed: false,
          reason: claimResult.reason,
          sessionId,
        });
      } else {
        guestConfirmAutoSaveLog("claim result", {
          claimed: true,
          sessionId: claimResult.sessionId,
        });
      }

      if (claimResult.claimed) {
        await applyClaimedGuestSessionToChatStore(
          params.memberScope,
          claimResult.sessionId,
          claimResult.messages
        );
        claimApplied = true;
      }
    } else {
      guestConfirmAutoSaveLog("claim result", {
        skipped: true,
        alreadyClaimed: claimApplied,
      });
    }

    const effectiveSessionId =
      pointer?.guestSessionId?.trim() ||
      useChatStore.getState().activeSessionId ||
      sessionId;

    if (
      guestScopeKey &&
      guestScopeKey !== params.storageScopeKey &&
      effectiveSessionId
    ) {
      const guestCountBefore = countChatImageAttachmentsInSession(
        guestScopeKey,
        effectiveSessionId
      );
      const memberCountBefore = countChatImageAttachmentsInSession(
        params.storageScopeKey,
        effectiveSessionId
      );
      const migrateResult = migrateChatImageAttachmentScope({
        fromStorageScopeKey: guestScopeKey,
        toStorageScopeKey: params.storageScopeKey,
        sessionId: effectiveSessionId,
      });
      const memberCountAfter = countChatImageAttachmentsInSession(
        params.storageScopeKey,
        effectiveSessionId
      );

      guestConfirmAutoSaveLog("image migrate", {
        guestScopeKey,
        memberScopeKey: params.storageScopeKey,
        guestCountBefore,
        memberCountBefore,
        memberCountAfter,
        migratedFileCount: migrateResult.migratedFileCount,
        migratedPendingIds: migrateResult.migratedPendingIds,
      });

      if (
        migrateResult.migratedFileCount > 0 ||
        migrateResult.migratedPendingIds > 0 ||
        claimApplied
      ) {
        clearChatImageAttachmentScope(guestScopeKey);
        guestConfirmAutoSaveLog("snapshot clear", {
          reason: "guest_image_scope_after_migrate",
          guestScopeKey,
        });
      }
    }

    const messages =
      useChatStore.getState().messages[effectiveSessionId] ?? [];

    const rehydrateResult = await rehydrateClaimedGuestChatImageStore({
      memberStorageScopeKey: params.storageScopeKey,
      sessionId: effectiveSessionId,
      messages,
    });
    guestConfirmAutoSaveLog("rehydrate", rehydrateResult);

    const resolvedFileCount = countChatImageAttachmentsInSession(
      params.storageScopeKey,
      effectiveSessionId
    );
    guestConfirmAutoSaveLog("before auto-save", {
      sessionId: effectiveSessionId,
      publicRefCode: snapRead.ok ? snapRead.snapshot.publicRefCode : pointer?.publicRefCode,
      imageCountExpected: snapRead.ok ? snapRead.snapshot.imageCount : 0,
      resolvedFileCount,
    });

    const autoSave = await tryContinueGuestConfirmedMemberListingSave({
      storageScopeKey: params.storageScopeKey,
      sessionId: effectiveSessionId,
      messages,
      ownerId: params.ownerId,
      ownerName: params.ownerName,
      ownerPhone: params.ownerPhone,
    }, params.autoSaveDeps);

    guestConfirmAutoSaveLog("auto-save result", autoSave);

    return {
      kind: "completed",
      sessionId: effectiveSessionId,
      autoSave,
    };
  } finally {
    handoffInFlight = false;
  }
}

export function shouldDeferGuestImageScopeClear(params: {
  guestScopeKey: string | null | undefined;
  memberScopeKey: string;
}): boolean {
  if (!params.guestScopeKey?.startsWith("user:guest-")) return false;
  if (params.guestScopeKey === params.memberScopeKey) return false;
  return hasGuestConfirmedPendingHandoff();
}

export function buildGuestScopeForHandoff(guestScopeKey: string): ChatStorageScope {
  const userId = guestScopeKey.replace(/^user:/, "");
  return {
    storageKey: guestScopeKey,
    userId,
    dealerId: null,
    mode: "consumer",
  };
}

export function isGuestStorageScopeKey(storageKey: string): boolean {
  return storageKey.startsWith("user:guest-");
}
