import { useState, useCallback, useEffect } from "react";
import { AICarAnalysis } from "../../types/ai/vision";
import { aiVisionService } from "../../services/ai/vision/visionEngine";
import { aiAnalysisStorage } from "../../services/ai/analysis/analysisStorage";
import { useAppStore } from "../../store";
import { useAiPremium } from "../ai-premium/useAiPremium";

export function useCarVision() {
  const { user } = useAppStore();
  const userId = user?.uid || "guest-user-100";
  const { checkGate, triggerUsage } = useAiPremium();

  const [isInspecting, setIsInspecting] = useState(false);
  const [stageProgress, setStageProgress] = useState(0);
  const [stageMessage, setStageMessage] = useState("");
  const [currentAnalysis, setCurrentAnalysis] = useState<AICarAnalysis | null>(null);
  const [analysesHistory, setAnalysesHistory] = useState<AICarAnalysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);

  // Sync / Load inspection histories
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const records = await aiAnalysisStorage.getSavedAnalyses(userId);
      setAnalysesHistory(records);
    } catch (err: any) {
      console.warn("Could not load vehicle inspections list:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId]);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const analyzeImage = useCallback(async (imageBase64: string) => {
    const isAllowed = await checkGate("car-analysis");
    if (!isAllowed) {
      return;
    }

    setIsInspecting(true);
    setVisionError(null);
    setStageProgress(5);
    setStageMessage("กำลังเริ่มระบบวิเคราะห์รูปภาพสำหรับทีมดีลเลอร์ผู้เชี่ยวชาญ... 🛠️");

    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      let currentPercent = 5;
      progressInterval = setInterval(() => {
        if (currentPercent < 35) {
          currentPercent += Math.floor(Math.random() * 8) + 4;
          setStageProgress(Math.min(35, currentPercent));

          if (currentPercent > 12 && currentPercent <= 24) {
            setStageMessage("ตรวจสัญญาณภาพภาพถ่าย ปรับแก้ระดับบิตเรตแสงอัจฉริยะ (Compressing & Aligning)... 💾");
          } else if (currentPercent > 24) {
            setStageMessage("ตรวจจับมุมมองพิกเซลคาร์บัด และสัดส่วนตัวถัง (Pixel Angle Framing Analysis)... 📏");
          }
        }
      }, 250);

      const analyzePromise = aiVisionService.analyzeCarImage(imageBase64);
      const startResultTime = Date.now();

      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      setStageProgress(55);
      setStageMessage("สแกนโลโก้แบรนด์ คาดคะเนรุ่นปี และ OCR ระบบทะเบียนยานยนต์ (OCR & Emblem Detection)... 🪄");
      await new Promise(resolve => setTimeout(resolve, 800));

      setStageProgress(78);
      setStageMessage("ประเมินสภาพสี คานหน้ารถ และวิจัยจุดแต่งซับออฟชั่นสปอร์ต (Inspection & Damage Analysis)... 🔥");
      await new Promise(resolve => setTimeout(resolve, 800));

      setStageProgress(90);
      setStageMessage("น้องเอ (Nong A) กำลังเรียบเรียงแคปชั่นคำแนะนำและใบวิเคราะห์ยอดขายพรีเมียม... 💬");
      
      const analysisResult = await analyzePromise;

      // Adjust remaining processing layout time
      const timeElapsed = Date.now() - startResultTime;
      if (timeElapsed < 3200) {
        await new Promise(resolve => setTimeout(resolve, 3200 - timeElapsed));
      }

      setStageProgress(98);
      setStageMessage("จัดเก็บบันทึกข้อมูลไปยังคลาด์ข้อมูลของคาร์แกลเลอรี่ Nong A... ☁️");

      // Replace trace image with full local high quality base64 image representation so it shows beautifully in UI immediately!
      const fullAnalysis: AICarAnalysis = {
        ...analysisResult,
        imageUrl: imageBase64 // Keep original high-resolution in-memory preview
      };

      // 2. Persist to Firestore collections
      await aiAnalysisStorage.saveAnalysis(userId, fullAnalysis);

      // Trigger premium usage tracking increment
      await triggerUsage("car-analysis");

      setCurrentAnalysis(fullAnalysis);
      setStageProgress(100);
      setStageMessage("ตรวจสอบด้วย AI Vision เสร็จสมบูรณ์! ปังปุริเย่สุดๆ คร้าบผม! 🎉");
      
      // Reload history to synchronize details automatically
      await fetchHistory();

    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดไม่ทราบสาเหตุในการประมวลผลภาพ กรุณาลองใหม่อีกครั้ง";
      setVisionError(message);
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setIsInspecting(false);
      setStageProgress(0);
    }
  }, [userId, fetchHistory]);

  const clearCurrentAnalysis = useCallback(() => {
    setCurrentAnalysis(null);
  }, []);

  return {
    isInspecting,
    stageProgress,
    stageMessage,
    currentAnalysis,
    analysesHistory,
    isLoadingHistory,
    visionError,
    analyzeImage,
    clearCurrentAnalysis,
    fetchHistory
  };
}
