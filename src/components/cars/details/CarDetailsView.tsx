import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../../../store";
import { 
  ArrowLeft, Heart, Share2, Sparkles, MessageSquare, ShieldCheck, 
  MapPin, HelpCircle, Smartphone, Eye, Calendar, Award 
} from "lucide-react";
import HeroGallery from "../../gallery/HeroGallery";
import AIDynamicAnalysis from "./AIDynamicAnalysis";
import SpecificationsList from "./SpecificationsList";
import SellerCard from "./SellerCard";
import FinancingCalculator from "./FinancingCalculator";
import CommentsSection from "./CommentsSection";
import ShareModal from "./ShareModal";
import InquireModal from "./InquireModal";
import { Car, CarComment } from "../../../types";
import {
  getListingGalleryImages,
  getListingPrimaryImage,
  LISTING_PLACEHOLDER_IMAGE,
} from "../../../utils/listingImages";
import ListingDescription from "../../listings/ListingDescription";
import BuyerFriendlyListingCopyDetailSection from "../../listings/BuyerFriendlyListingCopyDetailSection";
import { submitListingReport, type ListingReportReason } from "../../../services/listings/listingReportApi";
import { useAuth } from "../../../hooks/auth/useAuth";
import { evaluateBuyerFriendlyCopyPreviewGate } from "../../../config/buyerFriendlyCopyPreviewGate";
import { carToBuyerFriendlyListingInput } from "../../../utils/carToBuyerFriendlyListingInput";
import { buildBuyerFriendlyListingCopy } from "../../../utils/buyerFriendlyListingCopy";

