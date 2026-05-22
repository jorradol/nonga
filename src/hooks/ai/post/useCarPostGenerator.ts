import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  CarSpecsInput,
  GeneratorOptions,
  FollowUpQuestion,
  GeneratedPosts,
} from "../../../types/ai/post-generator";
import type { CarMarketingBrainResult } from "../../../services/ai/post-generator/marketingBrain";
import {
  CarPostStyle,
  DEFAULT_CAR_POST_STYLE,
} from "../../../services/ai/post-generator/postStyle";
import { CarPostRegenerateMode } from "../../../services/ai/post-generator/regenerateStyle";
import { postGeneratorService } from "../../../services/ai/post-generator/generatorService";
import { useAiPremium } from "../../ai-premium/useAiPremium";

const REGENERATE_COOLDOWN_MS = 1200;
const BRAIN_DEBOUNCE_MS = 450;

const initialSpecs: CarSpecsInput = {
  brand: "",
  model: "",
  year: "",
  price: 0,
  mileage: 0,
  condition: "ยอดเยี่ยม",
  fuelType: "petrol",
  color: "",
  modifications: "",
  highlights: "",
};

const initialOptions: GeneratorOptions = {
  tone: "youth",
  includeHashtags: true,
  emojiOptimization: true,
  seoOptimization: true,
  autoTranslate: false,
  customLanguage: "en",
};

