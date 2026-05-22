import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db, isMockConfig } from "../../../lib/firebase";

export interface AiPremiumSubscription {
  userId: string;
  status: "active" | "expired" | "cancelled" | "past_due";
  tier: "free" | "premium";
  tokens: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiUsageTracker {
  userId: string;
  featureId: string;
  usedCount: number;
  limitCount: number;
  resetAt?: string;
  updatedAt: string;
}

export type PremiumAiFeatureId = 
  | "post-generation"
  | "caption-generator"
  | "car-analysis"
  | "sales-assistant"
  | "auto-reply"
  | "seo-writer"
  | "emotional-storytelling"
  | "luxury-writing"
  | "trending-hook";

export interface PremiumFeatureInfo {
  id: PremiumAiFeatureId;
  name: string;
  thaiName: string;
  description: string;
  emoji: string;
  isUnlockedInFree: boolean;
  freeLimit?: number; 
}

export const PREMIUM_FEATURES_LIST: PremiumFeatureInfo[] = [
  {
    id: "post-generation",
    name: "AI Post Generation",
    thaiName: "เครื่องมือสร้างโพสต์ขายรถขั้นเทพ",
    description: "สร้างโพสต์โฆษณาขายรถละเอียดครอบคลุมทุกสื่อสังคมออนไลน์ยอดฮิต",
    emoji: "📝",
    isUnlockedInFree: true,
    freeLimit: 5
  },
  {
    id: "car-analysis",
    name: "AI Car Analysis",
    thaiName: "ประเมินสภาพและตรวจสีรถ Nong A Vision",
    description: "สแกนพิกเซล ตรวจสอบรอยแตกร้าวเฉี่ยวชนและสกัดจุดขายสำคัญ",
    emoji: "📸",
    isUnlockedInFree: true,
    freeLimit: 3
  },
  {
    id: "caption-generator",
    name: "Viral Caption Generator",
    thaiName: "ระบบแคปชั่นดึงกระแสไวรัล",
    description: "แต่งแคปชั่นสั้นกระชับเรียกยอดแชร์ล้านใจ ดันลูกค้าทักแชทด่วนจี๋",
    emoji: "⚡",
    isUnlockedInFree: false
  },
  {
    id: "sales-assistant",
    name: "AI Sales Assistant",
    thaiName: "ผู้ช่วยปั่นปิดการขายปิดบิล",
    description: "แนะนำสคริปต์ตอบคำขอต่อประหยัด ทลายทุกข้อโต้แย้งลูกค้า",
    emoji: "💰",
    isUnlockedInFree: false
  },
  {
    id: "auto-reply",
    name: "AI Auto Reply & Nurture",
    thaiName: "บอทโต้ตอบแชทเพจคนทักแรก",
    description: "ออกแบบข้อความต้อนรับและให้ข้อมูลสเป็คด่วนทันควันไม่มีหลุดสายตา",
    emoji: "💬",
    isUnlockedInFree: false
  },
  {
    id: "seo-writer",
    name: "AI SEO Writer",
    thaiName: "นักเขียนคอนเทนต์ติดอันดับ Google Search",
    description: "สอดแทรกคีย์เวิร์ดยอดนิยมและโค้ดโครงสร้าง SEO ยกระดับอันดับเว็บบล็อก",
    emoji: "🌐",
    isUnlockedInFree: false
  },
  {
    id: "emotional-storytelling",
    name: "AI Emotional Storytelling",
    thaiName: "เขียนโพสต์ซึ้งดึงดราม่าลึกชวนซื้อ",
    description: "สร้างเรื่องราวดึงอารมณ์ความประทับใจของการผจญภัยกับคู่หูคันโปรด",
    emoji: "🎭",
    isUnlockedInFree: false
  },
  {
    id: "luxury-writing",
    name: "AI Luxury Writing Mode",
    thaiName: "ภาษาสุภาพพรีเมียมหรูเกรด S",
    description: "รังสรรค์ประเด็นหรูหรา ถ้อยคำสะกดสายตาภูมิฐาน ไฮโซจับต้องได้",
    emoji: "💎",
    isUnlockedInFree: false
  },
  {
    id: "trending-hook",
    name: "AI Trending Hook Generator",
    thaiName: "กระสุนคำเปิดตัวกระแสแรง",
    description: "เปิดห้าคำมัดใจผู้ซื้อในวินาทีแรกที่ไถฟีด ไม่มีปัดหนีแน่นอน",
    emoji: "🔥",
    isUnlockedInFree: false
  }
];

class PremiumAiService {
  private static MOCK_PREFIX = "nonga_premium_";

  // Get local storage key helper for fallback states 
  private getLocalKey(userId: string, suffix: string): string {
    return `${PremiumAiService.MOCK_PREFIX}${userId}_${suffix}`;
  }

