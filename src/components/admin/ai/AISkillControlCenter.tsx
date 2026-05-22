import React, { useState } from "react";
import { useAISkills } from "../../../hooks/ai-skills/useAISkills";
import { AISkill, SkillCategory, SkillActivationRule } from "../../../types/ai-skills";
import { 
  Cpu, Sparkles, Plus, Trash2, Edit3, Save, X, Check, Zap, Play, 
  RotateCcw, Sliders, Settings, MessageSquare, Terminal, Eye, AlertCircle,
  Clock, ShieldAlert, Award, FileText, ChevronDown, ChevronUp, CheckSquare, ListFilter, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function AISkillControlCenter() {
  const {
    skills,
    configs,
    logs,
    loading,
    saving,
    error,
    saveSkill,
    deleteSkill,
    resetToDefaults,
    saveConfig,
    evaluateSkills
  } = useAISkills();

  // Navigation tabs inside Skill Control Center
  const [skillTab, setSkillTab] = useState<"skills" | "sandbox" | "logs">("skills");

  // Filtering skills
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Selection states
  const [editingSkill, setEditingSkill] = useState<AISkill | null>(null);
  const [configuringSkill, setConfiguringSkill] = useState<AISkill | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Playground simulation states
  const [simInput, setSimInput] = useState<string>("อยากจองรถ EV หรูสภาพดี คันนี้ผ่อนเดือนละเท่าไหร่ และช่วยเขียนแคปชั่นเฟสบุ๊กด่วนๆ คิกคัก");
  const [simContext, setSimContext] = useState({
    userRole: "client",
    sentiment: "happy",
    car: {
      brand: "BMW",
      model: "iX3 M Sport",
      price: "2490000",
      carType: "EV"
    }
  });
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Edit / Creation states for Skills
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<SkillCategory>("content_creation");
  const [formDescription, setFormDescription] = useState("");
  const [formSystemInstruction, setFormSystemInstruction] = useState("");
  const [formPriority, setFormPriority] = useState<number>(50);
  const [formIsEnabled, setFormIsEnabled] = useState<boolean>(true);
  const [formRules, setFormRules] = useState<SkillActivationRule[]>([]);
  const [formChainOutput, setFormChainOutput] = useState<boolean>(true);
  const [formDependencies, setFormDependencies] = useState<string[]>([]);
  const [formConfigJson, setFormConfigJson] = useState("{}");
  const [formIcon, setFormIcon] = useState("Cpu");

  // Config parameters overrides
  const [configPriorityAdjustment, setConfigPriorityAdjustment] = useState<number>(0);
  const [configPromptOverride, setConfigPromptOverride] = useState<string>("");
  const [configJsonEdit, setConfigJsonEdit] = useState<string>("{}");

  const categoryColors: Record<SkillCategory, { text: string; bg: string; border: string }> = {
    marketing: { text: "text-amber-400", bg: "bg-amber-400/15", border: "border-amber-400/20" },
    content_creation: { text: "text-pink-400", bg: "bg-pink-400/15", border: "border-pink-400/20" },
    sales_enablement: { text: "text-emerald-400", bg: "bg-emerald-400/15", border: "border-emerald-400/20" },
    automotive_analytics: { text: "text-purple-400", bg: "bg-purple-400/15", border: "border-purple-400/20" },
    personalization: { text: "text-blue-400", bg: "bg-blue-400/15", border: "border-blue-400/20" },
    finance_insurance: { text: "text-teal-400", bg: "bg-teal-400/15", border: "border-teal-400/20" },
    industry_expert: { text: "text-rose-400", bg: "bg-rose-400/15", border: "border-rose-400/20" },
    orchestration: { text: "text-indigo-400", bg: "bg-indigo-400/15", border: "border-indigo-400/20" }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "Sparkles": return <Sparkles className="w-4 h-4" />;
      case "Award": return <Award className="w-4 h-4" />;
      case "Zap": return <Zap className="w-4 h-4" />;
      case "Compass": return <Sliders className="w-4 h-4" />;
      case "Heart": return <Sliders className="w-4 h-4" />;
      default: return <Cpu className="w-4 h-4" />;
    }
  };

  const handleEditSkill = (skill: AISkill) => {
    setEditingSkill(skill);
    setIsCreatingNew(false);
    setFormName(skill.name);
    setFormCategory(skill.category);
    setFormDescription(skill.description);
    setFormSystemInstruction(skill.systemInstruction);
    setFormPriority(skill.priority);
    setFormIsEnabled(skill.isEnabled);
    setFormRules(skill.activationRules || []);
    setFormChainOutput(skill.chainOutput);
    setFormDependencies(skill.dependencies || []);
    setFormConfigJson(JSON.stringify(skill.config || {}, null, 2));
    setFormIcon(skill.icon || "Cpu");
  };

  const handleInitializeNew = () => {
    setIsCreatingNew(true);
    setEditingSkill(null);
    setFormName("");
    setFormCategory("content_creation");
    setFormDescription("");
    setFormSystemInstruction("");
    setFormPriority(50);
    setFormIsEnabled(true);
    setFormRules([{ type: "keyword", value: "คำดึงดูด" }]);
    setFormChainOutput(true);
    setFormDependencies([]);
    setFormConfigJson("{}");
    setFormIcon("Cpu");
  };

  const handleConfigureSkill = (skill: AISkill) => {
    const existingConfig = configs.find(c => c.skillId === skill.id);
    setConfiguringSkill(skill);
    setConfigPriorityAdjustment(existingConfig?.priorityAdjustment || 0);
    setConfigPromptOverride(existingConfig?.customPromptOverride || "");
    setConfigJsonEdit(JSON.stringify(existingConfig?.customParameters || skill.config || {}, null, 2));
  };

  const handleSaveSkillForm = async () => {
    let parsedConfig = {};
    try {
      if (formConfigJson.trim()) {
        parsedConfig = JSON.parse(formConfigJson);
      }
    } catch (e) {
      alert("กรุณาใส่รูปแบบ JSON ในเซกชันการตั้งค่าให้ถูกต้อง");
      return;
    }

    const payload: AISkill = {
      id: isCreatingNew ? "skill-" + Math.random().toString(36).substring(2, 8) : editingSkill!.id,
      name: formName,
      category: formCategory,
      description: formDescription,
      systemInstruction: formSystemInstruction,
      priority: formPriority,
      isEnabled: formIsEnabled,
      activationRules: formRules,
      conditions: editingSkill?.conditions || {},
      dependencies: formDependencies,
      chainOutput: formChainOutput,
      config: parsedConfig,
      lastUpdated: new Date().toISOString(),
      icon: formIcon
    };

    await saveSkill(payload);
    setEditingSkill(null);
    setIsCreatingNew(false);
  };

  const handleSaveConfigForm = async () => {
    let parsedParams = {};
    try {
      if (configJsonEdit.trim()) {
        parsedParams = JSON.parse(configJsonEdit);
      }
    } catch (e) {
      alert("พารามิเตอร์ JSON ไม่ถูกต้อง");
      return;
    }

    await saveConfig({
      skillId: configuringSkill!.id,
      isActive: true,
      customParameters: parsedParams,
      customPromptOverride: configPromptOverride.trim() ? configPromptOverride : undefined,
      priorityAdjustment: configPriorityAdjustment,
      lastUpdated: new Date().toISOString()
    });

    setConfiguringSkill(null);
  };

  const handleRunSimulation = async () => {
    setEvaluating(true);
    try {
      const res = await evaluateSkills(simInput, simContext);
      setEvaluationResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleAddRule = () => {
    setFormRules([...formRules, { type: "keyword", value: "" }]);
  };

  const handleRemoveRule = (index: number) => {
    setFormRules(formRules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, key: keyof SkillActivationRule, val: any) => {
    const updated = [...formRules];
    updated[index] = { ...updated[index], [key]: val };
    setFormRules(updated);
  };

  const handleToggleDependency = (depId: string) => {
    if (formDependencies.includes(depId)) {
      setFormDependencies(formDependencies.filter(id => id !== depId));
    } else {
      setFormDependencies([...formDependencies, depId]);
    }
  };

  const filteredSkills = skills.filter(
    s => categoryFilter === "all" || s.category === categoryFilter
  );

  return (
    <div className="bg-[#0b0c10] border border-white/[0.05] rounded-3xl p-6 text-left space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black tracking-widest uppercase">
              Neuro-Dynamic Skill Core
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            ระบบขยายทักษะสมองกลอัจฉริยะ (Dynamic AI Skills Framework)
          </h2>
          <p className="text-xs text-slate-400">
            ควบคุม แยกร่างและผสานทักษะของน้องเอ (Nong A) เช่น เขียนแคปชั่น, วิเคราะห์ราคา, โค้ดขาย และกระแส Storytelling แบบตอบสนองฉับพลันทันที
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => handleInitializeNew()}
            className="p-2 px-4 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition shadow-lg shadow-purple-500/10"
          >
            <Plus className="w-3.5 h-3.5" />
            สร้างทักษะใหม่
          </button>
          <button
            onClick={resetToDefaults}
            className="p-2 px-3.5 rounded-xl text-xs font-bold border border-white/[0.08] hover:bg-white/[0.04] text-slate-400 flex items-center gap-1.5 transition"
            title="คืนค่าคอนฟิกทักษะทั้งหมดเป็นโครงสร้างพื้นฐานเดิม"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ตั้งต้นฐานข้อมูลใหม่
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs inside Skill System */}
      <div className="flex border-b border-white/[0.03] p-1 bg-white/[0.02] rounded-xl max-w-md">
        <button
          onClick={() => setSkillTab("skills")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition text-center ${
            skillTab === "skills" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          คลังเก็บทักษะ ({skills.length})
        </button>
        <button
          onClick={() => setSkillTab("sandbox")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition text-center ${
            skillTab === "sandbox" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          แซนด์บ็อกซ์ทดสอบเปิดทักษะ 🧪
        </button>
        <button
          onClick={() => setSkillTab("logs")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition text-center ${
            skillTab === "logs" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          ประวัติการวิเคราะห์ ({logs.length})
        </button>
      </div>

      {/* RENDER ACTIVE TAB CORES */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-purple-500 border-r-purple-500/20 animate-spin"></div>
            <p className="text-xs text-slate-400">กำลังเชื่อมต่อฐานวงจรความคิดของ Nong A ดึ๋งๆ...</p>
          </div>
        ) : (
          <motion.div
            key={skillTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* TAB 1: SKILLS INVENTORY LIST */}
            {skillTab === "skills" && (
              <div className="space-y-4">
                {/* Categories filtering bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                    <ListFilter className="w-3.5 h-3.5 text-purple-400" />
                    หมวดหมู่ทักษะ:
                  </span>
                  {[
                    { val: "all", label: "ทั้งหมด 📋" },
                    { val: "content_creation", label: "เขียนคำและคอนเทนต์ ✍️" },
                    { val: "marketing", label: "โฆษณาและการตลาด 🚀" },
                    { val: "sales_enablement", label: "ปิดการขายเชิงรุก 💰" },
                    { val: "automotive_analytics", label: "วิเคราะห์รถยนต์เชิงลึก 🚗" },
                    { val: "finance_insurance", label: "การเงินและดอกเบี้ย 💵" },
                    { val: "personalization", label: "วิเคราะห์ระดับภาษา 🤝" },
                    { val: "orchestration", label: "มัลติเอเจนต์ 🧠" }
                  ].map(cat => (
                    <button
                      key={cat.val}
                      onClick={() => setCategoryFilter(cat.val)}
                      className={`p-1.5 px-3 rounded-lg text-[11px] font-bold transition border ${
                        categoryFilter === cat.val
                          ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-500/10"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Grid list of skills */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSkills.length === 0 ? (
                    <div className="col-span-full p-8 text-center rounded-2xl border border-dashed border-white/[0.05] bg-white/[0.01]">
                      <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-bold">ไม่พบคอนฟิกทักษะในหมวดนี้</p>
                      <button 
                        onClick={() => handleInitializeNew()}
                        className="mt-2 text-xs text-purple-400 underline font-semibold hover:text-purple-300"
                      >
                        เพิ่มทักษะแรกในหมวดหมู่นี้
                      </button>
                    </div>
                  ) : (
                    filteredSkills.map(s => {
                      const colStyle = categoryColors[s.category] || { text: "text-slate-400", bg: "bg-slate-800/20", border: "border-slate-800" };
                      const configOverride = configs.find(c => c.skillId === s.id);
                      const finalPriority = Math.max(1, Math.min(100, s.priority + (configOverride?.priorityAdjustment || 0)));

                      return (
                        <div
                          key={s.id}
                          className={`rounded-2xl border p-4 bg-gradient-to-br from-slate-950/60 to-slate-950/20 flex flex-col justify-between gap-4 transition-all hover:border-purple-500/30 group ${
                            s.isEnabled ? "border-white/[0.05]" : "border-red-500/10 opacity-70"
                          }`}
                        >
                          <div className="space-y-3 font-sans">
                            {/* Header row: category and enable toggle */}
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${colStyle.bg} ${colStyle.text} ${colStyle.border}`}>
                                {s.category.toUpperCase().replace("_", " ")}
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    const updated = { ...s, isEnabled: !s.isEnabled };
                                    await saveSkill(updated);
                                  }}
                                  className={`p-1 px-2.5 rounded-full text-[9px] font-black tracking-wider transition uppercase ${
                                    s.isEnabled 
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" 
                                      : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                                  }`}
                                >
                                  {s.isEnabled ? "Active ✓" : "Inactive ❌"}
                                </button>
                              </div>
                            </div>

                            {/* Title and Description */}
                            <div className="text-left space-y-1">
                              <h4 className="text-sm font-black text-white flex items-center gap-1.5 group-hover:text-purple-400 transition">
                                <span className="p-1 rounded bg-white/[0.04]">
                                  {getIconComponent(s.icon || "Cpu")}
                                </span>
                                {s.name}
                              </h4>
                              <p className="text-[11.5px] text-slate-400 leading-relaxed font-semibold">
                                {s.description}
                              </p>
                            </div>

                            {/* Display Triggers & Rule summaries */}
                            <div className="space-y-1.5 pt-1">
                              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">เงื่อนไขเรียกความทรงจำ:</p>
                              <div className="flex flex-wrap gap-1">
                                {s.activationRules.map((rule, rIdx) => (
                                  <span 
                                    key={rIdx}
                                    className="p-1 px-2 text-[10px] rounded bg-white/[0.03] border border-white/[0.04] text-slate-300 font-mono"
                                  >
                                    ⚡ {rule.type === "keyword" ? `คำค้นหา: "${rule.value}"` : `${rule.type} (${rule.field || ""}) = ${rule.value}`}
                                  </span>
                                ))}
                                {s.activationRules.length === 0 && (
                                  <span className="p-1 px-2 text-[10px] rounded bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 font-mono">
                                    ⚠️ เรียกใช้ด้วยกำลังมือเท่านั้น
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Dynamic priority visual bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="text-slate-500 font-extrabold">ความสำคัญ (Priority):</span>
                                <span className="text-purple-400 font-black">
                                  {finalPriority} / 100 
                                  {configOverride?.priorityAdjustment ? ` (${configOverride.priorityAdjustment > 0 ? "+" : ""}${configOverride.priorityAdjustment})` : ""}
                                </span>
                              </div>
                              <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                                  style={{ width: `${Math.min(100, finalPriority)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Dependencies tag */}
                            {s.dependencies && s.dependencies.length > 0 && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                <span className="text-pink-400 font-bold">Chained with: </span>
                                {s.dependencies.join(", ")}
                              </div>
                            )}

                            {/* Custom Overrides alert badge */}
                            {configOverride && (
                              <div className="p-1.5 px-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 flex items-center gap-1 font-semibold">
                                <Sliders className="w-3 h-3 text-indigo-400" />
                                มีการกำหนดโอเวอร์ไรด์พารามิเตอร์จำลองเฉพาะที่แอดมินแก้ไข
                              </div>
                            )}
                          </div>

                          {/* Action footer */}
                          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.03]">
                            <button
                              onClick={() => handleEditSkill(s)}
                              className="flex-1 py-1.5 text-xs text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] rounded-xl font-bold flex items-center justify-center gap-1 border border-white/[0.03]"
                            >
                              <Edit3 className="w-3 h-3" />
                              ปรับสคริปต์สแกน
                            </button>
                            <button
                              onClick={() => handleConfigureSkill(s)}
                              className="py-1.5 px-3 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-xl font-bold flex items-center justify-center gap-1.5 border border-indigo-500/10"
                              title="ปรับแต่งโมบิลพารามิเตอร์แบบไม่ต้องแก้มือ"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              จูนเนอร์
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`คุณต้องการลบทักษะ "${s.name}" หรือไม่?`)) {
                                  await deleteSkill(s.id);
                                }
                              }}
                              className="p-1.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ACTIVE SKILL RE-EVALUATION SANDBOX */}
            {skillTab === "sandbox" && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/20 to-slate-950 border border-white/[0.04]">
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    ห้องจำลองปฏิกิริยาของระบบประสาท Nong A AI 🛸
                  </h3>
                  <p className="text-[11.5px] text-slate-400">
                    ทดลองอัดข้อความประหนึ่งลูกค้ากำลังทักหาจองรถ เพื่อวิเคราะห์ในระดับนาโนเสี้ยววิว่า มีทักษะ (AI Skills) จุดไหนถูกกระตุ้นตามระบบ และส่งต่อคลังเงื่อนไขเป็นลูกระนาดอย่างไรบ้าง
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Interactive variables setup values */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-extrabold block">1. กล่องข้อความแชททรานแซกชั่น (Input Customer Message):</label>
                      <textarea
                        value={simInput}
                        onChange={e => setSimInput(e.target.value)}
                        rows={3}
                        className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-white/[0.06] text-slate-200 focus:outline-none focus:border-purple-500"
                        placeholder="กรอกข้อความเพื่อตรวจสอบ..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 text-left">
                        <label className="text-xs text-slate-400 font-extrabold block">2. สภาวะผู้ถาม (User Role Context):</label>
                        <select
                          value={simContext.userRole}
                          onChange={e => setSimContext({ ...simContext, userRole: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-slate-300"
                        >
                          <option value="client">Client (คนต้องการซื้อทั่วไป) 👤</option>
                          <option value="dealer">Dealer (แอดมินเต็นท์/นักขาย) 🏬</option>
                          <option value="admin">Administrator (เจ้าหน้าที่ระบบ) 👑</option>
                        </select>
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-xs text-slate-400 font-extrabold block">3. สภาวะอารมณ์ที่จับได้ (Sentiment):</label>
                        <select
                          value={simContext.sentiment}
                          onChange={e => setSimContext({ ...simContext, sentiment: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-slate-300"
                        >
                          <option value="neutral">Neutral (ปกติสุขทั่วไป) 😐</option>
                          <option value="happy">Happy/Hyped (ตื่นเต้น อยากซื้อพรั่งพรู) 😄</option>
                          <option value="skeptical">Skeptical (ระแวง กังวลสเปกร่วมมือ) 🤔</option>
                          <option value="frustrated">Frustrated (เร่งรีบ ร้อนใจมีดราม่า) 😫</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-white/[0.04] bg-slate-950 space-y-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ข้อมูลรายละเอียดรถยนต์สมมุติตามบริบทหน้าเว็บ:</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="space-y-1">
                          <span className="text-slate-500">รุ่นรถ / Brand:</span>
                          <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-white/5 p-1 px-2 rounded"
                            value={simContext.car.model}
                            onChange={e => setSimContext({
                              ...simContext,
                              car: { ...simContext.car, model: e.target.value }
                            })}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500">ประเภทคาร์บลูทูธ (carType):</span>
                          <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-white/5 p-1 px-2 rounded"
                            value={simContext.car.carType}
                            onChange={e => setSimContext({
                              ...simContext,
                              car: { ...simContext.car, carType: e.target.value }
                            })}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500">ราคาเสนอขายจริง (Price THB):</span>
                          <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-white/5 p-1 px-2 rounded text-emerald-400 font-mono"
                            value={simContext.car.price}
                            onChange={e => setSimContext({
                              ...simContext,
                              car: { ...simContext.car, price: e.target.value }
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleRunSimulation}
                      disabled={evaluating}
                      className="w-full p-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10"
                    >
                      {evaluating ? (
                        <>
                          <div className="w-4 h-4 rounded-full border border-t-white animate-spin"></div>
                          <span>กำลังจำลองเส้นทางการไหลผ่านของประสาทวิทยา...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>กระตุ้นประสาทเพื่อประเมินผลเชิงลึก (Simulate Neural Trigger)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sandbox analysis visual result columns */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/[0.05] flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-purple-400" />
                          วิเคราะห์ผลลัพธ์แบบเรียลไทม์ (Simulation Output Console)
                        </span>
                        <span className="p-0.5 px-2 text-[9px] rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                          LOG-ACTIVE
                        </span>
                      </div>

                      {evaluationResult ? (
                        <div className="space-y-4 text-left">
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ทักษะวิเศษที่ถูกสะกิด (Triggered & Resolved Skills):</span>
                            
                            <div className="flex flex-col gap-1.5">
                              {evaluationResult.matchedSkills.length === 0 ? (
                                <span className="text-slate-500 text-xs italic">
                                  ไม่มีโมดูลทักษะใดถูกกระโดดจับคีย์เวิร์ดในข้อความนี้ (Nong A จะตอบตามปกติระดับ Core LLM)
                                </span>
                              ) : (
                                evaluationResult.matchedSkills.map((s: AISkill) => {
                                  const score = evaluationResult.finalPriorityScores[s.id] || s.priority;
                                  return (
                                    <div 
                                      key={s.id}
                                      className="flex items-center justify-between p-2 rounded bg-purple-500/5 border border-purple-500/10 text-xs"
                                    >
                                      <div className="flex items-center gap-1.5 font-bold text-white">
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>{s.name}</span>
                                      </div>
                                      <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-white/5 text-purple-400 font-mono">
                                        Priority: {score}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">ชุดข้อความสคริปต์สวมทับ (Injected System Prompt Matrix):</span>
                            <div className="p-3 rounded-lg bg-[#050508] border border-white/5 text-[10.5px] font-mono text-purple-300 overflow-y-auto max-h-[220px] whitespace-pre-wrap leading-relaxed select-text">
                              {evaluationResult.chainedPrompt || "No prompt injected"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-600 space-y-2 h-full">
                          <HelpCircle className="w-10 h-10 text-slate-800" />
                          <p className="text-xs text-slate-400 font-bold">รอการกดปุ่มกระตุ้นด้านซ้าย</p>
                          <p className="text-[10px] text-slate-500 text-center max-w-xs">เราจะป้อนบริบททั้งหมดคำนวณความสอดคล้องตามลำดับความสำคัญ (Chaining system priority)</p>
                        </div>
                      )}
                    </div>

                    {evaluationResult && (
                      <div className="mt-4 pt-4 border-t border-white/[0.04] text-[10px] text-slate-500 flex items-center justify-between">
                        <span>สถิติการทริกเกอร์: {evaluationResult.matchedSkills.length} สกิล</span>
                        <span className="text-indigo-400">ประสาทวิทยาซิงโครไนซ์เรียบร้อย ดีลแลนด์ประเสริฐยิ่ง</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: NEURAL ACTIVATION HISTORY LOGS */}
            {skillTab === "logs" && (
              <div className="space-y-4 text-left">
                <div className="p-4 rounded-xl border border-white/5 bg-slate-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-white">บันทึกสัมปชัญญะ (Nong A Conscious Trigger Log)</h4>
                      <p className="text-[10.5px] text-slate-500">แสดงรายการวิเคราะห์ย้อนหลังล่าสุดที่แอดมินหรือลูกค้าพิมพ์มาทักทาย</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">หมุนเวียนโควต้าเก็บ 50 ครั้ง</span>
                </div>

                <div className="space-y-3.5">
                  {logs.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border border-dashed border-white/[0.05] bg-white/[0.01] text-slate-500 text-xs">
                      ยังไม่มีประวัติการส่งวิเคราะห์ทักษะพิเศษในเซสชันนี้
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div 
                        key={log.id}
                        className="p-4 rounded-xl border border-white/[0.04] bg-slate-950/40 relative overflow-hidden flex flex-col md:flex-row md:items-start justify-between gap-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="p-0.5 px-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-mono rounded">
                              {log.id}
                            </span>
                            <span className="text-[10.5px] text-slate-400">
                              {new Date(log.timestamp).toLocaleString("th-TH")}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-300">
                              ChatID: {log.chatId}
                            </span>
                          </div>

                          <div className="text-xs">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">ลูกค้าป้อนข้อความ:</span>
                            <p className="text-slate-200 mt-0.5 font-semibold">"{log.userInputSnippet}"</p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">เปิดทักษะเรียงลำดับความสำคัญ (Triggered Priority Pipeline):</span>
                            <div className="flex flex-wrap gap-1">
                              {log.skillsTriggered.map((skId) => (
                                <span 
                                  key={skId}
                                  className="p-1 px-2 text-[10px] font-bold rounded bg-purple-500/15 border border-purple-500/20 text-purple-400"
                                >
                                  ⚡ {skId}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Interactive toggle block for inspecting actual prompt */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              alert(`Injected Prompt System:\n\n${log.chainedSystemPrompt}`);
                            }}
                            className="p-1.5 px-3 rounded bg-slate-900 border border-white/5 hover:border-purple-500/20 text-[10px] font-bold text-purple-400 flex items-center gap-1 transition"
                          >
                            <Eye className="w-3 h-3" />
                            ดู Prompt ละเอียด
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG 1: ADD / EDIT SKILL BEHAVIOR */}
      <AnimatePresence>
        {(editingSkill || isCreatingNew) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-[#0c0d12] border border-purple-500/30 rounded-3xl p-6 text-slate-300 relative max-h-[90vh] overflow-y-auto space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <span className="text-xs text-purple-400 font-extrabold flex items-center gap-1 uppercase tracking-widest">
                  <Cpu className="w-4 h-4" />
                  {isCreatingNew ? "กำหนดโครงข่ายทักษะใหม่" : `แก้ไขรหัสสมอง: ${editingSkill?.id}`}
                </span>
                <button
                  onClick={() => { setEditingSkill(null); setIsCreatingNew(false); }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column left */}
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block h-auto">ชื่อทักษะโมดูลแนะทาง (Skill Name):</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-white focus:outline-none focus:border-purple-500"
                      placeholder="เช่น Luxury Tone Writing"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block h-auto">ไอคอนของกระแสดีล (Icon Identifier):</label>
                    <select
                      value={formIcon}
                      onChange={e => setFormIcon(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-slate-300"
                    >
                      <option value="Cpu">Cpu (ระบบคณิตทั่วไป) 🧠</option>
                      <option value="Sparkles">Sparkles (เร้าอารมณ์ ป้ายยา) ✨</option>
                      <option value="Award">Award (เกียรติยศ หรูหรา) 🏆</option>
                      <option value="Zap">Zap (สคริปต์สั้น หยุดนิ้ว) ⚡</option>
                      <option value="Compass">Compass (กัลยาณมิตร แผนที่) 🧭</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block h-auto">หมวดการจัดการ (Category Type):</label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value as SkillCategory)}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-slate-300"
                    >
                      <option value="content_creation">Content Creation (เนื้อหา, ติ๊กต๊อก)</option>
                      <option value="marketing">Marketing Tool (โปรโมท, แคปชัน)</option>
                      <option value="sales_enablement">Sales Enablement (ปิดการขาย, มัดจำ)</option>
                      <option value="automotive_analytics">Automotive Analytics (ตรวจสเปก, ตารางดีล)</option>
                      <option value="personalization">Personalization (การเล่าสตอรี่, ระดับภาษา)</option>
                      <option value="finance_insurance">Finance & Insurance (คำนวณผ่อน, ดอกเบี้ย)</option>
                      <option value="orchestration">Orchestration (เครื่องมือ มัลติเอเจนต์)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block h-auto">ประเมินเป้าประสงค์ (Short Description):</label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-white focus:outline-none"
                      placeholder="อธิบายย่อส่วน เช่น ระดับภาษาวิจิตรอลังการ..."
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-400">ระดับความสำคัญพื้นฐาน (Priority: 1-100):</label>
                      <span className="text-xs text-purple-400 font-mono font-bold">{formPriority}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={formPriority}
                      onChange={e => setFormPriority(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>1 (ระดับทั่วไป)</span>
                      <span>50 (ค่ากลาง)</span>
                      <span>100 (ระดับชี้สั่งขาด!)</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/[0.04] bg-slate-950 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Chaining Options:</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="formChainOutput"
                        checked={formChainOutput}
                        onChange={e => setFormChainOutput(e.target.checked)}
                        className="rounded border-white/5 bg-slate-900 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                      />
                      <label htmlFor="formChainOutput" className="text-xs text-slate-300 font-bold leading-none">
                        Chain Output (ส่งต่อผลลัพธ์พรรณนาจากประธานก่อนหน้า)
                      </label>
                    </div>

                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-slate-500 font-semibold mb-1">เลือกทักษะที่เกี่ยวข้องที่ต้องการ Chaining ควบรวมกัน:</p>
                      <div className="grid grid-cols-2 gap-1.5 max-h-[80px] overflow-y-auto">
                        {skills.filter(x => x.id !== editingSkill?.id).map(sk => (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => handleToggleDependency(sk.id)}
                            className={`p-1 px-2 rounded text-[10px] text-left truncate transition ${
                              formDependencies.includes(sk.id)
                                ? "bg-purple-600 border border-purple-500 text-white"
                                : "bg-slate-900 border border-white/5 text-slate-400"
                            }`}
                          >
                            + {sk.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column right */}
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block h-auto">คำสั่งระบบที่ถูกแทรกเฉียบพลัน (System Prompt Injected Payload):</label>
                    <textarea
                      value={formSystemInstruction}
                      onChange={e => setFormSystemInstruction(e.target.value)}
                      rows={5}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-purple-300 font-mono focus:outline-none focus:border-purple-500 leading-relaxed"
                      placeholder="[SKILL: YOUR_TITLE]&#10;แนวทางและรายละเอียดในการประกอบพฤติกรรมตอบ..."
                    />
                  </div>

                  {/* Dynamic activation rules logic list builder */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-400">เงื่อนไขการกระตุ้นเปิดทำงาน (Activation Rules):</label>
                      <button
                        type="button"
                        onClick={handleAddRule}
                        className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/25 font-bold hover:bg-purple-500/25"
                      >
                        + เพิ่มเงื่อนไข
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto bg-slate-950 p-2.5 rounded-xl border border-white/[0.04]">
                      {formRules.map((rule, idx) => (
                        <div key={idx} className="flex gap-1.5 items-center pb-2 border-b border-white/[5] last:border-0 last:pb-0">
                          <select
                            value={rule.type}
                            onChange={e => handleRuleChange(idx, "type", e.target.value)}
                            className="bg-slate-900 text-[10.5px] p-1 rounded text-slate-300 border border-white/5"
                          >
                            <option value="keyword">คีย์เวิร์ด</option>
                            <option value="sentiment">อารมณ์</option>
                            <option value="car_criteria">ราคารถยนตศาสตร์</option>
                            <option value="context_key">คอนเทกซ์แผงผัง</option>
                            <option value="always_on">เปิดตลาดไว้ตลอด (AlwaysOn)</option>
                          </select>

                          {rule.type !== "always_on" && (
                            <input
                              type="text"
                              value={rule.value}
                              onChange={e => handleRuleChange(idx, "value", e.target.value)}
                              placeholder={rule.type === "keyword" ? "เช่น EV, ชาร์จ, แพง" : "ค่าที่จะสแกน..."}
                              className="flex-1 bg-slate-900 text-[10.5px] p-1 rounded text-white border border-white/5 focus:outline-none"
                            />
                          )}

                          {rule.type === "car_criteria" && (
                            <>
                              <select
                                value={rule.field || "price"}
                                onChange={e => handleRuleChange(idx, "field", e.target.value)}
                                className="bg-slate-900 text-[10px] p-1 rounded text-slate-400"
                              >
                                <option value="price">price</option>
                                <option value="carType">carType</option>
                                <option value="brand">brand</option>
                              </select>
                              <select
                                value={rule.operator || "contains"}
                                onChange={e => handleRuleChange(idx, "operator", e.target.value)}
                                className="bg-slate-900 text-[10px] p-1 rounded text-slate-400"
                              >
                                <option value="contains">contains</option>
                                <option value="greater_than">&gt;</option>
                                <option value="less_than">&lt;</option>
                                <option value="equals">=</option>
                              </select>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveRule(idx)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {formRules.length === 0 && (
                        <p className="text-[10px] text-slate-600 text-center italic py-2">ไม่มีการกระตุ้นอัตโนมัติ จะเป็นสกิลชนิดแมนนวลจำเพาะเท่านั้น</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 block h-auto">ตั้งค่าพารามิเตอร์ขยาย (JSON Config Schema Optional):</label>
                    <textarea
                      value={formConfigJson}
                      onChange={e => setFormConfigJson(e.target.value)}
                      rows={2.5}
                      className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-emerald-400 font-mono focus:outline-none"
                      placeholder='{ "maxWords": 200 }'
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-white/[0.05] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => { setEditingSkill(null); setIsCreatingNew(false); }}
                  className="p-2 px-4 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.08] text-slate-400 transition"
                >
                  ยกเลิกการแก้ไข
                </button>
                <button
                  type="button"
                  onClick={handleSaveSkillForm}
                  disabled={saving}
                  className="p-2 px-5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1"
                >
                  {saving ? "กำลังเซฟความทรงจำ..." : "บันทึกทักษะลงสมองกล ✓"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIALOG 2: TUNER AND PARAMETERS OVERRIDE CONFIGURATION */}
      <AnimatePresence>
        {configuringSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-[#0c0d12] border border-indigo-500/30 rounded-3xl p-6 text-slate-300 relative text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <div className="flex items-center gap-1 text-xs text-indigo-400 font-black tracking-widest uppercase">
                  <Sliders className="w-4 h-4" />
                  <span>พารามิเตอร์โอเวอร์ไรด์จูนเนอร์: {configuringSkill.name}</span>
                </div>
                <button
                  onClick={() => setConfiguringSkill(null)}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  จูนเนอร์ช่วยให้คุณปรับแต้มความสำคัญหรือเขียนคำพูดสวมทับ (Prompt Overriding) สำหรับทักษะนี้โดยไม่ต้องระเบิดรหัสหลัก ช่วยแยกแยะสภาพแวดล้อมจำลองแบบไดนามิก
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-400 font-bold block h-auto">ตัวชี้ปรับแต่งบุคลิกภาพความสำคัญ (Priority Offset modifier):</label>
                    <span className="text-xs font-mono font-bold text-indigo-400">
                      {configPriorityAdjustment > 0 ? "+" : ""}{configPriorityAdjustment} คะแนน
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={configPriorityAdjustment}
                    onChange={e => setConfigPriorityAdjustment(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>ลดความสำคัญระดับสู้เต็นท์เดียว (-50)</span>
                    <span>เสมอภาคหลัก (0)</span>
                    <span>เร่งสัดส่วนให้ตอบก่อน (+50)</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold block h-auto">สคริปต์สวมทับเฉพาะแอดมิน (Custom Prompt Override):</label>
                  <textarea
                    value={configPromptOverride}
                    onChange={e => setConfigPromptOverride(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
                    placeholder="เมื่อเว้นว่างไว้ ยิงค่า System Prompt ทักษะตามปกติ..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-bold block h-auto">พารามิเตอร์ JSON คอนฟิกจำลองเฉพาะกิจ:</label>
                  <textarea
                    value={configJsonEdit}
                    onChange={e => setConfigJsonEdit(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-emerald-400 focus:outline-none font-mono"
                    placeholder="{}"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => setConfiguringSkill(null)}
                  className="p-2 px-4 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.08] text-slate-400"
                >
                  ยกเลิกโอเวอร์ไรด์
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfigForm}
                  disabled={saving}
                  className="p-2 px-5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1"
                >
                  {saving ? "กำลังเซฟค่า..." : "บันทึกและซิงค์โหนดความกังวล ✓"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default AISkillControlCenter;
