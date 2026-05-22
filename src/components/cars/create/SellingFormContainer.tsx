import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "../../../store";
import { CarsService } from "../../../services/cars";
import { carSellingFormSchema } from "../../../validators/carForm";
import ImageUploadStep from "./ImageUploadStep";
import BasicInfoStep from "./BasicInfoStep";
import SpecsStep from "./SpecsStep";
import PricingStep from "./PricingStep";
import DescriptionStep from "./DescriptionStep";
import ContactStep from "./ContactStep";
import PreviewPublishStep from "./PreviewPublishStep";
import CarPostStyleSelector from "./CarPostStyleSelector";
import CarPostRegenerateActions from "./CarPostRegenerateActions";
import {
  CarPostStyle,
  DEFAULT_CAR_POST_STYLE,
} from "../../../services/ai/post-generator/postStyle";
import { CarPostRegenerateMode } from "../../../services/ai/post-generator/regenerateStyle";
import { buildAIDescriptionContext } from "../../../services/ai/post-generator/generatorService";
import type { CarMarketingInput } from "../../../services/ai/post-generator/marketingBrain";
import { safeRemoveItem, safeSetItem } from "../../../utils/safeLocalStorage";
import {
  sanitizeGalleryForStorage,
  serializeSellingFormDraft,
  buildMarketplaceApiCarPayload,
  assertApiPayloadWithinLimit,
  logDevPayloadSize,
} from "../../../utils/listingImageStorage";
import { inferMarketplaceCategoryType } from "../../../utils/marketplaceCarMapper";

const DESC_REGENERATE_COOLDOWN_MS = 1200;
import { Check, Sparkles, AlertCircle, RefreshCcw, ArrowRight, ArrowLeft, Send, MessageSquare, Clock, Star, BrainCircuit } from "lucide-react";

interface SellingFormContainerProps {
  onSuccess: () => void;
  isDarkMode?: boolean;
}

const LOCAL_STORAGE_KEY = "nong_a_car_selling_form_draft";

const STEPS_TITLES = [
  "อัปโหลดรูปภาพ 📸",
  "ข้อมูลรถหลัก 🏎️",
  "สเปกเครื่องยนต์ ⚙️",
  "ประเมินราคาขาย 🪙",
  "บรรยายจุดขาย 🖊️",
  "ช่องทางติดต่อ 📞",
  "พรีวิวขึ้นแผง 📋",
];

