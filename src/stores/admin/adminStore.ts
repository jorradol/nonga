import { create } from "zustand";
import { 
  AdminRole, 
  PlatformUser, 
  SupportTicket, 
  ReportedItem, 
  AdminAuditLog, 
  AnalyticsStats 
} from "../../types";

interface AdminState {
  // Current admin simulation profile
  adminProfile: {
    id: string;
    displayName: string;
    email: string;
    role: AdminRole;
  };
  
  // Tab control
  activeTab: "dashboard" | "users" | "listings" | "dealers" | "tickets" | "moderation" | "logs" | "ai-control";
  setActiveTab: (tab: AdminState["activeTab"]) => void;
  
  // Set simulated Role
  setAdminRole: (role: AdminRole) => void;

  // Platform states
  platformUsers: PlatformUser[];
  tickets: SupportTicket[];
  reportedItems: ReportedItem[];
  auditLogs: AdminAuditLog[];
  analytics: AnalyticsStats;

  // Actions
  updateUserStatus: (userId: string, status: PlatformUser["status"]) => void;
  changeUserRole: (userId: string, role: PlatformUser["role"]) => void;
  addPlatformUser: (user: Omit<PlatformUser, "joinedAt" | "strikeCount">) => void;
  
  moderateReport: (reportId: string, action: "resolve" | "ignored" | "removed") => void;
  triggerAIModerationCheck: (reportId: string) => Promise<void>;
  
  replyToTicket: (ticketId: string, replyMessage: string) => void;
  updateTicketStatus: (ticketId: string, status: SupportTicket["status"]) => void;
  
  addAuditLogEntry: (action: string, details: string) => void;
  
  // Filters & Search State
  userSearchQuery: string;
  setUserSearchQuery: (query: string) => void;
  userRoleFilter: string;
  setUserRoleFilter: (filter: string) => void;
  
  listingSearchQuery: string;
  setListingSearchQuery: (query: string) => void;
  listingTypeFilter: string;
  setListingTypeFilter: (filter: string) => void;
  
  ticketPriorityFilter: string;
  setTicketPriorityFilter: (filter: string) => void;
  ticketStatusFilter: string;
  setTicketStatusFilter: (filter: string) => void;

  // Multiple selection for bulk actions
  selectedUserIds: string[];
  toggleSelectUser: (userId: string) => void;
  clearSelectedUsers: () => void;
  bulkActionUsers: (action: "suspend" | "activate" | "make_moderator") => void;

  selectedListingIds: string[];
  toggleSelectListing: (listingId: string) => void;
  clearSelectedListings: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // Default Session Admin is Super Admin to provide all keys in play immediately!
  adminProfile: {
    id: "admin-101",
    displayName: "คุณนันตวัฒน์ ชัยดี (Nong A Superadmin)",
    email: "super.nong@gmail.com",
    role: "superadmin"
  },
  
  activeTab: "dashboard",
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setAdminRole: (role) => {
    set((state) => ({
      adminProfile: { ...state.adminProfile, role }
    }));
    get().addAuditLogEntry(
      "CHANGE_ROLE_SIMULATION",
      `เปลี่ยนสลับสิทธิ์การทดสอบเป็นบทบาท: ${role}`
    );
  },

  // Search & Filter Inputs
  userSearchQuery: "",
  setUserSearchQuery: (query) => set({ userSearchQuery: query }),
  userRoleFilter: "all",
  setUserRoleFilter: (filter) => set({ userRoleFilter: filter }),

  listingSearchQuery: "",
  setListingSearchQuery: (query) => set({ listingSearchQuery: query }),
  listingTypeFilter: "all",
  setListingTypeFilter: (filter) => set({ listingTypeFilter: filter }),

  ticketPriorityFilter: "all",
  setTicketPriorityFilter: (filter) => set({ ticketPriorityFilter: filter }),
  ticketStatusFilter: "all",
  setTicketStatusFilter: (filter) => set({ ticketStatusFilter: filter }),

