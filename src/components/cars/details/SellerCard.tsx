import React from "react";
import { useAppStore } from "../../../store";
import { ShieldCheck, Phone, MapPin, Award, Star, MessageSquareCode, BadgeCheck } from "lucide-react";
import { Car } from "../../../types";

interface SellerCardProps {
  car: Car;
  isDarkMode?: boolean;
  onContactClick?: () => void;
  onStartChat?: () => void;
}

export default function SellerCard({ car, isDarkMode = true, onContactClick, onStartChat }: SellerCardProps) {
  const { dealers, setView } = useAppStore();

  // Find linked dealer details from the AppStore's dealer stack
  const linkedDealer = dealers.find((d) => d.id === car.dealerId || d.id === car.ownerId || d.id === "dealer-001"); // default to dealer-001 if no direct key

  const isDealer = car.sellerType === "dealer" || !!car.dealerId;
  const sellerName = car.ownerName || car.brand + " Specialist Owner";
  const sellerPhone = car.ownerPhone || "080-999-8888";

  return (
    <div className={`p-6 rounded-3xl border ${
      isDarkMode 
        ? "bg-slate-900/40 border-white/[0.06] text-white" 
        : "bg-white border-slate-250 text-slate-800"
    } shadow-2xl space-y-6 text-left`}>

      <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">
        ข้อมูลตัวแทนและโชว์รูมผู้ลงขาย (Dealer Profile)
      </span>

      {/* Main Avatar + Rating row */}
      <div className="flex items-start gap-4">
        {/* Avatar badge */}
        <div className="relative shrink-0 select-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-display font-black text-white text-lg border border-orange-500/30">
            {isDealer ? "DL" : (sellerName[0]?.toUpperCase() || "O")}
          </div>
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-slate-900 w-5 h-5 rounded-full flex items-center justify-center" title="Online now">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          </span>
        </div>

        {/* Name and ratings */}
        <div className="text-left leading-tight flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="font-display font-black text-[15px] text-white leading-snug">
              {isDealer ? (linkedDealer?.name || "Nong A Selected Dealer Service") : sellerName}
            </h4>
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0" title="ผู้ใช้ยืนยันบัตรประชาชนและเล่มรถแล้ว" />
          </div>

          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            {isDealer ? (
              <>
                <Award className="w-3.5 h-3.5 text-orange-500" />
                <span>ดีลเลอร์สิริพรีเมียมพันธมิตร</span>
              </>
            ) : (
              <span>สมาชิกผู้ลงขายแบบรถธรรมดาส่วนบุคคล</span>
            )}
          </p>

          <div className="flex items-center gap-2 mt-2 font-mono text-[11px] text-slate-450">
            <div className="flex items-center gap-0.5 text-orange-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3 h-3 fill-current" />
              ))}
            </div>
            <span>(5.0 • 42 รีวิวยอดเยี่ยม)</span>
          </div>
        </div>
      </div>

      {/* Additional properties (location & coordinates) */}
      <div className="space-y-3 pt-2.5 border-t border-slate-800 text-xs">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4.5 h-4.5 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-slate-300 leading-normal">
            {isDealer 
              ? (linkedDealer?.address || "โชว์รูมพระราม 9 ซอยอัจฉริยะ, แขวงห้วยขวาง, กรุงเทพมหานคร")
              : `เขตที่นัดหมาย: จังหวัด${car.province || "กรุงเทพมหานคร"}`}
          </p>
        </div>

        {isDealer && (
          <div className="p-3 bg-orange-600/[0.02] border border-orange-500/10 rounded-2xl flex items-center justify-between text-[11px]">
            <span className="text-slate-400">เลขผู้เสียภาษี / บัตรทะเบียนการค้า:</span>
            <span className="font-mono text-orange-400 font-bold">DBD Verified ✅</span>
          </div>
        )}
      </div>

      {isDealer && (
        <button
          onClick={() => setView("dealer-showroom", null, linkedDealer?.id || "dealer-001")}
          className="w-full py-2.5 px-3 border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <BadgeCheck className="w-4 h-4 text-orange-500" />
          <span>เยี่ยมชมโชว์รูมทางการศึกษา →</span>
        </button>
      )}

      {/* Primary contact callback actions button */}
      <div className="grid grid-cols-2 gap-3 pt-2 z-10 relative">
        <button
          onClick={onContactClick}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-orange-650 hover:bg-orange-700 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-orange-600/10 cursor-pointer text-center"
        >
          <Phone className="w-4 h-4 animate-shake" />
          <span>นัดดูทางโทรศัพท์ 📞</span>
        </button>

        <button
          onClick={onStartChat}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-white/[0.04] border border-slate-800 hover:bg-white/[0.08] text-slate-200 font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer text-center"
        >
          <MessageSquareCode className="w-4 h-4 text-orange-500" />
          <span>แชทปรึกษา น้องเอ</span>
        </button>
      </div>

    </div>
  );
}
