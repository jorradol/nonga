import React, { useState } from "react";
import { useAuthContext } from "../contexts/auth/AuthContext";
import { useRole } from "../hooks/auth/useRole";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, Mail, ShieldCheck, Key, Bot, Star, Sparkles, 
  Settings, History, Check, Trash2, Sliders, ExternalLink, 
  MessageCircle, AlertCircle, Phone, MapPin, Store, BarChart2, 
  Sparkle, Heart, Languages, BellRing
} from "lucide-react";

import { getListingPrimaryImage } from "../utils/listingImages";
import {
  buildThorAutoDemoProfileUpdates,
  isDealerDemoToolsEnabled,
} from "../utils/dealerDemoSession";
import {
  consumeDealerEntryHint,
  dealerEntryHintMessage,
} from "../utils/dealerEntryNavigation";
import { THOR_AUTO_DEALER_ID } from "../utils/dealerIdentity";
import { useUserProfile } from "../hooks/profile/useUserProfile";
import { useSettings } from "../hooks/settings/useSettings";
import SettingsSidebar, { SettingsTabId } from "./settings/SettingsSidebar";
import SettingsCard from "./settings/SettingsCard";
import AvatarSelector from "./profile/AvatarSelector";

const AI_TONES = [
  {
    id: "friendly",
    name: "เป็นกันเองและน่าเชื่อถือ (Friendly)",
    example: "สวัสดีคร้าบ! น้องเอพร้อมพาไปดูคันที่ใช่แบบเข้าใจคุณพี่จริงๆ เลยฮะ 🧡",
    accent: "text-orange-400 bg-orange-500/10",
  },
  {
    id: "dealer",
    name: "มืออาชีพ เน้นข้อมูล (Dealer)",
    example:
      "สวัสดีครับ ยินดีให้บริการดีลเลอร์มืออาชีพ เน้นข้อมูลสเปกครบและคำอธิบายชัดเจนสำหรับการตัดสินใจครับ 📈",
    accent: "text-blue-400 bg-blue-500/10",
  },
  {
    id: "youth",
    name: "สนุก อ่านง่าย เหมาะกับโซเชียล (Youth)",
    example: "คันนี้ต้องมีคนทักแน่ครับ 🔥 โทนสนุก ตรงๆ อ่านง่าย ได้ใจสายโซเชียลเลย!",
    accent: "text-teal-400 bg-teal-500/10",
  },
  {
    id: "luxury",
    name: "พรีเมียมและสุภาพ (Luxury)",
    example: "ต้อนรับคุณผู้มีเกียรติครับ โทนพรีเมียมสุภาพ เน้นความครบถ้วนและบริการที่มีระดับ 🍷",
    accent: "text-fuchsia-400 bg-fuchsia-500/10",
  },
  {
    id: "tiktok",
    name: "กระชับ ทันสมัย (TikTok)",
    example: "สั้น กระชับ ทันเทรนด์! โทน TikTok อ่านแล้วหยุดไม่ได้ในไม่กี่จังหวะ 🎬",
    accent: "text-amber-400 bg-amber-500/10",
  },
];

