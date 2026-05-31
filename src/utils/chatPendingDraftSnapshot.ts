import type { ChatMessage, ChatMessageAttachment } from "../types";
import type {
  ExtractedCarFields,
} from "../services/ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../services/ai/chat/chatPrecheckLayer";
import {
  getMissingCoreFieldLabels,
  hasCoreFieldsComplete,
  mergeEffectivePrecheckFields,
} from "../services/ai/chat/chatPrecheckLayer";
import { chatRestoreLog } from "./chatRestoreDebug";
import {
  normalizeExtractedCarFields,
  normalizeVisionObservationSummary,
} from "../services/chat/chatMemberPendingListing";
import { SNAPSHOT_MAX_PREVIEW_IMAGES } from "../constants/listingImagePolicy";

const STORAGE_KEY = "nong-a-chat-pending-draft-v1";
const RESTORE_META_KEY = "nong-a-chat-pending-draft-restore-meta";
const SNAPSHOT_VERSION = 2;
const TTL_MS = 2 * 60 * 60 * 1000;
/** @deprecated use SNAPSHOT_MAX_PREVIEW_IMAGES from listingImagePolicy */
export const MAX_PERSISTED_SNAPSHOT_IMAGES = SNAPSHOT_MAX_PREVIEW_IMAGES;
const MAX_PERSISTED_IMAGES = SNAPSHOT_MAX_PREVIEW_IMAGES;
const MAX_DATA_URL_BYTES = 450_000;

export type PendingDraftRestoreStatus =
  | "pending"
  | "waiting_for_profile"
  | "restoring"
  | "restored"
  | "failed";

export interface PendingDraftRestoreMeta {
  snapshotId: string;
  status: PendingDraftRestoreStatus;
  sessionId?: string;
  fallbackShown?: boolean;
  updatedAt: number;
}

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
  thumbnailsPersisted: boolean;
  /** จำนวนรูปที่มี previewDataUrl ใน snapshot จริง (อาจน้อยกว่า imageCount) */
  persistedPreviewCount?: number;
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

