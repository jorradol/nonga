import { create } from "zustand";
import { Car, ChatMessage, ChatSession, DealerShowroom } from "./types";
import {
  fetchWithTimeout,
  sanitizeAiText,
} from "./services/ai/post-generator/apiHelpers";
import { queuePendingChatMessage } from "./utils/pendingChatMessage";
import {
  devClientMarketplaceLog,
} from "./utils/marketplaceCarMapper";
import { applyCarsFetchPayload } from "./services/cars/carsFetchState";
import { addRecentlyViewedCarId } from "./utils/chatCarContext";
import {
  bootstrapAppRouteState,
  resolvePathnameForView,
  resolveCarIdFromPathname,
  resolveViewFromPathname,
} from "./utils/appRouteSync";
import {
  readStoredDarkModePreference,
  writeStoredDarkModePreference,
} from "./hooks/settings/themeSync";
import { isUiFixtureBuild, UI_FIXTURE_DISABLED_REASON } from "./fixture/uiFixtureMode";

if (typeof window !== "undefined") {
  bootstrapAppRouteState();
}

interface MarketplaceFilters {
  search: string;
  category: "all" | "new" | "used" | "ev" | "luxury" | "motorcycle";
  minPrice: number;
  maxPrice: number;
  fuelType: string;
  sortBy: "latest" | "price-asc" | "price-desc" | "year-desc";
}

interface AppState {
  // Authentication State (Mock or Firebase integration ready)
  user: any | null;
  firebaseReady: boolean;
  setUser: (user: any | null) => void;
  
  // Theme State — runtime SoT is isDarkMode (+ DOM .dark). themeEpoch bumps on every user/system set.
  isDarkMode: boolean;
  themeEpoch: number;
  setDarkMode: (nextDark: boolean) => void;
  toggleDarkMode: () => void;

  // Layout View Routing (replicates App Router within clean, single-screen transitions)
  currentView: "home" | "marketplace" | "my-listings" | "chat" | "chat-v2" | "sell" | "dealers" | "saved" | "car-details" | "login" | "register" | "forgot-password" | "profile" | "onboarding" | "dealer-dashboard" | "admin-dashboard" | "inventory-import" | "dealer-draft-inventory" | "dealer-portal" | "search" | "car-vision" | "car-post-generator" | "viral-captions" | "seo-landing" | "dealer-showroom" | "billing" | "boost" | "pilot-policy" | "admin-reports" | "admin-pending-listings" | "admin-pilot-users" | "admin-shadow-smoke";
  selectedCarId: string | null;
  selectedDealerId: string | null;
  setView: (view: AppState["currentView"], carId?: string | null, dealerId?: string | null) => void;
  chatLoginModalOpen: boolean;
  setChatLoginModalOpen: (open: boolean) => void;
  enforcePathnameView: () => void;
  setSelectedDealerId: (dealerId: string | null) => void;

  // Follow dealer foundation
  followedDealers: string[];
  toggleFollowDealer: (dealerId: string) => void;
  addDealerReview: (dealerId: string, review: { reviewerName: string; rating: number; comment: string; buyerOfCar?: string; verifiedPurchase?: boolean; }) => void;

  // Marketplace Listings State
  cars: Car[];
  isLoadingCars: boolean;
  carsLoadState: "idle" | "loading" | "success" | "error";
  carsLoadError: string | null;
  filters: MarketplaceFilters;
  setFilters: (filters: Partial<MarketplaceFilters>) => void;
  resetFilters: () => void;
  fetchCars: () => Promise<void>;
  addCarListing: (carData: Omit<Car, "id" | "createdAt" | "isSold">) => Promise<Car | null>;
  deleteCarListing: (id: string) => Promise<void>;

  // AI Chat Assistant State (Multiple active chat sessions)
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  chatMessages: Record<string, ChatMessage[]>; // key: sessionId
  isSpeakingAI: boolean;
  isGeneratingAI: boolean;
  createChatSession: (title?: string) => string;
  deleteChatSession: (id: string) => void;
  selectChatSession: (id: string) => void;
  sendChatMessage: (message: string) => Promise<void>;