  // Bulk Selection States
  selectedUserIds: [],
  toggleSelectUser: (userId) => set((state) => {
    const exists = state.selectedUserIds.includes(userId);
    return {
      selectedUserIds: exists 
        ? state.selectedUserIds.filter(id => id !== userId) 
        : [...state.selectedUserIds, userId]
    };
  }),
  clearSelectedUsers: () => set({ selectedUserIds: [] }),
  bulkActionUsers: (action) => {
    const selected = get().selectedUserIds;
    if (selected.length === 0) return;

    set((state) => {
      const updated = state.platformUsers.map(u => {
        if (selected.includes(u.id)) {
          if (action === "suspend") return { ...u, status: "suspended" as const };
          if (action === "activate") return { ...u, status: "active" as const };
          if (action === "make_moderator") return { ...u, role: "moderator" as const };
        }
        return u;
      });
      return { platformUsers: updated };
    });

    get().addAuditLogEntry(
      "BULK_USER_ACTION",
      `ดำเนินการแผงควบคุมระดับกลุ่ม (${action}) กับรหัสผู้ใช้จำนวน ${selected.length} รายการ`
    );
    get().clearSelectedUsers();
  },

  selectedListingIds: [],
  toggleSelectListing: (listingId) => set((state) => {
    const exists = state.selectedListingIds.includes(listingId);
    return {
      selectedListingIds: exists
        ? state.selectedListingIds.filter(id => id !== listingId)
        : [...state.selectedListingIds, listingId]
    };
  }),
  clearSelectedListings: () => set({ selectedListingIds: [] }),

