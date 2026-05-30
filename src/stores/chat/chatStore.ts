import { create } from "zustand";
import { ChatSession, ChatMessage, ChatCarCardData, ChatMessageAttachment, PendingListingCardData, SavedMemberListingCardData } from "../../types";
import { AIPersonality, PersonalityPresetId } from "../../types/ai";
import { loadPersonalities, savePersonalityPreset, DEFAULT_PERSONALITIES } from "../../services/ai/personality/personalityConfig";
import {
  chatPrefsLocalKey,
} from "../../utils/chatStorageScope";
import {
  isEphemeralGuestChatScope,
  type ChatStorageScope,
} from "../../utils/chatStorageScope";
import { db, isMockConfig } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  appendChatMessage,
  chatStorageScopeToHistoryScope,
  createChatSession,
  deleteChatSession,
  loadChatMessages,
  loadChatSessions,
  sessionMatchesScope,
  updateChatMessageText,
  updateChatSessionMetadata,
} from "../../services/chat/chatHistoryService";

export interface AIUserProfile {
  userName: string | null;
  preferredBrands: string[];
  preferredBudget: string | null;
  focusArea: "ev" | "luxury" | "performance" | "general" | null;
  preferredFuelType: "electric" | "hybrid" | "petrol" | "diesel" | null;
  userNotes: string | null;
}

