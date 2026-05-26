import React, { useEffect, useMemo, useState } from "react";
import { useAdmin } from "../../hooks/admin/useAdmin";
import { useAuth } from "../../hooks/auth/useAuth";
import { useRole } from "../../hooks/auth/useRole";
import { useAppStore } from "../../store";
import { AdminRole, PlatformUser, SupportTicket, ReportedItem } from "../../types";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip as ChartTooltip, CartesianGrid, LineChart, Line, BarChart, Bar
} from "recharts";
import { 
  Sparkles, ShieldCheck, ShieldAlert, Users, Store, Car, 
  MessageSquare, History, CreditCard, TrendingUp, Search, 
  Filter, CheckSquare, Square, Trash2, Mail, Phone, Calendar, 
  AlertTriangle, Check, X, RefreshCw, Send, Plus, Eye, Key,
  FileText, Activity, MoreVertical, LayoutGrid, CheckCircle2, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AIControlCenter from "./ai/AIControlCenter";

// Robust mock charts data set
const growthTrendData = [
  { name: "ม.ค.", listings: 120, traffic: 1400, revenue: 18000 },
  { name: "ก.พ.", listings: 210, traffic: 2200, revenue: 29000 },
  { name: "มี.ค.", listings: 350, traffic: 3805, revenue: 45000 },
  { name: "เม.ย.", listings: 540, traffic: 5120, revenue: 62000 },
  { name: "พ.ค.", listings: 850, traffic: 8900, revenue: 112000 },
  { name: "มิ.ย.", listings: 1470, traffic: 12400, revenue: 345000 }
];

const aiRequestData = [
  { name: "จ.", chats: 420, analysis: 130 },
  { name: "อ.", chats: 510, analysis: 190 },
  { name: "พ.", chats: 480, analysis: 220 },
  { name: "พฤ.", chats: 670, analysis: 310 },
  { name: "ศ.", chats: 720, analysis: 420 },
  { name: "ส.", chats: 890, analysis: 490 },
  { name: "อา.", chats: 635, analysis: 380 }
];

export default function AdminDashboardView() {
  const adminState = useAdmin();
  const { user, isSimulatedState } = useAuth();
  const { role } = useRole();
  const { setView } = useAppStore();
  const effectiveAdminRole: AdminRole =
    role === "superadmin" ? "superadmin" : "admin";
  const displayedAdminProfile = useMemo(
    () => ({
      displayName: user?.displayName || adminState.adminProfile.displayName,
      email: user?.email || adminState.adminProfile.email,
      role: effectiveAdminRole,
    }),
    [
      adminState.adminProfile.displayName,
      adminState.adminProfile.email,
      effectiveAdminRole,
      user?.displayName,
      user?.email,
    ]
  );
  const showRoleSwitcher = isSimulatedState;

  useEffect(() => {
    if (adminState.adminProfile.role !== effectiveAdminRole) {
      adminState.setAdminRole(effectiveAdminRole);
    }
  }, [adminState.adminProfile.role, adminState.setAdminRole, effectiveAdminRole]);
  
  // Local active item details modal (for ticket replies & reports dialog)
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState("");
  
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportResultText, setReportResultText] = useState("");

  // Create User Modal Trigger
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "dealer" | "admin" | "moderator" | "AI manager">("user");

  const activeTicket = adminState.tickets.find(t => t.id === activeTicketId);
  const activeReport = adminState.reportedItems.find(r => r.id === activeReportId);

  // Filter implementation
  const filteredUsers = adminState.platformUsers.filter((u) => {
    const matchesSearch = u.displayName.toLowerCase().includes(adminState.userSearchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(adminState.userSearchQuery.toLowerCase());
    const matchesRole = adminState.userRoleFilter === "all" || u.role === adminState.userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredListings = adminState.cars.filter((car) => {
    const matchesSearch = car.title.toLowerCase().includes(adminState.listingSearchQuery.toLowerCase()) || 
                          car.brand.toLowerCase().includes(adminState.listingSearchQuery.toLowerCase());
    const matchesType = adminState.listingTypeFilter === "all" || car.type === adminState.listingTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredTickets = adminState.tickets.filter((t) => {
    const matchesPriority = adminState.ticketPriorityFilter === "all" || t.priority === adminState.ticketPriorityFilter;
    const matchesStatus = adminState.ticketStatusFilter === "all" || t.status === adminState.ticketStatusFilter;
    return matchesPriority && matchesStatus;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 text-left selection:bg-orange-500/30">
      
      {/* SIDEBAR BLOCK: Shopfiy style sidebar */}
      <div className="w-full lg:w-64 shrink-0 rounded-3xl p-5 border border-white/[0.06] bg-[#0c0c0e]/95 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          <div className="pt-2 flex items-center gap-2.5 px-1 pb-4 border-b border-white/[0.05]">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/20">
              ⚙️
            </div>
            <div>
              <h1 className="text-[15px] font-display font-black text-white tracking-tight leading-none">Nong Bot HQ</h1>
              <span className="text-[9px] text-orange-400 font-bold uppercase tracking-widest leading-none">Enterprise SaaS Console</span>
            </div>
          </div>

          {showRoleSwitcher ? (
            <div className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-550/15 space-y-2 text-left">
              <span className="text-[9.5px] uppercase font-mono tracking-widest text-slate-500 font-extrabold block">บทบาทจำลอง (Interactive Role):</span>
              <select
                value={adminState.adminProfile.role}
                onChange={(e) => adminState.setAdminRole(e.target.value as AdminRole)}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-black tracking-wide text-orange-400 cursor-pointer focus:outline-none focus:border-orange-500"
              >
                <option value="superadmin">Superadmin (Full Access)</option>
                <option value="admin">Admin (Operations)</option>
                <option value="moderator">Moderator (Compliance)</option>
                <option value="AI manager">AI Manager (System Co-pilot)</option>
              </select>
              <p className="text-[9.5px] text-slate-450 leading-relaxed font-sans">
                * ใช้เฉพาะโหมดจำลอง/พัฒนา เพื่อทดสอบสิทธิ์การจำกัดและการเข้าถึงปุ่มต่างๆ ในระบบ
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/[0.06] space-y-1.5 text-left">
              <span className="text-[9.5px] uppercase font-mono tracking-widest text-slate-500 font-extrabold block">บทบาทจริงจาก Firebase Profile</span>
              <p className="text-[12px] font-black text-orange-400">
                {displayedAdminProfile.role === "superadmin"
                  ? "Superadmin"
                  : "Admin"}
              </p>
              <p className="text-[9.5px] text-slate-450 leading-relaxed font-sans">
                บทบาทนี้อ่านจากบัญชีที่เข้าสู่ระบบจริง ไม่เปิดให้สลับ role ใน staging
              </p>
            </div>
          )}

          {/* Navigation Items stack */}
          <nav className="flex flex-col gap-1.5 pt-2">
            <button
              onClick={() => adminState.setActiveTab("dashboard")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between text-left transition ${
                adminState.activeTab === "dashboard"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-600/10"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutGrid className="w-4 h-4" />
                <span>แดชบอร์ดสรุป</span>
              </span>
              <TrendingUp className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>

            <button
              onClick={() => adminState.setActiveTab("users")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "users"
                  ? "bg-orange-600 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ผู้ใช้งาน ({adminState.platformUsers.length})</span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("listings")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "listings"
                  ? "bg-orange-600 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Car className="w-4 h-4" />
              <span>จดประกาศรถ ({adminState.cars.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setView("inventory-import")}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 border border-teal-500/15"
            >
              <Upload className="w-4 h-4" />
              <span>นำเข้าคลังรถ (Smart Import)</span>
            </button>

            <button
              type="button"
              onClick={() => setView("dealer-draft-inventory")}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/15"
            >
              <Upload className="w-4 h-4" />
              <span>คลังรถ Draft (รอแก้ไข)</span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("dealers")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between text-left transition ${
                adminState.activeTab === "dealers"
                  ? "bg-orange-600 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Store className="w-4 h-4" />
                <span>ดีลเลอร์สเป็คทอง ({adminState.dealers.length})</span>
              </span>
              <span className="text-[9.5px] px-1.5 py-0.2 bg-orange-500/15 text-orange-400 font-extrabold rounded">
                {adminState.dealers.filter(d => !d.verified).length} รอตรวจ
              </span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("tickets")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between text-left transition ${
                adminState.activeTab === "tickets"
                  ? "bg-orange-600 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" />
                <span>ตั๋วช่วยเหลือ ({adminState.tickets.length})</span>
              </span>
              <span className="text-[10px] w-5 h-5 bg-orange-655 text-white flex items-center justify-center font-black rounded-full text-xs">
                {adminState.tickets.filter(t => t.status === "open").length}
              </span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("moderation")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between text-left transition ${
                adminState.activeTab === "moderation"
                  ? "bg-orange-600 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4" />
                <span>ศูนย์คัดกรอง AI</span>
              </span>
              {adminState.reportedItems.filter(r => r.status === "pending").length > 0 && (
                <span className="px-1.5 py-0.2 bg-red-500/20 text-red-500 font-black rounded text-[9.5px]">
                  {adminState.reportedItems.filter(r => r.status === "pending").length} คิว
                </span>
              )}
            </button>

            <button
              onClick={() => adminState.setActiveTab("ai-control")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "ai-control"
                  ? "bg-orange-600 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>แผงควบคุม AI Nong A 🤖</span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("logs")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "logs"
                  ? "bg-orange-600 text-white shadow"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <History className="w-4 h-4" />
              <span>บันทึกระบบปฏิบัติงาน logs</span>
            </button>
          </nav>

        </div>

        {/* Dynamic active user credentials status card */}
        <div className="pt-4 border-t border-white/[0.05] space-y-2 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-full bg-slate-800 flex items-center justify-center text-sm font-black border border-white/10 overflow-hidden">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=NongBot" alt="admin avatar" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-[12px] font-bold truncate leading-none mb-0.5">{displayedAdminProfile.displayName}</p>
              <span className="text-[9px] text-slate-500 font-semibold font-mono tracking-wide block truncate">{displayedAdminProfile.email}</span>
            </div>
          </div>
          
          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5 leading-none">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span>ระดับ: <strong>{displayedAdminProfile.role.toUpperCase()}</strong></span>
          </div>
        </div>

      </div>

      {/* RENDER ACTIVE TAB AREA */}
      <div className="flex-1 space-y-6">
        
        {/* TAB 1: SUMMARY DASHBOARD INSIGHTS */}
        {adminState.activeTab === "dashboard" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">ศูนย์ควบคุม Nong A Administrative Dashboard</h2>
              <p className="text-slate-400 text-xs sm:text-sm">แดชบอร์ดสรุปความต้องการใช้งาน ทราฟฟิกมาร์เก็ตเพลส และการวิเคราะห์โครงสร้างสุขภาพข้อมูล</p>
            </div>

            {/* A. PLATFORM WIDGETS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-md space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">ผู้ลงทะเบียนใช้งานทั้งหมด</span>
                  <Users className="w-4.5 h-4.5 text-orange-500" />
                </div>
                <p className="text-2xl font-black text-white">{adminState.analytics.totalUsers + filteredUsers.length}</p>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">+14.5% เทียบจากเดือนก่อน</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-md space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">ดีลเลอร์แอคทีฟสต็อก</span>
                  <Store className="w-4.5 h-4.5 text-orange-500" />
                </div>
                <p className="text-2xl font-black text-white">{adminState.dealers.length} ดีลเลอร์</p>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-emerald-400 font-bold">● {adminState.dealers.filter(d => d.verified).length} ยืนยันแล้ว</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-md space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">รถที่ประกาศขายวันนี้</span>
                  <Car className="w-4.5 h-4.5 text-orange-500" />
                </div>
                <p className="text-2xl font-black text-white">{adminState.cars.length} คันสแตนด์บาย</p>
                <span className="text-[10px] text-orange-400 font-bold">สตรีมมิ่งสดเรียลไทม์ server</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-md space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">มูลค่าจัดจองสะสม (Virtual)</span>
                  <CreditCard className="w-4.5 h-4.5 text-orange-400" />
                </div>
                <p className="text-2xl font-black text-white">฿{(adminState.analytics.revenueTotal).toLocaleString()}</p>
                <span className="text-[10px] text-orange-400 font-sans block leading-none font-bold">รวมค่าบริการพรีเมียมลิสติ้ง</span>
              </div>
            </div>

            {/* B. DETAILED CHARTS DIVISION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart 1: Platform Growth & Traffic */}
              <div className="lg:col-span-2 p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-md space-y-3 text-left">
                <div>
                  <h3 className="text-sm font-bold text-white font-display">อัตราการเติบโตและการเข้าดูรถยนต์ (Marketplace Revenue & Traffic)</h3>
                  <p className="text-[10px] text-slate-500 font-sans">จำนวนพรีเลจสตรีมมิ่งรถและทราฟฟิกลูกค้า (ม.ค. - มิ.ย. 2026)</p>
                </div>
                <div className="h-64 mt-4 text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" vertical={false} />
                      <XAxis dataKey="name" stroke="#5d5d61" />
                      <YAxis stroke="#5d5d61" />
                      <ChartTooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#333", color: "#ccc" }} />
                      <Area type="monotone" dataKey="traffic" name="ทราฟฟิกสไลด์ชม" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTraffic)" />
                      <Area type="monotone" dataKey="listings" name="ดีลเลอร์โพสต์สะสม" stroke="#ea580c" fillOpacity={1} fill="url(#colorListings)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: AI Co-pilot usage stats */}
              <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-md space-y-3 text-left">
                <div>
                  <h3 className="text-sm font-bold text-white">สถิติเรียกใช้งานโมเดล AI (Chat & CarVision Analyzer)</h3>
                  <p className="text-[10px] text-slate-500 font-sans">ประมวลผลคำขอต่อรองแบบส่งสตรีม (สัปดาห์นี้)</p>
                </div>
                <div className="h-64 mt-4 text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aiRequestData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" vertical={false} />
                      <XAxis dataKey="name" stroke="#5d5d61" />
                      <YAxis stroke="#5d5d61" />
                      <ChartTooltip contentStyle={{ backgroundColor: "#0c0c0e", borderColor: "#333", color: "#ccc" }} />
                      <Bar dataKey="chats" name="น้องเอสตรีม" fill="#ea580c" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="analysis" name="ตรวจสภาพกล้อง" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* C. GEMINI AI PLATFORM SECURITY OFFICER MODULE */}
            <div className="p-6 rounded-3xl border border-orange-550/20 bg-gradient-to-r from-orange-950/25 to-[#09090b] relative overflow-hidden backdrop-blur text-left space-y-4">
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="px-3 py-0.5 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> High-End Co-pilot Module
                  </span>
                  <h3 className="text-[15px] font-display font-black text-white">ระบบสแกนความปลอดภัยแพลตฟอร์มด้วยปัญญาประดิษฐ์ (A.I. Moderation & Audit)</h3>
                  <p className="text-slate-400 text-xs font-sans">
                    เมื่อมีประเด็นเรื่องข้อร้องเรียน รถยนต์สภาพน่าสงสัย หรือคำร้องดีลเลอร์ คลิดเพื่อจำลองปัญญาประดิษฐ์ตรวจสุขภาพมาร์เก็ตเพลสวิเคราะห์กลยุทธ์รักษาความปลอดภัยที่ดีที่สุด
                  </p>
                </div>

                <button
                  onClick={adminState.handleRunPlatformAIAudit}
                  disabled={adminState.aiAuditLoading}
                  className="w-full sm:w-auto shrink-0 px-4.5 py-3 rounded-xl bg-orange-600 hover:bg-orange-550 disabled:bg-orange-900/50 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20"
                >
                  {adminState.aiAuditLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gemini กำลังสแกนแผงความห่วงใย...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>วิเคราะห์ด้วย Gemini Enterprise 🤖</span>
                    </>
                  )}
                </button>
              </div>

              {/* RENDER AI HEALTH AUDIT RESPONSE OR LAUNCHER PLACEHOLDER */}
              <AnimatePresence mode="wait">
                {adminState.aiAuditResult ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-[#09090c]/90 border border-orange-500/20 text-left space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                      <div className="space-y-1 bg-slate-900/40 p-3.5 rounded-xl border border-white/[0.03]">
                        <span className="text-[10px] font-mono text-orange-400 font-extrabold uppercase block">สรุปการวินิจฉัย (Verdict Analysis):</span>
                        <p className="text-slate-300 text-xs leading-relaxed font-sans">{adminState.aiAuditResult.verdict}</p>
                      </div>

                      <div className="space-y-1 bg-slate-900/40 p-3.5 rounded-xl border border-white/[0.03]">
                        <span className="text-[10px] font-mono text-orange-400 font-extrabold uppercase block">แนวทางสแกนคัดกรอง (Moderation Tips):</span>
                        <p className="text-slate-350 text-xs leading-relaxed whitespace-pre-line font-sans">{adminState.aiAuditResult.moderationTips}</p>
                      </div>

                      <div className="space-y-1 bg-orange-950/20 p-3.5 rounded-xl border border-orange-500/10">
                        <span className="text-[10px] font-mono text-orange-400 font-extrabold uppercase block">ข้อพิจารณาดันด่วนที่สุด (Suggested Move):</span>
                        <p className="text-white text-xs leading-relaxed font-black font-sans">⚡ {adminState.aiAuditResult.suggestedAction}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-2.5 text-center text-slate-500 text-[11px] leading-relaxed border-t border-white/[0.04]">
                    * ไม่เก็บรักษา API keys แนบในหน้ารันเว็บ client-side แข็งแกร่งสเป็คสูงสุด ปลอดภัยหายห่วง 100%
                  </div>
                )}
              </AnimatePresence>

            </div>

            {/* D. TOP PERFORMING POSTS PANEL */}
            <div className="p-5 rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/60 backdrop-blur-md text-left space-y-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                คันจำนงความนิยมสูงสุดหน้าร้านมาร์เก็ตเพลส (Top Performing Listed Cars)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {adminState.cars.slice(0, 3).map((car, idx) => {
                  return (
                    <div 
                      key={car.id}
                      className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-850 flex items-start gap-3 text-left hover:border-orange-500/20 transition cursor-pointer"
                      onClick={() => adminState.setActiveTab("listings")}
                    >
                      <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden shrink-0">
                        <img src={car.images[0]} alt={car.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[9px] font-black text-orange-400 font-mono">อันดับ {idx + 1} • {car.brand}</span>
                        <h4 className="text-white text-xs font-bold truncate leading-none">{car.title}</h4>
                        <p className="text-slate-400 font-mono text-[10.5px]">฿{car.price.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {adminState.activeTab === "users" && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-white font-display">ระบบบริหารจัดการขอบข่ายผู้ใช้งาน (User Management Workspace)</h2>
                <p className="text-slate-400 text-xs">อนุมัติ ตรวจสอบความถูกต้อง ส่งประกาศสิทธิ์ สั่งระงับพฤติกรรม และยกสิทธิ์กลุ่ม</p>
              </div>

              <button
                onClick={() => setShowCreateUserModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-550 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>จำลองสร้างบัญชีผู้ใช้บุคคล</span>
              </button>
            </div>

            {/* QUERY FILTER HUD */}
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/[0.04] flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
              
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto items-center">
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อ นามสกุล หรืออีเมลตรวจสอบ..."
                    value={adminState.userSearchQuery}
                    onChange={(e) => adminState.setUserSearchQuery(e.target.value)}
                    className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                </div>

                {/* Role dropdown selector */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={adminState.userRoleFilter}
                    onChange={(e) => adminState.setUserRoleFilter(e.target.value)}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 cursor-pointer"
                  >
                    <option value="all">กรองทุกบทบาท (All Roles)</option>
                    <option value="user">สมาชิกบ้านธรรมดา (User)</option>
                    <option value="dealer">ดีลเลอร์ทางการ (Dealer)</option>
                    <option value="moderator">ผู้ตรวจสอบเนื้อหา (Moderator)</option>
                    <option value="AI manager">AI Manager</option>
                  </select>
                </div>
              </div>

              {/* Bulk operations row */}
              {adminState.selectedUserIds.length > 0 && (
                <div className="flex gap-2 w-full sm:w-auto items-center justify-end p-2 bg-orange-600/10 border border-orange-500/20 rounded-xl">
                  <span className="font-bold text-orange-400 text-[10px]">เลือก {adminState.selectedUserIds.length} รายการ:</span>
                  <button
                    onClick={() => adminState.bulkActionUsers("suspend")}
                    className="px-2.5 py-1 bg-red-600/20 hover:bg-red-500 hover:text-white text-red-400 font-extrabold rounded text-[10px] cursor-pointer"
                  >
                    ✖ ระงับพร้อมกัน
                  </button>
                  <button
                    onClick={() => adminState.bulkActionUsers("activate")}
                    className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-500 hover:text-white text-emerald-400 font-extrabold rounded text-[10px] cursor-pointer"
                  >
                    ✓ เปิดใช้งานร่วม
                  </button>
                  <button
                    onClick={adminState.clearSelectedUsers}
                    className="text-slate-400 hover:text-white text-[10px] font-semibold"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}

            </div>

            {/* USERS DATA TABLE */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/95 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-[#09090b] text-slate-400 font-mono uppercase text-[9.5px] border-b border-white/[0.1]">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">
                        {/* Select all toggle logic */}
                        <button
                          onClick={() => {
                            if (adminState.selectedUserIds.length === filteredUsers.length) {
                              adminState.clearSelectedUsers();
                            } else {
                              filteredUsers.forEach(u => {
                                if (!adminState.selectedUserIds.includes(u.id)) {
                                  adminState.toggleSelectUser(u.id);
                                }
                              });
                            }
                          }}
                          className="text-orange-500"
                        >
                          {adminState.selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0 ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4">ชื่อโปรไฟล์ & อีเมล</th>
                      <th className="py-3 px-4">ระดับสิทธิ์ (Role)</th>
                      <th className="py-3 px-4">วันที่ร่วมแบรนด์</th>
                      <th className="py-3 px-4 text-center">แต้มเตือน (Strikes)</th>
                      <th className="py-3 px-4">สถานะสะพาน</th>
                      <th className="py-3 px-4 text-right">ปรับมาตรการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                          ไม่พบประวัติบัญชีสเป็คที่มองหาเลยครับคุณผู้ตรวจสอบ!
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isChecked = adminState.selectedUserIds.includes(user.id);
                        return (
                          <motion.tr 
                            key={user.id}
                            className={`hover:bg-white/[0.02] transition ${
                              user.status === "suspended" ? "bg-red-500/[0.01]" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => adminState.toggleSelectUser(user.id)}
                                className="text-slate-400 hover:text-orange-500 transition"
                              >
                                {isChecked ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4 text-slate-700" />}
                              </button>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-slate-800 border overflow-hidden shrink-0">
                                  <img 
                                    src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.displayName}`} 
                                    alt={user.displayName}
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-bold leading-none mb-0.5">{user.displayName}</p>
                                  <span className="text-[10px] text-slate-500 font-mono tracking-wide leading-none">{user.email}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold uppercase text-[10.5px]">
                              <select
                                value={user.role}
                                onChange={(e) => adminState.changeUserRole(user.id, e.target.value as any)}
                                className="bg-slate-900 text-slate-300 font-bold border border-slate-800 px-2 py-0.5 rounded text-[10px] cursor-pointer"
                              >
                                <option value="user">USER</option>
                                <option value="dealer">DEALER</option>
                                <option value="moderator">MODERATOR</option>
                                <option value="admin">ADMIN</option>
                                <option value="AI manager">AI MANAGER</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4 text-slate-400 font-mono text-[10.5px]">
                              {new Date(user.joinedAt).toLocaleDateString("th-TH")}
                            </td>

                            <td className="py-3.5 px-4 text-center font-mono text-xs font-bold">
                              <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                user.strikeCount > 0 ? "bg-red-500/10 text-red-500" : "bg-slate-800 text-slate-500"
                              }`}>
                                {user.strikeCount} / 3 Strikes
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-[10px] uppercase">
                              <span className={`px-2.5 py-0.5 rounded-full border ${
                                user.status === "active" 
                                  ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20"
                                  : user.status === "suspended"
                                  ? "bg-red-600/10 text-red-400 border-red-500/20"
                                  : "bg-amber-600/10 text-amber-400 border-amber-500/20"
                              }`}>
                                {user.status === "active" ? "เปิดดีลปกติ" : user.status === "suspended" ? "สั่งระงับ" : "รอตรวจประวัติ"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex gap-1.5 justify-end">
                                {user.status !== "active" ? (
                                  <button
                                    onClick={() => adminState.updateUserStatus(user.id, "active")}
                                    className="p-1 px-2.5 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded text-[10px] font-black transition cursor-pointer"
                                    title="อนุมัติบัญชีใช้งานปกติ"
                                  >
                                    เปิดใช้งาน
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => adminState.updateUserStatus(user.id, "suspended")}
                                    className="p-1 px-2.5 bg-red-600/10 hover:bg-red-600 hover:text-white text-red-400 rounded text-[10px] font-black transition cursor-pointer"
                                    title="ระงับบัญชีสเป็คนี้ชั่วคราว"
                                  >
                                    แบนทันที
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: CARS LISTING MANAGEMENT */}
        {adminState.activeTab === "listings" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black text-white font-display">ทะเบียนตรวจวัดโพสต์ขายรถยนต์ (Vehicle Listing Administration)</h2>
              <p className="text-slate-400 text-xs text-left">สอดส่อง พรีวิวข้อมูลเชิงเทคนิค ลบประกาศสแปม หรือตัดสิทธิ์รูปถ่ายสุ่มเสี่ยง</p>
            </div>

            {/* FILTER DIV */}
            <div className="p-4 rounded-2xl bg-[#0c0c0e]/80 border border-white/[0.04] flex flex-col sm:flex-row gap-4 items-center justify-between text-xs">
              
              <div className="flex flex-col sm:flex-row gap-2.5 items-center w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="ค้นหาตามแบรนด์ ยี่ห้อ หรือชื่อดีลเลอร์ปลอม..."
                    value={adminState.listingSearchQuery}
                    onChange={(e) => adminState.setListingSearchQuery(e.target.value)}
                    className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                </div>

                <div className="flex items-center gap-1 w-full sm:w-auto">
                  <span className="text-slate-500 text-[11px] font-bold shrink-0">หมวดหมู่:</span>
                  <select
                    value={adminState.listingTypeFilter}
                    onChange={(e) => adminState.setListingTypeFilter(e.target.value)}
                    className="p-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl"
                  >
                    <option value="all">พวกรถยนต์ทั่วไป (All Categories)</option>
                    <option value="new">รถป้ายแดง (New)</option>
                    <option value="used">รถบ้านสภาพดี (Used)</option>
                    <option value="ev">รถไฟฟ้าอัจฉรียะ (EV)</option>
                    <option value="luxury">ซูเปอร์คาร์หรูหราวไอพี (Luxury)</option>
                  </select>
                </div>
              </div>

              {adminState.selectedListingIds.length > 0 && (
                <button
                  onClick={adminState.bulkDeleteSelectedCars}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-[10.5px] rounded-xl flex items-center gap-1 shadow cursor-pointer transition active:scale-97 ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบรถที่เลือกสะสม ({adminState.selectedListingIds.length})</span>
                </button>
              )}

            </div>

            {/* LISTINGS TABLE ROW */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/95 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-[#09090b] text-slate-450 uppercase text-[9px] font-mono border-b border-white/[0.1]">
                    <tr>
                      <th className="py-2.8 px-4 w-12 text-center">
                        <button
                          onClick={() => {
                            if (adminState.selectedListingIds.length === filteredListings.length) {
                              adminState.clearSelectedListings();
                            } else {
                              filteredListings.forEach(c => {
                                if (!adminState.selectedListingIds.includes(c.id)) {
                                  adminState.toggleSelectListing(c.id);
                                }
                              });
                            }
                          }}
                          className="text-orange-500"
                        >
                          {adminState.selectedListingIds.length === filteredListings.length && filteredListings.length > 0 ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4">รูป & รายละเอียดสเป็ครถยนต์</th>
                      <th className="py-3 px-4">เจ้าของ/ดีลเลอร์</th>
                      <th className="py-3 px-4 text-right">ระยะไมล์</th>
                      <th className="py-3 px-4 text-right">ราคาจำหน่าย</th>
                      <th className="py-3 px-4 text-center">คลาสรถ</th>
                      <th className="py-3 px-4 text-right">กำจัดลิสติ้ง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredListings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500 font-semibold">
                          ยังไม่มีรายการรถใดที่ตรงตามทราฟฟิกค้นหาขณะนี้คร้าบ แนะนำกรอกพิมพ์ใหม่ครับ
                        </td>
                      </tr>
                    ) : (
                      filteredListings.map((car) => {
                        const isChecked = adminState.selectedListingIds.includes(car.id);
                        return (
                          <tr key={car.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-4 text-center">
                              <button onClick={() => adminState.toggleSelectListing(car.id)} className="text-slate-500">
                                {isChecked ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4 text-slate-700" />}
                              </button>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex gap-3 items-center">
                                <div className="w-16 h-10 bg-slate-950 rounded-lg overflow-hidden shrink-0 border border-white/[0.05]">
                                  <img src={car.images[0]} alt={car.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[9.5px] font-black text-orange-400 font-mono block uppercase">{car.brand} • ปี {car.year}</span>
                                  <p className="text-white font-bold leading-none truncate mb-1">{car.title}</p>
                                  <span className="text-[10px] text-slate-500 font-sans block leading-none truncate">ขุมพลัง: {car.fuelType} | เกียร์ {car.transmission}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-slate-350">
                              <span className="font-bold text-slate-200 block text-[11.5px]">{car.ownerName}</span>
                              <span className="font-mono text-[9.5px] text-slate-500">{car.ownerPhone}</span>
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-300 font-semibold">
                              {car.mileage.toLocaleString()} กม.
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-black text-orange-400 text-[13px]">
                              ฿{car.price.toLocaleString()}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wide border ${
                                car.type === "new"
                                  ? "bg-slate-800 text-slate-300 border-slate-700"
                                  : car.type === "ev"
                                  ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20"
                                  : car.type === "luxury"
                                  ? "bg-amber-600/10 text-amber-500 border-amber-500/20"
                                  : "bg-slate-900 text-slate-400 border-slate-800"
                              }`}>
                                {car.type}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => adminState.handleRemoveCarListing(car.id)}
                                className="p-1.8 bg-red-650 hover:bg-red-500 text-white rounded-lg transition-all border border-transparent shadow hover:scale-102 active:scale-97 cursor-pointer"
                                title="ลบใบประกาศทันที"
                              >
                                ลบโพสต์
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: DEALERS APPROVAL */}
        {adminState.activeTab === "dealers" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black text-white font-display">ฝ่ายความมั่นคงดีลเลอร์ (Authorized Dealer Verification Desk)</h2>
              <p className="text-slate-400 text-xs">ควบคุมใบอนุมัติสิทธิ์ สัญลักษณ์ความตรวจสอบได้ ตราประทับปลอดภัยสูงสุด</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {adminState.dealers.map((dealer) => {
                return (
                  <div 
                    key={dealer.id}
                    className="p-5 rounded-2xl bg-[#0c0c0e]/95 border border-white/[0.05] relative overflow-hidden flex flex-col justify-between text-left space-y-4"
                  >
                    <div className="aspect-video w-full rounded-xl bg-slate-950 overflow-hidden relative border border-white/[0.04]">
                      <img src={dealer.coverImage} alt={dealer.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded border border-white/10 text-[9.5px] font-bold flex items-center gap-1">
                        🏆 ประสบการณ์ {dealer.experienceYears} ปี
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-display font-black text-white text-[15px] leading-tight block">{dealer.name}</h4>
                        <div className="w-8 h-8 rounded bg-slate-900 overflow-hidden shrink-0">
                          <img src={dealer.logo} alt="logo" className="w-full h-full object-cover" />
                        </div>
                      </div>

                      <p className="text-[11.5px] text-slate-400 leading-normal line-clamp-3">{dealer.description}</p>
                      
                      <div className="flex gap-2 text-[10px] pt-1">
                        <span className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-450 font-bold">
                          🚗 สต็อกที่เชื่อมโยง: {adminState.cars.filter(c => c.dealerId === dealer.id || c.ownerId === dealer.id).length} คัน
                        </span>
                        <span className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-amber-400 font-bold flex items-center gap-0.5">
                          ★ {dealer.rating.toFixed(1)} คะแนน
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/[0.05] flex justify-between items-center bg-slate-950/20 p-2 rounded-xl">
                      <div className="space-y-0.5 text-left">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block leading-none">สถานะสิทธิ์</span>
                        <p className={`text-[10px] font-black leading-none ${dealer.verified ? "text-orange-400" : "text-amber-500"}`}>
                          {dealer.verified ? "APPROVED CERTIFIED ✓" : "PENDING AUDIT"}
                        </p>
                      </div>

                      <button
                        onClick={() => adminState.toggleDealerVerification(dealer.id)}
                        className={`px-3 py-1.8 rounded-lg text-[10.5px] font-black cursor-pointer transition active:scale-97 ${
                          dealer.verified
                            ? "bg-red-600/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/10"
                            : "bg-orange-600 hover:bg-orange-500 text-white shadow shadow-orange-500/10"
                        }`}
                      >
                        {dealer.verified ? "ล้างสิทธิ์ตรา" : "อนุมัติตราปลอม ✓"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 5: SUPPORT TICKETS LIST */}
        {adminState.activeTab === "tickets" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black text-white font-display">กระดานเรื่องราวร้องทุกข์จากทางบ้าน (Support Tickets Desk)</h2>
              <p className="text-slate-400 text-xs">ระดมทีมเทคนิคเพื่อประสานงานระบบ ช่วยเหลือลูกค้า ดีลราคารถ ตลอด 24 ชม.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold font-mono py-1">
              <div className="p-3 bg-red-600/10 border border-red-500/10 rounded-xl">
                <span className="text-red-400 block text-[10px] uppercase">เรื่องเร่งด่วนสูงสุด (High/Critical Priority):</span>
                <p className="text-xl text-white font-black">{adminState.tickets.filter(t => t.priority === "high" || t.priority === "critical").length} เคสเดือด</p>
              </div>
              <div className="p-3 bg-orange-600/10 border border-orange-550/10 rounded-xl">
                <span className="text-orange-400 block text-[10px] uppercase">ไม่ได้สะสาง (Unresolved Open Tickets):</span>
                <p className="text-xl text-white font-black">{adminState.tickets.filter(t => t.status === "open" || t.status === "in_progress").length} ตั๋วรอ</p>
              </div>
              <div className="p-3 bg-blue-600/10 border border-blue-500/10 rounded-xl">
                <span className="text-blue-400 block text-[10px] uppercase">สรุปเรื่องเสร็จสิ้น (Resolved Tickets):</span>
                <p className="text-xl text-white font-black">{adminState.tickets.filter(t => t.status === "resolved").length} สำเร็จเสร็จสรรพ</p>
              </div>
            </div>

            {/* TICKETS LIST EXPANSION */}
            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const isOpen = ticket.status === "open";
                const isUnderProgress = ticket.status === "in_progress";
                const isCritical = ticket.priority === "critical" || ticket.priority === "high";

                return (
                  <div 
                    key={ticket.id}
                    style={{ contentVisibility: 'auto' }}
                    className={`p-5 rounded-2xl border bg-[#0b0b0d]/90 relative overflow-hidden transition-all text-left space-y-3.5 ${
                      isCritical ? "border-red-500/10 shadow-lg shadow-red-950/5" : "border-white/[0.05]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-orange-400 block uppercase font-bold tracking-widest">
                          ID: #{ticket.id} • หมวด: {ticket.category.toUpperCase()}
                        </span>
                        <h4 className="text-[14.5px] font-semibold text-white leading-tight font-sans block">{ticket.title}</h4>
                        <p className="text-xs text-slate-400 font-sans block pt-0.5">{ticket.message}</p>
                      </div>

                      {/* Meta states tags */}
                      <div className="flex gap-1.5 flex-wrap shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                          ticket.priority === "critical"
                            ? "bg-red-650 text-white"
                            : ticket.priority === "high"
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {ticket.priority.toUpperCase()}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                          ticket.status === "open"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : ticket.status === "resolved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>

                    {/* Replies stack */}
                    {ticket.replies.length > 0 && (
                      <div className="p-3.5 bg-slate-900/50 border border-white/[0.03] rounded-xl space-y-2.5">
                        <span className="text-[9.5px] uppercase font-mono text-slate-500 font-bold block">บันทึกความช่วยเหลือ (Response Thread):</span>
                        {ticket.replies.map((rep, rIdx) => (
                          <div key={rIdx} className="text-xs space-y-0.5 border-l border-orange-500/20 pl-2 text-left">
                            <span className="text-slate-400 block text-[10.5px]">
                              🗣️ <strong>{rep.senderName}</strong> ({rep.senderRole}):
                            </span>
                            <p className="text-slate-300 font-sans">{rep.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply triggers row */}
                    {ticket.status !== "resolved" && (
                      <div className="pt-2 border-t border-white/[0.03] flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveTicketId(ticket.id === activeTicketId ? null : ticket.id);
                            setTicketReplyText("");
                          }}
                          className="px-3.5 py-1.8 bg-orange-600 hover:bg-orange-550 text-white rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Send className="w-3 h-3" />
                          <span>เขียนคำตอบตกลงช่วยเหลือ</span>
                        </button>
                        
                        <button
                          onClick={() => adminState.updateTicketStatus(ticket.id, "resolved")}
                          className="px-3.5 py-1.8 bg-emerald-600/10 hover:bg-emerald-650 hover:text-white text-emerald-400 rounded-lg text-[10px] font-black transition cursor-pointer"
                        >
                          ปิดเรื่องเสร็จสิ้น (Mark Resolved)
                        </button>
                      </div>
                    )}

                    {/* Reply dialog panel */}
                    {activeTicketId === ticket.id && (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!ticketReplyText.trim()) return;
                          adminState.replyToTicket(ticket.id, ticketReplyText);
                          setActiveTicketId(null);
                        }}
                        className="space-y-2.5 pt-2 border-t border-white/[0.03]"
                      >
                        <textarea
                          rows={2}
                          value={ticketReplyText}
                          onChange={(e) => setTicketReplyText(e.target.value)}
                          placeholder="เขียนข้อความตอบกลับเพื่ออธิกายและยกสิทธิ์ให้คุณพี่ครับ..."
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                        <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-550 text-white font-black text-[10.5px] rounded-lg">
                          ส่งและบันทึกประวัติเสร็จ
                        </button>
                      </form>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 6: CONTENT MODERATION QUEUE (AI ASSISTED) */}
        {adminState.activeTab === "moderation" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black text-white font-display">ระบบคัดกรองสแปมเนื้อหาอัจฉริยะ (AI Moderation Desk)</h2>
              <p className="text-slate-400 text-xs text-left">
                แสดงโพสต์ รูปภาพ หรือความคิดเห็นที่โดนผู้ใช้รุมร้องคัดค้าน พร้อมการวิเคราะห์ประเมินเบื้องต้นโดยบอทผู้ดูแลของระบบ
              </p>
            </div>

            <div className="space-y-4">
              {adminState.reportedItems.map((item) => {
                const isPending = item.status === "pending";
                const isFlagged = item.aiSafeVerdict === "flagged";
                const isNeedsReview = item.aiSafeVerdict === "needs_manual_review";

                return (
                  <div 
                    key={item.id}
                    className="p-5 rounded-2xl border border-white/[0.05] bg-[#0c0c0e]/95 space-y-3.5 text-left"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">
                          คิวตรวจสอบ #{item.id} • หมวด: {item.targetType.toUpperCase()}
                        </span>
                        <h4 className="font-bold text-white text-[14px]">หัวข้อเป้าหมาย: <span className="text-orange-400">{item.targetTitle}</span></h4>
                        <p className="text-xs text-slate-350 font-sans block">เหตุรับแจ้งเตือน: <strong>"{item.reason}"</strong></p>
                        {item.details && <p className="text-[11px] text-slate-500 block font-sans">รายละเอียดแนบ: {item.details}</p>}
                      </div>

                      <div className="flex gap-2 items-center flex-wrap shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          isFlagged
                            ? "bg-red-650 text-white"
                            : isNeedsReview
                            ? "bg-amber-600/10 text-amber-500 border border-amber-500/25"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          AI Verdict: {item.aiSafeVerdict}
                        </span>

                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[10px] rounded text-slate-400">
                          สถานะ: {item.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Real-time calculated AI labels */}
                    {item.aiClassification && (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-900 text-[10.5px] flex items-center justify-between">
                        <span className="text-slate-450 font-sans">🏷️ <strong>ผลประเมินความฉลาด (AI Classification):</strong></span>
                        <code className="text-orange-400 font-mono font-bold">{item.aiClassification}</code>
                      </div>
                    )}

                    {/* Operational panel */}
                    {isPending && (
                      <div className="pt-2 border-t border-white/[0.03] flex flex-wrap gap-2 items-center">
                        <button
                          onClick={() => adminState.triggerAIModerationCheck(item.id)}
                          className="px-3.5 py-1.8 bg-orange-600/10 hover:bg-orange-500 text-orange-400 hover:text-white rounded-lg text-[10px] font-black transition cursor-pointer"
                        >
                          🔄 รันวินิจฉัยภาพ & เนื้อหาซ้ำด้วย Gemini
                        </button>

                        <button
                          onClick={() => adminState.moderateReport(item.id, "resolve")}
                          className="px-3.5 py-1.8 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-[10px] font-black transition cursor-pointer"
                        >
                          อนุมัติว่าปลอดภัย (Safe)
                        </button>

                        <button
                          onClick={() => adminState.moderateReport(item.id, "removed")}
                          className="px-3.5 py-1.8 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-[10px] font-black transition cursor-pointer"
                        >
                          แบนรูป/ความคิดเห็นถาวร (Delete Target)
                        </button>

                        <button
                          onClick={() => adminState.moderateReport(item.id, "ignored")}
                          className="px-3.5 py-1.8 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                        >
                          ซ่อนตู้รายงานนี้ (Ignore)
                        </button>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 7: ADMINISTRATIVE AUDIT LOGS */}
        {adminState.activeTab === "logs" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black text-white font-display">บันทึกขั้นตอนการปฏิบัติงานของแอดมิน (Administrative Audit Logs Trails)</h2>
              <p className="text-slate-400 text-xs">เอกสารสิทธิ์ตรวจสอบประวัติการ Mutate ข้อมูล สั่งเด้ง ลบรถ นัดหมาย คลินิก เพื่อความโปร่งใสสูงสุด</p>
            </div>

            <div className="p-4 rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/95 space-y-3 font-mono text-[11px] text-slate-300">
              <span className="text-[9px] uppercase tracking-widest text-[#5d5d61] font-bold block pb-1 border-b border-white/[0.05]">
                ระบบตรวจสอบย้อนหลังแบบเข้ารหัส (Chronological Blockchain Logs)
              </span>

              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {adminState.auditLogs.map((log) => {
                  return (
                    <div 
                      key={log.id}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-850 hover:bg-slate-900 transition flex items-start gap-3 justify-between"
                    >
                      <div className="space-y-1">
                        <span className="text-orange-500 font-bold block uppercase text-[9.5px]">
                          [{log.action}] • {log.id}
                        </span>
                        <p className="text-slate-200">{log.details}</p>
                        <span className="text-[9px] text-[#555] block">
                          บันทึกโดย: {log.adminName} ({log.adminRole.toUpperCase()})
                        </span>
                      </div>

                      <span className="text-[#555] text-[9.5px] shrink-0 text-right font-semibold">
                        {new Date(log.timestamp).toLocaleTimeString("th-TH")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {adminState.activeTab === "ai-control" && (
          <AIControlCenter />
        )}

      </div>

      {/* CREATE CONTROLLER USER SIMULATION DIALOG */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 bg-[#0c0c0e] border border-white/[0.08] rounded-3xl space-y-4 text-left">
            <h3 className="text-base font-black text-white font-display flex items-center gap-1.5 leading-none">
              <Plus className="w-5 h-5 text-orange-500" />
              <span>สร้างผู้ใช้งานจำลองในระบบ (Create User Simulation)</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newUserName || !newUserEmail) return;
                
                adminState.addPlatformUser({
                  id: `u-${Math.floor(1000 + Math.random() * 9000)}`,
                  displayName: newUserName,
                  email: newUserEmail,
                  role: newUserRole as any,
                  status: "active"
                });

                // Reset
                setNewUserName("");
                setNewUserEmail("");
                setNewUserRole("user");
                setShowCreateUserModal(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase block pl-0.5">ชื่อเต็มของบัญชี</label>
                <input 
                  type="text" 
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="เช่น ดร.วิทยา บล็อกเชน"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase block pl-0.5">ที่อยู่อีเมลเข้าหลัก</label>
                <input 
                  type="email" 
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="เช่น wittaya.nong@gmail.com"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase block pl-0.5">ระบุเลือกระดับสิทธิ์เริ่มต้น</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="user">สมาชิกทั่วไป (Private User)</option>
                  <option value="dealer">ดีลเลอร์ผู้แทนจำหน่าย (Authorized Dealer)</option>
                  <option value="moderator">ผู้ตรวจสอบคำเตือน (Moderator)</option>
                  <option value="admin">ผู้ดูแลระบบคลัง (Admin)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-900 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2.2 bg-orange-600 hover:bg-orange-550 text-white rounded-xl text-xs font-black cursor-pointer shadow shadow-orange-500/10"
                >
                  สร้างผู้ใช้อินเตอร์แอคทีฟ ✓
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
