export type LeadEventType = "view_car" | "favorite_car" | "contact_seller" | "chat_inquiry" | "finance_inquiry" | "share_listing";

export type LeadStatus = "new" | "contacted" | "negotiating" | "sold" | "lost";

export interface Lead {
  id: string;
  carId: string;
  carTitle: string;
  carPrice: number;
  buyerId?: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  dealerId?: string;
  dealerName?: string;
  source?: string;
  eventType: LeadEventType;
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrafficEvent {
  id: string;
  userId?: string;
  carId: string;
  eventType: LeadEventType;
  dealerId?: string;
  referrer?: string;
  device?: string;
  timestamp: string;
  source?: string;
}

export type ScoreTier = "hot" | "warm" | "cold";

export interface AiLeadScore {
  id: string;
  leadId: string;
  carId: string;
  userId?: string;
  score: number; // 0 - 100
  tier: ScoreTier;
  segment: string; // e.g. "EV Tech Envisioner", "Premium SUV Seeker"
  conversionProbability: number; // 0 - 100
  suggestedAction: string; // Action plan recommendation
  predictedValue?: number;
  confidenceScore: number;
  analysisSummary: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  id: string;
  dealerId?: string; // empty means global stats
  period: string; // e.g. "2026-05", "daily", "monthly"
  viewsCount: number;
  favoritesCount: number;
  contactsCount: number;
  chatsCount: number;
  financeCount: number;
  sharesCount: number;
  conversionRate: number; // calculated from leads / traffic events
  totalLeadsCount: number;
  averageCloseTimeDays: number;
  lastUpdated: string;
}

export interface TrendingCar {
  carId: string;
  title: string;
  brand: string;
  model: string;
  price: number;
  coverImage?: string;
  viewCount: number;
  favoriteCount: number;
  leadCount: number;
  score: number; // calculated trend index
}

export interface PredictiveInsight {
  id: string;
  title: string;
  description: string;
  confidence: number; // %
  impact: "high" | "medium" | "low";
  metricType: "volume" | "value" | "conversion" | "segmentation";
  recommendedStrategy: string;
}
