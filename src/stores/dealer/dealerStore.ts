import { create } from "zustand";
import { 
  DealerProfile, 
  DealerLead, 
  PostPerformanceMetric, 
  ChatInquiry, 
  DealerAnalyticsOverview,
  LeadStatus,
  LeadTemperature
} from "../../types/dealer";

interface DealerStoreState {
  profile: DealerProfile;
  leads: DealerLead[];
  performanceMetrics: PostPerformanceMetric[];
  inquiries: ChatInquiry[];
  selectedInquiryId: string | null;
  
  // Quick filters for lead board
  leadSearchTerm: string;
  leadStatusFilter: LeadStatus | "all";
  leadTempFilter: LeadTemperature | "all";
  
  // Actions
  updateProfile: (profileData: Partial<DealerProfile>) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus) => void;
  updateLeadNotes: (leadId: string, notes: string) => void;
  addLead: (lead: Omit<DealerLead, "id" | "createdAt" | "updatedAt">) => void;
  
  // Chat actions
  setSelectedInquiryId: (id: string | null) => void;
  sendInquiryReply: (inquiryId: string, text: string) => void;
  generateAISuggestedReply: (inquiryId: string) => Promise<void>;
  
  // Growth booster
  boostListing: (carId: string) => void;
  upgradeSubscription: (plan: DealerProfile["subscriptionPlan"]) => void;
  
  // Filters actions
  setLeadSearchTerm: (term: string) => void;
  setLeadStatusFilter: (status: LeadStatus | "all") => void;
  setLeadTempFilter: (temp: LeadTemperature | "all") => void;
  
  // Analytics selector
  getAnalytics: () => DealerAnalyticsOverview;
}

const initialProfile: DealerProfile = {
  id: "dealer-nongbot-01",
  name: "NongBot Premium Space Garage",
  slug: "nongbot-premium-garage",
  phone: "081-345-6789",
  email: "partner@nongbotgarage.com",
  address: "10 Thai Tech SaaS Industrial Area, Vibhavadi Rangsit, Bangkok",
  province: "กรุงเทพมหานคร",
  website: "www.nongbotgarage.com",
  logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=NongSpace",
  coverImageUrl: "https://images.unsplash.com/photo-1562575214-da9fcf59b907?auto=format&fit=crop&q=80&w=800",
  verified: true,
  rating: 4.9,
  totalReviews: 48,
  subscriptionPlan: "premium_growth",
  creditsRemaining: 150,
  unlimitedListingEnabled: true,
  aiAutoReplyEnabled: true,
};