  // AI Listing Writer Output
  lastAIGeneratedDescription: string;
  isWritingAI: boolean;
  generateAIDescription: (carDetails: {
    brand: string;
    model: string;
    year: number;
    price: number;
    type: string;
    condition: string;
    mileage: number;
    fuelType: string;
    customNotes: string;
  }) => Promise<string>;

  // Saved Favorites
  favorites: string[]; // list of carIds
  toggleFavorite: (carId: string) => void;

  // Dealers Mock Directory
  dealers: DealerShowroom[];
}

const initialFilters: MarketplaceFilters = {
  search: "",
  category: "all",
  minPrice: 0,
  maxPrice: 10000000,
  fuelType: "all",
  sortBy: "latest",
};

export const useAppStore = create<AppState>((set, get) => ({
  // Auth state defaults to a pre-signed guest so testing is completely instant and fun
  user: {
    uid: "guest-user-100",
    displayName: "คุณออโต้ บล็อกเกอร์ (NongBot Guest)",
    email: "auto.nong@gmail.com",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=NongBot"
  },
  firebaseReady: false,
  setUser: (user) => set({ user }),

  // Theme State — bootstrap from localStorage so Header toggles survive refresh
  isDarkMode: readStoredDarkModePreference(true),
  themeEpoch: 0,
  setDarkMode: (nextDark) => {
    if (get().isDarkMode === nextDark) return;
    set({ isDarkMode: nextDark, themeEpoch: get().themeEpoch + 1 });
    writeStoredDarkModePreference(nextDark);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", nextDark);
    }
  },
  toggleDarkMode: () => {
    get().setDarkMode(!get().isDarkMode);
  },

  // View system
  currentView:
    typeof window === "undefined"
      ? "chat"
      : resolveViewFromPathname(window.location.pathname),
  selectedCarId: null,
  selectedDealerId: null,
  enforcePathnameView: () => {
    if (typeof window === "undefined") return;
    bootstrapAppRouteState();
    const pathname = window.location.pathname;
    const carIdFromPath = resolveCarIdFromPathname(pathname);
    if (carIdFromPath) {
      if (get().currentView !== "car-details" || get().selectedCarId !== carIdFromPath) {
        set({ currentView: "car-details", selectedCarId: carIdFromPath });
      }
      return;
    }
    const viewFromPath = resolveViewFromPathname(pathname);
    const patch: Partial<AppState> = { currentView: viewFromPath };
    if (get().currentView === "car-details" && viewFromPath !== "car-details") {
      patch.selectedCarId = null;
    }
    if (get().currentView !== viewFromPath || patch.selectedCarId === null) {
      set(patch);
    }
  },
  setView: (view, carId = null, dealerId = null) => {
    if (view === "car-details" && carId) {
      addRecentlyViewedCarId(carId);
    }
    set({
      currentView: view,
      selectedCarId: carId,
      selectedDealerId:
        dealerId || (view === "dealer-showroom" ? carId : get().selectedDealerId),
    });
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      if (view === "car-details" && carId) {
        const nextPath = `/cars/${encodeURIComponent(carId)}`;
        if (pathname !== nextPath) {
          window.history.replaceState(null, "", nextPath);
        }
      } else {
        const nextPath = resolvePathnameForView(view, pathname);
        if (nextPath && nextPath !== pathname) {
          window.history.replaceState(null, "", nextPath);
        }
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
  chatLoginModalOpen: false,
  setChatLoginModalOpen: (open) => set({ chatLoginModalOpen: open }),
  setSelectedDealerId: (dealerId) => set({ selectedDealerId: dealerId }),

  // Follow dealer foundation
  followedDealers: [],
  toggleFollowDealer: (dealerId) => {
    set((state) => {
      const isFollowing = state.followedDealers.includes(dealerId);
      const updated = isFollowing
        ? state.followedDealers.filter(id => id !== dealerId)
        : [...state.followedDealers, dealerId];
      return { followedDealers: updated };
    });
  },
  addDealerReview: (dealerId, reviewData) => {
    set((state) => {
      const updatedDealers = state.dealers.map((d) => {
        if (d.id === dealerId) {
          const newReview = {
            id: `rev-${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...reviewData
          };
          const nextReviews = [newReview, ...d.reviews];
          // Recalculate average rating
          const avgRating = nextReviews.length > 0 
            ? nextReviews.reduce((sum, r) => sum + r.rating, 0) / nextReviews.length
            : d.rating;
          return {
            ...d,
            reviews: nextReviews,
            rating: parseFloat(avgRating.toFixed(1))
          };
        }
        return d;
      });
      return { dealers: updatedDealers };
    });
  },

  // Cars directory
  cars: [],
  isLoadingCars: false,
  carsLoadState: "idle",
  carsLoadError: null,
  filters: initialFilters,
  setFilters: (updatedFilters) => {
    set((state) => ({ filters: { ...state.filters, ...updatedFilters } }));
  },
  resetFilters: () => set({ filters: initialFilters }),
  
  fetchCars: async () => {
    set({ isLoadingCars: true, carsLoadState: "loading", carsLoadError: null });
    try {
      // Keep the direct compile-time check: normal Vite builds must not emit
      // the synthetic fixture chunk at all.
      if (import.meta.env.VITE_NONGA_UI_FIXTURE === "true") {
        const { getSyntheticFixtureCarsPayload } = await import("./fixture/syntheticCars");
        const result = getSyntheticFixtureCarsPayload();
        const next = applyCarsFetchPayload({ cars: get().cars }, result);
        set(next);
        return;
      }
      const response = await fetch("/api/cars", { cache: "no-store" });
      const result = await response.json();
      const next = applyCarsFetchPayload({ cars: get().cars }, result);
      if (next.carsLoadState === "success") {
        devClientMarketplaceLog("fetchCars", {
          count: next.cars.length,
          source: "GET /api/cars → data/marketplace-inventory.json",
        });
        set(next);
      } else {
        devClientMarketplaceLog("fetchCars-empty", { result });
        console.warn("[fetchCars] unexpected payload shape", result);
        set(next);
      }
    } catch (err) {
      console.error("Store error loading cars list", err);
      set({
        carsLoadState: "error",
        carsLoadError: isUiFixtureBuild
          ? "โหลดข้อมูลสมมติไม่สำเร็จ — ไม่มีการ fallback ไประบบจริง"
          : "เชื่อมต่อรายการรถไม่สำเร็จชั่วคราว กรุณาลองใหม่",
      });
    } finally {
      set({ isLoadingCars: false });
    }
  },

  addCarListing: async (carData) => {
    if (isUiFixtureBuild) {
      console.warn(UI_FIXTURE_DISABLED_REASON, "addCarListing");
      return null;
    }
    try {
      const response = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(carData)
      });
      const result = await response.json();
      if (result.success && result.data) {
        // reload from backend directory to keep sync
        await get().fetchCars();
        return result.data;
      }
    } catch (err) {
      console.error("Failed to append listing", err);
    }
    return null;
  },

  deleteCarListing: async (id) => {
    if (isUiFixtureBuild) {
      console.warn(UI_FIXTURE_DISABLED_REASON, "deleteCarListing");
      return;
    }
    try {
      await fetch(`/api/cars/${id}`, { method: "DELETE" });
      await get().fetchCars();
    } catch (err) {
      console.error("Failed to delete listing", err);
    }
  },

  // AI Chat Messages and persistent threads
  chatSessions: [
    { id: "session-default-1", userId: "guest-user-100", title: "คุยกับ Nong A (ถามรถไฟฟ้า EV) ⚡", createdAt: new Date().toISOString() }
  ],
  activeSessionId: "session-default-1",
  chatMessages: {
    "session-default-1": [
      {
        id: "msg-welcome",
        sender: "ai",
        text: "ปังปุริเย่! 🎉 ยินดีต้อนรับสู่ Nong A Car Marketplace ครับผม! ผมคือ น้องเอ (Nong A) ผู้ช่วยด้านการซื้อขายรถยนต์ระดับท็อปจากตระกูล NongBot ครับ!\n\nรถในแพลตฟอร์มเราบอกเลยว่าสวยว้าวซ่ามาก รถสวยจน AI ใจสั่น 😆 มีทั้ง EV ล้ำๆ สปอร์ตหรูหรา และมอเตอร์ไซค์สุดเฟี้ยวครับ ลองบอกงบประมาณหรือเซกเมนต์ที่สนใจ หรือถามเทคนิคการเลือกรถกับผมได้เลยนะคร้าบ! คันนี้มีคนทักแน่ครับ 🔥",
        createdAt: new Date().toISOString()
      }
    ]
  },
  isSpeakingAI: false,
  isGeneratingAI: false,

  createChatSession: (title) => {
    const newId = `session-${Date.now()}`;
    const user = get().user;
    const newSession: ChatSession = {
      id: newId,
      userId: user?.uid || "guest",
      title: title || `บทสนทนาใหม่ #${get().chatSessions.length + 1}`,
      createdAt: new Date().toISOString()
    };
    
    set((state) => ({
      chatSessions: [newSession, ...state.chatSessions],
      activeSessionId: newId,
      chatMessages: {
        ...state.chatMessages,
        [newId]: [
          {
            id: `msg-welcome-${Date.now()}`,
            sender: "ai",
            text: "สวัสดีครับผม! น้องเอสแตนด์บายพร้อมบริการพาส่งรถในฝันแล้วครับ 🚗 วันนี้อยากหาคุยเรื่องรถคันไหน งบประมาณเท่าไหร่ บอกน้องเอมาได้เลยคร้าบ ปังปุริเย่แน่นอน!",
            createdAt: new Date().toISOString()
          }
        ]
      }
    }));
    return newId;
  },

  deleteChatSession: (id) => {
    set((state) => {
      const remaining = state.chatSessions.filter((s) => s.id !== id);
      const active = state.activeSessionId === id ? (remaining[0]?.id || null) : state.activeSessionId;
      return {  
        chatSessions: remaining,
        activeSessionId: active
      };
    });
  },

  selectChatSession: (id) => {
    set({ activeSessionId: id });
  },

  sendChatMessage: async (message) => {
    queuePendingChatMessage(message);
    const sessionId = get().activeSessionId;
    if (!sessionId) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: message,
      createdAt: new Date().toISOString()
    };

    // Append user message instantly
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [sessionId]: [...(state.chatMessages[sessionId] || []), userMessage]
      },
      isGeneratingAI: true
    }));

    try {
      if (isUiFixtureBuild) {
        const aiMessage: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: "ai",
          text: `${UI_FIXTURE_DISABLED_REASON} — นี่เป็นข้อความตัวอย่างสำหรับตรวจ layout แชทเท่านั้น ไม่เรียก AI จริง`,
          createdAt: new Date().toISOString()
        };
        set((state) => ({
          chatMessages: {
            ...state.chatMessages,
            [sessionId]: [...(state.chatMessages[sessionId] || []), aiMessage]
          },
          isGeneratingAI: false
        }));
        return;
      }
      const history = get().chatMessages[sessionId] || [];
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: history.slice(0, -1) // pass correct previous histories
        })
      });

      const data = await response.json();
      if (data.success && data.reply) {
        const aiMessage: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: "ai",
          text: data.reply,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          chatMessages: {
            ...state.chatMessages,
            [sessionId]: [...(state.chatMessages[sessionId] || []), aiMessage]
          }
        }));

        // Dynamic title update if standard title
        const currentSession = get().chatSessions.find(s => s.id === sessionId);
        if (currentSession && currentSession.title.startsWith("บทสนทนาใหม่")) {
          // make title summary
          const miniTitle = message.length > 25 ? message.slice(0, 25) + "..." : message;
          set((state) => ({
            chatSessions: state.chatSessions.map((s) => 
              s.id === sessionId ? { ...s, title: miniTitle } : s
            )
          }));
        }

      } else {
        throw new Error(data.error || "Failed AI inference");
      }
    } catch (err: any) {
      console.error("AI chat assistant error:", err);
      // Append fail message
      const failMessage: ChatMessage = {
        id: `msg-fail-${Date.now()}`,
        sender: "ai",
        text: "ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งครับ",
        createdAt: new Date().toISOString()
      };
      set((state) => ({
        chatMessages: {
          ...state.chatMessages,
          [sessionId]: [...(state.chatMessages[sessionId] || []), failMessage]
        }
      }));
    } finally {
      set({ isGeneratingAI: false });
    }
  },

  // AI Description Generator
  lastAIGeneratedDescription: "",
  isWritingAI: false,
  generateAIDescription: async (carDetails) => {
    set({ isWritingAI: true });
    try {
      if (isUiFixtureBuild) {
        const description = UI_FIXTURE_DISABLED_REASON;
        set({ lastAIGeneratedDescription: description });
        return description;
      }
      const response = await fetchWithTimeout(
        "/api/gemini/generate-post",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(carDetails),
        },
        90_000
      );

      let data: {
        success?: boolean;
        description?: string;
        error?: string;
        warning?: string;
        isMock?: boolean;
      } = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "ยังสร้างโพสต์ไม่ได้ครับ กรุณาลองใหม่อีกครั้ง"
        );
      }

      if (!response.ok && !data.success) {
        if (data.error) {
          console.warn("AI description generator failed:", data.error);
        }
        throw new Error(
          "ยังสร้างโพสต์ไม่ได้ครับ กรุณาลองใหม่อีกครั้ง"
        );
      }

      if (data.success && data.description) {
        const description = sanitizeAiText(data.description, 8000);
        set({ lastAIGeneratedDescription: description });
        return description;
      }

      if (data.error) {
        console.warn("AI description generator returned no description:", data.error);
      }
      throw new Error(
        "ยังสร้างโพสต์ไม่ได้ครับ กรุณาลองใหม่อีกครั้ง"
      );
    } catch (err) {
      console.warn("AI description generator error:", err);
      throw new Error("ยังสร้างโพสต์ไม่ได้ครับ กรุณาลองใหม่อีกครั้ง");
    } finally {
      set({ isWritingAI: false });
    }
  },

  // Favorites
  favorites: [],
  toggleFavorite: (carId) => {
    set((state) => {
      const isFav = state.favorites.includes(carId);
      const updated = isFav 
        ? state.favorites.filter(id => id !== carId)
        : [...state.favorites, carId];
      return { favorites: updated };
    });
  },

  dealers: [
    {
      id: "dealer-001",
      name: "NongBot Certified Space",
      logo: "https://api.dicebear.com/7.x/identicon/svg?seed=NongSpace",
      coverImage: "https://images.unsplash.com/photo-1562575214-da9fcf59b907?auto=format&fit=crop&q=80&w=800",
      address: "20 Thai SaaS Avenue, Huai Khwang, Bangkok",
      phone: "081-234-5678",
      rating: 4.9,
      verified: true,
      description: "โชว์รูมรถยนต์ไฟฟ้าและยานยนต์อัจฉริยะรายแรกที่ได้รับป้าย NongBot Certified สภาพนางฟ้าคัดเกรดดีที่สุด พร้อมสัญญารับประกันคุณภาพ ไม่เคยชนหนัก จมน้ำ หรือพลิกคว่ำ และได้รับการตรวจสอบแบตเตอรี่อย่างเคร่งครัดโดยวิศวกร มั่นใจได้ 100% คร้าบ!",
      experienceYears: 6,
      totalViews: 24500,
      reviews: [
        { id: "rev-1", reviewerName: "คุณวิทยา รักสะอาด", rating: 5, comment: "ออก Tesla Model 3 กับที่นี่ไป บริการดีมากครับ ได้น้องเอ AI ช่วยคำนวณเบี้ยประกันและดอกเบี้ยผ่อนให้ตรงเป๊ะ คุ้มสุดๆ แนะนำครับ", createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), buyerOfCar: "Tesla Model 3", verifiedPurchase: true },
        { id: "rev-2", reviewerName: "คุณนันธิดา สวยเด่น", rating: 5, comment: "ปรึกษาง่าย โชว์รูมสวยงามพรีเมียม สัญญารับประกันชัดเจนไม่มีตุกติก รถสภาพดีมากจริงๆ", createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(), buyerOfCar: "Toyota Fortuner", verifiedPurchase: true }
      ],
      socialLinks: {
        facebook: "https://facebook.com/nongbot.space",
        line: "https://line.me/@nongbot.space",
        website: "https://nongbot-space.co.th"
      },
      tags: ["Electric Vehicles", "Certified Premium", "Hybrid Spec"]
    },
    {
      id: "dealer-002",
      name: "Super EV Thailand Showroom",
      logo: "https://api.dicebear.com/7.x/identicon/svg?seed=SuperEV",
      coverImage: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800",
      address: "Rama 9 Electrifying Street, Bangkok",
      phone: "082-345-6789",
      rating: 4.8,
      verified: true,
      description: "ที่สุดแห่งนวัตกรรมยานยนต์ไฟฟ้า EV 100% ครบวงจร นำเข้าและจำหน่ายรถยนต์ไฟฟ้ามัลติแบรนด์ยอดฮิต BYD, GAC Aion, Deepal, และ Tesla มาพร้อมความคุ้มครองดีที่สุดในตลาดไทย",
      experienceYears: 4,
      totalViews: 18700,
      reviews: [
        { id: "rev-3", reviewerName: "คุณสิทธิชัย นำดี", rating: 5, comment: "รถไฟฟ้าแท้ 100% สภาพดีมากๆ ครับ ที่ชาร์จแถมให้คุ้มสุด และสอนเล่นฟังก์ชันละเอียดยิบเลย", createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), buyerOfCar: "Porsche Taycan", verifiedPurchase: true },
        { id: "rev-4", reviewerName: "คุณเกศรา แสงสว่าง", rating: 4, comment: "คุยง่าย บริการรวดเร็วทันใจ มีบริการส่งรถสไลด์ฟรีถึงหน้าบ้าน ประทับใจมากค่ะ", createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(), buyerOfCar: "Tesla Model 3", verifiedPurchase: true }
      ],
      socialLinks: {
        facebook: "https://facebook.com/superev.th",
        line: "https://line.me/@superev.th",
        tiktok: "https://tiktok.com/@superev_thailand"
      },
      tags: ["Pure EV Only", "Fast Delivery", "Home Charger Free"]
    },
    {
      id: "dealer-003",
      name: "Luxury Wheels Elite",
      logo: "https://api.dicebear.com/7.x/identicon/svg?seed=EliteWheels",
      coverImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800",
      address: "Thonglor Luxury Lane, Wattana, Bangkok",
      phone: "083-456-7890",
      rating: 5.0,
      verified: true,
      description: "ยินดีต้อนรับสู่ขอบขันธ์แห่งยานยนต์ระดับซูเปอร์คาร์และลักชัวรี่พรีเมียมจากพาร์ตเนอร์ทองหล่อ จัดทัพแบรนด์ดัง Porsche, BMW M, Mercedes-AMG, Bentley ตรวจเช็คประวัติเชิงลึก 210 จุดโดยช่างมือระดับปรมาจารย์",
      experienceYears: 12,
      totalViews: 32000,
      reviews: [
        { id: "rev-5", reviewerName: "ดร.วิโรจน์ แสงมณี", rating: 5, comment: "สมเกียรติศักดิ์ศรีโชว์รูมไฮเกรด รถสวยเป็นเอกลักษณ์ สภาพเทียบมือหนึ่งป้ายแดง ขอบคุณน้องเอ AI ช่วยต่อรองราคาและประวัติอย่างสุภาพครับ", createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), buyerOfCar: "Porsche Taycan Cross Turismo", verifiedPurchase: true }
      ],
      socialLinks: {
        facebook: "https://facebook.com/luxurywheels.elite",
        line: "https://line.me/@luxury.elite",
        website: "https://luxurywheelselite.com"
      },
      tags: ["Supercars", "Thonglor Premium", "VIP Services"]
    }
  ]
}));

/** v6.9A Phase 1.5 — align initial `.dark` with bootstrapped isDarkMode for class-only dark variant */
if (typeof document !== "undefined") {
  if (useAppStore.getState().isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
