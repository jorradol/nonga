import type { ChatMessage, ChatMessageAttachment } from "../../types";
import type {
  PendingChatImageAttachment,
  StoredChatImageAttachment,
} from "./types";

export type { StoredChatImageAttachment };

const filesByScope = new Map<
  string,
  Map<string, Map<string, StoredChatImageAttachment[]>>
>();
const pendingListingImageIdsBySession = new Map<string, Set<string>>();

function scopeSessionKey(storageScopeKey: string, sessionId: string): string {
  return `${storageScopeKey}::${sessionId}`;
}

function sessionMap(storageScopeKey: string, sessionId: string) {
  let scope = filesByScope.get(storageScopeKey);
  if (!scope) {
    scope = new Map();
    filesByScope.set(storageScopeKey, scope);
  }

  let session = scope.get(sessionId);
  if (!session) {
    session = new Map();
    scope.set(sessionId, session);
  }
  return session;
}

function attachmentToMessageMeta(
  attachment: PendingChatImageAttachment,
  sortOrder: number
): ChatMessageAttachment {
  return {
    id: attachment.id,
    kind: "image",
    name: attachment.originalFileName,
    fileName: attachment.fileName,
    originalFileName: attachment.originalFileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    width: attachment.width,
    height: attachment.height,
    previewUrl: attachment.previewUrl,
    sortOrder,
    source: "chat-image-attachment-v1",
  };
}

export function toChatImageMessageAttachments(
  pending: PendingChatImageAttachment[]
): ChatMessageAttachment[] {
  return pending.map(attachmentToMessageMeta);
}

export function registerChatImageMessageFiles(
  storageScopeKey: string,
  sessionId: string,
  messageId: string,
  pending: PendingChatImageAttachment[],
  metadata: ChatMessageAttachment[]
): void {
  if (pending.length === 0) return;
  const byMessage = sessionMap(storageScopeKey, sessionId);
  byMessage.set(
    messageId,
    pending.map((item, index) => ({
      id: item.id,
      messageId,
      sessionId,
      file: item.optimizedFile,
      metadata: metadata[index] ?? attachmentToMessageMeta(item, index),
    }))
  );
}

export function collectChatImagesForDraft(
  storageScopeKey: string,
  sessionId: string,
  messages: ChatMessage[]
): StoredChatImageAttachment[] {
  const session = filesByScope.get(storageScopeKey)?.get(sessionId);
  if (!session) return [];
  const pendingIds = pendingListingImageIdsBySession.get(
    scopeSessionKey(storageScopeKey, sessionId)
  );
  if (!pendingIds || pendingIds.size === 0) return [];

  const seen = new Set<string>();
  const output: StoredChatImageAttachment[] = [];

  for (const message of messages) {
    if (message.sender !== "user") continue;
    if (!message.attachments?.some((a) => a.kind === "image")) continue;

    const stored = session.get(message.id) ?? [];
    for (const item of stored) {
      if (!pendingIds.has(item.id)) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      output.push(item);
    }
  }

  return output;
}

export function getChatImagesForMessage(
  storageScopeKey: string,
  sessionId: string,
  messageId: string
): StoredChatImageAttachment[] {
  return (
    filesByScope.get(storageScopeKey)?.get(sessionId)?.get(messageId) ?? []
  );
}

export function markChatImageMessageForPendingListing(
  storageScopeKey: string,
  sessionId: string,
  messageId: string
): void {
  const stored = getChatImagesForMessage(storageScopeKey, sessionId, messageId);
  if (stored.length === 0) return;
  const key = scopeSessionKey(storageScopeKey, sessionId);
  const ids = pendingListingImageIdsBySession.get(key) ?? new Set<string>();
  for (const item of stored) {
    ids.add(item.id);
  }
  pendingListingImageIdsBySession.set(key, ids);
}

export function clearChatImagesForDraft(
  storageScopeKey: string,
  sessionId: string
): void {
  const session = filesByScope.get(storageScopeKey)?.get(sessionId);
  const pendingIds = pendingListingImageIdsBySession.get(
    scopeSessionKey(storageScopeKey, sessionId)
  );

  if (session && pendingIds) {
    for (const [messageId, items] of session.entries()) {
      const remaining = items.filter((item) => !pendingIds.has(item.id));
      if (remaining.length > 0) {
        session.set(messageId, remaining);
      } else {
        session.delete(messageId);
      }
    }
  }

  pendingListingImageIdsBySession.delete(scopeSessionKey(storageScopeKey, sessionId));
}

export function clearChatImageAttachmentScope(storageScopeKey: string): void {
  filesByScope.delete(storageScopeKey);
  for (const key of [...pendingListingImageIdsBySession.keys()]) {
    if (key.startsWith(`${storageScopeKey}::`)) {
      pendingListingImageIdsBySession.delete(key);
    }
  }
}
