import { Sparkles, Car, PenLine, Search, HeartHandshake } from "lucide-react";

interface SuggestionsGridProps {
  onSelectSuggestion: (text: string) => void;
}

export function SuggestionsGrid({ onSelectSuggestion }: SuggestionsGridProps) {
  const suggestions = [
    {
      title: "ช่วยเขียนประกาศขายรถ",
      desc: "วางสเปกดิบแล้วให้น้องเอแปลงเป็นภาษาขาย",
      icon: PenLine,
      color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
      query:
        "ช่วยเขียนคำอธิบายขายรถจากสเปกนี้: บ.หนังปรับไฟฟ้า + จอทัชสกรีน + พวงมalaiมัลติฟังก์ชั่น + ฝาท้ายไฟฟ้า + บลูทูธ + ไฟหน้าLED + ไฟท้ายLED + ล้อแม็ก",
    },
    {
      title: "ค้นรถใน Marketplace",
      desc: "ถามรุ่น งบประมาณ หรือปีรถจากข้อมูลจริง",
      icon: Search,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      query: "มี Honda CR-V ในตลาดไหมครับ",
    },
    {
      title: "รถ SUV ในงบที่กำหนด",
      desc: "ค้นจากข้อมูลจริง ไม่แต่งรายการ",
      icon: Car,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      query: "มีรถ SUV ไม่เกิน 700,000 บาทในตลาดไหม",
    },
    {
      title: "แต่งโพสต์ Facebook",
      desc: "ช่วยสรุปจุดเด่นและปรับข้อความให้ขายดีขึ้น",
      icon: HeartHandshake,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      query: "ช่วยแต่งโพสต์ Facebook ขายรถมือสองให้น่าสนใจหน่อยครับ",
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto my-6 px-4" id="suggestions-box-wrapper">
      <div className="flex items-center gap-1.5 mb-3 px-1 text-slate-400 text-xs font-semibold">
        <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
        แนะนำหัวข้อที่น่าสนใจ คุยสนุกกับ น้องเอ
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="suggestions-grid">
        {suggestions.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectSuggestion(item.query)}
              className="group text-left p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-850 hover:border-orange-500/30 transition-all duration-300 cursor-pointer flex gap-3 relative overflow-hidden"
              id={`suggestion-btn-${index}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div
                className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border ${item.color}`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-[11.5px] font-semibold text-slate-200 group-hover:text-orange-400 transition-colors leading-tight">
                  {item.title}
                </h4>
                <p className="text-[10px] text-slate-400 group-hover:text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