export async function persistAttachmentsForSnapshot(
  attachments: ChatMessageAttachment[] | undefined
): Promise<{
  attachments: ChatMessageAttachment[];
  thumbnailsPersisted: boolean;
  persistedPreviewCount: number;
}> {
  if (!attachments?.length) {
    return { attachments: [], thumbnailsPersisted: false, persistedPreviewCount: 0 };
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
    persistedPreviewCount: persisted,
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

export function readPendingDraftRestoreMeta(): PendingDraftRestoreMeta | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(RESTORE_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDraftRestoreMeta;
    if (!parsed?.snapshotId?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingDraftRestoreMeta(meta: PendingDraftRestoreMeta): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.setItem(RESTORE_META_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn("[chat-pending-draft] restore meta write failed:", err);
  }
}

export function clearPendingDraftRestoreMeta(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(RESTORE_META_KEY);
  } catch {
    // ignore
  }
}

export function isPendingDraftSnapshotRestored(snapshotId: string): boolean {
  const meta = readPendingDraftRestoreMeta();
  return meta?.snapshotId === snapshotId && meta.status === "restored";
}

export function markPendingDraftRestoreWaitingForProfile(snapshotId: string): void {
  writePendingDraftRestoreMeta({
    snapshotId,
    status: "waiting_for_profile",
    updatedAt: Date.now(),
  });
}

export function markPendingDraftRestoreInProgress(
  snapshotId: string,
  sessionId: string
): void {
  writePendingDraftRestoreMeta({
    snapshotId,
    status: "restoring",
    sessionId,
    updatedAt: Date.now(),
  });
}

export function isPendingDraftRestoreFailed(snapshotId: string): boolean {
  const meta = readPendingDraftRestoreMeta();
  return meta?.snapshotId === snapshotId && meta.status === "failed";
}

export function markPendingDraftRestoreComplete(
  snapshotId: string,
  sessionId: string
): void {
  writePendingDraftRestoreMeta({
    snapshotId,
    status: "restored",
    sessionId,
    updatedAt: Date.now(),
  });
}

export function markPendingDraftRestoreFailed(snapshotId: string): void {
  const meta = readPendingDraftRestoreMeta();
  writePendingDraftRestoreMeta({
    snapshotId,
    status: "failed",
    sessionId: meta?.sessionId,
    fallbackShown: meta?.fallbackShown,
    updatedAt: Date.now(),
  });
}

export function savePendingChatDraftSnapshot(
  snapshot: Omit<PendingChatDraftSnapshot, "version" | "createdAt">
): void {
  const storage = getSessionStorage();
  if (!storage) {
    chatRestoreLog("savePendingChatDraftSnapshot: no sessionStorage");
    return;
  }
  const payload: PendingChatDraftSnapshot = {
    version: SNAPSHOT_VERSION,
    createdAt: Date.now(),
    ...snapshot,
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    writePendingDraftRestoreMeta({
      snapshotId: payload.publicRefCode,
      status: "pending",
      updatedAt: Date.now(),
    });
    chatRestoreLog("savePendingChatDraftSnapshot: saved", {
      snapshotId: payload.publicRefCode,
      storageKey: STORAGE_KEY,
      hasStorageKey: storage.getItem(STORAGE_KEY) != null,
      fields: payload.fields,
      visionSummary: payload.visionSummary,
      userAlreadyConfirmedCreateDraft: payload.userAlreadyConfirmedCreateDraft,
      imageCount: payload.imageCount,
    });
  } catch (err) {
    console.warn("[chat-pending-draft] save failed:", err);
    chatRestoreLog("savePendingChatDraftSnapshot: save failed", {
      error: String(err),
    });
  }
}

export type PendingSnapshotFailureReason =
  | "missing"
  | "expired"
  | "invalid_version"
  | "invalid_payload"
  | "parse_error";

export type PendingSnapshotReadResult =
  | { ok: true; snapshot: PendingChatDraftSnapshot }
  | { ok: false; reason: PendingSnapshotFailureReason };

function normalizePendingChatDraftSnapshot(
  parsed: PendingChatDraftSnapshot
): PendingChatDraftSnapshot | null {
  if (!parsed || typeof parsed !== "object") return null;
  if (Date.now() - Number(parsed.createdAt) > TTL_MS) return null;
  const publicRefCode = String(parsed.publicRefCode ?? "").trim();
  if (!publicRefCode) return null;
  const visionSummary = normalizeVisionObservationSummary(parsed.visionSummary);
  const fields = mergeEffectivePrecheckFields(
    normalizeExtractedCarFields(parsed.fields),
    visionSummary
  );
  if (!hasCoreFieldsComplete(fields)) return null;
  return {
    version: SNAPSHOT_VERSION,
    createdAt: Number(parsed.createdAt) || Date.now(),
    publicRefCode,
    fields,
    visionSummary,
    draftPreviewText: String(parsed.draftPreviewText ?? ""),
    messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    draftPreviewAttachments: Array.isArray(parsed.draftPreviewAttachments)
      ? parsed.draftPreviewAttachments
      : undefined,
    imageCount: Number(parsed.imageCount) || 0,
    thumbnailsPersisted: Boolean(parsed.thumbnailsPersisted),
    persistedPreviewCount:
      Number(parsed.persistedPreviewCount) ||
      countPersistedPreviewAttachments(parsed.draftPreviewAttachments),
    userAlreadyConfirmedCreateDraft: Boolean(parsed.userAlreadyConfirmedCreateDraft),
  };
}

function countPersistedPreviewAttachments(
  attachments: ChatMessageAttachment[] | undefined
): number {
  if (!attachments?.length) return 0;
  return attachments.filter(
    (att) => att.kind === "image" && att.previewDataUrl?.startsWith("data:")
  ).length;
}

export function isPendingSnapshotReadFailure(
  result: PendingSnapshotReadResult
): result is { ok: false; reason: PendingSnapshotFailureReason } {
  return result.ok === false;
}

export function hasPendingChatDraftSnapshotInStorage(): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;
  try {
    return storage.getItem(STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

export function describePendingSnapshotNormalizeFailure(
  parsed: PendingChatDraftSnapshot
): Record<string, unknown> {
  const visionSummary = normalizeVisionObservationSummary(parsed.visionSummary);
  const fields = mergeEffectivePrecheckFields(
    normalizeExtractedCarFields(parsed.fields),
    visionSummary
  );
  return {
    publicRefCode: parsed.publicRefCode,
    missingCore: getMissingCoreFieldLabels(fields),
    fields,
    visionSummary,
    expired: Date.now() - Number(parsed.createdAt) > TTL_MS,
  };
}

export function readPendingChatDraftSnapshot(): PendingSnapshotReadResult {
  const storage = getSessionStorage();
  if (!storage) return { ok: false, reason: "missing" };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ok: false, reason: "missing" };
    const parsed = JSON.parse(raw) as PendingChatDraftSnapshot;
    if (parsed.version !== SNAPSHOT_VERSION && parsed.version !== 1) {
      chatRestoreLog("readPendingChatDraftSnapshot: invalid_version", {
        version: parsed.version,
      });
      return { ok: false, reason: "invalid_version" };
    }
    const normalized = normalizePendingChatDraftSnapshot(parsed);
    if (!normalized) {
      chatRestoreLog("readPendingChatDraftSnapshot: normalize failed", {
        reason: "invalid_payload",
        ...describePendingSnapshotNormalizeFailure(parsed),
      });
      return { ok: false, reason: "invalid_payload" };
    }
    return { ok: true, snapshot: normalized };
  } catch (err) {
    chatRestoreLog("readPendingChatDraftSnapshot: parse_error", {
      error: String(err),
    });
    return { ok: false, reason: "parse_error" };
  }
}

export function peekPendingChatDraftSnapshot(): PendingChatDraftSnapshot | null {
  const result = readPendingChatDraftSnapshot();
  return result.ok ? result.snapshot : null;
}

export function hasPendingChatDraftSnapshot(): boolean {
  return readPendingChatDraftSnapshot().ok;
}

export function isPendingDraftRestoreFallbackShown(snapshotId: string): boolean {
  const meta = readPendingDraftRestoreMeta();
  return meta?.snapshotId === snapshotId && meta.fallbackShown === true;
}

export function markPendingDraftRestoreFallbackShown(snapshotId: string): void {
  const meta = readPendingDraftRestoreMeta();
  writePendingDraftRestoreMeta({
    snapshotId,
    status: meta?.status === "restored" ? "restored" : "failed",
    sessionId: meta?.sessionId,
    fallbackShown: true,
    updatedAt: Date.now(),
  });
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

export function finalizePendingDraftAfterRestore(
  snapshotId: string,
  sessionId: string
): void {
  markPendingDraftRestoreComplete(snapshotId, sessionId);
  clearPendingChatDraftSnapshot();
}

export const POST_LOGIN_PENDING_CARD_RESTORE_NOTE =
  "เข้าสู่ระบบเรียบร้อยแล้วครับ น้องเอกู้ร่างประกาศที่ทำค้างไว้กลับมาให้แล้ว ตรวจการ์ดนี้ได้เลยครับ";

export const POST_LOGIN_DRAFT_RESTORE_FAILED_NOTE =
  "น้องเอพบข้อมูลประกาศที่ทำค้างไว้ แต่กู้คืนไม่สำเร็จครับ ลองเริ่มสร้างประกาศจากแชทใหม่อีกครั้ง หรือแจ้งทีมงานถ้าปัญหายังเกิดซ้ำครับ";

export const POST_LOGIN_DRAFT_RESTORED_NOTE = POST_LOGIN_PENDING_CARD_RESTORE_NOTE;

export const POST_LOGIN_IMAGES_REATTACH_NOTE =
  "หมายเหตุ: รูปที่แนบก่อนเข้าสู่ระบบไม่สามารถนำไปบันทึกประกาศอัตโนมัติได้ รบกวนแนบรูปอีกครั้งก่อนกดยืนยันบันทึกประกาศครับ";

export function buildPostLoginPartialImageRestoreNote(
  imageCount: number,
  persistedPreviewCount: number
): string | null {
  if (imageCount <= 0) return null;
  if (persistedPreviewCount >= imageCount) return null;
  if (persistedPreviewCount <= 0) {
    return POST_LOGIN_IMAGES_REATTACH_NOTE;
  }
  return `หมายเหตุ: กู้คืนตัวอย่างรูปได้ ${persistedPreviewCount} จาก ${imageCount} รูป — รูปที่เหลือรบกวนแนบใหม่ก่อนกดยืนยันบันทึกประกาศครับ`;
}

export const POST_LOGIN_IMAGES_REATTACH_FOR_SAVE_NOTE =
  "น้องเอกู้ข้อมูลประกาศกลับมาได้แล้วครับ แต่รูปจริงที่แนบไว้ก่อนเข้าสู่ระบบไม่สามารถใช้บันทึกต่อได้ รบกวนแนบรูปอีกครั้ง แล้วน้องเอจะบันทึกเป็นประกาศร่างให้ทันทีครับ";

export function buildPostLoginDraftSavedText(publicRefCode: string): string {
  return [
    `บันทึกเป็นประกาศร่างเรียบร้อยแล้วครับ รหัสรถ: ${publicRefCode}`,
    "",
    "ต้องการตรวจทานประกาศก่อนลงตลาด หรือให้ลงตลาดต่อเลยไหมครับ",
  ].join("\n");
}
