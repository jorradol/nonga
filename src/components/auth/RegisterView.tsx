import { useAppStore } from "../../store";
import { Bot } from "lucide-react";
import { AnimatedCard } from "../LayoutSystem";
import { RegisterFormPanel } from "./RegisterFormPanel";

export default function RegisterView() {
  const setView = useAppStore((state) => state.setView);

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4 sm:px-6 relative z-10 font-sans">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-orange-500/10 blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3.5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-black text-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-transform duration-300">
            A
          </div>
          <div className="space-y-1">
            <h2 className="font-display font-black text-2xl sm:text-3xl text-gray-900 dark:text-white leading-tight">
              ลงทะเบียนเข้าใช้งาน{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                Nong A
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              สร้างประวัติการคุย เจาะลึกสภาพ ยื่นขายโพสต์ทันที ปังปุริเย่!
            </p>
          </div>
        </div>

        <AnimatedCard
          hoverGlow={false}
          className="border-orange-500/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-left"
        >
          <RegisterFormPanel
            onRegisterSuccess={() => {
              setTimeout(() => setView("home"), 1500);
            }}
          />
        </AnimatedCard>

        <div className="flex items-center justify-between px-3 text-xs text-slate-500">
          <span>มีบัญชีผู้ใช้งานอยู่แล้วคุณพี่?</span>
          <button
            onClick={() => setView("login")}
            className="font-bold text-orange-500 hover:text-orange-600 transition flex items-center gap-0.5 focus:outline-none"
          >
            <span>ลงชื่อเข้าใช้งานได้เลย</span>
            <Bot className="w-4 h-4 text-orange-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
