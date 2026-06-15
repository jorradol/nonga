/** ค่า dealerId มาตรฐาน — ใช้ผูกรถ published/draft/profile */
export const THOR_AUTO_DEALER_ID = "thor-auto";

/** Parent dealer group สำหรับ Thor Auto และ simulated partitions */
export const THOR_AUTO_PARENT_DEALER_GROUP = "Thor Auto";

/** Simulated Thor Auto partitions — ไม่ใช่ external paid customers แยก 3 ราย */
export const SIMULATED_THOR_DEALER_IDS = [
  "sim-1thor",
  "sim-2thor",
  "sim-3thor",
] as const;

export type SimulatedThorDealerId = (typeof SIMULATED_THOR_DEALER_IDS)[number];

const SIMULATED_THOR_DEALER_ID_SET = new Set<string>(SIMULATED_THOR_DEALER_IDS);

export interface DealerOwnerContext {
  dealerId: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  showroomName: string;
  address?: string;
}

function stripDealerOwnerPrefix(id: string): string {
  if (id.startsWith("dealer-")) return id.slice("dealer-".length);
  if (id.startsWith("owner-")) return id.slice("owner-".length);
  return id;
}

/** ตรวจว่าเป็น simulated Thor partition (canonical หรือ alias) */
export function isSimulatedThorDealerId(dealerId: string): boolean {
  const core = stripDealerOwnerPrefix(dealerId.trim());
  return SIMULATED_THOR_DEALER_ID_SET.has(core);
}

function resolveSimulatedThorDealerIdCanonical(id: string): SimulatedThorDealerId | null {
  const trimmed = id.trim();
  if (SIMULATED_THOR_DEALER_ID_SET.has(trimmed)) {
    return trimmed as SimulatedThorDealerId;
  }
  const stripped = stripDealerOwnerPrefix(trimmed);
  if (SIMULATED_THOR_DEALER_ID_SET.has(stripped)) {
    return stripped as SimulatedThorDealerId;
  }
  return null;
}

export function normalizeDealerId(dealerId: string): string {
  const id = dealerId.trim();
  if (!id) return id;

  const sim = resolveSimulatedThorDealerIdCanonical(id);
  if (sim) return sim;

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

/** Business truth: Thor Auto group ครอบ thor-auto และ simulated partitions */
export function resolveParentDealerGroup(dealerId: string): string | null {
  const normalized = normalizeDealerId(dealerId);
  if (normalized === THOR_AUTO_DEALER_ID || isSimulatedThorDealerId(normalized)) {
    return THOR_AUTO_PARENT_DEALER_GROUP;
  }
  return null;
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

/** Dealer inventory API scope — admin without dealerId must not fall back to admin uid. */
export function resolveDealerInventoryScopeId(
  user: { dealerId?: string; uid?: string; role?: string } | null,
  role: string | undefined
): string | null {
  if (user?.dealerId?.trim()) return normalizeDealerId(user.dealerId);
  if (role === "dealer") return resolveDealerIdFromUser(user);
  return null;
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