export default function SellingFormContainer({
  onSuccess,
  isDarkMode = true,
}: SellingFormContainerProps) {
  // Grab state from Zustand AppStore
  const { user, generateAIDescription, fetchCars, setView, setFilters } =
    useAppStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [hasDraftToRecover, setHasDraftToRecover] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("พร้อมจัดเก็บแบบร่าง");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postStyle, setPostStyle] = useState<CarPostStyle>(DEFAULT_CAR_POST_STYLE);
  const [isDescRegenerating, setIsDescRegenerating] = useState(false);
  const [activeDescRegenMode, setActiveDescRegenMode] =
    useState<CarPostRegenerateMode | null>(null);
  const descRegenCooldownRef = useRef(0);
  const [publishSuccess, setPublishSuccess] = useState<{
    title: string;
    id?: string;
  } | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    province: "กรุงเทพมหานคร",
    mileage: 0,
    bodyType: "SUV (รถอเนกประสงค์ขนาดใหญ่/เล็ก)",
    transmission: "auto" as "auto" | "manual" | "other",
    fuelType: "electric" as "electric" | "hybrid" | "plug-in-hybrid" | "petrol" | "diesel" | "other",
    color: "",
    condition: "excellent" as "new" | "used" | "excellent" | "good" | "fair",
    price: 0,
    negotiable: true,
    description: "",
    features: [] as string[],
    tags: [] as string[],
    images: [] as string[],
    coverImage: "",
    contactName: user?.displayName || "คุณสมเกียรติ มั่นคง",
    contactPhone: "",
    contactEmail: user?.email || "",
    sellerType: "private" as "private" | "dealer" | "agent",
    dealerId: "",
  });

  // Check on Mount if there's a recoverrable draft
  useEffect(() => {
    const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Ensure valid structure
        if (parsed.brand || parsed.images?.length > 0) {
          setHasDraftToRecover(true);
        }
      } catch (err) {
        console.warn("Stale draft storage wiped:", err);
      }
    }
  }, []);

  // Set up Autosave on form changes
  useEffect(() => {
    // Only save if user has filled at least some progress to avoid blank drafts overwriting beautiful ones
    if (formData.brand || formData.images.length > 0 || formData.price > 0) {
      const timeout = setTimeout(() => {
        setAutosaveStatus("กำลังบันทึกแบบร่าง...");
        const draftPayload = serializeSellingFormDraft(formData);
        const draftResult = safeSetItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(draftPayload)
        );

        const now = new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        if (draftResult.ok === false) {
          setAutosaveStatus(
            draftResult.reason === "quota"
              ? "แบบร่างไม่ถูกบันทึก (พื้นที่เต็ม) — รูปยังอยู่ในหน้านี้"
              : draftResult.message
          );
        } else {
          setAutosaveStatus(`เซฟล่าสุดเมื่อ ${now}`);
        }
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [formData]);

  // Handle manual recover trigger
  const handleRecoverDraft = () => {
    const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(parsed);
        showToast("กู้คืนข้อมูลแบบร่างเสนอล่าสุดของคุณเรียบร้อยแล้วครับ! 🧡🎉");
      } catch (err) {
        console.error("Critical draft recovery mismatch:", err);
      }
    }
    setHasDraftToRecover(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setHasDraftToRecover(false);
    showToast("ยกเลิกและล้างแบบร่างรถโมเดลเก่าออกเรียบร้อย");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Helper validation filter
  const runValidation = (): boolean => {
    const result = carSellingFormSchema.safeParse(formData);
    if (!result.success) {
      const formattedErrors = result.error.issues.map((err) => `${err.message}`);
      setValidationErrors(formattedErrors);
      return false;
    }
    setValidationErrors([]);
    return true;
  };

  // Continuous background checker to warn users of specs incomplete
  useEffect(() => {
    runValidation();
  }, [formData]);

  const handleStepNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleStepPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePublishListing = async () => {
    const isValid = runValidation();
    if (!isValid) {
      showToast("❌ ข้อมูลไม่ครบเกณฑ์มาตรฐาน คลี่ลงแผงพรีวิวเพื่อตรวจเช็คจุดผิดพลาดสีแดงด้านล่างสุดได้เลยครับ!");
      setCurrentStep(6); // Forward immediately to review errors
      return;
    }

    setIsSubmitting(true);
    try {
      const { coverImage, gallery } = sanitizeGalleryForStorage(
        formData.images,
        formData.coverImage
      );

      const payload = {
        title: `${formData.brand} ${formData.model} ปี ${formData.year}`,
        slug: `${formData.brand.toLowerCase()}-${formData.model.toLowerCase()}-${Date.now()}`.replace(/\s+/g, "-"),
        brand: formData.brand,
        model: formData.model,
        year: formData.year,
        province: formData.province,
        mileage: formData.mileage,
        bodyType: formData.bodyType,
        transmission: formData.transmission,
        fuelType: formData.fuelType,
        color: formData.color,
        condition: formData.condition,
        price: formData.price,
        negotiable: formData.negotiable,
        description: formData.description,
        features: formData.features,
        tags: formData.tags,
        coverImage,
        gallery,
        sellerId: user?.uid || "mock_seller_uid",
        sellerType: formData.sellerType,
        dealerId: formData.dealerId || undefined,
        status: "approved" as const,
        featured: false,
        boosted: false,
        aiGenerated: true,
      };

      const listingType = inferMarketplaceCategoryType({
        fuelType: payload.fuelType,
        bodyType: formData.bodyType,
        condition: payload.condition,
        price: payload.price,
      });

      const apiBody = buildMarketplaceApiCarPayload({
        title: payload.title,
        brand: payload.brand,
        model: payload.model,
        year: payload.year,
        price: payload.price,
        type: listingType,
        condition: payload.condition,
        mileage: payload.mileage,
        fuelType: payload.fuelType,
        images: formData.images,
        coverImage,
        description: payload.description,
        ownerId: payload.sellerId,
        ownerName: formData.contactName,
        ownerPhone: formData.contactPhone,
      });

      logDevPayloadSize("POST /api/cars", apiBody);

      const sizeCheck = assertApiPayloadWithinLimit(apiBody);
      if (sizeCheck.ok === false) {
        throw new Error(sizeCheck.message);
      }

      const apiRes = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiBody),
      });

      if (!apiRes.ok) {
        if (apiRes.status === 413) {
          throw new Error("ข้อมูลรูปภาพใหญ่เกินไป กรุณาลองใหม่อีกครั้ง");
        }
        throw new Error(`ไม่สามารถเพิ่มรถในตลาดได้ (${apiRes.status})`);
      }

      const apiJson = await apiRes.json();
      const apiListingId = apiJson?.data?.id as string | undefined;

      await fetchCars();

      try {
        await CarsService.createCar(
          user?.uid || "mock_seller_uid",
          user?.role || "private",
          payload
        );
      } catch (localErr) {
        console.warn("Local dealer backup save skipped:", localErr);
      }

      safeRemoveItem(LOCAL_STORAGE_KEY);
      setPublishSuccess({
        title: payload.title,
        id: apiListingId,
      });
    } catch (err: any) {
      console.error(err);
      let errorMsg = "มีข้อผิดพลาดบางประการในการส่งข้อมูจขึ้นโชว์รูมครับ";
      if (err.message) {
        try {
          const parsedErr = JSON.parse(err.message);
          if (parsedErr.message) errorMsg = parsedErr.message;
        } catch (_) {
          errorMsg = err.message;
        }
      }
      showToast(`❌ ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFields = (next: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...next }));
  };

  const buildMarketingInputFromForm = useCallback(
    (userNotes?: string): CarMarketingInput => ({
      brand: formData.brand,
      model: formData.model,
      year: formData.year,
      price: formData.price,
      mileage: formData.mileage,
      condition: formData.condition,
      fuelType: formData.fuelType,
      color: formData.color,
      province: formData.province,
      highlights: userNotes || formData.description || undefined,
      modifications: formData.modifications,
    }),
    [formData]
  );

  /** ห่อ generateAIDescription — แนบ Marketing Brain + Post Style (+ Regenerate) ใน customNotes */
  const generateAIDescriptionWithStyle = async (
    details: {
      brand: string;
      model: string;
      year: number;
      price: number;
      type: string;
      condition: string;
      mileage: number;
      fuelType: string;
      customNotes?: string;
    },
    regenerateMode?: CarPostRegenerateMode | null
  ) => {
    const marketingInput = buildMarketingInputFromForm(details.customNotes);
    const enrichedNotes = buildAIDescriptionContext(
      marketingInput,
      postStyle,
      details.customNotes,
      regenerateMode
    );
    return generateAIDescription({
      ...details,
      customNotes: enrichedNotes,
    });
  };

  /** Regenerate คำบรรยายโพสต์ — reuse ข้อมูลฟอร์ม + brain + style */
  const handleRegenerateDescription = useCallback(
    async (mode: CarPostRegenerateMode) => {
      if (!formData.brand || !formData.model) return;
      const now = Date.now();
      if (now - descRegenCooldownRef.current < DESC_REGENERATE_COOLDOWN_MS) return;
      if (isDescRegenerating) return;

      descRegenCooldownRef.current = now;
      setIsDescRegenerating(true);
      setActiveDescRegenMode(mode);

      try {
        const text = await generateAIDescriptionWithStyle(
          {
            brand: formData.brand,
            model: formData.model,
            year: formData.year,
            price: formData.price,
            type: formData.condition === "new" ? "new" : "used",
            condition: formData.condition,
            mileage: formData.mileage,
            fuelType: formData.fuelType,
            customNotes: formData.description || undefined,
          },
          mode
        );
        updateFields({ description: text });
        showToast("สร้างคำบรรยายแนวใหม่เรียบร้อยครับ! 🎉");
      } catch (e) {
        console.error("Regenerate description failed:", e);
        showToast("❌ สร้างใหม่ไม่สำเร็จ ลองอีกครั้งได้ครับ");
      } finally {
        setIsDescRegenerating(false);
        setActiveDescRegenMode(null);
      }
    },
    [formData, isDescRegenerating, generateAIDescriptionWithStyle]
  );

  // Chatbot Sidebar tip bubble text depends on step
  const getStepAITip = () => {
    switch (currentStep) {
      case 0:
        return {
          header: "น้องเอ แนะนำรูปถ่ายสว่าง ๆ 📸",
          text: "รูปหน้ารถมุมเฉียง 45 องศา จะเป็นรูปเลเวลพรีเมียมที่สุดในการเรียกลำดับคนดูคนจองครับ! ย่อรูปด้วยสเกลอัจฉริยะแบบอัตโนมัติแล้ว สวยปังปุริเย่แน่นอน!",
        };
      case 1:
        return {
          header: "เครื่องมือวิเคราะห์ตลาดออโตแมตเกรด ✨",
          text: "การเลือกหมวดปีจดและชื่อรุ่นที่เป๊ะ จะช่วยให้น้องเอ ดึงราคากลางอ้างอิงและประเมินแบรนด์ได้อย่างโดดเด่น ไร้การโดนดักราคานะครับ!",
        };
      case 2:
        return {
          header: "วิเคราะห์สเปกกำลังม้า ⚙️",
          text: "ถ้าเป็นยานขับเคลื่อนพลังงานสะอาดยาน EV สุขภาพสุขภาพแบต (SOH) และขนาดความจุกิโลวัตต์ชั่วโมง (kWh) จะช่วยให้สหายร่วมห้องประมูลตัดสินใจคุ้มลุยเร็วครับ!",
        };
      case 3:
        return {
          header: "ตรวจวัดราคาสภาพจริง 🪙",
          text: "ราคากลาตลาดแนะนำของน้องมีเกณฑ์วิเคราะห์แบบ Dynamic เรียงตัวถังไว้แล้วครับ ลองใช้ราคาแนะนำจะช่วยเร่งลูกค้าดีลจบโอนไวเป็นสองเท่า!",
        };
      case 4:
        return {
          header: "ลิขิตแคปชั่นพารวยด้วยปัญญาประดิษฐ์ 🖊️",
          text: "เบื่อขี้เกียจเขียนพงศาวดารอธิบายใช่ไหมครับ? พิมพ์จุดเด่น 3 คำแล้วกด 1-Click ให้ น้องเอ AI เขียนแคปชั่นสวยๆ สะเทือนขวัญสหายดีลเลอร์ได้ในพริบตาเดียวคร้าบ!",
        };
      case 5:
        return {
          header: "ความคุ้มครองระบบรักษาความปลอดภัย 📞",
          text: "เบอร์ติดต่อมือถือไทย 10 หลักจะช่วยคัดกรองสแปมบอร์ด และส่งตรงลูกค้าคนสนใจจริงๆ ไปยัง LINE และสายสายตรงของคุณทันที สบายใจร้อยเปอร์เซ็นต์!",
        };
      default:
        return {
          header: "ส่งโพสต์สู่สาธารณะ! 🚀",
          text: "สเปกสมบูรณ์ครบเกรดพรีเมียม! ตรวจคะแนนประเมิน AI Certified ด้านข้างแล้วกดเผยแพร่ เพื่อนำรถเข้าสู่การมองเห็นของลูกค้าหลายหมื่นคนทันทีคร้าบ!",
        };
    }
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
      
      {/* Toast Notification block */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-xl bg-orange-600 text-white font-semibold text-xs shadow-2xl flex items-center gap-2 animate-bounce border border-orange-400">
          <Sparkles className="w-4 h-4 text-white animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {publishSuccess && (
        <div
          role="status"
          className="p-5 rounded-2xl border border-green-500/40 bg-green-500/10 space-y-3 text-left"
        >
          <div className="flex items-start gap-3">
            <Check className="w-6 h-6 text-green-400 shrink-0" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-green-300">
                ประกาศขายลงแผงสำเร็จแล้วครับ!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>{publishSuccess.title}</strong> ถูกบันทึกแล้ว
                {publishSuccess.id ? ` (รหัส: ${publishSuccess.id})` : ""}{" "}
                — รถจะแสดงด้านบนสุดในหน้า <strong>ตลาดรถยนต์</strong> ครับ
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setPublishSuccess(null);
                setFilters({ sortBy: "latest" });
                fetchCars();
                setView("marketplace");
                onSuccess();
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:brightness-105 text-white font-bold rounded-xl text-xs transition"
            >
              ไปดูประกาศในตลาดรถยนต์ →
            </button>
            <button
              type="button"
              onClick={() => setPublishSuccess(null)}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* Recover Draft Banner */}
      {hasDraftToRecover && (
        <div className="p-4 rounded-2xl border bg-orange-550/15 border-orange-500/30 flex flex-col md:flex-row gap-3 items-center justify-between text-left animate-fadeIn">
          <div className="flex gap-2.5 items-center">
            <Clock className="w-5 h-5 text-orange-500 shrink-0 animate-pulse" />
            <div className="space-y-0.5">
              <span className="text-xs font-black block text-orange-400">ตรวจพบแบบร่างเก่า (Saved Draft Recovery)</span>
              <p className="text-[10px] text-slate-300">
                คุณมีข้อมูลกรอกค้างระยุอยู่บนเครื่องโชว์รูมล่าสุด ปรารถนากู้ข้อมูลเดิมพรีเมียมกลับมาเพื่อเขียนต่อไหมครับ?
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRecoverDraft}
              className="px-3.5 py-1.5 bg-orange-550 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition shadow-md shadow-orange-500/10"
            >
              กู้คืนข้อมูลแบบร่าง ⚡
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 font-bold rounded-lg transition"
            >
              ทิ้ง ✕
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Nav Stepper Progress indicator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STEPS_TITLES.map((title, idx) => {
          const isActive = idx === currentStep;
          const isDone = idx < currentStep;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`p-2 rounded-xl text-center border text-[10.5px] font-bold transition-all relative ${
                isActive
                  ? "border-orange-500 bg-orange-500/10 text-orange-400 scale-[1.02] ring-2 ring-orange-500/15"
                  : isDone
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500/70"
                  : "border-white/5 bg-slate-900/30 text-slate-500"
              }`}
            >
              {isDone && (
                <div className="absolute top-1 right-1 bg-emerald-555 text-white rounded-full w-3 h-3 flex items-center justify-center">
                  <span className="text-[8px]">✓</span>
                </div>
              )}
              {title}
            </button>
          );
        })}
      </div>

      {/* Glassmorphism content frame Layout coupled with AI assistant panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Step Controller wrapper */}
        <div className="lg:col-span-3 p-6 sm:p-7.5 rounded-3xl border border-white/10 bg-gradient-to-br from-[#121216] to-[#0b0b0d] backdrop-blur-md shadow-2xl relative">
          
          <div className="absolute top-4 right-4 text-[9.5px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{autosaveStatus}</span>
          </div>

          <div className="min-h-[360px] flex flex-col justify-between">
            {/* Step Inner views router */}
            <div className="flex-1 pb-6">
              {currentStep === 0 && (
                <ImageUploadStep
                  images={formData.images}
                  coverImage={formData.coverImage}
                  onChange={(imgs, cover) => updateFields({ images: imgs, coverImage: cover })}
                  isDarkMode={isDarkMode}
                />
              )}

              {currentStep === 1 && (
                <BasicInfoStep
                  brand={formData.brand}
                  model={formData.model}
                  year={formData.year}
                  province={formData.province}
                  onChange={(fields) => updateFields(fields)}
                  isDarkMode={isDarkMode}
                />
              )}

              {currentStep === 2 && (
                <SpecsStep
                  mileage={formData.mileage}
                  bodyType={formData.bodyType}
                  transmission={formData.transmission}
                  fuelType={formData.fuelType}
                  color={formData.color}
                  condition={formData.condition}
                  generation={formData.generation || ""}
                  engineSize={formData.engineSize || ""}
                  drivetrain={formData.drivetrain || ""}
                  onChange={(fields) => updateFields(fields)}
                  isDarkMode={isDarkMode}
                />
              )}

              {currentStep === 3 && (
                <PricingStep
                  price={formData.price}
                  negotiable={formData.negotiable}
                  brand={formData.brand}
                  model={formData.model}
                  year={formData.year}
                  mileage={formData.mileage}
                  fuelType={formData.fuelType}
                  onChange={(fields) => updateFields(fields)}
                  isDarkMode={isDarkMode}
                />
              )}

              {currentStep === 4 && (
                <div className="space-y-5">
                  <CarPostStyleSelector
                    value={postStyle}
                    onChange={setPostStyle}
                    isDarkMode={isDarkMode}
                  />
                  <DescriptionStep
                    description={formData.description}
                    brand={formData.brand}
                    model={formData.model}
                    year={formData.year}
                    price={formData.price}
                    type={formData.condition === "new" ? "new" : "used"}
                    condition={formData.condition}
                    mileage={formData.mileage}
                    fuelType={formData.fuelType}
                    onChange={(desc) => updateFields({ description: desc })}
                    generateAIDescription={(details) =>
                      generateAIDescriptionWithStyle(details, null)
                    }
                    isDarkMode={isDarkMode}
                  />
                  {formData.description.trim().length > 0 && (
                    <CarPostRegenerateActions
                      onRegenerate={handleRegenerateDescription}
                      isRegenerating={isDescRegenerating}
                      disabled={!formData.brand || !formData.model}
                      activeMode={activeDescRegenMode}
                      compact
                    />
                  )}
                </div>
              )}

              {currentStep === 5 && (
                <ContactStep
                  contactName={formData.contactName}
                  contactPhone={formData.contactPhone}
                  contactEmail={formData.contactEmail}
                  sellerType={formData.sellerType}
                  dealerId={formData.dealerId}
                  onChange={(fields) => updateFields(fields)}
                  isDarkMode={isDarkMode}
                />
              )}

              {currentStep === 6 && (
                <PreviewPublishStep
                  formData={formData}
                  validationErrors={validationErrors}
                  onSubmit={handlePublishListing}
                  isSubmitting={isSubmitting}
                  isDarkMode={isDarkMode}
                />
              )}
            </div>

            {/* Stepper bottom control buttons */}
            <div className="flex justify-between border-t border-white/5 pt-5.5">
              <button
                type="button"
                disabled={currentStep === 0}
                onClick={handleStepPrev}
                className="px-4.5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-30 active:scale-95 text-left"
              >
                <ArrowLeft className="w-4 h-4 text-orange-500" />
                <span>ขั้นตอนก่อนหน้า</span>
              </button>

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={handleStepNext}
                  className="px-5 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-600/10 transition flex items-center gap-1.5 active:scale-95"
                >
                  <span>ขั้นตอนถัดไป</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePublishListing}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
                >
                  <span>{isSubmitting ? "กำลังส่งประกาศขึ้นแผง..." : "🚀 ยืนยันเผยแพร่สเปกทันที!"}</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Dynamic Chatbot sidebar guide */}
        <div className="lg:col-span-1 p-5 rounded-3xl border border-orange-500/10 bg-gradient-to-b from-[#111115] to-[#09090b] text-left space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-orange-500 animate-spin" />
            </div>
            <div>
              <span className="text-xs font-black block text-orange-500 font-display">Nong A AI Assistant</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">PRO Dealer Guide</span>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-[11.5px] font-extrabold text-white flex items-center gap-1">
              <span>{getStepAITip().header}</span>
            </h5>
            <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">
              {getStepAITip().text}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-orange-550/[0.02] border border-orange-500/5 space-y-2">
            <span className="text-[9.5px] font-bold text-orange-500 flex items-center gap-1">🧡 ประโยคเด็ดพารวยสไตล์ NongBot:</span>
            <p className="text-[10px] text-orange-400 italic">"คันนี้มีคนทักแน่ครับ 🔥 ปังปุริเย่!"</p>
          </div>
        </div>

      </div>
    </div>
  );
}
