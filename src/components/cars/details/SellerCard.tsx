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

  return (
    <div className="p-6 rounded-3xl border nonga-bg-surface nonga-border nonga-text-primary shadow-2xl space-y-6 text-left">

      <span className="text-[10px] font-mono font-black nonga-text-muted uppercase tracking-widest block">
        ข้อมูลตัวแทนและโชว์รูมผู้ลงขาย (Dealer Profile)
      </span>

      {/* Main Avatar + Rating row */}
      <div className="flex items-start gap-4">
        {/* Avatar badge */}
        <div className="relative shrink-0 select-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center font-display font-black text-white text-lg border border-orange-500/30">
            {isDealer ? "DL" : (sellerName[0]?.toUpperCase() || "O")}
          </div>
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-[var(--nonga-bg-surface)] w-5 h-5 rounded-full flex items-center justify-center" title="Online now">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          </span>
        </div>

        {/* Name and ratings */}
        <div className="text-left leading-tight flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="font-display font-black text-[15px] nonga-text-primary leading-snug">
              {isDealer ? (linkedDealer?.name || "Nong A Selected Dealer Service") : sellerName}
            </h4>
            <ShieldCheck className="w-4.5 h-4.5 text-[var(--nonga-success)] shrink-0" title="ผู้ใช้ยืนยันบัตรประชาชนและเล่มรถแล้ว" />
          </div>

          <p className="text-[11px] nonga-text-secondary mt-1 flex items-center gap-1.5">
            {isDealer ? (
              <>
                <Award className="w-3.5 h-3.5 text-[var(--nonga-action-primary)]" />
                <span>ดีลเลอร์สิริพรีเมียมพันธมิตร</span>
              </>
            ) : (
              <span>สมาชิกผู้ลงขายแบบรถธรรมดาส่วนบุคคล</span>
            )}
          </p>

          <div className="flex items-center gap-2 mt-2 font-mono text-[11px] nonga-text-muted">
            <div className="flex items-center gap-0.5 text-[var(--nonga-action-primary)]">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3 h-3 fill-current" />
              ))}
            </div>
            <span>(5.0 • 42 รีวิวยอดเยี่ยม)</span>
          </div>
        </div>
      </div>

      {/* Additional properties (location & coordinates) */}
      <div className="space-y-3 pt-2.5 border-t nonga-border text-xs">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4.5 h-4.5 text-[var(--nonga-action-primary)] shrink-0 mt-0.5" />
          <p className="nonga-text-secondary leading-normal">
            {isDealer 
              ? (linkedDealer?.address || "โชว์รูมพระราม 9 ซอยอัจฉริยะ, แขวงห้วยขวาง, กรุงเทพมหานคร")
              : `เขตที่นัดหมาย: จังหวัด${car.province || "กรุงเทพมหานคร"}`}
          </p>
        </div>
        {(car.licensePlateMasked || car.registrationProvince) && (
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4.5 h-4.5 text-[var(--nonga-info)] shrink-0 mt-0.5" />
            <p className="nonga-text-secondary leading-normal">
              ทะเบียน: {car.licensePlateMasked || "ปิดเลขทะเบียน"}{" "}
              {car.registrationProvince
                ? `(${car.registrationProvince})`
                : ""}
            </p>
          </div>
        )}

        {isDealer && (
          <div className="p-3 nonga-bg-subtle border nonga-border rounded-2xl flex items-center justify-between text-[11px]">
            <span className="nonga-text-secondary">เลขผู้เสียภาษี / บัตรทะเบียนการค้า:</span>
            <span className="font-mono text-[var(--nonga-action-primary)] font-bold">DBD Verified ✅</span>
          </div>
        )}
      </div>

      {isDealer && (
        <button
          onClick={() => setView("dealer-showroom", null, linkedDealer?.id || "dealer-001")}
          className="w-full py-2.5 px-3 border nonga-border nonga-bg-subtle hover:bg-[var(--nonga-bg-elevated)] text-[var(--nonga-action-primary)] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer nonga-focus-ring"
        >
          <BadgeCheck className="w-4 h-4 text-[var(--nonga-action-primary)]" />
          <span>เยี่ยมชมโชว์รูมทางการศึกษา →</span>
        </button>
      )}

      {/* Primary contact callback actions button */}
      <div className="grid grid-cols-2 gap-3 pt-2 z-10 relative">
        <button
          onClick={onContactClick}
          className="flex items-center justify-center gap-2 py-3 px-4 nonga-action font-bold rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-orange-600/10 cursor-pointer text-center nonga-focus-ring"
        >
          <Phone className="w-4 h-4 animate-shake" />
          <span>นัดดูทางโทรศัพท์ 📞</span>
        </button>

        <button
          onClick={onStartChat}
          className="flex items-center justify-center gap-2 py-3 px-4 nonga-bg-subtle border nonga-border-strong hover:bg-[var(--nonga-bg-elevated)] nonga-text-primary font-bold rounded-xl text-xs active:scale-95 transition-all cursor-pointer text-center nonga-focus-ring"
        >
          <MessageSquareCode className="w-4 h-4 text-[var(--nonga-action-primary)]" />
          <span>แชทปรึกษา น้องเอ</span>
        </button>
      </div>

    </div>
  );
}
