import { Sparkles, Car, PenLine, Search, HeartHandshake } from "lucide-react";

interface SuggestionsGridProps {
  onSelectSuggestion: (text: string) => void;
}

export function SuggestionsGrid({ onSelectSuggestion }: SuggestionsGridProps) {
  const suggestions = [
    {
      title: "หารถให้หน่อย",
      desc: "บอกงบและสเปกที่อยากได้",
      icon: Search,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
      query: "ช่วยหารถในตลาดให้หน่อยครับ",
    },
    {
      title: "ช่วยลงขายรถ",
      desc: "แนะนำขั้นตอนการลงขาย",
      icon: Car,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      query: "อยากลงขายรถ ต้องทำยังไงบ้างครับ",
    },
    {
      title: "ช่วยเขียนประกาศขายรถ",
      desc: "แปลงสเปกดิบเป็นภาษาขาย",
      icon: PenLine,
      color: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
      query: "ช่วยเขียนคำอธิบายขายรถจากสเปกนี้: บ.หนังปรับไฟฟ้า + จอทัชสกรีน + พวงมalaiมัลติฟังก์ชั่น + ฝาท้ายไฟฟ้า + บลูทูธ + ไฟหน้าLED + ไฟท้ายLED + ล้อแม็ก",
    },
    {
      title: "ช่วยเปรียบเทียบรถ",
      desc: "เทียบสเปกและราคาให้เห็นชัดๆ",
      icon: Sparkles,
      color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
      query: "ช่วยเปรียบเทียบรถ 2 คันแรกให้หน่อยครับ",
    },
    {
      title: "ช่วยดูรถในงบที่มี",
      desc: "ค้นหารถตามงบประมาณ",
      icon: Car,
      color: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20",
      query: "มีรถไม่เกิน 700,000 ไหม",
    },
    {
      title: "แต่งโพสต์ Facebook",
      desc: "สรุปจุดเด่นให้น่าสนใจ",
      icon: HeartHandshake,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      query: "ช่วยแต่งโพสต์ Facebook ขายรถมือสองให้น่าสนใจหน่อยครับ",
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto my-6 px-4" id="suggestions-box-wrapper">
      <div className="flex items-center gap-1.5 mb-3 px-1 nonga-text-muted text-xs font-semibold">
        <Sparkles className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 animate-pulse" />
        แนะนำหัวข้อที่น่าสนใจ คุยสนุกกับ น้องเอ
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="suggestions-grid">
        {suggestions.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectSuggestion(item.query)}
              className="group text-left p-3.5 rounded-xl border border-(--nonga-border)/80 bg-(--nonga-bg-surface)/30 hover:bg-slate-100 dark:hover:bg-slate-850 hover:border-orange-500/30 transition-all duration-300 cursor-pointer flex gap-3 relative overflow-hidden"
              id={`suggestion-btn-${index}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div
                className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border ${item.color}`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-[11.5px] font-semibold text-slate-800 group-hover:text-orange-700 dark:text-slate-200 dark:group-hover:text-orange-400 transition-colors leading-tight">
                  {item.title}
                </h4>
                <p className="text-[10px] text-slate-600 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300 line-clamp-2 mt-0.5 leading-snug">
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
