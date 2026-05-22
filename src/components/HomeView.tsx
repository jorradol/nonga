import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Car, MessageSquare, PlusCircle, Search, 
  Store, Bot, ArrowRight, Upload, Flame, TrendingUp, 
  BatteryCharging, Cpu, ClipboardCopy, RefreshCw, Star, 
  CheckCircle2, Heart, ExternalLink, ShieldCheck
} from "lucide-react";
import { 
  Container, 
  Section, 
  AnimatedCard, 
  GlassToolbar 
} from "./LayoutSystem";

// Mock Trending Cars (Dynamic Highlight Showcase for Home Page)
const TRENDING_CARS_SHOWCASE = [
  {
    id: "tesla-model-3-2023",
    title: "Tesla Model 3 Long Range AWD",
    brand: "Tesla",
    year: 2023,
    price: 1350000,
    mileage: 18000,
    fuelType: "ไฟฟ้า 100% ⚡",
    condition: "สภาพนางฟ้าเกรด S",
    type: "ev",
    image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    comment: "น้องเอฟันธง: รุ่นท็อปขับสี่ประหยัดแบตเตอรี่ วิ่งทางไกล 620 กม. ตะลุยเมืองกรุงได้สบาย ปังปุริเย่!"
  },
  {
    id: "porsche-taycan-4s-2022",
    title: "Porsche Taycan 4S Sports Performance",
    brand: "Porsche",
    year: 2022,
    price: 5890000,
    mileage: 12000,
    fuelType: "ไฟฟ้า 100% ⚡",
    condition: "มือเดียวประวัติศูนย์ครบ",
    type: "luxury",
    image: "https://images.unsplash.com/photo-1611245801314-cfcc325d2c5c?auto=format&fit=crop&q=80&w=600",
    rating: 5.0,
    comment: "น้องเอวิจารณ์: ขนลุกในความพรีเมียม สไตล์สปอร์ตหรูหรา ซื้อคันนี้ไปจอดที่ไหนใครก็หันมอง ว้าว!"
  },
  {
    id: "honda-civic-fe-2022",
    title: "Honda Civic FE 1.5 Turbo EL+",
    brand: "Honda",
    year: 2022,
    price: 849000,
    mileage: 32000,
    fuelType: "เบนซิน ⛽",
    condition: "สวยเดิมสีบางนุ่นสปิต",
    type: "used",
    image: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
    comment: "น้องเอแนะนำ: ขวัญใจวัยรุ่นและครอบครัว เครื่องเทอร์โบขับสนุก อะไหล่หาง่าย ราคาไม่มีดิ่งเหวครับ!"
  }
];

