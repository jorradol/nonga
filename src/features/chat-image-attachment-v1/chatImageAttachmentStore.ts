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

/**
 * รวมไฟล์รูปทุกข้อความใน session สำหรับ member save
 * (ไม่กรอง pendingIds — ตรงกับ draft preview ที่ผู้ใช้เห็น)
 */
export function collectAllChatImageFilesForMemberListing(
  storageScopeKey: string,
  sessionId: string,
  messages: ChatMessage[]
): StoredChatImageAttachment[] {
  markSessionImagesForPendingListing(storageScopeKey, sessionId, messages);

  const session = filesByScope.get(storageScopeKey)?.get(sessionId);
  if (!session) return [];

  const seen = new Set<string>();
  const output: StoredChatImageAttachment[] = [];

  for (const message of messages) {
    if (message.sender !== "user") continue;
    const stored = session.get(message.id) ?? [];
    for (const item of stored) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      output.push(item);
    }
  }

  return output.sort(
    (a, b) => (a.metadata.sortOrder ?? 0) - (b.metadata.sortOrder ?? 0)
  );
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

/** ผูกรูปจากข้อความผู้ใช้ทุกข้อความใน session กับ draft ที่กำลังเตรียม */
export function markSessionImagesForPendingListing(
  storageScopeKey: string,
  sessionId: string,
  messages: ChatMessage[]
): void {
  for (const message of messages) {
    if (message.sender !== "user") continue;
    if (!message.attachments?.some((a) => a.kind === "image")) continue;
    markChatImageMessageForPendingListing(storageScopeKey, sessionId, message.id);
  }
}

export function collectPendingListingAttachmentMeta(
  storageScopeKey: string,
  sessionId: string,
  messages: ChatMessage[]
): ChatMessageAttachment[] {
  return collectChatImagesForDraft(storageScopeKey, sessionId, messages)
    .map((item) => item.metadata)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function findStoredImageByAttachmentId(
  storageScopeKey: string,
  sessionId: string,
  attachmentId: string
): StoredChatImageAttachment | undefined {
  const session = filesByScope.get(storageScopeKey)?.get(sessionId);
  if (!session) return undefined;
  for (const items of session.values()) {
    const hit = items.find((item) => item.id === attachmentId);
    if (hit) return hit;
  }
  return undefined;
}

async function dataUrlToFile(
  dataUrl: string,
  fileName: string,
  mimeType?: string
): Promise<File | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, {
      type: mimeType || blob.type || "image/jpeg",
    });
  } catch {
    return null;
  }
}

/** กู้ไฟล์จาก previewDataUrl ในประวัติแชท (หลัง login / หลัง strip blob) */
export async function recoverChatImagesFromMessageHistory(
  storageScopeKey: string,
  sessionId: string,
  messages: ChatMessage[]
): Promise<number> {
  let total = 0;
  for (const message of messages) {
    if (message.sender !== "user") continue;
    const recoverable =
      message.attachments?.filter(
        (a) => a.kind === "image" && a.previewDataUrl?.startsWith("data:")
      ) ?? [];
    if (recoverable.length === 0) continue;
    total += await registerSnapshotAttachmentsForDraftSave(
      storageScopeKey,
      sessionId,
      message.id,
      recoverable
    );
  }
  return total;
}

/** Map snapshot attachments → display-ready (previewUrl จาก previewDataUrl สำหรับ <img src>) */
export function prepareSnapshotImageAttachmentsForDisplay(
  attachments: ChatMessageAttachment[] | undefined
): ChatMessageAttachment[] {
  if (!attachments?.length) return [];
  return attachments
    .filter((att) => att.kind === "image")
    .map((att, index) => {
      const previewUrl =
        att.previewUrl ??
        (att.previewDataUrl?.startsWith("data:") ? att.previewDataUrl : undefined) ??
        att.thumbnailUrl ??
        att.imageUrl;
      return {
        ...att,
        sortOrder: att.sortOrder ?? index,
        ...(previewUrl ? { previewUrl } : {}),
        ...(att.previewDataUrl ? { previewDataUrl: att.previewDataUrl } : {}),
      };
    });
}

export function countSnapshotAttachmentsWithDisplayablePreview(
  attachments: ChatMessageAttachment[] | undefined
): number {
  return prepareSnapshotImageAttachmentsForDisplay(attachments).filter(
    (att) => Boolean(att.previewUrl || att.previewDataUrl)
  ).length;
}

