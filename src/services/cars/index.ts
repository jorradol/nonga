import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  orderBy, 
  runTransaction,
  serverTimestamp,
  FieldValue
} from "firebase/firestore";
import { db, auth, isMockConfig } from "../../lib/firebase";
import { 
  CarListing, 
  CarBrand, 
  CarModel, 
  CarView, 
  CarFavorite, 
  Dealer, 
  ShowroomReview, 
  CarComment, 
  CarReport 
} from "../../types/cars";
import { carListingSchema } from "../../validators/cars";
import { safeGetItem, safeSetItem } from "../../utils/safeLocalStorage";
import { sanitizeGalleryForStorage } from "../../utils/listingImageStorage";

// Error reporting mapping
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------- LOCAL HARDCODED FALLBACK SEED DATA ----------------
const LOCAL_BRANDS: CarBrand[] = [
  { id: "b1", name: "Tesla", slug: "tesla", country: "USA", establishedYear: 2003, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "b2", name: "Toyota", slug: "toyota", country: "Japan", establishedYear: 1937, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "b3", name: "Honda", slug: "honda", country: "Japan", establishedYear: 1948, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "b4", name: "BMW", slug: "bmw", country: "Germany", establishedYear: 1916, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "b5", name: "BYD", slug: "byd", country: "China", establishedYear: 1995, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "b6", name: "MG", slug: "mg", country: "UK/China", establishedYear: 1924, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

const LOCAL_MODELS: CarModel[] = [
  { id: "m1", brandId: "b1", brandName: "Tesla", name: "Model 3", slug: "model-3", bodyType: "Sedan", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "m2", brandId: "b1", brandName: "Tesla", name: "Model Y", slug: "model-y", bodyType: "SUV", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "m3", brandId: "b2", brandName: "Toyota", name: "Fortuner", slug: "fortuner", bodyType: "SUV", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "m4", brandId: "b2", brandName: "Toyota", name: "Corolla Altis", slug: "corolla-altis", bodyType: "Sedan", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "m5", brandId: "b3", brandName: "Honda", name: "Civic", slug: "civic", bodyType: "Sedan", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "m6", brandId: "b4", brandName: "BMW", name: "i4 M50", slug: "i4", bodyType: "Sedan", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "m7", brandId: "b5", brandName: "BYD", name: "Atto 3", slug: "atto-3", bodyType: "SUV", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: "m8", brandId: "b6", brandName: "MG", name: "Cyberster", slug: "cyberster", bodyType: "Roadster", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

const LOCAL_DEALERS: Dealer[] = [
  {
    id: "dl1",
    name: "NongBot Auto Premium Group Ratchada",
    slug: "nongbot-ratchada",
    userId: "simulated_dealer_1",
    logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=ratchada",
    coverImageUrl: "https://images.unsplash.com/photo-1562575214-da9fcf59b907?auto=format&fit=crop&q=80&w=800",
    description: "โชว์รูมดีลเลอร์ผู้เชี่ยวชาญ คัดสรรรถสเปกออโต้เทคโนโลยีสูง ผ่านเกณฑ์ Nong A AI 5-Point Check",
    phone: "081-345-6789",
    email: "ratchada@nongbotauto.com",
    address: "55 Ratchadapisek Road, Huai Khwang, Bangkok",
    province: "กรุงเทพมหานคร",
    verified: true,
    rating: 4.8,
    totalReviews: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "dl2",
    name: "EV Century Space Rama IX",
    slug: "ev-century-rama9",
    userId: "simulated_dealer_2",
    logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=rama9",
    coverImageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=800",
    description: "โชว์รูมยานยนต์อนาคต เน้นรถยนต์ระบบไฟฟ้า (EV) พลังบริสุทธิ์แท้พาสซันน์ดีสเปอร์ลี่ระดับประเทศ",
    phone: "082-999-8888",
    email: "contact@evcentury.com",
    address: "1024 Rama IX Road, Suan Luang, Bangkok",
    province: "กรุงเทพมหานคร",
    verified: true,
    rating: 4.9,
    totalReviews: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const STORAGE_KEYS = {
  CARS: "nonga_marketplace_cars",
  VIEWS: "nonga_marketplace_views",
  FAVORITES: "nonga_marketplace_favorites",
  COMMENTS: "nonga_marketplace_comments",
  REPORTS: "nonga_marketplace_reports",
  REVIEWS: "nonga_marketplace_reviews",
};

// Seed Localstorage helper
function getLocalData<T>(key: string, initial: T[]): T[] {
  const stored = safeGetItem(key);
  if (!stored) {
    safeSetItem(key, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(stored) as T[];
  } catch {
    return initial;
  }
}

type SaveLocalResult = { ok: true } | { ok: false; message: string };

function saveLocalData<T>(key: string, data: T[]): SaveLocalResult {
  const result = safeSetItem(key, JSON.stringify(data));
  if (result.ok === false) {
    return { ok: false, message: result.message };
  }
  return { ok: true };
}

// Global In-Memory and Storage seeding for consistent mock operation
if (typeof window !== "undefined") {
  getLocalData(STORAGE_KEYS.CARS, [
    {
      id: "car_sample_1",
      title: "Tesla Model Y Performance 2024 สเปกปังปุริเย่",
      slug: "tesla-model-y-performance-2024",
      brand: "Tesla",
      model: "Model Y",
      year: 2024,
      generation: "M3Y Phase 2",
      bodyType: "SUV",
      transmission: "auto",
      fuelType: "electric",
      mileage: 8200,
      color: "สีขาวมุกสะท้อนแสง",
      engineSize: "Dual Motor 450HP",
      drivetrain: "AWD",
      condition: "excellent",
      price: 1890000,
      negotiable: true,
      province: "กรุงเทพมหานคร",
      description: "รถบ้านป้ายแดงเจ้าของขับเองมือเดียว วิ่งน้อยมาก สภาพสวยออโต้ระดับกังวาน ได้เครื่องชาร์จกำแพงวอลส์ชาร์จเจอร์ อุปกรณ์สมบูรณ์ครบครันครับ",
      features: ["Tesla Autopilot", "Premium Sound", "Glass Roof", "Heat Pump"],
      tags: ["กระแสแรง", "คุ้มประหยัด", "EVพร้อมลื่น"],
      coverImage: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&q=80&w=600",
      gallery: [
        "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=600"
      ],
      sellerId: "seller_sys_example",
      sellerType: "dealer",
      dealerId: "dl1",
      status: "approved",
      featured: true,
      boosted: true,
      aiGenerated: true,
      aiScore: 94,
      aiAnalysis: "### 🤖 บทวิเคราะห์เชิงเทคนิคจาก Nong A\n\nรถ Tesla Model Y Performance คันนี้จัดได้ว่าเป็นรถสภาพนางฟ้า 94/100 วิ่งน้อยมากเฉลี่ยปีละต่ำกว่า 10,000 กม. คุ้มค่าอย่างยิ่งด้วยค่าประจุไฟฟ้าที่ประหยัดเงินได้สูงสุดถึง 80% เมื่อเทียบกับรถคันอื่นในระดับขนาด SUV เดียวกันครับ!",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalViews: 412,
      totalFavorites: 32
    },
    {
      id: "car_sample_2",
      title: "BYD Atto 3 Extended Range สภาพหอมฟุ้งน่าขับ",
      slug: "byd-atto-3-extended-range-2023",
      brand: "BYD",
      model: "Atto 3",
      year: 2023,
      generation: "Premium 60kWh",
      bodyType: "SUV",
      transmission: "auto",
      fuelType: "electric",
      mileage: 26000,
      color: "สีเทาตะกั่วสว่าง",
      engineSize: "201HP",
      drivetrain: "FWD",
      condition: "excellent",
      price: 859000,
      negotiable: false,
      province: "ชลบุรี",
      description: "คาร์ไฟฟ้าพรีเมียมราคาประหยัด ออฟชั่นอัดแน่น ล้อแต่งสปอร์ต ฟิล์มเซรามิคกันความร้อนจัดเต็ม ติดต่อเทสหาสภาพทดสอบได้ตลอดเวลาครับ",
      features: ["L2 Driver Assist", "Rotatable Touchscreen", "Enclosed Grille", "NFC Card Key"],
      tags: ["EVยอดฮิต", "ดอกเบี้ยพิเศษ", "ดีลเด็ดด่วน"],
      coverImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600",
      gallery: [
        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600"
      ],
      sellerId: "seller_other_example",
      sellerType: "private",
      status: "approved",
      featured: false,
      boosted: false,
      aiGenerated: true,
      aiScore: 89,
      aiAnalysis: "### 🤖 บทวิเคราะห์เชิงเทคนิคจาก Nong A\n\nBYD Atto 3 ราคาสุดคุ้มประหยัดงบกว่าออกห้างไปเกือบครึ่งล้านบาท! แบตเตอรี่ Blade Battery มีความคงทนและปลอดภัยสูง ขับขี่สมูทตอบสนองเยี่ยม เหมาะสำหรับเป็นรถคันแรกของครอบครัวครับ",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      totalViews: 198,
      totalFavorites: 14
    }
  ]);
  getLocalData(STORAGE_KEYS.REVIEWS, []);
  getLocalData(STORAGE_KEYS.COMMENTS, [
    {
      id: "c1",
      carId: "car_sample_1",
      userId: "guest_buyer",
      userDisplayName: "คุณพจน์ กัลยาณมิตร",
      userPhotoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=FormulaOne",
      commentText: "รถสวยกริ๊บมากเลยครับ ตรวจสภาพแบตเตอรี่เสื่อมเหลือมกี่เปอร์เซ็นต์เหรอครับพี่ชาย?",
      createdAt: new Date(Date.now() - 12000000).toISOString()
    }
  ]);
  getLocalData(STORAGE_KEYS.REPORTS, []);
}

// ---------------- MARKETPLACE SERVICE IMPLEMENTATION ----------------
export const CarsService = {

  // FETCH CAR LISTINGS WITH FILTERING
  async listCars(filters?: {
    brand?: string;
    model?: string;
    status?: string;
    sellerId?: string;
    fuelType?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    limitCount?: number;
  }): Promise<CarListing[]> {
    const isMock = isMockConfig || !db;

    if (isMock) {
      // Simulate network lag
      await new Promise(r => setTimeout(r, 150));
      let list = getLocalData<CarListing>(STORAGE_KEYS.CARS, []);
      if (filters) {
        if (filters.brand) list = list.filter(c => c.brand.toLowerCase() === filters.brand?.toLowerCase());
        if (filters.model) list = list.filter(c => c.model.toLowerCase() === filters.model?.toLowerCase());
        if (filters.status) list = list.filter(c => c.status === filters.status);
        if (filters.sellerId) list = list.filter(c => c.sellerId === filters.sellerId);
        if (filters.fuelType) list = list.filter(c => c.fuelType === filters.fuelType);
        if (filters.condition) list = list.filter(c => c.condition === filters.condition);
        if (filters.minPrice !== undefined) list = list.filter(c => c.price >= (filters.minPrice ?? 0));
        if (filters.maxPrice !== undefined) list = list.filter(c => c.price <= (filters.maxPrice ?? Infinity));
      }
      // Sort by newest by default
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (filters?.limitCount) {
        list = list.slice(0, filters.limitCount);
      }
      return list;
    }

    const colPath = "cars";
    try {
      let q = query(collection(db, colPath));
      if (filters?.status) {
        q = query(q, where("status", "==", filters.status));
      } else {
        // Default only approved/active cars for public viewing
        q = query(q, where("status", "==", "approved"));
      }
      
      if (filters?.brand) q = query(q, where("brand", "==", filters.brand));
      if (filters?.model) q = query(q, where("model", "==", filters.model));
      if (filters?.sellerId) q = query(q, where("sellerId", "==", filters.sellerId));
      if (filters?.fuelType) q = query(q, where("fuelType", "==", filters.fuelType));
      
      if (filters?.limitCount) {
        q = query(q, limit(filters.limitCount));
      }

      const snap = await getDocs(q);
      const results: CarListing[] = [];
      snap.forEach((docSnap) => {
        results.push({ id: docSnap.id, ...docSnap.data() } as CarListing);
      });

      // Filter in memory for parameters not easily indexable in Firestore without compound index creation
      let filtered = results;
      if (filters?.minPrice !== undefined) {
        filtered = filtered.filter(c => c.price >= filters.minPrice!);
      }
      if (filters?.maxPrice !== undefined) {
        filtered = filtered.filter(c => c.price <= filters.maxPrice!);
      }

      return filtered;
    } catch (e) {
      return handleFirestoreError(e, OperationType.LIST, colPath);
    }
  },

  // FETCH SINGLE CAR BY ID
  async getCar(id: string): Promise<CarListing | null> {
    const isMock = isMockConfig || !db;
    
    if (isMock) {
      await new Promise(r => setTimeout(r, 100));
      const list = getLocalData<CarListing>(STORAGE_KEYS.CARS, []);
      const car = list.find(c => c.id === id);
      return car || null;
    }

    try {
      const snap = await getDoc(doc(db, "cars", id));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as CarListing;
    } catch (e) {
      return handleFirestoreError(e, OperationType.GET, `cars/${id}`);
    }
  },

  // CREATE CAR LISTING (WITH 5 POST LIMIT FOR FREE USERS!)
  async createCar(userId: string, userRole: string, carInput: Omit<CarListing, "id" | "createdAt" | "updatedAt" | "totalViews" | "totalFavorites">): Promise<CarListing> {
    const isMock = isMockConfig || !db;

    // Validate using Zod first
    const validated = carListingSchema.parse({
      ...carInput,
      status: carInput.status || "draft",
      featured: carInput.featured || false,
      boosted: carInput.boosted || false,
      aiGenerated: carInput.aiGenerated || false,
    });

    // Check Business Rules: Free / Member user can only create 5 posts!
    const isDealerOrAdmin = ["dealer", "admin", "superadmin", "premium"].includes(userRole);
    
    if (isMock) {
      let list = getLocalData<CarListing>(STORAGE_KEYS.CARS, []);
      const userActivePosts = list.filter(c => c.sellerId === userId).length;
      
      if (!isDealerOrAdmin && userActivePosts >= 5) {
        throw new Error(
          JSON.stringify({
            error: "BUSINESS_LIMIT_ERROR",
            message: "คุณมีสิทธิ์สมาชิกแบบฟรี ทาวิลีย์สร้างโพสต์จำกัดได้ไม่เกิน 5 คันครับ โปรดทำการเลื่อนระดับบัญชีเป็นสิทธิ์ PRO หรือ Dealer เพื่อความพรีเมียมไม่จำกัดโพสต์ครับ!"
          })
        );
      }

      const { coverImage, gallery } = sanitizeGalleryForStorage(
        (validated as CarListing).gallery,
        (validated as CarListing).coverImage
      );

      const newCar: CarListing = {
        ...(validated as CarListing),
        coverImage,
        gallery,
        id: "loc_car_" + Math.random().toString(36).substring(2, 11),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalViews: 0,
        totalFavorites: 0,
      };

      list.push(newCar);
      const saveResult = saveLocalData(STORAGE_KEYS.CARS, list);
      if (saveResult.ok === false) {
        (newCar as CarListing & { _storageWarning?: string })._storageWarning =
          saveResult.message;
      }
      return newCar;
    }

    try {
      // Fetch Firestore count dynamically for enforcement
      const q = query(collection(db, "cars"), where("sellerId", "==", userId));
      const snap = await getDocs(q);
      const userActivePosts = snap.size;

      if (!isDealerOrAdmin && userActivePosts >= 5) {
        throw new Error(
          JSON.stringify({
            error: "BUSINESS_LIMIT_ERROR",
            message: "สิทธิ์สมาชิกบัญชีฟรีทั่วไป ได้รับโควตาโพสต์สูงสุด 5 คันครับ กรุณาสลับหรือเลื่อนระดับโปรไฟล์เป็นผู้ขาย Premium หรือ Dealer คาร์ครับ!"
          })
        );
      }

      const carId = doc(collection(db, "cars")).id;
      const docPayload = {
        ...validated,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalViews: 0,
        totalFavorites: 0,
      };

      await setDoc(doc(db, "cars", carId), docPayload);
      return { id: carId, ...docPayload } as CarListing;

    } catch (e: any) {
      if (e.message?.includes("BUSINESS_LIMIT_ERROR")) {
        throw e;
      }
      return handleFirestoreError(e, OperationType.CREATE, "cars");
    }
  },

  // UPDATE CAR LISTING
  async updateCar(carId: string, userId: string, updates: Partial<CarListing>): Promise<CarListing> {
    const isMock = isMockConfig || !db;

    if (isMock) {
      let list = getLocalData<CarListing>(STORAGE_KEYS.CARS, []);
      const idx = list.findIndex(c => c.id === carId);
      if (idx === -1) throw new Error("Car listing not found");

      // Verify owner
      if (list[idx].sellerId !== userId && userId !== "moderator_admin") {
        throw new Error("Unauthorized to edit this listing");
      }

      const updated = {
        ...list[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      list[idx] = updated;
      saveLocalData(STORAGE_KEYS.CARS, list);
      return updated;
    }

    try {
      const carRef = doc(db, "cars", carId);
      const snap = await getDoc(carRef);
      if (!snap.exists()) throw new Error("Car listing does not exist");
      const currentCar = snap.data() as CarListing;

      if (currentCar.sellerId !== userId && userId !== "moderator_admin") {
        throw new Error("Unauthorized permission edit on cars");
      }

      const payload = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(carRef, payload);
      return { ...currentCar, ...payload, id: carId } as CarListing;
    } catch (e) {
      return handleFirestoreError(e, OperationType.UPDATE, `cars/${carId}`);
    }
  },

  // DELETE CAR LISTING
  async deleteCar(carId: string, userId: string): Promise<boolean> {
    const isMock = isMockConfig || !db;

    if (isMock) {
      let list = getLocalData<CarListing>(STORAGE_KEYS.CARS, []);
      const car = list.find(c => c.id === carId);
      if (!car) return false;
      if (car.sellerId !== userId && userId !== "moderator_admin") {
        throw new Error("Unauthorized delete request");
      }

      const filtered = list.filter(c => c.id !== carId);
      saveLocalData(STORAGE_KEYS.CARS, filtered);
      return true;
    }

    try {
      const carRef = doc(db, "cars", carId);
      const snap = await getDoc(carRef);
      if (!snap.exists()) return false;
      const car = snap.data() as CarListing;

      if (car.sellerId !== userId && userId !== "moderator_admin") {
        throw new Error("Unauthorized delete on Firestore collection row");
      }

      await deleteDoc(carRef);
      return true;
    } catch (e) {
      return handleFirestoreError(e, OperationType.DELETE, `cars/${carId}`);
    }
  },

  // INCREMENT VIEW COUNTER (TRANSACTION SAFE)
  async incrementViews(carId: string, userId?: string | null, ipAddress?: string, userAgent?: string): Promise<number> {
    const isMock = isMockConfig || !db;
    const trackingId = "cv_" + Math.random().toString(36).substring(2, 11);

    if (isMock) {
      let cars = getLocalData<CarListing>(STORAGE_KEYS.CARS, []);
      const idx = cars.findIndex(c => c.id === carId);
      if (idx !== -1) {
        cars[idx].totalViews = (cars[idx].totalViews || 0) + 1;
        saveLocalData(STORAGE_KEYS.CARS, cars);

        // Store view record
        let views = getLocalData<CarView>(STORAGE_KEYS.VIEWS, []);
        views.push({
          id: trackingId,
          carId,
          userId: userId || null,
          ipAddress,
          userAgent,
          viewedAt: new Date().toISOString()
        });
        saveLocalData(STORAGE_KEYS.VIEWS, views);

        return cars[idx].totalViews;
      }
      return 0;
    }

    try {
      const carRef = doc(db, "cars", carId);
      const viewRef = doc(collection(db, "car_views"), trackingId);

      // Perform atomic database transaction to prevent concurrency collision
      const newTotalViews = await runTransaction(db, async (trans) => {
        const carSnap = await trans.get(carRef);
        if (!carSnap.exists()) return 0;
        
        const currentViews = carSnap.data().totalViews || 0;
        const nextViews = currentViews + 1;

        trans.update(carRef, { totalViews: nextViews });
        trans.set(viewRef, {
          carId,
          userId: userId || null,
          ipAddress: ipAddress || "unknown",
          userAgent: userAgent || "unknown",
          viewedAt: new Date().toISOString()
        });

        return nextViews;
      });

      return newTotalViews;
    } catch (e) {
      return handleFirestoreError(e, OperationType.WRITE, `cars/${carId}/views`);
    }
  },

  // TOGGLE FAVORITE BOOKMARK (TRANSACTION SAFE)
  async toggleFavorite(carId: string, userId: string): Promise<boolean> {
    const isMock = isMockConfig || !db;
    const favoriteUniqueId = `fav_${userId}_${carId}`;

    if (isMock) {
      let favorites = getLocalData<CarFavorite>(STORAGE_KEYS.FAVORITES, []);
      const existingIdx = favorites.findIndex(f => f.userId === userId && f.carId === carId);
      let isSubscribing = false;

      let cars = getLocalData<CarListing>(STORAGE_KEYS.CARS, []);
      const carIdx = cars.findIndex(c => c.id === carId);

      if (existingIdx !== -1) {
        favorites.splice(existingIdx, 1);
        isSubscribing = false;
        if (carIdx !== -1) {
          cars[carIdx].totalFavorites = Math.max(0, (cars[carIdx].totalFavorites || 1) - 1);
        }
      } else {
        favorites.push({
          id: favoriteUniqueId,
          userId,
          carId,
          createdAt: new Date().toISOString()
        });
        isSubscribing = true;
        if (carIdx !== -1) {
          cars[carIdx].totalFavorites = (cars[carIdx].totalFavorites || 0) + 1;
        }
      }

      saveLocalData(STORAGE_KEYS.FAVORITES, favorites);
      saveLocalData(STORAGE_KEYS.CARS, cars);
      return isSubscribing;
    }

    try {
      const favDocRef = doc(db, "car_favorites", favoriteUniqueId);
      const carRef = doc(db, "cars", carId);

      const added = await runTransaction(db, async (trans) => {
        const favSnap = await trans.get(favDocRef);
        const carSnap = await trans.get(carRef);
        if (!carSnap.exists()) throw new Error("Car does not exist");

        const curFavorites = carSnap.data().totalFavorites || 0;

        if (favSnap.exists()) {
          trans.delete(favDocRef);
          trans.update(carRef, { totalFavorites: Math.max(0, curFavorites - 1) });
          return false;
        } else {
          trans.set(favDocRef, {
            userId,
            carId,
            createdAt: new Date().toISOString()
          });
          trans.update(carRef, { totalFavorites: curFavorites + 1 });
          return true;
        }
      });

      return added;
    } catch (e) {
      return handleFirestoreError(e, OperationType.WRITE, `car_favorites/${favoriteUniqueId}`);
    }
  },

  // LIST OUT BRANDS
  async listBrands(): Promise<CarBrand[]> {
    const isMock = isMockConfig || !db;
    if (isMock) return LOCAL_BRANDS;

    const colPath = "car_brands";
    try {
      const snap = await getDocs(collection(db, colPath));
      const results: CarBrand[] = [];
      snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CarBrand));
      return results.length ? results : LOCAL_BRANDS;
    } catch (e) {
      return handleFirestoreError(e, OperationType.LIST, colPath);
    }
  },

  // LIST OUT MODELS
  async listModels(brandId?: string): Promise<CarModel[]> {
    const isMock = isMockConfig || !db;
    if (isMock) {
      if (brandId) return LOCAL_MODELS.filter(m => m.brandId === brandId);
      return LOCAL_MODELS;
    }

    const colPath = "car_models";
    try {
      let q = query(collection(db, colPath));
      if (brandId) {
        q = query(q, where("brandId", "==", brandId));
      }
      const snap = await getDocs(q);
      const results: CarModel[] = [];
      snap.forEach((d) => results.push({ id: d.id, ...d.data() } as CarModel));
      return results.length ? results : LOCAL_MODELS;
    } catch (e) {
      return handleFirestoreError(e, OperationType.LIST, colPath);
    }
  },

  // LOAD CAR COMMENTS
  async listComments(carId: string): Promise<CarComment[]> {
    const isMock = isMockConfig || !db;
    if (isMock) {
      const list = getLocalData<CarComment>(STORAGE_KEYS.COMMENTS, []);
      return list.filter(c => c.carId === carId).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    const colPath = "car_comments";
    try {
      const q = query(collection(db, colPath), where("carId", "==", carId), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      const comments: CarComment[] = [];
      snap.forEach((d) => comments.push({ id: d.id, ...d.data() } as CarComment));
      return comments;
    } catch (e) {
      return handleFirestoreError(e, OperationType.LIST, colPath);
    }
  },

  // POST A NEW COMMENT
  async addComment(carId: string, userId: string, userDisplayName: string, userPhotoURL: string, commentText: string): Promise<CarComment> {
    const isMock = isMockConfig || !db;

    const record = {
      carId,
      userId,
      userDisplayName,
      userPhotoURL,
      commentText,
      createdAt: new Date().toISOString()
    };

    if (isMock) {
      let list = getLocalData<CarComment>(STORAGE_KEYS.COMMENTS, []);
      const newComment = { id: "comm_" + Math.random().toString(36).substring(2, 11), ...record };
      list.push(newComment);
      saveLocalData(STORAGE_KEYS.COMMENTS, list);
      return newComment;
    }

    const colPath = "car_comments";
    try {
      const docRef = await addDoc(collection(db, colPath), record);
      return { id: docRef.id, ...record };
    } catch (e) {
      return handleFirestoreError(e, OperationType.CREATE, colPath);
    }
  },

  // SUBMIT FRAUD/SPAM REPORT
  async submitReport(carId: string, reporterId: string, reporterEmail: string, reason: string, description?: string): Promise<CarReport> {
    const isMock = isMockConfig || !db;

    const record = {
      carId,
      reporterId,
      reporterEmail,
      reason: reason as any,
      description: description || "",
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMock) {
      let list = getLocalData<CarReport>(STORAGE_KEYS.REPORTS, []);
      const newReport = { id: "rep_" + Math.random().toString(36).substring(2, 11), ...record };
      list.push(newReport);
      saveLocalData(STORAGE_KEYS.REPORTS, list);
      return newReport;
    }

    const colPath = "car_reports";
    try {
      const docRef = await addDoc(collection(db, colPath), record);
      return { id: docRef.id, ...record };
    } catch (e) {
      return handleFirestoreError(e, OperationType.CREATE, colPath);
    }
  },

  // LIST OUT DEALS FROM SHOWROOMS
  async listDealers(): Promise<Dealer[]> {
    const isMock = isMockConfig || !db;
    if (isMock) return LOCAL_DEALERS;

    const colPath = "dealers";
    try {
      const snap = await getDocs(collection(db, colPath));
      const results: Dealer[] = [];
      snap.forEach((d) => results.push({ id: d.id, ...d.data() } as Dealer));
      return results.length ? results : LOCAL_DEALERS;
    } catch (e) {
      return handleFirestoreError(e, OperationType.LIST, colPath);
    }
  }
};
