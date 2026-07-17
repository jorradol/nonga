import React, { useEffect, useMemo } from "react";
import { useAdmin } from "../../hooks/admin/useAdmin";
import { useAuth } from "../../hooks/auth/useAuth";
import { useRole } from "../../hooks/auth/useRole";
import { useAppStore } from "../../store";
import { AdminRole } from "../../types";
import { 
  Sparkles, ShieldCheck, ShieldAlert, Users, Store, Car, 
  History, TrendingUp, Search, 
  CheckSquare, Square, Trash2, Mail, 
  RefreshCw, Upload,
  Banknote, FlaskConical, LayoutGrid
} from "lucide-react";
import { AdminRevenueDashboardPreview } from "./revenue/AdminRevenueDashboardPreview";
import { motion, AnimatePresence } from "motion/react";
// Retain the pre-P4 static skills path so Vite keeps aiSkillService in the main
// entry (staging hosting verify requires Firebase env on every JS asset).
import { useAISkills } from "../../hooks/ai-skills/useAISkills";

(
  globalThis as typeof globalThis & {
    __NONGA_RETAIN_USE_AI_SKILLS__?: typeof useAISkills;
  }
).__NONGA_RETAIN_USE_AI_SKILLS__ = useAISkills;

const HONEST_METRIC_EMPTY_STATE =
  "ยังไม่มีข้อมูลสถิติจริงสำหรับรายการนี้";

const HONEST_AI_ADMIN_EMPTY_STATE =
  "ส่วนจัดการ AI ยังไม่ได้เชื่อมต่อกับ Runtime ที่ใช้งานจริง\nขณะนี้จึงยังไม่มีสถานะหรือการควบคุม AI ที่แสดงในหน้านี้";

