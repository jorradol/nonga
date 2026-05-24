import { resolveDealerIdFromUser } from "./dealerIdentity";

export type ChatStorageScope = {
  /** Scoped id for localStorage / Firestore partition */
  storageKey: string;
  dealerId: string | null;
  userId: string;
  mode: "dealer" | "consumer";
};

const GUEST_FALLBACK_UID = "guest-user-100";

export function resolveChatUserId(
  user: { uid?: string } | null | undefined
): string {
  const uid = user?.uid?.trim();
  return uid && uid.length > 0 ? uid : GUEST_FALLBACK_UID;
}

function isDealerChatMode(user: {
  dealerId?: string;
  role?: string;
} | null | undefined): boolean {
  const role = user?.role ?? "guest";
  if (role === "dealer" || role === "admin" || role === "superadmin") return true;
  return !!user?.dealerId?.trim();
}

/** Partition key for chat sessions/messages — never use a global shared key */
export function getChatStorageScope(
  user: {
    uid?: string;
    dealerId?: string;
    role?: string;
  } | null | undefined
): ChatStorageScope {
  const userId = resolveChatUserId(user);

  if (isDealerChatMode(user)) {
    const dealerId = resolveDealerIdFromUser(user);
    return {
      storageKey: `dealer:${dealerId}:${userId}`,
      dealerId,
      userId,
      mode: "dealer",
    };
  }

  return {
    storageKey: `user:${userId}`,
    dealerId: null,
    userId,
    mode: "consumer",
  };
}

export function chatSessionsLocalKey(storageKey: string): string {
  return `nong-a-chat-sessions:${storageKey}`;
}

export function chatMessagesLocalKey(storageKey: string): string {
  return `nong-a-chat-messages:${storageKey}`;
}

export function chatPrefsLocalKey(storageKey: string): string {
  return `nong-a-chat-prefs:${storageKey}`;
}

/** Dev-only console diagnostics — not shown in UI */
export function resolveChatActorDisplay(
  user: {
    displayName?: string;
    showroomName?: string;
    dealerProfile?: { showroomName?: string; ownerName?: string };
  } | null | undefined,
  scope: ChatStorageScope
): { title: string; subtitle: string; dealerId: string | null } {
  if (scope.mode === "dealer" && scope.dealerId) {
    const name =
      user?.showroomName?.trim() ||
      user?.dealerProfile?.showroomName?.trim() ||
      user?.dealerProfile?.ownerName?.trim() ||
      user?.displayName?.trim() ||
      scope.dealerId;
    return {
      title: name,
      subtitle: scope.dealerId,
      dealerId: scope.dealerId,
    };
  }
  return {
    title: user?.displayName?.trim() || "ผู้ใช้ทั่วไป",
    subtitle: scope.userId,
    dealerId: null,
  };
}

export function logChatStorageDebug(
  scope: ChatStorageScope,
  extra?: { draftDealerId?: string | null; latestDraftId?: string | null }
): void {
  try {
    const env = (import.meta as { env?: { DEV?: boolean } }).env;
    if (!env?.DEV) return;
    console.debug("[NongA Chat scope]", {
      currentDealerId: scope.dealerId,
      currentUserId: scope.userId,
      chatStorageScope: scope.storageKey,
      sessionsLocalKey: chatSessionsLocalKey(scope.storageKey),
      draftDealerId:
        extra?.draftDealerId !== undefined
          ? extra.draftDealerId
          : scope.dealerId,
      latestDraftId: extra?.latestDraftId ?? null,
    });
  } catch {
    // ignore
  }
}
