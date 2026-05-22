export type PostTone = "dealer" | "youth" | "luxury" | "friendly" | "tiktok";

export interface CarSpecsInput {
  brand: string;
  model: string;
  year: string;
  price: number;
  mileage: number;
  condition: string;
  fuelType: string;
  color: string;
  modifications?: string;
  highlights?: string;
  imageUrl?: string;
}

export interface GeneratorOptions {
  tone: PostTone;
  includeHashtags: boolean;
  emojiOptimization: boolean;
  seoOptimization: boolean;
  autoTranslate: boolean;
  customLanguage: string; // "th" | "en" | "cn" | "jp" etc
}

export interface FollowUpQuestion {
  id: string;
  questionText: string;
  placeholder: string;
  answer?: string;
}

export interface GeneratedPosts {
  facebook: string;
  tiktok: string;
  seoDescription: string;
  marketplaceTitle: string;
  shortCaption: string;
  viralHook: string;
  closingCta: string;
  tags: string[];
}

export interface PostGeneratorState {
  specs: CarSpecsInput;
  options: GeneratorOptions;
  followUps: FollowUpQuestion[];
  isAskingFollowUps: boolean;
  currentStep: "input" | "questions" | "generating" | "results";
  generatedResults: GeneratedPosts | null;
  conversationMemory: Array<{ role: "user" | "model" | "system"; text: string }>;
}
