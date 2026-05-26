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
  logChatStorageDebug,
  resolveChatActorDisplay,
} from "../../utils/chatStorageScope";
import { logDealerDraftEditUrl } from "../../utils/dealer/dealerDraftNavigation";
import { resolveDealerIdFromUser } from "../../utils/dealerIdentity";
import { dealerAuthHeadersAsync } from "../../utils/apiAuthHeaders";
import { useRole } from "../auth/useRole";
import {
  isSaveListingChatAction,
  buildDealerDraftPayloadFromChat,
  logChatDraftSave,
} from "../../services/ai/chat/chatDraftActions";
import { isSellIntent } from "../../services/ai/chat/sellIntentParser";
import { uploadListingImagesApi } from "../../services/dealer/dealerListingImageApi";
import { fileToPasteUploadPayload } from "../../utils/inventoryImport/pasteUploadedImageQueue";
import {
  clearChatImageAttachmentScope,
  clearChatImagesForDraft,
  collectChatImagesForDraft,
  getChatImagesForMessage,
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
import { getPublishMissingLabelsThai } from "../../utils/dealerPublishGuard";

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
    payloads
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

  const { user } = useAppStore();
  const { isDealer, isAdmin, role } = useRole();

  const chatScope = useMemo(() => getChatStorageScope(user), [user]);
  const storageScopeKey = chatScope.storageKey;

  const hydrateChatForScope = useCallback(async (force = false) => {
    const isNewScope = lastHydratedChatScopeKey !== storageScopeKey;
    const chatState = useChatStore.getState();
    const needsInitialLoad =
      chatState.sessions.length === 0 && chatState.activeSessionId === null;
    if (!isNewScope && !force && !needsInitialLoad) return;

    if (isNewScope) {
      if (lastHydratedChatScopeKey) {
        clearChatImageAttachmentScope(lastHydratedChatScopeKey);
      }
      resetChatState();
      lastHydratedChatScopeKey = storageScopeKey;
    }

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

      if (hasImages && latestSavedDraftId && !isListingCreateWithImages) {
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
            const canSaveDealerDraft =
              chatScope.mode === "dealer" || isDealer || isAdmin;

            if (!canSaveDealerDraft) {
              orchestrated.text =
                "ต้องเข้าใช้งานในนามดีลเลอร์ก่อนจึงจะบันทึกประกาศได้ครับ — เปิดสิทธิ์ดีลเลอร์จากโปรไฟล์แล้วลองใหม่";
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
                      if (failedCount > 0) {
                        uploadNote =
                          "\n\nมีบางรูปที่อัปโหลดไม่สำเร็จ กรุณาตรวจสอบรูปภาพในหน้า Draft อีกครั้ง";
                      } else if (uploadResult.storedUrls.length > 0) {
                        missingFields = missingFields.filter((field) => field !== "image");
                        uploadNote = "\n\nแนบรูปจากแชทไปกับประกาศแล้วครับ";
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
                        "\n\nมีบางรูปที่อัปโหลดไม่สำเร็จ กรุณาตรวจสอบรูปภาพในหน้า Draft อีกครั้ง";
                    }
                  }

                  const missingLabels =
                    missingFields.length > 0
                      ? getPublishMissingLabelsThai(missingFields)
                      : result.data?.missingLabelsThai ?? missing;
                  const saveText =
                    missingLabels.length > 0
                      ? `บันทึก Draft แล้วครับ แต่ยังต้องเติมก่อนส่งเข้าตลาด:\n${missingLabels.map((item) => `- ${item}`).join("\n")}\n\nกรุณาเติมข้อมูลเหล่านี้ในหน้า Draft ก่อนกดลงขายครับ${uploadNote}`
                      : `บันทึกประกาศสำเร็จเรียบร้อยแล้วครับ! สามารถเข้าไปเพิ่มรูป แก้ไขข้อมูล หรือกดลงขายได้ที่รายการประกาศนี้ ปังปุริเย่!${uploadNote}`;
                  orchestrated.text = saveText;
                  orchestrated.savedDraftId = newDraftId;
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
      role,
      addMessage,
      createSession,
      setGenerating,
      updateStreamedReply,
      finalizeStreamedReply,
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