  // Highly illustrative preloaded data
  platformUsers: [
    { id: "u-e102", displayName: "ณธิดา ทองพิทักษ์", email: "nathida.gold@gmail.com", role: "user", status: "active", joinedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(), strikeCount: 0, avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=nathida" },
    { id: "u-e103", displayName: "พิชัย ศักดิ์เจริญ (ดีลเลอร์สมใจ)", email: "somjai_luxury@nongbot.space", role: "dealer", status: "active", joinedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(), strikeCount: 0, avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=somjai" },
    { id: "u-e104", displayName: "สุรเดช ปากจัด (สแปมเมอร์)", email: "suradech_spam100@gmail.com", role: "user", status: "suspended", joinedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), strikeCount: 3, avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=suradech" },
    { id: "u-e105", displayName: "สิริขวัญ ชาดก", email: "siri_heart@outlook.com", role: "user", status: "active", joinedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), strikeCount: 0, avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=siri" },
    { id: "u-e106", displayName: "วาริส บุญนำ", email: "varis.boon@gmail.com", role: "user", status: "pending_verification", joinedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), strikeCount: 0, avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=varis" }
  ],

  tickets: [
    {
      id: "t-701",
      userId: "u-e102",
      userName: "ณธิดา ทองพิทักษ์",
      userEmail: "nathida.gold@gmail.com",
      title: "ชำระเงินโอนจองดีลเลอร์สุพรีมคาร์แล้ว ไม่ได้รับบิลคำยืนยันค่ะ",
      message: "ทำเรื่องโอนเงินจองรถ BYD Seal 50,000 บาทกับดีลเลอร์ Super EV ไปเมื่อเช้า แต่ในหน้าระดับสมาชิก Saved ยังขึ้นว่ารอเจรจา รบกวนเจ้าหน้าที่ช่วยสะสางประสานงานสลิปด้วยนะคะ",
      category: "billing",
      status: "open",
      priority: "high",
      createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      replies: []
    },
    {
      id: "t-702",
      userId: "u-e105",
      userName: "สิริขวัญ ชาดก",
      userEmail: "siri_heart@outlook.com",
      title: "ปุ่มวิเคราะห์ภาพถ่ายรถยนต์ด้วย CarVision ค้างในไอโฟนคุณแม่ค่ะ",
      message: "กดปุ่มประมวลความโปร่งใสของพารามิเตอร์รูปถ่ายแล้วจอขาว น่าจะติด permission กล้องถ่ายรูปจากเว็บไอเฟรมไหมคะ ฝาก AI Manager อัปเดตแพตช์ด่วนด้วยค่ะ",
      category: "technical",
      status: "in_progress",
      priority: "medium",
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      replies: [
        { senderName: "AI Co-pilot Bot", senderRole: "AI manager", message: "สวัสดีค่ะ ได้ทำการตรวจห่อหุ้ม API กล้องใน iFrame Sandbox แล้ว พบว่าใน iOS ต้องเปิดโมดูลในระดับ metadata.json แล้วค่ะ ได้อัปเดตแกนหลัก แนะนำขยายดูเต็มตานะคะคุณหนู", createdAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString() }
      ]
    },
    {
      id: "t-703",
      userId: "u-e103",
      userName: "พิชัย ศักดิ์เจริญ (ดีลเลอร์สมใจ)",
      userEmail: "somjai_luxury@nongbot.space",
      title: "ขอยื่นจดทะเบียนโชว์รูมสาขาสอง ย่านนนทบุรีครับ",
      message: "เอกสารสิทธิ์จัดสิทธิผูกขาดครอบคลุมและใบจดการค้าแนบมาด้วยแล้วครับ อยากขอนุมัติเรตติ้งระดับความปลอดภัยพรีเมียมตรา Certified ตลาดกลางทองคำครับ",
      category: "general",
      status: "resolved",
      priority: "low",
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      replies: [
        { senderName: "Nong A Superadmin", senderRole: "superadmin", message: "ตรวจสอบเอกสารสิทธิ์ครบครัน มอบเหรียญตรา Certified พาร์ทเนอร์พิเศษสำเร็จ ยินดีด้วยครับปังปุริเย่!", createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() }
      ]
    }
  ],

  reportedItems: [
    {
      id: "rep-201",
      targetId: "car-001",
      targetType: "car",
      targetTitle: "Tesla Model 3 LR Dual Motor 2023",
      reportedBy: "นรรธรา ตาสับปะรด",
      reason: "รูปภาพบางรูปเบลอ เกรงว่าจะเป็นการเอารถกระดาษสไลด์ขายหลอกลวง",
      details: "คันนี้แอบสังเกตรูปที่ 2 เหมือนมีตราลิขสิทธิ์จากเว็บอื่นติดมา ไม่ใช่ภาพถ่ายตัวจริง สภาพนางฟ้าจริงหรือเปล่าเอ่ย",
      aiClassification: "ImageMismatch: 88%, FakeListingRate: 40%",
      aiSafeVerdict: "needs_manual_review",
      status: "pending",
      reportedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: "rep-202",
      targetId: "comment-34",
      targetType: "comment",
      targetTitle: "คุณวิทยา ลิขิตปานพูน",
      reportedBy: "เจ้าของพอร์ตทอล์ค",
      reason: "คอมเมนต์ฝากโชว์รูมขายสบู่ ครีมผิวขาว และโปรเสริมเน็ต",
      details: "มาพิมพ์โพสต์ลิ้งค์สแปมแอดไลน์ขายของใต้รูปโพสต์รถ BMW M4 แอดมินลบให้ทีครับ รบกวนอารมณ์ลูกค้าแท้",
      aiClassification: "Spam: 99%, LinkPromotion: 97%",
      aiSafeVerdict: "flagged",
      status: "pending",
      reportedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
    }
  ],

  auditLogs: [
    { id: "log-1", adminId: "admin-101", adminName: "คุณนันตวัฒน์", adminRole: "superadmin", action: "BOOTSTRAP_SYSTEM", details: "วิเคราะห์โครงสร้างข้อมูล SaaS Enterprise เชื่อมต่อ AI Sandbox สำเร็จ", timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
    { id: "log-2", adminId: "admin-101", adminName: "คุณนันตวัฒน์", adminRole: "superadmin", action: "DEALER_VERIFY_SUCCESS", details: "อนุมัติตราตั้งสมเกียรติให้โชว์รูม Luxury Wheels Elite ทองหล่อ สภาพเสร็จเรียบร้อย", timestamp: new Date(Date.now() - 15 * 3600 * 1000).toISOString() }
  ],

  analytics: {
    totalUsers: 1470,
    activeDealers: 3,
    carsListedToday: 24,
    aiUsageCount: 4325,
    revenueTotal: 345000, // represent virtual broker listing fees / VIP subscription levels
    reportedItemsCount: 2,
    openTicketsCount: 2,
    growthRate: 14.5
  },

  // State Mutators
  updateUserStatus: (userId, status) => {
    set((state) => ({
      platformUsers: state.platformUsers.map((u) => 
        u.id === userId ? { ...u, status } : u
      )
    }));
    
    const userObj = get().platformUsers.find(u => u.id === userId);
    get().addAuditLogEntry(
      "UPDATE_USER_STATUS",
      `ปรับสถานะผู้ใช้ "${userObj?.displayName || userId}" เป็น: ${status}`
    );
  },

  changeUserRole: (userId, role) => {
    set((state) => ({
      platformUsers: state.platformUsers.map((u) => 
        u.id === userId ? { ...u, role } : u
      )
    }));
    
    const userObj = get().platformUsers.find(u => u.id === userId);
    get().addAuditLogEntry(
      "CHANGE_USER_ROLE",
      `ปรับบทบาทผู้ใช้ "${userObj?.displayName || userId}" เป็นสมาชิกแบบ: ${role}`
    );
  },

  addPlatformUser: (user) => {
    const newUser: PlatformUser = {
      ...user,
      joinedAt: new Date().toISOString(),
      strikeCount: 0
    };
    set((state) => ({
      platformUsers: [newUser, ...state.platformUsers]
    }));
    get().addAuditLogEntry("CREATE_USER", `สร้างสิทธิ์ผู้ใช้งานใหม่ผ่านฝ่ายพรีเมียม: ${user.displayName}`);
  },

  moderateReport: (reportId, action) => {
    set((state) => ({
      reportedItems: state.reportedItems.map((r) => 
        r.id === reportId ? { ...r, status: action === "resolve" ? "resolved" : action === "removed" ? "removed" : "ignored" } : r
      )
    }));

    const repObj = get().reportedItems.find(r => r.id === reportId);
    get().addAuditLogEntry(
      "MODERATE_REPORT",
      `พิจารณารายการแจ้งร้องเรียน ID: ${reportId} เป็น: ${action} (หัวข้อ: ${repObj?.targetTitle})`
    );
  },

  triggerAIModerationCheck: async (reportId) => {
    // Simulate real AI Moderation callback API
    await new Promise((resolve) => setTimeout(resolve, 1500));
    set((state) => ({
      reportedItems: state.reportedItems.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            aiClassification: "Clean: 5%, ToxicSpeech: 85%, HighRiskProfile: 90%",
            aiSafeVerdict: "flagged",
            details: (r.details || "") + "\n[AI Analysis Audit: ตัวแปรหางข้อมูลบ่งชี้ประวัติสแปมสูง]"
          };
        }
        return r;
      })
    }));