function DashboardMetricEmptyCard({
  label,
  icon: Icon,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="p-4 rounded-2xl nonga-bg-subtle border nonga-border backdrop-blur-md space-y-2">
      <div className="flex items-center justify-between nonga-text-muted">
        <span className="text-[10px] uppercase font-mono font-bold tracking-wider">{label}</span>
        <Icon className="w-4.5 h-4.5 text-orange-500" />
      </div>
      <p className="text-xs nonga-text-secondary leading-relaxed">{HONEST_METRIC_EMPTY_STATE}</p>
    </div>
  );
}

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

  const filteredListings = adminState.cars.filter((car) => {
    const matchesSearch = car.title.toLowerCase().includes(adminState.listingSearchQuery.toLowerCase()) || 
                          car.brand.toLowerCase().includes(adminState.listingSearchQuery.toLowerCase());
    const matchesType = adminState.listingTypeFilter === "all" || car.type === adminState.listingTypeFilter;
    return matchesSearch && matchesType;
  });

  const showAdminRevenuePreview =
    effectiveAdminRole === "superadmin" || effectiveAdminRole === "admin";

  return (
    <div className="flex flex-col lg:flex-row gap-6 text-left selection:bg-orange-500/30 w-full max-w-full min-w-0">
      
      {/* SIDEBAR BLOCK: Shopfiy style sidebar */}
      <div className="w-full lg:w-64 shrink-0 rounded-3xl p-5 border nonga-border nonga-bg-surface flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          <div className="pt-2 flex items-center gap-2.5 px-1 pb-4 border-b nonga-border">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/20">
              ⚙️
            </div>
            <div>
              <h1 className="text-[15px] font-display font-black nonga-text-primary tracking-tight leading-none">Nong Bot HQ</h1>
              <span className="text-[9px] text-orange-400 font-bold uppercase tracking-widest leading-none">Enterprise SaaS Console</span>
            </div>
          </div>

          {showRoleSwitcher ? (
            <div className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-550/15 space-y-2 text-left">
              <span className="text-[9.5px] uppercase font-mono tracking-widest nonga-text-muted font-extrabold block">บทบาทจำลอง (Interactive Role):</span>
              <select
                value={adminState.adminProfile.role}
                onChange={(e) => adminState.setAdminRole(e.target.value as AdminRole)}
                className="w-full p-2 rounded-lg nonga-bg-subtle border nonga-border text-[11px] font-black tracking-wide text-orange-400 cursor-pointer focus:outline-none focus:border-orange-500"
              >
                <option value="superadmin">Superadmin (Full Access)</option>
                <option value="admin">Admin (Operations)</option>
                <option value="moderator">Moderator (Compliance)</option>
                <option value="AI manager">AI Manager (System Co-pilot)</option>
              </select>
              <p className="text-[9.5px] nonga-text-muted leading-relaxed font-sans">
                * ใช้เฉพาะโหมดจำลอง/พัฒนา เพื่อทดสอบสิทธิ์การจำกัดและการเข้าถึงปุ่มต่างๆ ในระบบ
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl nonga-bg-subtle border nonga-border space-y-1.5 text-left">
              <span className="text-[9.5px] uppercase font-mono tracking-widest nonga-text-muted font-extrabold block">บทบาทจริงจาก Firebase Profile</span>
              <p className="text-[12px] font-black text-orange-400">
                {displayedAdminProfile.role === "superadmin"
                  ? "Superadmin"
                  : "Admin"}
              </p>
              <p className="text-[9.5px] nonga-text-muted leading-relaxed font-sans">
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
                  ? "nonga-action shadow-md shadow-orange-600/10"
                  : "nonga-text-secondary hover:text-[var(--nonga-text-primary)] hover:bg-[var(--nonga-bg-subtle)]"
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
                  ? "nonga-action shadow"
                  : "nonga-text-secondary hover:text-[var(--nonga-text-primary)] hover:bg-[var(--nonga-bg-subtle)]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ผู้ใช้งาน</span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("listings")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "listings"
                  ? "nonga-action shadow"
                  : "nonga-text-secondary hover:text-[var(--nonga-text-primary)] hover:bg-[var(--nonga-bg-subtle)]"
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
              type="button"
              onClick={() => setView("admin-pending-listings")}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/15"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>คิวรออนุมัติประกาศเต็นท์</span>
            </button>

            <button
              type="button"
              onClick={() => setView("admin-pilot-users")}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/15"
            >
              <Users className="w-4 h-4" />
              <span>ผู้ใช้งานทดลอง (Closed Pilot)</span>
            </button>

            <button
              type="button"
              onClick={() => setView("admin-reports")}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/15"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>รายงานประกาศ (Admin Review)</span>
            </button>

            <button
              type="button"
              onClick={() => setView("admin-shadow-smoke")}
              className="w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/15"
            >
              <FlaskConical className="w-4 h-4" />
              <span>AI Shadow Smoke (Read-only)</span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("dealers")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "dealers"
                  ? "nonga-action shadow"
                  : "nonga-text-secondary hover:text-[var(--nonga-text-primary)] hover:bg-[var(--nonga-bg-subtle)]"
              }`}
            >
              <Store className="w-4 h-4" />
              <span>ดีลเลอร์สเป็คทอง</span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("tickets")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "tickets"
                  ? "nonga-action shadow"
                  : "nonga-text-secondary hover:text-[var(--nonga-text-primary)] hover:bg-[var(--nonga-bg-subtle)]"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>ตั๋วช่วยเหลือ</span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("moderation")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "moderation"
                  ? "nonga-action shadow"
                  : "nonga-text-secondary hover:text-[var(--nonga-text-primary)] hover:bg-[var(--nonga-bg-subtle)]"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>ศูนย์คัดกรอง AI</span>
            </button>

            <button
              onClick={() => adminState.setActiveTab("ai-control")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "ai-control"
                  ? "nonga-action shadow"
                  : "nonga-text-secondary hover:text-[var(--nonga-text-primary)] hover:bg-[var(--nonga-bg-subtle)]"
              }`}
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>แผงควบคุม AI Nong A 🤖</span>
            </button>

            {showAdminRevenuePreview && (
              <button
                onClick={() => adminState.setActiveTab("revenue-preview")}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                  adminState.activeTab === "revenue-preview"
                    ? "nonga-action shadow"
                    : "nonga-text-secondary hover:text-[var(--nonga-text-primary)] hover:bg-[var(--nonga-bg-subtle)]"
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>รายได้ / ค่าบริการเมื่อขายสำเร็จ</span>
              </button>
            )}

            <button
              onClick={() => adminState.setActiveTab("logs")}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 text-left transition ${
                adminState.activeTab === "logs"
                  ? "nonga-action shadow"
                  : "nonga-text-secondary hover:text-[var(--nonga-text-primary)] hover:bg-[var(--nonga-bg-subtle)]"
              }`}
            >
              <History className="w-4 h-4" />
              <span>บันทึกระบบปฏิบัติงาน logs</span>
            </button>
          </nav>

        </div>

        {/* Dynamic active user credentials status card */}
        <div className="pt-4 border-t nonga-border space-y-2 text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-full nonga-bg-elevated flex items-center justify-center text-sm font-black border nonga-border overflow-hidden">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=NongBot" alt="admin avatar" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="nonga-text-primary text-[12px] font-bold truncate leading-none mb-0.5">{displayedAdminProfile.displayName}</p>
              <span className="text-[9px] nonga-text-muted font-semibold font-mono tracking-wide block truncate">{displayedAdminProfile.email}</span>
            </div>
          </div>
          
          <div className="p-2 nonga-bg-subtle rounded-lg border nonga-border text-[10px] nonga-text-secondary flex items-center gap-1.5 leading-none">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span>ระดับ: <strong>{displayedAdminProfile.role.toUpperCase()}</strong></span>
          </div>
        </div>

      </div>

      {/* RENDER ACTIVE TAB AREA */}
      <div className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden space-y-6">
        {/* TAB 1: SUMMARY DASHBOARD INSIGHTS */}
        {adminState.activeTab === "dashboard" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl sm:text-2xl font-black nonga-text-primary tracking-tight">ศูนย์ควบคุม Nong A Administrative Dashboard</h2>
              <p className="nonga-text-secondary text-xs sm:text-sm">แดชบอร์ดสรุปสำหรับผู้ดูแล — แสดงเฉพาะข้อมูลที่ยืนยันแหล่งจริงได้</p>
            </div>

            {/* A. PLATFORM WIDGETS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DashboardMetricEmptyCard
                label="ผู้ลงทะเบียนใช้งานทั้งหมด"
                icon={Users}
              />

              <DashboardMetricEmptyCard
                label="ดีลเลอร์ในระบบ"
                icon={Store}
              />

              <div className="p-4 rounded-2xl nonga-bg-subtle border nonga-border backdrop-blur-md space-y-1">
                <div className="flex items-center justify-between nonga-text-muted">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">รถประกาศขายในระบบ</span>
                  <Car className="w-4.5 h-4.5 text-orange-500" />
                </div>
                <p className="text-2xl font-black nonga-text-primary">{adminState.cars.length} คัน</p>
                <span className="text-[10px] nonga-text-muted font-sans block leading-relaxed">
                  จากรายการรถสดที่โหลดผ่าน GET /api/cars
                </span>
              </div>

              <DashboardMetricEmptyCard
                label="มูลค่าจองและรายได้"
                icon={Banknote}
              />
            </div>

            {/* B. METRICS WITHOUT REAL ANALYTICS SOURCE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border nonga-border nonga-bg-subtle backdrop-blur-md space-y-2 text-left">
                <h3 className="text-sm font-bold nonga-text-primary">รายได้และการเข้าชมมาร์เก็ตเพลส</h3>
                <p className="text-xs nonga-text-secondary leading-relaxed">{HONEST_METRIC_EMPTY_STATE}</p>
              </div>

              <div className="p-4 rounded-2xl border nonga-border nonga-bg-subtle backdrop-blur-md space-y-2 text-left">
                <h3 className="text-sm font-bold nonga-text-primary">การใช้งาน AI Chat และ CarVision</h3>
                <p className="text-xs nonga-text-secondary leading-relaxed">{HONEST_METRIC_EMPTY_STATE}</p>
              </div>
            </div>

            {/* C. GEMINI AI PLATFORM SECURITY OFFICER MODULE */}
            <div className="p-6 rounded-3xl border border-orange-550/20 bg-gradient-to-r from-orange-950/25 to-[var(--nonga-bg-app)] relative overflow-hidden backdrop-blur text-left space-y-4">
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="px-3 py-0.5 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> High-End Co-pilot Module
                  </span>
                  <h3 className="text-[15px] font-display font-black nonga-text-primary">ระบบสแกนความปลอดภัยแพลตฟอร์มด้วยปัญญาประดิษฐ์ (A.I. Moderation & Audit)</h3>
                  <p className="nonga-text-secondary text-xs font-sans">
                    เมื่อมีประเด็นเรื่องข้อร้องเรียน รถยนต์สภาพน่าสงสัย หรือคำร้องดีลเลอร์ คลิดเพื่อจำลองปัญญาประดิษฐ์ตรวจสุขภาพมาร์เก็ตเพลสวิเคราะห์กลยุทธ์รักษาความปลอดภัยที่ดีที่สุด
                  </p>
                </div>

                <button
                  onClick={adminState.handleRunPlatformAIAudit}
                  disabled={adminState.aiAuditLoading}
                  className="w-full sm:w-auto shrink-0 px-4.5 py-3 rounded-xl nonga-action nonga-focus-ring disabled:opacity-40 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/20"
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
                    className="p-5 rounded-2xl nonga-bg-app border border-orange-500/20 text-left space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                      <div className="space-y-1 nonga-bg-subtle p-3.5 rounded-xl border nonga-border">
                        <span className="text-[10px] font-mono text-orange-400 font-extrabold uppercase block">สรุปการวินิจฉัย (Verdict Analysis):</span>
                        <p className="nonga-text-secondary text-xs leading-relaxed font-sans">{adminState.aiAuditResult.verdict}</p>
                      </div>

                      <div className="space-y-1 nonga-bg-subtle p-3.5 rounded-xl border nonga-border">
                        <span className="text-[10px] font-mono text-orange-400 font-extrabold uppercase block">แนวทางสแกนคัดกรอง (Moderation Tips):</span>
                        <p className="nonga-text-muted text-xs leading-relaxed whitespace-pre-line font-sans">{adminState.aiAuditResult.moderationTips}</p>
                      </div>

                      <div className="space-y-1 bg-[color-mix(in_srgb,var(--nonga-brand)_10%,transparent)] p-3.5 rounded-xl border border-orange-500/10">
                        <span className="text-[10px] font-mono text-orange-400 font-extrabold uppercase block">ข้อพิจารณาดันด่วนที่สุด (Suggested Move):</span>
                        <p className="nonga-text-primary text-xs leading-relaxed font-black font-sans">⚡ {adminState.aiAuditResult.suggestedAction}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-2.5 text-center nonga-text-muted text-[11px] leading-relaxed border-t nonga-border">
                    * ไม่เก็บรักษา API keys แนบในหน้ารันเว็บ client-side แข็งแกร่งสเป็คสูงสุด ปลอดภัยหายห่วง 100%
                  </div>
                )}
              </AnimatePresence>

            </div>

          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {adminState.activeTab === "users" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black nonga-text-primary">ระบบบริหารจัดการขอบข่ายผู้ใช้งาน (User Management Workspace)</h2>
              <p className="nonga-text-secondary text-xs">อนุมัติ ตรวจสอบความถูกต้อง ส่งประกาศสิทธิ์ สั่งระงับพฤติกรรม และยกสิทธิ์กลุ่ม</p>
            </div>

            <div
              className="rounded-2xl border nonga-border nonga-bg-surface p-8 text-center"
              data-testid="admin-users-real-data-empty-state"
            >
              <p className="text-sm nonga-text-secondary leading-relaxed">
                หน้านี้ยังไม่ได้เชื่อมต่อกับแหล่งข้อมูลผู้ใช้งานจริง จึงยังไม่แสดงรายชื่อผู้ใช้งาน
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: CARS LISTING MANAGEMENT */}
        {adminState.activeTab === "listings" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black nonga-text-primary">ทะเบียนตรวจวัดโพสต์ขายรถยนต์ (Vehicle Listing Administration)</h2>
              <p className="nonga-text-secondary text-xs text-left">สอดส่อง พรีวิวข้อมูลเชิงเทคนิค ลบประกาศสแปม หรือตัดสิทธิ์รูปถ่ายสุ่มเสี่ยง</p>
            </div>

            {/* FILTER DIV */}
            <div className="p-4 rounded-2xl nonga-bg-subtle border nonga-border flex flex-col sm:flex-row gap-4 items-center justify-between text-xs">
              
              <div className="flex flex-col sm:flex-row gap-2.5 items-center w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="ค้นหาตามแบรนด์ ยี่ห้อ หรือชื่อดีลเลอร์ปลอม..."
                    value={adminState.listingSearchQuery}
                    onChange={(e) => adminState.setListingSearchQuery(e.target.value)}
                    className="w-full px-3.5 py-2 pl-9 rounded-xl nonga-bg-subtle border nonga-border text-xs nonga-text-primary nonga-placeholder focus:outline-none focus:border-orange-500 nonga-focus-ring"
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 nonga-text-muted" />
                </div>

                <div className="flex items-center gap-1 w-full sm:w-auto">
                  <span className="nonga-text-muted text-[11px] font-bold shrink-0">หมวดหมู่:</span>
                  <select
                    value={adminState.listingTypeFilter}
                    onChange={(e) => adminState.setListingTypeFilter(e.target.value)}
                    className="p-2 nonga-bg-subtle border nonga-border nonga-text-secondary rounded-xl"
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
            <div className="rounded-2xl border nonga-border nonga-bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="nonga-bg-app text-slate-450 uppercase text-[9px] font-mono border-b border-white/[0.1]">
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
                        <td colSpan={7} className="py-12 text-center nonga-text-muted font-semibold">
                          ยังไม่มีรายการรถใดที่ตรงตามทราฟฟิกค้นหาขณะนี้คร้าบ แนะนำกรอกพิมพ์ใหม่ครับ
                        </td>
                      </tr>
                    ) : (
                      filteredListings.map((car) => {
                        const isChecked = adminState.selectedListingIds.includes(car.id);
                        return (
                          <tr key={car.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-4 text-center">
                              <button onClick={() => adminState.toggleSelectListing(car.id)} className="nonga-text-muted">
                                {isChecked ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4 text-slate-700" />}
                              </button>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex gap-3 items-center">
                                <div className="w-16 h-10 nonga-bg-app rounded-lg overflow-hidden shrink-0 border nonga-border">
                                  <img src={car.images[0]} alt={car.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[9.5px] font-black text-orange-400 font-mono block uppercase">{car.brand} • ปี {car.year}</span>
                                  <p className="nonga-text-primary font-bold leading-none truncate mb-1">{car.title}</p>
                                  <span className="text-[10px] nonga-text-muted font-sans block leading-none truncate">ขุมพลัง: {car.fuelType} | เกียร์ {car.transmission}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 nonga-text-muted">
                              <span className="font-bold nonga-text-primary block text-[11.5px]">{car.ownerName}</span>
                              <span className="font-mono text-[9.5px] nonga-text-muted">{car.ownerPhone}</span>
                            </td>

                            <td className="py-3 px-4 text-right font-mono nonga-text-secondary font-semibold">
                              {car.mileage.toLocaleString()} กม.
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-black text-orange-400 text-[13px]">
                              ฿{car.price.toLocaleString()}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wide border ${
                                car.type === "new"
                                  ? "bg-slate-800 nonga-text-secondary border-slate-700"
                                  : car.type === "ev"
                                  ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20"
                                  : car.type === "luxury"
                                  ? "bg-amber-600/10 text-amber-500 border-amber-500/20"
                                  : "bg-slate-900 nonga-text-secondary border-slate-800"
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
              <h2 className="text-xl font-black nonga-text-primary">ฝ่ายความมั่นคงดีลเลอร์ (Authorized Dealer Verification Desk)</h2>
              <p className="nonga-text-secondary text-xs">ควบคุมใบอนุมัติสิทธิ์ สัญลักษณ์ความตรวจสอบได้ ตราประทับปลอดภัยสูงสุด</p>
            </div>

            <div
              className="rounded-2xl border nonga-border nonga-bg-surface p-8 text-center"
              data-testid="admin-dealers-real-data-empty-state"
            >
              <p className="text-sm nonga-text-secondary leading-relaxed">
                หน้านี้ยังไม่ได้เชื่อมต่อกับแหล่งข้อมูลดีลเลอร์จริง จึงยังไม่แสดงรายการดีลเลอร์
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: SUPPORT TICKETS LIST */}
        {adminState.activeTab === "tickets" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black nonga-text-primary">กระดานเรื่องราวร้องทุกข์จากทางบ้าน (Support Tickets Desk)</h2>
              <p className="nonga-text-secondary text-xs">ระดมทีมเทคนิคเพื่อประสานงานระบบ ช่วยเหลือลูกค้า ดีลราคารถ ตลอด 24 ชม.</p>
            </div>

            <div
              className="rounded-2xl border nonga-border nonga-bg-surface p-8 text-center"
              data-testid="admin-tickets-real-data-empty-state"
            >
              <p className="text-sm nonga-text-secondary leading-relaxed">
                หน้านี้ยังไม่ได้เชื่อมต่อกับระบบตั๋วช่วยเหลือจริง จึงยังไม่มีรายการให้ดำเนินการ
              </p>
            </div>
          </div>
        )}

        {/* TAB 6: CONTENT MODERATION QUEUE (AI ASSISTED) */}
        {adminState.activeTab === "moderation" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black nonga-text-primary">ระบบคัดกรองสแปมเนื้อหาอัจฉริยะ (AI Moderation Desk)</h2>
              <p className="nonga-text-secondary text-xs text-left">
                แสดงโพสต์ รูปภาพ หรือความคิดเห็นที่โดนผู้ใช้รุมร้องคัดค้าน พร้อมการวิเคราะห์ประเมินเบื้องต้นโดยบอทผู้ดูแลของระบบ
              </p>
            </div>

            <div
              className="rounded-2xl border nonga-border nonga-bg-surface p-8 text-center"
              data-testid="admin-moderation-real-data-empty-state"
            >
              <p className="text-sm nonga-text-secondary leading-relaxed">
                หน้านี้ยังไม่ได้เชื่อมต่อกับคิวรายงานจริง จึงยังไม่มีรายการให้ตรวจสอบ
              </p>
            </div>
          </div>
        )}

        {/* TAB 7: ADMINISTRATIVE AUDIT LOGS */}
        {adminState.activeTab === "logs" && (
          <div className="space-y-6 text-left">
            <div>
              <h2 className="text-xl font-black nonga-text-primary">บันทึกขั้นตอนการปฏิบัติงานของแอดมิน (Administrative Audit Logs Trails)</h2>
              <p className="nonga-text-secondary text-xs">เอกสารสิทธิ์ตรวจสอบประวัติการ Mutate ข้อมูล สั่งเด้ง ลบรถ นัดหมาย คลินิก เพื่อความโปร่งใสสูงสุด</p>
            </div>

            <div className="p-4 rounded-2xl border nonga-border nonga-bg-surface space-y-3 font-mono text-[11px] nonga-text-secondary">
              <span className="text-[9px] uppercase tracking-widest text-[#5d5d61] font-bold block pb-1 border-b nonga-border">
                ระบบตรวจสอบย้อนหลังแบบเข้ารหัส (Chronological Blockchain Logs)
              </span>

              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                {adminState.auditLogs.map((log) => {
                  return (
                    <div 
                      key={log.id}
                      className="p-3 rounded-lg nonga-bg-subtle border border-slate-850 hover:bg-slate-900 transition flex items-start gap-3 justify-between"
                    >
                      <div className="space-y-1">
                        <span className="text-orange-500 font-bold block uppercase text-[9.5px]">
                          [{log.action}] • {log.id}
                        </span>
                        <p className="nonga-text-primary">{log.details}</p>
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
          <div className="space-y-6" data-testid="admin-ai-control-tab-panel">
            <div
              className="rounded-2xl border nonga-border nonga-bg-surface p-8 text-center"
              data-testid="admin-ai-real-runtime-empty-state"
            >
              <p className="text-sm nonga-text-secondary leading-relaxed whitespace-pre-line">
                {HONEST_AI_ADMIN_EMPTY_STATE}
              </p>
            </div>
          </div>
        )}

        {adminState.activeTab === "revenue-preview" && showAdminRevenuePreview && (
          <div
            className="min-w-0 w-full max-w-full"
            data-testid="admin-revenue-preview-tab-panel"
          >
            <AdminRevenueDashboardPreview />
          </div>
        )}

      </div>

    </div>
  );
}
