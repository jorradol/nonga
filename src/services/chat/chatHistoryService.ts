import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db, isMockConfig } from "../../lib/firebase";
import type {
  ChatMessage,
  ChatMessageAttachment,
  ChatSession,
} from "../../types";
import type { ChatStorageScope } from "../../utils/chatStorageScope";
import {
  chatMessagesLocalKey,
  chatSessionsLocalKey,
} from "../../utils/chatStorageScope";
import { normalizePendingListingCardData } from "./chatMemberPendingListing";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ChatHistoryScope = {
  storageKey: string;
  uid: string;
  dealerId: string | null;
  scope: "user" | "dealer";
};

export type ChatMessageInput = Omit<ChatMessage, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

export type ChatHistorySnapshot = {
  sessions: ChatSession[];
  messages: Record<string, ChatMessage[]>;
};

const CHAT_SESSIONS_COLLECTION = "chatSessions";
const LEGACY_CHATS_COLLECTION = "chats";
const ACTIVE_STATUS: ChatSession["status"] = "active";

let storageForTest: StorageLike | null = null;

const ephemeralGuestSnapshots = new Map<string, ChatHistorySnapshot>();

export function isEphemeralGuestHistoryScope(scope: ChatHistoryScope): boolean {
  return scope.scope === "user" && scope.uid.startsWith("guest-");
}

export function resetEphemeralGuestChatMemory(): void {
  ephemeralGuestSnapshots.clear();
}

function emptySnapshot(): ChatHistorySnapshot {
  return { sessions: [], messages: {} };
}

