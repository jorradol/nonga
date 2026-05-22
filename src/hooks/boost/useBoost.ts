import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boostService, BoostPlan, BOOST_PLANS, ActiveBoost } from "../../services/boost";
import { useAuthContext } from "../../contexts/auth/AuthContext";

export function useBoost() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // 1. Query user's active boosts
  const { data: userBoosts, isLoading: loadingBoosts, error: errorBoosts, refetch: refetchBoosts } = useQuery({
    queryKey: ["boosts", user?.uid],
    queryFn: () => boostService.listUserBoosts(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });

  // 2. Query user's booster historical records
  const { data: history, isLoading: loadingHistory, error: errorHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["boost_history", user?.uid],
    queryFn: () => boostService.getBoostHistory(user?.uid || ""),
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // 3. Obtain query for a specific car active boost
  const getListingBoost = (carId: string) => {
    return useQuery({
      queryKey: ["car_boost", carId],
      queryFn: () => boostService.getCarActiveBoost(carId),
      enabled: !!carId,
      staleTime: 1000 * 60 * 2,
    });
  };

  // 4. Mutation to apply/purchase a boost plan
  const applyBoostMutation = useMutation({
    mutationFn: async (params: {
      carId: string;
      planId: BoostPlan["id"];
      autoRenew: boolean;
      paymentMethod: "tokens" | "cash";
    }) => {
      if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนดำเนินการโปรโมตโพสต์");
      return boostService.purchaseBoost({
        userId: user.uid,
        userEmail: user.email || undefined,
        carId: params.carId,
        planId: params.planId,
        autoRenew: params.autoRenew,
        paymentMethod: params.paymentMethod
      });
    },
    onSuccess: () => {
      // Invalidate queries to reload details
      queryClient.invalidateQueries({ queryKey: ["boosts", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["boost_history", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["premium_features", user?.uid] });
    }
  });

  // 5. Apply direct cash boost after successful PromptPay scan
  const applyDirectCashBoostMutation = useMutation({
    mutationFn: async (params: {
      paymentId: string;
      carId: string;
      planId: BoostPlan["id"];
      autoRenew: boolean;
    }) => {
      if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      return boostService.applyDirectCashBoost(
        params.paymentId,
        user.uid,
        params.carId,
        params.planId,
        params.autoRenew,
        user.email || ""
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boosts", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["boost_history", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
      queryClient.invalidateQueries({ queryKey: ["payments", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["invoices", user?.uid] });
    }
  });

  // 6. Mutation to toggle auto renew
  const toggleAutoRenewMutation = useMutation({
    mutationFn: async (params: { boostId: string; autoRenew: boolean }) => {
      if (!user) throw new Error("หัวข้อถูกปฏิเสธเนื่องจากยังไม่ได้เข้าระบบ");
      return boostService.toggleAutoRenew(user.uid, params.boostId, params.autoRenew);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boosts", user?.uid] });
    }
  });

  // 7. Mutation to expire/stop boost
  const expireBoostMutation = useMutation({
    mutationFn: async (boostId: string) => {
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
      return boostService.expireActiveBoost(user.uid, boostId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boosts", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["boost_history", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["cars"] });
    }
  });

  return {
    userBoosts,
    history,
    loadingBoosts,
    loadingHistory,
    errorBoosts,
    errorHistory,
    getListingBoost,
    applyBoost,
    applyBoostMutation,
    applyDirectCashBoostMutation,
    toggleAutoRenewMutation,
    expireBoostMutation,
    getBoostAnalytics: boostService.getBoostAnalytics,
    plans: BOOST_PLANS,
    refetchBoosts,
    refetchHistory
  };
}

// Simple export matching custom naming patterns if needed
function applyBoost() {
  // placeholder helper
}
