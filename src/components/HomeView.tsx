import { useState } from "react";
import { useAppStore } from "../store";
import { useAuth } from "../hooks/auth/useAuth";
import { useRole } from "../hooks/auth/useRole";
import { motion } from "motion/react";
import { 
  Sparkles, Car, MessageSquare, PlusCircle, Search, 
  Store, Bot, ArrowRight, Upload, Flame, 
  Cpu, RefreshCw, 
  CheckCircle2, ShieldCheck
} from "lucide-react";
import { 
  Section, 
  AnimatedCard
} from "./LayoutSystem";
import { queuePendingChatMessage } from "../utils/pendingChatMessage";

export default function HomeView() {
  const { setView } = useAppStore();
  const { isSignedIn } = useAuth();
  const { isDealer, isAdmin } = useRole();
  
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

  const goToFullChat = (pendingMessage?: string) => {
    if (pendingMessage?.trim()) {
      queuePendingChatMessage(pendingMessage);
    }
    setView("chat");
  };

  const goToSellFlow = () => {
    if (!isSignedIn) {
      setView("login");
      return;
    }
    if (isDealer || isAdmin) {
      setView("sell");
      return;
    }
    goToFullChat(
      "สวัสดีน้องเอ ผมต้องการขายรถหรือฝากขายรถ ช่วยแนะนำข้อมูลที่ต้องเตรียม และช่วยร่างประกาศขายรถให้หน่อยครับ"
    );
  };

  return (
    <div
      id="home-landing-root"
      className="space-y-16 sm:space-y-24 pb-20 overflow-hidden relative"
      data-testid="home-landing"
    >
      
      {/* Chat First welcome — not full ChatContainer (that is only on /chat) */}
      <section
        id="home-landing-hero"
        data-testid="home-landing-hero"
        className="relative text-center space-y-8 pt-6 sm:pt-12"
      >
        {/* Ambient background light circle */}
        <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-[350px] rounded-full bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-red-600/5 blur-[120px] pointer-events-none -z-10" />

        {/* Highlight Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11.5px] font-mono font-extrabold tracking-widest uppercase bg-orange-500/10 text-orange-500 border border-orange-500/15 animate-bounce">
          <Sparkles className="w-3.5 h-3.5 fill-current text-orange-500" />
          <span>Nong A by NongBot v2.8 PRO</span>
        </div>

        {/* Welcome hero — shown on "/" only; full chat UI is on /chat */}
        <div className="space-y-5 max-w-3xl mx-auto">
          <h1
            className="font-display font-black text-3xl sm:text-5xl tracking-tight leading-[1.15] nonga-text-primary"
          >
            <span className="block">คุยรถยนต์สับๆ กับ</span>
            <span className="relative inline-block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-red-500">
              น้องเอ
              <span className="absolute left-0 bottom-1 w-full h-[3px] bg-gradient-to-r from-orange-500 to-red-500 rounded-full opacity-60" />
            </span>
          </h1>

          <p
            className="text-base sm:text-lg font-sans max-w-2xl mx-auto leading-relaxed nonga-text-secondary"
          >
            สวัสดีครับ ผมคือน้องเอ อยากซื้อรถแบบไหน บอกงบ รุ่น หรือการใช้งานมาได้เลยครับ
            — ค้นหารถในตลาดและปรึกษาได้ทันทีโดยไม่ต้องล็อกอิน
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto">
          <button
            type="button"
            data-testid="home-cta-start-chat"
            onClick={() => goToFullChat()}
            className="w-full sm:w-auto px-8 py-4 nonga-action nonga-focus-ring font-black text-base sm:text-lg rounded-2xl shadow-lg shadow-orange-600/25 hover:shadow-orange-600/40 hover:scale-[1.02] transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
            <span>เริ่มคุยกับน้องเอ</span>
          </button>

          <button
            type="button"
            data-testid="home-cta-marketplace"
            onClick={() => setView("marketplace")}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm sm:text-base border nonga-border nonga-bg-surface nonga-text-primary hover:border-orange-500/40 nonga-menu-item nonga-focus-ring transition-all flex items-center justify-center gap-2 cursor-pointer" 
          >
            <Car className="w-5 h-5 text-orange-500" />
            <span>ไปที่ตลาดรถ</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() =>
              goToFullChat(
                "สวัสดีน้องเอ ผมต้องการซื้อรถ ช่วยถามงบประมาณ ไลฟ์สไตล์ และแนะนำประเภทรถที่เหมาะกับผมหน่อยครับ"
              )
            }
            className="group text-left p-5 rounded-3xl border nonga-border nonga-bg-surface nonga-text-primary shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.99] hover:border-orange-500/35 nonga-focus-ring" 
          >
            <div className="flex items-start gap-3">
              <span className="h-11 w-11 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5" />
              </span>
              <span className="space-y-1.5">
                <span className="block font-display font-black text-base">ฉันต้องการซื้อรถ</span>
                <span className="block text-xs leading-relaxed nonga-text-muted">
                  ให้น้องเอช่วยถามงบ ไลฟ์สไตล์ และแนะนำรถที่เหมาะกับคุณ
                </span>
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={goToSellFlow}
            className="group text-left p-5 rounded-3xl border nonga-border nonga-bg-surface nonga-text-primary shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.99] hover:border-orange-500/35 nonga-focus-ring" 
          >
            <div className="flex items-start gap-3">
              <span className="h-11 w-11 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
                <PlusCircle className="w-5 h-5" />
              </span>
              <span className="space-y-1.5">
                <span className="block font-display font-black text-base">ฉันต้องการขายรถ / ฝากขายรถ</span>
                <span className="block text-xs leading-relaxed nonga-text-muted">
                  เริ่มคุยเพื่อเตรียมข้อมูลรถ รูปภาพ และร่างประกาศขาย
                </span>
              </span>
            </div>
          </button>
        </div>

        {/* Sub CTA shortcut */}
        <button 
          onClick={() => setView("search")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold nonga-link-accent transition-colors"
        >
          <span>หรือเปิดค้นหารถละเอียดระบุพิกัดเกรดอัจฉริยะ</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
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
              
              <h3 className="font-display font-extrabold text-lg sm:text-xl leading-tight nonga-text-primary">
                จำลองการส่งใบสมัครขอวิเคราะห์รถครอบครัวคันเด็ดของคุณ
              </h3>
              
              <p className="text-xs nonga-text-muted leading-relaxed sm:text-sm">
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
                    : "border nonga-border nonga-bg-surface shadow-sm"
                }`}
              >
                <div className="aspect-video relative rounded-lg bg-black overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=200" alt="Family SUV" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition duration-300"></div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold block">Honda CR-V 2.4 EL</span>
                  <span className="text-[9.5px] nonga-text-muted block">วิ่ง 45,000 กม. เกรดบ้าน A+</span>
                </div>
              </button>

              <button 
                onClick={() => handleSimulatorUpload("https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=600", "BMW 3 Series M-Sport ปี 2020")}
                className={`relative group overflow-hidden rounded-2xl border text-left p-3.5 space-y-2.5 transition active:scale-95 ${
                  simulatorCarPhoto === "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=600"
                    ? "border-orange-500 bg-orange-500/10" 
                    : "border nonga-border nonga-bg-surface shadow-sm"
                }`}
              >
                <div className="aspect-video relative rounded-lg bg-black overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=200" alt="Euro Coupe" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition duration-300"></div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold block">BMW 3 Series M-Sport</span>
                  <span className="text-[9.5px] nonga-text-muted block">วิ่ง 58,000 กม. กุญแจครบ 2 ดอก</span>
                </div>
              </button>
            </div>

            {/* Navigation links direct help */}
            <div className="space-y-3.5 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 text-left">
              <span className="text-[10px] font-bold tracking-widest nonga-text-primary flex items-center gap-1.5 uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500 animate-pulse" /> ตรวจสอบสเป็คของจริง
              </span>
              <p className="text-[11px] leading-relaxed nonga-text-muted text-balance">
                การลงประกาศใช้ได้เฉพาะบัญชีดีลเลอร์ที่ได้รับสิทธิ์และเข้าสู่ระบบแล้ว ขณะนี้ยังไม่เปิดรับสมัครสาธารณะ
              </p>
              <button 
                onClick={() => setView("sell")}
                className="w-full py-2.5 px-3 nonga-action nonga-focus-ring rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition text-center leading-snug"
              >
                <span>ไปยังพื้นที่ลงประกาศสำหรับดีลเลอร์</span>
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
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
              <p className="text-xs nonga-text-muted leading-relaxed sm:text-sm">
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
              <p className="text-xs nonga-text-muted leading-relaxed sm:text-sm">
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
              <p className="text-xs nonga-text-muted leading-relaxed sm:text-sm">
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
              <p className="text-xs nonga-text-muted leading-relaxed sm:text-sm">
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
              <p className="text-xs nonga-text-muted leading-relaxed sm:text-sm">
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
              <p className="text-xs nonga-text-muted leading-relaxed sm:text-sm">
                สกัดความคุ้มค่า อัตราเร่ง สัมประสิทธิ์ความปลอดภัยของแบตเตอรี่รถยนต์ EV และประวัติการบำรุงรักษาอย่างมีตรรกะระดับวิทยาศาสตร์คณิตศาสตร์
              </p>
            </div>
          </AnimatedCard>

        </div>
      </Section>

      {/* 4. BRAND MISSION STATEMENT BANNER */}
      <div className="p-8 sm:p-12 rounded-3xl border nonga-border nonga-bg-surface nonga-text-primary text-center max-w-4xl mx-auto relative overflow-hidden space-y-6 shadow-xl">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-orange-500/5 blur-[50px] pointer-events-none" />
        
        <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center mx-auto text-orange-500">
          <CheckCircle2 className="w-6 h-6 text-orange-500" />
        </div>

        <div className="space-y-2.5 max-w-2xl mx-auto">
          <h3 className="font-display font-black text-xl sm:text-2xl leading-snug">
            "ยกระดับการซื้อขายรถยนต์คู่ AI ให้คล่องตัวสว่างกระจ่างแจ้ง"
          </h3>
          <p className="text-xs sm:text-[13.5px] leading-relaxed nonga-text-muted">
            ที่บริษัท Nong A เราไม่เพียงเปลี่ยนการซื้อรถให้กลายเป็นความสนุกทางเทคโนโลยี แต่สร้างมาตรฐานและตัวชี้วัดความแม่นยำด้านเอกสาร ประวัติศูนย์บริการ และการรับประกันที่เปิดเผย เพื่อส่งความพึงพอใจแด่พี่ออโต้ทุกคน ปังปุริเย่แน่นอน!
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setView("search")}
            className="px-6 py-3 nonga-bg-subtle nonga-link-accent font-bold text-xs rounded-xl border border-orange-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 mx-auto nonga-focus-ring"
          >
            <span>ไปเปิดค้นหาและคัดกรองรถอัจฉริยะ</span>
            <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
          </button>
        </div>
      </div>

    </div>
  );
}