  /**
   * Fetch current AI Subscription status for a user
   */
  async getSubscription(userId: string): Promise<AiPremiumSubscription> {
    if (isMockConfig || !db) {
      const stored = localStorage.getItem(this.getLocalKey(userId, "subscription"));
      if (stored) {
        return JSON.parse(stored);
      }
      
      const defaultSub: AiPremiumSubscription = {
        userId,
        status: "active",
        tier: "free",
        tokens: 30, // Start with some free trial tokens
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(this.getLocalKey(userId, "subscription"), JSON.stringify(defaultSub));
      return defaultSub;
    }

    try {
      const docRef = doc(db, "ai_subscriptions", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as AiPremiumSubscription;
      } else {
        const defaultSub: AiPremiumSubscription = {
          userId,
          status: "active",
          tier: "free",
          tokens: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(docRef, defaultSub);
        return defaultSub;
      }
    } catch (e) {
      console.warn("Error finding subscription in firestore, falling back to storage:", e);
      // fallback
      const stored = localStorage.getItem(this.getLocalKey(userId, "subscription"));
      if (stored) return JSON.parse(stored);
      return {
        userId,
        status: "active",
        tier: "free",
        tokens: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Check if user has unlocked access & tracks feature limits
   */
  async checkFeatureLimit(
    userId: string, 
    featureId: PremiumAiFeatureId
  ): Promise<{ allowed: boolean; used: number; max: number; isPremium: boolean }> {
    const feature = PREMIUM_FEATURES_LIST.find(f => f.id === featureId);
    if (!feature) {
      return { allowed: false, used: 0, max: 0, isPremium: false };
    }

    const sub = await this.getSubscription(userId);
    const isPremium = sub.status === "active" && sub.tier === "premium";

    if (isPremium) {
      // Premium accounts enjoy unlimited access on all advanced tools
      return { allowed: true, used: 0, max: 99999, isPremium: true };
    }

    // Free account checks:
    if (!feature.isUnlockedInFree) {
      // Locked completely in Free Tier
      return { allowed: false, used: 0, max: 0, isPremium: false };
    }

    const freeLimit = feature.freeLimit ?? 0;
    const usage = await this.getFeatureUsage(userId, featureId, freeLimit);

    return {
      allowed: usage.usedCount < freeLimit,
      used: usage.usedCount,
      max: freeLimit,
      isPremium: false
    };
  }

  /**
   * Fetch current feature usage logs
   */
  async getFeatureUsage(userId: string, featureId: PremiumAiFeatureId, limitCount: number): Promise<AiUsageTracker> {
    const docId = `${userId}_${featureId}`;

    if (isMockConfig || !db) {
      const stored = localStorage.getItem(this.getLocalKey(userId, `usage_${featureId}`));
      if (stored) {
        return JSON.parse(stored);
      }
      const initial: AiUsageTracker = {
        userId,
        featureId,
        usedCount: 0,
        limitCount,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(this.getLocalKey(userId, `usage_${featureId}`), JSON.stringify(initial));
      return initial;
    }

    try {
      const docRef = doc(db, "ai_usage", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as AiUsageTracker;
      } else {
        const initial: AiUsageTracker = {
          userId,
          featureId,
          usedCount: 0,
          limitCount,
          updatedAt: new Date().toISOString()
        };
        await setDoc(docRef, initial);
        return initial;
      }
    } catch (e) {
      console.warn("Error reading usage log from firestore, using fallback:", e);
      const stored = localStorage.getItem(this.getLocalKey(userId, `usage_${featureId}`));
      if (stored) return JSON.parse(stored);
      return {
        userId,
        featureId,
        usedCount: 0,
        limitCount,
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Record AI consumption by incrementing used count
   */
  async recordUsage(userId: string, featureId: PremiumAiFeatureId): Promise<void> {
    const docId = `${userId}_${featureId}`;
    const feature = PREMIUM_FEATURES_LIST.find(f => f.id === featureId);
    const limitCount = feature?.freeLimit ?? 0;

    // First check if premium
    const sub = await this.getSubscription(userId);
    const isPremium = sub.status === "active" && sub.tier === "premium";

    // Subscriptions token deductions for future-ready API pay-per-use modes 
    if (sub.tokens > 0) {
      await this.adjustTokens(userId, -1);
    }

    if (isPremium) {
      // Premium is limitless, we can still increments in dashboard stats of course
    }

    if (isMockConfig || !db) {
      const key = this.getLocalKey(userId, `usage_${featureId}`);
      const stored = localStorage.getItem(key);
      let parsed: AiUsageTracker;
      if (stored) {
        parsed = JSON.parse(stored);
        parsed.usedCount += 1;
        parsed.updatedAt = new Date().toISOString();
      } else {
        parsed = {
          userId,
          featureId,
          usedCount: 1,
          limitCount,
          updatedAt: new Date().toISOString()
        };
      }
      localStorage.setItem(key, JSON.stringify(parsed));
      return;
    }

    try {
      const docRef = doc(db, "ai_usage", docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        await updateDoc(docRef, {
          usedCount: increment(1),
          updatedAt: new Timestamp(Math.floor(Date.now() / 1000), 0).toDate().toISOString()
        });
      } else {
        const initial: AiUsageTracker = {
          userId,
          featureId,
          usedCount: 1,
          limitCount,
          updatedAt: new Date().toISOString()
        };
        await setDoc(docRef, initial);
      }
    } catch (e) {
      console.error("Error setting usage in firestore:", e);
      // local backup write
      const key = this.getLocalKey(userId, `usage_${featureId}`);
      const stored = localStorage.getItem(key);
      const currentVal = stored ? JSON.parse(stored).usedCount : 0;
      localStorage.setItem(key, JSON.stringify({
        userId,
        featureId,
        usedCount: currentVal + 1,
        limitCount,
        updatedAt: new Date().toISOString()
      }));
    }
  }

  /**
   * Adjust subscription tokens securely (future-ready AI token billing)
   */
  async adjustTokens(userId: string, amount: number): Promise<void> {
    if (isMockConfig || !db) {
      const sub = await this.getSubscription(userId);
      sub.tokens = Math.max(0, sub.tokens + amount);
      sub.updatedAt = new Date().toISOString();
      localStorage.setItem(this.getLocalKey(userId, "subscription"), JSON.stringify(sub));
      return;
    }

    try {
      const docRef = doc(db, "ai_subscriptions", userId);
      await updateDoc(docRef, {
        tokens: increment(amount),
        updatedAt: new Timestamp(Math.floor(Date.now() / 1000), 0).toDate().toISOString()
      });
    } catch (e) {
      console.warn("Could not update token count in firestore, using fallback:", e);
      const sub = await this.getSubscription(userId);
      sub.tokens = Math.max(0, sub.tokens + amount);
      localStorage.setItem(this.getLocalKey(userId, "subscription"), JSON.stringify(sub));
    }
  }

  /**
   * Explicit upgrade trigger to Premium Tier
   */
  async upgradeToPremium(userId: string): Promise<void> {
    const premiumSub: AiPremiumSubscription = {
      userId,
      status: "active",
      tier: "premium",
      tokens: 9999, // infinite / premium reserve
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMockConfig || !db) {
      localStorage.setItem(this.getLocalKey(userId, "subscription"), JSON.stringify(premiumSub));
      // update User profile role to premium if accessible
      return;
    }

    try {
      const docRef = doc(db, "ai_subscriptions", userId);
      await setDoc(docRef, premiumSub);
      
      // Attempt syncing to users profile collection
      try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          role: "premium",
          membershipType: "premium",
          updatedAt: new Date().toISOString()
        });
      } catch (userErr) {
        console.warn("Users role sync skipped - normal for early drafts:", userErr);
      }
    } catch (e) {
      console.error("Error upgrading user in firestore:", e);
      localStorage.setItem(this.getLocalKey(userId, "subscription"), JSON.stringify(premiumSub));
    }
  }

  /**
   * Explicit downgrade back to free for testing and management convenience
   */
  async downgradeToFree(userId: string): Promise<void> {
    const freeSub: AiPremiumSubscription = {
      userId,
      status: "active",
      tier: "free",
      tokens: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isMockConfig || !db) {
      localStorage.setItem(this.getLocalKey(userId, "subscription"), JSON.stringify(freeSub));
      // Reset local counts for testing convenience
      PREMIUM_FEATURES_LIST.forEach(f => {
        localStorage.removeItem(this.getLocalKey(userId, `usage_${f.id}`));
      });
      return;
    }

    try {
      const docRef = doc(db, "ai_subscriptions", userId);
      await setDoc(docRef, freeSub);

      PREMIUM_FEATURES_LIST.forEach(async (f) => {
        try {
          await setDoc(doc(db, "ai_usage", `${userId}_${f.id}`), {
            userId,
            featureId: f.id,
            usedCount: 0,
            limitCount: f.freeLimit ?? 0,
            updatedAt: new Date().toISOString()
          });
        } catch {}
      });

      try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          role: "member",
          membershipType: "free"
        });
      } catch {}
    } catch (e) {
      console.error("Error downgrading:", e);
      localStorage.setItem(this.getLocalKey(userId, "subscription"), JSON.stringify(freeSub));
    }
  }

  /**
   * Fetch all feature stats aggregated for a beautiful dashboard visualization
   */
  async getDashboardStats(userId: string): Promise<{
    subscription: AiPremiumSubscription;
    features: {
      info: PremiumFeatureInfo;
      used: number;
      max: number;
      allowed: boolean;
    }[];
  }> {
    const sub = await this.getSubscription(userId);
    const featuresStats = await Promise.all(
      PREMIUM_FEATURES_LIST.map(async (f) => {
        const check = await this.checkFeatureLimit(userId, f.id);
        const localUsageVal = localStorage.getItem(this.getLocalKey(userId, `usage_${f.id}`));
        const usedCount = check.isPremium 
          ? (localUsageVal ? JSON.parse(localUsageVal).usedCount : 0)
          : check.used;
        return {
          info: f,
          used: usedCount,
          max: f.isUnlockedInFree ? (f.freeLimit ?? 0) : 0,
          allowed: check.allowed
        };
      })
    );

    return {
      subscription: sub,
      features: featuresStats
    };
  }
}

export const premiumAiService = new PremiumAiService();
