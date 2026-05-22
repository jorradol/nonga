/** ค่า dealerId มาตรฐาน — ใช้ผูกรถ published/draft/profile */
export const THOR_AUTO_DEALER_ID = "thor-auto";

export interface DealerOwnerContext {
  dealerId: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  showroomName: string;
  address?: string;
}

export function normalizeDealerId(dealerId: string): string {
  const id = dealerId.trim();
  if (!id) return id;
  if (
    id === THOR_AUTO_DEALER_ID ||
    id === "dealer-thor-auto" ||
    id.startsWith("dealer-thor") ||
    id === "owner-thor-auto" ||
    id.startsWith("owner-thor")
  ) {
    return THOR_AUTO_DEALER_ID;
  }
  return id;
}

export function resolveDealerIdFromUser(user: {
  dealerId?: string;
  uid?: string;
  role?: string;
} | null): string {
  if (user?.dealerId?.trim()) return normalizeDealerId(user.dealerId);
  if (user?.role === "dealer" && user?.uid?.startsWith("dealer-")) {
    return normalizeDealerId(user.uid.replace(/^dealer-/, "") || THOR_AUTO_DEALER_ID);
  }
  if (user?.uid?.trim()) return normalizeDealerId(user.uid);
  return THOR_AUTO_DEALER_ID;
}

export function buildThorAutoOwnerContext(
  overrides: Partial<DealerOwnerContext> = {}
): DealerOwnerContext {
  return {
    dealerId: THOR_AUTO_DEALER_ID,
    ownerId: overrides.ownerId ?? `owner-${THOR_AUTO_DEALER_ID}`,
    ownerName: overrides.ownerName ?? "คุณณรงค์ จรดล",
    ownerPhone: overrides.ownerPhone ?? "0815553335",
    showroomName: overrides.showroomName ?? "Thor Auto (ธอร์ ออโต้)",
    address: overrides.address ?? "เขตมีนบุรี จังหวัดกรุงเทพ",
    ...overrides,
  };
}

/** map owner context จาก import → dealerId ชัดเจน */
export function ownerContextToImportOwner(ctx: DealerOwnerContext) {
  return {
    dealerId: ctx.dealerId,
    ownerId: ctx.ownerId,
    ownerName: ctx.ownerName,
    ownerPhone: ctx.ownerPhone,
    showroomName: ctx.showroomName,
    address: ctx.address,
  };
}
