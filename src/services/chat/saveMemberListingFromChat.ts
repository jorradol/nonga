import type { ChatMessage, ChatMessageAttachment } from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../ai/chat/chatPrecheckLayer";
import { buildDealerDraftPayloadFromChat } from "../ai/chat/chatDraftActions";
import {
  collectChatImagesForDraft,
  markSessionImagesForPendingListing,
  registerSnapshotAttachmentsForDraftSave,
} from "../../features/chat-image-attachment-v1/chatImageAttachmentStore";
import {
  assertApiPayloadWithinLimit,
  buildMarketplaceApiCarPayload,
} from "../../utils/listingImageStorage";
import { inferMarketplaceCategoryType } from "../../utils/marketplaceCarMapper";
import {
  createLegacyMarketplaceListing,
  patchMyListing,
  setMyListingVisibility,
  uploadMyListingImages,
} from "../listings/myListingsApi";
import { AppFriendlyError } from "../../utils/appFriendlyError";

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
}): Promise<File[]> {
  markSessionImagesForPendingListing(
    params.storageScopeKey,
    params.sessionId,
    params.messages
  );

  let files = collectChatImagesForDraft(
    params.storageScopeKey,
    params.sessionId,
    params.messages
  ).map((item) => item.file);

  if (files.length > 0) return files;

  const recoverable = params.cardAttachments?.filter(
    (a) => a.kind === "image" && a.previewDataUrl?.startsWith("data:")
  );
  if (!recoverable?.length) return files;

  const anchor = findImageAnchorMessage(params.messages);
  if (!anchor) return files;

  await registerSnapshotAttachmentsForDraftSave(
    params.storageScopeKey,
    params.sessionId,
    anchor.id,
    recoverable
  );

  files = collectChatImagesForDraft(
    params.storageScopeKey,
    params.sessionId,
    params.messages
  ).map((item) => item.file);

  return files;
}

export type SaveMemberListingFromChatResult =
  | { ok: true; listingId: string; message: string; imageCount: number }
  | { ok: false; code: "missing-fields"; message: string; missing: string[] }
  | { ok: false; code: "need-images"; message: string }
  | { ok: false; code: "error"; message: string };

export async function saveMemberListingFromChat(params: {
  fields: ExtractedCarFields;
  visionSummary?: VisionObservationSummary;
  publicRefCode: string;
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

  const { payload, missing } = buildMemberListingApiPayload({
    fields: params.fields,
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
  const imageFiles = await resolveMemberSaveImageFiles({
    storageScopeKey: params.storageScopeKey,
    sessionId: params.sessionId,
    messages: params.messages,
    cardAttachments: params.cardAttachments,
  });

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
    const created = await createLegacyMarketplaceListing(payload);
    const listingId = created.id;

    let imageCount = 0;
    if (imageFiles.length > 0) {
      const storedUrls = await uploadMyListingImages(
        params.ownerId,
        listingId,
        imageFiles
      );
      imageCount = storedUrls.length;
      if (storedUrls.length > 0) {
        await patchMyListing(params.ownerId, listingId, { images: storedUrls });
      }
    }

    await setMyListingVisibility(params.ownerId, listingId, true);

    const message = buildMemberListingSuccessMessage({
      publicRefCode: params.publicRefCode,
      listingId,
    });

    const imageNote =
      imageCount > 0
        ? `\n\nแนบรูป ${imageCount} รูปเข้าประกาศแล้วครับ`
        : expectsImages
          ? ""
          : "\n\nยังไม่มีรูปในระบบ — แนบรูปในแชทหรือเพิ่มจาก “ประกาศของฉัน” ได้ภายหลังครับ";

    return {
      ok: true,
      listingId,
      message: `${message}${imageNote}`,
      imageCount,
    };
  } catch (err) {
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