const initialLeads: DealerLead[] = [
  {
    id: "lead-001",
    dealerId: "dealer-nongbot-01",
    carId: "car-001",
    carTitle: "BYD Seal Premium AWD Electrifier",
    carImage: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=600",
    name: "คุณกิตติศักดิ์ แก้วสะอาด",
    phone: "082-990-1122",
    email: "kittisak.k@gmail.com",
    message: "สนใจรับรถคันนี้ครับ อยากรับเงื่อนไขประกันดาวน์ 0% และติดตั้งตู้ไฟชาร์จฟรีที่บ้าน แถมไหมครับคุณพี่?",
    status: "new",
    temperature: "hot",
    channel: "website",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    notes: "-"
  },
  {
    id: "lead-002",
    dealerId: "dealer-nongbot-01",
    carId: "car-002",
    carTitle: "Tesla Model 3 Highland Red",
    carImage: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=600",
    name: "คุณนารี สิทธิมงคล",
    phone: "089-445-5678",
    email: "naree.s@gmail.com",
    message: "คันนี้มีสีเหลืองหรือสีอื่นๆ อีกไหมคะ? ถ้าจองวันเสาร์นี้ได้ส่วนลดเคลือบเซรามิกหรือพ่นสีน็อตแบบซิ่งไหมคะ?",
    status: "contacted",
    temperature: "hot",
    channel: "facebook",
    createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(), // 8 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    notes: "โทรคุยแล้ว สนใจนัดวันเสาร์นี้เพื่อเข้าดูคันตัวจริง"
  },
  {
    id: "lead-003",
    dealerId: "dealer-nongbot-01",
    carId: "car-003",
    carTitle: "Porsche Taycan Dynamic White",
    carImage: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=600",
    name: "เสี่ยธนา อัครบวรกุล",
    phone: "081-777-8888",
    email: "thana.rich@highnetworth.com",
    message: "สนใจซื้อเงินสดครับ ส่งเอกสารการโอนให้เซ็นผ่านทนายได้เลยนะครับ บ่ายนี้จัดส่งคนไปรับได้เลยไหม?",
    status: "following",
    temperature: "hot",
    channel: "line",
    createdAt: new Date(Date.now() - 1000 * 60 * 2000).toISOString(), // 1.4 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 1000).toISOString(),
    notes: "คุยค้างจัดเตรียมสัญญากับฝ่ายนิติบุคคล"
  },
  {
    id: "lead-004",
    dealerId: "dealer-nongbot-01",
    carId: "car-004",
    carTitle: "Honda Civic FE EL+ Turbo",
    carImage: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=600",
    name: "น้องทิว สายซิ่งสระบุรี",
    phone: "065-112-9900",
    email: "tew.racing@kapook.in.th",
    message: "ขอตารางผ่อนของคันนี้สเป็คนี้หน่อยครับ เงินดาวน์ 50,000 ผ่อนได้ยาวสุดกี่งวดครับพี่?",
    status: "completed",
    temperature: "warm",
    channel: "tiktok",
    createdAt: new Date(Date.now() - 1000 * 60 * 5000).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 4500).toISOString(),
    notes: "สัญญาสินเชื่อรถยนต์ผ่านฉลุย ยื่นเอกสารและจัดไฟแนนซ์เสร็จสิ้นเมื่อวาน"
  },
  {
    id: "lead-005",
    dealerId: "dealer-nongbot-01",
    name: "คุณสมพงษ์ รถบ้านแท้",
    phone: "084-231-5544",
    message: "โทรสอบถามเรื่องรับเทิร์นรถเก่าเป็น BYD มีบริการประเมินราคาถึงหน้าหมู่บ้านแถวนนทบุรีไหมครับ?",
    status: "lost",
    temperature: "cold",
    channel: "marketplace",
    createdAt: new Date(Date.now() - 1000 * 60 * 10000).toISOString(), // 7 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 9000).toISOString(),
    notes: "ยกเลิกการซื้อเนื่องจากขายรถเก่าได้ราคาต่ำเกินไป"
  }
];

const initialPerformanceMetrics: PostPerformanceMetric[] = [
  {
    id: "perf-001",
    carId: "car-001",
    carTitle: "BYD Seal Premium AWD Electrifier",
    carImage: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=600",
    viewsTotal: 3420,
    favoritesTotal: 189,
    leadsTotal: 15,
    conversionRate: 0.0043,
    boosted: true,
    boostEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days left
    dailyViews: [
      { date: "15 May", views: 400, favorites: 20 },
      { date: "16 May", views: 600, favorites: 35 },
      { date: "17 May", views: 750, favorites: 41 },
      { date: "18 May", views: 900, favorites: 49 },
      { date: "19 May", views: 1100, favorites: 55 },
      { date: "20 May", views: 1300, favorites: 68 },
      { date: "21 May", views: 1540, favorites: 82 }
    ]
  },
  {
    id: "perf-002",
    carId: "car-002",
    carTitle: "Tesla Model 3 Highland Red",
    carImage: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=600",
    viewsTotal: 1840,
    favoritesTotal: 96,
    leadsTotal: 8,
    conversionRate: 0.0043,
    boosted: false,
    dailyViews: [
      { date: "15 May", views: 110, favorites: 5 },
      { date: "16 May", views: 140, favorites: 9 },
      { date: "17 May", views: 220, favorites: 14 },
      { date: "18 May", views: 300, favorites: 19 },
      { date: "19 May", views: 350, favorites: 22 },
      { date: "20 May", views: 420, favorites: 25 },
      { date: "21 May", views: 500, favorites: 31 }
    ]
  },
  {
    id: "perf-003",
    carId: "car-003",
    carTitle: "Porsche Taycan Dynamic White",
    carImage: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=600",
    viewsTotal: 5800,
    favoritesTotal: 412,
    leadsTotal: 18,
    conversionRate: 0.0031,
    boosted: true,
    boostEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(), // 12 days left
    dailyViews: [
      { date: "15 May", views: 600, favorites: 40 },
      { date: "16 May", views: 710, favorites: 51 },
      { date: "17 May", views: 820, favorites: 62 },
      { date: "18 May", views: 950, favorites: 69 },
      { date: "19 May", views: 1050, favorites: 80 },
      { date: "20 May", views: 1200, favorites: 92 },
      { date: "21 May", views: 1370, favorites: 110 }
    ]
  }
];

