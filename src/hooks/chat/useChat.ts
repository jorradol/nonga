import { useCallback } from "react";
import { useChatStore } from "../../stores/chat/chatStore";
import { useAppStore } from "../../store";
import { aiService } from "../../services/ai/aiService";
import { buildMockChatReply } from "../../services/ai/chatMockFallback";

async function fetchMockChatReply(userText: string): Promise<string> {
  try {
    const res = await fetch(`/api/cars?_=${Date.now()}`, { cache: "no-store" });
    const json = await res.json();
    const cars = json?.data ?? [];
    if (typeof import.meta !== "undefined") {
      const isDev = Boolean(
        (import.meta as { env?: { DEV?: boolean } }).env?.DEV
      );
      if (isDev) {
        console.debug("[marketplace:ai-context]", {
          inventoryCount: cars.length,
          source: "GET /api/cars",
        });
      }
    }
    return buildMockChatReply(userText, cars);
  } catch {
    return buildMockChatReply(userText, []);
  }
}

export function useChat() {
  const {
    sessions,
    activeSessionId,
    messages,
    isGenerating,
    streamedReply,
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

  // Trigger loading chat data
  const initializeChat = useCallback(async () => {
    if (userId) {
      await loadSessions(userId);
      await loadUserPreferences(userId);
      await loadPersonalitiesList();
    }
  }, [userId, loadSessions, loadUserPreferences, loadPersonalitiesList]);

  // Handler to send a chat message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !activeSessionId || isGenerating) return;

    // 1. Save user message to database / store
    await addMessage(activeSessionId, "user", text);

    // 2. Set generating status and reset buffer
    setGenerating(true);
    updateStreamedReply("");

    // 3. Collect active message history to pass as reference
    const currentHistory = messages[activeSessionId] || [];

    let accumulatedString = "";

    // 4. Calculate current emotion and sentiment on user text
    const { analyzeSentiment } = await import("../../services/ai/moods/emotionalEngine");
    const sentiment = analyzeSentiment(text);
    const activePersonality = personalities[activePresetId];

    // Evaluate Dynamic AI Skills
    const { aiSkillService } = await import("../../services/ai/skills/aiSkillService");
    const { chainedPrompt } = await aiSkillService.evaluateAndChainSkills(text, {
      userRole: (user as any)?.role || "client",
      sentiment,
      chatId: activeSessionId
    });

    const modifiedPersonality = {
      ...activePersonality,
      customSystemInstruction: (activePersonality?.customSystemInstruction || "") + (chainedPrompt || "")
    };

    // 5. Fire the streaming fetch with complete metadata
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
            updateStreamedReply(mockReply);
            await finalizeStreamedReply(activeSessionId);
            setGenerating(false);
            return;
          } catch (mockErr) {
            console.warn("Mock chat fallback failed:", mockErr);
          }
        }

        setGenerating(false);
        updateStreamedReply("");

        await addMessage(
          activeSessionId,
          "ai",
          `ขออภัยอย่างสูงครับคุณพี่สุดหล่อ! เครื่องยนต์ของน้องเอขัดข้องชั่วขณะสัญญานอินเทอร์เน็ตอาจจะดับหรือกุญแจ AI หลุดครับคร้าบ ⚡\n\n*(รายละเอียดทางเทคนิค: ${errMsg || "Unknown error"})*\n\nช่วยลองใหม่อีกสักครั้งนะคร้าบ หรือแจ้งแอดมินหลังบ้านได้เลยครับ!`
        );
      }
    );
  }, [
    activeSessionId,
    activePresetId,
    personalities,
    isGenerating,
    messages,
    userPreferences,
    addMessage,
    setGenerating,
    updateStreamedReply,
    finalizeStreamedReply,
  ]);

  const createNewChat = useCallback(async (title?: string) => {
    return await createSession(userId, title);
  }, [userId, createSession]);

  const removeChat = useCallback(async (sessionId: string) => {
    await deleteSession(userId, sessionId);
  }, [userId, deleteSession]);

  return {
    sessions,
    activeSessionId,
    activeSession: sessions.find(s => s.id === activeSessionId) || null,
    currentMessages: activeSessionId ? (messages[activeSessionId] || []) : [],
    isGenerating,
    streamedReply,
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
