export interface SeoLandingPage {
  id: string;
  slug: string;
  keyword: string;
  title: string;
  description: string;
  h1: string;
  introContent: string;
  detailedContent: string;
  category: "brand-location" | "model-specific" | "car-type" | "price" | "condition";
  canonicalUrl: string;
  ogImage: string;
  jsonLd: Record<string, any>;
  
  // Custom filter spec to match actual cars in store or yield dynamic AI recommendations
  filters: {
    brand?: string;
    model?: string;
    city?: string;
    maxPrice?: number;
    electricOnly?: boolean;
    conditionPattern?: string; // Single owner, low mileage, cheap
  };
}

export interface SeoBreadcrumb {
  label: string;
  view?: string;
  slug?: string;
}

export interface SearchRankingInsight {
  slug: string;
  keyword: string;
  currentRank: number;
  monthlyVolume: number;
  difficulty: "쉬움 (Low)" | "중간 (Medium)" | "중간-높음 (High-Medium)" | "높음 (High)";
  backlinksCount: number;
  ctrEstimate: string;
}

export interface DynamicSeoMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: "summary" | "summary_large_image";
  twitterTitle: string;
  twitterDescription: string;
  schema: Record<string, any>;
}
