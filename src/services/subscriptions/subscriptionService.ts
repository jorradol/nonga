import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, isMockConfig } from "../../lib/firebase";
import { handleFirestoreError, OperationType } from "../../utils/firebaseHelpers";

export interface SubscriptionPlan {
  id: "free" | "dealer_pro" | "dealer_premium";
  name: string;
  price: number;
  currency: string;
  features: string[];
  limits: {
    posts: number;
    hasShowroom: boolean;
    aiPostGeneration: boolean;
    aiCaptions: boolean;
    analytics: boolean;
    aiAutoReply: boolean;
    aiSalesAssistant: boolean;
    seoBoost: boolean;
    priorityListing: boolean;
  };
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan["id"], SubscriptionPlan> = {
  free: {
    id: "free",
    name: "Free Plan",
    price: 0,
    currency: "THB",
    features: [
      "ลงประกาศขายรถสูงสุด 5 โพสต์",
      "คุยกับน้องเอ AI มาร์เกตเพลสโหมดพื้นฐาน",
      "ระบบช่วยเหลือผู้ซื้อรถดีบ้านเด็ด"
    ],
    limits: {
      posts: 5,
      hasShowroom: false,
      aiPostGeneration: false,
      aiCaptions: false,
      analytics: false,
      aiAutoReply: false,
      aiSalesAssistant: false,
      seoBoost: false,
      priorityListing: false
    }
  },
  dealer_pro: {
    id: "dealer_pro",
    name: "Dealer Pro",
    price: 990,
    currency: "THB",
    features: [
      "ลงโพสต์ขายรถได้ไม่จำกัด (Unlimited Posts)",
      "นวัตกรรมเขียนสเป็ก AI Post Generator 🪄",
      "สร้างแคปชั่น AI Captions กระตุ้นอารมณ์เขียนสนุก",
      "ระบบวิเคราะห์สต็อกอัจฉริยะ (Insights Dashboard)",
      "เปิดเพจโชว์รูมดีลเลอร์ลิขสิทธิ์เฉพาะคุณ",
      "ระบบแชร์ต่อรองตรงใจผู้ซื้อทันที"
    ],
    limits: {
      posts: 999999,
      hasShowroom: true,
      aiPostGeneration: true,
      aiCaptions: true,
      analytics: true,
      aiAutoReply: false,
      aiSalesAssistant: false,
      seoBoost: false,
      priorityListing: false
    }
  },
  dealer_premium: {
    id: "dealer_premium",
    name: "Dealer Premium",
    price: 2490,
    currency: "THB",
    features: [
      "ลงโพสต์ขายรถได้ไม่จำกัด พร้อมฟิลเตอร์อัพระดับ VIP",
      "รวมฟังก์ชันระบบ Pro ครบถ้วนทุกข้อ",
      "ระบบแชท AI Auto Reply ตอบแทนทันใจ 24 ชม. 🤖",
      "น้องเอ AI Sales Assistant ช่วยปิดออเดอร์มัดจำรถ",
      "ระบบบูสต์ SEO ดึงดูดประชากรจาก Google / Facebook",
      " Priority Listing ดันโพสต์ขึ้นตำแหน่งแรกเฉือนคู่แข่ง VIP"
    ],
    limits: {
      posts: 999999,
      hasShowroom: true,
      aiPostGeneration: true,
      aiCaptions: true,
      analytics: true,
      aiAutoReply: true,
      aiSalesAssistant: true,
      seoBoost: true,
      priorityListing: true
    }
  }
};

export interface Subscription {
  userId: string;
  planId: SubscriptionPlan["id"];
  planName: string;
  status: "active" | "cancelled" | "past_due" | "trialing";
  price: number;
  currency: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export const subscriptionService = {
  getSimulatedSubscription(userId: string): Subscription | null {
    try {
      const dbKey = `nonga_sim_sub_${userId}`;
      const saved = localStorage.getItem(dbKey);
      if (saved) {
        return JSON.parse(saved);
      }
      // Create initial free plan subscription
      const initial: Subscription = {
        userId,
        planId: "free",
        planName: "Free Plan",
        status: "active",
        price: 0,
        currency: "THB",
        cancelAtPeriodEnd: false,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(dbKey, JSON.stringify(initial));
      return initial;
    } catch {
      return null;
    }
  },

  setSimulatedSubscription(userId: string, sub: Subscription) {
    localStorage.setItem(`nonga_sim_sub_${userId}`, JSON.stringify(sub));
  },

  // Retrieve subscription for a user (combining Firestore and simulated fallbacks)
  async getSubscription(userId: string): Promise<Subscription> {
    const isSimulated = isMockConfig || userId.startsWith("sim-") || userId === "guest-user-100";
    if (isSimulated) {
      return this.getSimulatedSubscription(userId) || {
        userId,
        planId: "free",
        planName: "Free Plan",
        status: "active",
        price: 0,
        currency: "THB",
        cancelAtPeriodEnd: false,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    if (!db) {
      throw new Error("ฐานข้อมูลไม่พร้อมเชื่อมต่อชั่วคราว");
    }

    try {
      const subDocRef = doc(db, "subscriptions", userId);
      const snap = await getDoc(subDocRef);
      if (snap.exists()) {
        return snap.data() as Subscription;
      }

      // Provision initial free subscription document in real Firestore
      const initialFree: Subscription = {
        userId,
        planId: "free",
        planName: "Free Plan",
        status: "active",
        price: 0,
        currency: "THB",
        cancelAtPeriodEnd: false,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(subDocRef, initialFree);
      return initialFree;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, `subscriptions/${userId}`);
    }
  },

  // Save/Update active subscription and sync user metadata
  async updateSubscription(userId: string, updates: Partial<Subscription>): Promise<Subscription> {
    const isSimulated = isMockConfig || userId.startsWith("sim-") || userId === "guest-user-100";
    const current = await this.getSubscription(userId);
    const updated: Subscription = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (isSimulated) {
      this.setSimulatedSubscription(userId, updated);
      
      // Update simulated user model listing bounds
      const savedUsers = localStorage.getItem("nonga_simulated_users") 
        ? JSON.parse(localStorage.getItem("nonga_simulated_users")!) 
        : {};
      if (savedUsers[userId]) {
        savedUsers[userId].membershipType = updated.planId;
        savedUsers[userId].postLimit = SUBSCRIPTION_PLANS[updated.planId].limits.posts;
        savedUsers[userId].role = updated.planId !== "free" ? "dealer" : "member";
        localStorage.setItem("nonga_simulated_users", JSON.stringify(savedUsers));
      }
      return updated;
    }

    if (!db) {
      throw new Error("ฐานข้อมูลปฎิเสธการเชื่อมต่อ");
    }

    try {
      const subDocRef = doc(db, "subscriptions", userId);
      await setDoc(subDocRef, updated);

      // Sync attributes back to the primary users collect document
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        membershipType: updated.planId,
        postLimit: SUBSCRIPTION_PLANS[updated.planId].limits.posts,
        role: updated.planId !== "free" ? "dealer" : "member"
      });

      return updated;
    } catch (error) {
      return handleFirestoreError(error, OperationType.WRITE, `subscriptions/${userId}`);
    }
  },

  // Standard checkout complete handler (PromptPay or Card checkin)
  async handlePlanUpgrade(userId: string, planId: SubscriptionPlan["id"]): Promise<Subscription> {
    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(now.getDate() + 30); // Monthly bill boundary

    const details = SUBSCRIPTION_PLANS[planId];
    return this.updateSubscription(userId, {
      planId,
      planName: details.name,
      status: "active",
      price: details.price,
      currency: "THB",
      cancelAtPeriodEnd: false,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString()
    });
  },

  // Cancellation service: updates the plan status or keeps list till periodic cycle ends
  async cancelSubscription(userId: string, immediate: boolean = false): Promise<Subscription> {
    if (immediate) {
      return this.updateSubscription(userId, {
        planId: "free",
        planName: "Free Plan",
        status: "active",
        price: 0,
        currency: "THB",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return this.updateSubscription(userId, {
      cancelAtPeriodEnd: true,
      status: "cancelled"
    });
  }
};
