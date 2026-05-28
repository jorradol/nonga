import { useCallback, useEffect, useMemo } from "react";
import { useChatStore } from "../../stores/chat/chatStore";
import { useAppStore } from "../../store";
import { aiService } from "../../services/ai/aiService";
import {
  buildMockChatReply,
  chunkTextForStream,
} from "../../services/ai/chatMockFallback";
import { tryOrchestrateChatReply } from "../../services/ai/chat/chatSearchOrchestrator";
import type { ChatInventoryCar } from "../../services/ai/chat/marketplaceChatSearch";
import {
  getChatStorageScope,
  isEphemeralGuestChatScope,
  logChatStorageDebug,
  resolveChatActorDisplay,
} from "../../utils/chatStorageScope";
import { resetEphemeralGuestChatMemory } from "../../services/chat/chatHistoryService";
import { logDealerDraftEditUrl } from "../../utils/dealer/dealerDraftNavigation";
import { resolveDealerIdFromUser } from "../../utils/dealerIdentity";
import { dealerAuthHeadersAsync } from "../../utils/apiAuthHeaders";
import { useAuth } from "../auth/useAuth";
import { useRole } from "../auth/useRole";
import {
  isSaveListingChatAction,
  CHAT_CONFIRM_CREATE_DRAFT_ACTION,
  buildDealerDraftPayloadFromChat,
  logChatDraftSave,
} from "../../services/ai/chat/chatDraftActions";
import { resolveChatDraftSaveBlockMessage } from "../../services/ai/chat/chatDraftAccess";
import {
  getChatDraftSaveMissingLabels,
  resolveMissingFieldsAfterChatImageUpload,
} from "../../services/ai/chat/chatDraftSaveResult";
import { isSellIntent } from "../../services/ai/chat/sellIntentParser";
import { uploadListingImagesApi } from "../../services/dealer/dealerListingImageApi";
import { fileToPasteUploadPayload } from "../../utils/inventoryImport/pasteUploadedImageQueue";
import {
  clearChatImageAttachmentScope,
  clearChatImagesForDraft,
  collectChatImagesForDraft,
  getChatImagesForMessage,
  collectDraftPreviewDisplayAttachments,
  markChatImageMessageForPendingListing,
  registerChatImageMessageFiles,
  toChatImageMessageAttachments,
  type StoredChatImageAttachment,
} from "../../features/chat-image-attachment-v1/chatImageAttachmentStore";
import type { PendingChatImageAttachment } from "../../features/chat-image-attachment-v1/types";
import {
  buildNoListingImageAckReply,
  buildPendingListingImageAckReply,
  buildSavedDraftImageAckReply,
  findLatestPendingListingContext,
  findLatestSavedDraftId,
} from "../../features/chat-image-attachment-v1/followUpImageIntent";
import { aiVisionService } from "../../services/ai/vision/visionEngine";
import { setChatLoginReturnView } from "../../utils/chatLoginReturn";
import {
  bootstrapPrecheckFields,
  buildDraftCopyReadyReply,
  buildKnownVisionHints,
  buildMissingFieldsPrompt,
  buildPrecheckVisionReply,
  clearPrecheckContext,
  ensurePublicRefCode,
  getMissingCoreFieldLabels,
  getPrecheckContext,
  hasCoreFieldsComplete,
  mergeEffectivePrecheckFields,
  isConfirmCreateListingIntent,
  isPrecheckAwaitingConfirm,
  isStartCreateListingIntent,
  setPrecheckStage,
  setPrecheckVisionSummary,
  upsertPrecheckFromMessage,
  type VisionObservationSummary,
} from "../../services/ai/chat/chatPrecheckLayer";

let lastHydratedChatScopeKey: string | null = null;

async function fetchInventoryForChat(): Promise<ChatInventoryCar[]> {
  try {
    const res = await fetch(`/api/cars?_=${Date.now()}`, { cache: "no-store" });
    const json = await res.json();
    return (json?.data ?? []) as ChatInventoryCar[];
  } catch {
    return [];
  }
}

async function fetchMockChatReply(userText: string): Promise<string> {
  const cars = await fetchInventoryForChat();
  return buildMockChatReply(userText, cars);
}

