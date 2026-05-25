import { useCallback, useEffect, useMemo, useRef } from "react";
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
import { dealerAuthHeaders } from "../../utils/apiAuthHeaders";
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
  const loadedScopeRef = useRef<string | null>(null);

  const hydrateChatForScope = useCallback(async () => {
    if (loadedScopeRef.current !== storageScopeKey) {
      if (loadedScopeRef.current) {
        clearChatImageAttachmentScope(loadedScopeRef.current);
      }
      resetChatState();
      loadedScopeRef.current = storageScopeKey;
    }
    await loadSessions(storageScopeKey);
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
    await hydrateChatForScope();
  }, [hydrateChatForScope]);

  const sendMessage = useCallback(
    async (
      text: string,
      pendingImages?: PendingChatImageAttachment[]
    ) => {
      const trimmed = text.trim();
      const imageAttachments = pendingImages ?? [];
      const hasImages = imageAttachments.length > 0;
      if ((!trimmed && !hasImages) || !activeSessionId || isGenerating) return;

      const attachmentMeta = toChatImageMessageAttachments(imageAttachments);
      const userMsg = await addMessage(
        activeSessionId,
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
        activeSessionId,
        userMsg.id,
        imageAttachments,
        attachmentMeta
      );

      setGenerating(true);
      updateStreamedReply("", []);

      const historyAfterUser =
        useChatStore.getState().messages[activeSessionId] || [];

      const pendingListingContext =
        findLatestPendingListingContext(historyAfterUser);
      const latestSavedDraftId = findLatestSavedDraftId(historyAfterUser);
      const isListingCreateWithImages = hasImages && trimmed && isSellIntent(trimmed);

      if (hasImages && latestSavedDraftId) {
        const draftDealerId = resolveDealerIdFromUser(user);
        const apiRole = isAdmin ? "admin" : "dealer";
        const imagesForMessage = getChatImagesForMessage(
          storageScopeKey,
          activeSessionId,
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
          await finalizeStreamedReply(activeSessionId);
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
          await finalizeStreamedReply(activeSessionId);
        }
        setGenerating(false);
        return;
      }

      if (hasImages && pendingListingContext) {
        markChatImageMessageForPendingListing(
          storageScopeKey,
          activeSessionId,
          userMsg.id
        );
        const ack = buildPendingListingImageAckReply(
          imageAttachments.length,
          pendingListingContext
        );
        updateStreamedReply(ack);
        await finalizeStreamedReply(activeSessionId);
        setGenerating(false);
        return;
      }

      if (hasImages && !pendingListingContext && !isListingCreateWithImages) {
        const ack = buildNoListingImageAckReply(imageAttachments.length);
        updateStreamedReply(ack);
        await finalizeStreamedReply(activeSessionId);
        setGenerating(false);
        return;
      }

      const inventory = await fetchInventoryForChat();

      const orchestrated = trimmed
        ? tryOrchestrateChatReply(trimmed, inventory)
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
            } else if (!payload) {
              orchestrated.text = `ข้อมูลยังไม่ครบ (${missing.join(", ")}) ครับ รบกวนพิมพ์รายละเอียดเพิ่มแล้วกดบันทึกประกาศอีกครั้ง`;
              logChatDraftSave("error", {
                reason: "incomplete-fields",
                missing,
                draftFields: lastDraftMsg.draftFields,
                chatScope: chatScope.storageKey,
              });
            } else {
              const draftDealerId = resolveDealerIdFromUser(user);
              const apiRole = isAdmin ? "admin" : "dealer";
              const headers = dealerAuthHeaders(draftDealerId, apiRole);
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
                  Authorization: "(Bearer dealer token)",
                },
                payload,
              });

              try {
                const res = await fetch(endpoint, {
                  method: "POST",
                  headers,
                  body: JSON.stringify(payload),
                });
                const responseText = await res.text();
                let result: { data?: { id?: string }; message?: string; missing?: string[] } =
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

                  let saveText =
                    "บันทึกประกาศสำเร็จเรียบร้อยแล้วครับ! สามารถเข้าไปเพิ่มรูป แก้ไขข้อมูล หรือกดลงขายได้ที่รายการประกาศนี้ ปังปุริเย่!";
                  const sessionMessages =
                    useChatStore.getState().messages[activeSessionId] || [];
                  const imagesToUpload = newDraftId
                    ? collectChatImagesForDraft(
                        storageScopeKey,
                        activeSessionId,
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
                      clearChatImagesForDraft(storageScopeKey, activeSessionId);
                      const failedCount = uploadResult.failed?.length ?? 0;
                      if (failedCount > 0) {
                        saveText =
                          "บันทึกประกาศสำเร็จแล้วครับ แต่มีบางรูปที่อัปโหลดไม่สำเร็จ กรุณาตรวจสอบอีกครั้ง";
                      } else if (uploadResult.storedUrls.length > 0) {
                        saveText +=
                          "\n\nแนบรูปจากแชทไปกับประกาศแล้วครับ";
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
                      saveText =
                        "บันทึกประกาศสำเร็จแล้วครับ แต่มีบางรูปที่อัปโหลดไม่สำเร็จ กรุณาตรวจสอบอีกครั้ง";
                    }
                  }

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
            activeSessionId,
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
          activeSessionId,
          orchestrated.carCards,
          orchestrated.hasMoreCars,
          orchestrated.isDraftPreview,
          orchestrated.draftFields,
          orchestrated.savedDraftId
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
          chatId: activeSessionId,
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
          await finalizeStreamedReply(activeSessionId);
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
                  activeSessionId,
                  mockOrchestrated.carCards,
                  mockOrchestrated.hasMoreCars,
                  mockOrchestrated.isDraftPreview,
                  mockOrchestrated.draftFields
                );
              } else {
                updateStreamedReply(mockReply);
                await finalizeStreamedReply(activeSessionId);
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
            activeSessionId,
            "ai",
            `ขออภัยอย่างสูงครับคุณพี่สุดหล่อ! เครื่องยนต์ของน้องเอขัดข้องชั่วขณะสัญญานอินเทอร์เน็ตอาจจะดับหรือกุญแจ AI หลุดครับคร้าบ ⚡\n\n*(รายละเอียดทางเทคนิค: ${errMsg || "Unknown error"})*\n\nช่วยลองใหม่อีกสักครั้งนะคร้าบ หรือแจ้งแอดมินหลังบ้านได้เลยครับ!`
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
      setGenerating,
      updateStreamedReply,
      finalizeStreamedReply,
    ]
  );

  const createNewChat = useCallback(
    async (title?: string) => {
      return await createSession(storageScopeKey, title);
    },
    [storageScopeKey, createSession]
  );

  const removeChat = useCallback(
    async (sessionId: string) => {
      await deleteSession(storageScopeKey, sessionId);
    },
    [storageScopeKey, deleteSession]
  );

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
    selectSession,
    editMessage,
  };
}
