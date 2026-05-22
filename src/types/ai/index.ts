export type PersonalityPresetId = "sporty" | "luxury" | "family" | "youth" | "premium" | "dealer";

export interface AIPersonality {
  id: PersonalityPresetId;
  name: string; // e.g. "Sporty น้องเอ", "Luxury น้องเอ"
  displayNameEn: string;
  description: string; // Detail description of vibe/preset
  avatarSeed: string; // Avatar seed for Dicebear bottts
  
  // Custom prompt building blocks
  toneDescription: string; // Description of language style in Thai
  customSystemInstruction: string; // Specific behavioral rules
  temperature: number; // Gemini parameter (0.0 - 1.0)
  signaturePhrases: string[]; // Specific phrases to sprinkle
  
  // Custom emotional parameters
  defaultEmotionScores: {
    energy: number; // 1-5
    humor: number;  // 1-5
    warmth: number; // 1-5
    formality: number; // 1-5
  };
  
  // Highlight UI colors
  colorTheme: {
    primary: string; // e.g. "orange"
    gradientFrom: string; // "from-orange-500"
    gradientTo: string; // "to-amber-500"
    badgeBg: string; // "bg-orange-500/10 text-orange-400 border-orange-500/20"
  };
}

export interface ChatMoodState {
  currentPresetId: PersonalityPresetId;
  activeEmotion: string; // "ปังปุริเย่ตื่นเต้น" | "ใจดีอบอุ่น" | "หรูหราสง่างาม" etc.
  userSentimentState: "happy" | "neutral" | "skeptical" | "frustrated";
  convoCountSinceReset: number;
}

export interface AdminPersonalityUpdate {
  presetId: PersonalityPresetId;
  name: string;
  toneDescription: string;
  customSystemInstruction: string;
  signaturePhrases: string[];
  temperature: number;
}
