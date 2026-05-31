import type { ChatMessage, ChatMessageAttachment } from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../ai/chat/chatPrecheckLayer";
import { buildSavedMemberListingCardData } from "./chatSavedMemberListing";
import { buildDealerDraftPayloadFromChat } from "../ai/chat/chatDraftActions";
import {
  collectAllChatImageFilesForMemberListingCapInfo,
  recoverChatImagesFromMessageHistory,
  registerSnapshotAttachmentsForDraftSave,
} from "../../features/chat-image-attachment-v1/chatImageAttachmentStore";
import {
  buildChatListingImageCapTruncatedNote,
} from "../../constants/listingImagePolicy";
import {
  uploadMyListingImagesDetailed,
  type UploadMyListingImagesResult,
} from "../listings/myListingsApi";
import { isValidListingImageUrl } from "../../utils/listingImages";
import {
  assertApiPayloadWithinLimit,
  buildMarketplaceApiCarPayload,
} from "../../utils/listingImageStorage";
import { inferMarketplaceCategoryType } from "../../utils/marketplaceCarMapper";
import {
  createLegacyMarketplaceListing,
  patchMyListing,
  setMyListingVisibility,
} from "../listings/myListingsApi";
import { AppFriendlyError } from "../../utils/appFriendlyError";
import { requireFirebaseAuthHeaders } from "../auth/firebaseAuthHeaders";
import { mergeEffectivePrecheckFields } from "../ai/chat/chatPrecheckLayer";
import { normalizeExtractedCarFields } from "./chatMemberPendingListing";

export const CHAT_MEMBER_NEED_IMAGES_BEFORE_SAVE_MESSAGE =
  "ก่อนบันทึกประกาศจริง รบกวนแนบรูปรถในช่องแชทอีกครั้งนะครับ น้องเอจะใช้รูปนั้นกับประกาศนี้โดยตรง — ไม่ต้องพิมพ์ข้อมูลรถซ้ำครับ";

export const CHAT_MEMBER_SAVE_IN_PROGRESS_MESSAGE =
  "กำลังบันทึกประกาศร่างให้ครับ รอสักครู่...";

export function buildMemberListingSuccessMessage(params: {
  publicRefCode: string;
  listingId: string;
}): string {
  return [
    "บันทึกประกาศร่างเรียบร้อยแล้วครับ",
    `รหัสอ้างอิงจากแชท: ${params.publicRefCode}`,
    `รหัสประกาศ: ${params.listingId}`,
    "ดูและแก้ไขต่อได้ใน “ประกาศของฉัน” (ยังไม่ลงตลาดจนกว่าจะกดเผยแพร่)",
  ].join("\n");
}

export function chatFlowExpectsListingImages(
  messages: ChatMessage[],
  cardAttachments?: ChatMessageAttachment[]
): boolean {
  if (cardAttachments?.some((a) => a.kind === "image")) return true;
  return messages.some(
    (m) =>
      m.attachments?.some((a) => a.kind === "image") ||
      (m.isDraftPreview && m.attachments?.some((a) => a.kind === "image")) ||
      (m.isPendingListingCard && m.attachments?.some((a) => a.kind === "image"))
  );
}

export function buildMemberListingApiPayload(params: {
  fields: ExtractedCarFields;
  visionSummary?: VisionObservationSummary;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
}): { payload: ReturnType<typeof buildMarketplaceApiCarPayload>; missing: string[] } {
  const { payload: draftPayload, missing } = buildDealerDraftPayloadFromChat(
    params.fields
  );

  const brand = draftPayload.brand ?? params.fields.brand ?? "";
  const model = draftPayload.model ?? params.fields.model ?? "";
  const year = draftPayload.year ?? Number(params.fields.year) ?? new Date().getFullYear();
  const price = draftPayload.price ?? Number(params.fields.price) ?? 0;
  const mileage = draftPayload.mileage ?? Number(params.fields.mileage) ?? 0;

  const descParts: string[] = [];
  if (draftPayload.description?.trim()) descParts.push(draftPayload.description.trim());
  const marketing = params.fields.description?.trim();
  if (marketing && !descParts.includes(marketing)) descParts.push(marketing);

  const bodyType = params.visionSummary?.bodyType?.trim();
  const condition =
    params.fields.transmission?.trim() ||
    params.visionSummary?.condition?.trim() ||
    bodyType ||
    "มือสอง";

  const fuelType = params.fields.fuelType?.trim() || "petrol";
  const listingType = inferMarketplaceCategoryType({
    fuelType,
    bodyType,
    condition,
    price,
  });

  const title =
    draftPayload.title ||
    [brand, model, Number.isFinite(year) ? String(year) : ""].filter(Boolean).join(" ").trim() ||
    "ประกาศรถจากแชท";

  const apiPayload = buildMarketplaceApiCarPayload({
    title,
    brand,
    model,
    year,
    price,
    type: listingType,
    condition,
    mileage,
    fuelType,
    images: [],
    description: descParts.join("\n\n") || title,
    ownerId: params.ownerId,
    ownerName: params.ownerName || "สมาชิก Nong A",
    ownerPhone: params.ownerPhone || "",
  });

  return { payload: apiPayload, missing };
}

