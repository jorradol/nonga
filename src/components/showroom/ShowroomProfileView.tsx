import React, { useState } from "react";
import { useShowroom } from "../../hooks/showroom/useShowroom";
import { useAppStore } from "../../store";
import { 
  Sparkles, Star, MapPin, Smartphone, Award, ShieldCheck, 
  Share2, Heart, TrendingUp, Send, Calendar, DollarSign, 
  CheckCircle2, ThumbsUp, ChevronRight, Info, Clock, 
  User, MessageSquare, ExternalLink, RefreshCw, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getListingPrimaryImage } from "../../utils/listingImages";

export function ShowroomProfileView() {
  const {
    currentDealer,
    dealerCars,
    featuredCar,
    insights,
    loadingInsights,
    isFollowing,
    handleToggleFollow,
    handleSubmitReview,
    handleShareShowroom,
    setView
  } = useShowroom();

  const isDarkMode = useAppStore((state) => state.isDarkMode);
  
  // Local state for review form
  const [reviewerName, setReviewerName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [boughtCarId, setBoughtCarId] = useState("");
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);

  // Local state for appointment form
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingCarId, setBookingCarId] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isBookingSuccessful, setIsBookingSuccessful] = useState(false);

  // Handle Review Submission
  const onReviewFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const matchedCar = dealerCars.find(c => c.id === boughtCarId);
    const carTitleSnippet = matchedCar ? matchedCar.title : undefined;

    handleSubmitReview(reviewerName, rating, comment, carTitleSnippet);
    setIsSubmitSuccessful(true);
    
    // Clear form
    setComment("");
    setReviewerName("");
    setRating(5);
    setBoughtCarId("");

    setTimeout(() => {
      setIsSubmitSuccessful(false);
    }, 4500);
  };

  // Handle Booking Simulation
  const onBookingFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) {
      alert("กรุณาระบุวันและเวลาที่สะดวกครับพี่!");
      return;
    }

    setIsBookingSuccessful(true);
    setTimeout(() => {
      setIsBookingSuccessful(false);
      // Reset
      setBookingDate("");
      setBookingTime("");
      setBookingCarId("");
      setBookingNotes("");
    }, 6000);
  };

  return (
    <div className="space-y-8 pb-24 text-left selection:bg-orange-500/20">
      
      {/* 1. HERO SHOWROOM BANNER */}
      <div className="relative rounded-3xl overflow-hidden border border-orange-500/10 shadow-2xl">
        {/* Cover gallery image with absolute overlay */}
        <div className="h-56 sm:h-72 w-full relative bg-slate-950">
          <img 
            src={currentDealer.coverImage} 
            alt={currentDealer.name}
            className="w-full h-full object-cover filter brightness-[0.7] scale-102"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-black/40" />
          
          {/* Back button */}
          <button 
            onClick={() => setView("dealers")}
            className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white text-xs font-semibold cursor-pointer transition-all hover:scale-102 active:scale-98"
          >
            ← กลับหน้าดีลเลอร์ทั้งหมด
          </button>
        </div>

        {/* Showroom branding credentials layer */}
        <div className="p-6 md:p-8 bg-[#09090b] relative -mt-16 sm:-mt-20 rounded-t-3xl border-t border-white/[0.05] flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
          
          {/* Logo, text details */}
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end w-full md:w-auto">
            {/* Round premium avatar holder */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5 shadow-xl shrink-0 -mt-20 z-10 relative overflow-hidden">
              <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-white overflow-hidden">
                <img 
                  src={currentDealer.logo} 
                  alt={currentDealer.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight leading-none">
                  {currentDealer.name}
                </h1>
                
                {currentDealer.verified && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] uppercase font-black tracking-widest animate-pulse">
                    <ShieldCheck className="w-3.5 h-3.5" /> Certified
                  </span>
                )}
              </div>

              <p className="text-[12px] text-slate-400 max-w-xl font-sans leading-relaxed">
                {currentDealer.description}
              </p>

              {/* Direct meta ticks */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400 font-semibold pt-1">
                <span className="flex items-center gap-1 text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                  <Star className="w-3.5 h-3.5 fill-current text-amber-400" /> {currentDealer.rating.toFixed(1)} / 5.0 Rating
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" /> {currentDealer.address}
                </span>
              </div>
            </div>
          </div>

          {/* Social connections and interactions */}
          <div className="flex gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleShareShowroom}
              className="flex-1 sm:flex-none py-2.8 px-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5"
              title="แชร์โชว์รูม"
            >
              <Share2 className="w-4 h-4" />
              <span>แชร์ร้านค้า</span>
            </button>

            <button
              onClick={handleToggleFollow}
              className={`flex-1 sm:flex-none py-2.8 px-4.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center justify-center gap-1.5 active:scale-97 shadow-lg ${
                isFollowing 
                  ? "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-950/10" 
                  : "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-950/20"
              }`}
            >
              <Heart className={`w-4 h-4 ${isFollowing ? "fill-current" : ""}`} />
              <span>{isFollowing ? "ติดตามแล้ว ✓" : "ติดตามร้านค้า"}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 2. DEALER STATISTICS HUB */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-900 text-left space-y-1 backdrop-blur-md">
          <span className="text-[10px] font-mono text-slate-500 tracking-wider block uppercase font-bold">รถยนต์พร้อมขายทั้งหมด</span>
          <p className="text-xl sm:text-2xl font-black text-white">{dealerCars.length} คันในพอร์ต</p>
          <span className="text-[9.5px] text-orange-400 block font-semibold">อัปเดตสต็อกเรียลไทม์</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-900 text-left space-y-1 backdrop-blur-md">
          <span className="text-[10px] font-mono text-slate-500 tracking-wider block uppercase font-bold">ประสบการณ์สัญญาทอง</span>
          <p className="text-xl sm:text-2xl font-black text-white">{currentDealer.experienceYears} ปีทำงาน</p>
          <span className="text-[9.5px] text-emerald-400 block font-semibold">มาตรฐาน NongBot Group</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#09090c] border border-orange-550/10 text-left space-y-1 backdrop-blur-md relative overflow-hidden">
          <span className="text-[10px] font-mono text-slate-500 tracking-wider block uppercase font-bold">สถิติผู้นิยมสไลด์เข้าชม</span>
          <p className="text-xl sm:text-2xl font-black text-white">{(currentDealer.totalViews + (isFollowing ? 175 : 0)).toLocaleString()} Views</p>
          <span className="text-[9.5px] text-slate-450 flex items-center gap-1 font-semibold leading-none">
            <Eye className="w-3 h-3 text-orange-500" /> ดึงดูดไวรัลเพจอันดับหนึ่ง
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-900 text-left space-y-1 backdrop-blur-md">
          <span className="text-[10px] font-mono text-slate-500 tracking-wider block uppercase font-bold">สัดส่วนพึงพอใจลูกค้า</span>
          <div className="flex items-center gap-1.5">
            <p className="text-xl sm:text-2xl font-black text-white">{(currentDealer.rating).toFixed(1)} / 5.0</p>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(currentDealer.rating) ? "fill-current text-amber-400" : "text-slate-650"
                  }`} 
                />
              ))}
            </div>
          </div>
          <span className="text-[9.5px] text-slate-500 block font-bold">จาก {currentDealer.reviews.length} รีวิวประวัติเสร็จ</span>
        </div>
      </div>

      {/* 3. COLUMNS WORKSPACE (Main content vs Sidebar panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT TWO-COLUMNS - MAIN WORKSPACE */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* A. AI INSIGHTS & RECOMMENDATIONS (GEMINI POWERED) */}
          <div className="p-6 rounded-2xl border border-orange-500/10 bg-gradient-to-r from-orange-950/20 to-slate-900/40 relative overflow-hidden backdrop-blur-md text-left">
            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-orange-500/10">
              <div className="space-y-0.5">
                <span className="px-2.5 py-0.5 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Nong A Showroom Co-pilot
                </span>
                <h3 className="text-[15px] font-display font-black text-white">วิเคราะห์เชิงรุกด้วยปัญญาประดิษฐ์ (AI Recommendations)</h3>
              </div>

              {loadingInsights && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold font-mono animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                  <span>AI กำลังวิเคราะห์...</span>
                </div>
              )}
            </div>

            <div className="pt-4 space-y-4">
              {/* Insight paragraph */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-extrabold tracking-wider">บทวิเคราะห์โชว์รูมภาพรวม (Overview Verdict):</span>
                <p className="text-[11.5px] leading-relaxed text-slate-300 font-sans">
                  {loadingInsights ? "โปรแกรมสร้างบอทกำลังรันสัญญาสถิติตัวถังเพื่อสรุปความน่าเชื่อถือที่นี่ซักครู่ครับ..." : insights?.insights}
                </p>
              </div>

              {/* Recommendation list */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-extrabold tracking-wider">คำแนะนำจับคู่รถคุ้มครองที่น่าเล็งซื้อ (AI Target Picks):</span>
                <div className="text-[11.5px] leading-relaxed text-slate-300 font-sans whitespace-pre-line pl-1.5 border-l-2 border-orange-500/30">
                  {loadingInsights ? "กำลังส่องข้อมูลคลังรถหรูเพื่อสรุปดีลผ่อนพรีเมียมตัวจริง..." : insights?.recommendations}
                </div>
              </div>

              {/* Nong A signature quote */}
              <div className="p-3.5 rounded-xl bg-orange-600/5 border border-orange-500/10 bg-slate-900/40">
                <p className="text-[11px] italic text-orange-400 leading-normal font-sans">
                  🗣️ <strong>น้องเอฟันธง:</strong> "{loadingInsights ? "รถสวยคมกริ๊บ สัญญาใจ ปังปุริเย่!" : insights?.aiQuote}"
                </p>
              </div>
            </div>
          </div>

          {/* B. FEATURED CAR SPOT */}
          {featuredCar && (
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 relative overflow-hidden backdrop-blur text-left space-y-4">
              <div className="absolute top-0 right-0 py-1.5 px-4.5 bg-amber-500/10 text-amber-400 border-b border-l border-amber-500/10 text-[9px] font-black uppercase tracking-wider rounded-bl-xl">
                ★ คันแนะนำพิเศษของโชว์รูม (Featured Car)
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-mono font-black text-slate-500 uppercase tracking-widest">รถยนต์พรีเมียมระดับเรือธง</h3>
                <h2 className="text-lg md:text-xl font-bold text-white leading-tight font-display hover:text-orange-400 cursor-pointer" onClick={() => setView("car-details", featuredCar.id)}>
                  {featuredCar.title}
                </h2>
              </div>

              {/* Wide responsive split */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-stretch">
                <div className="md:col-span-3 aspect-video rounded-xl bg-slate-950 overflow-hidden relative group border border-slate-850">
                  <img 
                    key={`${featuredCar.id}-cover`}
                    src={getListingPrimaryImage(featuredCar)} 
                    alt={featuredCar.title}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.01]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-black/80 text-orange-400 border border-orange-500/25">
                      ปี {featuredCar.year}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide bg-orange-650 text-white font-mono">
                      ไมล์ {featuredCar.mileage.toLocaleString()} กม.
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-2.5 text-left">
                    <span className="text-[10px] text-slate-500 uppercase block font-black tracking-widest">ราคาประเมินและดีล:</span>
                    <p className="text-2xl font-black text-orange-500 leading-none">฿{featuredCar.price.toLocaleString()}</p>
                    
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
                      {featuredCar.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {featuredCar.fuelType && (
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-850 rounded text-[9.5px] uppercase font-bold text-slate-350">
                          ⛽ {featuredCar.fuelType}
                        </span>
                      )}
                      {featuredCar.transmission && (
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-850 rounded text-[9.5px] uppercase font-bold text-slate-350">
                          ⚙️ {featuredCar.transmission}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setView("car-details", featuredCar.id)}
                      className="py-2 px-3 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-[11px] cursor-pointer text-center transition"
                    >
                      ส่องสเป็คละเอียด
                    </button>
                    <button
                      onClick={() => {
                        const sessTitle = `ดีลเลอร์ ${currentDealer.name} ⚡`;
                        useAppStore.getState().createChatSession(sessTitle);
                        setView("chat");
                        useAppStore.getState().sendChatMessage(`สนใจเจรจาขอนัดเข้าชมและปรึกษาเงื่อนไขรุ่นเรือธง ${featuredCar.title} ราคา ฿${featuredCar.price.toLocaleString()} ของโชว์รูม "${currentDealer.name}" หน่อยครับน้องเอ ปังปุริเย่!`);
                      }}
                      className="py-2 px-3 bg-orange-600 hover:bg-orange-500 text-white font-extrabold rounded-xl text-[11px] cursor-pointer text-center transition shadow-md shadow-orange-500/15"
                    >
                      ต่อรองคุย AI 🤖
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* C. ACTIVE CAR LISTINGS GRID */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider pl-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
              รายการรถทั้งหมดที่เปิดขาย ({dealerCars.length} ACTIVE CARS)
            </h3>

            {dealerCars.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-slate-900 bg-slate-900/30 space-y-3.5">
                <span className="text-4xl">🚗</span>
                <p className="text-xs text-slate-400">ยังไม่มีรถในพอร์ตเปิดขายขณะนี้ครับพี่ กรุณาลองตรวจสอบใหม่อีกครั้ง</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dealerCars.map((car) => {
                  return (
                    <div 
                      key={car.id}
                      className="rounded-2xl border border-slate-900/80 hover:border-slate-800 bg-[#0c0c0e]/90 overflow-hidden flex flex-col justify-between transition-all duration-350 hover:shadow-lg text-left"
                    >
                      <div className="relative aspect-video bg-slate-950 overflow-hidden">
                        <img 
                          key={`${car.id}-cover`}
                          src={getListingPrimaryImage(car)} 
                          alt={car.title}
                          className="w-full h-full object-cover transition duration-300 hover:scale-[1.01]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-3.5 left-3.5 flex gap-1 items-center">
                          <span className="px-2.5 py-0.5 rounded bg-black/80 text-[9.5px] uppercase font-serif font-black tracking-wide text-orange-400 border border-orange-500/20">
                            {car.brand}
                          </span>
                        </div>
                        {car.price > 1200000 && (
                          <span className="absolute top-3.5 right-3.5 text-[8.5px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded border border-amber-400/30 uppercase tracking-widest">
                            High Grade
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-2 text-left">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span>โมเดลปี {car.year}</span>
                          <span>ไมล์ {car.mileage.toLocaleString()} กม.</span>
                        </div>
                        <h4 
                          onClick={() => setView("car-details", car.id)}
                          className="font-display font-extrabold text-[14px] hover:text-orange-400 cursor-pointer truncate transition"
                        >
                          {car.title}
                        </h4>

                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-900/60 mt-1">
                          <span className="text-[10px] text-slate-500">ราคาจำลอง</span>
                          <span className="font-mono font-black text-orange-400 text-base">฿{car.price.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/40 border-t border-slate-905">
                        <button
                          onClick={() => setView("car-details", car.id)}
                          className="py-1.8 px-2 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-lg text-[10.5px] text-center cursor-pointer transition"
                        >
                          ดูสเป็คเครื่อง 🔍
                        </button>
                        <button
                          onClick={() => {
                            const descTitle = `ต่อรอง ${car.brand} ${car.model} 🚀`;
                            useAppStore.getState().createChatSession(descTitle);
                            setView("chat");
                            useAppStore.getState().sendChatMessage(`อยากขอนุมัติซื้อรถ ${car.brand} ${car.model} ${car.year} กับโชว์รูม "${currentDealer.name}" ปรึกษาส่วนแบ่งการจัดไฟแนนซ์ ดอกเบี้ย และข้อเสนอของคันนี้ให้หน่อยครับน้องเอคนเก่ง ปังปุริเย่!`);
                          }}
                          className="py-1.8 px-2 bg-orange-600 hover:bg-orange-550 text-white font-extrabold rounded-lg text-[10.5px] text-center cursor-pointer transition"
                        >
                          ปรึกษาน้อง AI 🙋‍♂️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* D. REVIEWS & COMMENTS SECTION */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-white uppercase tracking-wider pl-1">
              ความคิดเห็นและรีวิวจากคู่ค้าจริง ({currentDealer.reviews.length} Verified Reviews)
            </h3>

            {/* List existing reviews */}
            <div className="space-y-4">
              {currentDealer.reviews.map((rev) => {
                return (
                  <div 
                    key={rev.id}
                    className="p-4 rounded-xl border border-slate-900 bg-slate-900/10 hover:bg-slate-900/20 transition text-left space-y-2.5"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-white">{rev.reviewerName}</p>
                          {rev.verifiedPurchase && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-extrabold">
                              ผู้ซื้อตัวจริง ✓
                            </span>
                          )}
                        </div>
                        {rev.buyerOfCar && (
                          <span className="text-[9.5px] text-slate-500 block">
                            ออกรถยนต์รุ่น: <span className="text-orange-400 font-semibold">{rev.buyerOfCar}</span>
                          </span>
                        )}
                      </div>

                      {/* Stars count */}
                      <div className="flex gap-0.5 shrink-0">
                        {[...Array(5)].map((_, idx) => (
                          <Star 
                            key={idx} 
                            className={`w-3 h-3 ${idx < rev.rating ? "fill-current text-amber-400" : "text-slate-700"}`} 
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-350 leading-relaxed font-sans">{rev.comment}</p>
                    
                    <span className="text-[9px] text-slate-550 block text-right">
                      {new Date(rev.createdAt).toLocaleDateString("th-TH") || "2 วันที่แล้ว"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Submit interactive review frame */}
            <div className="p-5 rounded-2xl border border-slate-900 bg-slate-950/40 space-y-4">
              <span className="px-2 py-0.5 bg-orange-650/10 text-orange-400 border border-orange-500/10 rounded text-[9.5px] font-black uppercase tracking-wider block w-fit">
                สิทธิ์ส่งผลรีวิวเฉียบ (Submit Review)
              </span>

              <div className="space-y-1">
                <h4 className="text-xs font-black text-white">เขียนรีวิวแบ่งปันผลลัพธ์การเจรจา</h4>
                <p className="text-[10px] text-slate-450 leading-relaxed">
                  เมื่อคุณทำหนังสือจองรถเสร็จสิ้น หรือได้รับการต้อนรับอย่างอบอุ่นจากผู้เชี่ยวชาญ คุณพี่สามารถโพสต์เสียงสะท้อนเพื่อเสริมความน่าเชื่อถือให้พอร์ตระบบดีลเลอร์สเป็คทองได้โดยตรงครับ!
                </p>
              </div>

              {isSubmitSuccessful ? (
                <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-xs text-emerald-400 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ขอบพระคุณคุณพี่มากครับ! ดึงสลักจดบันทึกความคิดเห็นสะสางและประมวลเฉลี่ยคะแนนเฉียบพลันเรียบร้อย!</span>
                </div>
              ) : (
                <form onSubmit={onReviewFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block pl-0.5">ชื่อแสดงตัวตน</label>
                      <input 
                        type="text"
                        placeholder="เช่น คุณสมศักดิ์ สายตรวจ"
                        value={reviewerName}
                        onChange={(e) => setReviewerName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block pl-0.5">ระบุเลือกรถที่ซื้อ (ถ้ามี)</label>
                      <select
                        value={boughtCarId}
                        onChange={(e) => setBoughtCarId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-orange-500/30 cursor-pointer"
                      >
                        <option value="">-- ไม่ได้เจาะจงซื้อคันไหน --</option>
                        {dealerCars.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block pl-0.5">คะแนนพึงพอใจการพูดคุย (Rating Score)</label>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setRating(num)}
                              className={`w-9 h-9 rounded-xl border text-xs font-black transition flex items-center justify-center cursor-pointer ${
                                rating >= num 
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400" 
                                  : "bg-slate-900 border-slate-800 text-slate-500"
                              }`}
                            >
                              {num} ★
                            </button>
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400 font-bold">
                          {rating === 5 && "🥇 ดีเลิศสุดๆ (Highly Satisfied)"}
                          {rating === 4 && "👍 ดีเยี่ยม (Satisfied)"}
                          {rating === 3 && "👌 ปานกลาง (Normal)"}
                          {rating === 2 && "👎 น้อย (Unsatisfied)"}
                          {rating === 1 && "⚠️ ปรับปรุงเร่งด่วน"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block pl-0.5">ความคิดเห็นและบทวิจารณ์</label>
                      <textarea
                        rows={3}
                        placeholder="เขียนคำชม ข้อแนะนำ สภาพรถที่ดูจอง หรือความรวดเร็วในการบริการด้วยครับพี่..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        required
                        className="w-full p-4.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/30 resize-none font-sans"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <button
                      type="submit"
                      className="px-5 py-2.8 bg-orange-600 hover:bg-orange-555 text-white font-extrabold rounded-xl text-xs cursor-pointer transition active:scale-97 flex items-center gap-1 leading-none shadow-md shadow-orange-500/10 inline-flex ml-auto"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>ส่งส่งคะแนนรีวิวทันที ✨</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>

        {/* RIGHT SIDEBAR COLUMN */}
        <div className="space-y-6">
          
          {/* A. CONTACT DESK CARD */}
          <div className="p-5 rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur space-y-4 text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-wider pl-0.5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-orange-500" /> ข้อมูลติดต่อกับเจ้าหน้าที่ตรง
            </h4>

            {/* Detail items */}
            <div className="space-y-3.5 text-xs text-slate-300 font-sans">
              <div className="flex gap-2.5 items-start">
                <MapPin className="w-4.5 h-4.5 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-black text-slate-500 block">พิกัดโชว์รูมสาขาหลัก</span>
                  <p className="leading-relaxed text-[11.5px]">{currentDealer.address}</p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <Smartphone className="w-4.5 h-4.5 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-black text-slate-500 block">สายด่วนนัดหมายโอนทอง</span>
                  <a href={`tel:${currentDealer.phone}`} className="font-mono text-white text-sm hover:text-orange-400 font-black tracking-wide block transition">
                    {currentDealer.phone}
                  </a>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <Clock className="w-4.5 h-4.5 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-black text-slate-500 block">เวลาเปิดปิดทำการ</span>
                  <p className="text-[11.5px]">เปิดให้บริการทุกวัน 08:30 - 18:30 น.</p>
                </div>
              </div>
            </div>

            {/* NEON SOCIAL HOVER BUTTONS GRID */}
            <div className="pt-2 space-y-2 border-t border-slate-900/60 text-left pl-0">
              <span className="text-[10px] uppercase font-black text-slate-500 block pl-0.5 mb-1 tracking-wider">ช่องทางออนไลน์ที่เป็นพันธมิตร:</span>
              
              <div className="flex flex-col gap-2">
                {currentDealer.socialLinks.website && (
                  <a 
                    href={currentDealer.socialLinks.website}
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2.5 bg-slate-950 border border-slate-850 hover:border-orange-500/20 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5 font-mono">🌐 เว็บไซต์โชว์รูมทางการ</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                )}

                {currentDealer.socialLinks.facebook && (
                  <a 
                    href={currentDealer.socialLinks.facebook}
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2.5 bg-slate-950 border border-slate-850 hover:border-orange-500/20 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5 font-sans">🔵 ตรวจเช็ค Facebook Fanpage</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                )}

                {currentDealer.socialLinks.line && (
                  <a 
                    href={currentDealer.socialLinks.line}
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2.5 bg-green-950/10 border border-green-500/10 hover:border-green-500/20 rounded-xl text-[11px] font-bold text-green-400 hover:text-white flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5 font-sans">🟢 พูดคุยผ่าน LINE @Official</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                )}

                {currentDealer.socialLinks.tiktok && (
                  <a 
                    href={currentDealer.socialLinks.tiktok}
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2.5 bg-slate-950 border border-slate-850 hover:border-orange-500/20 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-1.5 font-mono">🎵 วีดีโอโปรโมต Tik Tok</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* B. AI APPOINTMENT BOOKING CO-PILOT */}
          <div className="p-5 rounded-2xl border border-orange-500/5 bg-slate-900/25 space-y-4 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full text-[8.5px] font-black uppercase tracking-wider inline-block">
                Co-pilot Live
              </span>
              <h4 className="text-xs font-black text-white flex items-center gap-1">
                จองคิวตรวจสภาพรถและทดสอบขับ 📆
              </h4>
              <p className="text-[10px] text-slate-450 leading-relaxed font-sans mt-0.5">
                เลือกคันโปรดและจองนัดหมายเข้าดูรถ คันจริง สตาร์ทเครื่องยนต์ หรือขอยกรถขึ้นฮอยส์ส่องช่วงล่างฟรี มีแอดมินรอต้อนรับปังปุริเย่ครับ
              </p>
            </div>

            {isBookingSuccessful ? (
              <div className="p-4 rounded-xl border border-orange-500/10 bg-orange-500/5 text-xs text-orange-400 font-semibold space-y-2 font-sans animate-fade-in text-left">
                <p className="font-extrabold flex items-center gap-1 text-[12px]"><CheckCircle2 className="w-4 h-4 text-orange-500" /> บันทึกตารางจองนัดหมายเรียบร้อย!</p>
                <p className="text-[10.5px] leading-relaxed text-slate-300">
                  ระบบส่งต่อจดใบจองให้ผจก. ของโชว์รูมเรียบร้อยแล้วครับ! ในวันนัดหมายกรุณาพาเพื่อนหรือคนในครอบครัวมาทานเครื่องดื่ม คันนี้มีคนทักชัวร์ ปังปุริเย่สุดๆ ครับพี่! ✨
                </p>
              </div>
            ) : (
              <form onSubmit={onBookingFormSubmit} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[9.5px] text-slate-450 block uppercase font-bold pl-0.5">เลือกรุ่นรถที่ต้องการนัดหมาย</label>
                  <select
                    value={bookingCarId}
                    onChange={(e) => setBookingCarId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-xl border-slate-800 bg-slate-900/60 text-xs text-white focus:outline-none focus:border-orange-500/30 cursor-pointer"
                  >
                    <option value="">-- กรุณาเลือกคันรถในร้าน --</option>
                    {dealerCars.map(c => (
                      <option key={c.id} value={c.id}>{c.title} (฿{c.price.toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9.5px] text-slate-450 block uppercase font-bold pl-0.5">เลือกวันที่ระบุ</label>
                    <input 
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                      className="w-full px-3 py-1.8 border rounded-xl border-slate-800 bg-slate-900/60 text-[11px] text-white focus:outline-none focus:border-orange-500/30 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9.5px] text-slate-450 block uppercase font-bold pl-0.5">เลือกเวลา</label>
                    <input 
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      required
                      className="w-full px-3 py-1.8 border rounded-xl border-slate-800 bg-slate-900/60 text-[11px] text-white focus:outline-none focus:border-orange-500/30 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] text-slate-450 block uppercase font-bold pl-0.5">ข้อเสนอพิเศษหรือคำขอ (เช่น ขอยกรถเช็คใต้ท้อง)</label>
                  <input 
                    type="text"
                    placeholder="เช่น ขอดูกล้องรอบคัน, ขอสลักสแตนด์เครื่องยนต์"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="w-full px-3.5 py-2.2 border rounded-xl border-slate-800 bg-slate-900/60 text-xs text-white focus:outline-none focus:border-orange-500/30"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.8 bg-orange-600 hover:bg-orange-550 text-white font-black rounded-xl text-xs transition cursor-pointer text-center tracking-wide flex items-center justify-center gap-1 inline-block mt-2 shadow shadow-orange-500/10"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  ยืนยันลงตารางนัดหมาย ⚡
                </button>
              </form>
            )}
          </div>

          {/* C. POPULAR TAGS CARD */}
          <div className="p-5 rounded-2xl border border-slate-900 bg-slate-100/5 dark:bg-slate-900/10 text-left space-y-3">
            <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider block pl-0.5">
              ป้ายบริการพิเศษ (Service Tags)
            </h4>
            <div className="flex flex-wrap gap-1.5 pt-1 pl-0">
              {currentDealer.tags.map((tag, i) => (
                <span 
                  key={i}
                  className="px-2.5 py-1 text-[10px] rounded-lg border border-orange-500/10 bg-orange-500/5 text-orange-400 font-extrabold"
                >
                  #{tag}
                </span>
              ))}
              <span className="px-2.5 py-1 text-[10px] rounded-lg border border-slate-800 bg-slate-900 text-slate-400 font-bold">
                #NongBotPremium
              </span>
              <span className="px-2.5 py-1 text-[10px] rounded-lg border border-slate-800 bg-slate-900 text-slate-400 font-bold">
                #CustomerFirst
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
