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
  /** published = ตลาด; hidden = ซ่อน */
  listingStatus?: "published" | "hidden";
  /**
   * v5.4.7e — seller publish consent (closed pilot)
   * Optional: legacy listings may not have these fields.
   */
  sellerConsentAccepted?: true;
  sellerConsentAcceptedAt?: string;
  sellerConsentVersion?: string;
  sellerConsentSource?: string;
  sellerConsentTextKey?: string;
  moderationStatus?: "none" | "under_review" | "actioned";
  adminHiddenReason?: string;
  adminHiddenAt?: string;
  adminHiddenBy?: string;
  reportOpenCount?: number;
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
  sessionId?: string;
  userId: string;
  uid?: string;
  dealerId?: string | null;
  scope?: "user" | "dealer";
  storageScopeKey?: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  lastMessagePreview?: string;
  savedDraftId?: string;
  status?: "active" | "archived";
}

export type ChatMessageAttachmentKind = "image" | "file" | "spreadsheet" | "pdf";

/** ไฟล์แนบในแชท (metadata ใน message; ไฟล์จริงเก็บ in-memory ตาม storage scope) */
export interface ChatMessageAttachment {
  id: string;
  name: string;
  size: number;
  kind: ChatMessageAttachmentKind;
  mimeType: string;
  /** thumbnail เล็กสำหรับแสดงใน bubble (ไม่บังคับหลัง reload) */
  previewDataUrl?: string;
  /** URL ชั่วคราวใน browser สำหรับแสดงทันทีหลังส่ง (ไม่ใช่ storage ถาวร) */
  previewUrl?: string;
  /** ชื่อไฟล์หลัง optimize แล้ว */
  fileName?: string;
  /** ชื่อไฟล์เดิมของผู้ใช้ เก็บเฉพาะชื่อ ไม่เก็บ binary ต้นฉบับ */
  originalFileName?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  storagePath?: string;
  dealerId?: string;
  listingId?: string;
  draftId?: string;
  /** ขนาดรูปหลัง optimize แล้ว (client ตอนแนบ) */
  width?: number;
  height?: number;
  sortOrder?: number;
  source?: "chat-image-attachment-v1" | string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "assistant" | "system" | "ai-analysis";
  text: string;
  createdAt: string;
  /** การ์ดรถจากผลค้นหา Marketplace จริง */
  carCards?: ChatCarCardData[];
  /** มีรถอีกหรือไม่ (สำหรับปุ่มดูเพิ่ม) */
  hasMoreCars?: boolean;
  /** ข้อมูลที่แยกได้จากการคุยเพื่อสร้าง Draft */
  draftFields?: any;
  /** เป็นข้อความแสดง Draft Preview หรือไม่ */
  isDraftPreview?: boolean;
  /** หลังบันทึกประกาศจากแชท — ใช้ปุ่มไปหน้า Draft */
  savedDraftId?: string;
  /** หลัง member บันทึกผ่าน POST /api/cars — ใช้ปุ่มไปประกาศของฉัน */
  savedMemberListingId?: string;
  /** การ์ดประกาศร่างสำหรับ member (in-chat pending listing) */
  isPendingListingCard?: boolean;
  pendingListingCard?: PendingListingCardData;
  /** การ์ดประกาศที่บันทึกแล้ว (หลัง member save สำเร็จ) */
  isSavedMemberListingCard?: boolean;
  savedMemberListingCard?: SavedMemberListingCardData;
  /** สรุปก่อนเผยแพร่ — รอ confirm ครั้งที่ 2 (publish-in-chat) */
  isPublishAwaitingConfirm?: boolean;
  /** หลังเผยแพร่สำเร็จจากแชท — ปุ่มดูในตลาดรถ */
  isPublishSuccess?: boolean;
  /** การ์ดประกาศที่เผยแพร่แล้ว (หลัง publish success จากแชท) */
  isPublishedMemberListingCard?: boolean;
  publishedMemberListingCard?: PublishedMemberListingCardData;
  /** ไฟล์แนบจากผู้ใช้ */
  attachments?: ChatMessageAttachment[];
}

export interface PendingListingCardData {
  publicRefCode: string;
  statusLabel: string;
  marketingCopy: string;
  fields: Record<string, unknown>;
  visionSummary?: Record<string, unknown>;
}

export interface SavedMemberListingCardData {
  listingId: string;
  publicRefCode: string;
  statusLabel: string;
  marketingCopy: string;
  fields: Record<string, unknown>;
  visionSummary?: Record<string, unknown>;
  imageUrls: string[];
}

/** การ์ดประกาศที่เผยแพร่แล้วในแชท — สร้างจาก saved card / record ใน frontend */
export interface PublishedMemberListingCardData {
  listingId: string;
  publicRefCode: string;
  statusLabel: string;
  marketingCopy: string;
  fields: Record<string, unknown>;
  visionSummary?: Record<string, unknown>;
  imageUrls: string[];
}

/** ข้อมูลการ์ดรถในแชท — จาก database เท่านั้น */
export interface ChatCarCardData {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color?: string;
  fuelType?: string;
  condition?: string;
  /** เกียร์ — จาก record จริงเท่านั้น ถ้ามี */
  transmission?: string;
  /** รายละเอียดเพิ่มเติมจาก listing ถ้ามี */
  description?: string;
  bodyClass: string;
  bodyClassLabel: string;
  showroomName?: string;
  imageUrl?: string;
  /** รูปทั้งหมดจาก listing สำหรับ gallery ในแชท */
  imageUrls?: string[];
  hasImage: boolean;
  detailPath: string;
  matchKind: "exact" | "alternative";
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