function randomId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `${prefix}-${suffix}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getLocalStorage(): StorageLike | null {
  if (storageForTest) return storageForTest;
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

function shouldUseLocalStorage(): boolean {
  return isMockConfig || !db || !getLocalStorage();
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toPreview(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 120);
}

function stripTransientAttachmentFields(
  attachment: ChatMessageAttachment
): ChatMessageAttachment {
  const { previewUrl, previewDataUrl, ...rest } = attachment;
  return rest;
}

export function sanitizeChatMessageForStorage(message: ChatMessage): ChatMessage {
  const pendingListingCard = normalizePendingListingCardData(
    message.pendingListingCard
  );
  const savedMemberListingCard = message.savedMemberListingCard;
  const next: ChatMessage = {
    ...message,
    ...(message.attachments && message.attachments.length > 0
      ? { attachments: message.attachments.map(stripTransientAttachmentFields) }
      : {}),
  };
  if (pendingListingCard) {
    next.isPendingListingCard = true;
    next.pendingListingCard = pendingListingCard;
  } else {
    delete next.isPendingListingCard;
    delete next.pendingListingCard;
  }
  if (savedMemberListingCard) {
    next.isSavedMemberListingCard = true;
    next.savedMemberListingCard = savedMemberListingCard;
  }
  return next;
}

export function chatStorageScopeToHistoryScope(
  scope: ChatStorageScope
): ChatHistoryScope {
  return {
    storageKey: scope.storageKey,
    uid: scope.userId,
    dealerId: scope.dealerId,
    scope: scope.mode === "dealer" ? "dealer" : "user",
  };
}

export function sessionMatchesScope(
  session: ChatSession,
  scope: ChatHistoryScope
): boolean {
  if (session.storageScopeKey && session.storageScopeKey !== scope.storageKey) {
    return false;
  }
  if (session.scope && session.scope !== scope.scope) return false;
  if (session.uid && session.uid !== scope.uid) return false;
  if (scope.scope === "dealer") {
    return session.dealerId === scope.dealerId || session.userId === scope.storageKey;
  }
  return session.dealerId == null && session.userId === scope.storageKey;
}

function normalizeSession(
  raw: Partial<ChatSession> & Record<string, unknown>,
  scope: ChatHistoryScope
): ChatSession {
  const id = String(raw.sessionId ?? raw.id ?? randomId("chat"));
  const createdAt = String(raw.createdAt ?? nowIso());
  const updatedAt = String(raw.updatedAt ?? createdAt);
  return {
    id,
    sessionId: id,
    userId: String(raw.userId ?? raw.storageScopeKey ?? scope.storageKey),
    uid: String(raw.uid ?? scope.uid),
    dealerId:
      raw.dealerId === undefined || raw.dealerId === null
        ? scope.dealerId
        : String(raw.dealerId),
    scope: raw.scope === "dealer" ? "dealer" : scope.scope,
    storageScopeKey: String(raw.storageScopeKey ?? scope.storageKey),
    title: String(raw.title ?? "บทสนทนาไร้ชื่อ"),
    createdAt,
    updatedAt,
    lastMessagePreview:
      typeof raw.lastMessagePreview === "string" ? raw.lastMessagePreview : undefined,
    savedDraftId: typeof raw.savedDraftId === "string" ? raw.savedDraftId : undefined,
    status: raw.status === "archived" ? "archived" : ACTIVE_STATUS,
  };
}

function normalizeMessage(
  raw: Partial<ChatMessage> & Record<string, unknown>
): ChatMessage {
  return {
    id: String(raw.messageId ?? raw.id ?? randomId("msg")),
    sender:
      raw.sender === "user" ||
      raw.sender === "assistant" ||
      raw.sender === "system" ||
      raw.sender === "ai-analysis"
        ? raw.sender
        : "ai",
    text: String(raw.text ?? ""),
    createdAt: String(raw.createdAt ?? nowIso()),
    ...(Array.isArray(raw.carCards) && raw.carCards.length > 0
      ? { carCards: raw.carCards as ChatMessage["carCards"] }
      : {}),
    ...(raw.hasMoreCars ? { hasMoreCars: Boolean(raw.hasMoreCars) } : {}),
    ...(raw.isDraftPreview ? { isDraftPreview: Boolean(raw.isDraftPreview) } : {}),
    ...(raw.draftFields ? { draftFields: raw.draftFields } : {}),
    ...(typeof raw.savedDraftId === "string" ? { savedDraftId: raw.savedDraftId } : {}),
    ...(typeof raw.savedMemberListingId === "string"
      ? { savedMemberListingId: raw.savedMemberListingId }
      : {}),
    ...(() => {
      const pendingListingCard = normalizePendingListingCardData(
        raw.pendingListingCard as ChatMessage["pendingListingCard"]
      );
      return pendingListingCard
        ? {
            isPendingListingCard: true,
            pendingListingCard,
          }
        : {};
    })(),
    ...(raw.isSavedMemberListingCard && raw.savedMemberListingCard
      ? {
          isSavedMemberListingCard: true,
          savedMemberListingCard:
            raw.savedMemberListingCard as ChatMessage["savedMemberListingCard"],
        }
      : {}),
    ...(Array.isArray(raw.attachments) && raw.attachments.length > 0
      ? { attachments: raw.attachments as ChatMessageAttachment[] }
      : {}),
  };
}

function readLocalSnapshot(scope: ChatHistoryScope): ChatHistorySnapshot {
  if (isEphemeralGuestHistoryScope(scope)) {
    return ephemeralGuestSnapshots.get(scope.storageKey) ?? emptySnapshot();
  }
  const storage = getLocalStorage();
  if (!storage) return emptySnapshot();
  const sessions = safeJsonParse<ChatSession[]>(
    storage.getItem(chatSessionsLocalKey(scope.storageKey)),
    []
  )
    .map((session) =>
      normalizeSession(session as Partial<ChatSession> & Record<string, unknown>, scope)
    )
    .filter((session) => sessionMatchesScope(session, scope))
    .sort((a, b) =>
      String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt))
    );
  const rawMessages = safeJsonParse<Record<string, ChatMessage[]>>(
    storage.getItem(chatMessagesLocalKey(scope.storageKey)),
    {}
  );
  const messages: Record<string, ChatMessage[]> = {};
  for (const session of sessions) {
    messages[session.id] = (rawMessages[session.id] ?? [])
      .map((message) =>
        normalizeMessage(message as Partial<ChatMessage> & Record<string, unknown>)
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return { sessions, messages };
}

function writeLocalSnapshot(
  scope: ChatHistoryScope,
  snapshot: ChatHistorySnapshot
): void {
  if (isEphemeralGuestHistoryScope(scope)) {
    ephemeralGuestSnapshots.set(scope.storageKey, snapshot);
    return;
  }
  const storage = getLocalStorage();
  if (!storage) return;
  const safeMessages: Record<string, ChatMessage[]> = {};
  for (const [sessionId, messages] of Object.entries(snapshot.messages)) {
    safeMessages[sessionId] = messages.map(sanitizeChatMessageForStorage);
  }
  storage.setItem(chatSessionsLocalKey(scope.storageKey), JSON.stringify(snapshot.sessions));
  storage.setItem(chatMessagesLocalKey(scope.storageKey), JSON.stringify(safeMessages));
}

function appendLocalMessage(
  scope: ChatHistoryScope,
  sessionId: string,
  message: ChatMessage,
  patch: Partial<ChatSession>
): void {
  const snapshot = readLocalSnapshot(scope);
  const session = snapshot.sessions.find((item) => item.id === sessionId);
  if (session && !sessionMatchesScope(session, scope)) {
    throw new Error("chat_session_scope_mismatch");
  }
  const fallbackSession: ChatSession = {
    id: sessionId,
    sessionId,
    userId: scope.storageKey,
    uid: scope.uid,
    dealerId: scope.dealerId,
    scope: scope.scope,
    storageScopeKey: scope.storageKey,
    title: "ปรึกษาซื้อขาย",
    createdAt: message.createdAt,
    updatedAt: message.createdAt,
    lastMessagePreview: "",
    status: ACTIVE_STATUS,
  };
  const baseSessions = session ? snapshot.sessions : [fallbackSession, ...snapshot.sessions];
  const sessions = baseSessions
    .map((item) => (item.id === sessionId ? { ...item, ...patch } : item))
    .sort((a, b) =>
      String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt))
    );
  writeLocalSnapshot(scope, {
    sessions,
    messages: {
      ...snapshot.messages,
      [sessionId]: [...(snapshot.messages[sessionId] ?? []), message],
    },
  });
}

function sessionToFirestoreData(session: ChatSession) {
  return {
    sessionId: session.id,
    uid: session.uid,
    dealerId: session.dealerId ?? null,
    scope: session.scope ?? "user",
    storageScopeKey: session.storageScopeKey ?? session.userId,
    userId: session.userId,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt ?? session.createdAt,
    lastMessagePreview: session.lastMessagePreview ?? "",
    savedDraftId: session.savedDraftId ?? null,
    status: session.status ?? ACTIVE_STATUS,
  };
}

function messageToFirestoreData(message: ChatMessage) {
  const safe = sanitizeChatMessageForStorage(message);
  return {
    messageId: safe.id,
    sender: safe.sender,
    text: safe.text,
    createdAt: safe.createdAt,
    ...(safe.carCards && safe.carCards.length > 0 ? { carCards: safe.carCards } : {}),
    ...(safe.hasMoreCars ? { hasMoreCars: safe.hasMoreCars } : {}),
    ...(safe.isDraftPreview ? { isDraftPreview: safe.isDraftPreview } : {}),
    ...(safe.draftFields ? { draftFields: safe.draftFields } : {}),
    ...(safe.savedDraftId ? { savedDraftId: safe.savedDraftId } : {}),
    ...(safe.savedMemberListingId
      ? { savedMemberListingId: safe.savedMemberListingId }
      : {}),
    ...(safe.isPendingListingCard && safe.pendingListingCard
      ? {
          isPendingListingCard: true,
          pendingListingCard: safe.pendingListingCard,
        }
      : {}),
    ...(safe.isSavedMemberListingCard && safe.savedMemberListingCard
      ? {
          isSavedMemberListingCard: true,
          savedMemberListingCard: safe.savedMemberListingCard,
        }
      : {}),
    ...(safe.attachments && safe.attachments.length > 0
      ? { attachments: safe.attachments }
      : {}),
  };
}

async function loadFirestoreSessions(scope: ChatHistoryScope): Promise<ChatSession[]> {
  const sessionsQuery = query(
    collection(db, CHAT_SESSIONS_COLLECTION),
    where("storageScopeKey", "==", scope.storageKey)
  );
  const snap = await getDocs(sessionsQuery);
  const sessions = snap.docs
    .map((docSnap) => normalizeSession({ id: docSnap.id, ...docSnap.data() }, scope))
    .filter((session) => sessionMatchesScope(session, scope));

  if (sessions.length > 0) {
    return sessions.sort((a, b) =>
      String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt))
    );
  }

  // Read-only compatibility with the old Firestore collection used before Step 2L.
  const legacyQuery = query(
    collection(db, LEGACY_CHATS_COLLECTION),
    where("userId", "==", scope.storageKey)
  );
  const legacySnap = await getDocs(legacyQuery);
  return legacySnap.docs
    .map((docSnap) =>
      normalizeSession(
        {
          id: docSnap.id,
          ...docSnap.data(),
          storageScopeKey: scope.storageKey,
          uid: scope.uid,
          dealerId: scope.dealerId,
          scope: scope.scope,
          status: ACTIVE_STATUS,
        },
        scope
      )
    )
    .filter((session) => sessionMatchesScope(session, scope))
    .sort((a, b) =>
      String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt))
    );
}

export async function loadChatSessions(
  scopeInput: ChatStorageScope | ChatHistoryScope
): Promise<ChatSession[]> {
  const scope =
    "mode" in scopeInput ? chatStorageScopeToHistoryScope(scopeInput) : scopeInput;
  if (isEphemeralGuestHistoryScope(scope)) {
    return readLocalSnapshot(scope).sessions;
  }
  if (shouldUseLocalStorage()) return readLocalSnapshot(scope).sessions;
  const localSessions = readLocalSnapshot(scope).sessions;
  try {
    const firestoreSessions = await loadFirestoreSessions(scope);
    return firestoreSessions.length > 0 ? firestoreSessions : localSessions;
  } catch (err) {
    console.warn("[chat-history] Firestore session read failed; using local history", err);
    return localSessions;
  }
}

export async function loadChatMessages(
  scopeInput: ChatStorageScope | ChatHistoryScope,
  sessionId: string
): Promise<ChatMessage[]> {
  const scope =
    "mode" in scopeInput ? chatStorageScopeToHistoryScope(scopeInput) : scopeInput;
  const localSnapshot = readLocalSnapshot(scope);
  const localSession = localSnapshot.sessions.find((session) => session.id === sessionId);
  if (isEphemeralGuestHistoryScope(scope) || shouldUseLocalStorage()) {
    return localSession ? localSnapshot.messages[sessionId] ?? [] : [];
  }

  try {
    const session = (await loadFirestoreSessions(scope)).find((item) => item.id === sessionId);
    if (!session || !sessionMatchesScope(session, scope)) return [];

    const msgQuery = query(
      collection(db, CHAT_SESSIONS_COLLECTION, sessionId, "messages"),
      orderBy("createdAt", "asc")
    );
    const msgSnap = await getDocs(msgQuery);
    if (msgSnap.docs.length > 0) {
      return msgSnap.docs.map((docSnap) =>
        normalizeMessage({ id: docSnap.id, ...docSnap.data() })
      );
    }

    const legacyQuery = query(
      collection(db, LEGACY_CHATS_COLLECTION, sessionId, "messages"),
      orderBy("createdAt", "asc")
    );
    const legacySnap = await getDocs(legacyQuery);
    const legacyMessages = legacySnap.docs.map((docSnap) =>
      normalizeMessage({ id: docSnap.id, ...docSnap.data() })
    );
    return legacyMessages.length > 0
      ? legacyMessages
      : localSession
        ? localSnapshot.messages[sessionId] ?? []
        : [];
  } catch (err) {
    console.warn("[chat-history] Firestore message read failed; using local history", err);
    return localSession ? localSnapshot.messages[sessionId] ?? [] : [];
  }
}

export async function createChatSession(
  scopeInput: ChatStorageScope | ChatHistoryScope,
  title?: string
): Promise<ChatSession> {
  const scope =
    "mode" in scopeInput ? chatStorageScopeToHistoryScope(scopeInput) : scopeInput;
  const createdAt = nowIso();
  const id = randomId("chat");
  const session: ChatSession = {
    id,
    sessionId: id,
    userId: scope.storageKey,
    uid: scope.uid,
    dealerId: scope.dealerId,
    scope: scope.scope,
    storageScopeKey: scope.storageKey,
    title: title || "ปรึกษาซื้อขาย",
    createdAt,
    updatedAt: createdAt,
    lastMessagePreview: "",
    status: ACTIVE_STATUS,
  };

  const mirrorLocalSession = () => {
    const snapshot = readLocalSnapshot(scope);
    if (snapshot.sessions.some((item) => item.id === id)) return;
    writeLocalSnapshot(scope, {
      sessions: [session, ...snapshot.sessions],
      messages: { ...snapshot.messages, [id]: snapshot.messages[id] ?? [] },
    });
  };

  if (isEphemeralGuestHistoryScope(scope)) {
    mirrorLocalSession();
  } else if (shouldUseLocalStorage()) {
    mirrorLocalSession();
  } else {
    try {
      await setDoc(doc(db, CHAT_SESSIONS_COLLECTION, id), sessionToFirestoreData(session));
      mirrorLocalSession();
    } catch (err) {
      console.warn("[chat-history] Firestore session write failed; using local history", err);
      mirrorLocalSession();
    }
  }

  return session;
}

export async function appendChatMessage(
  scopeInput: ChatStorageScope | ChatHistoryScope,
  sessionId: string,
  input: ChatMessageInput
): Promise<ChatMessage> {
  const scope =
    "mode" in scopeInput ? chatStorageScopeToHistoryScope(scopeInput) : scopeInput;
  const message: ChatMessage = {
    id: input.id ?? randomId("msg"),
    sender: input.sender,
    text: input.text,
    createdAt: input.createdAt ?? nowIso(),
    ...(input.carCards && input.carCards.length > 0 ? { carCards: input.carCards } : {}),
    ...(input.hasMoreCars ? { hasMoreCars: input.hasMoreCars } : {}),
    ...(input.isDraftPreview ? { isDraftPreview: input.isDraftPreview } : {}),
    ...(input.draftFields ? { draftFields: input.draftFields } : {}),
    ...(input.savedDraftId ? { savedDraftId: input.savedDraftId } : {}),
    ...(input.savedMemberListingId
      ? { savedMemberListingId: input.savedMemberListingId }
      : {}),
    ...(input.isPendingListingCard && input.pendingListingCard
      ? {
          isPendingListingCard: true,
          pendingListingCard: input.pendingListingCard,
        }
      : {}),
    ...(input.isSavedMemberListingCard && input.savedMemberListingCard
      ? {
          isSavedMemberListingCard: true,
          savedMemberListingCard: input.savedMemberListingCard,
        }
      : {}),
    ...(input.attachments && input.attachments.length > 0
      ? { attachments: input.attachments }
      : {}),
  };
  const updatedAt = message.createdAt;
  const patch: Partial<ChatSession> = {
    updatedAt,
    lastMessagePreview: toPreview(message.text),
    ...(message.savedDraftId ? { savedDraftId: message.savedDraftId } : {}),
    ...(message.savedMemberListingId
      ? { savedMemberListingId: message.savedMemberListingId }
      : {}),
  };

  if (isEphemeralGuestHistoryScope(scope) || shouldUseLocalStorage()) {
    appendLocalMessage(scope, sessionId, message, patch);
  } else {
    try {
      await setDoc(
        doc(db, CHAT_SESSIONS_COLLECTION, sessionId, "messages", message.id),
        messageToFirestoreData(message)
      );
      await setDoc(
        doc(db, CHAT_SESSIONS_COLLECTION, sessionId),
        {
          ...patch,
          ...(message.savedDraftId ? { savedDraftId: message.savedDraftId } : {}),
    ...(message.savedMemberListingId
      ? { savedMemberListingId: message.savedMemberListingId }
      : {}),
        },
        { merge: true }
      );
      appendLocalMessage(scope, sessionId, message, patch);
    } catch (err) {
      console.warn("[chat-history] Firestore message write failed; using local history", err);
      appendLocalMessage(scope, sessionId, message, patch);
    }
  }

  return message;
}

export async function updateChatSessionMetadata(
  scopeInput: ChatStorageScope | ChatHistoryScope,
  sessionId: string,
  patch: Partial<Pick<ChatSession, "title" | "savedDraftId" | "lastMessagePreview">>
): Promise<void> {
  const scope =
    "mode" in scopeInput ? chatStorageScopeToHistoryScope(scopeInput) : scopeInput;
  const updatedAt = nowIso();

  if (isEphemeralGuestHistoryScope(scope) || shouldUseLocalStorage()) {
    const snapshot = readLocalSnapshot(scope);
    writeLocalSnapshot(scope, {
      ...snapshot,
      sessions: snapshot.sessions.map((item) =>
        item.id === sessionId ? { ...item, ...patch, updatedAt } : item
      ),
    });
  } else {
    await setDoc(
      doc(db, CHAT_SESSIONS_COLLECTION, sessionId),
      { ...patch, updatedAt },
      { merge: true }
    );
  }
}

export async function updateChatMessageText(
  scopeInput: ChatStorageScope | ChatHistoryScope,
  sessionId: string,
  messageId: string,
  text: string
): Promise<void> {
  const scope =
    "mode" in scopeInput ? chatStorageScopeToHistoryScope(scopeInput) : scopeInput;

  if (isEphemeralGuestHistoryScope(scope) || shouldUseLocalStorage()) {
    const snapshot = readLocalSnapshot(scope);
    writeLocalSnapshot(scope, {
      ...snapshot,
      messages: {
        ...snapshot.messages,
        [sessionId]: (snapshot.messages[sessionId] ?? []).map((item) =>
          item.id === messageId ? { ...item, text } : item
        ),
      },
    });
  } else {
    await setDoc(
      doc(db, CHAT_SESSIONS_COLLECTION, sessionId, "messages", messageId),
      { text },
      { merge: true }
    );
  }
}

export async function deleteChatSession(
  scopeInput: ChatStorageScope | ChatHistoryScope,
  sessionId: string
): Promise<void> {
  const scope =
    "mode" in scopeInput ? chatStorageScopeToHistoryScope(scopeInput) : scopeInput;
  if (isEphemeralGuestHistoryScope(scope) || shouldUseLocalStorage()) {
    const snapshot = readLocalSnapshot(scope);
    const nextMessages = { ...snapshot.messages };
    delete nextMessages[sessionId];
    writeLocalSnapshot(scope, {
      sessions: snapshot.sessions.filter((item) => item.id !== sessionId),
      messages: nextMessages,
    });
  } else {
    await deleteDoc(doc(db, CHAT_SESSIONS_COLLECTION, sessionId));
  }
}

export function setChatHistoryStorageForTest(storage: StorageLike | null): void {
  storageForTest = storage;
}
