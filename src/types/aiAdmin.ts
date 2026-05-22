export interface AIPromptTemplate {
  id: string;
  name: string;
  category: "chat" | "vision" | "recommendation" | "onboarding" | "post-generation";
  template: string;
  variables: string[];
  isActive: boolean;
  lastUpdated: string;
}

export interface AIPersonalityPreset {
  id: string; // can be "sporty", "luxury", etc. or dynamically added like "custom_xxx"
  name: string;
  displayNameEn: string;
  description: string;
  avatarSeed: string;
  toneDescription: string;
  customSystemInstruction: string;
  temperature: number;
  signaturePhrases: string[];
  defaultEmotionScores: {
    energy: number; // 1-5
    humor: number;  // 1-5
    warmth: number; // 1-5
    formality: number; // 1-5
  };
  colorTheme: {
    primary: string;
    gradientFrom: string;
    gradientTo: string;
    badgeBg: string;
  };
  isCustom?: boolean;
}

export interface AIMoodConfig {
  id: string;
  name: string;
  sentiment: "happy" | "neutral" | "skeptical" | "frustrated";
  modifierText: string;
  energyBonus: number; // adjustment to personality scores (-2 to +2)
  humorBonus: number;
  warmthBonus: number;
  formalityBonus: number;
  isActive: boolean;
}

export interface AISkillConfig {
  id: string;
  name: string;
  description: string;
  category: "search" | "calculation" | "comparison" | "closing" | "analytics";
  promptExtension: string;
  isEnabled: boolean;
}

export interface AIWorkflowStep {
  id: string;
  order: number;
  label: string;
  instruction: string;
  isActive: boolean;
}

export interface AIWorkflow {
  id: string;
  name: string;
  description: string;
  steps: AIWorkflowStep[];
  isActive: boolean;
  category: "sales" | "support" | "onboarding" | "consulting";
}

export interface AIPhraseCollection {
  id: string;
  text: string;
  category: "sales_hook" | "emoji_hype" | "closing_pitch" | "empathy_boost" | "guarantee" | "general";
  isActive: boolean;
  usageCount: number;
  creatorAdmin: string;
  lastUpdated: string;
}

export interface AIRuleConfig {
  id: string;
  name: string;
  type: "safety" | "context_guard" | "competitor_blacklist" | "sales_direction";
  pattern: string; // keyword or regex pattern
  action: "block" | "flag" | "rewrite" | "steer";
  replacement?: string;
  isActive: boolean;
}
