import type { ChatMessage, ChatMessageAttachment } from "../types";
import type {
  ExtractedCarFields,
} from "../services/ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../services/ai/chat/chatPrecheckLayer";

const STORAGE_KEY = "nong-a-chat-pending-draft-v1";
const SNAPSHOT_VERSION = 1;
const TTL_MS = 2 * 60 * 60 * 1000;
const MAX_PERSISTED_IMAGES = 8;
const MAX_DATA_URL_BYTES = 450_000;

export interface PendingChatDraftSnapshotMessage {
  sender: "user" | "ai";
  text: string;
  isDraftPreview?: boolean;
  draftFields?: ExtractedCarFields;
  attachments?: ChatMessageAttachment[];
}

export interface PendingChatDraftSnapshot {
  version: number;
  createdAt: number;
  publicRefCode: string;
  fields: ExtractedCarFields;
  visionSummary?: VisionObservationSummary;
  draftPreviewText: string;
  messages: PendingChatDraftSnapshotMessage[];
  draftPreviewAttachments?: ChatMessageAttachment[];
  imageCount: number;
  /** มี previewDataUrl ใน snapshot พอแสดง thumbnail (อัปโหลดตอน save อาจต้องแนบใหม่) */
  thumbnailsPersisted: boolean;
  /** ผู้ใช้กดยืนยันสร้างประกาศก่อนถูกพาไป login แล้ว */
  userAlreadyConfirmedCreateDraft?: boolean;
}

function getSessionStorage(): Storage | null {
  const storage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
  return storage ?? null;
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

async function blobUrlToDataUrl(blobUrl: string): Promise<string | null> {
  try {
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("read-failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function stripAttachmentForStorage(
  att: ChatMessageAttachment
): ChatMessageAttachment {
  const { previewUrl, ...rest } = att;
  void previewUrl;
  return { ...rest };
}

/** แปลง blob preview เป็น data URL สำหรับ sessionStorage (จำกัดจำนวน/ขนาด) */
export async function persistAttachmentsForSnapshot(
  attachments: ChatMessageAttachment[] | undefined
): Promise<{
  attachments: ChatMessageAttachment[];
  thumbnailsPersisted: boolean;
}> {
  if (!attachments?.length) {
    return { attachments: [], thumbnailsPersisted: false };
  }

  const output: ChatMessageAttachment[] = [];
  let bytesUsed = 0;
  let persisted = 0;

  for (const att of attachments.slice(0, MAX_PERSISTED_IMAGES)) {
    if (att.kind !== "image") {
      output.push(stripAttachmentForStorage(att));
      continue;
    }

    let previewDataUrl = att.previewDataUrl;
    if (!previewDataUrl && att.previewUrl?.startsWith("blob:")) {
      previewDataUrl = (await blobUrlToDataUrl(att.previewUrl)) ?? undefined;
    }

    if (previewDataUrl) {
      const size = estimateDataUrlBytes(previewDataUrl);
      if (bytesUsed + size > MAX_DATA_URL_BYTES) {
        output.push(stripAttachmentForStorage(att));
        continue;
      }
      bytesUsed += size;
      persisted += 1;
      output.push({
        ...stripAttachmentForStorage(att),
        previewDataUrl,
        previewUrl: undefined,
      });
      continue;
    }

    output.push(stripAttachmentForStorage(att));
  }

  return {
    attachments: output,
    thumbnailsPersisted: persisted > 0,
  };
}

export function serializeMessagesForSnapshot(
  messages: ChatMessage[]
): PendingChatDraftSnapshotMessage[] {
  return messages
    .map((m) => ({
      sender: m.sender === "user" ? ("user" as const) : ("ai" as const),
      text: m.text,
      ...(m.isDraftPreview ? { isDraftPreview: true } : {}),
      ...(m.draftFields ? { draftFields: m.draftFields as ExtractedCarFields } : {}),
      ...(m.attachments?.length
        ? {
            attachments: m.attachments.map((a) => stripAttachmentForStorage(a)),
          }
        : {}),
    }))
    .filter((m) => m.text?.trim() || (m.attachments?.length ?? 0) > 0);
}

export function savePendingChatDraftSnapshot(
  snapshot: Omit<PendingChatDraftSnapshot, "version" | "createdAt">
): void {
  const storage = getSessionStorage();
  if (!storage) return;
  const payload: PendingChatDraftSnapshot = {
    version: SNAPSHOT_VERSION,
    createdAt: Date.now(),
    ...snapshot,
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[chat-pending-draft] save failed:", err);
  }
}

export function peekPendingChatDraftSnapshot(): PendingChatDraftSnapshot | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingChatDraftSnapshot;
    if (parsed.version !== SNAPSHOT_VERSION) {
      clearPendingChatDraftSnapshot();
      return null;
    }
    if (Date.now() - parsed.createdAt > TTL_MS) {
      clearPendingChatDraftSnapshot();
      return null;
    }
    return parsed;
  } catch {
    clearPendingChatDraftSnapshot();
    return null;
  }
}

export function consumePendingChatDraftSnapshot(): PendingChatDraftSnapshot | null {
  const snap = peekPendingChatDraftSnapshot();
  if (snap) clearPendingChatDraftSnapshot();
  return snap;
}

export function clearPendingChatDraftSnapshot(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const POST_LOGIN_DRAFT_RESTORED_NOTE =
  "ลุงเข้าสู่ระบบเรียบร้อยแล้วครับ น้องเอกู้ร่างประกาศที่ทำค้างไว้กลับมาให้แล้ว ถ้าข้อมูลถูกต้อง กด 'ยืนยันสร้างประกาศ' ได้เลยครับ";

export const POST_LOGIN_IMAGES_REATTACH_NOTE =
  "หมายเหตุ: รูปที่แนบก่อนเข้าสู่ระบบไม่สามารถนำไปบันทึกประกาศอัตโนมัติได้ รบกวนแนบรูปอีกครั้งก่อนกดยืนยันสร้างประกาศครับ";

export const POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE =
  "น้องเอกู้ข้อมูลประกาศกลับมาได้แล้วครับ แต่รูปจริงที่แนบไว้ก่อนเข้าสู่ระบบไม่สามารถใช้บันทึกต่อได้ รบกวนแนบรูปอีกครั้ง แล้วน้องเอจะบันทึกเป็นประกาศร่างให้ทันทีครับ";

export function buildPostLoginDraftSavedText(publicRefCode: string): string {
  return [
    `บันทึกเป็นประกาศร่างเรียบร้อยแล้วครับ รหัสรถ: ${publicRefCode}`,
    "",
    "ต้องการตรวจทานประกาศก่อนลงตลาด หรือให้ลงตลาดต่อเลยไหมครับ",
  ].join("\n");
}
