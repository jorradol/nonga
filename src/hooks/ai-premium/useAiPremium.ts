import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../../store";
import { premiumAiService, AiPremiumSubscription, PremiumFeatureInfo, PREMIUM_FEATURES_LIST, PremiumAiFeatureId } from "../../services/ai/premium/premiumAiService";

// Simple global observers to synchronize states across multiple instances of the hook
type SubscriberCallback = () => void;
const subscribers = new Set<SubscriberCallback>();

let globalSubscription: AiPremiumSubscription | null = null;
let globalStats: any[] = [];
let isGlobalLoading = false;
let globalUpgradeModalOpen = false;
let globalSelectedFeatureForUpgrade: PremiumFeatureInfo | null = null;

const notifySubscribers = () => {
  subscribers.forEach((cb) => cb());
};

export function useAiPremium() {
  const { user } = useAppStore();
  const userId = user?.uid || "guest-user-100";

  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    subscribers.add(forceUpdate);
    return () => {
      subscribers.delete(forceUpdate);
    };
  }, [forceUpdate]);

  const fetchStats = useCallback(async () => {
    if (isGlobalLoading) return;
    isGlobalLoading = true;
    notifySubscribers();

    try {
      const stats = await premiumAiService.getDashboardStats(userId);
      globalSubscription = stats.subscription;
      globalStats = stats.features;
    } catch (e) {
      console.error("Error loading Premium AI Stats:", e);
    } finally {
      isGlobalLoading = false;
      notifySubscribers();
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (!globalSubscription) {
      fetchStats();
    }
  }, [fetchStats]);

  /**
   * Check if a feature is unlocked. If locked, opens the upgrade dialog modal.
   */
  const checkGate = useCallback(async (featureId: PremiumAiFeatureId): Promise<boolean> => {
    const check = await premiumAiService.checkFeatureLimit(userId, featureId);
    if (!check.allowed) {
      const featureInfo = PREMIUM_FEATURES_LIST.find((f) => f.id === featureId) || null;
      globalSelectedFeatureForUpgrade = featureInfo;
      globalUpgradeModalOpen = true;
      notifySubscribers();
      return false;
    }
    return true;
  }, [userId]);

  /**
   * Consume 1 quota for the feature
   */
  const triggerUsage = useCallback(async (featureId: PremiumAiFeatureId): Promise<void> => {
    await premiumAiService.recordUsage(userId, featureId);
    await fetchStats();
  }, [userId, fetchStats]);

  /**
   * Trigger direct simulation of premium upgrade
   */
  const upgradeToPremium = useCallback(async (): Promise<void> => {
    isGlobalLoading = true;
    notifySubscribers();
    try {
      await premiumAiService.upgradeToPremium(userId);
      await fetchStats();
      // Auto close modal on success
      globalUpgradeModalOpen = false;
      notifySubscribers();
    } catch (e) {
      console.error(e);
    } finally {
      isGlobalLoading = false;
      notifySubscribers();
    }
  }, [userId, fetchStats]);

  /**
   * Trigger downgrade to free
   */
  const downgradeToFree = useCallback(async (): Promise<void> => {
    isGlobalLoading = true;
    notifySubscribers();
    try {
      await premiumAiService.downgradeToFree(userId);
      await fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      isGlobalLoading = false;
      notifySubscribers();
    }
  }, [userId, fetchStats]);

  const openUpgradeModal = useCallback((featureId?: PremiumAiFeatureId) => {
    const featureInfo = featureId ? (PREMIUM_FEATURES_LIST.find((f) => f.id === featureId) || null) : null;
    globalSelectedFeatureForUpgrade = featureInfo;
    globalUpgradeModalOpen = true;
    notifySubscribers();
  }, []);

  const closeUpgradeModal = useCallback(() => {
    globalUpgradeModalOpen = false;
    globalSelectedFeatureForUpgrade = null;
    notifySubscribers();
  }, []);

  return {
    subscription: globalSubscription,
    featuresStats: globalStats,
    loading: isGlobalLoading,
    upgradeModalOpen: globalUpgradeModalOpen,
    selectedFeatureForUpgrade: globalSelectedFeatureForUpgrade,
    allFeatures: PREMIUM_FEATURES_LIST,
    
    checkGate,
    triggerUsage,
    upgradeToPremium,
    downgradeToFree,
    openUpgradeModal,
    closeUpgradeModal,
    refreshStats: fetchStats
  };
}
