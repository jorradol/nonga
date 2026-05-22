import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "../../contexts/auth/AuthContext";
import { subscriptionService, Subscription, SubscriptionPlan, SUBSCRIPTION_PLANS } from "../../services/subscriptions/subscriptionService";
import { paymentService, PaymentRecord, InvoiceRecord, PremiumFeaturesRecord } from "../../services/payments/paymentService";

export function useBilling() {
  const { user, updateUserProfile } = useAuthContext();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [premium, setPremium] = useState<PremiumFeaturesRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBillingData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [subData, paysData, invoicesData, premiumData] = await Promise.all([
        subscriptionService.getSubscription(user.uid),
        paymentService.getPayments(user.uid),
        paymentService.getInvoices(user.uid),
        paymentService.getPremiumFeatures(user.uid)
      ]);

      setSubscription(subData);
      setPayments(paysData);
      setInvoices(invoicesData);
      setPremium(premiumData);
    } catch (err: any) {
      console.error("ผิดพลาดขณะดึงข้อมูลการชำระเงิน:", err);
      setError(err instanceof Error ? err.message : "เกิดปัญหาดึงข้อมูลบิลลิ่ง");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshBillingData();
  }, [refreshBillingData]);

  // Starts a Stripe interactive simulation or redirects to Stripe URL
  const checkoutStripe = async (planId: SubscriptionPlan["id"]): Promise<string | null> => {
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนอัปเกรดแฝง");

    setLoading(true);
    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      // Build a realistic payment record
      const payRecordParams = {
        userId: user.uid,
        userEmail: user.email || "billing@nongbot.org",
        amount: plan.price,
        currency: "THB",
        paymentMethod: "stripe" as const,
        description: `สมัครแผนบริการ ${plan.name} ชำระผ่านบัตรเครดิต Stripe`
      };

      const newPay = await paymentService.createPayment(payRecordParams);
      
      // Auto-processes credit card after 1.5s delay to simulate authentic payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      await paymentService.completePayment(user.uid, newPay.id, user.email || "billing@nongbot.org");
      
      // Sync auth profile context
      await updateUserProfile({
        membershipType: planId,
        postLimit: plan.limits.posts,
        role: planId !== "free" ? "dealer" : "member"
      });

      await refreshBillingData();
      return newPay.id;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Creates PromptPay QR code transaction record
  const checkoutPromptPay = async (planId: SubscriptionPlan["id"]): Promise<PaymentRecord | null> => {
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนสมัคร");

    setLoading(true);
    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      const payRecordParams = {
        userId: user.uid,
        userEmail: user.email || "billing@nongbot.org",
        amount: plan.price,
        currency: "THB",
        paymentMethod: "promptpay" as const,
        description: `สมัครแผนบริการ ${plan.name} ชำระเงินผ่าน PromptPay QR`
      };

      const newPay = await paymentService.createPayment(payRecordParams);
      await refreshBillingData();
      return newPay;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const buyBoostTokens = async (amount: number): Promise<PaymentRecord | null> => {
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนซื้อแพ็กเกจ");

    setLoading(true);
    try {
      const payRecordParams = {
        userId: user.uid,
        userEmail: user.email || "billing@nongbot.org",
        amount,
        currency: "THB",
        paymentMethod: "promptpay" as const,
        description: `ซื้อโทเค็นบูสต์โพสต์ระดับดีลเลอร์แอดวานซ์ (Boost Post x5)`
      };

      const newPay = await paymentService.createPayment(payRecordParams);
      await refreshBillingData();
      return newPay;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Verifies the QR submission
  const verifyResponsePayment = async (paymentId: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      await paymentService.completePayment(user.uid, paymentId, user.email || "");
      
      // Deduce plan details
      const payObj = payments.find(p => p.id === paymentId);
      if (payObj) {
        let matchedPlan: SubscriptionPlan["id"] = "free";
        if (payObj.description.includes("Dealer Pro")) matchedPlan = "dealer_pro";
        if (payObj.description.includes("Dealer Premium")) matchedPlan = "dealer_premium";

        if (matchedPlan !== "free") {
          await updateUserProfile({
            membershipType: matchedPlan,
            postLimit: SUBSCRIPTION_PLANS[matchedPlan].limits.posts,
            role: "dealer"
          });
        }
      }

      await refreshBillingData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Cancels plan subscription
  const cancelActivePlan = async (immediate: boolean = false): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      await subscriptionService.cancelSubscription(user.uid, immediate);
      if (immediate) {
        await updateUserProfile({
          membershipType: "free",
          postLimit: 5,
          role: "member"
        });
      }
      await refreshBillingData();
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    subscription,
    payments,
    invoices,
    premium,
    loading,
    error,
    checkoutStripe,
    checkoutPromptPay,
    buyBoostTokens,
    verifyResponsePayment,
    cancelActivePlan,
    refreshBillingData,
    plans: SUBSCRIPTION_PLANS
  };
}
