import React, { useState } from "react";
import { useAIAdmin } from "../../../hooks/admin/ai/useAIAdmin";
import { AISkillControlCenter } from "./AISkillControlCenter";
import { 
  Sparkles, Sliders, Smile, Wand2, Cpu, BookOpen, ShieldCheck, 
  Activity, Code, Workflow, MessageSquare, Plus, Trash2, Edit3, 
  Save, X, Check, RotateCcw, TrendingUp, Compass, Eye, AlertTriangle,
  Play, CheckCircle2, Heart, Zap, Award, BarChart3, HelpCircle, Lock, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AIPromptTemplate, AIPersonalityPreset, AIMoodConfig, 
  AISkillConfig, AIWorkflow, AIPhraseCollection, AIRuleConfig 
} from "../../../types/aiAdmin";

export default function AIControlCenter() {
  const {
    prompts,
    personalities,
    moods,
    skills,
    workflows,
    phrases,
    rules,
    loading,
    saving,
    error,
    savePrompt,
    deletePrompt,
    savePersonality,
    deletePersonality,
    saveMood,
    deleteMood,
    saveSkill,
    deleteSkill,
    saveWorkflow,
    deleteWorkflow,
    savePhrase,
    deletePhrase,
    saveRule,
    deleteRule,
    reloadAll
  } = useAIAdmin();

  // Active view management
  const [activeTab, setActiveTab] = useState<
    "prompts" | "personalities" | "moods" | "skills" | "workflows" | "phrases" | "rules" | "analytics"
  >("prompts");

  // Selection states for edit/add dialogs
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Quick Sandbox Playroom state
  const [selectedPersonaId, setSelectedPersonaId] = useState("dealer");
  const [selectedMoodId, setSelectedMoodId] = useState("mood-happy");
  const [simulatedPromptText, setSimulatedPromptText] = useState("");
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Loading indicator for reset
  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-t-orange-500 border-r-orange-500/20 border-b-orange-500/20 border-l-orange-500/20 animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">กำลังสแกนโครงสร้างระดับกระแสประสาท AI Nong A ดึ๋งๆ...</p>
      </div>
    );
  }

  // Helper colors mapping
  const getTabStyle = (tabName: typeof activeTab) => {
    return activeTab === tabName
      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black shadow-md shadow-orange-500/10"
      : "text-slate-400 hover:text-white hover:bg-white/[0.03]";
  };

  const categoriesColors: Record<string, string> = {
    chat: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    vision: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    recommendation: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    onboarding: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    "post-generation": "text-pink-400 bg-pink-400/10 border-pink-400/20",
    sales: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    support: "text-teal-400 bg-teal-400/10 border-teal-400/20",
    analytics: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    search: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    calculation: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    comparison: "text-lime-400 bg-lime-400/10 border-lime-400/20",

    sales_hook: "text-orange-400 bg-orange-400/10 border-orange-500/10",
    emoji_hype: "text-yellow-400 bg-yellow-400/10 border-yellow-500/10",
    closing_pitch: "text-teal-400 bg-teal-400/10 border-teal-500/10",
    empathy_boost: "text-pink-400 bg-pink-400/10 border-pink-500/10",
    guarantee: "text-emerald-400 bg-emerald-400/10 border-emerald-500/10"
  };

  // Compile prompt tester
  const handleSimulatePrompt = () => {
    setSimulating(true);
    setSimulationResult(null);

    const activePersona = personalities.find(p => p.id === selectedPersonaId) || personalities[0];
    const activeMood = moods.find(m => m.id === selectedMoodId) || moods[0];

    setTimeout(() => {
      if (!activePersona) {
        setSimulationResult("❌ ข้อมูลบุคลิกภาพล้มเหลว");
        setSimulating(false);
        return;
      }

      // Compile active custom phrases & rules
      const activePhrases = phrases.filter(p => p.isActive).map(p => p.text);
      const activeRules = rules.filter(r => r.isActive).map(r => `- [กฎ ${r.type}] ตรวจจับคำว่า "${r.pattern}" -> ผลลัพธ์: ${r.action}`);

      const compiled = `
[SYSTEM_INSTRUCTION: Nong A V3 - Compiled Config]
--------------------------------------------------
ID: ${activePersona.id} (${activePersona.name})
Temperature: ${activePersona.temperature}
Tone: ${activePersona.toneDescription}

[Instruction Blueprint]
${activePersona.customSystemInstruction}

[Active Mood Dynamics]
- Senti-state: ${activeMood?.sentiment?.toUpperCase() || "NEUTRAL"}
- Sentiment-Adjustment Modifier: ${activeMood?.modifierText || "None"}
- Adjusted scores: 
  * Energy: ${activePersona.defaultEmotionScores.energy + (activeMood?.energyBonus || 0)} 
  * Humor: ${activePersona.defaultEmotionScores.humor + (activeMood?.humorBonus || 0)}
  * Warmth: ${activePersona.defaultEmotionScores.warmth + (activeMood?.warmthBonus || 0)}
  * Formality: ${activePersona.defaultEmotionScores.formality + (activeMood?.formalityBonus || 0)}

[Sprinkled Phrases Collection]
${activePersona.signaturePhrases.concat(activePhrases.slice(0, 3)).map(p => `• "${p}"`).join("\n")}

[Context Guidelines & Guards]
${activeRules.join("\n") || "No custom structural rules active."}
`;
      setSimulationResult(compiled);
      setSimulating(false);
    }, 800);
  };

  return (
    <section
      className="space-y-6 text-slate-300 selection:bg-orange-500/30"
      data-testid="legacy-ai-control-center"
      data-legacy-disclosure="true"
      aria-label="Legacy AI Control Center admin config demo"
    >
      {/* v6.4C.2 — Safety banner: authoritative OFF state + legacy disclosure */}
      <div
        className="rounded-2xl border border-amber-500/30 bg-amber-950/25 p-4 space-y-2 text-left"
        data-testid="legacy-ai-control-safety-banner"
      >
        <p className="text-[11px] text-amber-100/95 flex items-start gap-2 leading-relaxed">
          <Shield className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <span>
            <strong className="text-amber-200">Legacy admin config (demo)</strong> — AI
            provider remains <strong className="text-amber-200">OFF</strong>. Real Gemini is{" "}
            <strong className="text-amber-200">not enabled</strong>. Save/delete below persist
            legacy config drafts (localStorage/Firestore) —{" "}
            <strong className="text-amber-200">not</strong> connected to real provider runtime.
            Analytics and metrics in this section are{" "}
            <strong className="text-amber-200">mock/placeholder</strong> with no live data
            source. No secrets, raw prompts, or full UID are displayed here.
          </span>
        </p>
      </div>

      {/* Header Visual Shield with glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-orange-600/10 blur-[80px] pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 -ml-24 -mb-24 w-72 h-72 rounded-full bg-amber-600/10 blur-[100px] pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="p-1.5 px-3 rounded-full bg-slate-500/10 border border-slate-500/25 text-slate-300 text-[10px] font-black tracking-widest uppercase"
                data-testid="legacy-ai-control-disclosure-badge"
              >
                Legacy admin config
              </span>
              <span className="flex items-center gap-1 p-1.5 px-3 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-black tracking-widest uppercase">
                <Lock className="w-3 h-3" />
                Demo / Not connected
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight flex items-center gap-2.5">
              <Cpu className="w-8 h-8 text-orange-500 shrink-0" />
              Nong A AI Control Center
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Legacy module สำหรับร่าง config (prompts, moods, rules) —{" "}
              <strong className="text-amber-200/90">not connected to real Gemini</strong>.
              ใช้เพื่อเตรียม control modules ในอนาคตภายใต้ v6.4 control plane — ไม่ใช่สถานะ
              production AI live
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={reloadAll}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-white/[0.08] hover:bg-white/[0.04] text-slate-300 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              รีบูตประสาทวิทยา
            </button>
            <button
              onClick={() => {
                setIsAddingNew(true);
                setEditingItem({
                  id: "new-" + Math.random().toString(36).substring(2, 6),
                  name: "ดีไซน์แผ่นใหม่",
                  template: "",
                  variables: [],
                  isActive: true
                });
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white shadow-lg shadow-orange-500/10 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              สร้างคอนฟิกใหม่
            </button>
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <p
        className="text-[10px] text-slate-400 border border-white/[0.06] bg-white/[0.02] rounded-xl px-4 py-2.5 leading-relaxed"
        data-testid="legacy-ai-control-write-warning"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline mr-1.5 align-[-2px]" />
        <strong className="text-amber-200/90">Legacy config persistence:</strong> ปุ่ม
        รีบูต/สร้างคอนฟิก/บันทึก/ลบ ด้านล่างเก็บแบบร่าง admin config เท่านั้น — ไม่เปิด real
        provider และไม่เรียก Gemini API
      </p>

      {/* Main SaaS Tabs Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Navigation Sidebar */}
        <div className="xl:col-span-1 rounded-2xl p-3 border border-white/[0.06] bg-[#0c0c0e]/95 backdrop-blur-md space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 font-extrabold">
            ระบบจัดตารางความคิด (Systems Modules)
          </p>

          <nav className="flex flex-row xl:flex-col overflow-x-auto xl:overflow-x-visible no-scrollbar gap-1">
            <button
              onClick={() => { setActiveTab("prompts"); setIsAddingNew(false); setEditingItem(null); }}
              className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition w-full ${getTabStyle("prompts")}`}
            >
              <Code className="w-4 h-4 text-sky-400" />
              <span>1. Prompt Templates ({prompts.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("personalities"); setIsAddingNew(false); setEditingItem(null); }}
              className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition w-full ${getTabStyle("personalities")}`}
            >
              <Sliders className="w-4 h-4 text-orange-400" />
              <span>2. AI Personalities ({personalities.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("moods"); setIsAddingNew(false); setEditingItem(null); }}
              className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition w-full ${getTabStyle("moods")}`}
            >
              <Smile className="w-4 h-4 text-yellow-400" />
              <span>3. Mood Engine ({moods.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("skills"); setIsAddingNew(false); setEditingItem(null); }}
              className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition w-full ${getTabStyle("skills")}`}
            >
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>4. AI Skills Engine ({skills.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("workflows"); setIsAddingNew(false); setEditingItem(null); }}
              className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition w-full ${getTabStyle("workflows")}`}
            >
              <Workflow className="w-4 h-4 text-pink-400" />
              <span>5. Logical Workflows ({workflows.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("phrases"); setIsAddingNew(false); setEditingItem(null); }}
              className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition w-full ${getTabStyle("phrases")}`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>6. Response Phrases ({phrases.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("rules"); setIsAddingNew(false); setEditingItem(null); }}
              className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition w-full ${getTabStyle("rules")}`}
            >
              <ShieldCheck className="w-4 h-4 text-red-400" />
              <span>7. Safety & Steer Rules ({rules.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab("analytics"); setIsAddingNew(false); setEditingItem(null); }}
              className={`whitespace-nowrap flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition w-full ${getTabStyle("analytics")}`}
            >
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>8. Mock Analytics 📊 (no live data)</span>
            </button>
          </nav>
          
          {/* Quick Real-time Playground simulation block */}
          <div className="p-4 rounded-xl border border-white/[0.05] bg-gradient-to-br from-white/[0.01] to-white/[0.02] text-left space-y-3.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <h3 className="text-xs font-black text-white">
                ผังจำลองสมองกล (Sandbox — local demo only)
              </h3>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold block h-auto">1. บุคลิกภาพในการคิด:</label>
              <select
                value={selectedPersonaId}
                onChange={e => setSelectedPersonaId(e.target.value)}
                className="w-full text-xs p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
              >
                {personalities.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-bold block h-auto">2. สภาวะอารมณ์ตอบโต้วินาทีนี้:</label>
              <select
                value={selectedMoodId}
                onChange={e => setSelectedMoodId(e.target.value)}
                className="w-full text-xs p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
              >
                {moods.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSimulatePrompt}
              disabled={simulating}
              className="w-full font-bold py-2 bg-slate-800 hover:bg-slate-750 border border-white/5 hover:border-white/10 text-white hover:text-orange-400 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
            >
              {simulating ? (
                <>
                  <div className="w-3 h-3 rounded-full border border-t-orange-400 animate-spin"></div>
                  <span>กำลังวิเคราะห์...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-orange-400 fill-orange-400/20" />
                  <span>ทดสอบจำลอง Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic content render view */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* SIMULATOR MODAL PRESTIGE CONTAINER */}
          {simulationResult && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-5 rounded-2xl border border-orange-500/20 bg-orange-950/10 backdrop-blur-md text-left space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-orange-400 font-bold flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 fill-orange-400/20" />
                  จำลองประกอบข้อความระบบ (Prompt Integration Output) 🦾
                </span>
                <button
                  onClick={() => setSimulationResult(null)}
                  className="p-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <pre className="font-mono text-[10.5px] text-slate-300 bg-black/50 p-4 rounded-xl overflow-x-auto max-h-[300px] border border-white/[0.04]">
                {simulationResult}
              </pre>
            </motion.div>
          )}

          {/* RENDER DYNAMIC ACTIVE TAB CONTENT */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e]/60 backdrop-blur-md p-6 space-y-6 text-left relative">
            
            {/* 1. PROMPTS TAB */}
            {activeTab === "prompts" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Code className="w-4 h-4 text-sky-400" />
                      ระบบควบคุมโครงสร้าง Prompt Templates
                    </h3>
                    <p className="text-slate-400 text-xs">กำหนดคำสั่งหลัก (System Prompt) ของน้องเอในแต่ละกลุ่มฟังก์ชันงาน</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {prompts.map((p) => (
                    <div 
                      key={p.id} 
                      className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.03] transition flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{p.name}</h4>
                            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${categoriesColors[p.category] || "bg-slate-800"}`}>
                              {p.category}
                            </span>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${p.isActive ? "bg-green-500" : "bg-slate-600"}`}></span>
                        </div>
                        <p className="text-[12px] text-slate-400 font-mono line-clamp-2 bg-black/20 p-2 rounded border border-white/[0.03]">
                          {p.template}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-mono">โครงตัวแปร:</span>
                          {p.variables.map((v, i) => (
                            <span key={i} className="text-[9.5px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                              {"{" + v + "}"}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/[0.03] text-[11px] text-slate-500">
                        <span>อัปเดตล่าสุด: {new Date(p.lastUpdated).toLocaleDateString("th-TH", { hour: "numeric", minute: "numeric" })}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingItem(p); setIsAddingNew(false); }}
                            className="p-1 px-2.5 rounded bg-slate-800 hover:bg-slate-755 hover:text-sky-400 border border-white/5 transition flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            แก้ไข
                          </button>
                          <button
                            onClick={() => deletePrompt(p.id)}
                            className="p-1 px-2 text-slate-500 hover:text-red-400 rounded hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. PERSONALITIES TAB */}
            {activeTab === "personalities" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-orange-400" />
                      ศูนย์จัดแจงบุคลิกภาพ (Personality Configurator)
                    </h3>
                    <p className="text-slate-400 text-xs">ควบคุมสำเนียงพฤติกรรม น้ำเสียง และอัตราตัวแปรการตัดสินใจโมเดลของน้องเอ</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {personalities.map((p) => (
                    <div 
                      key={p.id} 
                      className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] flex flex-col justify-between gap-4 text-left relative overflow-hidden"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatarSeed}`} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-white text-sm leading-tight">{p.name}</h4>
                            <span className="text-[10px] text-slate-500 uppercase font-mono">{p.displayNameEn}</span>
                          </div>
                        </div>

                        <p className="text-[11.5px] text-slate-400 min-h-[34px] leading-relaxed line-clamp-3">
                          {p.description}
                        </p>

                        <div className="p-2.5 rounded-lg bg-black/20 text-[11px] border border-white/[0.03] space-y-1 font-mono text-slate-400 leading-relaxed">
                          <p><strong>น้ำเสียง:</strong> {p.toneDescription}</p>
                          <p><strong>อุณหภูมิโมเดล (Temp):</strong> {p.temperature}</p>
                        </div>

                        {/* Emotion Metrics Slider display */}
                        <div className="space-y-1 text-[10px] text-slate-500">
                          <p className="uppercase tracking-widest font-mono font-bold text-slate-500">ดัชนีอารมณ์ติดตัว:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between bg-black/10 px-2 py-1 rounded">
                              <span>คึกคัก (Energy)</span>
                              <span className="font-black text-white">{p.defaultEmotionScores.energy}</span>
                            </div>
                            <div className="flex items-center justify-between bg-black/10 px-2 py-1 rounded">
                              <span>หยอดมุก (Humor)</span>
                              <span className="font-black text-white">{p.defaultEmotionScores.humor}</span>
                            </div>
                            <div className="flex items-center justify-between bg-black/10 px-2 py-1 rounded">
                              <span>จริงใจ (Warmth)</span>
                              <span className="font-black text-white">{p.defaultEmotionScores.warmth}</span>
                            </div>
                            <div className="flex items-center justify-between bg-black/10 px-2 py-1 rounded">
                              <span>เป็นงาน (Formal)</span>
                              <span className="font-black text-white">{p.defaultEmotionScores.formality}</span>
                            </div>
                          </div>
                        </div>

                        {/* Signature phrases collection */}
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-mono font-bold text-slate-500">ประโยคบังคับใส่ประจำตัว:</p>
                          <div className="flex flex-col gap-1">
                            {p.signaturePhrases.map((phrase, idx) => (
                              <div key={idx} className="text-[11px] text-orange-300 bg-orange-500/5 p-1 px-2 rounded border border-orange-500/10 truncate font-sans">
                                ✨ "{phrase}"
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.03]">
                        <button
                          onClick={() => { setEditingItem(p); setIsAddingNew(false); }}
                          className="p-1 px-3 rounded bg-slate-800 hover:bg-slate-755 hover:text-orange-400 border border-white/5 transition text-xs font-bold flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          แก้ไขบุคลิก
                        </button>
                        {p.isCustom && (
                          <button
                            onClick={() => deletePersonality(p.id)}
                            className="p-1 px-2 text-slate-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. MOODS TAB */}
            {activeTab === "moods" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Smile className="w-4 h-4 text-yellow-400" />
                      Dynamic Mood Engine Configs (ขุมพลังจัดอารมณ์)
                    </h3>
                    <p className="text-slate-400 text-xs">กำหนดชุดสติอารมณ์ ความกดดัน ที่น้องเอสามารถสวมรอยปั้นน้ำเสียงแปรผันตามอารมณ์ลูกค้าได้</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {moods.map((m) => (
                    <div 
                      key={m.id} 
                      className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] uppercase font-mono font-extrabold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                            {m.sentiment}
                          </span>
                          <span className={`w-2.5 h-2.5 rounded-full ${m.isActive ? "bg-green-500" : "bg-slate-600"}`}></span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-white text-sm">{m.name}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed min-h-[50px]">{m.modifierText}</p>
                        </div>

                        {/* Delta scores */}
                        <div className="space-y-1 text-[10px] text-slate-500 font-mono">
                          <p className="uppercase tracking-widest font-extrabold">ปรับแต่งค่าตัวแปรอารมณ์ (Mod Deltas):</p>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>คึกคัก (Energy)</span>
                              <span className={`font-black ${m.energyBonus >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {m.energyBonus >= 0 ? `+${m.energyBonus}` : m.energyBonus}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>หยอดมุก (Humor)</span>
                              <span className={`font-black ${m.humorBonus >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {m.humorBonus >= 0 ? `+${m.humorBonus}` : m.humorBonus}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>อบอุ่น (Warmth)</span>
                              <span className={`font-black ${m.warmthBonus >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {m.warmthBonus >= 0 ? `+${m.warmthBonus}` : m.warmthBonus}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>ความสุภาพ (Formality)</span>
                              <span className={`font-black ${m.formalityBonus >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {m.formalityBonus >= 0 ? `+${m.formalityBonus}` : m.formalityBonus}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.03]">
                        <button
                          onClick={() => { setEditingItem(m); setIsAddingNew(false); }}
                          className="p-1 px-3 rounded bg-slate-800 hover:bg-slate-755 hover:text-yellow-400 border border-white/5 transition text-xs font-bold"
                        >
                          แก้ไขอารมณ์
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SKILLS TAB */}
            {activeTab === "skills" && (
              <AISkillControlCenter />
            )}

            {/* 5. WORKFLOWS TAB */}
            {activeTab === "workflows" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-pink-400" />
                      Logical AI Workflows Editor
                    </h3>
                    <p className="text-slate-400 text-xs">จัดการชุดกระบวนการตัดสินใจ ลำดับขั้นตอนการแนะนำโปรดีลรถ หรือคุยรับฟังวิเคราะห์ลูกค้า</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {workflows.map((w) => (
                    <div 
                      key={w.id} 
                      className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-white">{w.name}</h4>
                            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${categoriesColors[w.category] || "bg-slate-800"}`}>
                              {w.category}
                            </span>
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full ${w.isActive ? "bg-green-500" : "bg-slate-600"}`}></span>
                        </div>

                        <p className="text-[12px] text-slate-400 leading-relaxed">{w.description}</p>

                        {/* Workflow steps sequence viz */}
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-extrabold">แนวลำดับขั้นประสาท (Workflow Steps Routing):</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
                            {w.steps.map((st, i) => (
                              <div key={st.id} className="p-3 rounded-lg bg-black/30 border border-white/[0.03] space-y-1 text-xs relative">
                                <div className="flex items-center justify-between">
                                  <span className="w-5 h-5 bg-pink-500/10 text-pink-400 border border-pink-500/20 font-black text-[10px] rounded-full flex items-center justify-center">
                                    {i + 1}
                                  </span>
                                  <span className={`text-[8px] uppercase tracking-wider ${st.isActive ? "text-green-400" : "text-slate-500"}`}>
                                    {st.isActive ? "ACTIVE" : "DISABLED"}
                                  </span>
                                </div>
                                <h5 className="font-bold text-slate-200 mt-1">{st.label}</h5>
                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{st.instruction}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.03]">
                        <button
                          onClick={() => { setEditingItem(w); setIsAddingNew(false); }}
                          className="p-1 px-3 rounded bg-slate-800 hover:bg-slate-755 hover:text-pink-400 border border-white/5 transition text-xs font-bold"
                        >
                          แก้ไขขั้นตอน Workflow
                        </button>
                        <button
                          onClick={() => deleteWorkflow(w.id)}
                          className="p-1 px-2 text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. PHRASES TAB */}
            {activeTab === "phrases" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      คลังประโยคเฉพาะและคำพูดดึงสติปิดดีล (AI Phrase Library)
                    </h3>
                    <p className="text-slate-400 text-xs">สอดส่องและเพิ่มประโยคซิกเนเจอร์ Sales Hooks ที่น้องเอเลือกใช้ในการคุยปิดดีลเชียร์ซื้อขายอัตโนมัติ</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {phrases.map((ph) => (
                    <div 
                      key={ph.id} 
                      className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9.5px] uppercase font-mono px-2 py-0.5 rounded border ${categoriesColors[ph.category] || "bg-slate-800"}`}>
                            {ph.category.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">ใช้งานแล้ว: <strong>{ph.usageCount} ครั้ง</strong></span>
                        </div>
                        <p className="text-[13.5px] font-medium text-white leading-relaxed">
                          "{ph.text}"
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                            const updated = { ...ph, isActive: !ph.isActive };
                            await savePhrase(updated);
                          }}
                          className={`w-4.5 h-4.5 rounded-full flex items-center justify-center transition border ${
                            ph.isActive ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-slate-800 border-white/10 text-slate-500"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => { setEditingItem(ph); setIsAddingNew(false); }}
                          className="p-1.5 rounded hover:bg-white/5 hover:text-emerald-400 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePhrase(ph.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. RULES TAB */}
            {activeTab === "rules" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-red-400" />
                      ระเบียบนิติกรรม & สภารักษาความปลอดภัยปอดเหล็ก (AI Safety & Context Rules)
                    </h3>
                    <p className="text-slate-400 text-xs">ควบคุมสิ่งต้องห้าม คำแบล็คลิสต์ ปิดกั้นคู่แข่ง และการบังคับปรับแนวคิด (Steer Options)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rules.map((ru) => (
                    <div 
                      key={ru.id} 
                      className="p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9.5px] uppercase font-mono px-2 py-0.5 rounded border text-red-400 bg-red-400/5 border-red-400/10`}>
                            {ru.type.replace("_", " ")}
                          </span>
                          
                          <span className={`text-[9.5px] tracking-wider font-extrabold uppercase px-1.5 py-0.2 rounded ${
                            ru.action === "block" ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-500"
                          }`}>
                            ACTION: {ru.action.toUpperCase()}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-white text-sm">{ru.name}</h4>
                          <div className="p-2 py-1 bg-black/30 border border-white/[0.02] mt-1.5 rounded text-xs font-mono text-slate-400 leading-normal">
                            <strong>ตรวจจับแพตเทิร์น:</strong> "{ru.pattern}"
                          </div>
                        </div>

                        {ru.replacement && (
                          <div className="p-2.5 rounded bg-amber-500/5 text-[11px] border border-amber-500/10 leading-relaxed font-sans text-amber-300">
                            <strong>แนวคิดเบนเป้าหมาย (Steer Guideline):</strong><br />
                            "{ru.replacement}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.03]">
                        <button
                          onClick={async () => {
                            const updated = { ...ru, isActive: !ru.isActive };
                            await saveRule(updated);
                          }}
                          className={`text-[10.5px] font-bold ${ru.isActive ? "text-green-400" : "text-slate-500"}`}
                        >
                          {ru.isActive ? "✓ บังคับกฎเป็นทางการ" : "❌ ปิดระเบียบข้อนี้"}
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingItem(ru); setIsAddingNew(false); }}
                            className="p-1 px-3 rounded bg-slate-800 hover:bg-slate-755 hover:text-red-400 border border-white/5 transition text-xs font-bold"
                          >
                            แก้ไขกฎ
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. ADVANCED ANALYTICS TAB */}
            {activeTab === "analytics" && (
              <div className="space-y-6" data-testid="legacy-ai-control-analytics-panel">
                <div
                  className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 px-4 py-3 text-[11px] text-indigo-200/90"
                  data-testid="legacy-ai-control-analytics-mock-banner"
                >
                  <strong className="text-indigo-200">Mock analytics</strong> — placeholder
                  metrics only. <strong>No live data source</strong>. Not connected to real
                  Gemini or production telemetry.
                </div>
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-400" />
                      Mock AI Analytics (demo / not connected)
                    </h3>
                    <p className="text-slate-400 text-xs">
                      ตัวเลขด้านล่างเป็น placeholder — ไม่ใช่รายงาน production จริง
                    </p>
                  </div>
                </div>

                {/* Placeholder stats card row — no live data source */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div
                    className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-left"
                    data-testid="legacy-ai-control-metric-placeholder"
                  >
                    <span className="text-[9px] text-amber-400/90 font-bold uppercase tracking-wide block mb-1">
                      Placeholder
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">AI Response Success Rate:</span>
                    <span className="text-2xl font-black text-emerald-400/80 font-mono block mt-1">99.82%</span>
                    <span className="text-[9.5px] text-slate-500 font-mono block mt-1">Mock — no live data source</span>
                  </div>
                  <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-left">
                    <span className="text-[9px] text-amber-400/90 font-bold uppercase tracking-wide block mb-1">
                      Placeholder
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Avg Response Latency (demo):</span>
                    <span className="text-2xl font-black text-sky-400/80 font-mono block mt-1">1.28s</span>
                    <span className="text-[9.5px] text-slate-500 font-mono block mt-1">
                      Not connected — Gemini runtime not enabled (future-only)
                    </span>
                  </div>
                  <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-left">
                    <span className="text-[9px] text-amber-400/90 font-bold uppercase tracking-wide block mb-1">
                      Placeholder
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">Deals Driven by AI (demo):</span>
                    <span className="text-2xl font-black text-orange-400/80 font-mono block mt-1">74.2%</span>
                    <span className="text-[9.5px] text-slate-500 font-mono block mt-1">Mock metric — no analytics backend</span>
                  </div>
                  <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] text-left">
                    <span className="text-[9px] text-amber-400/90 font-bold uppercase tracking-wide block mb-1">
                      Placeholder
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold block">AI Active Memory Profiles (demo):</span>
                    <span className="text-2xl font-black text-purple-400/80 font-mono block mt-1">1,480 คน</span>
                    <span className="text-[9.5px] text-slate-500 font-mono block mt-1">
                      Mock — admin config cache only, not live memory service
                    </span>
                  </div>
                </div>

                {/* Fine tuning pipeline — future-ready, not connected */}
                <div className="p-5 rounded-xl border border-white/[0.05] bg-gradient-to-r from-indigo-950/20 to-purple-950/20 text-left space-y-3.5 relative overflow-hidden">
                  <div className="absolute right-0 top-0 -mr-12 -mt-12 w-32 h-32 rounded-full bg-indigo-500/10 blur-[50px]"></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-black font-mono">
                      Future-ready
                    </span>
                    <span className="text-[10px] text-amber-300/90 font-bold uppercase">
                      Not connected to real Gemini
                    </span>
                    <h4 className="text-sm font-black text-white w-full sm:w-auto">
                      Nong A Fine-Tuning Module (demo placeholder)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                    แผนรวบรวมข้อมูลสนทนาเพื่อ fine-tuning ในอนาคต — รอบนี้เป็น UI placeholder
                    เท่านั้น ไม่มี pipeline จริงและไม่เรียก Gemini API
                  </p>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>รวบรวมข้อความแชทคุณภาพ (Datasets Compiled — mock)</span>
                      <span>8,420 / 10,000 ข้อความ (placeholder)</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: "84.2%" }}></div>
                    </div>
                  </div>
                </div>

                {/* Score breakdown metrics lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                    <h5 className="font-bold text-xs text-white uppercase tracking-wider mb-2">
                      คำพูดปิดดีลยอดนิยม (mock sample data)
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2 bg-black/20 rounded">
                        <span>"รถคันนี้มีคนทักแน่ครับ 🔥"</span>
                        <span className="text-orange-400 font-bold font-mono">142 ครั้ง</span>
                      </div>
                      <div className="flex justify-between p-2 bg-black/20 rounded">
                        <span>"สวยทะลุมิติ สเป็คอัจฉริยะล้ำโลกคร้าบ ⚡"</span>
                        <span className="text-orange-400 font-bold font-mono">95 ครั้ง</span>
                      </div>
                      <div className="flex justify-between p-2 bg-black/20 rounded">
                        <span>"เช็คสภาพละเอียดยิบ รับดอกเบี้ยดาวน์ต่ำสิครับ"</span>
                        <span className="text-orange-400 font-bold font-mono">88 ครั้ง</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                    <h5 className="font-bold text-xs text-white uppercase tracking-wider mb-2">
                      ดักพฤติกรรมความปลอดภัย (Moderation Logs — mock summary)
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2 bg-[#ff0000]/5 text-red-400 rounded">
                        <span>สกัดพรรณนาคำพูดไม่เหมาะสม (Blacklist Blocked)</span>
                        <span className="font-bold font-mono">0 ครั้ง พลังกรอง 100%</span>
                      </div>
                      <div className="flex justify-between p-2 bg-[#ffa500]/5 text-amber-400 rounded">
                        <span>เบี่ยงเส้นคำถาม EV (Battery Anxieties Steered)</span>
                        <span className="font-bold font-mono">34 ครั้ง ปลดกังวลสนิท</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white/[0.02] text-slate-400 rounded">
                        <span>บล็อคอ้างอิงคู่แข่ง (Competitor references redirected)</span>
                        <span className="font-bold font-mono">12 ครั้ง</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* EDITING ITEM POPUP - Overlaid beautifully glassmorphic modal style */}
          <AnimatePresence>
            {editingItem && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
              >
                <div className="w-full max-w-2xl rounded-3xl border border-white/[0.08] bg-[#0c0c0e]/95 p-6 space-y-5 text-left shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                    <h4 className="font-black text-base text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-orange-500" />
                      {isAddingNew ? `สร้างแผ่นดีไซน์ใหม่ (${activeTab.toUpperCase()})` : `แก้ไขโครงข้อมูล (${activeTab.toUpperCase()})`}
                    </h4>
                    <button 
                      onClick={() => { setEditingItem(null); setIsAddingNew(false); }}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* FORM RENDER VARY BY ACTIVE TAB FOR MODULAR CONFIGS */}
                  <div className="space-y-4 text-xs sm:text-sm">
                    {/* 1. Prompt template form */}
                    {activeTab === "prompts" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ชื่อระบบ Template:</label>
                          <input 
                            type="text" 
                            value={editingItem.name} 
                            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ประเภทการจัดกลุ่ม:</label>
                          <select 
                            value={editingItem.category} 
                            onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          >
                            <option value="chat">Chat Dashboard</option>
                            <option value="vision">Vision Scan</option>
                            <option value="recommendation">Car Recommendation</option>
                            <option value="onboarding">Dealer Onboarding Guide</option>
                            <option value="post-generation">Social Text Generator</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">เนื้อหา Prompt Instruction หลัก:</label>
                          <textarea 
                            rows={8}
                            value={editingItem.template} 
                            onChange={e => setEditingItem({ ...editingItem, template: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs leading-normal"
                          />
                        </div>
                      </div>
                    )}

                    {/* 2. Personalities Preset form */}
                    {activeTab === "personalities" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-bold block uppercase">ชื่อบุคลิก:</label>
                            <input 
                              type="text" 
                              value={editingItem.name} 
                              onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-bold block uppercase">ชื่อสากลรหัสEn:</label>
                            <input 
                              type="text" 
                              value={editingItem.displayNameEn} 
                              onChange={e => setEditingItem({ ...editingItem, displayNameEn: e.target.value })}
                              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase font-mono">Avatar Seed (Dicebear bottts):</label>
                          <input 
                            type="text" 
                            value={editingItem.avatarSeed} 
                            onChange={e => setEditingItem({ ...editingItem, avatarSeed: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">คำอธิบายภาพลักษณ์สั้นๆ:</label>
                          <input 
                            type="text" 
                            value={editingItem.description} 
                            onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">บุคลิกลักษณะสำนวนการเขียน (Tone Description):</label>
                          <input 
                            type="text" 
                            value={editingItem.toneDescription} 
                            onChange={e => setEditingItem({ ...editingItem, toneDescription: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ระบบคำสั่งเฉพาะพฤติกรรม (Custom System Instruction):</label>
                          <textarea 
                            rows={3}
                            value={editingItem.customSystemInstruction} 
                            onChange={e => setEditingItem({ ...editingItem, customSystemInstruction: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-sans text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-bold block uppercase font-mono">Model Temperature (0.1 - 1.0):</label>
                            <input 
                              type="number" 
                              step="0.05"
                              min="0.1"
                              max="1.0"
                              value={editingItem.temperature} 
                              onChange={e => setEditingItem({ ...editingItem, temperature: parseFloat(e.target.value) || 0.7 })}
                              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-bold block uppercase">ระดับ FORMALITY (ความสุภาพ) [1-5]:</label>
                            <input 
                              type="number" 
                              min="1"
                              max="5"
                              value={editingItem.defaultEmotionScores?.formality || 3} 
                              onChange={e => setEditingItem({ 
                                ...editingItem, 
                                defaultEmotionScores: {
                                  ...(editingItem.defaultEmotionScores || { energy: 3, humor: 3, warmth: 3, formality: 3 }),
                                  formality: parseInt(e.target.value) || 3
                                }
                              })}
                              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                            />
                          </div>
                        </div>

                        {/* Signature phrases comma split text */}
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ประโยคบังคับสอดแทรกประจำตัว (แบ่งเครื่องหมายจุลภาค ,):</label>
                          <textarea 
                            rows={2}
                            value={editingItem.signaturePhrases?.join("\n")} 
                            onChange={e => setEditingItem({ 
                              ...editingItem, 
                              signaturePhrases: e.target.value.split("\n").filter(line => line.trim()) 
                            })}
                            placeholder="ใส่ประโยคละบรรทัดครับ"
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* 3. Mood Engine Config Form */}
                    {activeTab === "moods" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ชื่อชุดจูนกระแสอารมณ์:</label>
                          <input 
                            type="text" 
                            value={editingItem.name} 
                            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">สภาพอารมณ์เป้าหมาย:</label>
                          <select 
                            value={editingItem.sentiment} 
                            onChange={e => setEditingItem({ ...editingItem, sentiment: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white animate-none"
                          >
                            <option value="happy">ร่าเริง / แฮปปี้</option>
                            <option value="neutral">ปกติ / สุขุมกลางๆ</option>
                            <option value="skeptical">เคลือบแคลงสงสัย / ละเอียด</option>
                            <option value="frustrated">โมโหเสียใจ / ประนีประนอมรับฟัง</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ลักษณะคำสั่งจูนเมื่อมีอารมณ์:</label>
                          <textarea 
                            rows={3}
                            value={editingItem.modifierText} 
                            onChange={e => setEditingItem({ ...editingItem, modifierText: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-sans text-xs"
                          />
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 font-bold block">ENERGY DELTA:</label>
                            <input 
                              type="number" min="-2" max="2"
                              value={editingItem.energyBonus} 
                              onChange={e => setEditingItem({ ...editingItem, energyBonus: parseInt(e.target.value) || 0 })}
                              className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 font-bold block">HUMOR DELTA:</label>
                            <input 
                              type="number" min="-2" max="2"
                              value={editingItem.humorBonus} 
                              onChange={e => setEditingItem({ ...editingItem, humorBonus: parseInt(e.target.value) || 0 })}
                              className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 font-bold block">WARMTH DELTA:</label>
                            <input 
                              type="number" min="-2" max="2"
                              value={editingItem.warmthBonus} 
                              onChange={e => setEditingItem({ ...editingItem, warmthBonus: parseInt(e.target.value) || 0 })}
                              className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 font-bold block">FORMALITY DELTA:</label>
                            <input 
                              type="number" min="-2" max="2"
                              value={editingItem.formalityBonus} 
                              onChange={e => setEditingItem({ ...editingItem, formalityBonus: parseInt(e.target.value) || 0 })}
                              className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 4. AI Skills Form */}
                    {activeTab === "skills" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ชื่อทักษะโมดูล:</label>
                          <input 
                            type="text" 
                            value={editingItem.name} 
                            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">คำอธิบายงาน:</label>
                          <input 
                            type="text" 
                            value={editingItem.description} 
                            onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ฟังก์ชันฉีดกระแสชุดคำสั่ง (Prompt Extension):</label>
                          <textarea 
                            rows={3}
                            value={editingItem.promptExtension} 
                            onChange={e => setEditingItem({ ...editingItem, promptExtension: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {/* 5. Logical AI Workflows Form */}
                    {activeTab === "workflows" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ชื่อลำดับ Workflow:</label>
                          <input 
                            type="text" 
                            value={editingItem.name} 
                            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase font-sans">คลังกลุ่มหมวดหมู่เป้าประสงค์:</label>
                          <select 
                            value={editingItem.category} 
                            onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          >
                            <option value="sales">ปิดยอดซื้อขาย (Sales Steering Process)</option>
                            <option value="support">ตั๋ววิเคราะห์ช่วยเหลือ (Support Resolve Process)</option>
                            <option value="onboarding">ต้อนรับตรวจสิทธิ์ (Onboarding Verification)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">วิสัยทัศน์วัตถุประสงค์โดยรวม:</label>
                          <input 
                            type="text" 
                            value={editingItem.description} 
                            onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>
                        <div className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01] space-y-2">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-extrabold block">ขั้นตอนลำดับ Routing (3 สเต็ปแนะนำ):</span>
                          {(editingItem.steps || []).map((step: any, sIdx: number) => (
                            <div key={step.id || sIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 mb-2 border-b border-white/[0.03]">
                              <input 
                                type="text" 
                                placeholder="ป้ายสเต็ป"
                                value={step.label} 
                                onChange={e => {
                                  const cSteps = [...editingItem.steps];
                                  cSteps[sIdx] = { ...step, label: e.target.value };
                                  setEditingItem({ ...editingItem, steps: cSteps });
                                }}
                                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-white text-xs font-bold"
                              />
                              <input 
                                type="text" 
                                placeholder="คำสั่งกำกับการเดินทางก้าวนี้"
                                value={step.instruction} 
                                onChange={e => {
                                  const cSteps = [...editingItem.steps];
                                  cSteps[sIdx] = { ...step, instruction: e.target.value };
                                  setEditingItem({ ...editingItem, steps: cSteps });
                                }}
                                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-white text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 6. Phrase collections form */}
                    {activeTab === "phrases" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase text-left">ข้อความประโยคซิกเนเจอร์ (Example Phrase):</label>
                          <input 
                            type="text" 
                            value={editingItem.text} 
                            onChange={e => setEditingItem({ ...editingItem, text: e.target.value })}
                            placeholder='เช่น "รถคันนี้มีคนทักแน่ครับ 🔥"'
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-medium text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">จัดสัดส่วนกลุ่มแนวคิด:</label>
                          <select 
                            value={editingItem.category} 
                            onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-sans text-xs"
                          >
                            <option value="sales_hook">Sales Hook / ปลุกระ้าเร่งเร้าใจ</option>
                            <option value="emoji_hype">Emoji Hype / ปล่อยมุกกระฉับกระเฉง</option>
                            <option value="closing_pitch">Closing Pitch / ปิดดีลยื่นจองนัดแชท</option>
                            <option value="empathy_boost">Empathy Boost / อบอุ่นดูแลห่วงใยครอบครัว</option>
                            <option value="guarantee">Guarantee / ข้อรับรองกิตติศัพท์ตรวจสิทธิ์</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* 7. Steer Safety and blacklist rule form */}
                    {activeTab === "rules" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">ชื่อระเบียบประกาศ:</label>
                          <input 
                            type="text" 
                            value={editingItem.name} 
                            onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">กลุ่มระเบียบวิธีคัดกรอง:</label>
                          <select 
                            value={editingItem.type} 
                            onChange={e => setEditingItem({ ...editingItem, type: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          >
                            <option value="safety">Safety Rule / เนื้อหาศีลธรรมสุภาพ</option>
                            <option value="context_guard">Context Guard / แนะนำพรรคพวกเฉพาะทาง</option>
                            <option value="competitor_blacklist">Competitor Blacklist / ปิดกั้นเอ่ยชื่อแพลตฟอร์มพาร์ทเนอร์อื่น</option>
                            <option value="sales_direction">Sales Direction Steer / จูงแนวคิดคลายกังวลแบต EV</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">คีย์เวิร์ดตรวจจับ (แบ่งด้วยเครื่องหมาย ,):</label>
                          <input 
                            type="text" 
                            value={editingItem.pattern} 
                            onChange={e => setEditingItem({ ...editingItem, pattern: e.target.value })}
                            placeholder="MocCar, OneTwoCar"
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">กระทำการเมื่อสแกนเจอ (AI Action Mode):</label>
                          <select 
                            value={editingItem.action} 
                            onChange={e => setEditingItem({ ...editingItem, action: e.target.value })}
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                          >
                            <option value="block">BLOCK / ตีกลับสั่งระงับไม่ปล่อยแชทออก</option>
                            <option value="rewrite">REWRITE / แปลงสวมภาษาชื่อสุภาพกลางทดแทน</option>
                            <option value="steer">STEER / จูงใจไปเน้นจุดเด่นรับประกันประกันแบตเตอรี่แทน</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-bold block uppercase">คำอธิบายทดแทน / ทิศนำจูงใจ (Steer Replacement Description):</label>
                          <textarea 
                            rows={2}
                            value={editingItem.replacement || ""} 
                            onChange={e => setEditingItem({ ...editingItem, replacement: e.target.value })}
                            placeholder="ใส่ใจคำป้อนจูงใจสวมสถิติหรือทดแทนคีย์เวิร์ดคู่แข่งครับ"
                            className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FORM ACTIONS */}
                  <div className="flex justify-end gap-2 border-t border-white/[0.05] pt-3">
                    <button
                      type="button"
                      onClick={() => { setEditingItem(null); setIsAddingNew(false); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-white/5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        // Dynamically route triggers
                        try {
                          if (activeTab === "prompts") {
                            await savePrompt(editingItem);
                          } else if (activeTab === "personalities") {
                            await savePersonality({ ...editingItem, isCustom: true });
                          } else if (activeTab === "moods") {
                            await saveMood(editingItem);
                          } else if (activeTab === "skills") {
                            await saveSkill(editingItem);
                          } else if (activeTab === "workflows") {
                            await saveWorkflow(editingItem);
                          } else if (activeTab === "phrases") {
                            await savePhrase({
                              ...editingItem,
                              creatorAdmin: "Admin",
                              usageCount: editingItem.usageCount || 0,
                              lastUpdated: new Date().toISOString()
                            });
                          } else if (activeTab === "rules") {
                            await saveRule(editingItem);
                          }
                          setEditingItem(null);
                          setIsAddingNew(false);
                        } catch (err) {
                          console.error("Save state action error:", err);
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95 shadow-lg shadow-orange-500/10 transition flex items-center gap-1.5"
                    >
                      {saving && <div className="w-3.5 h-3.5 rounded-full border border-t-white animate-spin"></div>}
                      <Save className="w-3.5 h-3.5" />
                      บันทึกโครงข่ายประสาท
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

    </section>
  );
}
