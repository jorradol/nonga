import { resolveDealerIdFromUser } from "./dealerIdentity";

export type ChatStorageScope = {
  /** Scoped id for localStorage / Firestore partition */
  storageKey: string;
  dealerId: string | null;
  userId: string;
  mode: "dealer" | "consumer";
};

export const GUEST_FALLBACK_UID = "guest-user-100";

/** @deprecated Legacy key — cleared on guest bootstrap; no longer used for scope identity */
const ANONYMOUS_CHAT_SCOPE_SESSION_KEY = "nonga_anonymous_chat_scope_id";

/** One ephemeral guest id per full page load (refresh gets a clean chat). */
let ephemeralAnonymousGuestUserId: string | null = null;

export function isAnonymousChatVisitor(
  user: { uid?: string; role?: string } | null | undefined
): boolean {
  const uid = user?.uid?.trim();
  if (!uid) return true;
  const role = (user?.role ?? "guest").toLowerCase();
  return uid === GUEST_FALLBACK_UID && role === "guest";
}

export function isEphemeralGuestChatScope(
  scope: Pick<ChatStorageScope, "userId" | "mode"> | null | undefined
): boolean {
  if (!scope || scope.mode !== "consumer") return false;
  return scope.userId.startsWith("guest-");
}

function createEphemeralAnonymousGuestUserId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `guest-${crypto.randomUUID()}`
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function resolveAnonymousChatUserId(): string {
  if (!ephemeralAnonymousGuestUserId) {
    prepareEphemeralGuestChatVisit();
  }
  return ephemeralAnonymousGuestUserId ?? GUEST_FALLBACK_UID;
}

/** Remove stale guest localStorage from older builds; does not touch member/dealer keys. */
export function pruneStaleGuestChatLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  try {
    for (const key of Object.keys(localStorage)) {
      if (
        key.startsWith("nong-a-chat-sessions:user:guest-") ||
        key.startsWith("nong-a-chat-messages:user:guest-") ||
        key.startsWith("nong-a-chat-prefs:user:guest-")
      ) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore quota / private mode
  }
}

let guestVisitPrepared = false;

/** Test-only: simulate a new browser visit for guest chat. */
export function resetEphemeralGuestVisitForTest(): void {
  guestVisitPrepared = false;
  ephemeralAnonymousGuestUserId = null;
}

/** Fresh guest chat on each full page load — no cross-visit history in sidebar. */
export function prepareEphemeralGuestChatVisit(): void {
  if (guestVisitPrepared) return;
  guestVisitPrepared = true;
  ephemeralAnonymousGuestUserId = createEphemeralAnonymousGuestUserId();
  if (typeof window === "undefined") return;
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(ANONYMOUS_CHAT_SCOPE_SESSION_KEY);
    } catch {
      // ignore
    }
  }
  pruneStaleGuestChatLocalStorage();
}

export function resolveChatUserId(
  user: { uid?: string; role?: string } | null | undefined
): string {
  if (isAnonymousChatVisitor(user)) {
    return resolveAnonymousChatUserId();
  }
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
  if (scope.userId.startsWith("guest-") && scope.userId !== GUEST_FALLBACK_UID) {
    return {
      title: "ผู้เยี่ยมชม",
      subtitle: "คุยหาน้องเอได้เลย — บันทึกประกาศต้องเข้าสู่ระบบ",
      dealerId: null,
    };
  }
  return {
    title: user?.displayName?.trim() || "สมาชิกทั่วไป",
    subtitle: "ค้นหารถและปรึกษาน้องเอได้ — บันทึกประกาศดีลเลอร์ต้องมีสิทธิ์เต็นท์",
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