export function useCarPostGenerator() {
  const { checkGate, triggerUsage } = useAiPremium();

  const [specs, setSpecs] = useState<CarSpecsInput>(initialSpecs);
  const [options, setOptions] = useState<GeneratorOptions>(initialOptions);
  const [postStyle, setPostStyle] = useState<CarPostStyle>(DEFAULT_CAR_POST_STYLE);

  const [currentStep, setCurrentStep] = useState<
    "input" | "questions" | "generating" | "results"
  >("input");
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeRegenerateMode, setActiveRegenerateMode] =
    useState<CarPostRegenerateMode | null>(null);
  const [generatedResults, setGeneratedResults] = useState<GeneratedPosts | null>(
    null
  );
  const [marketingBrain, setMarketingBrain] =
    useState<CarMarketingBrainResult | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const lastRegenerateAtRef = useRef(0);
  const brainDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBusy = isLoading || isRegenerating;

  const scheduleBrainRefresh = useCallback(
    (nextSpecs: CarSpecsInput, nextQuestions: FollowUpQuestion[]) => {
      if (brainDebounceRef.current) {
        clearTimeout(brainDebounceRef.current);
      }
      brainDebounceRef.current = setTimeout(() => {
        setMarketingBrain(
          postGeneratorService.getMarketingBrain(nextSpecs, nextQuestions)
        );
      }, BRAIN_DEBOUNCE_MS);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (brainDebounceRef.current) {
        clearTimeout(brainDebounceRef.current);
      }
    };
  }, []);

  const updateSpecs = useCallback((fields: Partial<CarSpecsInput>) => {
    setSpecs((prev) => ({ ...prev, ...fields }));
  }, []);

  const updateOptions = useCallback((fields: Partial<GeneratorOptions>) => {
    setOptions((prev) => ({ ...prev, ...fields }));
  }, []);

  const updatePostStyle = useCallback((style: CarPostStyle) => {
    setPostStyle(style);
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (!specs.brand.trim() || !specs.model.trim() || !specs.year) {
      setWorkflowError("กรุณากรอกยี่ห้อ รุ่น และปีรถก่อนครับ");
      return;
    }

    setWorkflowError(null);

    const isAllowed = await checkGate("post-generation");
    if (!isAllowed) return;

    if (options.tone === "luxury") {
      const isToneAllowed = await checkGate("luxury-writing");
      if (!isToneAllowed) return;
    }
    if (options.tone === "tiktok") {
      const isToneAllowed = await checkGate("trending-hook");
      if (!isToneAllowed) return;
    }

    setIsLoading(true);
    setCurrentStep("questions");
    try {
      const qs = await postGeneratorService.getFollowUpQuestions(specs);
      setQuestions(qs);
      setMarketingBrain(postGeneratorService.getMarketingBrain(specs, qs));
    } catch {
      setWorkflowError("โหลดคำถามไม่สำเร็จ ใช้คำถามสำรองให้แล้ว — ตอบต่อได้เลยครับ");
      setQuestions([]);
      setMarketingBrain(postGeneratorService.getMarketingBrain(specs, []));
    } finally {
      setIsLoading(false);
    }
  }, [specs, options, checkGate]);

  const handleUpdateAnswer = useCallback(
    (questionId: string, answerText: string) => {
      setQuestions((prev) => {
        const next = prev.map((q) =>
          q.id === questionId ? { ...q, answer: answerText } : q
        );
        scheduleBrainRefresh(specs, next);
        return next;
      });
    },
    [specs, scheduleBrainRefresh]
  );

  const runGenerate = useCallback(
    async (regenerateMode?: CarPostRegenerateMode | null) => {
      const brain =
        marketingBrain ?? postGeneratorService.getMarketingBrain(specs, questions);

      return postGeneratorService.generatePosts(
        specs,
        options,
        questions,
        brain,
        postStyle,
        regenerateMode ?? undefined
      );
    },
    [specs, options, questions, marketingBrain, postStyle]
  );

  const handleGenerateFinalPosts = useCallback(async () => {
    setWorkflowError(null);
    setIsLoading(true);
    setCurrentStep("generating");
    try {
      const results = await runGenerate(null);

      await triggerUsage("post-generation");
      if (options.tone === "luxury") await triggerUsage("luxury-writing");
      if (options.tone === "tiktok") await triggerUsage("trending-hook");
      if (options.seoOptimization) await triggerUsage("seo-writer");

      setGeneratedResults(results);
      setCurrentStep("results");
    } catch {
      setWorkflowError("สร้างโพสต์ไม่สำเร็จ ระบบใช้ข้อความสำรองให้แล้ว ลองกดสร้างใหม่ได้ครับ");
      try {
        const fallback = await runGenerate(null);
        setGeneratedResults(fallback);
        setCurrentStep("results");
      } catch {
        setCurrentStep("questions");
      }
    } finally {
      setIsLoading(false);
    }
  }, [runGenerate, options, triggerUsage]);

  const handleRegeneratePosts = useCallback(
    async (mode: CarPostRegenerateMode) => {
      if (!generatedResults || isBusy) return;

      const now = Date.now();
      if (now - lastRegenerateAtRef.current < REGENERATE_COOLDOWN_MS) return;

      lastRegenerateAtRef.current = now;
      setIsRegenerating(true);
      setActiveRegenerateMode(mode);
      setWorkflowError(null);

      try {
        const brain =
          marketingBrain ?? postGeneratorService.getMarketingBrain(specs, questions);

        const results = await postGeneratorService.regeneratePosts(
          specs,
          options,
          questions,
          brain,
          postStyle,
          mode
        );

        setGeneratedResults(results);
      } catch {
        setWorkflowError("สร้างโพสต์ใหม่ไม่สำเร็จ ลองอีกครั้งในอีกสักครู่ครับ");
      } finally {
        setIsRegenerating(false);
        setActiveRegenerateMode(null);
      }
    },
    [generatedResults, isBusy, specs, options, questions, marketingBrain, postStyle]
  );

  const handleReset = useCallback(() => {
    if (brainDebounceRef.current) {
      clearTimeout(brainDebounceRef.current);
    }
    setSpecs(initialSpecs);
    setOptions(initialOptions);
    setPostStyle(DEFAULT_CAR_POST_STYLE);
    setQuestions([]);
    setGeneratedResults(null);
    setMarketingBrain(null);
    setActiveRegenerateMode(null);
    setWorkflowError(null);
    setCurrentStep("input");
  }, []);

  const clearWorkflowError = useCallback(() => {
    setWorkflowError(null);
  }, []);

  const canGenerate = useMemo(
    () =>
      Boolean(specs.brand.trim() && specs.model.trim() && specs.year && !isBusy),
    [specs.brand, specs.model, specs.year, isBusy]
  );

  return {
    specs,
    options,
    postStyle,
    currentStep,
    questions,
    isLoading,
    isRegenerating,
    isBusy,
    activeRegenerateMode,
    generatedResults,
    marketingBrain,
    workflowError,
    canGenerate,
    updateSpecs,
    updateOptions,
    updatePostStyle,
    setCurrentStep,
    startAnalysis: handleStartAnalysis,
    updateAnswer: handleUpdateAnswer,
    generateFinalPosts: handleGenerateFinalPosts,
    regeneratePosts: handleRegeneratePosts,
    resetGenerator: handleReset,
    clearWorkflowError,
  };
};
