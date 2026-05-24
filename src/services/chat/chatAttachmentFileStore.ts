/**
 * In-memory File blobs keyed by chat storage scope + message id (dealer-isolated via scope key).
 * รูปที่รอผูก draft เก็บใน pendingDraftImages จนกดบันทึกประกาศ แล้วอัปโหลดผ่าน
 * POST /api/dealer/drafts/:id/upload-images (reuse draft upload — ไม่ใช้ storage กลาง)
 */

const filesByScope = new Map<string, Map<string, File[]>>();
const pendingDraftImages = new Map<string, File[]>();

function scopeSessionKey(storageScopeKey: string, sessionId: string): string {
  return `${storageScopeKey}::${sessionId}`;
}

export function registerMessageAttachmentFiles(
  storageScopeKey: string,
  messageId: string,
  files: File[]
): void {
  if (files.length === 0) return;
  let scopeMap = filesByScope.get(storageScopeKey);
  if (!scopeMap) {
    scopeMap = new Map();
    filesByScope.set(storageScopeKey, scopeMap);
  }
  scopeMap.set(messageId, files);
}

export function getMessageAttachmentFiles(
  storageScopeKey: string,
  messageId: string
): File[] {
  return filesByScope.get(storageScopeKey)?.get(messageId) ?? [];
}

export function appendPendingDraftImages(
  storageScopeKey: string,
  sessionId: string,
  imageFiles: File[]
): void {
  if (imageFiles.length === 0) return;
  const key = scopeSessionKey(storageScopeKey, sessionId);
  const prev = pendingDraftImages.get(key) ?? [];
  pendingDraftImages.set(key, [...prev, ...imageFiles]);
}

export function peekPendingDraftImages(
  storageScopeKey: string,
  sessionId: string
): File[] {
  return pendingDraftImages.get(scopeSessionKey(storageScopeKey, sessionId)) ?? [];
}

export function takePendingDraftImages(
  storageScopeKey: string,
  sessionId: string
): File[] {
  const key = scopeSessionKey(storageScopeKey, sessionId);
  const files = pendingDraftImages.get(key) ?? [];
  pendingDraftImages.delete(key);
  return files;
}

function fileDedupeKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

/** รวมรูปจาก in-memory store ตาม message id + คิว pending (ก่อนบันทึกประกาศ) */
export function collectSessionImageFilesForDraft(
  storageScopeKey: string,
  sessionId: string,
  messages: Array<{ id: string; sender: string; attachments?: Array<{ kind: string }> }>
): File[] {
  const seen = new Set<string>();
  const out: File[] = [];

  const pushUnique = (file: File) => {
    const key = fileDedupeKey(file);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(file);
  };

  for (const msg of messages) {
    if (msg.sender !== "user") continue;
    if (!msg.attachments?.some((a) => a.kind === "image")) continue;
    for (const f of getMessageAttachmentFiles(storageScopeKey, msg.id)) {
      pushUnique(f);
    }
  }

  for (const f of peekPendingDraftImages(storageScopeKey, sessionId)) {
    pushUnique(f);
  }

  return out;
}

export function clearPendingDraftImages(
  storageScopeKey: string,
  sessionId: string
): void {
  pendingDraftImages.delete(scopeSessionKey(storageScopeKey, sessionId));
}

export function clearChatAttachmentScope(storageScopeKey: string): void {
  filesByScope.delete(storageScopeKey);
  for (const key of [...pendingDraftImages.keys()]) {
    if (key.startsWith(`${storageScopeKey}::`)) {
      pendingDraftImages.delete(key);
    }
  }
}
