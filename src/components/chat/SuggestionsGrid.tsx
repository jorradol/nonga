import { Sparkles, Car, BatteryCharging, ShieldAlert, HeartHandshake } from "lucide-react";

interface SuggestionsGridProps {
  onSelectSuggestion: (text: string) => void;
}

export function SuggestionsGrid({ onSelectSuggestion }: SuggestionsGridProps) {
  const suggestions = [
    {
      title: "หารถไฟฟ้า EV สุดปัง",
      desc: "แนะนำรถไฟฟ้าทรงสวย งบไม่เกิน 1.5 ล้านบาทช่วงนี้",
      icon: BatteryCharging,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      query: "แนะนำรถยนต์ไฟฟ้า EV สปอร์ตล้ำๆ งบประมาณไม่เกิน 1.5 ล้านบาท เอาคันที่ปังปุริเย่ที่สุดให้หน่อยครับ"
    },
    {
      title: "เปรียบเทียบมวยคู่ยักษ์",
      desc: "เปรียบเทียบ Toyota Fortuner กับ Isuzu MU-X รุ่นไหนคุ้ม?",
      icon: Car,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      query: "ช่วยเปรียบเทียบดวลสเป็คระหว่าง Toyota Fortuner กับ Isuzu MU-X ให้ทีครับ คันไหนออปชั่นแน่นและขับแล้วหรูกว่ากัน"
    },
    {
      title: "เช็คลิสต์รถมือสอง",
      desc: "ขั้นตอนดูตัวรถชนหนัก น้ำท่วม เช็คเบื้องต้นด้วยตัวเอง",
      icon: ShieldAlert,
      color: "text-red-400 bg-red-500/10 border-red-500/20",
      query: "ขอวิธียืนยันตัวตนเช็คสภาพรถมือสองเบื้องต้น ไม่ให้โดนย้อมแมวชนหนักหรือน้ำท่วมครับ"
    },
    {
      title: "แนะนำคนเริ่มทำแบรนด์ขาย",
      desc: "อยากตั้งราคาขายรถบ้าน ให้คนเห็นแล้วสนใจทันทีทำไง?",
      icon: HeartHandshake,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      query: "อยากรู้วิธีแต่งรูปและเขียนคำอธิบายขายรถมือสองให้น้องเอเห็นแล้วใจสั่น มีเคล็ดลับอย่างไรครับ"
    }
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
              {/* background flow highlight */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border ${item.color}`}>
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
