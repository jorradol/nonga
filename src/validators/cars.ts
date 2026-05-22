import { z } from "zod";

export const carBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(100),
  logoUrl: z.string().url().optional(),
  country: z.string().max(100).optional(),
  establishedYear: z.number().int().min(1800).max(new Date().getFullYear() + 2).optional(),
});

export const carModelSchema = z.object({
  brandId: z.string().min(1, "Brand reference is required"),
  brandName: z.string().min(1, "Brand name is required"),
  name: z.string().min(1, "Model name is required").max(100),
  slug: z.string().min(1, "Slug is required").max(100),
  bodyType: z.string().max(100).optional(),
});

export const dealerSchema = z.object({
  name: z.string().min(2, "Showroom name must be at least 2 characters").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  userId: z.string().min(1, "User owner reference is required"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().max(1000).optional(),
  phone: z.string().regex(/^([0-9\-\+\s]{8,20})$/, "Invalid contact phone number"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  province: z.string().min(1, "Province is required"),
  website: z.string().url().optional().or(z.literal("")),
  verified: z.boolean().default(false),
});

export const showroomReviewSchema = z.object({
  dealerId: z.string().min(1, "Dealer reference is required"),
  userId: z.string().min(1, "User reference is required"),
  userDisplayName: z.string().min(1, "User display name is required"),
  userPhotoURL: z.string().url().optional(),
  rating: z.number().min(1, "Rating must be at least 1 star").max(5, "Rating cannot exceed 5 stars"),
  comment: z.string().min(1, "Review comment cannot be empty").max(1000, "Review comment is too long"),
});

export const carCommentSchema = z.object({
  carId: z.string().min(1, "Car reference is required"),
  userId: z.string().min(1, "User reference is required"),
  userDisplayName: z.string().min(1, "User name is required"),
  userPhotoURL: z.string().url().optional(),
  commentText: z.string().min(1, "Comment cannot be empty").max(500, "Comment is too long"),
});

export const carReportSchema = z.object({
  carId: z.string().min(1, "Car reference is required"),
  reporterId: z.string().min(1, "Reporter ID is required"),
  reporterEmail: z.string().email("Invalid reporter email"),
  reason: z.enum(["spam", "fraud", "incorrect_info", "offensive", "sold", "other"]),
  description: z.string().max(500).optional(),
});

export const carListingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(150, "Title is too long"),
  slug: z.string().min(1, "Slug is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z.number().int().min(1900, "Invalid year").max(new Date().getFullYear() + 2, "Year is too far in future"),
  generation: z.string().max(50).optional(),
  bodyType: z.string().min(1, "Body type is required"),
  transmission: z.enum(["auto", "manual", "other"]),
  fuelType: z.enum(["petrol", "diesel", "electric", "hybrid", "plug-in-hybrid", "other"]),
  mileage: z.number().nonnegative("Mileage must be non-negative"),
  color: z.string().min(1, "Color is required"),
  engineSize: z.string().max(20).optional(),
  drivetrain: z.string().max(50).optional(),
  condition: z.enum(["new", "used", "excellent", "good", "fair"]),
  price: z.number().positive("Price must be a positive number"),
  negotiable: z.boolean().default(false),
  province: z.string().min(1, "Province is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  features: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().url("Invalid cover image URL").or(z.literal("")),
  gallery: z.array(z.string().url("Invalid gallery image URL")).default([]),
  sellerId: z.string().min(1, "Seller reference is required"),
  sellerType: z.enum(["private", "dealer", "agent"]),
  dealerId: z.string().optional(),
  status: z.enum(["draft", "pending", "approved", "rejected", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  boosted: z.boolean().default(false),
  aiGenerated: z.boolean().default(false),
  aiScore: z.number().min(0).max(100).optional(),
  aiAnalysis: z.string().optional(),
});
