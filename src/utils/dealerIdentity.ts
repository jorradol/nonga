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

/** Opaque Firebase uid — not a canonical dealer partition id. */
export function isOpaqueFirebaseUid(id: string): boolean {
  const normalized = id.trim();
  if (!normalized) return false;
  return /^[A-Za-z0-9]{20,}$/.test(normalized) && !normalized.includes("-");
}

/** Canonical dealer id from profile/header — never a raw Firebase uid. */
export function resolveCanonicalDealerId(
  value: string | null | undefined
): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || isOpaqueFirebaseUid(trimmed)) return null;
  return normalizeDealerId(trimmed);
}

function resolveLegacyDealerUidScope(uid: string): string | null {
  if (!uid.startsWith("dealer-")) return null;
  return normalizeDealerId(uid.replace(/^dealer-/, "") || THOR_AUTO_DEALER_ID);
}

export function resolveDealerIdFromUser(user: {
  dealerId?: string;
  uid?: string;
  role?: string;
} | null): string {
  const fromProfile = resolveCanonicalDealerId(user?.dealerId);
  if (fromProfile) return fromProfile;
  const fromLegacyUid = user?.uid ? resolveLegacyDealerUidScope(user.uid) : null;
  if (fromLegacyUid) return fromLegacyUid;
  return THOR_AUTO_DEALER_ID;
}

/** Dealer inventory API scope — admin without dealerId must not fall back to admin uid. */
export function resolveDealerInventoryScopeId(
  user: { dealerId?: string; uid?: string; role?: string } | null,
  role: string | undefined
): string | null {
  const fromProfile = resolveCanonicalDealerId(user?.dealerId);
  if (fromProfile) return fromProfile;
  if (role === "dealer") {
    const fromLegacyUid = user?.uid ? resolveLegacyDealerUidScope(user.uid) : null;
    if (fromLegacyUid) return fromLegacyUid;
  }
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

/**
 * Canonical portal ownerId for a dealer partition.
 * Lead routing uses listing.ownerId → sellerId; ACL also matches dealerId.
 *
 * Compatibility (do not migrate live Thor rows without owner approval):
 * - Portal / dealer-created: `owner-{dealerId}` (e.g. owner-thor-auto)
 * - Staging Thor imports may still use a Firebase uid as ownerId while
 *   dealerId remains `thor-auto`. Queue manage works via dealerId match.
 */
export function canonicalDealerOwnerId(dealerId: string): string {
  return `owner-${normalizeDealerId(dealerId)}`;
}

/** Safe public dealer slug — never a Firebase uid or owner- prefix internal id. */
export function toPublicDealerSlug(
  dealerId: string | null | undefined
): string | undefined {
  const normalized = normalizeDealerId(String(dealerId ?? "").trim());
  if (!normalized) return undefined;
  if (normalized === THOR_AUTO_DEALER_ID || isSimulatedThorDealerId(normalized)) {
    return "thor-auto";
  }
  // Opaque Firebase-style uids are not safe public dealer identifiers.
  if (/^[A-Za-z0-9]{20,}$/.test(normalized) && !normalized.includes("-")) {
    return undefined;
  }
  if (normalized.startsWith("owner-") || normalized.startsWith("dealer-")) {
    return stripDealerOwnerPrefix(normalized) || undefined;
  }
  return normalized;
}