async function uploadChatImagesToDraft(
  images: StoredChatImageAttachment[],
  draftId: string,
  dealerId: string,
  role: string
): Promise<{
  storedUrls: string[];
  failed: Array<{ name: string; error: string }>;
}> {
  const payloads = await Promise.all(
    images.map((item) =>
      fileToPasteUploadPayload(item.file).then((payload) => ({
        ...payload,
        originalFileName: item.metadata.originalFileName,
        source: "chat-image-attachment-v1" as const,
      }))
    )
  );

  return uploadListingImagesApi(
    { dealerId, role },
    draftId,
    "draft",
    payloads,
    { throwIfNone: false }
  );
}

function notifyDealerDraftSaved(draftId: string | undefined): void {
  if (!draftId || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("nonga-dealer-draft-saved", {
      detail: { draftId },
    })
  );
}

export function useChat() {
  const {
    sessions,
    activeSessionId,
    messages,
    isGenerating,
    streamedReply,
    streamedCarCards,
    streamedHasMoreCars,
    userPreferences,
    isAnalyzingMemory,
    activePresetId,
    personalities,
    isLoadingPersonalities,
    resetChatState,
    loadSessions,
    createSession,
    deleteSession,
    selectSession,
    addMessage,
    editMessage,
    updateStreamedReply,
    finalizeStreamedReply,
    setGenerating,
    loadUserPreferences,
    setPresetId,
    loadPersonalitiesList,
    updatePersonalityInstruction,
  } = useChatStore();

  const { user, setView } = useAppStore();
  const { isSignedIn } = useAuth();
  const { isDealer, isAdmin, role } = useRole();

  const chatScope = useMemo(() => getChatStorageScope(user), [user]);
  const storageScopeKey = chatScope.storageKey;

  const hydrateChatForScope = useCallback(async (force = false) => {
    const guestEphemeral = isEphemeralGuestChatScope(chatScope);
    const isNewScope = lastHydratedChatScopeKey !== storageScopeKey;
    const chatState = useChatStore.getState();
    const hasInMemoryGuestThread =
      guestEphemeral && chatState.sessions.length > 0;

    // Same visit + scope: keep guest in-memory thread (do not wipe on every effect run).
    if (!isNewScope && !force) {
      return;
    }

    // Forced refresh on same scope: reload prefs/personalities only; never clear an active guest chat.
    if (!isNewScope && force) {
      await loadUserPreferences(storageScopeKey);
      await loadPersonalitiesList();
      return;
    }

    if (lastHydratedChatScopeKey) {
      clearChatImageAttachmentScope(lastHydratedChatScopeKey);
    }
    if (guestEphemeral && !hasInMemoryGuestThread) {
      resetEphemeralGuestChatMemory();
    }
    resetChatState();
    lastHydratedChatScopeKey = storageScopeKey;

    await loadSessions(chatScope);
    await loadUserPreferences(storageScopeKey);
    await loadPersonalitiesList();
    logChatStorageDebug(chatScope, {
      draftDealerId: chatScope.dealerId,
    });
  }, [
    storageScopeKey,
    chatScope,
    resetChatState,
    loadSessions,
    loadUserPreferences,
    loadPersonalitiesList,
  ]);

  useEffect(() => {
    void hydrateChatForScope();
  }, [hydrateChatForScope]);

  const initializeChat = useCallback(async () => {
    await hydrateChatForScope(true);
  }, [hydrateChatForScope]);

  const saveDealerDraftFromFields = useCallback(
    async (params: {
      sessionId: string;
      fields: Record<string, unknown>;
    }): Promise<{ text: string; savedDraftId?: string }> => {
      const { payload } = buildDealerDraftPayloadFromChat(
        params.fields as Parameters<typeof buildDealerDraftPayloadFromChat>[0]
      );
      const draftSaveBlock = resolveChatDraftSaveBlockMessage({
        isSignedIn,
        chatScope,
        isDealer,
        isAdmin,
      });
      if (draftSaveBlock) {
        if (!isSignedIn) {
          setChatLoginReturnView("chat");
          setView("login");
        }
        return { text: draftSaveBlock };
      }

      const draftDealerId = resolveDealerIdFromUser(user);
      const apiRole = isAdmin ? "admin" : "dealer";
      const endpoint = "/api/dealer/drafts/new";
      const sessionMessages = useChatStore.getState().messages[params.sessionId] || [];

      try {
        const headers = await dealerAuthHeadersAsync(draftDealerId, apiRole);
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const responseText = await res.text();
        let result: {
          data?: { id?: string; missingFields?: string[] };
          message?: string;
        } = {};
        try {
          result = JSON.parse(responseText) as typeof result;
        } catch {
          result = { message: responseText.slice(0, 200) };
        }

        if (!res.ok) {
          logChatDraftSave("error", {
            status: res.status,
            statusText: res.statusText,
            endpoint,
            dealerId: draftDealerId,
            body: result,
          });
          return {
            text: "เกิดข้อผิดพลาดในการบันทึกประกาศครับ รบกวนลองใหม่อีกครั้ง",
          };
        }

        const newDraftId = result.data?.id;
        let missingFields = [...(result.data?.missingFields ?? [])];
        let uploadNote = "";
        const imagesToUpload = newDraftId
          ? collectChatImagesForDraft(storageScopeKey, params.sessionId, sessionMessages)
          : [];

        if (newDraftId && imagesToUpload.length > 0) {
          try {
            const uploadResult = await uploadChatImagesToDraft(
              imagesToUpload,
              newDraftId,
              draftDealerId,
              apiRole
            );
            clearChatImagesForDraft(storageScopeKey, params.sessionId);
            missingFields = resolveMissingFieldsAfterChatImageUpload(
              missingFields,
              uploadResult.storedUrls
            );
            if (uploadResult.storedUrls.length > 0) {
              uploadNote = `\n\nแนบรูปภาพแล้ว ${uploadResult.storedUrls.length} รูปครับ`;
            }
          } catch (uploadErr) {
            console.error("[chat-image-attachment-v1-upload]", uploadErr);
            uploadNote =
              "\n\nแนบรูปไม่สำเร็จทั้งหมด กรุณาลองอัปโหลดใหม่ในหน้าประกาศที่ยังไม่ลงขาย";
          }
        }

        const missingLabels = getChatDraftSaveMissingLabels(missingFields);
        const saveText =
          missingLabels.length > 0
            ? `บันทึกฉบับร่างแล้วครับ แต่ยังต้องเติมก่อนส่งเข้าตลาด:\n${missingLabels.map((item) => `- ${item}`).join("\n")}\n\nกรุณาเติมข้อมูลเหล่านี้ในหน้าประกาศที่ยังไม่ลงขายก่อนกดลงขายครับ${uploadNote}`
            : `บันทึกประกาศสำเร็จเรียบร้อยแล้วครับ! กดปุ่ม “ดูประกาศที่บันทึกไว้” เพื่อเปิดรายการที่เพิ่งบันทึก หรือเข้าไปเพิ่มรูป แก้ไขข้อมูล และกดลงขายได้เลย ปังปุริเย่!${uploadNote}`;

        notifyDealerDraftSaved(newDraftId);
        return { text: saveText, savedDraftId: newDraftId };
      } catch (e) {
        logChatDraftSave("error", {
          endpoint,
          error: e instanceof Error ? e.message : String(e),
        });
        return {
          text: "เกิดข้อผิดพลาดในการเชื่อมต่อระบบบันทึกประกาศครับ รบกวนลองใหม่อีกครั้ง",
        };
      }
    },
    [
      chatScope,
      isAdmin,
      isDealer,
      isSignedIn,
      setView,
      storageScopeKey,
      user,
    ]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      pendingImages?: PendingChatImageAttachment[]
    ) => {
      const trimmed = text.trim();
      const imageAttachments = pendingImages ?? [];
      const hasImages = imageAttachments.length > 0;
      if ((!trimmed && !hasImages) || isGenerating) return;

      let sessionId = activeSessionId;
      if (!sessionId) {
        try {
          sessionId = await createSession(chatScope, "ปรึกษาซื้อขาย");
        } catch (err) {
          console.warn("[chat] unable to create local session", err);
          throw new Error("เตรียมบทสนทนาไม่สำเร็จครับ กรุณารีเฟรชหน้าแล้วลองใหม่");
        }
      }

      const attachmentMeta = toChatImageMessageAttachments(imageAttachments);
      const userMsg = await addMessage(
        sessionId,
        "user",
        trimmed || "(แนบรูป)",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        attachmentMeta.length > 0 ? attachmentMeta : undefined
      );
      registerChatImageMessageFiles(
        storageScopeKey,
        sessionId,
        userMsg.id,
        imageAttachments,
        attachmentMeta
      );

      setGenerating(true);
      updateStreamedReply("", []);

      const historyAfterUser =
        useChatStore.getState().messages[sessionId] || [];

      const pendingListingContext =
        findLatestPendingListingContext(historyAfterUser);
      const latestSavedDraftId = findLatestSavedDraftId(historyAfterUser);
      const isListingCreateWithImages = hasImages && trimmed && isSellIntent(trimmed);
      const activePrecheck = getPrecheckContext(sessionId);
      const precheckActive =
        activePrecheck?.stage &&
        activePrecheck.stage !== "idle" &&
        activePrecheck.stage !== "confirmed_create_draft";
      const startCreateIntent = isStartCreateListingIntent(trimmed) || isListingCreateWithImages;
      const confirmCreateIntent =
        isConfirmCreateListingIntent(trimmed) || isSaveListingChatAction(trimmed);
      const continuePrecheckIntent =
        precheckActive && !startCreateIntent && !confirmCreateIntent;

      if (startCreateIntent || confirmCreateIntent || continuePrecheckIntent) {
        const resolvePrecheckDraftAttachments = ():
          | ReturnType<typeof toChatImageMessageAttachments>
          | undefined => {
          const msgs = useChatStore.getState().messages[sessionId] || [];
          const display = collectDraftPreviewDisplayAttachments(
            storageScopeKey,
            sessionId,
            msgs
          );
          if (display.length > 0) return display;
          if (attachmentMeta.length > 0) return attachmentMeta;
          return undefined;
        };

        const isPureConfirmMessage =
          isConfirmCreateListingIntent(trimmed) ||
          trimmed === CHAT_CONFIRM_CREATE_DRAFT_ACTION ||
          trimmed === "ตกลง สร้างเลย" ||
          trimmed === "เอาเลย" ||
          trimmed === "บันทึกประกาศ";

        if (confirmCreateIntent) {
          if (
            !hasCoreFieldsComplete(
              activePrecheck?.fields ?? {},
              activePrecheck?.visionSummary
            ) &&
            pendingListingContext?.fields
          ) {
            bootstrapPrecheckFields(sessionId, pendingListingContext.fields);
          }
          if (!isPureConfirmMessage) {
            upsertPrecheckFromMessage(sessionId, trimmed);
          }

          const confirmPrecheck = getPrecheckContext(sessionId);
          const confirmFields = confirmPrecheck?.fields ?? {};
          const confirmVision = confirmPrecheck?.visionSummary;
          const missingCore = getMissingCoreFieldLabels(
            mergeEffectivePrecheckFields(confirmFields, confirmVision)
          );

          if (missingCore.length > 0) {
            setPrecheckStage(sessionId, "collecting_missing_fields");
            updateStreamedReply(buildMissingFieldsPrompt(missingCore));
            await finalizeStreamedReply(sessionId);
            setGenerating(false);
            return;
          }

          setPrecheckStage(sessionId, "confirmed_create_draft");
          const saved = await saveDealerDraftFromFields({
            sessionId,
            fields: confirmFields as Record<string, unknown>,
          });
          updateStreamedReply(saved.text);
          await finalizeStreamedReply(
            sessionId,
            undefined,
            undefined,
            undefined,
            undefined,
            saved.savedDraftId,
            resolvePrecheckDraftAttachments()
          );
          clearPrecheckContext(sessionId);
          setGenerating(false);
          return;
        }

        if (startCreateIntent) {
          upsertPrecheckFromMessage(sessionId, trimmed);
          if (hasImages) {
            markChatImageMessageForPendingListing(
              storageScopeKey,
              sessionId,
              userMsg.id
            );
            setPrecheckStage(sessionId, "analyzing_images");
            try {
              const first = imageAttachments[0];
              const imageBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result ?? ""));
                reader.onerror = () => reject(new Error("image-read-failed"));
                reader.readAsDataURL(first.optimizedFile);
              });
              const analysis = await aiVisionService.analyzeCarImage(imageBase64);
              const visionSummary: VisionObservationSummary = {
                brand: analysis.brand?.trim() || undefined,
                model: analysis.model?.trim() || undefined,
                color: analysis.color?.trim() || undefined,
                bodyType: analysis.bodyType?.trim() || undefined,
                condition: analysis.condition?.trim() || undefined,
              };
              setPrecheckVisionSummary(sessionId, visionSummary);
              upsertPrecheckFromMessage(
                sessionId,
                [visionSummary.brand, visionSummary.model, visionSummary.color]
                  .filter(Boolean)
                  .join(" ")
              );
            } catch (visionErr) {
              console.warn("[chat-precheck] vision analyze skipped:", visionErr);
            }
          }
        } else if (continuePrecheckIntent) {
          upsertPrecheckFromMessage(sessionId, trimmed);
        }

        const latestPrecheck = getPrecheckContext(sessionId);
        if (!latestPrecheck) {
          setGenerating(false);
          return;
        }

        const refCode = ensurePublicRefCode(sessionId);
        const missingCore = getMissingCoreFieldLabels(
          mergeEffectivePrecheckFields(
            latestPrecheck.fields,
            latestPrecheck.visionSummary
          )
        );
        const visionHints = buildKnownVisionHints(
          latestPrecheck.fields,
          latestPrecheck.visionSummary
        );
        const visionText = buildPrecheckVisionReply(latestPrecheck.visionSummary);
        const draftPreviewAttachments = resolvePrecheckDraftAttachments();
        const imageCount = draftPreviewAttachments?.length ?? 0;
        const alreadyAwaitingConfirm = isPrecheckAwaitingConfirm(
          latestPrecheck.stage
        );

        if (missingCore.length > 0) {
          setPrecheckStage(sessionId, "collecting_missing_fields");
          const askParts = [
            buildMissingFieldsPrompt(missingCore, visionHints),
          ];
          if (startCreateIntent && hasImages && visionText) {
            askParts.unshift(visionText, "");
          }
          updateStreamedReply(askParts.join("\n"));
          await finalizeStreamedReply(sessionId);
          setGenerating(false);
          return;
        }

        if (alreadyAwaitingConfirm && continuePrecheckIntent) {
          const refreshed = buildDraftCopyReadyReply(
            latestPrecheck.fields,
            refCode,
            CHAT_CONFIRM_CREATE_DRAFT_ACTION,
            latestPrecheck.visionSummary,
            imageCount
          );
          updateStreamedReply(refreshed);
          await finalizeStreamedReply(
            sessionId,
            undefined,
            undefined,
            true,
            latestPrecheck.fields,
            undefined,
            resolvePrecheckDraftAttachments()
          );
          setGenerating(false);
          return;
        }

        setPrecheckStage(sessionId, "draft_copy_ready");
        updateStreamedReply(
          buildDraftCopyReadyReply(
            latestPrecheck.fields,
            refCode,
            CHAT_CONFIRM_CREATE_DRAFT_ACTION,
            latestPrecheck.visionSummary,
            imageCount
          )
        );
        await finalizeStreamedReply(
          sessionId,
          undefined,
          undefined,
          true,
          latestPrecheck.fields,
          undefined,
          resolvePrecheckDraftAttachments()
        );
        setGenerating(false);
        return;
      }

      if (hasImages && latestSavedDraftId && !isListingCreateWithImages) {
        const draftImageBlock = resolveChatDraftSaveBlockMessage({
          isSignedIn,
          chatScope,
          isDealer,
          isAdmin,
        });
        if (draftImageBlock) {
          updateStreamedReply(draftImageBlock);
          await finalizeStreamedReply(sessionId);
          setGenerating(false);
          return;
        }
        const draftDealerId = resolveDealerIdFromUser(user);
        const apiRole = isAdmin ? "admin" : "dealer";
        const imagesForMessage = getChatImagesForMessage(
          storageScopeKey,
          sessionId,
          userMsg.id
        );
        try {
          await uploadChatImagesToDraft(
            imagesForMessage,
            latestSavedDraftId,
            draftDealerId,
            apiRole
          );
          const ack = buildSavedDraftImageAckReply(imageAttachments.length);
          updateStreamedReply(ack);
          await finalizeStreamedReply(
            sessionId,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            attachmentMeta
          );
        } catch (uploadErr) {
          console.error("[chat-image-attachment-v1-followup-upload]", {
            draftId: latestSavedDraftId,
            dealerId: draftDealerId,
            error:
              uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
          });
          updateStreamedReply(
            "รับรูปภาพรถแล้วครับ แต่เพิ่มเข้าไปในประกาศไม่สำเร็จ กรุณาลองส่งรูปอีกครั้งครับ"
          );
          await finalizeStreamedReply(sessionId);
        }
        setGenerating(false);
        return;
      }

      if (hasImages && pendingListingContext && !isListingCreateWithImages) {
        markChatImageMessageForPendingListing(
          storageScopeKey,
          sessionId,
          userMsg.id
        );
        const ack = buildPendingListingImageAckReply(
          imageAttachments.length,
          pendingListingContext
        );
        updateStreamedReply(ack);
        await finalizeStreamedReply(
          sessionId,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          attachmentMeta
        );
        setGenerating(false);
        return;
      }

      if (hasImages && !pendingListingContext && !isListingCreateWithImages) {
        const ack = buildNoListingImageAckReply(imageAttachments.length);
        updateStreamedReply(ack);
        await finalizeStreamedReply(
          sessionId,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          attachmentMeta
        );
        setGenerating(false);
        return;
      }

      const inventory = await fetchInventoryForChat();

      const orchestrated = trimmed
        ? tryOrchestrateChatReply(trimmed, inventory, {
            attachedImageCount: hasImages ? imageAttachments.length : undefined,
          })
        : null;
      if (orchestrated?.skipGemini) {
        if (isSaveListingChatAction(trimmed)) {
          const lastDraftMsg = historyAfterUser
            .slice()
            .reverse()
            .find((m) => m.isDraftPreview && m.draftFields);
          if (lastDraftMsg?.draftFields) {
            const { payload, missing } = buildDealerDraftPayloadFromChat(
              lastDraftMsg.draftFields
            );
            const draftSaveBlock = resolveChatDraftSaveBlockMessage({
              isSignedIn,
              chatScope,
              isDealer,
              isAdmin,
            });

            if (draftSaveBlock) {
              orchestrated.text = draftSaveBlock;
              if (!isSignedIn) {
                setChatLoginReturnView("chat");
                setView("login");
              }
            } else {
              const draftDealerId = resolveDealerIdFromUser(user);
              const apiRole = isAdmin ? "admin" : "dealer";
              const endpoint = "/api/dealer/drafts/new";

              logChatStorageDebug(chatScope, { draftDealerId });
              logChatDraftSave("request", {
                endpoint,
                method: "POST",
                dealerId: draftDealerId,
                userId: chatScope.userId,
                chatStorageKey: chatScope.storageKey,
                headers: {
                  "X-Dealer-Id": draftDealerId,
                  "X-User-Role": apiRole,
                  Authorization: "(Bearer redacted)",
                },
                payload,
              });

              try {
                const headers = await dealerAuthHeadersAsync(draftDealerId, apiRole);
                const res = await fetch(endpoint, {
                  method: "POST",
                  headers,
                  body: JSON.stringify(payload),
                });
                const responseText = await res.text();
                let result: {
                  data?: {
                    id?: string;
                    missingFields?: string[];
                    missingLabelsThai?: string[];
                  };
                  message?: string;
                  missing?: string[];
                } =
                  {};
                try {
                  result = JSON.parse(responseText) as typeof result;
                } catch {
                  result = { message: responseText.slice(0, 200) };
                }

                if (res.ok) {
                  const newDraftId = result.data?.id;
                  if (newDraftId) {
                    logDealerDraftEditUrl(newDraftId);
                  }
                  logChatDraftSave("response", {
                    status: res.status,
                    draftId: newDraftId,
                    dealerId: draftDealerId,
                  });
                  logChatStorageDebug(chatScope, {
                    draftDealerId,
                    latestDraftId: newDraftId ?? null,
                  });

                  let missingFields = [...(result.data?.missingFields ?? [])];
                  let uploadNote = "";
                  const sessionMessages =
                    useChatStore.getState().messages[sessionId] || [];
                  const imagesToUpload = newDraftId
                    ? collectChatImagesForDraft(
                        storageScopeKey,
                        sessionId,
                        sessionMessages
                      )
                    : [];

                  if (newDraftId && imagesToUpload.length > 0) {
                    try {
                      const uploadResult = await uploadChatImagesToDraft(
                        imagesToUpload,
                        newDraftId,
                        draftDealerId,
                        apiRole
                      );
                      clearChatImagesForDraft(storageScopeKey, sessionId);
                      const failedCount = uploadResult.failed?.length ?? 0;
                      const uploadedCount = uploadResult.storedUrls.length;
                      const totalCount = imagesToUpload.length;
                      if (uploadedCount > 0) {
                        missingFields = resolveMissingFieldsAfterChatImageUpload(
                          missingFields,
                          uploadResult.storedUrls
                        );
                        uploadNote =
                          failedCount > 0
                            ? `\n\nแนบรูปสำเร็จ ${uploadedCount} จาก ${totalCount} รูปครับ มีบางรูปอัปโหลดไม่สำเร็จ กรุณาตรวจสอบในหน้าประกาศที่ยังไม่ลงขายอีกครั้ง`
                            : `\n\nแนบรูปภาพแล้ว ${uploadedCount} รูปครับ`;
                      } else if (failedCount > 0 || totalCount > 0) {
                        uploadNote =
                          `\n\nแนบรูปไม่สำเร็จทั้งหมด ${totalCount} รูป กรุณาลองอัปโหลดใหม่ในหน้าประกาศที่ยังไม่ลงขาย`;
                      }
                    } catch (uploadErr) {
                      console.error("[chat-image-attachment-v1-upload]", {
                        draftId: newDraftId,
                        dealerId: draftDealerId,
                        error:
                          uploadErr instanceof Error
                            ? uploadErr.message
                            : String(uploadErr),
                      });
                      uploadNote =
                        `\n\nแนบรูปไม่สำเร็จทั้งหมด ${imagesToUpload.length} รูป กรุณาลองอัปโหลดใหม่ในหน้าประกาศที่ยังไม่ลงขาย`;
                    }
                  }

                  const missingLabels = getChatDraftSaveMissingLabels(missingFields);
                  const saveText =
                    missingLabels.length > 0
                      ? `บันทึกฉบับร่างแล้วครับ แต่ยังต้องเติมก่อนส่งเข้าตลาด:\n${missingLabels.map((item) => `- ${item}`).join("\n")}\n\nกรุณาเติมข้อมูลเหล่านี้ในหน้าประกาศที่ยังไม่ลงขายก่อนกดลงขายครับ${uploadNote}`
                      : `บันทึกประกาศสำเร็จเรียบร้อยแล้วครับ! กดปุ่ม “ดูประกาศที่บันทึกไว้” เพื่อเปิดรายการที่เพิ่งบันทึก หรือเข้าไปเพิ่มรูป แก้ไขข้อมูล และกดลงขายได้เลย ปังปุริเย่!${uploadNote}`;
                  orchestrated.text = saveText;
                  orchestrated.savedDraftId = newDraftId;
                  notifyDealerDraftSaved(newDraftId);
                } else {
                  logChatDraftSave("error", {
                    status: res.status,
                    statusText: res.statusText,
                    endpoint,
                    dealerId: draftDealerId,
                    body: result,
                    raw: responseText.slice(0, 500),
                  });
                  orchestrated.text =
                    "เกิดข้อผิดพลาดในการบันทึกประกาศครับ รบกวนลองใหม่อีกครั้ง";
                }
              } catch (e) {
                logChatDraftSave("error", {
                  endpoint,
                  dealerId: draftDealerId,
                  error: e instanceof Error ? e.message : String(e),
                });
                orchestrated.text =
                  "เกิดข้อผิดพลาดในการเชื่อมต่อระบบบันทึกประกาศครับ รบกวนลองใหม่อีกครั้ง";
              }
            }
          } else {
            logChatDraftSave("error", {
              reason: "no-draft-preview-in-history",
              chatStorageKey: chatScope.storageKey,
              messageCount: historyAfterUser.length,
            });
            orchestrated.text =
              "ไม่พบข้อมูลรถที่กำลังจะลงขายครับ รบกวนพิมพ์รายละเอียดรถใหม่อีกครั้งนะครับ";
          }
        }

        if (orchestrated.isDraftPreview && hasImages) {
          markChatImageMessageForPendingListing(
            storageScopeKey,
            sessionId,
            userMsg.id
          );
        }

        updateStreamedReply(
          "",
          orchestrated.carCards,
          orchestrated.hasMoreCars,
          orchestrated.isDraftPreview,
          orchestrated.draftFields
        );
        let acc = "";
        for (const chunk of chunkTextForStream(orchestrated.text, 18)) {
          acc += chunk;
          updateStreamedReply(
            acc,
            orchestrated.carCards,
            orchestrated.hasMoreCars,
            orchestrated.isDraftPreview,
            orchestrated.draftFields
          );
          await new Promise((r) => setTimeout(r, 12));
        }
        await finalizeStreamedReply(
          sessionId,
          orchestrated.carCards,
          orchestrated.hasMoreCars,
          orchestrated.isDraftPreview,
          orchestrated.draftFields,
          orchestrated.savedDraftId,
          orchestrated.isDraftPreview && hasImages ? attachmentMeta : undefined
        );
        setGenerating(false);
        return;
      }

      let accumulatedString = "";

      const { analyzeSentiment } = await import(
        "../../services/ai/moods/emotionalEngine"
      );
      const sentiment = analyzeSentiment(trimmed);
      const activePersonality = personalities[activePresetId];

      const { aiSkillService } = await import(
        "../../services/ai/skills/aiSkillService"
      );
      const { chainedPrompt } = await aiSkillService.evaluateAndChainSkills(
        trimmed,
        {
          userRole: (user as { role?: string })?.role || "client",
          sentiment,
          chatId: sessionId,
        }
      );

      const modifiedPersonality = {
        ...activePersonality,
        customSystemInstruction:
          (activePersonality?.customSystemInstruction || "") +
          (chainedPrompt || ""),
      };

      await aiService.streamChat(
        trimmed,
        historyAfterUser,
        {
          presetId: activePresetId,
          customInstructionOverrides: modifiedPersonality,
          sentiment,
          convoCount: historyAfterUser.length,
          userPreferences,
        },
        (chunk) => {
          accumulatedString += chunk;
          updateStreamedReply(accumulatedString);
        },
        async () => {
          await finalizeStreamedReply(sessionId);
          setGenerating(false);
        },
        async (err) => {
          console.error("AI Streaming error callback:", err);
          const errMsg = err?.message ?? "";
          const useMock =
            /gemini|api key|missing|401|403|invalid/i.test(errMsg) ||
            errMsg.includes("status code");

          if (useMock) {
            try {
              const mockReply = await fetchMockChatReply(trimmed);
              const mockOrchestrated = tryOrchestrateChatReply(trimmed, inventory);
              if (mockOrchestrated) {
                updateStreamedReply(
                  mockOrchestrated.text,
                  mockOrchestrated.carCards,
                  mockOrchestrated.hasMoreCars,
                  mockOrchestrated.isDraftPreview,
                  mockOrchestrated.draftFields
                );
                await finalizeStreamedReply(
                  sessionId,
                  mockOrchestrated.carCards,
                  mockOrchestrated.hasMoreCars,
                  mockOrchestrated.isDraftPreview,
                  mockOrchestrated.draftFields
                );
              } else {
                updateStreamedReply(mockReply);
                await finalizeStreamedReply(sessionId);
              }
              setGenerating(false);
              return;
            } catch (mockErr) {
              console.warn("Mock chat fallback failed:", mockErr);
            }
          }

          setGenerating(false);
          updateStreamedReply("", []);

          await addMessage(
            sessionId,
            "ai",
            "ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งครับ"
          );
        }
      );
    },
    [
      activeSessionId,
      activePresetId,
      personalities,
      isGenerating,
      messages,
      userPreferences,
      user,
      chatScope,
      storageScopeKey,
      isDealer,
      isAdmin,
      isSignedIn,
      setView,
      role,
      addMessage,
      createSession,
      setGenerating,
      updateStreamedReply,
      finalizeStreamedReply,
      saveDealerDraftFromFields,
    ]
  );

  const createNewChat = useCallback(
    async (title?: string) => {
      return await createSession(chatScope, title);
    },
    [chatScope, createSession]
  );

  const removeChat = useCallback(
    async (sessionId: string) => {
      await deleteSession(chatScope, sessionId);
    },
    [chatScope, deleteSession]
  );

  const switchChatSession = useCallback(async (sessionId: string) => {
    const state = useChatStore.getState();
    const exists = state.sessions.some((s) => s.id === sessionId);
    if (!exists) return;
    await selectSession(chatScope, sessionId);
  }, [chatScope, selectSession]);

  const chatActor = useMemo(
    () => resolveChatActorDisplay(user, chatScope),
    [user, chatScope]
  );

  return {
    sessions,
    activeSessionId,
    activeSession: sessions.find((s) => s.id === activeSessionId) || null,
    currentMessages: activeSessionId ? messages[activeSessionId] || [] : [],
    chatScope,
    chatActor,
    isGenerating,
    streamedReply,
    streamedCarCards,
    streamedHasMoreCars,
    userPreferences,
    isAnalyzingMemory,
    activePresetId,
    personalities,
    isLoadingPersonalities,
    setPresetId,
    updatePersonalityInstruction,
    initializeChat,
    sendMessage,
    createNewChat,
    removeChat,
    selectSession: switchChatSession,
    editMessage,
  };
}