export default function UserProfileView() {
  const setView = useAppStore((state) => state.setView);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const carsInStore = useAppStore((state) => state.cars);
  const chatSessionsInStore = useAppStore((state) => state.chatSessions);
  const selectChatSessionInStore = useAppStore((state) => state.selectChatSession);

  const { role, membershipDisplay, isDealer, isAdmin } = useRole();
  const { user, updateUserProfile, isSimulatedState } = useAuthContext();

  // Custom User Hooks
  const { 
    isUploading, 
    uploadProgress, 
    toasts, 
    showToast, 
    uploadAvatarImage, 
    handleToggleFavorite, 
    getFavoriteCars 
  } = useUserProfile();

  const { settings, saveSettings } = useSettings(showToast);

  // States
  const [activeTab, setActiveTab] = useState<SettingsTabId>("profile");
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || "");
  const [selectedAiTone, setSelectedAiTone] = useState(() => {
    const allowed = new Set(["dealer", "friendly", "youth", "luxury", "tiktok"]);
    const raw = (user as any)?.dealerPostWritingStyle;
    const v = String(raw ?? "").trim();
    return allowed.has(v) ? v : "dealer";
  });

  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [isSavingWritingStyle, setIsSavingWritingStyle] = useState(false);

  const [dealerEntryHint, setDealerEntryHint] = useState<string | null>(() =>
    dealerEntryHintMessage(consumeDealerEntryHint())
  );
  const [demoLoginBusy, setDemoLoginBusy] = useState(false);

  const demoToolsEnabled = isDealerDemoToolsEnabled();

  // Manual sandbox role switcher (dev / mock / guest session only)
  const handleSandboxRoleChange = async (targetRole: string) => {
    if (!updateUserProfile) {
      showToast("ระบบโปรไฟล์ยังไม่พร้อม — โหลดหน้าใหม่แล้วลองอีกครั้ง", "error");
      return;
    }
    if (!demoToolsEnabled) {
      showToast(
        "สลับสิทธิ์จำลองใช้ได้เฉพาะโหมดพัฒนา (DEV) หรือบัญชีจำลองเท่านั้น",
        "error"
      );
      return;
    }
    try {
      const updates: Record<string, unknown> = {
        role: targetRole,
        membershipType:
          targetRole === "premium"
            ? "pro"
            : targetRole === "dealer"
              ? "dealer"
              : targetRole === "admin" || targetRole === "superadmin"
                ? "enterprise"
                : "free",
        postLimit: ["member", "guest"].includes(targetRole) ? 5 : 999999,
      };
      if (targetRole === "dealer") {
        Object.assign(updates, buildThorAutoDemoProfileUpdates(user));
      } else if (targetRole === "member" || targetRole === "guest") {
        updates.dealerId = undefined;
        updates.dealerProfile = undefined;
      }
      await updateUserProfile(updates as Parameters<typeof updateUserProfile>[0]);
      showToast(
        `เปลี่ยนระดับสิทธิ์ตรวจสอบ Sandbox เป็น ${targetRole.toUpperCase()} แล้วครับ!`,
        "info"
      );
      if (targetRole === "dealer") {
        showToast(
          `Dealer ID: ${THOR_AUTO_DEALER_ID} — ไปที่เมนู Dealer Portal หรือ /dealer`,
          "info"
        );
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "ไม่สามารถสลับสิทธิ์โปรไฟล์จำลองได้ครับ";
      console.warn("Sandbox role change failed:", e);
      showToast(msg.slice(0, 120), "error");
    }
  };

  const handleDemoDealerLogin = async () => {
    if (!updateUserProfile) return;
    if (!demoToolsEnabled) {
      showToast("ระบบทดลองดีลเลอร์เปิดใช้เฉพาะโหมดพัฒนาเท่านั้นครับ", "error");
      return;
    }
    setDemoLoginBusy(true);
    try {
      await updateUserProfile(buildThorAutoDemoProfileUpdates(user));
      showToast("เข้าสู่ระบบทดลองดีลเลอร์ Thor Auto แล้ว — กำลังไป Dealer Portal", "info");
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/dealer");
      }
      setView("dealer-portal");
    } catch (e: unknown) {
      showToast(
        e instanceof Error ? e.message : "เข้าสู่ระบบทดลองดีลเลอร์ไม่สำเร็จ",
        "error"
      );
    } finally {
      setDemoLoginBusy(false);
    }
  };

  const handleSaveProfileForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateUserProfile) return;
    try {
      setIsSavingDisplayName(true);
      await updateUserProfile({ displayName: displayNameInput } as any);
      showToast("บันทึกข้อมูลชื่อโปรไฟล์เรียบร้อยแล้วครับ", "success");
    } catch (e: any) {
      showToast(e?.message || "ล้มเหลวในการบันทึกข้อมูลชื่อโปรไฟล์", "error");
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  // Pre-load display inputs when user context refreshes
  React.useEffect(() => {
    if (user?.displayName && !displayNameInput) {
      setDisplayNameInput(user.displayName);
    }
  }, [user]);

  // Hydrate current style from profile (fallback dealer on missing/invalid).
  React.useEffect(() => {
    const allowed = new Set(["dealer", "friendly", "youth", "luxury", "tiktok"]);
    const raw = (user as any)?.dealerPostWritingStyle;
    const v = String(raw ?? "").trim();
    const next = allowed.has(v) ? v : "dealer";
    setSelectedAiTone(next);
  }, [user]);

  const activeToneObj =
    AI_TONES.find((t) => t.id === selectedAiTone) ||
    AI_TONES.find((t) => t.id === "dealer") ||
    AI_TONES[0];

  const borderSubtle = isDarkMode ? "border-white/5" : "border-slate-200";
  const surfaceMiniCard = isDarkMode
    ? "border-white/[0.08] nonga-bg-surface backdrop-blur-md"
    : "border-slate-200 bg-white shadow-sm";
  const inputField = isDarkMode
    ? "bg-slate-900/60 border-white/10 text-white"
    : "bg-white border-slate-200 text-slate-900";
  const textHeading = isDarkMode ? "text-white" : "text-slate-900";

  return (
    <div className={`py-10 px-4 max-w-6xl mx-auto space-y-8 min-h-[90vh] relative ${
      isDarkMode ? "text-slate-100" : "text-slate-800"
    }`}>
      
      {/* 🔮 In-App Toast Hub floating overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              className={`p-4 rounded-xl border shadow-2xl flex items-center gap-3 pointer-events-auto backdrop-blur-xl ${
                toast.type === "error"
                  ? "bg-red-950/90 border-red-500/20 text-red-200"
                  : toast.type === "info"
                  ? "bg-blue-950/90 border-blue-500/20 text-blue-200"
                  : "bg-slate-905/95 border-orange-500/20 text-slate-100"
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${
                toast.type === "error" ? "bg-red-500 animate-pulse" : toast.type === "info" ? "bg-blue-400" : "bg-orange-500 animate-pulse"
              }`} />
              <div className="text-xs font-black leading-relaxed flex-1">
                {toast.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header and Greeting Segment */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b ${borderSubtle}`}>
        <div className="space-y-1.5 text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <span>โปรไฟล์ของฉัน</span>
            <span className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 leading-none px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
              Nong A Settings System
            </span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            ห้องผู้ขายพรีเมียม ปรับแต่งวิชวลอวตาร, สถิติสิทธิ์ (RBAC), เลือกโทนเสียงของน้องเอ และจัดการพื้นที่แบรนด์โชว์รูมได้ในที่เดียว
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView("marketplace")}
            className={`px-5 py-3 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 flex items-center gap-2 border ${
              isDarkMode
                ? "border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300"
                : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <span>กลับสู่ตลาดรถหลัก</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar vs Active Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick Profile Summary Mini-Card */}
          <div className={`p-6 rounded-2xl text-center relative overflow-hidden ${surfaceMiniCard}`}>
            <div className="absolute top-2 right-2">
              <span className={`text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                isSimulatedState
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-500"
                  : "bg-emerald-500/10 border-emerald-500/25 text-emerald-550"
              }`}>
                {isSimulatedState ? "Sandbox" : "Cloud"}
              </span>
            </div>

            <div className="flex flex-col items-center space-y-3 pt-3">
              <div className="w-20 h-20 rounded-2xl bg-slate-900/40 p-1 border border-orange-500/15 relative">
                <img 
                  src={user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=NongBot`} 
                  alt="Avatar" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm font-black truncate max-w-[150px]">{user?.displayName}</p>
                <p className="text-[10px] font-mono text-slate-500 truncate max-w-[150px] mt-0.5">{user?.email}</p>
              </div>
            </div>

            {/* Level badge */}
            <div className={`mt-5 p-3 rounded-xl border text-left space-y-1 ${
              isDarkMode ? "bg-white/[0.02] border-white/5" : "bg-slate-55 border-slate-200"
            }`}>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{membershipDisplay?.icon || "🚗"}</span>
                <span className={`text-[10px] font-black tracking-wider uppercase ${membershipDisplay?.textColor || "text-orange-500"}`}>
                  {role.toUpperCase()}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                {membershipDisplay?.name || "สมาชิกเริ่มต้นฟรี"}
              </p>
            </div>
          </div>

          {/* Real RBAC Navigation */}
          <SettingsSidebar 
            activeTab={activeTab} 
            onTabChange={(tabId) => {
              setActiveTab(tabId);
              // Dynamic quick feedbacks
              showToast(`สลับแผงควบคุมไปแผง: ${tabId.replace("-", " ").toUpperCase()}`, "info");
            }}
            isDealerOrAdmin={isDealer || isAdmin}
          />

          {dealerEntryHint && (
            <div className="p-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 text-left">
              <p className="text-xs text-orange-200 leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {dealerEntryHint}
              </p>
            </div>
          )}

          {demoToolsEnabled && (
          <div className={`p-5 rounded-2xl text-left space-y-3.5 border ${
            isDarkMode ? "border-white/[0.06] nonga-bg-subtle" : "border-slate-200 bg-slate-50"
          }`}>
            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
              <Key className="w-4 h-4 text-amber-500 shrink-0" />
              <span>เครื่องมือจำลองสิทธิ์ความพรีเมียม (Role Switcher)</span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              โหมดพัฒนา (DEV/Mock) — สลับบทบาททดสอบ Dealer Portal, Import และ Paste Import โดยไม่กระทบ production auth
            </p>

            <button
              type="button"
              disabled={demoLoginBusy}
              onClick={handleDemoDealerLogin}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-xs font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Store className="w-4 h-4" />
              {demoLoginBusy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบทดลองดีลเลอร์ (Thor Auto Demo)"}
            </button>
            <p className="text-[10px] text-slate-500 font-mono">
              dealerId: {THOR_AUTO_DEALER_ID} · showroom: Thor Auto Demo
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "member", name: "ฟรีทั่วไป" },
                { id: "premium", name: "พรีเมียม Pro" },
                { id: "dealer", name: "ดีลเลอร์" },
                { id: "admin", name: "ผู้ดูแลระบบ" }
              ].map((b) => {
                const isCurrent = role === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSandboxRoleChange(b.id)}
                    className={`p-2 rounded-lg border text-center transition-all text-[11px] font-bold cursor-pointer active:scale-95 leading-none ${
                      isCurrent 
                        ? "border-amber-500 bg-amber-500/15 text-amber-400" 
                        : isDarkMode
                        ? "border-white/5 bg-white/[0.01] text-slate-400 hover:bg-white/[0.05]"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>
          )}

        </div>

        {/* Content Column (Tab Switched panels) */}
        <div className="lg:col-span-3 space-y-6">

          <AnimatePresence mode="wait">
            
            {/* TABS 1: Profile and Avatar */}
            {activeTab === "profile" && (
              <SettingsCard
                key="tab-profile"
                title="ข้อมูลบัญชีและโปรไฟล์ส่วนตัว"
                description="แก้ไขชื่อติดต่อจริง อวาตาร์ และตรวจทานความถูกต้องของระดับบัญชีด้านความปลอดภัย"
                icon={<User className="w-5 h-5" />}
              >
                <form onSubmit={handleSaveProfileForm} className="space-y-6">
                  
                  {/* Interactive Avatar selection & file upload module */}
                  <AvatarSelector 
                    currentPhotoURL={user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=NongBot`}
                    onPhotoSeedChange={(seed) => {
                      updateUserProfile({
                        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`
                      }).then(() => showToast("เชื่อมต่อรูปภาพโปรไฟล์ธีมหุ่นยนต์แบบพรีเมียมเรียบร้อยคร้าบ 🎉"));
                    }}
                    onFileSelected={(file) => uploadAvatarImage(file)}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                  />

                  {/* Settings grid fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    
                    <div className="space-y-2 text-left">
                      <label className="text-xs font-black text-slate-400">ระบุชื่อเรียกติดต่อผู้ใช้งานจริง (Display Name)</label>
                      <input 
                        type="text" 
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        required
                        className={`w-full rounded-xl p-3 text-xs focus:outline-none focus:border-orange-500 transition-all font-medium border ${inputField}`}
                        placeholder="ชื่อผู้ขาย เช่น คุณออโต้ บล็อกเกอร์"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-xs font-black text-slate-400 opacity-50">ที่อยู่อีเมลเข้าใช้งาน (Email - ไม่สามารถเปลี่ยนได้)</label>
                      <input 
                        type="text" 
                        value={user?.email || "guest.nong@gmail.com"}
                        disabled
                        className={`w-full rounded-xl p-3 text-xs cursor-not-allowed font-mono opacity-60 border ${
                          isDarkMode
                            ? "bg-slate-950/80 border-white/5 text-slate-500"
                            : "bg-slate-100 border-slate-200 text-slate-500"
                        }`}
                      />
                    </div>

                  </div>

                  <div className={`pt-4 flex justify-between items-center border-t ${borderSubtle}`}>
                    <p className="text-[10.5px] text-slate-400 flex items-center gap-1 truncate max-w-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span>บันทึกชื่อเชื่อมโยงกับการแจ้งเตือนโพสต์ขายรถเสมอ</span>
                    </p>
                    <button
                      type="submit"
                      disabled={isSavingDisplayName}
                      className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-550 text-white text-xs font-black rounded-xl cursor-pointer active:scale-95 hover:shadow-lg hover:shadow-orange-700/20 transition-all font-sans"
                    >
                      {isSavingDisplayName ? "กำลังประมวลผล..." : "บันทึกแก้ไขข้อมูลจำลอง 🪄"}
                    </button>
                  </div>

                </form>
              </SettingsCard>
            )}

            {/* TABS 2: AI Settings & Tones */}
            {activeTab === "ai-preference" && (
              <SettingsCard
                key="tab-ai"
                title="ควิซปรับแต่งความฉลาดสไตล์ Nong A AI"
                description="เลือกสเปกโทนเสียง สํานวนการเขียนวิเคราะห์ และรูปแบบการตอบความรู้ด่วนแก่น้องเอ"
                icon={<Bot className="w-5 h-5" />}
              >
                <div className="space-y-6">
                  
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-black text-slate-400">
                      ✍️ สไตล์การเขียนประกาศขายรถ
                    </label>
                    <p className="text-[10.5px] text-slate-500">
                      ตัวเลือกนี้ใช้เป็นค่าเริ่มต้นสำหรับ Car Post Generator เท่านั้น
                    </p>
                  </div>

                  {isSavingWritingStyle && (
                    <p className="text-[10px] text-slate-500">
                      กำลังบันทึกสไตล์การเขียนประกาศขายรถ...
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                    {AI_TONES.map((t) => {
                      const isSelected = selectedAiTone === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={isSavingWritingStyle}
                          onClick={async () => {
                            if (!updateUserProfile) return;
                            const prev = selectedAiTone;
                            setSelectedAiTone(t.id);
                            setIsSavingWritingStyle(true);
                            try {
                              await updateUserProfile(
                                { dealerPostWritingStyle: t.id } as any
                              );
                              showToast("บันทึกสไตล์การเขียนประกาศขายรถเรียบร้อยแล้วครับ", "success");
                            } catch (err: any) {
                              setSelectedAiTone(prev);
                              showToast(err?.message || "ล้มเหลวในการบันทึกสไตล์การเขียนประกาศขายรถ", "error");
                            } finally {
                              setIsSavingWritingStyle(false);
                            }
                          }}
                          className={`p-4 rounded-xl text-left transition border flex flex-col justify-between cursor-pointer group active:scale-98 duration-200 ${
                            isSelected
                              ? "border-orange-500/50 bg-orange-600/10 text-orange-600 font-bold"
                              : isDarkMode
                              ? "border-white/5 bg-slate-900/30 text-slate-300 hover:bg-slate-900/60"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-black tracking-tight">{t.name}</span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                            {t.example}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* AI Speech Bubble Simulation Live Sandbox Box */}
                  <div className="p-5.5 rounded-2xl bg-gradient-to-br from-orange-955 to-slate-900 border border-orange-500/10 text-left space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                      <Bot className="w-20 h-20 text-orange-500" />
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs font-black text-orange-400">
                      <Bot className="w-4 h-4 animate-bounce" />
                      <span>ตัวอย่างสำนวนการเขียนประกาศขายรถตามสไตล์ที่เลือก</span>
                    </div>

                    {/* Chat Bubble simulation */}
                    <div className="flex items-start gap-3 pt-1">
                      <div className="w-8 h-8 rounded-lg bg-orange-550/15 border border-orange-500/20 p-1 shrink-0">
                        <img 
                          src={user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=NongBot`} 
                          alt="NongBot Mini" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <div className={`p-3 rounded-2xl rounded-tl-none space-y-1.5 max-w-xl border ${
                        isDarkMode
                          ? "bg-white/[0.03] border-white/5"
                          : "bg-slate-50 border-slate-200"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9.5px] font-bold text-slate-400">น้องเอ แสตนด์บายพิกัดขายดี</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${activeToneObj.accent}`}>
                            {activeToneObj.id}
                          </span>
                        </div>
                        <p className={`text-[11.5px] font-sans leading-relaxed ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}>
                          {activeToneObj.example}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end text-[10px] text-slate-400">
                      <span className="bg-white/5 p-1 px-2 rounded-md font-mono text-[9px]">
                        Car Post Generator Default
                      </span>
                    </div>
                  </div>

                </div>
              </SettingsCard>
            )}

            {/* TABS 3: Saved Favorites */}
            {activeTab === "saved" && (
              <SettingsCard
                key="tab-favorited"
                title="รถยนต์ที่บันทึกไว้ในหัวใจ"
                description="ส่องคันที่คุณชื่นชอบเพื่อดูราคากลาง เทียบข้อมูล และเจรจากับผู้ใช้เจ้าของคาร์"
                icon={<Star className="w-5 h-5" />}
              >
                {getFavoriteCars().length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <Heart className="w-12 h-12 text-slate-500 mx-auto opacity-30 stroke-dasharray animate-pulse" />
                    <div className="space-y-1">
                      <h4 className={`text-sm font-bold ${textHeading}`}>ยังไม่มีรถที่ถูกใจเลยครับพี่ชาย</h4>
                      <p className="text-[10.5px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                        คุณสามารถบันทึกรถคันโปรดในแผงตลาดเพื่ออัปเดตสําเนาเทคนิคและติดตามราคากลางได้แบบเรียลไทม์เลยครับ!
                      </p>
                    </div>
                    <button
                      onClick={() => setView("marketplace")}
                      className="px-4.5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-lg text-xs transition cursor-pointer active:scale-95"
                    >
                      พาสายตาไปส่องในตลาดรถไฟฟ้า ⚡
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getFavoriteCars().map((car) => (
                      <div 
                        key={car.id}
                        className={`p-4 rounded-xl flex gap-3 relative group overflow-hidden border ${
                          isDarkMode ? "border-white/5 bg-white/[0.01]" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className={`w-20 h-20 rounded-lg overflow-hidden shrink-0 border ${
                          isDarkMode ? "bg-slate-900 border-white/5" : "bg-slate-100 border-slate-200"
                        }`}>
                          <img 
                            src={getListingPrimaryImage(car)} 
                            alt={car.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-left flex flex-col justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[8px] uppercase font-bold tracking-wider bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">
                              {car.type.toUpperCase()}
                            </span>
                            <h4 className={`text-xs font-black truncate mt-1 ${textHeading}`}>{car.title}</h4>
                            <p className="text-[10px] font-mono text-orange-400 font-black mt-0.5">
                              {car.price.toLocaleString()} THB
                            </p>
                          </div>
                          
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => setView("car-details", car.id)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9.5px] font-bold text-slate-300 transition"
                            >
                              รีวิวสเปก
                            </button>
                            <button
                              onClick={() => handleToggleFavorite(car.id, car.title)}
                              className="p-1 px-2.5 bg-red-950/10 hover:bg-red-900/20 text-red-400 rounded-lg text-[9.5px] transition"
                              title="ลบออก"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SettingsCard>
            )}

            {/* TABS 5: System settings */}
            {activeTab === "system" && (
              <SettingsCard
                key="tab-system"
                title="ระดับธีม คลาวด์ และระเบียบควบคุมแจ้งเตือน"
                description="จัดการแจ้งรายงานประจำสัปดาห์ เปลี่ยนโหมดสี (Dark Mode) และเปลี่ยนภาษาพจนานุกรม"
                icon={<Settings className="w-5 h-5" />}
              >
                <div className="space-y-6">
                  
                  {/* Dark Mode toggle row */}
                  <div className={`p-4 rounded-xl flex items-center justify-between border ${
                    isDarkMode ? "border-white/5 bg-white/[0.01]" : "border-slate-200 bg-slate-50"
                  }`}>
                    <div className="space-y-1 text-left">
                      <span className={`text-xs font-black flex items-center gap-1.5 ${textHeading}`}>
                        <Sparkle className="w-4 h-4 text-orange-500" /> สลับโหมดสีแอมเบียนต์ (Dark Mode Theme)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        สว่างหรือมืดสบายสายตาสำหรับส่องรายละเอียดสเปกขายของ
                      </p>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          // Next-action semantics (mirror Header): dark → switch to light
                          const changeTo = isDarkMode ? "light" : "dark";
                          saveSettings({ theme: changeTo });
                        }}
                        title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
                        aria-label={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
                        data-testid="profile-theme-toggle"
                        className={`p-2 px-4 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 border outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 ${
                          isDarkMode
                            ? "bg-slate-900 border-orange-500 text-orange-400 focus-visible:ring-offset-slate-950"
                            : "bg-white border-slate-300 text-slate-800 focus-visible:ring-offset-white"
                        }`}
                      >
                        {isDarkMode ? "☀️ เปลี่ยนเป็นโหมดสว่าง" : "🌙 เปลี่ยนเป็นโหมดมืด"}
                      </button>
                    </div>
                  </div>

                  {/* Language Selector row */}
                  <div className={`p-4 rounded-xl flex items-center justify-between border ${
                    isDarkMode ? "border-white/5 bg-white/[0.01]" : "border-slate-200 bg-slate-50"
                  }`}>
                    <div className="space-y-1 text-left">
                      <span className={`text-xs font-black flex items-center gap-1.5 ${textHeading}`}>
                        <Languages className="w-4 h-4 text-orange-500" /> ภาษาการทำงานเบื้องหน้า (Language Dictionary)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        ปรับจูนรูปแบบปุ่มและคําสั่งวิเคราะห์เป็นภาษาไทยหรือภาษาอังกฤษ
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {[
                        { code: "th", l: "ภาษาไทย" },
                        { code: "en", l: "English" }
                      ].map((t) => (
                        <button
                          key={t.code}
                          onClick={() => {
                            saveSettings({ language: t.code as any });
                            showToast(`ปรับภาษาการแสดงเบื้องหน้าเป็น ${t.l} สำเร็จแล้วครับ!`, "info");
                          }}
                          className={`p-2 px-3.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            settings.language === t.code 
                              ? "bg-orange-500/15 border border-orange-500/30 text-orange-400"
                              : isDarkMode
                              ? "border border-white/5 bg-transparent text-slate-400 hover:text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {t.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom System notifications toggles */}
                  <div className="space-y-3 pt-2 text-left">
                    <label className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                      <BellRing className="w-4 h-4 text-orange-500 animate-pulse" /> 
                      <span>ตัวเลือกส่งข่าวและแจ้งเตือนพอร์ทล (Notification Toggles)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 leading-relaxed pl-1">
                      ระบุความสมัครใจในการรับข่าวสารความคุ้มสเปกรถไฟฟ้าและประหยัดงบจากเครื่องมือน้องเอ:
                    </p>

                    <div className="space-y-3 pt-2 pl-1">
                      
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={settings.emailNotifications}
                          onChange={(e) => saveSettings({ emailNotifications: e.target.checked })}
                          className={`w-4 h-4 rounded text-orange-500 accent-orange-500 focus:ring-0 border ${
                            isDarkMode ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-300"
                          }`}
                        />
                        <div className="text-left leading-none">
                          <p className={`text-xs font-bold group-hover:text-orange-400 transition ${textHeading}`}>
                            รับแคมเปญโปรขายดีและสิทธิประโยชน์ทางอีเมล (Promotion Mailers)
                          </p>
                          <p className="text-[9.5px] text-slate-500 mt-1">คัดเลือกเฉพาะดีลพรีเมียมจากพาร์ตเนอร์ดีลเลอร์รายสัปดาห์</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={settings.pushNotifications}
                          onChange={(e) => saveSettings({ pushNotifications: e.target.checked })}
                          className={`w-4 h-4 rounded text-orange-500 accent-orange-500 focus:ring-0 border ${
                            isDarkMode ? "bg-slate-900/50 border-white/10" : "bg-white border-slate-300"
                          }`}
                        />
                        <div className="text-left leading-none font-sans">
                          <p className={`text-xs font-bold group-hover:text-orange-400 transition ${textHeading}`}>
                            ข้อความด่วนเรียลไทม์เมื่อลูกค้าติดต่อขอนัดตรวจเช็คคาร์ (Live Buyer Chat Alerts)
                          </p>
                          <p className="text-[9.5px] text-slate-500 mt-1">ไม่พลาดทุกดีลการเจรจาราคา ส่งใบสรุปทางหน้าจอทันที</p>
                        </div>
                      </label>

                    </div>
                  </div>

                </div>
              </SettingsCard>
            )}

            {/* TABS 6: Chat history tracker placeholder */}
            {activeTab === "history" && (
              <SettingsCard
                key="tab-history"
                title="ประวัติและห้องคุยสนทนาเปรียบเทียบกับน้องเอ AI"
                description="ย้อนกลับไปอ่านทริก รายการคาร์ที่คุณส่องคุย หรือเปิดแช็ตเก่าที่ถามค้างคาใจไว้ครับ"
                icon={<History className="w-5 h-5" />}
              >
                {chatSessionsInStore.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <MessageCircle className="w-12 h-12 text-slate-500 mx-auto opacity-30 animate-pulse" />
                    <div className="space-y-1">
                      <h4 className={`text-sm font-bold ${textHeading}`}>ยังไม่มีประวัติการคุยเลยฮะ</h4>
                      <p className="text-[10.5px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                        แนะนํากดเข้าห้องน้องเอเพื่อประชดราคา คุยเปรียบเทียบสเปก EV แล้วประวัติดีลเด็ดจะปรากฏที่บันทึกพอร์ทลนี้ด่วนคร้าบ
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-500 text-left">
                      📋 ข้อมูลการคุยที่ถูกประทับดรอปดาวน์ความหลัง (คลิกเพื่อเดินทางไปสู้ต่อที่ห้องแช็ตได้ทันที):
                    </p>
                    
                    <div className="grid grid-cols-1 gap-2.5">
                      {chatSessionsInStore.map((s) => (
                        <div 
                          key={s.id}
                          className={`p-4 rounded-xl flex items-center justify-between transition group text-left border ${
                            isDarkMode
                              ? "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="text-[8px] bg-orange-500/10 text-orange-400 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                              CHAT ID: {s.id.split("-")[1] || s.id}
                            </span>
                            <h4 className={`text-xs font-black group-hover:text-orange-400 transition truncate max-w-md mt-1 ${textHeading}`}>
                              {s.title}
                            </h4>
                            <p className="text-[9px] text-slate-500 font-mono">
                              วันเวลาคุย: {new Date(s.createdAt).toLocaleString("th-TH")}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => {
                              selectChatSessionInStore(s.id);
                              setView("chat");
                              showToast("พาท่านไปส่งสู่บทสนทนาเปรียบเทียบรถครับ! 🚀", "info");
                            }}
                            className="px-4 py-2 bg-orange-600/10 border border-orange-500/25 group-hover:bg-orange-600 group-hover:text-white text-orange-400 text-[10.5px] font-black rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                          >
                            <span>คุยต่อ</span>
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SettingsCard>
            )}

          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
