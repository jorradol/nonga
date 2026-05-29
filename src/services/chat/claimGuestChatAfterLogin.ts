import type { ChatMessage, ChatSession } from "../../types";
import type { ChatStorageScope } from "../../utils/chatStorageScope";
import { isEphemeralGuestChatScope } from "../../utils/chatStorageScope";
import {
  isGuestChatClaimCompleteForMember,
  isGuestChatClaimPendingForScope,
  markGuestChatClaimComplete,
  readGuestChatClaimPointer,
  type GuestChatClaimPointer,
} from "../../utils/chatGuestClaim";
import { chatRestoreLog } from "../../utils/chatRestoreDebug";
import {
  loadChatMessages,
  mergeClaimedGuestSessionIntoMember,
  readChatHistorySnapshot,
} from "./chatHistoryService";
import { useChatStore } from "../../stores/chat/chatStore";
import {
  collectAllChatImageFilesForMemberListing,
  countChatImageAttachmentsInSession,
  recoverChatImagesFromMessageHistory,
  registerSnapshotAttachmentsForDraftSave,
} from "../../features/chat-image-attachment-v1/chatImageAttachmentStore";
import { readPendingChatDraftSnapshot } from "../../utils/chatPendingDraftSnapshot";

export type GuestClaimInMemoryState = {
  sessions: ChatSession[];
  messages: Record<string, ChatMessage[]>;
  activeSessionId: string | null;
};

export type GuestClaimResult =
  | {
      claimed: true;
      sessionId: string;
      messages: ChatMessage[];
    }
  | { claimed: false; reason: string };

function isGuestScopeKey(storageKey: string): boolean {
  return storageKey.startsWith("user:guest-");
}

function pickGuestSession(
  pointer: GuestChatClaimPointer,
  inMemory: GuestClaimInMemoryState,
  guestScope: ChatStorageScope
): { session: ChatSession; messages: ChatMessage[] } | null {
  const sessionId = pointer.guestSessionId;
  const fromMemory = inMemory.sessions.find((session) => session.id === sessionId);
  const ephemeral = readChatHistorySnapshot(guestScope);
  const fromEphemeral = ephemeral.sessions.find((session) => session.id === sessionId);

  const session = fromMemory ?? fromEphemeral ?? inMemory.sessions[0] ?? ephemeral.sessions[0];
  if (!session) return null;

  const memoryMessages = inMemory.messages[session.id] ?? [];
  const ephemeralMessages = ephemeral.messages[session.id] ?? [];
  const messages =
    memoryMessages.length >= ephemeralMessages.length
      ? memoryMessages
      : ephemeralMessages;

  return { session, messages };
}

/**
 * Claim ห้องแชท guest ล่าสุดไป member scope ครั้งเดียว (idempotent).
 * เรียกก่อน resetChatState / clear guest scope.
 */
export async function tryClaimGuestChatAfterLogin(params: {
  previousGuestScopeKey: string | null;
  memberScope: ChatStorageScope;
  guestScope: ChatStorageScope;
  inMemory: GuestClaimInMemoryState;
  isMemberConsumerSeller: boolean;
}): Promise<GuestClaimResult> {
  const pointer = readGuestChatClaimPointer();
  chatRestoreLog("tryClaimGuestChatAfterLogin: enter", {
    pointer,
    previousGuestScopeKey: params.previousGuestScopeKey,
    memberScopeKey: params.memberScope.storageKey,
    isMemberConsumerSeller: params.isMemberConsumerSeller,
  });

  if (!params.isMemberConsumerSeller) {
    return { claimed: false, reason: "not_member_consumer" };
  }

  if (!params.previousGuestScopeKey || !isGuestScopeKey(params.previousGuestScopeKey)) {
    return { claimed: false, reason: "no_previous_guest_scope" };
  }

  if (!pointer) {
    return { claimed: false, reason: "no_claim_pointer" };
  }

  if (pointer.guestStorageScopeKey !== params.previousGuestScopeKey) {
    return { claimed: false, reason: "pointer_scope_mismatch" };
  }

  if (
    isGuestChatClaimCompleteForMember(
      params.memberScope.storageKey,
      pointer.guestSessionId
    )
  ) {
    chatRestoreLog("tryClaimGuestChatAfterLogin: already claimed", {
      sessionId: pointer.guestSessionId,
    });
    const memoryMessages = params.inMemory.messages[pointer.guestSessionId] ?? [];
    const messages =
      memoryMessages.length > 0
        ? memoryMessages
        : await loadChatMessages(params.memberScope, pointer.guestSessionId);
    return {
      claimed: true,
      sessionId: pointer.guestSessionId,
      messages,
    };
  }

  if (pointer.status !== "pending" && !isGuestChatClaimPendingForScope(params.previousGuestScopeKey)) {
    return { claimed: false, reason: "claim_not_pending" };
  }

  if (!isEphemeralGuestChatScope(params.guestScope)) {
    return { claimed: false, reason: "not_ephemeral_guest" };
  }

  const bundle = pickGuestSession(pointer, params.inMemory, params.guestScope);
  if (!bundle) {
    chatRestoreLog("tryClaimGuestChatAfterLogin: empty bundle", { pointer });
    return { claimed: false, reason: "empty_guest_bundle" };
  }

  mergeClaimedGuestSessionIntoMember({
    memberScope: params.memberScope,
    guestSession: bundle.session,
    guestMessages: bundle.messages,
  });

  markGuestChatClaimComplete(params.memberScope, bundle.session.id);

  chatRestoreLog("tryClaimGuestChatAfterLogin: success", {
    sessionId: bundle.session.id,
    messageCount: bundle.messages.length,
  });

  return {
    claimed: true,
    sessionId: bundle.session.id,
    messages: bundle.messages,
  };
}