/** กู้ไฟล์จาก previewDataUrl ใน snapshot เพื่อ upload หลัง login (same tab) */
export async function registerSnapshotAttachmentsForDraftSave(
  storageScopeKey: string,
  sessionId: string,
  messageId: string,
  attachments: ChatMessageAttachment[]
): Promise<number> {
  const pending: PendingChatImageAttachment[] = [];
  const metadata: ChatMessageAttachment[] = [];

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    if (att.kind !== "image") continue;
    if (sessionHasStoredImageId(storageScopeKey, sessionId, att.id)) continue;
    const dataUrl = att.previewDataUrl;
    if (!dataUrl?.startsWith("data:")) continue;

    const file = await dataUrlToFile(
      dataUrl,
      att.originalFileName ?? att.name ?? `chat-image-${i + 1}.jpg`,
      att.mimeType
    );
    if (!file) continue;

    const previewUrl = URL.createObjectURL(file);
    pending.push({
      id: att.id,
      kind: "image",
      originalFileName: att.originalFileName ?? att.name,
      fileName: att.fileName ?? att.name,
      optimizedFile: file,
      previewUrl,
      mimeType: att.mimeType || file.type,
      size: att.size || file.size,
      width: att.width ?? 0,
      height: att.height ?? 0,
    });
    metadata.push({
      ...att,
      previewUrl,
      previewDataUrl: dataUrl,
    });
  }

  if (pending.length === 0) return 0;

  const byMessage = sessionMap(storageScopeKey, sessionId);
  const existing = byMessage.get(messageId) ?? [];
  const existingIds = new Set(existing.map((item) => item.id));
  const newStored = pending
    .map((item, index) => ({
      id: item.id,
      messageId,
      sessionId,
      file: item.optimizedFile,
      metadata: metadata[index] ?? attachmentToMessageMeta(item, index),
    }))
    .filter((item) => !existingIds.has(item.id));

  if (newStored.length === 0) return 0;

  byMessage.set(messageId, [...existing, ...newStored]);
  markChatImageMessageForPendingListing(storageScopeKey, sessionId, messageId);
  return newStored.length;
}

function sessionHasStoredImageId(
  storageScopeKey: string,
  sessionId: string,
  attachmentId: string
): boolean {
  return Boolean(findStoredImageByAttachmentId(storageScopeKey, sessionId, attachmentId));
}

/**
 * รวม thumbnail สำหรับ draft preview — สร้าง previewUrl ใหม่จากไฟล์ใน store
 * (metadata.previewUrl อาจเป็น blob ที่ revoke แล้ว จึงไม่พอสำหรับแสดงผล)
 */
export function collectDraftPreviewDisplayAttachments(
  storageScopeKey: string,
  sessionId: string,
  messages: ChatMessage[]
): ChatMessageAttachment[] {
  markSessionImagesForPendingListing(storageScopeKey, sessionId, messages);

  const seen = new Set<string>();
  const output: ChatMessageAttachment[] = [];
  const session = filesByScope.get(storageScopeKey)?.get(sessionId);

  if (session) {
    for (const message of messages) {
      if (message.sender !== "user") continue;
      const stored = session.get(message.id) ?? [];
      for (const item of stored) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        output.push({
          ...item.metadata,
          previewUrl: URL.createObjectURL(item.file),
        });
      }
    }
  }

  if (output.length === 0) {
    for (const message of messages) {
      if (message.sender !== "user") continue;
      for (const att of message.attachments ?? []) {
        if (att.kind !== "image" || seen.has(att.id)) continue;
        seen.add(att.id);
        const stored = findStoredImageByAttachmentId(
          storageScopeKey,
          sessionId,
          att.id
        );
        if (stored?.file) {
          output.push({
            ...att,
            previewUrl: URL.createObjectURL(stored.file),
          });
          continue;
        }
        const fallback =
          att.previewUrl ?? att.previewDataUrl ?? att.thumbnailUrl ?? att.imageUrl;
        if (fallback) {
          output.push({ ...att, previewUrl: fallback });
        }
      }
    }
  }

  return output.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** @deprecated ใช้ collectDraftPreviewDisplayAttachments */
export function enrichDraftPreviewAttachments(
  storageScopeKey: string,
  sessionId: string,
  messages: ChatMessage[],
  attachments: ChatMessageAttachment[]
): ChatMessageAttachment[] {
  const fresh = collectDraftPreviewDisplayAttachments(
    storageScopeKey,
    sessionId,
    messages
  );
  if (fresh.length > 0) return fresh;
  return attachments;
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
