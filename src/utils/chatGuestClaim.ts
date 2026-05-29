import type { ChatStorageScope } from "./chatStorageScope";

const GUEST_CLAIM_KEY = "nong-a-chat-guest-claim-v1";

export type GuestChatClaimStatus = "pending" | "claimed";

export interface GuestChatClaimPointer {
  guestStorageScopeKey: string;
  guestSessionId: string;
  publicRefCode?: string;
  status: GuestChatClaimStatus;
  memberStorageScopeKey?: string;
  claimedAt?: number;
  updatedAt: number;
}

function getSessionStorage(): Storage | null {
  const storage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
  return storage ?? null;
}

export function buildGuestClaimId(pointer: Pick<GuestChatClaimPointer, "guestStorageScopeKey" | "guestSessionId" | "publicRefCode">): string {
  return [pointer.guestStorageScopeKey, pointer.guestSessionId, pointer.publicRefCode ?? ""].join("|");
}

export function saveGuestChatClaimPointer(
  pointer: Omit<GuestChatClaimPointer, "status" | "updatedAt"> & {
    status?: GuestChatClaimStatus;
  }
): void {
  const storage = getSessionStorage();
  if (!storage) return;
  const payload: GuestChatClaimPointer = {
    ...pointer,
    status: pointer.status ?? "pending",
    updatedAt: Date.now(),
  };
  try {
    storage.setItem(GUEST_CLAIM_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[chat-guest-claim] save failed:", err);
  }
}

export function readGuestChatClaimPointer(): GuestChatClaimPointer | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(GUEST_CLAIM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestChatClaimPointer;
    if (!parsed?.guestStorageScopeKey?.trim() || !parsed?.guestSessionId?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function markGuestChatClaimComplete(
  memberScope: ChatStorageScope,
  guestSessionId: string
): void {
  const current = readGuestChatClaimPointer();
  if (!current || current.guestSessionId !== guestSessionId) return;
  saveGuestChatClaimPointer({
    ...current,
    status: "claimed",
    memberStorageScopeKey: memberScope.storageKey,
    claimedAt: Date.now(),
  });
}

export function isGuestChatClaimPendingForScope(guestStorageScopeKey: string): boolean {
  const pointer = readGuestChatClaimPointer();
  return (
    pointer?.status === "pending" &&
    pointer.guestStorageScopeKey === guestStorageScopeKey
  );
}

export function isGuestChatClaimCompleteForMember(
  memberStorageScopeKey: string,
  guestSessionId?: string
): boolean {
  const pointer = readGuestChatClaimPointer();
  if (pointer?.status !== "claimed") return false;
  if (pointer.memberStorageScopeKey !== memberStorageScopeKey) return false;
  if (guestSessionId && pointer.guestSessionId !== guestSessionId) return false;
  return true;
}

export function clearGuestChatClaimPointer(): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(GUEST_CLAIM_KEY);
  } catch {
    // ignore
  }
}
