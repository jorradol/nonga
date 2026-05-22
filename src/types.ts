export interface Car {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  type: "new" | "used" | "ev" | "luxury" | "motorcycle";
  condition: string;
  mileage: number;
  fuelType: "petrol" | "diesel" | "electric" | "hybrid" | "plug-in-hybrid";
  images: string[];
  description: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  showroomName?: string;
  isSold: boolean;
  createdAt: string;
  boosted?: boolean;
  featured?: boolean;
  
  // High-performance optional specs
  sellerType?: "private" | "dealer" | "agent";
  dealerId?: string;
  province?: string;
  drivetrain?: string;
  transmission?: "auto" | "manual" | "other" | string;
  color?: string;
  bodyType?: string;
  negotiable?: boolean;
  features?: string[];
  tags?: string[];
}


export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "assistant" | "system" | "ai-analysis";
  text: string;
  createdAt: string;
}

export interface DealerReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  buyerOfCar?: string;
  verifiedPurchase?: boolean;
}

export interface DealerShowroom {
  id: string;
  name: string;
  logo: string;
  address: string;
  phone: string;
  rating: number;
  verified: boolean;
  coverImage: string;
  description: string;
  experienceYears: number;
  totalViews: number;
  reviews: DealerReview[];
  socialLinks: {
    facebook?: string;
    line?: string;
    tiktok?: string;
    website?: string;
  };
  tags: string[];
}

export interface Favorite {
  id: string;
  userId: string;
  carId: string;
  createdAt: string;
}

export interface CarComment {
  id: string;
  carId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  commentText: string;
  createdAt: string;
}

// ==========================================
// ADMIN DASHBOARD SYSTEMS TYPES
// ==========================================

export type AdminRole = "admin" | "superadmin" | "moderator" | "AI manager";

export interface PlatformUser {
  id: string;
  displayName: string;
  email: string;
  role: AdminRole | "user" | "dealer";
  status: "active" | "suspended" | "pending_verification";
  joinedAt: string;
  avatar?: string;
  phone?: string;
  strikeCount: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  message: string;
  category: "billing" | "technical" | "listing_issue" | "ai_dispute" | "general";
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
  assignedTo?: AdminRole;
  replies: {
    senderName: string;
    senderRole: string;
    message: string;
    createdAt: string;
  }[];
}

export interface ReportedItem {
  id: string;
  targetId: string; // CarId or CommentId or UserId
  targetType: "car" | "comment" | "user";
  targetTitle: string; // Car title or snippet
  reportedBy: string; // User Name
  reason: string;
  details?: string;
  aiClassification?: string; // AI flags e.g. "Spam: 92%, ImageMismatch: 80%"
  aiSafeVerdict?: "safe" | "flagged" | "needs_manual_review";
  status: "pending" | "resolved" | "ignored" | "removed";
  reportedAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  adminRole: AdminRole;
  action: string; // "SUSPEND_USER", "APPROVE_DEALER", "DELETE_LISTING", etc.
  details: string;
  timestamp: string;
}

export interface AnalyticsStats {
  totalUsers: number;
  activeDealers: number;
  carsListedToday: number;
  aiUsageCount: number;
  revenueTotal: number;
  reportedItemsCount: number;
  openTicketsCount: number;
  growthRate: number; // e.g., +12.4%
}


