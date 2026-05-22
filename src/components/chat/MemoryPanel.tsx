import { BrainCircuit, Highlighter, Trash, Smile, ShieldAlert } from "lucide-react";
import { useChatContext } from "../../contexts/chat/ChatContext";

export function MemoryPanel() {
  const { userPreferences, isAnalyzingMemory } = useChatContext();

  if (!userPreferences) {
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/10 backdrop-blur-md hidden lg:block w-72" id="memory-empty-state">
        <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 justify-start mb-2">
          <BrainCircuit className="w-4 h-4 text-slate-500" />
          ความจำของน้องเอ
        </h3>
        <p className="text-[10px] text-slate-500 leading-normal">
          เมื่อคุณพูดคุยกับน้องเอ เช่น บอกยี่ห้อ งบประมาณ หรือประเภทรถที่สนใจ ระบบ AI จะบันทึกสเป็คโปรดของคุณที่นี่เพื่อส่งด่วนหาผู้จำหน่ายทันที! คันนี้มีคนทักแน่ครับ 🔥
        </p>
      </div>
    );
  }

  const { userName, preferredBrands, preferredBudget, focusArea, preferredFuelType, userNotes } = userPreferences;

  const hasPreferences = userName || (preferredBrands && preferredBrands.length > 0) || preferredBudget || focusArea || preferredFuelType || userNotes;

  if (!hasPreferences) return null;

  return (
    <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md hidden xl:block w-72 space-y-3 shrink-0 self-start" id="memory-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
          <BrainCircuit className="w-4 h-4 text-orange-500 animate-pulse" />
          ระบบจดจำสเป็คโปรด AI
        </h3>
        {isAnalyzingMemory && (
          <span className="text-[9px] text-orange-300 animate-pulse bg-orange-550/10 px-1.5 py-0.5 rounded-full">
            กำลังวิเคราะห์...
          </span>
        )}
      </div>

      <div className="space-y-2.5 text-[11px]" id="memory-items">
        {/* User Name */}
        {userName && (
          <div className="flex items-start justify-between border-b border-slate-800/40 pb-1.5">
            <span className="text-slate-500">ชื่อลูกค้า:</span>
            <span className="font-semibold text-slate-200">{userName}</span>
          </div>
        )}

        {/* Focus Area */}
        {focusArea && (
          <div className="flex items-start justify-between border-b border-slate-800/40 pb-1.5">
            <span className="text-slate-500">กลุ่มเป้าหมาย:</span>
            <span className="text-orange-400 font-medium px-1.5 py-0.5 rounded bg-orange-500/10 uppercase font-mono text-[9px] border border-orange-500/10">
              {focusArea === "ev" ? "⚡ EV ไฟฟ้าล้วน" : focusArea === "luxury" ? "👑 Luxury หรูหรา" : focusArea === "performance" ? "🔥 Performance สปอร์ตแรงสวนกระแส" : "ทั่วไป"}
            </span>
          </div>
        )}

        {/* Preferred Budget */}
        {preferredBudget && (
          <div className="flex items-start justify-between border-b border-slate-800/40 pb-1.5">
            <span className="text-slate-500">งบประมาณแนะนำ:</span>
            <span className="font-semibold text-slate-200">{preferredBudget}</span>
          </div>
        )}

        {/* Brand Badges */}
        {preferredBrands && preferredBrands.length > 0 && (
          <div className="border-b border-slate-800/40 pb-1.5 space-y-1">
            <span className="text-slate-500 block">ยี่ห้อโปรดที่เล็งไว้:</span>
            <div className="flex flex-wrap gap-1">
              {preferredBrands.map((b, i) => (
                <span key={i} className="bg-slate-800 border border-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-[9.5px]">
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fuel Type */}
        {preferredFuelType && (
          <div className="flex items-start justify-between border-b border-slate-800/40 pb-1.5">
            <span className="text-slate-500">ระบบขับเคลื่อน:</span>
            <span className="font-medium text-slate-300 capitalize">{preferredFuelType}</span>
          </div>
        )}

        {/* Note snippet */}
        {userNotes && (
          <div className="space-y-1">
            <span className="text-slate-500">สรุปเจตจำนงลูกค้า 📝</span>
            <p className="bg-orange-500/5 text-slate-300 p-2 rounded-lg border border-orange-500/10 leading-relaxed text-[10.5px]">
              "{userNotes}"
            </p>
          </div>
        )}
      </div>

      <div className="p-2 rounded bg-slate-950/40 text-[9px] text-slate-500 leading-normal flex items-start gap-1">
        <Smile className="w-3.5 h-3.5 mt-0.5 text-orange-400 shrink-0" />
        <span>หน่วยความจำนี้ซิงค์ตรงกับโปรไฟล์เพื่อแนะนำดีลเด็ดและแจ้งเตือนทันทีที่คุณล็อกอินครับ</span>
      </div>
    </div>
  );
}
