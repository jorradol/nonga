import { useMemo } from "react";
import { useAuthContext } from "../../contexts/auth/AuthContext";
import { useRole } from "../auth/useRole";
import {
  resolveDealerIdFromUser,
  buildThorAutoOwnerContext,
  ownerContextToImportOwner,
  type DealerOwnerContext,
} from "../../utils/dealerIdentity";
import { canAccessDealerPortal } from "../../utils/rbac";
import type { DealerApiHeaders } from "../../services/dealer/dealerApi";

export function useDealerPortal() {
  const { user } = useAuthContext();
  const { isAdmin, isDealer, role } = useRole();

  const dealerId = useMemo(() => resolveDealerIdFromUser(user), [user]);

  const apiHeaders: DealerApiHeaders = useMemo(
    () => ({
      dealerId,
      role: isAdmin ? "admin" : role,
    }),
    [dealerId, isAdmin, role]
  );

  const ownerContext: DealerOwnerContext = useMemo(() => {
    const base = buildThorAutoOwnerContext({
      dealerId,
      ownerId: user?.uid ?? `owner-${dealerId}`,
      ownerName: user?.displayName ?? undefined,
    });
    if (user?.dealerProfile) {
      return { ...base, ...user.dealerProfile };
    }
    return base;
  }, [user, dealerId]);

  const importOwner = useMemo(
    () => ownerContextToImportOwner(ownerContext),
    [ownerContext]
  );

  const canAccessPortal = canAccessDealerPortal(user);

  return {
    dealerId,
    apiHeaders,
    ownerContext,
    importOwner,
    canAccessPortal,
    isAdmin,
    isDealer,
  };
}
