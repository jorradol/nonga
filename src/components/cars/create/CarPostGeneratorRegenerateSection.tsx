import React, { memo } from "react";
import { GeneratedPosts } from "../../../types/ai/post-generator";
import { CarPostRegenerateMode } from "../../../services/ai/post-generator/regenerateStyle";
import CarPostRegenerateActions from "./CarPostRegenerateActions";

/**
 * แถบ Regenerate สำหรับ Post Generator — วางหลังมีผลลัพธ์โพสต์
 * ใช้ร่วมกับ useCarPostGenerator().regeneratePosts
 */
interface CarPostGeneratorRegenerateSectionProps {
  generatedResults: GeneratedPosts | null;
  isRegenerating: boolean;
  onRegenerate: (mode: CarPostRegenerateMode) => void;
  activeRegenerateMode?: CarPostRegenerateMode | null;
  disabled?: boolean;
}

function CarPostGeneratorRegenerateSectionComponent({
  generatedResults,
  isRegenerating,
  onRegenerate,
  activeRegenerateMode = null,
  disabled = false,
}: CarPostGeneratorRegenerateSectionProps) {
  if (!generatedResults) return null;

  return (
    <CarPostRegenerateActions
      onRegenerate={onRegenerate}
      isRegenerating={isRegenerating}
      disabled={disabled || !generatedResults}
      activeMode={activeRegenerateMode}
    />
  );
}

export default memo(CarPostGeneratorRegenerateSectionComponent);