export type AddMessageListingExtras = {
  isPendingListingCard?: boolean;
  pendingListingCard?: PendingListingCardData;
  isSavedMemberListingCard?: boolean;
  savedMemberListingCard?: SavedMemberListingCardData;
  isPublishAwaitingConfirm?: boolean;
};

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Record<string, ChatMessage[]>;
  isGenerating: boolean;
  streamedReply: string;
  streamedCarCards: ChatCarCardData[];
  streamedHasMoreCars: boolean;
  userPreferences: AIUserProfile | null;
  isAnalyzingMemory: boolean;
  
  // Personality parameters
  activePresetId: PersonalityPresetId;
  personalities: Record<PersonalityPresetId, AIPersonality>;
  isLoadingPersonalities: boolean;

  // Actions — storage scope partitions chat per dealer/user (see chatStorageScope.ts)
  resetChatState: () => void;
  loadSessions: (scope: ChatStorageScope) => Promise<void>;
  createSession: (scope: ChatStorageScope, title?: string) => Promise<string>;
  deleteSession: (scope: ChatStorageScope, sessionId: string) => Promise<void>;
  selectSession: (scope: ChatStorageScope, sessionId: string) => Promise<void>;
  addMessage: (
    sessionId: string,
    sender: ChatMessage["sender"],
    text: string,
    carCards?: ChatCarCardData[],
    hasMoreCars?: boolean,
    isDraftPreview?: boolean,
    draftFields?: any,
    savedDraftId?: string,
    attachments?: ChatMessageAttachment[],
    listingExtras?: AddMessageListingExtras,
    savedMemberListingId?: string
  ) => Promise<ChatMessage>;
  editMessage: (sessionId: string, messageId: string, text: string) => Promise<void>;
  updateStreamedReply: (text: string, carCards?: ChatCarCardData[], hasMoreCars?: boolean, isDraftPreview?: boolean, draftFields?: any) => void;
  finalizeStreamedReply: (
    sessionId: string,
    carCards?: ChatCarCardData[],
    hasMoreCars?: boolean,
    isDraftPreview?: boolean,
    draftFields?: any,
    savedDraftId?: string,
    attachments?: ChatMessageAttachment[],
    savedMemberListingId?: string
  ) => Promise<void>;
  setGenerating: (generating: boolean) => void;
  analyzeUserPreferences: (messages: ChatMessage[]) => Promise<void>;
  loadUserPreferences: (storageScopeKey: string) => Promise<void>;
  syncPreferencesOffline: (profile: AIUserProfile) => void;
  
  // Personality actions
  setPresetId: (id: PersonalityPresetId) => void;
  loadPersonalitiesList: () => Promise<void>;
  updatePersonalityInstruction: (presetId: PersonalityPresetId, fields: Partial<AIPersonality>) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: {},
  isGenerating: false,
  streamedReply: "",
  streamedCarCards: [],
  streamedHasMoreCars: false,
  userPreferences: null,
  isAnalyzingMemory: false,
  
  // Custom personality defaults
  activePresetId: "dealer",
  personalities: DEFAULT_PERSONALITIES,
  isLoadingPersonalities: false,

  resetChatState: () => {
    set({
      sessions: [],
      activeSessionId: null,
      messages: {},
      isGenerating: false,
      streamedReply: "",
      streamedCarCards: [],
      streamedHasMoreCars: false,
      userPreferences: null,
      isAnalyzingMemory: false,
    });
  },

  loadSessions: async (scope) => {
    try {
      if (isEphemeralGuestChatScope(scope)) {
        const current = get();
        if (current.sessions.length > 0) {
          return;
        }
        set({ sessions: [], messages: {}, activeSessionId: null });
        return;
      }

      let sessions = await loadChatSessions(scope);

      if (sessions.length === 0) {
        const welcomeId = await get().createSession(
          scope,
          "ยินดีต้อนรับสู่สต๊อกสตาร์ ⚡"
        );
        await get().addMessage(
          welcomeId,
          "ai",
          "ปังปุริเย่! 🎉 ยินดีต้อนรับสู่ระบบแนะนำอัจฉริยะ ของน้องเอคนดีคนเดิมครับผม!\n\nวันนี้คุณอยากได้คำแนะนำ คัดสรรรถยนต์ไฟฟ้า EV สเป็คเด่น รถบ้านลุยๆ หรือรถหรูหราบารมีจับด้านไหนเป็นพิเศษ พิมพ์ทักคุยกับผมได้เลยนะคร้าบ! คันนี้มีคนทักแน่ครับ 🔥"
        );
        sessions = await loadChatSessions(scope);
      }

      const currentActive = get().activeSessionId;
      const activeSessionId =
        currentActive && sessions.some((s) => s.id === currentActive)
          ? currentActive
          : sessions[0]?.id || null;
      const activeMessages = activeSessionId
        ? await loadChatMessages(scope, activeSessionId)
        : [];

      set({
        sessions,
        messages: activeSessionId ? { [activeSessionId]: activeMessages } : {},
        activeSessionId,
      });
    } catch (err) {
      console.warn("Chat history load failure:", err);
      set({ sessions: [], messages: {}, activeSessionId: null });
    }
  },

  createSession: async (scope, title) => {
    const session = await createChatSession(
      scope,
      title || `ปรึกษาซื้อขาย #${get().sessions.length + 1}`
    );

    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
      messages: {
        ...state.messages,
        [session.id]: []
      },
      streamedReply: "",
      streamedCarCards: [],
      streamedHasMoreCars: false,
    }));

    return session.id;
  },

  deleteSession: async (scope, sessionId) => {
    await deleteChatSession(scope, sessionId);
    const nextSessions = get().sessions.filter((s) => s.id !== sessionId);
    const nextMessages = { ...get().messages };
    delete nextMessages[sessionId];

    let nextActiveId = get().activeSessionId;
    if (nextActiveId === sessionId) {
      nextActiveId = nextSessions[0]?.id || null;
      if (nextActiveId && !nextMessages[nextActiveId]) {
        nextMessages[nextActiveId] = await loadChatMessages(scope, nextActiveId);
      }
    }

    set({
      sessions: nextSessions,
      messages: nextMessages,
      activeSessionId: nextActiveId,
      streamedReply: "",
      streamedCarCards: [],
      streamedHasMoreCars: false,
    });
  },

  selectSession: async (scope, sessionId) => {
    const historyScope = chatStorageScopeToHistoryScope(scope);
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session || !sessionMatchesScope(session, historyScope)) return;
    const sessionMessages =
      get().messages[sessionId] ?? (await loadChatMessages(scope, sessionId));
    set((state) => ({
      activeSessionId: sessionId,
      messages: {
        ...state.messages,
        [sessionId]: sessionMessages,
      },
      streamedReply: "",
      streamedCarCards: [],
      streamedHasMoreCars: false,
    }));
  },

  addMessage: async (sessionId, sender, text, carCards, hasMoreCars, isDraftPreview, draftFields, savedDraftId, attachments, listingExtras, savedMemberListingId) => {
    const activeSession = get().sessions.find((s) => s.id === sessionId);
    if (!activeSession) {
      throw new Error("chat_session_not_found");
    }
    const scope = {
      storageKey: activeSession.storageScopeKey ?? activeSession.userId,
      uid: activeSession.uid ?? activeSession.userId,
      dealerId: activeSession.dealerId ?? null,
      scope: activeSession.scope ?? (activeSession.dealerId ? "dealer" : "user"),
    } as const;

    const newMsg = await appendChatMessage(scope, sessionId, {
      sender,
      text,
      ...(carCards && carCards.length > 0 ? { carCards } : {}),
      ...(hasMoreCars ? { hasMoreCars } : {}),
      ...(isDraftPreview ? { isDraftPreview } : {}),
      ...(draftFields ? { draftFields } : {}),
      ...(savedDraftId ? { savedDraftId } : {}),
      ...(savedMemberListingId ? { savedMemberListingId } : {}),
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
      ...(listingExtras?.isPendingListingCard
        ? { isPendingListingCard: true, pendingListingCard: listingExtras.pendingListingCard }
        : {}),
      ...(listingExtras?.isSavedMemberListingCard &&
      listingExtras.savedMemberListingCard
        ? {
            isSavedMemberListingCard: true,
            savedMemberListingCard: listingExtras.savedMemberListingCard,
          }
        : {}),
      ...(listingExtras?.isPublishAwaitingConfirm
        ? { isPublishAwaitingConfirm: true }
        : {}),
    });

    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), newMsg]
      },
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              updatedAt: newMsg.createdAt,
              lastMessagePreview: newMsg.text.trim().replace(/\s+/g, " ").slice(0, 120),
              ...(newMsg.savedDraftId ? { savedDraftId: newMsg.savedDraftId } : {}),
            }
          : s
      ),
    }));

    if (
      sender === "user" &&
      activeSession.title.startsWith("ปรึกษาซื้อขาย")
    ) {
      const newTitle = text.length > 20 ? `${text.substring(0, 18)}...` : text;
      await updateChatSessionMetadata(scope, sessionId, { title: newTitle });
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, title: newTitle } : s
        ),
      }));
    }

    return newMsg;
  },

  editMessage: async (sessionId, messageId, text) => {
    set((state) => {
      const chatMessages = state.messages[sessionId] || [];
      const updatedMessages = chatMessages.map((m) =>
        m.id === messageId ? { ...m, text } : m
      );
      return {
        messages: {
          ...state.messages,
          [sessionId]: updatedMessages
        }
      };
    });

    const activeSession = get().sessions.find((s) => s.id === sessionId);
    if (activeSession) {
      const scope = {
        storageKey: activeSession.storageScopeKey ?? activeSession.userId,
        uid: activeSession.uid ?? activeSession.userId,
        dealerId: activeSession.dealerId ?? null,
        scope: activeSession.scope ?? (activeSession.dealerId ? "dealer" : "user"),
      } as const;
      await updateChatMessageText(scope, sessionId, messageId, text);
    }
  },

  updateStreamedReply: (text, carCards, hasMoreCars, isDraftPreview, draftFields) => {
    set({
      streamedReply: text,
      ...(carCards !== undefined ? { streamedCarCards: carCards } : {}),
      ...(hasMoreCars !== undefined ? { streamedHasMoreCars: hasMoreCars } : {}),
    });
  },

  finalizeStreamedReply: async (sessionId, carCards, hasMoreCars, isDraftPreview, draftFields, savedDraftId, attachments, savedMemberListingId) => {
    const totalReply = get().streamedReply;
    if (!totalReply) return;

    const cards =
      carCards && carCards.length > 0
        ? carCards
        : get().streamedCarCards.length > 0
          ? get().streamedCarCards
          : undefined;

    const more = hasMoreCars ?? get().streamedHasMoreCars;

    set({ streamedReply: "", streamedCarCards: [], streamedHasMoreCars: false });

    const msg = await get().addMessage(
      sessionId,
      "ai",
      totalReply,
      cards,
      more,
      isDraftPreview,
      draftFields,
      savedDraftId,
      attachments,
      undefined,
      savedMemberListingId
    );
    
    // Core AI memory loop: Trigger preference extraction in background for memory
    const history = get().messages[sessionId] || [];
    get().analyzeUserPreferences(history);
  },

  setGenerating: (generating) => {
    set({ isGenerating: generating });
  },

  analyzeUserPreferences: async (history) => {
    if (history.length < 2) return;
    set({ isAnalyzingMemory: true });
    try {
      const response = await fetch("/api/gemini/analyze-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-6) }) // analyze last 6 messages
      });
      const data = await response.json();
      if (data.success && data.profile) {
        const p: AIUserProfile = data.profile;
        set({ userPreferences: p });

        // Persist to DB
        const sessionId = get().activeSessionId;
        const activeSession = get().sessions.find((s) => s.id === sessionId);
        const storageScopeKey = activeSession?.userId || "guest";

        if (!isMockConfig && db) {
          await setDoc(doc(db, "ai_preferences", storageScopeKey), {
            userId: storageScopeKey,
            preferredBrands: p.preferredBrands || [],
            focusArea: p.focusArea || "general",
            aiResponseLength: "conversational",
            userName: p.userName || null,
            preferredBudget: p.preferredBudget || null,
            preferredFuelType: p.preferredFuelType || null,
            userNotes: p.userNotes || null,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else {
          localStorage.setItem(
            chatPrefsLocalKey(storageScopeKey),
            JSON.stringify(p)
          );
        }
      }
    } catch (e) {
      console.warn("AI Preference memory analysis warning:", e);
    } finally {
      set({ isAnalyzingMemory: false });
    }
  },

  loadUserPreferences: async (storageScopeKey) => {
    if (isMockConfig || !db) {
      try {
        const stored = localStorage.getItem(chatPrefsLocalKey(storageScopeKey));
        if (stored) {
          const profile = JSON.parse(stored);
          set({ userPreferences: profile });
          // If profile specifies a preferred active AI personality preset, map it!
          if (profile.focusArea) {
            const mappedPreset: Record<string, PersonalityPresetId> = {
              ev: "premium",
              luxury: "luxury",
              performance: "sporty",
              general: "dealer"
            };
            const mapped = mappedPreset[profile.focusArea];
            if (mapped) set({ activePresetId: mapped });
          }
        }
      } catch (e) {
        console.warn("Local storage AI preference load error:", e);
      }
      return;
    }

    try {
      const docSnap = await getDoc(doc(db, "ai_preferences", storageScopeKey));
      if (docSnap.exists()) {
        const d = docSnap.data();
        set({
          userPreferences: {
            userName: d.userName || null,
            preferredBrands: d.preferredBrands || [],
            preferredBudget: d.preferredBudget || null,
            focusArea: d.focusArea || null,
            preferredFuelType: d.preferredFuelType || null,
            userNotes: d.userNotes || null,
          }
        });

        // Map focusArea dynamically to the correct preset for seamless UX!
        if (d.focusArea) {
          const mappedPreset: Record<string, PersonalityPresetId> = {
            ev: "premium",
            luxury: "luxury",
            performance: "sporty",
            general: "dealer"
          };
          const mapped = mappedPreset[d.focusArea];
          if (mapped) set({ activePresetId: mapped });
        }
      }
    } catch (e) {
      console.warn("Firestore load user pref error:", e);
    }
  },

  syncPreferencesOffline: (profile) => {
    set({ userPreferences: profile });
  },

  // Personality actions implementation
  setPresetId: (id) => {
    set({ activePresetId: id });
    
    // Auto-update user preference focus area in the background to match
    const currentPrefs = get().userPreferences || {
      userName: null,
      preferredBrands: [],
      preferredBudget: null,
      focusArea: "general",
      preferredFuelType: null,
      userNotes: null
    };

    const focusAreaMap: Record<PersonalityPresetId, "ev" | "luxury" | "performance" | "general"> = {
      sporty: "performance",
      luxury: "luxury",
      family: "general",
      youth: "general",
      premium: "ev",
      dealer: "general"
    };

    const nextPref = {
      ...currentPrefs,
      focusArea: focusAreaMap[id]
    };

    get().syncPreferencesOffline(nextPref);
  },

  loadPersonalitiesList: async () => {
    set({ isLoadingPersonalities: true });
    try {
      const list = await loadPersonalities();
      set({ personalities: list });
    } catch (err) {
      console.error("Failed to load custom personalities list", err);
    } finally {
      set({ isLoadingPersonalities: false });
    }
  },

  updatePersonalityInstruction: async (presetId, fields) => {
    try {
      await savePersonalityPreset(presetId, fields);
      
      // Reload updated personalities to synchronize all clients
      const updated = await loadPersonalities();
      set({ personalities: updated });
    } catch (err) {
      console.error("Failed to edit custom layout instructions", err);
    }
  }
}));
