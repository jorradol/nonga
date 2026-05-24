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

export function takePendingDraftImages(
  storageScopeKey: string,
  sessionId: string
): File[] {
  const key = scopeSessionKey(storageScopeKey, sessionId);
  const files = pendingDraftImages.get(key) ?? [];
  pendingDraftImages.delete(key);
  return files;
}

export function clearChatAttachmentScope(storageScopeKey: string): void {
  filesByScope.delete(storageScopeKey);
  for (const key of [...pendingDraftImages.keys()]) {
    if (key.startsWith(`${storageScopeKey}::`)) {
      pendingDraftImages.delete(key);
    }
  }
}
