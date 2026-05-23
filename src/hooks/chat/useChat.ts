import { useCallback } from "react";
import { useChatStore } from "../../stores/chat/chatStore";
import { useAppStore } from "../../store";
import { aiService } from "../../services/ai/aiService";
import {
  buildMockChatReply,
  chunkTextForStream,
} from "../../services/ai/chatMockFallback";
import { tryOrchestrateChatReply } from "../../services/ai/chat/chatSearchOrchestrator";
import type { ChatInventoryCar } from "../../services/ai/chat/marketplaceChatSearch";

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
  const userId = user?.uid || "guest-user-100";

  const initializeChat = useCallback(async () => {
    if (userId) {
      await loadSessions(userId);
      await loadUserPreferences(userId);
      await loadPersonalitiesList();
    }
  }, [userId, loadSessions, loadUserPreferences, loadPersonalitiesList]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !activeSessionId || isGenerating) return;

      await addMessage(activeSessionId, "user", text);

      setGenerating(true);
      updateStreamedReply("", []);

      const currentHistory = messages[activeSessionId] || [];
      const inventory = await fetchInventoryForChat();

      const orchestrated = tryOrchestrateChatReply(text, inventory);
      if (orchestrated?.skipGemini) {
        // Handle Draft Creation API call if it's the "บันทึกเป็น Draft" action
        if (text.trim() === "บันทึกเป็น Draft") {
          // Find the last draft fields from history
          const lastDraftMsg = currentHistory.slice().reverse().find(m => m.isDraftPreview && m.draftFields);
          if (lastDraftMsg && lastDraftMsg.draftFields) {
            try {
              const draftData = lastDraftMsg.draftFields;
              
              // Call the dealer draft API
              const res = await fetch("/api/admin/draft-inventory/new", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  brand: draftData.brand,
                  model: draftData.model,
                  year: draftData.year,
                  price: draftData.price,
                  mileage: draftData.mileage,
                  color: draftData.color,
                  description: draftData.description,
                  title: `${draftData.brand || ""} ${draftData.model || ""} ${draftData.year || ""}`.trim(),
                  dealerId: user?.uid || "dealer-123" // Fallback for testing
                })
              });
              
              if (res.ok) {
                const result = await res.json();
                orchestrated.text = `บันทึก Draft สำเร็จเรียบร้อยแล้วครับ! ลุงสามารถไปดูและแก้ไขต่อได้ที่หน้าจัดการรถครับ\n(Draft ID: ${result.data?.id || 'N/A'})`;
              } else {
                orchestrated.text = "เกิดข้อผิดพลาดในการบันทึก Draft ครับ รบกวนลองใหม่อีกครั้ง";
              }
            } catch (e) {
              console.error("Failed to save draft:", e);
              orchestrated.text = "เกิดข้อผิดพลาดในการเชื่อมต่อระบบบันทึก Draft ครับ";
            }
          } else {
            orchestrated.text = "ไม่พบข้อมูลรถที่กำลังจะลงขายครับ รบกวนพิมพ์รายละเอียดรถใหม่อีกครั้งนะครับ";
          }
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
          orchestrated.draftFields
        );
        setGenerating(false);
        return;
      }

      let accumulatedString = "";

      const { analyzeSentiment } = await import(
        "../../services/ai/moods/emotionalEngine"
      );
      const sentiment = analyzeSentiment(text);
      const activePersonality = personalities[activePresetId];

      const { aiSkillService } = await import(
        "../../services/ai/skills/aiSkillService"
      );
      const { chainedPrompt } = await aiSkillService.evaluateAndChainSkills(
        text,
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
        text,
        currentHistory,
        {
          presetId: activePresetId,
          customInstructionOverrides: modifiedPersonality,
          sentiment,
          convoCount: currentHistory.length,
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
              const mockReply = await fetchMockChatReply(text);
              const mockOrchestrated = tryOrchestrateChatReply(text, inventory);
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
      addMessage,
      setGenerating,
      updateStreamedReply,
      finalizeStreamedReply,
    ]
  );

  const createNewChat = useCallback(
    async (title?: string) => {
      return await createSession(userId, title);
    },
    [userId, createSession]
  );

  const removeChat = useCallback(
    async (sessionId: string) => {
      await deleteSession(userId, sessionId);
    },
    [userId, deleteSession]
  );

  return {
    sessions,
    activeSessionId,
    activeSession: sessions.find((s) => s.id === activeSessionId) || null,
    currentMessages: activeSessionId ? messages[activeSessionId] || [] : [],
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
