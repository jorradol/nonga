import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { db, isMockConfig } from "../../lib/firebase";
import { handleFirestoreError, OperationType } from "../../utils/firebaseHelpers";
import { paymentService } from "../payments/paymentService";

export interface BoostPlan {
  id: "7_days" | "30_days" | "homepage_spotlight" | "ai_trending";
  name: string;
  durationDays: number;
  tokenCost: number;
  priceThb: number;
  features: string[];
  description: string;
}

export const BOOST_PLANS: Record<BoostPlan["id"], BoostPlan> = {
  "7_days": {
    id: "7_days",
    name: "สัปดาห์ทองคำ (7-Day Boost)",
    durationDays: 7,
    tokenCost: 5,
    priceThb: 150,
    features: ["แสดงบนแถบพรีเมียม", "ดันอันดับการค้นหาพื้นฐาน", "ตราสัญลักษณ์พรีเมียมขอบส้ม"],
    description: "โปรโมตรถของคุณให้เด่นชัดกว่าใครในสัปดาห์นี้และเข้าถึงสายตาผู้ซื้อได้เร็วขึ้น 3 เท่า"
  },
  "30_days": {
    id: "30_days",
    name: "ข้ามเดือนทองคำ (30-Day Auto Boost)",
    durationDays: 30,
    tokenCost: 15,
    priceThb: 400,
    features: ["แสดงแถบบนสุดเสมอ", "ดันอันดับการค้นหาลำดับสูงสุด", "ตราสัญลักษณ์กริตเตอร์สีทองพรีเมียม", "สถิติผู้เข้าชมเชิงลึกแบบรายวัน"],
    description: "ยึดครองพื้นที่แรกของการค้นหาตลอดหนึ่งรอบวันเต็ม คุ้มค่าและขายรถได้ไวแน่นอน!"
  },
  "homepage_spotlight": {
    id: "homepage_spotlight",
    name: "สปอตไลต์หน้าแรกปังที่สุด (Homepage Spotlight)",
    durationDays: 7,
    tokenCost: 10,
    priceThb: 250,
    features: ["แสดงในจุดพาดหัวสปอตไลต์หน้าแรก", "การขยายขนาดบัตรแสดงในหน้าโฮมเพจพิเศษ", "เอฟเฟกต์การกะพริบเรียกร้องสายตาดึงดูด"],
    description: "วางรถเด่นของท่านใต้ดวงตาผู้ซื้อในสปอตไลต์หน้าแรกที่ทุกคนต้องมองเมื่อเข้าแอป Nong A"
  },
  "ai_trending": {
    id: "ai_trending",
    name: "น้องเอแนะนำเทรนดิ้ง (AI Recommended Placement)",
    durationDays: 14,
    tokenCost: 8,
    priceThb: 200,
    features: ["แท็กแนะนำจาก น้องเอ AI แสนฉลาด", "เข้าข่ายแสดงผลในชุด Recommendation ทุกส่วน", "การเน้นโครงสร้างด้วยเงาสีดนดึงความสนใจ"],
    description: "ใช้อัลกอริทึมจับคู่ของน้องเอ แนะนำรถนี้ให้แก่ผู้ใช้ที่มีความสนใจและเข้าชมรถที่คล้ายคลึงกันอย่างแม่นยำ"
  }
};

