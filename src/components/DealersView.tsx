import { Award, Store } from "lucide-react";
import { useAppStore } from "../store";

/** Honest empty copy when no verified public dealer directory is available. */
export const PUBLIC_DEALERS_EMPTY_MESSAGE =
  "ขณะนี้ยังไม่มีรายชื่อผู้ขายที่ยืนยันสำหรับแสดงในหน้านี้";

/** Public `/dealers` page — verified directory only; no client mock fixtures. */
export default function DealersView() {
  const { isDarkMode } = useAppStore();

  return (
    <div className="space-y-6 sm:space-y-10 pb-20">
      <section className="text-left space-y-1.5 max-w-xl">
        <h2 className="font-display font-black text-2xl sm:text-3xl text-white flex items-center gap-2">
          <span>ดีลเลอร์และโชว์รูมพันธมิตร</span>
          <span className="text-orange-500 flex items-center gap-1.5">
            โกลด์คลับ <Award className="w-5 h-5 animate-pulse" />
          </span>
        </h2>
        <p className="text-slate-400 font-sans text-sm leading-relaxed">
          รายชื่อผู้ขายที่ผ่านการยืนยันสำหรับแสดงต่อสาธารณะจะปรากฎที่นี่เมื่อพร้อม
        </p>
      </section>

      <div
        className={`rounded-3xl border p-10 sm:p-14 text-center space-y-4 max-w-lg mx-auto ${
          isDarkMode
            ? "bg-white/5 border-white/[0.06]"
            : "bg-slate-100/50 border-slate-200"
        }`}
        data-testid="public-dealers-empty-state"
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
          <Store className="w-7 h-7" />
        </div>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          {PUBLIC_DEALERS_EMPTY_MESSAGE}
        </p>
      </div>
    </div>
  );
}