export default function HomeView() {
  const { isDarkMode, setView, createChatSession, sendChatMessage, favorites, toggleFavorite } = useAppStore();
  
  // Interactive Chat Simulator State
  const [simulatorStep, setSimulatorStep] = useState(0);
  const [simulatorCarPhoto, setSimulatorCarPhoto] = useState<string | null>(null);
  const [simulatorMessages, setSimulatorMessages] = useState<Array<{ sender: "user" | "ai"; text: string; image?: string }>>([
    {
      sender: "ai",
      text: "ยินดีต้อนรับครับพี่ออโต้! วันนี้น้องเอพร้อมทำหน้าที่สร้างโพสต์ขายรถแบบ AI ปังปุริเย่แล้ว ขอดูรูปรถตัวจริงคันเด่นของคุณพี่หน่อยครับ 📸✨"
    }
  ]);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  // Auto transition user action in simulator
  const handleSimulatorUpload = (imageSrc: string, carName: string) => {
    if (simulatorStep !== 0) return;
    setSimulatorCarPhoto(imageSrc);
    setIsAIGenerating(true);
    
    // User upload message
    setSimulatorMessages(prev => [
      ...prev,
      {
        sender: "user",
        text: `อัปโหลดรูปภาพรถยนต์ครอบครัวคันเก่งเรียบร้อยครับ: ${carName} ปี 2021 วิ่ง 45,000 กม. ฝากน้องเอเขียนแคปชั่นขายหน่อยนะครับ!`,
        image: imageSrc
      }
    ]);
    setSimulatorStep(1);

    // Simulated quick AI writing
    setTimeout(() => {
      setIsAIGenerating(false);
      setSimulatorMessages(prev => [
        ...prev,
        {
          sender: "ai",
          text: `โอ้โห คันนี้สวยเกลี้ยงกิ๊บมากครับ 🔥 สเกลสีและยางพึ่งเปลี่ยนใหม่แน่ๆ เดี๋ยวน้องเอช่วยทำคำอธิบายลายเซ็นเด็ดลงขายแบบเรียลไทม์ ปังปุริเย่แน่นอน!`
        },
        {
          sender: "ai",
          text: `📝 รีวิวฉบับย่อ & แคปชั่นสตรีมมิ่ง:\n\n🔥 "รถสวยสะกดสายตา Honda CR-V 2.4 EL 4WD ปี 21" รถบ้านพรีเมียมมือเดียวแท้ ไมล์น้องๆ ป้ายแดง 45k แท้ สภาพกริ๊บห้องเครื่องเอี่ยมไร้ฝุ่น เครื่อง เกียร์ และระบบเซนเซอร์อัจฉริยะสมบูรณ์ 100% ตรวจเช็คประวัติศูนย์ตลอดการใช้งาน!\n\n✨ สนใจรับน้องคันนี้ไปดูต่อ บอกงบมา น้องเอช่วยผ่อนเริ่มต้นเพียงเดือนละ 1x,xxx บ. จบปุ๊บปังปุริเย่แน่นอนจ้า!`
        }
      ]);
      setSimulatorStep(2);
    }, 1800);
  };

  const resetSimulator = () => {
    setSimulatorStep(0);
    setSimulatorCarPhoto(null);
    setSimulatorMessages([
      {
        sender: "ai",
        text: "ยินดีต้อนรับครับพี่ออโต้! วันนี้น้องเอพร้อมทำหน้าที่สร้างโพสต์ขายรถแบบ AI ปังปุริเย่แล้ว ขอดูรูปรถตัวจริงคันเด่นของคุณพี่หน่อยครับ 📸✨"
      }
    ]);
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 overflow-hidden relative">
      
      {/* 1. HERO SECTION WITH SAAS VIBES */}
      <section className="relative text-center space-y-8 pt-6 sm:pt-12">
        {/* Ambient background light circle */}
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-[350px] rounded-full bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-red-600/5 blur-[120px] pointer-events-none -z-10" />

        {/* Highlight Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11.5px] font-mono font-extrabold tracking-widest uppercase bg-orange-500/10 text-orange-500 border border-orange-500/15 animate-bounce">
          <Sparkles className="w-3.5 h-3.5 fill-current text-orange-500" />
          <span>Nong A by NongBot v2.8 PRO</span>
        </div>

        {/* Master Heading */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className={`font-display font-black text-4xl sm:text-6xl tracking-tight leading-[1.1] ${
            isDarkMode ? "text-white" : "text-slate-900"
          }`}>
            ขายรถง่ายขึ้น ด้วย{" "}
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-red-500">
              AI ผู้ช่วยมืออาชีพ
              <span className="absolute left-0 bottom-1 w-full h-[3px] bg-gradient-to-r from-orange-500 to-red-500 rounded-full opacity-60"></span>
            </span>
          </h1>
          
          <p className={`text-base sm:text-xl font-sans max-w-2xl mx-auto leading-relaxed ${
            isDarkMode ? "text-slate-400" : "text-slate-600"
          }`}>
            อัปโหลดรูปรถ แล้วให้น้องเอช่วยวิเคราะห์ประเมินราคา ตกแต่งเขียนโพสต์ลงขายรถด้วยลายเซ็นลายพรางสุดปังได้ทันที ปังปุริเย่ชัวร์! 🚗✨
          </p>
        </div>

        {/* Interactive CTA Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <button
            onClick={() => setView("sell")}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-orange-600/20 hover:shadow-orange-600/35 hover:scale-[1.02] transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-orange-400/10 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Start Selling / ลงทะเบียนขาย</span>
          </button>

          <button
            onClick={() => setView("chat")}
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm sm:text-base border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isDarkMode 
                ? "bg-[#111113] border-white/10 text-slate-200 hover:text-white hover:bg-[#18181b] hover:border-orange-500/30" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-orange-500/40"
            }`}
          >
            <Bot className="w-5 h-5 text-orange-500" />
            <span>Talk with AI น้องเอ</span>
          </button>
        </div>

        {/* Sub CTA shortcut */}
        <button 
          onClick={() => setView("search")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-500 transition-colors"
        >
          <span>หรือเปิดค้นหารถละเอียดระบุพิกัดเกรดอัจฉริยะ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Floating Metrics Showcase Container */}
        <div className="pt-8 sm:pt-14 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-2 rounded-3xl border border-white/[0.04] bg-slate-500/[0.02]">
            
            <div className={`p-5 rounded-2xl border text-center ${
              isDarkMode ? "bg-[#0d0d0f]/90 border-white/[0.06]" : "bg-white border-slate-100 shadow-sm"
            }`}>
              <div className="font-display font-black text-2xl sm:text-3xl text-orange-500">99.8%</div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">ความแม่นยำ AI สเป็ควิเคราะห์</div>
            </div>

            <div className={`p-5 rounded-2xl border text-center ${
              isDarkMode ? "bg-[#0d0d0f]/90 border-white/[0.06]" : "bg-white border-slate-100 shadow-sm"
            }`}>
              <div className="font-display font-black text-2xl sm:text-3xl text-orange-500">&lt; 3 วิ</div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">วิเคราะห์คำนวณและประมวลผล</div>
            </div>

            <div className={`p-5 rounded-2xl border text-center ${
              isDarkMode ? "bg-[#0d0d0f]/90 border-white/[0.06]" : "bg-white border-slate-100 shadow-sm"
            }`}>
              <div className="font-display font-black text-2xl sm:text-3xl text-orange-500">10,000+</div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">รถบ้านลงทะเบียนผ่านดีลเลอร์</div>
            </div>

            <div className={`p-5 rounded-2xl border text-center ${
              isDarkMode ? "bg-[#0d0d0f]/90 border-white/[0.06]" : "bg-white border-slate-100 shadow-sm"
            }`}>
              <div className="font-display font-black text-2xl sm:text-3xl text-orange-500">100%</div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-medium">คุ้มครองและปลอดภัยการซื้อขาย</div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE conversation SIMULATOR */}
      <Section
        badge="INTERACTIVE AI EXPERIENCE"
        title="ลองเล่นตัวจำลอง: โพสต์ขายรถด้วย AI น้องเอ 🪄"
        description="คลิกเลือกรูปรถด้านล่าง เพื่อดูขั้นตอนสมาร์ทอัตโนมัติในการสร้างโพสต์จำลองและการประมวลคำบรรยายสไตล์ NongBot"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
          
          {/* Left panel: Trigger cars choice */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4 text-left">
              <span className="text-[11px] font-mono tracking-wider font-extrabold text-orange-500 uppercase">ขั้นตอนที่ 1: แตะรูประบบสตาร์ทด้านล่างนี้</span>
              
              <h3 className={`font-display font-extrabold text-lg sm:text-xl leading-tight ${
                isDarkMode ? "text-white" : "text-slate-800"
              }`}>
                จำลองการส่งใบสมัครขอวิเคราะห์รถครอบครัวคันเด็ดของคุณ
              </h3>
              
              <p className="text-xs text-slate-400 leading-relaxed sm:text-sm">
                การวิเคราะห์สแกนรูปรถบ้านแท้ ตรวจสอบการพยาบาลสี รอยขูดขีดรอบตัวขอบประเสริฐ และแปลความหมายแบรนด์ พร้อมเปลี่ยนความท้าทายให้กลายเป็นบทบรรยายที่หอมกรุ่นน่าจอง
              </p>
            </div>

            {/* Simulated interactive items buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleSimulatorUpload("https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600", "Honda CR-V SUV ปี 2021")}
                className={`relative group overflow-hidden rounded-2xl border text-left p-3.5 space-y-2.5 transition active:scale-95 ${
                  simulatorCarPhoto === "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600"
                    ? "border-orange-500 bg-orange-500/10" 
                    : isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/[0.08]" : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <div className="aspect-video relative rounded-lg bg-black overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=200" alt="Family SUV" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition duration-300"></div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold block">Honda CR-V 2.4 EL</span>
                  <span className="text-[9.5px] text-slate-500 block">วิ่ง 45,000 กม. เกรดบ้าน A+</span>
                </div>
              </button>

              <button 
                onClick={() => handleSimulatorUpload("https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=600", "BMW 3 Series M-Sport ปี 2020")}
                className={`relative group overflow-hidden rounded-2xl border text-left p-3.5 space-y-2.5 transition active:scale-95 ${
                  simulatorCarPhoto === "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=600"
                    ? "border-orange-500 bg-orange-500/10" 
                    : isDarkMode ? "border-white/10 bg-white/5 hover:bg-white/[0.08]" : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <div className="aspect-video relative rounded-lg bg-black overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=200" alt="Euro Coupe" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition duration-300"></div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold block">BMW 3 Series M-Sport</span>
                  <span className="text-[9.5px] text-slate-500 block">วิ่ง 58,000 กม. กุญแจครบ 2 ดอก</span>
                </div>
              </button>
            </div>

            {/* Navigation links direct help */}
            <div className="space-y-3.5 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 text-left">
              <span className="text-[10px] font-bold tracking-widest text-[#0e0e0e] dark:text-slate-100 flex items-center gap-1.5 uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500 animate-pulse" /> ตรวจสอบสเป็คของจริง
              </span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                หากพี่ออโต้พึงพอใจการทักทายข้างต้น สามารถกดปุ่มด้านล่างเพื่อไปยังหน้าระบบลงขายและขอใช้งานระบบต่อรองอัจฉริยะ Gemini ในการลงภาพรถคันเด่นจริงๆ ของพี่ฟรีได้ทันที!
              </p>
              <button 
                onClick={() => setView("sell")}
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span>กดไปลงทะเบียนขายรถของจริง</span>
                <PlusCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right panel: Chat UI Terminal container */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-[420px] rounded-2xl border border-white/[0.07] bg-[#0c0c0e] overflow-hidden shadow-2xl relative">
            
            {/* Chat header panel */}
            <div className="p-4 bg-[#111113] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-600/10 border border-orange-500/30 flex items-center justify-center text-orange-500">
                  <Bot className="w-4 h-4 text-orange-500 animate-pulse" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <span>Nong A Expert Creator</span>
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono">www.nongbot.org/nonga - Live Service</p>
                </div>
              </div>

              {simulatorStep > 0 && (
                <button 
                  onClick={resetSimulator}
                  className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[9px] text-slate-300 hover:bg-white/10 active:scale-95 transition"
                >
                  <RefreshCw className="w-2.5 h-2.5 inline mr-1" /> เริ่มใหม่
                </button>
              )}
            </div>

            {/* Chat list viewport */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-left font-sans max-h-[350px]">
              {simulatorMessages.map((msg, index) => {
                const isAI = msg.sender === "ai";
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3.5 max-w-[85%] ${isAI ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                  >
                    {isAI ? (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shrink-0 text-white font-extrabold text-[10px]">
                        A
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 text-orange-500 font-bold text-[10px]">
                        Me
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className={`p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed ${
                        isAI 
                          ? "bg-[#141417] border border-white/[0.04] text-slate-200" 
                          : "bg-orange-600 text-white"
                      }`}>
                        {msg.text.split("\n\n").map((chunk, cIndex) => (
                          <p key={cIndex} className={cIndex > 0 ? "mt-2" : ""}>{chunk}</p>
                        ))}
                      </div>

                      {msg.image && (
                        <div className="rounded-xl overflow-hidden border border-white/5 bg-black/60 max-w-sm">
                          <img src={msg.image} alt="Simulator car upload file preview" className="w-full object-cover max-h-36" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {isAIGenerating && (
                <div className="flex gap-3.5 max-w-[85%] mr-auto items-center">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-extrabold text-[10px]">
                    A
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#141417] border border-white/[0.04]">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[10px] text-slate-500 font-mono ml-2">Nong A กำลังประมวลภาพและเรียบเรียงศัพท์เท็จจริง...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Input area */}
            <div className="p-3 bg-[#111113] border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>สถานะจำลอง: {simulatorStep === 0 ? "กรุณาคลิกเลือกรูปรถฝั่งซ้ายเพื่อลองอัปโหลด" : "ประมวลผลเสร็จสิ้น ปังปุริเย่!"}</span>
              <span>Nong A Creative Bot v2</span>
            </div>

          </div>

        </div>
      </Section>

      {/* 3. BENTO CORE FEATURES SPREAD */}
      <Section
        badge="NONG A POWERFUL UTILITIES"
        title="ฟีเจอร์เด็ดเสริมทัพตลาดรถยนต์ด้วย AI อัจฉริยะ"
        description="เจาะลึก 6 เทคโนโลยีชั้นนำพัฒนาและครอบคลุมโดยวิศวกรรมกลุ่ม NongBot ให้ทุกเรื่องรถยนต์เป็นเรื่องง่ายในคลิกเดียว"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          
          <AnimatedCard hoverGlow={false} className="p-6 space-y-4 text-left border-white/[0.05]">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center text-orange-500">
              <Upload className="w-6 h-6 text-orange-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-display font-bold text-base sm:text-lg">1-Click AI Easy Posting</h4>
              <p className="text-xs text-slate-400 leading-relaxed sm:text-sm">
                อัปโหลดรูปรถครอบครัวคันเด็ด ป้อนคุณลักษณะคร่าวๆ ระบบประมวลผลคำนวณสเปกเพื่อวางรากฐานโพสต์ขายให้ทันทีอย่างไร้รอยต่อ
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard hoverGlow={false} className="p-6 space-y-4 text-left border-white/[0.05]">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center text-orange-500">
              <Bot className="w-6 h-6 text-orange-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-display font-bold text-base sm:text-lg">AI Chat Expert Assistant</h4>
              <p className="text-xs text-slate-400 leading-relaxed sm:text-sm">
                วิเคราะห์สภาพแบตเตอรี่เทียบประวัติเฉลี่ย ปรึกษาตารางดอกเบี้ย คุยต่อรองราคาขั้นบันไดกับน้องเอ AI อัจฉริยะได้ตลอด 24 ชั่วโมง
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard hoverGlow={false} className="p-6 space-y-4 text-left border-white/[0.05]">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center text-orange-500">
              <Search className="w-6 h-6 text-orange-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-display font-bold text-base sm:text-lg">Semantic Smart Search</h4>
              <p className="text-xs text-slate-400 leading-relaxed sm:text-sm">
                พิมพ์ค้นหาเสรีตามความต้องการของคุณพี่ "รถบ้านประหยัดงบผ่อน" หรือ "รถไฟฟ้าวิ่งต่างจังหวัด" น้องเอก็จัดหาข้อมูลตอบโจทย์ได้อย่างคล่องแคล่ว
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard hoverGlow={false} className="p-6 space-y-4 text-left border-white/[0.05]">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center text-orange-500">
              <Store className="w-6 h-6 text-orange-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-display font-bold text-base sm:text-lg">Verified Dealer Network</h4>
              <p className="text-xs text-slate-400 leading-relaxed sm:text-sm">
                เชื่อมต่อและเป็นพันธมิตรโดยตรงกับ คลัยน์/ดีลเลอร์ โชว์รูมตัวท็อปในไทย ได้รับหลักประกันและสัญญาคุ้มครองรถยนต์ของแท้จากกลุ่มประเมินหลัก
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard hoverGlow={false} className="p-6 space-y-4 text-left border-white/[0.05]">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center text-orange-500">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-display font-bold text-base sm:text-lg">AI Viral Caption Generator</h4>
              <p className="text-xs text-slate-400 leading-relaxed sm:text-sm">
                สร้างคำโพสต์ลงแพลตฟอร์ม Social (Facebook, TikTok) ในลายเซ็นต์เฉียบคม คมกริบสไตล์ตัวพ่อตัวแม่ ปังปุริเย่ ดึงกระแสยอดไลก์พุ่งกระฉูด
              </p>
            </div>
          </AnimatedCard>

          <AnimatedCard hoverGlow={false} className="p-6 space-y-4 text-left border-white/[0.05]">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/15 flex items-center justify-center text-orange-500">
              <Cpu className="w-6 h-6 text-orange-500" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-display font-bold text-base sm:text-lg">Intelligent Spec Evaluator</h4>
              <p className="text-xs text-slate-400 leading-relaxed sm:text-sm">
                สกัดความคุ้มค่า อัตราเร่ง สัมประสิทธิ์ความปลอดภัยของแบตเตอรี่รถยนต์ EV และประวัติการบำรุงรักษาอย่างมีตรรกะระดับวิทยาศาสตร์คณิตศาสตร์
              </p>
            </div>
          </AnimatedCard>

        </div>
      </Section>

      {/* 4. EXCLUSIVE TRENDING CARS PREVIEW SHOWCASE */}
      <Section
        badge="NONG A EXCLUSIVE GALLERY"
        title={
          <span className="flex items-center gap-2">
            <span>รถยนต์ยอดฮิตติดชาร์ตของสัปดาห์</span>
            <TrendingUp className="w-5 h-5 text-orange-500 animate-pulse" />
          </span>
        }
        description="รถสวยกริ๊บประมวลผลด่วน คัดสรรสเป็คอัจฉริยะพร้อมให้น้องเอผู้ช่วย AI ลงคำวิจารณ์เจาะลึกเพื่อสนับสนุนสัญญารับรอง"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TRENDING_CARS_SHOWCASE.map((car) => {
            const isFav = favorites.includes(car.id);
            return (
              <AnimatedCard key={car.id} hoverGlow className="flex flex-col justify-between">
                <div>
                  {/* Photo area with status badge overlay */}
                  <div className="aspect-video relative bg-slate-950 overflow-hidden">
                    <img 
                      src={car.image} 
                      alt={car.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[8.5px] font-mono font-black uppercase tracking-wider bg-black/85 text-orange-400 border border-orange-500/35">
                        {car.brand}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[8.5px] font-mono font-black uppercase tracking-wider bg-orange-600 text-white flex items-center gap-1 shadow">
                        <Flame className="w-2.5 h-2.5" /> HOT LISTING
                      </span>
                    </div>

                    <button
                      onClick={() => toggleFavorite(car.id)}
                      className={`absolute top-3 right-3 p-1.5 rounded-full transition-all ${
                        isFav 
                          ? "bg-red-500 text-white" 
                          : "bg-black/60 text-white/80 hover:text-white hover:scale-110"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                    </button>
                    
                    <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-[#0d0d0fca] backdrop-blur-md border border-white/5 flex items-center gap-1">
                      <BatteryCharging className="w-3 h-3 text-orange-500" />
                      <span className="text-[10px] font-bold text-slate-100">{car.fuelType}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 text-left space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span>ปีผลิตรถยนต์: {car.year}</span>
                        <span>ไมล์วิ่ง: {car.mileage.toLocaleString()} กม.</span>
                      </div>
                      <h4 className="font-display font-extrabold text-[16px] sm:text-[17px] tracking-tight leading-snug line-clamp-1">
                        {car.title}
                      </h4>
                    </div>

                    {/* Short simulated AI opinion box */}
                    <div className="p-3.5 rounded-xl border border-orange-500/10 bg-orange-500/5 text-[11.5px] leading-relaxed relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-3xl bg-orange-500/10 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <div className="text-slate-300 dark:text-slate-350 italic">
                        {car.comment}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline justify-between border-t border-orange-500/5 pt-3.5">
                      <span className="text-[11.5px] font-medium text-slate-500">ประมาณการเงินสด</span>
                      <span className="font-display font-black text-orange-500 text-lg sm:text-xl">฿{car.price.toLocaleString()}</span>
                    </div>

                  </div>
                </div>

                {/* Operations bar mapping view action triggers */}
                <div className="grid grid-cols-2 gap-2 p-4 border-t border-orange-500/5 bg-slate-500/5">
                  <button
                    onClick={() => {
                      setView("car-details", car.id);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-350 dark:border-white/10 hover:bg-orange-500/5 hover:text-orange-500"
                  >
                    <span>เจาะลึกพับลิค</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      const sessionTitle = `นัดคุยเรื่อง ${car.brand} 🤖`;
                      createChatSession(sessionTitle);
                      setView("chat");
                      sendChatMessage(`สวัสดีจ้าน้องเอ! พี่สนใจคุยรายละเอียดตารางผ่อนรถยนต์คันยอดฮิต ${car.title} ปี ${car.year} นะครับ รบกวนช่วยประเมินการต่อรองให้ทีสิ! 🚗`);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-600/15"
                  >
                    <span>ต่อราคากับ AI</span>
                    <Bot className="w-3.5 h-3.5" />
                  </button>
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      </Section>

      {/* 5. BRAND MISSION STATEMENT BANNER */}
      <div className={`p-8 sm:p-12 rounded-3xl border text-center max-w-4xl mx-auto relative overflow-hidden space-y-6 ${
        isDarkMode 
          ? "bg-gradient-to-br from-[#0c0c0e] to-[#121214] border-white/[0.06] text-white" 
          : "bg-white border-slate-200 text-slate-900 shadow-xl"
      }`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-orange-500/5 blur-[50px] pointer-events-none" />
        
        <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center mx-auto text-orange-500">
          <CheckCircle2 className="w-6 h-6 text-orange-500" />
        </div>

        <div className="space-y-2.5 max-w-2xl mx-auto">
          <h3 className="font-display font-black text-xl sm:text-2xl leading-snug">
            "ยกระดับการซื้อขายรถยนต์คู่ AI ให้คล่องตัวสว่างกระจ่างแจ้ง"
          </h3>
          <p className="text-xs sm:text-[13.5px] leading-relaxed text-slate-400">
            ที่บริษัท Nong A เราไม่เพียงเปลี่ยนการซื้อรถให้กลายเป็นความสนุกทางเทคโนโลยี แต่สร้างมาตรฐานและตัวชี้วัดความแม่นยำด้านเอกสาร ประวัติศูนย์บริการ และการรับประกันที่เปิดเผย เพื่อส่งความพึงพอใจแด่พี่ออโต้ทุกคน ปังปุริเย่แน่นอน!
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setView("search")}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 dark:text-orange-500 font-bold text-xs rounded-xl border border-orange-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 mx-auto"
          >
            <span>ไปเปิดค้นหาและคัดกรองรถอัจฉริยะ</span>
            <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
          </button>
        </div>
      </div>

    </div>
  );
}