    get().addAuditLogEntry("AI_MODERATION_RUN", `บอท AI รันวิเคราะห์สแกนความสุ่มเสี่ยงเสร็จสิ้น คิวคัดกรอง ID: ${reportId}`);
  },

  replyToTicket: (ticketId, replyMessage) => {
    const activeAdmin = get().adminProfile;
    set((state) => {
      const targetTicket = state.tickets.find((t) => t.id === ticketId);
      if (!targetTicket) return {};

      const nextReply = {
        senderName: activeAdmin.displayName,
        senderRole: activeAdmin.role,
        message: replyMessage,
        createdAt: new Date().toISOString()
      };

      const updated = state.tickets.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: "resolved" as const, // auto set to resolved when admin replies
            updatedAt: new Date().toISOString(),
            replies: [...t.replies, nextReply]
          };
        }
        return t;
      });

      return { tickets: updated };
    });

    get().addAuditLogEntry(
      "SUPPORT_TICKET_REPLY",
      `ตอบกลับฝ่ายจำเลยและจดสถานะResolved ตั๋วสนับสนุนดีล ID: ${ticketId}`
    );
  },

  updateTicketStatus: (ticketId, status) => {
    set((state) => ({
      tickets: state.tickets.map((t) => 
        t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t
      )
    }));
    get().addAuditLogEntry("SUPPORT_TICKET_STATUS", `เปลี่ยนเครื่องกรองตั๋ว ID: ${ticketId} เป็น: ${status}`);
  },

  addAuditLogEntry: (action, details) => {
    const admin = get().adminProfile;
    const newLog: AdminAuditLog = {
      id: `audit-${Math.floor(1000 + Math.random() * 9000)}`,
      adminId: admin.id,
      adminName: admin.displayName,
      adminRole: admin.role,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    set((state) => ({
      auditLogs: [newLog, ...state.auditLogs]
    }));
  }
}));