/** หลัง loadSessions — เปิดห้องเดิมและใส่ messages ใน memory (รักษา preview ชั่วคราว) */
export async function applyClaimedGuestSessionToChatStore(
  memberScope: ChatStorageScope,
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  const store = useChatStore.getState();
  await store.selectSession(memberScope, sessionId);
  useChatStore.setState((state) => ({
    messages: {
      ...state.messages,
      [sessionId]: messages,
    },
    activeSessionId: sessionId,
  }));
}

export function shouldSkipSnapshotRestoreAfterClaim(memberScopeKey: string): boolean {
  const pointer = readGuestChatClaimPointer();
  if (pointer?.status !== "claimed") return false;
  return pointer.memberStorageScopeKey === memberScopeKey;
}

function findImageAnchorMessage(messages: ChatMessage[]): ChatMessage | undefined {
  return (
    messages.find(
      (m) =>
        m.sender === "user" && m.attachments?.some((a) => a.kind === "image")
    ) ?? messages.find((m) => m.sender === "user")
  );
}

function collectExpectedImageAttachmentIds(messages: ChatMessage[]): Set<string> {
  const expected = new Set<string>();
  for (const message of messages) {
    for (const att of message.attachments ?? []) {
      if (att.kind === "image") expected.add(att.id);
    }
  }
  return expected;
}

export type RehydrateClaimedGuestChatImageStoreResult = {
  memoryCount: number;
  fromSnapshot: number;
  fromMessages: number;
  skippedBecauseMemoryComplete: boolean;
};

/**
 * Step B — เติม image store หลัง claim (snapshot เป็น fallback เมื่อ memory migrate ไม่ครบ)
 */
export async function rehydrateClaimedGuestChatImageStore(params: {
  memberStorageScopeKey: string;
  sessionId: string;
  messages: ChatMessage[];
}): Promise<RehydrateClaimedGuestChatImageStoreResult> {
  const storedBefore = collectAllChatImageFilesForMemberListing(
    params.memberStorageScopeKey,
    params.sessionId,
    params.messages
  );
  const storedIds = new Set(storedBefore.map((item) => item.id));
  const expectedIds = collectExpectedImageAttachmentIds(params.messages);
  const missingExpectedIds = [...expectedIds].filter((id) => !storedIds.has(id));

  if (expectedIds.size > 0 && missingExpectedIds.length === 0) {
    chatRestoreLog("rehydrateClaimedGuestChatImages: memory complete", {
      memoryCount: storedBefore.length,
    });
    return {
      memoryCount: storedBefore.length,
      fromSnapshot: 0,
      fromMessages: 0,
      skippedBecauseMemoryComplete: true,
    };
  }

  let fromSnapshot = 0;
  const snap = readPendingChatDraftSnapshot();
  if (snap.ok) {
    const persistable =
      snap.snapshot.draftPreviewAttachments?.filter(
        (att) =>
          att.kind === "image" &&
          att.previewDataUrl?.startsWith("data:") &&
          !storedIds.has(att.id)
      ) ?? [];
    if (persistable.length > 0) {
      const anchor = findImageAnchorMessage(params.messages);
      if (anchor) {
        fromSnapshot = await registerSnapshotAttachmentsForDraftSave(
          params.memberStorageScopeKey,
          params.sessionId,
          anchor.id,
          persistable
        );
        for (const att of persistable) {
          storedIds.add(att.id);
        }
      }
    }
  }

  const fromMessages = await recoverChatImagesFromMessageHistory(
    params.memberStorageScopeKey,
    params.sessionId,
    params.messages
  );

  const memoryCount = countChatImageAttachmentsInSession(
    params.memberStorageScopeKey,
    params.sessionId
  );

  chatRestoreLog("rehydrateClaimedGuestChatImages: done", {
    memoryCount,
    fromSnapshot,
    fromMessages,
    expectedCount: expectedIds.size,
  });

  return {
    memoryCount,
    fromSnapshot,
    fromMessages,
    skippedBecauseMemoryComplete: false,
  };
}