function findImageAnchorMessage(messages: ChatMessage[]): ChatMessage | undefined {
  return (
    messages.find(
      (m) =>
        m.sender === "user" && m.attachments?.some((a) => a.kind === "image")
    ) ?? messages.find((m) => m.sender === "user")
  );
}

async function resolveMemberSaveImageFiles(params: {
  storageScopeKey: string;
  sessionId: string;
  messages: ChatMessage[];
  cardAttachments?: ChatMessageAttachment[];
}): Promise<{
  files: File[];
  truncated: boolean;
  totalBeforeCap: number;
}> {
  await recoverChatImagesFromMessageHistory(
    params.storageScopeKey,
    params.sessionId,
    params.messages
  );

  const recoverableOnCard =
    params.cardAttachments?.filter(
      (a) => a.kind === "image" && a.previewDataUrl?.startsWith("data:")
    ) ?? [];
  if (recoverableOnCard.length > 0) {
    const anchor = findImageAnchorMessage(params.messages);
    if (anchor) {
      await registerSnapshotAttachmentsForDraftSave(
        params.storageScopeKey,
        params.sessionId,
        anchor.id,
        recoverableOnCard
      );
    }
  }

  const capInfo = collectAllChatImageFilesForMemberListingCapInfo(
    params.storageScopeKey,
    params.sessionId,
    params.messages
  );
  return {
    files: capInfo.items.map((item) => item.file),
    truncated: capInfo.truncated,
    totalBeforeCap: capInfo.totalBeforeCap,
  };
}