const initialInquiries: ChatInquiry[] = [
  {
    id: "inq-001",
    carId: "car-001",
    carTitle: "BYD Seal Premium AWD Electrifier",
    carImage: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=600",
    customerName: "พี่โบ๊ท พระรามเก้า",
    customerPhone: "089-223-4455",
    lastMessage: "จองเลยวันพรุ่งนี้มีของแถมพรีเมียมตัวไหนเพิ่มเติมให้พิเศษไหมคร้าบ?",
    timestamp: new Date().toISOString(),
    unread: true,
    status: "active",
    aiSuggestedReplyStatus: "idle",
    aiSuggestedReply: `สวัสดีครับพี่โบ๊ท พระรามเก้า! ยินดีต้อนรับสู่ NongBot Space Garage ค้าบ ✨ หากจอง BYD Seal AWD คันนี้วันพรุ่งนี้ เราแถมฟรีตู้โฮมชาร์จสปีดช็อคโกแลต 11kW พร้อมเคลือบเซรามิกเกราะแก้ว 15,000 บาทฟรีทันที! สนใจจิ้มเวลาจองคุยรายละเอียดได้เลยฮับ! คันนี้มีคนทักแน่ค้าบ 🔥`,
    messages: [
      { id: "m1", sender: "customer", text: "สวัสดีครับ รถ BYD Seal คันเท่พร้อมส่งเลยไหม?", timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString() },
      { id: "m2", sender: "dealer", text: "สวัสดีครับคุณพี่โบ๊ท คันนี้สวยสะพรั่งพร้อมทำสัญญาเปลี่ยนเจ้าของได้เลยครับ สหกรรมสีเดิมบางไร้ชนหนักครับ!", timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString() },
      { id: "m3", sender: "customer", text: "จองเลยวันพรุ่งนี้มีของแถมพรีเมียมตัวไหนเพิ่มเติมให้พิเศษไหมคร้าบ?", timestamp: new Date().toISOString() }
    ]
  },
  {
    id: "inq-002",
    carId: "car-002",
    carTitle: "Tesla Model 3 Highland Red",
    carImage: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=600",
    customerName: "คุณแพรพลอย หยกสยาม",
    customerPhone: "062-887-2233",
    lastMessage: "ขอสลิปยอดจัดของไฟแนนท์เกียรตินาคินหน่อยค่ะ",
    timestamp: new Date(Date.now() - 1000 * 3600 * 4).toISOString(),
    unread: false,
    status: "active",
    aiSuggestedReplyStatus: "idle",
    aiSuggestedReply: `สวัสดีค่ะคุณแพรพลอย เจ้าหน้าที่น้องเอนำสเป็กคันเด็ดมาจัดเงื่อนไขให้แล้วค่ะ บัญชีไฟแนนซ์เกียรตินาคินคันนี้ยอดจัดเต็ม 100% ดอกเบี้ยพิเศษเริ่มต้น 2.49% ผ่อนเดือนละ 14,200 บ. แชทคุยเจ้าหน้าที่การเงินด่วนให้ด่วนเลยค่ะ!`,
    messages: [
      { id: "t1", sender: "customer", text: "Tesla Model 3 ไฮแลนด์สีแดงสวยมากเลยค่ะ รับจัดของธนาคารไหนบ้างคะ?", timestamp: new Date(Date.now() - 1000 * 3600 * 6).toISOString() },
      { id: "t2", sender: "dealer", text: "เราสแตนบายคุยสถาบันการเงินให้ทุกธนาคารชั้นนำเลยครับ เช่น กสิกรไทย, ทหารไทยธนชาต และ เกียรตินาคิน ค้าบผม", timestamp: new Date(Date.now() - 1000 * 3600 * 5).toISOString() },
      { id: "t3", sender: "customer", text: "ขอสลิปยอดจัดของไฟแนนท์เกียรตินาคินหน่อยค่ะ", timestamp: new Date(Date.now() - 1000 * 3600 * 4).toISOString() }
    ]
  }
];

