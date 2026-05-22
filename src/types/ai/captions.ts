export type CaptionType =
  | "hooks"
  | "emotional"
  | "luxury"
  | "dealer"
  | "funny"
  | "tiktok"
  | "urgency"
  | "seo";

export type SocialPlatform =
  | "facebook"
  | "tiktok"
  | "instagram"
  | "x"
  | "marketplace";

export type EmojiOption = "minimal" | "medium" | "high";

export interface CarSpecsInput {
  brand: string;
  model: string;
  year: string | number;
  price?: string | number;
  mileage?: string | number;
  condition?: string;
  modifications?: string;
  customNotes?: string;
}

export interface CaptionScore {
  overall: number;
  readability: number;
  engagement: number;
  ctaStrength: number;
  viralPotential: number;
  breakdown: {
    title: string;
    score: number;
    description: string;
  }[];
  suggestions: string[];
}

export interface HookOption {
  text: string;
  score: number;
  category: "urgency" | "question" | "extreme" | "funny" | "flex";
}

export interface CtaOption {
  text: string;
  urgencyLevel: "high" | "medium" | "low";
  channel: string;
}

export interface GeneratedCaption {
  id: string;
  text: string;
  type: CaptionType;
  platform: SocialPlatform;
  emojiOption: EmojiOption;
  hook: string;
  cta: string;
  score: CaptionScore;
  hashtags: string[];
  specsUsed: CarSpecsInput;
  createdAt: string;
  isMock?: boolean;
}

export interface FavoritedCaption extends GeneratedCaption {
  favoriteId: string;
  userNotes?: string;
}

export interface CaptionTrend {
  keyword: string;
  volume: string;
  growth: string;
  category: string;
  hashtags: string[];
}
