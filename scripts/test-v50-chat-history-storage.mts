import {
  appendChatMessage,
  createChatSession,
  loadChatMessages,
  loadChatSessions,
  setChatHistoryStorageForTest,
} from "../src/services/chat/chatHistoryService.ts";
import { useChatStore } from "../src/stores/chat/chatStore.ts";
import type { ChatStorageScope } from "../src/utils/chatStorageScope.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function createMemoryStorage(): Storage {
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

const dealerAScope: ChatStorageScope = {
  storageKey: "dealer:dealer-a:uid-dealer-a",
  dealerId: "dealer-a",
  userId: "uid-dealer-a",
  mode: "dealer",
};

const dealerBScope: ChatStorageScope = {
  storageKey: "dealer:dealer-b:uid-dealer-b",
  dealerId: "dealer-b",
  userId: "uid-dealer-b",
  mode: "dealer",
};

const memberScope: ChatStorageScope = {
  storageKey: "user:uid-member-a",
  dealerId: null,
  userId: "uid-member-a",
  mode: "consumer",
};

console.log("=== Nong A v5.0 Chat History Storage Smoke ===");

const storage = createMemoryStorage();
setChatHistoryStorageForTest(storage);

const dealerASession = await createChatSession(dealerAScope, "Dealer A first chat");
const dealerASecond = await createChatSession(dealerAScope, "Dealer A second chat");
const dealerBSession = await createChatSession(dealerBScope, "Dealer B private chat");
const memberSession = await createChatSession(memberScope, "Member chat");

assert(dealerASession.dealerId === "dealer-a", "dealer A session should carry dealerId");
assert(dealerASession.uid === "uid-dealer-a", "dealer A session should carry uid");
assert(dealerASession.scope === "dealer", "dealer A session should use dealer scope");
console.log("PASS create session scoped by dealerId");

await appendChatMessage(dealerAScope, dealerASession.id, {
  sender: "user",
  text: "ขอสร้างประกาศ Toyota",
  attachments: [
    {
      id: "att-1",
      kind: "image",
      name: "front.jpg",
      originalFileName: "front.jpg",
      fileName: "front.webp",
      mimeType: "image/webp",
      size: 12345,
      width: 1024,
      height: 768,
      previewUrl: "blob:local-only",
      storagePath: "chat-attachments/dealer-a/session/front.webp",
      dealerId: "dealer-a",
      draftId: "draft-a",
    },
  ],
});
await appendChatMessage(dealerAScope, dealerASession.id, {
  sender: "assistant",
  text: "บันทึกประกาศสำเร็จครับ",
  savedDraftId: "draft-a",
});
await appendChatMessage(dealerAScope, dealerASecond.id, {
  sender: "user",
  text: "หารถอีกคัน",
});
await appendChatMessage(dealerBScope, dealerBSession.id, {
  sender: "user",
  text: "dealer B secret",
});
await appendChatMessage(memberScope, memberSession.id, {
  sender: "user",
  text: "member private",
});
console.log("PASS append user/assistant messages");

const dealerASessions = await loadChatSessions(dealerAScope);
assert(dealerASessions.length === 2, "dealer A should see only two dealer A sessions");
assert(
  dealerASessions.every((session) => session.dealerId === "dealer-a"),
  "dealer A sessions should not include another dealer"
);
const memberSessions = await loadChatSessions(memberScope);
assert(memberSessions.length === 1 && memberSessions[0].scope === "user", "member should see own user chat only");
console.log("PASS load sessions returns only current dealer/user scope");

const dealerBCrossLoad = await loadChatMessages(dealerAScope, dealerBSession.id);
assert(dealerBCrossLoad.length === 0, "dealer A must not load dealer B messages");
console.log("PASS dealer A cannot load dealer B session");

const dealerAMessages = await loadChatMessages(dealerAScope, dealerASession.id);
assert(dealerAMessages.length === 2, "dealer A messages should load");
assert(dealerAMessages[0].attachments?.[0]?.kind === "image", "attachment metadata should persist");
assert(
  !("previewUrl" in dealerAMessages[0].attachments![0]),
  "transient previewUrl should not persist"
);
assert(
  dealerAMessages[0].attachments?.[0]?.storagePath?.includes("dealer-a"),
  "attachment storagePath metadata should persist"
);
assert(dealerAMessages[1].savedDraftId === "draft-a", "savedDraftId should persist on message");
const dealerASessionAfterSave = (await loadChatSessions(dealerAScope)).find(
  (session) => session.id === dealerASession.id
);
assert(dealerASessionAfterSave?.savedDraftId === "draft-a", "savedDraftId should persist on session");
console.log("PASS message attachments metadata and savedDraftId persist");

useChatStore.getState().resetChatState();
await useChatStore.getState().loadSessions(dealerAScope);
const initiallyActive = useChatStore.getState().activeSessionId;
assert(initiallyActive !== null, "store should set an active session after load");
await useChatStore.getState().selectSession(dealerAScope, dealerASession.id);
const state = useChatStore.getState();
assert(state.activeSessionId === dealerASession.id, "switching should update activeSessionId");
assert(
  state.messages[dealerASession.id]?.some((message) => message.text.includes("Toyota")),
  "switching should load selected session messages"
);
console.log("PASS switching session changes activeSessionId and messages");

setChatHistoryStorageForTest(null);
useChatStore.getState().resetChatState();
console.log("PASS local/mock mode works with scoped localStorage");
