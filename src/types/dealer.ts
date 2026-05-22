export interface DealerProfile {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  address: string;
  province: string;
  website?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  verified: boolean;
  rating: number;
  totalReviews: number;
  subscriptionPlan: "free" | "premium_growth" | "elite_pro";
  creditsRemaining: number;
  unlimitedListingEnabled: boolean;
  aiAutoReplyEnabled: boolean;
}

export type LeadStatus = "new" | "contacted" | "following" | "completed" | "lost";
export type LeadTemperature = "hot" | "warm" | "cold";
export type LeadChannel = "website" | "marketplace" | "facebook" | "line" | "tiktok";

export interface DealerLead {
  id: string;
  dealerId: string;
  carId?: string;
  carTitle?: string;
  carImage?: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  channel: LeadChannel;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface PostPerformanceMetric {
  id: string;
  carId: string;
  carTitle: string;
  carImage?: string;
  viewsTotal: number;
  favoritesTotal: number;
  leadsTotal: number;
  conversionRate: number; // calculated as leadsTotal / viewsTotal
  boosted: boolean;
  boostEndDate?: string;
  dailyViews: { date: string; views: number; favorites: number }[];
}

export interface ChatInquiry {
  id: string;
  carId: string;
  carTitle: string;
  carImage?: string;
  customerName: string;
  customerPhone?: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  status: "active" | "archived";
  aiSuggestedReply?: string;
  aiSuggestedReplyStatus: "idle" | "generating" | "ready";
  messages: {
    id: string;
    sender: "customer" | "dealer" | "ai_system";
    text: string;
    timestamp: string;
  }[];
}

export interface SubscriptionPlanDetail {
  id: "free" | "premium_growth" | "elite_pro";
  name: string;
  priceMonthly: number;
  features: string[];
  maxListings: number | "unlimited";
  hasAiReplier: boolean;
  hasVerifiedSelector: boolean;
}

export interface DealerAnalyticsOverview {
  totalViews: number;
  totalFavorites: number;
  totalLeads: number;
  activeListingsCount: number;
  conversionRate: number;
  leadsToday: number;
  monthlyRevenueEst: number;
  viewsWeeklyHistory: { name: string; views: number; leads: number }[];
  funnelData: { stage: string; value: number }[];
  trendingCars: {
    id: string;
    title: string;
    views: number;
    favorites: number;
    leads: number;
    rating: number;
    image: string;
  }[];
}
