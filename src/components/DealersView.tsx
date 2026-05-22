import { useAppStore } from "../store";
import { Award, Smartphone, MapPin, Star, Sparkles, MessageSquare, Store } from "lucide-react";

export default function DealersView() {
  const { dealers, isDarkMode, setFilters, setView } = useAppStore();

  const handleConsultWithDealer = (dealerName: string) => {
    setView("chat");
    setFilters({ search: "" });
  };

  return (
    <div className="space-y-6 sm:space-y-10 pb-20">
      
      {/* Intro visual banner */}
      <section className="text-left space-y-1.5 max-w-xl">
        <h2 className="font-display font-black text-2xl sm:text-3xl text-white flex items-center gap-2">
          <span>ดีลเลอร์และโชว์รูมพันธมิตร</span>
          <span className="text-orange-500 flex items-center gap-1.5">
            โกลด์คลับ <Award className="w-5 h-5 animate-pulse" />
          </span>
        </h2>
        <p className="text-slate-400 font-sans text-sm leading-relaxed">
          ตรวจเช็คสถานบริการรายใหญ่ที่ได้รับป้าย NongBot Certified มั่นใจได้ 100% กับสัญญารับประกันคุณภาพ ไม่เคยคว่ำ ชนหนัก พังพินาศ หรือจมน้ำ มีผู้เชี่ยวชาญบริการดูแลครับ!
        </p>
      </section>

      {/* Showroom list grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {dealers.map((dealer) => {
          return (
            <article 
              key={dealer.id}
              className={`rounded-3xl overflow-hidden border flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${
                isDarkMode ? "glass-panel hover:border-orange-500/30 text-white" : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <div 
                className="space-y-4 cursor-pointer group"
                onClick={() => setView("dealer-showroom", null, dealer.id)}
              >
                {/* Cover gallery banner */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={dealer.coverImage}
                    alt={dealer.name}
                    className="w-full h-full object-cover p-0 transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {dealer.verified && (
                    <span className="absolute top-3 right-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full border border-orange-400/30 shadow flex items-center gap-1 uppercase">
                      <Sparkles className="w-3 h-3 animate-spin" /> NongBot Certified
                    </span>
                  )}
                </div>

                {/* Info block layout */}
                <div className="p-5 text-left space-y-4 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-display font-black text-[16px] sm:text-[17px] tracking-tight leading-snug group-hover:text-orange-500 transition-colors truncate">
                        {dealer.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                        <Star className="w-4 h-4 fill-current text-amber-500" />
                        <span>{dealer.rating.toFixed(1)}</span>
                        <span className="text-slate-500 font-normal">/ 5.0 ({dealer.reviews.length} รีวิว)</span>
                      </div>
                    </div>
                    
                    {/* Logo holder */}
                    <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shrink-0 shadow-lg text-white font-bold p-0 overflow-hidden">
                      <img src={dealer.logo} alt="logo" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  {/* Intro description summary */}
                  <p className="text-[11.5px] text-slate-450 leading-relaxed line-clamp-2 mt-1">
                    {dealer.description}
                  </p>

                  {/* Contact elements list */}
                  <div className="space-y-2 text-[12px] text-slate-400 font-sans border-t border-orange-500/5 pt-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4.5 h-4.5 text-orange-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{dealer.address}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4.5 h-4.5 text-orange-500 shrink-0" />
                      <span className="font-mono">{dealer.phone}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action interactions */}
              <div className="grid grid-cols-2 gap-2 p-4 pt-4 border-t border-orange-500/5 mt-2">
                <a
                  href={`tel:${dealer.phone}`}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold select-none border transition-all duration-150 ${
                    isDarkMode 
                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850" 
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-orange-500" />
                  <span>โทรสอบถาม</span>
                </a>

                <button
                  onClick={() => setView("dealer-showroom", null, dealer.id)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-orange-600/10 cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>เยี่ยมชมโชว์รูม →</span>
                </button>
              </div>

            </article>
          );
        })}
      </div>

    </div>
  );
}
