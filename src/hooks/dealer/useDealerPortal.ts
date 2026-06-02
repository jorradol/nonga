import { useMemo } from "react";
import { useAuthContext } from "../../contexts/auth/AuthContext";
import { useRole } from "../auth/useRole";
import {
  buildThorAutoOwnerContext,
  ownerContextToImportOwner,
  resolveDealerInventoryScopeId,
  type DealerOwnerContext,
} from "../../utils/dealerIdentity";
import { canAccessDealerPortal } from "../../utils/rbac";
import type { DealerApiHeaders } from "../../services/dealer/dealerApi";

export function useDealerPortal() {
  const { user } = useAuthContext();
  const { isAdmin, isDealer, role } = useRole();

  const dealerInventoryScopeId = useMemo(
    () => resolveDealerInventoryScopeId(user, role),
    [user, role]
  );

  const apiHeaders: DealerApiHeaders | null = useMemo(
    () =>
      dealerInventoryScopeId
        ? {
            dealerId: dealerInventoryScopeId,
            role: isAdmin ? "admin" : role,
          }
        : null,
    [dealerInventoryScopeId, isAdmin, role]
  );

  const ownerContext: DealerOwnerContext = useMemo(() => {
    const dealerId = dealerInventoryScopeId ?? "";
    const base = buildThorAutoOwnerContext({
      dealerId,
      ownerId: user?.uid ?? `owner-${dealerId || "unknown"}`,
      ownerName: user?.displayName ?? undefined,
    });
    if (user?.dealerProfile) {
      return { ...base, ...user.dealerProfile };
    }
    return base;
  }, [user, dealerInventoryScopeId]);

  const importOwner = useMemo(
    () => ownerContextToImportOwner(ownerContext),
    [ownerContext]
  );

  const canAccessPortal = canAccessDealerPortal(user);

  return {
    dealerId: dealerInventoryScopeId,
    apiHeaders,
    hasDealerInventoryScope: dealerInventoryScopeId !== null,
    ownerContext,
    importOwner,
    canAccessPortal,
    isAdmin,
    isDealer,
  };
}