function filterListingImageUrls(listingId: string, urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = String(raw ?? "").trim();
    if (!url || seen.has(url)) continue;
    if (!isValidListingImageUrl(url, listingId)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function buildMemberImageUploadSummary(
  upload: UploadMyListingImagesResult,
  recordImageCount: number
): string {
  const parts: string[] = [];
  if (recordImageCount > 0) {
    parts.push(`แนบรูป ${recordImageCount} รูปเข้าประกาศแล้วครับ`);
  }
  if (
    upload.requestedCount > 0 &&
    upload.uploadedCount < upload.requestedCount
  ) {
    parts.push(
      `อัปโหลดสำเร็จ ${upload.uploadedCount} จาก ${upload.requestedCount} รูป — รูปที่เหลือไม่เข้าระบบ กรุณาแนบรูปที่ล้มเหลวใหม่ในแชทหรือจาก “ประกาศของฉัน”`
    );
    for (const file of upload.failedFiles) {
      parts.push(`• ${file.fileName} — ${file.message}`);
    }
    if (upload.failedFiles.length === 0) {
      for (const batch of upload.failedBatches) {
        parts.push(
          `• ชุดที่ ${batch.batchIndex + 1}: ${batch.fileNames.join(", ")} — ${batch.message}`
        );
      }
    }
  }
  return parts.join("\n");
}

export type SaveMemberListingFromChatResult =
  | {
      ok: true;
      listingId: string;
      message: string;
      imageCount: number;
      requestedImageCount: number;
      uploadResult: UploadMyListingImagesResult;
      savedCard: ReturnType<typeof buildSavedMemberListingCardData>;
    }
  | { ok: false; code: "missing-fields"; message: string; missing: string[] }
  | { ok: false; code: "need-images"; message: string }
  | { ok: false; code: "error"; message: string };

export async function saveMemberListingFromChat(params: {
  fields: ExtractedCarFields;
  visionSummary?: VisionObservationSummary;
  publicRefCode: string;
  marketingCopy?: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  storageScopeKey: string;
  sessionId: string;
  messages: ChatMessage[];
  cardAttachments?: ChatMessageAttachment[];
}): Promise<SaveMemberListingFromChatResult> {
  if (!params.ownerId.trim()) {
    return {
      ok: false,
      code: "error",
      message: "กรุณาเข้าสู่ระบบก่อนบันทึกประกาศครับ",
    };
  }

  const fields = mergeEffectivePrecheckFields(
    normalizeExtractedCarFields(params.fields),
    params.visionSummary
  );

  const { payload, missing } = buildMemberListingApiPayload({
    fields,
    visionSummary: params.visionSummary,
    ownerId: params.ownerId,
    ownerName: params.ownerName,
    ownerPhone: params.ownerPhone,
  });

  if (missing.length > 0) {
    return {
      ok: false,
      code: "missing-fields",
      message: `ข้อมูลยังไม่ครบสำหรับบันทึกครับ: ${missing.join(", ")} — กดแก้ไขข้อมูลในการ์ดแล้วเติมให้ครบก่อนนะครับ`,
      missing,
    };
  }

  const expectsImages = chatFlowExpectsListingImages(
    params.messages,
    params.cardAttachments
  );
  const imageResolve = await resolveMemberSaveImageFiles({
    storageScopeKey: params.storageScopeKey,
    sessionId: params.sessionId,
    messages: params.messages,
    cardAttachments: params.cardAttachments,
  });
  const imageFiles = imageResolve.files;

  if (expectsImages) {
    const attachmentImageCount =
      params.cardAttachments?.filter((a) => a.kind === "image").length ?? 0;
    console.info("[member-listing-save] image files resolved", {
      sessionId: params.sessionId,
      attachmentImageCount,
      resolvedFileCount: imageFiles.length,
      totalBeforeCap: imageResolve.totalBeforeCap,
      truncated: imageResolve.truncated,
      fileNames: imageFiles.map((f) => f.name || "upload.jpg"),
    });
  }

  if (expectsImages && imageFiles.length === 0) {
    return {
      ok: false,
      code: "need-images",
      message: CHAT_MEMBER_NEED_IMAGES_BEFORE_SAVE_MESSAGE,
    };
  }

  const sizeCheck = assertApiPayloadWithinLimit(payload);
  if (sizeCheck.ok === false) {
    return {
      ok: false,
      code: "error",
      message: sizeCheck.message,
    };
  }

  try {
    await requireFirebaseAuthHeaders({ forceRefresh: true });
    const created = await createLegacyMarketplaceListing(payload);
    const listingId = created.id;

    let uploadResult: UploadMyListingImagesResult = {
      storedUrls: [],
      requestedCount: 0,
      uploadedCount: 0,
      failedBatches: [],
      failedFiles: [],
    };
    let recordImageUrls: string[] = [];

    if (imageFiles.length > 0) {
      uploadResult = await uploadMyListingImagesDetailed(
        params.ownerId,
        listingId,
        imageFiles
      );
      if (uploadResult.storedUrls.length > 0) {
        const patched = await patchMyListing(params.ownerId, listingId, {
          images: uploadResult.storedUrls,
        });
        recordImageUrls = filterListingImageUrls(
          listingId,
          Array.isArray(patched.images) ? patched.images : uploadResult.storedUrls
        );
      } else if (uploadResult.failedBatches.length > 0) {
        return {
          ok: false,
          code: "error",
          message: buildMemberImageUploadSummary(uploadResult, 0),
        };
      }
    }

    await setMyListingVisibility(params.ownerId, listingId, true);

    const savedCard = buildSavedMemberListingCardData({
      listingId,
      publicRefCode: params.publicRefCode,
      fields,
      visionSummary: params.visionSummary,
      marketingCopy: params.marketingCopy?.trim() ?? "",
      imageUrls: recordImageUrls,
    });

    const message = buildMemberListingSuccessMessage({
      publicRefCode: params.publicRefCode,
      listingId,
    });

    const imageNote = buildMemberImageUploadSummary(
      uploadResult,
      recordImageUrls.length
    );
    const capNote = imageResolve.truncated
      ? `\n\n${buildChatListingImageCapTruncatedNote(imageResolve.totalBeforeCap)}`
      : "";
    const trailingNote =
      !imageNote && expectsImages
        ? "\n\nยังไม่มีรูปในระบบ — แนบรูปในแชทหรือเพิ่มจาก “ประกาศของฉัน” ได้ภายหลังครับ"
        : imageNote
          ? `\n\n${imageNote}`
          : "";

    return {
      ok: true,
      listingId,
      message: `${message}${trailingNote}${capNote}`,
      imageCount: recordImageUrls.length,
      requestedImageCount: uploadResult.requestedCount,
      uploadResult,
      savedCard,
    };
  } catch (err) {
    if (err instanceof AppFriendlyError && err.code === "not_json") {
      return {
        ok: false,
        code: "error",
        message:
          "ระบบบันทึกประกาศไม่สำเร็จชั่วคราวครับ ลองรอสักครู่แล้วกดยืนยันบันทึกอีกครั้ง หรือบันทึกจาก “ประกาศของฉัน” ได้ครับ",
      };
    }
    const message =
      err instanceof AppFriendlyError
        ? err.friendlyMessage
        : err instanceof Error
          ? err.message
          : "บันทึกประกาศไม่สำเร็จ กรุณาลองใหม่อีกครั้งครับ";
    return { ok: false, code: "error", message };
  }
}

export function formatMemberListingSaveError(result: SaveMemberListingFromChatResult): string {
  if (result.ok) return result.message;
  return result.message;
}
