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
  activeTab:
    | "dashboard"
    | "users"
    | "listings"
    | "dealers"
    | "tickets"
    | "moderation"
    | "logs"
    | "ai-control"
    | "revenue-preview";
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
  // Default to the least-privileged admin view until real auth state is applied.
  adminProfile: {
    id: "admin-101",
    displayName: "Nong A Admin",
    email: "admin@local.invalid",
    role: "admin"
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

  // Production-clean default: no synthetic/illustrative data is bundled.
  // Real admin surfaces must hydrate from an authorized server API; until then the
  // dashboard renders an honest empty state. See Production Foundation B2.
  platformUsers: [],

  tickets: [],

  reportedItems: [],

  auditLogs: [],

  analytics: {
    totalUsers: 0,
    activeDealers: 0,
    carsListedToday: 0,
    aiUsageCount: 0,
    revenueTotal: 0,
    reportedItemsCount: 0,
    openTicketsCount: 0,
    growthRate: 0
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