export const useDealerStore = create<DealerStoreState>((set, get) => ({
  profile: initialProfile,
  leads: initialLeads,
  performanceMetrics: initialPerformanceMetrics,
  inquiries: initialInquiries,
  selectedInquiryId: "inq-001",
  
  leadSearchTerm: "",
  leadStatusFilter: "all",
  leadTempFilter: "all",

  updateProfile: (profileData) => {
    set((state) => ({
      profile: { ...state.profile, ...profileData }
    }));
  },

  updateLeadStatus: (leadId, status) => {
    set((state) => ({
      leads: state.leads.map((l) => 
        l.id === leadId ? { ...l, status, updatedAt: new Date().toISOString() } : l
      )
    }));
  },

  updateLeadNotes: (leadId, notes) => {
    set((state) => ({
      leads: state.leads.map((l) => 
        l.id === leadId ? { ...l, notes, updatedAt: new Date().toISOString() } : l
      )
    }));
  },

  addLead: (leadData) => {
    const newLead: DealerLead = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      leads: [newLead, ...state.leads]
    }));
  },

  setSelectedInquiryId: (id) => set({ selectedInquiryId: id }),

  sendInquiryReply: (inquiryId, text) => {
    const freshMessage = {
      id: `m-rep-${Date.now()}`,
      sender: "dealer" as const,
      text,
      timestamp: new Date().toISOString()
    };
    
    set((state) => ({
      inquiries: state.inquiries.map((inq) => {
        if (inq.id === inquiryId) {
          return {
            ...inq,
            lastMessage: text,
            timestamp: new Date().toISOString(),
            unread: false,
            messages: [...inq.messages, freshMessage]
          };
        }
        return inq;
      })
    }));
  },

  generateAISuggestedReply: async (inquiryId) => {
    // Set loading
    set((state) => ({
      inquiries: state.inquiries.map((inq) => 
        inq.id === inquiryId ? { ...inq, aiSuggestedReplyStatus: "generating" as const } : inq
      )
    }));
    
    try {
      const target = get().inquiries.find((i) => i.id === inquiryId);
      if (!target) return;
      
      const lastCustText = target.messages.filter((m) => m.sender === "customer").pop()?.text || "";
      const promptText = `คุณคือ น้องเอ AI อัจฉริยะ ตอบคำถามด่วนสเปคและปิดการขายรถยนต์ ${target.carTitle} สำหรับคุณลูกค้า ${target.customerName} ที่ถามมาว่า: "${lastCustText}". จงตอบสุภาพ หวานซึ้ง สนุกรุกเร็วด้วยคำว่า 'ปังปุริเย่สุดเด็ด' และลงท้ายสะกิดให้ติดต่อผู้จัดการด่วนทันใจ`;
      
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: promptText, history: [] })
      });
      const data = await response.json();
      
      const replyText = (data.success && data.reply) 
        ? data.reply 
        : `ปังปุริเย่สุดเด็ด! น้องเอคัดเงื่อนไขพิเศษให้คุณพี่ ${target.customerName} เรียบร้อยแล้วค่ะ คันนี้พร้อมทดลองขับทันทีที่ศูนย์ บริการของแถมออพชั่นจัดเต็ม นัดติดต่อผู้จัดการได้เลยนะคะ! 🔥`;

      set((state) => ({
        inquiries: state.inquiries.map((inq) => 
          inq.id === inquiryId ? { 
            ...inq, 
            aiSuggestedReply: replyText, 
            aiSuggestedReplyStatus: "ready" as const 
          } : inq
        )
      }));
    } catch (e) {
      console.error("Store error generating AI suggestion reply:", e);
      set((state) => ({
        inquiries: state.inquiries.map((inq) => 
          inq.id === inquiryId ? { ...inq, aiSuggestedReplyStatus: "idle" as const } : inq
        )
      }));
    }
  },

  boostListing: (carId) => {
    set((state) => {
      // Deduct client credits
      const cost = 25;
      const remains = Math.max(0, state.profile.creditsRemaining - cost);
      
      // Update Performance metrics
      const alreadyHave = state.performanceMetrics.some((pm) => pm.carId === carId);
      let updatedPM = [...state.performanceMetrics];
      
      if (alreadyHave) {
        updatedPM = state.performanceMetrics.map((pm) => 
          pm.carId === carId ? {
            ...pm,
            boosted: true,
            boostEndDate: new Date(Date.now() + 1000 * 3600 * 24 * 7).toISOString()
          } : pm
        );
      } else {
        updatedPM.push({
          id: `perf-new-${Date.now()}`,
          carId,
          carTitle: "โฆษณารถบูสต์ใหม่",
          viewsTotal: 100,
          favoritesTotal: 5,
          leadsTotal: 1,
          conversionRate: 0.01,
          boosted: true,
          boostEndDate: new Date(Date.now() + 1000 * 3600 * 24 * 7).toISOString(),
          dailyViews: [{ date: "Today", views: 100, favorites: 5 }]
        });
      }

      return {
        profile: { ...state.profile, creditsRemaining: remains },
        performanceMetrics: updatedPM
      };
    });
  },

  upgradeSubscription: (plan) => {
    set((state) => {
      let isUnlimited = plan !== "free";
      let autoReply = plan === "elite_pro";
      return {
        profile: {
          ...state.profile,
          subscriptionPlan: plan,
          unlimitedListingEnabled: isUnlimited,
          aiAutoReplyEnabled: autoReply,
          verified: plan !== "free"
        }
      };
    });
  },

  setLeadSearchTerm: (term) => set({ leadSearchTerm: term }),
  setLeadStatusFilter: (status) => set({ leadStatusFilter: status }),
  setLeadTempFilter: (temp) => set({ leadTempFilter: temp }),

  getAnalytics: () => {
    const { leads, performanceMetrics } = get();
    
    // Sum view counters
    const views = performanceMetrics.reduce((sum, item) => sum + item.viewsTotal, 0);
    const favorites = performanceMetrics.reduce((sum, item) => sum + item.favoritesTotal, 0);
    const totalLeads = leads.length;
    const rate = views > 0 ? (totalLeads / views) * 100 : 0;
    
    // Monthly Est Revenue is hardcoded demo calculation
    const leadsCount = leads.filter(l => l.status === "completed").length;
    const revenue = leadsCount * 3500 + 42000; // estimated SaaS yield

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const leadsToday = leads.filter(l => new Date(l.createdAt).getTime() >= todayStart.getTime()).length;

    // Map weekly lines
    const weekly = [
      { name: "จันทร์", views: 1200, leads: 4 },
      { name: "อังคาร", views: 1510, leads: 5 },
      { name: "พุธ", views: 2200, leads: 9 },
      { name: "พฤหัสบดี", views: 2450, leads: 8 },
      { name: "ศุกร์", views: 2800, leads: 12 },
      { name: "เสาร์", views: 3600, leads: 15 },
      { name: "อาทิตย์", views: 4210, leads: 18 }
    ];

    const funnel = [
      { stage: "ผู้คลิกชมโชว์รูม (Total Views)", value: views },
      { stage: "กดเซฟเป็นที่โปรดปราน (Favorites)", value: favorites },
      { stage: "กรอกข้อมูลติดต่อซื้อ (Total Leads)", value: totalLeads },
      { stage: "ปิดการขายจองสำเร็จ (Completed Deal)", value: leadsCount }
    ];

    const trending = [
      { id: "car-001", title: "BYD Seal Premium AWD Electrifier", views: 3420, favorites: 189, leads: 15, rating: 95, image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=300" },
      { id: "car-002", title: "Tesla Model 3 Highland Red", views: 1840, favorites: 96, leads: 8, rating: 88, image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=300" },
      { id: "car-003", title: "Porsche Taycan Dynamic White", views: 5800, favorites: 412, leads: 18, rating: 98, image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=300" }
    ];

    return {
      totalViews: views,
      totalFavorites: favorites,
      totalLeads,
      activeListingsCount: performanceMetrics.length,
      conversionRate: parseFloat(rate.toFixed(1)),
      leadsToday: leadsToday || 2, // fallback demo visual
      monthlyRevenueEst: revenue,
      viewsWeeklyHistory: weekly,
      funnelData: funnel,
      trendingCars: trending
    };
  }
}));