export default function CarDetailsView() {
  const { 
    cars, 
    fetchCars,
    isLoadingCars,
    carsLoadState,
    selectedCarId, 
    setView, 
    toggleFavorite, 
    favorites, 
    createChatSession, 
    sendChatMessage,
    isDarkMode 
  } = useAppStore();

  const [shareOpen, setShareOpen] = useState(false);
  const [inquireOpen, setInquireOpen] = useState(false);
  const { isSignedIn, user } = useAuth();
  
  // Local comments state that seeds from localStorage to guarantee seamless local persistence without permissions limits
  const [comments, setComments] = useState<CarComment[]>([]);
  const [isPostingComment, setIsPostingComment] = useState(false);

  // 1. Locate the active car
  const car = useMemo(() => {
    return cars.find((c) => c.id === selectedCarId);
  }, [cars, selectedCarId]);

  const buyerFriendlyPreviewGate = useMemo(
    () =>
      evaluateBuyerFriendlyCopyPreviewGate({
        isSignedIn,
        uid: user?.uid,
      }),
    [isSignedIn, user?.uid]
  );

  const buyerFriendlyPreviewResult = useMemo(() => {
    if (!buyerFriendlyPreviewGate.visible || !car) return null;
    return buildBuyerFriendlyListingCopy(carToBuyerFriendlyListingInput(car));
  }, [buyerFriendlyPreviewGate.visible, car]);

  // 2. SEO/Metadata Optimization - dynamically update page title and description
  useEffect(() => {
    if (car) {
      document.title = `${car.brand} ${car.model} (${car.year}) | พรีเมียมคาร์ Nong A Marketplace`;
      
      // Update meta description safely
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) {
        descMeta.setAttribute("content", `${car.title} - สภาพดีเยี่ยม เลขระยะไมล์ ${car.mileage.toLocaleString()} กม. ดูสเปคเต็มๆ พร้อมระบบคำนวณเค้าโครงและรับการวิเคราะห์ระดับท็อกจาก Nong A AI`);
      }
    }
    return () => {
      document.title = "Nong A AI | แพลตฟอร์มซื้อขายรถยนต์อัจฉริยะ";
    };
  }, [car]);

  // 3. Sync comments on mount
  useEffect(() => {
    if (!selectedCarId) return;
    try {
      const stored = localStorage.getItem("nonga_marketplace_comments");
      if (stored) {
        const parsed = JSON.parse(stored) as CarComment[];
        const filtered = parsed.filter((c) => c.carId === selectedCarId);
        setComments(filtered);
      } else {
        // Mock default if none exist in local storage yet
        const defaults: CarComment[] = [
          {
            id: `comm-default-${selectedCarId}`,
            carId: selectedCarId,
            userId: "guest-user-99",
            userDisplayName: "คุณวิกรม อัครอภินันท์",
            userPhotoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=FormulaSpeed",
            commentText: "สเป็กนี้ราคากำลังดีมากครับ ตรวจสภาพแบตเสื่อมและช่วงล่างผ่านเกณฑ์มาตรฐานดีไหมครับ?",
            createdAt: new Date(Date.now() - 36000000).toISOString()
          }
        ];
        setComments(defaults);
      }
    } catch (e) {
      console.error("Failed to parse comments in client state", e);
    }
  }, [selectedCarId]);

  // 4. Calculate related/similar vehicles
  const similarCars = useMemo(() => {
    if (!car) return [];
    return cars
      .filter((c) => c.id !== car.id)
      .map((c) => {
        let score = 0;
        if (c.brand.toLowerCase() === car.brand.toLowerCase()) score += 5;
        if (c.type === car.type) score += 4;
        if (c.fuelType === car.fuelType) score += 3;
        
        // Price comparison proximity weights
        const priceDiff = Math.abs(c.price - car.price) / car.price;
        if (priceDiff <= 0.15) score += 4;
        else if (priceDiff <= 0.35) score += 2;

        return { car: c, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.car)
      .slice(0, 3); // top 3 recommendations
  }, [car, cars]);

  // 5. Instantly jump to simulated AI Consult interface about this vehicle
  const handleStartAIConsult = () => {
    if (!car) return;
    const sessionTitle = `ถามตอบ ${car.brand} ${car.model} 🤖`;
    createChatSession(sessionTitle);
    setView("chat");
    
    const promptMessage = `ช่วยวิเคราะห์วิจารณ์เชิงลึกรถยนต์คันนี้ให้หน่อยครับพี่เอ: 
- แบรนด์/รุ่น: ${car.brand} ${car.model} (${car.year})
- ตั้งราคาไว้: ฿${car.price.toLocaleString()} บาท 
- ประเภท: ${car.type}
- ระยะทางไมล์: ${car.mileage.toLocaleString()} กม.
- เชื้อเพลิง: ${car.fuelType}
- สภาพตัวเครื่อง: ${car.condition}
ช่วยเจรจาสเป็ก ให้คะแนนภาพรวมของดี ประเมินความคุ้มค่า และใส่ประโยคต้อนรับแซ่บๆ สไตล์ Nong A ด้วยนะคร้าบ!`;
    
    sendChatMessage(promptMessage);
  };

  const reportListing = async () => {
    if (!car) return;
    const raw = window.prompt(
      "เลือกเหตุผลการรายงาน:\n1) ข้อมูลรถไม่ถูกต้อง\n2) รูปไม่ตรงกับรถ/ไม่เหมาะสม\n3) สงสัยหลอกลวง\n4) ประกาศซ้ำ\n5) ติดต่อไม่ได้/ข้อมูลไม่ชัดเจน\n6) อื่น ๆ",
      "1"
    );
    if (!raw) return;
    const reasonMap: Record<string, ListingReportReason> = {
      "1": "incorrect-info",
      "2": "image-mismatch-or-inappropriate",
      "3": "suspected-fraud",
      "4": "duplicate-listing",
      "5": "contact-unreachable-or-unclear",
      "6": "other",
    };
    const reason = reasonMap[raw.trim()];
    if (!reason) {
      alert("กรุณาเลือกเหตุผล 1-6");
      return;
    }
    const note = window.prompt("รายละเอียดเพิ่มเติม (ไม่บังคับ):", "") || "";
    const result = await submitListingReport({
      listingId: car.id,
      reason,
      note,
    });
    if (result.ok) {
      void fetchCars();
    }
    alert(
      result.ok
        ? "ขอบคุณที่ช่วยแจ้งครับ ทีมงานจะตรวจสอบประกาศนี้\nการรายงานเป็นการแจ้งให้ตรวจสอบ ไม่ได้หมายความว่าประกาศผิดทันที"
        : result.message
    );
  };

  // 6. Comments callback logic
  const handleAddNewComment = async (text: string) => {
    if (!selectedCarId) return;
    setIsPostingComment(true);

    try {
      // Simulate small loader
      await new Promise((r) => setTimeout(r, 600));
      
      const newCommentObj: CarComment = {
        id: `comm-${Date.now()}`,
        carId: selectedCarId,
        userId: "guest-user-100",
        userDisplayName: "คุณออโต้ บล็อกเกอร์ (NongBot Guest)",
        userPhotoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=NongBot",
        commentText: text,
        createdAt: new Date().toISOString()
      };

      // update local arrays
      const updatedList = [...comments, newCommentObj];
      setComments(updatedList);

      // synchronize back to localStorage global database
      const stored = localStorage.getItem("nonga_marketplace_comments");
      let allStored: CarComment[] = [];
      if (stored) {
        allStored = JSON.parse(stored) as CarComment[];
      }
      allStored.push(newCommentObj);
      localStorage.setItem("nonga_marketplace_comments", JSON.stringify(allStored));

    } catch (e) {
      console.error(e);
    } finally {
      setIsPostingComment(false);
    }
  };

  useEffect(() => {
    if (!selectedCarId) return;
    if (!car && carsLoadState !== "loading") {
      void fetchCars();
    }
  }, [selectedCarId, car, carsLoadState, fetchCars]);

  if (!car) {
    if (isLoadingCars || carsLoadState === "loading" || carsLoadState === "idle") {
      return (
        <div className="text-center py-24 nonga-text-secondary">
          <HelpCircle className="w-14 h-14 mx-auto mb-4 text-[var(--nonga-action-primary)] animate-pulse" />
          <h3 className="text-lg font-bold nonga-text-primary">กำลังโหลดข้อมูลรถยนต์</h3>
          <p className="text-xs nonga-text-muted mt-1">
            กรุณารอสักครู่ ระบบกำลังดึงข้อมูลล่าสุดจากตลาดรถ
          </p>
        </div>
      );
    }

    if (carsLoadState === "error") {
      return (
        <div className="text-center py-24 nonga-text-secondary">
          <HelpCircle className="w-14 h-14 mx-auto mb-4 text-[var(--nonga-action-primary)]" />
          <h3 className="text-lg font-bold nonga-text-primary">ยังโหลดรายละเอียดรถไม่สำเร็จ</h3>
          <p className="text-xs nonga-text-muted mt-1">
            เครือข่ายอาจขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => void fetchCars()}
              className="px-6 py-2.5 nonga-action font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg nonga-focus-ring"
            >
              ลองโหลดใหม่
            </button>
            <button
              onClick={() => setView("marketplace")}
              className="px-6 py-2.5 nonga-bg-subtle border nonga-border nonga-text-primary font-bold rounded-xl text-xs transition-all cursor-pointer nonga-focus-ring"
            >
              กลับสู่โชว์รูมตลาดรถยนต์
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-24 nonga-text-secondary">
        <HelpCircle className="w-14 h-14 mx-auto mb-4 text-[var(--nonga-action-primary)] animate-bounce" />
        <h3 className="text-lg font-bold nonga-text-primary">ไม่พบข้อมูลรถยนต์ที่คุณตามหา</h3>
        <p className="text-xs nonga-text-muted mt-1">
          ลิงก์อาจไม่ถูกต้อง หรือประกาศอาจไม่มีอยู่แล้วในรายการล่าสุด
        </p>
        <button 
          onClick={() => setView("marketplace")}
          className="mt-6 px-6 py-2.5 nonga-action font-bold rounded-xl text-xs hover:scale-103 active:scale-97 transition-all cursor-pointer shadow-lg nonga-focus-ring"
        >
          กลับสู่โชว์รูมตลาดรถยนต์
        </button>
      </div>
    );
  }

  const isFav = favorites.includes(car.id);
  const galleryImages = getListingGalleryImages(car.images, car.id);
  const hasOnlyPlaceholderImages =
    galleryImages.length === 0 ||
    galleryImages.every((url) => url === LISTING_PLACEHOLDER_IMAGE);
  
  // Construct parameters for sharing links
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const shareUrls = {
    copy: `${origin}/#details/${car.id}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${origin}/#details/${car.id}`)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(`${origin}/#details/${car.id}`)}&text=${encodeURIComponent(`เช็คพรีเมียมคาร์คันนี้ที่หน้าโชว์รูม Nong A AI: ${car.title}`)}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(`${origin}/#details/${car.id}`)}`
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 text-left">
      
      {/* 1. Upper Breadcrumbs Control Toolbar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setView("marketplace")}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-102 active:scale-98 cursor-pointer nonga-bg-subtle border nonga-border nonga-text-secondary hover:text-[var(--nonga-text-primary)] nonga-focus-ring"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--nonga-action-primary)]" />
          <span>ย้อนกลับไปตลาดรถยนต์</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Share Trigger */}
          <button
            onClick={() => setShareOpen(true)}
            className="p-2.5 rounded-xl nonga-bg-subtle border nonga-border nonga-text-secondary hover:text-[var(--nonga-text-primary)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1 text-xs nonga-focus-ring"
            title="แชร์ลิงก์"
          >
            <Share2 className="w-4 h-4 text-[var(--nonga-action-primary)]" />
            <span className="hidden sm:inline">แชร์รายละเอียด</span>
          </button>

          {/* Favorite Toggle */}
          <button
            onClick={() => toggleFavorite(car.id)}
            className={`p-2.5 rounded-xl border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs nonga-focus-ring ${
              isFav 
                ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20" 
                : "nonga-bg-subtle nonga-border nonga-text-secondary hover:text-[var(--nonga-text-primary)]"
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-current animate-pulse text-white" : "text-[var(--nonga-action-primary)]"}`} />
            <span>{isFav ? "บันทึกแล้ว" : "บันทึกคันนี้"}</span>
          </button>
          <button
            onClick={() => void reportListing()}
            className="p-2.5 rounded-xl border nonga-border nonga-text-secondary hover:text-[var(--nonga-action-primary)] transition-all text-xs nonga-focus-ring"
            title="รายงานประกาศ"
          >
            รายงานประกาศ
          </button>
        </div>
      </div>

      {/* 2. Hero Interactive Media Showcase */}
      <section className="w-full">
        {hasOnlyPlaceholderImages && (
          <div className="mb-3 rounded-xl border border-amber-600/40 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-200 font-medium">
            รูปภาพรายการนี้ยังโหลดไม่ได้หรือยังไม่เปิดสิทธิ์ลิงก์สาธารณะ ระบบจึงใช้รูปสำรองชั่วคราว
          </div>
        )}
        <HeroGallery 
          images={galleryImages}
          title={car.title} 
          brand={car.brand} 
          isEv={car.type === "ev" || car.fuelType?.includes("electric")}
        />
      </section>

      {/* 3. Main Multi-column content layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* LEFT COLUMN: Deep Product Details, spec listings, AI Analysis, Financing, comments (col-span-8) */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          
          {/* Main Title & Price card (for mobile/tablet it is prominent) */}
          <div className="p-5 sm:p-7 rounded-3xl border text-left space-y-4 nonga-bg-surface nonga-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono tracking-widest font-black text-[var(--nonga-action-primary)] uppercase">
                  {car.brand} • PLATINUM AUTO CHOICE
                </span>
                <h1 className="font-display font-black text-xl sm:text-2xl nonga-text-primary tracking-tight leading-snug">
                  {car.title}
                </h1>
                <div className="flex items-center gap-4 text-xs nonga-text-secondary">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[var(--nonga-action-primary)]" /> ปีจดทะเบียน {car.year}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-[var(--nonga-action-primary)]" /> ยอดเข้าชม 412 ครั้ง
                  </span>
                </div>
              </div>

              {/* Price callout accent badge */}
              <div className="p-4 rounded-2xl bg-[color-mix(in_srgb,var(--nonga-brand)_10%,var(--nonga-bg-surface))] border border-orange-500/25 text-left sm:text-right self-start sm:self-auto min-w-[200px] shadow-inner">
                <span className="text-[10px] nonga-text-muted uppercase leading-none block font-semibold mb-0.5">ราคาขายสุทธิ (Net Price)</span>
                <span className="font-mono font-black text-2xl sm:text-3xl text-[var(--nonga-action-primary)]">฿{car.price.toLocaleString()}</span>
                <span className="text-[9px] nonga-text-muted block mt-1">ผ่อนเริ่มต้นเพียง ฿{Math.round(car.price / 160).toLocaleString()} บ./เดือน*</span>
              </div>
            </div>

            <div className="border-t nonga-border pt-4 sm:pt-5">
              <h2 className="text-[10px] font-bold uppercase tracking-widest nonga-text-muted mb-3">
                รายละเอียดประกาศ
              </h2>
              <ListingDescription
                text={car.description}
                variant="full"
                tone={isDarkMode ? "dark" : "light"}
                fallback={
                  <p
                    className={`text-sm leading-[1.75] ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    รถยนต์คัดสภาพพิเศษผ่านการตรวจเช็คสภาพเครื่องยนต์ ตัวถัง ช่วงล่าง อะไหล่ และระบบประจุไฟฟ้ารวมกว่า 200 รายการพร้อมใช้งานทันใจ เล่มทะเบียนครบบริบูรณ์ มั่นใจร้อยเปอร์เซ็นต์คร้าบ!
                  </p>
                }
              />

              <BuyerFriendlyListingCopyDetailSection
                gate={buyerFriendlyPreviewGate}
                result={buyerFriendlyPreviewResult}
                tone={isDarkMode ? "dark" : "light"}
              />
            </div>
          </div>

          {/* AI Car insights panel */}
          <section id="ai-analysis" className="scroll-mt-6">
            <AIDynamicAnalysis car={car} isDarkMode={isDarkMode} />
          </section>

          {/* Technical Specifications specifications panel */}
          <section id="specifications" className="scroll-mt-6">
            <SpecificationsList car={car} isDarkMode={isDarkMode} />
          </section>

          {/* Financing visual calculator panel */}
          <section id="financing" className="scroll-mt-6">
            <FinancingCalculator car={car} isDarkMode={isDarkMode} />
          </section>

          {/* Comments and QA discussion */}
          <section id="comments" className="scroll-mt-6">
            <CommentsSection 
              comments={comments} 
              isPosting={isPostingComment} 
              onAddComment={handleAddNewComment} 
              isDarkMode={isDarkMode}
            />
          </section>

        </div>

        {/* RIGHT COLUMN: Sticky Workspace, dealer widget, Contact CTAs (col-span-4) */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
          
          {/* Quick contact side widget */}
          <SellerCard 
            car={car} 
            isDarkMode={isDarkMode}
            onContactClick={() => setInquireOpen(true)}
            onStartChat={handleStartAIConsult}
          />

          {/* Chat with AI side prompt */}
          <div className="p-5 rounded-3xl nonga-bg-elevated border nonga-border text-left space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-orange-600/10 text-[var(--nonga-action-primary)] shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left space-y-0.5">
                <h4 className="font-display font-black text-sm text-[var(--nonga-action-primary)]">ที่ปรึกษารถยนต์ Nong A AI</h4>
                <p className="text-[11.5px] nonga-text-secondary font-sans leading-normal">
                  ต้องการต่อรองราคากลาง, ขอนัดดูสภาพตัวถังรถจริงในพื้นที่พัทยา หรือวิเคราะห์ความจุแบตเตอรี่แบบคุยมิตรภาพใช่หรือไม่? เริ่มพูดคุยด่วนคร้าบ!
                </p>
              </div>
            </div>
            
            <button
              onClick={handleStartAIConsult}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3 nonga-action font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-orange-650/10 transition-all select-none cursor-pointer active:scale-97 nonga-focus-ring"
            >
              <MessageSquare className="w-4 h-4 animate-shake" />
              <span>เริ่มคุยปรึกษา Nong A ด่วนคร้าบ 💬</span>
            </button>
          </div>

          {/* Safety advice and guarantees badge block */}
          <div className="p-4.5 rounded-2xl nonga-bg-subtle border border-orange-500/15 text-left text-[11px] nonga-text-secondary space-y-2">
            <div className="flex items-center gap-1 nonga-text-primary font-bold">
              <Award className="w-4 h-4 text-[var(--nonga-action-primary)]" />
              <span>เกณฑ์วานรันตีความปลอดภัยสากล:</span>
            </div>
            <p className="leading-relaxed font-sans nonga-text-secondary">
              เพื่อประโยชน์และความสุขสูงสุดของท่านสมาชิกทุกท่าน แนะนำนัดทดลองขับและประสานเช็คข้อมูลเอกสาร ณ สถานที่ปลอดภัยหรือพื้นที่โชว์รูมดีลเลอร์พันธมิตร ไม่แนะนำโอนเงินมัดจำล่วงหน้าเด็ดขาดคร้าบ!
            </p>
          </div>

        </div>

      </div>

      {/* 4. Similar cars - horizontal recommendation slider */}
      {similarCars.length > 0 && (
        <section className="space-y-4 pt-10 border-t nonga-border">
          <div className="flex justify-between items-end">
            <div className="text-left">
              <span className="text-[10px] bg-orange-600/10 text-[var(--nonga-action-primary)] font-bold px-2 py-0.5 rounded uppercase tracking-widest font-mono">
                Matching Recommendations
              </span>
              <h3 className="font-display font-black text-lg nonga-text-primary mt-1.5">รถยนต์อื่นที่ใกล้เคียงกันที่คุณอาจสนใจ</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {similarCars.map((sim) => (
              <div
                key={sim.id}
                onClick={() => setView("car-details", sim.id)}
                className="group cursor-pointer rounded-2xl overflow-hidden border nonga-border nonga-bg-surface hover:border-orange-500/30 transition-all flex flex-col h-full nonga-focus-ring"
              >
                {/* Image */}
                <div className="aspect-video relative overflow-hidden nonga-bg-subtle">
                  <img
                    src={getListingPrimaryImage(sim)}
                    alt={sim.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-2.5 left-2.5 py-0.5 px-2.5 rounded-lg text-[9px] font-bold bg-black/60 text-orange-300 border border-orange-500/20 uppercase font-mono">
                    {sim.fuelType?.toUpperCase() || "ELECTRIC"}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 text-left flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-[9px] nonga-text-muted font-mono font-bold uppercase">{sim.brand} • {sim.year}</span>
                    <h4 className="font-bold text-xs nonga-text-primary line-clamp-1 group-hover:text-[var(--nonga-action-primary)] transition-colors">
                      {sim.title}
                    </h4>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t nonga-border">
                    <div className="text-left leading-none">
                      <span className="text-[9px] nonga-text-muted block mb-0.5">ราคาตลาด</span>
                      <span className="font-mono font-black text-xs text-[var(--nonga-action-primary)]">฿{sim.price.toLocaleString()}</span>
                    </div>
                    <span className="text-[9.5px] font-mono nonga-text-secondary">
                      🧭 8.2k กม.
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Portal Modals Overlay */}
      <ShareModal 
        isOpen={shareOpen} 
        onClose={() => setShareOpen(false)} 
        shareUrls={shareUrls} 
        isDarkMode={isDarkMode} 
      />

      <InquireModal 
        isOpen={inquireOpen} 
        onClose={() => setInquireOpen(false)} 
        car={car} 
        isDarkMode={isDarkMode} 
      />

    </div>
  );
}
