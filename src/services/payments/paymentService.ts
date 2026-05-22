import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db, isMockConfig } from "../../lib/firebase";
import { handleFirestoreError, OperationType } from "../../utils/firebaseHelpers";
import { subscriptionService } from "../subscriptions/subscriptionService";

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "verified";
  paymentMethod: "stripe" | "promptpay";
  description: string;
  paymentIntentId?: string;
  referenceNo?: string;
  promptpayQr?: string; // QR code image URL or mock SVG data
  createdAt: string;
  verifiedAt?: string;
}

export interface InvoiceRecord {
  id: string;
  userId: string;
  userEmail: string;
  invoiceNo: string;
  amount: number;
  status: "paid" | "unpaid" | "voided";
  billingDate: string;
  dueDate: string;
  items: { description: string; amount: number }[];
  paymentMethod: string;
  createdAt: string;
}

export interface PremiumFeaturesRecord {
  userId: string;
  aiPostGenerationEnabled: boolean;
  aiCaptionsEnabled: boolean;
  analyticsEnabled: boolean;
  showroomEnabled: boolean;
  aiAutoReplyEnabled: boolean;
  aiSalesAssistantEnabled: boolean;
  seoBoostEnabled: boolean;
  priorityListingEnabled: boolean;
  boostTokens: number;
  updatedAt: string;
}

