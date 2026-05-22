export interface CarBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  country?: string;
  establishedYear?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CarModel {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  slug: string;
  bodyType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarImage {
  id: string;
  carId: string;
  url: string;
  isCover: boolean;
  uploadedBy: string;
  createdAt: string;
}

export interface CarView {
  id: string;
  carId: string;
  userId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  viewedAt: string;
}

export interface CarFavorite {
  id: string;
  userId: string;
  carId: string;
  createdAt: string;
}

export interface Dealer {
  id: string;
  name: string;
  slug: string;
  userId: string; // The owner/admin UID reference
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  phone: string;
  email: string;
  address: string;
  province: string;
  website?: string;
  verified: boolean;
  rating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShowroomReview {
  id: string;
  dealerId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  rating: number; // 1-5
  comment: string;
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

export interface CarReport {
  id: string;
  carId: string;
  reporterId: string;
  reporterEmail: string;
  reason: "spam" | "fraud" | "incorrect_info" | "offensive" | "sold" | "other";
  description?: string;
  status: "pending" | "investigating" | "resolved" | "dismissed";
  createdAt: string;
  updatedAt: string;
}

export interface CarListing {
  id: string;
  title: string;
  slug: string;
  brand: string; // e.g., "Tesla"
  model: string; // e.g., "Model 3"
  year: number;
  generation?: string;
  bodyType: string; // SUV, Sedan, Coupe, etc.
  transmission: "auto" | "manual" | "other";
  fuelType: "petrol" | "diesel" | "electric" | "hybrid" | "plug-in-hybrid" | "other";
  mileage: number;
  color: string;
  engineSize?: string;
  drivetrain?: "FWD" | "RWD" | "AWD" | "4WD" | string;
  condition: "new" | "used" | "excellent" | "good" | "fair";
  price: number;
  negotiable: boolean;
  province: string;
  description: string;
  features: string[]; // Array of standard features (e.g. Navigation, Leather seats, Tesla Autopilot)
  tags: string[]; // Custom descriptive tags
  coverImage: string;
  gallery: string[];
  sellerId: string;
  sellerType: "private" | "dealer" | "agent";
  dealerId?: string; // If associated with a dealer showroom
  status: "draft" | "pending" | "approved" | "rejected" | "archived";
  featured: boolean;
  boosted: boolean;
  aiGenerated: boolean;
  aiScore?: number; // Score given by Nong A AI (0-100)
  aiAnalysis?: string; // Rich markdown text summary by Nong A AI
  createdAt: string;
  updatedAt: string;
  totalViews: number;
  totalFavorites: number;
}
