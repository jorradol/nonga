import { create } from "zustand";
import { ChatSession, ChatMessage, ChatCarCardData, ChatMessageAttachment } from "../../types";
import { db, isMockConfig } from "../../lib/firebase";
import { AIPersonality, PersonalityPresetId } from "../../types/ai";
import { loadPersonalities, savePersonalityPreset, DEFAULT_PERSONALITIES } from "../../services/ai/personality/personalityConfig";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  getDoc
} from "firebase/firestore";
import {
  chatMessagesLocalKey,
  chatPrefsLocalKey,
  chatSessionsLocalKey,
} from "../../utils/chatStorageScope";

export interface AIUserProfile {
  userName: string | null;
  preferredBrands: string[];
  preferredBudget: string | null;
  focusArea: "ev" | "luxury" | "performance" | "general" | null;
  preferredFuelType: "electric" | "hybrid" | "petrol" | "diesel" | null;
  userNotes: string | null;
}

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

  // Actions — storageScopeKey partitions chat per dealer/user (see chatStorageScope.ts)
  resetChatState: () => void;
  loadSessions: (storageScopeKey: string) => Promise<void>;
  createSession: (storageScopeKey: string, title?: string) => Promise<string>;
  deleteSession: (storageScopeKey: string, sessionId: string) => Promise<void>;
  selectSession: (sessionId: string) => void;
  addMessage: (
    sessionId: string,
    sender: ChatMessage["sender"],
    text: string,
    carCards?: ChatCarCardData[],
    hasMoreCars?: boolean,
    isDraftPreview?: boolean,
    draftFields?: any,
    savedDraftId?: string,
    attachments?: ChatMessageAttachment[]
  ) => Promise<ChatMessage>;
  editMessage: (sessionId: string, messageId: string, text: string) => Promise<void>;
  updateStreamedReply: (text: string, carCards?: ChatCarCardData[], hasMoreCars?: boolean, isDraftPreview?: boolean, draftFields?: any) => void;
  finalizeStreamedReply: (
    sessionId: string,
    carCards?: ChatCarCardData[],
    hasMoreCars?: boolean,
    isDraftPreview?: boolean,
    draftFields?: any,
    savedDraftId?: string
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

  loadSessions: async (storageScopeKey) => {
    // 1. If mock config or firebase error, fallback to LocalStorage
    if (isMockConfig || !db) {
      try {
        const storedSessions = localStorage.getItem(
          chatSessionsLocalKey(storageScopeKey)
        );
        const storedMessages = localStorage.getItem(
          chatMessagesLocalKey(storageScopeKey)
        );
        
        const sessions: ChatSession[] = storedSessions ? JSON.parse(storedSessions) : [];
        const messages: Record<string, ChatMessage[]> = storedMessages ? JSON.parse(storedMessages) : {};
        
        // If empty, seed a default welcome session
        if (sessions.length === 0) {
          const defaultSessionId = `session-welcome-${Date.now()}`;
          const defaultSession: ChatSession = {
            id: defaultSessionId,
            userId: storageScopeKey,
            title: "ยินดีต้อนรับสู่สต๊อกสตาร์ ⚡",
            createdAt: new Date().toISOString()
          };
          const welcomeMsg: ChatMessage = {
            id: `msg-welcome-${Date.now()}`,
            sender: "ai",
            text: "ปังปุริเย่! 🎉 ยินดีต้อนรับสู่ระบบแนะนำอัจฉริยะ ของน้องเอคนดีคนเดิมครับผม!\n\nวันนี้คุณอยากได้คำแนะนำ คัดสรรรถยนต์ไฟฟ้า EV สเป็คเด่น รถบ้านลุยๆ หรือรถหรูหราบารมีจับด้านไหนเป็นพิเศษ พิมพ์ทักคุยกับผมได้เลยนะคร้าบ! คันนี้มีคนทักแน่ครับ 🔥",
            createdAt: new Date().toISOString()
          };
          
          sessions.push(defaultSession);
          messages[defaultSessionId] = [welcomeMsg];
          
          localStorage.setItem(
            chatSessionsLocalKey(storageScopeKey),
            JSON.stringify(sessions)
          );
          localStorage.setItem(
            chatMessagesLocalKey(storageScopeKey),
            JSON.stringify(messages)
          );
        }

        const currentActive = get().activeSessionId;
        const keepActive =
          currentActive && sessions.some((s) => s.id === currentActive)
            ? currentActive
            : sessions[0]?.id || null;
        set({
          sessions,
          messages,
          activeSessionId: keepActive,
        });
      } catch (err) {
        console.warn("Local chat history load err:", err);
      }
      return;
    }

    // 2. Load from Firebase Firestore
    try {
      const q = query(
        collection(db, "chats"),
        where("userId", "==", storageScopeKey),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const sessions: ChatSession[] = [];
      const messages: Record<string, ChatMessage[]> = {};

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const s: ChatSession = {
          id: docSnapshot.id,
          userId: data.userId || storageScopeKey,
          title: data.title || "บทสนทนาไร้ชื่อ",
          createdAt: data.createdAt || new Date().toISOString()
        };
        sessions.push(s);

        // Load subcollection messages
        const msgQuery = query(
          collection(db, "chats", docSnapshot.id, "messages"),
          orderBy("createdAt", "asc")
        );
        const msgSnapshot = await getDocs(msgQuery);
        const list: ChatMessage[] = [];
        msgSnapshot.forEach((mSnapshot) => {
          const mData = mSnapshot.data();
          list.push({
            id: mSnapshot.id,
            sender: mData.sender || "ai",
            text: mData.text || "",
            createdAt: mData.createdAt || new Date().toISOString(),
            ...(Array.isArray(mData.carCards) && mData.carCards.length > 0
              ? { carCards: mData.carCards }
              : {}),
            ...(mData.hasMoreCars ? { hasMoreCars: mData.hasMoreCars } : {}),
            ...(mData.isDraftPreview ? { isDraftPreview: mData.isDraftPreview } : {}),
            ...(mData.draftFields ? { draftFields: mData.draftFields } : {}),
            ...(mData.savedDraftId ? { savedDraftId: mData.savedDraftId } : {}),
            ...(Array.isArray(mData.attachments) && mData.attachments.length > 0
              ? { attachments: mData.attachments }
              : {}),
          });
        });

        messages[docSnapshot.id] = list;
      }

      // Automatically create a default session if there are none in Firestore
      if (sessions.length === 0) {
        set({ sessions: [], messages: {}, activeSessionId: null });
        const newSessionId = await get().createSession(
          storageScopeKey,
          "สอบถามรถยนต์ครั้งแรก 🚗"
        );
        // Add default message
        await get().addMessage(
          newSessionId, 
          "ai", 
          "สวัสดีครับคุณพี่สุดคนดี! น้องเอสแตนด์บายพร้อมบริการค้นหารถสเป็คเด็ดในดวงใจให้แล้วคร้าบ 🎉 พิมพ์งบประมาณหรือแบรนด์รถที่อยากปรึกษามาได้เลยนะคร้าบ!"
        );
      } else {
        const currentActive = get().activeSessionId;
        const keepActive =
          currentActive && sessions.some((s) => s.id === currentActive)
            ? currentActive
            : sessions[0].id;
        set({
          sessions,
          messages,
          activeSessionId: keepActive,
        });
      }
    } catch (err) {
      console.error("Firestore history load failure, falling back to LocalStorage:", err);
      // fallback
      isMockConfig; 
    }
  },

  createSession: async (storageScopeKey, title) => {
    const newSessionId = `chat-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      userId: storageScopeKey,
      title: title || `ปรึกษาซื้อขาย #${get().sessions.length + 1}`,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      activeSessionId: newSessionId,
      messages: {
        ...state.messages,
        [newSessionId]: []
      }
    }));

    if (!isMockConfig && db) {
      try {
        await setDoc(doc(db, "chats", newSessionId), {
          userId: storageScopeKey,
          title: newSession.title,
          createdAt: newSession.createdAt,
        });
      } catch (err) {
        console.warn("Firestore error saving chat session:", err);
      }
    } else {
      localStorage.setItem(
        chatSessionsLocalKey(storageScopeKey),
        JSON.stringify(get().sessions)
      );
      localStorage.setItem(
        chatMessagesLocalKey(storageScopeKey),
        JSON.stringify(get().messages)
      );
    }

    return newSessionId;
  },

  deleteSession: async (storageScopeKey, sessionId) => {
    const nextSessions = get().sessions.filter((s) => s.id !== sessionId);
    const nextMessages = { ...get().messages };
    delete nextMessages[sessionId];

    let nextActiveId = get().activeSessionId;
    if (nextActiveId === sessionId) {
      nextActiveId = nextSessions[0]?.id || null;
    }

    set({
      sessions: nextSessions,
      messages: nextMessages,
      activeSessionId: nextActiveId
    });

    if (!isMockConfig && db) {
      try {
        await deleteDoc(doc(db, "chats", sessionId));
        // Note: Clean up subcollection messages if needed (handled server side or simple deletion rule)
      } catch (err) {
        console.warn("Firestore error deleting chat:", err);
      }
    } else {
      localStorage.setItem(
        chatSessionsLocalKey(storageScopeKey),
        JSON.stringify(nextSessions)
      );
      localStorage.setItem(
        chatMessagesLocalKey(storageScopeKey),
        JSON.stringify(nextMessages)
      );
    }
  },

  selectSession: (sessionId) => {
    set({ activeSessionId: sessionId });
  },

  addMessage: async (sessionId, sender, text, carCards, hasMoreCars, isDraftPreview, draftFields, savedDraftId, attachments) => {
    const newMsg: ChatMessage = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      sender,
      text,
      createdAt: new Date().toISOString(),
      ...(carCards && carCards.length > 0 ? { carCards } : {}),
      ...(hasMoreCars ? { hasMoreCars } : {}),
      ...(isDraftPreview ? { isDraftPreview } : {}),
      ...(draftFields ? { draftFields } : {}),
      ...(savedDraftId ? { savedDraftId } : {}),
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] || []), newMsg]
      }
    }));

    // Save
    const activeSession = get().sessions.find((s) => s.id === sessionId);
    const storageScopeKey = activeSession?.userId || "guest";

    if (!isMockConfig && db) {
      try {
        await setDoc(doc(db, "chats", sessionId, "messages", newMsg.id), {
          sender,
          text,
          createdAt: newMsg.createdAt,
          ...(carCards && carCards.length > 0 ? { carCards } : {}),
          ...(hasMoreCars ? { hasMoreCars } : {}),
          ...(isDraftPreview ? { isDraftPreview } : {}),
          ...(draftFields ? { draftFields } : {}),
          ...(savedDraftId ? { savedDraftId } : {}),
          ...(attachments && attachments.length > 0 ? { attachments } : {}),
        });

        // Trigger session title generation on first user prompt
        if (sender === "user" && activeSession && activeSession.title.startsWith("สอบถามรถยนต์ครั้งแรก")) {
          const newTitle = text.length > 20 ? `${text.substring(0, 18)}...` : text;
          await setDoc(doc(db, "chats", sessionId), { title: newTitle }, { merge: true });
          set((state) => ({
            sessions: state.sessions.map((s) => s.id === sessionId ? { ...s, title: newTitle } : s)
          }));
        }
      } catch (e) {
        console.warn("Firestore message save error:", e);
      }
    } else {
      localStorage.setItem(
        chatMessagesLocalKey(storageScopeKey),
        JSON.stringify(get().messages)
      );

      // Update local storage title as well
      if (
        sender === "user" &&
        activeSession &&
        activeSession.title.startsWith("ปรึกษาซื้อขาย")
      ) {
        const newTitle =
          text.length > 20 ? `${text.substring(0, 18)}...` : text;
        const updatedSessions = get().sessions.map((s) =>
          s.id === sessionId ? { ...s, title: newTitle } : s
        );
        set({ sessions: updatedSessions });
        localStorage.setItem(
          chatSessionsLocalKey(storageScopeKey),
          JSON.stringify(updatedSessions)
        );
      }
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
    const storageScopeKey = activeSession?.userId || "guest";

    if (!isMockConfig && db) {
      try {
        await setDoc(doc(db, "chats", sessionId, "messages", messageId), {
          text
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore error editing message:", err);
      }
    } else {
      localStorage.setItem(
        chatMessagesLocalKey(storageScopeKey),
        JSON.stringify(get().messages)
      );
    }
  },

  updateStreamedReply: (text, carCards, hasMoreCars, isDraftPreview, draftFields) => {
    set({
      streamedReply: text,
      ...(carCards !== undefined ? { streamedCarCards: carCards } : {}),
      ...(hasMoreCars !== undefined ? { streamedHasMoreCars: hasMoreCars } : {}),
    });
  },

  finalizeStreamedReply: async (sessionId, carCards, hasMoreCars, isDraftPreview, draftFields, savedDraftId) => {
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
      savedDraftId
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