export const paymentService = {
  // Get simulated fallback data from localStorage
  _getSimulatedPayments(userId: string): PaymentRecord[] {
    try {
      const saved = localStorage.getItem(`nonga_sim_pay_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  _saveSimulatedPayments(userId: string, pays: PaymentRecord[]) {
    localStorage.setItem(`nonga_sim_pay_${userId}`, JSON.stringify(pays));
  },

  _getSimulatedInvoices(userId: string): InvoiceRecord[] {
    try {
      const saved = localStorage.getItem(`nonga_sim_inv_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  _saveSimulatedInvoices(userId: string, invs: InvoiceRecord[]) {
    localStorage.setItem(`nonga_sim_inv_${userId}`, JSON.stringify(invs));
  },

  // Premium feature entitlement state
  getSimulatedPremium(userId: string): PremiumFeaturesRecord {
    try {
      const saved = localStorage.getItem(`nonga_sim_pref_${userId}`);
      if (saved) return JSON.parse(saved);
      const defaults: PremiumFeaturesRecord = {
        userId,
        aiPostGenerationEnabled: false,
        aiCaptionsEnabled: false,
        analyticsEnabled: false,
        showroomEnabled: false,
        aiAutoReplyEnabled: false,
        aiSalesAssistantEnabled: false,
        seoBoostEnabled: false,
        priorityListingEnabled: false,
        boostTokens: 0,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`nonga_sim_pref_${userId}`, JSON.stringify(defaults));
      return defaults;
    } catch {
      return {
        userId,
        aiPostGenerationEnabled: false,
        aiCaptionsEnabled: false,
        analyticsEnabled: false,
        showroomEnabled: false,
        aiAutoReplyEnabled: false,
        aiSalesAssistantEnabled: false,
        seoBoostEnabled: false,
        priorityListingEnabled: false,
        boostTokens: 0,
        updatedAt: new Date().toISOString()
      };
    }
  },

  setSimulatedPremium(userId: string, state: PremiumFeaturesRecord) {
    localStorage.setItem(`nonga_sim_pref_${userId}`, JSON.stringify(state));
  },

  // 1. Fetch payments list
  async getPayments(userId: string): Promise<PaymentRecord[]> {
    const isSimulated = isMockConfig || userId.startsWith("sim-") || userId === "guest-user-100";
    if (isSimulated) {
      return this._getSimulatedPayments(userId);
    }

    if (!db) return [];
    try {
      const paysRef = collection(db, "payments");
      const q = query(paysRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      const list: PaymentRecord[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as PaymentRecord);
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      return handleFirestoreError(err, OperationType.LIST, "payments");
    }
  },

  // 2. Fetch invoices list
  async getInvoices(userId: string): Promise<InvoiceRecord[]> {
    const isSimulated = isMockConfig || userId.startsWith("sim-") || userId === "guest-user-100";
    if (isSimulated) {
      return this._getSimulatedInvoices(userId);
    }

    if (!db) return [];
    try {
      const invsRef = collection(db, "invoices");
      const q = query(invsRef, where("userId", "==", userId));
      const snap = await getDocs(q);
      const list: InvoiceRecord[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as InvoiceRecord);
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      return handleFirestoreError(err, OperationType.LIST, "invoices");
    }
  },

  // 3. Create a pending payment
  async createPayment(params: Omit<PaymentRecord, "id" | "status" | "createdAt" | "promptpayQr">): Promise<PaymentRecord> {
    const isSimulated = isMockConfig || params.userId.startsWith("sim-") || params.userId === "guest-user-100";
    
    // Generate simulated dynamic QR content for Thailand PromptPay (mock standard dynamic QR visual link)
    // Format: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021229370016A000000677010111011300668000000005802TH53037645406 + amount
    const cleanPhone = "0812345678";
    const amountStr = params.amount.toFixed(2);
    const mockPPQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021229370016A00000067701011101130066${cleanPhone}5802TH530376454${amountStr.length.toString().padStart(2, '0')}${amountStr}5802TH&color=1e3a8a`;

    const newPay: PaymentRecord = {
      id: "pay-" + Math.random().toString(36).substring(2, 11),
      ...params,
      status: "pending",
      promptpayQr: mockPPQr,
      createdAt: new Date().toISOString()
    };

    if (isSimulated) {
      const current = this._getSimulatedPayments(params.userId);
      this._saveSimulatedPayments(params.userId, [newPay, ...current]);
      return newPay;
    }

    if (!db) throw new Error("ฐานข้อมูลปฎิเสธสิทธิ์การเข้าถึง");

    try {
      const payDocRef = doc(db, "payments", newPay.id);
      await setDoc(payDocRef, newPay);
      return newPay;
    } catch (err) {
      return handleFirestoreError(err, OperationType.WRITE, `payments/${newPay.id}`);
    }
  },

  // 4. Verify / Trigger payment completion
  async completePayment(userId: string, paymentId: string, email: string): Promise<PaymentRecord> {
    const isSimulated = isMockConfig || userId.startsWith("sim-") || userId === "guest-user-100";
    const now = new Date();

    let finishedPayment: PaymentRecord | null = null;

    if (isSimulated) {
      const current = this._getSimulatedPayments(userId);
      const updated = current.map(p => {
        if (p.id === paymentId) {
          finishedPayment = {
            ...p,
            status: "success",
            verifiedAt: now.toISOString()
          };
          return finishedPayment;
        }
        return p;
      });

      if (!finishedPayment) throw new Error("ไม่พบรายการจ่ายเงินรหัสนี้");

      this._saveSimulatedPayments(userId, updated);
    } else {
      if (!db) throw new Error("ฐานข้อมูลปฎิเสธการวิเคราะห์");

      try {
        const payRef = doc(db, "payments", paymentId);
        const snap = await getDoc(payRef);
        if (!snap.exists()) throw new Error("ไม่พบรายการจ่ายเงิน");

        const paymentData = snap.data() as PaymentRecord;
        finishedPayment = {
          ...paymentData,
          status: "success",
          verifiedAt: now.toISOString()
        };

        await setDoc(payRef, finishedPayment);
      } catch (err) {
        return handleFirestoreError(err, OperationType.WRITE, `payments/${paymentId}`);
      }
    }

    // Trigger associated billing activation
    if (finishedPayment) {
      const pay: PaymentRecord = finishedPayment;
      // 1. Invoicing Generator
      const receiptNo = "INV-" + now.getFullYear() + (now.getMonth() + 1).toString().padStart(2, "0") + "-" + Math.floor(100 + Math.random() * 900);
      const newInvoice: InvoiceRecord = {
        id: "inv-" + Math.random().toString(36).substring(2, 11),
        userId,
        userEmail: email,
        invoiceNo: receiptNo,
        amount: pay.amount,
        status: "paid",
        billingDate: now.toISOString(),
        dueDate: now.toISOString(),
        items: [{ description: pay.description, amount: pay.amount }],
        paymentMethod: pay.paymentMethod,
        createdAt: now.toISOString()
      };

      if (isSimulated) {
        const currentInvoices = this._getSimulatedInvoices(userId);
        this._saveSimulatedInvoices(userId, [newInvoice, ...currentInvoices]);
      } else if (db) {
        await setDoc(doc(db, "invoices", newInvoice.id), newInvoice);
      }

      // 2. Premium feature sync or specific subscription plans sync
      if (pay.description.includes("Dealer Pro")) {
        await subscriptionService.handlePlanUpgrade(userId, "dealer_pro");
        await this.syncPremiumFeatures(userId, "dealer_pro");
      } else if (pay.description.includes("Dealer Premium")) {
        await subscriptionService.handlePlanUpgrade(userId, "dealer_premium");
        await this.syncPremiumFeatures(userId, "dealer_premium");
      } else if (pay.description.includes("Boost Post") || pay.description.includes("บูสต์โพสต์")) {
        // Boost post tokens activation
        const prevPrem = await this.getPremiumFeatures(userId);
        const updatedPrem = {
          ...prevPrem,
          boostTokens: prevPrem.boostTokens + 5, // Adds tokens
          updatedAt: now.toISOString()
        };
        await this.savePremiumFeatures(userId, updatedPrem);
      }
    }

    return finishedPayment!;
  },

  // Premium Features configurations fetch
  async getPremiumFeatures(userId: string): Promise<PremiumFeaturesRecord> {
    const isSimulated = isMockConfig || userId.startsWith("sim-") || userId === "guest-user-100";
    if (isSimulated) {
      return this.getSimulatedPremium(userId);
    }

    if (!db) {
      throw new Error("ไม่มี Firestore ให้ใช้งาน");
    }

    try {
      const prefRef = doc(db, "premium_features", userId);
      const snap = await getDoc(prefRef);
      if (snap.exists()) {
        return snap.data() as PremiumFeaturesRecord;
      }
      
      const defaults: PremiumFeaturesRecord = {
        userId,
        aiPostGenerationEnabled: false,
        aiCaptionsEnabled: false,
        analyticsEnabled: false,
        showroomEnabled: false,
        aiAutoReplyEnabled: false,
        aiSalesAssistantEnabled: false,
        seoBoostEnabled: false,
        priorityListingEnabled: false,
        boostTokens: 0,
        updatedAt: new Date().toISOString()
      };
      await setDoc(prefRef, defaults);
      return defaults;
    } catch (err) {
      return handleFirestoreError(err, OperationType.GET, `premium_features/${userId}`);
    }
  },

  async savePremiumFeatures(userId: string, data: PremiumFeaturesRecord) {
    const isSimulated = isMockConfig || userId.startsWith("sim-") || userId === "guest-user-100";
    if (isSimulated) {
      this.setSimulatedPremium(userId, data);
      return;
    }

    if (!db) return;
    try {
      const prefRef = doc(db, "premium_features", userId);
      await setDoc(prefRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `premium_features/${userId}`);
    }
  },

  // Synchronise actual premium feature activations based on subscription tiers
  async syncPremiumFeatures(userId: string, planId: "free" | "dealer_pro" | "dealer_premium"): Promise<PremiumFeaturesRecord> {
    const prev = await this.getPremiumFeatures(userId);
    let updated: PremiumFeaturesRecord;

    if (planId === "free") {
      updated = {
        userId,
        aiPostGenerationEnabled: false,
        aiCaptionsEnabled: false,
        analyticsEnabled: false,
        showroomEnabled: false,
        aiAutoReplyEnabled: false,
        aiSalesAssistantEnabled: false,
        seoBoostEnabled: false,
        priorityListingEnabled: false,
        boostTokens: prev.boostTokens,
        updatedAt: new Date().toISOString()
      };
    } else if (planId === "dealer_pro") {
      updated = {
        userId,
        aiPostGenerationEnabled: true,
        aiCaptionsEnabled: true,
        analyticsEnabled: true,
        showroomEnabled: true,
        aiAutoReplyEnabled: false,
        aiSalesAssistantEnabled: false,
        seoBoostEnabled: false,
        priorityListingEnabled: false,
        boostTokens: prev.boostTokens + 10, // Gives basic tokens
        updatedAt: new Date().toISOString()
      };
    } else { // dealer_premium
      updated = {
        userId,
        aiPostGenerationEnabled: true,
        aiCaptionsEnabled: true,
        analyticsEnabled: true,
        showroomEnabled: true,
        aiAutoReplyEnabled: true,
        aiSalesAssistantEnabled: true,
        seoBoostEnabled: true,
        priorityListingEnabled: true,
        boostTokens: prev.boostTokens + 30, // Grateful VIP packages
        updatedAt: new Date().toISOString()
      };
    }

    await this.savePremiumFeatures(userId, updated);
    return updated;
  }
};
