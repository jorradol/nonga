import { z } from "zod";

export const carSellingFormSchema = z.object({
  brand: z.string().min(1, "กรุณาเลือกหรือระบุแบรนด์รถยนต์"),
  model: z.string().min(1, "กรุณาเลือกหรือระบุรุ่นรถยนต์"),
  year: z.coerce.number().int().min(1900, "ปีรถเก่าเกินไป").max(new Date().getFullYear() + 2, "ปีรถห้ามเกินปีอนาคต"),
  province: z.string().min(1, "กรุณาระบุจังหวัดที่จอดรถ"),
  mileage: z.coerce.number().nonnegative("เลขไมล์ต้องไม่มีค่าติดลบ"),
  bodyType: z.string().min(1, "กรุณาระบุประเภทตัวถัง"),
  transmission: z.enum(["auto", "manual", "other"]),
  fuelType: z.enum(["electric", "hybrid", "plug-in-hybrid", "petrol", "diesel", "other"]),
  color: z.string().min(1, "กรุณาระบุสีประจำรถ"),
  condition: z.enum(["new", "used", "excellent", "good", "fair"]),
  price: z.coerce.number().positive("ราคาขายต้องมากกว่า 0 บาท"),
  negotiable: z.boolean().default(false),
  description: z.string().min(10, "คำอธิบายกระชับเกินไป (ระบุอย่างน้อย 10 ตัวอักษร)"),
  features: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).min(1, "กรุณาอัปโหลดรูปภาพรถประกอบคันจริงอย่างน้อย 1 รูป"),
  coverImage: z.string().min(1, "กรุณาระบุรูปหน้าปกหลักให้ถูกต้อง"),
  contactName: z.string().min(2, "กรุณาระบุชื่อผู้ติดต่ออย่างน้อย 2 ตัวอักษร"),
  contactPhone: z.string().regex(/^0[0-9]{8,9}$/, "รูปแบบเบอร์โทรศัพท์มือถือไม่ถูกต้อง (เช่น 0812345678)"),
  contactEmail: z.string().email("กรุณากรอกที่อยู่ชื่ออีเมลให้ถูกต้อง").or(z.literal("")),
  sellerType: z.enum(["private", "dealer", "agent"]).default("private"),
  dealerId: z.string().optional(),
});

export type CarSellingFormInput = z.infer<typeof carSellingFormSchema>;
