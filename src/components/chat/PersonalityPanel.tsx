import React, { useState, useEffect } from "react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { PersonalityPresetId, AIPersonality } from "../../types/ai";
import { Sparkles, Save, User, Star, Flame, Award, Heart, HelpCircle, Check, Sliders, PlayCircle } from "lucide-react";
import { getPersonalityGreeting } from "../../services/ai/moods/emotionalEngine";

export function PersonalityPanel() {
  const {
    activePresetId,
    personalities,
    setPresetId,
    updatePersonalityInstruction,
    addMessage,
    activeSessionId
  } = useChatContext();

  const [activeTab, setActiveTab] = useState<"presets" | "admin">("presets");
  
  // For admin form edits
  const [editingPreset, setEditingPreset] = useState<PersonalityPresetId>(activePresetId);
  const [name, setName] = useState("");
  const [toneDescription, setToneDescription] = useState("");
  const [customSystemInstruction, setCustomSystemInstruction] = useState("");
  const [signaturePhrasesText, setSignaturePhrasesText] = useState("");
  const [temp, setTemp] = useState(0.8);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync edit form with selected config
  useEffect(() => {
    const config = personalities[editingPreset];
    if (config) {
      setName(config.name);
      setToneDescription(config.toneDescription);
      setCustomSystemInstruction(config.customSystemInstruction);
      setSignaturePhrasesText(config.signaturePhrases.join(", "));
      setTemp(config.temperature);
    }
  }, [editingPreset, personalities]);

  const activeConfig = personalities[activePresetId] || personalities.dealer;

  const handleSelectPreset = (id: PersonalityPresetId) => {
    setPresetId(id);
    
    // Inject custom introduction greeting directly in the Active Chat as an authentic emotional action!
    if (activeSessionId) {
      const greetingText = getPersonalityGreeting(id);
      addMessage(activeSessionId, "ai", greetingText);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const phrases = signaturePhrasesText
        .split(",")
        .map(p => p.trim())
        .filter(p => p.length > 0);

      await updatePersonalityInstruction(editingPreset, {
        name,
        toneDescription,
        customSystemInstruction,
        signaturePhrases: phrases,
        temperature: Number(temp)
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update custom personality", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Icon mappings according to preset theme
  const getPresetIcon = (id: PersonalityPresetId) => {
    switch (id) {
      case "sporty":
        return <Flame className="w-4 h-4 text-rose-400" />;
      case "luxury":
        return <Award className="w-4 h-4 text-amber-300" />;
      case "family":
        return <Heart className="w-4 h-4 text-emerald-400" />;
      case "youth":
        return <Star className="w-4 h-4 text-pink-400" />;
      case "premium":
        return <Sparkles className="w-4 h-4 text-teal-300" />;
      case "dealer":
      default:
        return <User className="w-4 h-4 text-orange-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md w-full xl:w-72 space-y-3 p-4 self-start flex flex-col" id="personality-system-panel">
      {/* Dynamic Header with custom glow colors */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-orange-500 animate-spin" style={{ animationDuration: "12s" }} />
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            ระบบสลับบุคลิกภาพ Nong A
          </h3>
        </div>
      </div>

      {/* Mini Tabs */}
      <div className="grid grid-cols-2 p-0.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[10.5px] font-medium" id="personality-preset-tabs">
        <button
          onClick={() => setActiveTab("presets")}
          className={`py-1.5 rounded-md transition-all ${
            activeTab === "presets"
              ? "bg-orange-550/20 text-orange-400 border border-orange-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          1. สลับบุคลิก (User)
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`py-1.5 rounded-md transition-all ${
            activeTab === "admin"
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          2. แก้ไขบอท (Admin)
        </button>
      </div>

      {/* Tab 1: Selecting and Viewing Preset metrics */}
      {activeTab === "presets" && (
        <div className="space-y-3" id="tab-presets-view">
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            เลือกคาแรคเตอร์การคุยเพื่อดึงคำตอบสไตล์เฉพาะตัวของน้องเอ ข้อมูลความชอบคุณจะประยุกต์เข้ากับบุคลิกนี้ทันที!
          </p>

          {/* Quick choices grid */}
          <div className="grid grid-cols-2 gap-1.5" id="preset-cards-grid">
            {(Object.values(personalities) as AIPersonality[]).map((p) => {
              const active = p.id === activePresetId;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all relative flex flex-col justify-between ${
                    p.id === "sporty" ? "hover:border-rose-500/30" :
                    p.id === "luxury" ? "hover:border-amber-500/30" :
                    p.id === "family" ? "hover:border-emerald-500/30" :
                    p.id === "youth" ? "hover:border-pink-500/30" :
                    p.id === "premium" ? "hover:border-teal-500/30" : "hover:border-orange-500/30"
                  } ${
                    active
                      ? `${p.colorTheme.badgeBg} border-current ring-1 ring-orange-500/20`
                      : "bg-slate-950/20 border-slate-800 text-slate-300 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="p-1 rounded bg-slate-950/50 shadow-inner">
                      {getPresetIcon(p.id)}
                    </span>
                    {active && <Check className="w-3 h-3 text-orange-400 animate-pulse" />}
                  </div>
                  
                  <div className="mt-2.5">
                    <h4 className="text-[10.5px] font-bold truncate leading-tight">
                      {p.name.replace("น้องเอ", "").trim() || p.displayNameEn}
                    </h4>
                    <span className="text-[8.5px] text-slate-500 block capitalize tracking-widest font-mono mt-0.5">
                      {p.displayNameEn}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Core Info on Active Preset */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-2.5" id="active-personality-stats">
            <div className="flex items-center gap-1">
              <span className="text-[9.5px] font-extrabold text-orange-400 uppercase tracking-widest px-2 py-0.5 rounded bg-orange-500/10 border border-orange-550/10">
                สเตตัสอารมณ์บอทปัจจุบัน
              </span>
            </div>
            
            <p className="text-[10.5px] text-slate-300 min-h-12 leading-relaxed">
              "{activeConfig.description}"
            </p>

            {/* Slider/Stats Chart for Emotional Scores */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800/40 text-[9.5px]">
              <span className="text-slate-500 font-extrabold uppercase tracking-wide">
                คะแนนระดับบุคลิก (Emotional Core Rating)
              </span>
              
              <div className="space-y-1 mt-1">
                {/* 1. Energy */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">⚡ กำลังตื่นเต้นตาสว่าง (Energy):</span>
                  <div className="flex items-center gap-1 font-mono text-slate-300">
                    <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full" style={{ width: `${(activeConfig.defaultEmotionScores.energy / 5) * 100}%` }} />
                    </div>
                    <span>{activeConfig.defaultEmotionScores.energy}/5</span>
                  </div>
                </div>

                {/* 2. Humor */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">😆 ความกวนหยอดมุกฮา (Humor):</span>
                  <div className="flex items-center gap-1 font-mono text-slate-300">
                    <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${(activeConfig.defaultEmotionScores.humor / 5) * 100}%` }} />
                    </div>
                    <span>{activeConfig.defaultEmotionScores.humor}/5</span>
                  </div>
                </div>

                {/* 3. Warmth */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">❤️ อบอุ่นเป็นกันเอง (Warmth):</span>
                  <div className="flex items-center gap-1 font-mono text-slate-300">
                    <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full" style={{ width: `${(activeConfig.defaultEmotionScores.warmth / 5) * 100}%` }} />
                    </div>
                    <span>{activeConfig.defaultEmotionScores.warmth}/5</span>
                  </div>
                </div>

                {/* 4. Formality */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">💼 เรียบร้อยเป็นวิชาการ (Formality):</span>
                  <div className="flex items-center gap-1 font-mono text-slate-300">
                    <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full" style={{ width: `${(activeConfig.defaultEmotionScores.formality / 5) * 100}%` }} />
                    </div>
                    <span>{activeConfig.defaultEmotionScores.formality}/5</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Signature Phrases Snippets */}
            <div className="pt-2 border-t border-slate-800/30 text-[9.5px]">
              <span className="text-slate-500 block mb-1">คำติดปากประโยคทองคำ:</span>
              <div className="flex flex-wrap gap-1">
                {activeConfig.signaturePhrases.map((phrase, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[9px] font-medium italic">
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Admin Live Instruction Configurator */}
      {activeTab === "admin" && (
        <form onSubmit={handleSaveConfig} className="space-y-2.5 text-[10.5px]" id="tab-admin-edit-form">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">1. เลือกบอทที่จะปรับแต่ง:</label>
            <select
              value={editingPreset}
              onChange={(e) => setEditingPreset(e.target.value as PersonalityPresetId)}
              className="w-full text-[10.5px] bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-slate-200 outline-none focus:border-indigo-500"
            >
              {(Object.values(personalities) as AIPersonality[]).map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.displayNameEn})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">2. ชื่อจำลองการคุย (Name):</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. น้องเอ ซิ่งสะท้านหัวใจ"
              className="w-full text-[10.5px] bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-slate-200 outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">3. สไตล์ภาพรวมการคุย (Tone Description):</label>
            <textarea
              value={toneDescription}
              onChange={(e) => setToneDescription(e.target.value)}
              rows={2}
              placeholder="e.g. สุภาพ ตื่นเต้น ใช้คำสบถขบขัน"
              className="w-full text-[10.5px] bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-slate-200 outline-none focus:border-indigo-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">4. กฎขอบเขตบทบาท AI (Custom System Instructions):</label>
            <textarea
              value={customSystemInstruction}
              onChange={(e) => setCustomSystemInstruction(e.target.value)}
              rows={3}
              placeholder="e.g. คุณเป็นพนักงานขายรถซิ่ง พูดจาเชียร์การดาวน์ต่ำ คุยถึงพิกัดยาง"
              className="w-full text-[10px] bg-slate-950 border border-slate-800 p-2 rounded-lg text-slate-200 outline-none focus:border-indigo-500 leading-normal"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-0.5 font-medium">5. คำประโยคติดปาก (คั่นด้วยจุลภาค ,):</label>
            <input
              type="text"
              value={signaturePhrasesText}
              onChange={(e) => setSignaturePhrasesText(e.target.value)}
              placeholder="ปังปุริเย่!, คันนี้มีคนทักแน่นอน, โอ้โหคันนี้สุด"
              className="w-full text-[10.5px] bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-lg text-slate-200 outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>6. ดัชนีความขี้เล่นบอท (Temperature):</span>
              <span className="font-mono text-indigo-400">{temp}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[8.5px] text-slate-500 leading-none">
              ค่าต่ำ = คำแนะนำจะวิชาการ แม่นตัวเลข, ค่าสูง = จะขี้คุยหยอดตลก
            </p>
          </div>

          {saveSuccess && (
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9.5px]" id="admin-save-toast">
              บันทึกโครงสร้างจริยธรรมบอทสำเร็จ! อัปเดตไปยังระบบคลาวด์/ท้องถิ่นและพร้อมตอบสนองทันทีคร้าบผม! ⚡
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold flex items-center justify-center gap-1.5 shadow-md hover:shadow-indigo-500/15 disabled:opacity-40 transition-all duration-300 cursor-pointer"
            id="save-persona-btn"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "กำลังจัดเก็บความสามารถ..." : "บันทึกและปรับใช้บอทใหม่"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