export interface ActiveBoost {
  id: string;
  carId: string;
  userId: string;
  planId: BoostPlan["id"];
  planName: string;
  status: "active" | "expired";
  startTime: string;
  endTime: string;
  autoRenew: boolean;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BoostHistory {
  id: string;
  carId: string;
  userId: string;
  planId: string;
  planName: string;
  action: "purchase" | "auto_renew" | "expire" | "cancel";
  tokensUsed: number;
  timestamp: string;
  paymentMethod?: string;
  amountThb?: number;
}

export interface FeaturedCar {
  id: string; // carId
  carId: string;
  userId: string;
  title: string;
  price: number;
  coverImage: string;
  brand: string;
  model: string;
  boostEndTime: string;
  score: number;
}

export interface BoostAnalyticsData {
  carId: string;
  viewsBefore: number;
  viewsAfter: number;
  clicksBefore: number;
  clicksAfter: number;
  ctrBefore: number;
  ctrAfter: number;
  dailyViews: { date: string; base: number; boosted: number }[];
}

export const boostService = {
  // LocalStorage Simulated Helpers
  _getLocalBoosts(userId: string): ActiveBoost[] {
    try {
      const saved = localStorage.getItem(`nonga_boosts_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  _saveLocalBoosts(userId: string, data: ActiveBoost[]) {
    localStorage.setItem(`nonga_boosts_${userId}`, JSON.stringify(data));
  },

  _getLocalHistories(userId: string): BoostHistory[] {
    try {
      const saved = localStorage.getItem(`nonga_boost_histories_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  _saveLocalHistories(userId: string, data: BoostHistory[]) {
    localStorage.setItem(`nonga_boost_histories_${userId}`, JSON.stringify(data));
  },

  _getLocalFeaturedCars(): FeaturedCar[] {
    try {
      const saved = localStorage.getItem("nonga_featured_cars");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  _saveLocalFeaturedCars(data: FeaturedCar[]) {
    localStorage.setItem("nonga_featured_cars", JSON.stringify(data));
  },

  // 1. Fetch user's active boosts
  async listUserBoosts(userId: string): Promise<ActiveBoost[]> {
    const isMock = isMockConfig || !db || userId.startsWith("sim-") || userId === "guest-user-100";
    if (isMock) {
      return this._getLocalBoosts(userId);
    }

    try {
      const snap = await getDocs(query(collection(db, "boosts"), where("userId", "==", userId)));
      const list: ActiveBoost[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ActiveBoost);
      });
      return list;
    } catch (err) {
      return handleFirestoreError(err, OperationType.LIST, "boosts");
    }
  },

  // 2. Fetch a specific listing boost (if exists)
  async getCarActiveBoost(carId: string): Promise<ActiveBoost | null> {
    const isMock = isMockConfig || !db;
    if (isMock) {
      // Find among all localStorage lists
      const keys = Object.keys(localStorage);
      const boostKeys = keys.filter(k => k.startsWith("nonga_boosts_"));
      for (const k of boostKeys) {
        try {
          const list: ActiveBoost[] = JSON.parse(localStorage.getItem(k) || "[]");
          const active = list.find(b => b.carId === carId && b.status === "active");
          if (active) return active;
        } catch {}
      }
      return null;
    }

    try {
      const snap = await getDocs(query(collection(db, "boosts"), where("carId", "==", carId), where("status", "==", "active")));
      if (snap.empty) return null;
      let result: ActiveBoost | null = null;
      snap.forEach(doc => {
        result = { id: doc.id, ...doc.data() } as ActiveBoost;
      });
      return result;
    } catch (err) {
      return handleFirestoreError(err, OperationType.GET, `boosts/car/${carId}`);
    }
  },

  // 3. Purchase / Apply post boost
  // Tries to deduct premium tokens. If insufficient tokens AND payMethod is 'cash', it integrates standard Thai PromptPay simulation checkouts!
  async purchaseBoost(params: {
    userId: string;
    carId: string;
    planId: BoostPlan["id"];
    autoRenew: boolean;
    paymentMethod: "tokens" | "cash";
    userEmail?: string;
  }): Promise<{ status: "success" | "pending_payment"; model?: ActiveBoost; payment?: any }> {
    const isMock = isMockConfig || !db || params.userId.startsWith("sim-") || params.userId === "guest-user-100";
    const plan = BOOST_PLANS[params.planId];
    const email = params.userEmail || "dealer-auto@nongbot.org";

    const now = new Date();
    const endTime = new Date();
    endTime.setDate(now.getDate() + plan.durationDays);

    // FETCH PREMIUM FEATURES state to check tokens
    const premiumFeatures = await paymentService.getPremiumFeatures(params.userId);

    // If using tokens, confirm tokens are sufficient
    if (params.paymentMethod === "tokens") {
      if (premiumFeatures.boostTokens < plan.tokenCost) {
        throw new Error(`โทเค็นบูสต์ไม่เพียงพอ (ต้องการ ${plan.tokenCost} โทเค็น แต่คุณมี ${premiumFeatures.boostTokens} โทเค็น) กรุณาซื้อเพิ่มหรือจ่ายแยกต่างหากตามจริง`);
      }

      // Deduct Token
      const updatedPref = {
        ...premiumFeatures,
        boostTokens: premiumFeatures.boostTokens - plan.tokenCost,
        updatedAt: now.toISOString()
      };
      await paymentService.savePremiumFeatures(params.userId, updatedPref);
    } else {
      // paymentMethod == 'cash' -> PromptPay QR Checkout Creation
      const payRecordParams = {
        userId: params.userId,
        userEmail: email,
        amount: plan.priceThb,
        currency: "THB",
        paymentMethod: "promptpay" as const,
        description: `ซื้อชุดบูสต์โพสต์ระดับทองคำ แพลน: ${plan.name} สำหรับรถรหัสโพสต์ ${params.carId}`
      };
      
      const newPay = await paymentService.createPayment(payRecordParams);
      return {
        status: "pending_payment",
        payment: newPay
      };
    }

    // CREATE BOOST
    const newBoost: ActiveBoost = {
      id: "bst-" + Math.random().toString(36).substring(2, 11),
      carId: params.carId,
      userId: params.userId,
      planId: params.planId,
      planName: plan.name,
      status: "active",
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      autoRenew: params.autoRenew,
      features: plan.features,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // LOG HISTORY
    const newHistory: BoostHistory = {
      id: "hst-" + Math.random().toString(36).substring(2, 11),
      carId: params.carId,
      userId: params.userId,
      planId: params.planId,
      planName: plan.name,
      action: "purchase",
      tokensUsed: plan.tokenCost,
      timestamp: now.toISOString(),
      paymentMethod: params.paymentMethod,
      amountThb: 0
    };

    // UPDATE CAR LISTING STATE
    await this._syncCarListingPromoState(params.carId, true, params.planId);

    // PERSIST DATA
    if (isMock) {
      // Boosts
      const currentBoosts = this._getLocalBoosts(params.userId);
      this._saveLocalBoosts(params.userId, [newBoost, ...currentBoosts]);

      // Histories
      const currentHist = this._getLocalHistories(params.userId);
      this._saveLocalHistories(params.userId, [newHistory, ...currentHist]);

      // Featured list (Home)
      if (params.planId === "homepage_spotlight" || params.planId === "ai_trending") {
        const featuredCarObj = await this._buildFeaturedCarMetadata(params.carId, params.userId, endTime.toISOString());
        if (featuredCarObj) {
          const currentFeatured = this._getLocalFeaturedCars();
          this._saveLocalFeaturedCars([featuredCarObj, ...currentFeatured.filter(fc => fc.carId !== params.carId)]);
        }
      }
    } else {
      // Firestore writes
      await setDoc(doc(db, "boosts", newBoost.id), newBoost);
      await setDoc(doc(db, "boost_history", newHistory.id), newHistory);

      if (params.planId === "homepage_spotlight" || params.planId === "ai_trending") {
        const featuredCarObj = await this._buildFeaturedCarMetadata(params.carId, params.userId, endTime.toISOString());
        if (featuredCarObj) {
          await setDoc(doc(db, "featured_cars", params.carId), featuredCarObj);
        }
      }
    }

    return {
      status: "success",
      model: newBoost
    };
  },

  // Confirm and apply boost purchased via PromptPay cash flow
  async applyDirectCashBoost(paymentId: string, userId: string, carId: string, planId: BoostPlan["id"], autoRenew: boolean, email: string) {
    const isMock = isMockConfig || !db || userId.startsWith("sim-") || userId === "guest-user-100";
    const plan = BOOST_PLANS[planId];
    const now = new Date();
    const endTime = new Date();
    endTime.setDate(now.getDate() + plan.durationDays);

    // Finish standard payment transaction
    await paymentService.completePayment(userId, paymentId, email);

    // CREATE BOOST
    const newBoost: ActiveBoost = {
      id: "bst-" + Math.random().toString(36).substring(2, 11),
      carId,
      userId,
      planId,
      planName: plan.name,
      status: "active",
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      autoRenew,
      features: plan.features,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // LOG HISTORY
    const newHistory: BoostHistory = {
      id: "hst-" + Math.random().toString(36).substring(2, 11),
      carId,
      userId,
      planId,
      planName: plan.name,
      action: "purchase",
      tokensUsed: 0,
      timestamp: now.toISOString(),
      paymentMethod: "cash",
      amountThb: plan.priceThb
    };

    await this._syncCarListingPromoState(carId, true, planId);

    if (isMock) {
      const currentBoosts = this._getLocalBoosts(userId);
      this._saveLocalBoosts(userId, [newBoost, ...currentBoosts]);

      const currentHist = this._getLocalHistories(userId);
      this._saveLocalHistories(userId, [newHistory, ...currentHist]);

      if (planId === "homepage_spotlight" || planId === "ai_trending") {
        const featuredCarObj = await this._buildFeaturedCarMetadata(carId, userId, endTime.toISOString());
        if (featuredCarObj) {
          const currentFeatured = this._getLocalFeaturedCars();
          this._saveLocalFeaturedCars([featuredCarObj, ...currentFeatured.filter(fc => fc.carId !== carId)]);
        }
      }
    } else {
      await setDoc(doc(db, "boosts", newBoost.id), newBoost);
      await setDoc(doc(db, "boost_history", newHistory.id), newHistory);

      if (planId === "homepage_spotlight" || planId === "ai_trending") {
        const featuredCarObj = await this._buildFeaturedCarMetadata(carId, userId, endTime.toISOString());
        if (featuredCarObj) {
          await setDoc(doc(db, "featured_cars", carId), featuredCarObj);
        }
      }
    }

    return newBoost;
  },

  // 4. Update Auto-Renew toggles
  async toggleAutoRenew(userId: string, boostId: string, autoRenew: boolean): Promise<boolean> {
    const isMock = isMockConfig || !db || userId.startsWith("sim-") || userId === "guest-user-100";

    if (isMock) {
      const list = this._getLocalBoosts(userId);
      const updated = list.map(b => b.id === boostId ? { ...b, autoRenew, updatedAt: new Date().toISOString() } : b);
      this._saveLocalBoosts(userId, updated);
      return true;
    }

    try {
      const boostRef = doc(db, "boosts", boostId);
      await updateDoc(boostRef, { autoRenew, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      return handleFirestoreError(err, OperationType.WRITE, `boosts/${boostId}`);
    }
  },

  // 5. Expire or Expire check trigger manually (or cancel boost)
  async expireActiveBoost(userId: string, boostId: string): Promise<boolean> {
    const isMock = isMockConfig || !db || userId.startsWith("sim-") || userId === "guest-user-100";
    let carId = "";
    let planId: BoostPlan["id"] = "7_days";

    if (isMock) {
      const list = this._getLocalBoosts(userId);
      const target = list.find(b => b.id === boostId);
      if (target) {
        carId = target.carId;
        planId = target.planId;
        const updated = list.map(b => b.id === boostId ? { ...b, status: "expired" as const, updatedAt: new Date().toISOString() } : b);
        this._saveLocalBoosts(userId, updated);

        // Record history
        const newHist: BoostHistory = {
          id: "hst-" + Math.random().toString(36).substring(2, 11),
          carId,
          userId,
          planId: target.planId,
          planName: target.planName,
          action: "expire",
          tokensUsed: 0,
          timestamp: new Date().toISOString()
        };
        const currentHist = this._getLocalHistories(userId);
        this._saveLocalHistories(userId, [newHist, ...currentHist]);

        // Drop from Featured cars catalog too
        const featured = this._getLocalFeaturedCars();
        this._saveLocalFeaturedCars(featured.filter(fc => fc.carId !== carId));
      }
    } else {
      try {
        const bRef = doc(db, "boosts", boostId);
        const bSnap = await getDoc(bRef);
        if (bSnap.exists()) {
          const target = bSnap.data() as ActiveBoost;
          carId = target.carId;
          planId = target.planId;
          await updateDoc(bRef, { status: "expired", updatedAt: new Date().toISOString() });

          const newHist: BoostHistory = {
            id: "hst-" + Math.random().toString(36).substring(2, 11),
            carId,
            userId,
            planId: target.planId,
            planName: target.planName,
            action: "expire",
            tokensUsed: 0,
            timestamp: new Date().toISOString()
          };
          await setDoc(doc(db, "boost_history", newHist.id), newHist);
          await deleteDoc(doc(db, "featured_cars", carId));
        }
      } catch (err) {
        return handleFirestoreError(err, OperationType.WRITE, `boosts/expire/${boostId}`);
      }
    }

    if (carId) {
      // Sync state back to original CarListing
      await this._syncCarListingPromoState(carId, false, planId);
    }

    return true;
  },

  // 6. Fetch user's boost transactions history
  async getBoostHistory(userId: string): Promise<BoostHistory[]> {
    const isMock = isMockConfig || !db || userId.startsWith("sim-") || userId === "guest-user-100";
    if (isMock) {
      return this._getLocalHistories(userId);
    }

    try {
      const snap = await getDocs(query(collection(db, "boost_history"), where("userId", "==", userId)));
      const list: BoostHistory[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as BoostHistory);
      });
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (err) {
      return handleFirestoreError(err, OperationType.LIST, "boost_history");
    }
  },

  // 7. Get Boost performance Analytics data (before vs after boost)
  // Generates exceptionally realistic data structured charts
  getBoostAnalytics(carId: string, carTitle: string): BoostAnalyticsData {
    // Determine random seeds based on string IDs to maintain consistency across re-renders
    const num = carId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const scale = 1 + (num % 5) * 0.2;

    const viewsBefore = Math.floor(25 * scale);
    const viewsAfter = Math.floor(280 * scale);
    const clicksBefore = Math.floor(2 * scale);
    const clicksAfter = Math.floor(34 * scale);

    const ctrBefore = Number(((clicksBefore / viewsBefore) * 100).toFixed(1));
    const ctrAfter = Number(((clicksAfter / viewsAfter) * 100).toFixed(1));

    // Daily views line charts logs
    const dailyViews: BoostAnalyticsData["dailyViews"] = [];
    const dateNow = new Date();
    for (let i = 12; i >= 0; i--) {
      const d = new Date();
      d.setDate(dateNow.getDate() - i);
      const isPostBoost = i < 6; // Assume boost applied 6 days ago
      
      const dayFactor = 1 + Math.sin(i) * 0.3; // natural curve fluctuation
      const baseVal = Math.floor((3 + Math.random() * 4) * dayFactor);
      const boostedVal = isPostBoost ? Math.floor((30 + Math.random() * 25) * dayFactor) : 0;

      dailyViews.push({
        date: d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
        base: baseVal,
        boosted: boostedVal
      });
    }

    return {
      carId,
      viewsBefore,
      viewsAfter,
      clicksBefore,
      clicksAfter,
      ctrBefore,
      ctrAfter,
      dailyViews
    };
  },

  // Internal helpers
  async _syncCarListingPromoState(carId: string, isPromoted: boolean, planId: BoostPlan["id"]) {
    const isMock = isMockConfig || !db;
    
    // Determine target properties
    const featured = isPromoted && (planId === "homepage_spotlight" || planId === "ai_trending");
    const boosted = isPromoted; // All plans count as boosted visibility

    if (isMock) {
      try {
        const key = "nonga_marketplace_cars";
        const saved = localStorage.getItem(key);
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.map((c: any) => {
            if (c.id === carId) {
              return {
                ...c,
                boosted,
                featured,
                updatedAt: new Date().toISOString()
              };
            }
            return c;
          });
          localStorage.setItem(key, JSON.stringify(updated));
        }
      } catch (err) {
        console.error("Local storage sync error: ", err);
      }
    } else {
      try {
        const carRef = doc(db, "cars", carId);
        await updateDoc(carRef, {
          boosted,
          featured,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Firestore synchronisation error: ", err);
      }
    }
  },

  async _buildFeaturedCarMetadata(carId: string, userId: string, endTime: string): Promise<FeaturedCar | null> {
    const isMock = isMockConfig || !db;
    let carListing: any = null;

    if (isMock) {
      const saved = localStorage.getItem("nonga_marketplace_cars");
      if (saved) {
        const list = JSON.parse(saved);
        carListing = list.find((c: any) => c.id === carId);
      }
    } else {
      const snap = await getDoc(doc(db, "cars", carId));
      if (snap.exists()) {
        carListing = snap.data();
      }
    }

    if (!carListing) return null;

    return {
      id: carId,
      carId,
      userId,
      title: carListing.title,
      price: carListing.price,
      coverImage: carListing.coverImage || "",
      brand: carListing.brand,
      model: carListing.model,
      boostEndTime: endTime,
      score: carListing.aiScore || 85
    };
  }
};
